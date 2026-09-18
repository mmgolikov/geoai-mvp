#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const DOCKER_CONTEXT = "colima-geoai-sprint10";
const CONTAINER = "geoai-sprint10-restore";
const DATABASE = "geoai_invitation_commit_probe";
const DB_USER = "supabase_admin";
const SOCKET = "/var/run/postgresql";
const APPLICATION_NAME = "geoai-sprint10-invitation-commit-probe";
const PROCESS_TIMEOUT_MS = 30_000;
const LOCK_POLL_TIMEOUT_MS = 10_000;

const ids = {
  controller: "96000000-0000-0000-0000-000000000001",
  issuer: "96000000-0000-0000-0000-000000000002",
  acceptRevokeRecipient: "96000000-0000-0000-0000-000000000003",
  revokeAcceptRecipient: "96000000-0000-0000-0000-000000000004",
  acceptAcceptRecipient: "96000000-0000-0000-0000-000000000005",
  issuerChangeRecipient: "96000000-0000-0000-0000-000000000006",
  organization: "96000000-0000-0000-0000-000000000101",
  project: "96000000-0000-0000-0000-000000000201",
  invitationAcceptRevoke: "96000000-0000-0000-0000-000000000401",
  invitationRevokeAccept: "96000000-0000-0000-0000-000000000402",
  invitationAcceptAccept: "96000000-0000-0000-0000-000000000403",
  invitationIssuerChange: "96000000-0000-0000-0000-000000000404"
};

const requestIds = {
  acceptRevokeAccept: randomUUID(),
  acceptRevokeRevoke: randomUUID(),
  revokeAcceptRevoke: randomUUID(),
  revokeAcceptAccept: randomUUID(),
  acceptAcceptFirst: randomUUID(),
  acceptAcceptSecond: randomUUID(),
  issuerChangeDisable: randomUUID(),
  issuerChangeAccept: randomUUID()
};

const winnerRequestIds = [
  requestIds.acceptRevokeAccept,
  requestIds.revokeAcceptRevoke,
  requestIds.acceptAcceptFirst,
  requestIds.issuerChangeDisable
];
const loserRequestIds = [
  requestIds.acceptRevokeRevoke,
  requestIds.revokeAcceptAccept,
  requestIds.acceptAcceptSecond,
  requestIds.issuerChangeAccept
];

const tokens = {
  acceptRevoke: createHash("sha256").update("geoai-sprint10-commit-accept-revoke").digest("hex"),
  revokeAccept: createHash("sha256").update("geoai-sprint10-commit-revoke-accept").digest("hex"),
  acceptAccept: createHash("sha256").update("geoai-sprint10-commit-accept-accept").digest("hex"),
  issuerChange: createHash("sha256").update("geoai-sprint10-commit-issuer-change").digest("hex")
};

const authUsers = [
  [ids.controller, "commit-probe-controller@test.invalid"],
  [ids.issuer, "commit-probe-issuer@test.invalid"],
  [ids.acceptRevokeRecipient, "commit-probe-accept-revoke@test.invalid"],
  [ids.revokeAcceptRecipient, "commit-probe-revoke-accept@test.invalid"],
  [ids.acceptAcceptRecipient, "commit-probe-accept-accept@test.invalid"],
  [ids.issuerChangeRecipient, "commit-probe-issuer-change@test.invalid"]
];

const activeProcesses = new Set();

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function uuidArray(values) {
  return `ARRAY[${values.map((value) => `${sqlLiteral(value)}::uuid`).join(",")}]`;
}

function psqlArgs() {
  return [
    "--context", DOCKER_CONTEXT,
    "exec", "-i", CONTAINER,
    "psql", "-h", SOCKET, "-U", DB_USER, "-d", DATABASE,
    "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"
  ];
}

function startPsql(label) {
  const child = spawn("docker", psqlArgs(), { stdio: ["pipe", "pipe", "pipe"] });
  activeProcesses.add(child);
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const exit = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${label} exceeded ${PROCESS_TIMEOUT_MS} ms`));
    }, PROCESS_TIMEOUT_MS);
    child.once("error", (error) => {
      clearTimeout(timeout);
      activeProcesses.delete(child);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      activeProcesses.delete(child);
      resolve({ code, signal, stdout, stderr, combined: `${stdout}\n${stderr}` });
    });
  });
  return {
    child,
    exit,
    get output() { return `${stdout}\n${stderr}`; },
    write(sql) { child.stdin.write(sql); },
    end(sql = "") { child.stdin.end(sql); }
  };
}

async function runSql(label, sql) {
  const session = startPsql(label);
  session.end(sql);
  const result = await session.exit;
  if (result.code !== 0) {
    throw new Error(`${label} failed with code ${result.code ?? "null"}/${result.signal ?? "none"}: ${result.combined.slice(-4_000)}`);
  }
  return result.stdout.trim();
}

async function waitFor(session, pattern, label, timeoutMs = LOCK_POLL_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = session.output.match(pattern);
    if (match) return match;
    if (session.child.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${label} did not emit ${pattern}; output=${session.output.slice(-2_000)}`);
}

function claimsSql(authUserId) {
  const claims = JSON.stringify({ sub: authUserId, role: "authenticated", aal: "aal1", is_anonymous: false });
  return `
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', ${sqlLiteral(authUserId)}, true);
SELECT set_config('request.jwt.claims', ${sqlLiteral(claims)}, true);
`;
}

function transactionPrelude(authUserId) {
  return `
\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '12s';
SET LOCAL statement_timeout = '20s';
SET LOCAL idle_in_transaction_session_timeout = '24s';
SET LOCAL application_name = ${sqlLiteral(APPLICATION_NAME)};
${claimsSql(authUserId)}
`;
}

async function assertPristineTarget() {
  const raw = await runSql("pristine target inventory", `
SELECT jsonb_build_object(
  'identity', current_database() || '|' || current_user || '|' || current_setting('server_version'),
  'activeHarnessSessions', (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND application_name = ${sqlLiteral(APPLICATION_NAME)}),
  'authUsers', (SELECT count(*) FROM auth.users WHERE id = ANY (${uuidArray(authUsers.map(([id]) => id))})),
  'profiles', (SELECT count(*) FROM public.profiles WHERE auth_user_id = ANY (${uuidArray(authUsers.map(([id]) => id))})),
  'organizations', (SELECT count(*) FROM public.organizations WHERE id = ${sqlLiteral(ids.organization)}::uuid),
  'projects', (SELECT count(*) FROM public.projects WHERE id = ${sqlLiteral(ids.project)}::uuid),
  'invitations', (SELECT count(*) FROM public.invitations WHERE id = ANY (${uuidArray([
    ids.invitationAcceptRevoke,
    ids.invitationRevokeAccept,
    ids.invitationAcceptAccept,
    ids.invitationIssuerChange
  ])})),
  'auditTargets', (SELECT count(*) FROM public.admin_audit_events WHERE target_id = ANY (ARRAY[
    ${[ids.invitationAcceptRevoke, ids.invitationRevokeAccept, ids.invitationAcceptAccept, ids.invitationIssuerChange].map(sqlLiteral).join(",")}
  ]))
)::text;
`);
  const inventory = JSON.parse(raw.split(/\r?\n/).filter(Boolean).at(-1));
  assert.equal(inventory.identity, `${DATABASE}|${DB_USER}|17.6`);
  for (const key of ["activeHarnessSessions", "authUsers", "profiles", "organizations", "projects", "invitations", "auditTargets"]) {
    assert.equal(Number(inventory[key]), 0, `${key} must be zero before the one-shot committed probe`);
  }
  return inventory;
}

async function triggerSnapshot() {
  return runSql("trigger snapshot", `
SELECT coalesce(jsonb_agg(jsonb_build_object(
  'table', event_object_schema || '.' || event_object_table,
  'name', trigger_name,
  'timing', action_timing,
  'event', event_manipulation,
  'statement', action_statement
) ORDER BY event_object_schema, event_object_table, trigger_name, event_manipulation), '[]'::jsonb)::text
FROM information_schema.triggers
WHERE event_object_schema IN ('auth', 'public')
  AND event_object_table IN ('users', 'profiles', 'organizations', 'projects', 'organization_memberships', 'project_memberships', 'invitations', 'admin_audit_events');
`);
}

async function setupFixture() {
  const userValues = authUsers.map(([id, email]) => `(
    ${sqlLiteral(id)}::uuid, 'authenticated', 'authenticated', ${sqlLiteral(email)}, '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now(), false
  )`).join(",\n");
  await runSql("committed fixture setup", `
\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '20s';
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
) VALUES ${userValues};
INSERT INTO public.organizations (id, name, slug)
VALUES (${sqlLiteral(ids.organization)}::uuid, 'Sprint 10 committed invitation probe', 'sprint10-committed-invitation-probe');
INSERT INTO public.projects (id, organization_id, project_key, name)
VALUES (${sqlLiteral(ids.project)}::uuid, ${sqlLiteral(ids.organization)}::uuid,
  'sprint10-committed-invitation-probe', 'Sprint 10 committed invitation probe');
INSERT INTO public.organization_memberships (organization_id, profile_id, role, status)
SELECT ${sqlLiteral(ids.organization)}::uuid, profile.id,
  CASE WHEN profile.auth_user_id = ${sqlLiteral(ids.controller)}::uuid THEN 'owner' ELSE 'member' END,
  'active'
FROM public.profiles profile
WHERE profile.auth_user_id IN (${sqlLiteral(ids.controller)}::uuid, ${sqlLiteral(ids.issuer)}::uuid);
INSERT INTO public.project_memberships (organization_id, project_id, project_key, user_id, role, status)
SELECT ${sqlLiteral(ids.organization)}::uuid, ${sqlLiteral(ids.project)}::uuid,
  'sprint10-committed-invitation-probe', profile.id,
  CASE WHEN profile.auth_user_id = ${sqlLiteral(ids.controller)}::uuid THEN 'owner' ELSE 'admin' END,
  'active'
FROM public.profiles profile
WHERE profile.auth_user_id IN (${sqlLiteral(ids.controller)}::uuid, ${sqlLiteral(ids.issuer)}::uuid);
INSERT INTO public.invitations (
  id, organization_id, project_id, email, organization_role, project_role,
  token_hash, expires_at, created_by
)
SELECT fixture.id, ${sqlLiteral(ids.organization)}::uuid, ${sqlLiteral(ids.project)}::uuid,
  fixture.email, 'member', 'viewer', fixture.token_hash, now() + interval '1 day', profile.id
FROM (VALUES
  (${sqlLiteral(ids.invitationAcceptRevoke)}::uuid, ${sqlLiteral(authUsers[2][1])}, ${sqlLiteral(tokens.acceptRevoke)}, ${sqlLiteral(ids.controller)}::uuid),
  (${sqlLiteral(ids.invitationRevokeAccept)}::uuid, ${sqlLiteral(authUsers[3][1])}, ${sqlLiteral(tokens.revokeAccept)}, ${sqlLiteral(ids.controller)}::uuid),
  (${sqlLiteral(ids.invitationAcceptAccept)}::uuid, ${sqlLiteral(authUsers[4][1])}, ${sqlLiteral(tokens.acceptAccept)}, ${sqlLiteral(ids.controller)}::uuid),
  (${sqlLiteral(ids.invitationIssuerChange)}::uuid, ${sqlLiteral(authUsers[5][1])}, ${sqlLiteral(tokens.issuerChange)}, ${sqlLiteral(ids.issuer)}::uuid)
) AS fixture(id, email, token_hash, issuer_auth_user_id)
JOIN public.profiles profile ON profile.auth_user_id = fixture.issuer_auth_user_id;
COMMIT;
`);
}

async function pollBlocking(aPid, bPid, expectedRelations) {
  const deadline = Date.now() + LOCK_POLL_TIMEOUT_MS;
  let lastSnapshot = null;
  while (Date.now() < deadline) {
    const raw = await runSql("committed pg_locks poll", `
SELECT jsonb_build_object(
  'blockedByA', ${Number(aPid)} = ANY(pg_blocking_pids(${Number(bPid)})),
  'waitingLocks', (SELECT count(*) FROM pg_locks WHERE pid = ${Number(bPid)} AND NOT granted),
  'aRelations', coalesce((
    SELECT jsonb_agg(DISTINCT namespace.nspname || '.' || relation.relname)
    FROM pg_locks lock
    JOIN pg_class relation ON relation.oid = lock.relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE lock.pid = ${Number(aPid)} AND lock.granted
  ), '[]'::jsonb)
)::text;
`);
    lastSnapshot = JSON.parse(raw.split(/\r?\n/).filter(Boolean).at(-1));
    if (lastSnapshot.blockedByA && Number(lastSnapshot.waitingLocks) > 0) {
      for (const relation of expectedRelations) {
        assert(lastSnapshot.aRelations.includes(relation), `session A must hold ${relation}`);
      }
      return lastSnapshot;
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error(`session B did not enter a pg_locks wait blocked by A: ${JSON.stringify(lastSnapshot)}`);
}

function expectedConflictBlock(command, sqlState, name) {
  return `
DO $conflict$
BEGIN
  ${command};
  RAISE EXCEPTION 'unexpected success for ${name}' USING ERRCODE = 'P0001';
EXCEPTION WHEN SQLSTATE ${sqlLiteral(sqlState)} THEN
  NULL;
END
$conflict$;
SELECT 'HARNESS|B_EXPECTED_SQLSTATE|${name}|${sqlState}';
`;
}

function aTransaction(name, actor, command, gateKey) {
  return `${transactionPrelude(actor)}
SELECT 'HARNESS|A_PID|' || pg_backend_pid();
${command};
SELECT 'HARNESS|A_RPC_DONE|${name}';
SELECT pg_advisory_xact_lock(96010, ${gateKey});
SELECT 'HARNESS|A_GATE_PASSED|${name}';
COMMIT;
SELECT 'HARNESS|A_COMMITTED|${name}';
`;
}

function bTransaction(name, actor, command, expectedSqlState) {
  return `${transactionPrelude(actor)}
SELECT 'HARNESS|B_PID|' || pg_backend_pid();
SELECT 'HARNESS|B_CALL_START|${name}';
${expectedConflictBlock(command, expectedSqlState, name)}
COMMIT;
SELECT 'HARNESS|B_EMPTY_COMMIT|${name}';
`;
}

async function runRace({ name, gateKey, aSql, bSql, expectedSqlState, expectedRelations, verifySql }) {
  const control = startPsql(`${name} control`);
  const a = startPsql(`${name} A`);
  const b = startPsql(`${name} B`);
  try {
    control.write(`
SET application_name = ${sqlLiteral(APPLICATION_NAME)};
SET idle_session_timeout = '26s';
SELECT pg_advisory_lock(96010, ${gateKey});
SELECT 'HARNESS|CONTROL_READY|${name}';
`);
    await waitFor(control, new RegExp(`HARNESS\\|CONTROL_READY\\|${name}`), `${name} control ready`);

    a.end(aSql);
    const aPid = Number((await waitFor(a, /HARNESS\|A_PID\|(\d+)/, `${name} A pid`))[1]);
    await waitFor(a, new RegExp(`HARNESS\\|A_RPC_DONE\\|${name}`), `${name} A mutation`);

    b.end(bSql);
    const bPid = Number((await waitFor(b, /HARNESS\|B_PID\|(\d+)/, `${name} B pid`))[1]);
    await waitFor(b, new RegExp(`HARNESS\\|B_CALL_START\\|${name}`), `${name} B call`);
    const lockEvidence = await pollBlocking(aPid, bPid, expectedRelations);

    control.end(`
SELECT pg_advisory_unlock(96010, ${gateKey});
SELECT 'HARNESS|CONTROL_RELEASED|${name}';
\\q
`);
    const [aResult, bResult, controlResult] = await Promise.all([a.exit, b.exit, control.exit]);
    for (const [label, result] of [["A", aResult], ["B", bResult], ["control", controlResult]]) {
      assert.equal(result.code, 0, `${name} ${label} failed: ${result.combined.slice(-2_000)}`);
      assert(!result.combined.includes("deadlock detected") && !result.combined.includes("40P01"), `${name} ${label} deadlocked`);
    }
    assert(aResult.combined.includes(`HARNESS|A_COMMITTED|${name}`), `${name} A did not commit`);
    assert(bResult.combined.includes(`HARNESS|B_EXPECTED_SQLSTATE|${name}|${expectedSqlState}`), `${name} B did not catch ${expectedSqlState}`);
    assert(bResult.combined.includes(`HARNESS|B_EMPTY_COMMIT|${name}`), `${name} B did not complete its empty commit`);

    const verification = JSON.parse((await runSql(`${name} verification`, verifySql)).split(/\r?\n/).filter(Boolean).at(-1));
    for (const [key, value] of Object.entries(verification)) {
      if (key.endsWith("Ok")) assert.equal(value, true, `${name} failed ${key}: ${JSON.stringify(verification)}`);
    }
    return { name, expectedSqlState, aPid, bPid, lockEvidence, verification };
  } finally {
    for (const session of [control, a, b]) {
      if (session.child.exitCode === null) session.child.kill("SIGTERM");
    }
  }
}

function invitationVerifySql(invitationId, fields) {
  return `
SELECT jsonb_build_object(${fields})::text
FROM public.invitations invitation
WHERE invitation.id = ${sqlLiteral(invitationId)}::uuid;
`;
}

function membershipCountSql(authUserId, type) {
  if (type === "organization") {
    return `(SELECT count(*) FROM public.organization_memberships membership JOIN public.profiles profile ON profile.id = membership.profile_id WHERE profile.auth_user_id = ${sqlLiteral(authUserId)}::uuid AND membership.organization_id = invitation.organization_id)`;
  }
  return `(SELECT count(*) FROM public.project_memberships membership JOIN public.profiles profile ON profile.id = membership.user_id WHERE profile.auth_user_id = ${sqlLiteral(authUserId)}::uuid AND membership.project_id = invitation.project_id)`;
}

function auditCountSql(requestId) {
  return `(SELECT count(*) FROM public.admin_audit_events WHERE request_id = ${sqlLiteral(requestId)}::uuid)`;
}

async function main() {
  const startedAt = new Date().toISOString();
  const pristine = await assertPristineTarget();
  const triggersBefore = await triggerSnapshot();
  const deadlocksBefore = Number(await runSql("deadlock baseline", "SELECT deadlocks FROM pg_stat_database WHERE datname = current_database();"));
  await setupFixture();

  const issuerProfile = (await runSql("issuer profile", `SELECT id FROM public.profiles WHERE auth_user_id = ${sqlLiteral(ids.issuer)}::uuid;`)).trim();
  const issuerMembershipVersion = Number((await runSql("issuer membership version", `SELECT row_version FROM public.project_memberships WHERE project_id = ${sqlLiteral(ids.project)}::uuid AND user_id = ${sqlLiteral(issuerProfile)}::uuid;`)).trim());
  assert(issuerProfile, "issuer profile is required");
  assert(Number.isInteger(issuerMembershipVersion), "issuer membership version is required");

  const scenarios = [];
  scenarios.push(await runRace({
    name: "accept_vs_revoke_committed",
    gateKey: 1,
    aSql: aTransaction(
      "accept_vs_revoke_committed",
      ids.acceptRevokeRecipient,
      `SELECT api.accept_invitation(${sqlLiteral(tokens.acceptRevoke)}, ${sqlLiteral(requestIds.acceptRevokeAccept)}::uuid)`,
      1
    ),
    bSql: bTransaction(
      "accept_vs_revoke_committed",
      ids.controller,
      `PERFORM api.revoke_invitation(${sqlLiteral(ids.invitationAcceptRevoke)}::uuid, 1, ${sqlLiteral(requestIds.acceptRevokeRevoke)}::uuid)`,
      "40001"
    ),
    expectedSqlState: "40001",
    expectedRelations: ["public.organizations", "public.projects", "public.invitations"],
    verifySql: invitationVerifySql(ids.invitationAcceptRevoke, `
      'statusOk', invitation.status = 'accepted' AND invitation.accepted_at IS NOT NULL AND invitation.accepted_by IS NOT NULL,
      'winnerAuditOk', ${auditCountSql(requestIds.acceptRevokeAccept)} = 1,
      'loserAuditOk', ${auditCountSql(requestIds.acceptRevokeRevoke)} = 0,
      'organizationMembershipOk', ${membershipCountSql(ids.acceptRevokeRecipient, "organization")} = 1,
      'projectMembershipOk', ${membershipCountSql(ids.acceptRevokeRecipient, "project")} = 1
    `)
  }));

  scenarios.push(await runRace({
    name: "revoke_vs_accept_committed",
    gateKey: 2,
    aSql: aTransaction(
      "revoke_vs_accept_committed",
      ids.controller,
      `SELECT api.revoke_invitation(${sqlLiteral(ids.invitationRevokeAccept)}::uuid, 1, ${sqlLiteral(requestIds.revokeAcceptRevoke)}::uuid)`,
      2
    ),
    bSql: bTransaction(
      "revoke_vs_accept_committed",
      ids.revokeAcceptRecipient,
      `PERFORM api.accept_invitation(${sqlLiteral(tokens.revokeAccept)}, ${sqlLiteral(requestIds.revokeAcceptAccept)}::uuid)`,
      "23514"
    ),
    expectedSqlState: "23514",
    expectedRelations: ["public.organizations", "public.projects", "public.invitations"],
    verifySql: invitationVerifySql(ids.invitationRevokeAccept, `
      'statusOk', invitation.status = 'revoked' AND invitation.accepted_at IS NULL AND invitation.accepted_by IS NULL,
      'winnerAuditOk', ${auditCountSql(requestIds.revokeAcceptRevoke)} = 1,
      'loserAuditOk', ${auditCountSql(requestIds.revokeAcceptAccept)} = 0,
      'organizationMembershipOk', ${membershipCountSql(ids.revokeAcceptRecipient, "organization")} = 0,
      'projectMembershipOk', ${membershipCountSql(ids.revokeAcceptRecipient, "project")} = 0
    `)
  }));

  scenarios.push(await runRace({
    name: "accept_vs_accept_committed",
    gateKey: 3,
    aSql: aTransaction(
      "accept_vs_accept_committed",
      ids.acceptAcceptRecipient,
      `SELECT api.accept_invitation(${sqlLiteral(tokens.acceptAccept)}, ${sqlLiteral(requestIds.acceptAcceptFirst)}::uuid)`,
      3
    ),
    bSql: bTransaction(
      "accept_vs_accept_committed",
      ids.acceptAcceptRecipient,
      `PERFORM api.accept_invitation(${sqlLiteral(tokens.acceptAccept)}, ${sqlLiteral(requestIds.acceptAcceptSecond)}::uuid)`,
      "23514"
    ),
    expectedSqlState: "23514",
    expectedRelations: ["public.organizations", "public.projects", "public.invitations"],
    verifySql: invitationVerifySql(ids.invitationAcceptAccept, `
      'statusOk', invitation.status = 'accepted' AND invitation.accepted_at IS NOT NULL AND invitation.accepted_by IS NOT NULL,
      'winnerAuditOk', ${auditCountSql(requestIds.acceptAcceptFirst)} = 1,
      'loserAuditOk', ${auditCountSql(requestIds.acceptAcceptSecond)} = 0,
      'organizationMembershipOk', ${membershipCountSql(ids.acceptAcceptRecipient, "organization")} = 1,
      'projectMembershipOk', ${membershipCountSql(ids.acceptAcceptRecipient, "project")} = 1
    `)
  }));

  scenarios.push(await runRace({
    name: "issuer_change_vs_accept_committed",
    gateKey: 4,
    aSql: aTransaction(
      "issuer_change_vs_accept_committed",
      ids.controller,
      `SELECT api.set_project_member(
        ${sqlLiteral(ids.project)}::uuid,
        ${sqlLiteral(issuerProfile)}::uuid,
        'admin', 'disabled', ${issuerMembershipVersion},
        ${sqlLiteral(requestIds.issuerChangeDisable)}::uuid
      )`,
      4
    ),
    bSql: bTransaction(
      "issuer_change_vs_accept_committed",
      ids.issuerChangeRecipient,
      `PERFORM api.accept_invitation(${sqlLiteral(tokens.issuerChange)}, ${sqlLiteral(requestIds.issuerChangeAccept)}::uuid)`,
      "42501"
    ),
    expectedSqlState: "42501",
    expectedRelations: ["public.organizations", "public.projects", "public.project_memberships"],
    verifySql: invitationVerifySql(ids.invitationIssuerChange, `
      'statusOk', invitation.status = 'pending' AND invitation.accepted_at IS NULL AND invitation.accepted_by IS NULL,
      'winnerAuditOk', ${auditCountSql(requestIds.issuerChangeDisable)} = 1,
      'loserAuditOk', ${auditCountSql(requestIds.issuerChangeAccept)} = 0,
      'issuerDisabledOk', (SELECT membership.status = 'disabled' FROM public.project_memberships membership WHERE membership.project_id = invitation.project_id AND membership.user_id = ${sqlLiteral(issuerProfile)}::uuid),
      'organizationMembershipOk', ${membershipCountSql(ids.issuerChangeRecipient, "organization")} = 0,
      'projectMembershipOk', ${membershipCountSql(ids.issuerChangeRecipient, "project")} = 0
    `)
  }));

  const deadlocksAfter = Number(await runSql("deadlock final", "SELECT deadlocks FROM pg_stat_database WHERE datname = current_database();"));
  assert.equal(deadlocksAfter, deadlocksBefore, `deadlock counter changed from ${deadlocksBefore} to ${deadlocksAfter}`);
  const triggersAfter = await triggerSnapshot();
  assert.equal(triggersAfter, triggersBefore, "trigger definitions changed during committed probe");

  const finalEvidence = JSON.parse(await runSql("retained committed evidence", `
SELECT jsonb_build_object(
  'authUsers', (SELECT count(*) FROM auth.users WHERE id = ANY (${uuidArray(authUsers.map(([id]) => id))})),
  'profiles', (SELECT count(*) FROM public.profiles WHERE auth_user_id = ANY (${uuidArray(authUsers.map(([id]) => id))})),
  'organizations', (SELECT count(*) FROM public.organizations WHERE id = ${sqlLiteral(ids.organization)}::uuid),
  'projects', (SELECT count(*) FROM public.projects WHERE id = ${sqlLiteral(ids.project)}::uuid),
  'invitations', (SELECT count(*) FROM public.invitations WHERE organization_id = ${sqlLiteral(ids.organization)}::uuid),
  'invitationStates', (SELECT jsonb_object_agg(status, count) FROM (SELECT status, count(*) AS count FROM public.invitations WHERE organization_id = ${sqlLiteral(ids.organization)}::uuid GROUP BY status) states),
  'winnerAuditRows', (SELECT count(*) FROM public.admin_audit_events WHERE request_id = ANY (${uuidArray(winnerRequestIds)})),
  'loserAuditRows', (SELECT count(*) FROM public.admin_audit_events WHERE request_id = ANY (${uuidArray(loserRequestIds)})),
  'recipientOrganizationMemberships', (SELECT count(*) FROM public.organization_memberships membership JOIN public.profiles profile ON profile.id = membership.profile_id WHERE profile.auth_user_id = ANY (${uuidArray([
    ids.acceptRevokeRecipient,
    ids.revokeAcceptRecipient,
    ids.acceptAcceptRecipient,
    ids.issuerChangeRecipient
  ])}) AND membership.organization_id = ${sqlLiteral(ids.organization)}::uuid),
  'recipientProjectMemberships', (SELECT count(*) FROM public.project_memberships membership JOIN public.profiles profile ON profile.id = membership.user_id WHERE profile.auth_user_id = ANY (${uuidArray([
    ids.acceptRevokeRecipient,
    ids.revokeAcceptRecipient,
    ids.acceptAcceptRecipient,
    ids.issuerChangeRecipient
  ])}) AND membership.project_id = ${sqlLiteral(ids.project)}::uuid),
  'issuerDisabled', (SELECT status = 'disabled' FROM public.project_memberships WHERE project_id = ${sqlLiteral(ids.project)}::uuid AND user_id = ${sqlLiteral(issuerProfile)}::uuid)
)::text;
`));
  assert.deepEqual(finalEvidence.invitationStates, { accepted: 2, pending: 1, revoked: 1 });
  assert.equal(Number(finalEvidence.authUsers), 6);
  assert.equal(Number(finalEvidence.profiles), 6);
  assert.equal(Number(finalEvidence.organizations), 1);
  assert.equal(Number(finalEvidence.projects), 1);
  assert.equal(Number(finalEvidence.invitations), 4);
  assert.equal(Number(finalEvidence.winnerAuditRows), 4);
  assert.equal(Number(finalEvidence.loserAuditRows), 0);
  assert.equal(Number(finalEvidence.recipientOrganizationMemberships), 2);
  assert.equal(Number(finalEvidence.recipientProjectMemberships), 2);
  assert.equal(finalEvidence.issuerDisabled, true);

  console.log(JSON.stringify({
    status: "PASS",
    evidenceRetention: "INTENTIONAL_SYNTHETIC_LOCAL_ONLY_NO_CLEANUP",
    environment: {
      dockerContext: DOCKER_CONTEXT,
      container: CONTAINER,
      network: "none",
      publishedPorts: 0,
      database: DATABASE,
      transport: "unix_socket",
      databaseUser: DB_USER,
      postgres: "17.6"
    },
    startedAt,
    completedAt: new Date().toISOString(),
    pristine,
    deadlocksBefore,
    deadlocksAfter,
    triggersUnchanged: true,
    requestIds,
    scenarios,
    finalEvidence
  }, null, 2));
}

main().catch((error) => {
  for (const child of activeProcesses) child.kill("SIGTERM");
  console.error(error instanceof Error ? error.stack : String(error));
  console.error("FAIL_CLOSED: retained local synthetic rows may be partial; do not rerun or clean automatically.");
  process.exitCode = 1;
});
