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
    <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-line bg-white p-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase leading-4 text-muted">Candidate dashboard</p>
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
          className="h-9 min-w-0 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand sm:w-72"
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
          className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
        >
          Ranked shortlist
        </button>
      </div>
    </div>
  );
}

function formatGeneratedAt(value: string) {
  if (!value || value === "Not recorded") return "Time not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not recorded";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(date);
}

export function ExpressDashboard({
  analysis,
  onBackToMap,
  onExportReport,
  candidateNavigation
}: ExpressDashboardProps) {
  const dashboardRef = useRef<HTMLElement | null>(null);
  const dashboardModel = buildDashboardModel(analysis);
  const decisionResult = dashboardModel.decisionResult;
  const fullEvidenceText = `${decisionResult.sourceBasis.label}. ${decisionResult.caveat}`;
  const compactEvidenceText = `${decisionResult.sourceBasis.label} · ${formatGeneratedAt(decisionResult.generatedAt)}`;
  const summaryPreview = decisionResult.decision.rationale;

  useEffect(() => {
    dashboardRef.current?.scrollTo({ top: 0, left: 0 });
  }, [analysis.id]);

  const primaryAction = dashboardModel.actions[0];
  const secondaryActions = dashboardModel.actions.slice(1, 3);
  const showDecisionDetail = dashboardModel.decisionDetail !== dashboardModel.decisionSummary;
  const dashboardModules = dashboardModel.modules.filter((module) => module.type !== "evidence_summary").slice(0, 5);

  return (
    <section
      ref={dashboardRef}
      className="h-full min-h-0 overflow-y-auto bg-surface [scrollbar-width:thin]"
      data-dashboard-analysis-id={analysis.id}
      data-dashboard-latitude={decisionResult.coordinates?.latitude ?? analysis.point.latitude}
      data-dashboard-longitude={decisionResult.coordinates?.longitude ?? analysis.point.longitude}
      data-decision-contract-version={decisionResult.contractVersion}
    >
      <div className="flex h-full w-full min-w-0 flex-col">
        {/* The first overview prioritizes decision posture, score and next action before supporting KPI drill-down. */}
        <section className="flex h-full min-h-0 shrink-0 flex-col gap-2 p-3">
          <header className="grid shrink-0 gap-2 rounded-lg border border-line bg-white p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <TextSafeValue as="h1" className="text-xl font-semibold leading-7 text-ink lg:text-2xl" data-dashboard-value="target">
                  {decisionResult.target.label}
                </TextSafeValue>
                <span className="rounded-full bg-[#eaf3f1] px-3 py-1 text-xs font-semibold text-brand" data-dashboard-value="scenario">
                  {decisionResult.scenario.label}
                </span>
                <TextSafeValue as="span" className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  {decisionResult.target.type}
                </TextSafeValue>
              </div>
              <TextSafeValue className="mt-1 text-sm font-medium text-muted" data-dashboard-value="decision-question">
                {decisionResult.decisionQuestion}
              </TextSafeValue>
              <p
                className="mt-0.5 truncate text-xs leading-4 text-muted"
                title={fullEvidenceText}
                data-dashboard-evidence-row
              >
                <span className="sr-only">{fullEvidenceText}</span>
                <span aria-hidden="true">{compactEvidenceText}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-start gap-2 lg:justify-end">
              <button
                type="button"
                onClick={onExportReport}
                className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-semibold text-white transition hover:bg-[#113f50]"
              >
                Export
              </button>
              <button
                type="button"
                onClick={onBackToMap}
                className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-brand"
              >
                Edit criteria
              </button>
            </div>
          </header>

          {candidateNavigation ? <CandidateDashboardSwitcher navigation={candidateNavigation} /> : null}

          <section
            className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:hidden"
            aria-label="Decision result summary"
            data-mobile-result-summary
          >
            <article className="min-w-0 rounded-md border border-[#d6c391] bg-[#fff9e8] p-3">
              <p className="text-[10px] font-semibold uppercase text-[#6f5817]">Decision posture</p>
              <TextSafeValue className="mt-1 text-sm font-semibold leading-5 text-ink">
                {decisionResult.decision.posture}
              </TextSafeValue>
            </article>
            <article className="min-w-0 rounded-md border border-line bg-white p-3">
              <p className="text-[10px] font-semibold uppercase text-muted">Suitability</p>
              <p className="mt-1 text-xl font-semibold leading-5 text-brand">{decisionResult.primaryScore ?? "N/A"}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted">{decisionResult.confidence.label} confidence</p>
            </article>
            <article className="col-span-2 min-w-0 rounded-md border border-line bg-white p-3 sm:col-span-1">
              <p className="text-[10px] font-semibold uppercase text-muted">Next action</p>
              <TextSafeValue className="mt-1 text-sm font-semibold leading-5 text-ink">
                {decisionResult.nextAction.label}
              </TextSafeValue>
            </article>
          </section>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(480px,0.85fr)] xl:grid-rows-none">
            <MapContextCard
              title="Site context"
              subtitle={
                analysis.selectedAoi
                  ? `${userDrawnAoiSourceLabel(analysis.selectedAoi)} with surrounding market context`
                  : analysis.analysisTarget?.type === "user-drawn-aoi"
                  ? "User-defined AOI with surrounding market context"
                  : analysis.analysisTarget?.type === "uploaded-feature"
                  ? "User-provided screening geometry with surrounding market context"
                  : analysis.analysisTarget?.type === "demo-feature"
                    ? "Illustrative local screening geometry with surrounding public/open context"
                    : "Selected point with surrounding market context"
              }
              selectedPoint={analysis.point}
              selectedObject={analysis.selectedObject ?? null}
              selectedAoi={analysis.selectedAoi ?? null}
              analysisTarget={analysis.analysisTarget ?? null}
              viewportLocked
            />

            <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface p-3 shadow-sm">
              <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
                <div className="grid items-stretch gap-2 lg:grid-cols-2" data-dashboard-decision-pair>
                  <article
                    className="grid h-full min-h-[220px] grid-rows-[auto_minmax(0,1fr)_auto] rounded-md border border-[#d6c391] bg-[#fff9e8] p-3"
                    data-dashboard-card="decision-posture"
                  >
                    <TextSafeValue wrap="normal" className="text-xs font-semibold uppercase leading-4 text-[#6f5817]">
                      Decision posture
                    </TextSafeValue>
                    <div className="flex min-h-0 flex-col justify-center py-2">
                      <TextSafeValue wrap="normal" className="text-xl font-semibold leading-7 text-ink" data-dashboard-value="decision-posture">
                        {decisionResult.decision.posture}
                      </TextSafeValue>
                      <TextSafeValue className="mt-2 text-sm leading-5 text-muted" data-dashboard-value="rationale">
                        {decisionResult.decision.rationale}
                      </TextSafeValue>
                    </div>
                    {showDecisionDetail ? (
                      <details className="rounded-md border border-[#ead28a] bg-white px-3" data-dashboard-control="full-rationale">
                        <summary className="flex h-8 cursor-pointer list-none items-center text-[11px] font-semibold uppercase leading-4 text-[#6f5817]">
                          Full rationale
                        </summary>
                        <TextSafeValue className="mt-2 border-t border-line pt-2 text-xs leading-5 text-muted">
                          {decisionResult.decision.detail}
                        </TextSafeValue>
                      </details>
                    ) : null}
                  </article>
                  <BiScoreGauge
                    score={decisionResult.primaryScore ?? 0}
                    label="Suitability"
                    summary={`${decisionResult.confidence.label} · ${decisionResult.validation.status}`}
                    detail={decisionResult.confidence.basis}
                    confidenceLabel={decisionResult.confidence.label}
                    validationLabel={decisionResult.validation.status}
                  />
                </div>

                <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.72fr)]" data-dashboard-overview-summary>
                  <div className="rounded-md border border-line bg-white p-3">
                    <TextSafeValue className="text-xs leading-5 text-muted xl:text-sm">
                      {summaryPreview}
                    </TextSafeValue>
                  </div>

                  <div className="rounded-md border border-line bg-white p-3" data-dashboard-card="next-action">
                    <TextSafeValue wrap="normal" className="text-xs font-semibold uppercase leading-4 text-muted">
                      Recommended next action
                    </TextSafeValue>
                    <TextSafeValue className="mt-1 text-sm font-semibold leading-5 text-ink" data-dashboard-value="next-action">
                      {decisionResult.nextAction.label}
                    </TextSafeValue>
                    <div className="mt-2 grid gap-1.5">
                      {secondaryActions.map((item) => (
                        <TextSafeValue key={item.id} className="rounded-md bg-surface px-2 py-1 text-xs leading-5 text-muted">
                          {item.label}
                        </TextSafeValue>
                      ))}
                    </div>
                    <details className="mt-2 rounded-md border border-line bg-surface px-3 py-1.5">
                      <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase leading-4 text-muted">
                        Action details
                      </summary>
                      <TextSafeValue className="mt-2 border-t border-line pt-2 text-xs leading-5 text-muted">
                        {primaryAction?.detail ?? decisionResult.nextAction.detail}
                      </TextSafeValue>
                    </details>
                  </div>
                </div>

                <div
                  className="mt-2 grid gap-2"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
                >
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
                <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
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
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-3 p-3 pt-0">
          {dashboardModules.map((module) => (
            <BiDrilldownModule
              key={module.id}
              module={module}
              matrix={dashboardModel.matrix}
              evidence={analysis.evidence}
            />
          ))}
          <section className="rounded-lg border border-line bg-white p-4 shadow-sm" data-dashboard-source-basis>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
              <div className="min-w-0">
                <TextSafeValue className="text-xs font-semibold uppercase leading-4 text-muted">
                  Source basis
                </TextSafeValue>
                <TextSafeValue as="h2" className="mt-1 text-lg font-semibold leading-6 text-ink">
                  {decisionResult.sourceBasis.label}
                </TextSafeValue>
                <TextSafeValue className="mt-2 text-xs leading-5 text-muted">
                  {decisionResult.confidence.basis}
                </TextSafeValue>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {decisionResult.sourceBasis.items.map((item, index) => (
                  <li key={`${item}-${index}`} className="rounded-md border border-line bg-surface px-3 py-2 text-xs leading-5 text-muted">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-muted" data-dashboard-value="caveat">
              {decisionResult.caveat}
            </p>
          </section>
        </section>
      </div>
    </section>
  );
}
