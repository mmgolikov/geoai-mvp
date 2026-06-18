import type { CsvRow, IngestionConfidence, IngestionWarning } from "@/src/lib/ingestion/types";

export function parseNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function parseBoolean(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["yes", "true", "1", "freehold"].includes(normalized)) {
    return true;
  }

  if (["no", "false", "0", "leasehold"].includes(normalized)) {
    return false;
  }

  return null;
}

export function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\s+/g, " ");
}

export function confidenceFromMissing(requiredFields: string[], row: Record<string, unknown>): IngestionConfidence {
  const missing = requiredFields.filter((field) => row[field] === null || row[field] === undefined || row[field] === "");

  if (missing.length === 0) {
    return "high";
  }

  if (missing.length === 1) {
    return "medium";
  }

  return "low";
}

export function countMissingFields(requiredFields: string[], rows: Record<string, unknown>[]) {
  return requiredFields.reduce<Record<string, number>>((counts, field) => {
    counts[field] = rows.filter((row) => row[field] === null || row[field] === undefined || row[field] === "").length;
    return counts;
  }, {});
}

export function createRowWarning(dataset: IngestionWarning["dataset"], rowNumber: number, field: string, message: string): IngestionWarning {
  return { dataset, rowNumber, field, message };
}

export function createStableId(prefix: string, row: CsvRow, rowIndex: number) {
  const seed = Object.values(row).join("|").toLowerCase();
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `${prefix}-${rowIndex + 1}-${hash.toString(16)}`;
}
