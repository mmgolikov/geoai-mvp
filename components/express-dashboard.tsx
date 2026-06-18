"use client";

import { useEffect, useRef } from "react";
import { ValidationRequirementList } from "@/components/data-readiness";
import { EvidenceSourceCards } from "@/components/evidence-source-cards";
import { MapContextCard } from "@/components/map-context-card";
import { deriveDecisionPosture, deriveDecisionRationale } from "@/src/lib/decision-posture";
import type { ExpressAnalysis, ScoreKey } from "@/src/types/geo";

type ExpressDashboardProps = {
  analysis: ExpressAnalysis;
  onBackToMap: () => void;
  onExportReport: () => void;
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

  return `${scoreBand} demo-normalized signal based on ${drivers[scoreKey]}. Requires official source validation before underwriting.`;
}

function AnalysisCard({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-white p-5 shadow-sm ${className}`}>
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
    <div className={`flex h-full min-h-[76px] flex-col rounded-md border border-line bg-surface px-3 py-2 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <p className="mt-1 break-words text-sm font-semibold capitalize leading-5 text-ink">{value}</p>
      {detail ? <p className="mt-1 break-words text-xs leading-5 text-muted">{detail}</p> : null}
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
    minute: "2-digit"
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
  const sourceBasis = importedMetricsUsed ? "imported sample metrics and spatial context" : "demo-normalized spatial and market context";
  const place = area && !subject.toLowerCase().includes(area.toLowerCase())
    ? `${subject} in ${area}`
    : subject;

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
  const marketBasis = importedMetricsUsed ? "Imported sample metrics" : analysis.marketContext ? "Seed/static area context" : "Demo fallback context";

  if (analysis.scenarioId === "realEstateDevelopment") {
    return [
      ["Market basis", importedMetricsUsed ? "Demand/development proxy" : "Demo demand proxy"],
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
    return "Demo-normalized / imported sample; official validation required.";
  }

  if (value.length > 95) {
    return "Demo-normalized evidence; official validation required.";
  }

  return value;
}

export function ExpressDashboard({ analysis, onBackToMap, onExportReport }: ExpressDashboardProps) {
  const dashboardRef = useRef<HTMLElement | null>(null);
  const analysisBadge = analysis.analysisMode === "openai" ? "AI analysis" : "Demo fallback";
  const modeLabel = analysis.analysisMode === "openai" ? "AI-powered" : "Demo fallback";
  const dataLimitation = analysis.limitations?.[0] ?? "Structured evidence context with deterministic demo scoring.";
  const decisionPosture = deriveDecisionPosture(analysis);
  const decisionRationale = deriveDecisionRationale(analysis);
  const marketMetricsMatch = analysis.marketContext?.importedMarketMetrics ?? analysis.marketMetricsMatch;
  const importedMetric = marketMetricsMatch?.metrics;
  const summaryPreview = createExecutivePreview(analysis);
  const screeningSignals = createScreeningSignals(analysis, decisionPosture);
  const decisionRationalePreview = createDecisionRationalePreview(decisionRationale);
  const limitationPreview = createDataConfidencePreview(dataLimitation, marketMetricsMatch?.importedMetricsUsed);

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
                onClick={onBackToMap}
                className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
              >
                Back to map
              </button>
              <button
                type="button"
                onClick={onExportReport}
                className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
              >
                Export report
              </button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 items-stretch gap-3 xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
            <MapContextCard
              title="Map Context"
              subtitle="Selected point or spatial object with surrounding Dubai context"
              selectedPoint={analysis.point}
              selectedObject={analysis.selectedObject ?? null}
            />

            <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-lg border border-line bg-white p-4 shadow-sm print:h-auto print:min-h-0 print:overflow-visible">
              <div className="shrink-0 rounded-md border border-[#d6c391] bg-[#fff9e8] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6f5817]">Decision Posture</p>
                <p className="mt-2 text-base font-semibold leading-6 text-ink">{decisionPosture}</p>
                <p className="mt-1 text-sm leading-5 text-muted">
                  {decisionRationalePreview}
                </p>
              </div>
              <div className="grid min-h-0 flex-1 content-start gap-3 py-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Executive Summary</h2>
                  <p className="mt-2 text-sm leading-6 text-muted xl:text-[15px]">{summaryPreview}</p>
                </div>
                {analysis.analysisNotice ? (
                  <p className="rounded-md border border-line bg-surface px-3 py-2 text-xs leading-5 text-muted">
                    {analysis.analysisNotice}
                  </p>
                ) : null}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Screening Signals</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {screeningSignals.map(([label, value]) => (
                      <div key={label} className="flex min-h-[58px] flex-col justify-between rounded-md border border-line bg-surface px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
                        <p className="mt-1 break-words text-sm font-semibold leading-5 text-ink">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-auto grid shrink-0 gap-2 text-sm md:grid-cols-2">
                <AnalysisMetricCard label="Analysis mode" value={modeLabel} />
                <AnalysisMetricCard label="Confidence level" value={analysis.confidenceLevel ?? "medium"} />
                <AnalysisMetricCard label="Data confidence" value={limitationPreview} />
                <AnalysisMetricCard label="Generated" value={formatGeneratedAt(analysis.generatedAt)} />
              </div>
            </section>
          </div>
        </section>

        <AnalysisCard>
          <AnalysisCardHeader
            title="Scenario-specific Score Overview"
            subtitle="Demo-normalized scores for screening. Hover a score for interpretation and validation caveats."
          />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {scoreOrder.map((scoreKey) => {
              const score = analysis.scores[scoreKey];

              return (
                <div
                  key={scoreKey}
                  tabIndex={0}
                  className="group relative flex h-full min-h-[150px] flex-col rounded-md border border-line bg-white p-4 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                  aria-label={`${analysis.scoreLabels[scoreKey]} score ${score}`}
                >
                  <ScoreTooltip label={analysis.scoreLabels[scoreKey]} score={score} scoreKey={scoreKey} />
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm font-semibold leading-5 text-ink">
                      {analysis.scoreLabels[scoreKey]}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${scoreTone(scoreKey, score)}`}>
                      {score}
                    </span>
                  </div>
                  <div className="mt-auto h-2 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </AnalysisCard>

        <AnalysisCard>
          <AnalysisCardHeader title="Executive Narrative" />
          <p className="mt-3 text-base leading-8 text-muted">{analysis.summary}</p>
          {analysis.analysisNotice ? (
            <p className="mt-4 rounded-md border border-line bg-surface px-3 py-2 text-sm leading-5 text-muted">
              {analysis.analysisNotice}
            </p>
          ) : null}
        </AnalysisCard>

        {analysis.marketContext ? (
          <AnalysisCard>
            <AnalysisCardHeader
              title="Market Context"
              subtitle={`${analysis.marketContext.areaName} / ${analysis.marketContext.emirate}`}
              badge={`${marketMetricsMatch?.sourceMode ?? analysis.marketContext.sourceMode ?? "seed_static"} / ${marketMetricsMatch?.confidence ?? analysis.marketContext.confidenceLevel} confidence`}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {importedMetric ? (
                <>
                  <AnalysisMetricCard
                    label="Matched imported area"
                    value={marketMetricsMatch?.matchedAreaName ?? importedMetric.areaName}
                    detail={`${marketMetricsMatch?.matchType ?? "exact"} match from local CSV ingestion output.`}
                  />
                  <AnalysisMetricCard
                    label="Transactions"
                    value={`${importedMetric.transactionCount}`}
                    detail={`Value AED ${importedMetric.transactionValueAed.toLocaleString("en-US")}; median ${importedMetric.medianPricePerSqm?.toLocaleString("en-US") ?? "-"} AED/sqm.`}
                  />
                  <AnalysisMetricCard
                    label="Rental records"
                    value={`${importedMetric.rentalRecordCount}`}
                    detail={`Median rent ${importedMetric.medianRentPerSqm?.toLocaleString("en-US") ?? "-"} AED/sqm; sample/manual import.`}
                  />
                </>
              ) : null}
              <AnalysisMetricCard
                label="Market Activity"
                value={`${analysis.marketContext.marketMetrics?.activityIndex ?? analysis.marketContext.marketActivityLevel.index}/100`}
                detail={analysis.marketContext.marketActivityLevel.note}
              />
              <AnalysisMetricCard
                label="Rental Demand"
                value={`${analysis.marketContext.marketMetrics?.rentalDemandIndex ?? analysis.marketContext.rentContext.index}/100`}
                detail={analysis.marketContext.rentContext.note}
              />
              <AnalysisMetricCard
                label="Liquidity"
                value={`${analysis.marketContext.marketMetrics?.liquidityIndex ?? analysis.marketContext.transactionContext.index}/100`}
                detail={analysis.marketContext.transactionContext.note}
              />
              <AnalysisMetricCard
                label="Development Pipeline"
                value={`${importedMetric?.pipelineProxy ?? analysis.marketContext.marketMetrics?.developmentPipelineIndex ?? analysis.marketContext.developmentPipelineContext.index}/100`}
                detail={analysis.marketContext.developmentPipelineContext.note}
              />
              <AnalysisMetricCard
                label="Risk Index"
                value={`${analysis.marketContext.marketMetrics?.riskIndex ?? analysis.marketContext.riskContext.index}/100`}
                detail={analysis.marketContext.riskContext.note}
              />
              <AnalysisMetricCard
                label="Trend"
                value={analysis.marketContext.marketMetrics?.trend ?? analysis.marketContext.marketActivityLevel.trend}
                detail="Directional market signal for the selected area."
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              Note: {marketMetricsMatch?.note ?? analysis.marketContext.dataQualityNotes?.[0] ?? "Current values are demo-normalized indices and not official market data."}
              {" "}
              {marketMetricsMatch?.importedMetricsUsed
                ? "Imported sample metrics demonstrate the market-data workflow. Validate against official DLD / Dubai Pulse datasets before investment decisions."
                : analysis.marketContext.dataQualityNotes?.[1] ?? analysis.marketContext.limitations[0]}
            </p>
          </AnalysisCard>
        ) : null}

        {analysis.selectedObject?.spatialContext ? (
          <AnalysisCard>
            <AnalysisCardHeader
              title="Spatial Object Details"
              subtitle={analysis.selectedObject.name}
              badge={`${analysis.selectedObject.spatialContext.geometryStatus} / ${analysis.selectedObject.spatialContext.confidenceLevel}`}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AnalysisMetricCard
                label="Category"
                value={analysis.selectedObject.spatialContext.category.replace(/_/g, " ")}
                detail={analysis.selectedObject.spatialContext.subtype}
              />
              <AnalysisMetricCard
                label="Geometry"
                value={analysis.selectedObject.spatialContext.geometryType}
                detail={analysis.selectedObject.spatialContext.areaSqm ? `Estimated area ${analysis.selectedObject.spatialContext.areaSqm.toLocaleString()} sqm` : "Area not available for this geometry."}
              />
              <AnalysisMetricCard
                label="Source status"
                value={analysis.selectedObject.spatialContext.sourceStatus}
                detail={analysis.selectedObject.spatialContext.datasetName}
              />
              <AnalysisMetricCard
                label="Scenario relevance"
                value={`${analysis.selectedObject.spatialContext.scenarioRelevance.length} scenarios`}
                detail={analysis.selectedObject.spatialContext.scenarioRelevance.join(", ")}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              Note: {analysis.selectedObject.spatialContext.limitations[0]}
            </p>
          </AnalysisCard>
        ) : null}

        <AnalysisCard>
          <AnalysisCardHeader title="Key Value Drivers" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analysis.keyFactors.map((factor) => (
              <article key={factor} className="h-full rounded-md border border-line bg-surface p-4">
                <div className="mb-3 h-1 w-10 rounded-full bg-accent" />
                <p className="text-sm leading-6 text-ink">{factor}</p>
              </article>
            ))}
          </div>
        </AnalysisCard>

        <div className="grid gap-5 lg:grid-cols-2">
          <AnalysisCard>
            <AnalysisCardHeader title="Opportunities" />
            <ul className="mt-4 grid gap-3">
              {analysis.opportunities.map((item) => (
                <AnalysisListItem key={item}>{item}</AnalysisListItem>
              ))}
            </ul>
          </AnalysisCard>

          <AnalysisCard>
            <AnalysisCardHeader title="Critical Constraints" />
            <ul className="mt-4 grid gap-3">
              {analysis.risks.map((item) => (
                <AnalysisListItem key={item}>{item}</AnalysisListItem>
              ))}
            </ul>
          </AnalysisCard>
        </div>

        <ValidationRequirementList evidence={analysis.evidence} />

        <AnalysisCard>
          <AnalysisCardHeader
            title="Due Diligence Checklist"
            subtitle="Concrete follow-up steps before underwriting, approval or client recommendation"
          />
          <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analysis.nextActions.map((action, index) => (
              <li key={action} className="flex h-full gap-3 rounded-md border border-line bg-surface p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-muted">{action}</span>
              </li>
            ))}
          </ol>
        </AnalysisCard>

        <AnalysisCard>
          <AnalysisCardHeader
            title="Evidence / Data Used"
            subtitle="Source context, maturity, confidence and limitations behind this analysis"
            badge={`${analysis.evidence.length} sources`}
          />
          <div className="mt-5">
            <EvidenceSourceCards evidence={analysis.evidence} />
          </div>
        </AnalysisCard>
      </div>
    </section>
  );
}
