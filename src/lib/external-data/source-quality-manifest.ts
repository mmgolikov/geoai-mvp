import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { externalDataCaveat } from "@/src/lib/external-data/source-registry";
import { normalizeSourceDataMode, type SourceDataMode } from "@/src/lib/external-data/source-modes";
import { normalizeSourceStatus, sourceStatusPriority, type SourceStatus } from "@/src/lib/external-data/source-status";

export type SourceQualityValidationStatus =
  | "sample-only"
  | "snapshot-not-live"
  | "manual-import-ready"
  | "api-context"
  | "token-or-permission-required"
  | "planned-validation";

export type SnapshotQualityItem = {
  sourceGroupId: string;
  sourceGroupName: string;
  sourceId: string;
  sourceName: string;
  filePath: string | null;
  inputFile: string | null;
  availableFiles: string[];
  recordCount: number | null;
  featureCount: number | null;
  generatedAt: string | null;
  extractedAt: string | null;
  licenseNote: string;
  dataMode: SourceDataMode;
  status: SourceStatus;
  confidence: "medium" | "low" | "requires-validation";
  validationStatus: SourceQualityValidationStatus;
  caveat: string;
  nextValidationStep: string;
  qualityNotes: string[];
};

export type SourceQualityGroup = {
  sourceGroupId: string;
  sourceGroupName: string;
  status: SourceStatus;
  dataMode: SourceDataMode;
  recordCount: number | null;
  featureCount: number | null;
  generatedAt: string | null;
  extractedAt: string | null;
  licenseNote: string;
  confidence: "medium" | "low" | "requires-validation";
  validationStatus: SourceQualityValidationStatus;
  caveat: string;
  nextValidationStep: string;
  snapshots: SnapshotQualityItem[];
};

export type SourceQualityManifest = {
  version: "1.3";
  generatedAt: string;
  mode: "local_normalized_snapshot_quality";
  source: "normalized_local_files";
  caveat: string;
  groups: SourceQualityGroup[];
};

type DldQualityFile = {
  generatedAt?: string;
  totalRecords?: number;
  categories?: Record<string, {
    sourceId?: string;
    status?: string;
    inputFile?: string;
    outputFile?: string;
    recordCount?: number;
    qualityNotes?: string[];
  }>;
};

type OsmQualityFile = {
  generatedAt?: string;
  status?: string;
  inputFile?: string;
  totalFeatures?: number;
  categories?: Record<string, {
    sourceId?: string;
    outputFile?: string;
    featureCount?: number;
  }>;
};

type OvertureQualityFile = {
  generatedAt?: string;
  status?: string;
  totalFeatures?: number;
};

type CopernicusSampleFile = {
  generatedAt?: string;
  status?: string;
  collections?: Array<{ sceneCount?: number; latestSceneDate?: string }>;
  limitation?: string;
};

const dldGroupId = "dld-dubai-pulse-public-real-estate";
const osmGroupId = "osm-geofabrik-open-geospatial";
const overtureGroupId = "overture-maps-open-context";
const climateGroupId = "open-meteo-nasa-power-context";
const copernicusGroupId = "copernicus-sentinel-metadata";

const groupNames: Record<string, string> = {
  [dldGroupId]: "DLD / Dubai Pulse public real estate snapshots",
  [osmGroupId]: "OSM / Geofabrik open geospatial baseline",
  [overtureGroupId]: "Overture Maps buildings / places / transportation",
  [climateGroupId]: "Open-Meteo + NASA POWER climate / energy context",
  [copernicusGroupId]: "Copernicus / Sentinel metadata availability"
};

const nextValidationSteps: Record<string, string> = {
  [dldGroupId]: "Confirm permitted DLD / Dubai Pulse files, extraction date, license terms and official/client validation source.",
  [osmGroupId]: "Confirm extract date, ODbL attribution and compare against official/customer GIS before decisions.",
  [overtureGroupId]: "Confirm Overture extract scope/license and reconcile buildings, places and transport against client/official evidence.",
  [climateGroupId]: "Validate climate and energy assumptions with engineering/client-approved evidence before operational decisions.",
  [copernicusGroupId]: "Add approved token/query pipeline and verify metadata/imagery lineage before analytics."
};

const licenseNotes: Record<string, string> = {
  [dldGroupId]: "DLD / Dubai Pulse public/open snapshot terms, attribution and redistribution limits must be confirmed per file before external use.",
  [osmGroupId]: "OSM / Geofabrik open geospatial context requires ODbL attribution, extract date tracking and compliance review.",
  [overtureGroupId]: "Overture Maps public snapshot use requires Overture license and attribution review.",
  [climateGroupId]: "Open-Meteo and NASA POWER API context requires source attribution and screening-level assumptions review.",
  [copernicusGroupId]: "Copernicus / Sentinel metadata and imagery use requires mission/product terms review and token/query lineage before analytics."
};

const dldSourceNames: Record<string, string> = {
  transactions: "DLD / Dubai Pulse public transactions snapshot",
  rents: "DLD / Dubai Pulse public rents snapshot",
  projects: "DLD / Dubai Pulse public projects snapshot",
  valuations: "DLD / Dubai Pulse public valuations snapshot",
  land: "DLD / Dubai Pulse public land snapshot",
  building: "DLD / Dubai Pulse public building snapshot",
  unit: "DLD / Dubai Pulse public unit snapshot",
  brokers: "DLD / Dubai Pulse public brokers snapshot",
  developers: "DLD / Dubai Pulse public developers snapshot"
};

const osmSourceIds: Record<string, string> = {
  roads: "osm-geofabrik-open-roads",
  buildings: "osm-geofabrik-open-buildings",
  pois: "osm-geofabrik-open-pois",
  landuse: "osm-geofabrik-baseline",
  transport: "osm-geofabrik-open-roads"
};

const osmSourceNames: Record<string, string> = {
  roads: "OSM / Geofabrik open roads snapshot",
  buildings: "OSM / Geofabrik open buildings snapshot",
  pois: "OSM / Geofabrik open POI snapshot",
  landuse: "OSM / Geofabrik open landuse snapshot",
  transport: "OSM / Geofabrik open transport snapshot"
};

const overtureSnapshots = [
  ["buildings", "overture-maps-open-buildings", "Overture Maps open buildings snapshot", "data/normalized/overture_buildings_snapshot.json"],
  ["places", "overture-maps-open-places", "Overture Maps open places snapshot", "data/normalized/overture_places_snapshot.json"],
  ["transportation", "overture-maps-open-transportation", "Overture Maps open transportation snapshot", "data/normalized/overture_transportation_snapshot.json"]
] as const;

function readJsonFile<T>(relativePath: string): T | null {
  const path = join(process.cwd(), relativePath);
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractDateFromPath(path: string | null | undefined) {
  const match = String(path ?? "").match(/(?:^|_)(\d{4})(\d{2})(\d{2})(?:\.|_|$)/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function confidenceFor(status: SourceStatus, hasRecords: boolean): SnapshotQualityItem["confidence"] {
  if (status === "snapshot_available") return "medium";
  if (status === "connected") return "medium";
  if (status === "sample_fallback" && hasRecords) return "low";
  return "requires-validation";
}

function validationStatusFor(status: SourceStatus): SourceQualityValidationStatus {
  if (status === "snapshot_available") return "snapshot-not-live";
  if (status === "sample_fallback") return "sample-only";
  if (status === "manual_import_ready") return "manual-import-ready";
  if (status === "connected") return "api-context";
  if (status === "permission_required" || status === "token_required") return "token-or-permission-required";
  return "planned-validation";
}

function dataModeFor(status: SourceStatus) {
  return normalizeSourceDataMode(status);
}

function newestDate(values: Array<string | null | undefined>) {
  const dates = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates)).toISOString();
}

function bestStatus(statuses: SourceStatus[], fallback: SourceStatus) {
  if (statuses.length === 0) return fallback;
  return [...statuses].sort((a, b) => sourceStatusPriority(a) - sourceStatusPriority(b))[0];
}

function compactFiles(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function groupFromSnapshots(
  sourceGroupId: string,
  snapshots: SnapshotQualityItem[],
  fallbackStatus: SourceStatus
): SourceQualityGroup {
  const status = bestStatus(snapshots.map((snapshot) => snapshot.status), fallbackStatus);
  const recordCounts = snapshots.map((snapshot) => snapshot.recordCount).filter((value): value is number => typeof value === "number");
  const featureCounts = snapshots.map((snapshot) => snapshot.featureCount).filter((value): value is number => typeof value === "number");
  const totalRecords = recordCounts.length > 0 ? recordCounts.reduce((sum, value) => sum + value, 0) : null;
  const totalFeatures = featureCounts.length > 0 ? featureCounts.reduce((sum, value) => sum + value, 0) : null;
  const hasRows = Boolean((totalRecords ?? 0) > 0 || (totalFeatures ?? 0) > 0);

  return {
    sourceGroupId,
    sourceGroupName: groupNames[sourceGroupId],
    status,
    dataMode: dataModeFor(status),
    recordCount: totalRecords,
    featureCount: totalFeatures,
    generatedAt: newestDate(snapshots.map((snapshot) => snapshot.generatedAt)),
    extractedAt: newestDate(snapshots.map((snapshot) => snapshot.extractedAt)),
    licenseNote: licenseNotes[sourceGroupId],
    confidence: confidenceFor(status, hasRows),
    validationStatus: validationStatusFor(status),
    caveat: externalDataCaveat,
    nextValidationStep: nextValidationSteps[sourceGroupId],
    snapshots
  };
}

function buildDldGroup(): SourceQualityGroup {
  const quality = readJsonFile<DldQualityFile>("data/normalized/dld_source_quality.json");
  const entries = Object.entries(quality?.categories ?? {});
  const snapshots = entries.map(([category, item]) => {
    const status = normalizeSourceStatus(item.status ?? "manual_import_ready");
    const recordCount = numberOrNull(item.recordCount);
    const hasRows = Boolean(recordCount && recordCount > 0);

    return {
      sourceGroupId: dldGroupId,
      sourceGroupName: groupNames[dldGroupId],
      sourceId: item.sourceId ?? `dld-dubai-pulse-public-${category}`,
      sourceName: dldSourceNames[category] ?? `DLD / Dubai Pulse public ${category} snapshot`,
      filePath: item.outputFile ?? null,
      inputFile: item.inputFile ?? null,
      availableFiles: compactFiles([item.inputFile, item.outputFile]),
      recordCount,
      featureCount: null,
      generatedAt: quality?.generatedAt ?? null,
      extractedAt: extractDateFromPath(item.inputFile),
      licenseNote: licenseNotes[dldGroupId],
      dataMode: dataModeFor(status),
      status,
      confidence: confidenceFor(status, hasRows),
      validationStatus: validationStatusFor(status),
      caveat: externalDataCaveat,
      nextValidationStep: nextValidationSteps[dldGroupId],
      qualityNotes: Array.isArray(item.qualityNotes) ? item.qualityNotes : []
    };
  });

  return groupFromSnapshots(dldGroupId, snapshots, "manual_import_ready");
}

function buildOsmGroup(): SourceQualityGroup {
  const quality = readJsonFile<OsmQualityFile>("data/normalized/osm_source_quality.json");
  const entries = Object.entries(quality?.categories ?? {});
  const snapshots = entries.map(([category, item]) => {
    const status = normalizeSourceStatus(quality?.status ?? "manual_import_ready");
    const featureCount = numberOrNull(item.featureCount);
    const hasRows = Boolean(featureCount && featureCount > 0);

    return {
      sourceGroupId: osmGroupId,
      sourceGroupName: groupNames[osmGroupId],
      sourceId: item.sourceId ?? osmSourceIds[category] ?? "osm-geofabrik-baseline",
      sourceName: osmSourceNames[category] ?? `OSM / Geofabrik open ${category} snapshot`,
      filePath: item.outputFile ?? null,
      inputFile: quality?.inputFile ?? null,
      availableFiles: compactFiles([quality?.inputFile, item.outputFile]),
      recordCount: featureCount,
      featureCount,
      generatedAt: quality?.generatedAt ?? null,
      extractedAt: extractDateFromPath(quality?.inputFile),
      licenseNote: licenseNotes[osmGroupId],
      dataMode: dataModeFor(status),
      status,
      confidence: confidenceFor(status, hasRows),
      validationStatus: validationStatusFor(status),
      caveat: externalDataCaveat,
      nextValidationStep: nextValidationSteps[osmGroupId],
      qualityNotes: []
    };
  });

  return groupFromSnapshots(osmGroupId, snapshots, normalizeSourceStatus(quality?.status ?? "manual_import_ready"));
}

function buildOvertureGroup(): SourceQualityGroup {
  const quality = readJsonFile<OvertureQualityFile>("data/normalized/overture_source_quality.json");
  const status = normalizeSourceStatus(quality?.status ?? "manual_import_ready");
  const snapshots = overtureSnapshots.map((snapshot) => {
    const [, sourceId, sourceName, filePath] = snapshot;
    const file = readJsonFile<{ generatedAt?: string; featureCount?: number; status?: string }>(filePath);
    const itemStatus = normalizeSourceStatus(file?.status ?? status);
    const featureCount = numberOrNull(file?.featureCount);
    const hasRows = Boolean(featureCount && featureCount > 0);

    return {
      sourceGroupId: overtureGroupId,
      sourceGroupName: groupNames[overtureGroupId],
      sourceId,
      sourceName,
      filePath,
      inputFile: null,
      availableFiles: compactFiles([filePath]),
      recordCount: featureCount,
      featureCount,
      generatedAt: file?.generatedAt ?? quality?.generatedAt ?? null,
      extractedAt: null,
      licenseNote: licenseNotes[overtureGroupId],
      dataMode: dataModeFor(itemStatus),
      status: itemStatus,
      confidence: confidenceFor(itemStatus, hasRows),
      validationStatus: validationStatusFor(itemStatus),
      caveat: externalDataCaveat,
      nextValidationStep: nextValidationSteps[overtureGroupId],
      qualityNotes: []
    };
  });

  return groupFromSnapshots(overtureGroupId, snapshots, status);
}

function buildClimateGroup(): SourceQualityGroup {
  const status: SourceStatus = "connected";
  const snapshot: SnapshotQualityItem = {
    sourceGroupId: climateGroupId,
    sourceGroupName: groupNames[climateGroupId],
    sourceId: "open-meteo-nasa-power-context",
    sourceName: "Open-Meteo + NASA POWER climate / energy context",
    filePath: null,
    inputFile: null,
    availableFiles: [],
    recordCount: null,
    featureCount: null,
    generatedAt: null,
    extractedAt: null,
    licenseNote: licenseNotes[climateGroupId],
    dataMode: "api_context",
    status,
    confidence: "medium",
    validationStatus: "api-context",
    caveat: externalDataCaveat,
    nextValidationStep: nextValidationSteps[climateGroupId],
    qualityNotes: ["API context route only; no engineering-grade climate or energy conclusion is provided."]
  };

  return groupFromSnapshots(climateGroupId, [snapshot], status);
}

function buildCopernicusGroup(): SourceQualityGroup {
  const filePath = "data/external/samples/copernicus_sentinel_metadata_sample.json";
  const metadata = readJsonFile<CopernicusSampleFile>(filePath);
  const status = normalizeSourceStatus(metadata?.status ?? "token_required");
  const sceneCount = Array.isArray(metadata?.collections)
    ? metadata.collections.reduce((sum, item) => sum + (typeof item.sceneCount === "number" ? item.sceneCount : 0), 0)
    : null;
  const latestSceneDate = newestDate(metadata?.collections?.map((item) => item.latestSceneDate) ?? []);
  const snapshot: SnapshotQualityItem = {
    sourceGroupId: copernicusGroupId,
    sourceGroupName: groupNames[copernicusGroupId],
    sourceId: "copernicus-sentinel-metadata",
    sourceName: "Copernicus / Sentinel metadata availability",
    filePath: metadata ? filePath : null,
    inputFile: null,
    availableFiles: metadata ? [filePath] : [],
    recordCount: sceneCount,
    featureCount: null,
    generatedAt: metadata?.generatedAt ?? null,
    extractedAt: latestSceneDate,
    licenseNote: licenseNotes[copernicusGroupId],
    dataMode: dataModeFor(status),
    status,
    confidence: confidenceFor(status, Boolean(sceneCount && sceneCount > 0)),
    validationStatus: validationStatusFor(status),
    caveat: externalDataCaveat,
    nextValidationStep: nextValidationSteps[copernicusGroupId],
    qualityNotes: [metadata?.limitation ?? "Metadata availability only; no imagery download or raster analytics connected."]
  };

  return groupFromSnapshots(copernicusGroupId, [snapshot], status);
}

export function buildSourceQualityManifest(): SourceQualityManifest {
  const generatedAt = new Date().toISOString();

  return {
    version: "1.3",
    generatedAt,
    mode: "local_normalized_snapshot_quality",
    source: "normalized_local_files",
    caveat: externalDataCaveat,
    groups: [
      buildDldGroup(),
      buildOsmGroup(),
      buildOvertureGroup(),
      buildClimateGroup(),
      buildCopernicusGroup()
    ]
  };
}
