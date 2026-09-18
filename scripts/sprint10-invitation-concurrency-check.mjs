#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const DOCKER_CONTEXT = "colima-geoai-sprint10";
const CONTAINER = "geoai-sprint10-restore";
const DATABASE = "geoai_invitation_concurrency";
const DB_USER = "supabase_admin";
const SOCKET = "/var/run/postgresql";
const PROCESS_TIMEOUT_MS = 25_000;
const LOCK_POLL_TIMEOUT_MS = 8_000;

const ids = {
  controller: "95000000-0000-0000-0000-000000000001",
  issuer: "95000000-0000-0000-0000-000000000002",
  acceptRevokeRecipient: "95000000-0000-0000-0000-000000000003",
  revokeAcceptRecipient: "95000000-0000-0000-0000-000000000004",
  acceptAcceptRecipient: "95000000-0000-0000-0000-000000000005",
  issuerChangeRecipient: "95000000-0000-0000-0000-000000000006",
  organization: "95000000-0000-0000-0000-000000000101",
  project: "95000000-0000-0000-0000-000000000201",
  invitationAcceptRevoke: "95000000-0000-0000-0000-000000000401",
  invitationRevokeAccept: "95000000-0000-0000-0000-000000000402",
  invitationAcceptAccept: "95000000-0000-0000-0000-000000000403",
  invitationIssuerChange: "95000000-0000-0000-0000-000000000404"
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

const tokens = {
  acceptRevoke: createHash("sha256").update("geoai-sprint10-accept-revoke").digest("hex"),
  revokeAccept: createHash("sha256").update("geoai-sprint10-revoke-accept").digest("hex"),
  acceptAccept: createHash("sha256").update("geoai-sprint10-accept-accept").digest("hex"),
  issuerChange: createHash("sha256").update("geoai-sprint10-issuer-change").digest("hex")
};

const authUsers = [
  [ids.controller, "concurrency-controller@test.invalid"],
  [ids.issuer, "concurrency-issuer@test.invalid"],
  [ids.acceptRevokeRecipient, "concurrency-accept-revoke@test.invalid"],
  [ids.revokeAcceptRecipient, "concurrency-revoke-accept@test.invalid"],
  [ids.acceptAcceptRecipient, "concurrency-accept-accept@test.invalid"],
  [ids.issuerChangeRecipient, "concurrency-issuer-change@test.invalid"]
];

const activeProcesses = new Set();

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
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

async function runSql(label, sql) {
  const session = startPsql(label);
  session.end(sql);
  const result = await session.exit;
  if (result.code !== 0) {
    throw new Error(`${label} failed with code ${result.code ?? "null"}/${result.signal ?? "none"}: ${result.combined.slice(-4_000)}`);
  }
  return result.stdout.trim();
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
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '18s';
SET LOCAL idle_in_transaction_session_timeout = '20s';
${claimsSql(authUserId)}
`;
}

const cleanupSql = `
\\set ON_ERROR_STOP on
BEGIN;
-- Delete only mutable synthetic fixtures through normal constraints/triggers.
-- Append-only audit events are intentionally preserved as immutable test evidence.
DELETE FROM public.invitations WHERE organization_id = ${sqlLiteral(ids.organization)}::uuid;
DELETE FROM public.projects WHERE id = ${sqlLiteral(ids.project)}::uuid;
DELETE FROM public.organizations WHERE id = ${sqlLiteral(ids.organization)}::uuid;
DELETE FROM public.profiles WHERE auth_user_id = ANY (ARRAY[${authUsers.map(([id]) => `${sqlLiteral(id)}::uuid`).join(",")}]);
DELETE FROM auth.users WHERE id = ANY (ARRAY[${authUsers.map(([id]) => `${sqlLiteral(id)}::uuid`).join(",")}]);
COMMIT;
`;

async function verifyTargetAndSource() {
  const target = await runSql("target inventory", `
SELECT current_database() || '|' || current_user || '|' || current_setting('server_version');
SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND application_name = 'geoai-sprint10-invitation-concurrency';
`);
  const [identity, processCount] = target.split(/\r?\n/).filter(Boolean);
  assert.equal(identity, `${DATABASE}|${DB_USER}|17.6`);
  assert.equal(processCount, "0", "a duplicate concurrency harness session already exists");

  const migration = await readFile(new URL("../supabase/migrations/20260918182922_geoai_invitation_authority_hardening_v1.sql", import.meta.url), "utf8");
  const acceptStart = migration.indexOf("create or replace function geoai_private.admin_accept_invitation");
  const acceptEnd = migration.indexOf("revoke all on function geoai_private.admin_create_invitation", acceptStart);
  const accept = migration.slice(acceptStart, acceptEnd);
  const organizationLock = accept.indexOf("from public.organizations organization");
  const projectLock = accept.indexOf("from public.projects project", organizationLock);
  const invitationLock = accept.indexOf("select *\n  into invitation\n  from public.invitations candidate", projectLock);
  assert(organizationLock >= 0 && projectLock > organizationLock && invitationLock > projectLock,
    "accept function must retain organization -> project -> invitation lock order");
  const revokeMigration = await readFile(new URL("../supabase/migrations/20260716175210_geoai_auth_admin_lifecycle_remediation_v1.sql", import.meta.url), "utf8");
  const revokeStart = revokeMigration.indexOf("create or replace function geoai_private.admin_revoke_invitation");
  const revokeEnd = revokeMigration.indexOf("revoke all on function geoai_private.admin_accept_invitation", revokeStart);
  const revoke = revokeMigration.slice(revokeStart, revokeEnd);
  const revokeOrganization = revoke.indexOf("from public.organizations organization");
  const revokeProject = revoke.indexOf("from public.projects project", revokeOrganization);
  const revokeInvitation = revoke.indexOf("select *\n  into invitation\n  from public.invitations candidate", revokeProject);
  assert(revokeOrganization >= 0 && revokeProject > revokeOrganization && revokeInvitation > revokeProject,
    "revoke function must retain organization -> project -> invitation lock order");
}

async function setupFixture() {
  await runSql("fixture pre-clean", cleanupSql);
  const userValues = authUsers.map(([id, email]) => `(
    ${sqlLiteral(id)}::uuid, 'authenticated', 'authenticated', ${sqlLiteral(email)}, '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now(), false
  )`).join(",\n");
  await runSql("fixture setup", `
\\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
) VALUES ${userValues};
INSERT INTO public.organizations (id, name, slug)
VALUES (${sqlLiteral(ids.organization)}::uuid, 'Sprint 10 invitation concurrency', 'sprint10-invitation-concurrency');
INSERT INTO public.projects (id, organization_id, project_key, name)
VALUES (${sqlLiteral(ids.project)}::uuid, ${sqlLiteral(ids.organization)}::uuid,
  'sprint10-invitation-concurrency', 'Sprint 10 invitation concurrency');
INSERT INTO public.organization_memberships (organization_id, profile_id, role, status)
SELECT ${sqlLiteral(ids.organization)}::uuid, profile.id,
  CASE WHEN profile.auth_user_id = ${sqlLiteral(ids.controller)}::uuid THEN 'owner' ELSE 'member' END,
  'active'
FROM public.profiles profile
WHERE profile.auth_user_id IN (${sqlLiteral(ids.controller)}::uuid, ${sqlLiteral(ids.issuer)}::uuid);
INSERT INTO public.project_memberships (organization_id, project_id, project_key, user_id, role, status)
SELECT ${sqlLiteral(ids.organization)}::uuid, ${sqlLiteral(ids.project)}::uuid,
  'sprint10-invitation-concurrency', profile.id,
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
    const raw = await runSql("pg_locks poll", `
SELECT jsonb_build_object(
  'blockedByA', ${Number(aPid)} = ANY(pg_blocking_pids(${Number(bPid)})),
  'waitingLocks', (SELECT count(*) FROM pg_locks WHERE pid = ${Number(bPid)} AND NOT granted),
  'aRelations', COALESCE((
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
        assert(lastSnapshot.aRelations.includes(relation), `session A must hold ${relation}; snapshot=${raw}`);
      }
      return lastSnapshot;
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error(`session B did not enter a pg_locks wait blocked by A: ${JSON.stringify(lastSnapshot)}`);
}

async function runRace({ name, gateKey, aSql, bSql, expectedRelations, verifySql }) {
  const control = startPsql(`${name} control`);
  const a = startPsql(`${name} A`);
  const b = startPsql(`${name} B`);
  try {
    control.write(`
SET application_name = 'geoai-sprint10-invitation-concurrency';
SET idle_session_timeout = '22s';
SELECT pg_advisory_lock(95010, ${gateKey});
SELECT 'HARNESS|CONTROL_READY|${name}';
`);
    await waitFor(control, new RegExp(`HARNESS\\|CONTROL_READY\\|${name}`), `${name} control ready`);

    a.write(aSql);
    a.end();
    const aPidMatch = await waitFor(a, /HARNESS\|A_PID\|(\d+)/, `${name} A pid`);
    await waitFor(a, new RegExp(`HARNESS\\|A_RPC_DONE\\|${name}`), `${name} A rpc completion`);

    b.write(bSql);
    b.end();
    const bPidMatch = await waitFor(b, /HARNESS\|B_PID\|(\d+)/, `${name} B pid`);
    await waitFor(b, new RegExp(`HARNESS\\|B_CALL_START\\|${name}`), `${name} B call start`);
    const lockEvidence = await pollBlocking(aPidMatch[1], bPidMatch[1], expectedRelations);

    control.end(`
SELECT pg_advisory_unlock(95010, ${gateKey});
SELECT 'HARNESS|CONTROL_RELEASED|${name}';
\\q
`);
    const [aResult, bResult, controlResult] = await Promise.all([a.exit, b.exit, control.exit]);
    for (const [label, result] of [["A", aResult], ["B", bResult], ["control", controlResult]]) {
      assert.equal(result.code, 0, `${name} ${label} failed: ${result.combined.slice(-2_000)}`);
      assert(!result.combined.includes("deadlock detected") && !result.combined.includes("40P01"), `${name} ${label} deadlocked`);
    }
    assert(bResult.combined.includes(`HARNESS|B_SUCCEEDED_AND_ROLLED_BACK|${name}`),
      `${name} B did not complete after A rollback: ${bResult.combined.slice(-2_000)}`);
    const verificationOutput = await runSql(`${name} verification`, verifySql);
    const line = verificationOutput.split(/\r?\n/).find((entry) => entry.startsWith("HARNESS|VERIFY|"));
    assert(line, `${name} verification marker missing: ${verificationOutput}`);
    const verification = JSON.parse(line.slice("HARNESS|VERIFY|".length));
    for (const [key, value] of Object.entries(verification)) {
      assert(value === true || value === 0 || value === 1, `${name} unexpected verification value ${key}=${value}`);
      if (key.endsWith("Ok")) assert.equal(value, true, `${name} failed ${key}`);
    }
    return { name, aPid: Number(aPidMatch[1]), bPid: Number(bPidMatch[1]), lockEvidence, verification };
  } finally {
    for (const session of [control, a, b]) {
      if (session.child.exitCode === null) session.child.kill("SIGTERM");
    }
  }
}

function acceptSql(name, actor, tokenHash, requestId, gateKey) {
  return `${transactionPrelude(actor)}
SET LOCAL application_name = 'geoai-sprint10-invitation-concurrency';
SELECT 'HARNESS|A_PID|' || pg_backend_pid();
SELECT api.accept_invitation(${sqlLiteral(tokenHash)}, ${sqlLiteral(requestId)}::uuid);
SELECT 'HARNESS|A_RPC_DONE|${name}';
SELECT pg_advisory_xact_lock(95010, ${gateKey});
SELECT 'HARNESS|A_GATE_PASSED|${name}';
ROLLBACK;
SELECT 'HARNESS|A_ROLLED_BACK|${name}';
`;
}

function revokeSql(name, actor, invitationId, requestId, gateKey) {
  return `${transactionPrelude(actor)}
SET LOCAL application_name = 'geoai-sprint10-invitation-concurrency';
SELECT 'HARNESS|A_PID|' || pg_backend_pid();
SELECT api.revoke_invitation(
  ${sqlLiteral(invitationId)}::uuid, 1, ${sqlLiteral(requestId)}::uuid
);
SELECT 'HARNESS|A_RPC_DONE|${name}';
SELECT pg_advisory_xact_lock(95010, ${gateKey});
SELECT 'HARNESS|A_GATE_PASSED|${name}';
ROLLBACK;
SELECT 'HARNESS|A_ROLLED_BACK|${name}';
`;
}

function successRollbackSql(name, actor, command) {
  return `${transactionPrelude(actor)}
SET LOCAL application_name = 'geoai-sprint10-invitation-concurrency';
SELECT 'HARNESS|B_PID|' || pg_backend_pid();
SELECT 'HARNESS|B_CALL_START|${name}';
${command};
SELECT 'HARNESS|B_SUCCEEDED_AND_ROLLED_BACK|${name}';
ROLLBACK;
SELECT 'HARNESS|B_DONE|${name}';
`;
}

function verificationSql(invitationToken, recipientAuthUser, fieldsSql) {
  return `
SELECT 'HARNESS|VERIFY|' || jsonb_build_object(
  ${fieldsSql}
)::text
FROM public.invitations invitation
WHERE invitation.token_hash = ${sqlLiteral(invitationToken)};
`;
}

function expectedStateBlock(command, sqlState) {
  return `
DO $conflict$
BEGIN
  ${command};
  RAISE EXCEPTION 'unexpected success' USING ERRCODE = 'P0001';
EXCEPTION WHEN SQLSTATE ${sqlLiteral(sqlState)} THEN
  NULL;
END
$conflict$;
`;
}

async function verifyPostLockConflictSemantics(issuerProfile, membershipVersion) {
  const cases = [
    {
      name: "accept_then_revoke",
      sql: `${transactionPrelude(ids.acceptRevokeRecipient)}
SELECT api.accept_invitation(${sqlLiteral(tokens.acceptRevoke)}, ${sqlLiteral(requestIds.acceptRevokeAccept)}::uuid);
RESET ROLE;
${claimsSql(ids.controller)}
${expectedStateBlock(`PERFORM api.revoke_invitation(${sqlLiteral(ids.invitationAcceptRevoke)}::uuid, 1, ${sqlLiteral(requestIds.acceptRevokeRevoke)}::uuid)`, "40001")}
SELECT 'HARNESS|CONFLICT_OK|accept_then_revoke|40001';
ROLLBACK;
`
    },
    {
      name: "revoke_then_accept",
      sql: `${transactionPrelude(ids.controller)}
SELECT api.revoke_invitation(${sqlLiteral(ids.invitationRevokeAccept)}::uuid, 1, ${sqlLiteral(requestIds.revokeAcceptRevoke)}::uuid);
RESET ROLE;
${claimsSql(ids.revokeAcceptRecipient)}
${expectedStateBlock(`PERFORM api.accept_invitation(${sqlLiteral(tokens.revokeAccept)}, ${sqlLiteral(requestIds.revokeAcceptAccept)}::uuid)`, "23514")}
SELECT 'HARNESS|CONFLICT_OK|revoke_then_accept|23514';
ROLLBACK;
`
    },
    {
      name: "accept_then_accept",
      sql: `${transactionPrelude(ids.acceptAcceptRecipient)}
SELECT api.accept_invitation(${sqlLiteral(tokens.acceptAccept)}, ${sqlLiteral(requestIds.acceptAcceptFirst)}::uuid);
${expectedStateBlock(`PERFORM api.accept_invitation(${sqlLiteral(tokens.acceptAccept)}, ${sqlLiteral(requestIds.acceptAcceptSecond)}::uuid)`, "23514")}
SELECT 'HARNESS|CONFLICT_OK|accept_then_accept|23514';
ROLLBACK;
`
    },
    {
      name: "issuer_change_then_accept",
      sql: `${transactionPrelude(ids.controller)}
SELECT api.set_project_member(
  ${sqlLiteral(ids.project)}::uuid, ${sqlLiteral(issuerProfile)}::uuid,
  'admin', 'disabled', ${membershipVersion}, ${sqlLiteral(requestIds.issuerChangeDisable)}::uuid
);
RESET ROLE;
${claimsSql(ids.issuerChangeRecipient)}
${expectedStateBlock(`PERFORM api.accept_invitation(${sqlLiteral(tokens.issuerChange)}, ${sqlLiteral(requestIds.issuerChangeAccept)}::uuid)`, "42501")}
SELECT 'HARNESS|CONFLICT_OK|issuer_change_then_accept|42501';
ROLLBACK;
`
    }
  ];
  const receipts = [];
  for (const testCase of cases) {
    const output = await runSql(`post-lock conflict ${testCase.name}`, testCase.sql);
    const marker = output.split(/\r?\n/).find((line) => line.startsWith(`HARNESS|CONFLICT_OK|${testCase.name}|`));
    assert(marker, `${testCase.name} conflict marker missing: ${output}`);
    receipts.push(marker);
  }
  return receipts;
}

async function main() {
  const startedAt = new Date().toISOString();
  await verifyTargetAndSource();
  const deadlocksBefore = Number(await runSql("deadlock baseline", "SELECT deadlocks FROM pg_stat_database WHERE datname = current_database();"));
  let fixtureReady = false;
  const receipts = [];
  let passReceipt = null;
  try {
    await setupFixture();
    fixtureReady = true;

    const invitationIds = await runSql("invitation id inventory", `
SELECT token_hash || '|' || id || '|' || row_version
FROM public.invitations
WHERE organization_id = ${sqlLiteral(ids.organization)}::uuid
ORDER BY token_hash;
`);
    const invitationByToken = new Map(invitationIds.split(/\r?\n/).filter(Boolean).map((line) => {
      const [token, id, rowVersion] = line.split("|");
      return [token, { id, rowVersion: Number(rowVersion) }];
    }));
    assert.equal(invitationByToken.size, 4, "fixture must contain exactly four invitations");

    const acceptRevokeName = "accept_vs_revoke";
    receipts.push(await runRace({
      name: acceptRevokeName,
      gateKey: 1,
      aSql: acceptSql(acceptRevokeName, ids.acceptRevokeRecipient, tokens.acceptRevoke, requestIds.acceptRevokeAccept, 1),
      bSql: successRollbackSql(
        acceptRevokeName,
        ids.controller,
        `SELECT api.revoke_invitation(${sqlLiteral(invitationByToken.get(tokens.acceptRevoke).id)}::uuid, 1, ${sqlLiteral(requestIds.acceptRevokeRevoke)}::uuid)`
      ),
      expectedRelations: ["public.organizations", "public.projects", "public.invitations"],
      verifySql: verificationSql(tokens.acceptRevoke, ids.acceptRevokeRecipient, `
        'statusOk', invitation.status = 'pending' AND invitation.accepted_at IS NULL AND invitation.accepted_by IS NULL,
        'acceptAuditOk', (SELECT count(*) = 0 FROM public.admin_audit_events WHERE request_id = ${sqlLiteral(requestIds.acceptRevokeAccept)}::uuid),
        'revokeAuditOk', (SELECT count(*) = 0 FROM public.admin_audit_events WHERE request_id = ${sqlLiteral(requestIds.acceptRevokeRevoke)}::uuid),
        'orgMembershipOk', (SELECT count(*) = 0 FROM public.organization_memberships membership JOIN public.profiles profile ON profile.id = membership.profile_id WHERE profile.auth_user_id = ${sqlLiteral(ids.acceptRevokeRecipient)}::uuid AND membership.organization_id = invitation.organization_id),
        'projectMembershipOk', (SELECT count(*) = 0 FROM public.project_memberships membership JOIN public.profiles profile ON profile.id = membership.user_id WHERE profile.auth_user_id = ${sqlLiteral(ids.acceptRevokeRecipient)}::uuid AND membership.project_id = invitation.project_id)
      `)
    }));

    const revokeAcceptName = "revoke_vs_accept";
    receipts.push(await runRace({
      name: revokeAcceptName,
      gateKey: 2,
      aSql: revokeSql(
        revokeAcceptName,
        ids.controller,
        invitationByToken.get(tokens.revokeAccept).id,
        requestIds.revokeAcceptRevoke,
        2
      ),
      bSql: successRollbackSql(
        revokeAcceptName,
        ids.revokeAcceptRecipient,
        `SELECT api.accept_invitation(${sqlLiteral(tokens.revokeAccept)}, ${sqlLiteral(requestIds.revokeAcceptAccept)}::uuid)`
      ),
      expectedRelations: ["public.organizations", "public.projects", "public.invitations"],
      verifySql: verificationSql(tokens.revokeAccept, ids.revokeAcceptRecipient, `
        'statusOk', invitation.status = 'pending' AND invitation.accepted_at IS NULL AND invitation.accepted_by IS NULL,
        'revokeAuditOk', (SELECT count(*) = 0 FROM public.admin_audit_events WHERE request_id = ${sqlLiteral(requestIds.revokeAcceptRevoke)}::uuid),
        'acceptAuditOk', (SELECT count(*) = 0 FROM public.admin_audit_events WHERE request_id = ${sqlLiteral(requestIds.revokeAcceptAccept)}::uuid),
        'orgMembershipOk', (SELECT count(*) = 0 FROM public.organization_memberships membership JOIN public.profiles profile ON profile.id = membership.profile_id WHERE profile.auth_user_id = ${sqlLiteral(ids.revokeAcceptRecipient)}::uuid AND membership.organization_id = invitation.organization_id),
        'projectMembershipOk', (SELECT count(*) = 0 FROM public.project_memberships membership JOIN public.profiles profile ON profile.id = membership.user_id WHERE profile.auth_user_id = ${sqlLiteral(ids.revokeAcceptRecipient)}::uuid AND membership.project_id = invitation.project_id)
      `)
    }));

    const acceptAcceptName = "accept_vs_accept";
    receipts.push(await runRace({
      name: acceptAcceptName,
      gateKey: 3,
      aSql: acceptSql(acceptAcceptName, ids.acceptAcceptRecipient, tokens.acceptAccept, requestIds.acceptAcceptFirst, 3),
      bSql: successRollbackSql(
        acceptAcceptName,
        ids.acceptAcceptRecipient,
        `SELECT api.accept_invitation(${sqlLiteral(tokens.acceptAccept)}, ${sqlLiteral(requestIds.acceptAcceptSecond)}::uuid)`
      ),
      expectedRelations: ["public.organizations", "public.projects", "public.invitations"],
      verifySql: verificationSql(tokens.acceptAccept, ids.acceptAcceptRecipient, `
        'statusOk', invitation.status = 'pending' AND invitation.accepted_at IS NULL AND invitation.accepted_by IS NULL,
        'acceptAuditOk', (SELECT count(*) = 0 FROM public.admin_audit_events WHERE request_id IN (${sqlLiteral(requestIds.acceptAcceptFirst)}::uuid, ${sqlLiteral(requestIds.acceptAcceptSecond)}::uuid)),
        'orgMembershipOk', (SELECT count(*) = 0 FROM public.organization_memberships membership JOIN public.profiles profile ON profile.id = membership.profile_id WHERE profile.auth_user_id = ${sqlLiteral(ids.acceptAcceptRecipient)}::uuid AND membership.organization_id = invitation.organization_id),
        'projectMembershipOk', (SELECT count(*) = 0 FROM public.project_memberships membership JOIN public.profiles profile ON profile.id = membership.user_id WHERE profile.auth_user_id = ${sqlLiteral(ids.acceptAcceptRecipient)}::uuid AND membership.project_id = invitation.project_id)
      `)
    }));

    const issuerChangeName = "issuer_change_vs_accept";
    const issuerProfile = (await runSql("issuer profile", `SELECT id FROM public.profiles WHERE auth_user_id = ${sqlLiteral(ids.issuer)}::uuid;`)).trim();
    const membershipVersion = Number((await runSql("issuer membership version", `SELECT row_version FROM public.project_memberships WHERE project_id = ${sqlLiteral(ids.project)}::uuid AND user_id = ${sqlLiteral(issuerProfile)}::uuid;`)).trim());
    const issuerChangeASql = `${transactionPrelude(ids.controller)}
SET LOCAL application_name = 'geoai-sprint10-invitation-concurrency';
SELECT 'HARNESS|A_PID|' || pg_backend_pid();
SELECT api.set_project_member(
  ${sqlLiteral(ids.project)}::uuid, ${sqlLiteral(issuerProfile)}::uuid,
  'admin', 'disabled', ${membershipVersion}, ${sqlLiteral(requestIds.issuerChangeDisable)}::uuid
);
SELECT 'HARNESS|A_RPC_DONE|${issuerChangeName}';
SELECT pg_advisory_xact_lock(95010, 4);
SELECT 'HARNESS|A_GATE_PASSED|${issuerChangeName}';
ROLLBACK;
SELECT 'HARNESS|A_ROLLED_BACK|${issuerChangeName}';
`;
    receipts.push(await runRace({
      name: issuerChangeName,
      gateKey: 4,
      aSql: issuerChangeASql,
      bSql: successRollbackSql(
        issuerChangeName,
        ids.issuerChangeRecipient,
        `SELECT api.accept_invitation(${sqlLiteral(tokens.issuerChange)}, ${sqlLiteral(requestIds.issuerChangeAccept)}::uuid)`
      ),
      expectedRelations: ["public.organizations", "public.projects", "public.project_memberships"],
      verifySql: verificationSql(tokens.issuerChange, ids.issuerChangeRecipient, `
        'statusOk', invitation.status = 'pending' AND invitation.accepted_at IS NULL AND invitation.accepted_by IS NULL,
        'acceptAuditOk', (SELECT count(*) = 0 FROM public.admin_audit_events WHERE request_id = ${sqlLiteral(requestIds.issuerChangeAccept)}::uuid),
        'membershipAuditOk', (SELECT count(*) = 0 FROM public.admin_audit_events WHERE request_id = ${sqlLiteral(requestIds.issuerChangeDisable)}::uuid),
        'issuerDisabledOk', (SELECT membership.status = 'active' FROM public.project_memberships membership WHERE membership.project_id = invitation.project_id AND membership.user_id = ${sqlLiteral(issuerProfile)}::uuid),
        'recipientOrgWriteOk', (SELECT count(*) = 0 FROM public.organization_memberships membership JOIN public.profiles profile ON profile.id = membership.profile_id WHERE profile.auth_user_id = ${sqlLiteral(ids.issuerChangeRecipient)}::uuid AND membership.organization_id = invitation.organization_id),
        'recipientProjectWriteOk', (SELECT count(*) = 0 FROM public.project_memberships membership JOIN public.profiles profile ON profile.id = membership.user_id WHERE profile.auth_user_id = ${sqlLiteral(ids.issuerChangeRecipient)}::uuid AND membership.project_id = invitation.project_id)
      `)
    }));

    const conflictSemantics = await verifyPostLockConflictSemantics(issuerProfile, membershipVersion);
    const deadlocksAfter = Number(await runSql("deadlock final", "SELECT deadlocks FROM pg_stat_database WHERE datname = current_database();"));
    assert.equal(deadlocksAfter, deadlocksBefore, `deadlock counter changed from ${deadlocksBefore} to ${deadlocksAfter}`);
    passReceipt = {
      status: "PASS",
      environment: { dockerContext: DOCKER_CONTEXT, container: CONTAINER, network: "none", publishedPorts: 0, database: DATABASE, transport: "unix_socket", databaseUser: DB_USER },
      sourceHead: "10d994d5864d96f22f2f829e747f1919e04f0fa8",
      startedAt,
      completedAt: new Date().toISOString(),
      deadlocksBefore,
      deadlocksAfter,
      requestIds,
      postLockConflictSemantics: conflictSemantics,
      scenarios: receipts
    };
  } finally {
    for (const child of activeProcesses) child.kill("SIGTERM");
    if (fixtureReady) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    await runSql("fixture cleanup", cleanupSql);
    const residue = Number(await runSql("fixture residue", `
SELECT
  (SELECT count(*) FROM public.organizations WHERE id = ${sqlLiteral(ids.organization)}::uuid)
  + (SELECT count(*) FROM public.projects WHERE id = ${sqlLiteral(ids.project)}::uuid)
  + (SELECT count(*) FROM public.invitations WHERE organization_id = ${sqlLiteral(ids.organization)}::uuid)
  + (SELECT count(*) FROM public.admin_audit_events WHERE organization_id = ${sqlLiteral(ids.organization)}::uuid)
  + (SELECT count(*) FROM public.profiles WHERE auth_user_id = ANY (ARRAY[${authUsers.map(([id]) => `${sqlLiteral(id)}::uuid`).join(",")}]))
  + (SELECT count(*) FROM auth.users WHERE id = ANY (ARRAY[${authUsers.map(([id]) => `${sqlLiteral(id)}::uuid`).join(",")}]))
;
`));
    assert.equal(residue, 0, `synthetic fixture residue=${residue}`);
    if (passReceipt) {
      const requestIdArray = Object.values(requestIds).map((id) => `${sqlLiteral(id)}::uuid`).join(",");
      const auditEvidence = JSON.parse(await runSql("append-only audit evidence", `
SELECT jsonb_build_object(
  'rows', count(*),
  'linkedRows', count(*) FILTER (WHERE organization_id IS NOT NULL OR project_id IS NOT NULL OR actor_profile_id IS NOT NULL)
)::text
FROM public.admin_audit_events
WHERE request_id = ANY (ARRAY[${requestIdArray}]);
`));
      assert.equal(Number(auditEvidence.rows), 0, "rollback-only checks must leave append-only audit unchanged");
      assert.equal(Number(auditEvidence.linkedRows), 0);
      passReceipt.cleanup = {
        mutableSyntheticRows: residue,
        appendOnlyAuditRowsCreated: Number(auditEvidence.rows),
        triggersDisabledOrAltered: false
      };
    }
  }
  assert(passReceipt);
  console.log(JSON.stringify(passReceipt, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
