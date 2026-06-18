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

function compactText(value: string, maxLength = 460) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sentences = normalized.match(/[^.!?]+[.!?]+/g) ?? [];
  const preview = sentences.reduce((acc, sentence) => {
    const next = `${acc}${sentence.trim()} `;
    return next.length <= maxLength ? next : acc;
  }, "");

  if (preview.trim().length > 120) {
    return preview.trim();
  }

  return `${normalized.slice(0, maxLength).trim().replace(/\s+\S*$/, "")}.`;
}

function MetricPill({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <p className="mt-1 text-sm font-semibold capitalize text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
    </div>
  );
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
  const summaryPreview = compactText(analysis.summary);
  const noticePreview = analysis.analysisNotice ? compactText(analysis.analysisNotice, 190) : null;
  const limitationPreview = compactText(dataLimitation, 160);

  useEffect(() => {
    dashboardRef.current?.scrollTo({ top: 0, left: 0 });
  }, [analysis.id]);

  return (
    <section ref={dashboardRef} className="h-[calc(100vh-72px)] overflow-y-auto bg-surface p-3 lg:p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <header className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-white p-3 shadow-sm lg:flex-row lg:items-center">
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

        <div className="grid items-stretch gap-3 xl:h-[clamp(430px,calc(100vh-190px),520px)] xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
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
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted print:line-clamp-none">
                {decisionRationale}
              </p>
            </div>
            <h2 className="mt-4 shrink-0 text-lg font-semibold text-ink">Executive Summary</h2>
            <div className="mt-2 shrink-0">
              <p className="line-clamp-5 text-sm leading-6 text-muted print:line-clamp-none lg:text-base">{summaryPreview}</p>
              {noticePreview ? (
                <p className="mt-3 line-clamp-2 rounded-md border border-line bg-surface px-3 py-2 text-sm leading-5 text-muted print:line-clamp-none">
                  {noticePreview}
                </p>
              ) : null}
            </div>
            <div className="mt-auto grid shrink-0 gap-2 pt-3 text-sm md:grid-cols-2">
              <div className="rounded-md border border-line bg-surface px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Analysis mode
                </span>
                <p className="mt-1 font-semibold text-ink">{modeLabel}</p>
              </div>
              <div className="rounded-md border border-line bg-surface px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Confidence level
                </span>
                <p className="mt-1 font-semibold capitalize text-ink">
                  {analysis.confidenceLevel ?? "medium"}
                </p>
              </div>
              <div className="rounded-md border border-line bg-surface px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Data confidence / limitation
                </span>
                <p className="mt-1 line-clamp-2 leading-5 text-muted print:line-clamp-none">{limitationPreview}</p>
              </div>
              <div className="rounded-md border border-line bg-surface px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Generated
                </span>
                <p className="mt-1 font-semibold text-ink">{formatGeneratedAt(analysis.generatedAt)}</p>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Scenario-specific Score Overview</h2>
          <p className="mt-1 text-sm text-muted">Demo-normalized scores for screening. Hover a score for interpretation and validation caveats.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {scoreOrder.map((scoreKey) => {
              const score = analysis.scores[scoreKey];

              return (
                <div
                  key={scoreKey}
                  tabIndex={0}
                  className="group relative rounded-md border border-line bg-white p-4 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
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
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {analysis.marketContext ? (
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Market Context</h2>
                <p className="mt-1 text-sm text-muted">
                  {analysis.marketContext.areaName} / {analysis.marketContext.emirate}
                </p>
              </div>
              <span className="rounded-full bg-[#eef2f5] px-3 py-1 text-xs font-semibold text-muted">
                {marketMetricsMatch?.sourceMode ?? analysis.marketContext.sourceMode ?? "seed_static"} / {marketMetricsMatch?.confidence ?? analysis.marketContext.confidenceLevel} confidence
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {importedMetric ? (
                <>
                  <MetricPill
                    label="Matched imported area"
                    value={marketMetricsMatch?.matchedAreaName ?? importedMetric.areaName}
                    detail={`${marketMetricsMatch?.matchType ?? "exact"} match from local CSV ingestion output.`}
                  />
                  <MetricPill
                    label="Transactions"
                    value={`${importedMetric.transactionCount}`}
                    detail={`Value AED ${importedMetric.transactionValueAed.toLocaleString("en-US")}; median ${importedMetric.medianPricePerSqm?.toLocaleString("en-US") ?? "-"} AED/sqm.`}
                  />
                  <MetricPill
                    label="Rental records"
                    value={`${importedMetric.rentalRecordCount}`}
                    detail={`Median rent ${importedMetric.medianRentPerSqm?.toLocaleString("en-US") ?? "-"} AED/sqm; sample/manual import.`}
                  />
                </>
              ) : null}
              <MetricPill
                label="Market Activity"
                value={`${analysis.marketContext.marketMetrics?.activityIndex ?? analysis.marketContext.marketActivityLevel.index}/100`}
                detail={analysis.marketContext.marketActivityLevel.note}
              />
              <MetricPill
                label="Rental Demand"
                value={`${analysis.marketContext.marketMetrics?.rentalDemandIndex ?? analysis.marketContext.rentContext.index}/100`}
                detail={analysis.marketContext.rentContext.note}
              />
              <MetricPill
                label="Liquidity"
                value={`${analysis.marketContext.marketMetrics?.liquidityIndex ?? analysis.marketContext.transactionContext.index}/100`}
                detail={analysis.marketContext.transactionContext.note}
              />
              <MetricPill
                label="Development Pipeline"
                value={`${importedMetric?.pipelineProxy ?? analysis.marketContext.marketMetrics?.developmentPipelineIndex ?? analysis.marketContext.developmentPipelineContext.index}/100`}
                detail={analysis.marketContext.developmentPipelineContext.note}
              />
              <MetricPill
                label="Risk Index"
                value={`${analysis.marketContext.marketMetrics?.riskIndex ?? analysis.marketContext.riskContext.index}/100`}
                detail={analysis.marketContext.riskContext.note}
              />
              <MetricPill
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
          </section>
        ) : null}

        {analysis.selectedObject?.spatialContext ? (
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Spatial Object Details</h2>
                <p className="mt-1 text-sm text-muted">{analysis.selectedObject.name}</p>
              </div>
              <span className="rounded-full bg-[#eef2f5] px-3 py-1 text-xs font-semibold text-muted">
                {analysis.selectedObject.spatialContext.geometryStatus} / {analysis.selectedObject.spatialContext.confidenceLevel}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricPill
                label="Category"
                value={analysis.selectedObject.spatialContext.category.replace(/_/g, " ")}
                detail={analysis.selectedObject.spatialContext.subtype}
              />
              <MetricPill
                label="Geometry"
                value={analysis.selectedObject.spatialContext.geometryType}
                detail={analysis.selectedObject.spatialContext.areaSqm ? `Estimated area ${analysis.selectedObject.spatialContext.areaSqm.toLocaleString()} sqm` : "Area not available for this geometry."}
              />
              <MetricPill
                label="Source status"
                value={analysis.selectedObject.spatialContext.sourceStatus}
                detail={analysis.selectedObject.spatialContext.datasetName}
              />
              <MetricPill
                label="Scenario relevance"
                value={`${analysis.selectedObject.spatialContext.scenarioRelevance.length} scenarios`}
                detail={analysis.selectedObject.spatialContext.scenarioRelevance.join(", ")}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              Note: {analysis.selectedObject.spatialContext.limitations[0]}
            </p>
          </section>
        ) : null}

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Key Value Drivers</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analysis.keyFactors.map((factor) => (
              <article key={factor} className="rounded-md border border-line bg-surface p-4">
                <div className="mb-3 h-1 w-10 rounded-full bg-accent" />
                <p className="text-sm leading-6 text-ink">{factor}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Opportunities</h2>
            <ul className="mt-4 space-y-3">
              {analysis.opportunities.map((item) => (
                <li key={item} className="rounded-md border border-line bg-surface px-4 py-3 text-sm leading-6 text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Critical Constraints</h2>
            <ul className="mt-4 space-y-3">
              {analysis.risks.map((item) => (
                <li key={item} className="rounded-md border border-line bg-surface px-4 py-3 text-sm leading-6 text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <ValidationRequirementList evidence={analysis.evidence} />

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Due Diligence Checklist</h2>
              <p className="mt-1 text-sm text-muted">Concrete follow-up steps before underwriting, approval or client recommendation</p>
            </div>
          </div>
          <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analysis.nextActions.map((action, index) => (
              <li key={action} className="flex gap-3 rounded-md border border-line bg-surface p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-muted">{action}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Evidence / Data Used</h2>
              <p className="mt-1 text-sm text-muted">Source context, maturity, confidence and limitations behind this analysis</p>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
              {analysis.evidence.length} sources
            </span>
          </div>
          <div className="mt-5">
            <EvidenceSourceCards evidence={analysis.evidence} />
          </div>
        </section>
      </div>
    </section>
  );
}
