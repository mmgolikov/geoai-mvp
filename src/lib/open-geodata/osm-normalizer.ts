import { classifyPoiCategory, scenarioRelevanceForPoi } from "@/src/lib/open-geodata/poi-classifier";
import { classifyRoadClass, roadDisplayPriority } from "@/src/lib/open-geodata/road-classifier";
import type {
  OpenLanduseClass,
  OpenLanduseFeature,
  OpenPoiFeature,
  OpenRoadFeature,
  PointGeometry,
  PolygonGeometry
} from "@/src/lib/open-geodata/types";

type GeoJsonFeature = {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown>;
  geometry?: {
    type: string;
    coordinates: unknown;
  };
};

function featureId(prefix: string, feature: GeoJsonFeature, index: number) {
  const raw = feature.id ?? feature.properties?.id ?? feature.properties?.["@id"] ?? `${prefix}-${index + 1}`;
  return String(raw).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function nameFor(feature: GeoJsonFeature, fallback: string) {
  const name = feature.properties?.name ?? feature.properties?.name_en ?? fallback;
  return String(name);
}

function propertiesFor(feature: GeoJsonFeature) {
  return Object.fromEntries(
    Object.entries(feature.properties ?? {}).filter(([, value]) =>
      ["string", "number", "boolean"].includes(typeof value)
    )
  ) as Record<string, string | number | boolean>;
}

export function classifyLanduse(properties: Record<string, unknown>): OpenLanduseClass {
  const raw = String(properties.landuse ?? properties.areaClass ?? properties.tourism ?? properties.aeroway ?? "").toLowerCase();

  if (raw.includes("airport") || raw.includes("transport")) return "transport_airport";
  if (raw.includes("industrial") || raw.includes("logistics")) return "industrial_logistics";
  if (raw.includes("commercial") || raw.includes("business")) return "commercial";
  if (raw.includes("tourism") || raw.includes("waterfront") || raw.includes("marina")) return "tourism_waterfront";
  if (raw.includes("mixed")) return "mixed_use";
  if (raw.includes("park") || raw.includes("open")) return "open_space";
  return "residential";
}

export function normalizeRoadFeatures(features: GeoJsonFeature[]): OpenRoadFeature[] {
  return features.flatMap((feature, index) => {
    if (feature.geometry?.type !== "LineString") return [];

    const roadClass = classifyRoadClass(feature.properties ?? {});
    return [{
      id: featureId("road", feature, index),
      name: nameFor(feature, `Open road ${index + 1}`),
      roadClass,
      geometry: feature.geometry as OpenRoadFeature["geometry"],
      sourceMode: "open_geodata_sample",
      confidence: "sample",
      displayPriority: roadDisplayPriority(roadClass),
      properties: propertiesFor(feature)
    }];
  });
}

export function normalizePoiFeatures(features: GeoJsonFeature[]): OpenPoiFeature[] {
  return features.flatMap((feature, index) => {
    if (feature.geometry?.type !== "Point") return [];

    const geometry = feature.geometry as PointGeometry;
    const category = classifyPoiCategory(feature.properties ?? {});

    return [{
      id: featureId("poi", feature, index),
      name: nameFor(feature, `Open POI ${index + 1}`),
      category,
      subcategory: String(feature.properties?.subcategory ?? feature.properties?.amenity ?? feature.properties?.tourism ?? category),
      coordinates: {
        longitude: geometry.coordinates[0],
        latitude: geometry.coordinates[1]
      },
      scenarioRelevance: scenarioRelevanceForPoi(category),
      sourceMode: "open_geodata_sample",
      confidence: "sample",
      properties: propertiesFor(feature)
    }];
  });
}

export function normalizeLanduseFeatures(features: GeoJsonFeature[]): OpenLanduseFeature[] {
  return features.flatMap((feature, index) => {
    if (feature.geometry?.type !== "Polygon") return [];

    const landuseClass = classifyLanduse(feature.properties ?? {});
    return [{
      id: featureId("landuse", feature, index),
      name: nameFor(feature, `Open landuse ${index + 1}`),
      landuseClass,
      geometry: feature.geometry as PolygonGeometry,
      sourceMode: "open_geodata_sample",
      confidence: "sample",
      properties: propertiesFor(feature)
    }];
  });
}

