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
  sourceStatusToReadiness,
  type SourceStatus
} from "@/src/lib/external-data/source-status";
import { normalizeSourceDataMode, type SourceDataMode } from "@/src/lib/external-data/source-modes";
import {
  buildSourceQualityManifest,
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

function readJsonFile<T>(relativePath: string): T | null {
  const path = join(process.cwd(), relativePath);
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
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

  const dldCount = dldSnapshot?.areas?.length ?? dldLegacy?.areas?.length ?? 0;
  const dldPublicFiles = [
    "data/normalized/dld_transactions_snapshot.json",
    "data/normalized/dld_rents_snapshot.json",
    "data/normalized/dld_projects_snapshot.json",
    "data/normalized/dld_valuations_snapshot.json",
    "data/normalized/dld_land_snapshot.json",
    "data/normalized/dld_building_snapshot.json",
    "data/normalized/dld_unit_snapshot.json",
    "data/normalized/dld_brokers_snapshot.json",
    "data/normalized/dld_developers_snapshot.json",
    "data/normalized/dld_market_summary.json",
    "data/normalized/dld_source_quality.json"
  ].filter(normalizedExternalFileExists);
  const dldPublicQuality = readJsonFile<{ totalRecords?: number; categories?: Record<string, { recordCount?: number; status?: string }> }>("data/normalized/dld_source_quality.json");
  const dldPublicCount = dldPublicQuality?.totalRecords ?? dldCount;
  const dldMarketSnapshotFileExists = normalizedExternalFileExists(dldSnapshotPath);
  const dldLegacyStatus: SourceStatus = normalizedExternalFileExists(dldLegacyPath) || dldMarketSnapshotFileExists ? "snapshot_available" : "sample_fallback";
  const dldPublicStatuses = Object.values(dldPublicQuality?.categories ?? {}).map((item) => normalizeSourceStatus(item.status));
  const dldPublicStatus: SourceStatus = dldPublicStatuses.some((status) => status === "snapshot_available") ? "snapshot_available" : "sample_fallback";
  const dldSourceMode: SourceDataMode = normalizedExternalFileExists(dldLegacyPath)
    ? "real_snapshot"
    : dldMarketSnapshotFileExists
      ? "sample_fallback"
      : "manual_import_ready";
  const dldPatch: Partial<ExternalDataManifestSource> = {
    status: dldCount > 0 ? dldLegacyStatus : "sample_fallback",
    sourceMode: dldCount > 0 ? dldSourceMode : "manual_import_ready",
    lastUpdated: dldSnapshot?.generatedAt ?? sourceById.get("dld-dubai-pulse-transactions")?.lastUpdated ?? null,
    rowCount: dldPublicCount,
    recordCount: dldPublicCount,
    availableFiles: [
      normalizedExternalFileExists(dldSnapshotPath) ? dldSnapshotPath : null,
      normalizedExternalFileExists(dldLegacyPath) ? dldLegacyPath : null
    ].filter((file): file is string => Boolean(file)).concat(dldPublicFiles),
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
    ...dldPatch,
    status: dldPublicFiles.length > 0 ? dldPublicStatus : "sample_fallback",
    sourceMode: dldPublicStatus === "snapshot_available" ? "imported_snapshot" : "sample_fallback",
    coverageArea: "Dubai public real-estate categories"
  }));

  const osmCount = (osmSnapshot?.roads?.length ?? 0) + (osmSnapshot?.pois?.length ?? 0) + (osmSnapshot?.landuse?.length ?? 0);
  const legacyOsmCount = osmLegacy?.features?.length ?? 0;
  const resolvedOsmCount = osmCount || legacyOsmCount;
  const osmPublicFiles = [
    "data/normalized/osm_roads_snapshot.json",
    "data/normalized/osm_buildings_snapshot.json",
    "data/normalized/osm_pois_snapshot.json",
    "data/normalized/osm_landuse_snapshot.json",
    "data/normalized/osm_transport_snapshot.json",
    "data/normalized/osm_source_quality.json"
  ].filter(normalizedExternalFileExists);
  const osmPublicQuality = readJsonFile<{ totalFeatures?: number; status?: string }>("data/normalized/osm_source_quality.json");
  const osmPublicCount = osmPublicQuality?.totalFeatures ?? resolvedOsmCount;
  const osmLegacyStatus: SourceStatus = normalizedExternalFileExists(osmLegacyPath) ? "snapshot_available" : "sample_fallback";
  const osmPublicStatus = normalizeSourceStatus(osmPublicQuality?.status ?? osmLegacyStatus);
  const osmPatch: Partial<ExternalDataManifestSource> = {
    status: resolvedOsmCount > 0 ? osmLegacyStatus : "sample_fallback",
    lastUpdated: osmSnapshot?.generatedAt ?? sourceById.get("osm-geofabrik-baseline")?.lastUpdated ?? null,
    featureCount: osmPublicCount,
    recordCount: osmPublicCount,
    availableFiles: [
      normalizedExternalFileExists(osmSnapshotPath) ? osmSnapshotPath : null,
      normalizedExternalFileExists(osmLegacyPath) ? osmLegacyPath : null
    ].filter((file): file is string => Boolean(file)).concat(osmPublicFiles),
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
    ...osmPatch,
    status: osmPublicFiles.length > 0 ? osmPublicStatus : "sample_fallback",
    sourceMode: osmPublicStatus === "snapshot_available" ? "imported_snapshot" : "sample_fallback"
  }));

  const overtureFiles = [
    "data/normalized/overture_buildings_snapshot.json",
    "data/normalized/overture_places_snapshot.json",
    "data/normalized/overture_transportation_snapshot.json",
    "data/normalized/overture_source_quality.json"
  ].filter(normalizedExternalFileExists);
  const overtureQuality = readJsonFile<{ totalFeatures?: number; status?: string }>("data/normalized/overture_source_quality.json");
  const overtureStatus = normalizeSourceStatus(overtureQuality?.status ?? "manual_import_ready");
  ["overture-maps-open-buildings", "overture-maps-open-places", "overture-maps-open-transportation"].forEach((id) => update(id, {
    status: overtureFiles.length > 0 ? overtureStatus : "manual_import_ready",
    sourceMode: overtureFiles.length > 0 ? normalizeSourceDataMode(overtureStatus) : "manual_import_ready",
    featureCount: overtureQuality?.totalFeatures,
    recordCount: overtureQuality?.totalFeatures,
    availableFiles: overtureFiles,
    coverageArea: "Dubai open Overture snapshot",
    confidence: overtureStatus === "snapshot_available" ? "medium" : "low",
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
    status: "connected",
    sourceMode: "real_snapshot",
    coverageArea: "Coordinate-level open climate API context",
    confidence: "medium",
    caveat: `Screening-level heat/rainfall proxy only. ${externalDataCaveat}`
  });

  return {
    ...manifest,
    version: "1.6",
    sourceQuality: buildSourceQualityManifest(),
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
