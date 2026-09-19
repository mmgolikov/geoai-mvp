#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const SOURCE_DATABASE = "geoai_cloud_artifacts_20260919_r2";
const DATABASE_ENV = "GEOAI_SPRINT10_CLOUD_RACE_DATABASE";
const CONFIRM_ENV = "GEOAI_SPRINT10_CLOUD_RACE_CONFIRM";
const TARGET_PATTERN = /^geoai_cloud_artifacts_race_20260919_[a-z0-9_]{1,27}$/;
const DOCKER_HOST = "unix:///Users/mmgolikov/.colima/geoai-sprint10/docker.sock";
const CONTAINER = "geoai-sprint10-restore";
const SOCKET = "/var/run/postgresql";
const DB_USER = "supabase_admin";
const ADMIN_USER = "postgres";
const APPLICATION_NAME = "geoai-sprint10-cloud-committed-probe";
const PROCESS_TIMEOUT_MS = 75_000;
const LOCK_POLL_TIMEOUT_MS = 12_000;
const QUOTA_BYTES = 8_388_608;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pgtapPath = resolve(root, "supabase/tests/sprint10_point_object_project_artifacts.sql");
const deactivationPath = resolve(root, "supabase/operator/point_object_project_artifacts_v1_deactivation.sql");
const pgtap = readFileSync(pgtapPath, "utf8");
const deactivation = readFileSync(deactivationPath, "utf8");

const ids = {
  organization: "98100000-0000-0000-0000-000000000001",
  project: "98200000-0000-0000-0000-000000000001",
  countActor: "98300000-0000-0000-0000-000000000001",
  bytesActor: "98300000-0000-0000-0000-000000000002",
  independentA: "98300000-0000-0000-0000-000000000003",
  independentB: "98300000-0000-0000-0000-000000000004",
  casActor: "98300000-0000-0000-0000-000000000005"
};
const actors = Object.entries(ids).filter(([key]) => key.endsWith("Actor") || key.startsWith("independent"));
const activeProcesses = new Set();
let targetDatabase = null;
let cloneCreated = false;

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function staticContractCheck() {
  for (const token of [
    "create function pg_temp.local_project(",
    "create function pg_temp.artifact(",
    "create function pg_temp.padded_analyse_artifact(",
    "917504",
    "project artifact capacity exceeded",
    "per-actor bounded-byte quota is enforced transactionally"
  ]) assert(pgtap.includes(token), `pgTAP fixture contract missing: ${token}`);
  for (const token of [
    "set local lock_timeout = '5s'",
    "set local statement_timeout = '60s'",
    "set enabled = false",
    "drop function if exists api.put_point_object_project_artifact",
    "drop policy if exists point_object_project_artifacts_creator_select",
    "commit;"
  ]) assert(deactivation.toLowerCase().includes(token), `deactivation contract missing: ${token}`);
  assert(!/\b(delete|truncate)\b/i.test(deactivation), "deactivation must remain row-preserving");
  return {
    status: "PASS",
    mode: "STATIC_ONLY_NO_DATABASE_CALLS",
    sourceDatabase: SOURCE_DATABASE,
    requiredTargetPattern: TARGET_PATTERN.source,
    runtimeRequires: ["--run-local", DATABASE_ENV, CONFIRM_ENV],
    retainedTarget: true
  };
}

function dockerArgs(command) {
  return ["exec", "-i", CONTAINER, ...command];
}

function startProcess(label, command, args, timeoutMs = PROCESS_TIMEOUT_MS) {
  const child = spawn(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, DOCKER_HOST }
  });
  activeProcesses.add(child);
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const exit = new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${label} exceeded ${timeoutMs} ms`));
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timeout);
      activeProcesses.delete(child);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      activeProcesses.delete(child);
      resolvePromise({ code, signal, stdout, stderr, combined: `${stdout}\n${stderr}` });
    });
  });
  return {
    child,
    exit,
    get output() { return `${stdout}\n${stderr}`; },
    write(value) { child.stdin.write(value); },
    end(value = "") { child.stdin.end(value); }
  };
}

function psqlArgs(database, user = DB_USER) {
  return dockerArgs([
    "psql", "-h", SOCKET, "-U", user, "-d", database,
    "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"
  ]);
}

function startPsql(label, database = targetDatabase, user = DB_USER) {
  return startProcess(label, "docker", psqlArgs(database, user));
}

async function runSql(label, sql, { database = targetDatabase, user = DB_USER } = {}) {
  const session = startPsql(label, database, user);
  session.end(sql);
  const result = await session.exit;
  if (result.code !== 0) {
    throw new Error(`${label} failed (${result.code ?? "null"}/${result.signal ?? "none"}): ${result.combined.slice(-3_000)}`);
  }
  return result.stdout.trim();
}

function lastJson(raw) {
  return JSON.parse(raw.split(/\r?\n/).filter(Boolean).at(-1));
}

async function waitFor(session, pattern, label, timeoutMs = LOCK_POLL_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = session.output.match(pattern);
    if (match) return match;
    if (session.child.exitCode !== null) break;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
  throw new Error(`${label} did not reach its bounded marker; output=${session.output.slice(-1_500)}`);
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
SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '25s';
SET LOCAL idle_in_transaction_session_timeout = '35s';
SET LOCAL application_name = ${sqlLiteral(APPLICATION_NAME)};
${claimsSql(authUserId)}
`;
}

function localProjectSql(id, name = id) {
  return `jsonb_build_object('projectId', ${sqlLiteral(id)}, 'name', ${sqlLiteral(name)}, 'createdAt', '2026-09-19T00:00:00.000Z')`;
}

function artifactSql({ kind = "analyse", artifactId, idempotencyKey, revision = 0, padding = 0, findView = "results" }) {
  let payload;
  if (kind === "find") {
    payload = `jsonb_build_object('session', jsonb_build_object(
      'locale', 'en', 'marketKey', 'dubai', 'result', jsonb_build_object('fixed', true),
      'shortlist', CASE WHEN ${revision} = 0 THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('id', 'one')) END,
      'comparisonOpen', ${revision > 0 ? "true" : "false"}, 'comparisonView', ${sqlLiteral(findView)},
      'analysisTargetSourceFeatureId', null, 'updatedAt', ${sqlLiteral(`2026-09-19T00:00:0${Math.min(revision + 1, 9)}.000Z`)}
    ))`;
  } else {
    payload = `jsonb_build_object(
      'selection', jsonb_build_object('id', 'one'),
      'analysis', jsonb_build_object('result', 'fixed'${padding > 0 ? `, 'padding', repeat('x', ${padding})` : ""})
    )`;
  }
  return `jsonb_build_object(
    'schemaVersion', 1, 'artifactId', ${sqlLiteral(artifactId)}, 'idempotencyKey', ${sqlLiteral(idempotencyKey)},
    'payloadHash', repeat('a', 64), 'completedAt', '2026-09-19T00:00:01.000Z',
    'updatedAt', ${sqlLiteral(`2026-09-19T00:00:0${Math.min(revision + 1, 9)}.000Z`)},
    'viewRevision', ${revision}, 'kind', ${sqlLiteral(kind)}, 'locale', 'en', 'marketKey', 'dubai',
    'label', ${sqlLiteral(kind[0].toUpperCase() + kind.slice(1))}, 'payload', ${payload}
  )`;
}

function putSql(actor, localProject, artifact, expectedRevision = "null", expectedStatus = "created", expectedReason = null) {
  return `
DO $put$
DECLARE outcome jsonb;
BEGIN
  outcome := api.put_point_object_project_artifact(
    'sprint10-cloud-race', ${localProject}, ${artifact}, ${expectedRevision}
  );
  IF outcome ->> 'status' IS DISTINCT FROM ${sqlLiteral(expectedStatus)}
     OR outcome ->> 'conflictReason' IS DISTINCT FROM ${expectedReason === null ? "null" : sqlLiteral(expectedReason)} THEN
    RAISE EXCEPTION 'unexpected bounded RPC outcome';
  END IF;
END
$put$;
`;
}

async function cloneFreshTarget() {
  const inventory = lastJson(await runSql("clone preflight", `
SELECT jsonb_build_object(
  'sourceExists', EXISTS (SELECT 1 FROM pg_database WHERE datname = ${sqlLiteral(SOURCE_DATABASE)}),
  'targetExists', EXISTS (SELECT 1 FROM pg_database WHERE datname = ${sqlLiteral(targetDatabase)}),
  'sourceSessions', (SELECT count(*) FROM pg_stat_activity WHERE datname = ${sqlLiteral(SOURCE_DATABASE)})
)::text;
`, { database: "postgres", user: ADMIN_USER }));
  assert.equal(inventory.sourceExists, true, "preserved r2 source database must exist");
  assert.equal(inventory.targetExists, false, "one-shot target database must not already exist");
  assert.equal(Number(inventory.sourceSessions), 0, "source must have no sessions before CREATE DATABASE ... TEMPLATE");

  const clone = startProcess("fresh database clone", "docker", dockerArgs([
    "createdb", "-h", SOCKET, "-U", ADMIN_USER, "-T", SOURCE_DATABASE, targetDatabase
  ]), 120_000);
  clone.end();
  const result = await clone.exit;
  if (result.code !== 0) throw new Error(`fresh clone failed: ${result.combined.slice(-2_000)}`);
  cloneCreated = true;
}

async function assertFreshClone() {
  const result = lastJson(await runSql("fresh clone contract", `
SELECT jsonb_build_object(
  'databaseOk', current_database() = ${sqlLiteral(targetDatabase)},
  'versionOk', current_setting('server_version') = '17.6',
  'scopeDisabled', (SELECT NOT enabled AND organization_id IS NULL AND project_id IS NULL AND project_key IS NULL FROM geoai_private.point_object_artifact_scope_config WHERE singleton),
  'artifactRows', (SELECT count(*) FROM public.point_object_project_artifacts),
  'putPresent', to_regprocedure('api.put_point_object_project_artifact(text,jsonb,jsonb,bigint)') IS NOT NULL,
  'deactivationFileBounded', true
)::text;
`, { user: ADMIN_USER }));
  assert.equal(result.databaseOk, true);
  assert.equal(result.versionOk, true);
  assert.equal(result.scopeDisabled, true);
  assert.equal(Number(result.artifactRows), 0);
  assert.equal(result.putPresent, true);
  return result;
}

async function setupFixture() {
  const authValues = actors.map(([key, id], index) => `(
    ${sqlLiteral(id)}::uuid, 'authenticated', 'authenticated', ${sqlLiteral(`cloud-race-${index + 1}@test.invalid`)}, '', now(),
    '{}'::jsonb, ${sqlLiteral(JSON.stringify({ full_name: `Cloud Race ${index + 1}` }))}::jsonb,
    now(), now(), null, null, false
  )`).join(",\n");
  await runSql("synthetic fixture setup", `
\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $pristine$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN (${actors.map(([, id]) => `${sqlLiteral(id)}::uuid`).join(",")}))
     OR EXISTS (SELECT 1 FROM public.organizations WHERE id = ${sqlLiteral(ids.organization)}::uuid)
     OR EXISTS (SELECT 1 FROM public.projects WHERE id = ${sqlLiteral(ids.project)}::uuid) THEN
    RAISE EXCEPTION 'synthetic fixture identifiers are not pristine';
  END IF;
END
$pristine$;
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  banned_until, deleted_at, is_anonymous
) VALUES ${authValues};
DO $profiles$
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE auth_user_id IN (${actors.map(([, id]) => `${sqlLiteral(id)}::uuid`).join(",")}) AND status = 'active') <> ${actors.length} THEN
    RAISE EXCEPTION 'live auth trigger did not provision all active profiles';
  END IF;
END
$profiles$;
INSERT INTO public.organizations (id, name, slug, status)
VALUES (${sqlLiteral(ids.organization)}::uuid, 'Sprint 10 cloud race', 'sprint10-cloud-race', 'active');
INSERT INTO public.projects (id, organization_id, project_key, name, status, data_mode)
VALUES (${sqlLiteral(ids.project)}::uuid, ${sqlLiteral(ids.organization)}::uuid, 'sprint10-cloud-race', 'Sprint 10 cloud race', 'active', 'pilot_private');
INSERT INTO public.organization_memberships (organization_id, profile_id, role, status)
SELECT ${sqlLiteral(ids.organization)}::uuid, profile.id, 'member', 'active'
FROM public.profiles profile WHERE profile.auth_user_id IN (${actors.map(([, id]) => `${sqlLiteral(id)}::uuid`).join(",")});
INSERT INTO public.project_memberships (organization_id, project_id, project_key, user_id, role, status)
SELECT ${sqlLiteral(ids.organization)}::uuid, ${sqlLiteral(ids.project)}::uuid, 'sprint10-cloud-race', profile.id, 'analyst', 'active'
FROM public.profiles profile WHERE profile.auth_user_id IN (${actors.map(([, id]) => `${sqlLiteral(id)}::uuid`).join(",")});
UPDATE geoai_private.point_object_artifact_scope_config
SET enabled = true, organization_id = ${sqlLiteral(ids.organization)}::uuid,
    project_id = ${sqlLiteral(ids.project)}::uuid, project_key = 'sprint10-cloud-race', updated_at = now()
WHERE singleton;
COMMIT;
`, { user: ADMIN_USER });
}

async function prefillCountQuota() {
  await runSql("count quota prefill 29", `
${transactionPrelude(ids.countActor)}
DO $fill$
DECLARE counter integer; outcome jsonb;
BEGIN
  FOR counter IN 1..29 LOOP
    outcome := api.put_point_object_project_artifact(
      'sprint10-cloud-race', ${localProjectSql("count-local")},
      jsonb_build_object(
        'schemaVersion', 1, 'artifactId', 'count-' || counter, 'idempotencyKey', 'count-idem-' || counter,
        'payloadHash', repeat('a', 64), 'completedAt', '2026-09-19T00:00:01.000Z',
        'updatedAt', '2026-09-19T00:00:01.000Z', 'viewRevision', 0, 'kind', 'analyse',
        'locale', 'en', 'marketKey', 'dubai', 'label', 'Analyse',
        'payload', jsonb_build_object('selection', jsonb_build_object('id', 'one'), 'analysis', jsonb_build_object('result', 'fixed'))
      ), null
    );
    IF outcome ->> 'status' <> 'created' THEN RAISE EXCEPTION 'count prefill failed'; END IF;
  END LOOP;
END
$fill$;
COMMIT;
`);
}

async function prefillByteQuota() {
  const calls = Array.from({ length: 4 }, (_, index) => putSql(
    ids.bytesActor,
    localProjectSql("bytes-local"),
    artifactSql({ artifactId: `bytes-base-${index + 1}`, idempotencyKey: `bytes-base-idem-${index + 1}`, padding: 899_000 })
  )).join("\n");
  await runSql("byte quota prefill", `${transactionPrelude(ids.bytesActor)}\n${calls}\nCOMMIT;`);

  const candidateA = artifactSql({ artifactId: "bytes-candidate-a", idempotencyKey: "bytes-candidate-idem-a", padding: 549_000 });
  const candidateB = artifactSql({ artifactId: "bytes-candidate-b", idempotencyKey: "bytes-candidate-idem-b", padding: 549_000 });
  const boundary = lastJson(await runSql("byte boundary proof", `
WITH actor AS (
  SELECT id FROM public.profiles WHERE auth_user_id = ${sqlLiteral(ids.bytesActor)}::uuid
), current_usage AS (
  SELECT coalesce(sum(octet_length(local_project::text) + octet_length(artifact_json::text) + octet_length(immutable_json::text)), 0)::bigint AS bytes
  FROM public.point_object_project_artifacts, actor
  WHERE project_id = ${sqlLiteral(ids.project)}::uuid AND created_by = actor.id
), candidates AS (
  SELECT
    octet_length(${localProjectSql("bytes-local")}::text) + octet_length(a0.artifact::text) + octet_length(a.immutable_json::text) AS a_bytes,
    octet_length(${localProjectSql("bytes-local")}::text) + octet_length(b0.artifact::text) + octet_length(b.immutable_json::text) AS b_bytes
  FROM (SELECT ${candidateA} AS artifact) a0
  CROSS JOIN LATERAL geoai_private.point_object_artifact_projections(a0.artifact) a
  CROSS JOIN (SELECT ${candidateB} AS artifact) b0
  CROSS JOIN LATERAL geoai_private.point_object_artifact_projections(b0.artifact) b
)
SELECT jsonb_build_object(
  'currentBytes', current_usage.bytes, 'candidateABytes', candidates.a_bytes, 'candidateBBytes', candidates.b_bytes,
  'oneFits', current_usage.bytes + greatest(candidates.a_bytes, candidates.b_bytes) <= ${QUOTA_BYTES},
  'bothExceed', current_usage.bytes + candidates.a_bytes + candidates.b_bytes > ${QUOTA_BYTES}
)::text FROM current_usage, candidates;
`, { user: ADMIN_USER }));
  assert.equal(boundary.oneFits, true, `one byte candidate must fit: ${JSON.stringify(boundary)}`);
  assert.equal(boundary.bothExceed, true, `two byte candidates must exceed: ${JSON.stringify(boundary)}`);
  return { boundary, candidateA, candidateB };
}

async function pollBlockedBy(aPid, bPid) {
  const deadline = Date.now() + LOCK_POLL_TIMEOUT_MS;
  let snapshot = null;
  while (Date.now() < deadline) {
    snapshot = lastJson(await runSql("bounded lock poll", `
SELECT jsonb_build_object(
  'blockedByA', ${Number(aPid)} = ANY(pg_blocking_pids(${Number(bPid)})),
  'waitingLocks', (SELECT count(*) FROM pg_locks WHERE pid = ${Number(bPid)} AND NOT granted)
)::text;
`, { user: ADMIN_USER }));
    if (snapshot.blockedByA && Number(snapshot.waitingLocks) > 0) return snapshot;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 75));
  }
  throw new Error(`session B did not enter the expected committed wait: ${JSON.stringify(snapshot)}`);
}

function expectedSqlStateBlock(command, sqlState, name) {
  return `
DO $expected$
BEGIN
  ${command}
  RAISE EXCEPTION 'unexpected success' USING ERRCODE = 'P0001';
EXCEPTION WHEN SQLSTATE ${sqlLiteral(sqlState)} THEN NULL;
END
$expected$;
SELECT 'HARNESS|B_EXPECTED|${name}|${sqlState}';
`;
}

async function runSerializedRace({ name, gate, actor, aCommand, bCommand, bExpectation, verifySql }) {
  const control = startPsql(`${name} control`);
  const a = startPsql(`${name} A`);
  const b = startPsql(`${name} B`);
  try {
    control.write(`SELECT pg_advisory_lock(98110, ${gate}); SELECT 'HARNESS|CONTROL_READY|${name}';\n`);
    await waitFor(control, new RegExp(`HARNESS\\|CONTROL_READY\\|${name}`), `${name} control`);
    a.end(`${transactionPrelude(actor)}
SELECT 'HARNESS|A_PID|' || pg_backend_pid();
${aCommand}
SELECT 'HARNESS|A_RPC_DONE|${name}';
RESET ROLE;
SELECT pg_advisory_xact_lock(98110, ${gate});
COMMIT;
SELECT 'HARNESS|A_COMMITTED|${name}';
`);
    const aPid = Number((await waitFor(a, /HARNESS\|A_PID\|(\d+)/, `${name} A pid`))[1]);
    await waitFor(a, new RegExp(`HARNESS\\|A_RPC_DONE\\|${name}`), `${name} A RPC`);
    b.end(`${transactionPrelude(actor)}
SELECT 'HARNESS|B_PID|' || pg_backend_pid();
SELECT 'HARNESS|B_CALL_START|${name}';
${bExpectation(bCommand)}
RESET ROLE;
COMMIT;
SELECT 'HARNESS|B_COMMITTED|${name}';
`);
    const bPid = Number((await waitFor(b, /HARNESS\|B_PID\|(\d+)/, `${name} B pid`))[1]);
    await waitFor(b, new RegExp(`HARNESS\\|B_CALL_START\\|${name}`), `${name} B start`);
    const lockEvidence = await pollBlockedBy(aPid, bPid);
    control.end(`SELECT pg_advisory_unlock(98110, ${gate}); SELECT 'HARNESS|CONTROL_RELEASED|${name}';\n`);
    const [aResult, bResult, controlResult] = await Promise.all([a.exit, b.exit, control.exit]);
    for (const [label, result] of [["A", aResult], ["B", bResult], ["control", controlResult]]) {
      assert.equal(result.code, 0, `${name} ${label} failed: ${result.combined.slice(-1_500)}`);
      assert(!result.combined.includes("deadlock detected"), `${name} deadlocked`);
    }
    assert(aResult.combined.includes(`HARNESS|A_COMMITTED|${name}`));
    assert(bResult.combined.includes(`HARNESS|B_COMMITTED|${name}`));
    const verification = lastJson(await runSql(`${name} verification`, verifySql, { user: ADMIN_USER }));
    for (const [key, value] of Object.entries(verification)) {
      if (key.endsWith("Ok")) assert.equal(value, true, `${name} failed ${key}`);
    }
    return { name, committed: true, lockEvidence, verification };
  } finally {
    for (const session of [control, a, b]) if (session.child.exitCode === null) session.child.kill("SIGTERM");
  }
}

function sqlStateExpectation(sqlState, name) {
  return (command) => expectedSqlStateBlock(command, sqlState, name);
}

function conflictExpectation(name) {
  return (command) => `
DO $conflict$
DECLARE outcome jsonb;
BEGIN
  outcome := ${command};
  IF outcome ->> 'status' IS DISTINCT FROM 'conflict'
     OR outcome ->> 'conflictReason' IS DISTINCT FROM 'stale_cloud_revision' THEN
    RAISE EXCEPTION 'unexpected CAS loser outcome';
  END IF;
END
$conflict$;
SELECT 'HARNESS|B_EXPECTED|${name}|stale_cloud_revision';
`;
}

async function runIndependentActors() {
  const name = "different_actor_independent";
  const control = startPsql(`${name} control`);
  const sessions = [
    { actor: ids.independentA, gate: 31, label: "A" },
    { actor: ids.independentB, gate: 32, label: "B" }
  ].map((entry) => ({ ...entry, session: startPsql(`${name} ${entry.label}`) }));
  try {
    control.write(`SELECT pg_advisory_lock(98110, 31); SELECT pg_advisory_lock(98110, 32); SELECT 'HARNESS|CONTROL_READY|${name}';\n`);
    await waitFor(control, new RegExp(`HARNESS\\|CONTROL_READY\\|${name}`), `${name} control`);
    for (const entry of sessions) {
      entry.session.end(`${transactionPrelude(entry.actor)}
SELECT 'HARNESS|${entry.label}_PID|' || pg_backend_pid();
${putSql(entry.actor, localProjectSql("independent-local"), artifactSql({ artifactId: "independent-shared", idempotencyKey: "independent-shared-idem" }))}
SELECT 'HARNESS|${entry.label}_RPC_DONE|${name}';
RESET ROLE;
SELECT pg_advisory_xact_lock(98110, ${entry.gate});
COMMIT;
SELECT 'HARNESS|${entry.label}_COMMITTED|${name}';
`);
    }
    const pids = [];
    for (const entry of sessions) {
      pids.push(Number((await waitFor(entry.session, new RegExp(`HARNESS\\|${entry.label}_PID\\|(\\d+)`), `${name} ${entry.label} pid`))[1]));
      await waitFor(entry.session, new RegExp(`HARNESS\\|${entry.label}_RPC_DONE\\|${name}`), `${name} ${entry.label} RPC`);
    }
    const independence = lastJson(await runSql("independent actor lock proof", `
SELECT jsonb_build_object(
  'aNotBlockedByB', NOT (${pids[1]} = ANY(pg_blocking_pids(${pids[0]}))),
  'bNotBlockedByA', NOT (${pids[0]} = ANY(pg_blocking_pids(${pids[1]})))
)::text;
`, { user: ADMIN_USER }));
    assert.equal(independence.aNotBlockedByB, true);
    assert.equal(independence.bNotBlockedByA, true);
    control.end(`SELECT pg_advisory_unlock(98110, 31); SELECT pg_advisory_unlock(98110, 32);\n`);
    const results = await Promise.all([...sessions.map((entry) => entry.session.exit), control.exit]);
    for (const result of results) assert.equal(result.code, 0, `${name} session failed: ${result.combined.slice(-1_500)}`);
    const verification = lastJson(await runSql("independent actor verification", `
SELECT jsonb_build_object(
  'twoCreatorsOk', count(*) = 2 AND count(DISTINCT created_by) = 2,
  'sameLocalKeysOk', count(DISTINCT artifact_id) = 1 AND count(DISTINCT idempotency_key) = 1
)::text FROM public.point_object_project_artifacts
WHERE project_id = ${sqlLiteral(ids.project)}::uuid AND artifact_id = 'independent-shared';
`, { user: ADMIN_USER }));
    assert.equal(verification.twoCreatorsOk, true);
    assert.equal(verification.sameLocalKeysOk, true);
    return { name, committed: true, independence, verification };
  } finally {
    for (const entry of sessions) if (entry.session.child.exitCode === null) entry.session.child.kill("SIGTERM");
    if (control.child.exitCode === null) control.child.kill("SIGTERM");
  }
}

async function seedCasArtifact() {
  await runSql("CAS seed", `${transactionPrelude(ids.casActor)}
${putSql(ids.casActor, localProjectSql("cas-local"), artifactSql({ kind: "find", artifactId: "cas-shared", idempotencyKey: "cas-shared-idem", revision: 0 }))}
COMMIT;
`);
}

async function deactivateTwiceAndVerify() {
  const before = lastJson(await runSql("pre-deactivation retained digest", `
SELECT jsonb_build_object(
  'rows', count(*),
  'digest', md5(coalesce(string_agg(id::text || ':' || artifact_json::text || ':' || immutable_json::text, '|' ORDER BY id), '')),
  'rls', (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'public.point_object_project_artifacts'::regclass)
)::text FROM public.point_object_project_artifacts;
`, { user: ADMIN_USER }));
  await runSql("deactivation pass one", deactivation, { user: ADMIN_USER });
  await runSql("deactivation pass two", deactivation, { user: ADMIN_USER });
  await runSql("post-deactivation authenticated RPC denial", `
BEGIN;
SET LOCAL statement_timeout = '10s';
${claimsSql(ids.countActor)}
DO $denied$
BEGIN
  BEGIN
    EXECUTE 'select api.put_point_object_project_artifact(''sprint10-cloud-race'', ''{}''::jsonb, ''{}''::jsonb, null)';
    RAISE EXCEPTION 'deactivated RPC unexpectedly resolved';
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
END
$denied$;
ROLLBACK;
`);
  const after = lastJson(await runSql("post-deactivation retained digest", `
SELECT jsonb_build_object(
  'rows', count(*),
  'digest', md5(coalesce(string_agg(id::text || ':' || artifact_json::text || ':' || immutable_json::text, '|' ORDER BY id), '')),
  'scopeDisabled', (SELECT NOT enabled AND organization_id IS NULL AND project_id IS NULL AND project_key IS NULL FROM geoai_private.point_object_artifact_scope_config WHERE singleton),
  'apiFunctionsGone', to_regprocedure('api.put_point_object_project_artifact(text,jsonb,jsonb,bigint)') IS NULL AND to_regprocedure('api.list_point_object_project_artifacts(text,integer,timestamptz,uuid)') IS NULL,
  'privateFunctionsGone', to_regprocedure('geoai_private.put_point_object_project_artifact(text,jsonb,jsonb,bigint)') IS NULL AND to_regprocedure('geoai_private.list_point_object_project_artifacts(text,integer,timestamptz,uuid)') IS NULL AND to_regprocedure('geoai_private.point_object_artifact_projections(jsonb)') IS NULL,
  'policiesGone', (SELECT count(*) = 0 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'point_object_project_artifacts'),
  'rlsRetained', (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'public.point_object_project_artifacts'::regclass)
)::text FROM public.point_object_project_artifacts;
`, { user: ADMIN_USER }));
  assert.equal(Number(after.rows), Number(before.rows));
  assert.equal(after.digest, before.digest);
  assert.equal(before.rls, true);
  for (const key of ["scopeDisabled", "apiFunctionsGone", "privateFunctionsGone", "policiesGone", "rlsRetained"]) assert.equal(after[key], true, key);
  return { passes: 2, rowsPreserved: Number(after.rows), digestPreserved: true, rpcDenied: true, ...after };
}

async function main() {
  const staticResult = staticContractCheck();
  if (!process.argv.includes("--run-local")) {
    console.log(JSON.stringify(staticResult, null, 2));
    return;
  }

  targetDatabase = process.env[DATABASE_ENV] ?? "";
  assert(TARGET_PATTERN.test(targetDatabase), `${DATABASE_ENV} must match ${TARGET_PATTERN}`);
  assert.notEqual(targetDatabase, SOURCE_DATABASE);
  assert.equal(process.env[CONFIRM_ENV], `clone-from-${SOURCE_DATABASE}:${targetDatabase}`, `${CONFIRM_ENV} is missing or does not bind the exact source and target`);

  const startedAt = new Date().toISOString();
  await cloneFreshTarget();
  const freshClone = await assertFreshClone();
  await setupFixture();
  await prefillCountQuota();
  const byteFixture = await prefillByteQuota();
  const deadlocksBefore = Number(await runSql("deadlock baseline", "SELECT deadlocks FROM pg_stat_database WHERE datname = current_database();"));

  const countA = artifactSql({ artifactId: "count-candidate-a", idempotencyKey: "count-candidate-idem-a" });
  const countB = artifactSql({ artifactId: "count-candidate-b", idempotencyKey: "count-candidate-idem-b" });
  const scenarios = [];
  scenarios.push(await runSerializedRace({
    name: "count_29_to_30_one_winner", gate: 1, actor: ids.countActor,
    aCommand: putSql(ids.countActor, localProjectSql("count-local"), countA),
    bCommand: `PERFORM api.put_point_object_project_artifact('sprint10-cloud-race', ${localProjectSql("count-local")}, ${countB}, null);`,
    bExpectation: sqlStateExpectation("54000", "count_29_to_30_one_winner"),
    verifySql: `SELECT jsonb_build_object(
      'countOk', count(*) = 30,
      'oneCandidateOk', count(*) FILTER (WHERE artifact_id IN ('count-candidate-a','count-candidate-b')) = 1,
      'winnerAOk', count(*) FILTER (WHERE artifact_id = 'count-candidate-a') = 1
    )::text FROM public.point_object_project_artifacts a JOIN public.profiles p ON p.id = a.created_by
    WHERE p.auth_user_id = ${sqlLiteral(ids.countActor)}::uuid AND a.local_project ->> 'projectId' = 'count-local';`
  }));

  scenarios.push(await runSerializedRace({
    name: "bytes_8mib_one_winner", gate: 2, actor: ids.bytesActor,
    aCommand: putSql(ids.bytesActor, localProjectSql("bytes-local"), byteFixture.candidateA),
    bCommand: `PERFORM api.put_point_object_project_artifact('sprint10-cloud-race', ${localProjectSql("bytes-local")}, ${byteFixture.candidateB}, null);`,
    bExpectation: sqlStateExpectation("54000", "bytes_8mib_one_winner"),
    verifySql: `SELECT jsonb_build_object(
      'oneCandidateOk', count(*) FILTER (WHERE artifact_id IN ('bytes-candidate-a','bytes-candidate-b')) = 1,
      'winnerAOk', count(*) FILTER (WHERE artifact_id = 'bytes-candidate-a') = 1,
      'withinQuotaOk', sum(octet_length(local_project::text) + octet_length(artifact_json::text) + octet_length(immutable_json::text)) <= ${QUOTA_BYTES}
    )::text FROM public.point_object_project_artifacts a JOIN public.profiles p ON p.id = a.created_by
    WHERE p.auth_user_id = ${sqlLiteral(ids.bytesActor)}::uuid;`
  }));

  scenarios.push(await runIndependentActors());
  await seedCasArtifact();
  const casA = artifactSql({ kind: "find", artifactId: "cas-shared", idempotencyKey: "cas-shared-idem", revision: 1, findView: "mini" });
  const casB = artifactSql({ kind: "find", artifactId: "cas-shared", idempotencyKey: "cas-shared-idem", revision: 1, findView: "dashboard" });
  scenarios.push(await runSerializedRace({
    name: "cas_one_winner", gate: 3, actor: ids.casActor,
    aCommand: putSql(ids.casActor, localProjectSql("cas-local"), casA, "1", "updated"),
    bCommand: `api.put_point_object_project_artifact('sprint10-cloud-race', ${localProjectSql("cas-local")}, ${casB}, 1)`,
    bExpectation: conflictExpectation("cas_one_winner"),
    verifySql: `SELECT jsonb_build_object(
      'singleRowOk', count(*) = 1,
      'revisionOk', max(cloud_revision) = 2 AND max(view_revision) = 1,
      'winnerAOk', bool_and(artifact_json #>> '{payload,session,comparisonView}' = 'mini')
    )::text FROM public.point_object_project_artifacts a JOIN public.profiles p ON p.id = a.created_by
    WHERE p.auth_user_id = ${sqlLiteral(ids.casActor)}::uuid AND artifact_id = 'cas-shared';`
  }));

  const deadlocksAfter = Number(await runSql("deadlock final", "SELECT deadlocks FROM pg_stat_database WHERE datname = current_database();"));
  assert.equal(deadlocksAfter, deadlocksBefore, "deadlock counter changed");
  const deactivationEvidence = await deactivateTwiceAndVerify();

  console.log(JSON.stringify({
    status: "PASS",
    scope: "LOCAL_NETWORK_NONE_SYNTHETIC_ONLY",
    sourcePreserved: SOURCE_DATABASE,
    retainedTargetDatabase: targetDatabase,
    cloneRetainedAfterRun: true,
    fixtureProfiles: "PROVISIONED_BY_LIVE_AUTH_TRIGGER",
    startedAt,
    completedAt: new Date().toISOString(),
    environment: { dockerHost: DOCKER_HOST, container: CONTAINER, network: "none", transport: "unix_socket", postgres: "17.6" },
    freshClone,
    byteBoundary: byteFixture.boundary,
    deadlocksBefore,
    deadlocksAfter,
    scenarios,
    deactivation: deactivationEvidence
  }, null, 2));
}

main().catch((error) => {
  for (const child of activeProcesses) child.kill("SIGTERM");
  console.error(error instanceof Error ? error.stack : String(error));
  console.error(cloneCreated
    ? `FAIL_CLOSED: retained one-shot local database ${targetDatabase} may contain partial synthetic evidence; do not rerun, reset, delete, or clean automatically.`
    : "FAIL_CLOSED: no target clone was confirmed created.");
  process.exitCode = 1;
});
