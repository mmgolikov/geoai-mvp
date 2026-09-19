#!/usr/bin/env node

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import {
  assertAnonymousCurrentProfileDenied,
  assertFutureBan,
  assertRetiredCurrentProfileEmpty,
  assertServerGlobalRevokeResponse,
  assertTerminalAuthFailure,
  buildPreviewChildEnvironment,
  captureCreatedUserId,
  createBoundedFetch,
  readGitState,
  recoverAmbiguousSyntheticCreate,
  recoverExactSyntheticUser,
  retirePersona,
  runExistingPreviewHarness,
  runBestEffortStages,
  unknownCreateFailure,
  validateRuntimeConfig
} from "./sprint10-hosted-auth-probe.mjs";
import {
  emptyAuthDiagnosticCounts,
  makeAuthDiagnostic
} from "./sprint10-real-password-auth-diagnostics.mjs";

const operator = await readFile(new URL("./sprint10-hosted-auth-probe.mjs", import.meta.url), "utf8");
const handoff = await readFile(new URL("../docs/sprint10/HOSTED_AUTH_PROBE_HANDOFF.md", import.meta.url), "utf8");
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
const workflowDirectory = new URL("../.github/workflows/", import.meta.url);
const workflowNames = (await readdir(workflowDirectory)).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"));
const workflows = await Promise.all(workflowNames.map((name) => readFile(new URL(name, workflowDirectory), "utf8")));

const origin = "https://pphdqkurxneyagvnnjdt.supabase.co";
const userId = "11111111-1111-4111-8111-111111111111";
const email = "geoai-auth-probe-offline-a@example.invalid";
const head = "a".repeat(40);
const publishable = ["sb", "publishable", "offline"].join("_") + "x".repeat(32);
const secret = ["sb", "secret", "offline"].join("_") + "y".repeat(32);
const baseEnv = {
  GEOAI_HOSTED_AUTH_PROBE_EXPLICIT_RUN: "create-two-synthetic-password-personas",
  GEOAI_HOSTED_AUTH_PROBE_PROJECT_REF: "pphdqkurxneyagvnnjdt",
  GEOAI_HOSTED_AUTH_PROBE_SUPABASE_URL: origin,
  GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY: publishable,
  GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY: secret,
  GEOAI_HOSTED_AUTH_PROBE_EXPECTED_COMMIT_SHA: head,
  GEOAI_HOSTED_AUTH_PROBE_RUN_APPROVAL: `hosted-auth-probe:pphdqkurxneyagvnnjdt:${head}`,
  GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM: "disabled"
};

assert.equal(validateRuntimeConfig(baseEnv, ["node", "operator"], head, 22).projectRef, "pphdqkurxneyagvnnjdt");

const negativeFixtures = [
  ["wrong project", { GEOAI_HOSTED_AUTH_PROBE_PROJECT_REF: "bkmfcjzalcvdsdvyxpgi" }, ["node", "operator"], head, 22],
  ["wrong origin", { GEOAI_HOSTED_AUTH_PROBE_SUPABASE_URL: "https://example.invalid" }, ["node", "operator"], head, 22],
  ["wrong opt-in", { GEOAI_HOSTED_AUTH_PROBE_EXPLICIT_RUN: "yes" }, ["node", "operator"], head, 22],
  ["wrong head", {}, ["node", "operator"], "b".repeat(40), 22],
  ["legacy publishable key", { GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY: "legacy" }, ["node", "operator"], head, 22],
  ["legacy Admin key", { GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY: "legacy" }, ["node", "operator"], head, 22],
  ["command-line secret", {}, ["node", "operator", "unexpected"], head, 22],
  ["unsupported Node", {}, ["node", "operator"], head, 20],
  ["Preview seam missing receipt", { GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM: "run-existing-real-password-preview-harness" }, ["node", "operator"], head, 22]
];
for (const [name, delta, argv, fixtureHead, nodeMajor] of negativeFixtures) {
  assert.throws(
    () => validateRuntimeConfig({ ...baseEnv, ...delta }, argv, fixtureHead, nodeMajor),
    undefined,
    `${name} fixture must fail closed offline`
  );
}

const inheritedEnvironment = {
  PATH: "/usr/bin:/bin",
  HOME: "/tmp/operator-home",
  LANG: "C",
  GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY: "sentinel-admin-secret",
  GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY: "sentinel-publishable",
  GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET: "sentinel-preview-bypass",
  UNRELATED_RUNTIME_SECRET: "sentinel-other-secret"
};
const gitChildCalls = [];
const fakeSpawn = (_command, args, options) => {
  gitChildCalls.push({ args, env: options.env });
  return args[0] === "rev-parse"
    ? { status: 0, stdout: `${head}\n`, stderr: "" }
    : { status: 0, stdout: "", stderr: "" };
};
assert.equal(readGitState(inheritedEnvironment, fakeSpawn), head);
assert.equal(gitChildCalls.length, 2);
for (const call of gitChildCalls) {
  assert.equal(call.env.GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY, undefined);
  assert.equal(call.env.GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY, undefined);
  assert.equal(call.env.GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET, undefined);
  assert.equal(call.env.UNRELATED_RUNTIME_SECRET, undefined);
  assert.equal(call.env.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(call.env.GIT_CONFIG_VALUE_0, "false");
}

const previewChildPersonas = [
  { email: "offline-a@example.invalid", password: "offline-a-password", userId },
  { email: "offline-b@example.invalid", password: "offline-b-password", userId: "22222222-2222-4222-8222-222222222222" }
];
const previewChildConfig = {
  previewSeam: "run-existing-real-password-preview-harness",
  expectedCommitSha: head
};
const previewChildSourceEnv = {
  ...inheritedEnvironment,
  GEOAI_E2E_BASE_URL: "https://preview.example.invalid",
  GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL: "https://preview.example.invalid",
  GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET: "allowed-preview-bypass",
  GEOAI_REAL_PASSWORD_AUTH_DEPLOYMENT_RECEIPT_PATH: "/tmp/offline-receipt.json",
  GEOAI_REAL_PASSWORD_AUTH_RUN_APPROVAL: "offline-approval"
};
const previewChildEnvironment = buildPreviewChildEnvironment(previewChildConfig, previewChildPersonas, previewChildSourceEnv);
assert.equal(previewChildEnvironment.GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY, undefined);
assert.equal(previewChildEnvironment.GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY, undefined);
assert.equal(previewChildEnvironment.UNRELATED_RUNTIME_SECRET, undefined);
assert.equal(previewChildEnvironment.GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET, "allowed-preview-bypass");
let previewChildSpawn = null;
const previewPassDiagnostic = makeAuthDiagnostic({
  status: "PASS",
  stage: "complete",
  counts: {
    ...emptyAuthDiagnosticCounts(2),
    discoveredProjects: 1,
    discoveredTests: 2,
    passed: 2
  },
  processOutcome: "success",
  timeoutMs: 390_000
});
const previewResult = runExistingPreviewHarness(previewChildConfig, previewChildPersonas, {
  env: previewChildSourceEnv,
  spawn: (_command, _args, options) => {
    previewChildSpawn = options;
    return { status: 0, signal: null, error: null, stdout: JSON.stringify(previewPassDiagnostic), stderr: "" };
  }
});
assert.equal(previewResult, "passed_existing_reviewed_runner");
assert.equal(previewChildSpawn.timeout, 450_000);
assert.equal(previewChildSpawn.env.GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY, undefined);
assert.equal(previewChildSpawn.env.UNRELATED_RUNTIME_SECRET, undefined);

const plantedChildSecret = "planted-child-secret-never-forward";
const outerTimeout = runExistingPreviewHarness(previewChildConfig, previewChildPersonas, {
  env: previewChildSourceEnv,
  spawn: () => ({ status: null, signal: "SIGTERM", error: { code: "ETIMEDOUT", message: plantedChildSecret },
    stdout: plantedChildSecret, stderr: plantedChildSecret })
});
assert.deepEqual(outerTimeout, { status: "failed_existing_reviewed_runner", stage: "preview_outer_timeout" });
assert(!JSON.stringify(outerTimeout).includes(plantedChildSecret));

const malformedPreview = runExistingPreviewHarness(previewChildConfig, previewChildPersonas, {
  env: previewChildSourceEnv,
  spawn: () => ({ status: 1, signal: null, error: null, stdout: plantedChildSecret, stderr: plantedChildSecret })
});
assert.deepEqual(malformedPreview,
  { status: "failed_existing_reviewed_runner", stage: "preview_runner_report_contract" });

const executionFailureDiagnostic = makeAuthDiagnostic({
  status: "FAIL",
  stage: "test_execution",
  testLane: "primary_continuity",
  counts: { ...emptyAuthDiagnosticCounts(2), discoveredProjects: 1, discoveredTests: 2, passed: 1, unexpected: 1 },
  processOutcome: "nonzero",
  timeoutMs: 390_000
});
const nonzeroPreview = runExistingPreviewHarness(previewChildConfig, previewChildPersonas, {
  env: previewChildSourceEnv,
  spawn: () => ({ status: 1, signal: null, error: null, stdout: JSON.stringify(executionFailureDiagnostic),
    stderr: plantedChildSecret })
});
assert.deepEqual(nonzeroPreview,
  { status: "failed_existing_reviewed_runner", stage: "preview_test_execution_primary_continuity" });
assert(!JSON.stringify(nonzeroPreview).includes(plantedChildSecret));

const dispatched = [];
const response = (status, payload = {}) => new Response(status === 204 ? null : JSON.stringify(payload), {
  status,
  headers: status === 204 ? undefined : {
    "content-type": "application/json",
    "x-supabase-api-version": "2024-01-01"
  }
});
const fakeDispatch = async (input, init) => {
  dispatched.push({ url: String(input), init });
  return response(200, { users: [{ id: userId, email }] });
};
const recoveryEmails = new Set([email]);
const adminFetch = createBoundedFetch("admin", { dispatch: fakeDispatch, recoveryEmails, timeoutMs: 1_000 });
await adminFetch(`${origin}/auth/v1/admin/users`, {
  method: "POST",
  body: JSON.stringify({
    email,
    password: "Gx!" + "a".repeat(40),
    email_confirm: true,
    user_metadata: { full_name: "GeoAI synthetic hosted Auth probe A" }
  })
});
const recoveredId = await recoverExactSyntheticUser({ fetcher: adminFetch, supabaseUrl: origin, adminSecretKey: secret, email });
assert.equal(recoveredId, userId);
assert.equal(dispatched.length, 2);
assert(dispatched.every(({ init }) => init.redirect === "error"));

let delayedRecoveryReads = 0;
const delayedRecoveryWaits = [];
const delayedRecovery = await recoverAmbiguousSyntheticCreate({
  lookup: async () => {
    delayedRecoveryReads += 1;
    return delayedRecoveryReads === 1 ? null : userId;
  },
  wait: async (milliseconds) => delayedRecoveryWaits.push(milliseconds)
});
assert.deepEqual(delayedRecovery, { userId, attempts: 2, lookupErrors: [] });
assert.equal(delayedRecoveryReads, 2, "a lost response may be recovered only by the bounded exact reads");
assert.deepEqual(delayedRecoveryWaits, [750], "the second exact read must be delayed by the fixed interval");

let persistentEmptyReads = 0;
const persistentEmpty = await recoverAmbiguousSyntheticCreate({
  lookup: async () => {
    persistentEmptyReads += 1;
    return null;
  },
  wait: async () => undefined
});
assert.deepEqual(persistentEmpty, { userId: null, attempts: 2, lookupErrors: [] });
assert.equal(persistentEmptyReads, 2, "persistent absence after an ambiguous create remains unknown, not proven absent");

const ambiguousSyntheticIdentity = "geoai-auth-probe-0123456789abcdef01-a@example.invalid";
assert.deepEqual(unknownCreateFailure({ email: ambiguousSyntheticIdentity }), {
  userId: "unknown",
  syntheticIdentity: ambiguousSyntheticIdentity,
  stage: "unknown_create_outcome",
  error: "bounded_exact_recovery_exhausted/unknown"
});
const unresolvedPersona = {
  email: ambiguousSyntheticIdentity,
  password: "offline-only",
  userId: null,
  sessions: [],
  createAttempted: true,
  createOutcomeUnknown: true,
  createAbsenceProven: false
};
assert.deepEqual(await retirePersona(null, null, null, null, unresolvedPersona), [
  unknownCreateFailure({ email: ambiguousSyntheticIdentity })
], "an exhausted ambiguous create must surface FAIL_ACTION_REQUIRED recovery identity");
const unattemptedPersona = {
  email: "geoai-auth-probe-0123456789abcdef01-b@example.invalid",
  password: "offline-only",
  userId: null,
  sessions: [],
  createAttempted: false,
  createOutcomeUnknown: false,
  createAbsenceProven: false
};
assert.deepEqual(await retirePersona(null, null, null, null, unattemptedPersona), [],
  "a persona never dispatched after an earlier failure must not produce a false cleanup alert");

const { createClient } = await import("@supabase/supabase-js");
const sdkOperations = [];
const futureBan = "2126-09-18T00:00:00Z";
const sdkAdminDispatch = async (input, init) => {
  const url = new URL(String(input));
  sdkOperations.push(`admin:${init.method}:${url.pathname}`);
  if (init.method === "POST") return response(200, { id: userId, email, email_confirmed_at: "2026-09-18T00:00:00Z" });
  return response(200, { id: userId, email, banned_until: futureBan });
};
const sdkAdminFetch = createBoundedFetch("admin", { dispatch: sdkAdminDispatch, recoveryEmails, timeoutMs: 1_000 });
const sdkAdmin = createClient(origin, secret, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  global: { fetch: sdkAdminFetch }
});
const sdkCreated = await sdkAdmin.auth.admin.createUser({
  email,
  password: "Gx!" + "a".repeat(40),
  email_confirm: true,
  user_metadata: { full_name: "GeoAI synthetic hosted Auth probe A" }
});
assert.equal(sdkCreated.error, null);
assert.equal(sdkCreated.data.user.id, userId);
const sdkBanned = await sdkAdmin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
assert.equal(sdkBanned.error, null);
assert.equal(sdkBanned.data.user.banned_until, futureBan);
const sdkReadback = await sdkAdmin.auth.admin.getUserById(userId);
assert.equal(sdkReadback.error, null);
assert.equal(sdkReadback.data.user.id, userId);

const jwtHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
const jwtPayload = Buffer.from(JSON.stringify({ sub: userId, role: "authenticated", exp: 4102444800 })).toString("base64url");
const offlineJwt = `${jwtHeader}.${jwtPayload}.offline`;
const sdkUserDispatch = async (input, init) => {
  const url = new URL(String(input));
  sdkOperations.push(`user:${init.method}:${url.pathname}:${url.search}`);
  if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
    return response(200, {
      access_token: offlineJwt,
      refresh_token: "offline-refresh-token",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: userId, email }
    });
  }
  if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "refresh_token") {
    return response(400, { code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
  }
  if (url.pathname === "/rest/v1/rpc/current_profile") return response(200, []);
  throw new Error("unexpected injected SDK request");
};
const sdkUserFetch = createBoundedFetch("user", { dispatch: sdkUserDispatch, timeoutMs: 1_000 });
const sdkUser = createClient(origin, publishable, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  global: { fetch: sdkUserFetch }
});
const sdkSignIn = await sdkUser.auth.signInWithPassword({ email, password: "offline-password" });
assert.equal(sdkSignIn.error, null);
assert.equal(sdkSignIn.data.user.id, userId);
const sdkRefresh = await sdkUser.auth.refreshSession({ refresh_token: "offline-refresh-token" });
assert.equal(sdkRefresh.error.code, "refresh_token_not_found");
const sdkRpc = await sdkUser.schema("api").rpc("current_profile");
assert.equal(sdkRpc.status, 200);
assert.deepEqual(sdkRpc.data, []);
assert.equal(sdkOperations.length, 6, "pinned Supabase SDK request shapes must pass the exact injected network policy");

let blockedDispatches = 0;
const neverDispatch = async () => {
  blockedDispatches += 1;
  return response(200);
};
const blockedAdminFetch = createBoundedFetch("admin", { dispatch: neverDispatch, recoveryEmails, timeoutMs: 1_000 });
const blockedUserFetch = createBoundedFetch("user", { dispatch: neverDispatch, timeoutMs: 1_000 });
const blockedNetworkFixtures = [
  () => blockedAdminFetch(`${origin}/auth/v1/admin/users`, { method: "GET" }),
  () => blockedAdminFetch(`${origin}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&page=1&per_page=100`, { method: "GET" }),
  () => blockedAdminFetch(`${origin}/auth/v1/admin/users/${userId}`, { method: "DELETE" }),
  () => blockedUserFetch("https://example.invalid/auth/v1/user", { method: "GET" }),
  () => blockedUserFetch(`${origin}/auth/v1/logout?scope=local`, { method: "POST" }),
  () => blockedUserFetch(`${origin}/auth/v1/logout?scope=global`, { method: "GET" }),
  () => blockedUserFetch(`${origin}/rest/v1/rpc/current_profile?select=*`, { method: "POST", body: "{}" }),
  () => blockedUserFetch(`${origin}/auth/v1/token?grant_type=password`, {
    method: "POST",
    body: JSON.stringify({ email, password: "offline", gotrue_meta_security: {}, extra: true })
  }),
  () => blockedUserFetch(`${origin}/auth/v1/user`, { method: "GET", redirect: "follow" })
];
for (const fixture of blockedNetworkFixtures) await assert.rejects(fixture);
assert.equal(blockedDispatches, 0, "invalid origin/method/query/body/redirect fixtures must fail before dispatch");

const terminalContract = {
  stage: "offline terminal Auth fixture",
  allowedCodes: ["user_banned"],
  allowedStatuses: [400]
};
assert.equal(assertTerminalAuthFailure({ error: { code: "user_banned", status: 400, name: "AuthApiError" }, data: { session: null } }, terminalContract), "user_banned");
for (const error of [
  { code: "unknown", status: 0, name: "AuthRetryableFetchError" },
  { code: "over_request_rate_limit", status: 429, name: "AuthApiError" },
  { code: "unexpected_failure", status: 503, name: "AuthRetryableFetchError" },
  { code: "invalid_credentials", status: 400, name: "AuthApiError" },
  { status: 400, name: "AuthApiError" }
]) {
  assert.throws(() => assertTerminalAuthFailure({ error, data: { session: null } }, terminalContract));
}
assert.throws(() => assertTerminalAuthFailure({ error: null, data: { session: { access_token: "offline" } } }, terminalContract));

assert.doesNotThrow(() => assertAnonymousCurrentProfileDenied({ data: null, error: { code: "42501" }, status: 403 }));
for (const fixture of [
  { data: null, error: { code: "PGRST000", status: 0 }, status: 0 },
  { data: null, error: { code: "42501", status: 503 }, status: 503 },
  { data: null, error: { code: "unexpected", status: 403 }, status: 403 },
  { data: [{ id: userId }], error: null, status: 200 }
]) assert.throws(() => assertAnonymousCurrentProfileDenied(fixture));

assert.doesNotThrow(() => assertRetiredCurrentProfileEmpty({ data: [], error: null, status: 200 }));
for (const fixture of [
  { data: null, error: { code: "PGRST000", status: 0 }, status: 0 },
  { data: [], error: { code: "42501", status: 403 }, status: 403 },
  { data: [{ id: userId }], error: null, status: 200 },
  { data: [], error: null, status: 503 }
]) assert.throws(() => assertRetiredCurrentProfileEmpty(fixture));

assert.doesNotThrow(() => assertServerGlobalRevokeResponse({ status: 204 }));
for (const status of [0, 401, 403, 404, 429, 500]) {
  assert.throws(() => assertServerGlobalRevokeResponse({ status }));
}

const now = Date.parse("2026-09-18T00:00:00Z");
assert.doesNotThrow(() => assertFutureBan({ id: userId, banned_until: "2126-09-18T00:00:00Z" }, userId, now));
assert.throws(() => assertFutureBan({ id: userId, banned_until: "2026-09-17T00:00:00Z" }, userId, now));
assert.throws(() => assertFutureBan({ id: userId, banned_until: "not-a-date" }, userId, now));

const partialPersona = { lane: "A", userId: null };
captureCreatedUserId(partialPersona, { user: { id: userId } });
assert.equal(partialPersona.userId, userId, "created ID must be retained before later response-shape assertions");

const retirementStages = [
  "server_global_revoke",
  "primary_refresh_rejected",
  "secondary_refresh_rejected",
  "admin_ban",
  "password_rejected_after_ban",
  "stale_jwt_current_profile_empty",
  "retired_user_readback"
];
for (const faultStage of retirementStages) {
  const called = [];
  const failures = await runBestEffortStages(retirementStages.map((stage) => [stage, async () => {
    called.push(stage);
    if (stage === faultStage) throw Object.assign(new Error("injected"), { code: "injected_failure", status: 400 });
  }]), { userId });
  assert.deepEqual(called, retirementStages, `fault at ${faultStage} must not stop later retirement stages`);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].stage, faultStage);
  assert(called.includes("admin_ban") && called.includes("retired_user_readback"));
}

for (const requiredName of [
  "GEOAI_HOSTED_AUTH_PROBE_EXPLICIT_RUN",
  "GEOAI_HOSTED_AUTH_PROBE_PROJECT_REF",
  "GEOAI_HOSTED_AUTH_PROBE_SUPABASE_URL",
  "GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY",
  "GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY",
  "GEOAI_HOSTED_AUTH_PROBE_EXPECTED_COMMIT_SHA",
  "GEOAI_HOSTED_AUTH_PROBE_RUN_APPROVAL",
  "GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM"
]) {
  assert.match(operator, new RegExp(`\\b${requiredName}\\b`));
  assert.match(handoff, new RegExp(`\\b${requiredName}\\b`));
}

assert.match(operator, /const exactProjectRef = "pphdqkurxneyagvnnjdt"/);
assert.match(operator, /admin[.]auth[.]admin[.]createUser/);
assert.equal((operator.match(/admin[.]auth[.]admin[.]createUser/g) ?? []).length, 1,
  "ambiguous create recovery must never retry account creation");
assert.match(operator, /email_confirm: true/);
assert.match(operator, /auth[.]signInWithPassword/);
assert.match(operator, /auth[.]getClaims/);
assert.match(operator, /auth[.]getUser/);
assert.match(operator, /[.]schema\("api"\)[.]rpc\("current_profile"\)/);
assert.match(operator, /anonymousCurrentProfileDenied: true/);
assert.match(operator, /assert[.]notEqual\(personas\[0\][.]profileId, personas\[1\][.]profileId/);
assert.match(operator, /\/auth\/v1\/logout[?]scope=global/);
assert.doesNotMatch(operator, /signOut\(\{ scope: "global" \}\)/,
  "SDK-local success must not be used as server-global revoke evidence.");
assert.match(operator, /admin[.]auth[.]admin[.]updateUserById/);
assert.match(operator, /ban_duration: permanentBanDuration/);
assert.match(operator, /auth[.]refreshSession/);
assert.match(operator, /admin[.]auth[.]admin[.]getUserById/);
assert.match(operator, /scripts\/sprint10-real-password-auth-run[.]mjs/);
assert.match(operator, /only its fixed safe failure stage was retained/);
assert.match(operator, /A non-allowlisted hosted Auth probe request was blocked before dispatch/);
for (const scope of ["singapore-analyse", "singapore-find", "dubai-create", "dubai-depth-cycle"]) {
  assert.match(operator, new RegExp(`"${scope}"`), `${scope} must be an explicit hosted seam scope, never a wildcard`);
}
const previewHarnessSource = operator.slice(
  operator.indexOf("function runExistingPreviewHarness"),
  operator.indexOf("export async function runBestEffortStages")
);
assert.doesNotMatch(previewHarnessSource, /result[.]stderr|error[.]message|error[.]stack/,
  "The hosted seam must not forward raw child diagnostics.");
assert.doesNotMatch(previewHarnessSource, /\.\.\.process[.]env/,
"The optional child must not inherit the root process environment or Admin secret wholesale.");

for (const prohibited of [
  /inviteUserByEmail/,
  /signInWithOtp/,
  /verifyOtp/,
  /resetPasswordForEmail/,
  /deleteUser/,
  /auth[.]users/i,
  /session_replication_role/i,
  /from\(["'](?:public|private|source|storage)/i,
  /fetch\(["'][^"']*(?:ai|source|product)/i,
  /appendFile|createWriteStream/,
  /console[.](?:log|error)\([^\n]*(?:password|accessToken|refreshToken|publishableKey|adminSecretKey)/
]) {
  assert.doesNotMatch(operator, prohibited);
}
const checkpointWriter = operator.slice(
  operator.indexOf("export function writeActivePersonaCheckpoint"),
  operator.indexOf("export function validateRuntimeConfig")
);
assert.match(checkpointWriter, /O_CREAT \| constants[.]O_EXCL \| constants[.]O_WRONLY \| constants[.]O_NOFOLLOW/);
assert.match(checkpointWriter, /fchmodSync\(descriptor, 0o600\)/);
assert.doesNotMatch(operator.replace(checkpointWriter, ""), /writeFileSync\(/,
  "Only the approved private active-persona checkpoint may write a file.");

assert.doesNotMatch(packageJson, /sprint10-hosted-auth-probe/,
  "The live operator must not be included in default package scripts.");
const liveOperatorWorkflowPattern = /sprint10-hosted-auth-probe(?:\.mjs|[\s"'])/;
assert.match('node scripts/sprint10-hosted-auth-probe.mjs', liveOperatorWorkflowPattern);
assert.doesNotMatch('node scripts/sprint10-hosted-auth-probe-check.mjs', liveOperatorWorkflowPattern);
for (const workflow of workflows) {
  assert.doesNotMatch(workflow, liveOperatorWorkflowPattern,
    "The live operator must not be included in repository workflows.");
}
assert.match(handoff, /No hosted call was executed during implementation/i);
assert.match(handoff, /root-only executor/i);
assert.match(handoff, /transactional email.*deferred/i);
assert.match(handoff, /profile rows.*preserved/i);
assert.match(handoff, /Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion[.]/);

console.log(JSON.stringify({
  status: "PASS",
  preflight: { positive: 1, negative: negativeFixtures.length },
  behavioral: {
    gitSecretSentinelChildren: gitChildCalls.length,
    previewChildSecretSentinel: 1,
    allowedInjectedFetchDispatches: dispatched.length,
    pinnedSdkInjectedRequests: sdkOperations.length,
    blockedBeforeDispatch: blockedNetworkFixtures.length,
    transientAndUnknownDenialsRejected: 5,
    anonymousDenialFixtures: 5,
    staleJwtFixtures: 5,
    serverLogoutStatusFixtures: 7,
    futureBanFixtures: 3,
    partialCreateIdRetention: 1,
    delayedAmbiguousCreateRecovery: delayedRecoveryReads,
    persistentEmptyAmbiguousRecovery: persistentEmptyReads,
    syntheticRecoveryIdentityRetained: 1,
    retirementStageFaults: retirementStages.length
  }
}));
