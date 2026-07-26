import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { TextDecoder } from "node:util";

const CATALOG = "data/external/catalog/dld_dubai_pulse_dataset_catalog.v1.json";
const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const REQUIRED_USES = ["persist_private_raw", "transform", "internal_scoring_aggregate"];
const FIELDS = {
  area: ["area_name_en", "area_name", "community", "community_name", "master_project_en", "project_name_en", "location"],
  date: ["transaction_date", "instance_date", "procedure_date", "contract_start_date", "valuation_date", "registration_date", "completion_date", "license_start_date", "start_date", "observation_period", "index_date", "date"],
  amount: ["actual_worth", "transaction_value", "property_total_value", "contract_amount", "annual_amount", "valuation_amount", "actual_value", "amount", "value_aed"],
  size: ["procedure_area", "actual_area", "property_size", "transaction_size", "area_sqm", "property_size_sqm", "property_size_sqft", "area_sqft"]
};

const arg = (name, fallback = null) => process.argv.find((v) => v.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const stop = (message) => { console.error(`DLD snapshot preparation blocked: ${message}`); process.exit(2); };
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const save = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const header = (value) => String(value ?? "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const pick = (headers, options) => options.find((name) => headers.includes(name)) ?? null;
const number = (value) => {
  const cleaned = String(value ?? "").trim().replace(/,/g, "").replace(/[^0-9.+-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};
const validDateParts = (year, monthNumber, day = 1) => {
  if (year < 1900 || year > 2200 || monthNumber < 1 || monthNumber > 12 || day < 1 || day > 31) return false;
  const parsed = new Date(Date.UTC(year, monthNumber - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === monthNumber - 1 && parsed.getUTCDate() === day;
};
const month = (value) => {
  const text = String(value ?? "").trim();
  let match = text.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?/);
  if (match) {
    const year = Number(match[1]), monthNumber = Number(match[2]), day = Number(match[3] ?? 1);
    return validDateParts(year, monthNumber, day) ? `${year}-${String(monthNumber).padStart(2, "0")}` : null;
  }
  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (match) {
    const day = Number(match[1]), monthNumber = Number(match[2]), year = Number(match[3]);
    return validDateParts(year, monthNumber, day) ? `${year}-${String(monthNumber).padStart(2, "0")}` : null;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1900 || parsed.getUTCFullYear() > 2200) return null;
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
};
const csv = (value) => /[",\r\n]/.test(String(value ?? "")) ? `"${String(value ?? "").replace(/"/g, '""')}"` : String(value ?? "");

async function* rows(path, hash) {
  const decoder = new TextDecoder();
  let row = [], cell = "", quoted = false, pending = false, skipLf = false;
  function* consume(text) {
    for (const initial of text) {
      let char = initial, again = true;
      while (again) {
        again = false;
        if (quoted) {
          if (pending) {
            if (char === '"') { cell += '"'; pending = false; continue; }
            quoted = false; pending = false; again = true; continue;
          }
          if (char === '"') pending = true; else cell += char;
          continue;
        }
        if (skipLf) { skipLf = false; if (char === "\n") continue; }
        if (char === '"' && cell.length === 0) quoted = true;
        else if (char === ",") { row.push(cell); cell = ""; }
        else if (char === "\n" || char === "\r") {
          row.push(cell); cell = ""; if (char === "\r") skipLf = true;
          if (row.some((v) => String(v).length > 0)) yield row;
          row = [];
        } else cell += char;
      }
    }
  }
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
    yield* consume(decoder.decode(chunk, { stream: true }));
  }
  yield* consume(decoder.decode());
  if (pending) { quoted = false; pending = false; }
  if (quoted) throw new Error("unterminated quoted CSV field");
  if (cell.length || row.length) { row.push(cell); if (row.some((v) => String(v).length > 0)) yield row; }
}

const datasetId = arg("dataset"), file = arg("file"), receiptPath = arg("rights-receipt");
const catalogPath = arg("catalog", CATALOG), outArg = arg("out-dir");
if (!datasetId || !file || !receiptPath) stop("required: --dataset --file --rights-receipt");
if (/^https?:\/\//i.test(file)) stop("use a local file acquired through the approved operator process");
if (!existsSync(file)) stop(`file not found: ${file}`);

const catalog = json(catalogPath), dataset = catalog.datasets?.find((item) => item.datasetId === datasetId);
if (!dataset) stop(`unregistered dataset: ${datasetId}`);
const receipt = json(receiptPath);
if (receipt.datasetId !== datasetId || receipt.status !== "approved") stop("approved rights receipt for the selected dataset is required");
if (!receipt.approvedAt || !receipt.approvedBy || !receipt.termsReference) stop("rights receipt is incomplete");
for (const use of REQUIRED_USES) if (!receipt.permittedUses?.includes(use)) stop(`rights receipt missing permitted use: ${use}`);
if (receipt.expiryAt && new Date(receipt.expiryAt) <= new Date()) stop("rights receipt expired");
if (dataset.rightsStatus !== "permitted") stop(`catalog rightsStatus=${dataset.rightsStatus}`);
if (dataset.accessStatus !== "granted_or_public_download_verified") stop(`catalog accessStatus=${dataset.accessStatus}`);
if (dataset.custodyStatus !== "approved_private") stop(`catalog custodyStatus=${dataset.custodyStatus}`);

const generatedAt = new Date().toISOString();
const out = resolve(outArg ?? `data/external/quarantine/dld/${datasetId}/${generatedAt.replace(/[:.]/g, "-")}`);
mkdirSync(out, { recursive: true });
const hash = createHash("sha256"), profile = {}, groups = new Map();
let sourceHeaders, headers, count = 0, malformed = 0, unknownArea = 0, unknownMonth = 0;
let areaField, dateField, amountField, sizeField, minMonth, maxMonth;

try {
  for await (const values of rows(file, hash)) {
    if (!headers) {
      sourceHeaders = values.map((v) => String(v).replace(/^\uFEFF/, "").trim());
      headers = sourceHeaders.map(header);
      if (headers.some((v) => !v) || new Set(headers).size !== headers.length) throw new Error("invalid or duplicate normalized headers");
      for (const name of headers) profile[name] = { nullCount: 0, maxObservedLength: 0 };
      areaField = pick(headers, FIELDS.area); dateField = pick(headers, FIELDS.date);
      amountField = pick(headers, FIELDS.amount); sizeField = pick(headers, FIELDS.size);
      continue;
    }
    count += 1; if (values.length !== headers.length) malformed += 1;
    const record = {};
    headers.forEach((name, index) => {
      const value = String(values[index] ?? "").trim(); record[name] = value;
      if (!value) profile[name].nullCount += 1;
      profile[name].maxObservedLength = Math.max(profile[name].maxObservedLength, value.length);
    });
    const area = areaField ? record[areaField] : "";
    const period = dateField ? month(record[dateField]) : null;
    if (!area) unknownArea += 1; if (!period) unknownMonth += 1;
    if (period && (!minMonth || period < minMonth)) minMonth = period;
    if (period && (!maxMonth || period > maxMonth)) maxMonth = period;
    const amount = amountField ? number(record[amountField]) : null;
    const size = sizeField ? number(record[sizeField]) : null;
    const key = `${area || "Unknown area"}\u0000${period || "unknown"}`;
    const item = groups.get(key) ?? { area: area || "Unknown area", period: period ?? "", count: 0, amountCount: 0, amount: 0, sizeCount: 0, size: 0, ratioCount: 0, ratio: 0 };
    item.count += 1;
    if (amount !== null) { item.amountCount += 1; item.amount += amount; }
    if (size !== null && size > 0) { item.sizeCount += 1; item.size += size; if (amount !== null) { item.ratioCount += 1; item.ratio += amount / size; } }
    groups.set(key, item);
  }
} catch (error) {
  save(`${out}/quality.json`, { generatedAt, datasetId, status: "rejected", error: error.message, caveat: CAVEAT });
  stop(`CSV validation failed: ${error.message}`);
}
if (!headers || count === 0) stop("CSV has no data rows");

const digest = hash.digest("hex"), stat = statSync(file);
const columns = ["area_name", "observation_month", "record_count", "amount_count", "amount_total", "amount_average", "size_count", "size_total", "size_average", "amount_per_area_count", "amount_per_area_average"];
const output = [...groups.values()].sort((a, b) => a.area.localeCompare(b.area) || a.period.localeCompare(b.period)).map((v) => ({
  area_name: v.area, observation_month: v.period, record_count: v.count,
  amount_count: v.amountCount, amount_total: v.amountCount ? v.amount.toFixed(2) : "", amount_average: v.amountCount ? (v.amount / v.amountCount).toFixed(2) : "",
  size_count: v.sizeCount, size_total: v.sizeCount ? v.size.toFixed(4) : "", size_average: v.sizeCount ? (v.size / v.sizeCount).toFixed(4) : "",
  amount_per_area_count: v.ratioCount, amount_per_area_average: v.ratioCount ? (v.ratio / v.ratioCount).toFixed(4) : ""
}));
writeFileSync(`${out}/aggregate_feature_input.csv`, `${[columns.join(","), ...output.map((v) => columns.map((c) => csv(v[c])).join(","))].join("\n")}\n`);
save(`${out}/schema.json`, { generatedAt, datasetId, sourceHeaders, normalizedHeaders: headers, detectedFields: { areaField, dateField, amountField, sizeField }, columnProfile: profile });
const unknownAreaRate = unknownArea / count, unknownMonthRate = unknownMonth / count;
const structuralIssues = malformed > 0 || !areaField || !dateField || unknownAreaRate > 0.05 || unknownMonthRate > 0.05;
const status = structuralIssues ? "quarantined_with_schema_issues" : "quarantined_pending_acceptance";
const aggregateMethod = "Quarantine-only simple averages; production medians, percentiles and scenario features require an approved feature pipeline.";
save(`${out}/quality.json`, { generatedAt, datasetId, status, sourceFileName: basename(file), sourceFileByteSize: stat.size, sourceFileFullyHashed: true, contentSha256: digest, rowCount: count, aggregateRowCount: output.length, malformedRows: malformed, unknownAreaRows: unknownArea, unknownAreaRate, unknownMonthRows: unknownMonth, unknownMonthRate, minMonth: minMonth ?? null, maxMonth: maxMonth ?? null, aggregateMethod, scoringAllowed: false, evidenceUsedAllowed: false, caveat: CAVEAT });
save(`${out}/release_manifest.json`, { manifestVersion: "1.0", generatedAt, datasetId, provider: catalog.provider, sourceFileName: basename(file), sourceFileByteSize: stat.size, sourceFileFullyHashed: true, contentSha256: digest, rowCount: count, rightsReceipt: { approvedAt: receipt.approvedAt, approvedBy: receipt.approvedBy, termsReference: receipt.termsReference, permittedUses: receipt.permittedUses, expiryAt: receipt.expiryAt ?? null }, custodyStatus: dataset.custodyStatus, processingStatus: status, releaseStatus: "quarantined", outputs: ["schema.json", "quality.json", "aggregate_feature_input.csv"], aggregateMethod, rawRowsPersistedByThisScript: false, scoringAllowed: false, nextRequiredGate: "quality acceptance, immutable release receipt and approved database load", caveat: CAVEAT });
console.log(JSON.stringify({ status, datasetId, outDir: out, rowCount: count, aggregateRowCount: output.length, contentSha256: digest, scoringAllowed: false }, null, 2));
