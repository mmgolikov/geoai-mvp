export const sourceDataModes = [
  "real_snapshot",
  "imported_snapshot",
  "sample_fallback",
  "manual_import_ready",
  "permission_required",
  "planned_validation",
  "demo_seed"
] as const;

export type SourceDataMode = (typeof sourceDataModes)[number];

export function normalizeSourceDataMode(value: unknown): SourceDataMode {
  const key = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");

  if (sourceDataModes.includes(key as SourceDataMode)) {
    return key as SourceDataMode;
  }

  if (key === "snapshot_available" || key === "snapshot") return "imported_snapshot";
  if (key === "sample" || key === "sample_snapshot") return "sample_fallback";
  if (key === "manual_import" || key === "manual_ready") return "manual_import_ready";
  if (key === "planned" || key === "planned_access") return "planned_validation";
  if (key === "connected") return "real_snapshot";

  return "demo_seed";
}

export function sourceDataModeLabel(mode: unknown) {
  switch (normalizeSourceDataMode(mode)) {
    case "real_snapshot":
      return "Real snapshot";
    case "imported_snapshot":
      return "Imported snapshot";
    case "sample_fallback":
      return "Sample fallback";
    case "manual_import_ready":
      return "Manual import ready";
    case "permission_required":
      return "Permission required";
    case "planned_validation":
      return "Planned validation";
    case "demo_seed":
      return "Sample seed";
  }
}
