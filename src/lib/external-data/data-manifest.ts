import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import dldSnapshotStatic from "@/data/normalized/dld_market_snapshot.json";
import osmSnapshotStatic from "@/data/normalized/open_geodata_snapshot.json";
import {
  externalDataCaveat,
  externalDataSources,
  type DataReadinessResult,
  type SourceLineageItem
} from "@/src/lib/external-data/source-registry";
import {
  normalizeSourceStatus,
  sourceStatusPriority,
  sourceStatusToReadiness,
  type SourceStatus
} from "@/src/lib/external-data/source-status";
import { normalizeSourceDataMode, type SourceDataMode } from "@/src/lib/external-data/source-modes";
import {
  buildSourceQualityManifest,
  type SnapshotQualityItem,
  type SourceQualityManifest
} from "@/src/lib/external-data/source-quality-manifest";

export type ExternalDataManifestSource = {
  id: string;
  status: SourceStatus;
  lastUpdated?: string | null;
  availableFiles?: string[];
  rowCount?: number;
  featureCount?: number;
  recordCount?: number;
  coverageArea?: string;
  confidence?: string;
  caveat?: string;
  sourceMode?: SourceDataMode;
  usedInAnalysis?: boolean;
  disclaimer?: string;
};

export type ExternalDataManifest = {
  generatedAt: string | null;
  version: string;
  summary: string;
  sources: ExternalDataManifestSource[];
  sourceQuality?: SourceQualityManifest;
};

const manifestPath = join(process.cwd(), "data/external/normalized/external_data_manifest.json");
const dldSnapshotPath = "data/normalized/dld_market_snapshot.json";
const osmSnapshotPath = "data/normalized/open_geodata_snapshot.json";
const dldLegacyPath = "data/external/normalized/market_area_metrics.real.json";
const osmLegacyPath = "data/external/normalized/spatial_baseline.real.geojson";
const aggregateOnlyQualitySourceIds = new Set(["osm-geofabrik-baseline"]);

function readJsonFile<T>(relativePath: string): T | null {
  const path = join(process.cwd(), relativePath);
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function newestQualityTimestamp(snapshots: SnapshotQualityItem[]) {
  const timestamps = snapshots
    .flatMap((snapshot) => [snapshot.generatedAt, snapshot.extractedAt])
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

/**
 * Category-quality records are the canonical source for per-source counts.
 * Group totals must not be copied to every category, and legacy aggregate
 * entries remain separate because they can overlap the canonical categories.
 */
function applyPerSourceQualityOverlay(
  sourceById: Map<string, ExternalDataManifestSource>,
  sourceQuality: SourceQualityManifest
) {
  const snapshotsBySourceId = new Map<string, SnapshotQualityItem[]>();

  for (const snapshot of sourceQuality.groups.flatMap((group) => group.snapshots)) {
    if (aggregateOnlyQualitySourceIds.has(snapshot.sourceId) || !sourceById.has(snapshot.sourceId)) continue;
    const existing = snapshotsBySourceId.get(snapshot.sourceId) ?? [];
    existing.push(snapshot);
    snapshotsBySourceId.set(snapshot.sourceId, existing);
  }

  for (const [sourceId, snapshots] of snapshotsBySourceId) {
    const existing = sourceById.get(sourceId);
    if (!existing) continue;

    const status = snapshots
      .map((snapshot) => normalizeSourceStatus(snapshot.status))
      .sort((a, b) => sourceStatusPriority(a) - sourceStatusPriority(b))[0];
    const preferredSnapshot = snapshots.find((snapshot) => normalizeSourceStatus(snapshot.status) === status) ?? snapshots[0];
    const recordCounts = snapshots
      .map((snapshot) => snapshot.recordCount)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const featureCounts = snapshots
      .map((snapshot) => snapshot.featureCount)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const recordCount = recordCounts.length > 0 ? recordCounts.reduce((sum, value) => sum + value, 0) : undefined;
    const featureCount = featureCounts.length > 0 ? featureCounts.reduce((sum, value) => sum + value, 0) : undefined;
    const evidenceCount = featureCount ?? recordCount ?? 0;
    const availableFiles = Array.from(new Set(
      snapshots.flatMap((snapshot) => snapshot.availableFiles).filter(normalizedExternalFileExists)
    ));
    const {
      rowCount: _staleRowCount,
      featureCount: _staleFeatureCount,
      recordCount: _staleRecordCount,
      ...stableFields
    } = existing;
    const next: ExternalDataManifestSource = {
      ...stableFields,
      id: sourceId,
      status,
      sourceMode: normalizeSourceDataMode(preferredSnapshot.dataMode ?? status),
      lastUpdated: newestQualityTimestamp(snapshots) ?? existing.lastUpdated ?? null,
      availableFiles,
      recordCount,
      confidence: preferredSnapshot.confidence,
      usedInAnalysis: evidenceCount > 0
    };

    if (typeof featureCount === "number") {
      next.featureCount = featureCount;
    } else if (typeof recordCount === "number") {
      next.rowCount = recordCount;
    }

    sourceById.set(sourceId, next);
  }
}

function defaultManifest(): ExternalDataManifest {
  return {
    generatedAt: null,
    version: "1.6",
    summary: "GeoAI public data connectors v1.6. Public/open sources use snapshots, API context, manual imports and safe sample fallbacks.",
    sources: externalDataSources.map((source) => ({
      id: source.id,
      status: source.status,
      lastUpdated: source.lastUpdated ?? null,
      availableFiles: [],
      usedInAnalysis: Boolean(source.usedInAnalysis),
      coverageArea: source.geography,
      confidence: source.confidence,
      caveat: source.disclaimer,
      disclaimer: source.disclaimer
    }))
  };
}

export function readExternalDataManifest(): ExternalDataManifest {
  const fallback = defaultManifest();
  if (!existsSync(manifestPath)) {
    return enrichManifestWithSnapshots(fallback);
  }

  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as Partial<ExternalDataManifest>;

    return enrichManifestWithSnapshots({
      ...fallback,
      ...parsed,
      version: "1.6",
      sources: Array.isArray(parsed.sources) ? parsed.sources : fallback.sources
    });
  } catch {
    return enrichManifestWithSnapshots(fallback);
  }
}

export function normalizedExternalFileExists(relativePath: string) {
  return existsSync(join(process.cwd(), relativePath));
}

function enrichManifestWithSnapshots(manifest: ExternalDataManifest): ExternalDataManifest {
  const sourceQuality = buildSourceQualityManifest();
  const dldSnapshot = readJsonFile<{ areas?: unknown[]; generatedAt?: string; quality?: { notes?: string[] } }>(dldSnapshotPath) ??
    dldSnapshotStatic as { areas?: unknown[]; generatedAt?: string; quality?: { notes?: string[] } };
  const osmSnapshot = readJsonFile<{ roads?: unknown[]; pois?: unknown[]; landuse?: unknown[]; generatedAt?: string }>(osmSnapshotPath) ??
    osmSnapshotStatic as { roads?: unknown[]; pois?: unknown[]; landuse?: unknown[]; generatedAt?: string };
  const dldLegacy = readJsonFile<{ areas?: unknown[] }>(dldLegacyPath);
  const osmLegacy = readJsonFile<{ features?: unknown[] }>(osmLegacyPath);

  const sourceById = new Map(manifest.sources.map((source) => [source.id, source]));
  const update = (id: string, patch: Partial<ExternalDataManifestSource>) => {
    const existing = sourceById.get(id) ?? { id, status: "sample_fallback" as SourceStatus };
    sourceById.set(id, {
      ...existing,
      ...patch,
      status: normalizeSourceStatus(patch.status ?? existing.status),
      sourceMode: normalizeSourceDataMode(patch.sourceMode ?? existing.sourceMode ?? patch.status ?? existing.status)
    });
  };

  const dldCount = dldLegacy?.areas?.length ?? dldSnapshot?.areas?.length ?? 0;
  const dldLegacyStatus: SourceStatus = normalizedExternalFileExists(dldLegacyPath)
    ? "snapshot_available"
    : normalizeSourceStatus(sourceById.get("dld-dubai-pulse-transactions")?.status ?? "sample_fallback");
  const dldSourceMode: SourceDataMode = normalizedExternalFileExists(dldLegacyPath)
    ? "real_snapshot"
    : normalizeSourceDataMode(sourceById.get("dld-dubai-pulse-transactions")?.sourceMode ?? dldLegacyStatus);
  const dldPatch: Partial<ExternalDataManifestSource> = {
    status: dldCount > 0 ? dldLegacyStatus : "sample_fallback",
    sourceMode: dldCount > 0 ? dldSourceMode : "sample_fallback",
    lastUpdated: dldSnapshot?.generatedAt ?? sourceById.get("dld-dubai-pulse-transactions")?.lastUpdated ?? null,
    rowCount: dldCount,
    recordCount: dldCount,
    availableFiles: [
      normalizedExternalFileExists(dldSnapshotPath) ? dldSnapshotPath : null,
      normalizedExternalFileExists(dldLegacyPath) ? dldLegacyPath : null
    ].filter((file): file is string => Boolean(file)),
    coverageArea: "Dubai market areas",
    confidence: dldLegacyStatus === "snapshot_available" ? "medium" : "low",
    caveat: dldCount > 0
      ? `DLD / Dubai Pulse snapshot context available (${dldSourceMode.replace(/_/g, " ")}). Official validation required. ${externalDataCaveat}`
      : `DLD / Dubai Pulse public snapshot missing; sample fallback remains active. ${externalDataCaveat}`,
    usedInAnalysis: dldCount > 0
  };
  update("dld-dubai-pulse-transactions", dldPatch);
  [
    "dld-dubai-pulse-public-transactions",
    "dld-dubai-pulse-public-rents",
    "dld-dubai-pulse-public-projects",
    "dld-dubai-pulse-public-valuations",
    "dld-dubai-pulse-public-land",
    "dld-dubai-pulse-public-building",
    "dld-dubai-pulse-public-unit",
    "dld-dubai-pulse-public-brokers",
    "dld-dubai-pulse-public-developers"
  ].forEach((id) => update(id, {
    coverageArea: "Dubai public real-estate categories",
    caveat: externalDataCaveat
  }));

  const osmCount = (osmSnapshot?.roads?.length ?? 0) + (osmSnapshot?.pois?.length ?? 0) + (osmSnapshot?.landuse?.length ?? 0);
  const legacyOsmCount = osmLegacy?.features?.length ?? 0;
  const resolvedOsmCount = osmLegacy ? legacyOsmCount : osmCount;
  const osmLegacyStatus: SourceStatus = normalizedExternalFileExists(osmLegacyPath) ? "snapshot_available" : "sample_fallback";
  const osmPatch: Partial<ExternalDataManifestSource> = {
    status: resolvedOsmCount > 0 ? osmLegacyStatus : "sample_fallback",
    lastUpdated: osmSnapshot?.generatedAt ?? sourceById.get("osm-geofabrik-baseline")?.lastUpdated ?? null,
    featureCount: resolvedOsmCount,
    recordCount: resolvedOsmCount,
    availableFiles: [
      normalizedExternalFileExists(osmSnapshotPath) ? osmSnapshotPath : null,
      normalizedExternalFileExists(osmLegacyPath) ? osmLegacyPath : null
    ].filter((file): file is string => Boolean(file)),
    coverageArea: "Dubai open geospatial baseline",
    confidence: osmLegacyStatus === "snapshot_available" ? "medium" : "low",
    sourceMode: normalizedExternalFileExists(osmLegacyPath) ? "real_snapshot" : "sample_fallback",
    caveat: resolvedOsmCount > 0
      ? `OSM / Geofabrik sample/open snapshot context available. ${externalDataCaveat}`
      : `OSM / Geofabrik snapshot missing; sample fallback remains active. ${externalDataCaveat}`,
    usedInAnalysis: resolvedOsmCount > 0
  };
  update("osm-geofabrik-baseline", osmPatch);
  ["osm-geofabrik-open-roads", "osm-geofabrik-open-pois", "osm-geofabrik-open-buildings"].forEach((id) => update(id, {
    coverageArea: "Dubai open geospatial baseline",
    caveat: externalDataCaveat
  }));

  ["overture-maps-open-buildings", "overture-maps-open-places", "overture-maps-open-transportation"].forEach((id) => update(id, {
    coverageArea: "Dubai open Overture snapshot",
    caveat: `Overture Maps open snapshot/manual import context. ${externalDataCaveat}`
  }));

  const worldpopFiles = ["data/normalized/worldpop_population_context.json", "data/normalized/worldpop_source_quality.json"].filter(normalizedExternalFileExists);
  const worldpopQuality = readJsonFile<{ featureCount?: number; status?: string }>("data/normalized/worldpop_source_quality.json");
  const worldpopStatus = normalizeSourceStatus(worldpopQuality?.status ?? "sample_fallback");
  update("worldpop-demographics", {
    status: worldpopFiles.length > 0 ? worldpopStatus : "sample_fallback",
    sourceMode: worldpopFiles.length > 0 ? normalizeSourceDataMode(worldpopStatus) : "sample_fallback",
    featureCount: worldpopQuality?.featureCount,
    recordCount: worldpopQuality?.featureCount,
    availableFiles: worldpopFiles,
    coverageArea: "UAE / Dubai population context",
    confidence: "low",
    caveat: `WorldPop demographic context is screening-level and not official census validation. ${externalDataCaveat}`
  });

  const adminFiles = ["data/normalized/admin_boundaries_context.json"].filter(normalizedExternalFileExists);
  const adminContext = readJsonFile<{ status?: string }>("data/normalized/admin_boundaries_context.json");
  const adminStatus = normalizeSourceStatus(adminContext?.status ?? "manual_import_ready");
  ["overture-divisions-admin-context", "gadm-uae-admin-context"].forEach((id) => update(id, {
    status: adminFiles.length > 0 ? adminStatus : "manual_import_ready",
    sourceMode: adminFiles.length > 0 ? normalizeSourceDataMode(adminStatus) : "manual_import_ready",
    availableFiles: adminFiles,
    coverageArea: "UAE / Dubai non-official administrative context",
    confidence: "low",
    caveat: `Administrative context is non-official and license-sensitive. ${externalDataCaveat}`
  }));

  const copernicusSample = normalizedExternalFileExists("data/external/samples/copernicus_sentinel_metadata_sample.json");
  update("copernicus-sentinel-metadata", {
    status: copernicusSample ? "sample_fallback" : "token_required",
    sourceMode: copernicusSample ? "sample_fallback" : "planned_validation",
    availableFiles: copernicusSample ? ["data/external/samples/copernicus_sentinel_metadata_sample.json"] : [],
    coverageArea: "Dubai satellite metadata availability",
    confidence: "requires-validation",
    caveat: `Satellite metadata path only; no imagery analytics connected. ${externalDataCaveat}`
  });

  update("open-meteo-climate", {
    status: "permission_required",
    sourceMode: "permission_required",
    coverageArea: "Provider evaluated; no live request authorized",
    confidence: "requires-validation",
    caveat: `Open-Meteo commercial-use approval is required before activation; no API response or snapshot is claimed. ${externalDataCaveat}`
  });

  applyPerSourceQualityOverlay(sourceById, sourceQuality);

  return {
    ...manifest,
    version: "1.6",
    sourceQuality,
    sources: externalDataSources.map((source) => {
      const existing = sourceById.get(source.id);
      return {
        id: source.id,
        status: normalizeSourceStatus(existing?.status ?? source.status),
        lastUpdated: existing?.lastUpdated ?? source.lastUpdated ?? null,
        availableFiles: existing?.availableFiles ?? [],
        rowCount: existing?.rowCount,
        featureCount: existing?.featureCount,
        recordCount: existing?.recordCount ?? existing?.rowCount ?? existing?.featureCount,
        coverageArea: existing?.coverageArea ?? source.geography,
        confidence: existing?.confidence ?? source.confidence,
        caveat: existing?.caveat ?? source.disclaimer,
        sourceMode: normalizeSourceDataMode(existing?.sourceMode ?? existing?.status ?? source.status),
        usedInAnalysis: existing?.usedInAnalysis ?? Boolean(source.usedInAnalysis),
        disclaimer: existing?.disclaimer ?? source.disclaimer
      };
    })
  };
}

export function getExternalDataReadiness(): DataReadinessResult[] {
  const manifest = readExternalDataManifest();

  return externalDataSources.map((source) => {
    const manifestSource = manifest.sources.find((item) => item.id === source.id);
    const recordCount = manifestSource?.recordCount ?? manifestSource?.rowCount ?? manifestSource?.featureCount;
    const readiness = sourceStatusToReadiness(manifestSource?.status, Boolean(recordCount && recordCount > 0));

    return {
      sourceId: source.id,
      sourceName: source.name,
      status: readiness,
      lastUpdated: manifestSource?.lastUpdated ?? source.lastUpdated ?? null,
      recordCount,
      coverageArea: manifestSource?.coverageArea ?? source.geography,
      confidence: source.confidence,
      sourceMode: manifestSource?.sourceMode,
      caveat: manifestSource?.caveat ?? source.disclaimer
    };
  });
}

export function createSourceLineageItems(usedIn: string): SourceLineageItem[] {
  const readinessById = new Map(getExternalDataReadiness().map((item) => [item.sourceId, item]));

  return externalDataSources.map((source) => {
    const readiness = readinessById.get(source.id);

    return {
      sourceId: source.id,
      sourceName: source.name,
      category: source.category,
      dataMode: readiness?.sourceMode ?? readiness?.status ?? source.accessMode,
      usedIn,
      confidence: source.confidence,
      limitation: readiness?.caveat ?? source.limitations[0] ?? source.disclaimer,
      validationRequired: !source.officialClaimAllowed
    };
  });
}
