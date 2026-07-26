import { createHash } from "node:crypto";
import {
  closeSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { TextDecoder } from "node:util";

const CATALOG_PATH = "data/external/catalog/dld_dubai_pulse_dataset_catalog.v1.json";
const PERMISSION_PATH = "data/external/catalog/dld_demo_permission_receipt.2026-07-26.json";
const DEFAULT_OUT = "artifacts/dld-demo-ingestion";
const SOURCE_BASES = [
  "https://www.dubaipulse.gov.ae",
  "https://gslb.dubaipulse.gov.ae",
  "https://www.gslb.dubaipulse.gov.ae",
];
const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const PII_FIELD_PATTERN = /(phone|mobile|fax|email|website|passport|emirates|nationality|buyer|seller|tenant|owner_name|contact|person|chamber_of_commerce|escrow_account_number)/i;

const ALIASES = {
  areaId: ["area_id", "areaid", "area_code", "area_number", "municipality_number"],
  areaName: ["area_name_en", "area_name", "area", "community", "community_name", "location", "master_project_en", "master_project", "project_name_en", "project_name"],
  date: ["transaction_date", "instance_date", "procedure_date", "registration_date", "contract_start_date", "start_date", "valuation_date", "creation_date", "license_start_date", "issue_date", "request_date", "completion_date", "date"],
  amount: ["actual_worth", "transaction_value", "property_total_value", "contract_amount", "annual_amount", "valuation_amount", "actual_value", "project_value", "amount", "value_aed"],
  size: ["procedure_area", "actual_area", "property_size", "transaction_size", "area_sqm", "property_size_sqm", "property_size_sqft", "area_sqft", "built_up_area"],
  propertyType: ["property_type_en", "property_type", "property_sub_type_en", "property_sub_type", "land_type_en", "land_type", "unit_type_en", "unit_type"],
  eventType: ["transaction_group_en", "transaction_group", "transaction_type_en", "transaction_type", "procedure_name_en", "procedure_name", "registration_type_en", "registration_type", "project_status", "status_en", "status", "license_type", "permit_type", "map_type_en", "map_type"],
};

const arg = (name, fallback = null) => {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};
const unique = (values) => [...new Set(values.filter(Boolean))];
const ensureDir = (path) => mkdirSync(dirname(path), { recursive: true });
const saveJson = (path, value) => {
  ensureDir(path);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const normalizeHeader = (value) => String(value ?? "")
  .replace(/^\uFEFF/, "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");
const safeFilename = (value) => String(value ?? "dataset.csv")
  .replace(/[^a-zA-Z0-9._-]+/g, "_")
  .replace(/^_+|_+$/g, "") || "dataset.csv";
const firstField = (headers, aliases) => aliases.find((name) => headers.includes(name)) ?? null;

function prefixText(path, length = 512) {
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(length);
    const bytes = readSync(fd, buffer, 0, length, 0);
    return buffer.subarray(0, bytes).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

function parseNumber(value) {
  const cleaned = String(value ?? "").trim().replace(/,/g, "").replace(/[^0-9.+-]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function parseMonth(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  let match = text.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?/);
  if (match) return `${match[1]}-${String(Number(match[2])).padStart(2, "0")}-01`;
  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (match) return `${match[3]}-${String(Number(match[2])).padStart(2, "0")}-01`;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function stableHash(record) {
  const text = Object.keys(record).sort().map((key) => `${key}=${record[key] ?? ""}`).join("\u001f");
  return createHash("sha256").update(text).digest("hex");
}

function sanitize(record) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !PII_FIELD_PATTERN.test(key)));
}

function keepSanitizedRows(dataset, byteSize) {
  return dataset.family === "lookups" || dataset.family === "indices" || dataset.family === "projects" || byteSize <= 15 * 1024 * 1024;
}

async function* csvRows(path) {
  const decoder = new TextDecoder();
  let row = [];
  let cell = "";
  let quoted = false;
  let quotePending = false;
  let skipLf = false;

  function* consume(text) {
    for (const initial of text) {
      let char = initial;
      let repeat = true;
      while (repeat) {
        repeat = false;
        if (quoted) {
          if (quotePending) {
            if (char === '"') {
              cell += '"';
              quotePending = false;
              continue;
            }
            quoted = false;
            quotePending = false;
            repeat = true;
            continue;
          }
          if (char === '"') quotePending = true;
          else cell += char;
          continue;
        }
        if (skipLf) {
          skipLf = false;
          if (char === "\n") continue;
        }
        if (char === '"' && cell.length === 0) quoted = true;
        else if (char === ",") {
          row.push(cell);
          cell = "";
        } else if (char === "\n" || char === "\r") {
          row.push(cell);
          cell = "";
          if (char === "\r") skipLf = true;
          if (row.some((value) => String(value).length > 0)) yield row;
          row = [];
        } else cell += char;
      }
    }
  }

  for await (const chunk of createReadStream(path)) yield* consume(decoder.decode(chunk, { stream: true }));
  yield* consume(decoder.decode());
  if (quotePending) {
    quoted = false;
    quotePending = false;
  }
  if (quoted) throw new Error("unterminated quoted CSV field");
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => String(value).length > 0)) yield row;
  }
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function candidateUrls(dataset) {
  const file = safeFilename(dataset.observedFileName || `${dataset.datasetId}.csv`);
  const variants = unique([file, file.toLowerCase(), file.replace(/\s+/g, "_"), file.replace(/\s+/g, "_").toLowerCase()]);
  const urls = [];
  if (dataset.downloadPath) {
    if (/^https?:\/\//i.test(dataset.downloadPath)) urls.push(dataset.downloadPath);
    else SOURCE_BASES.forEach((base) => urls.push(`${base}${dataset.downloadPath}`));
  }
  if (dataset.resourceId) {
    for (const base of SOURCE_BASES) {
      for (const packageRef of unique([dataset.packageId, dataset.datasetId])) {
        for (const name of variants) urls.push(`${base}/dataset/${packageRef}/resource/${dataset.resourceId}/download/${encodeURIComponent(name)}`);
      }
    }
  }
  return unique(urls);
}

async function pageDiscoveredUrls(dataset) {
  const found = [];
  for (const base of SOURCE_BASES) {
    for (const path of unique([dataset.catalogPath])) {
      if (!path) continue;
      const pageUrl = /^https?:\/\//i.test(path) ? path : `${base}${path}`;
      try {
        const response = await fetch(pageUrl, {
          redirect: "follow",
          headers: { "user-agent": "GeoAI-DLD-Demo-Ingestion/2.0", accept: "text/html" },
        });
        if (!response.ok) continue;
        const html = await response.text();
        const absolute = html.match(/https?:\/\/[^"'<>\s]+\/dataset\/[^"'<>\s]+\/resource\/[0-9a-f-]+\/download\/[^"'<>\s]+/gi) ?? [];
        const relative = [...html.matchAll(/(?:href|data-url)=["']([^"']*\/dataset\/[^"']+\/resource\/[0-9a-f-]+\/download\/[^"']+)["']/gi)].map((match) => match[1]);
        found.push(...absolute, ...relative.map((value) => new URL(value, pageUrl).href));
      } catch {
        // Deterministic candidates remain available.
      }
    }
  }
  return unique(found);
}

async function download(dataset, tempRoot) {
  const attempts = [];
  const urls = unique([...candidateUrls(dataset), ...(await pageDiscoveredUrls(dataset))]);
  for (const url of urls) {
    const path = join(tempRoot, `${dataset.datasetId}-${safeFilename(dataset.observedFileName || "data.csv")}`);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0 GeoAI-DLD-Demo-Ingestion/2.0",
          accept: "text/csv,application/csv,text/plain,application/octet-stream,*/*",
          referer: "https://www.dubaipulse.gov.ae/",
        },
      });
      const contentType = response.headers.get("content-type") ?? "";
      attempts.push({ url, status: response.status, contentType, finalUrl: response.url });
      if (!response.ok || !response.body) continue;
      ensureDir(path);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(path));
      const size = statSync(path).size;
      const prefix = prefixText(path).toLowerCase();
      if (size < 2 || contentType.includes("text/html") || prefix.includes("<!doctype html") || prefix.includes("<html") || prefix.includes("request rejected")) {
        rmSync(path, { force: true });
        continue;
      }
      return { ok: true, path, url, finalUrl: response.url, contentType, attempts };
    } catch (error) {
      attempts.push({ url, error: error instanceof Error ? error.message : String(error) });
      rmSync(path, { force: true });
    }
  }
  return { ok: false, attempts };
}

async function profile(dataset, filePath, byteSize, outRoot) {
  let sourceHeaders;
  let headers;
  let detected;
  let rowCount = 0;
  let malformedRows = 0;
  let unknownAreaRows = 0;
  let unknownMonthRows = 0;
  let minMonth = null;
  let maxMonth = null;
  const columnProfile = {};
  const areas = new Map();
  const groups = new Map();
  const categories = new Map();

  const persistRows = keepSanitizedRows(dataset, byteSize);
  const sanitizedPath = join(outRoot, "sanitized", `${dataset.datasetId}.jsonl`);
  let sanitizedStream = null;
  if (persistRows) {
    ensureDir(sanitizedPath);
    sanitizedStream = createWriteStream(sanitizedPath, { encoding: "utf8" });
  }

  try {
    for await (const values of csvRows(filePath)) {
      if (!headers) {
        sourceHeaders = values.map((value) => String(value).replace(/^\uFEFF/, "").trim());
        headers = sourceHeaders.map(normalizeHeader);
        if (headers.some((value) => !value) || new Set(headers).size !== headers.length) throw new Error("invalid or duplicate normalized headers");
        headers.forEach((header) => { columnProfile[header] = { nullCount: 0, maxObservedLength: 0 }; });
        detected = Object.fromEntries(Object.entries(ALIASES).map(([key, aliases]) => [key, firstField(headers, aliases)]));
        continue;
      }

      rowCount += 1;
      if (values.length !== headers.length) malformedRows += 1;
      const record = {};
      headers.forEach((header, index) => {
        const value = String(values[index] ?? "").trim();
        record[header] = value;
        if (!value) columnProfile[header].nullCount += 1;
        columnProfile[header].maxObservedLength = Math.max(columnProfile[header].maxObservedLength, value.length);
      });

      const areaId = detected.areaId ? record[detected.areaId] : "";
      const areaName = detected.areaName ? record[detected.areaName] : "";
      const areaKey = areaId || normalizeHeader(areaName) || "unknown";
      const month = detected.date ? parseMonth(record[detected.date]) : null;
      const amount = detected.amount ? parseNumber(record[detected.amount]) : null;
      const size = detected.size ? parseNumber(record[detected.size]) : null;
      const propertyType = detected.propertyType ? record[detected.propertyType] : "";
      const eventType = detected.eventType ? record[detected.eventType] : "";

      if (!areaId && !areaName) unknownAreaRows += 1;
      if (!month) unknownMonthRows += 1;
      if (month && (!minMonth || month < minMonth)) minMonth = month;
      if (month && (!maxMonth || month > maxMonth)) maxMonth = month;

      if (areaId || areaName) {
        const area = areas.get(areaKey) ?? { sourceAreaId: areaId || null, sourceAreaName: areaName || null, recordCount: 0 };
        area.recordCount += 1;
        areas.set(areaKey, area);
      }

      const groupKey = `${areaKey}\u0000${month ?? "unknown"}`;
      const group = groups.get(groupKey) ?? {
        datasetId: dataset.datasetId,
        family: dataset.family,
        sourceAreaId: areaId || null,
        sourceAreaName: areaName || null,
        observationMonth: month,
        recordCount: 0,
        amountCount: 0,
        amountTotal: 0,
        sizeCount: 0,
        sizeTotal: 0,
        amountPerAreaCount: 0,
        amountPerAreaTotal: 0,
      };
      group.recordCount += 1;
      if (amount !== null) {
        group.amountCount += 1;
        group.amountTotal += amount;
      }
      if (size !== null && size > 0) {
        group.sizeCount += 1;
        group.sizeTotal += size;
        if (amount !== null) {
          group.amountPerAreaCount += 1;
          group.amountPerAreaTotal += amount / size;
        }
      }
      groups.set(groupKey, group);

      for (const [kind, value] of [["property_type", propertyType], ["event_type", eventType]]) {
        if (!value) continue;
        const key = `${kind}\u0000${value}`;
        categories.set(key, (categories.get(key) ?? 0) + 1);
      }

      if (sanitizedStream) {
        const clean = sanitize(record);
        sanitizedStream.write(`${JSON.stringify({ datasetId: dataset.datasetId, sourceRowHash: stableHash(clean), fields: clean, caveat: CAVEAT })}\n`);
      }
    }
  } finally {
    if (sanitizedStream) await new Promise((resolvePromise, rejectPromise) => sanitizedStream.end((error) => error ? rejectPromise(error) : resolvePromise()));
  }

  if (!headers || rowCount === 0) throw new Error("CSV contains no data rows");
  const datasetDir = join(outRoot, "datasets", dataset.datasetId);
  saveJson(join(datasetDir, "schema.json"), { datasetId: dataset.datasetId, sourceHeaders, normalizedHeaders: headers, detectedFields: detected, columnProfile });
  saveJson(join(datasetDir, "quality.json"), {
    datasetId: dataset.datasetId,
    status: malformedRows === 0 ? "accepted_for_demo_aggregation" : "warning",
    rowCount,
    malformedRows,
    unknownAreaRows,
    unknownMonthRows,
    minMonth,
    maxMonth,
    sanitizedRowsPersisted: persistRows,
    piiFieldsExcludedFromSanitizedOutput: headers.filter((header) => PII_FIELD_PATTERN.test(header)),
    caveat: CAVEAT,
  });

  const areasPath = join(outRoot, "dimensions", "areas.jsonl");
  ensureDir(areasPath);
  const areaStream = createWriteStream(areasPath, { flags: "a", encoding: "utf8" });
  for (const [stableKey, area] of areas) areaStream.write(`${JSON.stringify({ datasetId: dataset.datasetId, stableKey, ...area })}\n`);
  await new Promise((resolvePromise) => areaStream.end(resolvePromise));

  const metricsPath = join(outRoot, "features", "dataset_area_month.jsonl");
  ensureDir(metricsPath);
  const metricStream = createWriteStream(metricsPath, { flags: "a", encoding: "utf8" });
  for (const group of groups.values()) {
    metricStream.write(`${JSON.stringify({
      ...group,
      amountTotal: group.amountCount ? Number(group.amountTotal.toFixed(2)) : null,
      amountAverage: group.amountCount ? Number((group.amountTotal / group.amountCount).toFixed(4)) : null,
      sizeTotal: group.sizeCount ? Number(group.sizeTotal.toFixed(4)) : null,
      sizeAverage: group.sizeCount ? Number((group.sizeTotal / group.sizeCount).toFixed(4)) : null,
      amountPerAreaAverage: group.amountPerAreaCount ? Number((group.amountPerAreaTotal / group.amountPerAreaCount).toFixed(4)) : null,
      amountPerAreaTotal: undefined,
    })}\n`);
  }
  await new Promise((resolvePromise) => metricStream.end(resolvePromise));

  const categoriesPath = join(outRoot, "features", "dataset_categories.jsonl");
  ensureDir(categoriesPath);
  const categoryStream = createWriteStream(categoriesPath, { flags: "a", encoding: "utf8" });
  for (const [key, count] of categories) {
    const [categoryKind, categoryValue] = key.split("\u0000");
    categoryStream.write(`${JSON.stringify({ datasetId: dataset.datasetId, family: dataset.family, categoryKind, categoryValue, recordCount: count })}\n`);
  }
  await new Promise((resolvePromise) => categoryStream.end(resolvePromise));

  return {
    rowCount,
    malformedRows,
    unknownAreaRows,
    unknownMonthRows,
    minMonth,
    maxMonth,
    areaCount: areas.size,
    aggregateRowCount: groups.size,
    sanitizedRowsPersisted: persistRows,
    detectedFields: detected,
  };
}

const catalogPath = arg("catalog", CATALOG_PATH);
const permissionPath = arg("permission", PERMISSION_PATH);
const outRoot = resolve(arg("out", DEFAULT_OUT));
const tempRoot = resolve(arg("temp", join(outRoot, "tmp")));
const filterText = arg("filter", process.env.DLD_DATASET_FILTER ?? "");
const filter = new Set(filterText.split(",").map((value) => value.trim()).filter(Boolean));

if (!existsSync(catalogPath)) throw new Error(`Catalog not found: ${catalogPath}`);
if (!existsSync(permissionPath)) throw new Error(`Permission receipt not found: ${permissionPath}`);
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const permission = JSON.parse(readFileSync(permissionPath, "utf8"));
if (permission.status !== "approved_demo_only") throw new Error("approved_demo_only permission receipt is required");

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });
mkdirSync(tempRoot, { recursive: true });
const selected = (catalog.datasets ?? []).filter((dataset) => filter.size === 0 || filter.has(dataset.datasetId));
if (selected.length === 0) throw new Error("No datasets selected");

const startedAt = new Date().toISOString();
const results = [];
for (const dataset of selected) {
  console.log(`Fetching ${dataset.datasetId}`);
  const result = await download(dataset, tempRoot);
  if (!result.ok) {
    results.push({ datasetId: dataset.datasetId, family: dataset.family, status: "download_failed", attempts: result.attempts });
    continue;
  }

  const byteSize = statSync(result.path).size;
  const contentSha256 = await sha256File(result.path);
  const receipt = {
    datasetId: dataset.datasetId,
    family: dataset.family,
    sourceUrl: result.url,
    finalUrl: result.finalUrl,
    observedFileName: dataset.observedFileName,
    retrievedAt: new Date().toISOString(),
    byteSize,
    contentSha256,
    contentType: result.contentType,
    permissionReceipt: permissionPath,
    rawSnapshotRetainedInArtifact: false,
    processingMode: "all_rows_streamed_privacy_minimized_demo_aggregation",
    caveat: CAVEAT,
  };
  saveJson(join(outRoot, "receipts", `${dataset.datasetId}.json`), receipt);

  try {
    const stats = await profile(dataset, result.path, byteSize, outRoot);
    results.push({ datasetId: dataset.datasetId, family: dataset.family, status: "parsed", sourceUrl: result.url, byteSize, contentSha256, ...stats });
  } catch (error) {
    results.push({ datasetId: dataset.datasetId, family: dataset.family, status: "parse_failed", sourceUrl: result.url, byteSize, contentSha256, error: error instanceof Error ? error.message : String(error) });
  } finally {
    rmSync(result.path, { force: true });
  }
}
rmSync(tempRoot, { recursive: true, force: true });

const parsed = results.filter((result) => result.status === "parsed");
const manifest = {
  manifestVersion: "2.0",
  startedAt,
  finishedAt: new Date().toISOString(),
  permissionStatus: permission.status,
  permissionScope: "demo_only",
  selectedDatasetCount: selected.length,
  parsedDatasetCount: parsed.length,
  failedDatasetCount: results.length - parsed.length,
  totalRowsParsed: parsed.reduce((sum, result) => sum + result.rowCount, 0),
  totalBytesParsed: parsed.reduce((sum, result) => sum + result.byteSize, 0),
  rawSnapshotCustody: "not retained by this workflow; checksums and source URLs recorded",
  scoringActivation: "separate database load and model approval required",
  results,
  caveat: CAVEAT,
};
saveJson(join(outRoot, "manifest.json"), manifest);
console.log(JSON.stringify({ selected: selected.length, parsed: parsed.length, failed: results.length - parsed.length, totalRowsParsed: manifest.totalRowsParsed, totalBytesParsed: manifest.totalBytesParsed }, null, 2));
if (parsed.length === 0) process.exit(2);
