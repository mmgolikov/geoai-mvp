import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20260716175210_geoai_auth_admin_lifecycle_remediation_v1.sql", import.meta.url),
  "utf8"
);
const personas = await readFile(
  new URL("../supabase/tests/auth_admin_lifecycle_remediation_personas.sql", import.meta.url),
  "utf8"
);
const operator = await readFile(
  new URL("../supabase/operator/20260716_first_platform_owner_bootstrap.sql", import.meta.url),
  "utf8"
);

const failures = [];
const functionBlock = (name) => migration.match(
  new RegExp(`create\\s+or\\s+replace\\s+function\\s+geoai_private[.]${name}\\b[\\s\\S]*?\\$\\$;`, "i")
)?.[0] ?? "";

const provision = functionBlock("provision_auth_profile");
const legacyBootstrap = functionBlock("bootstrap_first_platform_owner");
const bootstrapV2 = functionBlock("bootstrap_first_platform_owner_v2");
const accept = functionBlock("admin_accept_invitation");
const revoke = functionBlock("admin_revoke_invitation");
const snapshot = functionBlock("admin_organization_snapshot");

if (!/begin;[\s\S]*set\s+local\s+lock_timeout[\s\S]*set\s+local\s+statement_timeout[\s\S]*commit;\s*$/i.test(migration)) {
  failures.push("Remediation is not one bounded atomic migration");
}
if (/create\s+(?:or\s+replace\s+)?function\s+api[.]/i.test(migration)) {
  failures.push("Remediation unexpectedly expands or replaces the exposed API inventory");
}

if (!/bootstrap v1 is disabled; use bootstrap_first_platform_owner_v2/i.test(legacyBootstrap)) {
  failures.push("Legacy owner bootstrap is not fail-closed");
}
for (const [pattern, message] of [
  [/security\s+definer[\s\S]*?set\s+search_path\s*=\s*''/i, "Bootstrap v2 is not a private empty-search-path definer"],
  [/change_ticket\s+text[\s\S]*?operator_identity\s+text[\s\S]*?request_id\s+uuid/i, "Bootstrap v2 lacks mandatory durable provenance inputs"],
  [/insert\s+into\s+public[.]platform_memberships[\s\S]*?insert\s+into\s+public[.]admin_audit_events/i, "Bootstrap membership and audit are not in one function"],
  [/request_id[\s\S]*?'changeTicket'[\s\S]*?'operatorIdentity'/i, "Bootstrap audit omits request/change/operator provenance"],
  [/pg_advisory_xact_lock[\s\S]*?geoai:platform-owner/i, "Bootstrap v2 is not serialized"]
]) {
  if (!pattern.test(bootstrapV2)) failures.push(message);
}
if (!/revoke\s+all\s+on\s+function\s+geoai_private[.]bootstrap_first_platform_owner_v2[\s\S]*?from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i.test(migration)) {
  failures.push("Bootstrap v2 caller-role EXECUTE is not explicitly closed");
}

if (/canonical_status[\s\S]*?banned_until/i.test(provision)) {
  failures.push("Provisioning still maps a temporary Auth ban into durable profile status");
}
if (!/profile[.]status\s*=\s*'disabled'[\s\S]*?'disabled'[\s\S]*?canonical_status/i.test(provision)) {
  failures.push("Provisioning does not preserve an application-disabled profile");
}
if (!/update\s+public[.]profiles[\s\S]*?profile[.]status\s*=\s*'inactive'[\s\S]*?auth_user[.]confirmed_at\s+is\s+not\s+null[\s\S]*?auth_user[.]deleted_at\s+is\s+null/i.test(migration)) {
  failures.push("Confirmed permanent inactive-profile reconciliation is missing");
}

function assertCanonicalInvitationOrder(block, label) {
  const scope = block.search(/select\s+candidate[.]id\s*,\s*candidate[.]organization_id\s*,\s*candidate[.]project_id/i);
  const organizationOffset = block.slice(scope + 1).search(/from\s+public[.]organizations\s+organization[\s\S]*?for\s+update/i);
  const organization = organizationOffset < 0 ? -1 : scope + 1 + organizationOffset;
  const projectOffset = block.slice(organization + 1).search(/from\s+public[.]projects\s+project[\s\S]*?for\s+update/i);
  const project = projectOffset < 0 ? -1 : organization + 1 + projectOffset;
  const invitationOffset = block.slice(project + 1).search(/from\s+public[.]invitations\s+candidate[\s\S]*?candidate[.]organization_id\s*=\s*invitation_scope[.]organization_id[\s\S]*?for\s+update/i);
  const invitation = invitationOffset < 0 ? -1 : project + 1 + invitationOffset;
  if (!(scope >= 0 && organization > scope && project > organization && invitation > project)) {
    failures.push(`${label} does not acquire organization -> project -> invitation in canonical order`);
  }
  const beforeOrganization = organization >= 0 ? block.slice(scope, organization) : block;
  if (/for\s+update/i.test(beforeOrganization)) failures.push(`${label} locks invitation scope before the organization`);
}
assertCanonicalInvitationOrder(accept, "Invitation acceptance");
assertCanonicalInvitationOrder(revoke, "Invitation revocation");

if (!/invitation[.]expires_at\s*<=\s*now\(\)[\s\S]*?update\s+public[.]invitations[\s\S]*?set\s+status\s*=\s*'expired'[\s\S]*?return\s+jsonb_build_object[\s\S]*?'status'\s*,\s*'expired'/i.test(accept)) {
  failures.push("Expired invitation status is not persisted through a successful return");
}
if (/set\s+status\s*=\s*'expired'[\s\S]*?raise\s+exception\s+'invitation has expired'/i.test(accept)) {
  failures.push("Expired invitation transition still raises and would roll back");
}

for (const [pattern, message] of [
  [/least\s*\(\s*greatest\s*\(\s*coalesce\s*\(\s*page_size\s*,\s*25\s*\)\s*,\s*1\s*\)\s*,\s*25\s*\)/i, "Aggregate snapshot is not capped at 25"],
  [/before_created_at\s+is\s+not\s+null\s+or\s+before_id\s+is\s+not\s+null[\s\S]*?initial page only/i, "Aggregate snapshot continuation is not fail-closed"],
  [/'continuationSupported'\s*,\s*false/i, "Aggregate snapshot does not disclose initial-only pagination"]
]) {
  if (!pattern.test(snapshot)) failures.push(message);
}

for (const [pattern, message] of [
  [/bootstrap_first_platform_owner_v2\([\s\S]*?target_auth_user_id[\s\S]*?change_ticket[\s\S]*?operator_identity[\s\S]*?target_request_id/i, "Owner operator does not invoke bootstrap v2 with durable provenance"],
  [/__REQUEST_ID_UUID__/i, "Owner operator lacks the request-id placeholder"],
  [/membership[.]profile_id/i, "Owner receipt does not use the real platform-membership primary key profile_id"]
]) {
  if (!pattern.test(operator)) failures.push(message);
}

if (!/select\s+extensions[.]plan\(39\)/i.test(personas)) failures.push("Remediation persona plan is not 39 assertions");
const assertionCount = (personas.match(/select\s+extensions[.](?:ok|is|isnt|throws_ok|lives_ok|cmp_ok|like|unlike|has_)/gi) ?? []).length;
if (assertionCount !== 39) failures.push(`Remediation persona suite contains ${assertionCount} assertions instead of 39`);
for (const [pattern, message] of [
  [/expired status survives the successful RPC transaction/i, "Persona suite omits persisted invitation expiry"],
  [/bootstrap audit durably stores change-ticket and operator provenance/i, "Persona suite omits durable bootstrap provenance"],
  [/expired temporary ban restores access/i, "Persona suite omits temporary-ban expiry"],
  [/aggregate snapshot rejects a shared continuation cursor/i, "Persona suite omits aggregate-cursor denial"]
]) {
  if (!pattern.test(personas)) failures.push(message);
}

if (failures.length) {
  console.error("Auth/Admin lifecycle remediation contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Auth/Admin lifecycle remediation contract passed: forward-only lock order, durable expiry/bootstrap audit, dynamic temporary-ban state and initial-only snapshot are present with 39 personas.");
