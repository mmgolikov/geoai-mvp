import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const outputPath = "data/external/normalized/market_area_metrics.real.json";
const reportPath = "data/external/normalized/dld_ingestion_report.real.json";
const manifestPath = "data/external/normalized/external_data_manifest.json";
const source = {
  id: "dld-dubai-pulse-transactions",
  name: "DLD / Dubai Pulse transactions",
  status: "snapshot_available",
  sourceType: "official-open-data",
  updateMode: "manual",
  notLiveFeed: true,
  disclaimer: "Open official dataset snapshot; not a live official transactional feed."
};
const defaultManifestSources = [
  {
    id: "dld-dubai-pulse-transactions",
    status: "manual_import_ready",
    lastUpdated: null,
    availableFiles: [],
    rowCount: 0,
    usedInAnalysis: false,
    disclaimer: "Open official dataset snapshot; not a live official transactional feed."
  },
  {
    id: "osm-geofabrik-baseline",
    status: "manual_import_ready",
    lastUpdated: null,
    availableFiles: [],
    featureCount: 0,
    usedInAnalysis: false,
    disclaimer: "Open geospatial baseline; not official municipal GIS, zoning or parcel boundary data."
  },
  {
    id: "open-meteo-climate",
    status: "connected",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Climate context from reanalysis/model data; not a site-specific engineering or insurance assessment."
  },
  {
    id: "copernicus-sentinel-catalog",
    status: "token_required",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Satellite imagery availability check only; analytics pipeline planned."
  },
  {
    id: "geodubai-municipality-validation",
    status: "planned",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Planned official validation source; not connected in this demo."
  },
  {
    id: "dld-api-gateway-validation",
    status: "permission_required",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Enterprise validation/integration path; not connected in this demo."
  }
];

function argValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
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

function pick(row, keys, aliases) {
  const normalizedAliases = aliases.map(normalizeKey);
  const key = keys.find((candidate) => normalizedAliases.includes(normalizeKey(candidate)));
  return key ? row[key] : "";
}

function toNumber(value) {
  const number = Number(String(value ?? "").replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(number) ? number : null;
}

function toDateString(value) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function median(values) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 === 0 ? (clean[middle - 1] + clean[middle]) / 2 : clean[middle];
}

function updateManifest(sourceSummary, outputExists, reportExists, areaCount, generatedAt) {
  let manifest = {
    generatedAt,
    version: "0.7",
    summary: "GeoAI Real Data Backbone v0.7 manifest.",
    sources: defaultManifestSources
  };

  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      // Keep default manifest if the existing file is malformed.
    }
  }

  const files = [
    outputExists ? outputPath : null,
    reportExists ? reportPath : null
  ].filter(Boolean);
  const nextSource = {
    id: source.id,
    status: sourceSummary.status,
    lastUpdated: generatedAt,
    availableFiles: files,
    rowCount: areaCount,
    usedInAnalysis: outputExists,
    disclaimer: source.disclaimer
  };
  const mergedDefaults = defaultManifestSources.map((defaultSource) => ({
    ...defaultSource,
    ...(Array.isArray(manifest.sources) ? manifest.sources.find((item) => item.id === defaultSource.id) : {})
  }));
  const sources = mergedDefaults.filter((item) => item.id !== source.id);

  ensureDir(manifestPath);
  writeFileSync(
    manifestPath,
    JSON.stringify({ ...manifest, generatedAt, sources: [nextSource, ...sources] }, null, 2)
  );
}

async function readInput() {
  const mode = argValue("mode") ?? "csv";
  const file = argValue("file") ?? "data/external/raw/dld/dld_transactions.csv";
  const url = argValue("url");

  if (mode === "url") {
    if (!url) {
      return {
        ok: false,
        message: "DLD/Dubai Pulse connector is configured for manual CSV snapshot. Live API/resource fetch is not enabled."
      };
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { ok: true, text: await response.text(), mode: "url", input: url };
    } catch (error) {
      return {
        ok: false,
        message: `DLD/Dubai Pulse URL fetch unavailable (${error instanceof Error ? error.message : "unknown error"}). Manual CSV snapshot remains supported.`
      };
    }
  }

  if (!existsSync(file)) {
    return {
      ok: false,
      message: "DLD/Dubai Pulse connector is configured for manual CSV snapshot. Live API/resource fetch is not enabled."
    };
  }

  return { ok: true, text: readFileSync(file, "utf8"), mode: "csv", input: file };
}

const generatedAt = new Date().toISOString();
const input = await readInput();

if (!input.ok) {
  ensureDir(reportPath);
  const report = {
    generatedAt,
    source,
    status: "unavailable",
    message: input.message,
    rowsRead: 0,
    areasWritten: 0,
    notes: [
      "No raw DLD/Dubai Pulse CSV snapshot was ingested.",
      "Existing sample/demo market metrics remain available as fallback."
    ]
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  updateManifest({ status: "manual_import_ready" }, false, true, 0, generatedAt);
  console.log(input.message);
  process.exit(0);
}

const parsedRows = parseCsv(input.text);
const headers = parsedRows[0] ?? [];
const dataRows = parsedRows.slice(1);
const headerKeys = headers.map((header) => normalizeKey(header));
const grouped = new Map();
const notes = [];

for (const values of dataRows) {
  const row = Object.fromEntries(headerKeys.map((header, index) => [header, values[index] ?? ""]));
  const keys = Object.keys(row);
  const area =
    pick(row, keys, ["area", "area_name", "master_project", "project_name", "community"]) ||
    "Unknown area";
  const amount = toNumber(pick(row, keys, ["amount", "transaction_value", "actual_worth", "property_total_value"]));
  const size = toNumber(pick(row, keys, ["property_size", "transaction_size", "procedure_area", "area_sqft", "property_size_sqft"]));
  const date = toDateString(pick(row, keys, ["transaction_date", "instance_date", "procedure_date"]));
  const pricePerSqft = amount !== null && size !== null && size > 0 ? amount / size : null;
  const current = grouped.get(area) ?? {
    areaName: area,
    transactionCount: 0,
    totalValueAED: 0,
    prices: [],
    dates: []
  };

  current.transactionCount += 1;
  if (amount !== null) current.totalValueAED += amount;
  if (pricePerSqft !== null) current.prices.push(pricePerSqft);
  if (date) current.dates.push(date);
  grouped.set(area, current);
}

const areas = Array.from(grouped.values()).map((item) => {
  const prices = item.prices;
  const dates = item.dates.sort();

  if (prices.length === 0) {
    notes.push(`${item.areaName}: price per sqft could not be calculated from available amount/size columns.`);
  }

  return {
    areaName: item.areaName,
    transactionCount: item.transactionCount,
    avgPricePerSqft: prices.length > 0 ? Number((prices.reduce((sum, value) => sum + value, 0) / prices.length).toFixed(2)) : null,
    medianPricePerSqft: prices.length > 0 ? Number(median(prices).toFixed(2)) : null,
    totalValueAED: item.totalValueAED > 0 ? Number(item.totalValueAED.toFixed(2)) : null,
    dateFrom: dates[0] ?? null,
    dateTo: dates[dates.length - 1] ?? null,
    confidence: "open-dataset-snapshot"
  };
});

const output = { source, generatedAt, areas };
const report = {
  generatedAt,
  source,
  status: "ok",
  inputMode: input.mode,
  input: input.input,
  rowsRead: dataRows.length,
  areasWritten: areas.length,
  notes
};

ensureDir(outputPath);
writeFileSync(outputPath, JSON.stringify(output, null, 2));
writeFileSync(reportPath, JSON.stringify(report, null, 2));
updateManifest(source, true, true, areas.length, generatedAt);
console.log(`DLD / Dubai Pulse snapshot ingestion complete: ${areas.length} market areas from ${dataRows.length} rows.`);
