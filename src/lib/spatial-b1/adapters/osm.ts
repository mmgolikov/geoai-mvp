import { buildStableFeatureKeyV1, dedupeSpatialSourceAliasesV1 } from "@/src/lib/spatial-b1/feature-key";
import { calculateSpatialGeometryCentroidV1, validateSpatialGeometryV1 } from "@/src/lib/spatial-b1/quality";
import type {
  ProviderGeoJsonFeatureV1,
  SpatialAdapterBuildContextV1,
  SpatialAdapterOutputV1,
  SpatialSourceAdapterV1
} from "@/src/lib/spatial-b1/adapters/types";
import type {
  SpatialFeatureEnvelopeV1,
  SpatialGeometryRoleV1,
  SpatialJsonScalarV1
} from "@/src/types/spatial-data-v1";

function stringValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function sourceFeatureId(rawFeature: ProviderGeoJsonFeatureV1) {
  const properties = rawFeature.properties ?? {};
  const osmId = stringValue(properties["@id"]);
  const osmType = stringValue(properties["@type"]).toLowerCase();
  return /^(node|way|relation)$/.test(osmType) && /^[0-9]+$/.test(osmId)
    ? `${osmType}/${osmId}`
    : null;
}

function classifyOsmFeature(rawFeature: ProviderGeoJsonFeatureV1) {
  const properties = rawFeature.properties ?? {};
  const highway = stringValue(properties.highway).toLowerCase();
  const railway = stringValue(properties.railway).toLowerCase();
  const building = stringValue(properties.building).toLowerCase();
  const landuse = stringValue(properties.landuse).toLowerCase();
  const natural = stringValue(properties.natural).toLowerCase();
  const water = stringValue(properties.water).toLowerCase();
  const construction = stringValue(properties.construction).toLowerCase();
  const amenity = stringValue(properties.amenity).toLowerCase();
  const aeroway = stringValue(properties.aeroway).toLowerCase();
  const tourism = stringValue(properties.tourism).toLowerCase();
  const place = stringValue(properties.place).toLowerCase();

  if (building === "construction" || landuse === "construction" || construction) {
    return { role: "observation_footprint" as SpatialGeometryRoleV1, category: "construction", subtype: building || landuse || construction || "construction" };
  }
  if (highway || railway) {
    return { role: "corridor" as SpatialGeometryRoleV1, category: "transport", subtype: highway || railway };
  }
  if (building) {
    return { role: "asset_footprint" as SpatialGeometryRoleV1, category: "building", subtype: building };
  }
  if (landuse || natural || water) {
    return {
      role: "context_boundary" as SpatialGeometryRoleV1,
      category: natural === "water" || natural === "coastline" || water ? "water_context" : "landuse_context",
      subtype: landuse || natural || water || "context"
    };
  }
  if (amenity || aeroway || tourism || place || rawFeature.geometry.type === "Point") {
    return {
      role: "anchor" as SpatialGeometryRoleV1,
      category: "spatial_anchor",
      subtype: amenity || aeroway || tourism || place || "point"
    };
  }
  return { role: "context_boundary" as SpatialGeometryRoleV1, category: "open_context", subtype: "other" };
}

function selectedMetadata(properties: Record<string, unknown>) {
  const keys = [
    "name",
    "name_en",
    "highway",
    "railway",
    "building",
    "landuse",
    "natural",
    "water",
    "waterway",
    "construction",
    "amenity",
    "aeroway",
    "tourism",
    "place",
    "ref"
  ];
  return Object.fromEntries(
    keys.flatMap((key) => {
      const value = properties[key];
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? [[key, value as SpatialJsonScalarV1]]
        : [];
    })
  );
}

function normalizeOsmFeature(
  rawFeature: ProviderGeoJsonFeatureV1,
  context: SpatialAdapterBuildContextV1
): SpatialFeatureEnvelopeV1 | null {
  const properties = rawFeature.properties ?? {};
  const providerId = sourceFeatureId(rawFeature);
  if (!providerId) return null;
  const classification = classifyOsmFeature(rawFeature);
  const quality = validateSpatialGeometryV1(rawFeature.geometry, { bbox: context.processingBbox });
  if (!quality.valid) return null;
  const centroid = calculateSpatialGeometryCentroidV1(rawFeature.geometry);
  if (!centroid) return null;
  const name =
    stringValue(properties.name_en) ||
    stringValue(properties.name) ||
    `${classification.subtype.replace(/_/g, " ")} ${providerId}`;

  return {
    type: "Feature",
    featureKey: buildStableFeatureKeyV1({
      role: classification.role,
      slug: `${name}-${providerId}`,
      countryCode: context.countryCode,
      regionCode: context.regionCode
    }),
    datasetId: context.dataset.datasetId,
    datasetVersion: context.dataset.datasetVersion,
    sourceFeatureId: providerId,
    sourceAliases: dedupeSpatialSourceAliasesV1([
      { sourceId: context.dataset.sourceId, sourceFeatureId: providerId },
      {
        sourceId: `OpenStreetMap/${providerId.split("/")[0]}`,
        sourceFeatureId: providerId.split("/")[1]
      }
    ]),
    name,
    category: classification.category,
    subtype: classification.subtype,
    geometry: rawFeature.geometry,
    centroid,
    areaSqm: null,
    geometryOrigin: "source",
    geometryRole: classification.role,
    geometryAccuracy: "source_exact",
    observedAt: context.observedAt,
    validFrom: context.dataset.validFrom,
    validTo: context.dataset.validTo,
    freshnessStatus: "unknown",
    validationStatus: "open_context",
    confidenceLevel: "medium",
    scenarioRelevance: context.scenarioRelevance,
    limitations: [
      "OpenStreetMap / Geofabrik geometry is open context and is not official municipal, parcel, zoning, cadastral, planning or hazard evidence."
    ],
    lineage: [
      {
        sequence: 1,
        operation: "source_adapter_normalize",
        tool: "geoai-osm-adapter-v1",
        toolVersion: "1.0.0",
        inputDatasetIds: [context.dataset.datasetId],
        parameters: { providerFeatureId: providerId },
        outputChecksum: null
      }
    ],
    quality,
    metadata: selectedMetadata(properties)
  };
}

export const osmSnapshotAdapterV1: SpatialSourceAdapterV1 = {
  adapterId: "osm_snapshot_v1",
  sourceId: "osm-geofabrik",
  normalizeFeature: normalizeOsmFeature,
  normalizeFeatures(rawFeatures, context): SpatialAdapterOutputV1 {
    const features: SpatialFeatureEnvelopeV1[] = [];
    const rejected: SpatialAdapterOutputV1["rejected"] = [];
    for (const rawFeature of rawFeatures) {
      const normalized = normalizeOsmFeature(rawFeature, context);
      if (normalized) {
        features.push(normalized);
      } else {
        rejected.push({
          sourceFeatureId: sourceFeatureId(rawFeature),
          reason: "Missing source identity or failed geometry validation.",
          metadata: {}
        });
      }
    }
    return { features, metrics: [], rejected };
  }
};
