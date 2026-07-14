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
  SpatialJsonScalarV1,
  SpatialSourceAliasV1
} from "@/src/types/spatial-data-v1";

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function overtureSourceAliases(properties: Record<string, unknown>, overtureId: string) {
  const aliases: SpatialSourceAliasV1[] = [{ sourceId: "overture", sourceFeatureId: overtureId }];
  const sources = Array.isArray(properties.sources) ? properties.sources : [];
  for (const source of sources) {
    const sourceRecord = recordValue(source);
    const dataset = stringValue(sourceRecord.dataset ?? sourceRecord.source);
    const recordId = stringValue(sourceRecord.record_id ?? sourceRecord.recordId ?? sourceRecord.id);
    if (dataset && recordId) aliases.push({ sourceId: dataset, sourceFeatureId: recordId });
  }
  return dedupeSpatialSourceAliasesV1(aliases);
}

function overtureSourceRecords(properties: Record<string, unknown>) {
  return (Array.isArray(properties.sources) ? properties.sources : []).map(recordValue);
}

function classifyOvertureFeature(rawFeature: ProviderGeoJsonFeatureV1) {
  const properties = rawFeature.properties ?? {};
  const featureType = stringValue(properties.type ?? properties.theme_type ?? properties.overture_type).toLowerCase();
  const className = stringValue(properties.class).toLowerCase();
  const subtype = stringValue(properties.subtype).toLowerCase();
  const names = recordValue(properties.names);
  const common = recordValue(names.common);
  const sourceName = stringValue(names.primary) || stringValue(common.en) || stringValue(properties.name);

  if (featureType.includes("building") || rawFeature.geometry.type === "Polygon" || rawFeature.geometry.type === "MultiPolygon") {
    const category = sourceName
      ? /services|logistics|warehouse|industrial/i.test(sourceName)
        ? "named_operational_building_footprint"
        : "named_building_footprint"
      : "building_footprint";
    return {
      role: "asset_footprint" as SpatialGeometryRoleV1,
      category,
      subtype: subtype || className || "building"
    };
  }
  if (featureType.includes("segment") || featureType.includes("transport") || rawFeature.geometry.type.includes("Line")) {
    return {
      role: "corridor" as SpatialGeometryRoleV1,
      category: "transport",
      subtype: subtype || className || "transport_segment"
    };
  }
  return {
    role: "anchor" as SpatialGeometryRoleV1,
    category: "spatial_anchor",
    subtype: subtype || className || "place"
  };
}

function selectedMetadata(properties: Record<string, unknown>) {
  const keys = ["class", "subtype", "height", "num_floors", "confidence", "level", "categories"];
  return Object.fromEntries(
    keys.flatMap((key) => {
      const value = properties[key];
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? [[key, value as SpatialJsonScalarV1]]
        : [];
    })
  );
}

function normalizeOvertureFeature(
  rawFeature: ProviderGeoJsonFeatureV1,
  context: SpatialAdapterBuildContextV1
): SpatialFeatureEnvelopeV1 | null {
  const properties = rawFeature.properties ?? {};
  const overtureId = stringValue(properties.id ?? rawFeature.id);
  if (!overtureId) return null;
  const classification = classifyOvertureFeature(rawFeature);
  const quality = validateSpatialGeometryV1(rawFeature.geometry, { bbox: context.processingBbox });
  if (!quality.valid) return null;
  const centroid = calculateSpatialGeometryCentroidV1(rawFeature.geometry);
  if (!centroid) return null;
  const names = normalizeSpatialNamesV1({
    properties,
    provider: "overture",
    category: classification.category,
    providerId: overtureId
  });
  const sourceObjectName = names.sourceObjectName;
  const sourceRecords = overtureSourceRecords(properties);
  const normalizedSourceTimestamps = sourceRecords.map((source) =>
    normalizeSpatialSourceTimestampV1(stringValue(source.update_time ?? source.updateTime) || null)
  );
  const normalizedTimestamp = normalizedSourceTimestamps
    .filter((value) => value.sourceUpdatedAtEpoch !== null)
    .sort((left, right) => (left.sourceUpdatedAtEpoch ?? 0) - (right.sourceUpdatedAtEpoch ?? 0))
    .at(-1) ?? normalizeSpatialSourceTimestampV1(null);
  const sourceUpdatedAt = normalizedTimestamp.sourceUpdatedAt;
  const freshnessStatus = classifySpatialFreshnessV1(sourceUpdatedAt, context.dataset.accessedAt);
  const sourceAliases = overtureSourceAliases(properties, overtureId);

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
            provider: "overture",
            providerId: overtureId,
            countryCode: context.countryCode,
            regionCode: context.regionCode
          })),
    datasetId: context.dataset.datasetId,
    datasetVersion: context.dataset.datasetVersion,
    sourceFeatureId: overtureId,
    sourceAliases,
    sourceCrosswalks: sourceAliases.map((alias) => ({
      ...alias,
      datasetVersion: context.dataset.datasetVersion,
      validFrom: context.dataset.validFrom,
      validTo: context.dataset.validTo,
      matchMethod: alias.sourceFeatureId === overtureId ? "provider_record_identity" : "provider_declared_source_alias",
      matchConfidence: alias.sourceFeatureId === overtureId ? 1 : 0.95,
      sourceUpdatedAt,
      reviewStatus: "machine_matched_pending_review" as const
    })),
    sourceProvenance: (sourceRecords.length > 0 ? sourceRecords : [{}]).map((source) => {
      const recordUpdated = normalizeSpatialSourceTimestampV1(stringValue(source.update_time ?? source.updateTime) || null);
      const sourceDataset = stringValue(source.dataset ?? source.source) || context.dataset.sourceId;
      const sourceRecordLicenseId = stringValue(source.license) || context.dataset.licenseId;
      const providerManifest = context.dataset.sourceProviders?.find(
        (provider) =>
          provider.sourceDataset === sourceDataset && provider.sourceRecordLicenseId === sourceRecordLicenseId
      );
      return {
        datasetReleaseDate: context.dataset.datasetReleaseDate,
        datasetSnapshotDate: context.dataset.datasetSnapshotDate,
        sourceDataset,
        sourceRecordId: stringValue(source.record_id ?? source.recordId ?? source.id) || null,
        sourceRecordVersion: stringValue(source.record_version ?? source.recordVersion) || null,
        themeLicenseId: context.dataset.licenseId,
        themeLicenseUrl: context.dataset.licenseUrl,
        sourceRecordLicenseId,
        sourceRecordLicenseUrl:
          providerManifest?.sourceRecordLicenseUrl ??
          (sourceRecordLicenseId === "ODbL-1.0" ? "https://opendatacommons.org/licenses/odbl/1-0/" : context.dataset.licenseUrl),
        sourceLicenseId: sourceRecordLicenseId,
        sourceAttribution: stringValue(source.attribution) || providerManifest?.sourceAttribution || sourceDataset,
        attributionUrl:
          stringValue(source.attribution_url ?? source.attributionUrl) || providerManifest?.attributionUrl || context.dataset.attributionUrl,
        sourceUpdatedAtRaw: recordUpdated.sourceUpdatedAtRaw,
        sourceUpdatedAtEpoch: recordUpdated.sourceUpdatedAtEpoch,
        sourceUpdatedAt: recordUpdated.sourceUpdatedAt,
        sourceObservedAt: null,
        accessedAt: context.dataset.accessedAt,
        freshnessStatus: classifySpatialFreshnessV1(recordUpdated.sourceUpdatedAt, context.dataset.accessedAt),
        freshnessPolicyId: spatialFreshnessPolicyV1.freshnessPolicyId
      };
    }),
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
      "Overture geometry is open context and is not an official parcel, zoning, cadastral, planning or hazard boundary."
    ],
    lineage: [
      {
        sequence: 1,
        operation: "source_adapter_normalize",
        tool: "geoai-overture-adapter-v1",
        toolVersion: "1.0.0",
        inputDatasetIds: [context.dataset.datasetId],
        parameters: { providerFeatureId: overtureId },
        outputChecksum: null
      }
    ],
    quality,
    metadata: { ...selectedMetadata(properties), sourceCategory: classification.category, displayNameSource: names.displayNameSource }
  };
}

export const overtureSnapshotAdapterV1: SpatialSourceAdapterV1 = {
  adapterId: "overture_snapshot_v1",
  sourceId: "overture-maps",
  normalizeFeature: normalizeOvertureFeature,
  normalizeFeatures(rawFeatures, context): SpatialAdapterOutputV1 {
    const features: SpatialFeatureEnvelopeV1[] = [];
    const rejected: SpatialAdapterOutputV1["rejected"] = [];
    for (const rawFeature of rawFeatures) {
      const normalized = normalizeOvertureFeature(rawFeature, context);
      if (normalized) {
        features.push(normalized);
      } else {
        rejected.push({
          sourceFeatureId: stringValue(rawFeature.properties?.id ?? rawFeature.id) || null,
          reason: "Missing source identity or failed geometry validation.",
          metadata: {}
        });
      }
    }
    return { features, metrics: [], rejected };
  }
};
