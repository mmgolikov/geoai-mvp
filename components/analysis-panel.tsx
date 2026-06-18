"use client";

import { useRef } from "react";
import Link from "next/link";
import demoObjects from "@/src/data/demo-objects.json";
import ingestionReport from "@/data/normalized/ingestion_report.json";
import { DataReadinessCard } from "@/components/data-readiness";
import { getScenarioDataSources } from "@/src/data/data-source-registry";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { MarketMetricsMatch } from "@/src/lib/market-metrics/types";
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
import type { UploadedDataset } from "@/src/types/uploaded-data";

type AnalysisPanelProps = {
  selectedPoint: SelectedPoint | null;
  selectedObject: SelectedDemoObject | null;
  projects: GeoAIProject[];
  projectsMode: "db" | "local_demo";
  activeProject: GeoAIProject;
  scenarios: AnalysisScenario[];
  selectedScenario: AnalysisScenarioId;
  customQuery: string;
  isAnalyzing: boolean;
  analysisError: string | null;
  comparisonItems: ComparisonItem[];
  comparisonMessage: string | null;
  analysisHistory: AnalysisHistoryItem[];
  analysisHistorySource: "DB" | "local";
  hasResult: boolean;
  analysisMode?: ExpressAnalysis["analysisMode"];
  analysisGeneratedAt?: string;
  marketMetricsMatch?: MarketMetricsMatch;
  backendStatus: {
    configured: boolean;
    status: "connected" | "configured_unavailable" | "local_only";
    message: string;
    sources_count: number | null;
  } | null;
  marketContext: MarketContext | null;
  isMarketContextLoading: boolean;
  uploadedDatasets: UploadedDataset[];
  uploadedDataMessage: string | null;
  onProjectChange: (projectKey: string) => void;
  onScenarioChange: (scenario: AnalysisScenarioId) => void;
  onCustomQueryChange: (query: string) => void;
  onRunAnalysis: () => void;
  onAddToComparison: () => void;
  onRemoveComparisonItem: (itemId: string) => void;
  onRunComparison: () => void;
  onOpenHistoryItem: (item: AnalysisHistoryItem) => void;
  onClearAnalysisHistory: () => void;
  onUploadDataset: (file: File) => Promise<void> | void;
  onRemoveUploadedDataset: (datasetId: string) => void;
  onClearUploadedDatasets: () => void;
  onToggleUploadedDataset: (datasetId: string) => void;
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

function formatIngestionTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatUploadedDatasetDetail(dataset: UploadedDataset) {
  if (dataset.type === "geojson") {
    return `${dataset.featureCount ?? 0} features`;
  }

  return `${dataset.rowCount ?? 0} rows`;
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
    <details className="w-full max-w-full overflow-hidden rounded-md border border-line bg-white px-3">
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        <span className="min-w-0 whitespace-normal break-words leading-4">{title}</span>
        <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold normal-case tracking-normal text-brand">
          {badge ?? "Open"}
        </span>
      </summary>
      <div className="min-w-0 max-w-full overflow-y-auto overflow-x-hidden break-words border-t border-line py-3 [scrollbar-width:thin]">
        <div className="max-h-[260px] min-w-0 max-w-full overflow-y-auto overflow-x-hidden pr-1">
          {children}
        </div>
      </div>
    </details>
  );
}

export function AnalysisPanel({
  selectedPoint,
  selectedObject,
  projects,
  projectsMode,
  activeProject,
  scenarios,
  selectedScenario,
  customQuery,
  isAnalyzing,
  analysisError,
  comparisonItems,
  comparisonMessage,
  analysisHistory,
  analysisHistorySource,
  hasResult,
  analysisMode,
  analysisGeneratedAt,
  marketMetricsMatch,
  backendStatus,
  marketContext,
  isMarketContextLoading,
  uploadedDatasets,
  uploadedDataMessage,
  onProjectChange,
  onScenarioChange,
  onCustomQueryChange,
  onRunAnalysis,
  onAddToComparison,
  onRemoveComparisonItem,
  onRunComparison,
  onOpenHistoryItem,
  onClearAnalysisHistory,
  onUploadDataset,
  onRemoveUploadedDataset,
  onClearUploadedDatasets,
  onToggleUploadedDataset,
  onExportCurrentResult
}: AnalysisPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const featuredObject = demoObjects[0];
  const hasSelectedPoint = selectedPoint !== null;
  const hasSelectedObject = selectedObject !== null;
  const scenario = scenarios.find((item) => item.id === selectedScenario) ?? scenarios[0];
  const isCustomQuery = selectedScenario === "customQuery";
  const availableSources = getScenarioDataSources(selectedScenario).slice(0, 3);
  const parsedUploads = uploadedDatasets.filter((dataset) => dataset.status === "parsed");
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
  const persistenceStatus =
    backendStatus?.status === "connected"
      ? "Supabase configured"
      : backendStatus?.configured
        ? "Supabase configured, unavailable"
        : "Local only";
  const spatialDbStatus =
    backendStatus?.status === "connected"
      ? "PostGIS-ready"
      : "Not configured";
  const analysisHistoryStatus =
    analysisHistorySource === "DB" ? "Supabase-backed" : "Local fallback";
  const projectPersistenceStatus = projectsMode === "db" ? "DB enabled" : "local demo";
  async function handleDatasetFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    try {
      if (file) {
        await onUploadDataset(file);
      }
    } finally {
      input.value = "";
      input.blur();
    }
  }

  return (
    <aside className="flex h-full max-w-full flex-col overflow-hidden border-l border-line bg-white lg:h-[calc(100vh-72px)] lg:w-[400px]">
      <section className="min-h-0 flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden p-4 pb-6 [scrollbar-width:thin]">
        <div className="grid min-w-0 gap-3">
          <section className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Command panel
            </p>
            <h1 className="mt-1 text-xl font-semibold text-ink">GeoAI workspace</h1>
          </section>

          <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="active-project"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-muted"
              >
                Project workspace
              </label>
              <Link href="/projects" className="text-xs font-semibold text-brand transition hover:text-[#113f50]">
                Open dashboard
              </Link>
            </div>
            <select
              id="active-project"
              value={activeProject.projectKey}
              onChange={(event) => onProjectChange(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
            >
              {projects.map((project) => (
                <option key={project.projectKey} value={project.projectKey}>
                  {project.name}
                </option>
              ))}
            </select>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold capitalize text-brand">
                {activeProject.clientType.replace(/_/g, " ")}
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted">
                {activeProject.dataMode.replace(/_/g, "-")}
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted">
                {projectPersistenceStatus}
              </span>
            </div>
          </section>

          <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {hasSelectedObject ? "Selected object" : "Selected point"}
                </p>
                <h2 className="mt-1 truncate text-base font-semibold text-ink">
                  {hasSelectedObject
                    ? selectedObject.name
                    : hasSelectedPoint
                      ? "Custom map selection"
                      : "No point selected"}
                </h2>
                <p className="mt-1 truncate text-xs leading-5 text-muted">
                  {hasSelectedObject
                    ? selectedObject.spatialContext?.datasetName ?? selectedObject.layerName
                    : hasSelectedPoint
                      ? "Map point / user selection"
                      : "Select a point or demo object on the map"}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand">
                {hasSelectedObject ? "Object" : "Point"}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="min-w-0 rounded-md bg-white px-2 py-2">
                <dt className="text-muted">Lat</dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {selectedPoint ? formatCoordinate(selectedPoint.latitude) : "-"}
                </dd>
              </div>
              <div className="min-w-0 rounded-md bg-white px-2 py-2">
                <dt className="text-muted">Lng</dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {selectedPoint ? formatCoordinate(selectedPoint.longitude) : "-"}
                </dd>
              </div>
              <div className="min-w-0 rounded-md bg-white px-2 py-2">
                <dt className="text-muted">Type</dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {hasSelectedObject ? selectedObject.type : "Point"}
                </dd>
              </div>
              <div className="min-w-0 rounded-md bg-white px-2 py-2">
                <dt className="text-muted">Confidence</dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {selectedObject?.spatialContext?.confidenceLevel ?? (hasSelectedPoint ? "user" : "-")}
                </dd>
              </div>
            </dl>
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

        <div className="mt-3 grid min-w-0 max-w-full gap-2 overflow-hidden">
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

          <CollapsedSection title="Project Overview" badge={projectPersistenceStatus}>
            <div className="grid gap-2 text-sm">
              <div className="rounded-md border border-line bg-white p-3">
                <p className="font-semibold text-ink">{activeProject.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{activeProject.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-white p-3">
                  <span className="text-muted">Client type</span>
                  <p className="mt-1 font-semibold capitalize text-ink">{activeProject.clientType.replace(/_/g, " ")}</p>
                </div>
                <div className="rounded-md bg-white p-3">
                  <span className="text-muted">Primary scenario</span>
                  <p className="mt-1 font-semibold text-ink">{activeProject.primaryScenario}</p>
                </div>
                <div className="rounded-md bg-white p-3">
                  <span className="text-muted">Data mode</span>
                  <p className="mt-1 font-semibold text-ink">{activeProject.dataMode.replace(/_/g, "-")}</p>
                </div>
                <div className="rounded-md bg-white p-3">
                  <span className="text-muted">Recent analyses</span>
                  <p className="mt-1 font-semibold text-ink">{analysisHistory.length}</p>
                </div>
              </div>
              <p className="text-xs leading-5 text-muted">
                Persistence: {projectPersistenceStatus === "DB enabled" ? "DB-enabled persistence" : "local demo persistence"}.
              </p>
            </div>
          </CollapsedSection>

          <CollapsedSection title="Data Sources" badge={`${parsedUploads.length} local`}>
            <div className="mt-2 grid gap-2">
              <div className="rounded-md border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">DLD / Dubai Pulse ingestion</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Prototype-ready / sample manual CSV. Live API not connected.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand">
                    ready
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Metrics</span>
                    <p className="mt-1 font-semibold text-ink">{ingestionReport.marketMetricCount} areas</p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">DB insert</span>
                    <p className="mt-1 font-semibold text-ink">
                      {backendStatus?.status === "connected" ? "enabled" : "local only"}
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Matched area</span>
                    <p className="mt-1 truncate font-semibold text-ink">
                      {marketMetricsMatch?.matchedAreaName ?? "not run"}
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Market source</span>
                    <p className="mt-1 font-semibold text-ink">
                      {marketMetricsMatch?.sourceMode ?? "pending"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Latest local ingestion: {formatIngestionTimestamp(ingestionReport.generatedAt)}. Market comps, transaction activity, rental demand and pipeline validation support conservative scoring when matched.
                </p>
              </div>
              <div className="rounded-md border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">Local dataset upload</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Upload CSV metrics or GeoJSON layers. Files stay in this browser and require official validation.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted">
                    local
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.geojson,.json,text/csv,application/geo+json,application/json"
                    className="hidden"
                    onChange={(event) => {
                      void handleDatasetFileChange(event);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-8 items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#113f50]"
                  >
                    Add file
                  </button>
                  <button
                    type="button"
                    disabled={uploadedDatasets.length === 0}
                    onClick={onClearUploadedDatasets}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:border-brand hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear local uploads
                  </button>
                </div>
                {uploadedDataMessage ? (
                  <p className="mt-2 rounded-md border border-line bg-white px-2 py-2 text-xs leading-5 text-muted">
                    {uploadedDataMessage}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-2">
                  {uploadedDatasets.length === 0 ? (
                    <div className="rounded-md border border-dashed border-line bg-white px-3 py-3 text-xs leading-5 text-muted">
                      No local datasets uploaded. Try the sample CSV or GeoJSON in `data/upload-samples`.
                    </div>
                  ) : (
                    uploadedDatasets.map((dataset) => (
                      <div key={dataset.id} className="rounded-md border border-line bg-white p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink">{dataset.name}</p>
                            <p className="mt-1 text-[11px] leading-4 text-muted">
                              {dataset.type.toUpperCase()} / {dataset.status} / {formatUploadedDatasetDetail(dataset)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                            {dataset.officialStatus.replace(/-/g, " ")}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-muted">{dataset.notes}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {dataset.type === "geojson" && dataset.status === "parsed" ? (
                            <button
                              type="button"
                              onClick={() => onToggleUploadedDataset(dataset.id)}
                              className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-ink"
                            >
                              {dataset.visible === false ? "Show layer" : "Hide layer"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onRemoveUploadedDataset(dataset.id)}
                            className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-ink"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {availableSources.map((source) => (
                <DataReadinessCard key={source.id} source={source} compact />
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

          <CollapsedSection title="Analysis History" badge={analysisHistoryStatus}>
            <div className="grid min-w-0 gap-2">
              {analysisHistory.length === 0 ? (
                <div className="rounded-md border border-line bg-white px-3 py-3 text-sm leading-5 text-muted">
                  Recent analysis runs will appear here after you run Express Analysis. Current mode: {analysisHistoryStatus}.
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Recent analyses / {analysisHistoryStatus}
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
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">
                            {item.recommendation}
                          </p>
                        </div>
                        <div className="grid shrink-0 gap-1 text-right">
                          <span className="rounded-full bg-surface px-2 py-1 text-[11px] font-semibold capitalize text-brand">
                            {item.source ?? analysisHistorySource}
                          </span>
                          <span className="text-[11px] font-semibold text-muted">
                            {item.analysis.scores.investmentAttractiveness}/100
                          </span>
                          <span className="text-[11px] font-semibold capitalize text-muted">
                            {item.confidenceLevel ?? "medium"}
                          </span>
                        </div>
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
            <div className="mt-3 grid gap-2 rounded-md border border-line bg-surface p-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Data mode</span>
                <span className="font-semibold text-ink">Demo-normalized</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Persistence</span>
                <span className="text-right font-semibold text-ink">{persistenceStatus}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Analysis history</span>
                <span className="text-right font-semibold text-ink">{analysisHistoryStatus}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Spatial DB</span>
                <span className="font-semibold text-ink">{spatialDbStatus}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Real data adapters</span>
                <span className="font-semibold text-ink">Planned</span>
              </div>
            </div>
            {analysisGeneratedAt ? (
              <p className="mt-1 text-xs font-semibold text-muted">
                Generated {formatGeneratedAt(analysisGeneratedAt)}
              </p>
            ) : null}
          </CollapsedSection>
        </div>
      </section>

      <section className="min-w-0 max-w-full flex-shrink-0 border-t border-line bg-white p-4">
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
      </section>
    </aside>
  );
}
