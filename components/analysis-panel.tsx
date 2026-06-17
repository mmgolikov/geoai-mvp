"use client";

import demoObjects from "@/src/data/demo-objects.json";
import { getScenarioDataSources } from "@/src/data/data-source-registry";
import type { MarketContext } from "@/src/types/market-context";
import type {
  AnalysisScenario,
  AnalysisScenarioId,
  AnalysisHistoryItem,
  ComparisonItem,
  ExpressAnalysis,
  SelectedDemoObject,
  SelectedPoint
} from "@/src/types/geo";

type AnalysisPanelProps = {
  selectedPoint: SelectedPoint | null;
  selectedObject: SelectedDemoObject | null;
  scenarios: AnalysisScenario[];
  selectedScenario: AnalysisScenarioId;
  customQuery: string;
  isAnalyzing: boolean;
  analysisError: string | null;
  comparisonItems: ComparisonItem[];
  comparisonMessage: string | null;
  analysisHistory: AnalysisHistoryItem[];
  hasResult: boolean;
  analysisMode?: ExpressAnalysis["analysisMode"];
  analysisGeneratedAt?: string;
  marketContext: MarketContext | null;
  isMarketContextLoading: boolean;
  onScenarioChange: (scenario: AnalysisScenarioId) => void;
  onCustomQueryChange: (query: string) => void;
  onRunAnalysis: () => void;
  onAddToComparison: () => void;
  onRemoveComparisonItem: (itemId: string) => void;
  onRunComparison: () => void;
  onOpenHistoryItem: (item: AnalysisHistoryItem) => void;
  onClearAnalysisHistory: () => void;
  onExportCurrentResult: () => void;
};

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function PlaceholderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-md border border-line bg-white px-3 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function formatGeneratedAt(value?: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatHistoryTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function CollapsedSection({
  title,
  badge,
  children
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="w-full max-w-full overflow-hidden rounded-md border border-line bg-white px-3 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        <span className="min-w-0 truncate">{title}</span>
        <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold normal-case tracking-normal text-brand">
          {badge ?? "Open"}
        </span>
      </summary>
      <div className="mt-3 min-w-0 max-w-full overflow-hidden break-words">{children}</div>
    </details>
  );
}

export function AnalysisPanel({
  selectedPoint,
  selectedObject,
  scenarios,
  selectedScenario,
  customQuery,
  isAnalyzing,
  analysisError,
  comparisonItems,
  comparisonMessage,
  analysisHistory,
  hasResult,
  analysisMode,
  analysisGeneratedAt,
  marketContext,
  isMarketContextLoading,
  onScenarioChange,
  onCustomQueryChange,
  onRunAnalysis,
  onAddToComparison,
  onRemoveComparisonItem,
  onRunComparison,
  onOpenHistoryItem,
  onClearAnalysisHistory,
  onExportCurrentResult
}: AnalysisPanelProps) {
  const featuredObject = demoObjects[0];
  const hasSelectedPoint = selectedPoint !== null;
  const hasSelectedObject = selectedObject !== null;
  const scenario = scenarios.find((item) => item.id === selectedScenario) ?? scenarios[0];
  const isCustomQuery = selectedScenario === "customQuery";
  const availableSources = getScenarioDataSources(selectedScenario).slice(0, 3);
  const modeStatus =
    analysisMode === "openai"
      ? "AI-powered"
      : analysisMode === "mock_fallback"
        ? "Demo fallback"
        : "Not run yet";
  const modeNote =
    analysisMode === "openai"
      ? "Generated from selected scenario, coordinates and evidence context"
      : analysisMode === "mock_fallback"
        ? "Using deterministic demo analysis because AI is unavailable"
        : "Run analysis to generate the current intelligence mode";
  const contextStatus = marketContext?.isGeneralContext
    ? "demo"
    : marketContext
      ? "seed"
      : "real-ready";

  return (
    <aside className="flex max-w-full flex-col overflow-hidden border-l border-line bg-white lg:h-[calc(100vh-72px)] lg:w-[400px]">
      <div className="flex shrink-0 flex-col gap-3 p-4 pb-3">
        <section className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Command panel
          </p>
          <h1 className="mt-1 text-xl font-semibold text-ink">GeoAI workspace</h1>
        </section>

        <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-surface p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {hasSelectedObject ? "Demo object" : "Selected point"}
              </p>
              <h2 className="mt-1 truncate text-base font-semibold text-ink">
                {hasSelectedObject
                  ? selectedObject.name
                  : hasSelectedPoint
                    ? "Custom map selection"
                    : "No point selected"}
              </h2>
              {hasSelectedObject ? (
                <p className="mt-1 truncate text-xs leading-5 text-muted">
                  {selectedObject.spatialContext
                    ? `${selectedObject.spatialContext.category.replace(/_/g, " ")} / ${selectedObject.spatialContext.geometryStatus}`
                    : `${selectedObject.type} / ${selectedObject.layerName}`}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand">
              {hasSelectedObject ? "Object" : "Point"}
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-white px-2 py-2">
              <dt className="text-muted">Lat</dt>
              <dd className="mt-1 font-semibold text-ink">
                {selectedPoint ? formatCoordinate(selectedPoint.latitude) : "-"}
              </dd>
            </div>
            <div className="rounded-md bg-white px-2 py-2">
              <dt className="text-muted">Lng</dt>
              <dd className="mt-1 font-semibold text-ink">
                {selectedPoint ? formatCoordinate(selectedPoint.longitude) : "-"}
              </dd>
            </div>
          </dl>
          {selectedObject?.spatialContext ? (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="min-w-0 rounded-md bg-white px-2 py-2">
                <span className="text-muted">Geometry</span>
                <p className="mt-1 break-words font-semibold text-ink">{selectedObject.spatialContext.geometryType}</p>
              </div>
              <div className="min-w-0 rounded-md bg-white px-2 py-2">
                <span className="text-muted">Area</span>
                <p className="mt-1 break-words font-semibold text-ink">
                  {selectedObject.spatialContext.areaSqm
                    ? `${Math.round(selectedObject.spatialContext.areaSqm / 1000).toLocaleString()}k sqm`
                    : "n/a"}
                </p>
              </div>
              <div className="min-w-0 rounded-md bg-white px-2 py-2">
                <span className="text-muted">Source</span>
                <p className="mt-1 break-words font-semibold text-ink">{selectedObject.spatialContext.sourceStatus}</p>
              </div>
              <div className="min-w-0 rounded-md bg-white px-2 py-2">
                <span className="text-muted">Confidence</span>
                <p className="mt-1 break-words font-semibold text-ink">{selectedObject.spatialContext.confidenceLevel}</p>
              </div>
              <div className="col-span-2 min-w-0 rounded-md bg-white px-2 py-2">
                <span className="text-muted">Dataset</span>
                <p className="mt-1 truncate font-semibold text-ink">{selectedObject.spatialContext.datasetName}</p>
                <p className="mt-1 whitespace-normal break-words text-muted">{selectedObject.spatialContext.limitations[0]}</p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="grid min-w-0 max-w-full gap-2 overflow-hidden">
          <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-line bg-white px-3 py-2">
            <label
              htmlFor="analysis-scenario"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Scenario
            </label>
            <select
              id="analysis-scenario"
              value={selectedScenario}
              onChange={(event) => onScenarioChange(event.target.value as AnalysisScenarioId)}
              className="mt-1 h-9 w-full rounded-md border border-line bg-surface px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
            >
              {scenarios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs leading-5 text-muted">{scenario.description}</p>
          </div>

          <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-line bg-white px-3 py-2">
            <label
              htmlFor="custom-query"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Custom query
            </label>
            <textarea
              id="custom-query"
              rows={2}
              value={customQuery}
              onChange={(event) => onCustomQueryChange(event.target.value)}
              placeholder={
                isCustomQuery
                  ? "Enter the spatial question"
                  : "Optional context"
              }
              className="mt-1 w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand"
            />
            {isCustomQuery ? (
              <p className="mt-1 text-xs leading-5 text-muted">
                Custom Query requires a question.
              </p>
            ) : null}
          </div>
        </section>

      </div>

      <section className="grid min-h-0 min-w-0 flex-1 gap-2 overflow-y-auto overflow-x-hidden px-4 pb-4">
          <CollapsedSection
            title="Market Context"
            badge={isMarketContextLoading ? "loading" : contextStatus}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {isMarketContextLoading
                    ? "Matching Dubai area..."
                    : marketContext?.areaName ?? "Select a point"}
                </p>
                <p className="mt-1 break-words text-xs leading-5 text-muted">
                  {marketContext
                    ? `Confidence: ${marketContext.confidenceLevel}`
                    : "Market context appears after selection"}
                </p>
              </div>
              {marketContext?.matchDistanceKm !== null && marketContext?.matchDistanceKm !== undefined ? (
                <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-muted">
                  {marketContext.matchDistanceKm.toFixed(1)} km
                </span>
              ) : null}
            </div>
            {marketContext ? (
              <p className="mt-2 break-words text-xs leading-5 text-muted">{marketContext.limitations[0]}</p>
            ) : null}
          </CollapsedSection>

          <CollapsedSection title="Data Sources" badge={`${availableSources.length} shown`}>
            <div className="mt-2 grid gap-2">
              {availableSources.map((source) => (
                <div key={source.id} className="min-w-0 max-w-full overflow-hidden rounded-md bg-surface px-3 py-2">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold text-ink">{source.name}</span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted">
                      {source.status}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-xs leading-5 text-muted">
                    {source.sourceType} / {source.reliabilityLevel} reliability
                  </p>
                </div>
              ))}
            </div>
          </CollapsedSection>

          <CollapsedSection title="Upload Documents" badge="Later">
            <PlaceholderRow label="Upload documents" value="Coming later" />
          </CollapsedSection>

          <CollapsedSection title="Integrations" badge="Later">
            <PlaceholderRow label="Integrations" value="GIS, CRM, docs, imagery later" />
          </CollapsedSection>

          <CollapsedSection title="Comparison Set" badge={`${comparisonItems.length}/3`}>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <h2 className="min-w-0 text-sm font-semibold text-ink">
                {comparisonItems.length}/3 selected
              </h2>
              <button
                type="button"
                disabled={comparisonItems.length < 2}
                onClick={onRunComparison}
                className="inline-flex h-9 max-w-full items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#113f50] disabled:cursor-not-allowed disabled:bg-[#c9d2d7]"
              >
                Compare Selected
              </button>
            </div>

            <div className="mt-3 grid min-w-0 gap-2">
              {comparisonItems.length === 0 ? (
                <div className="rounded-md border border-line bg-white px-3 py-3 text-sm leading-5 text-muted">
                  Add 2-3 map points or demo objects to compare.
                </div>
              ) : (
                comparisonItems.map((item) => (
                  <div key={item.id} className="min-w-0 max-w-full overflow-hidden rounded-md border border-line bg-white p-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-ink">{item.name}</h3>
                        <p className="mt-1 break-words text-xs leading-5 text-muted">
                          {item.itemType} / {item.scenarioLabel}
                        </p>
                        <p className="mt-1 whitespace-normal break-words text-xs text-muted">{item.locationLabel}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveComparisonItem(item.id)}
                        className="shrink-0 rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted transition hover:border-brand hover:text-ink"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {comparisonMessage ? (
              <p className="mt-3 break-words rounded-md border border-line bg-white px-3 py-2 text-sm leading-5 text-muted">
                {comparisonMessage}
              </p>
            ) : null}
          </CollapsedSection>

          <CollapsedSection title="Analysis History" badge={`${analysisHistory.length}`}>
            <div className="grid min-w-0 gap-2">
              {analysisHistory.length === 0 ? (
                <div className="rounded-md border border-line bg-white px-3 py-3 text-sm leading-5 text-muted">
                  Recent analysis runs will appear here after you run Express Analysis.
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Recent analyses
                    </p>
                    <button
                      type="button"
                      onClick={onClearAnalysisHistory}
                      className="shrink-0 rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted transition hover:border-brand hover:text-ink"
                    >
                      Clear
                    </button>
                  </div>
                  {analysisHistory.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenHistoryItem(item)}
                      className="w-full max-w-full overflow-hidden rounded-md border border-line bg-white p-3 text-left transition hover:border-brand hover:bg-surface"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-ink">{item.title}</h3>
                          <p className="mt-1 break-words text-xs leading-5 text-muted">
                            {item.scenarioLabel} / {formatHistoryTimestamp(item.timestamp)}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted">{item.locationLabel}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold capitalize text-brand">
                          {item.analysisMode === "openai" ? "AI" : "Demo"}
                        </span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </CollapsedSection>

          <CollapsedSection title="Export" badge={hasResult ? "Ready" : "No result"}>
            <button
              type="button"
              disabled={!hasResult}
              onClick={onExportCurrentResult}
              className="inline-flex h-9 w-full items-center justify-center rounded-md border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:border-brand disabled:cursor-not-allowed disabled:text-muted"
            >
              Preview report
            </button>
          </CollapsedSection>

          <CollapsedSection title="Status" badge={modeStatus}>
            <div className="break-words text-sm font-medium text-ink">
              {isAnalyzing
                ? "Analysis running"
                : hasSelectedPoint
                  ? "Point ready for analysis"
                  : `Demo object: ${featuredObject.market}`}
            </div>
            <p className="mt-2 break-words text-xs leading-5 text-muted">{modeNote}</p>
            {analysisGeneratedAt ? (
              <p className="mt-1 text-xs font-semibold text-muted">
                Generated {formatGeneratedAt(analysisGeneratedAt)}
              </p>
            ) : null}
          </CollapsedSection>
      </section>

      {/* Primary action footer must stay outside the scrollable middle content. */}
      <section className="shrink-0 border-t border-line bg-white/96 p-4 shadow-[0_-12px_28px_rgba(15,35,45,0.06)]">
        <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-3">
          <button
            type="button"
            disabled={!hasSelectedPoint}
            onClick={onAddToComparison}
            className="mb-2 inline-flex h-9 w-full max-w-full items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
          >
            Add to Comparison
          </button>
          {hasResult ? (
            <button
              type="button"
              onClick={onExportCurrentResult}
              className="inline-flex h-11 w-full max-w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
            >
              Export Report
            </button>
          ) : (
            <button
              type="button"
              disabled={!hasSelectedPoint || isAnalyzing}
              onClick={onRunAnalysis}
              className="inline-flex h-11 w-full max-w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:cursor-not-allowed disabled:bg-[#c9d2d7] disabled:text-white"
            >
              {isAnalyzing ? "Running Express Analysis..." : "Run Express Analysis"}
            </button>
          )}

          {analysisError ? (
            <p className="mt-3 break-words rounded-md border border-[#f2c6bd] bg-[#fff4ed] px-3 py-2 text-sm leading-5 text-[#9f3412]">
              {analysisError}
            </p>
          ) : null}
        </div>
      </section>
    </aside>
  );
}
