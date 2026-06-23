import { dataSourceRegistry } from "@/src/data/data-source-registry";
import { seededDemoComparisonSummaries, seededDemoRecentAnalyses, seededDemoReportRecords } from "@/src/data/demo-report-seeds";
import { demoProjects, getDemoProject } from "@/src/data/demo-projects";
import { listAnalysisRuns } from "@/src/lib/db/repositories/analysis-runs";
import { listReports } from "@/src/lib/db/repositories/reports";
import { listComparisonSets } from "@/src/lib/repositories/comparison-set-repository";
import { listAois } from "@/src/lib/repositories/aoi-repository";
import { listDataRoomAssets, listDataRoomChecklist } from "@/src/lib/repositories/data-room-repository";
import { listUploadedDatasetRecords } from "@/src/lib/repositories/uploaded-dataset-repository";
import { getExternalDataReadiness } from "@/src/lib/external-data/data-manifest";
import {
  dataRoomRequiredCaveat,
  dataRoomStorageCaveat,
  type ClientDataRoom,
  type DataRoomAsset,
  type DataRoomAssetType,
  type DataRoomSourceType,
  type DataRoomValidationStatus,
  type PilotDeliverable,
  type PilotDeliverableStatus,
  type ValidationChecklistCategory,
  type ValidationChecklistItem,
  type ValidationChecklistPriority,
  type ValidationChecklistStatus
} from "@/src/types/data-room";
import type { GeoAIProject, ProjectClientType } from "@/src/lib/db/types";
import type { DataSource } from "@/src/types/data-source";
import type { ProjectAoi } from "@/src/types/aoi";

type UnknownRecord = Record<string, unknown>;

function nowIso() {
  return new Date().toISOString();
}

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as UnknownRecord : {};
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function toIsoDate(value: unknown, fallback = nowIso()) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const raw = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw;
  const parsed = new Date(dateOnly);

  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : fallback;
}

function readProjectKey(value: unknown) {
  const item = asRecord(value);
  const nestedProject = asRecord(item.project);
  const payload = asRecord(item.payload);
  const reportPayload = asRecord(item.reportPayload ?? item.report_json);
  return readString(item.projectKey)
    || readString(item.project_key)
    || readString(nestedProject.projectKey)
    || readString(asRecord(payload.project).projectKey)
    || readString(asRecord(reportPayload.project).projectKey);
}

function readProjectId(value: unknown) {
  const item = asRecord(value);
  const nestedProject = asRecord(item.project);
  return readString(item.projectId)
    || readString(item.project_id)
    || readString(nestedProject.id);
}

function belongsToProject(value: unknown, project: GeoAIProject) {
  const itemProjectKey = readProjectKey(value);
  if (itemProjectKey) return itemProjectKey === project.projectKey;

  const itemProjectId = readProjectId(value);
  if (itemProjectId && project.id) return itemProjectId === project.id;

  return false;
}

function assetSourceTypeFromDataSource(source: DataSource): DataRoomSourceType {
  if (source.integrationStatus === "requires_access" || source.integrationStatus === "requires_license") {
    return "permission_required";
  }

  if (source.status === "planned" || source.status === "unavailable") {
    return "planned_validation";
  }

  if (source.sourceType === "mock" || source.sourceType === "demo" || source.integrationStatus === "active_demo") {
    return "sample_fallback";
  }

  if (source.sourceType === "open_data" || source.sourceType === "open_geospatial") {
    return source.usedInCurrentPrototype ? "public_snapshot" : "planned_validation";
  }

  if (source.sourceType === "official") {
    return source.usedInCurrentPrototype ? "public_snapshot" : "planned_validation";
  }

  if (source.sourceType === "commercial" || source.sourceType === "customer") {
    return source.usedInCurrentPrototype ? "api_context" : "permission_required";
  }

  return "planned_validation";
}

function validationStatusFromDataSource(source: DataSource): DataRoomValidationStatus {
  if (source.status === "mock") return "sample_fallback";
  if (source.status === "connected" && (source.sourceType === "mock" || source.sourceType === "demo")) return "sample_fallback";
  if (source.status === "connected" && source.usedInCurrentPrototype) return "sample_fallback";
  if (source.integrationStatus === "requires_access" || source.integrationStatus === "requires_license") return "planned_official_validation";
  if (source.status === "planned" || source.status === "unavailable") return "planned_official_validation";
  return "validation_required";
}

function dataRoomAsset(input: Omit<DataRoomAsset, "caveat" | "createdAt" | "updatedAt"> & {
  caveat?: string;
  createdAt?: string;
  updatedAt?: string;
}): DataRoomAsset {
  const timestamp = nowIso();
  return {
    ...input,
    createdAt: toIsoDate(input.createdAt, timestamp),
    updatedAt: toIsoDate(input.updatedAt ?? input.createdAt, timestamp),
    caveat: input.caveat ?? dataRoomRequiredCaveat
  };
}

function aoiAsset(aoi: ProjectAoi): DataRoomAsset {
  return dataRoomAsset({
    id: `derived-aoi-${aoi.id}`,
    projectId: aoi.projectId ?? null,
    projectKey: aoi.projectKey,
    name: aoi.name,
    description: `${aoi.sourceType === "uploaded_geojson" ? "Uploaded GeoJSON" : "User-drawn"} AOI, ${aoi.measurements.areaSqKm.toFixed(2)} sq km.`,
    assetType: "aoi",
    sourceType: aoi.sourceType === "uploaded_geojson" ? "user_uploaded" : "user_drawn",
    linkedAoiIds: [aoi.id],
    validationStatus: aoi.sourceType === "uploaded_geojson" ? "client_provided_unvalidated" : "validation_required",
    createdAt: aoi.createdAt,
    updatedAt: aoi.updatedAt
  });
}

function uploadedDatasetAsset(value: unknown, project: GeoAIProject): DataRoomAsset {
  const item = asRecord(value);
  const id = readString(item.id, `uploaded-${readString(item.name, "dataset")}`);
  const type = readString(item.type, "csv");
  const uploadedAt = toIsoDate(item.uploadedAt);
  const assetType: DataRoomAssetType = type === "geojson" ? "uploaded_geojson" : "uploaded_csv";

  return dataRoomAsset({
    id: `derived-upload-${id}`,
    projectId: readString(item.projectId) || project.id,
    projectKey: readString(item.projectKey, project.projectKey),
    name: readString(item.name, "Client uploaded dataset"),
    description: readString(item.officialStatus, "Uploaded metadata; validation required."),
    assetType,
    sourceType: "user_uploaded",
    fileName: readString(item.fileName) || readString(item.name),
    mimeType: type === "geojson" ? "application/geo+json" : "text/csv",
    validationStatus: "client_provided_unvalidated",
    createdAt: uploadedAt,
    updatedAt: uploadedAt
  });
}

function analysisAsset(value: unknown, project: GeoAIProject): DataRoomAsset {
  const item = asRecord(value);
  const payload = asRecord(item.payload ?? item.result_json ?? item.result_payload);
  const id = readString(item.id) || readString(item.run_key) || readString(payload.id, `analysis-${project.projectKey}`);
  const createdAt = toIsoDate(readString(item.createdAt) || readString(item.created_at) || readString(payload.generatedAt));
  const selectedName = readString(item.title) || readString(item.selected_name) || readString(payload.title, "Analysis run");
  const selectedType = readString(item.selected_type) || readString(item.targetType, "analysis");

  return dataRoomAsset({
    id: `derived-analysis-${id}`,
    projectId: readString(item.projectId) || readString(item.project_id) || project.id,
    projectKey: readString(item.projectKey) || readString(item.project_key) || project.projectKey,
    name: selectedName,
    description: `${selectedType} / generated GeoAI screening analysis.`,
    assetType: "analysis",
    sourceType: "generated_by_geoai",
    linkedAnalysisIds: [id],
    validationStatus: "ready_for_review",
    createdAt,
    updatedAt: createdAt
  });
}

function reportAsset(value: unknown, project: GeoAIProject): DataRoomAsset {
  const item = asRecord(value);
  const id = readString(item.id) || readString(item.report_key) || `report-${project.projectKey}`;
  const createdAt = toIsoDate(readString(item.createdAt) || readString(item.created_at) || readString(item.generated_at));

  return dataRoomAsset({
    id: `derived-report-${id}`,
    projectId: readString(item.projectId) || readString(item.project_id) || project.id,
    projectKey: readString(item.projectKey) || readString(item.project_key) || project.projectKey,
    name: readString(item.title, "GeoAI report / memo"),
    description: readString(item.sourceSummary, "Saved report; official validation required."),
    assetType: "report",
    sourceType: "generated_by_geoai",
    linkedReportIds: [id],
    validationStatus: "ready_for_review",
    createdAt,
    updatedAt: createdAt
  });
}

function comparisonAsset(value: unknown, project: GeoAIProject): DataRoomAsset {
  const item = asRecord(value);
  const id = readString(item.id, `comparison-${project.projectKey}`);
  const createdAt = toIsoDate(readString(item.createdAt) || readString(item.created_at));

  return dataRoomAsset({
    id: `derived-comparison-${id}`,
    projectId: readString(item.projectId) || readString(item.project_id) || project.id,
    projectKey: readString(item.projectKey) || readString(item.project_key) || project.projectKey,
    name: readString(item.title, "Site comparison"),
    description: readString(item.sourceSummary) || readString(item.recommendation, "Comparison memo; official validation required."),
    assetType: "comparison",
    sourceType: "generated_by_geoai",
    validationStatus: "ready_for_review",
    createdAt,
    updatedAt: createdAt
  });
}

function externalSourceAssets(project: GeoAIProject): DataRoomAsset[] {
  const readinessById = new Map(getExternalDataReadiness().map((item) => [item.sourceId, item]));

  return dataSourceRegistry
    .filter((source) => source.usedInCurrentPrototype || source.plannedForPilot)
    .slice(0, 7)
    .map((source) => {
      const readiness = readinessById.get(source.id)
        ?? (source.id === "dubai-pulse-dld-apis" ? readinessById.get("dld-dubai-pulse-transactions") : undefined)
        ?? (source.id === "osm-geofabrik" ? readinessById.get("osm-geofabrik-baseline") : undefined);
      const timestamp = toIsoDate(source.lastUpdated);
      const isSnapshotEvidence = readiness?.status === "snapshot_available" && Boolean(readiness.recordCount && readiness.recordCount > 0);

      return dataRoomAsset({
        id: `source-${project.projectKey}-${source.id}`,
        projectId: project.id,
        projectKey: project.projectKey,
        name: source.name,
        description: readiness
          ? `${readiness.status.replace(/_/g, " ")} / ${readiness.recordCount ?? 0} record(s). ${readiness.caveat}`
          : source.limitations ?? source.description,
        assetType: "external_source",
        sourceType: isSnapshotEvidence ? "public_snapshot" : assetSourceTypeFromDataSource(source),
        validationStatus: isSnapshotEvidence ? "validation_required" : validationStatusFromDataSource(source),
        createdAt: readiness?.lastUpdated ?? timestamp,
        updatedAt: readiness?.lastUpdated ?? timestamp,
        caveat: readiness?.caveat ?? source.limitations ?? dataRoomRequiredCaveat
      });
    });
}

function checklistTemplate(
  project: GeoAIProject,
  title: string,
  category: ValidationChecklistCategory,
  priority: ValidationChecklistPriority,
  description: string,
  status: ValidationChecklistStatus = "required"
): ValidationChecklistItem {
  return {
    id: `default-${project.projectKey}-${category}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 42)}`,
    projectId: project.id,
    projectKey: project.projectKey,
    title,
    category,
    status,
    priority,
    description,
    linkedAssetIds: [],
    caveat: dataRoomRequiredCaveat
  };
}

function defaultChecklist(project: GeoAIProject): ValidationChecklistItem[] {
  const clientType = project.clientType;

  if (clientType === "developer") {
    return [
      checklistTemplate(project, "Validate planning and zoning constraints", "zoning", "high", "Confirm land-use, planning restrictions and permitted development assumptions with official or client-approved sources."),
      checklistTemplate(project, "Validate infrastructure capacity and road access", "infrastructure", "high", "Confirm access, utilities and infrastructure readiness outside GeoAI before development decisions."),
      checklistTemplate(project, "Validate land ownership and title", "ownership", "high", "Ownership/title must be validated outside GeoAI; current data room only tracks screening evidence."),
      checklistTemplate(project, "Validate development assumptions", "planning", "medium", "Review GFA, phasing, absorption and feasibility assumptions with client and official evidence."),
      checklistTemplate(project, "Validate environmental and climate constraints", "climate", "medium", "Use official or licensed environmental and climate evidence where required.")
    ];
  }

  if (clientType === "bank") {
    return [
      checklistTemplate(project, "Validate collateral identity", "parcel", "high", "Confirm asset identity, geometry and collateral scope outside GeoAI."),
      checklistTemplate(project, "Validate ownership and title", "ownership", "high", "Ownership/title checks are not performed by GeoAI and require approved validation sources."),
      checklistTemplate(project, "Validate valuation and comparable evidence", "market", "high", "Market comps and valuation evidence require official, licensed or client-approved validation."),
      checklistTemplate(project, "Validate construction or progress evidence", "report", "medium", "If relevant, confirm progress evidence through client, drone, satellite or consultant sources."),
      checklistTemplate(project, "Validate risk flags and monitoring priorities", "climate", "medium", "Confirm risk flags and monitoring cadence with lender/client policy.")
    ];
  }

  return [
    checklistTemplate(project, "Validate DLD / Dubai Pulse transaction and rental evidence", "market", "high", "Confirm imported/snapshot market evidence against official DLD/Dubai Pulse access paths."),
    checklistTemplate(project, "Validate ownership and title outside GeoAI", "ownership", "high", "GeoAI does not verify ownership, title or legal standing."),
    checklistTemplate(project, "Validate zoning and planning with official sources", "zoning", "high", "Planning and zoning conclusions require official validation outside this demo."),
    checklistTemplate(project, "Confirm pipeline and absorption assumptions", "market", "medium", "Review pipeline, liquidity and absorption assumptions with client-approved evidence."),
    checklistTemplate(project, "Confirm climate and insurance implications", "climate", "medium", "Use official/licensed climate and insurance evidence where required.")
  ];
}

function mergeChecklist(defaultItems: ValidationChecklistItem[], storedItems: ValidationChecklistItem[]) {
  const byId = new Map(defaultItems.map((item) => [item.id, item]));
  for (const item of storedItems) {
    byId.set(item.id, { ...byId.get(item.id), ...item, caveat: item.caveat ?? dataRoomRequiredCaveat });
  }
  return Array.from(byId.values());
}

function deliverable(
  project: GeoAIProject,
  type: PilotDeliverable["deliverableType"],
  title: string,
  status: PilotDeliverableStatus,
  nextAction: string,
  links: Pick<PilotDeliverable, "linkedReportIds" | "linkedAnalysisIds" | "linkedAoiIds"> = {}
): PilotDeliverable {
  return {
    id: `deliverable-${project.projectKey}-${type}`,
    projectId: project.id,
    projectKey: project.projectKey,
    title,
    deliverableType: type,
    status,
    nextAction,
    caveat: dataRoomRequiredCaveat,
    ...links
  };
}

function createDeliverables(project: GeoAIProject, assets: DataRoomAsset[], checklist: ValidationChecklistItem[]): PilotDeliverable[] {
  const aoiIds = assets.filter((asset) => asset.assetType === "aoi").flatMap((asset) => asset.linkedAoiIds ?? []);
  const analysisIds = assets.filter((asset) => asset.assetType === "analysis").flatMap((asset) => asset.linkedAnalysisIds ?? []);
  const reportIds = assets.filter((asset) => asset.assetType === "report").flatMap((asset) => asset.linkedReportIds ?? []);
  const comparisonAvailable = assets.some((asset) => asset.assetType === "comparison");
  const validationCompleted = checklist.some((item) => item.status === "completed");

  return [
    deliverable(project, "screening_dashboard", "Screening dashboard", analysisIds.length > 0 ? "generated" : "planned", analysisIds.length > 0 ? "Review assumptions and validation gaps." : "Run Express Analysis for one or more sites.", { linkedAnalysisIds: analysisIds }),
    deliverable(project, "aoi_library", "AOI library", aoiIds.length > 0 ? "generated" : "planned", aoiIds.length > 0 ? "Confirm AOI geometry with client or official source." : "Draw or import AOIs in the workspace.", { linkedAoiIds: aoiIds }),
    deliverable(project, "comparison_memo", "Comparison memo", comparisonAvailable ? "generated" : "planned", comparisonAvailable ? "Validate assumptions before presenting as recommendation." : "Compare two or three shortlisted sites."),
    deliverable(project, "investment_memo", project.clientType === "bank" ? "Collateral / investment memo" : "Investment memo", reportIds.length > 0 ? "generated" : "planned", reportIds.length > 0 ? "Export and review official validation gaps." : "Generate an exportable report.", { linkedReportIds: reportIds }),
    deliverable(project, "validation_checklist", "Validation checklist", validationCompleted ? "in_progress" : "validation_required", "Mark client/official validation items as they move through review."),
    deliverable(project, "source_lineage_pack", "Source lineage pack", "in_progress", "Replace demo/sample evidence with client-approved or official validated sources."),
    deliverable(project, "data_room_summary", "Client data room summary", assets.length > 0 ? "in_progress" : "planned", "Use this page as the lightweight pilot evidence index.")
  ];
}

function summarizeChecklist(checklist: ValidationChecklistItem[]) {
  return checklist.reduce(
    (counts, item) => {
      counts.total += 1;
      if (item.status === "completed") counts.completed += 1;
      if (item.status === "required") counts.required += 1;
      if (item.status === "in_review") counts.inReview += 1;
      if (item.status === "blocked") counts.blocked += 1;
      return counts;
    },
    { completed: 0, required: 0, inReview: 0, blocked: 0, total: 0 }
  );
}

function dedupeAssets(assets: DataRoomAsset[]) {
  const byId = new Map<string, DataRoomAsset>();
  for (const asset of assets) {
    byId.set(asset.id, {
      ...asset,
      createdAt: toIsoDate(asset.createdAt),
      updatedAt: toIsoDate(asset.updatedAt ?? asset.createdAt),
      caveat: asset.caveat ?? dataRoomRequiredCaveat
    });
  }
  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function buildClientDataRoom(input: { projectKey?: string | null; projectId?: string | null } = {}): Promise<ClientDataRoom> {
  const project = demoProjects.find((item) =>
    (input.projectKey && item.projectKey === input.projectKey) ||
    (input.projectId && (item.id === input.projectId || item.projectKey === input.projectId))
  ) ?? getDemoProject(input.projectKey ?? input.projectId);
  const projectKey = project.projectKey;

  const [
    manualAssetsResult,
    storedChecklistResult,
    aoiResult,
    uploadResult,
    analysisResult,
    reportResult,
    comparisonResult
  ] = await Promise.all([
    listDataRoomAssets({ projectId: project.id, projectKey, limit: 80 }),
    listDataRoomChecklist({ projectId: project.id, projectKey, limit: 50 }),
    listAois({ projectId: project.id, projectKey, limit: 50 }),
    listUploadedDatasetRecords({ projectId: project.id, projectKey, limit: 50 }),
    listAnalysisRuns(50, project.id),
    listReports({ projectId: project.id, projectKey, limit: 50 }),
    listComparisonSets({ projectId: project.id, projectKey, limit: 50 })
  ]);

  const localAnalyses = Array.isArray(analysisResult.data)
    ? analysisResult.data.filter((item) => belongsToProject(item, project))
    : [];
  const seededAnalyses = seededDemoRecentAnalyses
    .filter((item) => item.analysis.project?.projectKey === projectKey)
    .map((item) => ({
      id: item.analysis.id,
      title: item.title,
      scenario: item.scenarioLabel,
      projectKey,
      projectId: project.id,
      createdAt: item.timestamp,
      payload: item.analysis
    }));
  const analyses = localAnalyses.length > 0 ? localAnalyses : seededAnalyses;

  const reports = Array.isArray(reportResult.data) && reportResult.data.length > 0
    ? reportResult.data
    : seededDemoReportRecords.filter((report) => report.projectKey === projectKey);
  const comparisons = Array.isArray(comparisonResult.data) && comparisonResult.data.length > 0
    ? comparisonResult.data
    : seededDemoComparisonSummaries.filter((comparison) => comparison.projectKey === projectKey);

  const derivedAssets = [
    ...(aoiResult.data ?? []).map(aoiAsset),
    ...((uploadResult.data ?? []) as unknown[]).map((item) => uploadedDatasetAsset(item, project)),
    ...analyses.map((item) => analysisAsset(item, project)),
    ...(reports as unknown[]).map((item) => reportAsset(item, project)),
    ...(comparisons as unknown[]).map((item) => comparisonAsset(item, project)),
    ...externalSourceAssets(project)
  ];
  const assets = dedupeAssets([...(manualAssetsResult.data ?? []), ...derivedAssets]);
  const checklist = mergeChecklist(defaultChecklist(project), storedChecklistResult.data ?? []);
  const deliverables = createDeliverables(project, assets, checklist);
  const counts = {
    aois: assets.filter((asset) => asset.assetType === "aoi").length,
    uploadedDatasets: assets.filter((asset) => asset.assetType === "uploaded_csv" || asset.assetType === "uploaded_geojson").length,
    uploadedDocuments: assets.filter((asset) => asset.assetType === "uploaded_document").length,
    analyses: assets.filter((asset) => asset.assetType === "analysis").length,
    reports: assets.filter((asset) => asset.assetType === "report").length,
    comparisons: assets.filter((asset) => asset.assetType === "comparison").length,
    validationItems: checklist.length,
    externalSources: assets.filter((asset) => asset.assetType === "external_source").length
  };

  return {
    ok: true,
    mode: "local_fallback",
    storageCaveat: dataRoomStorageCaveat,
    projectId: project.id,
    projectKey,
    project,
    projectClientType: project.clientType as ProjectClientType,
    assets,
    checklist,
    deliverables,
    summary: {
      counts,
      label: "Data room foundation active",
      storageMode: "local_fallback",
      storageNote: "Local/demo fallback; durable storage not configured.",
      validationNote: dataRoomRequiredCaveat,
      latestAssets: assets.slice(0, 3),
      checklistStatus: summarizeChecklist(checklist)
    },
    dataHonesty: {
      caveat: dataRoomRequiredCaveat,
      storageCaveat: dataRoomStorageCaveat,
      allowedLabels: [
        "client-provided data",
        "uploaded metadata",
        "user-provided AOI",
        "local/demo fallback",
        "validation required",
        "planned official validation",
        "screening evidence package",
        "pilot data room foundation",
        "permission required"
      ],
      forbiddenClaims: [
        "verified ownership",
        "official parcel proof",
        "cadastral proof",
        "zoning approval",
        "legal conclusion",
        "valuation conclusion",
        "production-ready storage",
        "secure data room",
        "enterprise data room"
      ]
    },
    error: null
  };
}
