import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const approvedProjects = {
  pphdqkurxneyagvnnjdt: { name: "geoai-dev", purpose: "development" },
  bkmfcjzalcvdsdvyxpgi: { name: "geoai-auth-rehearsal", purpose: "auth_rehearsal" }
};
const projectMetadata = {
  region: "eu-west-1",
  metadataSource: "repository_approved_target_not_live_status",
  currentReadinessSurface: "api.healthcheck()"
};
const migrationPath = "supabase/migrations/20260716085854_geoai_identity_authorization_foundation_v1.sql";
const requiredTables = [
  "organizations", "profiles", "organization_memberships", "project_memberships", "projects",
  "aois", "analysis_runs", "reports", "comparison_sets", "uploaded_datasets", "data_room_assets",
  "validation_checklist_items", "pilot_workflows", "pilot_client_inputs", "pilot_deliverables",
  "source_registry_snapshots", "external_data_snapshots", "ai_decision_scores", "audit_events"
];
const requiredBuckets = ["geoai-data-room-assets", "geoai-validation-evidence", "geoai-report-exports", "geoai-aoi-imports"];

function commandExists(command) {
  return spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" }).status === 0;
}
function present(name) {
  return Boolean(process.env[name]?.trim());
}
function publishableKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return value && /^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(value) ? value : null;
}
async function probeApiHealth() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = publishableKey();
  if (!baseUrl || !key) return { schema: "api", rpc: "healthcheck", ready: false, status: "not_configured" };
  try {
    const target = new URL(baseUrl);
    const projectRef = target.protocol === "https:"
      ? target.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)?.[1] ?? null
      : null;
    const approved = projectRef && Object.hasOwn(approvedProjects, projectRef)
      ? approvedProjects[projectRef]
      : null;
    const exactHostedOrigin = projectRef
      ? `https://${projectRef}.supabase.co`
      : null;
    if (
      !approved ||
      target.origin !== exactHostedOrigin ||
      target.pathname !== "/" ||
      target.port ||
      target.username ||
      target.password ||
      target.search ||
      target.hash
    ) return { schema: "api", rpc: "healthcheck", ready: false, status: "target_mismatch", target: null };
    const response = await fetch(new URL("/rest/v1/rpc/healthcheck", baseUrl), {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "api", "Content-Profile": "api", "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(5_000)
    });
    if (!response.ok) return { schema: "api", rpc: "healthcheck", ready: false, status: response.status, target: { ref: projectRef, ...approved, ...projectMetadata } };
    const payload = await response.json();
    const row = Array.isArray(payload) ? payload[0] : payload;
    return { schema: "api", rpc: "healthcheck", ready: row?.healthy === true, status: response.status, target: { ref: projectRef, ...approved, ...projectMetadata } };
  } catch {
    return { schema: "api", rpc: "healthcheck", ready: false, status: "request_failed" };
  }
}

const env = {
  NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(publishableKey()),
  invalidOrLegacyPublicKey: present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") && !publishableKey(),
  prohibitedServiceRolePresent: present("SUPABASE_SERVICE_ROLE_KEY"),
  prohibitedDbUrlPresent: present("SUPABASE_DB_URL")
};
const migrationFileExists = existsSync(migrationPath);
const healthcheck = await probeApiHealth();
const schemaReady = false;
const blockers = [
  ...(!env.NEXT_PUBLIC_SUPABASE_URL ? ["NEXT_PUBLIC_SUPABASE_URL is not configured."] : []),
  ...(!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? ["A publishable-key-shaped sb_publishable_ value is not configured; legacy anon JWTs are rejected. Shape does not prove server-side validity."] : []),
  ...(env.prohibitedServiceRolePresent ? ["SUPABASE_SERVICE_ROLE_KEY is prohibited in the application runtime and must be rotated/removed."] : []),
  ...(env.prohibitedDbUrlPresent ? ["SUPABASE_DB_URL is prohibited in the application runtime."] : []),
  ...(!migrationFileExists ? ["Identity/authorization migration file is missing."] : []),
  ...(!healthcheck.ready && healthcheck.status === "target_mismatch" ? ["Configured Supabase URL does not match an approved exact GeoAI project ref."] : []),
  ...(!healthcheck.ready && healthcheck.status !== "target_mismatch" ? ["api.healthcheck() is not reachable and healthy through the api-only Data API surface."] : []),
  ["Base-table/PostGIS existence, grants, policies and personas require isolated DB-01 replay evidence; anonymous table probes are prohibited."]
].flat();

console.log(JSON.stringify({
  ok: true,
  project: healthcheck.target,
  approvedTargetPurposes: Object.values(approvedProjects).map((target) => target.purpose),
  env,
  localTools: { supabaseCliAvailable: commandExists("supabase"), psqlAvailable: commandExists("psql") },
  migration: { migrationFileExists, migrationPath, canApplyGuardedMigration: false, caveat: "This script reports readiness only and never applies migrations." },
  healthcheck,
  schema: { schemaReady, requiredTables, missingTables: [], unverifiedTables: requiredTables },
  storage: { requiredBuckets, caveat: "Storage requires isolated operator and real caller-JWT evidence." },
  blockers,
  nextActions: [
    ...(healthcheck.status === "target_mismatch" ? ["Set NEXT_PUBLIC_SUPABASE_URL only to an approved exact development or auth-rehearsal target."] : []),
    "Run npm run supabase:migrate:check.",
    "Apply only on an approved ephemeral/Preview target through the committed GEOAI_OPERATOR_* guard.",
    "Attach clean/upgrade replay, advisor, grant and HTTP/JWT persona artifacts before changing activation flags."
  ],
  caveat: "No Supabase keys, database URLs, or service-role secrets are printed."
}, null, 2));
