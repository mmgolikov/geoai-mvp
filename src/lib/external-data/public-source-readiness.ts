import bundledManifestJson from "@/data/external/normalized/external_data_manifest.json";
import dldQualityJson from "@/data/normalized/dld_source_quality.json";
import osmQualityJson from "@/data/normalized/osm_source_quality.json";
import overtureQualityJson from "@/data/normalized/overture_source_quality.json";
import type {
  ExternalDataManifest,
  ExternalDataManifestSource
} from "@/src/lib/external-data/data-manifest";
import {
  externalDataCaveat,
  externalDataSources
} from "@/src/lib/external-data/source-registry";
import {
  buildSourceReadinessGroups,
  sourceReadinessSummary,
  type SourceReadinessGroup
} from "@/src/lib/external-data/source-readiness-groups";
import { normalizeSourceDataMode } from "@/src/lib/external-data/source-modes";
import { normalizeSourceStatus } from "@/src/lib/external-data/source-status";

type BundledManifestJson = typeof bundledManifestJson;
type BundledSourceJson = BundledManifestJson["sources"][number];

const dldQuality = dldQualityJson as {
  generatedAt?: string;
  totalRecords?: number;
  categories?: Record<string, {
    sourceId?: string;
    status?: string;
    recordCount?: number;
  }>;
};

const osmQuality = osmQualityJson as {
  generatedAt?: string;
  status?: string;
  totalFeatures?: number;
  categories?: Record<string, { featureCount?: number }>;
};

const overtureQuality = overtureQualityJson as {
  totalFeatures?: number;
};

function sourceCount(source: ExternalDataManifestSource) {
  return source.recordCount ?? source.rowCount ?? source.featureCount ?? null;
}

function fallbackSource(
  source: (typeof externalDataSources)[number]
): ExternalDataManifestSource {
  return {
    id: source.id,
    status: normalizeSourceStatus(source.status),
    lastUpdated: source.lastUpdated ?? null,
    availableFiles: [],
    coverageArea: source.geography,
    confidence: source.confidence,
    caveat: source.disclaimer,
    disclaimer: source.disclaimer,
    sourceMode: normalizeSourceDataMode(source.status),
    usedInAnalysis: Boolean(source.usedInAnalysis)
  };
}

function normalizeBundledSource(
  source: ExternalDataManifestSource
): ExternalDataManifestSource {
  const count = sourceCount(source);
  const status = normalizeSourceStatus(source.status);

  return {
    ...source,
    status,
    sourceMode: normalizeSourceDataMode(source.sourceMode ?? status),
    usedInAnalysis: Boolean(source.usedInAnalysis) && (status === "connected" || Boolean(count && count > 0))
  };
}

function buildBundledPublicManifest(): ExternalDataManifest {
  const bundledById = new Map(
    (bundledManifestJson.sources as BundledSourceJson[]).map((source) => [source.id, source])
  );
  const sourceById = new Map<string, ExternalDataManifestSource>();

  for (const catalogSource of externalDataSources) {
    const bundled = bundledById.get(catalogSource.id) as ExternalDataManifestSource | undefined;
    sourceById.set(catalogSource.id, normalizeBundledSource({
      ...fallbackSource(catalogSource),
      ...bundled,
      id: catalogSource.id
    }));
  }

  for (const rawSource of bundledManifestJson.sources as BundledSourceJson[]) {
    if (sourceById.has(rawSource.id)) continue;
    sourceById.set(rawSource.id, normalizeBundledSource(rawSource as ExternalDataManifestSource));
  }

  for (const category of Object.values(dldQuality.categories ?? {})) {
    if (!category.sourceId) continue;
    const existing = sourceById.get(category.sourceId);
    if (!existing) continue;
    const status = normalizeSourceStatus(category.status);
    const recordCount = typeof category.recordCount === "number" ? category.recordCount : 0;
    sourceById.set(category.sourceId, normalizeBundledSource({
      ...existing,
      status,
      sourceMode: normalizeSourceDataMode(status),
      lastUpdated: dldQuality.generatedAt ?? existing.lastUpdated,
      recordCount,
      rowCount: undefined,
      featureCount: undefined,
      usedInAnalysis: recordCount > 0
    }));
  }

  const osmSourceByCategory: Record<string, string> = {
    roads: "osm-geofabrik-open-roads",
    pois: "osm-geofabrik-open-pois",
    buildings: "osm-geofabrik-open-buildings"
  };
  for (const [category, sourceId] of Object.entries(osmSourceByCategory)) {
    const existing = sourceById.get(sourceId);
    if (!existing) continue;
    const featureCount = osmQuality.categories?.[category]?.featureCount ?? 0;
    const status = normalizeSourceStatus(osmQuality.status ?? existing.status);
    sourceById.set(sourceId, normalizeBundledSource({
      ...existing,
      status,
      sourceMode: normalizeSourceDataMode(status),
      lastUpdated: osmQuality.generatedAt ?? existing.lastUpdated,
      featureCount,
      rowCount: undefined,
      recordCount: featureCount,
      usedInAnalysis: featureCount > 0
    }));
  }

  return {
    generatedAt: bundledManifestJson.generatedAt ?? null,
    version: bundledManifestJson.version,
    summary: bundledManifestJson.summary,
    sources: [...sourceById.values()]
  };
}

const bundledPublicManifest = buildBundledPublicManifest();

const verifiedGroupTotals = new Map<string, number | null>([
  ["dld-dubai-pulse-public-real-estate", dldQuality.totalRecords ?? null],
  ["osm-geofabrik-open-geospatial", osmQuality.totalFeatures ?? null],
  ["overture-maps-open-context", overtureQuality.totalFeatures ?? null]
]);

type CompactPublicSourceGroup = {
  id: SourceReadinessGroup["id"];
  name: SourceReadinessGroup["name"];
  category: SourceReadinessGroup["category"];
  sourceIds: SourceReadinessGroup["sourceIds"];
  status: SourceReadinessGroup["status"];
  dataMode: SourceReadinessGroup["dataMode"];
  recordCount: SourceReadinessGroup["recordCount"];
  confidence: SourceReadinessGroup["confidence"];
  coverageArea: SourceReadinessGroup["coverageArea"];
  lastUpdated: SourceReadinessGroup["lastUpdated"];
  caveat: SourceReadinessGroup["caveat"];
  nextValidationStep: SourceReadinessGroup["nextValidationStep"];
  validationRequired: true;
};

type CompactPublicManifestSource = {
  id: ExternalDataManifestSource["id"];
  status: ExternalDataManifestSource["status"];
  lastUpdated: ExternalDataManifestSource["lastUpdated"];
  rowCount: ExternalDataManifestSource["rowCount"];
  featureCount: ExternalDataManifestSource["featureCount"];
  recordCount: ExternalDataManifestSource["recordCount"];
  coverageArea: ExternalDataManifestSource["coverageArea"];
  confidence: ExternalDataManifestSource["confidence"];
  caveat: ExternalDataManifestSource["caveat"];
  sourceMode: ExternalDataManifestSource["sourceMode"];
  usedInAnalysis: ExternalDataManifestSource["usedInAnalysis"];
  disclaimer: ExternalDataManifestSource["disclaimer"];
};

function withVerifiedGroupTotal(group: SourceReadinessGroup): SourceReadinessGroup {
  return {
    id: group.id,
    name: group.name,
    category: group.category,
    sourceIds: group.sourceIds.slice(),
    status: group.status,
    dataMode: group.dataMode,
    recordCount: verifiedGroupTotals.has(group.id)
      ? verifiedGroupTotals.get(group.id) ?? null
      : group.recordCount,
    confidence: group.confidence,
    coverageArea: group.coverageArea,
    availableFiles: group.availableFiles.slice(),
    lastUpdated: group.lastUpdated,
    caveat: group.caveat,
    nextValidationStep: group.nextValidationStep,
    validationRequired: true
  };
}

function toCompactPublicSourceGroup(group: SourceReadinessGroup): CompactPublicSourceGroup {
  return {
    id: group.id,
    name: group.name,
    category: group.category,
    sourceIds: group.sourceIds.slice(),
    status: group.status,
    dataMode: group.dataMode,
    recordCount: group.recordCount,
    confidence: group.confidence,
    coverageArea: group.coverageArea,
    lastUpdated: group.lastUpdated,
    caveat: group.caveat,
    nextValidationStep: group.nextValidationStep,
    validationRequired: true
  };
}

function toCompactPublicManifestSource(source: ExternalDataManifestSource): CompactPublicManifestSource {
  return {
    id: source.id,
    status: source.status,
    lastUpdated: source.lastUpdated,
    rowCount: source.rowCount,
    featureCount: source.featureCount,
    recordCount: source.recordCount,
    coverageArea: source.coverageArea,
    confidence: source.confidence,
    caveat: source.caveat,
    sourceMode: source.sourceMode,
    usedInAnalysis: source.usedInAnalysis,
    disclaimer: source.disclaimer
  };
}

/**
 * Bounded anonymous projection. It statically imports only the reviewed compact
 * manifest and three small aggregate-quality records. Deep snapshots, paths and
 * live Supabase custody state remain operator-only and are never discovered by
 * a public request.
 */
export function getCompactPublicSourceRegistryReadiness() {
  const sourceGroups = buildSourceReadinessGroups(bundledPublicManifest).map(withVerifiedGroupTotal);
  const compactGroups = sourceGroups.map(toCompactPublicSourceGroup);
  const readiness = compactGroups.map((group) => ({
    sourceId: group.id,
    sourceName: group.name,
    status: group.status,
    sourceMode: group.dataMode,
    dataMode: group.dataMode,
    lastUpdated: group.lastUpdated,
    recordCount: group.recordCount,
    coverageArea: group.coverageArea,
    confidence: group.confidence,
    caveat: group.caveat,
    nextValidationStep: group.nextValidationStep,
    validationRequired: true as const
  }));
  const manifest = {
    version: bundledPublicManifest.version,
    generatedAt: bundledPublicManifest.generatedAt,
    summary: bundledPublicManifest.summary,
    sources: bundledPublicManifest.sources.map(toCompactPublicManifestSource)
  };
  const lineage = compactGroups.map((group) => ({
    sourceGroupId: group.id,
    sourceGroupName: group.name,
    sourceIds: group.sourceIds,
    status: group.status,
    dataMode: group.dataMode,
    recordCount: group.recordCount,
    coverageArea: group.coverageArea,
    confidence: group.confidence,
    caveat: group.caveat,
    nextValidationStep: group.nextValidationStep,
    validationRequired: group.validationRequired
  }));

  return {
    contractVersion: "1.3",
    version: bundledPublicManifest.version,
    manifestVersion: bundledPublicManifest.version,
    projection: "compact_public_v1" as const,
    mode: "bundled_public_manifest",
    source: "reviewed_repository_snapshot",
    sourceRegistryCount: 0,
    externalSnapshotCount: 0,
    liveRegistryIncluded: false,
    diagnosticsWithheld: true,
    sourceGroups: compactGroups,
    readiness,
    manifest,
    lineage,
    summary: sourceReadinessSummary(sourceGroups),
    blockers: ["Live source-registry and custody diagnostics are withheld from anonymous endpoints."],
    nextActions: sourceGroups.map((group) => group.nextValidationStep),
    sync: { status: "operator_only" },
    caveat: externalDataCaveat,
    generatedAt: bundledPublicManifest.generatedAt ?? "1970-01-01T00:00:00.000Z"
  };
}
