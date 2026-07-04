"use client";

import { useEffect, useRef } from "react";
import { BiDrilldownModule } from "@/components/dashboard/bi-drilldown-module";
import { BiKpiCard } from "@/components/dashboard/bi-kpi-card";
import { BiScoreBars } from "@/components/dashboard/bi-score-bars";
import { BiScoreGauge } from "@/components/dashboard/bi-score-gauge";
import { TextSafeValue } from "@/components/dashboard/text-safe";
import { MapContextCard } from "@/components/map-context-card";
import { userDrawnAoiSourceLabel } from "@/src/lib/aoi-library";
import { buildDashboardModel } from "@/src/lib/dashboard/dashboard-model";
import type { ComparisonItem, ExpressAnalysis } from "@/src/types/geo";

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

function CandidateDashboardSwitcher({ navigation }: { navigation: CandidateDashboardNavigation }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Candidate dashboard</p>
        <TextSafeValue className="mt-1 text-sm font-semibold text-ink">
          Switch between ranked shortlist candidates
        </TextSafeValue>
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

export function ExpressDashboard({
  analysis,
  onBackToMap,
  onExportReport,
  candidateNavigation
}: ExpressDashboardProps) {
  const dashboardRef = useRef<HTMLElement | null>(null);
  const dashboardModel = buildDashboardModel(analysis);
  const analysisBadge = analysis.analysisMode === "openai" ? "AI analysis" : "Sample/open context";
  const dataLimitation = analysis.limitations?.[0] ?? "Structured evidence context with deterministic sample scoring.";
  const summaryPreview = createExecutivePreview(analysis);

  useEffect(() => {
    dashboardRef.current?.scrollTo({ top: 0, left: 0 });
  }, [analysis.id]);

  const primaryAction = dashboardModel.actions[0];
  const secondaryActions = dashboardModel.actions.slice(1, 3);
  const showDecisionDetail = dashboardModel.decisionDetail !== dashboardModel.decisionSummary;
  const evidenceModule = dashboardModel.modules.find((module) => module.type === "evidence_summary");
  const dashboardModules = [
    ...dashboardModel.modules.filter((module) => module.type !== "evidence_summary").slice(0, 5),
    ...(evidenceModule ? [evidenceModule] : [])
  ];

  return (
    <section ref={dashboardRef} className="h-[calc(100vh-72px)] overflow-y-auto bg-surface p-3 lg:p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <section className="flex min-h-[calc(100vh-96px)] flex-col gap-3">
          <header className="flex shrink-0 flex-col justify-between gap-3 rounded-lg border border-line bg-white p-3 shadow-sm lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <TextSafeValue as="h1" className="text-2xl font-semibold text-ink lg:text-[26px]">
                  {analysis.title}
                </TextSafeValue>
                <span className="rounded-full bg-[#eaf3f1] px-3 py-1 text-xs font-semibold text-brand">
                  {dashboardModel.scenarioLabel}
                </span>
                <TextSafeValue as="span" className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  {dashboardModel.targetLabel}
                </TextSafeValue>
              </div>
              <TextSafeValue className="mt-1 text-sm font-medium text-muted">
                {analysis.subtitle}
              </TextSafeValue>
              <TextSafeValue className="mt-1 text-xs leading-5 text-muted">
                {analysisBadge} / {dataLimitation} Official validation required before decision-grade use.
              </TextSafeValue>
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

          <div className="grid flex-1 items-stretch gap-3 xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
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

            <section className="flex min-w-0 flex-col rounded-lg border border-line bg-surface p-4 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.64fr)]">
                <div className="rounded-md border border-[#d6c391] bg-[#fff9e8] p-4">
                  <TextSafeValue className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6f5817]">
                    Decision posture
                  </TextSafeValue>
                  <TextSafeValue className="mt-2 text-2xl font-semibold leading-8 text-ink">
                    {dashboardModel.decisionPosture}
                  </TextSafeValue>
                  <TextSafeValue className="mt-2 text-sm leading-6 text-muted">
                    {dashboardModel.decisionSummary}
                  </TextSafeValue>
                  {showDecisionDetail ? (
                    <details className="mt-3 rounded-md border border-[#ead28a] bg-white px-3 py-2">
                      <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6f5817]">
                        Full rationale
                      </summary>
                      <TextSafeValue className="mt-2 border-t border-line pt-2 text-xs leading-5 text-muted">
                        {dashboardModel.decisionDetail}
                      </TextSafeValue>
                    </details>
                  ) : null}
                </div>
                <BiScoreGauge
                  score={dashboardModel.primaryScore}
                  label="Suitability"
                  summary={`${dashboardModel.confidenceLabel} confidence; validation required before decision-grade use.`}
                  detail={dashboardModel.decisionDetail}
                />
              </div>
              <TextSafeValue className="mt-3 text-sm leading-6 text-muted xl:text-[15px]">
                {summaryPreview}
              </TextSafeValue>
              {analysis.analysisNotice ? (
                <TextSafeValue className="mt-3 rounded-md border border-line bg-white px-3 py-2 text-xs leading-5 text-muted">
                  {analysis.analysisNotice}
                </TextSafeValue>
              ) : null}
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {dashboardModel.kpis.map((kpi) => (
                  <BiKpiCard
                    key={kpi.id}
                    label={kpi.label}
                    value={kpi.value}
                    unit={kpi.unit}
                    tone={kpi.tone}
                    explanation={kpi.explanation}
                  />
                ))}
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
                <BiScoreBars
                  title="Top drivers"
                  items={dashboardModel.drivers.slice(0, 3)}
                  emptyLabel="No driver signals were generated for this screening run."
                />
                <BiScoreBars
                  title="Top risks"
                  items={dashboardModel.risks.slice(0, 3)}
                  emptyLabel="No risk signals were generated for this screening run."
                />
              </div>
              <div className="mt-3 rounded-md border border-line bg-white p-3">
                <TextSafeValue className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Recommended next action
                </TextSafeValue>
                <TextSafeValue className="mt-1 text-sm font-semibold leading-5 text-ink">
                  {dashboardModel.recommendedNextAction}
                </TextSafeValue>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {secondaryActions.map((item) => (
                    <TextSafeValue key={item.id} className="rounded-md bg-surface px-2 py-1.5 text-xs leading-5 text-muted">
                      {item.label}
                    </TextSafeValue>
                  ))}
                </div>
                <details className="mt-2 rounded-md border border-line bg-surface px-3 py-2">
                  <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    Action details
                  </summary>
                  <TextSafeValue className="mt-2 border-t border-line pt-2 text-xs leading-5 text-muted">
                    {primaryAction?.detail ?? dashboardModel.recommendedNextActionDetail}
                  </TextSafeValue>
                </details>
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-3">
          {dashboardModules.map((module) => (
            <BiDrilldownModule
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
