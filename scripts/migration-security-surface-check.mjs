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
const previewSql = await readFile(path.join(directory, "20260708132300_geoai_preview_demo_read_access_v1.sql"), "utf8");
const storageOwnerSql = await readFile(path.resolve(process.cwd(), "supabase/operator/20260716_storage_policy_owner_path_review.sql"), "utf8");
const missingContainment = [...conditionalContainment].filter((table) => !containmentSql.includes(`'${table}'`));
const failures = [];

if (missing.length > 0) failures.push(`Created public tables without an RLS control: ${missing.join(", ")}`);
if (missingContainment.length > 0) failures.push(`Historical tables missing containment: ${missingContainment.join(", ")}`);
if (!/alter\s+table\s+public\.profiles[\s\S]*add\s+column\s+if\s+not\s+exists\s+status\s+text\s+not\s+null\s+default\s+'active'/i.test(containmentSql) ||
    !/check\s*\(status\s+in\s*\('active'\s*,\s*'invited'\s*,\s*'disabled'\s*,\s*'inactive'\)\)/i.test(containmentSql)) {
  failures.push("Containment helpers reference profiles.status without creating its constrained lifecycle column");
}
if (!/create\s+unique\s+index\s+if\s+not\s+exists\s+ux_profiles_auth_user_id_nonnull[\s\S]*on\s+public\.profiles\s*\(auth_user_id\)[\s\S]*where\s+auth_user_id\s+is\s+not\s+null/i.test(containmentSql)) {
  failures.push("Auth principal to profile mapping is not protected by a partial unique index");
}
if (!/drop\s+policy\s+if\s+exists\s+"geoai project scoped aoi write"\s+on\s+public\.aois/i.test(containmentSql)) {
  failures.push("Legacy role-blind AOI mutation policy is not retired before Auth activation");
}
if (!/alter\s+default\s+privileges\s+for\s+role\s+postgres\s+in\s+schema\s+public[\s\S]*revoke\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete\s+on\s+tables\s+from\s+anon\s*,\s*authenticated\s*,\s*service_role/i.test(containmentSql)) {
  failures.push("Future public-schema table privileges are not opt-in by default");
}
if (!/revoke execute on function public\.geoai_current_profile_id\(\) from public, anon/i.test(containmentSql)) {
  failures.push("SECURITY DEFINER helper EXECUTE is not revoked from PUBLIC/anon");
}
for (const functionName of ["geoai_current_profile_id", "geoai_has_project_access", "geoai_has_organization_access"]) {
  const functionSource = containmentSql.match(new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${functionName}[\\s\\S]*?\\$\\$;`, "i"))?.[0] ?? "";
  if (!/security\s+definer[\s\S]*?set\s+search_path\s*=\s*''/i.test(functionSource)) {
    failures.push(`${functionName} SECURITY DEFINER helper does not use an empty search_path`);
  }
}
if (/pm\.user_id\s*=\s*auth\.uid\(\)/i.test(`${containmentSql}\n${storageOwnerSql}`)) {
  failures.push("Storage containment compares profiles.id directly with auth.uid()");
}
const projectAccessFunction = containmentSql.match(/create\s+or\s+replace\s+function\s+public\.geoai_has_project_access[\s\S]*?\$\$;/i)?.[0] ?? "";
if (!/target_project_id\s+is\s+not\s+null[\s\S]*pm\.project_id\s*=\s*target_project_id[\s\S]*project\.id\s*=\s*target_project_id/i.test(projectAccessFunction) ||
    !/target_project_key\s+is\s+null[\s\S]*pm\.project_key\s*=\s*target_project_key[\s\S]*project\.project_key\s*=\s*target_project_key/i.test(projectAccessFunction)) {
  failures.push("Project access helper does not make project_id authoritative and require a consistent optional key");
}
if (!/join\s+public\.projects\s+project[\s\S]*project\.organization_id\s*=\s*pm\.organization_id/i.test(projectAccessFunction)) {
  failures.push("Project access helper does not prove project/organization consistency");
}
if (/pm\.role\s+in\s*\([^)]*'(?:editor|client)'/i.test(storageOwnerSql)) {
  failures.push("Storage containment references roles outside the canonical role enum");
}
const historicalAnonPolicies = Array.from(
  previewSql.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+public\.([a-z0-9_]+)[\s\S]*?to\s+anon\s*,\s*authenticated/gi),
  (match) => ({ name: match[1], table: match[2] })
);
for (const policy of historicalAnonPolicies) {
  if (!containmentSql.includes(`drop policy if exists \"${policy.name}\" on public.${policy.table}`)) {
    failures.push(`Historical anonymous policy is not retired: ${policy.name} on ${policy.table}`);
  }
}
for (const policyName of ["geoai source snapshots read", "geoai external snapshots read"]) {
  if (!containmentSql.includes(`drop policy if exists \"${policyName}\"`)) {
    failures.push(`Nullable/global snapshot policy is not retired: ${policyName}`);
  }
}
const historicalAnonGrantTables = Array.from(
  previewSql.matchAll(/grant\s+select\s+on\s+table\s+public\.([a-z0-9_]+)\s+to\s+anon\s*,/gi),
  (match) => match[1]
).filter((table) => table !== "geoai_healthcheck");
for (const table of historicalAnonGrantTables) {
  if (!new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+public\\s*,\\s*anon`, "i").test(containmentSql)) {
    failures.push(`Historical anonymous table grant is not retired: ${table}`);
  }
}
const containmentPolicies = containmentSql.match(/create\s+policy[\s\S]*?;/gi) ?? [];
if (containmentPolicies.some((statement) => /\bto\s+anon\b/i.test(statement))) {
  failures.push("Pre-Auth containment creates a new anonymous policy");
}
const anonGrants = containmentSql.match(/grant\s+[^;]+\bto\s+anon(?:\s*,\s*authenticated)?\s*;/gi) ?? [];
const unexpectedAnonGrants = anonGrants.filter((statement) =>
  !/^grant\s+select\s+on\s+table\s+public\.geoai_healthcheck\s+to\s+anon\s*,\s*authenticated\s*;$/i.test(statement.trim())
);
if (unexpectedAnonGrants.length > 0) {
  failures.push(`Pre-Auth containment grants unexpected privileges to anon: ${unexpectedAnonGrants.join(" | ")}`);
}
if (/\(\s*project_id\s+is\s+null\s+and\s+project_key\s+is\s+null\s*\)/i.test(containmentSql)) {
  failures.push("Pre-Auth containment still treats nullable project scope as public");
}
if (/project_key\s+like\s+'%?-demo'/i.test(containmentSql)) {
  failures.push("Pre-Auth containment uses a mutable project-key suffix instead of an explicit demo allowlist");
}
if (!/p\.id\s*=\s*source_registry_snapshots\.project_id[\s\S]*p\.project_key\s*=\s*source_registry_snapshots\.project_key/i.test(containmentSql) ||
    !/p\.id\s*=\s*external_data_snapshots\.project_id[\s\S]*p\.project_key\s*=\s*external_data_snapshots\.project_key/i.test(containmentSql)) {
  failures.push("Demo snapshot visibility does not require a canonical, consistent project id/key pair");
}
if (!/revoke\s+all\s+on\s+table\s+public\.geoai_healthcheck\s+from\s+public\s*,\s*anon\s*,\s*authenticated[\s\S]*grant\s+select\s+on\s+table\s+public\.geoai_healthcheck\s+to\s+anon\s*,\s*authenticated/i.test(containmentSql)) {
  failures.push("Public healthcheck privileges are not normalized to SELECT-only");
}
if (/\bstorage\.objects\b/i.test(containmentSql.replace(/--[^\n]*/g, ""))) {
  failures.push("Normal domain migration contains owner-only storage.objects DDL");
}
if (!/REVIEW ONLY/i.test(storageOwnerSql) || !/to\s+authenticated/i.test(storageOwnerSql)) {
  failures.push("Storage owner-path artifact is missing its review-only/authenticated boundary");
}

if (failures.length > 0) {
  console.error("Migration security-surface contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Migration security-surface contract passed: ${createdTables.size} created public tables covered; pre-Auth containment is present. Clean replay remains uncertified and blocked by DB-01.`);
