import { mapHeaders, readMappedValue } from "@/src/lib/ingestion/column-mapping";
import {
  confidenceFromMissing,
  createRowWarning,
  createStableId,
  normalizeText,
  parseBoolean,
  parseDate,
  parseNumber
} from "@/src/lib/ingestion/validators";
import type {
  CsvRow,
  IngestionWarning,
  NormalizedProject,
  NormalizedRentRecord,
  NormalizedTransaction
} from "@/src/lib/ingestion/types";

export function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
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
      if (char === "\r" && next === "\n") {
        index += 1;
      }
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
  if (!headers) {
    return [];
  }

  return body.map((cells) => {
    return headers.reduce<CsvRow>((record, header, index) => {
      record[header.trim()] = (cells[index] ?? "").trim();
      return record;
    }, {});
  });
}

export function normalizeTransactions(rows: CsvRow[], sourceDataset = "dld_transactions_sample.csv") {
  const headers = Object.keys(rows[0] ?? {});
  const mapping = mapHeaders(headers);
  const warnings: IngestionWarning[] = [];

  const data = rows.map<NormalizedTransaction>((row, index) => {
    const amountAed = parseNumber(readMappedValue(row, mapping, "amountAed"));
    const sizeSqm = parseNumber(readMappedValue(row, mapping, "sizeSqm"));
    const transaction: NormalizedTransaction = {
      id: createStableId("dld-tx", row, index),
      source: "sample_fixture",
      sourceDataset,
      transactionDate: parseDate(readMappedValue(row, mapping, "transactionDate")),
      transactionType: normalizeText(readMappedValue(row, mapping, "transactionType")),
      areaName: normalizeText(readMappedValue(row, mapping, "areaName")),
      projectName: normalizeText(readMappedValue(row, mapping, "projectName")),
      masterProjectName: normalizeText(readMappedValue(row, mapping, "masterProjectName")),
      propertyType: normalizeText(readMappedValue(row, mapping, "propertyType")),
      propertySubType: normalizeText(readMappedValue(row, mapping, "propertySubType")),
      propertyUsage: normalizeText(readMappedValue(row, mapping, "propertyUsage")),
      amountAed,
      sizeSqm,
      pricePerSqm: amountAed && sizeSqm ? Math.round(amountAed / sizeSqm) : null,
      rooms: normalizeText(readMappedValue(row, mapping, "rooms")),
      freehold: parseBoolean(readMappedValue(row, mapping, "freehold")),
      latitude: parseNumber(readMappedValue(row, mapping, "latitude")),
      longitude: parseNumber(readMappedValue(row, mapping, "longitude")),
      confidence: "low",
      raw: row
    };
    transaction.confidence = confidenceFromMissing(["transactionDate", "areaName", "amountAed", "propertyType"], transaction);

    if (!transaction.areaName) {
      warnings.push(createRowWarning("transactions", index + 2, "areaName", "Area is missing; record kept with lower confidence."));
    }

    return transaction;
  });

  return { data, warnings };
}

export function normalizeRents(rows: CsvRow[], sourceDataset = "dld_rents_sample.csv") {
  const headers = Object.keys(rows[0] ?? {});
  const mapping = mapHeaders(headers);
  const warnings: IngestionWarning[] = [];

  const data = rows.map<NormalizedRentRecord>((row, index) => {
    const annualRentAed = parseNumber(readMappedValue(row, mapping, "annualRentAed"));
    const sizeSqm = parseNumber(readMappedValue(row, mapping, "sizeSqm"));
    const rent: NormalizedRentRecord = {
      id: createStableId("dld-rent", row, index),
      source: "sample_fixture",
      sourceDataset,
      contractStartDate: parseDate(readMappedValue(row, mapping, "contractStartDate")),
      contractEndDate: parseDate(readMappedValue(row, mapping, "contractEndDate")),
      areaName: normalizeText(readMappedValue(row, mapping, "areaName")),
      propertyType: normalizeText(readMappedValue(row, mapping, "propertyType")),
      propertySubType: normalizeText(readMappedValue(row, mapping, "propertySubType")),
      annualRentAed,
      sizeSqm,
      rentPerSqm: annualRentAed && sizeSqm ? Math.round(annualRentAed / sizeSqm) : null,
      rooms: normalizeText(readMappedValue(row, mapping, "rooms")),
      confidence: "low",
      raw: row
    };
    rent.confidence = confidenceFromMissing(["contractStartDate", "areaName", "annualRentAed", "propertyType"], rent);

    if (!rent.annualRentAed) {
      warnings.push(createRowWarning("rents", index + 2, "annualRentAed", "Annual rent is missing or invalid; record kept with lower confidence."));
    }

    return rent;
  });

  return { data, warnings };
}

export function normalizeProjects(rows: CsvRow[], sourceDataset = "dld_projects_sample.csv") {
  const headers = Object.keys(rows[0] ?? {});
  const mapping = mapHeaders(headers);
  const warnings: IngestionWarning[] = [];

  const data = rows.map<NormalizedProject>((row, index) => {
    const project: NormalizedProject = {
      id: createStableId("dld-project", row, index),
      source: "sample_fixture",
      sourceDataset,
      projectName: normalizeText(readMappedValue(row, mapping, "projectName")),
      developerName: normalizeText(readMappedValue(row, mapping, "developerName")),
      areaName: normalizeText(readMappedValue(row, mapping, "areaName")),
      projectStatus: normalizeText(readMappedValue(row, mapping, "projectStatus")),
      completionDate: parseDate(readMappedValue(row, mapping, "completionDate")),
      projectType: normalizeText(readMappedValue(row, mapping, "projectType")),
      units: parseNumber(readMappedValue(row, mapping, "units")),
      confidence: "low",
      raw: row
    };
    project.confidence = confidenceFromMissing(["projectName", "areaName", "projectStatus"], project);

    if (!project.projectName) {
      warnings.push(createRowWarning("projects", index + 2, "projectName", "Project name is missing; record kept with lower confidence."));
    }

    return project;
  });

  return { data, warnings };
}
