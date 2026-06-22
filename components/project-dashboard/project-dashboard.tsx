"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import externalDataManifestStatic from "@/data/external/normalized/external_data_manifest.json";
import dldMarketSnapshotStatic from "@/data/normalized/dld_market_snapshot.json";
import openGeodataSnapshotStatic from "@/data/normalized/open_geodata_snapshot.json";
import { dataSourceRegistry } from "@/src/data/data-source-registry";
import { seededDemoComparisonSummaries, seededDemoRecentAnalyses, seededDemoReportRecords } from "@/src/data/demo-report-seeds";
import { demoProjects, getDemoProject } from "@/src/data/demo-projects";
import { getSupabaseFallbackMessage } from "@/src/lib/data-readiness";
import { deriveDecisionPosture } from "@/src/lib/decision-posture";
import { getPilotDataRequirements } from "@/src/lib/pilot/data-requirements";
import { getPilotPackageForProject } from "@/src/lib/pilot/pilot-packages";
import { calculatePilotReadiness } from "@/src/lib/pilot/pilot-readiness";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { AnalysisHistoryItem, AnalysisScenarioId, ExpressAnalysis } from "@/src/types/geo";

const activeProjectStorageKey = "geoai-active-project-key-v1";
const analysisHistoryStorageKey = "geoai-analysis-history-v1";
const openAnalysisRequestStorageKey = "geoai-open-analysis-request-v1";

type DbHealth = {
  configured: boolean;
  status: "connected" | "configured_unavailable" | "local_only";
  message: string;
  sources_count: number | null;
};

type MarketMetricsSummary = {
  sourceMode: string;
  count: number;
  availableAreaNames: string[];
  fallbackStatus: string;
};

type ExternalDataStatus = {
  readiness?: Array<{
    sourceId: string;
    status: string;
    recordCount?: number;
    coverageArea: string;
    confidence: string;
    caveat: string;
  }>;
  manifest?: {
    sources?: Array<{
      id: string;
      status?: string;
      rowCount?: number;
      recordCount?: number;
      featureCount?: number;
      coverageArea?: string;
      confidence?: string;
      caveat?: string;
      disclaimer?: string;
    }>;
  };
};

type ProjectReadinessRow = {
  sourceId: string;
  source: string;
  currentStatus: string;
  caveat: string;
};

type ReadinessItem = NonNullable<ExternalDataStatus["readiness"]>[number];
type ManifestSource = NonNullable<NonNullable<ExternalDataStatus["manifest"]>["sources"]>[number];

type PersistedAnalysisRun = {
  id?: string;
  run_key?: string;
  scenario_id?: AnalysisScenarioId;
  scenario?: AnalysisScenarioId | string;
  selected_name?: string;
  selected_type?: string;
  title?: string;
  decision_posture?: string | null;
  decisionPosture?: string | null;
  confidence_level?: ExpressAnalysis["confidenceLevel"];
  data_confidence_level?: string | null;
  analysis_mode?: ExpressAnalysis["analysisMode"];
  result_json?: ExpressAnalysis;
  result_payload?: ExpressAnalysis;
  payload?: ExpressAnalysis;
  created_at?: string;
  createdAt?: string;
  projectId?: string | null;
  project_id?: string | null;
  projectKey?: string | null;
  project_key?: string | null;
  project_name?: string | null;
};

type RecentAnalysisRow = {
  id: string;
  title: string;
  scenarioLabel: string;
  timestamp: string;
  decisionPosture: string;
  confidence: string;
  dataConfidence: string;
  source: "local" | "DB";
  reportId?: string;
  analysis?: ExpressAnalysis;
  projectId?: string | null;
  projectKey?: string;
  scenarioId?: AnalysisScenarioId;
  customQuery?: string;
  canOpenAnalysis?: boolean;
};

type SavedObjectSummary = {
  id: string;
  title: string;
  createdAt?: string | null;
  sourceSummary?: string;
  reportType?: "analysis" | "comparison";
  scenario?: string | null;
  targetLabel?: string | null;
  reportId?: string;
  projectId?: string | null;
  projectKey?: string | null;
};

const defaultProjectKey = demoProjects[0].projectKey;

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTimestamp(value?: string) {
  if (!value) return "Current session";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function readActiveProjectKey() {
  try {
    return window.localStorage.getItem(activeProjectStorageKey) || demoProjects[0].projectKey;
  } catch {
    return demoProjects[0].projectKey;
  }
}

function writeActiveProjectKey(projectKey: string) {
  try {
    window.localStorage.setItem(activeProjectStorageKey, projectKey);
  } catch {
    // Dashboard still works in-memory if localStorage is unavailable.
  }
}

function compactReadinessStatus(status?: string) {
  if (status === "snapshot_available") return "snapshot";
  if (status === "connected") return "API context";
  if (status === "planned") return "planned validation";
  if (status === "sample_fallback") return "sample fallback";
  if (status === "missing") return "missing";
  return "planned";
}

function manifestSourceToReadiness(source?: ManifestSource): ReadinessItem | undefined {
  if (!source) return undefined;

  return {
    sourceId: source.id,
    status: source.status ?? "planned",
    recordCount: source.recordCount ?? source.rowCount ?? source.featureCount,
    coverageArea: source.coverageArea ?? "Dubai / UAE screening context",
    confidence: source.confidence ?? (source.status === "snapshot_available" ? "medium" : "low"),
    caveat: source.caveat ?? source.disclaimer ?? "Screening context only; official validation required."
  };
}

function createInitialMarketMetrics(): MarketMetricsSummary {
  const areas = Array.isArray((dldMarketSnapshotStatic as { areas?: unknown[] }).areas)
    ? (dldMarketSnapshotStatic as { areas: Array<{ areaName?: string }> }).areas
    : [];

  if (areas.length > 0) {
    return {
      sourceMode: "real_snapshot",
      count: areas.length,
      availableAreaNames: areas.map((area) => area.areaName ?? "Unknown area"),
      fallbackStatus: "Sample metrics available - manual/offline import; not live official data."
    };
  }

  return {
    sourceMode: "sample_fallback",
    count: 0,
    availableAreaNames: [],
    fallbackStatus: "seed_static fallback"
  };
}

function createInitialExternalDataStatus(): ExternalDataStatus {
  const manifest = externalDataManifestStatic as ExternalDataStatus["manifest"];
  const manifestSources = manifest?.sources ?? [];
  const osmSnapshot = openGeodataSnapshotStatic as { roads?: unknown[]; pois?: unknown[]; landuse?: unknown[] };
  const osmFeatureCount = (osmSnapshot.roads?.length ?? 0) + (osmSnapshot.pois?.length ?? 0) + (osmSnapshot.landuse?.length ?? 0);
  const manifestWithCounts = {
    ...manifest,
    sources: manifestSources.map((source) => source.id === "osm-geofabrik-baseline" && !source.recordCount
      ? { ...source, recordCount: osmFeatureCount, featureCount: osmFeatureCount }
      : source)
  };

  return {
    manifest: manifestWithCounts,
    readiness: (manifestWithCounts.sources ?? [])
      .map((source) => manifestSourceToReadiness(source))
      .filter((source): source is ReadinessItem => Boolean(source))
  };
}

function writeOpenAnalysisRequest(row: RecentAnalysisRow) {
  if (!row.analysis) return;

  try {
    window.localStorage.setItem(openAnalysisRequestStorageKey, JSON.stringify({
      analysisId: row.analysis.id,
      projectId: row.projectId,
      projectKey: row.projectKey,
      scenarioId: row.scenarioId,
      customQuery: row.customQuery ?? row.analysis.customQuery ?? "",
      analysis: row.analysis
    }));
  } catch {
    // Dashboard remains usable even if the restore handoff cannot be written.
  }
}

function readLocalHistory() {
  try {
    const raw = window.localStorage.getItem(analysisHistoryStorageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalysisHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function readProjectKey(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const item = value as {
    projectKey?: string | null;
    project_key?: string | null;
    project?: { projectKey?: string | null } | null;
    analysis?: { project?: { projectKey?: string | null } | null } | null;
    reportPayload?: { project?: { projectKey?: string | null } | null } | null;
    payload?: { project?: { projectKey?: string | null } | null } | null;
  };

  return item.projectKey
    ?? item.project_key
    ?? item.project?.projectKey
    ?? item.analysis?.project?.projectKey
    ?? item.reportPayload?.project?.projectKey
    ?? item.payload?.project?.projectKey
    ?? null;
}

function readProjectId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const item = value as {
    projectId?: string | null;
    project_id?: string | null;
    project?: { id?: string | null } | null;
    analysis?: { project?: { id?: string | null } | null } | null;
  };

  return item.projectId
    ?? item.project_id
    ?? item.project?.id
    ?? item.analysis?.project?.id
    ?? null;
}

function belongsToProject(value: unknown, projectKey: string) {
  const itemProjectKey = readProjectKey(value);

  if (itemProjectKey) {
    return itemProjectKey === projectKey;
  }

  // Legacy local fallback records without project metadata belong only to the
  // original investment-screening demo, not every project dashboard.
  return projectKey === defaultProjectKey;
}

function localHistoryToRows(items: AnalysisHistoryItem[], projectKey: string): RecentAnalysisRow[] {
  const scoped = items.filter((item) => belongsToProject(item, projectKey));

  return scoped.slice(0, 6).map((item) => ({
    id: item.id,
    title: item.title,
    scenarioLabel: item.scenarioLabel,
    timestamp: item.timestamp,
    decisionPosture: item.recommendation || deriveDecisionPosture(item.analysis),
    confidence: item.confidenceLevel ?? item.analysis.confidenceLevel ?? "medium",
    dataConfidence: item.dataConfidenceLevel ?? "Demo-normalized",
    source: item.source ?? "local",
    reportId: undefined,
    analysis: item.analysis,
    projectId: item.project?.id ?? item.analysis.project?.id ?? null,
    projectKey: item.projectKey ?? item.project?.projectKey,
    scenarioId: item.scenarioId,
    customQuery: item.analysis.customQuery,
    canOpenAnalysis: true
  }));
}

function persistedRowsToRecent(items: PersistedAnalysisRun[]): RecentAnalysisRow[] {
  return items.slice(0, 6).map((item) => {
    const analysis = item.result_json ?? item.result_payload ?? item.payload;
    const scenarioId = item.scenario_id ?? analysis?.scenarioId;
    const scenarioLabel = scenarioId
      ? formatLabel(scenarioId)
      : item.scenario
        ? formatLabel(String(item.scenario))
        : "Scenario analysis";

    return {
      id: item.id ?? item.run_key ?? analysis?.id ?? `${item.selected_name}-${item.created_at ?? item.createdAt}`,
      title: item.selected_name ?? item.title ?? analysis?.selectedObject?.name ?? analysis?.title ?? "Saved analysis run",
      scenarioLabel,
      timestamp: item.created_at ?? item.createdAt ?? analysis?.generatedAt ?? new Date().toISOString(),
      decisionPosture: item.decision_posture ?? item.decisionPosture ?? (analysis ? deriveDecisionPosture(analysis) : "Requires official validation"),
      confidence: item.confidence_level ?? analysis?.confidenceLevel ?? "medium",
      dataConfidence: item.data_confidence_level ?? analysis?.marketContext?.confidenceLevel ?? "Demo-normalized",
      source: "DB" as const,
      reportId: undefined,
      analysis,
      projectId: item.project_id ?? item.projectId ?? analysis?.project?.id ?? null,
      projectKey: item.project_key ?? item.projectKey ?? analysis?.project?.projectKey ?? undefined,
      scenarioId: item.scenario_id ?? analysis?.scenarioId,
      customQuery: analysis?.customQuery,
      canOpenAnalysis: Boolean(analysis)
    };
  });
}

function ProjectBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#eaf3f1] px-3 py-1 text-xs font-semibold capitalize text-brand">
      {children}
    </span>
  );
}

function KpiCard({ label, value, note, valueKind = "numeric" }: { label: string; value: string | number; note: string; valueKind?: "numeric" | "text" }) {
  return (
    <div className="flex h-full min-h-[136px] flex-col rounded-lg border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-3 break-words font-semibold text-ink ${valueKind === "text" ? "text-xl leading-6" : "text-3xl leading-none"}`}>{value}</p>
      <p className="mt-2 text-sm leading-5 text-muted">{note}</p>
    </div>
  );
}

function EmptyState({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  return (
    <div className="rounded-md border border-dashed border-line bg-surface p-4">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
      <Link href={href} className="mt-3 inline-flex h-9 items-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-brand">
        {action}
      </Link>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function getProjectMetadataText(project: GeoAIProject, key: string, fallback: string) {
  const value = project.metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function getNextActions(project: GeoAIProject, importedMetricsCount: number) {
  const scenario = project.primaryScenario;
  const common = [
    "Confirm Dubai Municipality / GeoDubai planning constraints.",
    "Compare 2-3 alternative sites before underwriting.",
    "Export an investment memo after official evidence gaps are reviewed."
  ];

  if (scenario === "investmentSiteSelection") {
    return [
      "Validate official DLD transaction and rental comps for the shortlist area.",
      "Review pipeline / absorption risk against imported sample metrics.",
      ...common
    ];
  }

  if (scenario === "realEstateDevelopment") {
    return [
      "Request land-use and permitted development confirmation.",
      "Validate infrastructure readiness and access constraints.",
      ...common
    ];
  }

  if (scenario === "climateRisk") {
    return [
      "Validate flood, coastal and heat exposure with official or licensed layers.",
      "Add resilience requirements to the pilot data checklist.",
      ...common
    ];
  }

  return [
    importedMetricsCount > 0
      ? "Review imported market areas and flag which can be validated with official sources."
      : "Run DLD / Dubai Pulse ingestion fixtures or connect validated market inputs.",
    "Prepare pilot data requirements for customer assets and official source access.",
    ...common
  ];
}

export function ProjectDashboard() {
  const [projects, setProjects] = useState<GeoAIProject[]>(demoProjects);
  const [projectsMode, setProjectsMode] = useState<"db" | "local_demo">("local_demo");
  const [activeProjectKey, setActiveProjectKey] = useState(demoProjects[0].projectKey);
  const [localHistory, setLocalHistory] = useState<AnalysisHistoryItem[]>([]);
  const [dbHistory, setDbHistory] = useState<RecentAnalysisRow[]>([]);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [marketMetrics, setMarketMetrics] = useState<MarketMetricsSummary | null>(() => createInitialMarketMetrics());
  const [externalDataStatus, setExternalDataStatus] = useState<ExternalDataStatus | null>(() => createInitialExternalDataStatus());
  const [savedReports, setSavedReports] = useState<SavedObjectSummary[]>([]);
  const [savedComparisons, setSavedComparisons] = useState<SavedObjectSummary[]>([]);
  const [projectDatasets, setProjectDatasets] = useState<SavedObjectSummary[]>([]);

  useEffect(() => {
    setActiveProjectKey(readActiveProjectKey());
    setLocalHistory(readLocalHistory());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProjectData() {
      const results = await Promise.allSettled([
        fetch("/api/projects").then((response) => response.json()),
        fetch("/api/db/health").then((response) => response.json()),
        fetch("/api/market-metrics").then((response) => response.json()),
        fetch("/api/external-data/status").then((response) => response.json())
      ]);

      if (cancelled) return;

      const projectsResult = results[0];
      if (projectsResult.status === "fulfilled" && Array.isArray(projectsResult.value.items) && projectsResult.value.items.length > 0) {
        setProjects(projectsResult.value.items);
        setProjectsMode(projectsResult.value.mode === "db" ? "db" : "local_demo");
      }

      const dbResult = results[1];
      if (dbResult.status === "fulfilled") {
        setDbHealth(dbResult.value as DbHealth);
      }

      const marketResult = results[2];
      if (marketResult.status === "fulfilled") {
        setMarketMetrics(marketResult.value as MarketMetricsSummary);
      }

      const externalStatusResult = results[3];
      if (externalStatusResult.status === "fulfilled") {
        setExternalDataStatus(externalStatusResult.value as ExternalDataStatus);
      }
    }

    void loadProjectData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDbHistory() {
      try {
        const [analysisResponse, reportsResponse, comparisonsResponse, datasetsResponse] = await Promise.all([
          fetch(`/api/analysis-runs?limit=8&projectKey=${encodeURIComponent(activeProjectKey)}`),
          fetch(`/api/reports?projectKey=${encodeURIComponent(activeProjectKey)}`),
          fetch(`/api/comparison-sets?projectKey=${encodeURIComponent(activeProjectKey)}`),
          fetch(`/api/uploaded-datasets?projectKey=${encodeURIComponent(activeProjectKey)}`)
        ]);
        const [analysisPayload, reportsPayload, comparisonsPayload, datasetsPayload] = await Promise.all([
          analysisResponse.json(),
          reportsResponse.json(),
          comparisonsResponse.json(),
          datasetsResponse.json()
        ]);
        if (!cancelled) {
          setDbHistory(Array.isArray(analysisPayload.items) ? persistedRowsToRecent(analysisPayload.items) : []);
          setSavedReports(Array.isArray(reportsPayload.summaries)
            ? reportsPayload.summaries.map((item: {
                id: string;
                title: string;
                createdAt?: string;
                sourceSummary?: string;
                reportType?: "analysis" | "comparison";
                scenario?: string | null;
                targetLabel?: string | null;
                projectId?: string | null;
                project_id?: string | null;
                projectKey?: string | null;
                project_key?: string | null;
              }) => ({
                id: item.id,
                title: item.title,
                createdAt: item.createdAt,
                sourceSummary: item.sourceSummary,
                reportType: item.reportType,
                scenario: item.scenario,
                targetLabel: item.targetLabel,
                projectId: item.projectId ?? item.project_id ?? null,
                projectKey: item.projectKey ?? item.project_key ?? null
              }))
            : []);
          setSavedComparisons(Array.isArray(comparisonsPayload.items)
            ? comparisonsPayload.items.map((item: {
                id: string;
                title: string;
                createdAt?: string;
                recommendation?: string;
                projectId?: string | null;
                project_id?: string | null;
                projectKey?: string | null;
                project_key?: string | null;
              }) => ({
                id: item.id,
                title: item.title,
                createdAt: item.createdAt,
                sourceSummary: item.recommendation,
                projectId: item.projectId ?? item.project_id ?? null,
                projectKey: item.projectKey ?? item.project_key ?? null
              }))
            : []);
          setProjectDatasets(Array.isArray(datasetsPayload.items)
            ? datasetsPayload.items.map((item: {
                id: string;
                name: string;
                uploadedAt?: string;
                officialStatus?: string;
                projectId?: string | null;
                projectKey?: string | null;
              }) => ({
                id: item.id,
                title: item.name,
                createdAt: item.uploadedAt,
                sourceSummary: item.officialStatus,
                projectId: item.projectId ?? null,
                projectKey: item.projectKey ?? null
              }))
            : []);
        }
      } catch {
        if (!cancelled) {
          setDbHistory([]);
          setSavedReports([]);
          setSavedComparisons([]);
          setProjectDatasets([]);
        }
      }
    }

    void loadDbHistory();

    return () => {
      cancelled = true;
    };
  }, [activeProjectKey]);

  const activeProject = useMemo(
    () => projects.find((project) => project.projectKey === activeProjectKey) ?? getDemoProject(activeProjectKey),
    [activeProjectKey, projects]
  );
  const localRows = useMemo(() => localHistoryToRows(localHistory, activeProject.projectKey), [activeProject.projectKey, localHistory]);
  const scopedDbHistory = dbHistory.filter((item) => belongsToProject(item, activeProject.projectKey));
  const scopedSavedReports = savedReports.filter((item) => belongsToProject(item, activeProject.projectKey));
  const scopedSavedComparisons = savedComparisons.filter((item) => belongsToProject(item, activeProject.projectKey));
  const scopedProjectDatasets = projectDatasets.filter((item) => belongsToProject(item, activeProject.projectKey));
  const seededRows = seededDemoRecentAnalyses
    .filter((item) => item.analysis.project?.projectKey === activeProject.projectKey)
    .map((item) => ({
      id: item.id,
      title: item.title,
      scenarioLabel: item.scenarioLabel,
      timestamp: item.timestamp,
      decisionPosture: item.decisionPosture,
      confidence: item.confidence,
      dataConfidence: item.dataConfidence,
      source: item.source,
      reportId: item.analysis.id === "seeded-analysis-dubai-marina" ? "seeded-analysis-dubai-marina-report" : undefined,
      analysis: item.analysis,
      projectId: item.analysis.project?.id ?? null,
      projectKey: item.analysis.project?.projectKey,
      scenarioId: item.analysis.scenarioId,
      customQuery: item.analysis.customQuery,
      canOpenAnalysis: true
    }));
  const recentRows = scopedDbHistory.length > 0 ? scopedDbHistory : localRows.length > 0 ? localRows : seededRows;
  const reportRows = scopedSavedReports.length > 0
    ? scopedSavedReports
    : seededDemoReportRecords
      .filter((report) => report.projectKey === activeProject.projectKey)
      .map((report) => ({
        id: report.id,
        title: report.title,
        createdAt: report.createdAt,
        sourceSummary: report.sourceSummary,
        reportType: report.reportType,
        scenario: report.scenario,
        targetLabel: report.targetLabel,
        projectId: report.projectId,
        projectKey: report.projectKey
      }));
  const comparisonRows = scopedSavedComparisons.length > 0
    ? scopedSavedComparisons
    : seededDemoComparisonSummaries.filter((comparison) => comparison.projectKey === activeProject.projectKey);
  const importedAreas = marketMetrics?.count ?? 0;
  const externalReadinessById = new Map(
    (externalDataStatus?.readiness ?? []).map((item) => [item.sourceId, item])
  );
  const manifestReadinessById = new Map(
    (externalDataStatus?.manifest?.sources ?? [])
      .map((source) => manifestSourceToReadiness(source))
      .filter((source): source is ReadinessItem => Boolean(source))
      .map((source) => [source.sourceId, source])
  );
  const getReadiness = (sourceId: string) => externalReadinessById.get(sourceId) ?? manifestReadinessById.get(sourceId);
  const dldReadiness = getReadiness("dld-dubai-pulse-transactions");
  const osmReadiness = getReadiness("osm-geofabrik-baseline");
  const climateReadiness = getReadiness("open-meteo-climate");
  const copernicusReadiness = getReadiness("copernicus-sentinel-catalog");
  const geodubaiReadiness = getReadiness("geodubai-municipality-validation");
  const marketSnapshotAvailable = marketMetrics?.sourceMode === "real_snapshot" && importedAreas > 0;
  const dldSnapshotAvailable = (
    dldReadiness?.status === "snapshot_available"
    && Boolean(dldReadiness.recordCount && dldReadiness.recordCount > 0)
  ) || marketSnapshotAvailable;
  const dldRecordCount = dldReadiness?.recordCount ?? importedAreas;
  const projectReadinessRows: ProjectReadinessRow[] = [
    {
      sourceId: "dld-dubai-pulse-transactions",
      source: "DLD / Dubai Pulse snapshot",
      currentStatus: dldSnapshotAvailable ? "snapshot" : compactReadinessStatus(dldReadiness?.status),
      caveat: dldSnapshotAvailable
        ? `Snapshot available: ${dldRecordCount} sample market-area records. Official validation required before decisions.`
        : dldReadiness?.caveat ?? "Sample fallback remains active until a DLD / Dubai Pulse snapshot is available."
    },
    {
      sourceId: "osm-geofabrik-baseline",
      source: "OSM / Geofabrik open snapshot",
      currentStatus: compactReadinessStatus(osmReadiness?.status),
      caveat: osmReadiness?.status === "snapshot_available"
        ? "Open geospatial context; not official municipal GIS, zoning or parcel boundary data."
        : osmReadiness?.caveat ?? "Open geospatial sample fallback remains active."
    },
    {
      sourceId: "open-meteo-climate",
      source: "Open-Meteo climate context",
      currentStatus: compactReadinessStatus(climateReadiness?.status),
      caveat: climateReadiness?.caveat ?? "Screening-level heat/rainfall proxy only."
    },
    {
      sourceId: "copernicus-sentinel-catalog",
      source: "Copernicus / Sentinel",
      currentStatus: compactReadinessStatus(copernicusReadiness?.status),
      caveat: copernicusReadiness?.caveat ?? "Metadata availability only; analytics pipeline planned."
    },
    {
      sourceId: "geodubai-municipality-validation",
      source: "GeoDubai / Dubai Municipality",
      currentStatus: compactReadinessStatus(geodubaiReadiness?.status),
      caveat: geodubaiReadiness?.caveat ?? "Not connected in this demo."
    }
  ];
  const demoMarketAreas = Math.max(marketMetrics?.availableAreaNames?.length ?? 0, 6);
  const dataConfidence = dldSnapshotAvailable ? "Snapshot + fallback" : "Seed fallback";
  const dataConfidenceNote = dldSnapshotAvailable
    ? "DLD/Dubai Pulse and OSM snapshots are available for screening context; official validation required."
    : "Demo fallback; official validation required before decisions.";
  const persistenceMode = dbHealth?.status === "connected" ? "Supabase/PostGIS connected" : "Local fallback";
  const nextActions = getNextActions(activeProject, dldRecordCount);
  const pilotPackage = getPilotPackageForProject(activeProject.projectKey, activeProject.clientType);
  const pilotDataRequirements = getPilotDataRequirements(pilotPackage.clientType);
  const pilotReadiness = calculatePilotReadiness({
    targetSitesProvided: scopedProjectDatasets.length > 0 || recentRows.length > 0 || activeProject.status === "demo",
    geometryAvailable: scopedProjectDatasets.length > 0 || activeProject.status === "demo",
    marketDataAvailable: dldRecordCount > 0,
    externalOpenDataAvailable: dataSourceRegistry.length > 0,
    validationSourcesIdentified: false,
    reportsGenerated: reportRows.length > 0,
    comparisonGenerated: comparisonRows.length > 0,
    officialCustomerValidationPending: true
  });
  const openWorkspaceHref = `/workspace?projectId=${encodeURIComponent(activeProject.id ?? activeProject.projectKey)}`;

  function changeProject(projectKey: string) {
    setActiveProjectKey(projectKey);
    writeActiveProjectKey(projectKey);
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-surface px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Project workspace</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-ink">{activeProject.name}</h1>
                <ProjectBadge>{activeProject.clientType.replace(/_/g, " ")}</ProjectBadge>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{activeProject.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  {activeProject.geography}
                </span>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  Scenario: {formatLabel(activeProject.primaryScenario)}
                </span>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  Data: {activeProject.dataMode.replace(/_/g, "-")}
                </span>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  Persistence: {persistenceMode}
                </span>
              </div>
            </div>

            <div className="grid min-w-[260px] gap-3">
              <label htmlFor="project-dashboard-selector" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Active project
              </label>
              <select
                id="project-dashboard-selector"
                value={activeProject.projectKey}
                onChange={(event) => changeProject(event.target.value)}
                className="h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
              >
                {projects.map((project) => (
                  <option key={project.projectKey} value={project.projectKey}>
                    {project.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={openWorkspaceHref}
                  onClick={() => writeActiveProjectKey(activeProject.projectKey)}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
                >
                  Open workspace
                </Link>
                <Link
                  href={openWorkspaceHref}
                  onClick={() => writeActiveProjectKey(activeProject.projectKey)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
                >
                  Run new analysis
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Analyses" value={recentRows.length} note={recentRows.length > 0 ? "Recent runs available for this project context." : "Run an analysis from the workspace."} />
          <KpiCard label="Reports" value={reportRows.length} note={scopedSavedReports.length > 0 ? "Saved reports available for this project." : "Demo example memo available for this project."} />
          <KpiCard label="Comparisons" value={comparisonRows.length} note={scopedSavedComparisons.length > 0 ? "Saved comparison sets available for this project." : "Demo example comparison available for this project."} />
          <KpiCard label="Data sources" value={dataSourceRegistry.length + scopedProjectDatasets.length} note={`${scopedProjectDatasets.length} project upload metadata records.`} />
          <KpiCard
            label="Market areas"
            value={dldSnapshotAvailable ? `${dldRecordCount} snapshot / ${demoMarketAreas} demo` : `0 snapshot / ${demoMarketAreas} demo`}
            valueKind="text"
            note={dldSnapshotAvailable ? "DLD / Dubai Pulse snapshot context." : "seed_static fallback"}
          />
          <KpiCard label="Data confidence" value={dataConfidence} valueKind="text" note={dataConfidenceNote} />
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="grid gap-5">
            <Panel title="Project Activity / Recent Analyses" subtitle="Analysis runs are scoped to the active project when project metadata is available.">
              {recentRows.length > 0 ? (
                <div className="grid gap-3">
                  {recentRows.map((item) => (
                    <article key={item.id} className="rounded-md border border-line bg-surface p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="safe-line-1 font-semibold text-ink">{item.title}</h3>
                          <p className="safe-line-1 mt-1 text-sm leading-5 text-muted">{item.scenarioLabel} / {formatTimestamp(item.timestamp)}</p>
                        </div>
                        <div className="flex shrink-0 items-center justify-end gap-2">
                          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                            {item.customQuery ? (
                              <span className="safe-line-1 max-w-[150px] rounded-full bg-[#fff9e8] px-2 py-1 text-[11px] font-semibold text-[#6f5817]">
                                Custom query analysis
                              </span>
                            ) : null}
                            <span className="safe-line-1 max-w-[92px] rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
                              {item.source}
                            </span>
                          </div>
                          <Link
                            href={item.canOpenAnalysis && item.analysis
                              ? `/workspace?openAnalysis=${encodeURIComponent(item.analysis.id)}&projectId=${encodeURIComponent(item.projectId ?? activeProject.id ?? item.projectKey ?? activeProject.projectKey)}&projectKey=${encodeURIComponent(item.projectKey ?? activeProject.projectKey)}`
                              : openWorkspaceHref}
                            onClick={() => {
                              writeActiveProjectKey(item.projectKey ?? activeProject.projectKey);
                              writeOpenAnalysisRequest(item);
                            }}
                            className="inline-flex h-8 shrink-0 items-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand"
                          >
                            {item.canOpenAnalysis ? "Open analysis" : "Open workspace"}
                          </Link>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                        <div className="rounded-md bg-white p-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Posture</span>
                          <p className="mt-1 font-semibold text-ink">{item.decisionPosture}</p>
                        </div>
                        <div className="rounded-md bg-white p-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Confidence</span>
                          <p className="mt-1 font-semibold capitalize text-ink">{item.confidence}</p>
                        </div>
                        <div className="rounded-md bg-white p-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Data basis</span>
                          <p className="mt-1 font-semibold text-ink">{item.dataConfidence}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No analyses yet"
                  text="Run Express Analysis in the workspace to populate this project activity feed."
                  href={openWorkspaceHref}
                  action="Open workspace"
                />
              )}
            </Panel>

            <Panel title="Reports / Memos" subtitle="Client-ready memo generation remains connected to the workspace result and report preview flow.">
              {reportRows.length > 0 ? (
                <div className="grid gap-3">
                  {reportRows.slice(0, 5).map((report) => (
                    <article key={report.id} className="rounded-md border border-line bg-surface p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="break-words font-semibold text-ink">{report.title}</h3>
                          <p className="mt-1 text-sm text-muted">
                            {formatTimestamp(report.createdAt ?? undefined)}
                            {report.reportType ? ` / ${formatLabel(report.reportType)}` : ""}
                          </p>
                          {report.scenario || report.targetLabel ? (
                            <p className="mt-1 break-words text-xs leading-5 text-muted">
                              {[report.scenario, report.targetLabel].filter(Boolean).join(" / ")}
                            </p>
                          ) : null}
                          {scopedSavedReports.length === 0 ? (
                            <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand">
                              Demo example
                            </span>
                          ) : null}
                        </div>
                        <Link
                          href={`/reports/${encodeURIComponent(report.id)}/print`}
                          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-brand"
                        >
                          Export report
                        </Link>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-muted">{report.sourceSummary ?? "Saved with demo/local source lineage; official validation required."}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No saved reports yet"
                  text="Run an analysis and export a memo to populate this project. Saved reports remain demo/local until official validation is connected."
                  href={openWorkspaceHref}
                  action="Generate new memo"
                />
              )}
            </Panel>

            <Panel title="Pilot Deliverables" subtitle="Pilot deliverables — generated from uploaded/customer-approved and open snapshot data.">
              <div className="grid gap-3 md:grid-cols-2">
                {pilotPackage.deliverables.slice(0, 6).map((deliverable, index) => (
                  <div key={`pilot-deliverable-${index}-${deliverable.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`} className="rounded-md border border-line bg-surface p-3">
                    <p className="text-sm font-semibold text-ink">{deliverable}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {pilotPackage.clientType === "developer"
                        ? "Developer output"
                        : pilotPackage.clientType === "fund"
                          ? "Fund / family office output"
                          : pilotPackage.clientType === "bank"
                            ? "Bank / lender output"
                            : "Government / free zone output"}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">{pilotPackage.dataHonestyNote}</p>
            </Panel>
          </div>

          <div className="grid content-start gap-5">
            <Panel title="Guided Demo Brief" subtitle="Use this project as a controlled client-demo narrative, not as validated production evidence.">
              <div className="grid gap-3">
                <div className="rounded-md bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Purpose</p>
                  <p className="mt-1 text-sm leading-6 text-ink">
                    {getProjectMetadataText(activeProject, "demoPurpose", "Demonstrate GeoAI screening, memo and comparison workflows.")}
                  </p>
                </div>
                <div className="rounded-md bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Data status</p>
                  <p className="mt-1 text-sm leading-6 text-ink">
                    {getProjectMetadataText(activeProject, "dataStatus", "Demo-normalized and sample/offline data; official validation required.")}
                  </p>
                </div>
                <div className="rounded-md bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Recommended next action</p>
                  <p className="mt-1 text-sm leading-6 text-ink">
                    {getProjectMetadataText(activeProject, "recommendedNextAction", "Agree pilot data sources and validation path before operational use.")}
                  </p>
                </div>
              </div>
            </Panel>

            <Panel title="Pilot Readiness" subtitle="Client delivery framing for the active demo project.">
              <div className="grid gap-3">
                <div className="rounded-md border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{pilotPackage.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">{pilotPackage.objective}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
                      {pilotReadiness.score}/100
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-muted">{pilotReadiness.readinessLabel}</p>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="rounded-md bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Required client data</p>
                    <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-ink">
                      {pilotDataRequirements.required.slice(0, 4).map((item, index) => (
                        <li key={`pilot-required-${index}-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Validation sources</p>
                    <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-ink">
                      {pilotPackage.validationSources.slice(0, 3).map((item, index) => (
                        <li key={`pilot-validation-${index}-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Success criteria</p>
                    <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-ink">
                      {pilotPackage.successCriteria.slice(0, 3).map((item, index) => (
                        <li key={`pilot-success-${index}-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rounded-md border border-line bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Next action</p>
                  <p className="mt-1 text-sm leading-6 text-ink">{pilotReadiness.nextActions[0]}</p>
                </div>
              </div>
            </Panel>

            <Panel title="Data Readiness" subtitle="Current source maturity and persistence posture for this project.">
              <div className="grid gap-3">
                <div className="rounded-md border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{dldSnapshotAvailable ? "DLD / Dubai Pulse snapshot" : "DLD / Dubai Pulse ingestion"}</p>
                      <p className="mt-1 text-sm leading-5 text-muted">
                        {dldSnapshotAvailable
                          ? `Snapshot available: ${dldRecordCount} sample market-area records. Official validation required before decisions.`
                          : dldReadiness?.caveat ?? "Sample fallback remains active until a DLD / Dubai Pulse snapshot is available."}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
                      {dldSnapshotAvailable ? "snapshot" : "fallback"}
                    </span>
                  </div>
                </div>
                <div className="rounded-md border border-line bg-surface p-4">
                  <p className="font-semibold text-ink">Supabase / PostGIS</p>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    {dbHealth?.message ?? getSupabaseFallbackMessage(false)}
                  </p>
                </div>
                <div className="grid gap-2">
                  {projectReadinessRows.map((source) => (
                    <div key={source.sourceId} className="rounded-md bg-surface px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate font-medium text-ink">{source.source}</span>
                        <span className="shrink-0 text-xs font-semibold text-muted">{source.currentStatus}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{source.caveat}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-5 text-muted">
                  Official validation is required before treating any dashboard output as decision-grade.
                </p>
              </div>
            </Panel>

            <Panel title="Comparison Shortlist" subtitle="Saved comparison sets from the map workspace.">
              {comparisonRows.length > 0 ? (
                <div className="grid gap-3">
                  {comparisonRows.slice(0, 4).map((comparison) => {
                    const comparisonReportId =
                      comparison.reportId
                        ?? (comparison.id === "seeded-comparison-dubai-shortlist"
                          ? "seeded-comparison-dubai-shortlist-report"
                          : comparison.id);

                    return (
                    <article key={comparison.id} className="rounded-md border border-line bg-surface p-4">
                      <h3 className="font-semibold text-ink">{comparison.title}</h3>
                      <p className="mt-1 text-sm text-muted">{formatTimestamp(comparison.createdAt ?? undefined)}</p>
                      <p className="mt-2 text-sm leading-5 text-muted">{comparison.sourceSummary ?? "Saved comparison; official validation required."}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={openWorkspaceHref}
                          onClick={() => writeActiveProjectKey(activeProject.projectKey)}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-brand"
                        >
                          Open comparison
                        </Link>
                        <Link
                          href={`/reports/${encodeURIComponent(comparisonReportId)}/print`}
                          className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-semibold text-white transition hover:bg-[#113f50]"
                        >
                          Export memo
                        </Link>
                      </div>
                    </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No saved comparison sets yet"
                  text="Open the workspace, select 2-3 points or demo objects, then compare selected sites."
                  href={openWorkspaceHref}
                  action="Compare sites"
                />
              )}
            </Panel>

            <Panel title="Recommended Next Actions">
              <ol className="grid gap-2">
                {nextActions.slice(0, 5).map((action, index) => (
                  <li key={`project-next-action-${index}-${action.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`} className="flex gap-3 rounded-md bg-surface p-3 text-sm leading-6 text-muted">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-brand">
                      {index + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
