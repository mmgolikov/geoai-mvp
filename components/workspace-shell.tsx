"use client";

import { useEffect, useState } from "react";
import { AnalysisPanel } from "@/components/analysis-panel";
import { ComparisonDashboard } from "@/components/comparison-dashboard";
import { ExpressDashboard } from "@/components/express-dashboard";
import { MapWorkspace } from "@/components/map-workspace";
import { ReportPreview } from "@/components/report-preview";
import {
  createEvidenceItem,
  getDataSourceById,
  getScenarioDataSources
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
  maxUploadedFileSizeBytes,
  uploadedDatasetStorageKey,
  withUploadedDataContext
} from "@/src/lib/uploaded-data";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { StructuredAnalysisResult } from "@/src/types/analysis";
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

const analysisHistoryStorageKey = "geoai-analysis-history-v1";
const activeProjectStorageKey = "geoai-active-project-key-v1";
const openAnalysisRequestStorageKey = "geoai-open-analysis-request-v1";
const maxAnalysisHistoryItems = 8;

type BackendStatus = {
  configured: boolean;
  status: "connected" | "configured_unavailable" | "local_only";
  message: string;
  sources_count: number | null;
};

type AnalysisRunsResponse = {
  ok: boolean;
  mode: "db" | "local_only";
  items: unknown[];
  error: string | null;
};

type ProjectsResponse = {
  ok: boolean;
  mode: "db" | "local_demo";
  items: GeoAIProject[];
  error: string | null;
};

type ClimateScreeningContext = {
  status: "connected" | "sample_fallback";
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

function titledText(title: string, description: string) {
  return title ? `${title}: ${description}` : description;
}

function mergeNarrativeAnalysis(
  deterministicAnalysis: ExpressAnalysis,
  narrative: StructuredAnalysisResult
): ExpressAnalysis {
  const importedMarketNote = deterministicAnalysis.marketMetricsMatch?.importedMetricsUsed
    ? ` Imported market metrics for ${deterministicAnalysis.marketMetricsMatch.matchedAreaName} support liquidity and demand proxy interpretation, but remain sample/manual-import derived and require official validation.`
    : "";
  const importedKeyFactor = deterministicAnalysis.marketMetricsMatch?.importedMetricsUsed
    ? [`Imported market metrics matched to ${deterministicAnalysis.marketMetricsMatch.matchedAreaName} with ${deterministicAnalysis.marketMetricsMatch.confidence} match confidence.`]
    : [];
  const importedRisk = deterministicAnalysis.marketMetricsMatch?.importedMetricsUsed
    ? ["Imported DLD / Dubai Pulse-style metrics are sample/manual-import derived and must be validated against official datasets before underwriting."]
    : [];
  const importedAction = deterministicAnalysis.marketMetricsMatch?.importedMetricsUsed
    ? ["Validate imported market metrics against official DLD / Dubai Pulse exports before underwriting."]
    : [];

  return {
    ...deterministicAnalysis,
    summary: `${narrative.executive_summary || deterministicAnalysis.summary}${importedMarketNote}`,
    keyFactors:
      narrative.key_factors.length > 0
        ? [...importedKeyFactor, ...narrative.key_factors.map((item) => titledText(item.title, item.description))]
        : deterministicAnalysis.keyFactors,
    opportunities:
      narrative.opportunities.length > 0
        ? narrative.opportunities.map((item) => titledText(item.title, item.description))
        : deterministicAnalysis.opportunities,
    risks:
      narrative.risks.length > 0
        ? [...importedRisk, ...narrative.risks.map((item) => titledText(item.title, item.description))]
        : deterministicAnalysis.risks,
    nextActions:
      narrative.recommended_actions.length > 0
        ? [...importedAction, ...narrative.recommended_actions.map((item) => titledText(item.title, item.description))]
        : deterministicAnalysis.nextActions,
    analysisMode: narrative.mode,
    confidenceLevel: narrative.confidence_level,
    limitations: Array.from(new Set([...(deterministicAnalysis.limitations ?? []), ...narrative.limitations])),
    analysisNotice: narrative.notice,
    customQueryAnswer: narrative.custom_query_answer ?? deterministicAnalysis.customQueryAnswer,
    customQueryIntent: narrative.custom_query_answer?.intent ?? deterministicAnalysis.customQueryIntent,
    customQuerySummary: narrative.custom_query_answer?.shortAnswer ?? deterministicAnalysis.customQuerySummary,
    generatedAt: new Date().toISOString()
  };
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
        ? `${marketContext.sourceMode ?? "seed_static"} market context matched to ${marketContext.areaName}. ${marketContext.dataQualityNotes?.[0] ?? "Current values are demo-normalized indices, not official market data."}`
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
  try {
    const storedHistory = window.localStorage.getItem(analysisHistoryStorageKey);
    if (!storedHistory) {
      return [];
    }

    const parsed = JSON.parse(storedHistory) as AnalysisHistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, maxAnalysisHistoryItems) : [];
  } catch {
    return [];
  }
}

function writeAnalysisHistory(items: AnalysisHistoryItem[]) {
  try {
    window.localStorage.setItem(analysisHistoryStorageKey, JSON.stringify(items.slice(0, maxAnalysisHistoryItems)));
  } catch {
    // Local history is a convenience feature; storage failures should not affect analysis.
  }
}

function filterHistoryByProject(items: AnalysisHistoryItem[], projectKey: string) {
  return items.filter((item) => item.projectKey === projectKey || item.project?.projectKey === projectKey);
}

function readActiveProjectKey() {
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
  try {
    window.localStorage.setItem(activeProjectStorageKey, projectKey);
  } catch {
    // Project selection still works in memory if localStorage is unavailable.
  }
}

function normalizeQuery(query: string) {
  return query.trim();
}

function readOpenAnalysisRequest() {
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

function hasPendingQueryChange(currentQuery: string, lastQuery: string) {
  if (!currentQuery) {
    return false;
  }

  return currentQuery !== lastQuery;
}

function readUploadedDatasets() {
  try {
    const stored = window.localStorage.getItem(uploadedDatasetStorageKey);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(uploadedDatasetStorageKey);
      return [];
    }

    const validItems = parsed.filter((item): item is UploadedDataset => {
      if (typeof item !== "object" || item === null) {
        return false;
      }

      const dataset = item as Partial<UploadedDataset>;
      const hasValidGeojson =
        dataset.type !== "geojson" ||
        dataset.status !== "parsed" ||
        dataset.geojson?.type === "FeatureCollection";

      return (
        typeof dataset.id === "string" &&
        typeof dataset.name === "string" &&
        (dataset.type === "csv" || dataset.type === "geojson") &&
        (dataset.status === "parsed" || dataset.status === "invalid" || dataset.status === "uploaded-local") &&
        hasValidGeojson
      );
    });

    if (validItems.length !== parsed.length) {
      writeUploadedDatasets(validItems);
    }

    return validItems;
  } catch {
    try {
      window.localStorage.removeItem(uploadedDatasetStorageKey);
    } catch {
      // Ignore storage cleanup failures.
    }
    return [];
  }
}

function writeUploadedDatasets(items: UploadedDataset[]) {
  try {
    window.localStorage.setItem(uploadedDatasetStorageKey, JSON.stringify(items));
  } catch {
    // Local uploads are convenience context; parsing still works in memory if storage fails.
  }
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

export function WorkspaceShell() {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [selectedObject, setSelectedObject] = useState<SelectedDemoObject | null>(null);
  const [selectedAoi, setSelectedAoi] = useState<UserDrawnAoi | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<AnalysisScenarioId>("realEstateDevelopment");
  const [customQuery, setCustomQuery] = useState("");
  const [analysis, setAnalysis] = useState<ExpressAnalysis | null>(null);
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [reportPreview, setReportPreview] = useState<"analysis" | "comparison" | null>(null);
  const [comparisonMessage, setComparisonMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastAnalyzedState, setLastAnalyzedState] = useState<{
    query: string;
    scenarioId: AnalysisScenarioId;
    targetSignature: string;
  } | null>(null);
  const [lastComparedState, setLastComparedState] = useState<{
    query: string;
    scenarioId: AnalysisScenarioId;
    comparisonSignature: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [isMarketContextLoading, setIsMarketContextLoading] = useState(false);
  const [projects, setProjects] = useState<GeoAIProject[]>(demoProjects);
  const [projectsMode, setProjectsMode] = useState<"db" | "local_demo">("local_demo");
  const [activeProject, setActiveProject] = useState<GeoAIProject>(demoProjects[0]);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [analysisHistorySource, setAnalysisHistorySource] = useState<"DB" | "local">("local");
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [uploadedDatasets, setUploadedDatasets] = useState<UploadedDataset[]>([]);
  const [uploadedDataMessage, setUploadedDataMessage] = useState<string | null>(null);
  const [projectAois, setProjectAois] = useState<ProjectAoi[]>([]);
  const [aoiDraftName, setAoiDraftName] = useState("");
  const [aoiMessage, setAoiMessage] = useState<string | null>(null);
  const [activeGuidedDemoId, setActiveGuidedDemoId] = useState<string | null>(null);
  const [activeDemoNarrativeId, setActiveDemoNarrativeId] = useState<string | null>(null);

  function loadGuidedDemo(presetId: string, includeComparisonSites = false) {
    const preset = getGuidedDemoPreset(presetId);
    const narrative = getDemoNarrativeForGuidedDemo(preset.id);
    const demoDatasets = createGuidedDemoDatasets();
    const demoSelection = createGuidedDemoSelection(preset);
    const nextProject = projects.find((project) => project.projectKey === preset.projectKey) ?? getDemoProject(preset.projectKey);

    updateUploadedDatasets((items) => [
      ...demoDatasets,
      ...items.filter((item) => !demoDatasets.some((dataset) => dataset.id === item.id))
    ].slice(0, 8));
    setSelectedObject(demoSelection);
    setSelectedAoi(null);
    setSelectedPoint(demoSelection.center);
    setSelectedScenario(preset.scenarioId);
    setCustomQuery("");
    setActiveProject(nextProject);
    writeActiveProjectKey(nextProject.projectKey);
    setAnalysis(null);
    setComparison(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setAnalysisError(null);
    setComparisonMessage(includeComparisonSites ? "Demo comparison sites loaded. Click Compare when ready." : null);
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
    setUploadedDatasets(readUploadedDatasets());
  }, []);

  useEffect(() => {
    setProjectAois(filterAoisByProject(readBrowserAois(), activeProject.projectKey));
    let isMounted = true;

    fetch(`/api/aois?projectKey=${encodeURIComponent(activeProject.projectKey)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { items?: ProjectAoi[] } | null) => {
        if (!isMounted || !Array.isArray(payload?.items)) return;

        const browserAois = filterAoisByProject(readBrowserAois(), activeProject.projectKey);
        const byId = new Map<string, ProjectAoi>();
        for (const item of browserAois) byId.set(item.id, item);
        for (const item of payload.items) byId.set(item.id, item);
        const merged = filterAoisByProject(Array.from(byId.values()), activeProject.projectKey);
        updateProjectAois(() => merged);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
    // `updateProjectAois` reads the current active project and intentionally
    // mirrors server fallback AOIs into browser-local continuity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const scenario = analysisScenarios.find((item) => item.id === requestedAnalysis?.scenarioId);

    if (
      requestedAnalysis &&
      (requestedAnalysis.id === openAnalysisId || restoreRequest?.analysisId === openAnalysisId)
    ) {
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
        project: requestedAnalysis.project ?? getDemoProject(restoreRequest?.projectKey ?? projectKey),
        projectKey: requestedAnalysis.project?.projectKey ?? restoreRequest?.projectKey ?? projectKey ?? undefined,
        recommendation: deriveDecisionPosture(requestedAnalysis),
        analysis: {
          ...requestedAnalysis,
          customQuery: restoreRequest?.customQuery ?? requestedAnalysis.customQuery
        }
      });
      clearOpenAnalysisRequest();
      return;
    }

    const historyItem = readAnalysisHistory().find((item) =>
      item.id === openAnalysisId ||
      item.analysis.id === openAnalysisId ||
      `${item.analysis.id}-${item.analysis.generatedAt ?? ""}` === openAnalysisId
    );

    if (historyItem) {
      restoreAnalysisDashboard(historyItem);
      clearOpenAnalysisRequest();
    }
    // Run once from initial URL only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const requestedProjectKey = readProjectKeyFromUrl(demoProjects);
    const storedProjectKey = requestedProjectKey ?? readActiveProjectKey();
    const localProject = getDemoProject(storedProjectKey);
    let isMounted = true;

    setActiveProject(localProject);

    fetch("/api/projects")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ProjectsResponse | null) => {
        if (!isMounted || !payload?.items?.length) {
          return;
        }

        const nextProjects = payload.items;
        const urlProjectKey = readProjectKeyFromUrl(nextProjects);
        const nextActiveProject =
          nextProjects.find((project) => project.projectKey === (urlProjectKey ?? storedProjectKey)) ?? nextProjects[0];

        setProjects(nextProjects);
        setProjectsMode(payload.mode);
        setActiveProject(nextActiveProject);
        writeActiveProjectKey(nextActiveProject.projectKey);
      })
      .catch(() => {
        if (isMounted) {
          setProjects(demoProjects);
          setProjectsMode("local_demo");
          setActiveProject(localProject);
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

        if (payload.mode !== "db") {
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
    if (!selectedPoint) {
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
        selectedObject,
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
  }, [selectedPoint, selectedObject, selectedScenario]);

  function handlePointSelect(point: SelectedPoint) {
    setSelectedPoint(point);
    setSelectedObject(null);
    setSelectedAoi(null);
    setAnalysis(null);
    setComparison(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(null);
  }

  function handleObjectSelect(object: SelectedDemoObject) {
    setSelectedObject(object);
    setSelectedAoi(null);
    setSelectedPoint(object.center);
    setAnalysis(null);
    setComparison(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(null);
  }

  function handleAoiSelect(aoi: UserDrawnAoi) {
    setSelectedAoi(aoi);
    setSelectedObject(null);
    setSelectedPoint(aoi.centroid);
    setAnalysis(null);
    setComparison(null);
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
    setSelectedAoi(null);
    setSelectedPoint(null);
    setAnalysis(null);
    setComparison(null);
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

  function updateProjectAois(updater: (items: ProjectAoi[]) => ProjectAoi[]) {
    const allAois = readBrowserAois();
    const otherProjectAois = allAois.filter((item) => item.projectKey !== activeProject.projectKey);
    const currentProjectAois = filterAoisByProject(allAois, activeProject.projectKey);
    const nextProjectAois = filterAoisByProject(updater(currentProjectAois), activeProject.projectKey);
    writeBrowserAois([...nextProjectAois, ...otherProjectAois]);
    setProjectAois(nextProjectAois);
    return nextProjectAois;
  }

  function syncAoiToApi(aoi: ProjectAoi) {
    void fetch("/api/aois", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aoi)
    }).catch(() => undefined);
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
    syncAoiToApi(savedAoi);
    setSelectedAoi(projectAoiToUserDrawnAoi(savedAoi));
    setAoiDraftName(savedAoi.name);
    setAoiMessage("AOI saved to this project library. Official validation required.");
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

    void fetch(`/api/aois/${encodeURIComponent(aoi.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName })
    }).catch(() => undefined);

    if (selectedAoi?.savedAoiId === aoi.id || selectedAoi?.id === aoi.id) {
      setSelectedAoi(projectAoiToUserDrawnAoi(renamedAoi));
      setAoiDraftName(trimmedName);
    }
    setAoiMessage("AOI renamed in this project library.");
  }

  function deleteSavedAoi(aoiId: string) {
    updateProjectAois((items) => items.filter((item) => item.id !== aoiId));
    void fetch(`/api/aois/${encodeURIComponent(aoiId)}`, { method: "DELETE" }).catch(() => undefined);
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
    setLastComparedState(null);
    setReportPreview(null);
    setComparisonMessage(null);
  }

  function runComparison() {
    if (comparisonItems.length < 2) {
      setComparisonMessage("Add at least 2 items before comparing.");
      return;
    }

    setAnalysis(null);
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
      comparisonSignature: createComparisonSignature(comparisonItems)
    });
    void persistComparisonSet(comparisonResult);
    setReportPreview(null);
  }

  function backToMap() {
    setAnalysis(null);
    setComparison(null);
    setReportPreview(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
  }

  function saveAnalysisHistory(analysisResult: ExpressAnalysis, scenarioLabel: string) {
    const historyItem = createHistoryItem(analysisResult, scenarioLabel, activeProject, analysisHistorySource);

    setAnalysisHistory(() => {
      const storedItems = readAnalysisHistory();
      const nextItems = [
        historyItem,
        ...storedItems.filter((item) => item.analysis.id !== analysisResult.id)
      ].slice(0, maxAnalysisHistoryItems);

      writeAnalysisHistory(nextItems);
      return filterHistoryByProject(nextItems, activeProject.projectKey);
    });
  }

  async function persistAnalysisRun(analysisResult: ExpressAnalysis, scenarioLabel: string) {
    try {
      await fetch("/api/analysis-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          runKey: analysisResult.id,
          projectKey: activeProject.projectKey,
          projectName: activeProject.name,
          projectId: activeProject.id,
          scenarioId: analysisResult.scenarioId,
          selectedName: analysisResult.selectedAoi?.name ?? analysisResult.selectedObject?.name ?? "Custom map selection",
          selectedType: analysisResult.selectedAoi ? "aoi" : analysisResult.selectedObject ? "object" : "point",
          selectedPoint: analysisResult.point,
          selectedFeatureKey: analysisResult.selectedAoi?.id ?? analysisResult.selectedObject?.spatialContext?.featureId ?? analysisResult.selectedObject?.id ?? null,
          inputContext: {
            scenarioLabel,
            customQuery: analysisResult.customQuery ?? "",
            customQueryIntent: analysisResult.customQueryIntent ?? null,
            customQuerySummary: analysisResult.customQuerySummary ?? null,
            customQueryAnswer: analysisResult.customQueryAnswer ?? null,
            selectedPoint: analysisResult.point,
            selectedObject: analysisResult.selectedObject ?? null,
            selectedAoi: analysisResult.selectedAoi ?? null,
            marketContext: analysisResult.marketContext ?? null,
            marketMetrics: createMarketMetricsMetadata(analysisResult),
            uploadedDataContext: analysisResult.uploadedDataContext ?? null,
            evidence: analysisResult.evidence,
            project: activeProject
          },
          selectedObject: analysisResult.selectedObject ?? analysisResult.selectedAoi ?? null,
          resultJson: analysisResult,
          decisionPosture: deriveDecisionPosture(analysisResult),
          confidenceLevel: analysisResult.confidenceLevel ?? null,
          dataConfidenceLevel: analysisResult.marketContext?.confidenceLevel ?? null,
          analysisMode: analysisResult.analysisMode ?? null,
          createdAt: analysisResult.generatedAt ?? new Date().toISOString()
        })
      });
      await fetch("/api/data-room/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `analysis-evidence-${activeProject.projectKey}-${analysisResult.id}`,
          projectId: activeProject.id,
          projectKey: activeProject.projectKey,
          name: analysisResult.selectedAoi?.name ?? analysisResult.selectedObject?.name ?? "Express Analysis",
          description: `${scenarioLabel} generated by GeoAI; screening evidence only.`,
          assetType: "analysis",
          sourceType: "generated_by_geoai",
          linkedAoiIds: analysisResult.selectedAoi?.savedAoiId
            ? [analysisResult.selectedAoi.savedAoiId]
            : analysisResult.selectedAoi?.id
              ? [analysisResult.selectedAoi.id]
              : [],
          linkedAnalysisIds: [analysisResult.id],
          validationStatus: "ready_for_review"
        })
      });
    } catch {
      // Persistence is optional in v0.1; local history remains the source of truth.
    }
  }

  async function persistComparisonSet(comparisonResult: ComparisonResult) {
    try {
      const sourceLineage = createSourceLineageSnapshot({
        evidence: comparisonResult.evidence,
        uploadedDatasets
      });

      await fetch("/api/comparison-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: comparisonResult.id,
          projectId: activeProject.id,
          projectKey: activeProject.projectKey,
          title: "Site Comparison Intelligence",
          itemCount: comparisonResult.items.length,
          items: comparisonResult.items,
          recommendation: `Best option: ${comparisonResult.winner.item.name}`,
          sourceLineage,
          payload: comparisonResult,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
      await fetch("/api/data-room/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `comparison-evidence-${activeProject.projectKey}-${comparisonResult.id}`,
          projectId: activeProject.id,
          projectKey: activeProject.projectKey,
          name: "Site Comparison Intelligence",
          description: `Best option: ${comparisonResult.winner.item.name}. Screening comparison; official validation required.`,
          assetType: "comparison",
          sourceType: "generated_by_geoai",
          validationStatus: "ready_for_review"
        })
      });
      setComparisonMessage("Comparison saved to project fallback.");
    } catch {
      setComparisonMessage("Comparison generated; persistence unavailable in local fallback.");
    }
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
        "Comparison uses deterministic demo scoring and structured evidence readiness, not a validated underwriting model."
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
      ? `analysis-report-${analysis.id}`
      : mode === "comparison" && comparison
        ? `comparison-report-${comparison.id}`
        : null;

    if (!reportKey) {
      return null;
    }

    try {
      if (mode === "analysis" && analysis) {
        const reportJson = createAnalysisReportPayload(analysis);
        await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportKey,
            analysisRunId: analysis.id,
            projectKey: activeProject.projectKey,
            projectName: activeProject.name,
            projectId: activeProject.id,
            runKey: analysis.id,
            reportType: "analysis",
            title: reportJson.title,
            reportJson,
            decisionPosture: reportJson.decisionPosture,
            generatedAt: reportJson.generatedAt
          })
        });
        await fetch("/api/data-room/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `report-evidence-${activeProject.projectKey}-${reportKey}`,
            projectId: activeProject.id,
            projectKey: activeProject.projectKey,
            name: reportJson.title,
            description: "Printable GeoAI memo/report artifact; official validation required.",
            assetType: "report",
            sourceType: "generated_by_geoai",
            linkedAoiIds: analysis.selectedAoi?.savedAoiId
              ? [analysis.selectedAoi.savedAoiId]
              : analysis.selectedAoi?.id
                ? [analysis.selectedAoi.id]
                : [],
            linkedAnalysisIds: [analysis.id],
            linkedReportIds: [reportKey],
            validationStatus: "ready_for_review"
          })
        });
      }

      if (mode === "comparison" && comparison) {
        const reportJson = createComparisonReportPayload(comparison);
        await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportKey,
            projectKey: activeProject.projectKey,
            projectName: activeProject.name,
            projectId: activeProject.id,
            reportType: "comparison",
            title: reportJson.title,
            reportJson,
            decisionPosture: reportJson.decisionPosture,
            generatedAt: reportJson.generatedAt
          })
        });
        await fetch("/api/data-room/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `report-evidence-${activeProject.projectKey}-${reportKey}`,
            projectId: activeProject.id,
            projectKey: activeProject.projectKey,
            name: reportJson.title,
            description: "Printable comparison memo artifact; official validation required.",
            assetType: "report",
            sourceType: "generated_by_geoai",
            linkedAnalysisIds: comparison.items.map((item) => item.item.id),
            linkedReportIds: [reportKey],
            validationStatus: "ready_for_review"
          })
        });
      }
    } catch {
      // Export remains print/screen-first; DB persistence is optional.
    }

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
      if (sessionRecord) {
        const serializedReport = JSON.stringify(sessionRecord);
        const storageKey = `geoai-print-report:${reportKey}`;
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
    setActiveProject(nextProject);
    writeActiveProjectKey(nextProject.projectKey);
    setSelectedPoint(null);
    setSelectedObject(null);
    setSelectedAoi(null);
    setAnalysis(null);
    setComparison(null);
    setReportPreview(null);
    setLastAnalyzedState(null);
    setLastComparedState(null);
    setAnalysisError(null);
    setComparisonMessage(null);
    setMarketContext(null);
    setAoiMessage(null);
  }

  function restoreAnalysisDashboard(item: AnalysisHistoryItem) {
    const restoredCustomQuery = normalizeQuery(item.analysis.customQuery ?? "");
    const restoredProject = item.project ?? item.analysis.project ?? getDemoProject(item.projectKey);
    const restoredAnalysis = {
      ...item.analysis,
      project: restoredProject
    };

    setSelectedPoint(restoredAnalysis.point);
    setSelectedObject(restoredAnalysis.selectedObject ?? null);
    setSelectedAoi(restoredAnalysis.selectedAoi ?? null);
    setSelectedScenario(restoredAnalysis.scenarioId);
    setCustomQuery(restoredCustomQuery);
    setAnalysis(restoredAnalysis);
    setLastAnalyzedState({
      query: restoredCustomQuery,
      scenarioId: restoredAnalysis.scenarioId,
      targetSignature: createTargetSignature(restoredAnalysis.point, restoredAnalysis.selectedObject ?? null, restoredAnalysis.selectedAoi ?? null)
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
    writeAnalysisHistory([]);
  }

  function updateUploadedDatasets(updater: (items: UploadedDataset[]) => UploadedDataset[]) {
    setUploadedDatasets((currentItems) => {
      const nextItems = updater(currentItems);
      writeUploadedDatasets(nextItems);
      return nextItems;
    });
  }

  async function uploadDataset(file: File) {
    if (file.size > maxUploadedFileSizeBytes) {
      const invalid = createInvalidUploadedDataset(file.name, "File is larger than the 5 MB local upload limit.");
      updateUploadedDatasets((items) => [invalid, ...items].slice(0, 8));
      setUploadedDataMessage(invalid.notes ?? "Upload rejected.");
      return;
    }

    try {
      const text = await file.text();
      const dataset = file.name.toLowerCase().endsWith(".csv")
        ? createUploadedCsvDataset(file.name, text)
        : createUploadedGeojsonDataset(file.name, text);

      updateUploadedDatasets((items) => [dataset, ...items.filter((item) => item.name !== dataset.name)].slice(0, 8));
      void persistUploadedDatasetMetadata(dataset);
      setUploadedDataMessage(`${dataset.name} parsed locally. Validation is still required before official use.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dataset could not be parsed.";
      const invalid = createInvalidUploadedDataset(file.name, message);
      updateUploadedDatasets((items) => [invalid, ...items].slice(0, 8));
      setUploadedDataMessage(message);
    }
  }

  function removeUploadedDataset(datasetId: string) {
    updateUploadedDatasets((items) => items.filter((item) => item.id !== datasetId));
    void fetch(`/api/uploaded-datasets?id=${encodeURIComponent(datasetId)}`, { method: "DELETE" }).catch(() => undefined);
    setUploadedDataMessage("Uploaded dataset removed from local workspace.");
  }

  function clearUploadedDatasets() {
    updateUploadedDatasets(() => []);
    setUploadedDataMessage("Local uploaded datasets cleared.");
  }

  function toggleUploadedDataset(datasetId: string) {
    updateUploadedDatasets((items) =>
      items.map((item) => item.id === datasetId ? { ...item, visible: item.visible === false } : item)
    );
  }

  async function persistUploadedDatasetMetadata(dataset: UploadedDataset) {
    try {
      await fetch("/api/uploaded-datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dataset.id,
          projectId: activeProject.id,
          projectKey: activeProject.projectKey,
          name: dataset.name,
          type: dataset.type,
          status: dataset.status,
          rowCount: dataset.type === "csv" ? dataset.rowCount ?? null : null,
          featureCount: dataset.type === "geojson" ? dataset.featureCount ?? null : null,
          columns: dataset.type === "csv" ? dataset.columns ?? [] : [],
          sourceMode: dataset.sourceMode,
          officialStatus: dataset.officialStatus,
          uploadedAt: dataset.uploadedAt,
          metadata: {
            confidence: dataset.confidence,
            notes: dataset.notes,
            visible: dataset.visible
          },
          parsedContent: dataset.type === "geojson" && (dataset.featureCount ?? 0) <= 50 ? dataset.geojson : undefined
        })
      });
    } catch {
      // Browser-local upload remains available even when metadata persistence is unavailable.
    }
  }

  async function runExpressAnalysis() {
    if (!selectedPoint || isAnalyzing) {
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
    setReportPreview(null);
    setLastComparedState(null);

    const uploadedDataContext = buildUploadedDataContext(uploadedDatasets, selectedPoint, selectedObject);
    const climateContext = await fetchClimateScreeningContext(selectedPoint);
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
            marketContext
          )
        ),
        uploadedDataContext
      ),
      climateContext
    );
    const scenario = analysisScenarios.find((item) => item.id === selectedScenario) ?? analysisScenarios[0];

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          point: selectedPoint,
          selectedObject,
          scenarioId: selectedScenario,
          scenarioLabel: scenario.label,
          customQuery,
          customQueryIntent: deterministicAnalysis.customQueryIntent,
          customQueryAnswer: deterministicAnalysis.customQueryAnswer,
          deterministicScores: deterministicAnalysis.scores,
          evidence: deterministicAnalysis.evidence,
          dataSources: getScenarioDataSources(selectedScenario),
          selectedAoi,
          analysisTarget: deterministicAnalysis.analysisTarget,
          marketContext,
          climateContext,
          uploadedDataContext,
          openGeodataContext: {
            nearestAccessibility: getNearestAccessibilityMetric(selectedPoint),
            nearestRoad: getNearestOpenRoad(selectedPoint),
            nearbyPoi: getNearbyOpenPoi(selectedPoint, 7).slice(0, 4)
          }
        })
      });

      if (!response.ok) {
        throw new Error("Analysis API unavailable");
      }

      const narrative = (await response.json()) as StructuredAnalysisResult;
      const finalAnalysis = mergeNarrativeAnalysis(deterministicAnalysis, narrative);
      setAnalysis(finalAnalysis);
      setLastAnalyzedState({
        query: normalizeQuery(customQuery),
        scenarioId: selectedScenario,
        targetSignature: createTargetSignature(selectedPoint, selectedObject, selectedAoi)
      });
      saveAnalysisHistory(finalAnalysis, scenario.label);
      void persistAnalysisRun(finalAnalysis, scenario.label);
    } catch {
      const fallbackAnalysis: ExpressAnalysis = {
        ...deterministicAnalysis,
        analysisMode: "mock_fallback",
        confidenceLevel: "medium",
        analysisNotice: "AI analysis is unavailable. Using deterministic demo fallback.",
        limitations: [
          ...(deterministicAnalysis.limitations ?? []),
          "Narrative content is generated from deterministic demo context.",
          "Official parcel, planning, transaction, imagery, and risk data are not connected yet."
        ],
        generatedAt: new Date().toISOString()
      };

      setAnalysis(fallbackAnalysis);
      setLastAnalyzedState({
        query: normalizeQuery(customQuery),
        scenarioId: selectedScenario,
        targetSignature: createTargetSignature(selectedPoint, selectedObject, selectedAoi)
      });
      saveAnalysisHistory(fallbackAnalysis, scenario.label);
      void persistAnalysisRun(fallbackAnalysis, scenario.label);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const currentQuery = normalizeQuery(customQuery);
  const currentTargetSignature = createTargetSignature(selectedPoint, selectedObject, selectedAoi);
  const currentComparisonSignature = createComparisonSignature(comparisonItems);
  const isAnalysisUpToDate = Boolean(
    analysis &&
      lastAnalyzedState &&
      !hasPendingQueryChange(currentQuery, lastAnalyzedState.query) &&
      lastAnalyzedState.scenarioId === selectedScenario &&
      lastAnalyzedState.targetSignature === currentTargetSignature
  );
  const isComparisonUpToDate = Boolean(
    comparison &&
      lastComparedState &&
      !hasPendingQueryChange(currentQuery, lastComparedState.query) &&
      lastComparedState.scenarioId === selectedScenario &&
      lastComparedState.comparisonSignature === currentComparisonSignature
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
              disabled: !selectedPoint || isAnalyzing,
              action: runExpressAnalysis
            }
        : {
            label: isAnalyzing ? "Analyzing..." : "Run Express Analysis",
            disabled: !selectedPoint || isAnalyzing,
            action: runExpressAnalysis
          };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_400px]">
      {reportPreview === "analysis" && analysis ? (
        <ReportPreview key={`report-${analysis.id}`} mode="analysis" analysis={analysis} onBack={() => setReportPreview(null)} />
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
        />
      ) : analysis ? (
        <ExpressDashboard
          key={analysis.id}
          analysis={analysis}
          onBackToMap={backToMap}
          onExportReport={() => {
            void exportPrintableReport("analysis");
          }}
        />
      ) : (
        <MapWorkspace
          key="map-workspace"
          selectedPoint={selectedPoint}
          selectedObject={selectedObject}
          selectedAoi={selectedAoi}
          onPointSelect={handlePointSelect}
          onObjectSelect={handleObjectSelect}
          onAoiSelect={handleAoiSelect}
          onAoiDelete={handleAoiDelete}
          uploadedDatasets={uploadedDatasets}
          projectId={activeProject.projectKey}
        />
      )}
      <AnalysisPanel
        selectedPoint={selectedPoint}
        selectedObject={selectedObject}
        selectedAoi={selectedAoi}
        projects={projects}
        projectsMode={projectsMode}
        activeProject={activeProject}
        scenarios={analysisScenarios}
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
        uploadedDatasets={uploadedDatasets}
        uploadedDataMessage={uploadedDataMessage}
        projectAois={projectAois}
        aoiDraftName={aoiDraftName}
        aoiMessage={aoiMessage}
        guidedDemoPresets={guidedDemoPresets}
        activeGuidedDemoId={activeGuidedDemoId}
        activeDemoNarrative={getDemoNarrativeById(activeDemoNarrativeId)}
        onScenarioChange={(scenario) => {
          setSelectedScenario(scenario);
          setAnalysisError(null);
          setComparisonMessage(null);
        }}
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
        onLoadGuidedDemo={(presetId) => loadGuidedDemo(presetId)}
        onLoadGuidedDemoComparison={(presetId) => loadGuidedDemo(presetId, true)}
        onRemoveUploadedDataset={removeUploadedDataset}
        onClearUploadedDatasets={clearUploadedDatasets}
        onToggleUploadedDataset={toggleUploadedDataset}
      />
    </div>
  );
}
