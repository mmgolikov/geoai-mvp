import type { CsvRow } from "@/src/lib/ingestion/types";

export type CanonicalField =
  | "transactionDate"
  | "transactionType"
  | "propertyType"
  | "propertySubType"
  | "areaName"
  | "projectName"
  | "masterProjectName"
  | "propertyUsage"
  | "amountAed"
  | "sizeSqm"
  | "rooms"
  | "freehold"
  | "registrationType"
  | "latitude"
  | "longitude"
  | "contractStartDate"
  | "contractEndDate"
  | "annualRentAed"
  | "developerName"
  | "projectStatus"
  | "completionDate"
  | "projectType"
  | "units";

const aliases: Record<CanonicalField, string[]> = {
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
  registrationType: ["registration_type", "registration type"],
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

export function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\uFEFF]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function aliasSet(field: CanonicalField) {
  return new Set(aliases[field].map(normalizeHeader));
}

export function mapHeaders(headers: string[]) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const mapping = new Map<CanonicalField, string>();

  (Object.keys(aliases) as CanonicalField[]).forEach((field) => {
    const candidates = aliasSet(field);
    const index = normalizedHeaders.findIndex((header) => candidates.has(header));
    if (index >= 0) {
      mapping.set(field, headers[index]);
    }
  });

  return mapping;
}

export function readMappedValue(row: CsvRow, mapping: Map<CanonicalField, string>, field: CanonicalField) {
  const header = mapping.get(field);
  if (!header) {
    return "";
  }

  return row[header] ?? "";
}
