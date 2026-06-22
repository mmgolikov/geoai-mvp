import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import dldSnapshotStatic from "@/data/normalized/dld_market_snapshot.json";
import osmSnapshotStatic from "@/data/normalized/open_geodata_snapshot.json";
import {
  externalDataCaveat,
  externalDataSources,
  type DataReadinessResult,
  type DataReadinessStatus,
  type SourceLineageItem
} from "@/src/lib/external-data/source-registry";

export type ExternalDataManifestSource = {
  id: string;
  status: string;
  lastUpdated?: string | null;
  availableFiles?: string[];
  rowCount?: number;
  featureCount?: number;
  recordCount?: number;
  coverageArea?: string;
  confidence?: string;
  caveat?: string;
  usedInAnalysis?: boolean;
  disclaimer?: string;
};

export type ExternalDataManifest = {
  generatedAt: string | null;
  version: string;
  summary: string;
  sources: ExternalDataManifestSource[];
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
    version: "1.4",
    summary: "GeoAI external data manifest v1.4. Snapshot connectors are optional and fall back safely to demo/sample context.",
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
      version: "1.4",
      sources: Array.isArray(parsed.sources) ? parsed.sources : fallback.sources
    });
  } catch {
    return enrichManifestWithSnapshots(fallback);
  }
}

export function normalizedExternalFileExists(relativePath: string) {
  return existsSync(join(process.cwd(), relativePath));
}

function sourceStatusToReadiness(status: string | undefined, hasRecords: boolean): DataReadinessStatus {
  if (hasRecords) return "snapshot_available";
  if (status === "connected-api" || status === "connected") return "connected";
  if (status === "planned-access" || status === "not-configured" || status === "planned") return "planned";
  if (status === "missing-input") return "missing";
  return "sample_fallback";
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
    const existing = sourceById.get(id) ?? { id, status: "sample_fallback" };
    sourceById.set(id, { ...existing, ...patch });
  };

  const dldCount = dldSnapshot?.areas?.length ?? dldLegacy?.areas?.length ?? 0;
  update("dld-dubai-pulse-transactions", {
    status: dldCount > 0 ? "snapshot_available" : "sample_fallback",
    lastUpdated: dldSnapshot?.generatedAt ?? sourceById.get("dld-dubai-pulse-transactions")?.lastUpdated ?? null,
    rowCount: dldCount,
    recordCount: dldCount,
    availableFiles: [
      normalizedExternalFileExists(dldSnapshotPath) ? dldSnapshotPath : null,
      normalizedExternalFileExists(dldLegacyPath) ? dldLegacyPath : null
    ].filter((file): file is string => Boolean(file)),
    coverageArea: "Dubai market areas",
    confidence: dldCount > 0 ? "medium" : "requires-validation",
    caveat: dldCount > 0
      ? `DLD / Dubai Pulse snapshot available. ${externalDataCaveat}`
      : `DLD / Dubai Pulse snapshot missing; sample fallback remains active. ${externalDataCaveat}`,
    usedInAnalysis: dldCount > 0
  });

  const osmCount = (osmSnapshot?.roads?.length ?? 0) + (osmSnapshot?.pois?.length ?? 0) + (osmSnapshot?.landuse?.length ?? 0);
  const legacyOsmCount = osmLegacy?.features?.length ?? 0;
  const resolvedOsmCount = osmCount || legacyOsmCount;
  update("osm-geofabrik-baseline", {
    status: resolvedOsmCount > 0 ? "snapshot_available" : "sample_fallback",
    lastUpdated: osmSnapshot?.generatedAt ?? sourceById.get("osm-geofabrik-baseline")?.lastUpdated ?? null,
    featureCount: resolvedOsmCount,
    recordCount: resolvedOsmCount,
    availableFiles: [
      normalizedExternalFileExists(osmSnapshotPath) ? osmSnapshotPath : null,
      normalizedExternalFileExists(osmLegacyPath) ? osmLegacyPath : null
    ].filter((file): file is string => Boolean(file)),
    coverageArea: "Dubai open geospatial baseline",
    confidence: resolvedOsmCount > 0 ? "medium" : "low",
    caveat: resolvedOsmCount > 0
      ? `OSM / Geofabrik snapshot context available. ${externalDataCaveat}`
      : `OSM / Geofabrik snapshot missing; sample fallback remains active. ${externalDataCaveat}`,
    usedInAnalysis: resolvedOsmCount > 0
  });

  update("open-meteo-climate", {
    status: "connected",
    coverageArea: "Coordinate-level open climate API context",
    confidence: "medium",
    caveat: `Screening-level heat/rainfall proxy only. ${externalDataCaveat}`
  });

  return {
    ...manifest,
    version: "1.4",
    sources: externalDataSources.map((source) => {
      const existing = sourceById.get(source.id);
      return {
        id: source.id,
        status: existing?.status ?? source.status,
        lastUpdated: existing?.lastUpdated ?? source.lastUpdated ?? null,
        availableFiles: existing?.availableFiles ?? [],
        rowCount: existing?.rowCount,
        featureCount: existing?.featureCount,
        recordCount: existing?.recordCount ?? existing?.rowCount ?? existing?.featureCount,
        coverageArea: existing?.coverageArea ?? source.geography,
        confidence: existing?.confidence ?? source.confidence,
        caveat: existing?.caveat ?? source.disclaimer,
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
      dataMode: readiness?.status ?? source.accessMode,
      usedIn,
      confidence: source.confidence,
      limitation: readiness?.caveat ?? source.limitations[0] ?? source.disclaimer,
      validationRequired: !source.officialClaimAllowed
    };
  });
}
