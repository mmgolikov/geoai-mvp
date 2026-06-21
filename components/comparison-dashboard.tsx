"use client";

import { useEffect, useRef } from "react";
import { EvidenceSourceCards } from "@/components/evidence-source-cards";
import { DecisionSummaryBox } from "@/components/ui/decision-summary-box";
import type { ComparisonResult, ScoreKey } from "@/src/types/geo";

type ComparisonDashboardProps = {
  comparison: ComparisonResult;
  onBackToMap: () => void;
  onExportComparison: () => void;
};

const scoreLabels: Record<ScoreKey, string> = {
  developmentPotential: "Development Potential",
  investmentAttractiveness: "Investment Attractiveness",
  accessibility: "Accessibility",
  infrastructureReadiness: "Infrastructure Readiness",
  climateHeatRisk: "Climate / Heat Risk",
  overallRisk: "Overall Risk"
};

const tableScores: ScoreKey[] = [
  "developmentPotential",
  "investmentAttractiveness",
  "accessibility",
  "infrastructureReadiness",
  "climateHeatRisk",
  "overallRisk"
];

function formatCoordinate(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function riskTone(riskLevel: string) {
  if (riskLevel === "Elevated") return "bg-[#fff4ed] text-[#9f3412]";
  if (riskLevel === "Moderate") return "bg-[#fff8db] text-[#8a6a12]";
  return "bg-[#eaf3f1] text-brand";
}

function normalizeKeyText(value: unknown) {
  return String(value ?? "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56) || "item";
}

function createStableKey(section: string, value: unknown, index: number) {
  return `${section}-${index}-${normalizeKeyText(value)}`;
}

function dedupeTextList(items: string[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const normalized = normalizeKeyText(item);
    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function ComparisonCard({ scorecard }: { scorecard: ComparisonResult["items"][number] }) {
  const marketMatch = scorecard.marketMetricsMatch;
  const metric = marketMatch?.metrics;

  return (
    <article className="grid h-full min-h-[420px] grid-rows-[92px_92px_78px_96px_minmax(112px,1fr)] rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-line pb-4">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-lg font-semibold leading-6 text-ink">{scorecard.item.name}</h2>
          <p className="mt-2 truncate text-sm text-muted">{scorecard.item.itemType} / {scorecard.item.scenarioLabel}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${riskTone(scorecard.riskLevel)}`}>
          {scorecard.riskLevel}
        </span>
      </div>

      <div className="flex items-end justify-between gap-4 border-b border-line py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Overall score</p>
          <p className="mt-1 text-4xl font-semibold text-brand">{scorecard.overallScore}</p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">/100</span>
      </div>

      <div className="border-b border-line py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Location</p>
        <p className="mt-2 text-sm font-semibold leading-5 text-ink">
          {formatCoordinate(scorecard.item.point.latitude, scorecard.item.point.longitude)}
        </p>
      </div>

      <div className="border-b border-line py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Market data basis</p>
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-ink">
          {marketMatch?.matchedAreaName ?? "Seed fallback"} / {marketMatch?.sourceMode ?? "seed_static"}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">
          {metric ? `Liquidity ${metric.liquidityIndex}, demand ${metric.rentalDemandProxy}, pipeline ${metric.pipelineProxy}` : "Imported metrics not matched."}
        </p>
      </div>

      <div className="pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Recommended use</p>
        <p className="mt-2 line-clamp-4 text-sm leading-6 text-ink">{scorecard.recommendedUse}</p>
      </div>
    </article>
  );
}

export function ComparisonDashboard({ comparison, onBackToMap, onExportComparison }: ComparisonDashboardProps) {
  const dashboardRef = useRef<HTMLElement | null>(null);
  const sharedOpportunities = dedupeTextList(comparison.sharedOpportunities);
  const differentiatedRisks = dedupeTextList(comparison.differentiatedRisks);
  const nextActions = dedupeTextList(comparison.nextActions);
  const primaryTradeoff = comparison.whenAnotherMayBeBetter.split(".")[0] || "Alternative options may be better if the validation priority changes.";
  const primaryValidationNeed = differentiatedRisks[0] ?? "Official market, planning and customer-approved data validation required.";
  const primaryNextAction = nextActions[0] ?? "Prepare due diligence memo and validate top alternatives.";

  useEffect(() => {
    dashboardRef.current?.scrollTo({ top: 0, left: 0 });
  }, [comparison.id]);

  return (
    <section ref={dashboardRef} className="h-[calc(100vh-72px)] overflow-y-auto bg-surface p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col justify-between gap-4 rounded-lg border border-line bg-white p-5 shadow-sm lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-ink">Site Comparison Intelligence</h1>
              <span className="rounded-full bg-[#eaf3f1] px-3 py-1 text-xs font-semibold text-brand">
                Demo comparison
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted">
              Comparing selected locations / assets
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
              onClick={onExportComparison}
              className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
            >
              Export comparison
            </button>
          </div>
        </header>

        <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="flex h-full min-w-0 flex-col rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-ink">Winner / Recommendation</h2>
                <p className="mt-1 text-sm text-muted">Best option based on deterministic demo scoring</p>
              </div>
              <span className="max-w-full shrink-0 truncate rounded-full bg-[#eaf3f1] px-3 py-1 text-sm font-semibold text-brand">
                Best option: {comparison.winner.item.name}
              </span>
            </div>
            <p className="mt-4 text-base leading-7 text-muted">{comparison.whyPreferred}</p>
            <div className="mt-4 rounded-md border border-line bg-surface p-4">
              <h3 className="text-sm font-semibold text-ink">When another option may be better</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{comparison.whenAnotherMayBeBetter}</p>
            </div>
            <DecisionSummaryBox
              className="mt-4"
              decision={`Proceed with ${comparison.winner.item.name} as the strongest demo-screened option, subject to official validation.`}
              reason={`Strongest demo risk-adjusted score and readiness signal. Trade-off: ${primaryTradeoff}.`}
              validationNeed={primaryValidationNeed}
              nextAction={primaryNextAction}
            />
          </section>

          <section className="flex h-full min-w-0 flex-col rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Map Context</h2>
            <div className="mt-4 grid flex-1 content-start gap-3">
              {comparison.items.map((scorecard, index) => (
                <div key={createStableKey("map-context-item", scorecard.item.id, index)} className="rounded-md border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                        Option {index + 1}
                      </p>
                      <h3 className="mt-1 truncate text-sm font-semibold text-ink">{scorecard.item.name}</h3>
                    </div>
                    <span className="max-w-[76px] shrink-0 truncate rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
                      {scorecard.item.itemType}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-muted">
                    {formatCoordinate(scorecard.item.point.latitude, scorecard.item.point.longitude)}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Market basis: {scorecard.marketMetricsMatch?.matchedAreaName ?? "Seed fallback"} / {scorecard.marketMetricsMatch?.sourceMode ?? "seed_static"} / {scorecard.marketMetricsMatch?.confidence ?? "low"} confidence
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Comparison Table</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-line px-3 py-3 font-semibold text-muted">Metric</th>
                  {comparison.items.map((scorecard, index) => (
                    <th key={createStableKey("comparison-table-head", scorecard.item.id, index)} className="border-b border-line px-3 py-3 font-semibold text-ink">
                      {scorecard.item.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableScores.map((scoreKey) => (
                  <tr key={scoreKey}>
                    <td className="border-b border-line px-3 py-3 font-medium text-muted">{scoreLabels[scoreKey]}</td>
                    {comparison.items.map((scorecard, index) => (
                      <td key={createStableKey(`${scoreKey}-score`, scorecard.item.id, index)} className="border-b border-line px-3 py-3 font-semibold text-ink">
                        {scorecard.scores[scoreKey]}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="border-b border-line px-3 py-3 font-medium text-muted">Recommended Use</td>
                  {comparison.items.map((scorecard, index) => (
                    <td key={createStableKey("recommended-use", scorecard.item.id, index)} className="border-b border-line px-3 py-3 text-muted">
                      {scorecard.recommendedUse}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border-b border-line px-3 py-3 font-medium text-muted">Key Concern</td>
                  {comparison.items.map((scorecard, index) => (
                    <td key={createStableKey("key-concern", scorecard.item.id, index)} className="border-b border-line px-3 py-3 text-muted">
                      {scorecard.keyConcern}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid items-stretch gap-4 lg:grid-cols-3">
          {comparison.items.map((scorecard, index) => (
            <ComparisonCard key={createStableKey("comparison-card", scorecard.item.id, index)} scorecard={scorecard} />
          ))}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Shared Opportunities</h2>
            <ul className="mt-4 space-y-3">
              {sharedOpportunities.map((item, index) => (
                <li key={createStableKey("shared-opportunity", item, index)} className="rounded-md border border-line bg-surface px-4 py-3 text-sm leading-6 text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Differentiated Risks</h2>
            <ul className="mt-4 space-y-3">
              {differentiatedRisks.map((item, index) => (
                <li key={createStableKey("differentiated-risk", item, index)} className="rounded-md border border-line bg-surface px-4 py-3 text-sm leading-6 text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Evidence / Data Used</h2>
          <div className="mt-4">
            <EvidenceSourceCards evidence={comparison.evidence} />
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Recommended Next Actions</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {nextActions.map((action, index) => (
              <li key={createStableKey("next-action", action, index)} className="flex gap-3 rounded-md border border-line bg-surface p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-muted">{action}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}
