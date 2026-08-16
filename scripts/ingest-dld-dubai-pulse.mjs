import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const illustrativeLabel = "Illustrative local screening context";
const outputPath = "data/external/normalized/market_area_metrics.real.json";
const reportPath = "data/external/normalized/dld_ingestion_report.real.json";
const manifestPath = "data/external/normalized/external_data_manifest.json";
const source = {
  id: "dld-dubai-pulse-transactions",
  name: "DLD / Dubai Pulse transactions",
  status: "manual_import_ready",
  sourceMode: "manual_import_ready",
  validationStatus: "manual-import-ready",
  presentationLabel: "Local source import awaiting validation",
  sourceType: "public-source-context-rights-unreviewed",
  rightsStatus: "unreviewed",
  updateMode: "manual",
  notLiveFeed: true,
  disclaimer: `Public/open snapshot context; reusable rights, custody and source validation must be confirmed. ${caveat}`
};
const dryRun = process.argv.includes("--dry-run");
const remoteAllowed = process.argv.includes("--allow-remote");
const maximumInputBytes = 10 * 1024 * 1024;
const remoteTimeoutMs = 10_000;
const allowedRemoteHosts = new Set([
  "dubailand.gov.ae",
  "www.dubailand.gov.ae",
  "dubaipulse.gov.ae",
  "www.dubaipulse.gov.ae"
]);
const allowedRemoteMediaTypes = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel"
]);
const allowedLocalRoots = [
  "data/external/dld",
  "data/external/raw/dld",
  "data/external/samples"
].map((path) => resolve(process.cwd(), path));
const defaultManifestSources = [
  {
    id: "dld-dubai-pulse-transactions",
    status: "manual_import_ready",
    lastUpdated: null,
    availableFiles: [],
    rowCount: 0,
    usedInAnalysis: false,
    disclaimer: `Public/open snapshot context; reusable rights and official/client validation are required. ${caveat}`
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
    status: "permission_required",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Open-Meteo commercial-use approval is required; no live response or snapshot is claimed."
  },
  {
    id: "copernicus-sentinel-catalog",
    status: "planned",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Public catalogue metadata path only; imagery download and analytics remain gated."
  },
  {
    id: "geodubai-municipality-validation",
    status: "planned",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Planned validation source; no connected runtime source is claimed."
  },
  {
    id: "dld-api-gateway-validation",
    status: "permission_required",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Permissioned validation path; no connected runtime source is claimed."
  }
];

function argValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sourceTruthForInput(input, recordCount) {
  const normalizedPath = String(input.input ?? "").replace(/\\/g, "/").toLowerCase();
  const sampleData = input.mode === "local_csv" && (
    normalizedPath.includes("/samples/") ||
    normalizedPath.includes("_sample.") ||
    normalizedPath.endsWith("_sample")
  );
  const smallSnapshot = Number.isSafeInteger(recordCount) && recordCount >= 0 && recordCount < 100;

  return {
    ...source,
    status: sampleData ? "sample_fallback" : "snapshot_available",
    sourceMode: sampleData ? "sample_fallback" : "imported_snapshot",
    provenanceDataMode: sampleData
      ? "sample_fallback"
      : input.mode === "remote_csv"
        ? "open_snapshot"
        : "local_snapshot",
    validationStatus: sampleData ? "sample-only" : "snapshot-not-live",
    presentationLabel: sampleData
      ? illustrativeLabel
      : input.mode === "remote_csv"
        ? "Remote snapshot awaiting provenance validation"
        : "Local snapshot screening context",
    sampleData,
    smallSnapshot,
    recordCount,
    generatedAt: null,
    extractedAt: null
  };
}

function isWithinRoot(path, root) {
  return path === root || path.startsWith(`${root}${sep}`);
}

function decodeUtf8(buffer) {
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

function assertCsvShape(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  if (!firstLine.includes(",") || text.includes("\u0000")) {
    throw new Error("Input is not a supported comma-separated UTF-8 snapshot.");
  }
}

function readLocalSnapshot(file) {
  const requestedPath = resolve(process.cwd(), file);
  if (!allowedLocalRoots.some((root) => isWithinRoot(requestedPath, root))) {
    throw new Error("Local input must remain inside an approved data/external snapshot directory.");
  }
  if (!existsSync(requestedPath)) return null;

  const canonicalPath = realpathSync(requestedPath);
  if (!allowedLocalRoots.some((root) => isWithinRoot(canonicalPath, root))) {
    throw new Error("Local input resolves outside the approved snapshot directories.");
  }
  const size = statSync(canonicalPath).size;
  if (size <= 0 || size > maximumInputBytes) {
    throw new Error(`Local input must be between 1 and ${maximumInputBytes} bytes.`);
  }
  const bytes = readFileSync(canonicalPath);
  const text = decodeUtf8(bytes);
  assertCsvShape(text);
  return {
    text,
    byteCount: bytes.byteLength,
    contentSha256: sha256(bytes),
    input: relative(process.cwd(), canonicalPath),
    mode: "local_csv"
  };
}

function validatedRemoteUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Remote snapshot URL is invalid.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== "443") ||
    !allowedRemoteHosts.has(url.hostname.toLowerCase())
  ) {
    throw new Error("Remote snapshot URL must use HTTPS on the fixed DLD / Dubai Pulse host allowlist.");
  }
  return url;
}

async function readBoundedResponse(response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumInputBytes) {
    throw new Error(`Remote snapshot exceeds the ${maximumInputBytes}-byte limit.`);
  }
  if (!response.body) throw new Error("Remote snapshot response has no body.");

  const reader = response.body.getReader();
  const chunks = [];
  let byteCount = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteCount += value.byteLength;
    if (byteCount > maximumInputBytes) {
      await reader.cancel("size_limit");
      throw new Error(`Remote snapshot exceeds the ${maximumInputBytes}-byte limit.`);
    }
    chunks.push(Buffer.from(value));
  }
  if (byteCount === 0) throw new Error("Remote snapshot response is empty.");
  return Buffer.concat(chunks, byteCount);
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
    id: sourceSummary.id,
    status: sourceSummary.status,
    sourceMode: sourceSummary.sourceMode,
    validationStatus: sourceSummary.validationStatus,
    presentationLabel: sourceSummary.presentationLabel,
    sampleData: sourceSummary.sampleData ?? false,
    smallSnapshot: sourceSummary.smallSnapshot ?? false,
    lastUpdated: generatedAt,
    availableFiles: files,
    rowCount: areaCount,
    usedInAnalysis: outputExists,
    disclaimer: sourceSummary.disclaimer
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
    if (!remoteAllowed || !url) {
      return {
        ok: false,
        message: "Remote snapshot ingestion requires both --allow-remote and an explicit --url. Local CSV remains the default path."
      };
    }

    try {
      const parsedUrl = validatedRemoteUrl(url);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), remoteTimeoutMs);
      try {
        const response = await fetch(parsedUrl, {
          signal: controller.signal,
          redirect: "error",
          headers: { Accept: "text/csv, application/csv;q=0.9" }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const mediaType = (response.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
        if (!allowedRemoteMediaTypes.has(mediaType)) {
          throw new Error(`Unsupported content type: ${mediaType || "missing"}`);
        }
        const bytes = await readBoundedResponse(response);
        const text = decodeUtf8(bytes);
        assertCsvShape(text);
        return {
          ok: true,
          text,
          mode: "remote_csv",
          input: `${parsedUrl.origin}${parsedUrl.pathname}`,
          byteCount: bytes.byteLength,
          contentSha256: sha256(bytes),
          remotePolicy: {
            host: parsedUrl.hostname.toLowerCase(),
            redirects: "rejected",
            timeoutMs: remoteTimeoutMs,
            maximumInputBytes,
            mediaType
          }
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      return {
        ok: false,
        message: `Remote DLD / Dubai Pulse snapshot was rejected (${error instanceof Error ? error.message : "unknown error"}). Local CSV remains supported.`
      };
    }
  }

  if (mode !== "csv" && mode !== "local") {
    return {
      ok: false,
      message: "Unsupported ingestion mode. Use the local CSV path or the explicitly enabled remote URL path."
    };
  }

  try {
    const local = readLocalSnapshot(file);
    if (!local) {
      return {
        ok: false,
        message: "No local DLD / Dubai Pulse CSV snapshot was found in the approved input directories."
      };
    }
    return { ok: true, ...local };
  } catch (error) {
    return {
      ok: false,
      message: `Local DLD / Dubai Pulse snapshot was rejected (${error instanceof Error ? error.message : "unknown error"}).`
    };
  }
}

const generatedAt = new Date().toISOString();
const input = await readInput();

if (!input.ok) {
  const report = {
    generatedAt,
    source,
    status: "blocked",
    dryRun,
    message: input.message,
    rowsRead: 0,
    areasWritten: 0,
    notes: [
      "No raw DLD/Dubai Pulse CSV snapshot was ingested.",
      "Existing local screening context remains unchanged."
    ],
    caveat
  };
  if (!dryRun) {
    ensureDir(reportPath);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    updateManifest(source, false, true, 0, generatedAt);
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const parsedRows = parseCsv(input.text);
const headers = parsedRows[0] ?? [];
const dataRows = parsedRows.slice(1);
const resolvedSource = sourceTruthForInput(input, dataRows.length);
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
    confidence: resolvedSource.sampleData ? "illustrative-local-screening-context" : "requires-validation"
  };
});

const output = {
  source: resolvedSource,
  generatedAt,
  sourceGeneratedAt: null,
  sourceExtractedAt: null,
  areas,
  caveat
};
const outputBytes = Buffer.from(JSON.stringify(output, null, 2));
const report = {
  generatedAt,
  source: resolvedSource,
  status: dryRun ? "dry_run" : "written",
  dryRun,
  inputMode: input.mode,
  input: input.input,
  inputByteCount: input.byteCount,
  inputContentSha256: input.contentSha256,
  rowsRead: dataRows.length,
  areasWritten: areas.length,
  normalizedByteCount: outputBytes.byteLength,
  normalizedContentSha256: sha256(outputBytes),
  remotePolicy: input.remotePolicy ?? null,
  sourceReadiness: {
    decisionUse: "blocked",
    blockers: [
      "Reusable rights and attribution review is not recorded for this ingestion.",
      "Immutable custody receipt is not recorded for this ingestion.",
      "Source review or client validation is not recorded for this ingestion."
    ]
  },
  notes,
  caveat
};

if (!dryRun) {
  ensureDir(outputPath);
  writeFileSync(outputPath, outputBytes);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  updateManifest(resolvedSource, true, true, areas.length, generatedAt);
}
console.log(JSON.stringify(report, null, 2));
