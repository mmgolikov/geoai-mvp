import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
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

const FIELD_ALIASES = {
  areaId: ["area_id", "areaid", "area_code", "area_number", "municipality_number"],
  areaName: ["area_name_en", "area_name", "area", "community", "community_name", "location", "master_project_en", "master_project", "project_name_en", "project_name"],
  date: ["transaction_date", "instance_date", "procedure_date", "registration_date", "contract_start_date", "start_date", "valuation_date", "creation_date", "license_start_date", "issue_date", "request_date", "completion_date", "date"],
  amount: ["actual_worth", "transaction_value", "property_total_value", "contract_amount", "annual_amount", "valuation_amount", "actual_value", "project_value", "amount", "value_aed"],
  size: ["procedure_area", "actual_area", "property_size", "transaction_size", "area_sqm", "property_size_sqm", "property_size_sqft", "area_sqft", "built_up_area"],
  propertyType: ["property_type_en", "property_type", "property_sub_type_en", "property_sub_type", "land_type_en", "land_type", "unit_type_en", "unit_type"],
  eventType: ["transaction_group_en", "transaction_group", "transaction_type_en", "transaction_type", "procedure_name_en", "procedure_name", "registration_type_en", "registration_type", "project_status", "status_en", "status", "license_type", "permit_type", "map_type_en", "map_type"],
  primaryId: ["transaction_id", "transaction_number", "contract_id", "project_id", "project_number", "valuation_id", "procedure_number", "land_id", "building_id", "unit_id", "broker_id", "broker_number", "developer_id", "developer_number", "office_id", "license_id", "permit_id", "request_id", "id"],
};

function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function ensureDir(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function saveJson(path, value) {
  ensureDir(path);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendJsonl(path, value) {
  ensureDir(path);
  writeFileSync(path, `${JSON.stringify(value)}\n`, { encoding: "utf8", flag: "a" });
}

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function safeFilename(value) {
  return String(value ?? "dataset.csv")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "dataset.csv";
}

function firstField(headers, aliases) {
  return aliases.find((name) => headers.includes(name)) ?? null;
}

function parseNumber(value) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/,/g, "")
    .replace(/[^0-9.+-]/g, "");
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
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function rowHash(record) {
  const stable = Object.keys(record)
    .sort()
    .map((key) => `${key}=${record[key] ?? ""}`)
    .join("\u001f");
  return createHash("sha256").update(stable).digest("hex");
}

function sanitizeRecord(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !PII_FIELD_PATTERN.test(key)),
  );
}

function shouldPersistSanitizedRows(dataset, byteSize) {
  if (dataset.family === "lookups" || dataset.family === "indices") return true;
  if (dataset.family === "projects") return true;
  return byteSize <= 15 * 1024 * 1024;
}

async function* parseCsvRows(path) {
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
        } else {
          cell += char;
        }
      }
    }
  }

  for await (const chunk of createReadStream(path)) {
    yield* consume(decoder.decode(chunk, { stream: true }));
  }
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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildCandidateUrls(dataset) {
  const file = safeFilename(dataset.observedFileName || `${dataset.datasetId}.csv`);
  const variants = unique([
    file,
    file.toLowerCase(),
    file.replace(/\s+/g, "_"),
    file.replace(/\s+/g, "_").toLowerCase(),
  ]);
  const urls = [];
  if (dataset.downloadPath) {
    if (/^https?:\/\//i.test(dataset.downloadPath)) urls.push(dataset.downloadPath);
    else for (const base of SOURCE_BASES) urls.push(`${base}${dataset.downloadPath}`);
  }
  if (dataset.resourceId) {
    const packageRefs = unique([dataset.packageId, dataset.datasetId]);
    for (const base of SOURCE_BASES) {
      for (const packageRef of packageRefs) {
        for (const name of variants) {
          urls.push(`${base}/dataset/${packageRef}/resource/${dataset.resourceId}/download/${encodeURIComponent(name)}`);
        }
      }
    }
  }
  return unique(urls);
}

async function discoverUrlsFromPage(dataset) {
  const urls = [];
  const pagePaths = unique([
    dataset.catalogPath,
    dataset.datasetId ? `/data/${dataset.datasetId}` : null,
  ]);
  for (const base of SOURCE_BASES) {
    for (const path of pagePaths) {
      if (!path) continue;
      const pageUrl = /^https?:\/\//i.test(path) ? path : `${base}${path}`;
      try {
        const response = await fetch(pageUrl, {
          redirect: "follow",
          headers: {
            "user-agent": "GeoAI-DLD-Demo-Ingestion/1.0 (+source-backed demo; permission recorded)",
            accept: "text/html,application/xhtml+xml",
          },
        });
        if (!response.ok) continue;
        const html = await response.text();
        const absolute = html.match(/https?:\/\/[^"'<>\s]+\/dataset\/[^"'<>\s]+\/resource\/[0-9a-f-]+\/download\/[^"'<>\s]+/gi) ?? [];
        const relative = [...html.matchAll(/(?:href|data-url)=["']([^"']*\/dataset\/[^"']+\/resource\/[0-9a-f-]+\/download\/[^"']+)["']/gi)]
          .map((match) => match[1]);
        urls.push(...absolute);
        urls.push(...relative.map((value) => new URL(value, pageUrl).href));
      } catch {
        // Continue to deterministic candidates.
      }
    }
  }
  return unique(urls);
}

async function downloadDataset(dataset, tempRoot) {
  const candidates = unique([
    ...buildCandidateUrls(dataset),
    ...(await discoverUrlsFromPage(dataset)),
  ]);
  const attempts = [];
  for (const url of candidates) {
    const tempPath = join(tempRoot, `${dataset.datasetId}-${safeFilename(dataset.observedFileName || "data.csv")}`);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0 GeoAI-DLD-Demo-Ingestion/1.0",
          accept: "text/csv,application/csv,text/plain,application/octet-stream,*/*",
          referer: "https://www.dubaipulse.gov.ae/",
        },
      });
      const contentType = response.headers.get("content-type") ?? "";
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      attempts.push({ url, status: response.status, contentType, contentLength, finalUrl: response.url });
      if (!response.ok || !response.body) continue;
      ensureDir(tempPath);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(tempPath));
      const stat = statSync(tempPath);
      const prefix = readFileSync(tempPath, { encoding: "utf8", flag: "r" }).slice(0, 300).toLowerCase();
      const looksHtml = contentType.includes("text/html") || prefix.includes("<!doctype html") || prefix.includes("<html") || prefix.includes("request rejected");
      if (looksHtml || stat.size < 2) {
        rmSync(tempPath, { force: true });
        continue;
      }
      return {
        ok: true,
        path: tempPath,
        url,
        finalUrl: response.url,
        contentType,
        contentLength: contentLength || stat.size,
        attempts,
      };
    } catch (error) {
      attempts.push({ url, error: error instanceof Error ? error.message : String(error) });
      rmSync(tempPath, { force: true });
    }
  }
  return { ok: false, attempts };
}

async function profileAndAggregate(dataset, filePath, receipt, outRoot) {
  let sourceHeaders = null;
  let headers = null;
  let rowCount = 0;
  let malformedRows = 0;
  let unknownAreaRows = 0;
  let unknownMonthRows = 0;
  let minMonth = null;
  let maxMonth = null;
  const columnProfile = {};
  const areaMap = new Map();
  const groups = new Map();
  const categoricalTotals = new Map();
  const sanitizedPath = join(outRoot, "sanitized", `${dataset.datasetId}.jsonl`);
  const persistRows = shouldPersistSanitizedRows(dataset, receipt.byteSize);
  if (existsSync(sanitizedPath)) rmSync(sanitizedPath, { force: true });

  let detected = null;
  for await (const values of parseCsvRows(filePath)) {
    if (!headers) {
      sourceHeaders = values.map((value) => String(value).replace(/^\uFEFF/, "").trim());
      headers = sourceHeaders.map(normalizeHeader);
      if (headers.some((value) => !value) || new Set(headers).size !== headers.length) {
        throw new Error("invalid or duplicate normalized CSV headers");
      }
      for (const header of headers) columnProfile[header] = { nullCount: 0, maxObservedLength: 0 };
      detected = Object.fromEntries(
        Object.entries(FIELD_ALIASES).map(([key, aliases]) => [key, firstField(headers, aliases)]),
      );
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
      const area = areaMap.get(areaKey) ?? {
        sourceAreaId: areaId || null,
        sourceAreaName: areaName || null,
        datasetIds: new Set(),
        recordCount: 0,
      };
      area.datasetIds.add(dataset.datasetId);
      area.recordCount += 1;
      areaMap.set(areaKey, area);
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
      propertyTypeCounts: {},
      eventTypeCounts: {},
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
    if (propertyType) group.propertyTypeCounts[propertyType] = (group.propertyTypeCounts[propertyType] ?? 0) + 1;
    if (eventType) group.eventTypeCounts[eventType] = (group.eventTypeCounts[eventType] ?? 0) + 1;
    groups.set(groupKey, group);

    for (const [kind, value] of [["propertyType", propertyType], ["eventType", eventType]]) {
      if (!value) continue;
      const key = `${kind}\u0000${value}`;
      categoricalTotals.set(key, (categoricalTotals.get(key) ?? 0) + 1);
    }

    if (persistRows) {
      const sanitized = sanitizeRecord(record);
      appendJsonl(sanitizedPath, {
        datasetId: dataset.datasetId,
        sourceRowHash: rowHash(sanitized),
        fields: sanitized,
        caveat: CAVEAT,
      });
    }
  }

  if (!headers || rowCount === 0) throw new Error("CSV contains no data rows");

  const areaRows = [...areaMap.entries()].map(([stableKey, value]) => ({
    stableKey,
    sourceAreaId: value.sourceAreaId,
    sourceAreaName: value.sourceAreaName,
    datasetIds: [...value.datasetIds],
    recordCount: value.recordCount,
  }));
  const metricRows = [...groups.values()].map((group) => ({
    ...group,
    amountTotal: group.amountCount ? Number(group.amountTotal.toFixed(2)) : null,
    amountAverage: group.amountCount ? Number((group.amountTotal / group.amountCount).toFixed(4)) : null,
    sizeTotal: group.sizeCount ? Number(group.sizeTotal.toFixed(4)) : null,
    sizeAverage: group.sizeCount ? Number((group.sizeTotal / group.sizeCount).toFixed(4)) : null,
    amountPerAreaAverage: group.amountPerAreaCount ? Number((group.amountPerAreaTotal / group.amountPerAreaCount).toFixed(4)) : null,
    amountPerAreaTotal: undefined,
  }));

  const datasetDir = join(outRoot, "datasets", dataset.datasetId);
  saveJson(join(datasetDir, "schema.json"), {
    datasetId: dataset.datasetId,
    sourceHeaders,
    normalizedHeaders: headers,
    detectedFields: detected,
    columnProfile,
  });
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
  for (const row of areaRows) appendJsonl(join(outRoot, "dimensions", "areas.jsonl"), { datasetId: dataset.datasetId, ...row });
  for (const row of metricRows) appendJsonl(join(outRoot, "features", "dataset_area_month.jsonl"), row);
  for (const [key, count] of categoricalTotals) {
    const [kind, value] = key.split("\u0000");
    appendJsonl(join(outRoot, "features", "dataset_categories.jsonl"), {
      datasetId: dataset.datasetId,
      family: dataset.family,
      categoryKind: kind,
      categoryValue: value,
      recordCount: count,
    });
  }

  return {
    rowCount,
    malformedRows,
    unknownAreaRows,
    unknownMonthRows,
    minMonth,
    maxMonth,
    areaCount: areaRows.length,
    aggregateRowCount: metricRows.length,
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
if (permission.status !== "approved_demo_only") throw new Error("Approved demo permission receipt is required");

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });
mkdirSync(tempRoot, { recursive: true });

const selected = (catalog.datasets ?? []).filter((dataset) => filter.size === 0 || filter.has(dataset.datasetId));
if (selected.length === 0) throw new Error("No datasets selected");

const startedAt = new Date().toISOString();
const results = [];
for (const dataset of selected) {
  console.log(`DLD demo ingestion: ${dataset.datasetId}`);
  const downloaded = await downloadDataset(dataset, tempRoot);
  if (!downloaded.ok) {
    results.push({
      datasetId: dataset.datasetId,
      family: dataset.family,
      status: "download_failed",
      attempts: downloaded.attempts,
    });
    continue;
  }

  const byteSize = statSync(downloaded.path).size;
  const contentSha256 = await sha256File(downloaded.path);
  const receipt = {
    datasetId: dataset.datasetId,
    family: dataset.family,
    sourceUrl: downloaded.url,
    finalUrl: downloaded.finalUrl,
    observedFileName: dataset.observedFileName,
    retrievedAt: new Date().toISOString(),
    byteSize,
    contentSha256,
    contentType: downloaded.contentType,
    permissionReceipt: permissionPath,
    rawSnapshotRetainedInArtifact: false,
    processingMode: "all_rows_streamed_privacy_minimized_demo_aggregation",
    caveat: CAVEAT,
  };
  saveJson(join(outRoot, "receipts", `${dataset.datasetId}.json`), receipt);

  try {
    const profile = await profileAndAggregate(dataset, downloaded.path, receipt, outRoot);
    results.push({
      datasetId: dataset.datasetId,
      family: dataset.family,
      status: "parsed",
      byteSize,
      contentSha256,
      sourceUrl: downloaded.url,
      ...profile,
    });
  } catch (error) {
    results.push({
      datasetId: dataset.datasetId,
      family: dataset.family,
      status: "parse_failed",
      byteSize,
      contentSha256,
      sourceUrl: downloaded.url,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    rmSync(downloaded.path, { force: true });
  }
}
rmSync(tempRoot, { recursive: true, force: true });

const parsed = results.filter((result) => result.status === "parsed");
const manifest = {
  manifestVersion: "1.0",
  startedAt,
  finishedAt: new Date().toISOString(),
  permissionStatus: permission.status,
  permissionScope: "demo_only",
  catalogPath,
  permissionPath,
  selectedDatasetCount: selected.length,
  parsedDatasetCount: parsed.length,
  failedDatasetCount: results.length - parsed.length,
  totalRowsParsed: parsed.reduce((sum, result) => sum + result.rowCount, 0),
  totalBytesParsed: parsed.reduce((sum, result) => sum + result.byteSize, 0),
  scoringActivation: "not_automatic; database load and model approval remain separate",
  results,
  caveat: CAVEAT,
};
saveJson(join(outRoot, "manifest.json"), manifest);
console.log(JSON.stringify({
  selectedDatasetCount: manifest.selectedDatasetCount,
  parsedDatasetCount: manifest.parsedDatasetCount,
  failedDatasetCount: manifest.failedDatasetCount,
  totalRowsParsed: manifest.totalRowsParsed,
  totalBytesParsed: manifest.totalBytesParsed,
}, null, 2));

if (parsed.length === 0) process.exit(2);
