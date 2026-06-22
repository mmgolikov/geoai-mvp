export const canonicalSourceStatuses = [
  "connected",
  "snapshot_available",
  "sample_fallback",
  "manual_import_ready",
  "token_required",
  "permission_required",
  "planned",
  "unavailable"
] as const;

export type SourceStatus = (typeof canonicalSourceStatuses)[number];

const statusAliases: Record<string, SourceStatus> = {
  connected: "connected",
  "connected-api": "connected",
  connected_api: "connected",
  snapshot_available: "snapshot_available",
  "snapshot-available": "snapshot_available",
  "connected-snapshot": "snapshot_available",
  connected_snapshot: "snapshot_available",
  sample_fallback: "sample_fallback",
  "sample-fallback": "sample_fallback",
  manual_import_ready: "manual_import_ready",
  "manual-import-ready": "manual_import_ready",
  "manual-import": "manual_import_ready",
  manual_import: "manual_import_ready",
  token_required: "token_required",
  "token-required": "token_required",
  permission_required: "permission_required",
  "permission-required": "permission_required",
  planned: "planned",
  "planned-access": "planned",
  planned_access: "planned",
  "not-configured": "planned",
  not_configured: "planned",
  unavailable: "unavailable",
  missing: "unavailable",
  "missing-input": "unavailable",
  missing_input: "unavailable"
};

export function normalizeSourceStatus(input: unknown): SourceStatus {
  const key = String(input ?? "unavailable").trim().toLowerCase();
  return statusAliases[key] ?? "unavailable";
}

export function sourceStatusToLabel(status: unknown): string {
  switch (normalizeSourceStatus(status)) {
    case "connected":
      return "API context";
    case "snapshot_available":
      return "snapshot";
    case "sample_fallback":
      return "sample fallback";
    case "manual_import_ready":
      return "manual import ready";
    case "token_required":
      return "token required";
    case "permission_required":
      return "permission required";
    case "planned":
      return "planned";
    case "unavailable":
      return "unavailable";
  }
}

export function sourceStatusToReadiness(status: unknown, hasRecords = false): SourceStatus {
  const normalized = normalizeSourceStatus(status);
  if (normalized === "unavailable" && hasRecords) return "snapshot_available";
  return normalized;
}

export function sourceStatusPriority(status: unknown): number {
  switch (normalizeSourceStatus(status)) {
    case "connected":
      return 10;
    case "snapshot_available":
      return 20;
    case "sample_fallback":
      return 30;
    case "manual_import_ready":
      return 40;
    case "token_required":
      return 50;
    case "permission_required":
      return 60;
    case "planned":
      return 70;
    case "unavailable":
      return 80;
  }
}
