import {
  getSpatialFeatureById,
  spatialDatasetRegistry,
  toSpatialSelectionContext
} from "@/src/lib/spatial-data-adapter";
import type { DemoLayerId, DemoLayerType, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";
import type { SpatialFeature, SpatialGeometry } from "@/src/types/spatial-data";

// Compatibility facade for the existing Mapbox layer renderer.
// Source data now comes from Spatial Data Adapter v0.1 seed_geojson datasets.

export type DemoLayerFeature = {
  type: "Feature";
  id: string;
  properties: {
    id: string;
    name: string;
    objectType: string;
    layerId: DemoLayerId;
    layerName: string;
    geometryType: DemoLayerType;
    color: string;
  };
  geometry: SpatialGeometry;
};

export type DemoLayer = {
  id: DemoLayerId;
  name: string;
  type: DemoLayerType;
  color: string;
  features: DemoLayerFeature[];
};

function mapGeometryType(geometryType: SpatialGeometry["type"]): DemoLayerType {
  if (geometryType === "Polygon") return "polygon";
  if (geometryType === "LineString") return "line";
  return "point";
}

function toDemoFeature(feature: SpatialFeature, layerId: DemoLayerId, layerName: string, color: string): DemoLayerFeature {
  return {
    type: "Feature",
    id: feature.id,
    properties: {
      id: feature.id,
      name: feature.properties.name,
      objectType: feature.properties.subtype,
      layerId,
      layerName,
      geometryType: mapGeometryType(feature.geometry.type),
      color
    },
    geometry: feature.geometry
  };
}

export const demoLayers: DemoLayer[] = spatialDatasetRegistry
  .filter((dataset) => dataset.features.length > 0)
  .map((dataset) => ({
    id: dataset.layerId as DemoLayerId,
    name: dataset.layerName,
    type: dataset.mapType as DemoLayerType,
    color: dataset.color,
    features: dataset.features.map((feature) =>
      toDemoFeature(feature, dataset.layerId as DemoLayerId, dataset.layerName, dataset.color)
    )
  }));

export function getFeatureCenter(feature: DemoLayerFeature): SelectedPoint {
  const spatialFeature = getSpatialFeatureById(feature.id);
  if (spatialFeature) {
    return spatialFeature.properties.centroid;
  }

  if (feature.geometry.type === "Point") {
    return {
      longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1]
    };
  }

  const coordinates = feature.geometry.type === "LineString"
    ? feature.geometry.coordinates
    : feature.geometry.coordinates[0];
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

export function getSelectedDemoObject(feature: DemoLayerFeature): SelectedDemoObject {
  const spatialFeature = getSpatialFeatureById(feature.id);
  const spatialContext = spatialFeature ? toSpatialSelectionContext(spatialFeature) : undefined;

  return {
    id: feature.properties.id,
    name: feature.properties.name,
    type: feature.properties.objectType,
    layerId: feature.properties.layerId,
    layerName: feature.properties.layerName,
    geometryType: feature.properties.geometryType,
    center: getFeatureCenter(feature),
    spatialContext
  };
}

export function getDemoFeatureById(featureId: string) {
  return demoLayers.flatMap((layer) => layer.features).find((feature) => feature.id === featureId) ?? null;
}
