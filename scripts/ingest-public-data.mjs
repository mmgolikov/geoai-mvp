import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const caveat = "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const mode = process.argv[2];
const unavailable = "unavailable";

const requiredCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const sourceQualityVersion = "1.3";
const dldGroupId = "dld-dubai-pulse-public-real-estate";
const osmGroupId = "osm-geofabrik-open-geospatial";
const dldNextValidationStep = "Confirm permitted DLD / Dubai Pulse files, extraction date, license terms and official/client validation source.";
const osmNextValidationStep = "Confirm extract date, ODbL attribution and compare against official/customer GIS before decisions.";
const dldLicenseNote = "DLD / Dubai Pulse public/open snapshot terms, attribution and redistribution limits must be confirmed per file before external use.";
const osmLicenseNote = "OSM / Geofabrik open geospatial context requires ODbL attribution, extract date tracking and compliance review.";

function normalizeStatus(value) {
  const key = String(value ?? unavailable).trim().toLowerCase();
  const aliases = {
    connected: "connected",
    "snapshot-available": "snapshot_available",
    snapshot_available: "snapshot_available",
    "sample-fallback": "sample_fallback",
    sample_fallback: "sample_fallback",
    "manual-import-ready": "manual_import_ready",
    manual_import_ready: "manual_import_ready",
    "token-required": "token_required",
    token_required: "token_required",
    "permission-required": "permission_required",
    permission_required: "permission_required",
    planned: "planned",
    missing: unavailable,
    "missing-input": unavailable,
    unavailable
  };

  return aliases[key] ?? unavailable;
}

function sourceModeFromStatus(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "snapshot_available") return "imported_snapshot";
  if (normalized === "sample_fallback") return "sample_fallback";
  if (normalized === "manual_import_ready") return "manual_import_ready";
  if (normalized === "permission_required" || normalized === "token_required") return "permission_required";
  if (normalized === "connected") return "api_context";
  return "planned_validation";
}

function confidenceFromStatus(status, count) {
  const normalized = normalizeStatus(status);
  if (normalized === "snapshot_available" || normalized === "connected") return "medium";
  if (normalized === "sample_fallback" && count > 0) return "low";
  return "requires-validation";
}

function validationStatusFromStatus(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "snapshot_available") return "snapshot-not-live";
  if (normalized === "sample_fallback") return "sample-only";
  if (normalized === "manual_import_ready") return "manual-import-ready";
  if (normalized === "connected") return "api-context";
  if (normalized === "permission_required" || normalized === "token_required") return "token-or-permission-required";
  return "planned-validation";
}

function extractDateFromPath(path) {
  const match = String(path ?? "").match(/(?:^|_)(\d{4})(\d{2})(\d{2})(?:\.|_|$)/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function ensureDir(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function slug(value) {
  return String(value ?? "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = (rows[0] ?? []).map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""));
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function readCsvWithFallback(primary, fallback) {
  const selected = existsSync(primary) ? primary : fallback;
  if (!existsSync(selected)) return { file: selected, rows: [], status: unavailable };
  return { file: selected, rows: parseCsv(readFileSync(selected, "utf8")), status: selected === primary ? "snapshot_available" : "sample_fallback" };
}

function latestDatedCsv(directory, prefix) {
  if (!existsSync(directory)) return null;

  const pattern = new RegExp(`^${prefix}_\\d{8}\\.csv$`, "i");
  const files = readdirSync(directory)
    .filter((file) => pattern.test(file))
    .sort();

  return files.at(-1) ? join(directory, files.at(-1)) : null;
}

function readDldCategoryCsv(category) {
  const latest = latestDatedCsv("data/external/dld", category.expectedPrefix);
  const simple = `data/external/dld/${category.key}.csv`;
  const legacy = `data/external/dld/${category.expectedPrefix}.csv`;
  const fallback = category.sampleFile ? `data/external/samples/${category.sampleFile}` : null;
  const selected = latest ?? (existsSync(simple) ? simple : null) ?? (existsSync(legacy) ? legacy : null) ?? fallback;

  if (!selected || !existsSync(selected)) {
    return { file: latest ?? simple, rows: [], status: "manual_import_ready" };
  }

  return {
    file: selected,
    rows: parseCsv(readFileSync(selected, "utf8")),
    status: selected.includes("/samples/") || selected.includes("_sample.") ? "sample_fallback" : "snapshot_available"
  };
}

function readGeojsonWithFallback(primary, fallback) {
  const selected = existsSync(primary) ? primary : fallback;
  if (!existsSync(selected)) return { file: selected, features: [], status: unavailable };
  const parsed = JSON.parse(readFileSync(selected, "utf8"));
  return {
    file: selected,
    features: Array.isArray(parsed.features) ? parsed.features : [],
    status: selected === primary ? "snapshot_available" : "sample_fallback"
  };
}

function writeJson(path, value) {
  ensureDir(path);
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function numberValue(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function updateManifest(sourcePatches, generatedAt) {
  const manifestPath = "data/external/normalized/external_data_manifest.json";
  let manifest = {
    generatedAt,
    version: "1.6",
    summary: "GeoAI public data connectors v1.6. Public/open sources use snapshots, API context, manual imports and safe sample fallbacks.",
    sources: []
  };

  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      // Keep default manifest.
    }
  }

  const incomingIds = new Set(sourcePatches.map((source) => source.id));
  const existing = Array.isArray(manifest.sources) ? manifest.sources.filter((source) => !incomingIds.has(source.id)) : [];
  writeJson(manifestPath, {
    ...manifest,
    generatedAt,
    version: "1.6",
    sources: [...sourcePatches, ...existing]
  });
}

function ingestDldPublic() {
  const generatedAt = new Date().toISOString();
  const categories = [
    { key: "transactions", expectedPrefix: "dld_transactions", sourceId: "dld-dubai-pulse-public-transactions", sampleFile: "dld_transactions_sample.csv" },
    { key: "rents", expectedPrefix: "dld_rents", sourceId: "dld-dubai-pulse-public-rents", sampleFile: "dld_rents_sample.csv" },
    { key: "projects", expectedPrefix: "dld_projects", sourceId: "dld-dubai-pulse-public-projects", sampleFile: "dld_projects_sample.csv" },
    { key: "valuations", expectedPrefix: "dld_valuations", sourceId: "dld-dubai-pulse-public-valuations" },
    { key: "land", expectedPrefix: "dld_land", sourceId: "dld-dubai-pulse-public-land", sampleFile: "dld_land_sample.csv" },
    { key: "building", expectedPrefix: "dld_building", sourceId: "dld-dubai-pulse-public-building", sampleFile: "dld_building_sample.csv" },
    { key: "unit", expectedPrefix: "dld_unit", sourceId: "dld-dubai-pulse-public-unit", sampleFile: "dld_unit_sample.csv" },
    { key: "brokers", expectedPrefix: "dld_brokers", sourceId: "dld-dubai-pulse-public-brokers" },
    { key: "developers", expectedPrefix: "dld_developers", sourceId: "dld-dubai-pulse-public-developers" }
  ];
  const categoryReports = {};
  const marketRows = [];
  const manifestSources = [];

  for (const categoryConfig of categories) {
    const { key: category, sourceId } = categoryConfig;
    const { file, rows, status } = readDldCategoryCsv(categoryConfig);
    const normalizedStatus = rows.length > 0 ? normalizeStatus(status) : "manual_import_ready";
    const normalizedRows = rows.map((row, index) => {
      const areaName = row.area_name || row.community || row.master_project || row.project_name || row.location || `Dubai sample area ${index + 1}`;
      marketRows.push({
        category,
        areaName,
        count: numberValue(row.record_count || row.transaction_count || row.contract_count || row.project_count || row.unit_count, 1),
        valueProxy: numberValue(row.value_aed || row.median_price_per_sqm || row.annual_rent_aed || row.area_sqm, 0)
      });
      return {
        id: `${category}-${slug(areaName)}-${index + 1}`,
        category,
        sourceId,
        areaName,
        sourceFile: file,
        fields: row,
        caveat
      };
    });
    const output = `data/normalized/dld_${category}_snapshot.json`;
    writeJson(output, {
      generatedAt,
      version: "1.6",
      sourceId,
      status: normalizedStatus,
      category,
      recordCount: normalizedRows.length,
      records: normalizedRows,
      caveat
    });
    categoryReports[category] = {
      sourceGroupId: dldGroupId,
      sourceId,
      sourceName: `DLD / Dubai Pulse public ${category} snapshot`,
      status: normalizedStatus,
      inputFile: file,
      filePath: output,
      outputFile: output,
      recordCount: normalizedRows.length,
      generatedAt,
      extractedAt: extractDateFromPath(file),
      licenseNote: dldLicenseNote,
      dataMode: sourceModeFromStatus(normalizedStatus),
      confidence: confidenceFromStatus(normalizedStatus, normalizedRows.length),
      validationStatus: validationStatusFromStatus(normalizedStatus),
      caveat: requiredCaveat,
      nextValidationStep: dldNextValidationStep,
      qualityNotes: rows.length === 0
        ? [`No ${categoryConfig.expectedPrefix}_YYYYMMDD.csv snapshot found. Manual import ready.`]
        : [`Loaded ${rows.length} row(s) from ${file}.`]
    };
    manifestSources.push({
      id: sourceId,
      status: normalizedStatus,
      lastUpdated: generatedAt,
      availableFiles: [file, output],
      recordCount: normalizedRows.length,
      coverageArea: "Dubai public real-estate categories",
      confidence: normalizedStatus === "snapshot_available" ? "medium" : "low",
      usedInAnalysis: normalizedRows.length > 0,
      caveat,
      disclaimer: "DLD / Dubai Pulse public snapshot; not a live DLD API or ownership/title validation."
    });
  }

  const areaSummary = new Map();
  for (const row of marketRows) {
    const current = areaSummary.get(row.areaName) ?? { areaName: row.areaName, categoryCoverage: [], recordCount: 0, valueProxy: 0 };
    current.categoryCoverage.push(row.category);
    current.recordCount += row.count;
    current.valueProxy += row.valueProxy;
    areaSummary.set(row.areaName, current);
  }

  writeJson("data/normalized/dld_market_summary.json", {
    generatedAt,
    version: "1.6",
    source: "DLD / Dubai Pulse public snapshot",
    areas: Array.from(areaSummary.values()).map((item) => ({
      ...item,
      categoryCoverage: Array.from(new Set(item.categoryCoverage)),
      caveat
    })),
    caveat
  });
  writeJson("data/normalized/dld_source_quality.json", {
    generatedAt,
    version: "1.6",
    sourceQualityVersion,
    sourceGroupId: dldGroupId,
    sourceName: "DLD / Dubai Pulse public real estate snapshots",
    status: "ok",
    totalRecords: Object.values(categoryReports).reduce((sum, item) => sum + item.recordCount, 0),
    licenseNote: dldLicenseNote,
    dataMode: Object.values(categoryReports).some((item) => item.status === "snapshot_available") ? "imported_snapshot" : "sample_fallback",
    confidence: Object.values(categoryReports).some((item) => item.status === "snapshot_available") ? "medium" : "low",
    validationStatus: Object.values(categoryReports).some((item) => item.status === "snapshot_available") ? "snapshot-not-live" : "sample-only",
    caveat: requiredCaveat,
    nextValidationStep: dldNextValidationStep,
    categories: categoryReports,
    forbiddenClaims: ["ownership verification", "official parcel boundary", "certified valuation", "live DLD API"]
  });
  updateManifest(manifestSources, generatedAt);
  console.log(`DLD / Dubai Pulse public snapshots normalized: ${manifestSources.reduce((sum, source) => sum + source.recordCount, 0)} records.`);
}

function ingestOsmPublic() {
  const generatedAt = new Date().toISOString();
  const { file, features, status } = readGeojsonWithFallback("data/external/osm/dubai_osm_public.geojson", "data/external/osm/dubai_osm_baseline_sample.geojson");
  const groups = {
    roads: [],
    buildings: [],
    pois: [],
    landuse: [],
    transport: []
  };

  features.forEach((feature, index) => {
    const properties = feature.properties ?? {};
    const item = { id: feature.id ?? `osm-public-${index + 1}`, sourceFile: file, ...feature, caveat };
    if (properties.highway) groups.roads.push(item);
    else if (properties.building) groups.buildings.push(item);
    else if (properties.railway || properties.public_transport) groups.transport.push(item);
    else if (properties.landuse || properties.zoning) groups.landuse.push(item);
    else groups.pois.push(item);
  });

  const outputs = [
    ["roads", "osm-geofabrik-open-roads"],
    ["buildings", "osm-geofabrik-open-buildings"],
    ["pois", "osm-geofabrik-open-pois"],
    ["landuse", "osm-geofabrik-open-pois"],
    ["transport", "osm-geofabrik-open-roads"]
  ].map(([category, sourceId]) => {
    const output = `data/normalized/osm_${category}_snapshot.json`;
    writeJson(output, {
      generatedAt,
      version: "1.6",
      sourceId,
      status,
      featureCount: groups[category].length,
      features: groups[category],
      caveat
    });
    return { category, sourceId, output, count: groups[category].length };
  });

  const totalFeatures = features.length;
  const normalizedStatus = totalFeatures > 0 ? normalizeStatus(status) : "sample_fallback";
  const categoryQuality = Object.fromEntries(outputs.map((item) => [item.category, {
    sourceGroupId: osmGroupId,
    sourceId: item.sourceId,
    sourceName: `OSM / Geofabrik open ${item.category} snapshot`,
    status: normalizedStatus,
    inputFile: file,
    filePath: item.output,
    outputFile: item.output,
    recordCount: item.count,
    featureCount: item.count,
    generatedAt,
    extractedAt: extractDateFromPath(file),
    licenseNote: osmLicenseNote,
    dataMode: sourceModeFromStatus(normalizedStatus),
    confidence: confidenceFromStatus(normalizedStatus, item.count),
    validationStatus: validationStatusFromStatus(normalizedStatus),
    caveat: requiredCaveat,
    nextValidationStep: osmNextValidationStep,
    qualityNotes: []
  }]));

  writeJson("data/normalized/osm_source_quality.json", {
    generatedAt,
    version: "1.6",
    sourceQualityVersion,
    sourceGroupId: osmGroupId,
    sourceName: "OSM / Geofabrik open geospatial baseline",
    status: normalizedStatus,
    inputFile: file,
    totalFeatures,
    licenseNote: osmLicenseNote,
    dataMode: sourceModeFromStatus(normalizedStatus),
    confidence: confidenceFromStatus(normalizedStatus, totalFeatures),
    validationStatus: validationStatusFromStatus(normalizedStatus),
    caveat: requiredCaveat,
    nextValidationStep: osmNextValidationStep,
    categories: categoryQuality
  });
  updateManifest([
    {
      id: "osm-geofabrik-baseline",
      status: normalizedStatus,
      lastUpdated: generatedAt,
      availableFiles: [file, ...outputs.map((item) => item.output), "data/normalized/osm_source_quality.json"],
      featureCount: totalFeatures,
      recordCount: totalFeatures,
      coverageArea: "Dubai open geospatial baseline",
      confidence: normalizedStatus === "snapshot_available" ? "medium" : "low",
      usedInAnalysis: totalFeatures > 0,
      caveat,
      disclaimer: "OSM / Geofabrik open snapshot; not official municipal GIS."
    }
  ], generatedAt);
  console.log(`OSM / Geofabrik public snapshots normalized: ${totalFeatures} features.`);
}

function ingestOverturePublic() {
  const generatedAt = new Date().toISOString();
  const categories = [
    ["buildings", "overture-maps-open-buildings", "overture_buildings_sample.geojson"],
    ["places", "overture-maps-open-places", "overture_places_sample.geojson"],
    ["transportation", "overture-maps-open-transportation", "overture_transportation_sample.geojson"]
  ];
  const manifestSources = [];
  let totalFeatures = 0;

  for (const [category, sourceId, sample] of categories) {
    const { file, features, status } = readGeojsonWithFallback(`data/external/overture/${category}.geojson`, `data/external/samples/${sample}`);
    totalFeatures += features.length;
    const output = `data/normalized/overture_${category}_snapshot.json`;
    writeJson(output, { generatedAt, version: "1.6", sourceId, status, featureCount: features.length, features, caveat });
    manifestSources.push({
      id: sourceId,
      status: features.length > 0 ? normalizeStatus(status) : "manual_import_ready",
      lastUpdated: generatedAt,
      availableFiles: [file, output],
      featureCount: features.length,
      recordCount: features.length,
      coverageArea: "Dubai open Overture snapshot",
      confidence: normalizeStatus(status) === "snapshot_available" ? "medium" : "low",
      usedInAnalysis: features.length > 0,
      caveat,
      disclaimer: "Overture Maps open snapshot; not official Dubai GIS."
    });
  }

  writeJson("data/normalized/overture_source_quality.json", {
    generatedAt,
    version: "1.6",
    totalFeatures,
    status: manifestSources.some((source) => source.status === "snapshot_available") ? "snapshot_available" : totalFeatures > 0 ? "sample_fallback" : "manual_import_ready",
    caveat
  });
  updateManifest(manifestSources, generatedAt);
  console.log(`Overture public snapshots normalized: ${totalFeatures} features.`);
}

function ingestWorldPopPublic() {
  const generatedAt = new Date().toISOString();
  const { file, features, status } = readGeojsonWithFallback("data/external/worldpop/uae_population_context.geojson", "data/external/samples/worldpop_uae_sample.geojson");
  writeJson("data/normalized/worldpop_population_context.json", {
    generatedAt,
    version: "1.6",
    sourceId: "worldpop-demographics",
    status,
    featureCount: features.length,
    features,
    caveat
  });
  writeJson("data/normalized/worldpop_source_quality.json", { generatedAt, version: "1.6", status, inputFile: file, featureCount: features.length, caveat });
  updateManifest([{
    id: "worldpop-demographics",
    status: features.length > 0 ? normalizeStatus(status) : "sample_fallback",
    lastUpdated: generatedAt,
    availableFiles: [file, "data/normalized/worldpop_population_context.json"],
    featureCount: features.length,
    recordCount: features.length,
    coverageArea: "UAE / Dubai population context",
    confidence: "low",
    usedInAnalysis: features.length > 0,
    caveat,
    disclaimer: "WorldPop demographic context; not official census-grade validation."
  }], generatedAt);
  console.log(`WorldPop population context normalized: ${features.length} features.`);
}

function ingestAdminPublic() {
  const generatedAt = new Date().toISOString();
  const { file, features, status } = readGeojsonWithFallback("data/external/admin-boundaries/admin_context.geojson", "data/external/samples/overture_divisions_sample.geojson");
  writeJson("data/normalized/admin_boundaries_context.json", {
    generatedAt,
    version: "1.6",
    sourceId: "overture-divisions-admin-context",
    status,
    featureCount: features.length,
    features,
    caveat
  });
  updateManifest([{
    id: "overture-divisions-admin-context",
    status: features.length > 0 ? normalizeStatus(status) : "manual_import_ready",
    lastUpdated: generatedAt,
    availableFiles: [file, "data/normalized/admin_boundaries_context.json"],
    featureCount: features.length,
    recordCount: features.length,
    coverageArea: "UAE / Dubai non-official administrative context",
    confidence: "low",
    usedInAnalysis: features.length > 0,
    caveat,
    disclaimer: "Non-official administrative context; not official boundary validation."
  }], generatedAt);
  console.log(`Administrative boundary context normalized: ${features.length} features.`);
}

const actions = {
  "dld-public": ingestDldPublic,
  "osm-public": ingestOsmPublic,
  "overture-public": ingestOverturePublic,
  "worldpop-public": ingestWorldPopPublic,
  "admin-boundaries-public": ingestAdminPublic
};

if (mode === "all") {
  ingestDldPublic();
  ingestOsmPublic();
  ingestOverturePublic();
  ingestWorldPopPublic();
  ingestAdminPublic();
} else if (actions[mode]) {
  actions[mode]();
} else {
  console.error("Usage: node scripts/ingest-public-data.mjs <dld-public|osm-public|overture-public|worldpop-public|admin-boundaries-public|all>");
  process.exit(1);
}
