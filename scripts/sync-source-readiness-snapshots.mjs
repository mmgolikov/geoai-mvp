#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const dryRun = process.argv.includes("--dry-run");
const writeRequested = process.argv.includes("--write");
const strict = process.argv.includes("--strict") || process.env.GEOAI_SOURCE_READINESS_SYNC_STRICT?.trim().toLowerCase() === "true";
const generatedAt = new Date().toISOString();

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return {
      __error: error instanceof Error ? error.message : "Invalid JSON"
    };
  }
}

function normalizeStatus(value, fallback = "manual_import_ready") {
  const key = String(value ?? fallback).trim().toLowerCase().replace(/-/g, "_");
  if (["connected", "snapshot_available", "sample_fallback", "manual_import_ready", "token_required", "permission_required", "planned", "unavailable"].includes(key)) {
    return key;
  }
  if (key === "connected_context_ready") return "connected";
  if (key === "planned_validation") return "planned";
  return fallback;
}

function modeFromStatus(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "connected") return "api_context";
  if (normalized === "snapshot_available") return "imported_snapshot";
  if (normalized === "sample_fallback") return "sample_fallback";
  if (normalized === "manual_import_ready") return "manual_import_ready";
  if (normalized === "permission_required" || normalized === "token_required") return "permission_required";
  return "planned_validation";
}

function bestStatus(values, fallback) {
  const priority = {
    connected: 10,
    snapshot_available: 20,
    sample_fallback: 30,
    manual_import_ready: 40,
    token_required: 50,
    permission_required: 60,
    planned: 70,
    unavailable: 80
  };
  const statuses = values.map((value) => normalizeStatus(value, fallback));
  if (statuses.length === 0) return fallback;
  return statuses.sort((a, b) => priority[a] - priority[b])[0];
}

function unique(values) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0)));
}

function countCollections(collections) {
  if (!Array.isArray(collections)) return null;
  return collections.reduce((total, item) => total + (typeof item.sceneCount === "number" ? item.sceneCount : 0), 0);
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractDateFromPath(path) {
  const match = String(path ?? "").match(/(?:^|_)(\d{4})(\d{2})(\d{2})(?:\.|_|$)/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function validationStatusFor(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "snapshot_available") return "snapshot-not-live";
  if (normalized === "sample_fallback") return "sample-only";
  if (normalized === "manual_import_ready") return "manual-import-ready";
  if (normalized === "connected") return "api-context";
  if (normalized === "permission_required" || normalized === "token_required") return "token-or-permission-required";
  return "planned-validation";
}

function confidenceFor(status, hasRecords, fallback) {
  const normalized = normalizeStatus(status);
  if (normalized === "snapshot_available" || normalized === "connected") return "medium";
  if (normalized === "sample_fallback" && hasRecords) return "low";
  return fallback;
}

function newestDate(values) {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates)).toISOString();
}

function sourceQualityGroup({ sourceGroupId, sourceGroupName, status, dataMode, recordCount, featureCount, generatedAt: groupGeneratedAt, extractedAt, licenseNote, confidence, validationStatus, nextValidationStep, snapshots }) {
  return {
    sourceGroupId,
    sourceGroupName,
    status: normalizeStatus(status),
    dataMode,
    recordCount,
    featureCount,
    generatedAt: groupGeneratedAt,
    extractedAt,
    licenseNote,
    confidence,
    validationStatus,
    caveat,
    nextValidationStep,
    snapshots
  };
}

const manifest = readJson("data/external/normalized/external_data_manifest.json", { sources: [] });
const dldQuality = readJson("data/normalized/dld_source_quality.json", { categories: {}, totalRecords: null });
const osmQuality = readJson("data/normalized/osm_source_quality.json", { totalFeatures: null });
const overtureQuality = readJson("data/normalized/overture_source_quality.json", { totalFeatures: null });
const copernicusMetadata = readJson("data/external/samples/copernicus_sentinel_metadata_sample.json", { collections: [] });
const manifestSources = Array.isArray(manifest.sources) ? manifest.sources : [];
const byId = new Map(manifestSources.map((source) => [source.id, source]));

function sourceFiles(ids) {
  return unique(ids.flatMap((id) => byId.get(id)?.availableFiles ?? []));
}

function sourceStatuses(ids, fallback) {
  return ids.map((id) => byId.get(id)?.status).filter(Boolean).concat(fallback);
}

const dldNextValidationStep = "Confirm permitted DLD / Dubai Pulse files, extraction date, license terms and official/client validation source.";
const osmNextValidationStep = "Confirm extract date, ODbL attribution and compare against official/customer GIS before decisions.";
const overtureNextValidationStep = "Confirm Overture extract scope/license and reconcile buildings, places and transport against client/official evidence.";
const climateNextValidationStep = "Validate climate and energy assumptions with engineering/client-approved evidence before operational decisions.";
const copernicusNextValidationStep = "Add approved token/query pipeline and verify metadata/imagery lineage before analytics.";

const dldQualitySnapshots = Object.entries(dldQuality.categories ?? {}).map(([category, item]) => {
  const status = normalizeStatus(item.status, "manual_import_ready");
  const recordCount = numberOrNull(item.recordCount);
  return {
    sourceGroupId: "dld-dubai-pulse-public-real-estate",
    sourceGroupName: "DLD / Dubai Pulse public real estate snapshots",
    sourceId: item.sourceId ?? `dld-dubai-pulse-public-${category}`,
    sourceName: `DLD / Dubai Pulse public ${category} snapshot`,
    filePath: item.outputFile ?? null,
    inputFile: item.inputFile ?? null,
    availableFiles: unique([item.inputFile, item.outputFile]),
    recordCount,
    featureCount: null,
    generatedAt: dldQuality.generatedAt ?? null,
    extractedAt: extractDateFromPath(item.inputFile),
    licenseNote: "DLD / Dubai Pulse public/open snapshot terms, attribution and redistribution limits must be confirmed per file before external use.",
    dataMode: modeFromStatus(status),
    status,
    confidence: confidenceFor(status, Boolean(recordCount && recordCount > 0), "requires-validation"),
    validationStatus: validationStatusFor(status),
    caveat,
    nextValidationStep: dldNextValidationStep,
    qualityNotes: Array.isArray(item.qualityNotes) ? item.qualityNotes : []
  };
});
const dldRecordCount = dldQualitySnapshots.reduce((sum, item) => sum + (item.recordCount ?? 0), 0);
const dldStatus = bestStatus(dldQualitySnapshots.map((item) => item.status), "sample_fallback");

const osmSourceIds = {
  roads: "osm-geofabrik-open-roads",
  buildings: "osm-geofabrik-open-buildings",
  pois: "osm-geofabrik-open-pois",
  landuse: "osm-geofabrik-baseline",
  transport: "osm-geofabrik-open-roads"
};
const osmQualitySnapshots = Object.entries(osmQuality.categories ?? {}).map(([category, item]) => {
  const status = normalizeStatus(osmQuality.status, "manual_import_ready");
  const featureCount = numberOrNull(item.featureCount);
  return {
    sourceGroupId: "osm-geofabrik-open-geospatial",
    sourceGroupName: "OSM / Geofabrik open geospatial baseline",
    sourceId: item.sourceId ?? osmSourceIds[category] ?? "osm-geofabrik-baseline",
    sourceName: `OSM / Geofabrik open ${category} snapshot`,
    filePath: item.outputFile ?? null,
    inputFile: osmQuality.inputFile ?? null,
    availableFiles: unique([osmQuality.inputFile, item.outputFile]),
    recordCount: featureCount,
    featureCount,
    generatedAt: osmQuality.generatedAt ?? null,
    extractedAt: extractDateFromPath(osmQuality.inputFile),
    licenseNote: "OSM / Geofabrik open geospatial context requires ODbL attribution, extract date tracking and compliance review.",
    dataMode: modeFromStatus(status),
    status,
    confidence: confidenceFor(status, Boolean(featureCount && featureCount > 0), "low"),
    validationStatus: validationStatusFor(status),
    caveat,
    nextValidationStep: osmNextValidationStep,
    qualityNotes: []
  };
});
const osmFeatureCount = osmQualitySnapshots.reduce((sum, item) => sum + (item.featureCount ?? 0), 0);
const osmStatus = bestStatus(osmQualitySnapshots.map((item) => item.status), "sample_fallback");

const overtureSnapshots = [
  ["buildings", "overture-maps-open-buildings", "data/normalized/overture_buildings_snapshot.json"],
  ["places", "overture-maps-open-places", "data/normalized/overture_places_snapshot.json"],
  ["transportation", "overture-maps-open-transportation", "data/normalized/overture_transportation_snapshot.json"]
].map(([category, sourceId, filePath]) => {
  const snapshot = readJson(filePath, {});
  const status = normalizeStatus(snapshot.status ?? overtureQuality.status, "manual_import_ready");
  const featureCount = numberOrNull(snapshot.featureCount);
  return {
    sourceGroupId: "overture-maps-open-context",
    sourceGroupName: "Overture Maps buildings / places / transportation",
    sourceId,
    sourceName: `Overture Maps open ${category} snapshot`,
    filePath,
    inputFile: null,
    availableFiles: [filePath],
    recordCount: featureCount,
    featureCount,
    generatedAt: snapshot.generatedAt ?? overtureQuality.generatedAt ?? null,
    extractedAt: null,
    licenseNote: "Overture Maps public snapshot use requires Overture license and attribution review.",
    dataMode: modeFromStatus(status),
    status,
    confidence: confidenceFor(status, Boolean(featureCount && featureCount > 0), "low"),
    validationStatus: validationStatusFor(status),
    caveat,
    nextValidationStep: overtureNextValidationStep,
    qualityNotes: []
  };
});
const overtureFeatureCount = overtureSnapshots.reduce((sum, item) => sum + (item.featureCount ?? 0), 0);
const overtureStatus = bestStatus(overtureSnapshots.map((item) => item.status), normalizeStatus(overtureQuality.status, "manual_import_ready"));

const copernicusSceneCount = countCollections(copernicusMetadata.collections);
const copernicusStatus = normalizeStatus(copernicusMetadata.status, "sample_fallback");
const copernicusSnapshots = [{
  sourceGroupId: "copernicus-sentinel-metadata",
  sourceGroupName: "Copernicus / Sentinel metadata availability",
  sourceId: "copernicus-sentinel-metadata",
  sourceName: "Copernicus / Sentinel metadata availability",
  filePath: "data/external/samples/copernicus_sentinel_metadata_sample.json",
  inputFile: null,
  availableFiles: ["data/external/samples/copernicus_sentinel_metadata_sample.json"],
  recordCount: copernicusSceneCount,
  featureCount: null,
  generatedAt: copernicusMetadata.generatedAt ?? null,
  extractedAt: newestDate((copernicusMetadata.collections ?? []).map((item) => item.latestSceneDate)),
  licenseNote: "Copernicus / Sentinel metadata and imagery use requires mission/product terms review and token/query lineage before analytics.",
  dataMode: modeFromStatus(copernicusStatus),
  status: copernicusStatus,
  confidence: confidenceFor(copernicusStatus, Boolean(copernicusSceneCount && copernicusSceneCount > 0), "requires-validation"),
  validationStatus: validationStatusFor(copernicusStatus),
  caveat,
  nextValidationStep: copernicusNextValidationStep,
  qualityNotes: [copernicusMetadata.limitation ?? "Metadata availability only; no imagery download or raster analytics connected."]
}];

const sourceQualityManifest = {
  version: "1.3",
  generatedAt,
  mode: "local_normalized_snapshot_quality",
  source: "normalized_local_files",
  caveat,
  groups: [
    sourceQualityGroup({
      sourceGroupId: "dld-dubai-pulse-public-real-estate",
      sourceGroupName: "DLD / Dubai Pulse public real estate snapshots",
      status: dldStatus,
      dataMode: modeFromStatus(dldStatus),
      recordCount: dldRecordCount,
      featureCount: null,
      generatedAt: newestDate(dldQualitySnapshots.map((item) => item.generatedAt)),
      extractedAt: newestDate(dldQualitySnapshots.map((item) => item.extractedAt)),
      licenseNote: "DLD / Dubai Pulse public/open snapshot terms, attribution and redistribution limits must be confirmed per file before external use.",
      confidence: confidenceFor(dldStatus, dldRecordCount > 0, "requires-validation"),
      validationStatus: validationStatusFor(dldStatus),
      nextValidationStep: dldNextValidationStep,
      snapshots: dldQualitySnapshots
    }),
    sourceQualityGroup({
      sourceGroupId: "osm-geofabrik-open-geospatial",
      sourceGroupName: "OSM / Geofabrik open geospatial baseline",
      status: osmStatus,
      dataMode: modeFromStatus(osmStatus),
      recordCount: osmFeatureCount,
      featureCount: osmFeatureCount,
      generatedAt: newestDate(osmQualitySnapshots.map((item) => item.generatedAt)),
      extractedAt: newestDate(osmQualitySnapshots.map((item) => item.extractedAt)),
      licenseNote: "OSM / Geofabrik open geospatial context requires ODbL attribution, extract date tracking and compliance review.",
      confidence: confidenceFor(osmStatus, osmFeatureCount > 0, "low"),
      validationStatus: validationStatusFor(osmStatus),
      nextValidationStep: osmNextValidationStep,
      snapshots: osmQualitySnapshots
    }),
    sourceQualityGroup({
      sourceGroupId: "overture-maps-open-context",
      sourceGroupName: "Overture Maps buildings / places / transportation",
      status: overtureStatus,
      dataMode: modeFromStatus(overtureStatus),
      recordCount: overtureFeatureCount,
      featureCount: overtureFeatureCount,
      generatedAt: newestDate(overtureSnapshots.map((item) => item.generatedAt)),
      extractedAt: null,
      licenseNote: "Overture Maps public snapshot use requires Overture license and attribution review.",
      confidence: confidenceFor(overtureStatus, overtureFeatureCount > 0, "low"),
      validationStatus: validationStatusFor(overtureStatus),
      nextValidationStep: overtureNextValidationStep,
      snapshots: overtureSnapshots
    }),
    sourceQualityGroup({
      sourceGroupId: "open-meteo-nasa-power-context",
      sourceGroupName: "Open-Meteo + NASA POWER climate / energy context",
      status: "permission_required",
      dataMode: "permission_required",
      recordCount: null,
      featureCount: null,
      generatedAt: null,
      extractedAt: null,
      licenseNote: "Open-Meteo requires approved commercial access; NASA POWER Preview context requires citation and runtime receipt review.",
      confidence: "requires-validation",
      validationStatus: "token-or-permission-required",
      nextValidationStep: climateNextValidationStep,
      snapshots: [{
        sourceGroupId: "open-meteo-nasa-power-context",
        sourceGroupName: "Open-Meteo + NASA POWER climate / energy context",
        sourceId: "open-meteo-nasa-power-context",
        sourceName: "Open-Meteo + NASA POWER climate / energy context",
        filePath: null,
        inputFile: null,
        availableFiles: [],
        recordCount: null,
        featureCount: null,
        generatedAt: null,
        extractedAt: null,
        licenseNote: "Open-Meteo requires approved commercial access; NASA POWER Preview context requires citation and runtime receipt review.",
        dataMode: "permission_required",
        status: "permission_required",
        confidence: "requires-validation",
        validationStatus: "token-or-permission-required",
        caveat,
        nextValidationStep: climateNextValidationStep,
        qualityNotes: ["Static registry metadata is not runtime success; no engineering-grade climate or energy conclusion is provided."]
      }]
    }),
    sourceQualityGroup({
      sourceGroupId: "copernicus-sentinel-metadata",
      sourceGroupName: "Copernicus / Sentinel metadata availability",
      status: copernicusStatus,
      dataMode: modeFromStatus(copernicusStatus),
      recordCount: copernicusSceneCount,
      featureCount: null,
      generatedAt: newestDate(copernicusSnapshots.map((item) => item.generatedAt)),
      extractedAt: newestDate(copernicusSnapshots.map((item) => item.extractedAt)),
      licenseNote: "Copernicus / Sentinel metadata and imagery use requires mission/product terms review and token/query lineage before analytics.",
      confidence: confidenceFor(copernicusStatus, Boolean(copernicusSceneCount && copernicusSceneCount > 0), "requires-validation"),
      validationStatus: validationStatusFor(copernicusStatus),
      nextValidationStep: copernicusNextValidationStep,
      snapshots: copernicusSnapshots
    })
  ]
};
const sourceQualityByGroup = new Map(sourceQualityManifest.groups.map((group) => [group.sourceGroupId, group]));

const sourceGroups = [
  {
    source_id: "dld-dubai-pulse-public-real-estate",
    source_name: "DLD / Dubai Pulse public real estate snapshots",
    category: "real-estate",
    access_mode: "manual-snapshot",
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
    connection_status: bestStatus(Object.values(dldQuality.categories ?? {}).map((item) => item.status), "sample_fallback"),
    record_count: typeof dldQuality.totalRecords === "number" ? dldQuality.totalRecords : null,
    normalized_path: "data/normalized/dld_source_quality.json",
    files: unique([
      "data/normalized/dld_source_quality.json",
      "data/normalized/dld_market_summary.json",
      ...Object.values(dldQuality.categories ?? {}).map((item) => item.outputFile),
      ...sourceFiles(["dld-dubai-pulse-public-transactions"])
    ]),
    confidence: "requires-validation",
    nextValidationStep: dldNextValidationStep
  },
  {
    source_id: "osm-geofabrik-open-geospatial",
    source_name: "OSM / Geofabrik open geospatial baseline",
    category: "open-geospatial",
    access_mode: "open-snapshot",
    sourceIds: ["osm-geofabrik-baseline", "osm-geofabrik-open-roads", "osm-geofabrik-open-pois", "osm-geofabrik-open-buildings"],
    connection_status: bestStatus(sourceStatuses(["osm-geofabrik-baseline", "osm-geofabrik-open-roads", "osm-geofabrik-open-pois", "osm-geofabrik-open-buildings"], osmQuality.status), "sample_fallback"),
    record_count: typeof osmQuality.totalFeatures === "number" ? osmQuality.totalFeatures : null,
    normalized_path: "data/normalized/osm_source_quality.json",
    files: unique(["data/normalized/osm_source_quality.json", ...Object.values(osmQuality.categories ?? {}).map((item) => item.outputFile)]),
    confidence: "low",
    nextValidationStep: osmNextValidationStep
  },
  {
    source_id: "overture-maps-open-context",
    source_name: "Overture Maps buildings / places / transportation",
    category: "open-geospatial",
    access_mode: "public-download",
    sourceIds: ["overture-maps-open-buildings", "overture-maps-open-places", "overture-maps-open-transportation"],
    connection_status: normalizeStatus(overtureQuality.status, "manual_import_ready"),
    record_count: typeof overtureQuality.totalFeatures === "number" ? overtureQuality.totalFeatures : null,
    normalized_path: "data/normalized/overture_source_quality.json",
    files: unique([
      "data/normalized/overture_source_quality.json",
      "data/normalized/overture_buildings_snapshot.json",
      "data/normalized/overture_places_snapshot.json",
      "data/normalized/overture_transportation_snapshot.json"
    ]),
    confidence: "low",
    nextValidationStep: overtureNextValidationStep
  },
  {
    source_id: "open-meteo-nasa-power-context",
    source_name: "Open-Meteo + NASA POWER climate / energy context",
    category: "climate-energy",
    access_mode: "api-context",
    sourceIds: ["open-meteo-climate", "nasa-power-solar-energy"],
    connection_status: bestStatus(sourceStatuses(["open-meteo-climate", "nasa-power-solar-energy"], "permission_required"), "permission_required"),
    record_count: null,
    normalized_path: null,
    files: [],
    confidence: "requires-validation",
    nextValidationStep: climateNextValidationStep
  },
  {
    source_id: "copernicus-sentinel-metadata",
    source_name: "Copernicus / Sentinel metadata availability",
    category: "satellite-metadata",
    access_mode: "token-optional",
    sourceIds: ["copernicus-sentinel-metadata", "copernicus-sentinel-catalog"],
    connection_status: normalizeStatus(copernicusMetadata.status, "sample_fallback"),
    record_count: countCollections(copernicusMetadata.collections),
    normalized_path: "data/external/samples/copernicus_sentinel_metadata_sample.json",
    files: ["data/external/samples/copernicus_sentinel_metadata_sample.json"],
    confidence: "requires-validation",
    nextValidationStep: copernicusNextValidationStep
  }
].map((group) => ({
  ...group,
  source_mode: modeFromStatus(group.connection_status),
  data_quality_tier: group.confidence,
  caveat,
  sourceQuality: sourceQualityByGroup.get(group.source_id),
  quality: {
    confidence: group.confidence,
    recordCount: group.record_count,
    generatedAt,
    sourceQuality: sourceQualityByGroup.get(group.source_id)
  },
  lineage: {
    sourceIds: group.sourceIds,
    availableFiles: group.files,
    nextValidationStep: group.nextValidationStep,
    caveat,
    sourceQuality: sourceQualityByGroup.get(group.source_id)
  }
}));

function toSourceRow(group) {
  return {
    project_key: null,
    source_id: group.source_id,
    source_name: group.source_name,
    category: group.category,
    access_mode: group.access_mode,
    connection_status: group.connection_status,
    source_mode: group.source_mode,
    data_quality_tier: group.data_quality_tier,
    record_count: group.record_count,
    date_range: null,
    quality: group.quality,
    lineage: group.lineage,
    caveat: group.caveat,
    updated_at: generatedAt
  };
}

function toExternalSnapshotRow(group) {
  return {
    project_key: null,
    source_id: group.source_id,
    category: group.category,
    source_mode: group.source_mode,
    raw_file_name: group.files[0] ?? null,
    normalized_path: group.normalized_path,
    record_count: group.record_count,
    quality: group.quality,
    manifest: {
      sourceName: group.source_name,
      sourceIds: group.sourceIds,
      availableFiles: group.files,
      sourceQuality: group.sourceQuality,
      nextValidationStep: group.nextValidationStep,
      caveat
    },
    imported_at: generatedAt,
    updated_at: generatedAt
  };
}

async function upsertBySourceId(client, table, sourceId, payload) {
  const existing = await client
    .from(table)
    .select("id")
    .eq("source_id", sourceId)
    .is("project_key", null)
    .limit(1)
    .maybeSingle();

  if (existing.error) throw new Error(`${table} lookup failed for ${sourceId}: ${existing.error.message}`);
  if (existing.data?.id) {
    const update = await client.from(table).update(payload).eq("id", existing.data.id);
    if (update.error) throw new Error(`${table} update failed for ${sourceId}: ${update.error.message}`);
    return "updated";
  }

  const insert = await client.from(table).insert(payload);
  if (insert.error) throw new Error(`${table} insert failed for ${sourceId}: ${insert.error.message}`);
  return "inserted";
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const sourceRows = sourceGroups.map(toSourceRow);
  const externalRows = sourceGroups.map(toExternalSnapshotRow);
  const canWrite = writeRequested && !dryRun && Boolean(url && serviceRoleKey);

  if (!canWrite) {
    const blockers = [
      !writeRequested && !dryRun ? "Pass --write to perform Supabase writes; without it this command only previews rows." : null,
      !url || !serviceRoleKey ? "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for writes." : null
    ].filter(Boolean);

    console.log(JSON.stringify({
      ok: Boolean(dryRun || !strict),
      synced: false,
      mode: dryRun ? "dry_run" : writeRequested ? "write_blocked_missing_supabase_service_role" : "preview_write_flag_required",
      writeRequested,
      sourceRegistryRows: sourceRows.length,
      externalSnapshotRows: externalRows.length,
      sourceQuality: sourceQualityManifest,
      sources: sourceRows.map((row) => ({
        sourceId: row.source_id,
        sourceName: row.source_name,
        status: row.connection_status,
        sourceMode: row.source_mode,
        recordCount: row.record_count,
        confidence: row.data_quality_tier,
        validationStatus: row.quality.sourceQuality?.validationStatus,
        caveat: row.caveat,
        nextValidationStep: row.lineage.nextValidationStep
      })),
      sourceRegistryPreview: sourceRows.map((row) => ({
        source_id: row.source_id,
        source_name: row.source_name,
        category: row.category,
        access_mode: row.access_mode,
        connection_status: row.connection_status,
        source_mode: row.source_mode,
        data_quality_tier: row.data_quality_tier,
        record_count: row.record_count,
        quality: row.quality,
        lineage: row.lineage,
        caveat: row.caveat
      })),
      externalSnapshotPreview: externalRows.map((row) => ({
        source_id: row.source_id,
        category: row.category,
        source_mode: row.source_mode,
        raw_file_name: row.raw_file_name,
        normalized_path: row.normalized_path,
        record_count: row.record_count,
        quality: row.quality,
        manifest: row.manifest
      })),
      blockers,
      caveat
    }, null, 2));
    process.exit(!dryRun && writeRequested && strict ? 1 : 0);
  }

  const client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const results = [];
  for (const row of sourceRows) {
    results.push({
      table: "source_registry_snapshots",
      sourceId: row.source_id,
      action: await upsertBySourceId(client, "source_registry_snapshots", row.source_id, row)
    });
  }
  for (const row of externalRows) {
    results.push({
      table: "external_data_snapshots",
      sourceId: row.source_id,
      action: await upsertBySourceId(client, "external_data_snapshots", row.source_id, row)
    });
  }

  console.log(JSON.stringify({
    ok: true,
    synced: true,
    sourceRegistryRows: sourceRows.length,
    externalSnapshotRows: externalRows.length,
    results,
    caveat
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    synced: false,
    error: error instanceof Error ? error.message : "Unknown sync failure.",
    caveat
  }, null, 2));
  process.exit(1);
});
