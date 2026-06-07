"use client";

import { MapWorkspace } from "@/components/map-workspace";
import type { ExpressAnalysis, ScoreKey } from "@/src/types/geo";

type ExpressDashboardProps = {
  analysis: ExpressAnalysis;
  onBackToMap: () => void;
};

const scoreLabels: Record<ScoreKey, string> = {
  developmentPotential: "Development Potential",
  investmentAttractiveness: "Investment Attractiveness",
  accessibility: "Accessibility",
  infrastructureReadiness: "Infrastructure Readiness",
  climateHeatRisk: "Climate / Heat Risk",
  overallRisk: "Overall Risk"
};

const scoreOrder: ScoreKey[] = [
  "developmentPotential",
  "investmentAttractiveness",
  "accessibility",
  "infrastructureReadiness",
  "climateHeatRisk",
  "overallRisk"
];

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

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

export function ExpressDashboard({ analysis, onBackToMap }: ExpressDashboardProps) {
  return (
    <section className="h-[calc(100vh-72px)] overflow-y-auto bg-surface p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col justify-between gap-4 rounded-lg border border-line bg-white p-5 shadow-sm lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-ink">Express Site Intelligence</h1>
              <span className="rounded-full bg-[#eaf3f1] px-3 py-1 text-xs font-semibold text-brand">
                Demo analysis
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted">
              {formatCoordinate(analysis.point.latitude)}, {formatCoordinate(analysis.point.longitude)}
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
              className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
            >
              Export report
            </button>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
          <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Selected object map</h2>
                <p className="mt-1 text-sm text-muted">Selected point and surrounding Dubai context</p>
              </div>
              <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                Mapbox
              </span>
            </div>
            <MapWorkspace
              selectedPoint={analysis.point}
              onPointSelect={() => undefined}
              className="relative h-[360px] overflow-hidden bg-[#dfe8ec]"
              showEmptyOverlay={false}
            />
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Executive Summary</h2>
            <p className="mt-3 text-base leading-7 text-muted">{analysis.summary}</p>
          </section>
        </div>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Score overview</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {scoreOrder.map((scoreKey) => {
              const score = analysis.scores[scoreKey];

              return (
                <div key={scoreKey} className="rounded-md border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm font-semibold leading-5 text-ink">
                      {scoreLabels[scoreKey]}
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

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Key Factors</h2>
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
            <h2 className="text-lg font-semibold text-ink">Risks & Constraints</h2>
            <ul className="mt-4 space-y-3">
              {analysis.risks.map((item) => (
                <li key={item} className="rounded-md border border-line bg-surface px-4 py-3 text-sm leading-6 text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Recommended Next Actions</h2>
            <ol className="mt-4 grid gap-3 md:grid-cols-2">
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
            <h2 className="text-lg font-semibold text-ink">Evidence / Data Used</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {analysis.evidence.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-line bg-surface px-3 py-2 text-xs font-medium text-muted"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
