import { existsSync, readFileSync } from "node:fs";

const caveat = "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const validate = process.argv.includes("--validate");

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { __error: error instanceof Error ? error.message : "Invalid JSON" };
  }
}

function modeFromStatus(status, count = 0) {
  const normalized = String(status ?? "").replace(/-/g, "_").toLowerCase();
  if (normalized === "snapshot_available") return "imported_snapshot";
  if (normalized === "sample_fallback") return "sample_fallback";
  if (normalized === "manual_import_ready") return "manual_import_ready";
  if (normalized === "permission_required") return "permission_required";
  if (normalized === "planned" || normalized === "planned_validation") return "planned_validation";
  if (normalized === "connected") return "api_context";
  return count > 0 ? "sample_fallback" : "manual_import_ready";
}

function printRow(row) {
  console.log(`- ${row.category}`);
  console.log(`  source mode: ${row.sourceMode}`);
  console.log(`  records/features: ${row.count}`);
  console.log(`  last updated: ${row.lastUpdated ?? "n/a"}`);
  console.log(`  date range: ${row.dateRange ?? "n/a"}`);
  console.log(`  warnings: ${row.warnings.length > 0 ? row.warnings.join("; ") : "none"}`);
  console.log(`  caveat: ${row.caveat}`);
}

const manifest = readJson("data/external/normalized/external_data_manifest.json", { sources: [] });
const dldQuality = readJson("data/normalized/dld_source_quality.json", { categories: {}, totalRecords: 0 });
const dldMarket = readJson("data/normalized/dld_market_snapshot.json", { areas: [] });
const osmQuality = readJson("data/normalized/osm_source_quality.json", { totalFeatures: 0 });

const rows = [];

if (dldQuality.__error) {
  rows.push({
    category: "DLD / Dubai Pulse public categories",
    sourceMode: "manual_import_ready",
    count: 0,
    warnings: [`dld_source_quality.json error: ${dldQuality.__error}`],
    caveat
  });
} else {
  for (const [category, report] of Object.entries(dldQuality.categories ?? {})) {
    rows.push({
      category: `DLD ${category}`,
      sourceMode: modeFromStatus(report.status, report.recordCount),
      count: report.recordCount ?? 0,
      lastUpdated: dldQuality.generatedAt,
      dateRange: null,
      warnings: report.qualityNotes ?? report.missingFields ?? [],
      caveat
    });
  }
}

rows.push({
  category: "DLD market area snapshot",
  sourceMode: dldMarket.areas?.length ? modeFromStatus(dldMarket.source?.status, dldMarket.areas.length) : "manual_import_ready",
  count: dldMarket.areas?.length ?? 0,
  lastUpdated: dldMarket.generatedAt ?? null,
  dateRange: Array.from(new Set((dldMarket.areas ?? []).map((area) => area.sourceDate).filter(Boolean))).join(" to ") || null,
  warnings: dldMarket.source?.status === "sample_fallback" ? ["Bundled sample fallback snapshot records are active."] : [],
  caveat
});

rows.push({
  category: "OSM / Geofabrik open snapshot",
  sourceMode: modeFromStatus(osmQuality.status, osmQuality.totalFeatures),
  count: osmQuality.totalFeatures ?? 0,
  lastUpdated: osmQuality.generatedAt ?? null,
  dateRange: null,
  warnings: osmQuality.status === "sample_fallback" ? ["OSM sample fallback is active."] : [],
  caveat: "Open geospatial context is not official municipal GIS, zoning, planning or parcel evidence."
});

for (const source of manifest.sources ?? []) {
  if (String(source.id ?? "").includes("dld") || String(source.id ?? "").includes("osm")) continue;
  rows.push({
    category: source.name ?? source.id,
    sourceMode: source.sourceMode ?? modeFromStatus(source.status, source.recordCount ?? source.featureCount ?? source.rowCount),
    count: source.recordCount ?? source.featureCount ?? source.rowCount ?? 0,
    lastUpdated: source.lastUpdated ?? null,
    dateRange: null,
    warnings: source.status === "sample_fallback" ? ["Sample fallback is active."] : [],
    caveat: source.caveat ?? source.disclaimer ?? caveat
  });
}

console.log("GeoAI external data status");
console.log("==========================");
rows.forEach(printRow);

if (validate) {
  const invalid = rows.filter((row) => !row.sourceMode || typeof row.count !== "number");
  if (invalid.length > 0) {
    console.error(`Validation failed: ${invalid.length} invalid status row(s).`);
    process.exit(1);
  }
  const falseSnapshots = rows.filter((row) => ["real_snapshot", "imported_snapshot"].includes(row.sourceMode) && row.count <= 0);
  if (falseSnapshots.length > 0) {
    console.error(`Validation failed: ${falseSnapshots.length} zero-record row(s) are classified as acquired snapshots.`);
    process.exit(1);
  }
  console.log("Validation passed: rows are readable and zero-record metadata is not classified as an acquired snapshot.");
}
