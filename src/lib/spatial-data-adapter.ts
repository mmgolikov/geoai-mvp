import { seedSpatialDatasets } from "@/src/data/spatial-seed/dubai-spatial-seed";
import type {
  GeometryQualityIssue,
  SpatialDataset,
  SpatialFeature,
  SpatialGeometry,
  SpatialSelectionContext,
  SpatialValidationResult
} from "@/src/types/spatial-data";
import type { SelectedPoint } from "@/src/types/geo";

export const spatialDatasetRegistry: SpatialDataset[] = seedSpatialDatasets.map((dataset) => ({
  ...dataset,
  features: dataset.features.map((feature) => {
    const centroid = calculateCentroid(feature.geometry);
    const areaSqm = feature.geometry.type === "Polygon" ? estimatePolygonAreaSqm(feature.geometry.coordinates[0]) : undefined;

    return {
      ...feature,
      properties: {
        ...feature.properties,
        centroid,
        areaSqm
      }
    };
  })
}));

function flattenCoordinates(geometry: SpatialGeometry): number[][] {
  if (geometry.type === "Point") {
    return [geometry.coordinates];
  }

  if (geometry.type === "LineString") {
    return geometry.coordinates;
  }

  return geometry.coordinates[0];
}

function averageCoordinate(coordinates: number[][]): SelectedPoint {
  const total = coordinates.reduce(
    (sum, coordinate) => ({
      longitude: sum.longitude + coordinate[0],
      latitude: sum.latitude + coordinate[1]
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: total.latitude / coordinates.length,
    longitude: total.longitude / coordinates.length
  };
}

export function calculateCentroid(geometry: SpatialGeometry): SelectedPoint {
  if (geometry.type === "Point") {
    return {
      longitude: geometry.coordinates[0],
      latitude: geometry.coordinates[1]
    };
  }

  return averageCoordinate(flattenCoordinates(geometry));
}

export function estimatePolygonAreaSqm(coordinates: number[][]) {
  if (coordinates.length < 4) {
    return undefined;
  }

  const centroid = averageCoordinate(coordinates);
  const metersPerDegreeLatitude = 111_320;
  const metersPerDegreeLongitude = Math.cos((centroid.latitude * Math.PI) / 180) * metersPerDegreeLatitude;
  const projected = coordinates.map(([longitude, latitude]) => ({
    x: longitude * metersPerDegreeLongitude,
    y: latitude * metersPerDegreeLatitude
  }));
  const area = projected.reduce((sum, coordinate, index) => {
    const next = projected[(index + 1) % projected.length];
    return sum + coordinate.x * next.y - next.x * coordinate.y;
  }, 0);

  return Math.round(Math.abs(area) / 2);
}

function isDubaiCoordinate(coordinate: number[]) {
  const [longitude, latitude] = coordinate;
  return longitude >= 54.7 && longitude <= 55.7 && latitude >= 24.6 && latitude <= 25.5;
}

export function validateSpatialFeature(feature: SpatialFeature): SpatialValidationResult {
  const issues: GeometryQualityIssue[] = [];
  const geometryTypes = ["Point", "LineString", "Polygon"];

  if (!geometryTypes.includes(feature.geometry.type)) {
    issues.push({
      featureId: feature.id,
      severity: "error",
      message: `Unsupported geometry type: ${feature.geometry.type}`
    });
  }

  if (!feature.properties.id || !feature.properties.name || !feature.properties.sourceId) {
    issues.push({
      featureId: feature.id,
      severity: "error",
      message: "Feature is missing required id, name, or sourceId properties."
    });
  }

  const coordinates = flattenCoordinates(feature.geometry);
  if (coordinates.length === 0 || coordinates.some((coordinate) => !isDubaiCoordinate(coordinate))) {
    issues.push({
      featureId: feature.id,
      severity: "warning",
      message: "One or more coordinates fall outside the Dubai demo validation envelope."
    });
  }

  if (feature.geometry.type === "Polygon" && coordinates.length < 4) {
    issues.push({
      featureId: feature.id,
      severity: "error",
      message: "Polygon features require at least four coordinates including closure."
    });
  }

  return {
    isValid: !issues.some((issue) => issue.severity === "error"),
    issues
  };
}

export function validateSpatialDataset(dataset: SpatialDataset): SpatialValidationResult {
  const issues = dataset.features.flatMap((feature) => validateSpatialFeature(feature).issues);
  return {
    isValid: !issues.some((issue) => issue.severity === "error"),
    issues
  };
}

export function getSpatialFeatureById(featureId: string) {
  return spatialDatasetRegistry.flatMap((dataset) => dataset.features).find((feature) => feature.id === featureId) ?? null;
}

export function getSpatialDatasetForFeature(featureId: string) {
  return spatialDatasetRegistry.find((dataset) => dataset.features.some((feature) => feature.id === featureId)) ?? null;
}

export function toSpatialSelectionContext(feature: SpatialFeature): SpatialSelectionContext {
  const dataset = getSpatialDatasetForFeature(feature.id);

  return {
    featureId: feature.id,
    featureName: feature.properties.name,
    datasetId: dataset?.id ?? "unknown-spatial-dataset",
    datasetName: dataset?.name ?? "Unknown spatial dataset",
    category: feature.properties.category,
    subtype: feature.properties.subtype,
    geometryType: feature.geometry.type,
    centroid: feature.properties.centroid,
    areaSqm: feature.properties.areaSqm,
    sourceId: feature.properties.sourceId,
    sourceStatus: dataset?.source.sourceStatus ?? "mock",
    geometryStatus: feature.properties.geometryStatus,
    confidenceLevel: feature.properties.confidenceLevel,
    limitations: feature.properties.limitations,
    scenarioRelevance: feature.properties.scenarioRelevance
  };
}
