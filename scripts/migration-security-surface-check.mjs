import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.resolve(process.cwd(), "supabase/migrations");
const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
const sql = (await Promise.all(files.map((name) => readFile(path.join(directory, name), "utf8")))).join("\n");
const createdTables = new Set(Array.from(sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi), (match) => match[1].toLowerCase()));
const rlsTables = new Set(Array.from(sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?public\.([a-z0-9_]+)\s+enable\s+row\s+level\s+security/gi), (match) => match[1].toLowerCase()));

// Tables secured by the conditional containment DO block are intentionally
// explicit because PostgreSQL cannot express ALTER TABLE IF EXISTS for every
// historical clean-replay state without dynamic SQL.
const conditionalContainment = new Set([
  "sources",
  "spatial_layers",
  "spatial_features",
  "market_areas",
  "market_metrics",
  "uploaded_dataset_records"
]);
const missing = [...createdTables].filter((table) => !rlsTables.has(table) && !conditionalContainment.has(table)).sort();
const containmentSql = await readFile(path.join(directory, "20260716000000_geoai_pre_auth_security_containment_v1.sql"), "utf8");
const missingContainment = [...conditionalContainment].filter((table) => !containmentSql.includes(`'${table}'`));
const failures = [];

if (missing.length > 0) failures.push(`Created public tables without an RLS control: ${missing.join(", ")}`);
if (missingContainment.length > 0) failures.push(`Historical tables missing containment: ${missingContainment.join(", ")}`);
if (!/revoke execute on function public\.geoai_current_profile_id\(\) from public, anon/i.test(containmentSql)) {
  failures.push("SECURITY DEFINER helper EXECUTE is not revoked from PUBLIC/anon");
}
if (/pm\.user_id\s*=\s*auth\.uid\(\)/i.test(containmentSql)) {
  failures.push("Storage containment compares profiles.id directly with auth.uid()");
}
if (/pm\.role\s+in\s*\([^)]*'(?:editor|client)'/i.test(containmentSql)) {
  failures.push("Storage containment references roles outside the canonical role enum");
}
for (const policyName of [
  "geoai source snapshots read",
  "geoai external snapshots read",
  "geoai preview demo source snapshots read",
  "geoai preview demo external snapshots read"
]) {
  if (!containmentSql.includes(`drop policy if exists \"${policyName}\"`)) {
    failures.push(`Nullable/global snapshot policy is not retired: ${policyName}`);
  }
}
if (/project_key\s+is\s+null/i.test(containmentSql)) {
  failures.push("Pre-Auth containment still treats nullable project scope as public");
}
if (/project_key\s+like\s+'%?-demo'/i.test(containmentSql)) {
  failures.push("Pre-Auth containment uses a mutable project-key suffix instead of an explicit demo allowlist");
}
if (!/p\.id\s*=\s*source_registry_snapshots\.project_id[\s\S]*p\.project_key\s*=\s*source_registry_snapshots\.project_key/i.test(containmentSql) ||
    !/p\.id\s*=\s*external_data_snapshots\.project_id[\s\S]*p\.project_key\s*=\s*external_data_snapshots\.project_key/i.test(containmentSql)) {
  failures.push("Demo snapshot visibility does not require a canonical, consistent project id/key pair");
}

if (failures.length > 0) {
  console.error("Migration security-surface contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Migration security-surface contract passed: ${createdTables.size} created public tables covered; pre-Auth containment is present. Clean replay remains uncertified and blocked by DB-01.`);
