export type GeoAIAccessEnforcementMode = "soft" | "hard";

function boolEnv(name: string, fallback: boolean, invalidFallback = fallback) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  return invalidFallback;
}

export function getProjectAccessEnforcementMode(): GeoAIAccessEnforcementMode {
  const value = process.env.GEOAI_ACCESS_ENFORCEMENT_MODE?.trim().toLowerCase();
  if (!value || value === "soft") return "soft";
  return "hard";
}

export function getEnforcementConfig() {
  return {
    accessEnforcementMode: getProjectAccessEnforcementMode(),
    requireSupabaseReady: boolEnv("GEOAI_REQUIRE_SUPABASE_READY", false, true),
    requireStorageReady: boolEnv("GEOAI_REQUIRE_STORAGE_READY", false, true),
    allowDemoPublic: boolEnv("GEOAI_ALLOW_DEMO_PUBLIC", true, false),
    allowSupabaseMigrationApply: boolEnv("GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY", false),
    allowStorageWriteTest: boolEnv("GEOAI_ALLOW_STORAGE_WRITE_TEST", false)
  };
}
