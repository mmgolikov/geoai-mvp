import {
  buildSnapshotProvisionalFeatureKeyV1,
  buildSourceStableFeatureKeyV1,
  dedupeSpatialSourceAliasesV1
} from "@/src/lib/spatial-b1/feature-key";
import {
  classifySpatialFreshnessV1,
  normalizeSpatialSourceTimestampV1,
  spatialFreshnessPolicyV1
} from "@/src/lib/spatial-b1/freshness";
import { normalizeSpatialNamesV1 } from "@/src/lib/spatial-b1/naming";
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
  const waterway = stringValue(properties.waterway).toLowerCase();
  const publicTransport = stringValue(properties.public_transport).toLowerCase();
  const harbour = stringValue(properties.harbour).toLowerCase();
  const sourceName = stringValue(properties["name:en"] ?? properties.name_en ?? properties.name);

  if (building === "construction" || landuse === "construction" || construction) {
    return { role: "observation_footprint" as SpatialGeometryRoleV1, category: "construction_footprint", subtype: building || landuse || construction || "construction" };
  }
  if (highway || railway) {
    const category = highway
      ? `${highway}_corridor`
      : railway === "subway"
        ? "metro_corridor"
        : railway === "tram" || railway === "light_rail"
          ? "tram_corridor"
          : "rail_corridor";
    return { role: "corridor" as SpatialGeometryRoleV1, category, subtype: highway || railway };
  }
  if (building) {
    const category = sourceName
      ? /services|logistics|warehouse|industrial/i.test(sourceName)
        ? "named_operational_building_footprint"
        : "named_building_footprint"
      : "building_footprint";
    return { role: "asset_footprint" as SpatialGeometryRoleV1, category, subtype: building };
  }
  if (landuse || natural || water || waterway) {
    const category =
      natural === "coastline"
        ? "coastline_context"
        : waterway
          ? "waterway_context"
          : natural === "water" || water
            ? "water_context"
            : landuse === "commercial" || landuse === "retail"
              ? "commercial_landuse_context"
              : landuse === "industrial"
                ? "industrial_landuse_context"
                : landuse === "residential"
                  ? "residential_landuse_context"
                  : "park_landuse_context";
    return {
      role: "context_boundary" as SpatialGeometryRoleV1,
      category,
      subtype: landuse || natural || water || waterway || "context"
    };
  }
  if (amenity || aeroway || tourism || place || rawFeature.geometry.type === "Point") {
    const category =
      aeroway === "aerodrome" || aeroway === "terminal"
        ? "airport_anchor"
        : harbour || amenity === "ferry_terminal"
          ? "port_anchor"
          : publicTransport || ["station", "halt", "subway_entrance"].includes(railway) || amenity === "bus_station"
            ? "transport_station_anchor"
            : amenity
              ? "amenity_anchor"
              : tourism
                ? "tourism_anchor"
                : "activity_anchor";
    return {
      role: "anchor" as SpatialGeometryRoleV1,
      category,
      subtype: amenity || aeroway || tourism || place || "point"
    };
  }
  return { role: "context_boundary" as SpatialGeometryRoleV1, category: "open_context", subtype: "other" };
}

function selectedMetadata(properties: Record<string, unknown>) {
  const keys = [
    "name",
    "name:en",
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
  const names = normalizeSpatialNamesV1({ properties, provider: "osm", category: classification.category, providerId });
  const sourceObjectName = names.sourceObjectName;
  const normalizedTimestamp = normalizeSpatialSourceTimestampV1(
    typeof properties["@timestamp"] === "number" || typeof properties["@timestamp"] === "string"
      ? properties["@timestamp"]
      : null
  );
  const sourceUpdatedAt = normalizedTimestamp.sourceUpdatedAt;
  const freshnessStatus = classifySpatialFreshnessV1(sourceUpdatedAt, context.dataset.accessedAt);
  const sourceAliases = dedupeSpatialSourceAliasesV1([
    { sourceId: context.dataset.sourceId, sourceFeatureId: providerId },
    {
      sourceId: `OpenStreetMap/${providerId.split("/")[0]}`,
      sourceFeatureId: providerId.split("/")[1]
    }
  ]);

  return {
    type: "Feature",
    featureKey:
      context.canonicalFeatureKey ??
      (names.englishName
        ? buildSourceStableFeatureKeyV1({
            role: classification.role,
            englishName: names.englishName,
            centroid,
            countryCode: context.countryCode,
            regionCode: context.regionCode
          })
        : buildSnapshotProvisionalFeatureKeyV1({
            role: classification.role,
            category: classification.category,
            provider: "osm",
            providerId,
            countryCode: context.countryCode,
            regionCode: context.regionCode
          })),
    datasetId: context.dataset.datasetId,
    datasetVersion: context.dataset.datasetVersion,
    sourceFeatureId: providerId,
    sourceAliases,
    sourceCrosswalks: sourceAliases.map((alias) => ({
      ...alias,
      datasetVersion: context.dataset.datasetVersion,
      validFrom: context.dataset.validFrom,
      validTo: context.dataset.validTo,
      matchMethod: alias.sourceFeatureId === providerId ? "provider_record_identity" : "normalized_osm_object_alias",
      matchConfidence: 1,
      sourceUpdatedAt,
      reviewStatus: "machine_matched_pending_review" as const
    })),
    sourceProvenance: [
      {
        datasetReleaseDate: context.dataset.datasetReleaseDate,
        datasetSnapshotDate: context.dataset.datasetSnapshotDate,
        sourceDataset: "OpenStreetMap",
        sourceRecordId: providerId,
        sourceRecordVersion: stringValue(properties["@version"]) || null,
        themeLicenseId: context.dataset.licenseId,
        themeLicenseUrl: context.dataset.licenseUrl,
        sourceRecordLicenseId: context.dataset.licenseId,
        sourceRecordLicenseUrl: context.dataset.licenseUrl,
        sourceLicenseId: context.dataset.licenseId,
        sourceAttribution: "© OpenStreetMap contributors; extract by Geofabrik GmbH.",
        attributionUrl: context.dataset.attributionUrl,
        sourceUpdatedAtRaw: normalizedTimestamp.sourceUpdatedAtRaw,
        sourceUpdatedAtEpoch: normalizedTimestamp.sourceUpdatedAtEpoch,
        sourceUpdatedAt,
        sourceObservedAt: null,
        accessedAt: context.dataset.accessedAt,
        freshnessStatus,
        freshnessPolicyId: spatialFreshnessPolicyV1.freshnessPolicyId
      }
    ],
    name: names.displayName,
    displayName: names.displayName,
    canonicalName: context.canonicalName ?? names.displayName,
    sourceObjectName,
    localName: names.localName,
    englishName: names.englishName,
    alternateNames: names.alternateNames,
    identityScope: context.canonicalFeatureKey ? "canonical_registry" : names.englishName ? "source_stable" : "snapshot_provisional",
    identityCrosswalkPolicy: context.canonicalFeatureKey
      ? "canonical_registry_provider_version_crosswalk_v1"
      : names.englishName
        ? "english_name_plus_rounded_centroid_provider_crosswalk_v1"
        : null,
    contextArea: context.contextArea ?? null,
    businessNarrative: context.businessNarrative ?? "Open-context feature retained for screening context.",
    category: classification.category,
    subtype: classification.subtype,
    geometry: rawFeature.geometry,
    centroid,
    areaSqm: null,
    geometryOrigin: "source",
    geometryRole: classification.role,
    geometryAccuracy: "source_exact",
    observedAt: null,
    validFrom: context.dataset.validFrom,
    validTo: context.dataset.validTo,
    freshnessStatus,
    freshnessPolicyId: spatialFreshnessPolicyV1.freshnessPolicyId,
    sourceUpdatedAtRaw: normalizedTimestamp.sourceUpdatedAtRaw,
    sourceUpdatedAtEpoch: normalizedTimestamp.sourceUpdatedAtEpoch,
    sourceUpdatedAt,
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
    metadata: { ...selectedMetadata(properties), sourceCategory: classification.category, displayNameSource: names.displayNameSource }
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
