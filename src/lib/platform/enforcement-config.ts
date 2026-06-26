export type GeoAIAccessEnforcementMode = "soft" | "hard";

function boolEnv(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function getProjectAccessEnforcementMode(): GeoAIAccessEnforcementMode {
  return process.env.GEOAI_ACCESS_ENFORCEMENT_MODE?.trim().toLowerCase() === "hard"
    ? "hard"
    : "soft";
}

export function getEnforcementConfig() {
  return {
    accessEnforcementMode: getProjectAccessEnforcementMode(),
    requireSupabaseReady: boolEnv("GEOAI_REQUIRE_SUPABASE_READY", false),
    requireStorageReady: boolEnv("GEOAI_REQUIRE_STORAGE_READY", false),
    allowDemoPublic: boolEnv("GEOAI_ALLOW_DEMO_PUBLIC", true),
    allowSupabaseMigrationApply: boolEnv("GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY", false),
    allowStorageWriteTest: boolEnv("GEOAI_ALLOW_STORAGE_WRITE_TEST", false)
  };
}
