import { getDemoFeatureById, getSelectedDemoObject } from "@/src/data/demo-layers";
import {
  seededDemoComparisonSummaries,
  seededDemoRecentAnalyses
} from "@/src/data/demo-report-seeds";
import { createGuidedDemoSelection, guidedDemoPresets } from "@/src/data/guided-demo";
import { readBrowserAois } from "@/src/lib/aoi-library";
import { browserDemoStorageKey, isBrowserDemoStorageEnabled } from "@/src/lib/browser-demo-storage";
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
import { createComparisonItem, createMockComparison } from "@/src/lib/mock-comparison";
import { closePolygonRing, validatePolygonVertices } from "@/src/lib/polygon-aoi";
import { readBrowserUploadedDatasets } from "@/src/lib/uploaded-data";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { SpatialSelectionContext } from "@/src/types/spatial-data";
import type {
  AnalysisScenarioId,
  ComparisonItem,
  ComparisonResult,
  DemoLayerType,
  SelectedDemoObject,
  SelectedPoint,
  UserDrawnAoi
} from "@/src/types/geo";

const maximumSerializedComparisonCharacters = 512 * 1024;
const maximumComparisonItems = 3;
const maximumIdentityCharacters = 240;
const maximumCustomQueryCharacters = 4_000;
const requiredDataCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

const scenarioIds = new Set<AnalysisScenarioId>([
  "realEstateDevelopment",
  "investmentSiteSelection",
  "constructionMonitoring",
  "infrastructureUrbanPlanning",
  "climateRisk",
  "customQuery"
]);

const guidedDemoSelections = guidedDemoPresets.map(createGuidedDemoSelection);

function comparisonStorageKey(projectKey: string, comparisonId: string) {
  return browserDemoStorageKey(`comparison-v1:${projectKey}:${comparisonId}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoundedString(value: unknown, maximum = maximumIdentityCharacters) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximum ? normalized : null;
}

function readOptionalBoundedString(value: unknown, maximum = maximumIdentityCharacters) {
  if (value === undefined || value === null) return undefined;
  return readBoundedString(value, maximum) ?? null;
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

function readProjectSegment(value: unknown): ExploreAudience | null {
  if (!isRecord(value) || !isRecord(value.metadata)) return null;
  const segment = value.metadata.segment;
  const audience = value.metadata.audience;
  const validSegment = segment === "b2b" || segment === "b2c" ? segment : null;
  const validAudience = audience === "b2b" || audience === "b2c" ? audience : null;
  if (validSegment && validAudience && validSegment !== validAudience) return null;
  return validSegment ?? validAudience;
}

function projectBoundaryMatches(value: unknown, expectedProject: GeoAIProject, projectKey: string) {
  if (!isRecord(value) || expectedProject.projectKey !== projectKey) return false;
  const expectedSegment = readProjectSegment(expectedProject);
  const restoredSegment = readProjectSegment(value);
  return value.projectKey === projectKey &&
    value.id === expectedProject.id &&
    expectedSegment !== null &&
    restoredSegment === expectedSegment;
}

function findAppOwnedSelection(id: string) {
  const demoFeature = getDemoFeatureById(id);
  if (demoFeature) return getSelectedDemoObject(demoFeature);
  return guidedDemoSelections.find((selection) => selection.id === id) ?? null;
}

function findSeededSelection(
  id: string,
  expectedProject: GeoAIProject,
  scenarioId: AnalysisScenarioId
) {
  const seededAnalysis = seededDemoRecentAnalyses.find((item) =>
    item.analysis.selectedObject?.id === id &&
    item.analysis.project?.projectKey === expectedProject.projectKey &&
    item.analysis.scenarioId === scenarioId
  );
  if (seededAnalysis?.analysis.selectedObject) {
    return seededAnalysis.analysis.selectedObject;
  }

  if (!Array.isArray(seededDemoComparisonSummaries)) return null;
  const seededComparisonItem = seededDemoComparisonSummaries
    .filter((item) => item.projectKey === expectedProject.projectKey)
    .flatMap((item) => item.comparison.items)
    .find((item) =>
      item.item.selectedObject?.id === id &&
      item.item.scenarioId === scenarioId
    );
  return seededComparisonItem?.item.selectedObject ?? null;
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

function findAppOwnedExploreSelection(
  id: string,
  expectedProject: GeoAIProject,
  analysisScenarioId: AnalysisScenarioId,
  customQuery: string
): SelectedDemoObject | null {
  if (!id.startsWith("explore-") || id.length <= "explore-".length) return null;
  const candidateId = id.slice("explore-".length);
  const audience = readProjectSegment(expectedProject);
  if (!audience) return null;
  const role = getProjectExploreRole(expectedProject, audience);

  try {
    for (const scenario of getExploreScenariosByAudience(audience)) {
      if (
        !scenario.interactionModes.includes("criteria_first") ||
        exploreScenarioToAnalysisScenario(scenario.id) !== analysisScenarioId
      ) {
        continue;
      }

      const candidate = generateExploreCandidates({
        audience,
        role,
        scenarioId: scenario.id,
        interactionMode: "criteria_first",
        naturalLanguageQuery: customQuery || scenario.sampleQueries[0] || "",
        filters: getDefaultFilters(scenario.inputSchema),
        selectedPointOrArea: {
          label: "Workspace criteria search",
          areaHint: "No map target selected"
        }
      }).find((item) => item.id === candidateId && item.audience === audience);
      if (!candidate || candidate.scenarioId !== scenario.id) continue;

      const canonicalSelection = exploreCandidateToSelectedObject(candidate);
      return canonicalSelection.id === id ? canonicalSelection : null;
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

function geometriesMatch(left: unknown, right: GeoJSON.Geometry) {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function readUserUploadedObject(
  value: Record<string, unknown>,
  expectedProject: GeoAIProject,
  scenarioId: AnalysisScenarioId
): SelectedDemoObject | null {
  if (!isRecord(value.analysisTarget)) return null;
  const target = value.analysisTarget;
  const targetId = readBoundedString(target.id);
  const datasetId = readBoundedString(target.datasetId);
  const datasetName = readBoundedString(target.datasetName);
  if (
    !targetId ||
    !datasetId ||
    !datasetName ||
    target.type !== "uploaded-feature" ||
    target.sourceMode !== "user-uploaded" ||
    target.officialStatus !== "official-validation-required"
  ) {
    return null;
  }

  const dataset = readBrowserUploadedDatasets().find((candidate) =>
    candidate.id === datasetId &&
    candidate.projectKey === expectedProject.projectKey &&
    candidate.name === datasetName &&
    candidate.type === "geojson" &&
    candidate.status === "parsed" &&
    candidate.sourceMode === "user-uploaded" &&
    candidate.officialStatus === "official-validation-required"
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
  const persistedCenter = readPoint(value.center);
  const targetCoordinates = readPoint(target.coordinates);
  const targetProperties = target.properties;
  if (
    !canonicalFeatureId ||
    canonicalFeatureId !== targetId ||
    !canonicalFeatureName ||
    !canonicalObjectId ||
    readBoundedString(value.id, 1_024) !== canonicalObjectId ||
    value.name !== canonicalFeatureName ||
    value.type !== "Uploaded screening geometry" ||
    value.layerId !== "futureCustomerAssets" ||
    value.layerName !== dataset.name ||
    value.geometryType !== toDemoGeometryType(feature.geometry.type) ||
    target.label !== canonicalFeatureName ||
    !center ||
    !persistedCenter ||
    !targetCoordinates ||
    !pointsMatch(persistedCenter, center) ||
    !pointsMatch(targetCoordinates, center) ||
    !geometriesMatch(target.geometry, feature.geometry) ||
    !isRecord(targetProperties) ||
    targetProperties.uploadedDatasetId !== dataset.id ||
    targetProperties.uploadedDatasetName !== dataset.name ||
    targetProperties.sourceMode !== "user-uploaded" ||
    targetProperties.officialStatus !== "official-validation-required"
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
      "User-provided geometry was revalidated from the active project-scoped browser dataset before comparison rebuilding.",
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
      properties: feature.properties,
      datasetId: dataset.id,
      datasetName: dataset.name,
      sourceMode: "user-uploaded",
      officialStatus: "official-validation-required"
    }
  };
}

function readSelectedObject(
  value: unknown,
  expectedProject: GeoAIProject,
  scenarioId: AnalysisScenarioId,
  customQuery: string
): SelectedDemoObject | null {
  if (!isRecord(value)) return null;
  const id = readBoundedString(value.id, 1_024);
  if (!id) return null;

  const appOwnedSelection = findAppOwnedSelection(id);
  if (appOwnedSelection) return appOwnedSelection;

  const seededSelection = findSeededSelection(id, expectedProject, scenarioId);
  if (seededSelection) return seededSelection;

  const exploreSelection = findAppOwnedExploreSelection(id, expectedProject, scenarioId, customQuery);
  if (exploreSelection) return exploreSelection;

  return readUserUploadedObject(value, expectedProject, scenarioId);
}

function readCoordinateList(value: unknown): [number, number][] | null {
  if (!Array.isArray(value)) return null;
  const coordinates: [number, number][] = [];
  for (const coordinate of value) {
    if (
      !Array.isArray(coordinate) ||
      coordinate.length < 2 ||
      typeof coordinate[0] !== "number" ||
      !Number.isFinite(coordinate[0]) ||
      typeof coordinate[1] !== "number" ||
      !Number.isFinite(coordinate[1])
    ) {
      return null;
    }
    coordinates.push([coordinate[0], coordinate[1]]);
  }
  return coordinates;
}

function readMatchingAoiProjectIdentity(value: unknown, expectedProject: GeoAIProject) {
  const identity = readBoundedString(value);
  if (!identity || identity !== value) return null;

  const expectedIdentities = new Set<string>([expectedProject.projectKey]);
  if (typeof expectedProject.id === "string" && expectedProject.id.length > 0) {
    expectedIdentities.add(expectedProject.id);
  }

  return expectedIdentities.has(identity) ? identity : null;
}

function coordinateListsMatch(left: [number, number][], right: [number, number][]) {
  return left.length === right.length && left.every((coordinate, index) =>
    coordinate[0] === right[index][0] && coordinate[1] === right[index][1]
  );
}

function readPolygonCoordinates(value: unknown) {
  if (!isRecord(value) || value.type !== "Polygon" || !Array.isArray(value.coordinates) || value.coordinates.length !== 1) {
    return null;
  }
  return readCoordinateList(value.coordinates[0]);
}

function readCanonicalUploadedAoi(
  value: Record<string, unknown>,
  expectedProject: GeoAIProject,
  projectIdentity: string,
  id: string,
  name: string,
  persistedCoordinates: [number, number][],
  savedAoiId: string | undefined
): UserDrawnAoi | null {
  const registryId = savedAoiId ?? id;
  const registryAoi = readBrowserAois().find((candidate) =>
    candidate.id === registryId &&
    candidate.projectKey === expectedProject.projectKey &&
    candidate.sourceType === "uploaded_geojson" &&
    candidate.dataMode === "uploaded"
  );
  if (!registryAoi || registryAoi.id !== id) return null;
  if (
    registryAoi.projectId !== undefined &&
    registryAoi.projectId !== null &&
    registryAoi.projectId !== expectedProject.id
  ) {
    return null;
  }

  const canonicalOpenCoordinates = readPolygonCoordinates(registryAoi.geometry);
  const persistedGeometryCoordinates = readPolygonCoordinates(value.geometry);
  if (!canonicalOpenCoordinates || !persistedGeometryCoordinates) return null;
  const canonicalValidation = validatePolygonVertices(canonicalOpenCoordinates);
  if (!canonicalValidation.valid || !canonicalValidation.measurements) return null;
  const canonicalCoordinates = closePolygonRing(canonicalOpenCoordinates);
  const normalizedPersistedCoordinates = closePolygonRing(persistedCoordinates);
  const normalizedPersistedGeometry = closePolygonRing(persistedGeometryCoordinates);
  if (
    !coordinateListsMatch(normalizedPersistedCoordinates, canonicalCoordinates) ||
    !coordinateListsMatch(normalizedPersistedGeometry, canonicalCoordinates)
  ) {
    return null;
  }

  return {
    id: registryAoi.id,
    name: registryAoi.name || name,
    geometryType: "Polygon",
    geometry: { type: "Polygon", coordinates: [canonicalCoordinates] },
    coordinates: canonicalCoordinates,
    centroid: canonicalValidation.measurements.centroid,
    bbox: canonicalValidation.measurements.bbox,
    measurements: canonicalValidation.measurements,
    source: "uploaded_geojson_polygon",
    dataMode: "uploaded",
    confidence: "validation_required",
    projectId: projectIdentity,
    savedAoiId: registryAoi.id,
    sourceType: "uploaded_geojson",
    validationStatus: "validation_required",
    limitations: [
      "Uploaded GeoJSON AOI geometry was restored from the current project-scoped AOI registry and revalidated before comparison rebuilding.",
      requiredDataCaveat
    ]
  };
}

function readSelectedAoi(value: unknown, expectedProject: GeoAIProject): UserDrawnAoi | null {
  if (!isRecord(value)) return null;
  const id = readBoundedString(value.id);
  const name = readBoundedString(value.name);
  const coordinates = readCoordinateList(value.coordinates);
  const projectIdentity = readMatchingAoiProjectIdentity(value.projectId, expectedProject);
  const source = value.source;
  const dataMode = value.dataMode;
  if (
    !id ||
    !name ||
    !coordinates ||
    !projectIdentity ||
    (source !== "user_drawn_polygon" && source !== "uploaded_geojson_polygon") ||
    (dataMode !== "user_provided" && dataMode !== "uploaded" && dataMode !== "demo")
  ) {
    return null;
  }

  const validation = validatePolygonVertices(coordinates);
  if (!validation.valid || !validation.measurements) return null;
  const ring = closePolygonRing(coordinates);
  const savedAoiId = readOptionalBoundedString(value.savedAoiId);
  if (savedAoiId === null) return null;

  if (source === "uploaded_geojson_polygon") {
    return readCanonicalUploadedAoi(
      value,
      expectedProject,
      projectIdentity,
      id,
      name,
      coordinates,
      savedAoiId
    );
  }

  return {
    id,
    name,
    geometryType: "Polygon",
    geometry: { type: "Polygon", coordinates: [ring] },
    coordinates: ring,
    centroid: validation.measurements.centroid,
    bbox: validation.measurements.bbox,
    measurements: validation.measurements,
    source,
    dataMode,
    confidence: "validation_required",
    projectId: projectIdentity,
    savedAoiId,
    sourceType: "user_drawn",
    validationStatus: "validation_required",
    limitations: [
      "Restored browser-local AOI geometry was revalidated and remeasured before comparison rebuilding.",
      requiredDataCaveat
    ]
  };
}

function readCanonicalComparisonItem(
  value: unknown,
  expectedProject: GeoAIProject,
  customQuery: string
): ComparisonItem | null {
  if (!isRecord(value) || !isRecord(value.item)) return null;
  const persistedItem = value.item;
  const persistedId = readBoundedString(persistedItem.id, 1_024);
  const point = readPoint(persistedItem.point);
  const scenarioId = persistedItem.scenarioId;
  const itemType = persistedItem.itemType;
  if (
    !persistedId ||
    !point ||
    typeof scenarioId !== "string" ||
    !scenarioIds.has(scenarioId as AnalysisScenarioId) ||
    (itemType !== "point" && itemType !== "object" && itemType !== "aoi")
  ) {
    return null;
  }

  let selectedObject: SelectedDemoObject | null = null;
  let selectedAoi: UserDrawnAoi | null = null;
  if (itemType === "object") {
    selectedObject = readSelectedObject(
      persistedItem.selectedObject,
      expectedProject,
      scenarioId as AnalysisScenarioId,
      customQuery
    );
    if (!selectedObject || persistedItem.selectedAoi !== undefined || !pointsMatch(point, selectedObject.center)) return null;
  } else if (itemType === "aoi") {
    selectedAoi = readSelectedAoi(persistedItem.selectedAoi, expectedProject);
    if (!selectedAoi || persistedItem.selectedObject !== undefined || !pointsMatch(point, selectedAoi.centroid)) return null;
  } else if (persistedItem.selectedObject !== undefined || persistedItem.selectedAoi !== undefined) {
    return null;
  }

  const canonicalItem = createComparisonItem(
    point,
    selectedObject,
    scenarioId as AnalysisScenarioId,
    selectedAoi
  );
  return canonicalItem.id === persistedId ? canonicalItem : null;
}

function readCustomQuery(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  return readBoundedString(value, maximumCustomQueryCharacters);
}

function hasSafeStorageIdentity(projectKey: string, comparisonId: string) {
  return /^[a-zA-Z0-9._:-]{1,240}$/.test(projectKey) &&
    /^[a-zA-Z0-9._:-]{1,2048}$/.test(comparisonId);
}

function matchesSeededComparisonOverride(
  rebuilt: ComparisonResult,
  comparisonId: string,
  expectedProject: GeoAIProject,
  customQuery: string
) {
  if (!Array.isArray(seededDemoComparisonSummaries)) return false;
  const seeded = seededDemoComparisonSummaries.find((item) =>
    item.comparison.id === comparisonId &&
    item.projectKey === expectedProject.projectKey
  )?.comparison;
  if (!seeded || (seeded.customQuery ?? "") !== customQuery) return false;

  const rebuiltItemIds = rebuilt.items.map((item) => item.item.id);
  const seededItemIds = seeded.items.map((item) => item.item.id);
  return rebuiltItemIds.length === seededItemIds.length &&
    rebuiltItemIds.every((itemId, index) => itemId === seededItemIds[index]);
}

export function normalizeRestoredComparison(
  value: unknown,
  projectKey: string,
  comparisonId: string,
  expectedProject: GeoAIProject
): ComparisonResult | null {
  if (!hasSafeStorageIdentity(projectKey, comparisonId) || !isRecord(value)) return null;
  if (value.id !== comparisonId || !projectBoundaryMatches(value.project, expectedProject, projectKey)) return null;
  if (!Array.isArray(value.items) || value.items.length < 2 || value.items.length > maximumComparisonItems) return null;

  const customQuery = readCustomQuery(value.customQuery);
  if (customQuery === null) return null;
  const canonicalItems = value.items.map((item) =>
    readCanonicalComparisonItem(item, expectedProject, customQuery)
  );
  if (canonicalItems.some((item) => item === null)) return null;
  const items = canonicalItems as ComparisonItem[];
  if (new Set(items.map((item) => item.id)).size !== items.length) return null;

  try {
    const rebuilt = createMockComparison(items, customQuery);
    if (
      rebuilt.id !== comparisonId &&
      !matchesSeededComparisonOverride(rebuilt, comparisonId, expectedProject, customQuery)
    ) {
      return null;
    }
    return { ...rebuilt, id: comparisonId, project: expectedProject };
  } catch {
    return null;
  }
}

export function writeBrowserComparisonRecord(projectKey: string, comparison: ComparisonResult) {
  if (typeof window === "undefined" || !isBrowserDemoStorageEnabled() || !comparison.project) return false;
  const normalized = normalizeRestoredComparison(comparison, projectKey, comparison.id, comparison.project);
  if (!normalized) return false;

  try {
    const serialized = JSON.stringify(normalized);
    if (serialized.length > maximumSerializedComparisonCharacters) return false;
    window.localStorage.setItem(comparisonStorageKey(projectKey, normalized.id), serialized);
    return true;
  } catch {
    return false;
  }
}

export function readBrowserComparisonRecord(
  projectKey: string,
  comparisonId: string,
  expectedProject: GeoAIProject
) {
  if (typeof window === "undefined" || !isBrowserDemoStorageEnabled()) return null;

  try {
    const raw = window.localStorage.getItem(comparisonStorageKey(projectKey, comparisonId));
    if (!raw || raw.length > maximumSerializedComparisonCharacters) return null;
    return normalizeRestoredComparison(JSON.parse(raw) as unknown, projectKey, comparisonId, expectedProject);
  } catch {
    return null;
  }
}
