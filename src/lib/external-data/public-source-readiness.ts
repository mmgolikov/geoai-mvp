import bundledManifestJson from "@/data/external/normalized/external_data_manifest.json";
import copernicusMetadataJson from "@/data/external/samples/copernicus_sentinel_metadata_sample.json";
import dldQualityJson from "@/data/normalized/dld_source_quality.json";
import osmQualityJson from "@/data/normalized/osm_source_quality.json";
import overtureQualityJson from "@/data/normalized/overture_source_quality.json";
import type {
  ExternalDataManifest,
  ExternalDataManifestSource
} from "@/src/lib/external-data/data-manifest";
import {
  externalDataSources,
  resolveExternalDataSourceId
} from "@/src/lib/external-data/source-registry";
import {
  buildSourceReadinessGroups,
  sourceGroupDefinitions,
  sourceReadinessSummary,
  type SourceReadinessGroup
} from "@/src/lib/external-data/source-readiness-groups";
import {
  ILLUSTRATIVE_LOCAL_SCREENING_CONTEXT_LABEL,
  normalizeSourceDataMode,
  sourcePresentationLabel,
  sourceValidationStatusFor,
  type SourceValidationStatus
} from "@/src/lib/external-data/source-modes";
import { normalizeSourceStatus } from "@/src/lib/external-data/source-status";
import { SOURCE_PROVENANCE_CAVEAT } from "@/src/lib/external-data/source-provenance-contract";
import type {
  CompactSourceProvenanceManifest,
  SourceProvenanceManifest
} from "@/src/lib/external-data/source-provenance-manifest";

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

const copernicusMetadata = copernicusMetadataJson as {
  generatedAt?: string;
  status?: string;
  collections?: Array<{ sceneCount?: number }>;
};
const copernicusRecordCount = Array.isArray(copernicusMetadata.collections)
  ? copernicusMetadata.collections.reduce(
      (sum, item) => sum + (typeof item.sceneCount === "number" ? item.sceneCount : 0),
      0
    )
  : null;

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
    caveat: SOURCE_PROVENANCE_CAVEAT,
    disclaimer: source.disclaimer,
    sourceMode: normalizeSourceDataMode(source.status),
    usedInAnalysis: false
  };
}

function provenanceAllowsDecisionUse(sourceId: string) {
  const resolvedId = resolveExternalDataSourceId(sourceId);
  const definition = sourceGroupDefinitions.find((group) =>
    [...group.sourceIds, ...(group.aliases ?? [])]
      .some((id) => resolveExternalDataSourceId(id) === resolvedId)
  );
  if (!definition) return false;

  const provenance = bundledSourceProvenance.groups.find(
    (group) => group.sourceGroupId === definition.id
  );
  return Boolean(
    provenance &&
    provenance.releaseCount > 0 &&
    provenance.validReleaseCount === provenance.releaseCount &&
    provenance.decisionEligibleReleaseCount > 0 &&
    provenance.evidence.hashesComplete &&
    provenance.evidence.countsComplete &&
    provenance.evidence.rightsComplete &&
    provenance.evidence.custodyComplete
  );
}

function normalizeBundledSource(
  source: ExternalDataManifestSource
): ExternalDataManifestSource {
  const count = sourceCount(source);
  const status = normalizeSourceStatus(source.status);

  return {
    ...source,
    id: resolveExternalDataSourceId(source.id),
    status,
    sourceMode: normalizeSourceDataMode(source.sourceMode ?? status),
    caveat: SOURCE_PROVENANCE_CAVEAT,
    usedInAnalysis:
      Boolean(source.usedInAnalysis) &&
      status !== "sample_fallback" &&
      (status === "connected" || status === "snapshot_available") &&
      Boolean(count && count > 0) &&
      provenanceAllowsDecisionUse(source.id)
  };
}

function buildBundledPublicManifest(): ExternalDataManifest {
  const bundledById = new Map(
    (bundledManifestJson.sources as BundledSourceJson[]).map((source) => [
      resolveExternalDataSourceId(source.id),
      { ...source, id: resolveExternalDataSourceId(source.id) }
    ])
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
    const sourceId = resolveExternalDataSourceId(rawSource.id);
    if (sourceById.has(sourceId)) continue;
    sourceById.set(sourceId, normalizeBundledSource({
      ...(rawSource as ExternalDataManifestSource),
      id: sourceId
    }));
  }

  for (const category of Object.values(dldQuality.categories ?? {})) {
    if (!category.sourceId) continue;
    const sourceId = resolveExternalDataSourceId(category.sourceId);
    const existing = sourceById.get(sourceId);
    if (!existing) continue;
    const status = normalizeSourceStatus(category.status);
    const recordCount = typeof category.recordCount === "number" ? category.recordCount : 0;
    sourceById.set(sourceId, normalizeBundledSource({
      ...existing,
      status,
      sourceMode: normalizeSourceDataMode(status),
      lastUpdated: dldQuality.generatedAt ?? existing.lastUpdated,
      recordCount,
      rowCount: undefined,
      featureCount: undefined,
      usedInAnalysis: false
    }));
  }

  const osmSourceByCategory: Record<string, string> = {
    roads: "osm-geofabrik-open-roads",
    pois: "osm-geofabrik-open-pois",
    buildings: "osm-geofabrik-open-buildings"
  };
  for (const [category, sourceId] of Object.entries(osmSourceByCategory)) {
    const resolvedSourceId = resolveExternalDataSourceId(sourceId);
    const existing = sourceById.get(resolvedSourceId);
    if (!existing) continue;
    const featureCount = osmQuality.categories?.[category]?.featureCount ?? 0;
    const status = normalizeSourceStatus(osmQuality.status ?? existing.status);
    sourceById.set(resolvedSourceId, normalizeBundledSource({
      ...existing,
      status,
      sourceMode: normalizeSourceDataMode(status),
      lastUpdated: osmQuality.generatedAt ?? existing.lastUpdated,
      featureCount,
      rowCount: undefined,
      recordCount: featureCount,
      usedInAnalysis: false
    }));
  }

  for (const sourceId of ["copernicus-sentinel-catalog"]) {
    const existing = sourceById.get(sourceId);
    if (!existing) continue;
    const status = normalizeSourceStatus(copernicusMetadata.status ?? existing.status);
    sourceById.set(sourceId, normalizeBundledSource({
      ...existing,
      status,
      sourceMode: normalizeSourceDataMode(status),
      lastUpdated: copernicusMetadata.generatedAt ?? existing.lastUpdated,
      recordCount: copernicusRecordCount ?? undefined,
      rowCount: undefined,
      featureCount: undefined,
      usedInAnalysis: false
    }));
  }

  return {
    generatedAt: bundledManifestJson.generatedAt ?? null,
    version: bundledManifestJson.version,
    summary: bundledManifestJson.summary,
    sources: [...sourceById.values()]
  };
}

const publicCountEvidence = new Map<string, number | null>([
  ["dld-dubai-pulse-public-real-estate", dldQuality.totalRecords ?? null],
  ["osm-geofabrik-open-geospatial", osmQuality.totalFeatures ?? null],
  ["overture-maps-open-context", overtureQuality.totalFeatures ?? null],
  ["copernicus-sentinel-metadata", copernicusRecordCount]
]);
const publicGeneratedAtEvidence = new Map<string, string | null>([
  ["dld-dubai-pulse-public-real-estate", dldQuality.generatedAt ?? null],
  ["osm-geofabrik-open-geospatial", osmQuality.generatedAt ?? null],
  ["overture-maps-open-context", null],
  ["copernicus-sentinel-metadata", copernicusMetadata.generatedAt ?? null]
]);
const bundledSourceProvenance: SourceProvenanceManifest = {
  contractVersion: "1.0",
  mode: "strict_public_release_summary",
  source: "reviewed_repository_snapshot",
  generatedAt: bundledManifestJson.generatedAt ?? null,
  caveat: SOURCE_PROVENANCE_CAVEAT,
  groups: sourceGroupDefinitions.map((definition) => {
    const count = publicCountEvidence.get(definition.id) ?? null;
    const countsComplete = count !== null;
    return {
      sourceGroupId: definition.id,
      sourceGroupName: definition.name,
      sourceIds: definition.sourceIds.slice(),
      generatedAt: publicGeneratedAtEvidence.get(definition.id) ?? null,
      releaseCount: 0,
      validReleaseCount: 0,
      screeningReleaseCount: 0,
      decisionEligibleReleaseCount: 0,
      qualityState: "blocked",
      confidence: "insufficient",
      rightsStatuses: ["unreviewed"],
      custodyStatuses: ["not_recorded"],
      evidence: {
        hashesComplete: false,
        countsComplete,
        rightsComplete: false,
        custodyComplete: false
      },
      blockers: [
        "No immutable public source release receipt is bundled.",
        "Reusable rights and attribution review is not recorded.",
        "Artifact SHA-256 evidence is withheld until an approved release receipt exists.",
        !countsComplete ? "Verified record or feature count is not recorded." : null,
        "Bundled context remains limited to screening use."
      ].filter((value): value is string => Boolean(value)),
      nextValidationStep: definition.nextValidationStep,
      caveat: SOURCE_PROVENANCE_CAVEAT,
      releases: []
    };
  })
};
const bundledPublicManifest: ExternalDataManifest = {
  ...buildBundledPublicManifest(),
  sourceProvenance: bundledSourceProvenance
};

const verifiedGroupTotals = new Map<string, number | null>([
  ["dld-dubai-pulse-public-real-estate", dldQuality.totalRecords ?? null],
  ["osm-geofabrik-open-geospatial", osmQuality.totalFeatures ?? null],
  ["overture-maps-open-context", overtureQuality.totalFeatures ?? null],
  ["copernicus-sentinel-metadata", copernicusRecordCount]
]);

type CompactPublicSourceGroup = {
  id: SourceReadinessGroup["id"];
  name: SourceReadinessGroup["name"];
  category: SourceReadinessGroup["category"];
  sourceIds: SourceReadinessGroup["sourceIds"];
  status: SourceReadinessGroup["status"];
  dataMode: SourceReadinessGroup["dataMode"];
  validationStatus: SourceReadinessGroup["validationStatus"];
  presentationLabel: SourceReadinessGroup["presentationLabel"];
  sampleData: SourceReadinessGroup["sampleData"];
  smallSnapshot: SourceReadinessGroup["smallSnapshot"];
  recordCount: SourceReadinessGroup["recordCount"];
  confidence: SourceReadinessGroup["confidence"];
  coverageArea: SourceReadinessGroup["coverageArea"];
  lastUpdated: SourceReadinessGroup["lastUpdated"];
  caveat: SourceReadinessGroup["caveat"];
  nextValidationStep: SourceReadinessGroup["nextValidationStep"];
  validationRequired: true;
  qualityState: SourceReadinessGroup["qualityState"];
  decisionUse: SourceReadinessGroup["decisionUse"];
  provenanceValid: SourceReadinessGroup["provenanceValid"];
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
  validationStatus: SourceValidationStatus;
  presentationLabel: string;
  sampleData: boolean;
  smallSnapshot: boolean;
  usedInAnalysis: ExternalDataManifestSource["usedInAnalysis"];
  disclaimer: ExternalDataManifestSource["disclaimer"];
};

function withVerifiedGroupTotal(group: SourceReadinessGroup): SourceReadinessGroup {
  const recordCount = verifiedGroupTotals.has(group.id)
    ? verifiedGroupTotals.get(group.id) ?? null
    : group.recordCount;
  return {
    id: group.id,
    name: group.name,
    category: group.category,
    sourceIds: group.sourceIds.slice(),
    status: group.status,
    dataMode: group.dataMode,
    validationStatus: group.validationStatus,
    presentationLabel: group.presentationLabel,
    sampleData: group.sampleData,
    smallSnapshot: group.sampleData && recordCount !== null && recordCount < 100,
    recordCount,
    confidence: group.confidence,
    coverageArea: group.coverageArea,
    availableFiles: group.availableFiles.slice(),
    lastUpdated: group.lastUpdated,
    caveat: group.caveat,
    nextValidationStep: group.nextValidationStep,
    validationRequired: true,
    qualityState: group.qualityState,
    decisionUse: group.decisionUse,
    provenanceValid: group.provenanceValid,
    evidence: { ...group.evidence },
    blockers: group.blockers.slice()
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
    validationStatus: group.validationStatus,
    presentationLabel: group.presentationLabel,
    sampleData: group.sampleData,
    smallSnapshot: group.smallSnapshot,
    recordCount: group.recordCount,
    confidence: group.confidence,
    coverageArea: group.coverageArea,
    lastUpdated: group.lastUpdated,
    caveat: group.caveat,
    nextValidationStep: group.nextValidationStep,
    validationRequired: true,
    qualityState: group.qualityState,
    decisionUse: group.decisionUse,
    provenanceValid: group.provenanceValid
  };
}

function toCompactPublicManifestSource(source: ExternalDataManifestSource): CompactPublicManifestSource {
  const validationStatus = sourceValidationStatusFor(source.status);
  const count = sourceCount(source);
  const sampleData = source.status === "sample_fallback" || validationStatus === "sample-only";
  return {
    id: source.id,
    status: source.status,
    lastUpdated: source.lastUpdated,
    rowCount: source.rowCount,
    featureCount: source.featureCount,
    recordCount: source.recordCount,
    coverageArea: source.coverageArea,
    confidence: source.confidence,
    caveat: SOURCE_PROVENANCE_CAVEAT,
    sourceMode: source.sourceMode,
    validationStatus,
    presentationLabel: sourcePresentationLabel({
      dataMode: source.sourceMode,
      status: source.status,
      validationStatus
    }),
    sampleData,
    smallSnapshot: sampleData && count !== null && count < 100,
    usedInAnalysis: Boolean(source.usedInAnalysis) && provenanceAllowsDecisionUse(source.id),
    disclaimer: source.disclaimer
  };
}

/**
 * Bounded anonymous projection. It uses reviewed aggregate metadata and fails
 * closed because no immutable release receipt is bundled publicly. Artifact
 * paths, hashes, detailed receipts and live Supabase state remain operator-only.
 */
export function getCompactPublicSourceRegistryReadiness() {
  const sourceGroups = buildSourceReadinessGroups(bundledPublicManifest).map(withVerifiedGroupTotal);
  const compactGroups = sourceGroups.map(toCompactPublicSourceGroup);
  const compactSourceQuality: CompactSourceProvenanceManifest = {
    contractVersion: bundledSourceProvenance.contractVersion,
    mode: bundledSourceProvenance.mode,
    source: bundledSourceProvenance.source,
    generatedAt: bundledSourceProvenance.generatedAt,
    caveat: bundledSourceProvenance.caveat,
    groups: bundledSourceProvenance.groups.map(({ releases: _releases, ...group }) => group)
  };
  const readiness = compactGroups.map((group) => ({
    sourceId: group.id,
    sourceName: group.name,
    status: group.status,
    sourceMode: group.dataMode,
    dataMode: group.dataMode,
    validationStatus: group.validationStatus,
    presentationLabel: group.presentationLabel,
    sampleData: group.sampleData,
    smallSnapshot: group.smallSnapshot,
    lastUpdated: group.lastUpdated,
    recordCount: group.recordCount,
    coverageArea: group.coverageArea,
    confidence: group.confidence,
    caveat: group.caveat,
    nextValidationStep: group.nextValidationStep,
    validationRequired: true as const,
    qualityState: group.qualityState,
    decisionUse: group.decisionUse,
    provenanceValid: group.provenanceValid
  }));
  const manifest = {
    version: bundledPublicManifest.version,
    generatedAt: bundledPublicManifest.generatedAt,
    summary: bundledPublicManifest.summary,
    sources: bundledPublicManifest.sources.map(toCompactPublicManifestSource),
    sourceQuality: compactSourceQuality
  };
  const lineage = compactGroups.map((group) => ({
    sourceGroupId: group.id,
    sourceGroupName: group.name,
    sourceIds: group.sourceIds,
    status: group.status,
    dataMode: group.dataMode,
    validationStatus: group.validationStatus,
    presentationLabel: group.presentationLabel,
    sampleData: group.sampleData,
    smallSnapshot: group.smallSnapshot,
    recordCount: group.recordCount,
    coverageArea: group.coverageArea,
    confidence: group.confidence,
    caveat: group.caveat,
    nextValidationStep: group.nextValidationStep,
    validationRequired: group.validationRequired,
    qualityState: group.qualityState,
    decisionUse: group.decisionUse,
    provenanceValid: group.provenanceValid
  }));
  const blockers = Array.from(new Set([
    "Live source-registry and detailed custody diagnostics are withheld from anonymous endpoints.",
    ...sourceGroups.flatMap((group) => group.blockers)
  ]));

  return {
    contractVersion: "1.3",
    version: bundledPublicManifest.version,
    manifestVersion: bundledPublicManifest.version,
    projection: "compact_public_v1" as const,
    mode: "bundled_public_manifest",
    source: "reviewed_repository_snapshot",
    presentationLabel: ILLUSTRATIVE_LOCAL_SCREENING_CONTEXT_LABEL,
    sourceRegistryCount: 0,
    externalSnapshotCount: 0,
    liveRegistryIncluded: false,
    diagnosticsWithheld: true,
    sourceGroups: compactGroups,
    readiness,
    manifest,
    lineage,
    summary: sourceReadinessSummary(sourceGroups),
    blockers,
    nextActions: Array.from(new Set(sourceGroups.map((group) => group.nextValidationStep))),
    sourceQualityRef: {
      location: "manifest.sourceQuality" as const,
      contractVersion: compactSourceQuality.contractVersion,
      projection: "compact_source_quality_v1" as const
    },
    sync: { status: "operator_only" },
    caveat: SOURCE_PROVENANCE_CAVEAT,
    generatedAt: bundledPublicManifest.generatedAt ?? compactSourceQuality.generatedAt
  };
}

export function getCompactPublicSourceRegistryResponse() {
  const readiness = getCompactPublicSourceRegistryReadiness();
  return {
    ok: true,
    ...readiness,
    sources: readiness.sourceGroups,
    lastUpdated: readiness.generatedAt
  };
}
