import { readFile } from "node:fs/promises";

const sql = await readFile(
  new URL("../supabase/migrations/20260716164451_geoai_auth_admin_project_activation_rebuild_v1.sql", import.meta.url),
  "utf8"
);
const personas = await readFile(
  new URL("../supabase/tests/auth_admin_project_activation_rebuild_personas.sql", import.meta.url),
  "utf8"
);
const bootstrap = await readFile(
  new URL("../supabase/operator/20260716_first_platform_owner_bootstrap.sql", import.meta.url),
  "utf8"
);

const failures = [];
for (const table of ["platform_memberships", "clients", "invitations", "admin_audit_events"]) {
  if (!new RegExp(`create\\s+table\\s+public[.]${table}\\b`, "i").test(sql)) {
    failures.push(`Missing activation table public.${table}`);
  }
  if (!new RegExp(`alter\\s+table\\s+public[.]${table}\\s+enable\\s+row\\s+level\\s+security`, "i").test(sql)) {
    failures.push(`RLS is not enabled on public.${table}`);
  }
  if (!new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public[.]${table}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated\\s*,\\s*service_role`, "i").test(sql)) {
    failures.push(`Direct caller grants are not closed on public.${table}`);
  }
}

for (const rpc of [
  "create_organization", "create_client", "create_project", "create_invitation",
  "accept_invitation", "revoke_invitation", "set_organization_member",
  "set_project_member", "organization_admin_snapshot"
]) {
  const block = sql.match(new RegExp(`create\\s+or\\s+replace\\s+function\\s+api[.]${rpc}\\b[\\s\\S]*?\\$\\$;`, "i"))?.[0] ?? "";
  if (!/security\s+invoker/i.test(block)) failures.push(`api.${rpc} is not SECURITY INVOKER`);
  if (!/set\s+search_path\s*=\s*''/i.test(block)) failures.push(`api.${rpc} lacks an empty search_path`);
  if (!new RegExp(`grant\\s+execute\\s+on\\s+function\\s+api[.]${rpc}\\b[\\s\\S]*?\\s+to\\s+authenticated`, "i").test(sql)) {
    failures.push(`api.${rpc} lacks an authenticated-only EXECUTE grant`);
  }
}

for (const [pattern, message] of [
  [/create\s+trigger\s+geoai_provision_auth_profile[\s\S]*?on\s+auth[.]users/i, "Auth profile provision trigger is missing"],
  [/is_anonymous[\s\S]*?email_confirmed_at[\s\S]*?confirmed_at/i, "Permanent confirmed-user provisioning checks are missing"],
  [/require_aal2/i, "AAL2 guard is missing"],
  [/platform owner bootstrap has already been consumed/i, "One-time platform-owner bootstrap guard is missing"],
  [/pg_advisory_xact_lock[\s\S]*?geoai:platform-owner/i, "Platform-owner bootstrap is not serialized"],
  [/last active organization owner/i, "Last organization-owner protection is missing"],
  [/last active project owner/i, "Last project-owner protection is missing"],
  [/row_version/i, "Optimistic row-version concurrency is missing"],
  [/token_hash[\s\S]*?digest\([^)]*'sha256'/i, "Invitation token hashing is missing"],
  [/admin audit rows cannot be updated/i, "Activation persona suite lacks append-only audit evidence"]
]) {
  if (!pattern.test(`${sql}\n${personas}`)) failures.push(message);
}

if (!/select\s+extensions[.]plan\(73\)/i.test(personas)) failures.push("Activation persona plan is not 73 assertions");
if ((personas.match(/select\s+extensions[.](?:ok|is|isnt|throws_ok|lives_ok|cmp_ok|like|unlike|has_)/gi) ?? []).length !== 73) {
  failures.push("Activation persona suite does not contain exactly 73 assertions");
}
for (const [pattern, message] of [
  [/current_user\s*<>\s*'postgres'/i, "Platform-owner operator is not postgres-only"],
  [/email_confirmed_at\s+is\s+not\s+null/i, "Platform-owner operator accepts unconfirmed email"],
  [/bootstrap_first_platform_owner_v2\([\s\S]*?target_auth_user_id[\s\S]*?change_ticket[\s\S]*?operator_identity[\s\S]*?target_request_id/i, "Platform-owner operator bypasses the durably audited bootstrap v2 function"],
  [/__CHANGE_TICKET__[\s\S]*?__OPERATOR_IDENTITY__[\s\S]*?__REQUEST_ID_UUID__/i, "Platform-owner durable receipt placeholders are missing"]
]) {
  if (!pattern.test(bootstrap)) failures.push(message);
}

if (failures.length) {
  console.error("Auth/admin/project activation rebuild contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Auth/admin/project activation rebuild contract passed: closed tables, invoker API wrappers, permanent-user/AAL/owner/concurrency controls and 73 personas are present.");
