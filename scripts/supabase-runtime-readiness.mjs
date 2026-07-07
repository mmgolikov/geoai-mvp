const project = {
  ref: "pphdqkurxneyagvnnjdt",
  name: "geoai-dev",
  region: "eu-west-1",
  currentPublicTable: "geoai_healthcheck"
};

const requiredTables = [
  "organizations",
  "profiles",
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

const dataHonestyCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const localFallbackCaveat = "Local/API fallback is not durable production storage.";
const storageCaveat =
  "Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.";
const publicDemoCaveat =
  "Public demo access is enabled; official validation and production access control are not configured.";

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

function restUrl(table) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!baseUrl) return null;

  const url = new URL(`/rest/v1/${table}`, baseUrl);
  url.searchParams.set("select", "*");
  url.searchParams.set("limit", "1");
  return url;
}

function readKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
}

function parseContentRange(value) {
  const match = String(value ?? "").match(/\/(\d+|\*)$/);
  if (!match || match[1] === "*") return null;
  return Number.parseInt(match[1], 10);
}

async function probeTable(name, table) {
  const url = restUrl(table);
  const key = readKey();

  if (!url || !key) {
    return {
      name,
      table,
      ready: false,
      count: null,
      status: "not_configured"
    };
  }

  try {
    const response = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact"
      }
    });

    return {
      name,
      table,
      ready: response.ok,
      count: response.ok ? parseContentRange(response.headers.get("content-range")) : null,
      status: response.ok ? "readable" : "blocked"
    };
  } catch {
    return {
      name,
      table,
      ready: false,
      count: null,
      status: "blocked"
    };
  }
}

const hasSupabaseUrl = present("NEXT_PUBLIC_SUPABASE_URL");
const hasSupabaseAnonKey = present("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const hasSupabaseServiceRoleEnv = present("SUPABASE_SERVICE_ROLE_KEY");
const hasSupabaseDbUrl = present("SUPABASE_DB_URL");
const hasSupabasePublicEnv = hasSupabaseUrl && hasSupabaseAnonKey;
const hasSupabaseServerEnv = hasSupabaseUrl && hasSupabaseServiceRoleEnv;
const hasSupabaseReadEnv = hasSupabaseUrl && (hasSupabaseAnonKey || hasSupabaseServiceRoleEnv);
const accessEnforcementMode = process.env.GEOAI_ACCESS_ENFORCEMENT_MODE?.trim().toLowerCase() === "hard" ? "hard" : "soft";
const authMode = process.env.NEXT_PUBLIC_AUTH_MODE?.trim() || "demo_public";

const [healthcheck, sourceRegistry, externalSnapshots, ...schemaChecks] = await Promise.all([
  probeTable("healthcheck", project.currentPublicTable),
  probeTable("sourceRegistry", "source_registry_snapshots"),
  probeTable("externalSnapshots", "external_data_snapshots"),
  ...requiredTables.map((table) => probeTable("requiredTable", table))
]);

const missingTables = schemaChecks.filter((item) => !item.ready).map((item) => item.table);
const schemaDetected = hasSupabaseReadEnv && missingTables.length < requiredTables.length;
const schemaReady = hasSupabaseReadEnv && missingTables.length === 0;
const postgisReady = schemaReady;
const sourceRegistryReady = sourceRegistry.ready;
const externalSnapshotsReady = externalSnapshots.ready;
const canReadHealthcheck = healthcheck.ready;
const storageReady = false;
const runtimeMode = !hasSupabaseReadEnv
  ? "local_api_fallback"
  : !canReadHealthcheck
    ? "supabase_configured_unreachable"
    : schemaReady && sourceRegistryReady && externalSnapshotsReady
      ? "supabase_read_only_ready"
      : "supabase_read_only_partial";
const repositoryMode = runtimeMode === "supabase_read_only_ready" ? "supabase" : "local_fallback";
const blockers = [];
const nextActions = [];

if (!hasSupabasePublicEnv) {
  blockers.push("Supabase public URL/anon key env is missing.");
  nextActions.push("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the target runtime.");
}

if (!hasSupabaseServiceRoleEnv) {
  blockers.push("Server-only Supabase service role env is missing; the script remains read-only and fallback-safe.");
  nextActions.push("Set SUPABASE_SERVICE_ROLE_KEY only in trusted server/Vercel environments when server-side read probes need it.");
}

if (hasSupabaseReadEnv && !canReadHealthcheck) {
  blockers.push("Supabase env is present, but geoai_healthcheck is not readable from this runtime.");
  nextActions.push("Verify Supabase URL/key scope, Data API exposure, RLS/read grants and network reachability.");
}

if (!schemaReady) {
  blockers.push(`${missingTables.length} required persistence table(s) are missing, RLS-blocked or unreachable.`);
  nextActions.push("Run npm run supabase:migrate:check and verify required tables from a trusted runtime.");
}

if (!sourceRegistryReady) {
  blockers.push("source_registry_snapshots is not readable from this runtime.");
  nextActions.push("Verify source_registry_snapshots grants/RLS or keep local source-readiness fallback active.");
}

if (!externalSnapshotsReady) {
  blockers.push("external_data_snapshots is not readable from this runtime.");
  nextActions.push("Verify external_data_snapshots grants/RLS or keep local external snapshot fallback active.");
}

if (!storageReady) {
  blockers.push("Supabase Storage readiness is not verified by this read-only script.");
  nextActions.push("Use /api/storage/health and signed URL verification before storing protected files.");
}

if (accessEnforcementMode !== "hard") {
  blockers.push("Hard access enforcement is disabled; public demo/fallback access remains active.");
  nextActions.push("Keep GEOAI_ACCESS_ENFORCEMENT_MODE=soft until Supabase Auth, memberships, RLS and storage checks are verified.");
}

const output = {
  ok: true,
  version: "1.0",
  project,
  status: runtimeMode === "supabase_read_only_ready"
    ? "read_only_ready"
    : runtimeMode === "supabase_read_only_partial"
      ? "read_only_partial"
      : runtimeMode === "supabase_configured_unreachable"
        ? "configured_unreachable"
        : "fallback_missing_env",
  runtimeMode,
  repositoryMode,
  supabaseConfigured: hasSupabaseReadEnv,
  hasSupabaseUrl,
  hasSupabasePublicEnv,
  hasSupabaseAnonKey,
  hasSupabaseServerEnv,
  hasSupabaseServiceRoleEnv,
  hasSupabaseDbUrl,
  serviceRoleMode: hasSupabaseServiceRoleEnv ? "present_read_only" : "absent",
  serviceRoleUsedForWrites: false,
  canReadHealthcheck,
  canReadSourceRegistry: sourceRegistryReady,
  canReadExternalSnapshots: externalSnapshotsReady,
  schemaDetected,
  schemaReady,
  postgisReady,
  sourceRegistryReady,
  externalSnapshotsReady,
  storageReady,
  storageReadinessMissing: !storageReady,
  localApiFallbackActive: repositoryMode !== "supabase",
  authMode,
  accessEnforcementMode,
  hardAccessEnabled: accessEnforcementMode === "hard",
  hardAccessDisabled: accessEnforcementMode !== "hard",
  requireSupabaseReady: boolEnv("GEOAI_REQUIRE_SUPABASE_READY"),
  requireStorageReady: boolEnv("GEOAI_REQUIRE_STORAGE_READY"),
  allowDemoPublic: boolEnv("GEOAI_ALLOW_DEMO_PUBLIC", true),
  readOnlyProbes: [healthcheck, sourceRegistry, externalSnapshots],
  counts: {
    sourceRegistrySnapshots: sourceRegistry.count,
    externalDataSnapshots: externalSnapshots.count
  },
  schema: {
    requiredTables,
    missingTables
  },
  readinessClaim: "not_production_ready_or_pilot_ready",
  notReadyReason: "Runtime readiness only verifies safe read probes and fallback behavior; production/pilot access controls, storage policy verification and official data validation remain incomplete.",
  blockers: unique(blockers),
  nextActions: unique(nextActions),
  caveat: dataHonestyCaveat,
  caveats: unique([
    dataHonestyCaveat,
    localFallbackCaveat,
    storageCaveat,
    publicDemoCaveat,
    "This script returns booleans, counts and status labels only; it never prints Supabase keys, JWTs, database URLs or raw env values.",
    "This script performs read-only REST probes only; it never writes, migrates, seeds, changes RLS or creates buckets."
  ]),
  generatedAt: new Date().toISOString()
};

console.log(JSON.stringify(output, null, 2));
