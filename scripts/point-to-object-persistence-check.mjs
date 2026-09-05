import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const migrationName = "20260904065018_point_object_analysis_persistence_v1.sql";
const migration = await readFile(path.join(root, "supabase", "migrations", migrationName), "utf8");
const route = await readFile(
  path.join(root, "app", "api", "prototype", "point-to-object", "analysis-runs", "route.ts"),
  "utf8"
);
const repository = await readFile(
  path.join(root, "src", "lib", "prototype", "point-object-analysis-runs.ts"),
  "utf8"
);
const gate = await readFile(
  path.join(root, "src", "lib", "prototype", "point-object-persistence-gate.ts"),
  "utf8"
);
const deactivation = await readFile(
  path.join(root, "supabase", "operator", "point_object_analysis_persistence_v1_deactivation.sql"),
  "utf8"
);
const routeInventory = await readFile(path.join(root, "security", "api-route-access.json"), "utf8");
const ledger = JSON.parse(
  await readFile(path.join(root, "supabase", "migration-ledger-baseline.json"), "utf8")
);
const failures = [];

function requirePattern(text, pattern, message) {
  if (!pattern.test(text)) failures.push(message);
}

function rejectPattern(text, pattern, message) {
  if (pattern.test(text)) failures.push(message);
}

requirePattern(gate, /environment\s*!==\s*"preview"/, "Persistence gate is not fail-closed outside Preview");
requirePattern(
  gate,
  /GEOAI_ALLOW_POINT_OBJECT_PREVIEW_PERSISTENCE/,
  "Dedicated Preview persistence operator flag is missing"
);
rejectPattern(gate, /requestScopedSupabaseRepositoriesEnabled|GEOAI_ALLOW_SUPABASE_REPOSITORIES/, "Persistence gate reuses a global repository switch");

requirePattern(route, /readBoundedJson\(request,\s*768\s*\*\s*1024\)/, "POST body does not have an explicit byte limit");
requirePattern(route, /privateNoStoreJson/, "Private analysis history is not marked private/no-store");
requirePattern(route, /`point-object:\$\{crypto\.randomUUID\(\)\}`/, "Run identifiers are not generated server-side");
requirePattern(route, /action:\s*"analysis\.read"/, "GET does not request analysis.read authorization");
requirePattern(route, /action:\s*"analysis\.run"/, "POST does not request analysis.run authorization");

requirePattern(repository, /createRequestAuthContext\(input\.request\)/, "Repository path does not use request-scoped Auth");
requirePattern(repository, /headers\.has\("authorization"\)/, "Bearer and mixed credential transport is not rejected");
requirePattern(repository, /schema\("api"\)[\s\S]*rpc\("current_project_access"/, "Caller membership is not projected by api.current_project_access");
requirePattern(repository, /roleAllowsAction\(role,\s*input\.action\)/, "Role/action authorization is missing");
requirePattern(repository, /rpc\("upsert_point_object_analysis_run"/, "Caller-scoped persistence RPC is missing");
requirePattern(repository, /rpc\("list_point_object_analysis_runs"/, "Caller-owned history RPC is missing");
rejectPattern(repository, /getSupabaseServerClient|SUPABASE_SERVICE_ROLE_KEY|\.from\(["']analysis_runs["']\)/, "Repository bypasses the request-scoped API facade");
rejectPattern(repository, /111-111-111|service_role/, "Repository contains a universal credential or service-role path");

requirePattern(migration, /identity authorization prerequisite is missing/, "Migration does not fail closed without the identity foundation");
requirePattern(migration, /analysis_runs role policies are missing/, "Migration does not require the role-policy foundation");
requirePattern(migration, /as restrictive for select to authenticated/i, "Caller ownership does not restrict SELECT RLS");
requirePattern(migration, /as restrictive for insert to authenticated/i, "Caller ownership does not restrict INSERT RLS");
requirePattern(migration, /created_by\s*=\s*geoai_private\.current_profile_id\(\)/i, "RLS does not derive row ownership from the Auth-backed profile");
requirePattern(migration, /project_membership\.role in \('owner', 'admin', 'analyst'\)/i, "Write RPC does not enforce analyst-or-higher role");
requirePattern(migration, /security definer[\s\S]*set search_path = ''/i, "Private RPC is not hardened with an empty search path");
requirePattern(migration, /security invoker/i, "Exposed api wrapper is not SECURITY INVOKER");
requirePattern(migration, /pg_column_size\(target_result_json\) > 524288/, "Result JSON is not bounded in the database");
requirePattern(migration, /on conflict \(run_key\)[\s\S]*analysis_runs\.created_by = actor_profile_id/i, "Upsert conflict path is not owner-bound");
requirePattern(migration, /grant execute on function api\.upsert_point_object_analysis_run[\s\S]*to authenticated/i, "Write RPC is not granted narrowly to authenticated");
rejectPattern(migration, /grant\s+(?:all|select|insert|update|delete)[^;]*on\s+(?:table\s+)?public\.analysis_runs/i, "Migration grants direct analysis_runs table access");
rejectPattern(migration, /111-111-111/, "Migration contains a universal password");
requirePattern(deactivation, /drop function if exists api\.upsert_point_object_analysis_run/i, "Deactivation draft does not remove the exposed write RPC");
requirePattern(deactivation, /Intentionally retained:[\s\S]*public\.analysis_runs data/i, "Deactivation draft does not preserve stored analysis rows explicitly");
rejectPattern(deactivation, /delete\s+from\s+public\.analysis_runs|truncate\s+(?:table\s+)?public\.analysis_runs/i, "Deactivation draft deletes persisted analysis data");

const pending = ledger.pendingMigrations ?? [];
if (!pending.some((entry) => entry.version === "20260904065018" && entry.name === "point_object_analysis_persistence_v1")) {
  failures.push("Generated migration is not tracked as a blocked development-only pending migration");
}

const inventory = JSON.parse(routeInventory);
const persistenceRoute = inventory.routes?.["/api/prototype/point-to-object/analysis-runs"];
if (persistenceRoute?.GET?.action !== "analysis.read" || persistenceRoute?.POST?.action !== "analysis.run") {
  failures.push("API access inventory does not declare read/run authorization for the new route");
}

if (failures.length > 0) {
  console.error("Point-to-object persistence contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Point-to-object persistence contract passed: ${migrationName} is Preview-only, caller-scoped, role/ownership-bound, JSON-bounded, API-RPC-only and tracked as blocked from hosted apply.`
);
