import { readFile } from "node:fs/promises";
import path from "node:path";

const migrations = path.resolve(process.cwd(), "supabase", "migrations");
const containment = await readFile(
  path.join(migrations, "20260716000000_geoai_pre_auth_security_containment_v1.sql"),
  "utf8"
);
const identity = await readFile(
  path.join(migrations, "20260716085854_geoai_identity_authorization_foundation_v1.sql"),
  "utf8"
);
const storageDraft = await readFile(
  path.resolve(process.cwd(), "supabase", "operator", "20260716_storage_policy_owner_path_review.sql"),
  "utf8"
);
const failures = [];

function requirePattern(pattern, message) {
  if (!pattern.test(identity)) failures.push(message);
}

requirePattern(/create\s+schema\s+if\s+not\s+exists\s+geoai_private/i, "Private authorization schema is missing");
requirePattern(/create\s+schema\s+if\s+not\s+exists\s+api/i, "Minimal api allowlist schema is missing");
requirePattern(/create\s+table\s+if\s+not\s+exists\s+public\.organization_memberships/i, "Organization memberships are missing");
requirePattern(/profiles_auth_user_id_fkey[\s\S]*references\s+auth\.users\s*\(id\)/i, "Profile/Auth foreign key is missing");
requirePattern(/profiles_identity_mapping_check[\s\S]*identity_kind\s*=\s*'user'[\s\S]*auth_user_id\s+is\s+not\s+null/i, "Human profiles are not bound to Auth users");
requirePattern(/organization_memberships_org_profile_key[\s\S]*unique\s*\(organization_id\s*,\s*profile_id\)/i, "Organization membership uniqueness is missing");
requirePattern(/capabilities\s+text\[\][\s\S]*client_attestor[\s\S]*official_attestor[\s\S]*source_operator/i, "Organization capability custody is missing");
requirePattern(/project_memberships_project_user_key[\s\S]*unique\s*\(project_id\s*,\s*user_id\)/i, "Project membership uniqueness is missing");
requirePattern(/project_memberships_project_scope_fkey[\s\S]*foreign\s+key\s*\(project_id\s*,\s*organization_id\s*,\s*project_key\)/i, "Project membership composite scope FK is missing");
requirePattern(/project_memberships_org_profile_fkey[\s\S]*references\s+public\.organization_memberships\s*\(organization_id\s*,\s*profile_id\)/i, "Project membership does not require organization membership");
requirePattern(/create\s+or\s+replace\s+function\s+geoai_private\.has_project_role/i, "Private project-role helper is missing");
requirePattern(/create\s+or\s+replace\s+function\s+geoai_private\.has_organization_role/i, "Private organization-role helper is missing");
requirePattern(/create\s+or\s+replace\s+function\s+geoai_private\.has_storage_project_role/i, "Private Storage project-role helper is missing");
requirePattern(/security\s+definer[\s\S]*set\s+search_path\s*=\s*''/i, "Private helpers are not hardened with an empty search_path");
requirePattern(/auth_user\.confirmed_at\s+is\s+not\s+null[\s\S]*auth_user\.deleted_at\s+is\s+null[\s\S]*auth_user\.banned_until/i, "Auth account-state checks are not fail-closed");
requirePattern(/current_project_access\(\s*target_project_key\s+text\s*\)/i, "Project access RPC must require an exact project key");
requirePattern(/target_project_key\s+is\s+not\s+null[\s\S]*project\.project_key\s*=\s*target_project_key/i, "Project access RPC permits an unbounded project listing");
for (const apiFunction of ["healthcheck", "current_profile", "current_organization_memberships", "current_project_access"]) {
  requirePattern(
    new RegExp(`create\\s+or\\s+replace\\s+function\\s+api\\.${apiFunction}\\b[\\s\\S]*?security\\s+definer[\\s\\S]*?set\\s+search_path\\s*=\\s*''`, "i"),
    `Hardened api.${apiFunction} RPC is missing`
  );
}

if (/create\s+or\s+replace\s+function\s+public\.geoai_(?:current|has_)/i.test(identity)) {
  failures.push("Identity migration creates an authorization helper in exposed public schema");
}
if (/\bfor\s+all\s+to\s+authenticated/i.test(identity)) {
  failures.push("Identity migration uses a broad FOR ALL policy");
}
if (/grant\s+(?:all|truncate|references|trigger)[^;]*\bto\s+authenticated/i.test(identity)) {
  failures.push("Identity migration grants a dangerous table privilege to authenticated");
}
if (/grant\s+[^;]*\bon\s+table\s+public\./i.test(identity) || /grant\s+[^;]*public\.[^;]*\bto\s+authenticated/i.test(identity)) {
  failures.push("Identity migration grants direct public base-table access instead of using the api allowlist");
}
if (/grant\s+[^;]*public\.(?:source_registry_snapshots|external_data_snapshots|audit_events)[^;]*to\s+authenticated/i.test(identity)) {
  failures.push("Source custody or audit tables are exposed before their dedicated work packages");
}

const projectResourcePolicyBlock = identity.match(/-- Project resource policies[\s\S]*?comment on schema geoai_private/i)?.[0] ?? "";
if (/array\[[^\]]*client_viewer/i.test(projectResourcePolicyBlock)) {
  failures.push("Client viewer receives base-table resource access without an audience model");
}
for (const operation of ["select", "insert", "update", "delete"]) {
  if (!new RegExp(`for\\s+${operation}\\s+to\\s+authenticated`, "i").test(projectResourcePolicyBlock)) {
    failures.push(`Project resources have no explicit ${operation.toUpperCase()} policy template`);
  }
}

if (!/revoke\s+all\s+on\s+table\s+public\.organizations\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i.test(containment)) {
  failures.push("Containment does not revoke authenticated domain-table privileges");
}
if (/create\s+policy/i.test(containment)) {
  failures.push("Containment opens policies before the identity migration");
}
if (/grant\s+select\s+on\s+table\s+public\.geoai_healthcheck/i.test(containment)) {
  failures.push("Containment exposes the healthcheck base table instead of api.healthcheck()");
}

if (!/storage\.allow_any_operation\(array\[[\s\S]*'object\.get_authenticated_info'[\s\S]*'object\.get_authenticated'[\s\S]*'object\.sign'[\s\S]*\]\)/i.test(storageDraft)) {
  failures.push("Storage read policy does not prevent bucket listing while allowing authenticated fetch and signed-URL operations");
}
const storageReadPolicy = storageDraft.match(/create policy "GeoAI project evidence read"[\s\S]*?create policy "GeoAI project evidence delete"/i)?.[0] ?? "";
if (/client_viewer/i.test(storageReadPolicy)) {
  failures.push("Storage read policy exposes raw evidence objects to client_viewer without an audience model");
}
if (!/join\s+auth\.users[\s\S]*confirmed_at\s+is\s+not\s+null[\s\S]*deleted_at\s+is\s+null[\s\S]*banned_until/i.test(storageDraft)) {
  if (!/geoai_private\.has_storage_project_role/i.test(storageDraft)) {
    failures.push("Storage policies do not enforce the private Auth account-state boundary");
  }
}
if (/\b(?:from|join)\s+(?:public|auth)\./i.test(storageDraft.replace(/--[^\n]*/g, ""))) {
  failures.push("Storage policy evaluates protected base-table joins as the authenticated caller");
}

if (failures.length > 0) {
  console.error("Identity/authorization migration contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Identity/authorization migration contract passed: tenant constraints, private helpers and action-specific fail-closed policy templates are present.");
