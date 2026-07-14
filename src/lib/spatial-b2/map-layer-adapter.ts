import { createSpatialSelectionLineage } from "@/src/lib/spatial-b2/selection-lineage";
import type { SpatialLayerCatalogueEntry } from "@/src/lib/spatial-b2/layer-catalogue";
import type { SpatialProductSourceMode } from "@/src/lib/spatial-b2/source-mode";
import type { SelectedDemoObject, DemoLayerId, DemoLayerType, AnalysisTarget } from "@/src/types/geo";
import type { DataSourceStatus } from "@/src/types/data-source";
import type { SpatialLayerCategory, SpatialSelectionContext, SpatialFeatureProperties } from "@/src/types/spatial-data";
import type { SpatialDatasetVersionV1, SpatialFeatureEnvelopeV1 } from "@/src/types/spatial-data-v1";

export type SpatialB2MapStyle = {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fillOpacity: number;
  strokeOpacity: number;
  pointRadius: number;
  layerOrder: number;
  clickPriority: number;
};

export type SpatialProductStatusMapping = {
  sourceMode: SpatialProductSourceMode;
  sourceStatus: DataSourceStatus;
  geometryStatus: SpatialFeatureProperties["geometryStatus"];
  analysisSourceMode: NonNullable<AnalysisTarget["sourceMode"]>;
  officialStatus: NonNullable<AnalysisTarget["officialStatus"]>;
  controlledFixture: boolean;
};

export type SpatialB2MapFeature = {
  type: "Feature";
  id: string;
  geometry: SpatialFeatureEnvelopeV1["geometry"];
  properties: {
    id: string;
    featureId: string;
    canonicalFeatureKey: string;
    name: string;
    objectType: string;
    layerId: string;
    layerName: string;
    geometryType: DemoLayerType;
    category: string;
    subcategory: string;
    sourceMode: SpatialProductSourceMode;
    sourceStatus: DataSourceStatus;
    geometryStatus: SpatialFeatureProperties["geometryStatus"];
    officialStatus: NonNullable<AnalysisTarget["officialStatus"]>;
    confidenceLevel: string;
    relevance: string;
    hoverLabel: string;
    selectedLabel: string;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    fillOpacity: number;
    strokeOpacity: number;
    pointRadius: number;
    layerOrder: number;
    clickPriority: number;
    spatialB2Fixture: boolean;
    datasetId: string;
    datasetVersion: string;
    sourceId: string;
    providerFeatureId: string | null;
    sourceRecordId: string | null;
    reviewStatus: string;
    freshnessStatus: string;
    geometryOrigin: string;
    geometryAccuracy: string;
    attributionIds: string;
  };
};

function toDemoGeometryType(geometry: SpatialFeatureEnvelopeV1["geometry"]): DemoLayerType {
  if (geometry.type === "Point" || geometry.type === "MultiPoint") return "point";
  if (geometry.type === "LineString" || geometry.type === "MultiLineString") return "line";
  return "polygon";
}

function toSpatialCategory(role: SpatialFeatureEnvelopeV1["geometryRole"]): SpatialLayerCategory {
  if (role === "anchor") return "infrastructure_node";
  if (role === "corridor") return "transport_corridor";
  if (role === "asset_footprint" || role === "aoi") return "asset_boundary";
  if (role === "observation_footprint") return "construction_site";
  return "development_zone";
}

export function deriveSpatialProductStatus(input: {
  sourceMode: SpatialProductSourceMode;
  feature: Pick<SpatialFeatureEnvelopeV1, "validationStatus" | "geometryOrigin" | "quality" | "sourceProvenance" | "metadata">;
}): SpatialProductStatusMapping {
  const { sourceMode, feature } = input;
  const controlledFixture = feature.metadata.controlledFixture === true;
  const explicitlyClientValidated = sourceMode === "client_validated" && feature.validationStatus === "client_validated";
  const explicitlyOfficialValidated = sourceMode === "official_validated" && feature.validationStatus === "official_validated";
  const reviewedSourceGeometry = feature.geometryOrigin === "source" && feature.quality.sourceAlignmentStatus === "reviewed";

  return {
    sourceMode,
    sourceStatus: sourceMode === "synthetic_fallback" || controlledFixture
      ? "mock"
      : feature.sourceProvenance.length > 0
        ? "connected"
        : "unavailable",
    geometryStatus: sourceMode === "synthetic_fallback"
      ? "seed_demo"
      : explicitlyClientValidated || explicitlyOfficialValidated || reviewedSourceGeometry
        ? "validated"
        : "needs_review",
    analysisSourceMode: sourceMode,
    officialStatus: explicitlyOfficialValidated
      ? "official-validated-contract"
      : explicitlyClientValidated
        ? "client-validated-contract"
        : sourceMode === "client_validated" || sourceMode === "official_validated"
          ? "official-validation-required"
          : "not-official",
    controlledFixture
  };
}

function toSpatialContext(input: {
  feature: SpatialFeatureEnvelopeV1;
  dataset: SpatialDatasetVersionV1;
  catalogueEntry: SpatialLayerCatalogueEntry;
}): SpatialSelectionContext {
  const lineage = createSpatialSelectionLineage(input);
  const status = deriveSpatialProductStatus({ sourceMode: input.catalogueEntry.sourceMode, feature: input.feature });
  const geometryType = toDemoGeometryType(input.feature.geometry);

  return {
    ...lineage,
    featureId: input.feature.featureKey,
    featureName: input.feature.displayName,
    datasetId: input.feature.datasetId,
    datasetName: input.dataset.layerName,
    category: toSpatialCategory(input.feature.geometryRole),
    subtype: input.feature.subtype,
    geometryType: geometryType === "point" ? "Point" : geometryType === "line" ? "LineString" : "Polygon",
    centroid: {
      latitude: input.feature.centroid.latitude,
      longitude: input.feature.centroid.longitude
    },
    areaSqm: input.feature.areaSqm ?? undefined,
    sourceId: lineage.sourceId,
    sourceStatus: status.sourceStatus,
    geometryStatus: status.geometryStatus,
    confidenceLevel: input.feature.confidenceLevel,
    limitations: [...input.feature.limitations],
    scenarioRelevance: []
  };
}

export function adaptSpatialFeatureToMapFeature(input: {
  feature: SpatialFeatureEnvelopeV1;
  dataset: SpatialDatasetVersionV1;
  catalogueEntry: SpatialLayerCatalogueEntry;
  style: SpatialB2MapStyle;
}): SpatialB2MapFeature {
  const { feature, catalogueEntry, style } = input;
  const geometryType = toDemoGeometryType(feature.geometry);
  const lineage = createSpatialSelectionLineage(input);
  const status = deriveSpatialProductStatus({ sourceMode: catalogueEntry.sourceMode, feature });

  return {
    type: "Feature",
    id: feature.featureKey,
    geometry: feature.geometry,
    properties: {
      id: feature.featureKey,
      featureId: feature.featureKey,
      canonicalFeatureKey: feature.featureKey,
      name: feature.displayName,
      objectType: feature.subtype,
      layerId: catalogueEntry.layerKey,
      layerName: catalogueEntry.displayName,
      geometryType,
      category: feature.category,
      subcategory: feature.subtype,
      sourceMode: catalogueEntry.sourceMode,
      sourceStatus: status.sourceStatus,
      geometryStatus: status.geometryStatus,
      officialStatus: status.officialStatus,
      confidenceLevel: feature.confidenceLevel,
      relevance: feature.businessNarrative,
      hoverLabel: `${feature.displayName} · ${catalogueEntry.dataHonestyLabel}`,
      selectedLabel: `Selected: ${feature.displayName}`,
      fillColor: style.fillColor,
      strokeColor: style.strokeColor,
      strokeWidth: style.strokeWidth,
      fillOpacity: style.fillOpacity,
      strokeOpacity: style.strokeOpacity,
      pointRadius: style.pointRadius,
      layerOrder: style.layerOrder,
      clickPriority: style.clickPriority,
      spatialB2Fixture: status.controlledFixture,
      datasetId: feature.datasetId,
      datasetVersion: feature.datasetVersion,
      sourceId: lineage.sourceId,
      providerFeatureId: lineage.providerFeatureId,
      sourceRecordId: lineage.sourceRecordId,
      reviewStatus: feature.quality.sourceAlignmentStatus,
      freshnessStatus: feature.freshnessStatus,
      geometryOrigin: feature.geometryOrigin,
      geometryAccuracy: feature.geometryAccuracy,
      attributionIds: catalogueEntry.attributionIds.join(",")
    }
  };
}

export function adaptControlledFixtureToMapFeature(input: Parameters<typeof adaptSpatialFeatureToMapFeature>[0]) {
  if (input.feature.metadata.controlledFixture !== true || input.feature.metadata.realGeometry !== false) {
    throw new Error("Controlled fixture adaptation requires explicit controlledFixture=true and realGeometry=false metadata.");
  }
  return adaptSpatialFeatureToMapFeature(input);
}

export function createSelectedObjectFromSpatialFeature(input: {
  feature: SpatialFeatureEnvelopeV1;
  dataset: SpatialDatasetVersionV1;
  catalogueEntry: SpatialLayerCatalogueEntry;
}): SelectedDemoObject {
  const { feature, dataset, catalogueEntry } = input;
  const fallbackDemoLayerId = catalogueEntry.fallbackLayerKey.replace("synthetic:", "") as DemoLayerId;
  const geometryType = toDemoGeometryType(feature.geometry);
  const center = {
    latitude: feature.centroid.latitude,
    longitude: feature.centroid.longitude
  };
  const status = deriveSpatialProductStatus({ sourceMode: catalogueEntry.sourceMode, feature });

  return {
    id: feature.featureKey,
    name: feature.displayName,
    type: feature.subtype,
    layerId: fallbackDemoLayerId,
    layerName: catalogueEntry.displayName,
    geometryType,
    center,
    spatialContext: toSpatialContext(input),
    analysisTarget: {
      id: feature.featureKey,
      type: "demo-feature",
      label: feature.displayName,
      coordinates: center,
      geometry: feature.geometry as GeoJSON.Geometry,
      properties: {
        controlledFixture: status.controlledFixture,
        canonicalFeatureKey: feature.featureKey,
        datasetId: feature.datasetId,
        datasetVersion: feature.datasetVersion,
        sourceMode: catalogueEntry.sourceMode,
        sourceStatus: status.sourceStatus,
        geometryStatus: status.geometryStatus
      },
      datasetId: feature.datasetId,
      datasetName: dataset.layerName,
      sourceMode: status.analysisSourceMode,
      officialStatus: status.officialStatus
    }
  };
}
