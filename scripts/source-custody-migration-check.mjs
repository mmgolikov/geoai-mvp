import { readFile } from "node:fs/promises";

const sql = await readFile(
  new URL("../supabase/migrations/20260716113000_geoai_source_custody_foundation_v1.sql", import.meta.url),
  "utf8"
);
const failures = [];

function requirePattern(pattern, message) {
  if (!pattern.test(sql)) failures.push(message);
}

for (const table of [
  "source_catalog",
  "source_releases",
  "source_artifacts",
  "source_release_status_events",
  "source_ingestion_receipts"
]) {
  requirePattern(new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\b`, "i"), `Missing source custody table: ${table}`);
  requirePattern(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"), `RLS is not enabled for ${table}`);
  requirePattern(new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated\\s*,\\s*service_role`, "i"), `Direct caller grants are not closed for ${table}`);
}

requirePattern(/source_releases_project_scope_fkey[\s\S]*foreign\s+key\s*\(project_id\s*,\s*organization_id\s*,\s*project_key\)/i, "Source releases do not enforce composite tenant scope");
requirePattern(/source_ingestion_receipts_project_scope_fkey[\s\S]*foreign\s+key\s*\(project_id\s*,\s*organization_id\s*,\s*project_key\)/i, "Ingestion receipts do not enforce composite tenant scope");
for (const constraint of [
  "source_releases_creator_membership_fkey",
  "source_artifacts_creator_membership_fkey",
  "source_release_status_events_actor_membership_fkey",
  "source_ingestion_receipts_creator_membership_fkey"
]) {
  requirePattern(new RegExp(`${constraint}[\\s\\S]*foreign\\s+key\\s*\\(organization_id\\s*,\\s*(?:created_by|actor_profile_id)\\)`, "i"), `Source custody actor is not bound to tenant membership: ${constraint}`);
}
for (const constraint of [
  "source_releases_creator_project_membership_fkey",
  "source_artifacts_creator_project_membership_fkey",
  "source_release_status_events_actor_project_membership_fkey",
  "source_ingestion_receipts_creator_project_membership_fkey"
]) {
  requirePattern(new RegExp(`${constraint}[\\s\\S]*foreign\\s+key\\s*\\(project_id\\s*,\\s*(?:created_by|actor_profile_id)\\)`, "i"), `Source custody actor is not bound to project membership: ${constraint}`);
}
for (const constraint of ["source_artifacts_release_scope_fkey", "source_release_status_events_release_scope_fkey", "source_ingestion_receipts_release_scope_fkey"]) {
  requirePattern(new RegExp(`${constraint}[\\s\\S]*foreign\\s+key\\s*\\(source_release_id\\s*,\\s*organization_id\\s*,\\s*project_id\\s*,\\s*project_key\\)`, "i"), `Source custody child can cross release tenant scope: ${constraint}`);
}
requirePattern(/content_sha256\s+text\s+not\s+null[\s\S]*\^\[0-9a-f\]\{64\}\$/i, "Release/artifact checksum custody is missing");
requirePattern(/data_classification\s+text\s+not\s+null\s+default\s+'restricted'/i, "Unreviewed source catalog entries do not default to restricted");
requirePattern(/select[\s\S]*'restricted'[\s\S]*'registered_unverified'[\s\S]*from\s+public\.source_registry_snapshots/i, "Legacy registry backfill is not fail-closed as restricted/unverified");
requirePattern(/source_ingestion_receipts_idempotency_key[\s\S]*unique\s*\(organization_id\s*,\s*project_id\s*,\s*source_id\s*,\s*idempotency_key\)/i, "Ingestion idempotency boundary is missing");
requirePattern(/create\s+or\s+replace\s+function\s+geoai_private\.reject_source_custody_mutation[\s\S]*raise\s+exception\s+'source custody rows are append-only'/i, "Append-only custody trigger is missing");
for (const trigger of ["source_releases_immutable", "source_artifacts_immutable", "source_release_status_events_immutable", "source_ingestion_receipts_immutable"]) {
  requirePattern(new RegExp(`create\\s+trigger\\s+${trigger}\\s+before\\s+update\\s+or\\s+delete`, "i"), `Missing immutability trigger: ${trigger}`);
}

const apiBlock = sql.match(/create or replace function api\.current_source_releases[\s\S]*?comment on function api\.current_source_releases/i)?.[0] ?? "";
if (!apiBlock) failures.push("Bounded source release RPC is missing");
if (!/security\s+definer[\s\S]*set\s+search_path\s*=\s*''/i.test(apiBlock)) failures.push("Source release RPC is not hardened with an empty search_path");
if (!/api\.current_project_access\(target_project_key\)/i.test(apiBlock)) failures.push("Source release RPC does not reuse exact caller project access");
if (!/catalog\.catalog_status\s*=\s*'approved'/i.test(apiBlock)) failures.push("Source release RPC returns unapproved catalog entries");
if (!/project_role\s+in\s*\('owner'\s*,\s*'admin'\s*,\s*'analyst'\s*,\s*'viewer'\)/i.test(apiBlock) || /client_viewer/i.test(apiBlock)) {
  failures.push("Source release RPC role set does not match source.read");
}
if (!/limit\s+least\s*\(greatest\s*\(coalesce\(page_size\s*,\s*25\)\s*,\s*1\)\s*,\s*100\)/i.test(apiBlock)) {
  failures.push("Source release RPC is not bounded to 1..100 rows");
}
const returnsBlock = apiBlock.match(/returns\s+table\s*\([\s\S]*?\)\s*language/i)?.[0] ?? "";
if (/storage_(?:bucket|object_path)|source_uri/i.test(returnsBlock)) failures.push("Source release RPC leaks custody object locations");
if (/quality_summary|lineage_summary/i.test(apiBlock)) failures.push("Source release RPC exposes arbitrary summary JSON through the Data API");
if (!/revoke\s+all\s+on\s+function\s+api\.current_source_releases\(text\s*,\s*integer\s*,\s*timestamptz\s*,\s*uuid\)[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i.test(sql)) {
  failures.push("Source release RPC execute privileges are not reset explicitly");
}
if (!/grant\s+execute\s+on\s+function\s+api\.current_source_releases\(text\s*,\s*integer\s*,\s*timestamptz\s*,\s*uuid\)[\s\S]*to\s+authenticated/i.test(sql)) {
  failures.push("Authenticated callers cannot execute the reviewed source release RPC");
}
if (/create\s+policy/i.test(sql) || /grant\s+[^;]*on\s+table/i.test(sql)) {
  failures.push("SOURCE-01 opens base-table policies or grants before the trusted worker design");
}

if (failures.length > 0) {
  console.error("Source custody migration contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Source custody migration contract passed: immutable tenant releases/artifacts/receipts and bounded caller metadata RPC are fail-closed.");
