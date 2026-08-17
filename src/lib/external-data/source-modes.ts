export const sourceDataModes = [
  "api_context",
  "real_snapshot",
  "imported_snapshot",
  "sample_fallback",
  "manual_import_ready",
  "permission_required",
  "planned_validation",
  "demo_seed"
] as const;

export type SourceDataMode = (typeof sourceDataModes)[number];

export const sourceValidationStatuses = [
  "sample-only",
  "snapshot-not-live",
  "manual-import-ready",
  "api-context",
  "token-or-permission-required",
  "planned-validation"
] as const;

export type SourceValidationStatus = (typeof sourceValidationStatuses)[number];

export const ILLUSTRATIVE_LOCAL_SCREENING_CONTEXT_LABEL =
  "Illustrative local screening context" as const;

export function normalizeSourceDataMode(value: unknown): SourceDataMode {
  const key = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");

  if (sourceDataModes.includes(key as SourceDataMode)) {
    return key as SourceDataMode;
  }

  if (key === "snapshot_available" || key === "snapshot") return "imported_snapshot";
  if (key === "public_snapshot" || key === "open_snapshot") return "imported_snapshot";
  if (key === "sample" || key === "sample_snapshot") return "sample_fallback";
  if (key === "api" || key === "api_context" || key === "open_api") return "api_context";
  if (key === "manual_import" || key === "manual_ready") return "manual_import_ready";
  if (key === "planned" || key === "planned_access") return "planned_validation";
  if (key === "api_context_metadata" || key === "open_snapshot_metadata" || key === "metadata_query_planned") return "planned_validation";
  if (key === "connected") return "api_context";

  return "planned_validation";
}

export function sourceValidationStatusFor(status: unknown): SourceValidationStatus {
  const key = String(status ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (key === "sample_fallback") return "sample-only";
  if (key === "snapshot_available") return "snapshot-not-live";
  if (key === "manual_import_ready") return "manual-import-ready";
  if (key === "connected") return "api-context";
  if (key === "permission_required" || key === "token_required") return "token-or-permission-required";
  return "planned-validation";
}

export function sourcePresentationLabel(input: {
  dataMode?: unknown;
  status?: unknown;
  validationStatus?: unknown;
}) {
  const rawValues = [input.dataMode, input.status, input.validationStatus]
    .map((value) => String(value ?? "").trim().toLowerCase().replace(/-/g, "_"));

  if (rawValues.some((value) => value === "sample_fallback" || value === "sample_only" || value === "demo_seed")) {
    return ILLUSTRATIVE_LOCAL_SCREENING_CONTEXT_LABEL;
  }

  switch (normalizeSourceDataMode(input.dataMode ?? input.status)) {
    case "api_context":
      return "Bounded screening API context";
    case "real_snapshot":
    case "imported_snapshot":
      return "Local snapshot screening context";
    case "manual_import_ready":
      return "Local source import awaiting validation";
    case "permission_required":
      return "Source access pending approval";
    case "planned_validation":
      return "Source validation pending";
    case "sample_fallback":
    case "demo_seed":
      return ILLUSTRATIVE_LOCAL_SCREENING_CONTEXT_LABEL;
  }
}

export function sourceDataModeLabel(mode: unknown) {
  switch (normalizeSourceDataMode(mode)) {
    case "api_context":
      return "API context";
    case "real_snapshot":
      return "Real snapshot";
    case "imported_snapshot":
      return "Imported snapshot";
    case "sample_fallback":
      return ILLUSTRATIVE_LOCAL_SCREENING_CONTEXT_LABEL;
    case "manual_import_ready":
      return "Manual import ready";
    case "permission_required":
      return "Permission required";
    case "planned_validation":
      return "Planned validation";
    case "demo_seed":
      return ILLUSTRATIVE_LOCAL_SCREENING_CONTEXT_LABEL;
  }
}
