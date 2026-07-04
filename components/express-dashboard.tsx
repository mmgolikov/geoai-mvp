"use client";

import { useEffect, useRef } from "react";
import { ValidationRequirementList } from "@/components/data-readiness";
import { EvidenceSourceCards } from "@/components/evidence-source-cards";
import { MapContextCard } from "@/components/map-context-card";
import { deriveDecisionPosture, deriveDecisionRationale } from "@/src/lib/decision-posture";
import { userDrawnAoiSourceCode, userDrawnAoiSourceLabel } from "@/src/lib/aoi-library";
import { getDashboardSections, type DashboardSectionDefinition, type DashboardSectionId } from "@/src/lib/dashboard/section-registry";
import {
  buildDashboardModel,
  type DashboardDriver,
  type DashboardInsightModule,
  type DashboardKpi,
  type DashboardMatrixItem,
  type DashboardTone
} from "@/src/lib/dashboard/dashboard-model";
import { formatArea, formatPerimeter } from "@/src/lib/polygon-aoi";
import type { ComparisonItem, ExpressAnalysis, ScoreKey } from "@/src/types/geo";

type ExpressDashboardProps = {
  analysis: ExpressAnalysis;
  onBackToMap: () => void;
  onExportReport: () => void;
  candidateNavigation?: CandidateDashboardNavigation;
};

type CandidateDashboardNavigation = {
  items: ComparisonItem[];
  activeItemId?: string;
  onOpenItem: (item: ComparisonItem) => void;
  onBackToComparison: () => void;
};

const scoreOrder: ScoreKey[] = [
  "developmentPotential",
  "investmentAttractiveness",
  "accessibility",
  "infrastructureReadiness",
  "climateHeatRisk",
  "overallRisk"
];

function scoreTone(scoreKey: ScoreKey, value: number) {
  const riskMetric = scoreKey === "climateHeatRisk" || scoreKey === "overallRisk";

  if (riskMetric) {
    if (value >= 70) return "text-[#9f3412] bg-[#fff4ed]";
    if (value >= 50) return "text-[#8a6a12] bg-[#fff8db]";
    return "text-brand bg-[#eaf3f1]";
  }

  if (value >= 75) return "text-brand bg-[#eaf3f1]";
  if (value >= 55) return "text-[#8a6a12] bg-[#fff8db]";
  return "text-[#9f3412] bg-[#fff4ed]";
}

function scoreInterpretation(scoreKey: ScoreKey, value: number) {
  const scoreBand = value >= 75 ? "Strong" : value >= 55 ? "Moderate" : "Watchlist";
  const drivers: Record<ScoreKey, string> = {
    developmentPotential: "site context, land-use assumptions, infrastructure maturity and development fit",
    investmentAttractiveness: "location quality, demand drivers, liquidity assumptions and risk-adjusted opportunity",
    accessibility: "road proximity, corridor access, transport assumptions and surrounding urban connectivity",
    infrastructureReadiness: "utility, access, construction and public infrastructure readiness assumptions",
    climateHeatRisk: "heat exposure, coastal sensitivity, outdoor comfort and resilience requirements",
    overallRisk: "combined execution, market, planning, climate and evidence maturity signals"
  };

  return `${scoreBand} sample/open signal based on ${drivers[scoreKey]}. Requires official source validation before underwriting.`;
}

function scoreBarTone(scoreKey: ScoreKey, value: number) {
  const riskMetric = scoreKey === "climateHeatRisk" || scoreKey === "overallRisk";

  if (riskMetric) {
    if (value >= 70) return "bg-[#c75f2d]";
    if (value >= 50) return "bg-[#d7a928]";
    return "bg-brand";
  }

  if (value >= 75) return "bg-brand";
  if (value >= 55) return "bg-[#d7a928]";
  return "bg-[#c75f2d]";
}

function ScoreGauge({
  score,
  label,
  detail
}: {
  score: number;
  label: string;
  detail: string;
}) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="flex h-full min-h-[172px] items-center gap-4 rounded-md border border-line bg-white p-4 shadow-sm">
      <div className="relative h-[112px] w-[112px] shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
          <circle cx="56" cy="56" r={radius} stroke="#eef2f1" strokeWidth="12" fill="none" />
          <circle
            cx="56"
            cy="56"
            r={radius}
            stroke="#1f5b67"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-brand">{score}</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">/100</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="safe-line-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        <p className="safe-line-3 mt-2 text-sm leading-6 text-ink">{detail}</p>
      </div>
    </div>
  );
}

function SignalBar({
  label,
  value,
  detail,
  scoreKey
}: {
  label: string;
  value: number;
  detail?: string;
  scoreKey: ScoreKey;
}) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="safe-line-1 text-xs font-semibold text-ink">{label}</p>
        <span className="text-xs font-black text-ink">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
        <div className={`h-full rounded-full ${scoreBarTone(scoreKey, value)}`} style={{ width: `${value}%` }} />
      </div>
      {detail ? <p className="safe-line-1 mt-2 text-[11px] leading-4 text-muted">{detail}</p> : null}
    </div>
  );
}

function toneClasses(tone: DashboardTone) {
  const classes: Record<DashboardTone, string> = {
    positive: "border-[#bddbd3] bg-[#edf7f4] text-brand",
    neutral: "border-line bg-white text-ink",
    warning: "border-[#ead28a] bg-[#fff8db] text-[#7a5a00]",
    critical: "border-[#efc0ad] bg-[#fff4ed] text-[#9f3412]"
  };

  return classes[tone];
}

function KpiTile({ kpi }: { kpi: DashboardKpi }) {
  return (
    <div className={`min-w-0 rounded-md border px-3 py-2 ${toneClasses(kpi.tone)}`}>
      <p className="text-[11px] font-semibold uppercase text-muted">{kpi.label}</p>
      <p className="mt-1 break-words text-base font-semibold leading-5 text-ink">
        {kpi.value}{kpi.unit ? <span className="ml-1 text-xs font-semibold text-muted">{kpi.unit}</span> : null}
      </p>
      {kpi.explanation ? <p className="mt-1 text-[11px] leading-4 text-muted">{kpi.explanation}</p> : null}
    </div>
  );
}

function DriverBar({ item }: { item: DashboardDriver }) {
  const score = Math.max(0, Math.min(100, item.score ?? 60));
  const barClass = item.type === "risk" || item.type === "validation" ? "bg-[#c75f2d]" : "bg-brand";

  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold leading-5 text-ink">{item.label}</p>
        <span className="shrink-0 text-xs font-black text-ink">{score}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${score}%` }} />
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer list-none text-[11px] font-semibold text-muted">Details</summary>
        <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
      </details>
    </div>
  );
}

function MatrixPlot({ items }: { items: DashboardMatrixItem[] }) {
  return (
    <div className="relative h-72 rounded-md border border-line bg-white p-4">
      <div className="absolute inset-4 grid grid-cols-2 grid-rows-2 overflow-hidden rounded-md border border-line">
        <div className="border-b border-r border-line bg-[#edf7f4]" />
        <div className="border-b border-line bg-[#fff8db]" />
        <div className="border-r border-line bg-surface" />
        <div className="bg-[#fff4ed]" />
      </div>
      <span className="absolute left-4 top-1 text-[11px] font-semibold text-muted">Higher urgency</span>
      <span className="absolute bottom-1 right-4 text-[11px] font-semibold text-muted">Higher upside</span>
      {items.map((item) => (
        <div
          key={item.id}
          className={`absolute max-w-[112px] rounded-md border px-2 py-1 text-[10px] font-semibold shadow-sm ${toneClasses(item.tone)}`}
          style={{
            left: `calc(${item.x}% - 44px)`,
            bottom: `calc(${item.y}% - 14px)`
          }}
          title={item.label}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

function DashboardModule({
  module,
  matrix,
  evidence
}: {
  module: DashboardInsightModule;
  matrix: DashboardMatrixItem[];
  evidence: ExpressAnalysis["evidence"];
}) {
  return (
    <details className="rounded-lg border border-line bg-white p-4 shadow-sm" open={module.defaultOpen}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">{module.subtitle}</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{module.title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{module.summary}</p>
          </div>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
            {module.items.length} item{module.items.length === 1 ? "" : "s"}
          </span>
        </div>
      </summary>
      {module.type === "risk_matrix" ? (
        <div className="mt-4">
          <MatrixPlot items={matrix} />
        </div>
      ) : module.type === "evidence_summary" ? (
        <div className="mt-4">
          <EvidenceSourceCards evidence={evidence} />
        </div>
      ) : module.type === "next_actions" ? (
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {module.items.map((item, index) => (
            <li key={item.id} className="flex gap-3 rounded-md border border-line bg-surface p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold leading-5 text-ink">{item.label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{item.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {module.items.map((item) => (
            <DriverBar key={item.id} item={item} />
          ))}
        </div>
      )}
    </details>
  );
}

function DriverRiskMatrix({
  opportunities,
  risks
}: {
  opportunities: string[];
  risks: string[];
}) {
  const matrixRows = [
    ["Upside", opportunities[0] ?? "Opportunity signals available below"],
    ["Constraint", risks[0] ?? "Risk signals available below"],
    ["Validation", risks[1] ?? "Official source checks remain required"]
  ];

  return (
    <div className="grid gap-2">
      {matrixRows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 rounded-md border border-line bg-white p-3">
          <span className="rounded-md bg-surface px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            {label}
          </span>
          <span className="safe-line-2 text-xs leading-5 text-ink">{value}</span>
        </div>
      ))}
    </div>
  );
}

function CandidateDashboardSwitcher({ navigation }: { navigation: CandidateDashboardNavigation }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Candidate dashboard</p>
        <p className="safe-line-1 mt-1 text-sm font-semibold text-ink">Switch between ranked shortlist candidates</p>
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <select
          value={navigation.activeItemId ?? ""}
          onChange={(event) => {
            const nextItem = navigation.items.find((item) => item.id === event.target.value);
            if (nextItem) {
              navigation.onOpenItem(nextItem);
            }
          }}
          className="h-10 min-w-0 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand sm:w-72"
        >
          {navigation.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={navigation.onBackToComparison}
          className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
        >
          Ranked shortlist
        </button>
      </div>
    </div>
  );
}

function AnalysisCard({
  id,
  children,
  className = ""
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-4 rounded-lg border border-line bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function AnalysisCardHeader({
  title,
  subtitle,
  badge
}: {
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p> : null}
      </div>
      {badge ? (
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function AnalysisMetricCard({
  label,
  value,
  detail,
  className = ""
}: {
  label: string;
  value: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={`flex h-full min-h-[76px] min-w-0 flex-col overflow-hidden rounded-md border border-line bg-surface px-3 py-2 ${className}`}>
      <span className="safe-line-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <p className="safe-line-2 mt-1 text-sm font-semibold capitalize leading-5 text-ink">{value}</p>
      {detail ? <p className="safe-line-2 mt-1 text-xs leading-5 text-muted">{detail}</p> : null}
    </div>
  );
}

function AnalysisListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="h-full rounded-md border border-line bg-surface px-4 py-3 text-sm leading-6 text-muted">
      {children}
    </li>
  );
}

function UploadedDataContextBlock({ analysis }: { analysis: ExpressAnalysis }) {
  const context = analysis.uploadedDataContext;

  if (!context || context.uploadedDatasets.length === 0) {
    return null;
  }

  return (
    <AnalysisCard>
      <AnalysisCardHeader
        title="Uploaded Data Context"
        subtitle="Local user-provided files considered in this analysis. These are not official until validated."
        badge={`${context.uploadedDatasets.length} local`}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {context.uploadedDatasets.map((dataset) => {
          const applied = context.appliedMetrics.find((match) => match.datasetId === dataset.id);
          const available = context.availableButNotApplied.find((match) => match.datasetId === dataset.id);
          const status = applied ? "Applied" : available ? "Available, not applied" : dataset.type === "geojson" ? "Map layer" : "Available";

          return (
            <div key={dataset.id} className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{dataset.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-muted">
                    {dataset.type} / {dataset.sourceMode.replace(/-/g, " ")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand">
                  {status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {applied?.note ?? available?.note ?? dataset.notes ?? "Local dataset available as validation-required context."}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Official status: {dataset.officialStatus.replace(/-/g, " ")}. Confidence: {dataset.confidence.replace(/-/g, " ")}.
              </p>
            </div>
          );
        })}
      </div>
    </AnalysisCard>
  );
}

function createStableKey(section: string, value: string, index: number) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${section}-${index}-${slug || "item"}`;
}

function ScoreTooltip({
  label,
  score,
  scoreKey
}: {
  label: string;
  score: number;
  scoreKey: ScoreKey;
}) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-30 hidden w-72 rounded-lg border border-line bg-white p-4 text-left shadow-soft group-hover:block group-focus-within:block">
      <p className="text-sm font-semibold text-ink">{label} - {score}/100</p>
      <p className="mt-2 text-xs leading-5 text-muted">{scoreInterpretation(scoreKey, score)}</p>
    </div>
  );
}

function formatGeneratedAt(value?: string) {
  if (!value) {
    return "Current session";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

function formatScenarioLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
}

function createExecutivePreview(analysis: ExpressAnalysis) {
  const subject = analysis.selectedObject?.name ?? "the selected location";
  const area = analysis.marketContext?.areaName;
  const scenario = formatScenarioLabel(analysis.scenarioId);
  const importedMetricsUsed = analysis.marketMetricsMatch?.importedMetricsUsed || analysis.marketContext?.importedMarketMetrics?.importedMetricsUsed;
  const sourceBasis = importedMetricsUsed ? "imported sample metrics and spatial context" : "sample/open spatial and market context";
  const place = area && !subject.toLowerCase().includes(area.toLowerCase())
    ? `${subject} in ${area}`
    : subject;

  if (analysis.customQuerySummary) {
    return `${analysis.customQuerySummary} ${analysis.customQueryAnswer?.confidenceNote ?? "This remains a screening interpretation and requires official validation before decision-grade use."}`;
  }

  if (analysis.scenarioId === "climateRisk") {
    return `This ${scenario} screening frames ${place} through heat, coastal exposure and resilience requirements using ${sourceBasis}. The site remains conditional until official risk layers, infrastructure assumptions and mitigation requirements are validated.`;
  }

  if (analysis.scenarioId === "constructionMonitoring") {
    return `This ${scenario} screening positions ${place} as a monitoring candidate using ${sourceBasis}. The recommendation remains conditional until site status, progress evidence and update cadence are validated.`;
  }

  return `This ${scenario} screening highlights ${place} using ${sourceBasis}. The opportunity remains conditional until official land-use, transaction comps, infrastructure and planning constraints are validated.`;
}

function createScreeningSignals(analysis: ExpressAnalysis, decisionPosture: string) {
  const importedMetricsUsed =
    analysis.marketMetricsMatch?.importedMetricsUsed ||
    analysis.marketContext?.importedMarketMetrics?.importedMetricsUsed;
  const marketBasis = importedMetricsUsed ? "Imported sample metrics" : analysis.marketContext ? "Sample/static area context" : "Sample/open context";
  const customLens = analysis.customQueryAnswer
    ? analysis.customQueryAnswer.intent.replace(/_/g, " ")
    : null;

  if (customLens) {
    return [
      ["Analysis lens", customLens],
      ["Market basis", marketBasis],
      ["Validation need", analysis.customQueryAnswer?.validationNeeded[0] ?? "Official source checks"],
      ["Next step", analysis.customQueryAnswer?.nextActions[0] ?? "Validate evidence gaps"]
    ];
  }

  if (analysis.scenarioId === "realEstateDevelopment") {
    return [
      ["Market basis", importedMetricsUsed ? "Demand/development proxy" : "Sample demand proxy"],
      ["Validation need", "Land-use, FAR and use checks"],
      ["Decision logic", "Conditional suitability"],
      ["Next step", "Planning and feasibility"]
    ];
  }

  if (analysis.scenarioId === "climateRisk") {
    return [
      ["Market basis", "Exposure context only"],
      ["Validation need", "Heat/flood official layers"],
      ["Decision logic", "Mitigation required"],
      ["Next step", "Specialist risk review"]
    ];
  }

  if (analysis.scenarioId === "constructionMonitoring") {
    return [
      ["Market basis", "Secondary context"],
      ["Validation need", "Imagery baseline"],
      ["Decision logic", "Monitoring feasibility"],
      ["Next step", "Define AOI cadence"]
    ];
  }

  if (analysis.scenarioId === "investmentSiteSelection") {
    return [
      ["Market basis", marketBasis],
      ["Validation need", "DLD comps and planning"],
      ["Decision logic", decisionPosture],
      ["Next step", decisionPosture.toLowerCase().includes("compare") ? "Compare alternatives" : "Run due diligence"]
    ];
  }

  return [
    ["Market basis", marketBasis],
    ["Validation need", analysis.selectedObject?.spatialContext ? "Geometry and source checks" : "Official source checks"],
    ["Decision logic", decisionPosture],
    ["Next step", "Validate evidence gaps"]
  ];
}

function createDecisionRationalePreview(value: string) {
  if (value.toLowerCase().includes("official validation")) {
    return "Current evidence supports screening only; official planning, market and source validation must precede decision-grade use.";
  }

  if (value.length > 180) {
    return "Current screening signals are useful for prioritization, but the recommendation remains conditional on source validation.";
  }

  return value;
}

function createDataConfidencePreview(value: string, importedMetricsUsed?: boolean) {
  if (importedMetricsUsed) {
    return "Sample / imported";
  }

  if (value.length > 95) {
    return "Sample evidence";
  }

  return value;
}

function formatDecisionToken(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createMetadataDetail(label: string, analysis: ExpressAnalysis, marketMetricsImported?: boolean) {
  if (label === "Data confidence") {
    return marketMetricsImported ? "Validation required" : "Official validation required";
  }

  if (label === "Analysis lens" && analysis.customQueryAnswer) {
    return analysis.customQueryAnswer.confidenceNote;
  }

  return undefined;
}

export function ExpressDashboard({
  analysis,
  onBackToMap,
  onExportReport,
  candidateNavigation
}: ExpressDashboardProps) {
  const dashboardRef = useRef<HTMLElement | null>(null);
  const dashboardModel = buildDashboardModel(analysis);
  const analysisBadge = analysis.analysisMode === "openai" ? "AI analysis" : "Sample/open context";
  const modeLabel = analysis.analysisMode === "openai" ? "AI-powered" : "Sample/open context";
  const dataLimitation = analysis.limitations?.[0] ?? "Structured evidence context with deterministic sample scoring.";
  const decisionPosture = deriveDecisionPosture(analysis);
  const decisionRationale = deriveDecisionRationale(analysis);
  const marketMetricsMatch = analysis.marketContext?.importedMarketMetrics ?? analysis.marketMetricsMatch;
  const importedMetric = marketMetricsMatch?.metrics;
  const summaryPreview = createExecutivePreview(analysis);
  const screeningSignals = createScreeningSignals(analysis, decisionPosture);
  const decisionRationalePreview = createDecisionRationalePreview(decisionRationale);
  const limitationPreview = createDataConfidencePreview(dataLimitation, marketMetricsMatch?.importedMetricsUsed);
  const dashboardSections = getDashboardSections(analysis.scenarioId);
  const overallSuitability =
    analysis.aiDecisionScore?.suitabilityScore ??
    Math.round((analysis.scores.developmentPotential + analysis.scores.investmentAttractiveness + analysis.scores.accessibility) / 3);

  function scrollToDashboardSection(sectionId: string) {
    const target = dashboardRef.current?.querySelector<HTMLElement>(`#${sectionId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const summaryCards = [
    {
      label: "Decision",
      value: decisionPosture,
      detail: decisionRationalePreview,
      targetId: `section-${dashboardSections[0]?.id ?? "recommended-use"}`
    },
    {
      label: "Suitability",
      value: `${overallSuitability}/100`,
      detail: `${analysis.confidenceLevel ?? "medium"} confidence; validation required.`,
      targetId: "section-score-overview"
    },
    {
      label: "Key drivers",
      value: analysis.keyFactors[0] ?? "Drivers available below",
      detail: `${analysis.keyFactors.length} driver signal(s) in this run.`,
      targetId: "section-key-drivers"
    },
    {
      label: "Key risks",
      value: analysis.risks[0] ?? "Risks available below",
      detail: `${analysis.risks.length} risk signal(s) in this run.`,
      targetId: "section-risks-constraints"
    },
    {
      label: "Validation gaps",
      value: analysis.aiDecisionScore?.validationRequired[0] ?? analysis.limitations?.[0] ?? "Official validation required",
      detail: "Screening output only; source checks remain required.",
      targetId: "section-validation-gaps"
    },
    {
      label: "Next actions",
      value: analysis.nextActions[0] ?? "Review source gaps",
      detail: `${analysis.nextActions.length} follow-up action(s).`,
      targetId: "section-next-actions"
    },
    {
      label: "Scenario section",
      value: dashboardSections[0]?.title ?? "Scenario answer",
      detail: dashboardSections[0]?.summary ?? "Scenario-specific detail below.",
      targetId: `section-${dashboardSections[0]?.id ?? "recommended-use"}`
    }
  ];

  useEffect(() => {
    dashboardRef.current?.scrollTo({ top: 0, left: 0 });
  }, [analysis.id]);

  return (
    <section ref={dashboardRef} className="h-[calc(100vh-72px)] overflow-y-auto bg-surface p-3 lg:p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <section className="flex min-h-[calc(100vh-96px)] flex-col gap-3 xl:h-[calc(100vh-96px)] xl:min-h-0">
          <header className="flex shrink-0 flex-col justify-between gap-3 rounded-lg border border-line bg-white p-3 shadow-sm lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-ink lg:text-[26px]">{analysis.title}</h1>
                <span className="rounded-full bg-[#eaf3f1] px-3 py-1 text-xs font-semibold text-brand">
                  {analysisBadge}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-muted">
                {analysis.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onExportReport}
                className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
              >
                Export
              </button>
              <button
                type="button"
                onClick={onBackToMap}
                className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
              >
                Back to setup
              </button>
            </div>
          </header>

          {candidateNavigation ? <CandidateDashboardSwitcher navigation={candidateNavigation} /> : null}

          <div className="grid min-h-0 flex-1 items-stretch gap-3 xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
            <MapContextCard
              title="Map Context"
              subtitle={
                analysis.selectedAoi
                  ? `${userDrawnAoiSourceLabel(analysis.selectedAoi)} with surrounding Dubai context`
                  : analysis.analysisTarget?.type === "user-drawn-aoi"
                  ? "User-drawn AOI with surrounding Dubai context"
                  : analysis.analysisTarget?.type === "uploaded-feature"
                  ? "Uploaded screening geometry with surrounding Dubai context"
                  : analysis.analysisTarget?.type === "demo-feature"
                    ? "Sample/open screening geometry with surrounding Dubai context"
                    : "Selected point with surrounding Dubai context"
              }
              selectedPoint={analysis.point}
              selectedObject={analysis.selectedObject ?? null}
              selectedAoi={analysis.selectedAoi ?? null}
              analysisTarget={analysis.analysisTarget ?? null}
            />

            <section className="flex h-full min-h-[420px] min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface p-4 shadow-sm print:h-auto print:min-h-0 print:overflow-visible">
              <div className="grid shrink-0 gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="rounded-md border border-[#d6c391] bg-[#fff9e8] p-4">
                  <p className="safe-line-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6f5817]">Decision posture</p>
                  <p className="mt-2 text-lg font-semibold leading-6 text-ink">{dashboardModel.decisionPosture}</p>
                  <p className="mt-2 text-sm leading-5 text-muted">
                    {dashboardModel.decisionSummary}
                  </p>
                </div>
                <ScoreGauge
                  score={dashboardModel.primaryScore}
                  label="Suitability"
                  detail={`${dashboardModel.confidenceLabel}; validation required before decision-grade use.`}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted xl:text-[15px]">{summaryPreview}</p>
              {analysis.analysisNotice ? (
                <p className="safe-line-2 mt-3 rounded-md border border-line bg-white px-3 py-2 text-xs leading-5 text-muted">
                  {analysis.analysisNotice}
                </p>
              ) : null}
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {dashboardModel.kpis.map((kpi) => (
                  <KpiTile key={kpi.id} kpi={kpi} />
                ))}
              </div>
              <div className="mt-3 grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1 [scrollbar-width:thin] lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
                <div className="grid content-start gap-2">
                  <p className="text-xs font-semibold uppercase text-muted">Top drivers</p>
                  {dashboardModel.drivers.slice(0, 3).map((item) => (
                    <DriverBar key={item.id} item={item} />
                  ))}
                </div>
                <div className="grid content-start gap-2">
                  <p className="text-xs font-semibold uppercase text-muted">Top risks</p>
                  {dashboardModel.risks.slice(0, 3).map((item) => (
                    <DriverBar key={item.id} item={item} />
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-md border border-line bg-white p-3">
                <p className="text-xs font-semibold uppercase text-muted">Recommended next action</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-ink">{dashboardModel.recommendedNextAction}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {dashboardModel.actions.slice(1, 3).map((item) => (
                    <p key={item.id} className="rounded-md bg-surface px-2 py-1.5 text-xs leading-5 text-muted">
                      {item.label}
                    </p>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-3">
          {dashboardModel.modules.map((module) => (
            <DashboardModule
              key={module.id}
              module={module}
              matrix={dashboardModel.matrix}
              evidence={analysis.evidence}
            />
          ))}
        </section>
      </div>
    </section>
  );
}
