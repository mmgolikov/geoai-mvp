"use client";

import { useEffect, useRef, useState } from "react";
import { AnalysisPanel } from "@/components/analysis-panel";
import { ComparisonDashboard } from "@/components/comparison-dashboard";
import { ExpressDashboard } from "@/components/express-dashboard";
import { MapWorkspace } from "@/components/map-workspace";
import { ReportPreview } from "@/components/report-preview";
import {
  createEvidenceItem,
  getDataSourceById
} from "@/src/data/data-source-registry";
import {
  getDemoNarrativeById,
  getDemoNarrativeForGuidedDemo
} from "@/src/data/demo-narratives";
import { demoProjects, getDemoProject } from "@/src/data/demo-projects";
import {
  createGuidedDemoComparisonItems,
  createGuidedDemoDatasets,
  createGuidedDemoSelection,
  getGuidedDemoPreset,
  guidedDemoPresets
} from "@/src/data/guided-demo";
import { createComparisonItem, createMockComparison } from "@/src/lib/mock-comparison";
import { analysisScenarios, createMockExpressAnalysis } from "@/src/lib/mock-express-analysis";
import { deriveDecisionPosture } from "@/src/lib/decision-posture";
import { createSourceLineageSnapshot } from "@/src/lib/source-lineage-snapshot";
import { generateExploreCandidates } from "@/src/lib/explore/candidates";
import {
  getDefaultFilters,
  getDefaultRoleForAudience,
  getDefaultScenarioForAudience,
  getDefaultScenarioForRole,
  getExploreScenario,
  isExploreRoleForAudience,
  isExploreScenarioForRole,
  isExploreScenarioId
} from "@/src/lib/explore/scenarios";
import type {
  CandidateSearchStatus,
  ExploreAudience,
  ExploreCandidate,
  ExploreFilters,
  ExploreRole,
  ExploreScenarioId,
  ExploreSelectedPointOrArea,
  InteractionMode
} from "@/src/lib/explore/types";
import {
  analysisScenarioToExploreScenario,
  exploreCandidateToSelectedObject,
  exploreCandidateToSelectedPoint,
  exploreScenarioToAnalysisScenario
} from "@/src/lib/explore/workspace-bridge";
import {
  createLocalProject,
  mergeProjectsWithLocal,
  saveLocalProject,
  type LocalProjectInput
} from "@/src/lib/project-local-store";
import { browserDemoStorageKey, isBrowserDemoStorageEnabled } from "@/src/lib/browser-demo-storage";
import type { RepositoryMode } from "@/src/lib/repositories/repository-mode";
import type { ReportMapSnapshot } from "@/src/lib/report-map-snapshot";
import type { SpatialSourceRequest } from "@/src/lib/spatial-b2/source-mode";
import {
  createAoiGeojsonFeature,
  parseGeojsonAoi,
  projectAoiToUserDrawnAoi,
  readBrowserAois,
  safeAoiFilename,
  userDrawnAoiToProjectAoi,
  writeBrowserAois
} from "@/src/lib/aoi-library";
import {
  enrichAnalysisWithMarketMetrics,
  findBestMarketMetricMatch
} from "@/src/lib/market-metrics";
import {
  getNearbyOpenPoi,
  getNearestAccessibilityMetric,
  getNearestOpenRoad
} from "@/src/lib/open-geodata";
import {
  buildUploadedDataContext,
  createInvalidUploadedDataset,
  createUploadedCsvDataset,
  createUploadedGeojsonDataset,
  limitUploadedDatasetsPerProject,
  maxUploadedFileSizeBytes,
  readBrowserUploadedDatasets,
  writeBrowserUploadedDatasets,
  withUploadedDataContext
} from "@/src/lib/uploaded-data";
import type { GeoAIProject } from "@/src/lib/db/types";
import { upsertBrowserProjectArtifact } from "@/src/lib/browser-project-artifacts";
import type {
  AnalysisScenarioId,
  AnalysisHistoryItem,
  ComparisonItem,
  ComparisonResult,
  ExpressAnalysis,
  SelectedDemoObject,
  SelectedPoint,
  UserDrawnAoi
} from "@/src/types/geo";
import type { MarketContext } from "@/src/types/market-context";
import type { UploadedDataset } from "@/src/types/uploaded-data";
import type { ProjectAoi } from "@/src/types/aoi";

const analysisHistoryStorageKey = browserDemoStorageKey("analysis-history-v1");
const activeProjectStorageKey = browserDemoStorageKey("active-project-key-v1");
const openAnalysisRequestStorageKey = browserDemoStorageKey("open-analysis-request-v1");
const maxAnalysisHistoryItems = 8;

type BackendStatus = {
  configured: boolean;
  status: "connected" | "configured_unavailable" | "not_configured";
  repositoryMode: RepositoryMode;
  mode: RepositoryMode;
  caveat: string;
  message: string;
  sources_count: number | null;
};

type AnalysisRunsResponse = {
  ok: boolean;
  mode: "supabase" | "local_fallback";
  items: unknown[];
  error: string | null;
};

type ProjectsResponse = {
  ok: boolean;
  mode: "supabase" | "demo_seed";
  items: GeoAIProject[];
  error: string | null;
};

type ClimateScreeningContext = {
  status: "connected" | "sample_fallback" | "permission_required";
  sourceId: string;
  source: string;
  climateDataMode: string;
  heatExposureProxy: string;
  rainfallProxy: string;
  confidence: "low" | "medium" | "high";
  caveat: string;
  limitation: string;
  note: string;
};

type PersistedAnalysisRun = {
  id?: string;
  run_key?: string;
  scenario_id?: AnalysisScenarioId;
  selected_name?: string;
  selected_type?: string;
  selected_point?: SelectedPoint;
  selected_object?: SelectedDemoObject | null;
  result_json?: ExpressAnalysis;
  result_payload?: ExpressAnalysis;
  decision_posture?: string | null;
  confidence_level?: ExpressAnalysis["confidenceLevel"];
  data_confidence_level?: string | null;
  analysis_mode?: ExpressAnalysis["analysisMode"];
  project_key?: string | null;
  project_name?: string | null;
  created_at?: string;
};

type OpenAnalysisRequest = {
  analysisId?: string;
  projectId?: string | null;
  projectKey?: string;
  scenarioId?: AnalysisScenarioId;
  customQuery?: string;
  analysis?: ExpressAnalysis;
};

function isProjectSegment(value: unknown): value is ExploreAudience {
  return value === "b2b" || value === "b2c";
}

function getProjectSegment(project: GeoAIProject): ExploreAudience {
  const segment = project.metadata?.segment ?? project.metadata?.audience;
  return isProjectSegment(segment) ? segment : "b2b";
}

function getDefaultProjectForAudience(projects: GeoAIProject[], audience: ExploreAudience) {
  return projects.find((project) => getProjectSegment(project) === audience)
    ?? demoProjects.find((project) => getProjectSegment(project) === audience)
    ?? projects[0]
    ?? demoProjects[0];
}

function isAnalysisScenarioId(value: unknown): value is AnalysisScenarioId {
  return typeof value === "string" && analysisScenarios.some((scenario) => scenario.id === value);
}

function getProjectExploreRole(project: GeoAIProject, audience: ExploreAudience): ExploreRole {
  const metadataRole = project.metadata?.role ?? project.metadata?.audienceRole;
  if (isExploreRoleForAudience(audience, metadataRole)) {
    return metadataRole;
  }

  if (audience === "b2b") {
    if (project.clientType === "developer") return "developer";
    if (project.clientType === "bank") return "bank_lender";
    if (project.clientType === "government") return "government_urban_authority";
    if (project.clientType === "family_office") return "family_office";
    if (project.clientType === "fund") return "real_estate_fund";
  }

  return getDefaultRoleForAudience(audience);
}

function getProjectExploreScenario(
  project: GeoAIProject,
  audience: ExploreAudience,
  role: ExploreRole
): ExploreScenarioId {
  const metadataScenario = project.metadata?.scenarioId ??
    project.metadata?.exploreScenarioId ??
    project.metadata?.scenario;
  const candidates: unknown[] = [metadataScenario];

  if (isExploreScenarioId(project.primaryScenario)) {
    candidates.push(project.primaryScenario);
  }

  if (isAnalysisScenarioId(project.primaryScenario)) {
    candidates.push(analysisScenarioToExploreScenario(project.primaryScenario));
  }

  const validScenario = candidates.find((scenarioId) => isExploreScenarioForRole(audience, role, scenarioId));
  return validScenario ?? getDefaultScenarioForRole(audience, role);
}

function withMarketContext(analysis: ExpressAnalysis, marketContext: MarketContext | null): ExpressAnalysis {
  if (!marketContext) {
    return analysis;
  }

  const marketMetricsMatch = findBestMarketMetricMatch({
    point: analysis.point,
    selectedObject: analysis.selectedObject ?? null,
    marketContext
  });
  const enrichedMarketContext = {
    ...marketContext,
    sourceMode: marketMetricsMatch.sourceMode === "imported_sample" ? "seed_static" : marketContext.sourceMode,
    importedMarketMetrics: marketMetricsMatch,
    dataQualityNotes: [
      marketMetricsMatch.note,
      ...(marketContext.dataQualityNotes ?? [])
    ],
    limitations: [
      marketMetricsMatch.importedMetricsUsed
        ? "Imported sample metrics demonstrate the market-data workflow and require official DLD / Dubai Pulse validation before investment decisions."
        : marketMetricsMatch.note,
      ...marketContext.limitations
    ]
  };

  const areaSlug = marketContext.areaName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const marketEvidence = marketContext.sourceIds.slice(0, 6).map((sourceId, index) => {
    const source = getDataSourceById(sourceId);

    return createEvidenceItem(
      `market-context-${areaSlug}-${sourceId}`,
      sourceId,
      index === 0
        ? `Market context: ${marketContext.areaName}`
        : `Market validation source: ${source?.name ?? sourceId}`,
      index === 0
        ? `${marketContext.sourceMode ?? "seed_static"} market context matched to ${marketContext.areaName}. ${marketContext.dataQualityNotes?.[0] ?? "Current values are sample/open indices, not official market data."}`
        : `Planned validation source for market, planning, infrastructure, or geospatial context related to ${marketContext.areaName}.`,
      index === 0 ? "demo" : "medium"
    );
  });

  return enrichAnalysisWithMarketMetrics(
    {
      ...analysis,
      marketContext: enrichedMarketContext,
      evidence: [
        ...marketEvidence.filter(
          (marketItem) => !analysis.evidence.some((item) => item.id === marketItem.id)
        ),
        ...analysis.evidence
      ]
    },
    marketMetricsMatch
  );
}

function withOpenGeodataContext(analysis: ExpressAnalysis): ExpressAnalysis {
  const accessibility = getNearestAccessibilityMetric(analysis.point);
  const nearestRoad = getNearestOpenRoad(analysis.point);
  const nearbyPoi = getNearbyOpenPoi(analysis.point, 7).slice(0, 4);

  if (!accessibility && !nearestRoad && nearbyPoi.length === 0) {
    return analysis;
  }

  const evidence = createEvidenceItem(
    "open-geodata-baseline-context",
    "osm-geofabrik-baseline",
    "Open geospatial baseline context",
    "OSM / Geofabrik-style snapshot or sample fallback provides indicative road, POI, anchor and accessibility context. Not official GIS; attribution and validation are required before production use.",
    "medium"
  );
  const openContextNotes = [
    accessibility
      ? `Open baseline accessibility context matched nearest area: ${accessibility.metric.areaName} (${accessibility.distanceKm.toFixed(1)} km from selection), accessibility index ${accessibility.metric.accessibilityIndex}/100.`
      : null,
    nearestRoad
      ? `Nearest open-baseline road context: ${nearestRoad.road.name} (${nearestRoad.road.roadClass}), approximately ${nearestRoad.distanceKm.toFixed(1)} km from the selection.`
      : null,
    nearbyPoi.length > 0
      ? `Nearby open-baseline anchors: ${nearbyPoi.map(({ item }) => item.name).join(", ")}.`
      : null
  ].filter((item): item is string => Boolean(item));
  const openContextLimitation = "Open geospatial baseline fixtures are OSM-style sample context, not official GIS, parcel, zoning, planning or transport authority evidence.";

  return {
    ...analysis,
    summary: `${analysis.summary} ${openContextNotes[0] ?? "Open geospatial baseline fixtures add indicative access and anchor context."}`,
    keyFactors: [
      ...openContextNotes,
      ...analysis.keyFactors
    ],
    nextActions: [
      ...analysis.nextActions,
      "Validate open-baseline accessibility assumptions against dated OSM extracts, official transport data, and customer site requirements."
    ],
    limitations: [
      ...(analysis.limitations ?? []),
      openContextLimitation
    ],
    evidence: analysis.evidence.some((item) => item.id === evidence.id)
      ? analysis.evidence
      : [evidence, ...analysis.evidence]
  };
}

function isBrowserLocalSelection(selectedObject: SelectedDemoObject | null, selectedAoi: UserDrawnAoi | null) {
  const sourceMode = selectedObject?.analysisTarget?.sourceMode;
  return Boolean(
    selectedAoi ||
    sourceMode === "user-uploaded" ||
    sourceMode === "user-drawn" ||
    sourceMode === "manual-offline"
  );
}

async function fetchClimateScreeningContext(point: SelectedPoint): Promise<ClimateScreeningContext | null> {
  try {
    const response = await fetch("/api/context/climate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        latitude: point.latitude,
        longitude: point.longitude
      })
    });

    if (!response.ok) {
      return null;
    }

    return await response.json() as ClimateScreeningContext;
  } catch {
    return null;
  }
}

function withClimateScreeningContext(
  analysis: ExpressAnalysis,
  climateContext: ClimateScreeningContext | null
): ExpressAnalysis {
  if (!climateContext) {
    return analysis;
  }

  if (climateContext.status !== "connected") {
    return {
      ...analysis,
      limitations: Array.from(new Set([
        ...(analysis.limitations ?? []),
        climateContext.limitation,
        climateContext.caveat
      ]))
    };
  }

  const evidence = createEvidenceItem(
    "open-climate-screening-context",
    "open-meteo-climate",
    "Climate screening context",
    `${climateContext.climateDataMode}: heat proxy ${climateContext.heatExposureProxy}; rainfall proxy ${climateContext.rainfallProxy}. ${climateContext.caveat}`,
    climateContext.confidence
  );

  return {
    ...analysis,
    keyFactors: [
      `Climate screening: ${climateContext.note}`,
      ...analysis.keyFactors
    ],
    limitations: Array.from(new Set([
      ...(analysis.limitations ?? []),
      climateContext.limitation,
      climateContext.caveat
    ])),
    evidence: [
      evidence,
      ...analysis.evidence.filter((item) => item.id !== evidence.id)
    ]
  };
}

function formatLocationLabel(analysis: ExpressAnalysis) {
  return analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? `${analysis.point.latitude.toFixed(5)}, ${analysis.point.longitude.toFixed(5)}`;
}

function createHistoryItem(
  analysis: ExpressAnalysis,
  scenarioLabel: string,
  project: GeoAIProject,
  source: AnalysisHistoryItem["source"] = "local"
): AnalysisHistoryItem {
  return {
    id: `${analysis.id}-${analysis.generatedAt ?? Date.now()}`,
    title: analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? analysis.title,
    scenarioId: analysis.scenarioId,
    scenarioLabel,
    timestamp: analysis.generatedAt ?? new Date().toISOString(),
    locationLabel: formatLocationLabel(analysis),
    analysisMode: analysis.analysisMode,
    confidenceLevel: analysis.confidenceLevel,
    dataConfidenceLevel: analysis.marketContext?.confidenceLevel,
    source,
    project,
    projectKey: project.projectKey,
    recommendation: deriveDecisionPosture(analysis),
    analysis: {
      ...analysis,
      project
    }
  };
}

function readAnalysisHistory() {
  if (!isBrowserDemoStorageEnabled()) return [];

  try {
    const storedHistory = window.localStorage.getItem(analysisHistoryStorageKey);
    if (!storedHistory) {
      return [];
    }

    const parsed = JSON.parse(storedHistory) as AnalysisHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAnalysisHistory(items: AnalysisHistoryItem[]) {
  if (!isBrowserDemoStorageEnabled()) return;

  try {
    const counts = new Map<string, number>();
    const bounded = items
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .filter((item) => {
        const projectKey = item.projectKey ?? item.project?.projectKey;
        if (!projectKey) return false;
        const count = counts.get(projectKey) ?? 0;
        counts.set(projectKey, count + 1);
        return count < maxAnalysisHistoryItems;
      });
    window.localStorage.setItem(analysisHistoryStorageKey, JSON.stringify(bounded));
  } catch {
    // Local history is a convenience feature; storage failures should not affect analysis.
  }
}

function filterHistoryByProject(items: AnalysisHistoryItem[], projectKey: string) {
  return items.filter((item) => (item.projectKey ?? item.project?.projectKey) === projectKey);
}

function readActiveProjectKey() {
  if (!isBrowserDemoStorageEnabled()) return demoProjects[0].projectKey;

  try {
    return window.localStorage.getItem(activeProjectStorageKey) || demoProjects[0].projectKey;
  } catch {
    return demoProjects[0].projectKey;
  }
}

function readProjectKeyFromUrl(projects: GeoAIProject[]) {
  const params = new URLSearchParams(window.location.search);
  const projectKey = params.get("projectKey");
  const projectId = params.get("projectId");

  if (projectKey) {
    return projectKey;
  }

  if (!projectId) {
    return null;
  }

  return projects.find((project) => project.id === projectId || project.projectKey === projectId)?.projectKey ?? null;
}

function writeActiveProjectKey(projectKey: string) {
  if (!isBrowserDemoStorageEnabled()) return;

  try {
    window.localStorage.setItem(activeProjectStorageKey, projectKey);
  } catch {
    // Project selection still works in memory if localStorage is unavailable.
  }
}

function clearActiveProjectKey() {
  if (!isBrowserDemoStorageEnabled()) return;

  try {
    window.localStorage.removeItem(activeProjectStorageKey);
  } catch {
    // Invalid stored identity is ignored even if browser storage cannot be changed.
  }
}

function normalizeQuery(query: string) {
  return query.trim();
}

function readOpenAnalysisRequest() {
  if (!isBrowserDemoStorageEnabled()) return null;

  try {
    const raw = window.localStorage.getItem(openAnalysisRequestStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OpenAnalysisRequest;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function clearOpenAnalysisRequest() {
  if (!isBrowserDemoStorageEnabled()) return;

  try {
    window.localStorage.removeItem(openAnalysisRequestStorageKey);
  } catch {
    // One-time restore handoff is optional.
  }
}

function createTargetSignature(point: SelectedPoint | null, object: SelectedDemoObject | null, aoi: UserDrawnAoi | null = null) {
  if (!point) return "no-target";

  if (aoi) {
    return `aoi:${aoi.id}:${aoi.measurements.vertexCount}:${aoi.centroid.latitude.toFixed(6)}:${aoi.centroid.longitude.toFixed(6)}`;
  }

  const objectKey = object?.analysisTarget?.id ?? object?.spatialContext?.featureId ?? object?.id ?? "point";
  return `${object ? "object" : "point"}:${objectKey}:${point.latitude.toFixed(6)}:${point.longitude.toFixed(6)}`;
}

function createComparisonSignature(items: ComparisonItem[]) {
  return items.map((item) => item.id).sort().join("|");
}

function createExploreSettingsSignature({
  audience,
  role,
  interactionMode,
  filters
}: {
  audience: ExploreAudience;
  role: ExploreRole;
  interactionMode: InteractionMode;
  filters: ExploreFilters;
}) {
  const normalizedFilters = Object.entries(filters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${String(value)}`)
    .join("|");

  return `${audience}:${role}:${interactionMode}:${normalizedFilters}`;
}

function hasPendingQueryChange(currentQuery: string, lastQuery: string) {
  if (!currentQuery) {
    return false;
  }

  return currentQuery !== lastQuery;
}

function createCandidateSearchSignature({
  scenarioId,
  query,
  settingsSignature
}: {
  scenarioId: ExploreScenarioId;
  query: string;
  settingsSignature: string;
}) {
  return `${scenarioId}:${query}:${settingsSignature}`;
}

function getCandidateSearchActionLabel(scenarioId: ExploreScenarioId, status: CandidateSearchStatus) {
  if (status === "stale") {
    return "Update search";
  }

  const labels: Partial<Record<ExploreScenarioId, string>> = {
    b2b_redevelopment_selected_aoi: "Find redevelopment zones",
    b2b_redevelopment_100ha: "Find redevelopment zones",
    b2b_lowrise_luxury_residential: "Find residential projects",
    b2b_hotel_development: "Find hotel zones",
    b2b_commercial_real_estate: "Find commercial zones",
    b2c_new_residential_projects: "Find residential projects",
    b2c_tourist_objects_route: "Build route options",
    b2c_interest_routes: "Build route options"
  };

  return labels[scenarioId] ?? "Find candidates";
}

function filterAoisByProject(items: ProjectAoi[], projectKey: string) {
  return items
    .filter((item) => item.projectKey === projectKey)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function downloadJsonFile(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createMarketMetricsMetadata(analysis: ExpressAnalysis) {
  const match = analysis.marketMetricsMatch;

  return {
    marketMetricsSourceMode: match?.sourceMode ?? analysis.marketContext?.sourceMode ?? "seed_static",
    matchedMarketArea: match?.matchedAreaName ?? analysis.marketContext?.areaName ?? null,
    marketMetricMatchType: match?.matchType ?? null,
    marketMetricConfidence: match?.confidence ?? analysis.marketContext?.confidenceLevel ?? null,
    importedMetricsUsed: Boolean(match?.importedMetricsUsed),
    marketMetricsSnapshot: match?.metrics
      ? {
          areaName: match.metrics.areaName,
          transactionCount: match.metrics.transactionCount,
          transactionValueAed: match.metrics.transactionValueAed,
          medianPricePerSqm: match.metrics.medianPricePerSqm,
          rentalRecordCount: match.metrics.rentalRecordCount,
          medianRentPerSqm: match.metrics.medianRentPerSqm,
          projectCount: match.metrics.projectCount,
          pipelineProxy: match.metrics.pipelineProxy,
          liquidityIndex: match.metrics.liquidityIndex,
          rentalDemandProxy: match.metrics.rentalDemandProxy,
          dataConfidence: match.metrics.dataConfidence
        }
      : null
  };
}

function isPersistedAnalysisRun(value: unknown): value is PersistedAnalysisRun {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function historyItemFromPersistedRun(value: unknown): AnalysisHistoryItem | null {
  if (!isPersistedAnalysisRun(value)) {
    return null;
  }

  const analysis = value.result_json ?? value.result_payload;
  if (!analysis?.id || !analysis.point || !analysis.scenarioId) {
    return null;
  }

  const scenario = analysisScenarios.find((item) => item.id === analysis.scenarioId);
  const project = getDemoProject(value.project_key);
  if (!project) return null;

  return {
    id: value.id ?? value.run_key ?? analysis.id,
    title: value.selected_name ?? analysis.selectedObject?.name ?? analysis.title,
    scenarioId: analysis.scenarioId,
    scenarioLabel: scenario?.label ?? analysis.title,
    timestamp: value.created_at ?? analysis.generatedAt ?? new Date().toISOString(),
    locationLabel: formatLocationLabel(analysis),
    analysisMode: value.analysis_mode ?? analysis.analysisMode,
    confidenceLevel: value.confidence_level ?? analysis.confidenceLevel,
    dataConfidenceLevel: value.data_confidence_level ?? analysis.marketContext?.confidenceLevel,
    source: "DB",
    project,
    projectKey: value.project_key ?? project.projectKey,
    recommendation: value.decision_posture ?? deriveDecisionPosture(analysis),
    analysis: {
      ...analysis,
      project
    }
  };
}

type WorkspaceShellProps = {
  initialExploreMode?: boolean;
  spatialSourceRequest: SpatialSourceRequest;
};

export function WorkspaceShell({
  initialExploreMode = false,
  spatialSourceRequest
}: WorkspaceShellProps) {
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const workflowPanelRef = useRef<HTMLDivElement | null>(null);
  const mobileMapDialogRef = useRef<HTMLElement | null>(null);
  const mobileMapInitialFocusRef = useRef<HTMLButtonElement | null>(null);
  const mobileMapReturnFocusRef = useRef<HTMLElement | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [selectedObject, setSelectedObject] = useState<SelectedDemoObject | null>(null);
  const [selectedAoi, setSelectedAoi] = useState<UserDrawnAoi | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<AnalysisScenarioId>("realEstateDevelopment");
  const [customQuery, setCustomQuery] = useState("");
  const [selectedExploreAudience, setSelectedExploreAudience] = useState<ExploreAudience>("b2b");
  const [selectedExploreRole, setSelectedExploreRole] = useState<ExploreRole>(() => getDefaultRoleForAudience("b2b"));
  const [selectedExploreScenario, setSelectedExploreScenario] = useState<ExploreScenarioId>(() => getDefaultScenarioForAudience("b2b"));
  const [exploreInteractionMode, setExploreInteractionMode] = useState<InteractionMode>(() => getExploreScenario(getDefaultScenarioForAudience("b2b")).defaultInteractionMode);
  const [exploreFilters, setExploreFilters] = useState<ExploreFilters>(() => getDefaultFilters(getExploreScenario(getDefaultScenarioForAudience("b2b")).inputSchema));
  const [selectedExploreCandidateId, setSelectedExploreCandidateId] = useState<string | null>(null);
  const [candidateSearchStatus, setCandidateSearchStatus] = useState<CandidateSearchStatus>(() =>
    getExploreScenario(getDefaultScenarioForAudience("b2b")).defaultInteractionMode === "criteria_first" ? "ready" : "idle"
  );
  const [candidateCriteriaSignature, setCandidateCriteriaSignature] = useState<string | null>(null);
  const [searchedExploreCandidates, setSearchedExploreCandidates] = useState<ExploreCandidate[]>([]);
  const [analysis, setAnalysis] = useState<ExpressAnalysis | null>(null);
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparisonReturn, setComparisonReturn] = useState<ComparisonResult | null>(null);
  const [reportPreview, setReportPreview] = useState<"analysis" | "comparison" | null>(null);
  const [mapSnapshot, setMapSnapshot] = useState<ReportMapSnapshot | null>(null);
  const [comparisonMessage, setComparisonMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMobileMapPickerOpen, setIsMobileMapPickerOpen] = useState(false);
  const [lastAnalyzedState, setLastAnalyzedState] = useState<{
    query: string;
    scenarioId: AnalysisScenarioId;
    targetSignature: string;
    settingsSignature: string;
  } | null>(null);
  const [lastComparedState, setLastComparedState] = useState<{
    query: string;
    scenarioId: AnalysisScenarioId;
    comparisonSignature: string;
    settingsSignature: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [isMarketContextLoading, setIsMarketContextLoading] = useState(false);
  const [projects, setProjects] = useState<GeoAIProject[]>(demoProjects);
  const [, setProjectsMode] = useState<"supabase" | "demo_seed">("demo_seed");
  const [activeProject, setActiveProject] = useState<GeoAIProject>(demoProjects[0]);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [analysisHistorySource, setAnalysisHistorySource] = useState<"DB" | "local">("local");
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [uploadedDatasets, setUploadedDatasets] = useState<UploadedDataset[]>([]);
  const scopedUploadedDatasets = uploadedDatasets.filter((dataset) => dataset.projectKey === activeProject.projectKey);
  const [uploadedDataMessage, setUploadedDataMessage] = useState<string | null>(null);
  const [projectAois, setProjectAois] = useState<ProjectAoi[]>([]);
  const [aoiDraftName, setAoiDraftName] = useState("");
  const [aoiMessage, setAoiMessage] = useState<string | null>(null);
  const [activeGuidedDemoId, setActiveGuidedDemoId] = useState<string | null>(null);
  const [activeDemoNarrativeId, setActiveDemoNarrativeId] = useState<string | null>(null);
  const selectedExploreScenarioConfig = getExploreScenario(selectedExploreScenario);
  const currentQuery = normalizeQuery(customQuery);
  const currentExploreSettingsSignature = createExploreSettingsSignature({
    audience: selectedExploreAudience,
    role: selectedExploreRole,
    interactionMode: exploreInteractionMode,
    filters: exploreFilters
  });
  const currentCandidateCriteriaSignature = createCandidateSearchSignature({
    scenarioId: selectedExploreScenario,
    query: currentQuery,
    settingsSignature: currentExploreSettingsSignature
  });
  const exploreSelectedPointOrArea: ExploreSelectedPointOrArea = selectedAoi
    ? {
        label: selectedAoi.name,
        coordinates: [selectedAoi.centroid.longitude, selectedAoi.centroid.latitude],
        areaHint: "Selected AOI"
      }
    : selectedObject
      ? {
          label: selectedObject.name,
          coordinates: [selectedObject.center.longitude, selectedObject.center.latitude],
          areaHint: selectedObject.layerName
        }
      : selectedPoint
        ? {
            label: "Selected map point",
            coordinates: [selectedPoint.longitude, selectedPoint.latitude],
            areaHint: "Map-first context"
          }
        : {
            label: initialExploreMode ? "Explore criteria search" : "Workspace criteria search",
            areaHint: "No map target selected"
          };
  const generatedExploreCandidates = generateExploreCandidates({
    audience: selectedExploreAudience,
    role: selectedExploreRole,
    scenarioId: selectedExploreScenario,
    interactionMode: exploreInteractionMode,
    naturalLanguageQuery: customQuery || selectedExploreScenarioConfig.sampleQueries[0],
    filters: exploreFilters,
    selectedPointOrArea: exploreSelectedPointOrArea
  });
  const isCandidateSearchCurrent = Boolean(
    candidateSearchStatus === "searched" &&
      candidateCriteriaSignature === currentCandidateCriteriaSignature &&
      searchedExploreCandidates.length > 0
  );
  const visibleExploreCandidates = isCandidateSearchCurrent ? searchedExploreCandidates : [];
  const visibleProjects = projects.filter((project) => getProjectSegment(project) === selectedExploreAudience);
  const projectSelectorProjects = visibleProjects.length > 0 ? visibleProjects : [getDefaultProjectForAudience(projects, selectedExploreAudience)];

  function applyExploreDefaultsForAudience(audience: ExploreAudience) {
    const nextRole = getDefaultRoleForAudience(audience);
    const nextScenarioId = getDefaultScenarioForRole(audience, nextRole);
    const nextScenario = getExploreScenario(nextScenarioId);
    const nextAnalysisScenario = exploreScenarioToAnalysisScenario(nextScenarioId);

    setSelectedExploreAudience(audience);
    setSelectedExploreRole(nextRole);
    setSelectedExploreScenario(nextScenarioId);
    setExploreInteractionMode(nextScenario.defaultInteractionMode);
    setExploreFilters(getDefaultFilters(nextScenario.inputSchema));
    setSelectedScenario(nextAnalysisScenario);
    setCandidateSearchStatus(nextScenario.defaultInteractionMode === "criteria_first" ? "ready" : "idle");

    if (nextAnalysisScenario === "customQuery" && customQuery.trim().length === 0) {
      setCustomQuery(nextScenario.sampleQueries[0]);
    }
  }

  function applyExploreDefaultsForProject(project: GeoAIProject) {
    const nextAudience = getProjectSegment(project);
    const nextRole = getProjectExploreRole(project, nextAudience);
    const nextScenarioId = getProjectExploreScenario(project, nextAudience, nextRole);
    const nextScenario = getExploreScenario(nextScenarioId);
    const nextAnalysisScenario = exploreScenarioToAnalysisScenario(nextScenarioId);

    setSelectedExploreAudience(nextAudience);
    setSelectedExploreRole(nextRole);
    setSelectedExploreScenario(nextScenarioId);
    setExploreInteractionMode(nextScenario.defaultInteractionMode);
    setExploreFilters(getDefaultFilters(nextScenario.inputSchema));
    setSelectedScenario(nextAnalysisScenario);
    setCandidateSearchStatus(nextScenario.defaultInteractionMode === "criteria_first" ? "ready" : "idle");

    if (nextAnalysisScenario === "customQuery" && customQuery.trim().length === 0) {
      setCustomQuery(nextScenario.sampleQueries[0]);
    }
  }

  function clearWorkspaceResultState() {
    setSelectedPoint(null);
    setSelectedObject(null);
    setSelectedAoi(null);
    setMapSnapshot(null);
    setSelectedExploreCandidateId(null);
    setSearchedExploreCandidates([]);
    setCandidateCriteriaSignature(null);
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setReportPreview(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setAnalysisError(null);
    setComparisonMessage(null);
    setMarketContext(null);
    setAoiMessage(null);
  }

  function loadGuidedDemo(presetId: string, includeComparisonSites = false) {
    const preset = getGuidedDemoPreset(presetId);
    const narrative = getDemoNarrativeForGuidedDemo(preset.id);
    const demoDatasets = createGuidedDemoDatasets(preset.projectKey);
    const demoSelection = createGuidedDemoSelection(preset);
    const nextProject = projects.find((project) => project.projectKey === preset.projectKey) ?? getDemoProject(preset.projectKey);
    if (!nextProject) {
      setAnalysisError("The requested guided-demo project is unavailable; no substitute project was selected.");
      return;
    }

    updateUploadedDatasets((items) => [
      ...demoDatasets,
      ...items.filter((item) => !demoDatasets.some((dataset) => dataset.id === item.id && dataset.projectKey === item.projectKey))
    ]);
    setSelectedObject(demoSelection);
    setSelectedAoi(null);
    setSelectedPoint(demoSelection.center);
    setSelectedScenario(preset.scenarioId);
    {
      const nextExploreScenarioId = analysisScenarioToExploreScenario(preset.scenarioId);
      const nextExploreScenario = getExploreScenario(nextExploreScenarioId);
      setSelectedExploreAudience(nextExploreScenario.audience);
      setSelectedExploreRole(nextExploreScenario.defaultRoleHints[0]);
      setSelectedExploreScenario(nextExploreScenarioId);
      setExploreInteractionMode(nextExploreScenario.defaultInteractionMode);
      setExploreFilters(getDefaultFilters(nextExploreScenario.inputSchema));
      setSelectedExploreCandidateId(null);
    }
    setCustomQuery("");
    setActiveProject(nextProject);
    writeActiveProjectKey(nextProject.projectKey);
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setAnalysisError(null);
    setComparisonMessage(includeComparisonSites ? "Sample comparison sites loaded. Click Compare when ready." : null);
    setIsAnalyzing(false);
    setMarketContext(null);
    setActiveGuidedDemoId(preset.id);
    setActiveDemoNarrativeId(narrative?.id ?? null);
    setAoiMessage(null);

    if (includeComparisonSites) {
      setComparisonItems(createGuidedDemoComparisonItems(preset));
    }

    setUploadedDataMessage(
      `${preset.title} loaded with local demo CSV metrics and demo GeoJSON screening sites. Not official; validation required.`
    );
  }

  function loadDemoNarrative(narrativeId: string) {
    const narrative = getDemoNarrativeById(narrativeId);
    if (!narrative) {
      return;
    }

    loadGuidedDemo(narrative.guidedDemoPresetId);
    setActiveDemoNarrativeId(narrative.id);
  }

  useEffect(() => {
    setUploadedDatasets(readBrowserUploadedDatasets());
  }, []);

  useEffect(() => {
    setProjectAois(filterAoisByProject(readBrowserAois(), activeProject.projectKey));
  }, [activeProject.projectKey]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openAoiId = params.get("openAoi");
    if (!openAoiId || projectAois.length === 0) return;

    const requestedAoi = projectAois.find((item) => item.id === openAoiId);
    if (!requestedAoi) return;

    handleAoiSelect(projectAoiToUserDrawnAoi(requestedAoi));
    setAoiMessage("Saved AOI opened from the project library. You can analyze, compare or export it.");
    params.delete("openAoi");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
    // Run from the URL handoff only after AOIs are loaded for the active project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject.projectKey, projectAois]);

  useEffect(() => {
    if (selectedAoi) {
      setAoiDraftName(selectedAoi.name);
    }
  }, [selectedAoi]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guidedDemoId = params.get("guidedDemo");
    const demoNarrativeId = params.get("demoNarrativeId");

    if (demoNarrativeId) {
      loadDemoNarrative(demoNarrativeId);
      return;
    }

    if (guidedDemoId) {
      loadGuidedDemo(guidedDemoId);
    }
    // Run once from the initial URL only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openAnalysisId = params.get("openAnalysis");

    if (!openAnalysisId) {
      return;
    }

    const projectKey = params.get("projectKey") ?? readProjectKeyFromUrl(demoProjects);
    const restoreRequest = readOpenAnalysisRequest();
    const requestedAnalysis = restoreRequest?.analysis;
    const restoredAnalysisProjectKey = requestedAnalysis?.project?.projectKey ?? restoreRequest?.projectKey ?? null;
    const scenario = analysisScenarios.find((item) => item.id === requestedAnalysis?.scenarioId);

    if (
      requestedAnalysis &&
      projectKey &&
      restoredAnalysisProjectKey === projectKey &&
      restoreRequest?.projectKey === projectKey &&
      (requestedAnalysis.id === openAnalysisId || restoreRequest?.analysisId === openAnalysisId)
    ) {
      const restoredProject = requestedAnalysis.project ?? getDemoProject(restoreRequest?.projectKey ?? projectKey);
      if (!restoredProject) {
        setAnalysisError("The requested analysis project is unavailable; another demo project was not substituted.");
        clearOpenAnalysisRequest();
        return;
      }
      restoreAnalysisDashboard({
        id: `restore-${requestedAnalysis.id}`,
        title: requestedAnalysis.selectedObject?.name ?? requestedAnalysis.title,
        scenarioId: requestedAnalysis.scenarioId,
        scenarioLabel: scenario?.label ?? requestedAnalysis.title,
        timestamp: requestedAnalysis.generatedAt ?? new Date().toISOString(),
        locationLabel: formatLocationLabel(requestedAnalysis),
        analysisMode: requestedAnalysis.analysisMode,
        confidenceLevel: requestedAnalysis.confidenceLevel,
        dataConfidenceLevel: requestedAnalysis.marketContext?.confidenceLevel,
        source: "local",
        project: restoredProject,
        projectKey: restoredProject.projectKey,
        recommendation: deriveDecisionPosture(requestedAnalysis),
        analysis: {
          ...requestedAnalysis,
          customQuery: restoreRequest?.customQuery ?? requestedAnalysis.customQuery
        }
      }, projectKey);
      clearOpenAnalysisRequest();
      return;
    }

    const historyItem = projectKey ? filterHistoryByProject(readAnalysisHistory(), projectKey).find((item) =>
      item.id === openAnalysisId ||
      item.analysis.id === openAnalysisId ||
      `${item.analysis.id}-${item.analysis.generatedAt ?? ""}` === openAnalysisId
    ) : undefined;

    if (historyItem && projectKey) {
      restoreAnalysisDashboard(historyItem, projectKey);
      clearOpenAnalysisRequest();
    } else {
      setAnalysisError("The requested analysis was not restored because its project identity did not match the URL project.");
      clearOpenAnalysisRequest();
    }
    // Run once from initial URL only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const requestedProjectKey = readProjectKeyFromUrl(demoProjects);
    const storedProjectKey = requestedProjectKey ?? readActiveProjectKey();
    const localProjects = mergeProjectsWithLocal(demoProjects);
    const resolvedLocalProject = localProjects.find((project) => project.projectKey === storedProjectKey);
    const localProject = resolvedLocalProject ?? demoProjects[0];
    let isMounted = true;

    if (!resolvedLocalProject && storedProjectKey !== localProject.projectKey) {
      setAnalysisError(`Project '${storedProjectKey}' is unavailable. The invalid key was cleared and the workspace reset to the default public demo.`);
      clearActiveProjectKey();
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("projectKey");
      window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    }

    setProjects(localProjects);
    setActiveProject(localProject);
    applyExploreDefaultsForProject(localProject);

    fetch("/api/projects")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ProjectsResponse | null) => {
        if (!isMounted || !payload?.items?.length) {
          return;
        }

        const nextProjects = mergeProjectsWithLocal(payload.items);
        const urlProjectKey = readProjectKeyFromUrl(nextProjects);
        const nextActiveProject =
          nextProjects.find((project) => project.projectKey === (urlProjectKey ?? storedProjectKey)) ?? localProject;

        setProjects(nextProjects);
        setProjectsMode(payload.mode);
        setActiveProject(nextActiveProject);
        applyExploreDefaultsForProject(nextActiveProject);
        writeActiveProjectKey(nextActiveProject.projectKey);
      })
      .catch(() => {
        if (isMounted) {
          setProjects(localProjects);
          setProjectsMode("demo_seed");
          setActiveProject(localProject);
          applyExploreDefaultsForProject(localProject);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const localHistory = readAnalysisHistory();
    setAnalysisHistory(filterHistoryByProject(localHistory, activeProject.projectKey));
    setAnalysisHistorySource("local");

    let isMounted = true;

    fetch(`/api/analysis-runs?limit=10&projectKey=${encodeURIComponent(activeProject.projectKey)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: AnalysisRunsResponse | null) => {
        if (!isMounted || !payload) {
          return;
        }

        if (payload.mode !== "supabase") {
          setAnalysisHistorySource("local");
          return;
        }

        const dbHistory = payload.items
          .map((item) => historyItemFromPersistedRun(item))
          .filter((item): item is AnalysisHistoryItem => item !== null)
          .filter((item) => item.projectKey === activeProject.projectKey || item.project?.projectKey === activeProject.projectKey);

        setAnalysisHistory(dbHistory);
        setAnalysisHistorySource("DB");
      })
      .catch(() => {
        if (isMounted) {
          setAnalysisHistorySource("local");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeProject.projectKey]);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/db/health")
      .then((response) => (response.ok ? response.json() : null))
      .then((status: BackendStatus | null) => {
        if (isMounted) {
          setBackendStatus(status);
        }
      })
      .catch(() => {
        if (isMounted) {
          setBackendStatus(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isMobileMapPickerOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      mobileMapInitialFocusRef.current?.focus();
    });

    function handleDialogKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileMapPicker(true);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = mobileMapDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.getClientRects().length > 0);

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyboard);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDialogKeyboard);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMapPickerOpen]);

  useEffect(() => {
    if (!isMobileMapPickerOpen) return undefined;

    const desktopViewport = window.matchMedia("(min-width: 1367px)");
    const closeIfDesktop = () => {
      if (desktopViewport.matches) setIsMobileMapPickerOpen(false);
    };

    closeIfDesktop();
    desktopViewport.addEventListener("change", closeIfDesktop);
    return () => desktopViewport.removeEventListener("change", closeIfDesktop);
  }, [isMobileMapPickerOpen]);

  useEffect(() => {
    if (!selectedPoint || isBrowserLocalSelection(selectedObject, selectedAoi)) {
      setMarketContext(null);
      setIsMarketContextLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsMarketContextLoading(true);

    fetch("/api/context/market", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        point: selectedPoint,
        scenarioId: selectedScenario
      }),
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Market context unavailable");
        }

        return response.json() as Promise<MarketContext>;
      })
      .then((context) => setMarketContext(context))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setMarketContext(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsMarketContextLoading(false);
        }
      });

    return () => controller.abort();
  }, [selectedPoint, selectedObject, selectedAoi, selectedScenario]);

  function handlePointSelect(point: SelectedPoint) {
    setMapSnapshot(null);
    setSelectedPoint(point);
    setSelectedObject(null);
    setSelectedAoi(null);
    setSelectedExploreCandidateId(null);
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(null);
  }

  function handleObjectSelect(object: SelectedDemoObject) {
    setMapSnapshot(null);
    setSelectedObject(object);
    setSelectedAoi(null);
    setSelectedPoint(object.center);
    setSelectedExploreCandidateId(null);
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(null);
  }

  function handleObjectClearAfterSourceRollback() {
    setMapSnapshot(null);
    setSelectedObject(null);
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(null);
  }

  function handleAoiSelect(aoi: UserDrawnAoi) {
    setMapSnapshot(null);
    setSelectedAoi(aoi);
    setSelectedObject(null);
    setSelectedPoint(aoi.centroid);
    setSelectedExploreCandidateId(null);
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(null);
    setAoiDraftName(aoi.name);
    setAoiMessage(null);
  }

  function handleAoiDelete() {
    setMapSnapshot(null);
    setSelectedAoi(null);
    setSelectedPoint(null);
    setSelectedExploreCandidateId(null);
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(null);
    setAoiDraftName("");
    setAoiMessage(null);
  }

  function resetCandidateSearchForCriteriaChange(nextMode: InteractionMode = exploreInteractionMode) {
    setCandidateCriteriaSignature(null);
    setSearchedExploreCandidates([]);
    setCandidateSearchStatus((currentStatus) => {
      if (nextMode !== "criteria_first") {
        return "idle";
      }

      return currentStatus === "searched" || currentStatus === "stale" ? "stale" : "ready";
    });

    if (selectedExploreCandidateId) {
      setSelectedExploreCandidateId(null);
      setSelectedPoint(null);
      setSelectedObject(null);
      setSelectedAoi(null);
      setMarketContext(null);
    }

    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
  }

  function changeExploreAudience(audience: ExploreAudience) {
    const currentProjectMatchesAudience = getProjectSegment(activeProject) === audience;
    const nextProject = currentProjectMatchesAudience ? activeProject : getDefaultProjectForAudience(projects, audience);

    applyExploreDefaultsForAudience(audience);
    if (nextProject.projectKey !== activeProject.projectKey) {
      setActiveProject(nextProject);
      writeActiveProjectKey(nextProject.projectKey);
    }
    clearWorkspaceResultState();
  }

  function changeExploreRole(role: ExploreRole) {
    const nextRole = isExploreRoleForAudience(selectedExploreAudience, role)
      ? role
      : getDefaultRoleForAudience(selectedExploreAudience);
    const nextScenarioId = getDefaultScenarioForRole(selectedExploreAudience, nextRole);
    const nextScenario = getExploreScenario(nextScenarioId);
    const nextAnalysisScenario = exploreScenarioToAnalysisScenario(nextScenarioId);

    setSelectedExploreRole(nextRole);
    setSelectedExploreScenario(nextScenarioId);
    setExploreInteractionMode(nextScenario.defaultInteractionMode);
    setExploreFilters(getDefaultFilters(nextScenario.inputSchema));
    setSelectedExploreCandidateId(null);
    setSearchedExploreCandidates([]);
    setCandidateCriteriaSignature(null);
    setCandidateSearchStatus(nextScenario.defaultInteractionMode === "criteria_first" ? "ready" : "idle");
    if (selectedExploreCandidateId) {
      setSelectedPoint(null);
      setSelectedObject(null);
      setSelectedAoi(null);
      setMarketContext(null);
    }
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setSelectedScenario(nextAnalysisScenario);
    setAnalysisError(null);
    setComparisonMessage(null);
    if (nextAnalysisScenario === "customQuery" && customQuery.trim().length === 0) {
      setCustomQuery(nextScenario.sampleQueries[0]);
    }
  }

  function changeExploreScenario(scenarioId: ExploreScenarioId) {
    const nextScenarioId = isExploreScenarioForRole(selectedExploreAudience, selectedExploreRole, scenarioId)
      ? scenarioId
      : getDefaultScenarioForRole(selectedExploreAudience, selectedExploreRole);
    const nextScenario = getExploreScenario(nextScenarioId);
    const nextAnalysisScenario = exploreScenarioToAnalysisScenario(nextScenarioId);

    setSelectedExploreScenario(nextScenarioId);
    setExploreInteractionMode(nextScenario.defaultInteractionMode);
    setExploreFilters(getDefaultFilters(nextScenario.inputSchema));
    setSelectedExploreCandidateId(null);
    setSearchedExploreCandidates([]);
    setCandidateCriteriaSignature(null);
    setCandidateSearchStatus(nextScenario.defaultInteractionMode === "criteria_first" ? "ready" : "idle");
    if (selectedExploreCandidateId) {
      setSelectedPoint(null);
      setSelectedObject(null);
      setSelectedAoi(null);
      setMarketContext(null);
    }
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setSelectedScenario(nextAnalysisScenario);
    setAnalysisError(null);
    setComparisonMessage(null);
    if (nextAnalysisScenario === "customQuery" && customQuery.trim().length === 0) {
      setCustomQuery(nextScenario.sampleQueries[0]);
    }
  }

  function changeExploreInteractionMode(mode: InteractionMode) {
    setExploreInteractionMode(mode);
    resetCandidateSearchForCriteriaChange(mode);
    setAnalysisError(null);
    setComparisonMessage(null);
  }

  function updateExploreFilter(id: string, value: ExploreFilters[string]) {
    setExploreFilters((current) => ({
      ...current,
      [id]: value
    }));
    resetCandidateSearchForCriteriaChange();
    setAnalysisError(null);
    setComparisonMessage(null);
  }

  function selectExploreCandidate(candidateId: string) {
    const candidate = visibleExploreCandidates.find((item) => item.id === candidateId);
    if (!candidate) {
      return;
    }

    const point = exploreCandidateToSelectedPoint(candidate);
    setSelectedExploreCandidateId(candidate.id);
    setSelectedPoint(point);
    setSelectedObject(exploreCandidateToSelectedObject(candidate));
    setSelectedAoi(null);
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage("Explore candidate selected as the analysis target.");
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(null);
  }

  function updateProjectAois(updater: (items: ProjectAoi[]) => ProjectAoi[]) {
    const allAois = readBrowserAois();
    const otherProjectAois = allAois.filter((item) => item.projectKey !== activeProject.projectKey);
    const currentProjectAois = filterAoisByProject(allAois, activeProject.projectKey);
    const nextProjectAois = filterAoisByProject(updater(currentProjectAois), activeProject.projectKey);
    writeBrowserAois([...nextProjectAois, ...otherProjectAois]);
    setProjectAois(nextProjectAois);
    return nextProjectAois;
  }

  function saveSelectedAoi() {
    if (!selectedAoi) {
      setAoiMessage("Draw or import an AOI before saving.");
      return;
    }

    const existing = projectAois.find((item) => item.id === selectedAoi.savedAoiId || item.id === selectedAoi.id);
    const nextAoi = userDrawnAoiToProjectAoi(selectedAoi, {
      projectId: activeProject.id ?? null,
      projectKey: activeProject.projectKey,
      name: aoiDraftName,
      sourceType: selectedAoi.sourceType,
      dataMode: selectedAoi.dataMode
    });
    const savedAoi = {
      ...nextAoi,
      id: existing?.id ?? nextAoi.id,
      createdAt: existing?.createdAt ?? nextAoi.createdAt,
      analysisCount: existing?.analysisCount ?? nextAoi.analysisCount,
      reportCount: existing?.reportCount ?? nextAoi.reportCount
    };

    updateProjectAois((items) => [savedAoi, ...items.filter((item) => item.id !== savedAoi.id)]);
    setSelectedAoi(projectAoiToUserDrawnAoi(savedAoi));
    setAoiDraftName(savedAoi.name);
    setAoiMessage("AOI saved to this browser-local project library. Official validation required.");
  }

  function openSavedAoi(aoi: ProjectAoi) {
    handleAoiSelect(projectAoiToUserDrawnAoi(aoi));
    setAoiMessage("Saved AOI opened. You can analyze, compare or export it.");
  }

  function renameSavedAoi(aoi: ProjectAoi, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    let renamedAoi: ProjectAoi | null = null;
    updateProjectAois((items) =>
      items.map((item) => {
        if (item.id !== aoi.id) return item;
        renamedAoi = { ...item, name: trimmedName, updatedAt: new Date().toISOString() };
        return renamedAoi;
      })
    );

    if (!renamedAoi) return;

    if (selectedAoi?.savedAoiId === aoi.id || selectedAoi?.id === aoi.id) {
      setSelectedAoi(projectAoiToUserDrawnAoi(renamedAoi));
      setAoiDraftName(trimmedName);
    }
    setAoiMessage("AOI renamed in this browser-local project library.");
  }

  function deleteSavedAoi(aoiId: string) {
    updateProjectAois((items) => items.filter((item) => item.id !== aoiId));
    if (selectedAoi?.savedAoiId === aoiId || selectedAoi?.id === aoiId) {
      handleAoiDelete();
    }
    setAoiMessage("AOI removed from this project library.");
  }

  function exportSelectedAoi() {
    if (!selectedAoi) {
      setAoiMessage("Draw, import or open an AOI before exporting.");
      return;
    }

    downloadJsonFile(safeAoiFilename(selectedAoi.name), createAoiGeojsonFeature(selectedAoi));
    setAoiMessage("AOI exported as GeoJSON with validation caveat.");
  }

  function exportSavedAoi(aoi: ProjectAoi) {
    downloadJsonFile(safeAoiFilename(aoi.name), createAoiGeojsonFeature(aoi));
    setAoiMessage("Saved AOI exported as GeoJSON with validation caveat.");
  }

  async function importAoiGeojson(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setAoiMessage("GeoJSON file is too large for v1.8. Keep AOI imports under 5 MB.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseGeojsonAoi(text, {
        projectId: activeProject.id ?? null,
        projectKey: activeProject.projectKey,
        fileName: file.name
      });

      if (!parsed.ok) {
        setAoiMessage(parsed.message);
        return;
      }

      handleAoiSelect(parsed.aoi);
      setAoiDraftName(parsed.aoi.name);
      setAoiMessage(parsed.warning
        ? `${parsed.warning} AOI is user-provided and requires official validation.`
        : "Imported GeoJSON AOI selected. Save it to keep it in this project library.");
    } catch {
      setAoiMessage("Invalid GeoJSON file.");
    }
  }

  function addSelectionToComparison() {
    if (!selectedPoint) {
      return;
    }

    const comparisonItem = createComparisonItem(
      selectedPoint,
      selectedObject,
      selectedScenario,
      selectedAoi
    );

    if (comparisonItems.some((item) => item.id === comparisonItem.id)) {
      setComparisonMessage("This selection is already in the comparison set.");
      return;
    }

    if (comparisonItems.length >= 3) {
      setComparisonMessage("Comparison set is limited to 3 items.");
      return;
    }

    setComparisonItems((items) => [...items, comparisonItem]);
    setLastComparedState(null);
    setComparisonMessage("Selection added to comparison.");
  }

  function removeComparisonItem(itemId: string) {
    setComparisonItems((items) => items.filter((item) => item.id !== itemId));
    setComparison(null);
    setComparisonReturn(null);
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage(null);
  }

  function runCandidateSearch() {
    if (exploreInteractionMode !== "criteria_first") {
      return;
    }

    const nextCandidates = generatedExploreCandidates.slice(0, 6);

    setSearchedExploreCandidates(nextCandidates);
    setCandidateCriteriaSignature(currentCandidateCriteriaSignature);
    setCandidateSearchStatus("searched");
    setSelectedExploreCandidateId(null);
    setComparisonItems([]);
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setAnalysisError(null);
    setComparisonMessage(
      nextCandidates.length > 0
        ? `${nextCandidates.length} candidate result${nextCandidates.length === 1 ? "" : "s"} found.`
        : "No candidate zones matched the current criteria."
    );

    if (selectedExploreCandidateId) {
      setSelectedPoint(null);
      setSelectedObject(null);
      setSelectedAoi(null);
      setMarketContext(null);
    }
  }

  function createCandidateComparisonItems() {
    const byId = new Map<string, ComparisonItem>();

    for (const candidate of visibleExploreCandidates.slice(0, 3)) {
      const point = exploreCandidateToSelectedPoint(candidate);
      const object = exploreCandidateToSelectedObject(candidate);
      const item = createComparisonItem(point, object, selectedScenario);
      byId.set(item.id, item);
    }

    return Array.from(byId.values());
  }

  function runComparison() {
    if (comparisonItems.length < 2) {
      setComparisonMessage("Add at least 2 items before comparing.");
      return;
    }

    setAnalysis(null);
    setComparisonReturn(null);
    setAnalysisError(null);
    setComparisonMessage(null);
    const comparisonResult = {
      ...createMockComparison(comparisonItems, customQuery),
      project: activeProject
    };
    setComparison(comparisonResult);
    setLastComparedState({
      query: normalizeQuery(customQuery),
      scenarioId: selectedScenario,
      comparisonSignature: createComparisonSignature(comparisonItems),
      settingsSignature: createExploreSettingsSignature({
        audience: selectedExploreAudience,
        role: selectedExploreRole,
        interactionMode: exploreInteractionMode,
        filters: exploreFilters
      })
    });
    void persistComparisonSet(comparisonResult);
    setReportPreview(null);
  }

  function runCandidateComparison() {
    if (!isCandidateSearchCurrent) {
      setComparisonMessage("Search candidate zones again before comparing.");
      setCandidateSearchStatus(candidateSearchStatus === "searched" ? "stale" : candidateSearchStatus);
      return;
    }

    const candidateItems = createCandidateComparisonItems();

    if (candidateItems.length < 2) {
      setComparisonMessage("Criteria search needs at least 2 candidates before comparing.");
      return;
    }

    const comparisonResult = {
      ...createMockComparison(candidateItems, customQuery),
      project: activeProject
    };

    setComparisonItems(candidateItems);
    setAnalysis(null);
    setComparisonReturn(null);
    setAnalysisError(null);
    setComparisonMessage("Criteria-first shortlist ranked. Open any candidate for its dashboard.");
    setComparison(comparisonResult);
    setLastComparedState({
      query: normalizeQuery(customQuery),
      scenarioId: selectedScenario,
      comparisonSignature: createComparisonSignature(candidateItems),
      settingsSignature: createExploreSettingsSignature({
        audience: selectedExploreAudience,
        role: selectedExploreRole,
        interactionMode: exploreInteractionMode,
        filters: exploreFilters
      })
    });
    void persistComparisonSet(comparisonResult);
    setReportPreview(null);
  }

  function openComparisonItemDashboard(item: ComparisonItem) {
    const itemSelectedObject = item.selectedObject ?? null;
    const itemSelectedAoi = item.selectedAoi ?? null;
    const scenario = analysisScenarios.find((scenarioItem) => scenarioItem.id === item.scenarioId) ?? analysisScenarios[0];
    const uploadedDataContext = buildUploadedDataContext(scopedUploadedDatasets, item.point, itemSelectedObject);
    const candidateAnalysis = withUploadedDataContext(
      withOpenGeodataContext({
        ...createMockExpressAnalysis(
          item.point,
          item.scenarioId,
          customQuery,
          itemSelectedObject,
          itemSelectedAoi
        ),
        project: activeProject,
        analysisMode: "mock_fallback",
        confidenceLevel: "medium",
        analysisNotice: "Opened from the criteria-first shortlist. Uses deterministic screening context; official validation required.",
        generatedAt: new Date().toISOString(),
        analysisTarget: itemSelectedAoi
          ? {
              id: itemSelectedAoi.id,
              type: "user-drawn-aoi" as const,
              label: itemSelectedAoi.name,
              coordinates: itemSelectedAoi.centroid,
              geometry: itemSelectedAoi.geometry,
              bbox: itemSelectedAoi.bbox,
              measurements: itemSelectedAoi.measurements,
              sourceMode: "user-drawn" as const,
              officialStatus: "official-validation-required" as const
            }
          : itemSelectedObject?.analysisTarget ?? {
              id: `point-${item.point.latitude.toFixed(6)}-${item.point.longitude.toFixed(6)}`,
              type: "point" as const,
              label: item.name,
              coordinates: item.point,
              geometry: {
                type: "Point",
                coordinates: [item.point.longitude, item.point.latitude]
              },
              sourceMode: "demo" as const,
              officialStatus: "not-official" as const
            }
      }),
      uploadedDataContext
    );
    const activeComparison = comparison ?? comparisonReturn;
    const activeCandidateId = itemSelectedObject?.analysisTarget?.id ?? itemSelectedObject?.id.replace(/^explore-/, "") ?? null;

    setSelectedPoint(item.point);
    setSelectedObject(itemSelectedObject);
    setSelectedAoi(itemSelectedAoi);
    setSelectedScenario(item.scenarioId);
    setSelectedExploreCandidateId(activeCandidateId);
    setComparisonReturn(activeComparison);
    setComparison(null);
    setAnalysis(candidateAnalysis);
    setLastAnalyzedState({
      query: normalizeQuery(customQuery),
      scenarioId: item.scenarioId,
      targetSignature: createTargetSignature(item.point, itemSelectedObject, itemSelectedAoi),
      settingsSignature: createExploreSettingsSignature({
        audience: selectedExploreAudience,
        role: selectedExploreRole,
        interactionMode: exploreInteractionMode,
        filters: exploreFilters
      })
    });
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(null);
    saveAnalysisHistory(candidateAnalysis, scenario.label);
    void persistAnalysisRun(candidateAnalysis, scenario.label);
  }

  function returnToCandidateComparison() {
    if (!comparisonReturn) {
      backToMap();
      return;
    }

    setAnalysis(null);
    setComparison(comparisonReturn);
    setSelectedExploreCandidateId(null);
    setComparisonReturn(null);
    setReportPreview(null);
    setAnalysisError(null);
  }

  function scrollPageToTop(behavior: ScrollBehavior = "smooth") {
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior });
    }, 0);
  }

  function scrollToWorkflowPanel() {
    window.setTimeout(() => {
      workflowPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function closeMobileMapPicker(returnToWorkflow = false) {
    const returnFocusTarget = mobileMapReturnFocusRef.current;
    setIsMobileMapPickerOpen(false);

    if (returnToWorkflow) {
      scrollToWorkflowPanel();
    }

    window.requestAnimationFrame(() => {
      returnFocusTarget?.focus();
      mobileMapReturnFocusRef.current = null;
    });
  }

  function showAnalysisResult(nextAnalysis: ExpressAnalysis) {
    setIsMobileMapPickerOpen(false);
    setAnalysis(nextAnalysis);
    scrollPageToTop();
  }

  function backToMap() {
    setIsMobileMapPickerOpen(false);
    setAnalysis(null);
    setComparison(null);
    setComparisonReturn(null);
    setReportPreview(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
  }

  function openMapFromPanel() {
    mobileMapReturnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    backToMap();
    if (window.matchMedia("(min-width: 1367px)").matches) {
      window.setTimeout(() => {
        mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
      return;
    }

    setIsMobileMapPickerOpen(true);
  }

  function saveAnalysisHistory(analysisResult: ExpressAnalysis, scenarioLabel: string) {
    const historyItem = createHistoryItem(analysisResult, scenarioLabel, activeProject, analysisHistorySource);

    setAnalysisHistory(() => {
      const storedItems = readAnalysisHistory();
      const projectItems = [
        historyItem,
        ...filterHistoryByProject(storedItems, activeProject.projectKey)
          .filter((item) => item.analysis.id !== analysisResult.id)
      ].slice(0, maxAnalysisHistoryItems);
      const nextItems = [
        ...projectItems,
        ...storedItems.filter((item) => (item.projectKey ?? item.project?.projectKey) !== activeProject.projectKey)
      ];

      writeAnalysisHistory(nextItems);
      return filterHistoryByProject(nextItems, activeProject.projectKey);
    });
  }

  async function persistAnalysisRun(_analysisResult: ExpressAnalysis, _scenarioLabel: string) {
    // saveAnalysisHistory is the authoritative project-scoped browser store in public-demo mode.
  }

  async function persistComparisonSet(comparisonResult: ComparisonResult) {
    const createdAt = new Date().toISOString();
    upsertBrowserProjectArtifact({
      id: `${activeProject.projectKey}-${comparisonResult.id}`,
      projectId: activeProject.id,
      projectKey: activeProject.projectKey,
      type: "comparison",
      title: "Site Comparison Intelligence",
      createdAt,
      sourceSummary: `Best option: ${comparisonResult.winner.item.name}. Browser-local screening comparison; official validation required.`
    });
    setComparisonMessage("Comparison saved in this browser for the active project.");
  }

  function createAnalysisReportPayload(analysisResult: ExpressAnalysis) {
    const marketMetrics = createMarketMetricsMetadata(analysisResult);

    return {
      analysisRunId: analysisResult.id,
      runKey: analysisResult.id,
      project: activeProject,
      ...marketMetrics,
      title: "Express Analysis / Investment Memo",
      selectedSite: analysisResult.selectedAoi?.name ?? analysisResult.selectedObject?.name ?? "Custom map selection",
      selectedObject: analysisResult.selectedObject ?? null,
      selectedAoi: analysisResult.selectedAoi ?? null,
      coordinates: analysisResult.point,
      scenario: analysisResult.title,
      customQuery: analysisResult.customQuery ?? null,
      customQueryIntent: analysisResult.customQueryIntent ?? null,
      customQuerySummary: analysisResult.customQuerySummary ?? null,
      customQueryAnswer: analysisResult.customQueryAnswer ?? null,
      memoJson: analysisResult,
      decisionPosture: deriveDecisionPosture(analysisResult),
      scoreOverview: analysisResult.scores,
      keyValueDrivers: analysisResult.keyFactors,
      criticalConstraints: analysisResult.risks,
      dataGaps: analysisResult.limitations ?? [
        "Official parcel, transaction, planning, imagery, and customer evidence are not connected yet."
      ],
      dueDiligenceChecklist: analysisResult.nextActions,
      evidenceSourceReadiness: analysisResult.evidence,
      uploadedDataContext: analysisResult.uploadedDataContext ?? null,
      limitations: analysisResult.limitations ?? [],
      mapSnapshot,
      generatedAt: new Date().toISOString()
    };
  }

  function createComparisonReportPayload(comparisonResult: ComparisonResult) {
    return {
      title: "Site Comparison Investment Memo",
      project: activeProject,
      comparedItems: comparisonResult.items.map((item) => ({
        name: item.item.name,
        type: item.item.itemType,
        coordinates: item.item.point,
        scenario: item.item.scenarioLabel,
        overallScore: item.overallScore,
        riskLevel: item.riskLevel,
        recommendedUse: item.recommendedUse,
        keyConcern: item.keyConcern,
        marketMetrics: {
          marketMetricsSourceMode: item.marketMetricsMatch?.sourceMode ?? "seed_static",
          matchedMarketArea: item.marketMetricsMatch?.matchedAreaName ?? null,
          marketMetricMatchType: item.marketMetricsMatch?.matchType ?? null,
          marketMetricConfidence: item.marketMetricsMatch?.confidence ?? null,
          importedMetricsUsed: Boolean(item.marketMetricsMatch?.importedMetricsUsed),
          marketMetricsSnapshot: item.marketMetricsMatch?.metrics ?? null
        }
      })),
      scenario: "Comparison",
      customQuery: comparisonResult.customQuery ?? null,
      customQueryIntent: comparisonResult.customQueryIntent ?? null,
      customQueryAnswer: comparisonResult.customQueryAnswer ?? null,
      comparisonJson: comparisonResult,
      decisionPosture: `Best option: ${comparisonResult.winner.item.name}`,
      scoreOverview: comparisonResult.items.map((item) => ({
        itemName: item.item.name,
        scores: item.scores,
        overallScore: item.overallScore
      })),
      keyValueDrivers: comparisonResult.sharedOpportunities,
      criticalConstraints: comparisonResult.differentiatedRisks,
      dataGaps: [
        "Financial assumptions, official land-use validation, and customer requirements are not persisted yet."
      ],
      dueDiligenceChecklist: comparisonResult.nextActions,
      evidenceSourceReadiness: comparisonResult.evidence,
      limitations: [
        "Comparison uses deterministic sample scoring and structured evidence readiness, not a validated underwriting model."
      ],
      generatedAt: new Date().toISOString()
    };
  }

  function createPrintableSessionReport(mode: "analysis" | "comparison", reportKey: string) {
    if (mode === "analysis" && analysis) {
      return {
        id: reportKey,
        projectId: activeProject.id ?? null,
        projectKey: activeProject.projectKey,
        reportType: "analysis",
        title: "Express Analysis / Investment Memo",
        scenario: analysis.title,
        targetLabel: analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? "Custom map selection",
        reportPayload: createAnalysisReportPayload(analysis),
        createdAt: new Date().toISOString()
      };
    }

    if (mode === "comparison" && comparison) {
      return {
        id: reportKey,
        projectId: activeProject.id ?? null,
        projectKey: activeProject.projectKey,
        reportType: "comparison",
        title: "Site Comparison Investment Memo",
        scenario: "Comparison",
        targetLabel: comparison.items.map((item) => item.item.name).join(", "),
        reportPayload: createComparisonReportPayload(comparison),
        createdAt: new Date().toISOString()
      };
    }

    return null;
  }

  async function persistReport(mode: "analysis" | "comparison") {
    const reportKey = mode === "analysis" && analysis
      ? `analysis-report-${activeProject.projectKey}-${analysis.id}`
      : mode === "comparison" && comparison
        ? `comparison-report-${activeProject.projectKey}-${comparison.id}`
        : null;

    if (!reportKey) {
      return null;
    }

    const reportTitle = mode === "analysis" ? "Express Analysis / Investment Memo" : "Site Comparison Investment Memo";
    const targetLabel = mode === "analysis"
      ? analysis?.selectedAoi?.name ?? analysis?.selectedObject?.name ?? "Custom map selection"
      : comparison?.items.map((item) => item.item.name).join(", ") ?? null;
    upsertBrowserProjectArtifact({
      id: reportKey,
      projectId: activeProject.id,
      projectKey: activeProject.projectKey,
      type: "report",
      reportType: mode,
      title: reportTitle,
      targetLabel,
      createdAt: new Date().toISOString(),
      sourceSummary: "Browser-local printable screening report; official validation required."
    });

    return reportKey;
  }

  async function openAnalysisReport() {
    await persistReport("analysis");
    setReportPreview("analysis");
  }

  async function openComparisonReport() {
    await persistReport("comparison");
    setReportPreview("comparison");
  }

  async function exportPrintableReport(mode: "analysis" | "comparison") {
    if (isExporting) {
      return;
    }

    const hasPrintableResult = mode === "analysis" ? Boolean(analysis) : Boolean(comparison);
    if (!hasPrintableResult) {
      setAnalysisError("Printable report could not be prepared. Run an analysis or comparison first.");
      return;
    }

    setIsExporting(true);
    setAnalysisError(null);

    try {
      const reportKey = await persistReport(mode);
      if (!reportKey) {
        setAnalysisError("Printable report could not be prepared. Please retry.");
        return;
      }

      const sessionRecord = createPrintableSessionReport(mode, reportKey);
      if (sessionRecord && isBrowserDemoStorageEnabled()) {
        const serializedReport = JSON.stringify(sessionRecord);
        const storageKey = browserDemoStorageKey(`print-report:${reportKey}`);
        window.sessionStorage.setItem(storageKey, serializedReport);
        window.localStorage.setItem(storageKey, serializedReport);
      }

      window.location.assign(`/reports/${encodeURIComponent(reportKey)}/print`);
    } catch {
      setAnalysisError("Printable report could not be prepared. Please retry.");
      setIsExporting(false);
    }
  }

  function changeActiveProject(projectKey: string) {
    const nextProject = projects.find((project) => project.projectKey === projectKey) ?? getDemoProject(projectKey);
    if (!nextProject) {
      setAnalysisError(`Project '${projectKey}' is unavailable; the active project was not changed.`);
      return;
    }

    setActiveProject(nextProject);
    writeActiveProjectKey(nextProject.projectKey);
    applyExploreDefaultsForProject(nextProject);
    clearWorkspaceResultState();
  }

  function activateProject(project: GeoAIProject) {
    setProjects((currentProjects) => {
      const byKey = new Map(currentProjects.map((item) => [item.projectKey, item]));
      byKey.set(project.projectKey, project);
      return Array.from(byKey.values());
    });
    setActiveProject(project);
    writeActiveProjectKey(project.projectKey);
    applyExploreDefaultsForProject(project);
    clearWorkspaceResultState();
  }

  function createProject(input: LocalProjectInput) {
    const localProject = createLocalProject(input);
    saveLocalProject(localProject);
    setProjectsMode("demo_seed");
    activateProject(localProject);
  }

  function restoreAnalysisDashboard(item: AnalysisHistoryItem, expectedProjectKey = activeProject.projectKey) {
    const itemProjectKey = item.projectKey ?? item.project?.projectKey ?? item.analysis.project?.projectKey ?? null;
    if (!itemProjectKey || itemProjectKey !== expectedProjectKey) {
      setAnalysisError("The requested analysis belongs to another project and was not restored.");
      return;
    }
    const restoredCustomQuery = normalizeQuery(item.analysis.customQuery ?? "");
    const restoredProject = item.project ?? item.analysis.project ?? getDemoProject(item.projectKey);
    if (!restoredProject || restoredProject.projectKey !== expectedProjectKey) {
      setAnalysisError(`Project '${item.projectKey ?? "unknown"}' is unavailable; the analysis was not restored into another project.`);
      return;
    }
    const restoredAnalysis = {
      ...item.analysis,
      project: restoredProject
    };

    setSelectedPoint(restoredAnalysis.point);
    setSelectedObject(restoredAnalysis.selectedObject ?? null);
    setSelectedAoi(restoredAnalysis.selectedAoi ?? null);
    setSelectedScenario(restoredAnalysis.scenarioId);
    const nextExploreAudience = getProjectSegment(restoredProject);
    const nextExploreRole = getProjectExploreRole(restoredProject, nextExploreAudience);
    const mappedExploreScenarioId = analysisScenarioToExploreScenario(restoredAnalysis.scenarioId);
    const nextExploreScenarioId = isExploreScenarioForRole(nextExploreAudience, nextExploreRole, mappedExploreScenarioId)
      ? mappedExploreScenarioId
      : getProjectExploreScenario(restoredProject, nextExploreAudience, nextExploreRole);
    const nextExploreScenario = getExploreScenario(nextExploreScenarioId);
    const nextExploreFilters = getDefaultFilters(nextExploreScenario.inputSchema);

    setSelectedExploreAudience(nextExploreAudience);
    setSelectedExploreRole(nextExploreRole);
    setSelectedExploreScenario(nextExploreScenarioId);
    setExploreInteractionMode(nextExploreScenario.defaultInteractionMode);
    setExploreFilters(nextExploreFilters);
    setSelectedExploreCandidateId(null);
    setCustomQuery(restoredCustomQuery);
    setAnalysis(restoredAnalysis);
    setLastAnalyzedState({
      query: restoredCustomQuery,
      scenarioId: restoredAnalysis.scenarioId,
      targetSignature: createTargetSignature(restoredAnalysis.point, restoredAnalysis.selectedObject ?? null, restoredAnalysis.selectedAoi ?? null),
      settingsSignature: createExploreSettingsSignature({
        audience: nextExploreAudience,
        role: nextExploreRole,
        interactionMode: nextExploreScenario.defaultInteractionMode,
        filters: nextExploreFilters
      })
    });
    if (restoredProject) {
      setActiveProject(restoredProject);
      writeActiveProjectKey(restoredProject.projectKey);
    }
    setComparison(null);
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(restoredAnalysis.marketContext ?? null);
  }

  function openHistoryItem(item: AnalysisHistoryItem) {
    restoreAnalysisDashboard(item);
  }

  function clearAnalysisHistory() {
    setAnalysisHistory([]);
    writeAnalysisHistory(readAnalysisHistory().filter((item) => (item.projectKey ?? item.project?.projectKey) !== activeProject.projectKey));
  }

  function updateUploadedDatasets(updater: (items: UploadedDataset[]) => UploadedDataset[]) {
    setUploadedDatasets((currentItems) => {
      const nextItems = limitUploadedDatasetsPerProject(updater(currentItems));
      writeBrowserUploadedDatasets(nextItems);
      return nextItems;
    });
  }

  async function uploadDataset(file: File) {
    if (file.size > maxUploadedFileSizeBytes) {
      const invalid = createInvalidUploadedDataset(file.name, "File is larger than the 5 MB local upload limit.", activeProject.projectKey);
      updateUploadedDatasets((items) => [invalid, ...items]);
      setUploadedDataMessage(invalid.notes ?? "Upload rejected.");
      return;
    }

    try {
      const text = await file.text();
      const dataset = file.name.toLowerCase().endsWith(".csv")
        ? createUploadedCsvDataset(file.name, text, activeProject.projectKey)
        : createUploadedGeojsonDataset(file.name, text, activeProject.projectKey);

      updateUploadedDatasets((items) => [
        dataset,
        ...items.filter((item) => item.projectKey !== dataset.projectKey || item.name !== dataset.name)
      ]);
      setUploadedDataMessage(`${dataset.name} parsed locally. Validation is still required before official use.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dataset could not be parsed.";
      const invalid = createInvalidUploadedDataset(file.name, message, activeProject.projectKey);
      updateUploadedDatasets((items) => [invalid, ...items]);
      setUploadedDataMessage(message);
    }
  }

  function removeUploadedDataset(datasetId: string) {
    updateUploadedDatasets((items) => items.filter((item) => item.id !== datasetId || item.projectKey !== activeProject.projectKey));
    setUploadedDataMessage("Uploaded dataset removed from local workspace.");
  }

  function clearUploadedDatasets() {
    updateUploadedDatasets((items) => items.filter((item) => item.projectKey !== activeProject.projectKey));
    setUploadedDataMessage("Local uploaded datasets cleared for this project.");
  }

  function toggleUploadedDataset(datasetId: string) {
    updateUploadedDatasets((items) =>
      items.map((item) => item.id === datasetId && item.projectKey === activeProject.projectKey
        ? { ...item, visible: item.visible === false }
        : item)
    );
  }

  async function runExpressAnalysis(options: { forceSelectedTarget?: boolean } = {}) {
    if (isAnalyzing) {
      return;
    }

    if (hasCriteriaFirstCandidateSet && !options.forceSelectedTarget) {
      runCandidateComparison();
      return;
    }

    if (!selectedPoint) {
      return;
    }

    if (selectedScenario === "customQuery" && customQuery.trim().length === 0) {
      setAnalysis(null);
      setAnalysisError("Enter a custom question before running Custom Query analysis.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setComparison(null);
    setComparisonReturn(null);
    setReportPreview(null);
    setLastComparedState(null);

    const uploadedDataContext = buildUploadedDataContext(scopedUploadedDatasets, selectedPoint, selectedObject);
    const keepSelectionLocal = isBrowserLocalSelection(selectedObject, selectedAoi);
    const climateContext = keepSelectionLocal ? null : await fetchClimateScreeningContext(selectedPoint);
    const selectedAoiTarget = selectedAoi
      ? {
          id: selectedAoi.id,
          type: "user-drawn-aoi" as const,
          label: selectedAoi.name,
          coordinates: selectedAoi.centroid,
          geometry: selectedAoi.geometry,
          bbox: selectedAoi.bbox,
          measurements: selectedAoi.measurements,
          datasetId: selectedAoi.sourceType === "uploaded_geojson" ? "uploaded-geojson-aoi" : "user-drawn-aoi",
          datasetName: selectedAoi.sourceType === "uploaded_geojson" ? "Uploaded GeoJSON AOI" : "User-drawn AOI",
          sourceMode: selectedAoi.sourceType === "uploaded_geojson" ? "user-uploaded" as const : "user-drawn" as const,
          officialStatus: "official-validation-required" as const,
          properties: {
            source: selectedAoi.source,
            sourceType: selectedAoi.sourceType,
            dataMode: selectedAoi.dataMode,
            validationStatus: selectedAoi.validationStatus,
            confidence: selectedAoi.confidence,
            limitations: selectedAoi.limitations
          }
        }
      : null;
    const deterministicAnalysis = withClimateScreeningContext(
      withUploadedDataContext(
        withOpenGeodataContext(
          withMarketContext(
            {
              ...createMockExpressAnalysis(
                selectedPoint,
                selectedScenario,
                customQuery,
                selectedObject,
                selectedAoi
              ),
              project: activeProject,
              analysisTarget: selectedAoiTarget ?? selectedObject?.analysisTarget ?? {
                id: `point-${selectedPoint.latitude.toFixed(6)}-${selectedPoint.longitude.toFixed(6)}`,
                type: "point",
                label: "Custom map selection",
                coordinates: selectedPoint,
                geometry: {
                  type: "Point",
                  coordinates: [selectedPoint.longitude, selectedPoint.latitude]
                },
                sourceMode: "demo",
                officialStatus: "not-official"
              }
            },
            keepSelectionLocal ? null : marketContext
          )
        ),
        uploadedDataContext
      ),
      climateContext
    );
    const scenario = analysisScenarios.find((item) => item.id === selectedScenario) ?? analysisScenarios[0];
    const finalAnalysis: ExpressAnalysis = {
      ...deterministicAnalysis,
      analysisMode: "mock_fallback",
      confidenceLevel: "medium",
      analysisNotice: "Deterministic browser-local analysis. Uploaded datasets, AOI details, and their derived coordinates were not sent to a server or AI.",
      limitations: Array.from(new Set([
        ...(deterministicAnalysis.limitations ?? []),
        "Narrative and scoring are generated locally from deterministic sample/open context.",
        "Official parcel, planning, transaction, imagery, and risk data are not connected yet."
      ])),
      generatedAt: new Date().toISOString()
    };

    showAnalysisResult(finalAnalysis);
    setLastAnalyzedState({
      query: normalizeQuery(customQuery),
      scenarioId: selectedScenario,
      targetSignature: createTargetSignature(selectedPoint, selectedObject, selectedAoi),
      settingsSignature: createExploreSettingsSignature({
        audience: selectedExploreAudience,
        role: selectedExploreRole,
        interactionMode: exploreInteractionMode,
        filters: exploreFilters
      })
    });
    saveAnalysisHistory(finalAnalysis, scenario.label);
    void persistAnalysisRun(finalAnalysis, scenario.label);
    setIsAnalyzing(false);
  }

  const currentTargetSignature = createTargetSignature(selectedPoint, selectedObject, selectedAoi);
  const currentComparisonSignature = createComparisonSignature(comparisonItems);
  const hasCriteriaFirstCandidateSet = Boolean(
    exploreInteractionMode === "criteria_first" &&
      !selectedExploreCandidateId &&
      visibleExploreCandidates.length >= 2 &&
      isCandidateSearchCurrent
  );
  const activeComparisonNavigationItemId = comparisonReturn?.items.find((item) =>
    createTargetSignature(item.item.point, item.item.selectedObject ?? null, item.item.selectedAoi ?? null) === currentTargetSignature
  )?.item.id;
  const isCriteriaFirst = exploreInteractionMode === "criteria_first";
  const hasSelectedCriteriaCandidate = Boolean(
    isCriteriaFirst &&
      isCandidateSearchCurrent &&
      selectedExploreCandidateId &&
      selectedPoint
  );
  const candidateSearchCtaStatus: CandidateSearchStatus =
    candidateSearchStatus === "searched" && !isCandidateSearchCurrent ? "stale" : candidateSearchStatus;
  const isAnalysisUpToDate = Boolean(
    analysis &&
      lastAnalyzedState &&
      !hasPendingQueryChange(currentQuery, lastAnalyzedState.query) &&
      lastAnalyzedState.scenarioId === selectedScenario &&
      lastAnalyzedState.targetSignature === currentTargetSignature &&
      lastAnalyzedState.settingsSignature === currentExploreSettingsSignature
  );
  const isComparisonUpToDate = Boolean(
    comparison &&
      lastComparedState &&
      !hasPendingQueryChange(currentQuery, lastComparedState.query) &&
      lastComparedState.scenarioId === selectedScenario &&
      lastComparedState.comparisonSignature === currentComparisonSignature &&
      lastComparedState.settingsSignature === currentExploreSettingsSignature
  );
  const primaryCtaState = comparison
    ? isComparisonUpToDate
      ? {
          label: isExporting ? "Exporting..." : "Export Comparison",
          disabled: isExporting || isAnalyzing,
          action: () => {
            void exportPrintableReport("comparison");
          }
        }
      : {
          label: isAnalyzing ? "Continuing..." : "Continue Comparison",
          disabled: isAnalyzing || comparisonItems.length < 2,
          action: runComparison
      }
    : isCriteriaFirst && (!isCandidateSearchCurrent || candidateSearchStatus === "stale")
      ? {
          label: getCandidateSearchActionLabel(selectedExploreScenario, candidateSearchCtaStatus),
          disabled: isAnalyzing,
          action: runCandidateSearch
        }
    : hasSelectedCriteriaCandidate
      ? analysis && isAnalysisUpToDate
        ? {
            label: isExporting ? "Exporting..." : "Export Report",
            disabled: isExporting || isAnalyzing,
            action: () => {
              void exportPrintableReport("analysis");
            }
          }
        : {
            label: isAnalyzing ? "Analyzing..." : "Analyze Selected",
            disabled: isAnalyzing || !selectedPoint,
            action: runExpressAnalysis
          }
    : hasCriteriaFirstCandidateSet
        ? {
            label: "Compare Candidates",
            disabled: isAnalyzing,
            action: runCandidateComparison
          }
      : comparisonItems.length >= 2
        ? {
            label: "Compare Selected",
            disabled: isAnalyzing,
            action: runComparison
          }
      : analysis
        ? isAnalysisUpToDate
          ? {
              label: isExporting ? "Exporting..." : "Export Report",
              disabled: isExporting || isAnalyzing,
              action: () => {
                void exportPrintableReport("analysis");
              }
            }
          : {
              label: isAnalyzing ? "Continuing..." : "Continue Analysis",
              disabled: (!selectedPoint && !hasCriteriaFirstCandidateSet) || isAnalyzing,
              action: runExpressAnalysis
            }
        : {
            label: isAnalyzing ? "Analyzing..." : "Run Express Analysis",
            disabled: (!selectedPoint && !hasCriteriaFirstCandidateSet) || isAnalyzing,
            action: runExpressAnalysis
          };
  const mobileMapTargetLabel = selectedAoi?.name ?? selectedObject?.name ?? (selectedPoint ? "Custom map selection" : "No target selected");
  const mobileMapTargetDetail = selectedAoi
    ? "AOI selected. Validation required before official use."
    : selectedObject
      ? selectedObject.spatialContext?.datasetName ?? selectedObject.layerName
      : selectedPoint
        ? `${selectedPoint.latitude.toFixed(5)}, ${selectedPoint.longitude.toFixed(5)}`
        : "Tap a map point, object, AOI, or candidate.";
  const canRunMobileMapAnalysis = Boolean(selectedPoint) && !isAnalyzing;
  const hasResultSurface = Boolean(reportPreview || comparison || analysis);

  return (
    <>
      <div
        aria-hidden={isMobileMapPickerOpen ? true : undefined}
        inert={isMobileMapPickerOpen ? true : undefined}
        className="grid min-h-[calc(100svh-4rem)] shrink-0 grid-cols-1 lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden"
      >
        <div className={`${hasResultSurface ? "order-1" : "order-2 lg:order-1"} min-h-0 lg:h-full`}>
          {reportPreview === "analysis" && analysis ? (
            <ReportPreview key={`report-${analysis.id}`} mode="analysis" analysis={analysis} mapSnapshot={mapSnapshot} onBack={() => setReportPreview(null)} />
          ) : reportPreview === "comparison" && comparison ? (
            <ReportPreview key={`report-${comparison.id}`} mode="comparison" comparison={comparison} onBack={() => setReportPreview(null)} />
          ) : comparison ? (
            <ComparisonDashboard
              key={comparison.id}
              comparison={comparison}
              onBackToMap={backToMap}
              onExportComparison={() => {
                void exportPrintableReport("comparison");
              }}
              onOpenCandidateDashboard={openComparisonItemDashboard}
            />
          ) : analysis ? (
            <ExpressDashboard
              key={analysis.id}
              analysis={analysis}
              onBackToMap={backToMap}
              onExportReport={() => {
                void exportPrintableReport("analysis");
              }}
              candidateNavigation={comparisonReturn
                ? {
                    items: comparisonReturn.items.map((item) => item.item),
                    activeItemId: activeComparisonNavigationItemId,
                    onOpenItem: openComparisonItemDashboard,
                    onBackToComparison: returnToCandidateComparison
                  }
                : undefined}
            />
          ) : (
            <div ref={mapSectionRef} id="workspace-map" className="min-h-0 lg:h-full">
              {isMobileMapPickerOpen ? (
                <div
                  aria-hidden="true"
                  className="h-[68svh] min-h-[420px] bg-[#dfe8ec] sm:h-[70svh] lg:h-full lg:min-h-0"
                  data-map-workspace-suspended="mobile-dialog"
                />
              ) : (
                <MapWorkspace
                  key="map-workspace"
                  className="relative h-[68svh] min-h-[420px] overflow-hidden bg-[#dfe8ec] sm:h-[70svh] lg:h-full lg:min-h-0"
                  selectedPoint={selectedPoint}
                  selectedObject={selectedObject}
                  selectedAoi={selectedAoi}
                  onPointSelect={handlePointSelect}
                  onObjectSelect={handleObjectSelect}
                  onObjectClear={handleObjectClearAfterSourceRollback}
                  onAoiSelect={handleAoiSelect}
                  onAoiDelete={handleAoiDelete}
                  uploadedDatasets={scopedUploadedDatasets}
                  projectId={activeProject.projectKey}
                  exploreCandidates={visibleExploreCandidates}
                  selectedExploreCandidateId={selectedExploreCandidateId}
                  onExploreCandidateSelect={selectExploreCandidate}
                  onMapSnapshotChange={setMapSnapshot}
                  spatialSourceRequest={spatialSourceRequest}
                />
              )}
            </div>
          )}
        </div>
        <div ref={workflowPanelRef} className={`${hasResultSurface ? "order-2" : "order-1"} min-h-0 min-w-0 lg:order-2 lg:h-full`}>
          <AnalysisPanel
            selectedPoint={selectedPoint}
            selectedObject={selectedObject}
            selectedAoi={selectedAoi}
            projects={projectSelectorProjects}
            activeProject={activeProject}
            selectedScenario={selectedScenario}
            customQuery={customQuery}
            isAnalyzing={isAnalyzing}
            analysisError={analysisError}
            comparisonItems={comparisonItems}
            comparisonMessage={comparisonMessage}
            analysisHistory={analysisHistory}
            analysisHistorySource={analysisHistorySource}
            hasResult={analysis !== null || comparison !== null}
            currentAnalysis={analysis}
            analysisMode={analysis?.analysisMode}
            marketMetricsMatch={analysis?.marketMetricsMatch}
            backendStatus={backendStatus}
            marketContext={marketContext}
            isMarketContextLoading={isMarketContextLoading}
            uploadedDatasets={scopedUploadedDatasets}
            uploadedDataMessage={uploadedDataMessage}
            projectAois={projectAois}
            aoiDraftName={aoiDraftName}
            aoiMessage={aoiMessage}
            exploreAudience={selectedExploreAudience}
            exploreRole={selectedExploreRole}
            exploreScenarioId={selectedExploreScenario}
            exploreInteractionMode={exploreInteractionMode}
            exploreFilters={exploreFilters}
            exploreCandidates={visibleExploreCandidates}
            candidateSearchStatus={candidateSearchStatus}
            selectedExploreCandidateId={selectedExploreCandidateId}
            exploreSetupDefaultOpen={initialExploreMode}
            onExploreAudienceChange={changeExploreAudience}
            onExploreRoleChange={changeExploreRole}
            onExploreScenarioChange={changeExploreScenario}
            onExploreInteractionModeChange={changeExploreInteractionMode}
            onExploreFilterChange={updateExploreFilter}
            onExploreCandidateSelect={selectExploreCandidate}
            onCreateProject={createProject}
            onProjectChange={changeActiveProject}
            onCustomQueryChange={(query) => {
              setCustomQuery(query);
              setAnalysisError(null);
            }}
            primaryCtaLabel={primaryCtaState.label}
            primaryCtaDisabled={primaryCtaState.disabled}
            onPrimaryCta={primaryCtaState.action}
            onAddToComparison={addSelectionToComparison}
            onRemoveComparisonItem={removeComparisonItem}
            onRunComparison={runComparison}
            onOpenHistoryItem={openHistoryItem}
            onClearAnalysisHistory={clearAnalysisHistory}
            onUploadDataset={uploadDataset}
            onImportAoiGeojson={importAoiGeojson}
            onAoiDraftNameChange={setAoiDraftName}
            onSaveSelectedAoi={saveSelectedAoi}
            onOpenSavedAoi={openSavedAoi}
            onRenameSavedAoi={renameSavedAoi}
            onDeleteSavedAoi={deleteSavedAoi}
            onExportSelectedAoi={exportSelectedAoi}
            onExportSavedAoi={exportSavedAoi}
            onRemoveUploadedDataset={removeUploadedDataset}
            onClearUploadedDatasets={clearUploadedDatasets}
            onToggleUploadedDataset={toggleUploadedDataset}
            onOpenMap={openMapFromPanel}
          />
        </div>
      </div>
      {isMobileMapPickerOpen ? (
        <section
          ref={mobileMapDialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-map-picker-title"
          aria-describedby="mobile-map-picker-description"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex flex-col bg-white min-[1367px]:hidden"
        >
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-line bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Map selection</p>
              <h2 id="mobile-map-picker-title" className="mt-0.5 truncate text-sm font-semibold text-ink">{mobileMapTargetLabel}</h2>
              <p id="mobile-map-picker-description" className="truncate text-[11px] leading-4 text-muted">{mobileMapTargetDetail}</p>
            </div>
            <button
              type="button"
              ref={mobileMapInitialFocusRef}
              onClick={() => closeMobileMapPicker(true)}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand"
            >
              Back
            </button>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <MapWorkspace
              key="mobile-map-picker"
              className="relative h-full min-h-0 overflow-hidden bg-[#dfe8ec]"
              selectedPoint={selectedPoint}
              selectedObject={selectedObject}
              selectedAoi={selectedAoi}
              onPointSelect={handlePointSelect}
              onObjectSelect={handleObjectSelect}
              onObjectClear={handleObjectClearAfterSourceRollback}
              onAoiSelect={handleAoiSelect}
              onAoiDelete={handleAoiDelete}
              showEmptyOverlay={false}
              showLayerControls={false}
              uploadedDatasets={scopedUploadedDatasets}
              projectId={activeProject.projectKey}
              exploreCandidates={visibleExploreCandidates}
              selectedExploreCandidateId={selectedExploreCandidateId}
              onExploreCandidateSelect={selectExploreCandidate}
              onMapSnapshotChange={setMapSnapshot}
              spatialSourceRequest={spatialSourceRequest}
            />
          </div>
          <div className="relative z-20 shrink-0 border-t border-line bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
            <p className="text-xs leading-5 text-muted" aria-live="polite">
              {selectedPoint
                ? "Selection ready. Run analysis now or return to the workflow to review settings."
                : "Tap the map to select a point, object, AOI, or candidate before running analysis."}
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={!canRunMobileMapAnalysis}
                onClick={() => {
                  void runExpressAnalysis({ forceSelectedTarget: true });
                }}
                className="inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:cursor-not-allowed disabled:bg-[#c9d2d7]"
              >
                {isAnalyzing ? "Analyzing..." : "Run Express Analysis"}
              </button>
              <button
                type="button"
                onClick={() => closeMobileMapPicker(true)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
              >
                Back to workflow
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
