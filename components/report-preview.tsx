"use client";

import type { ComparisonResult, ExpressAnalysis, ScoreKey } from "@/src/types/geo";

type ReportPreviewProps =
  | {
      mode: "analysis";
      analysis: ExpressAnalysis;
      onBack: () => void;
    }
  | {
      mode: "comparison";
      comparison: ComparisonResult;
      onBack: () => void;
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

function formatDate() {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function formatCoordinate(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function MapWindow({
  title,
  subtitle,
  markers
}: {
  title: string;
  subtitle: string;
  markers: Array<{ label: string; latitude: number; longitude: number }>;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-xs text-muted">{subtitle}</p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-brand">
          Demo map
        </span>
      </div>
      <div className="relative h-[260px] bg-[#dfe8ec] bg-[linear-gradient(90deg,rgba(23,79,99,0.12)_1px,transparent_1px),linear-gradient(rgba(23,79,99,0.12)_1px,transparent_1px)] bg-[size:38px_38px] print:h-[210px]">
        <div className="absolute inset-x-8 top-10 h-20 rotate-[-7deg] rounded-full border border-[#4d7c0f]/40 bg-[#4d7c0f]/10" />
        <div className="absolute bottom-10 left-10 h-24 w-44 rounded-[40%] border border-[#2c7fb8]/45 bg-[#2c7fb8]/12" />
        <div className="absolute right-12 top-20 h-28 w-48 rounded-[45%] border border-[#c5a76a]/55 bg-[#c5a76a]/14" />
        {markers.map((marker, index) => (
          <div
            key={`${marker.label}-${index}`}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
            style={{
              left: `${35 + index * 22}%`,
              top: `${48 + (index % 2) * 16}%`
            }}
          >
            <span className="h-4 w-4 rounded-full border-2 border-white bg-brand shadow-soft" />
            <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-ink shadow-sm">
              {marker.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportShell({
  children,
  onBack
}: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <section className="h-[calc(100vh-72px)] overflow-y-auto bg-[#eef2f5] p-6 print:h-auto print:overflow-visible print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl print:max-w-none">
        <div className="mb-4 flex flex-wrap justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
          >
            Back to dashboard
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
          >
            Print / Save as PDF
          </button>
        </div>
        <article className="report-page rounded-lg bg-white p-8 shadow-soft print:rounded-none print:p-0 print:shadow-none">
          {children}
        </article>
      </div>
    </section>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-section border-t border-line pt-6">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AnalysisReport({ analysis, onBack }: { analysis: ExpressAnalysis; onBack: () => void }) {
  return (
    <ReportShell onBack={onBack}>
      <div className="flex flex-col gap-8">
        <header className="border-b border-line pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">GeoAI</p>
              <h1 className="mt-3 text-4xl font-semibold text-ink">Express Analysis Report</h1>
              <p className="mt-3 text-base leading-7 text-muted">{analysis.title}</p>
            </div>
            <span className="rounded-full bg-[#eaf3f1] px-3 py-1 text-xs font-semibold text-brand">
              Demo report
            </span>
          </div>
          <dl className="mt-6 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Selected site</dt>
              <dd className="mt-1 text-ink">{analysis.selectedObject?.name ?? "Custom map point"}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Coordinates</dt>
              <dd className="mt-1 text-ink">{formatCoordinate(analysis.point.latitude, analysis.point.longitude)}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Scenario</dt>
              <dd className="mt-1 text-ink">{analysis.title}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Generated</dt>
              <dd className="mt-1 text-ink">{formatDate()}</dd>
            </div>
          </dl>
        </header>

        <Section title="Executive Summary">
          <p className="text-base leading-8 text-muted">{analysis.summary}</p>
        </Section>

        <Section title="Score Overview">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {scoreOrder.map((scoreKey) => (
              <div key={scoreKey} className="rounded-md border border-line p-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm font-semibold text-ink">{analysis.scoreLabels[scoreKey]}</span>
                  <span className="text-lg font-semibold text-brand">{analysis.scores[scoreKey]}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-surface">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${analysis.scores[scoreKey]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Map Context">
          <MapWindow
            title={analysis.selectedObject?.name ?? "Custom map point"}
            subtitle={`${analysis.selectedObject?.type ?? "Point selection"} / ${analysis.subtitle}`}
            markers={[{
              label: "Selected",
              latitude: analysis.point.latitude,
              longitude: analysis.point.longitude
            }]}
          />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Demo spatial context only. No official GIS, parcel, or risk data is connected.
          </p>
        </Section>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Key Factors">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {analysis.keyFactors.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Section>
          <Section title="Evidence / Data Used">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {analysis.evidence.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Section>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Opportunities">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {analysis.opportunities.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Section>
          <Section title="Risks & Constraints">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {analysis.risks.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Section>
        </div>

        <Section title="Recommended Next Actions">
          <ol className="grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
            {analysis.nextActions.map((item, index) => (
              <li key={item} className="rounded-md bg-surface p-4">
                <span className="font-semibold text-brand">{index + 1}. </span>{item}
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </ReportShell>
  );
}

function ComparisonReport({ comparison, onBack }: { comparison: ComparisonResult; onBack: () => void }) {
  return (
    <ReportShell onBack={onBack}>
      <div className="flex flex-col gap-8">
        <header className="border-b border-line pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">GeoAI</p>
              <h1 className="mt-3 text-4xl font-semibold text-ink">Site Comparison Report</h1>
              <p className="mt-3 text-base leading-7 text-muted">
                Comparing {comparison.items.length} selected locations / assets
              </p>
            </div>
            <span className="rounded-full bg-[#eaf3f1] px-3 py-1 text-xs font-semibold text-brand">
              Demo comparison
            </span>
          </div>
          <dl className="mt-6 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Compared items</dt>
              <dd className="mt-1 text-ink">{comparison.items.map((item) => item.item.name).join(", ")}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Generated</dt>
              <dd className="mt-1 text-ink">{formatDate()}</dd>
            </div>
          </dl>
        </header>

        <Section title="Best Option Recommendation">
          <div className="rounded-md border border-line bg-surface p-5">
            <p className="text-lg font-semibold text-ink">{comparison.winner.item.name}</p>
            <p className="mt-3 text-base leading-7 text-muted">{comparison.whyPreferred}</p>
            <p className="mt-4 text-sm leading-6 text-muted">{comparison.whenAnotherMayBeBetter}</p>
          </div>
        </Section>

        <Section title="Map Context">
          <MapWindow
            title="Comparison map window"
            subtitle="Selected locations / assets in synthetic Dubai context"
            markers={comparison.items.map((scorecard, index) => ({
              label: `Option ${index + 1}`,
              latitude: scorecard.item.point.latitude,
              longitude: scorecard.item.point.longitude
            }))}
          />
        </Section>

        <Section title="Comparison Table">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-line px-3 py-3 font-semibold text-muted">Metric</th>
                  {comparison.items.map((scorecard) => (
                    <th key={scorecard.item.id} className="border-b border-line px-3 py-3 font-semibold text-ink">
                      {scorecard.item.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scoreOrder.map((scoreKey) => (
                  <tr key={scoreKey}>
                    <td className="border-b border-line px-3 py-3 text-muted">{scoreLabels[scoreKey]}</td>
                    {comparison.items.map((scorecard) => (
                      <td key={scorecard.item.id} className="border-b border-line px-3 py-3 font-semibold text-ink">
                        {scorecard.scores[scoreKey]}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="border-b border-line px-3 py-3 text-muted">Recommended Use</td>
                  {comparison.items.map((scorecard) => (
                    <td key={scorecard.item.id} className="border-b border-line px-3 py-3 text-muted">
                      {scorecard.recommendedUse}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Score Cards">
          <div className="grid gap-4 md:grid-cols-3">
            {comparison.items.map((scorecard) => (
              <div key={scorecard.item.id} className="rounded-md border border-line p-4">
                <p className="text-sm font-semibold text-ink">{scorecard.item.name}</p>
                <p className="mt-2 text-3xl font-semibold text-brand">{scorecard.overallScore}</p>
                <p className="mt-2 text-sm text-muted">{scorecard.riskLevel} risk</p>
                <p className="mt-3 text-sm leading-6 text-muted">{scorecard.recommendedUse}</p>
              </div>
            ))}
          </div>
        </Section>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Key Risks By Option">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {comparison.items.map((item) => <li key={item.item.id}>{item.item.name}: {item.keyConcern}</li>)}
            </ul>
          </Section>
          <Section title="Evidence / Data Used">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              <li>Map selections</li>
              <li>Selected scenario context</li>
              <li>Demo geospatial layer metadata where available</li>
              <li>Mock comparison scoring model</li>
              <li>No official datasets, OpenAI API, or database connected</li>
            </ul>
          </Section>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Shared Opportunities">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {comparison.sharedOpportunities.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Section>
          <Section title="Differentiated Risks">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {comparison.differentiatedRisks.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Section>
        </div>

        <Section title="Recommended Next Actions">
          <ol className="grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
            {comparison.nextActions.map((item, index) => (
              <li key={item} className="rounded-md bg-surface p-4">
                <span className="font-semibold text-brand">{index + 1}. </span>{item}
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </ReportShell>
  );
}

export function ReportPreview(props: ReportPreviewProps) {
  if (props.mode === "analysis") {
    return <AnalysisReport analysis={props.analysis} onBack={props.onBack} />;
  }

  return <ComparisonReport comparison={props.comparison} onBack={props.onBack} />;
}
