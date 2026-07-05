#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const dryRun = process.argv.includes("--dry-run");
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
    nextValidationStep: "Confirm permitted DLD / Dubai Pulse files, extraction date, license terms and official/client validation source."
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
    nextValidationStep: "Confirm extract date, ODbL attribution and compare against official/customer GIS before decisions."
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
    nextValidationStep: "Confirm Overture extract scope/license and reconcile buildings, places and transport against client/official evidence."
  },
  {
    source_id: "open-meteo-nasa-power-context",
    source_name: "Open-Meteo + NASA POWER climate / energy context",
    category: "climate-energy",
    access_mode: "api-context",
    sourceIds: ["open-meteo-climate", "nasa-power-solar-energy"],
    connection_status: bestStatus(sourceStatuses(["open-meteo-climate", "nasa-power-solar-energy"], "connected"), "connected"),
    record_count: null,
    normalized_path: null,
    files: [],
    confidence: "medium",
    nextValidationStep: "Validate climate and energy assumptions with engineering/client-approved evidence before operational decisions."
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
    nextValidationStep: "Add approved token/query pipeline and verify metadata/imagery lineage before analytics."
  }
].map((group) => ({
  ...group,
  source_mode: modeFromStatus(group.connection_status),
  data_quality_tier: group.confidence,
  caveat,
  quality: {
    confidence: group.confidence,
    recordCount: group.record_count,
    generatedAt
  },
  lineage: {
    sourceIds: group.sourceIds,
    availableFiles: group.files,
    nextValidationStep: group.nextValidationStep,
    caveat
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

  if (dryRun || !url || !serviceRoleKey) {
    console.log(JSON.stringify({
      ok: Boolean(dryRun || !strict),
      synced: false,
      mode: dryRun ? "dry_run" : "local_fallback_no_supabase_service_role",
      sourceRegistryRows: sourceRows.length,
      externalSnapshotRows: externalRows.length,
      sources: sourceRows.map((row) => ({
        sourceId: row.source_id,
        sourceName: row.source_name,
        status: row.connection_status,
        sourceMode: row.source_mode,
        recordCount: row.record_count,
        confidence: row.data_quality_tier,
        caveat: row.caveat,
        nextValidationStep: row.lineage.nextValidationStep
      })),
      blockers: !url || !serviceRoleKey ? ["NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for writes."] : [],
      caveat
    }, null, 2));
    process.exit(!dryRun && strict ? 1 : 0);
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
