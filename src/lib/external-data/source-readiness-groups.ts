import type { ExternalDataManifest, ExternalDataManifestSource } from "@/src/lib/external-data/data-manifest";
import { externalDataCaveat } from "@/src/lib/external-data/source-registry";
import { normalizeSourceDataMode, type SourceDataMode } from "@/src/lib/external-data/source-modes";
import {
  normalizeSourceStatus,
  sourceStatusPriority,
  type SourceStatus
} from "@/src/lib/external-data/source-status";

export type SourceReadinessGroup = {
  id: string;
  name: string;
  category: string;
  sourceIds: string[];
  status: SourceStatus;
  dataMode: SourceDataMode;
  recordCount: number | null;
  confidence: "medium" | "low" | "requires-validation";
  coverageArea: string;
  availableFiles: string[];
  lastUpdated: string | null;
  caveat: string;
  nextValidationStep: string;
  validationRequired: true;
};

type SourceGroupDefinition = {
  id: string;
  name: string;
  category: string;
  sourceIds: string[];
  aliases?: string[];
  coverageArea: string;
  fallbackStatus: SourceStatus;
  fallbackDataMode: SourceDataMode;
  fallbackConfidence: SourceReadinessGroup["confidence"];
  nextValidationStep: string;
};

export const sourceGroupDefinitions: SourceGroupDefinition[] = [
  {
    id: "dld-dubai-pulse-public-real-estate",
    name: "DLD / Dubai Pulse public real estate snapshots",
    category: "real-estate",
    sourceIds: [
      "dld-dubai-pulse-transactions",
      "dld-dubai-pulse-public-transactions",
      "dld-dubai-pulse-public-rents",
      "dld-dubai-pulse-public-projects",
      "dld-dubai-pulse-public-valuations",
      "dld-dubai-pulse-public-land",
      "dld-dubai-pulse-public-building",
      "dld-dubai-pulse-public-unit",
      "dld-dubai-pulse-public-brokers",
      "dld-dubai-pulse-public-developers"
    ],
    aliases: ["dld-dubai-pulse-snapshot", "dld-dubai-pulse-public-snapshots"],
    coverageArea: "Dubai public real-estate snapshot context",
    fallbackStatus: "sample_fallback",
    fallbackDataMode: "sample_fallback",
    fallbackConfidence: "requires-validation",
    nextValidationStep: "Confirm permitted DLD / Dubai Pulse files, extraction date, license terms and official/client validation source."
  },
  {
    id: "osm-geofabrik-open-geospatial",
    name: "OSM / Geofabrik open geospatial baseline",
    category: "open-geospatial",
    sourceIds: [
      "osm-geofabrik-baseline",
      "osm-geofabrik-open-roads",
      "osm-geofabrik-open-pois",
      "osm-geofabrik-open-buildings"
    ],
    aliases: ["osm-geofabrik-open-snapshot"],
    coverageArea: "Dubai / UAE open roads, POI, buildings and landuse context",
    fallbackStatus: "sample_fallback",
    fallbackDataMode: "sample_fallback",
    fallbackConfidence: "low",
    nextValidationStep: "Confirm extract date, ODbL attribution and compare against official/customer GIS before decisions."
  },
  {
    id: "overture-maps-open-context",
    name: "Overture Maps buildings / places / transportation",
    category: "open-geospatial",
    sourceIds: [
      "overture-maps-open-buildings",
      "overture-maps-open-places",
      "overture-maps-open-transportation"
    ],
    aliases: ["overture-maps-open-snapshots"],
    coverageArea: "Dubai Overture buildings, places and transportation context",
    fallbackStatus: "manual_import_ready",
    fallbackDataMode: "manual_import_ready",
    fallbackConfidence: "low",
    nextValidationStep: "Confirm Overture extract scope/license and reconcile buildings, places and transport against client/official evidence."
  },
  {
    id: "open-meteo-nasa-power-context",
    name: "Open-Meteo + NASA POWER climate / energy context",
    category: "climate-energy",
    sourceIds: ["open-meteo-climate", "nasa-power-solar-energy"],
    coverageArea: "Coordinate-level climate, heat and solar proxy context",
    fallbackStatus: "permission_required",
    fallbackDataMode: "permission_required",
    fallbackConfidence: "requires-validation",
    nextValidationStep: "Approve Open-Meteo commercial-use rights separately; verify NASA POWER runtime receipts and assumptions before operational decisions."
  },
  {
    id: "copernicus-sentinel-metadata",
    name: "Copernicus / Sentinel metadata availability",
    category: "satellite-metadata",
    sourceIds: ["copernicus-sentinel-metadata", "copernicus-sentinel-catalog"],
    coverageArea: "Dubai satellite metadata availability",
    fallbackStatus: "sample_fallback",
    fallbackDataMode: "sample_fallback",
    fallbackConfidence: "requires-validation",
    nextValidationStep: "Add approved token/query pipeline and verify metadata/imagery lineage before analytics."
  }
];

function sourceCount(source: ExternalDataManifestSource) {
  return source.recordCount ?? source.rowCount ?? source.featureCount ?? null;
}

function newestDate(values: Array<string | null | undefined>) {
  const dates = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates)).toISOString();
}

function confidenceFor(status: SourceStatus, hasRecords: boolean, fallback: SourceReadinessGroup["confidence"]) {
  if (status === "connected" || status === "snapshot_available") return "medium";
  if (status === "sample_fallback" && hasRecords) return "low";
  return fallback;
}

export function buildSourceReadinessGroups(manifest: ExternalDataManifest): SourceReadinessGroup[] {
  const sources = manifest.sources ?? [];

  return sourceGroupDefinitions.map((definition) => {
    const ids = new Set([...definition.sourceIds, ...(definition.aliases ?? [])]);
    const matches = sources.filter((source) => ids.has(source.id));
    const qualityGroup = manifest.sourceQuality?.groups.find((group) => group.sourceGroupId === definition.id);
    const statuses = matches.map((source) => normalizeSourceStatus(source.status));
    const status = qualityGroup
      ? normalizeSourceStatus(qualityGroup.status)
      : statuses.length > 0
        ? statuses.sort((a, b) => sourceStatusPriority(a) - sourceStatusPriority(b))[0]
        : definition.fallbackStatus;
    const counts = matches.map(sourceCount).filter((count): count is number => typeof count === "number");
    const qualityCount = qualityGroup?.recordCount ?? qualityGroup?.featureCount;
    const recordCount = typeof qualityCount === "number" && Number.isFinite(qualityCount)
      ? qualityCount
      : counts.length > 0
        ? Math.max(...counts)
        : null;
    const resolvedDataMode = normalizeSourceDataMode(
      qualityGroup?.dataMode ?? matches.find((source) => source.sourceMode)?.sourceMode ?? status ?? definition.fallbackDataMode
    );
    const dataMode = definition.fallbackDataMode === "api_context" && status === "connected"
      ? "api_context"
      : status === "sample_fallback" && resolvedDataMode === "demo_seed"
        ? "sample_fallback"
        : resolvedDataMode;
    const availableFiles = Array.from(new Set(matches.flatMap((source) => source.availableFiles ?? [])));
    const caveat = externalDataCaveat;

    return {
      id: definition.id,
      name: definition.name,
      category: definition.category,
      sourceIds: [...definition.sourceIds, ...(definition.aliases ?? [])],
      status,
      dataMode,
      recordCount,
      confidence: qualityGroup?.confidence ?? confidenceFor(status, Boolean(recordCount && recordCount > 0), definition.fallbackConfidence),
      coverageArea: matches.find((source) => source.coverageArea)?.coverageArea ?? definition.coverageArea,
      availableFiles,
      lastUpdated: newestDate(matches.map((source) => source.lastUpdated)),
      caveat,
      nextValidationStep: definition.nextValidationStep,
      validationRequired: true
    };
  });
}

export function sourceReadinessSummary(groups: SourceReadinessGroup[]) {
  return {
    totalGroups: groups.length,
    snapshotGroups: groups.filter((group) => group.status === "snapshot_available").length,
    apiContextGroups: groups.filter((group) => group.status === "connected").length,
    fallbackGroups: groups.filter((group) => group.status === "sample_fallback").length,
    manualImportGroups: groups.filter((group) => group.status === "manual_import_ready").length,
    validationRequired: true,
    caveat: externalDataCaveat
  };
}
