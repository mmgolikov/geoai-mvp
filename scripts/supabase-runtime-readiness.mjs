const project = {
  ref: "pphdqkurxneyagvnnjdt",
  name: "geoai-dev",
  region: "eu-west-1",
  metadataSource: "repository_expected_target_not_live_status",
  currentReadinessSurface: "api.healthcheck()"
};

const requiredTables = [
  "organizations",
  "profiles",
  "organization_memberships",
  "project_memberships",
  "projects",
  "aois",
  "analysis_runs",
  "reports",
  "comparison_sets",
  "uploaded_datasets",
  "data_room_assets",
  "validation_checklist_items",
  "pilot_workflows",
  "pilot_client_inputs",
  "pilot_deliverables",
  "source_registry_snapshots",
  "external_data_snapshots",
  "ai_decision_scores",
  "audit_events"
];

function present(name) {
  return Boolean(process.env[name]?.trim());
}

function boolEnv(name, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function publishableKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return value && /^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(value) ? value : null;
}

async function probeApiHealth() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = publishableKey();
  if (!baseUrl || !key) {
    return { schema: "api", rpc: "healthcheck", configured: false, reachable: false, healthy: false, status: "not_configured" };
  }
  try {
    const target = new URL(baseUrl);
    const projectRef = target.protocol === "https:"
      ? target.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)?.[1] ?? null
      : null;
    if (projectRef !== project.ref) {
      return { schema: "api", rpc: "healthcheck", configured: true, reachable: false, healthy: false, status: "target_mismatch" };
    }
    const response = await fetch(new URL("/rest/v1/rpc/healthcheck", baseUrl), {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Accept-Profile": "api",
        "Content-Profile": "api",
        "Content-Type": "application/json"
      },
      body: "{}",
      signal: AbortSignal.timeout(5_000)
    });
    if (!response.ok) return { schema: "api", rpc: "healthcheck", configured: true, reachable: false, healthy: false, status: "blocked" };
    const payload = await response.json();
    const row = Array.isArray(payload) ? payload[0] : payload;
    return { schema: "api", rpc: "healthcheck", configured: true, reachable: true, healthy: row?.healthy === true, status: "readable" };
  } catch {
    return { schema: "api", rpc: "healthcheck", configured: true, reachable: false, healthy: false, status: "blocked" };
  }
}

const hasSupabaseUrl = present("NEXT_PUBLIC_SUPABASE_URL");
const hasSupabasePublishableKey = Boolean(publishableKey());
const hasInvalidOrLegacyPublicKey = present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") && !hasSupabasePublishableKey;
const hasSupabaseServiceRoleEnv = present("SUPABASE_SERVICE_ROLE_KEY");
const hasSupabaseDbUrl = present("SUPABASE_DB_URL");
const hasSupabasePublicEnv = hasSupabaseUrl && hasSupabasePublishableKey;
const hasPrivilegedApplicationEnv = hasSupabaseServiceRoleEnv || hasSupabaseDbUrl;
const accessEnforcementMode = process.env.GEOAI_ACCESS_ENFORCEMENT_MODE?.trim().toLowerCase() === "hard" ? "hard" : "soft";
const authMode = process.env.NEXT_PUBLIC_AUTH_MODE?.trim() || "demo_public";
const healthcheck = await probeApiHealth();
const canReadHealthcheck = healthcheck.reachable && healthcheck.healthy;
const schemaReady = false;
const postgisReady = false;
const sourceRegistryReady = false;
const externalSnapshotsReady = false;
const storageReady = false;
const runtimeMode = !hasSupabasePublicEnv
  ? "local_api_fallback"
  : !canReadHealthcheck
    ? "supabase_configured_unreachable"
    : "supabase_api_reachable_unverified";
const blockers = [];
const nextActions = [];

if (!hasSupabasePublicEnv) {
  blockers.push("The expected Supabase URL and a publishable-key-shaped sb_publishable_ value are not configured.");
  nextActions.push("Set public Auth variables only after AUTH-01 target approval.");
}
if (hasInvalidOrLegacyPublicKey) {
  blockers.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not a publishable-key-shaped sb_publishable_ value; legacy anon JWTs are rejected. Shape does not prove server-side validity.");
}
if (hasPrivilegedApplicationEnv) {
  blockers.push("A privileged Supabase/database credential is present in the application runtime.");
  nextActions.push("Remove and rotate privileged Preview/Development credentials; keep GEOAI_OPERATOR_* only in a trusted terminal.");
}
if (hasSupabasePublicEnv && !canReadHealthcheck) {
  if (healthcheck.status === "target_mismatch") {
    blockers.push("Configured Supabase URL does not match the approved development project ref.");
    nextActions.push(`Set NEXT_PUBLIC_SUPABASE_URL only to the approved ${project.ref}.supabase.co target before any probe.`);
  } else {
    blockers.push("api.healthcheck() is unavailable or unhealthy.");
    nextActions.push("Expose only api and grant anon EXECUTE only on api.healthcheck(); never expose public for probes.");
  }
}
blockers.push("Base-table, PostGIS, RLS-persona and source-custody evidence is not accepted from an anonymous application probe.");
nextActions.push("Attach clean/upgrade DB-01 replay, advisor, grant and persona artifacts from the isolated operator plane.");
blockers.push("Supabase Storage readiness is not verified by this read-only script.");
if (accessEnforcementMode !== "hard") blockers.push("Hard access enforcement is disabled; public demo/fallback access remains active.");

console.log(JSON.stringify({
  ok: true,
  version: "2.0",
  project,
  status: runtimeMode === "local_api_fallback" ? "fallback_missing_env" : runtimeMode === "supabase_configured_unreachable" ? "configured_unreachable" : "api_reachable_unverified",
  runtimeMode,
  repositoryMode: "local_fallback",
  supabaseConfigured: hasSupabasePublicEnv,
  hasSupabaseUrl,
  hasSupabasePublicEnv,
  hasSupabasePublishableKey,
  hasInvalidOrLegacyPublicKey,
  hasPrivilegedApplicationEnv,
  hasSupabaseServiceRoleEnv,
  hasSupabaseDbUrl,
  serviceRoleMode: hasSupabaseServiceRoleEnv ? "prohibited_present" : "absent",
  serviceRoleUsedForWrites: false,
  canReadHealthcheck,
  canReadSourceRegistry: false,
  canReadExternalSnapshots: false,
  schemaDetected: false,
  schemaReady,
  postgisReady,
  sourceRegistryReady,
  externalSnapshotsReady,
  storageReady,
  storageReadinessMissing: true,
  localApiFallbackActive: true,
  authMode,
  accessEnforcementMode,
  hardAccessEnabled: accessEnforcementMode === "hard",
  hardAccessDisabled: accessEnforcementMode !== "hard",
  requireSupabaseReady: boolEnv("GEOAI_REQUIRE_SUPABASE_READY"),
  requireStorageReady: boolEnv("GEOAI_REQUIRE_STORAGE_READY"),
  allowDemoPublic: boolEnv("GEOAI_ALLOW_DEMO_PUBLIC", true),
  readOnlyProbes: [healthcheck],
  schema: { requiredTables, missingTables: [], unverifiedTables: requiredTables },
  readinessClaim: "not_production_ready_or_pilot_ready",
  blockers: unique(blockers),
  nextActions: unique(nextActions),
  caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
  generatedAt: new Date().toISOString()
}, null, 2));
