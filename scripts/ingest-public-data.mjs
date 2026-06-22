import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const caveat = "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const mode = process.argv[2];

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
  if (!existsSync(selected)) return { file: selected, rows: [], status: "missing" };
  return { file: selected, rows: parseCsv(readFileSync(selected, "utf8")), status: selected === primary ? "snapshot-available" : "sample-fallback" };
}

function readGeojsonWithFallback(primary, fallback) {
  const selected = existsSync(primary) ? primary : fallback;
  if (!existsSync(selected)) return { file: selected, features: [], status: "missing" };
  const parsed = JSON.parse(readFileSync(selected, "utf8"));
  return {
    file: selected,
    features: Array.isArray(parsed.features) ? parsed.features : [],
    status: selected === primary ? "snapshot-available" : "sample-fallback"
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
    ["transactions", "dld-dubai-pulse-public-transactions"],
    ["rents", "dld-dubai-pulse-public-rents"],
    ["projects", "dld-dubai-pulse-public-projects"],
    ["land", "dld-dubai-pulse-public-land"],
    ["building", "dld-dubai-pulse-public-building"],
    ["unit", "dld-dubai-pulse-public-unit"]
  ];
  const categoryReports = {};
  const marketRows = [];
  const manifestSources = [];

  for (const [category, sourceId] of categories) {
    const input = `data/external/dld/${category}.csv`;
    const fallback = `data/external/samples/dld_${category}_sample.csv`;
    const { file, rows, status } = readCsvWithFallback(input, fallback);
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
      status: rows.length > 0 ? status : "missing",
      category,
      recordCount: normalizedRows.length,
      records: normalizedRows,
      caveat
    });
    categoryReports[category] = {
      sourceId,
      status: rows.length > 0 ? status : "missing",
      inputFile: file,
      outputFile: output,
      recordCount: normalizedRows.length,
      missingFields: rows.length === 0 ? ["all"] : []
    };
    manifestSources.push({
      id: sourceId,
      status: rows.length > 0 ? "snapshot_available" : "sample_fallback",
      lastUpdated: generatedAt,
      availableFiles: [file, output],
      recordCount: normalizedRows.length,
      coverageArea: "Dubai public real-estate categories",
      confidence: status === "snapshot-available" ? "medium" : "low",
      usedInAnalysis: true,
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
    status: "ok",
    totalRecords: Object.values(categoryReports).reduce((sum, item) => sum + item.recordCount, 0),
    categories: categoryReports,
    caveat,
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
  writeJson("data/normalized/osm_source_quality.json", {
    generatedAt,
    version: "1.6",
    status,
    inputFile: file,
    totalFeatures,
    categories: Object.fromEntries(outputs.map((item) => [item.category, { outputFile: item.output, featureCount: item.count }])),
    caveat
  });
  updateManifest([
    {
      id: "osm-geofabrik-baseline",
      status: totalFeatures > 0 ? "snapshot_available" : "sample_fallback",
      lastUpdated: generatedAt,
      availableFiles: [file, ...outputs.map((item) => item.output), "data/normalized/osm_source_quality.json"],
      featureCount: totalFeatures,
      recordCount: totalFeatures,
      coverageArea: "Dubai open geospatial baseline",
      confidence: status === "snapshot-available" ? "medium" : "low",
      usedInAnalysis: true,
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
      status: features.length > 0 ? "snapshot_available" : "manual-import-ready",
      lastUpdated: generatedAt,
      availableFiles: [file, output],
      featureCount: features.length,
      recordCount: features.length,
      coverageArea: "Dubai open Overture snapshot",
      confidence: status === "snapshot-available" ? "medium" : "low",
      usedInAnalysis: features.length > 0,
      caveat,
      disclaimer: "Overture Maps open snapshot; not official Dubai GIS."
    });
  }

  writeJson("data/normalized/overture_source_quality.json", { generatedAt, version: "1.6", totalFeatures, status: "ok", caveat });
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
    status: features.length > 0 ? "snapshot_available" : "sample_fallback",
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
    status: features.length > 0 ? "snapshot_available" : "manual-import-ready",
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
