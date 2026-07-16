import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sampleDir = path.join(rootDir, "data", "samples");
const outputDir = path.join(rootDir, "data", "normalized");

const files = {
  transactions: path.join(sampleDir, "dld_transactions_sample.csv"),
  rents: path.join(sampleDir, "dld_rents_sample.csv"),
  projects: path.join(sampleDir, "dld_projects_sample.csv")
};

const aliases = {
  transactionDate: ["transaction_date", "transaction date", "instance_date", "procedure_date", "date"],
  transactionType: ["transaction_type", "procedure_type", "procedure type", "transaction type"],
  propertyType: ["property_type", "property type", "propertytype"],
  propertySubType: ["property_sub_type", "property sub type", "property_subtype", "property subtype"],
  areaName: ["area", "area_name", "area name", "location", "location_name"],
  projectName: ["project", "project_name", "project name"],
  masterProjectName: ["master_project", "master project", "master_project_name"],
  propertyUsage: ["property_usage", "property usage", "usage"],
  amountAed: ["amount", "transaction_value", "transaction value", "value_aed", "value aed", "price"],
  sizeSqm: ["property_size_sqm", "transaction_size_sqm", "size_sqm", "size", "property size sq m", "property size sqm", "property size (sq.m)"],
  rooms: ["rooms", "bedrooms", "beds"],
  freehold: ["is_freehold", "freehold", "ownership"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lng", "lon"],
  contractStartDate: ["contract_start_date", "contract start date", "start_date", "start date"],
  contractEndDate: ["contract_end_date", "contract end date", "end_date", "end date"],
  annualRentAed: ["annual_amount", "annual amount", "rent_value", "rent value", "annual_rent", "annual rent"],
  developerName: ["developer", "developer_name", "developer name"],
  projectStatus: ["project_status", "project status", "status"],
  completionDate: ["completion_date", "completion date", "expected_completion", "handover_date"],
  projectType: ["project_type", "project type"],
  units: ["units", "unit_count", "number_of_units", "number of units"]
};

function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/[\uFEFF]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function parseCsv(content) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const [headers, ...body] = rows.filter((item) => item.some((cell) => cell.trim().length > 0));
  if (!headers) return [];

  return body.map((cells) => headers.reduce((record, header, index) => {
    record[header.trim()] = (cells[index] ?? "").trim();
    return record;
  }, {}));
}

function mapHeaders(rows) {
  const headers = Object.keys(rows[0] ?? {});
  const normalizedHeaders = headers.map(normalizeHeader);
  const mapping = new Map();

  Object.entries(aliases).forEach(([field, values]) => {
    const candidates = new Set(values.map(normalizeHeader));
    const index = normalizedHeaders.findIndex((header) => candidates.has(header));
    if (index >= 0) mapping.set(field, headers[index]);
  });

  return mapping;
}

function read(row, mapping, field) {
  const key = mapping.get(field);
  return key ? row[key] ?? "" : "";
}

function parseNumber(value) {
  const normalized = String(value ?? "").replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function text(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed.replace(/\s+/g, " ") : null;
}

function bool(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["yes", "true", "1", "freehold"].includes(normalized)) return true;
  if (["no", "false", "0", "leasehold"].includes(normalized)) return false;
  return null;
}

function id(prefix, row, index) {
  const seed = Object.values(row).join("|").toLowerCase();
  let hash = 0;
  for (let offset = 0; offset < seed.length; offset += 1) hash = (hash * 31 + seed.charCodeAt(offset)) >>> 0;
  return `${prefix}-${index + 1}-${hash.toString(16)}`;
}

function confidence(required, record) {
  const missing = required.filter((field) => record[field] === null || record[field] === undefined || record[field] === "");
  if (missing.length === 0) return "high";
  if (missing.length === 1) return "medium";
  return "low";
}

function normalizeTransactions(rows) {
  const mapping = mapHeaders(rows);
  const warnings = [];
  const data = rows.map((row, index) => {
    const amountAed = parseNumber(read(row, mapping, "amountAed"));
    const sizeSqm = parseNumber(read(row, mapping, "sizeSqm"));
    const record = {
      id: id("dld-tx", row, index),
      source: "sample_fixture",
      sourceDataset: "dld_transactions_sample.csv",
      transactionDate: parseDate(read(row, mapping, "transactionDate")),
      transactionType: text(read(row, mapping, "transactionType")),
      areaName: text(read(row, mapping, "areaName")),
      projectName: text(read(row, mapping, "projectName")),
      masterProjectName: text(read(row, mapping, "masterProjectName")),
      propertyType: text(read(row, mapping, "propertyType")),
      propertySubType: text(read(row, mapping, "propertySubType")),
      propertyUsage: text(read(row, mapping, "propertyUsage")),
      amountAed,
      sizeSqm,
      pricePerSqm: amountAed && sizeSqm ? Math.round(amountAed / sizeSqm) : null,
      rooms: text(read(row, mapping, "rooms")),
      freehold: bool(read(row, mapping, "freehold")),
      latitude: parseNumber(read(row, mapping, "latitude")),
      longitude: parseNumber(read(row, mapping, "longitude")),
      confidence: "low",
      raw: row
    };
    record.confidence = confidence(["transactionDate", "areaName", "amountAed", "propertyType"], record);
    if (!record.areaName) warnings.push({ dataset: "transactions", rowNumber: index + 2, field: "areaName", message: "Area is missing; record kept with lower confidence." });
    return record;
  });
  return { data, warnings };
}

function normalizeRents(rows) {
  const mapping = mapHeaders(rows);
  const warnings = [];
  const data = rows.map((row, index) => {
    const annualRentAed = parseNumber(read(row, mapping, "annualRentAed"));
    const sizeSqm = parseNumber(read(row, mapping, "sizeSqm"));
    const record = {
      id: id("dld-rent", row, index),
      source: "sample_fixture",
      sourceDataset: "dld_rents_sample.csv",
      contractStartDate: parseDate(read(row, mapping, "contractStartDate")),
      contractEndDate: parseDate(read(row, mapping, "contractEndDate")),
      areaName: text(read(row, mapping, "areaName")),
      propertyType: text(read(row, mapping, "propertyType")),
      propertySubType: text(read(row, mapping, "propertySubType")),
      annualRentAed,
      sizeSqm,
      rentPerSqm: annualRentAed && sizeSqm ? Math.round(annualRentAed / sizeSqm) : null,
      rooms: text(read(row, mapping, "rooms")),
      confidence: "low",
      raw: row
    };
    record.confidence = confidence(["contractStartDate", "areaName", "annualRentAed", "propertyType"], record);
    if (!record.annualRentAed) warnings.push({ dataset: "rents", rowNumber: index + 2, field: "annualRentAed", message: "Annual rent is missing or invalid; record kept with lower confidence." });
    return record;
  });
  return { data, warnings };
}

function normalizeProjects(rows) {
  const mapping = mapHeaders(rows);
  const warnings = [];
  const data = rows.map((row, index) => {
    const record = {
      id: id("dld-project", row, index),
      source: "sample_fixture",
      sourceDataset: "dld_projects_sample.csv",
      projectName: text(read(row, mapping, "projectName")),
      developerName: text(read(row, mapping, "developerName")),
      areaName: text(read(row, mapping, "areaName")),
      projectStatus: text(read(row, mapping, "projectStatus")),
      completionDate: parseDate(read(row, mapping, "completionDate")),
      projectType: text(read(row, mapping, "projectType")),
      units: parseNumber(read(row, mapping, "units")),
      confidence: "low",
      raw: row
    };
    record.confidence = confidence(["projectName", "areaName", "projectStatus"], record);
    if (!record.projectName) warnings.push({ dataset: "projects", rowNumber: index + 2, field: "projectName", message: "Project name is missing; record kept with lower confidence." });
    return record;
  });
  return { data, warnings };
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : Math.round(sorted[middle]);
}

function average(values) {
  return values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function normalized(value, max) {
  return max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
}

function sampleAwareConfidence(transactionCount) {
  if (transactionCount < 5) return "low";
  if (transactionCount <= 20) return "medium";
  return "high";
}

function capSmallSampleIndex(value, count, cap) {
  return count < 5 ? Math.min(value, cap) : value;
}

function metrics(transactions, rents, projects) {
  const areas = new Set();
  transactions.forEach((item) => item.areaName && areas.add(item.areaName));
  rents.forEach((item) => item.areaName && areas.add(item.areaName));
  projects.forEach((item) => item.areaName && areas.add(item.areaName));
  const areaList = Array.from(areas);
  const maxTx = Math.max(1, ...areaList.map((area) => transactions.filter((item) => item.areaName === area).length));
  const maxRent = Math.max(1, ...areaList.map((area) => rents.filter((item) => item.areaName === area).length));
  const maxProject = Math.max(1, ...areaList.map((area) => projects.filter((item) => item.areaName === area).length));

  return areaList.sort().map((areaName) => {
    const areaTx = transactions.filter((item) => item.areaName === areaName);
    const areaRents = rents.filter((item) => item.areaName === areaName);
    const areaProjects = projects.filter((item) => item.areaName === areaName);
    const prices = areaTx.map((item) => item.pricePerSqm).filter((value) => value !== null);
    const rentValues = areaRents.map((item) => item.rentPerSqm).filter((value) => value !== null);
    const dates = [...areaTx.map((item) => item.transactionDate), ...areaRents.map((item) => item.contractStartDate)].filter(Boolean).sort();
    const rawLiquidityIndex = normalized(areaTx.length, maxTx);
    const rawRentalDemandProxy = normalized(areaRents.length, maxRent);
    const liquidityIndex = capSmallSampleIndex(rawLiquidityIndex, areaTx.length, 55);
    const rentalDemandProxy = capSmallSampleIndex(rawRentalDemandProxy, areaRents.length, 58);
    const dataConfidence = sampleAwareConfidence(areaTx.length);

    return {
      areaName,
      periodStart: dates[0] ?? null,
      periodEnd: dates.at(-1) ?? null,
      transactionCount: areaTx.length,
      transactionValueAed: areaTx.reduce((sum, item) => sum + (item.amountAed ?? 0), 0),
      medianPricePerSqm: median(prices),
      averagePricePerSqm: average(prices),
      rentalRecordCount: areaRents.length,
      medianRentPerSqm: median(rentValues),
      projectCount: areaProjects.length,
      pipelineProxy: normalized(areaProjects.length, maxProject),
      liquidityIndex,
      rentalDemandProxy,
      dataConfidence,
      sourceSummary: areaTx.length < 5
        ? "Derived from a tiny synthetic sample CSV fixture; liquidity and demand proxies are capped and require official DLD / Dubai Pulse validation."
        : "Derived from synthetic sample CSV fixtures for DLD / Dubai Pulse ingestion prototype. Available for validation workflow; not yet live-connected or decision-grade."
    };
  });
}

function summary(records, requiredFields, warningRows) {
  const confidenceDistribution = { high: 0, medium: 0, low: 0 };
  records.forEach((record) => confidenceDistribution[record.confidence] += 1);
  const missingRequiredFieldCounts = Object.fromEntries(requiredFields.map((field) => [
    field,
    records.filter((record) => record[field] === null || record[field] === undefined || record[field] === "").length
  ]));
  return { totalRows: records.length, validRows: records.filter((record) => record.confidence !== "low").length, skippedRows: 0, warningRows, missingRequiredFieldCounts, confidenceDistribution };
}

function readCsvIfExists(filePath) {
  return existsSync(filePath) ? parseCsv(readFileSync(filePath, "utf8")) : [];
}

mkdirSync(outputDir, { recursive: true });

const tx = normalizeTransactions(readCsvIfExists(files.transactions));
const rents = normalizeRents(readCsvIfExists(files.rents));
const projects = normalizeProjects(readCsvIfExists(files.projects));
const marketMetrics = metrics(tx.data, rents.data, projects.data);
const warnings = [...tx.warnings, ...rents.warnings, ...projects.warnings];
let supabaseMode = "not_configured";

const outputs = {
  "dld_transactions_normalized.json": tx.data,
  "dld_rents_normalized.json": rents.data,
  "dld_projects_normalized.json": projects.data,
  "market_area_metrics.json": marketMetrics
};

Object.entries(outputs).forEach(([fileName, value]) => {
  writeFileSync(path.join(outputDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
});

// SOURCE-01 quarantines the legacy mutable database writer. This parser emits
// reviewed local artifacts only until immutable custody records, rights gates,
// operator identity and activation receipts are implemented.
supabaseMode = "database_write_quarantined";

const report = {
  generatedAt: new Date().toISOString(),
  sourceMode: "sample_fixture",
  liveApiConnected: false,
  supabaseMode,
  outputs: Object.keys(outputs).map((fileName) => `data/normalized/${fileName}`).concat("data/normalized/ingestion_report.json"),
  datasets: {
    transactions: summary(tx.data, ["transactionDate", "areaName", "amountAed", "propertyType"], tx.warnings.length),
    rents: summary(rents.data, ["contractStartDate", "areaName", "annualRentAed", "propertyType"], rents.warnings.length),
    projects: summary(projects.data, ["projectName", "areaName", "projectStatus"], projects.warnings.length)
  },
  marketMetricCount: marketMetrics.length,
  warnings,
  notes: [
    "Sample fixtures are synthetic parser tests, not official DLD or Dubai Pulse records.",
    "No live API calls, scraping, credentials, geometry enrichment, or decision-grade validation are performed in v0.1.",
    supabaseMode === "write_succeeded"
      ? "Supabase env detected; market area and metric rows were written on a best-effort basis."
      : supabaseMode === "write_failed"
        ? "Supabase env detected, but DB write failed; local normalized outputs were still written."
      : "Supabase not configured; wrote local normalized outputs only."
  ]
};

writeFileSync(path.join(outputDir, "ingestion_report.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log(`DLD / Dubai Pulse ingestion prototype complete.`);
console.log(`Transactions: ${tx.data.length}, rents: ${rents.data.length}, projects: ${projects.data.length}, market metrics: ${marketMetrics.length}`);
console.log("Legacy Supabase writes are quarantined; wrote local normalized outputs only.");
