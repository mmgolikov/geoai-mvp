"use client";

import demoObjects from "@/src/data/demo-objects.json";
import type { SelectedPoint } from "@/src/types/geo";

type AnalysisPanelProps = {
  selectedPoint: SelectedPoint | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  onRunAnalysis: () => void;
};

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function PlaceholderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white px-3 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

export function AnalysisPanel({
  selectedPoint,
  isAnalyzing,
  analysisError,
  onRunAnalysis
}: AnalysisPanelProps) {
  const featuredObject = demoObjects[0];
  const hasSelectedPoint = selectedPoint !== null;

  return (
    <aside className="border-l border-line bg-white p-5 lg:w-[400px]">
      <div className="flex h-full flex-col gap-4">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Command panel
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">GeoAI workspace</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Configure the selected site and run deterministic demo intelligence.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Selected point
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ink">
                {hasSelectedPoint ? "Custom map selection" : "No point selected"}
              </h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
              Point
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-white p-3">
              <dt className="text-muted">Latitude</dt>
              <dd className="mt-1 font-semibold text-ink">
                {selectedPoint ? formatCoordinate(selectedPoint.latitude) : "-"}
              </dd>
            </div>
            <div className="rounded-md bg-white p-3">
              <dt className="text-muted">Longitude</dt>
              <dd className="mt-1 font-semibold text-ink">
                {selectedPoint ? formatCoordinate(selectedPoint.longitude) : "-"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="grid gap-3">
          <PlaceholderRow label="Scenario" value="Development intelligence" />
          <div className="rounded-md border border-line bg-white px-3 py-3">
            <label
              htmlFor="custom-query"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Custom query
            </label>
            <textarea
              id="custom-query"
              rows={3}
              placeholder="Ask a site, investment, risk, or infrastructure question"
              className="mt-2 w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand"
            />
          </div>
          <PlaceholderRow label="Data sources" value="Demo map, infrastructure, risk context" />
          <PlaceholderRow label="Upload documents" value="Coming later" />
        </section>

        <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <button
            type="button"
            disabled={!hasSelectedPoint || isAnalyzing}
            onClick={onRunAnalysis}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:cursor-not-allowed disabled:bg-[#c9d2d7] disabled:text-white"
          >
            {isAnalyzing ? "Running Express Analysis..." : "Run Express Analysis"}
          </button>

          {analysisError ? (
            <p className="mt-3 rounded-md border border-[#f2c6bd] bg-[#fff4ed] px-3 py-2 text-sm leading-5 text-[#9f3412]">
              {analysisError}
            </p>
          ) : null}
        </section>

        <section className="mt-auto grid gap-3">
          <PlaceholderRow label="Export" value="Report export placeholder" />
          <div className="rounded-md border border-line bg-surface px-3 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Status
            </div>
            <div className="mt-1 text-sm font-medium text-ink">
              {isAnalyzing
                ? "Analysis running"
                : hasSelectedPoint
                  ? "Point ready for analysis"
                  : `Demo object: ${featuredObject.market}`}
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
