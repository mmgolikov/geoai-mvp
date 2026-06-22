import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const defaultInput = "data/external/dld/dld_market_snapshot_sample.csv";
const outputPath = "data/normalized/dld_market_snapshot.json";
const qualityPath = "data/normalized/dld_market_snapshot_quality.json";
const manifestPath = "data/external/normalized/external_data_manifest.json";
const caveat = "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

function inputStatus(file) {
  return file.includes("_sample.") || file.includes("/samples/") ? "sample_fallback" : "snapshot_available";
}

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function ensureDir(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function parseCsv(text) {
  const rows = [];
  let cell = "";
  let row = [];
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
  return rows;
}

function normalizeKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function clampScore(value, fallback = 55) {
  const number = Number(String(value ?? "").replace(/[^0-9.-]+/g, ""));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function pick(row, aliases) {
  const keys = Object.keys(row);
  const normalizedAliases = aliases.map(normalizeKey);
  const key = keys.find((candidate) => normalizedAliases.includes(normalizeKey(candidate)));
  return key ? row[key] : "";
}

function readInput(file) {
  if (!existsSync(file)) {
    return null;
  }

  if (file.endsWith(".json")) {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed : Array.isArray(parsed.areas) ? parsed.areas : [];
  }

  const rows = parseCsv(readFileSync(file, "utf8"));
  const headers = (rows[0] ?? []).map(normalizeKey);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function updateManifest(areaCount, generatedAt, inputFile) {
  const status = areaCount > 0 ? inputStatus(inputFile) : "sample_fallback";
  let manifest = {
    generatedAt,
    version: "1.4",
    summary: "GeoAI external data manifest v1.4. Snapshot connectors are optional and fall back safely to demo/sample context.",
    sources: []
  };

  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      // Keep the default manifest when the existing file is malformed.
    }
  }

  const next = {
    id: "dld-dubai-pulse-transactions",
    status,
    lastUpdated: generatedAt,
    availableFiles: areaCount > 0 ? [inputFile, outputPath, qualityPath] : [qualityPath],
    rowCount: areaCount,
    recordCount: areaCount,
    coverageArea: "Dubai market areas",
    confidence: status === "snapshot_available" ? "medium" : "low",
    usedInAnalysis: areaCount > 0,
    caveat: areaCount > 0
      ? `DLD / Dubai Pulse ${status === "snapshot_available" ? "snapshot available" : "sample fallback"}; ${caveat}`
      : `DLD / Dubai Pulse snapshot missing; sample fallback active; ${caveat}`,
    disclaimer: "DLD / Dubai Pulse snapshot context; not a live official transactional feed."
  };
  const sources = Array.isArray(manifest.sources) ? manifest.sources.filter((source) => source.id !== next.id) : [];

  ensureDir(manifestPath);
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, generatedAt, version: "1.4", sources: [next, ...sources] }, null, 2));
}

const inputFile = argValue("file") ?? defaultInput;
const generatedAt = new Date().toISOString();
const rawRows = readInput(inputFile);

if (!rawRows) {
  ensureDir(qualityPath);
  const report = {
    generatedAt,
    status: "unavailable",
    inputFile,
    message: "No DLD / Dubai Pulse snapshot file found. Sample/demo fallback remains active.",
    caveat
  };
  writeFileSync(qualityPath, JSON.stringify(report, null, 2));
  updateManifest(0, generatedAt, inputFile);
  console.log(report.message);
  process.exit(0);
}

const notes = [];
const areas = rawRows.map((row, index) => {
  const areaName = pick(row, ["areaName", "area_name", "sourceAreaName", "community", "master_project", "project_name"]) || `Unknown area ${index + 1}`;
  const transactionCount = clampScore(pick(row, ["transactionCount", "transaction_count", "transactions", "deals"]), 0);
  const priceIndex = clampScore(pick(row, ["medianPriceIndex", "priceIndex", "price_index", "median_price_index"]), 60);
  const rentalDemandIndex = clampScore(pick(row, ["rentalDemandIndex", "rent_index", "rental_index"]), 55);
  const liquidityIndex = clampScore(pick(row, ["liquidityIndex", "liquidity_index"]), transactionCount > 150 ? 78 : 62);
  const developmentPipelineIndex = clampScore(pick(row, ["developmentPipelineIndex", "pipeline_index", "supply_index"]), 58);
  const riskIndex = clampScore(pick(row, ["riskIndex", "risk_index"]), 58);

  if (areaName.startsWith("Unknown area")) {
    notes.push({ severity: "warning", row: index + 1, message: "Area name missing; generated placeholder area name." });
  }

  return {
    id: areaName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    areaName,
    sourceAreaName: pick(row, ["sourceAreaName", "source_area_name"]) || areaName,
    transactionCount,
    medianPriceIndex: priceIndex,
    priceIndex,
    rentalDemandIndex,
    liquidityIndex,
    developmentPipelineIndex,
    riskIndex,
    trend: ["rising", "stable", "cooling"].includes(String(pick(row, ["trend"])).toLowerCase())
      ? String(pick(row, ["trend"])).toLowerCase()
      : "stable",
    confidence: pick(row, ["confidence"]) || "medium",
    sourceDate: pick(row, ["sourceDate", "source_date", "date"]) || generatedAt.slice(0, 10),
    sourceFile: inputFile,
    sourceId: "dld-dubai-pulse-transactions",
    sourceMode: "dld_dubai_pulse_snapshot",
    limitations: [
      "Snapshot/manual import only; no live official DLD feed is connected.",
      caveat
    ]
  };
});

const normalized = {
  generatedAt,
  version: "1.4",
  source: {
    id: "dld-dubai-pulse-transactions",
    name: "DLD / Dubai Pulse market snapshot",
    status: inputStatus(inputFile),
    sourceType: "official-open-data",
    accessMode: "snapshot",
    disclaimer: "DLD / Dubai Pulse snapshot context; not a live official transactional feed."
  },
  quality: {
    status: notes.some((note) => note.severity === "error") ? "issues_found" : "ok",
    notes,
    caveat
  },
  areas
};

ensureDir(outputPath);
writeFileSync(outputPath, JSON.stringify(normalized, null, 2));
writeFileSync(qualityPath, JSON.stringify({ generatedAt, status: "ok", inputFile, rowsRead: rawRows.length, areasWritten: areas.length, notes, caveat }, null, 2));
updateManifest(areas.length, generatedAt, inputFile);
console.log(`DLD / Dubai Pulse snapshot normalized: ${areas.length} areas.`);
