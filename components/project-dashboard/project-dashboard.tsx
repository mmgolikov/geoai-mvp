"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { HeroControlCard, LinkButton, MetricCard, StatusChip, ValidationCaveat } from "@/components/ui-v22-primitives";
import externalDataManifestStatic from "@/data/external/normalized/external_data_manifest.json";
import dldMarketSnapshotStatic from "@/data/normalized/dld_market_snapshot.json";
import openGeodataSnapshotStatic from "@/data/normalized/open_geodata_snapshot.json";
import { dataSourceRegistry } from "@/src/data/data-source-registry";
import { getDemoNarrativeByProjectKey } from "@/src/data/demo-narratives";
import { seededDemoComparisonSummaries, seededDemoRecentAnalyses, seededDemoReportRecords } from "@/src/data/demo-report-seeds";
import { demoProjects, getDemoProject } from "@/src/data/demo-projects";
import { getClientPilotPackageForProject } from "@/src/data/pilot-packages";
import { getSupabaseFallbackMessage } from "@/src/lib/data-readiness";
import { deriveDecisionPosture } from "@/src/lib/decision-posture";
import { normalizeSourceStatus, sourceStatusToLabel } from "@/src/lib/external-data/source-status";
import { buildSourceReadinessGroups, sourceReadinessSummary } from "@/src/lib/external-data/source-readiness-groups";
import { sourceDataModeLabel } from "@/src/lib/external-data/source-modes";
import { getPilotPackageForProject } from "@/src/lib/pilot/pilot-packages";
import { calculatePilotReadiness } from "@/src/lib/pilot/pilot-readiness";
import {
  createLocalProject,
  mergeProjectsWithLocal,
  projectToInput,
  saveLocalProject,
  type LocalProjectInput
} from "@/src/lib/project-local-store";
import { repositoryModeToLabel, type RepositoryMode } from "@/src/lib/repositories/repository-mode";
import { readBrowserAois, sourceTypeLabel, validationStatusLabel } from "@/src/lib/aoi-library";
import { formatArea } from "@/src/lib/polygon-aoi";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { ExternalDataManifestSource } from "@/src/lib/external-data/data-manifest";
import type { ProjectAoi } from "@/src/types/aoi";
import type {
  ClientDataRoom,
  DataRoomAssetType,
  DataRoomValidationStatus,
  ValidationChecklistStatus
} from "@/src/types/data-room";
import type {
  ClientInputItem,
  ClientInputStatus,
  PilotDeliverableStatus,
  PilotDeliverableWorkflowStatus,
  PilotWorkflowSummary
} from "@/src/types/pilot-workflow";
import type { EvidenceFileAsset } from "@/src/types/storage";
import type { EvidenceReviewSummary } from "@/src/types/evidence-review";
import type { AnalysisHistoryItem, AnalysisScenarioId, ExpressAnalysis } from "@/src/types/geo";

const activeProjectStorageKey = "geoai-active-project-key-v1";
const activeProjectSegmentStorageKey = "geoai-active-project-segment-v1";
const analysisHistoryStorageKey = "geoai-analysis-history-v1";
const openAnalysisRequestStorageKey = "geoai-open-analysis-request-v1";
const requiredDataCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

type ProjectSegment = "b2b" | "b2c";

type DbHealth = {
  configured: boolean;
  status: "connected" | "configured_unavailable" | "configured_incomplete" | "not_configured";
  repositoryMode: RepositoryMode;
  mode: RepositoryMode;
  caveat: string;
  message: string;
  sources_count: number | null;
};

type PlatformActivationStatus = {
  authMode: string;
  repositoryMode: RepositoryMode;
  activationStatus: string;
  accessEnforcementMode?: "soft" | "hard";
  allowDemoPublic?: boolean;
  supabaseConfigured: boolean;
  schemaReady: boolean;
  postgisReady: boolean;
  tablesReady: boolean;
  storageReady: boolean;
  migrationApplied: boolean;
  blockers: string[];
  nextActions: string[];
};

type PilotBackendStatusResponse = {
  status: string;
  repositoryMode: RepositoryMode;
  accessEnforcementMode: "soft" | "hard";
  canRunDemoPilot: boolean;
  canRunDemoWorkflow?: boolean;
  canRunConfidentialPilot: boolean;
  capabilities: Array<{
    id: string;
    label: string;
    status: string;
    evidence: string;
    caveat?: string;
  }>;
  blockers: Array<{
    id: string;
    severity: "p0" | "p1" | "p2";
    title: string;
    description: string;
    nextAction: string;
  }>;
  nextActions: string[];
  caveats: string[];
};

type ValidationGovernanceResponse = {
  evidence?: Array<{
    id: string;
    title: string;
    sourceName: string;
    sourceCategory: string;
    validationStatus: string;
    allowedClaimLevel: string;
    caveat: string;
  }>;
  summary?: {
    totalEvidence: number;
    officialValidatedCount: number;
    clientValidatedCount: number;
    inReviewCount: number;
    requiredValidationGaps: string[];
    highestAllowedClaimLevel: string;
    blockers: string[];
    nextActions: string[];
    caveat: string;
  };
  reviewSummaries?: EvidenceReviewSummary[];
  connectorReadiness?: Array<{
    id: string;
    name: string;
    currentStatus: string;
    accessMode: string;
    nextStep: string;
  }>;
};

type StorageHealthResponse = {
  provider: "supabase_storage" | "local_metadata_only" | "disabled";
  bucketReady: boolean;
  storageReady: boolean;
  missingBuckets: string[];
  maxFileSizeBytes: number;
  privateBucketPolicyReady?: boolean;
  signedUrlVerified?: boolean;
  writeTestAllowed?: boolean;
  lastVerifiedAt?: string | null;
  blockers: string[];
  nextActions: string[];
  caveat: string;
};

type EvidenceFilesResponse = {
  items?: EvidenceFileAsset[];
};

type MarketMetricsSummary = {
  sourceMode: string;
  count: number;
  availableAreaNames: string[];
  fallbackStatus: string;
  message?: string;
};

type ExternalDataStatus = {
  sourceGroups?: Array<{
    id: string;
    name: string;
    status: string;
    dataMode: string;
    recordCount?: number | null;
    confidence: string;
    caveat: string;
    nextValidationStep: string;
    sourceQuality?: {
      validationStatus?: string;
      confidence?: string;
      dataMode?: string;
      nextValidationStep?: string;
    };
  }>;
  summary?: {
    totalGroups: number;
    snapshotGroups: number;
    apiContextGroups: number;
    fallbackGroups: number;
    manualImportGroups: number;
    validationRequired: boolean;
    caveat: string;
  };
  readiness?: Array<{
    sourceId: string;
    sourceName?: string;
    status: string;
    sourceMode?: string;
    dataMode?: string;
    recordCount?: number;
    coverageArea: string;
    confidence: string;
    caveat: string;
    nextValidationStep?: string;
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
      sourceMode?: string;
      caveat?: string;
      disclaimer?: string;
    }>;
  };
};

type ProjectReadinessRow = {
  sourceId: string;
  source: string;
  currentStatus: string;
  dataMode?: string;
  recordCount?: number | null;
  confidence?: string;
  caveat: string;
  nextValidationStep?: string;
  validationStatus?: string;
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

type ReportPackageSummary = {
  id: string;
  packageKey: string;
  projectId?: string | null;
  projectKey: string;
  title: string;
  packageType: string;
  status: string;
  version: string;
  generatedAt: string;
  validationStatus: string;
  printablePath: string;
  jsonPath: string;
  caveat: string;
};

type AoiLibraryResponse = {
  items?: ProjectAoi[];
};

type DataRoomAssetInput = {
  id: string;
  projectId?: string | null;
  projectKey: string;
  name: string;
  description?: string;
  assetType: DataRoomAssetType;
  sourceType: "user_uploaded";
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  validationStatus: DataRoomValidationStatus;
};

const defaultProjectKey = demoProjects[0].projectKey;

function isProjectSegment(value: unknown): value is ProjectSegment {
  return value === "b2b" || value === "b2c";
}

function getProjectSegment(project: GeoAIProject): ProjectSegment {
  const segment = project.metadata?.segment ?? project.metadata?.audience;
  return isProjectSegment(segment) ? segment : "b2b";
}

function getProjectSegmentLabel(segment: ProjectSegment) {
  return segment === "b2b" ? "B2B" : "B2C";
}

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pilotDisplayLabel(value: string) {
  return value
    .replace(/\bDubai Investment Screening Demo\b/g, "Dubai Investment Screening")
    .replace(/\bDeveloper Land Pipeline Demo\b/g, "Developer Land Pipeline")
    .replace(/\bBank Asset Review Demo\b/g, "Bank Asset Review")
    .replace(/\bDemo Enterprise Report Pack\b/g, "Enterprise Report Pack")
    .replace(/\bDemo example\b/g, "Sample example")
    .replace(/\bdemo-normalized\b/gi, "sample/open")
    .replace(/\bdemo\/local\b/gi, "sample/local");
}

function formatTimestamp(value?: string) {
  if (!value) return "Current session";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

function readActiveProjectKey() {
  try {
    const params = new URLSearchParams(window.location.search);
    const requestedProjectKey = params.get("projectKey") ?? params.get("projectId");
    if (requestedProjectKey) {
      const matchedProject = demoProjects.find((project) => project.projectKey === requestedProjectKey || project.id === requestedProjectKey);
      return matchedProject?.projectKey ?? requestedProjectKey;
    }

    const requestedSegment = params.get("segment");
    if (isProjectSegment(requestedSegment)) {
      return demoProjects.find((project) => getProjectSegment(project) === requestedSegment)?.projectKey ?? demoProjects[0].projectKey;
    }

    return window.localStorage.getItem(activeProjectStorageKey) || demoProjects[0].projectKey;
  } catch {
    return demoProjects[0].projectKey;
  }
}

function readActiveProjectSegment(projectKey?: string | null): ProjectSegment {
  try {
    const params = new URLSearchParams(window.location.search);
    const requestedSegment = params.get("segment");
    if (isProjectSegment(requestedSegment)) {
      return requestedSegment;
    }

    const storedSegment = window.localStorage.getItem(activeProjectSegmentStorageKey);
    if (isProjectSegment(storedSegment)) {
      return storedSegment;
    }

    const project = demoProjects.find((item) => item.projectKey === projectKey || item.id === projectKey);
    return project ? getProjectSegment(project) : "b2b";
  } catch {
    return "b2b";
  }
}

function writeActiveProjectKey(projectKey: string) {
  try {
    window.localStorage.setItem(activeProjectStorageKey, projectKey);
  } catch {
    // Dashboard still works in-memory if localStorage is unavailable.
  }
}

function writeActiveProjectSegment(segment: ProjectSegment) {
  try {
    window.localStorage.setItem(activeProjectSegmentStorageKey, segment);
  } catch {
    // Dashboard still works in-memory if localStorage is unavailable.
  }
}

function compactReadinessStatus(status?: string) {
  return sourceStatusToLabel(status ?? "planned");
}

function formatDataRoomLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dataRoomAssetTypeForFile(file: File): DataRoomAssetType {
  const name = file.name.toLowerCase();
  if (name.endsWith(".geojson") || name.endsWith(".json") || file.type.includes("geo+json") || file.type.includes("json")) {
    return "uploaded_geojson";
  }
  if (name.endsWith(".csv") || file.type.includes("csv")) {
    return "uploaded_csv";
  }
  return "uploaded_document";
}

function dataRoomAssetName(assetType: DataRoomAssetType) {
  if (assetType === "uploaded_geojson") return "Client AOI GeoJSON";
  if (assetType === "uploaded_csv") return "Client CSV / market snapshot";
  return "Client document metadata";
}

function formatBytes(value?: number) {
  if (!value && value !== 0) return "n/a";
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function formatRecordCount(value?: number | null) {
  if (typeof value !== "number") return "n/a";
  return new Intl.NumberFormat("en").format(value);
}

function manifestSourceToReadiness(source?: ManifestSource): ReadinessItem | undefined {
  if (!source) return undefined;

  return {
    sourceId: source.id,
    sourceName: source.id,
    status: source.status ?? "planned",
    sourceMode: source.sourceMode,
    dataMode: source.sourceMode,
    recordCount: source.recordCount ?? source.rowCount ?? source.featureCount,
    coverageArea: source.coverageArea ?? "Dubai / UAE screening context",
    confidence: source.confidence ?? (source.status === "snapshot_available" ? "medium" : "low"),
    caveat: source.caveat ?? source.disclaimer ?? requiredDataCaveat
  };
}

function createInitialMarketMetrics(): MarketMetricsSummary {
  const areas = Array.isArray((dldMarketSnapshotStatic as { areas?: unknown[] }).areas)
    ? (dldMarketSnapshotStatic as { areas: Array<{ areaName?: string }> }).areas
    : [];

  if (areas.length > 0) {
    return {
      sourceMode: "sample_fallback",
      count: areas.length,
      availableAreaNames: areas.map((area) => area.areaName ?? "Unknown area"),
      fallbackStatus: "Snapshot sample records available - manual/offline import; not live official data.",
      message: "Bundled snapshot sample records are available for screening context."
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
  const sourceGroups = buildSourceReadinessGroups({
    generatedAt: null,
    version: "1.2",
    summary: "Static source readiness fallback.",
    sources: (manifestWithCounts.sources ?? []) as ExternalDataManifestSource[]
  });

  return {
    manifest: manifestWithCounts,
    sourceGroups,
    summary: sourceReadinessSummary(sourceGroups),
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
  // original investment-screening seed project, not every project dashboard.
  return projectKey === defaultProjectKey;
}

function seededReportIdForAnalysis(analysisId: string) {
  const record = seededDemoReportRecords.find((item) => {
    const payload = item.reportPayload as { analysisRunId?: string };
    return payload.analysisRunId === analysisId;
  });

  return record?.id;
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
    dataConfidence: item.dataConfidenceLevel ?? "Sample/open",
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
      dataConfidence: item.data_confidence_level ?? analysis?.marketContext?.confidenceLevel ?? "Sample/open",
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
    <StatusChip tone="blue">{children}</StatusChip>
  );
}

function KpiCard({ label, value, note, valueKind = "numeric" }: { label: string; value: string | number; note: string; valueKind?: "numeric" | "text" }) {
  return <MetricCard label={label} value={value} note={note} valueKind={valueKind} />;
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
  const { authStatus, roleLabel, isAuthenticated } = useAuth();
  const dataRoomFileInputRef = useRef<HTMLInputElement | null>(null);
  const [projects, setProjects] = useState<GeoAIProject[]>(demoProjects);
  const [projectsMode, setProjectsMode] = useState<"supabase" | "demo_seed">("demo_seed");
  const [activeProjectKey, setActiveProjectKey] = useState(demoProjects[0].projectKey);
  const [activeProjectSegment, setActiveProjectSegment] = useState<ProjectSegment>("b2b");
  const [localHistory, setLocalHistory] = useState<AnalysisHistoryItem[]>([]);
  const [dbHistory, setDbHistory] = useState<RecentAnalysisRow[]>([]);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [platformStatus, setPlatformStatus] = useState<PlatformActivationStatus | null>(null);
  const [marketMetrics, setMarketMetrics] = useState<MarketMetricsSummary | null>(() => createInitialMarketMetrics());
  const [externalDataStatus, setExternalDataStatus] = useState<ExternalDataStatus | null>(() => createInitialExternalDataStatus());
  const [savedReports, setSavedReports] = useState<SavedObjectSummary[]>([]);
  const [savedComparisons, setSavedComparisons] = useState<SavedObjectSummary[]>([]);
  const [projectDatasets, setProjectDatasets] = useState<SavedObjectSummary[]>([]);
  const [reportPackages, setReportPackages] = useState<ReportPackageSummary[]>([]);
  const [reportPackageMessage, setReportPackageMessage] = useState<string | null>(null);
  const [projectAois, setProjectAois] = useState<ProjectAoi[]>([]);
  const [dataRoom, setDataRoom] = useState<ClientDataRoom | null>(null);
  const [dataRoomMessage, setDataRoomMessage] = useState<string | null>(null);
  const [pilotWorkflow, setPilotWorkflow] = useState<PilotWorkflowSummary | null>(null);
  const [pilotWorkflowMessage, setPilotWorkflowMessage] = useState<string | null>(null);
  const [validationGovernance, setValidationGovernance] = useState<ValidationGovernanceResponse | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [storageHealth, setStorageHealth] = useState<StorageHealthResponse | null>(null);
  const [pilotBackendStatus, setPilotBackendStatus] = useState<PilotBackendStatusResponse | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFileAsset[]>([]);
  const [isProjectCreateOpen, setIsProjectCreateOpen] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [projectAudienceDraft, setProjectAudienceDraft] = useState<LocalProjectInput["audience"]>("b2b");
  const [projectRoleDraft, setProjectRoleDraft] = useState<LocalProjectInput["role"]>("developer");
  const [projectMarketDraft, setProjectMarketDraft] = useState("Dubai / UAE");

  useEffect(() => {
    const nextActiveProjectKey = readActiveProjectKey();
    setProjects(mergeProjectsWithLocal(demoProjects));
    setActiveProjectKey(nextActiveProjectKey);
    setActiveProjectSegment(readActiveProjectSegment(nextActiveProjectKey));
    setLocalHistory(readLocalHistory());
    setProjectAois(readBrowserAois());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProjectData() {
      const results = await Promise.allSettled([
        fetch("/api/projects").then((response) => response.json()),
        fetch("/api/db/health").then((response) => response.json()),
        fetch("/api/market-metrics").then((response) => response.json()),
        fetch("/api/external-data/status").then((response) => response.json()),
        fetch("/api/platform/activation-status").then((response) => response.json()),
        fetch("/api/pilot-backend/status").then((response) => response.json())
      ]);

      if (cancelled) return;

      const projectsResult = results[0];
      if (projectsResult.status === "fulfilled" && Array.isArray(projectsResult.value.items) && projectsResult.value.items.length > 0) {
        setProjects(mergeProjectsWithLocal(projectsResult.value.items));
        setProjectsMode(projectsResult.value.mode === "supabase" ? "supabase" : "demo_seed");
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

      const platformResult = results[4];
      if (platformResult.status === "fulfilled") {
        setPlatformStatus(platformResult.value as PlatformActivationStatus);
      }

      const pilotBackendResult = results[5];
      if (pilotBackendResult.status === "fulfilled") {
        setPilotBackendStatus(pilotBackendResult.value as PilotBackendStatusResponse);
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
        const [analysisResponse, reportsResponse, comparisonsResponse, datasetsResponse, reportPackagesResponse] = await Promise.all([
          fetch(`/api/analysis-runs?limit=8&projectKey=${encodeURIComponent(activeProjectKey)}`),
          fetch(`/api/reports?projectKey=${encodeURIComponent(activeProjectKey)}`),
          fetch(`/api/comparison-sets?projectKey=${encodeURIComponent(activeProjectKey)}`),
          fetch(`/api/uploaded-datasets?projectKey=${encodeURIComponent(activeProjectKey)}`),
          fetch(`/api/report-packages?projectKey=${encodeURIComponent(activeProjectKey)}`)
        ]);
        const [analysisPayload, reportsPayload, comparisonsPayload, datasetsPayload, reportPackagesPayload] = await Promise.all([
          analysisResponse.json(),
          reportsResponse.json(),
          comparisonsResponse.json(),
          datasetsResponse.json(),
          reportPackagesResponse.json()
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
          setReportPackages(Array.isArray(reportPackagesPayload.summaries) ? reportPackagesPayload.summaries : []);
        }
      } catch {
        if (!cancelled) {
          setDbHistory([]);
          setSavedReports([]);
          setSavedComparisons([]);
          setProjectDatasets([]);
          setReportPackages([]);
        }
      }
    }

    void loadDbHistory();

    return () => {
      cancelled = true;
    };
  }, [activeProjectKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadStorageAndEvidenceFiles() {
      try {
        const [storageResponse, filesResponse] = await Promise.all([
          fetch("/api/storage/health"),
          fetch(`/api/storage/evidence-files?projectKey=${encodeURIComponent(activeProjectKey)}`)
        ]);
        const storagePayload = storageResponse.ok ? await storageResponse.json() as StorageHealthResponse : null;
        const filesPayload = filesResponse.ok ? await filesResponse.json() as EvidenceFilesResponse : null;
        if (!cancelled) {
          setStorageHealth(storagePayload);
          setEvidenceFiles(Array.isArray(filesPayload?.items) ? filesPayload.items : []);
        }
      } catch {
        if (!cancelled) {
          setStorageHealth(null);
          setEvidenceFiles([]);
        }
      }
    }

    void loadStorageAndEvidenceFiles();

    return () => {
      cancelled = true;
    };
  }, [activeProjectKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadValidationGovernance() {
      try {
        const response = await fetch(`/api/validation?projectKey=${encodeURIComponent(activeProjectKey)}`);
        const payload = response.ok ? await response.json() as ValidationGovernanceResponse : null;
        if (!cancelled) setValidationGovernance(payload);
      } catch {
        if (!cancelled) setValidationGovernance(null);
      }
    }

    void loadValidationGovernance();

    return () => {
      cancelled = true;
    };
  }, [activeProjectKey]);

  useEffect(() => {
    setProjectAois(readBrowserAois());
    let cancelled = false;

    fetch(`/api/aois?projectKey=${encodeURIComponent(activeProjectKey)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: AoiLibraryResponse | null) => {
        if (cancelled || !Array.isArray(payload?.items)) return;

        setProjectAois((current) => {
          const byId = new Map<string, ProjectAoi>();
          for (const item of current) byId.set(item.id, item);
          for (const item of payload.items ?? []) byId.set(item.id, item);
          return Array.from(byId.values());
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [activeProjectKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadDataRoom() {
      try {
        const response = await fetch(`/api/data-room?projectKey=${encodeURIComponent(activeProjectKey)}`);
        const payload = response.ok ? await response.json() as ClientDataRoom : null;
        if (!cancelled) {
          setDataRoom(payload);
        }
      } catch {
        if (!cancelled) {
          setDataRoom(null);
        }
      }
    }

    void loadDataRoom();

    return () => {
      cancelled = true;
    };
  }, [activeProjectKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadPilotWorkflow() {
      try {
        const response = await fetch(`/api/pilot-workflow?projectKey=${encodeURIComponent(activeProjectKey)}`);
        const payload = response.ok ? await response.json() as PilotWorkflowSummary : null;
        if (!cancelled) {
          setPilotWorkflow(payload);
        }
      } catch {
        if (!cancelled) {
          setPilotWorkflow(null);
        }
      }
    }

    void loadPilotWorkflow();

    return () => {
      cancelled = true;
    };
  }, [activeProjectKey]);

  const activeProject = useMemo(
    () => projects.find((project) => project.projectKey === activeProjectKey) ?? getDemoProject(activeProjectKey),
    [activeProjectKey, projects]
  );
  const visibleProjects = useMemo(
    () => projects.filter((project) => getProjectSegment(project) === activeProjectSegment),
    [activeProjectSegment, projects]
  );
  const projectOptions = useMemo(() => {
    if (visibleProjects.some((project) => project.projectKey === activeProject.projectKey)) {
      return visibleProjects;
    }

    return [
      activeProject,
      ...visibleProjects.filter((project) => project.projectKey !== activeProject.projectKey)
    ];
  }, [activeProject, visibleProjects]);
  const localRows = useMemo(() => localHistoryToRows(localHistory, activeProject.projectKey), [activeProject.projectKey, localHistory]);
  const scopedDbHistory = dbHistory.filter((item) => belongsToProject(item, activeProject.projectKey));
  const scopedSavedReports = savedReports.filter((item) => belongsToProject(item, activeProject.projectKey));
  const scopedSavedComparisons = savedComparisons.filter((item) => belongsToProject(item, activeProject.projectKey));
  const scopedProjectDatasets = projectDatasets.filter((item) => belongsToProject(item, activeProject.projectKey));
  const scopedReportPackages = reportPackages.filter((item) => belongsToProject(item, activeProject.projectKey));
  const scopedProjectAois = projectAois
    .filter((item) => item.projectKey === activeProject.projectKey || item.projectId === activeProject.id)
    .sort((a, b) => Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt));
  const aoiSourceCounts = scopedProjectAois.reduce<Record<string, number>>((counts, aoi) => {
    const label = sourceTypeLabel(aoi.sourceType);
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});
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
      reportId: seededReportIdForAnalysis(item.analysis.id),
      analysis: item.analysis,
      projectId: item.analysis.project?.id ?? null,
      projectKey: item.analysis.project?.projectKey,
      scenarioId: item.analysis.scenarioId,
      customQuery: item.analysis.customQuery,
      canOpenAnalysis: true
    }));
  const seededReportRows: SavedObjectSummary[] = seededDemoReportRecords
    .filter((item) => item.projectKey === activeProject.projectKey)
    .map((item) => ({
      id: item.id,
      title: item.title,
      createdAt: item.createdAt,
      sourceSummary: item.sourceSummary,
      reportType: item.reportType,
      scenario: item.scenario,
      targetLabel: item.targetLabel,
      projectId: item.projectId,
      projectKey: item.projectKey
    }));
  const seededComparisonRows: SavedObjectSummary[] = seededDemoComparisonSummaries
    .filter((item) => item.projectKey === activeProject.projectKey)
    .map((item) => ({
      id: item.id,
      reportId: item.reportId,
      title: item.title,
      createdAt: item.createdAt,
      sourceSummary: item.sourceSummary,
      projectId: item.projectId,
      projectKey: item.projectKey
    }));
  const recentRows = scopedDbHistory.length > 0 ? scopedDbHistory : localRows.length > 0 ? localRows : seededRows;
  const reportRows = scopedSavedReports.length > 0 ? scopedSavedReports : seededReportRows;
  const comparisonRows = scopedSavedComparisons.length > 0 ? scopedSavedComparisons : seededComparisonRows;
  const packageRows = scopedReportPackages;
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
  const overtureReadiness = getReadiness("overture-maps-open-buildings");
  const climateReadiness = getReadiness("open-meteo-climate");
  const solarReadiness = getReadiness("nasa-power-solar-energy");
  const airReadiness = getReadiness("openaq-air-quality");
  const worldpopReadiness = getReadiness("worldpop-demographics");
  const copernicusReadiness = getReadiness("copernicus-sentinel-metadata") ?? getReadiness("copernicus-sentinel-catalog");
  const geodubaiReadiness = getReadiness("geodubai-municipality-validation");
  const marketSnapshotAvailable = marketMetrics?.sourceMode === "real_snapshot" && importedAreas > 0;
  const marketSnapshotContextAvailable = importedAreas > 0 && ["real_snapshot", "imported_snapshot", "sample_fallback"].includes(marketMetrics?.sourceMode ?? "");
  const dldSnapshotAvailable = (
    dldReadiness?.status === "snapshot_available"
    && Boolean(dldReadiness.recordCount && dldReadiness.recordCount > 0)
  ) || marketSnapshotAvailable || marketSnapshotContextAvailable;
  const dldRecordCount = dldReadiness?.recordCount ?? importedAreas;
  const projectReadinessRows: ProjectReadinessRow[] = [
    {
      sourceId: "dld-dubai-pulse-transactions",
      source: "DLD / Dubai Pulse snapshot",
      currentStatus: dldSnapshotAvailable ? "snapshot" : compactReadinessStatus(dldReadiness?.status),
      dataMode: dldReadiness?.dataMode ?? dldReadiness?.sourceMode,
      recordCount: dldRecordCount,
      confidence: dldReadiness?.confidence ?? "requires-validation",
      caveat: dldReadiness?.caveat ?? requiredDataCaveat,
      nextValidationStep: dldReadiness?.nextValidationStep ?? "Confirm permitted DLD / Dubai Pulse files, extraction date, license terms and official/client validation source."
    },
    {
      sourceId: "osm-geofabrik-baseline",
      source: "OSM / Geofabrik open snapshot",
      currentStatus: compactReadinessStatus(osmReadiness?.status),
      dataMode: osmReadiness?.dataMode ?? osmReadiness?.sourceMode,
      recordCount: osmReadiness?.recordCount,
      confidence: osmReadiness?.confidence ?? "low",
      caveat: osmReadiness?.caveat ?? requiredDataCaveat,
      nextValidationStep: osmReadiness?.nextValidationStep ?? "Confirm extract date, ODbL attribution and compare against official/customer GIS before decisions."
    },
    {
      sourceId: "overture-maps-open-buildings",
      source: "Overture Maps open snapshot",
      currentStatus: compactReadinessStatus(overtureReadiness?.status),
      dataMode: overtureReadiness?.dataMode ?? overtureReadiness?.sourceMode,
      recordCount: overtureReadiness?.recordCount,
      confidence: overtureReadiness?.confidence ?? "low",
      caveat: overtureReadiness?.caveat ?? requiredDataCaveat,
      nextValidationStep: overtureReadiness?.nextValidationStep ?? "Confirm Overture extract scope/license and reconcile open data against client/official evidence."
    },
    {
      sourceId: "open-meteo-climate",
      source: "Open-Meteo climate context",
      currentStatus: compactReadinessStatus(climateReadiness?.status),
      dataMode: climateReadiness?.dataMode ?? climateReadiness?.sourceMode,
      recordCount: climateReadiness?.recordCount,
      confidence: climateReadiness?.confidence ?? "medium",
      caveat: climateReadiness?.caveat ?? requiredDataCaveat,
      nextValidationStep: climateReadiness?.nextValidationStep ?? "Validate climate assumptions with engineering/client-approved evidence before operational decisions."
    },
    {
      sourceId: "nasa-power-solar-energy",
      source: "NASA POWER solar / energy",
      currentStatus: compactReadinessStatus(solarReadiness?.status),
      dataMode: solarReadiness?.dataMode ?? solarReadiness?.sourceMode,
      recordCount: solarReadiness?.recordCount,
      confidence: solarReadiness?.confidence ?? "medium",
      caveat: solarReadiness?.caveat ?? requiredDataCaveat,
      nextValidationStep: solarReadiness?.nextValidationStep ?? "Validate energy assumptions with engineering/client-approved evidence before operational decisions."
    },
    {
      sourceId: "openaq-air-quality",
      source: "OpenAQ air quality",
      currentStatus: compactReadinessStatus(airReadiness?.status),
      dataMode: airReadiness?.dataMode ?? airReadiness?.sourceMode,
      recordCount: airReadiness?.recordCount,
      confidence: airReadiness?.confidence ?? "low",
      caveat: airReadiness?.caveat ?? requiredDataCaveat,
      nextValidationStep: airReadiness?.nextValidationStep ?? "Validate air-quality context against client-approved or regulatory evidence before decisions."
    },
    {
      sourceId: "worldpop-demographics",
      source: "WorldPop demographics",
      currentStatus: compactReadinessStatus(worldpopReadiness?.status),
      dataMode: worldpopReadiness?.dataMode ?? worldpopReadiness?.sourceMode,
      recordCount: worldpopReadiness?.recordCount,
      confidence: worldpopReadiness?.confidence ?? "low",
      caveat: worldpopReadiness?.caveat ?? requiredDataCaveat,
      nextValidationStep: worldpopReadiness?.nextValidationStep ?? "Validate catchment assumptions against official/client demographic evidence."
    },
    {
      sourceId: "copernicus-sentinel-catalog",
      source: "Copernicus / Sentinel",
      currentStatus: compactReadinessStatus(copernicusReadiness?.status),
      dataMode: copernicusReadiness?.dataMode ?? copernicusReadiness?.sourceMode,
      recordCount: copernicusReadiness?.recordCount,
      confidence: copernicusReadiness?.confidence ?? "requires-validation",
      caveat: copernicusReadiness?.caveat ?? requiredDataCaveat,
      nextValidationStep: copernicusReadiness?.nextValidationStep ?? "Add approved token/query pipeline and verify metadata/imagery lineage before analytics."
    },
    {
      sourceId: "geodubai-municipality-validation",
      source: "GeoDubai / Dubai Municipality",
      currentStatus: compactReadinessStatus(geodubaiReadiness?.status),
      dataMode: geodubaiReadiness?.dataMode ?? geodubaiReadiness?.sourceMode,
      recordCount: geodubaiReadiness?.recordCount,
      confidence: geodubaiReadiness?.confidence ?? "requires-validation",
      caveat: geodubaiReadiness?.caveat ?? requiredDataCaveat,
      nextValidationStep: geodubaiReadiness?.nextValidationStep ?? "Secure authorized official/customer validation access before relying on planning or GIS constraints."
    }
  ];
  const sourceLineageRows: ProjectReadinessRow[] = externalDataStatus?.sourceGroups?.length
    ? externalDataStatus.sourceGroups.map((group) => ({
        sourceId: group.id,
        source: group.name,
        currentStatus: compactReadinessStatus(group.status),
        dataMode: group.dataMode,
        recordCount: group.recordCount,
        confidence: group.confidence,
        validationStatus: group.sourceQuality?.validationStatus,
        caveat: group.caveat || requiredDataCaveat,
        nextValidationStep: group.nextValidationStep
      }))
    : projectReadinessRows;
  const demoMarketAreas = Math.max(marketMetrics?.availableAreaNames?.length ?? 0, 6);
  const dataConfidence = dldSnapshotAvailable ? "Snapshot + fallback" : "Sample fallback";
  const dataConfidenceNote = dldSnapshotAvailable
    ? "DLD/Dubai Pulse and OSM snapshots are available for screening context; official validation required."
    : "Sample/open fallbacks are active; official validation required before decisions.";
  const persistenceMode = repositoryModeToLabel(dbHealth?.repositoryMode ?? projectsMode);
  const accessStatusLabel =
    authStatus.effectiveMode === "supabase_auth"
      ? isAuthenticated
        ? `Authenticated / ${roleLabel}`
        : "Public preview / sign-in available"
      : `${authStatus.label} / ${roleLabel}`;
  const nextActions = getNextActions(activeProject, dldRecordCount);
  const pilotPackage = getPilotPackageForProject(activeProject.projectKey, activeProject.clientType);
  const clientPilotPackage = getClientPilotPackageForProject(activeProject.projectKey, activeProject.clientType);
  const activeNarrative = getDemoNarrativeByProjectKey(activeProject.projectKey);
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
  const workflowInputProvided = pilotWorkflow?.clientInputs.filter((item) =>
    ["provided_unvalidated", "in_review", "accepted_for_screening", "not_applicable"].includes(item.status)
  ).length ?? 0;
  const workflowInputTotal = pilotWorkflow?.clientInputs.filter((item) => item.required).length ?? 0;
  const workflowDeliverablesReady = pilotWorkflow?.deliverables.filter((item) =>
    ["generated", "ready_for_review", "validation_required"].includes(item.status)
  ).length ?? 0;
  const workflowDeliverablesTotal = pilotWorkflow?.deliverables.length ?? 0;
  const workflowValidationCompleted = dataRoom?.summary.checklistStatus.completed ?? 0;
  const workflowValidationTotal = dataRoom?.summary.checklistStatus.total ?? 0;
  const pilotCapability = (id: string) => pilotBackendStatus?.capabilities.find((item) => item.id === id);
  const platformRows = [
    {
      label: "Sample pilot",
      value: pilotBackendStatus?.canRunDemoPilot ? "Ready" : "Blocked",
      note: pilotBackendStatus?.canRunDemoPilot ? "Sample/open path remains available" : "Public sample access is disabled"
    },
    {
      label: "Confidential",
      value: pilotBackendStatus?.canRunConfidentialPilot ? "Ready" : "Blocked",
      note: pilotBackendStatus?.canRunConfidentialPilot ? "Backend gates verified" : pilotBackendStatus?.blockers?.[0]?.title ?? "Backend gates not verified"
    },
    {
      label: "Auth",
      value: platformStatus?.authMode === "supabase_auth" ? "Supabase Auth" : "Pilot access",
      note: pilotCapability("auth_sessions")?.evidence ?? (platformStatus?.authMode === "supabase_auth"
        ? "Membership-backed access foundation"
        : "Public demo access; not production authentication")
    },
    {
      label: "DB",
      value: repositoryModeToLabel(platformStatus?.repositoryMode ?? dbHealth?.repositoryMode ?? projectsMode),
      note: dbHealth?.caveat ?? getSupabaseFallbackMessage(false)
    },
    {
      label: "Schema",
      value: platformStatus?.schemaReady ? "Ready" : "Incomplete",
      note: platformStatus?.migrationApplied ? "v2.3 migration verified" : "Migration not applied or not reachable"
    },
    {
      label: "Storage",
      value: pilotCapability("signed_upload_download")?.status === "verified_active"
        ? "Signed URL verified"
        : platformStatus?.storageReady ? "Buckets ready" : "Metadata only",
      note: pilotCapability("storage_buckets")?.evidence ?? (platformStatus?.storageReady ? "Buckets reachable; policies still require verification" : "Bucket readiness path is explicit")
    },
    {
      label: "Audit",
      value: pilotCapability("audit_events")?.status === "verified_active" ? "Durable verified" : "Foundation",
      note: pilotCapability("audit_events")?.evidence ?? "Audit events never block workflows; not a certified audit trail"
    },
    {
      label: "Access",
      value: pilotBackendStatus?.accessEnforcementMode === "hard" ? "Hard" : "Soft",
      note: pilotCapability("hard_access_enforcement")?.evidence ?? "Project access metadata is returned; hard enforcement remains opt-in"
    },
    {
      label: "RLS",
      value: pilotCapability("rls_policies")?.status === "configured_ready" ? "Ready to test" : "Draft",
      note: pilotCapability("rls_policies")?.evidence ?? "RLS policy draft requires live verification"
    }
  ];
  const validationSummary = validationGovernance?.summary;
  const reviewSummaries = validationGovernance?.reviewSummaries ?? [];
  const reviewStatusCounts = {
    uploaded: reviewSummaries.filter((item) => item.latestStatus === "uploaded_unreviewed").length,
    inReview: reviewSummaries.filter((item) => item.latestStatus === "in_review").length,
    client: reviewSummaries.filter((item) => item.latestStatus === "client_validated").length,
    official: reviewSummaries.filter((item) => item.latestStatus === "official_validated").length,
    blocked: reviewSummaries.filter((item) => ["needs_more_evidence", "rejected", "expired"].includes(item.latestStatus)).length
  };
  const validationConnectors = validationGovernance?.connectorReadiness ?? [];
  const validationConnectorRows = [
    validationConnectors.find((item) => item.id === "dld-public-real-estate-data"),
    validationConnectors.find((item) => item.id === "dld-api-gateway"),
    validationConnectors.find((item) => item.id === "geodubai-municipality"),
    validationConnectors.find((item) => item.id === "client-uploaded-official-document")
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  async function addValidationEvidencePlaceholder() {
    setValidationMessage(null);
    const response = await fetch("/api/validation/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: activeProject.id,
        projectKey: activeProject.projectKey,
        title: `Client evidence metadata requested - ${new Date().toISOString().slice(0, 10)}`,
        sourceCategory: "client_uploaded_document",
        sourceName: "Client provided document placeholder",
        accessMode: "client_provided",
        validationStatus: "evidence_requested",
        confidence: "unknown",
        description: "Metadata placeholder for client or official evidence. No secure file storage is connected yet."
      })
    });

    if (!response.ok) {
      setValidationMessage("Validation evidence metadata could not be registered.");
      return;
    }

    const reload = await fetch(`/api/validation?projectKey=${encodeURIComponent(activeProject.projectKey)}`);
    setValidationGovernance(await reload.json() as ValidationGovernanceResponse);
    setValidationMessage("Validation evidence metadata registered. Review status remains screening-only until evidence is checked.");
  }

  async function createReviewDecision(decision: string) {
    const target = validationGovernance?.evidence?.[0];
    if (!target) {
      setValidationMessage("Create validation evidence before adding a review decision.");
      return;
    }

    const linkedFile = evidenceFiles.find((file) => file.linkedValidationEvidenceIds?.includes(target.id));
    const response = await fetch(`/api/validation/evidence/${encodeURIComponent(target.id)}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: activeProject.id,
        projectKey: activeProject.projectKey,
        decision,
        evidenceFileId: linkedFile?.id,
        reviewerName: "GeoAI sample reviewer",
        reviewerRole: "screening reviewer",
        notes: decision === "reject"
          ? "Evidence is insufficient for screening use; replacement evidence is required."
          : "Reviewed for screening workflow only. Official validation remains required where applicable."
      })
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
    if (!response.ok || payload.ok === false) {
      setValidationMessage(payload.message ?? "Review decision could not be recorded.");
      return;
    }

    const reload = await fetch(`/api/validation?projectKey=${encodeURIComponent(activeProject.projectKey)}`);
    setValidationGovernance(await reload.json() as ValidationGovernanceResponse);
    setValidationMessage("Review decision recorded. Claim posture remains caveated.");
  }
  const openWorkspaceHref = `/workspace?projectId=${encodeURIComponent(activeProject.id ?? activeProject.projectKey)}`;
  const openWorkspaceForAoi = (aoi: ProjectAoi) =>
    `/workspace?projectKey=${encodeURIComponent(activeProject.projectKey)}&projectId=${encodeURIComponent(activeProject.id ?? activeProject.projectKey)}&openAoi=${encodeURIComponent(aoi.id)}`;

  async function refreshDataRoom(projectKey = activeProject.projectKey) {
    try {
      const response = await fetch(`/api/data-room?projectKey=${encodeURIComponent(projectKey)}`);
      if (!response.ok) return;
      setDataRoom(await response.json() as ClientDataRoom);
    } catch {
      setDataRoomMessage("Data room summary is temporarily unavailable.");
    }
  }

  async function refreshEvidenceFiles(projectKey = activeProject.projectKey) {
    try {
      const response = await fetch(`/api/storage/evidence-files?projectKey=${encodeURIComponent(projectKey)}`);
      if (!response.ok) return;
      const payload = await response.json() as EvidenceFilesResponse;
      setEvidenceFiles(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setDataRoomMessage("Evidence file summary is temporarily unavailable.");
    }
  }

  async function refreshPilotWorkflow(projectKey = activeProject.projectKey) {
    try {
      const response = await fetch(`/api/pilot-workflow?projectKey=${encodeURIComponent(projectKey)}`);
      if (!response.ok) return;
      setPilotWorkflow(await response.json() as PilotWorkflowSummary);
    } catch {
      setPilotWorkflowMessage("Pilot workflow summary is temporarily unavailable.");
    }
  }

  async function refreshReportPackages(projectKey = activeProject.projectKey) {
    try {
      const response = await fetch(`/api/report-packages?projectKey=${encodeURIComponent(projectKey)}`);
      const payload = response.ok ? await response.json() as { summaries?: ReportPackageSummary[] } : null;
      setReportPackages(Array.isArray(payload?.summaries) ? payload.summaries : []);
    } catch {
      setReportPackageMessage("Report packages are temporarily unavailable.");
    }
  }

  async function createProjectReportPackage() {
    setReportPackageMessage("Creating report package...");
    const response = await fetch("/api/report-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: activeProject.id,
        projectKey: activeProject.projectKey,
        packageType: activeProject.clientType === "developer"
          ? "development_feasibility"
          : activeProject.clientType === "bank"
            ? "bank_asset_review"
            : "investment_screening",
        reportId: reportRows[0]?.id,
        includeDataRoom: true,
        includeValidation: true,
        includeEvidenceReview: true,
        includePilotWorkflow: true
      })
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean; summary?: ReportPackageSummary; message?: string };

    if (!response.ok || payload.ok === false) {
      setReportPackageMessage(payload.message ?? "Report package could not be created.");
      return;
    }

    setReportPackageMessage("Report package created. It remains a browser-print decision-support deliverable.");
    await refreshReportPackages();
    await refreshDataRoom();
    await refreshPilotWorkflow();
  }

  async function registerDataRoomFile(file: File) {
    const maxFileSize = storageHealth?.maxFileSizeBytes ?? 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
      setDataRoomMessage("Keep evidence uploads under the 5 MB MVP limit.");
      return;
    }

    const formData = new FormData();
    formData.append("projectId", activeProject.id ?? "");
    formData.append("projectKey", activeProject.projectKey);
    formData.append("notes", "Uploaded from Project Dashboard evidence file entry point.");
    formData.append("file", file);

    const response = await fetch("/api/storage/evidence-files", {
      method: "POST",
      body: formData
    });
    const result = await response.json() as { ok?: boolean; message?: string };
    setDataRoomMessage(result.ok === false
      ? result.message ?? "Unable to register metadata item."
      : storageHealth?.storageReady
        ? "Evidence file uploaded. Review is still required before claim escalation."
        : "Evidence file metadata added. Binary storage is not configured, so this remains metadata-only.");
    await refreshEvidenceFiles();
    await refreshDataRoom();
    await refreshPilotWorkflow();
  }

  async function updateChecklistStatus(item: NonNullable<ClientDataRoom["checklist"]>[number], status: ValidationChecklistStatus) {
    const response = await fetch(`/api/data-room/checklist/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, status })
    });

    if (!response.ok) {
      setDataRoomMessage("Checklist update could not be saved in local fallback.");
      return;
    }

    setDataRoomMessage("Validation checklist updated locally. Official validation still required.");
    await refreshDataRoom();
    await refreshPilotWorkflow();
  }

  async function updatePilotInputStatus(item: ClientInputItem, status: ClientInputStatus) {
    const response = await fetch(`/api/pilot-workflow/client-inputs/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, status })
    });

    if (!response.ok) {
      setPilotWorkflowMessage("Client input status could not be saved in local fallback.");
      return;
    }

    setPilotWorkflowMessage("Client input status updated locally. Screening use still requires validation.");
    await refreshPilotWorkflow();
  }

  async function updatePilotDeliverableStatus(item: PilotDeliverableStatus, status: PilotDeliverableWorkflowStatus) {
    const response = await fetch(`/api/pilot-workflow/deliverables/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, status })
    });

    if (!response.ok) {
      setPilotWorkflowMessage("Deliverable status could not be saved in local fallback.");
      return;
    }

    setPilotWorkflowMessage("Deliverable status updated locally. Review readiness remains caveated.");
    await refreshPilotWorkflow();
  }

  async function handleDataRoomFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    try {
      if (file) {
        await registerDataRoomFile(file);
      }
    } finally {
      input.value = "";
    }
  }

  function activateProject(project: GeoAIProject) {
    const nextSegment = getProjectSegment(project);
    setActiveProjectKey(project.projectKey);
    writeActiveProjectKey(project.projectKey);
    setActiveProjectSegment(nextSegment);
    writeActiveProjectSegment(nextSegment);
    setDataRoomMessage(null);
    setPilotWorkflowMessage(null);
  }

  function changeProject(projectKey: string) {
    const nextProject = projects.find((project) => project.projectKey === projectKey) ?? getDemoProject(projectKey);
    activateProject(nextProject);
  }

  function changeProjectSegment(segment: ProjectSegment) {
    setActiveProjectSegment(segment);
    writeActiveProjectSegment(segment);

    const nextProject = projects.find((project) => getProjectSegment(project) === segment)
      ?? demoProjects.find((project) => getProjectSegment(project) === segment)
      ?? demoProjects[0];
    activateProject(nextProject);
  }

  async function createProjectFromHub() {
    const name = projectNameDraft.trim();
    if (!name) return;

    const localProject = createLocalProject({
      name,
      audience: projectAudienceDraft,
      role: projectRoleDraft,
      geography: projectMarketDraft.trim() || "Dubai / UAE"
    });

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectToInput(localProject))
      });
      const payload = response.ok ? await response.json() as { project?: GeoAIProject | null; mode?: "supabase" | "demo_seed" } : null;
      const createdProject = payload?.project ?? localProject;

      saveLocalProject(createdProject);
      setProjects((current) => mergeProjectsWithLocal([createdProject, ...current]));
      setProjectsMode(payload?.mode ?? "demo_seed");
      activateProject(createdProject);
      setProjectNameDraft("");
      setProjectMarketDraft("Dubai / UAE");
      setIsProjectCreateOpen(false);
    } catch {
      saveLocalProject(localProject);
      setProjects((current) => mergeProjectsWithLocal([localProject, ...current]));
      setProjectsMode("demo_seed");
      activateProject(localProject);
      setProjectNameDraft("");
      setProjectMarketDraft("Dubai / UAE");
      setIsProjectCreateOpen(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-surface px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Projects</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-ink">Project Hub</h1>
                <ProjectBadge>{activeProject.clientType.replace(/_/g, " ")}</ProjectBadge>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Choose a project, review recent work, and jump back into the workspace.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  {activeProject.geography}
                </span>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  Segment: {getProjectSegmentLabel(getProjectSegment(activeProject))}
                </span>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  Scenario: {formatLabel(activeProject.primaryScenario)}
                </span>
              </div>
            </div>

            <div className="min-w-0">
              {/* ProjectHub / control-card: segment switcher, active project and actions remain nested in the hero card. */}
              <HeroControlCard
                segment={{
                  active: activeProjectSegment,
                  onChange: (segment) => changeProjectSegment(segment as ProjectSegment)
                }}
                label={`Active ${getProjectSegmentLabel(activeProjectSegment)} project`}
                value={pilotDisplayLabel(activeProject.name)}
              >
                <LinkButton href={openWorkspaceHref} onClick={() => writeActiveProjectKey(activeProject.projectKey)}>
                  Open workspace
                </LinkButton>
                <LinkButton href={openWorkspaceHref} variant="secondary" onClick={() => writeActiveProjectKey(activeProject.projectKey)}>
                  Run new analysis
                </LinkButton>
                <button
                  type="button"
                  onClick={() => setIsProjectCreateOpen((value) => !value)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand sm:col-span-2"
                >
                  Create project
                </button>
              </HeroControlCard>
              <label htmlFor="project-dashboard-selector" className="sr-only">
                Active project
              </label>
              <select
                id="project-dashboard-selector"
                value={activeProject.projectKey}
                onChange={(event) => changeProject(event.target.value)}
                className="mt-3 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
              >
                {projectOptions.map((project) => (
                  <option key={project.projectKey} value={project.projectKey}>
                    {pilotDisplayLabel(project.name)}
                  </option>
                ))}
              </select>
              {isProjectCreateOpen ? (
                <div className="mt-3 grid gap-2 rounded-md border border-line bg-surface p-3">
                  <input
                    value={projectNameDraft}
                    onChange={(event) => setProjectNameDraft(event.target.value)}
                    className="h-9 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
                    placeholder="Project name"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={projectAudienceDraft}
                      onChange={(event) => {
                        const audience = event.target.value as LocalProjectInput["audience"];
                        setProjectAudienceDraft(audience);
                        setProjectRoleDraft(audience === "b2b" ? "developer" : "home_buyer");
                      }}
                      className="h-9 rounded-md border border-line bg-white px-2 text-xs font-semibold text-ink outline-none transition focus:border-brand"
                    >
                      <option value="b2b">B2B</option>
                      <option value="b2c">B2C</option>
                    </select>
                    <select
                      value={projectRoleDraft}
                      onChange={(event) => setProjectRoleDraft(event.target.value as LocalProjectInput["role"])}
                      className="h-9 rounded-md border border-line bg-white px-2 text-xs font-semibold text-ink outline-none transition focus:border-brand"
                    >
                      {projectAudienceDraft === "b2b" ? (
                        <>
                          <option value="developer">Developer</option>
                          <option value="real_estate_fund">Real estate fund</option>
                          <option value="bank_lender">Bank / lender</option>
                          <option value="family_office">Family office</option>
                        </>
                      ) : (
                        <>
                          <option value="home_buyer">Home buyer</option>
                          <option value="tourist">Tourist</option>
                          <option value="resident_expat">Resident / expat</option>
                          <option value="family_relocation">Family relocation</option>
                        </>
                      )}
                    </select>
                  </div>
                  <input
                    value={projectMarketDraft}
                    onChange={(event) => setProjectMarketDraft(event.target.value)}
                    className="h-9 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
                    placeholder="Dubai / UAE"
                  />
                  <button
                    type="button"
                    disabled={projectNameDraft.trim().length === 0}
                    onClick={() => {
                      void createProjectFromHub();
                    }}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#c9d2d7]"
                  >
                    Create
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Analyses" value={recentRows.length} note={recentRows.length > 0 ? "Recent runs for this project." : "No analyses yet."} />
          <KpiCard label="Saved AOIs" value={scopedProjectAois.length} note={scopedProjectAois.length > 0 ? "Reusable screening areas." : "No saved AOIs yet."} />
          <KpiCard label="Comparisons" value={comparisonRows.length} note={comparisonRows.length > 0 ? "Saved comparison sets." : "No comparisons yet."} />
          <KpiCard label="Reports" value={reportRows.length + packageRows.length} note={reportRows.length + packageRows.length > 0 ? "Reports available for review." : "No reports yet."} />
        </section>

        <section id="data-readiness">
          <Panel title="Data Readiness / Source Lineage" subtitle="Source group readiness for screening workflows. Validation is required before decisions.">
            <div className="grid gap-4">
              <div className="grid gap-4 rounded-lg border border-line bg-ice-soft p-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spatial-blue">Projects</p>
                  <h3 className="mt-2 text-2xl font-semibold text-ink">Data Readiness / Source Lineage</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                    Source group readiness for screening workflows. Validation is required before decisions.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusChip>{activeProject.geography}</StatusChip>
                    <StatusChip>Segment: {getProjectSegmentLabel(getProjectSegment(activeProject))}</StatusChip>
                    <StatusChip>Scenario: {formatLabel(activeProject.primaryScenario)}</StatusChip>
                  </div>
                </div>
                {/* DataReadiness / control-card: reuse the ProjectHub hero-control pattern for active project actions. */}
                <HeroControlCard
                  label="Active project"
                  value={pilotDisplayLabel(activeProject.name)}
                >
                  <LinkButton href={openWorkspaceHref} onClick={() => writeActiveProjectKey(activeProject.projectKey)}>
                    Open workspace
                  </LinkButton>
                  <LinkButton href={openWorkspaceHref} variant="secondary" onClick={() => writeActiveProjectKey(activeProject.projectKey)}>
                    Run new analysis
                  </LinkButton>
                </HeroControlCard>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-md border border-line bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Groups</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{externalDataStatus?.summary?.totalGroups ?? sourceLineageRows.length}</p>
                </div>
                <div className="rounded-md border border-line bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Snapshots</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{externalDataStatus?.summary?.snapshotGroups ?? 0}</p>
                </div>
                <div className="rounded-md border border-line bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">API context</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{externalDataStatus?.summary?.apiContextGroups ?? 0}</p>
                </div>
                <div className="rounded-md border border-line bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Fallbacks</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{externalDataStatus?.summary?.fallbackGroups ?? 0}</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-md border border-line">
                <div className="hidden grid-cols-[1.4fr_0.7fr_0.8fr_0.7fr_0.7fr_1.4fr] gap-3 bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted xl:grid">
                  <span>Source group</span>
                  <span>Status</span>
                  <span>Data mode</span>
                  <span>Records</span>
                  <span>Confidence</span>
                  <span>Next validation step</span>
                </div>
                <div className="divide-y divide-line">
                  {sourceLineageRows.slice(0, 5).map((source) => (
                    <div key={`visible-${source.sourceId}`} className="grid gap-2 bg-white px-3 py-3 text-sm xl:grid-cols-[1.4fr_0.7fr_0.8fr_0.7fr_0.7fr_1.4fr] xl:items-start xl:gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{source.source}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{source.caveat || requiredDataCaveat}</p>
                      </div>
                      <span className="w-fit rounded-full bg-surface px-2 py-1 text-xs font-semibold text-brand">{source.currentStatus}</span>
                      <span className="text-xs font-semibold text-muted">
                        {source.dataMode ? sourceDataModeLabel(source.dataMode) : "n/a"}
                        {source.validationStatus ? <span className="mt-1 block font-normal leading-4">Quality: {source.validationStatus.replace(/-/g, " ")}</span> : null}
                      </span>
                      <span className="text-xs font-semibold text-ink">{formatRecordCount(source.recordCount)}</span>
                      <span className="text-xs font-semibold text-muted">{source.confidence ? formatLabel(source.confidence) : "n/a"}</span>
                      <p className="min-w-0 break-words text-xs leading-5 text-muted">{source.nextValidationStep ?? "Validate source lineage with official/client-approved evidence."}</p>
                    </div>
                  ))}
                </div>
              </div>
              <ValidationCaveat compact>{externalDataStatus?.summary?.caveat ?? requiredDataCaveat}</ValidationCaveat>
            </div>
          </Panel>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Panel title="Recent analyses">
            {recentRows.length > 0 ? (
              <div className="grid gap-3">
                {recentRows.slice(0, 4).map((item) => (
                  <Link
                    key={item.id}
                    href={item.canOpenAnalysis && item.analysis
                      ? `/workspace?openAnalysis=${encodeURIComponent(item.analysis.id)}&projectId=${encodeURIComponent(item.projectId ?? activeProject.id ?? item.projectKey ?? activeProject.projectKey)}&projectKey=${encodeURIComponent(item.projectKey ?? activeProject.projectKey)}`
                      : openWorkspaceHref}
                    onClick={() => {
                      writeActiveProjectKey(item.projectKey ?? activeProject.projectKey);
                      writeOpenAnalysisRequest(item);
                    }}
                    className="rounded-md border border-line bg-surface p-4 transition hover:border-brand"
                  >
                    <p className="safe-line-1 font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{item.scenarioLabel} / {formatTimestamp(item.timestamp)}</p>
                    <p className="mt-2 text-xs font-semibold text-brand">{item.decisionPosture}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No analyses yet" text="Open workspace to start the first screening run." href={openWorkspaceHref} action="Open workspace" />
            )}
          </Panel>

          <Panel title="Saved candidates / AOIs">
            {scopedProjectAois.length > 0 ? (
              <div className="grid gap-3">
                {scopedProjectAois.slice(0, 4).map((aoi) => (
                  <Link
                    key={aoi.id}
                    href={openWorkspaceForAoi(aoi)}
                    onClick={() => writeActiveProjectKey(activeProject.projectKey)}
                    className="rounded-md border border-line bg-surface p-4 transition hover:border-brand"
                  >
                    <p className="safe-line-1 font-semibold text-ink">{aoi.name}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">
                      {sourceTypeLabel(aoi.sourceType)} / {formatArea(aoi.measurements.areaSqM)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted">Validation required.</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No saved AOIs yet" text="Draw or import an AOI in the workspace to save project areas." href={openWorkspaceHref} action="Open workspace" />
            )}
          </Panel>

          <Panel title="Comparisons">
            {comparisonRows.length > 0 ? (
              <div className="grid gap-3">
                {comparisonRows.slice(0, 4).map((comparison) => (
                  <Link
                    key={comparison.id}
                    href={openWorkspaceHref}
                    onClick={() => writeActiveProjectKey(activeProject.projectKey)}
                    className="rounded-md border border-line bg-surface p-4 transition hover:border-brand"
                  >
                    <p className="safe-line-1 font-semibold text-ink">{comparison.title}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{formatTimestamp(comparison.createdAt ?? undefined)}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{comparison.sourceSummary ?? "Saved comparison; validation required."}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No comparisons yet" text="Add two or more targets in the workspace to compare options." href={openWorkspaceHref} action="Compare targets" />
            )}
          </Panel>

          <Panel title="Reports">
            {reportRows.length + packageRows.length > 0 ? (
              <div className="grid gap-3">
                {reportRows.slice(0, 3).map((report) => (
                  <Link
                    key={report.id}
                    href={`/reports/${encodeURIComponent(report.id)}/print`}
                    className="rounded-md border border-line bg-surface p-4 transition hover:border-brand"
                  >
                    <p className="safe-line-1 font-semibold text-ink">{pilotDisplayLabel(report.title)}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{formatTimestamp(report.createdAt ?? undefined)}</p>
                  </Link>
                ))}
                {packageRows.slice(0, 2).map((pkg) => (
                  <Link
                    key={pkg.id}
                    href={pkg.printablePath}
                    className="rounded-md border border-line bg-surface p-4 transition hover:border-brand"
                  >
                    <p className="safe-line-1 font-semibold text-ink">{pilotDisplayLabel(pkg.title)}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{formatDataRoomLabel(pkg.packageType)} / {formatTimestamp(pkg.generatedAt)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No reports yet" text="Run an analysis and export a report to populate this project." href={openWorkspaceHref} action="Run analysis" />
            )}
          </Panel>

          <Panel title="Project files / evidence">
            <div className="grid gap-3">
              {scopedProjectDatasets.length > 0 || evidenceFiles.length > 0 ? (
                [...scopedProjectDatasets.slice(0, 3), ...evidenceFiles.slice(0, 2).map((file) => ({
                  id: file.id,
                  title: file.fileName,
                  createdAt: file.createdAt,
                  sourceSummary: "Evidence file metadata",
                  projectKey: activeProject.projectKey
                } as SavedObjectSummary))].map((item) => (
                  <div key={item.id} className="rounded-md border border-line bg-surface p-4">
                    <p className="safe-line-1 font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{item.sourceSummary ?? "Project file"}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-line bg-surface p-4 text-sm leading-6 text-muted">
                  No project files yet.
                </p>
              )}
              <button
                type="button"
                onClick={() => dataRoomFileInputRef.current?.click()}
                className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
              >
                Add file
              </button>
            </div>
          </Panel>
        </section>

        <details className="rounded-lg border border-line bg-white px-4 shadow-sm">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-4 text-sm font-semibold text-ink">
            <span>Advanced project diagnostics</span>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">Closed</span>
          </summary>
          <div className="border-t border-line py-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="grid gap-5">
            <Panel title="AOI Library" subtitle="Reusable user-provided or uploaded screening geometries scoped to the active project.">
              {scopedProjectAois.length > 0 ? (
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                      {scopedProjectAois.length} saved AOI{scopedProjectAois.length === 1 ? "" : "s"}
                    </span>
                    {Object.entries(aoiSourceCounts).map(([label, count]) => (
                      <span key={`aoi-source-${label}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
                        {label}: {count}
                      </span>
                    ))}
                  </div>

                  <div className="grid gap-3">
                    {scopedProjectAois.slice(0, 4).map((aoi) => (
                      <article key={aoi.id} className="rounded-md border border-line bg-surface p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="safe-line-1 font-semibold text-ink">{aoi.name}</h3>
                            <p className="mt-1 text-sm leading-5 text-muted">
                              {sourceTypeLabel(aoi.sourceType)} / {formatArea(aoi.measurements.areaSqM)} / {validationStatusLabel(aoi.validationStatus)}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted">
                              Screening geometry only; official validation required.
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            <Link
                              href={openWorkspaceForAoi(aoi)}
                              onClick={() => writeActiveProjectKey(activeProject.projectKey)}
                              className="inline-flex h-8 items-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand"
                            >
                              Open AOI
                            </Link>
                            <Link
                              href={openWorkspaceForAoi(aoi)}
                              onClick={() => writeActiveProjectKey(activeProject.projectKey)}
                              className="inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover"
                            >
                              Run analysis
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No saved AOIs yet"
                  text="Draw or import an AOI in the workspace to start a reusable project AOI library. Saved AOIs remain screening geometry until officially validated."
                  href={openWorkspaceHref}
                  action="Draw or import AOI"
                />
              )}
            </Panel>

            <Panel title="Client Data Room" subtitle="Project-scoped pilot evidence package linking AOIs, uploads, analyses, reports, comparisons and validation tasks.">
              <div className="grid gap-4">
                <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                        {dataRoom?.summary.label ?? "Data room foundation active"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
                        local/sample fallback
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {dataRoom?.summary.storageNote ?? "Local/sample fallback; durable storage not configured."}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {dataRoom?.dataHonesty.caveat ?? "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={openWorkspaceHref}
                      onClick={() => writeActiveProjectKey(activeProject.projectKey)}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover"
                    >
                      Open workspace
                    </Link>
                    <button
                      type="button"
                      onClick={() => dataRoomFileInputRef.current?.click()}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand"
                    >
                      Add/upload data
                    </button>
                    <a
                      href="#validation-checklist"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand"
                    >
                      Review checklist
                    </a>
                  </div>
                </div>

                <input
                  ref={dataRoomFileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.csv,.json,.geojson,.png,.jpg,.jpeg,.xlsx,.docx,application/pdf,text/csv,application/json,application/geo+json,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => {
                    void handleDataRoomFileChange(event);
                  }}
                />

                {dataRoomMessage ? (
                  <p className="rounded-md border border-line bg-white px-3 py-2 text-xs leading-5 text-muted">
                    {dataRoomMessage}
                  </p>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    ["AOIs", dataRoom?.summary.counts.aois ?? scopedProjectAois.length],
                    ["Uploads", dataRoom?.summary.counts.uploadedDatasets ?? scopedProjectDatasets.length],
                    ["Reports", dataRoom?.summary.counts.reports ?? reportRows.length],
                    ["Analyses", dataRoom?.summary.counts.analyses ?? recentRows.length],
                    ["Comparisons", dataRoom?.summary.counts.comparisons ?? comparisonRows.length],
                    ["Validation", dataRoom?.summary.counts.validationItems ?? 0]
                  ].map(([label, value]) => (
                    <div key={`data-room-count-${label}`} className="rounded-md bg-surface p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
                      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Latest assets</p>
                    <div className="mt-2 grid gap-2">
                      {(dataRoom?.summary.latestAssets ?? []).length > 0 ? (
                        dataRoom?.summary.latestAssets.slice(0, 3).map((asset) => (
                          <div key={asset.id} className="rounded-md border border-line bg-surface p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="safe-line-1 text-sm font-semibold text-ink">{asset.name}</p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{asset.description ?? asset.caveat}</p>
                              </div>
                              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-brand">
                                {formatDataRoomLabel(asset.assetType)}
                              </span>
                            </div>
                            <p className="mt-2 text-[11px] font-semibold text-muted">{formatDataRoomLabel(asset.validationStatus)}</p>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-md border border-dashed border-line bg-surface p-3 text-sm leading-6 text-muted">
                          Add AOIs, uploaded datasets or reports to build a client pilot data room.
                        </p>
                      )}
                    </div>
                  </div>

                  <div id="validation-checklist">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Validation checklist</p>
                      <span className="rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-brand">
                        {dataRoom?.summary.checklistStatus.completed ?? 0}/{dataRoom?.summary.checklistStatus.total ?? 0} completed
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {(dataRoom?.checklist ?? []).slice(0, 5).map((item) => (
                        <div key={item.id} className="rounded-md border border-line bg-surface p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink">{item.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{item.description}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                item.priority === "high"
                                  ? "bg-[#fff7ed] text-[#9f3412]"
                                  : item.priority === "medium"
                                    ? "bg-[#fff9e8] text-[#6f5817]"
                                    : "bg-white text-muted"
                              }`}>
                                {item.priority}
                              </span>
                              <select
                                value={item.status}
                                onChange={(event) => {
                                  void updateChecklistStatus(item, event.target.value as ValidationChecklistStatus);
                                }}
                                className="h-8 rounded-md border border-line bg-white px-2 text-xs font-semibold text-ink outline-none transition focus:border-brand"
                                aria-label={`Validation status for ${item.title}`}
                              >
                                {["required", "in_review", "completed", "blocked", "not_applicable"].map((status) => (
                                  <option key={status} value={status}>{formatDataRoomLabel(status)}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Pilot Workflow" subtitle="Workflow readiness for client review. This is not investment, legal, planning or valuation readiness.">
              {pilotWorkflow?.workflow && pilotWorkflow.readiness ? (
                <div className="grid gap-4">
                  <div className="rounded-md border border-line bg-surface p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                            Stage: {formatDataRoomLabel(pilotWorkflow.workflow.pilotStage)}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
                            {formatDataRoomLabel(pilotWorkflow.readiness.label)}
                          </span>
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-ink">{pilotWorkflow.workflow.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted">{pilotWorkflow.workflow.decisionQuestion}</p>
                      </div>
                      <div className="shrink-0 rounded-md border border-line bg-white px-4 py-3 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Readiness</p>
                        <p className="mt-1 text-3xl font-semibold text-ink">{pilotWorkflow.readiness.score}</p>
                        <p className="text-xs font-semibold text-muted">/100</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted">{pilotWorkflow.readiness.caveat}</p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      ["Inputs", `${workflowInputProvided}/${workflowInputTotal}`, "required items provided or in review"],
                      ["Deliverables", `${workflowDeliverablesReady}/${workflowDeliverablesTotal}`, "generated or ready for review"],
                      ["Validation", `${workflowValidationCompleted}/${workflowValidationTotal}`, "completed checklist items"]
                    ].map(([label, value, note]) => (
                      <div key={`pilot-workflow-progress-${label}`} className="rounded-md bg-surface p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
                        <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{note}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-line bg-surface p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Top blockers</p>
                      <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-ink">
                        {(pilotWorkflow.readiness.blockers.length > 0 ? pilotWorkflow.readiness.blockers : ["No workflow blocker beyond official validation caveats."]).slice(0, 3).map((item, index) => (
                          <li key={`pilot-blocker-${index}-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-md border border-line bg-surface p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Next actions</p>
                      <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-ink">
                        {pilotWorkflow.readiness.nextActions.slice(0, 3).map((item, index) => (
                          <li key={`pilot-next-action-${index}-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {pilotWorkflowMessage ? (
                    <p className="rounded-md border border-line bg-white px-3 py-2 text-xs leading-5 text-muted">
                      {pilotWorkflowMessage}
                    </p>
                  ) : null}

                  <details className="rounded-md border border-line bg-surface px-3">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      <span>Client input checklist</span>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] normal-case tracking-normal text-brand">
                        {workflowInputProvided}/{workflowInputTotal}
                      </span>
                    </summary>
                    <div className="grid max-h-80 gap-2 overflow-y-auto border-t border-line py-3 [scrollbar-width:thin]">
                      {pilotWorkflow.clientInputs.slice(0, 8).map((item) => (
                        <div key={item.id} className="rounded-md border border-line bg-white p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink">{item.title}</p>
                              <p className="mt-1 text-xs leading-5 text-muted">
                                {formatDataRoomLabel(item.inputType)} / {item.required ? "required" : "optional"} / {item.priority}
                              </p>
                            </div>
                            <select
                              value={item.status}
                              onChange={(event) => {
                                void updatePilotInputStatus(item, event.target.value as ClientInputStatus);
                              }}
                              className="h-8 shrink-0 rounded-md border border-line bg-surface px-2 text-xs font-semibold text-ink outline-none transition focus:border-brand"
                              aria-label={`Client input status for ${item.title}`}
                            >
                              {["missing", "requested", "provided_unvalidated", "in_review", "accepted_for_screening", "blocked", "not_applicable"].map((status) => (
                                <option key={status} value={status}>{formatDataRoomLabel(status)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>

                  <details className="rounded-md border border-line bg-surface px-3">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      <span>Deliverables workflow</span>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] normal-case tracking-normal text-brand">
                        {workflowDeliverablesReady}/{workflowDeliverablesTotal}
                      </span>
                    </summary>
                    <div className="grid max-h-80 gap-2 overflow-y-auto border-t border-line py-3 [scrollbar-width:thin]">
                      {pilotWorkflow.deliverables.slice(0, 8).map((item) => (
                        <div key={item.id} className="rounded-md border border-line bg-white p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink">{item.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{item.nextAction}</p>
                            </div>
                            <select
                              value={item.status}
                              onChange={(event) => {
                                void updatePilotDeliverableStatus(item, event.target.value as PilotDeliverableWorkflowStatus);
                              }}
                              className="h-8 shrink-0 rounded-md border border-line bg-surface px-2 text-xs font-semibold text-ink outline-none transition focus:border-brand"
                              aria-label={`Deliverable status for ${item.title}`}
                            >
                              {["planned", "in_progress", "generated", "ready_for_review", "validation_required", "blocked"].map((status) => (
                                <option key={status} value={status}>{formatDataRoomLabel(status)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>

                  <p className="text-xs leading-5 text-muted">{pilotWorkflow.dataHonesty.storageCaveat}</p>
                </div>
              ) : (
                <EmptyState
                  title="Pilot workflow unavailable"
                  text="The workflow summary could not be loaded for this project. The Data Room and workspace remain available."
                  href={openWorkspaceHref}
                  action="Open workspace"
                />
              )}
            </Panel>

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
                          <h3 className="break-words font-semibold text-ink">{pilotDisplayLabel(report.title)}</h3>
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
                              Sample example
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
                      <p className="mt-2 text-sm leading-5 text-muted">{pilotDisplayLabel(report.sourceSummary ?? "Saved with sample/local source lineage; official validation required.")}</p>
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

            <Panel title="Enterprise Report Packages" subtitle="Structured browser-print packages for client/investor review. Generated does not mean officially validated.">
              <div className="grid gap-3">
                <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                        {packageRows.length} package{packageRows.length === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
                        browser print / JSON
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Combines memo, AOI factsheet, source lineage, validation governance, evidence review, Data Room and workflow summaries.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void createProjectReportPackage();
                    }}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover"
                  >
                    Create package
                  </button>
                </div>

                {reportPackageMessage ? (
                  <p className="rounded-md border border-line bg-white px-3 py-2 text-xs leading-5 text-muted">{reportPackageMessage}</p>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  {packageRows.slice(0, 4).map((pkg) => (
                    <article key={pkg.id} className="rounded-md border border-line bg-surface p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="safe-line-1 text-sm font-semibold text-ink">{pilotDisplayLabel(pkg.title)}</p>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            {formatDataRoomLabel(pkg.packageType)} / {formatDataRoomLabel(pkg.status)} / {formatTimestamp(pkg.generatedAt)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted">{pkg.caveat}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-brand">
                          {pkg.version}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/api/report-packages/${encodeURIComponent(pkg.packageKey)}`}
                          className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2 text-xs font-semibold text-ink transition hover:border-brand"
                        >
                          Open package
                        </Link>
                        <Link
                          href={pkg.printablePath}
                          className="inline-flex h-8 items-center rounded-md bg-brand px-2 text-xs font-semibold text-white transition hover:bg-brand-hover"
                        >
                          Print package
                        </Link>
                        <Link
                          href={pkg.jsonPath}
                          className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2 text-xs font-semibold text-ink transition hover:border-brand"
                        >
                          Export JSON
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid content-start gap-5">
            <Panel title="Pilot Brief" subtitle="Use this project as a controlled screening narrative, not as validated production evidence.">
              <div className="grid gap-3">
                <div className="rounded-md bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Purpose</p>
                  <p className="mt-1 text-sm leading-6 text-ink">
                    {getProjectMetadataText(activeProject, "demoPurpose", "Frame GeoAI screening, memo and comparison workflows.")}
                  </p>
                </div>
                <div className="rounded-md bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Data status</p>
                  <p className="mt-1 text-sm leading-6 text-ink">
                    {getProjectMetadataText(activeProject, "dataStatus", "Sample/open and offline data; official validation required.")}
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

            <Panel title="Client Validation Package" subtitle="Future client work package framing for the active sample project.">
              <div className="grid gap-3">
                <div className="rounded-md border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{clientPilotPackage.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">{clientPilotPackage.objective}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
                      {clientPilotPackage.duration}
                    </span>
                  </div>
                </div>
                {activeNarrative ? (
                  <div className="rounded-md bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Decision question</p>
                    <p className="mt-1 text-sm leading-6 text-ink">{activeNarrative.decisionQuestion}</p>
                  </div>
                ) : null}
                <div className="grid gap-2 text-sm">
                  <div className="rounded-md bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Delivery artifacts</p>
                    <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-ink">
                      {clientPilotPackage.geoaiDeliverables.slice(0, 4).map((item, index) => (
                        <li key={`client-pilot-deliverable-${index}-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Validation requirements</p>
                    <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-ink">
                      {clientPilotPackage.validationRequirements.slice(0, 3).map((item, index) => (
                        <li key={`client-pilot-validation-${index}-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rounded-md border border-line bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Controlled client framing</p>
                  <p className="mt-1 text-sm leading-6 text-ink">{clientPilotPackage.commercialPilotFraming}</p>
                </div>
                <p className="text-xs leading-5 text-muted">{clientPilotPackage.caveat}</p>
              </div>
            </Panel>

            <Panel title="Workflow Readiness Drivers" subtitle="Conservative workflow-completeness drivers, not investment or legal readiness.">
              <div className="grid gap-3">
                <div className="rounded-md border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{pilotWorkflow?.workflow?.title ?? pilotPackage.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {pilotWorkflow?.readiness?.caveat ?? "Readiness reflects workflow completeness only; it is not an investment, legal, planning or valuation conclusion."}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
                      {pilotWorkflow?.readiness?.score ?? pilotReadiness.score}/100
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-muted">
                    {pilotWorkflow?.readiness ? formatDataRoomLabel(pilotWorkflow.readiness.label) : pilotReadiness.readinessLabel}
                  </p>
                </div>
                <div className="grid gap-2 text-sm">
                  {(pilotWorkflow?.readiness?.drivers ?? []).slice(0, 6).map((driver) => (
                    <div key={driver.id} className="rounded-md bg-surface p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{driver.label}</p>
                        <span className="shrink-0 text-xs font-semibold text-brand">{driver.score}/{driver.maxScore}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-ink">{driver.note}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-line bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Next action</p>
                  <p className="mt-1 text-sm leading-6 text-ink">
                    {pilotWorkflow?.readiness?.nextActions[0] ?? pilotReadiness.nextActions[0]}
                  </p>
                </div>
              </div>
            </Panel>

            <Panel title="Activation Diagnostics" subtitle="Advanced gate status. Fallback remains available until every gate is verified.">
              <div className="grid gap-3">
                <div className="flex items-start justify-between gap-3 rounded-md border border-line bg-surface p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{formatDataRoomLabel(pilotBackendStatus?.status ?? platformStatus?.activationStatus ?? "local_fallback_only")}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                      {pilotBackendStatus?.blockers?.[0]?.description ?? platformStatus?.blockers?.[0] ?? dbHealth?.message ?? "Advanced activation status is reported by API health checks."}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
                    v2.9
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {platformRows.map((row) => (
                    <div key={row.label} className="rounded-md bg-surface px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{row.label}</p>
                        <span className="truncate text-xs font-semibold text-ink">{row.value}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{row.note}</p>
                    </div>
                  ))}
                </div>
                {pilotBackendStatus?.blockers?.length ? (
                  <div className="rounded-md border border-line bg-white px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Top blockers</p>
                    <ul className="mt-2 grid gap-1 text-xs leading-5 text-muted">
                      {pilotBackendStatus.blockers.slice(0, 2).map((item) => (
                        <li key={item.id}>
                          <span className="font-semibold text-ink">{item.severity.toUpperCase()}:</span> {item.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="text-xs leading-5 text-muted">
                  {pilotBackendStatus?.nextActions?.[0] ?? platformStatus?.nextActions?.[0] ?? "Run the migration, seed and verification scripts from a trusted environment before claiming durable storage."}
                </p>
              </div>
            </Panel>

            <Panel title="Validation Governance" subtitle="Evidence posture and official connector readiness for this project.">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Evidence", validationSummary?.totalEvidence ?? 0],
                    ["In review", validationSummary?.inReviewCount ?? 0],
                    ["Client validated", validationSummary?.clientValidatedCount ?? 0],
                    ["Official validated", validationSummary?.officialValidatedCount ?? 0]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-surface px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">Evidence review workflow</p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Uploaded evidence stays screening-only until a reviewer records a decision.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">v2.7</span>
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
                    {[
                      ["Unreviewed", reviewStatusCounts.uploaded],
                      ["Review", reviewStatusCounts.inReview],
                      ["Client", reviewStatusCounts.client],
                      ["Official", reviewStatusCounts.official],
                      ["Blocked", reviewStatusCounts.blocked]
                    ].map(([label, value]) => (
                      <div key={`review-count-${label}`} className="rounded-md bg-white p-2">
                        <span className="text-muted">{label}</span>
                        <p className="mt-1 font-semibold text-ink">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      ["accept_for_screening", "Mark in review"],
                      ["mark_client_validated", "Client validated"],
                      ["request_more_evidence", "Need more"],
                      ["reject", "Reject"]
                    ].map(([decision, label]) => (
                      <button
                        key={decision}
                        type="button"
                        onClick={() => void createReviewDecision(decision)}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {formatDataRoomLabel(validationSummary?.highestAllowedClaimLevel ?? "screening_only")}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Required gaps: {validationSummary?.requiredValidationGaps.length ?? 0}. Evidence tracking does not mean GeoAI certifies ownership, zoning, cadastral status, planning approval or valuation.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
                      v2.5
                    </span>
                  </div>
                  <ul className="mt-2 grid gap-1 text-xs leading-5 text-muted">
                    {(validationSummary?.requiredValidationGaps ?? ["Official/client validation evidence required"]).slice(0, 3).map((gap, index) => (
                      <li key={`validation-gap-${index}-${gap.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32)}`}>{gap}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-2">
                  {validationConnectorRows.map((connector) => (
                    <div key={connector.id} className="rounded-md bg-surface px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold text-ink">{connector.name}</p>
                        <span className="shrink-0 text-xs font-semibold text-muted">{formatDataRoomLabel(connector.currentStatus)}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{connector.nextStep}</p>
                    </div>
                  ))}
                </div>
                {validationMessage ? (
                  <p className="rounded-md bg-surface px-3 py-2 text-xs leading-5 text-muted">{validationMessage}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void addValidationEvidencePlaceholder()}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
                  >
                    Add validation evidence
                  </button>
                  <a
                    href="#data-readiness"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-brand"
                  >
                    Review connectors
                  </a>
                  <a
                    href="#client-data-room"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-brand"
                  >
                    Open Data Room
                  </a>
                </div>
                <p className="text-xs leading-5 text-muted">{validationSummary?.caveat ?? "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."}</p>
              </div>
            </Panel>

            <Panel title="Evidence Files / Storage" subtitle="Storage readiness and validation evidence file metadata for this project.">
              <div className="grid gap-3">
                <div className="rounded-md border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{formatDataRoomLabel(storageHealth?.provider ?? "local_metadata_only")}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Buckets: {storageHealth?.bucketReady ? "ready" : storageHealth?.missingBuckets?.length ? `${storageHealth.missingBuckets.length} missing` : "not configured"}.
                        {" "}Files: {evidenceFiles.length}; metadata-only: {evidenceFiles.filter((file) => file.objectStatus === "metadata_only").length}.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
                      v2.6
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {storageHealth?.nextActions?.[0] ?? "Configure Supabase Storage, create private buckets and verify signed URL flows."}
                  </p>
                </div>

                <div className="grid gap-2">
                  {evidenceFiles.length > 0 ? (
                    evidenceFiles.slice(0, 4).map((file) => (
                      <div key={file.id} className="rounded-md bg-surface px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold text-ink">{file.fileName}</p>
                          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-brand">
                            {formatDataRoomLabel(file.objectStatus)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          {file.mimeType} / {formatBytes(file.fileSizeBytes)} / {formatDataRoomLabel(file.storageProvider)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-md bg-surface px-3 py-2 text-xs leading-5 text-muted">
                      No evidence files registered yet. Add a file to create storage-ready metadata for this project.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => dataRoomFileInputRef.current?.click()}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
                  >
                    Add evidence file
                  </button>
                  <Link
                    href={openWorkspaceHref}
                    onClick={() => writeActiveProjectKey(activeProject.projectKey)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-brand"
                  >
                    Attach in workspace
                  </Link>
                </div>
                <p className="text-xs leading-5 text-muted">
                  {storageHealth?.caveat ?? "Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified."}
                </p>
              </div>
            </Panel>

            <Panel title="Data Readiness / Source Lineage" subtitle="Source group readiness for screening workflows. Validation is still required before decisions.">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-md border border-line bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Groups</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">{externalDataStatus?.summary?.totalGroups ?? sourceLineageRows.length}</p>
                  </div>
                  <div className="rounded-md border border-line bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Snapshots</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">{externalDataStatus?.summary?.snapshotGroups ?? 0}</p>
                  </div>
                  <div className="rounded-md border border-line bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">API context</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">{externalDataStatus?.summary?.apiContextGroups ?? 0}</p>
                  </div>
                  <div className="rounded-md border border-line bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Fallbacks</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">{externalDataStatus?.summary?.fallbackGroups ?? 0}</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-md border border-line">
                  <div className="hidden grid-cols-[1.4fr_0.7fr_0.8fr_0.7fr_0.7fr_1.4fr] gap-3 bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted xl:grid">
                    <span>Source group</span>
                    <span>Status</span>
                    <span>Data mode</span>
                    <span>Records</span>
                    <span>Confidence</span>
                    <span>Next validation step</span>
                  </div>
                  <div className="divide-y divide-line">
                    {sourceLineageRows.slice(0, 5).map((source) => (
                      <div key={source.sourceId} className="grid gap-2 bg-white px-3 py-3 text-sm xl:grid-cols-[1.4fr_0.7fr_0.8fr_0.7fr_0.7fr_1.4fr] xl:items-start xl:gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{source.source}</p>
                          <p className="mt-1 text-xs leading-5 text-muted">{source.caveat || requiredDataCaveat}</p>
                        </div>
                        <span className="w-fit rounded-full bg-surface px-2 py-1 text-xs font-semibold text-brand">{source.currentStatus}</span>
                        <span className="text-xs font-semibold text-muted">
                          {source.dataMode ? sourceDataModeLabel(source.dataMode) : "n/a"}
                          {source.validationStatus ? <span className="mt-1 block font-normal leading-4">Quality: {source.validationStatus.replace(/-/g, " ")}</span> : null}
                        </span>
                        <span className="text-xs font-semibold text-ink">{formatRecordCount(source.recordCount)}</span>
                        <span className="text-xs font-semibold text-muted">{source.confidence ? formatLabel(source.confidence) : "n/a"}</span>
                        <p className="min-w-0 break-words text-xs leading-5 text-muted">{source.nextValidationStep ?? "Validate source lineage with official/client-approved evidence."}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-line bg-surface p-4">
                  <p className="font-semibold text-ink">Supabase / PostGIS</p>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    {dbHealth?.message ?? getSupabaseFallbackMessage(false)}
                  </p>
                </div>
                <p className="text-xs leading-5 text-muted">
                  {externalDataStatus?.summary?.caveat ?? requiredDataCaveat}
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
                          className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
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
                  text="Open the workspace, select 2-3 points or screening objects, then compare selected sites."
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
        </details>
      </div>
    </main>
  );
}
