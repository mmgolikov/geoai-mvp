import type { Feature, FeatureCollection, Polygon } from "geojson";

import type {
  ConceptMassingProperties,
  ConceptMassingResult,
  PointObjectCreateAoi
} from "./point-to-object-create";

export type PointObjectCreatePreviewBounds = [[number, number], [number, number]];

export type PointObjectCreatePreviewModel = {
  aoiFeature: Feature<Polygon, { kind: "create_aoi" }>;
  massingFeatureCollection: FeatureCollection<Polygon, ConceptMassingProperties>;
  bounds: PointObjectCreatePreviewBounds;
  center: [number, number];
  featureCount: number;
  maxHeightM: number;
  minBaseM: number;
  geometryKey: string;
};

function finiteCoordinate(point: readonly number[]): point is readonly [number, number] {
  return point.length === 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
}

function cloneRing(ring: readonly (readonly number[])[]): Array<[number, number]> {
  return ring.map(([longitude, latitude]) => [longitude, latitude]);
}

function geometryKey(massing: ConceptMassingResult): string {
  const serialized = JSON.stringify(massing.featureCollection.features.map((feature) => ({
    id: feature.properties.id,
    heightM: feature.properties.heightM,
    baseM: feature.properties.baseM,
    coordinates: feature.geometry.coordinates
  })));
  let hash = 2_166_136_261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${massing.variantId}:${massing.featureCollection.features.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildPointObjectCreatePreviewModel(
  aoi: PointObjectCreateAoi,
  massing: ConceptMassingResult
): PointObjectCreatePreviewModel | null {
  const aoiRing = aoi.coordinates[0];
  const features = massing.featureCollection.features;
  if (!aoiRing || aoiRing.length < 4 || features.length < 1) return null;
  const allCoordinates = [
    ...aoiRing,
    ...features.flatMap((feature) => feature.geometry.coordinates.flat())
  ];
  if (!allCoordinates.every(finiteCoordinate) || features.some((feature) =>
    !Number.isFinite(feature.properties.heightM) || feature.properties.heightM <= 0 ||
    !Number.isFinite(feature.properties.baseM) || feature.properties.baseM < 0 ||
    feature.properties.baseM >= feature.properties.heightM)) return null;

  const longitudes = allCoordinates.map(([longitude]) => longitude);
  const latitudes = allCoordinates.map(([, latitude]) => latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  if (![west, east, south, north].every(Number.isFinite) || west === east || south === north) return null;

  const massingFeatureCollection: FeatureCollection<Polygon, ConceptMassingProperties> = {
    type: "FeatureCollection",
    features: features.map((feature) => ({
      type: "Feature",
      id: feature.id,
      properties: { ...feature.properties },
      geometry: {
        type: "Polygon",
        coordinates: feature.geometry.coordinates.map(cloneRing)
      }
    }))
  };

  return {
    aoiFeature: {
      type: "Feature",
      properties: { kind: "create_aoi" },
      geometry: { type: "Polygon", coordinates: aoi.coordinates.map(cloneRing) }
    },
    massingFeatureCollection,
    bounds: [[west, south], [east, north]],
    center: [(west + east) / 2, (south + north) / 2],
    featureCount: features.length,
    maxHeightM: Math.max(...features.map((feature) => feature.properties.heightM)),
    minBaseM: Math.min(...features.map((feature) => feature.properties.baseM)),
    geometryKey: geometryKey(massing)
  };
}
