import { getDemoFeatureById, getSelectedDemoObject } from "@/src/data/demo-layers";
import { seededDemoRecentAnalyses } from "@/src/data/demo-report-seeds";
import { createGuidedDemoSelection, guidedDemoPresets } from "@/src/data/guided-demo";
import { generateExploreCandidates } from "@/src/lib/explore/candidates";
import {
  getDefaultFilters,
  getDefaultRoleForAudience,
  getExploreScenariosByAudience,
  isExploreRoleForAudience
} from "@/src/lib/explore/scenarios";
import type { ExploreAudience, ExploreRole } from "@/src/lib/explore/types";
import {
  exploreCandidateToSelectedObject,
  exploreScenarioToAnalysisScenario
} from "@/src/lib/explore/workspace-bridge";
import { closePolygonRing, validatePolygonVertices } from "@/src/lib/polygon-aoi";
import {
  buildUploadedDataContext,
  readBrowserUploadedDatasets
} from "@/src/lib/uploaded-data";
import { readBrowserAois } from "@/src/lib/aoi-library";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { SpatialSelectionContext } from "@/src/types/spatial-data";
import type { ProjectAoi } from "@/src/types/aoi";
import type { UploadedDataset, UploadedDataContext } from "@/src/types/uploaded-data";
import type {
  AnalysisScenarioId,
  AnalysisTarget,
  DemoLayerType,
  ExpressAnalysis,
  SelectedDemoObject,
  SelectedPoint,
  UserDrawnAoi
} from "@/src/types/geo";

const maximumIdentityCharacters = 1_024;
const maximumCustomQueryCharacters = 4_000;
const requiredDataCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

const scenarioIds = new Set<AnalysisScenarioId>([
  "realEstateDevelopment",
  "investmentSiteSelection",
  "constructionMonitoring",
  "infrastructureUrbanPlanning",
  "climateRisk",
  "customQuery"
]);

export type AnalysisRestoreContext = {
  expectedProject: GeoAIProject;
  sourceProjectKey?: string | null;
  sourceProjectId?: string | null;
  projectAois?: readonly ProjectAoi[];
  uploadedDatasets?: readonly UploadedDataset[];
};

export type CanonicalAnalysisRestoreInputs = {
  point: SelectedPoint;
  selectedObject?: SelectedDemoObject;
  selectedAoi?: UserDrawnAoi;
  analysisTarget: AnalysisTarget;
  project: GeoAIProject;
  customQuery: string;
  uploadedDataContext?: UploadedDataContext;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoundedString(value: unknown, maximum = maximumIdentityCharacters) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximum ? normalized : null;
}

function readOptionalCustomQuery(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  return readBoundedString(value, maximumCustomQueryCharacters);
}

function readPoint(value: unknown): SelectedPoint | null {
  if (!isRecord(value)) return null;
  const latitude = value.latitude;
  const longitude = value.longitude;
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function pointsMatch(left: SelectedPoint, right: SelectedPoint) {
  return Math.abs(left.latitude - right.latitude) <= 1e-7 &&
    Math.abs(left.longitude - right.longitude) <= 1e-7;
}

type ProjectSegmentInspection = {
  invalid: boolean;
  value: ExploreAudience | null;
};

function inspectProjectSegment(value: unknown): ProjectSegmentInspection {
  if (!isRecord(value) || !isRecord(value.metadata)) {
    return { invalid: false, value: null };
  }

  const segment = value.metadata.segment;
  const audience = value.metadata.audience;
  const segmentPresent = segment !== undefined && segment !== null;
  const audiencePresent = audience !== undefined && audience !== null;
  const validSegment = segment === "b2b" || segment === "b2c" ? segment : null;
  const validAudience = audience === "b2b" || audience === "b2c" ? audience : null;

  if ((segmentPresent && !validSegment) || (audiencePresent && !validAudience)) {
    return { invalid: true, value: null };
  }
  if (validSegment && validAudience && validSegment !== validAudience) {
    return { invalid: true, value: null };
  }

  return { invalid: false, value: validSegment ?? validAudience };
}

function expectedProjectSegment(project: GeoAIProject): ExploreAudience | null {
  const inspection = inspectProjectSegment(project);
  if (inspection.invalid) return null;
  return inspection.value ?? "b2b";
}

function projectIdsMatch(value: unknown, expectedProject: GeoAIProject) {
  if (expectedProject.id === null) {
    return value === null || value === undefined;
  }
  return value === expectedProject.id;
}

export function projectRestoreBoundaryMatches(
  value: unknown,
  context: AnalysisRestoreContext,
  allowSourceReference = false
) {
  const expectedSegment = expectedProjectSegment(context.expectedProject);
  if (!expectedSegment || !readBoundedString(context.expectedProject.projectKey)) return false;

  if (context.sourceProjectKey !== undefined && context.sourceProjectKey !== context.expectedProject.projectKey) {
    return false;
  }
  if (context.sourceProjectId !== undefined && !projectIdsMatch(context.sourceProjectId, context.expectedProject)) {
    return false;
  }

  if (!isRecord(value)) {
    return allowSourceReference &&
      context.sourceProjectKey === context.expectedProject.projectKey &&
      (context.expectedProject.id === null || context.sourceProjectId === context.expectedProject.id);
  }

  const restoredSegment = inspectProjectSegment(value);
  if (restoredSegment.invalid || (restoredSegment.value && restoredSegment.value !== expectedSegment)) {
    return false;
  }

  return value.projectKey === context.expectedProject.projectKey &&
    projectIdsMatch(value.id, context.expectedProject);
}

function getProjectExploreRole(project: GeoAIProject, audience: ExploreAudience): ExploreRole {
  const metadataRole = project.metadata?.role ?? project.metadata?.audienceRole;
  if (isExploreRoleForAudience(audience, metadataRole)) return metadataRole;

  if (audience === "b2b") {
    if (project.clientType === "developer") return "developer";
    if (project.clientType === "bank") return "bank_lender";
    if (project.clientType === "government") return "government_urban_authority";
    if (project.clientType === "family_office") return "family_office";
    if (project.clientType === "fund") return "real_estate_fund";
  }

  return getDefaultRoleForAudience(audience);
}

function findAppOwnedBaseSelection(id: string) {
  const demoFeature = getDemoFeatureById(id);
  if (demoFeature) return getSelectedDemoObject(demoFeature);

  const guidedPreset = guidedDemoPresets.find((preset) => createGuidedDemoSelection(preset).id === id);
  if (guidedPreset) {
    return {
      projectKey: guidedPreset.projectKey,
      scenarioId: guidedPreset.scenarioId,
      selection: createGuidedDemoSelection(guidedPreset)
    };
  }

  const seeded = seededDemoRecentAnalyses.find((item) => item.analysis.selectedObject?.id === id);
  if (seeded?.analysis.selectedObject) {
    return {
      projectKey: seeded.analysis.project?.projectKey ?? null,
      scenarioId: seeded.analysis.scenarioId,
      selection: seeded.analysis.selectedObject
    };
  }

  return null;
}

function findAppOwnedExploreSelection(
  id: string,
  expectedProject: GeoAIProject,
  analysisScenarioId: AnalysisScenarioId,
  customQuery: string
): SelectedDemoObject | null {
  if (!id.startsWith("explore-") || id.length <= "explore-".length) return null;
  const candidateId = id.slice("explore-".length);
  const audience = expectedProjectSegment(expectedProject);
  if (!audience) return null;
  const role = getProjectExploreRole(expectedProject, audience);

  try {
    for (const scenario of getExploreScenariosByAudience(audience)) {
      if (exploreScenarioToAnalysisScenario(scenario.id) !== analysisScenarioId) continue;

      for (const interactionMode of scenario.interactionModes) {
        const candidate = generateExploreCandidates({
          audience,
          role,
          scenarioId: scenario.id,
          interactionMode,
          naturalLanguageQuery: customQuery || scenario.sampleQueries[0] || "",
          filters: getDefaultFilters(scenario.inputSchema),
          selectedPointOrArea: {
            label: interactionMode === "criteria_first" ? "Workspace criteria search" : "Workspace map selection",
            areaHint: "No persisted area identity is trusted during restore"
          }
        }).find((item) => item.id === candidateId && item.audience === audience);
        if (!candidate || candidate.scenarioId !== scenario.id) continue;

        const canonicalSelection = exploreCandidateToSelectedObject(candidate);
        if (canonicalSelection.id === id) return canonicalSelection;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function toDemoGeometryType(geometryType: GeoJSON.Geometry["type"]): DemoLayerType {
  if (geometryType === "Point" || geometryType === "MultiPoint") return "point";
  if (geometryType === "LineString" || geometryType === "MultiLineString") return "line";
  return "polygon";
}

function toSpatialGeometryType(geometryType: GeoJSON.Geometry["type"]): SpatialSelectionContext["geometryType"] {
  if (geometryType === "Point" || geometryType === "MultiPoint") return "Point";
  if (geometryType === "LineString" || geometryType === "MultiLineString") return "LineString";
  return "Polygon";
}

function collectGeometryCoordinates(geometry: GeoJSON.Geometry): [number, number][] {
  if (geometry.type === "Point") return [geometry.coordinates as [number, number]];
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") {
    return geometry.coordinates as [number, number][];
  }
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
    return geometry.coordinates.flat(1) as [number, number][];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flat(2) as [number, number][];
  }
  return [];
}

function getGeometryCenter(geometry: GeoJSON.Geometry): SelectedPoint | null {
  const coordinates = collectGeometryCoordinates(geometry);
  if (
    coordinates.length === 0 ||
    coordinates.some(([longitude, latitude]) =>
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180 ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    )
  ) {
    return null;
  }

  const total = coordinates.reduce(
    (sum, [longitude, latitude]) => ({
      longitude: sum.longitude + longitude,
      latitude: sum.latitude + latitude
    }),
    { longitude: 0, latitude: 0 }
  );
  return {
    longitude: total.longitude / coordinates.length,
    latitude: total.latitude / coordinates.length
  };
}

function currentRestoreDatasets(context: AnalysisRestoreContext) {
  const datasets = context.uploadedDatasets ?? readBrowserUploadedDatasets();
  return datasets.filter((dataset) =>
    dataset.projectKey === context.expectedProject.projectKey &&
    dataset.status === "parsed" &&
    (dataset.sourceMode === "user-uploaded" || dataset.sourceMode === "sample-fixture") &&
    dataset.officialStatus === "official-validation-required"
  );
}

function readUserUploadedObject(
  value: Record<string, unknown>,
  context: AnalysisRestoreContext,
  scenarioId: AnalysisScenarioId
): SelectedDemoObject | null {
  if (!isRecord(value.analysisTarget)) return null;
  const target = value.analysisTarget;
  const targetId = readBoundedString(target.id);
  const datasetId = readBoundedString(target.datasetId);
  const objectId = readBoundedString(value.id, maximumIdentityCharacters);
  if (!targetId || !datasetId || !objectId) return null;

  const dataset = currentRestoreDatasets(context).find((candidate) =>
    candidate.id === datasetId &&
    candidate.type === "geojson" &&
    candidate.sourceMode === "user-uploaded"
  );
  if (!dataset?.geojson) return null;

  const feature = dataset.geojson.features.find((candidate) =>
    String(candidate.id ?? candidate.properties?.id ?? "") === targetId
  );
  if (!feature?.geometry || !isRecord(feature.properties)) return null;

  const canonicalFeatureId = readBoundedString(feature.id ?? feature.properties.id);
  const canonicalFeatureName = readBoundedString(feature.properties.name);
  const canonicalObjectId = canonicalFeatureId ? `uploaded-${dataset.id}-${canonicalFeatureId}` : null;
  const center = getGeometryCenter(feature.geometry);
  if (
    !canonicalFeatureId ||
    !canonicalFeatureName ||
    !canonicalObjectId ||
    objectId !== canonicalObjectId ||
    !center
  ) {
    return null;
  }

  const spatialContext: SpatialSelectionContext = {
    featureId: canonicalFeatureId,
    featureName: canonicalFeatureName,
    datasetId: dataset.id,
    datasetName: dataset.name,
    category: "future_customer_upload",
    subtype: "user-uploaded geometry",
    geometryType: toSpatialGeometryType(feature.geometry.type),
    centroid: center,
    sourceId: "customer-uploaded-documents",
    sourceStatus: "planned",
    geometryStatus: "needs_review",
    confidenceLevel: "low",
    limitations: [
      "User-provided geometry was revalidated from the active project-scoped browser dataset during restore.",
      requiredDataCaveat
    ],
    scenarioRelevance: [scenarioId],
    canonicalFeatureKey: `user-uploaded:${dataset.id}:${canonicalFeatureId}`,
    layerKey: "futureCustomerAssets",
    geometryOrigin: "user",
    geometryAccuracy: "approximate",
    qualitySummary: "User-provided geometry and dataset identity were structurally revalidated; independent source validation remains required.",
    attributionIds: ["customer-uploaded-documents"],
    sourceAttributions: ["Customer-provided geometry"],
    caveat: requiredDataCaveat
  };

  return {
    id: canonicalObjectId,
    name: canonicalFeatureName,
    type: "Uploaded screening geometry",
    layerId: "futureCustomerAssets",
    layerName: dataset.name,
    geometryType: toDemoGeometryType(feature.geometry.type),
    center,
    spatialContext,
    analysisTarget: {
      id: canonicalFeatureId,
      type: "uploaded-feature",
      label: canonicalFeatureName,
      coordinates: center,
      geometry: feature.geometry,
      properties: {
        uploadedFeatureId: canonicalFeatureId,
        uploadedDatasetId: dataset.id,
        uploadedDatasetName: dataset.name,
        sourceMode: "user-uploaded",
        officialStatus: "official-validation-required"
      },
      datasetId: dataset.id,
      datasetName: dataset.name,
      sourceMode: "user-uploaded",
      officialStatus: "official-validation-required"
    }
  };
}

function readCanonicalSelectedObject(
  value: unknown,
  context: AnalysisRestoreContext,
  scenarioId: AnalysisScenarioId,
  customQuery: string
): SelectedDemoObject | null {
  if (!isRecord(value)) return null;
  const id = readBoundedString(value.id, maximumIdentityCharacters);
  if (!id) return null;

  const baseSelection = findAppOwnedBaseSelection(id);
  if (baseSelection && "selection" in baseSelection) {
    if (
      baseSelection.projectKey !== context.expectedProject.projectKey ||
      baseSelection.scenarioId !== scenarioId
    ) {
      return null;
    }
    return baseSelection.selection;
  }
  if (baseSelection) return baseSelection;

  const exploreSelection = findAppOwnedExploreSelection(id, context.expectedProject, scenarioId, customQuery);
  if (exploreSelection) return exploreSelection;

  return readUserUploadedObject(value, context, scenarioId);
}

function readCanonicalAoi(value: unknown, context: AnalysisRestoreContext): UserDrawnAoi | null {
  if (!isRecord(value)) return null;
  const persistedId = readBoundedString(value.id);
  const savedAoiId = readBoundedString(value.savedAoiId ?? value.id);
  if (!persistedId || !savedAoiId || persistedId !== savedAoiId) return null;

  const projectIdentity = value.projectId;
  if (
    projectIdentity !== undefined &&
    projectIdentity !== null &&
    projectIdentity !== context.expectedProject.projectKey &&
    projectIdentity !== context.expectedProject.id
  ) {
    return null;
  }

  const aois = context.projectAois ?? readBrowserAois();
  const canonical = aois.find((candidate) =>
    candidate.id === savedAoiId &&
    candidate.projectKey === context.expectedProject.projectKey &&
    (candidate.projectId === null ||
      candidate.projectId === undefined ||
      candidate.projectId === context.expectedProject.id)
  );
  if (!canonical || canonical.geometry.type !== "Polygon") return null;

  const ring = canonical.geometry.coordinates[0];
  if (!Array.isArray(ring)) return null;
  const validation = validatePolygonVertices(ring as [number, number][]);
  if (!validation.valid || !validation.measurements) return null;
  const closedRing = closePolygonRing(ring as [number, number][]);

  return {
    id: canonical.id,
    name: canonical.name,
    geometryType: "Polygon",
    geometry: { type: "Polygon", coordinates: [closedRing] },
    coordinates: closedRing,
    centroid: validation.measurements.centroid,
    bbox: validation.measurements.bbox,
    measurements: validation.measurements,
    source: canonical.sourceType === "uploaded_geojson" ? "uploaded_geojson_polygon" : "user_drawn_polygon",
    dataMode: canonical.dataMode,
    confidence: "validation_required",
    projectId: context.expectedProject.projectKey,
    limitations: [
      "Project-scoped browser AOI geometry was revalidated and remeasured during restore.",
      requiredDataCaveat
    ],
    savedAoiId: canonical.id,
    sourceType: canonical.sourceType,
    validationStatus: "validation_required"
  };
}

function safeObjectTarget(selectedObject: SelectedDemoObject): AnalysisTarget {
  const target = selectedObject.analysisTarget;
  if (target) {
    const sourceMode = target.sourceMode === "official_validated" ? "demo" : target.sourceMode ?? "demo";
    const officialStatus = target.officialStatus === "official-validated-contract"
      ? "not-official"
      : target.officialStatus ?? "not-official";
    return {
      ...target,
      label: selectedObject.name,
      coordinates: selectedObject.center,
      properties: isRecord(target.properties)
        ? { ...target.properties, sourceMode, officialStatus }
        : target.properties,
      sourceMode,
      officialStatus
    };
  }

  return {
    id: selectedObject.id,
    type: "demo-feature",
    label: selectedObject.name,
    coordinates: selectedObject.center,
    geometry: {
      type: "Point",
      coordinates: [selectedObject.center.longitude, selectedObject.center.latitude]
    },
    datasetName: selectedObject.layerName,
    sourceMode: "demo",
    officialStatus: "not-official"
  };
}

function safeAoiTarget(selectedAoi: UserDrawnAoi): AnalysisTarget {
  return {
    id: selectedAoi.id,
    type: "user-drawn-aoi",
    label: selectedAoi.name,
    coordinates: selectedAoi.centroid,
    geometry: selectedAoi.geometry,
    bbox: selectedAoi.bbox,
    measurements: selectedAoi.measurements,
    datasetId: selectedAoi.sourceType === "uploaded_geojson" ? "uploaded-geojson-aoi" : "user-drawn-aoi",
    datasetName: selectedAoi.sourceType === "uploaded_geojson" ? "Uploaded GeoJSON AOI" : "User-drawn AOI",
    sourceMode: selectedAoi.sourceType === "uploaded_geojson" ? "user-uploaded" : "user-drawn",
    officialStatus: "official-validation-required",
    properties: {
      source: selectedAoi.source,
      sourceType: selectedAoi.sourceType,
      dataMode: selectedAoi.dataMode,
      validationStatus: selectedAoi.validationStatus,
      confidence: selectedAoi.confidence,
      limitations: selectedAoi.limitations
    }
  };
}

function safePointTarget(point: SelectedPoint): AnalysisTarget {
  return {
    id: `point-${point.latitude.toFixed(6)}-${point.longitude.toFixed(6)}`,
    type: "point",
    label: "Custom map selection",
    coordinates: point,
    geometry: {
      type: "Point",
      coordinates: [point.longitude, point.latitude]
    },
    sourceMode: "demo",
    officialStatus: "not-official"
  };
}

export function createBrowserAnalysisRestoreContext(
  expectedProject: GeoAIProject,
  sourceReference: Pick<AnalysisRestoreContext, "sourceProjectKey" | "sourceProjectId"> = {}
): AnalysisRestoreContext {
  return {
    expectedProject,
    ...sourceReference,
    projectAois: readBrowserAois(),
    uploadedDatasets: readBrowserUploadedDatasets()
  };
}

export function canonicalizeRestoredAnalysisInputs(
  value: unknown,
  context: AnalysisRestoreContext
): CanonicalAnalysisRestoreInputs | null {
  try {
    if (!isRecord(value) || !projectRestoreBoundaryMatches(value.project, context, true)) return null;
    const point = readPoint(value.point);
    const scenarioId = value.scenarioId;
    const customQuery = readOptionalCustomQuery(value.customQuery);
    if (
      !point ||
      typeof scenarioId !== "string" ||
      !scenarioIds.has(scenarioId as AnalysisScenarioId) ||
      customQuery === null
    ) {
      return null;
    }

    const hasSelectedObject = value.selectedObject !== undefined && value.selectedObject !== null;
    const hasSelectedAoi = value.selectedAoi !== undefined && value.selectedAoi !== null;
    if (hasSelectedObject && hasSelectedAoi) return null;

    const selectedObject = hasSelectedObject
      ? readCanonicalSelectedObject(value.selectedObject, context, scenarioId as AnalysisScenarioId, customQuery)
      : null;
    const selectedAoi = hasSelectedAoi ? readCanonicalAoi(value.selectedAoi, context) : null;
    if ((hasSelectedObject && !selectedObject) || (hasSelectedAoi && !selectedAoi)) return null;
    if (selectedObject && !pointsMatch(point, selectedObject.center)) return null;
    if (selectedAoi && !pointsMatch(point, selectedAoi.centroid)) return null;

    const datasets = currentRestoreDatasets(context);
    const shouldRebuildUploadedContext = value.uploadedDataContext !== undefined ||
      selectedObject?.analysisTarget?.sourceMode === "user-uploaded";

    return {
      point,
      selectedObject: selectedObject ?? undefined,
      selectedAoi: selectedAoi ?? undefined,
      analysisTarget: selectedAoi
        ? safeAoiTarget(selectedAoi)
        : selectedObject
          ? safeObjectTarget(selectedObject)
          : safePointTarget(point),
      project: context.expectedProject,
      customQuery,
      uploadedDataContext: shouldRebuildUploadedContext
        ? buildUploadedDataContext(datasets, point, selectedObject)
        : undefined
    };
  } catch {
    return null;
  }
}
