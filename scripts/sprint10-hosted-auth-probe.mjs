#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  constants,
  existsSync,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  LIVE_SCOPE_RECEIPT_PLAN,
  validateLiveLedgerPreflight
} from "./sprint10-live-journey-run.mjs";
import {
  hostedPreviewFailureStage,
  parseAuthDiagnostic
} from "./sprint10-real-password-auth-diagnostics.mjs";

const exactProjectRef = "pphdqkurxneyagvnnjdt";
const exactSupabaseOrigin = `https://${exactProjectRef}.supabase.co`;
const exactRunOptIn = "create-two-synthetic-password-personas";
const exactPreviewSeamOptIn = "run-existing-real-password-preview-harness";
const exactLiveJourneySeamOptIn = "run-reviewed-sprint10-live-journey-before-retirement";
const exactLedgerId = "5aa405b3-bbda-48aa-aeea-ca3357be4042";
const acceptedLiveScopes = new Set(["journey", "dubai-analyse", "dubai-find", "singapore-create"]);
const acceptedPreviewFailureStages = new Set([
  "preview_preflight",
  "preview_discovery_spawn",
  "preview_discovery_parse",
  "preview_discovery_contract",
  "preview_browser_spawn",
  "preview_child_timeout",
  "preview_report_parse",
  "preview_test_execution_none",
  "preview_test_execution_primary_continuity",
  "preview_test_execution_dual_session_isolation",
  "preview_report_contract",
  "preview_outer_timeout",
  "preview_runner_spawn",
  "preview_runner_report_contract"
]);
const forbiddenProductionHosts = new Set([
  "geoai-mvp.vercel.app",
  "geoai-id0xnwco2-geoaidev.vercel.app",
  "geoai-a71p4fxnr-geoaidev.vercel.app"
]);
const permanentBanDuration = "876000h";
const requestTimeoutMs = 20_000;
const ambiguousCreateRecoveryDelaysMs = [0, 750];
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const requiredEnvironmentNames = [
  "GEOAI_HOSTED_AUTH_PROBE_EXPLICIT_RUN",
  "GEOAI_HOSTED_AUTH_PROBE_PROJECT_REF",
  "GEOAI_HOSTED_AUTH_PROBE_SUPABASE_URL",
  "GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY",
  "GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY",
  "GEOAI_HOSTED_AUTH_PROBE_EXPECTED_COMMIT_SHA",
  "GEOAI_HOSTED_AUTH_PROBE_RUN_APPROVAL"
];

const previewSeamEnvironmentNames = [
  "GEOAI_E2E_BASE_URL",
  "GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL",
  "GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET",
  "GEOAI_REAL_PASSWORD_AUTH_DEPLOYMENT_RECEIPT_PATH",
  "GEOAI_REAL_PASSWORD_AUTH_RUN_APPROVAL"
];

const liveJourneySeamEnvironmentNames = [
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SCOPE",
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_ROOT",
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_PATH",
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_EXPECTED_LEDGER_ID",
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_RUN_APPROVAL",
  "GEOAI_HOSTED_AUTH_PROBE_ACTIVE_PERSONA_RECEIPT_PATH"
];

class ProbeFailure extends Error {
  constructor(message, code = "probe_contract_failed", status = undefined) {
    super(message);
    this.name = "ProbeFailure";
    this.code = code;
    if (Number.isInteger(status)) this.status = status;
  }
}

function fail(message, code, status) {
  throw new ProbeFailure(message, code, status);
}

function required(env, name) {
  const value = env[name];
  if (typeof value !== "string" || value.length === 0) fail(`Missing required runtime setting: ${name}.`);
  return value;
}

function canonicalOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash &&
      !url.username && !url.password && !url.port
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function privateRegularFile(path, label) {
  const details = lstatSync(path);
  if (!details.isFile() || details.isSymbolicLink() || details.nlink !== 1 ||
      (details.mode & 0o077) !== 0 || realpathSync(path) !== path) {
    fail(`${label} must be a private regular non-link file.`, "checkpoint_path_invalid");
  }
}

function directoryEntry(path, label) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    fail(`${label} could not be verified safely.`, "checkpoint_path_invalid");
  }
}

export function validateActiveCheckpointPath(pathValue, mustExist = false) {
  if (typeof pathValue !== "string" || !isAbsolute(pathValue) || resolve(pathValue) !== pathValue) {
    fail("The active-persona checkpoint path must be one exact absolute path.", "checkpoint_path_invalid");
  }
  const path = resolve(pathValue);
  const parent = dirname(path);
  const parentDetails = lstatSync(parent);
  if (!parentDetails.isDirectory() || parentDetails.isSymbolicLink() || realpathSync(parent) !== parent ||
      (statSync(parent).mode & 0o077) !== 0 || basename(path).length < 1) {
    fail("The active-persona checkpoint parent must be one existing private 0700 real directory.", "checkpoint_path_invalid");
  }
  const entry = directoryEntry(path, "The active-persona checkpoint path");
  if (mustExist) {
    if (entry === null) fail("The active-persona checkpoint is missing.", "checkpoint_missing");
    privateRegularFile(path, "The active-persona checkpoint");
  } else if (entry !== null) {
    fail("The active-persona checkpoint path already exists; a prior run may be unresolved.", "checkpoint_exists");
  }
  return path;
}

export function writeActivePersonaCheckpoint(pathValue, input, { replace = false } = {}) {
  const path = validateActiveCheckpointPath(pathValue, replace);
  if (!input || !["provisioning", "active", "retired", "retirement_failed"].includes(input.state) ||
      !/^[0-9a-f]{18}$/.test(input.runId) || !/^[0-9a-f]{40}$/.test(input.gitHead) ||
      input.projectRef !== exactProjectRef || !Array.isArray(input.personas) || input.personas.length !== 2 ||
      input.personas[0]?.lane !== "A" || input.personas[1]?.lane !== "B" ||
      input.personas.some((persona) =>
        !["not_attempted", "create_dispatched", "uuid_known", "active", "retired", "retirement_failed"].includes(persona?.state) ||
        !(persona.userId === null || uuidPattern.test(persona.userId ?? "")) ||
        Object.keys(persona).sort().join(",") !== "lane,state,userId" ||
        (["uuid_known", "active"].includes(persona.state) && persona.userId === null) ||
        (["not_attempted", "create_dispatched"].includes(persona.state) && persona.userId !== null)) ||
      (input.state === "retired" && input.personas.some((persona) => persona.state !== "retired")) ||
      (input.state === "retirement_failed" &&
        (input.personas.some((persona) => !["retired", "retirement_failed"].includes(persona.state)) ||
          input.personas.every((persona) => persona.state === "retired")))) {
    fail("The active-persona checkpoint payload is not accepted.", "checkpoint_payload_invalid");
  }
  const payload = {
    schemaVersion: "geoai.sprint10.active-persona-checkpoint.v2",
    state: input.state,
    runId: input.runId,
    projectRef: exactProjectRef,
    gitHead: input.gitHead,
    personas: input.personas.map(({ lane, state, userId }) => ({ lane, state, userId }))
  };
  const temporaryPath = resolve(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = openSync(
      temporaryPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
      0o600
    );
    fchmodSync(descriptor, 0o600);
    writeFileSync(descriptor, `${JSON.stringify(payload)}\n`, "utf8");
    fsyncSync(descriptor);
    const details = fstatSync(descriptor);
    if (!details.isFile() || details.nlink !== 1 || (details.mode & 0o077) !== 0) {
      fail("The active-persona checkpoint temporary file is not private.", "checkpoint_write_failed");
    }
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, path);
    privateRegularFile(path, "The written active-persona checkpoint");
    const directory = openSync(dirname(path), constants.O_RDONLY);
    try { fsyncSync(directory); } finally { closeSync(directory); }
    return payload;
  } catch (error) {
    if (typeof descriptor === "number") closeSync(descriptor);
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    throw error;
  }
}

export function validateRuntimeConfig(
  env,
  argv,
  gitHead,
  nodeMajor = Number(process.versions.node.split(".")[0]),
  { ledgerPreflight = validateLiveLedgerPreflight } = {}
) {
  if (!Array.isArray(argv) || argv.length !== 2) {
    fail("The hosted Auth probe accepts no command-line arguments; all sensitive inputs must remain runtime-only.");
  }
  if (!Number.isInteger(nodeMajor) || nodeMajor < 22) {
    fail("The hosted Auth probe requires Node.js 22 or later.");
  }
  for (const name of requiredEnvironmentNames) required(env, name);
  if (required(env, "GEOAI_HOSTED_AUTH_PROBE_EXPLICIT_RUN").trim() !== exactRunOptIn) {
    fail("The exact hosted Auth probe opt-in is required.");
  }
  const projectRef = required(env, "GEOAI_HOSTED_AUTH_PROBE_PROJECT_REF").trim();
  if (projectRef !== exactProjectRef) fail("The probe is restricted to the exact geoai-dev project reference.");
  const supabaseUrl = canonicalOrigin(required(env, "GEOAI_HOSTED_AUTH_PROBE_SUPABASE_URL").trim());
  if (supabaseUrl !== exactSupabaseOrigin) fail("The probe is restricted to the exact geoai-dev Supabase origin.");
  const expectedCommitSha = required(env, "GEOAI_HOSTED_AUTH_PROBE_EXPECTED_COMMIT_SHA").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expectedCommitSha) || expectedCommitSha !== gitHead.trim().toLowerCase()) {
    fail("The probe must be bound to the exact current Git HEAD.");
  }
  if (required(env, "GEOAI_HOSTED_AUTH_PROBE_RUN_APPROVAL").trim() !==
      `hosted-auth-probe:${exactProjectRef}:${expectedCommitSha}`) {
    fail("The root-owned run approval is not bound to the exact project and Git head.");
  }
  const publishableKey = required(env, "GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY");
  const adminSecretKey = required(env, "GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY");
  if (!publishableKey.startsWith("sb_publishable_") || publishableKey.length < 32) {
    fail("The runtime publishable key is not an accepted modern Supabase publishable key.");
  }
  if (!adminSecretKey.startsWith("sb_secret_") || adminSecretKey.length < 32 || adminSecretKey === publishableKey) {
    fail("The runtime Admin secret is not an accepted distinct modern Supabase secret key.");
  }

  const previewSeam = env.GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM ?? "disabled";
  if (!["disabled", exactPreviewSeamOptIn].includes(previewSeam)) {
    fail("The optional Preview seam setting is not accepted.");
  }
  if (previewSeam === exactPreviewSeamOptIn) {
    for (const name of previewSeamEnvironmentNames) required(env, name);
    if (required(env, "GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL") !== required(env, "GEOAI_E2E_BASE_URL")) {
      fail("The optional Preview seam requires one exact Preview/base URL.");
    }
    if (required(env, "GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET").length < 16) {
      fail("The optional Preview seam requires the root-owned protection bypass value.");
    }
  }

  const liveJourneySeam = env.GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SEAM ?? "disabled";
  if (!["disabled", exactLiveJourneySeamOptIn].includes(liveJourneySeam)) {
    fail("The optional live-journey seam setting is not accepted.");
  }
  let liveJourney = null;
  if (liveJourneySeam === exactLiveJourneySeamOptIn) {
    if (previewSeam !== exactPreviewSeamOptIn) {
      fail("The live-journey seam requires the existing reviewed Preview Auth seam first.");
    }
    for (const name of liveJourneySeamEnvironmentNames) required(env, name);
    const scope = required(env, "GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SCOPE");
    if (!acceptedLiveScopes.has(scope)) fail("The optional live-journey scope is not accepted.");
    const previewUrl = canonicalOrigin(required(env, "GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL"));
    const preview = previewUrl ? new URL(previewUrl) : null;
    if (!preview || preview.protocol !== "https:" || !preview.hostname.endsWith(".vercel.app") ||
        forbiddenProductionHosts.has(preview.hostname)) {
      fail("The live-journey seam requires one exact non-Production HTTPS Vercel Preview.");
    }
    const ledgerId = required(env, "GEOAI_HOSTED_AUTH_PROBE_LIVE_EXPECTED_LEDGER_ID");
    if (ledgerId !== exactLedgerId) fail("The optional live-journey ledger identity is not accepted.");
    const ledgerRoot = required(env, "GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_ROOT");
    const ledgerPath = required(env, "GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_PATH");
    const ledger = ledgerPreflight(ledgerRoot, ledgerPath, scope);
    if (ledger?.ledgerId !== exactLedgerId) fail("The early read-only ledger receipt is not accepted.");
    const liveApproval = required(env, "GEOAI_HOSTED_AUTH_PROBE_LIVE_RUN_APPROVAL");
    if (liveApproval !== `paid-live-journey:${exactLedgerId}:${preview.hostname}:${expectedCommitSha}:${scope}`) {
      fail("The live-journey approval is not bound to the exact ledger, host, Git head and scope.");
    }
    const checkpointPath = validateActiveCheckpointPath(
      required(env, "GEOAI_HOSTED_AUTH_PROBE_ACTIVE_PERSONA_RECEIPT_PATH"),
      false
    );
    liveJourney = {
      scope,
      previewUrl,
      previewHost: preview.hostname,
      ledgerRoot,
      ledgerPath,
      ledgerId,
      liveApproval,
      checkpointPath
    };
  }
  return {
    projectRef,
    supabaseUrl,
    publishableKey,
    adminSecretKey,
    expectedCommitSha,
    previewSeam,
    liveJourneySeam,
    liveJourney
  };
}

export function minimalGitEnvironment(env) {
  const child = {};
  for (const name of ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL"]) {
    if (typeof env[name] === "string") child[name] = env[name];
  }
  return {
    ...child,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.fsmonitor",
    GIT_CONFIG_VALUE_0: "false"
  };
}

export function readGitState(env = process.env, spawn = spawnSync) {
  const childEnvironment = minimalGitEnvironment(env);
  const head = spawn("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    env: childEnvironment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const status = spawn("git", ["status", "--porcelain"], {
    cwd: repositoryRoot,
    env: childEnvironment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (head.status !== 0 || status.status !== 0 || status.stdout.length !== 0) {
    fail("The hosted Auth probe requires a clean readable Git HEAD.", "git_preflight_failed");
  }
  return head.stdout.trim();
}

function safeError(error) {
  if (!error || typeof error !== "object") return "unknown";
  const code = typeof error.code === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(error.code) ? error.code : "unknown";
  const status = Number.isInteger(error.status) ? String(error.status) : "unknown";
  return `${code}/${status}`;
}

function isDefinitivePreDispatchFailure(error) {
  return error instanceof ProbeFailure &&
    (error.code === "network_dispatch_missing" || error.code?.startsWith("network_policy_"));
}

function assertNoError(error, stage) {
  if (error) fail(`${stage} failed (${safeError(error)}).`, "unexpected_remote_error", error.status);
}

function assertUuid(value, stage) {
  assert.match(String(value ?? ""), uuidPattern, stage);
}

function bodyAsJson(init) {
  if (init.body === undefined || init.body === null) return null;
  if (typeof init.body !== "string") fail("A non-JSON request body was blocked before dispatch.", "network_policy_body");
  try {
    return JSON.parse(init.body);
  } catch {
    fail("A malformed JSON request body was blocked before dispatch.", "network_policy_body");
  }
}

function assertObjectWithExactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object.`, "network_policy_body");
  }
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} contains an unapproved field`);
}

function assertNoQuery(url) {
  if ([...url.searchParams].length !== 0) fail("An unapproved query was blocked before dispatch.", "network_policy_query");
}

function assertNoBody(body) {
  if (body !== null) fail("An unapproved request body was blocked before dispatch.", "network_policy_body");
}

export function validateProbeRequest(kind, input, init = {}, recoveryEmails = new Set()) {
  const rawUrl = typeof input === "string" || input instanceof URL ? input : input?.url;
  const url = new URL(rawUrl);
  if (url.origin !== exactSupabaseOrigin || url.username || url.password) {
    fail("A request outside the exact Supabase origin was blocked before dispatch.", "network_policy_origin");
  }
  const inheritedMethod = typeof input === "object" && input && "method" in input ? input.method : "GET";
  const method = String(init.method ?? inheritedMethod ?? "GET").toUpperCase();
  const body = bodyAsJson(init);
  const userIdMatch = url.pathname.match(/^\/auth\/v1\/admin\/users\/([0-9a-f-]{36})$/i);

  if (kind === "admin" && url.pathname === "/auth/v1/admin/users" && method === "POST") {
    assertNoQuery(url);
    assertObjectWithExactKeys(body, ["email", "password", "email_confirm", "user_metadata"], "Admin create body");
    if (!recoveryEmails.has(body.email) || typeof body.password !== "string" || body.password.length < 32 || body.email_confirm !== true) {
      fail("The Admin create request is not bound to one registered synthetic persona.", "network_policy_body");
    }
    assertObjectWithExactKeys(body.user_metadata, ["full_name"], "Admin create metadata");
    return "admin_create_synthetic_user";
  }

  if (kind === "admin" && url.pathname === "/auth/v1/admin/users" && method === "GET") {
    assertNoBody(body);
    const keys = [...url.searchParams.keys()].sort();
    assert.deepEqual(keys, ["filter", "page", "per_page"], "Admin recovery query contains an unapproved field");
    for (const key of keys) {
      if (url.searchParams.getAll(key).length !== 1) fail("Duplicate Admin recovery query fields are blocked.", "network_policy_query");
    }
    const filter = url.searchParams.get("filter");
    if (!filter || !recoveryEmails.has(filter) || url.searchParams.get("page") !== "1" || url.searchParams.get("per_page") !== "2") {
      fail("Only a bounded exact synthetic-account recovery query is permitted.", "network_policy_query");
    }
    return "admin_recover_exact_synthetic_user";
  }

  if (kind === "admin" && userIdMatch && method === "GET") {
    assertUuid(userIdMatch[1], "Admin read-back path must contain one UUID");
    assertNoQuery(url);
    assertNoBody(body);
    return "admin_read_synthetic_user";
  }

  if (kind === "admin" && userIdMatch && method === "PUT") {
    assertUuid(userIdMatch[1], "Admin ban path must contain one UUID");
    assertNoQuery(url);
    assertObjectWithExactKeys(body, ["ban_duration"], "Admin ban body");
    if (body.ban_duration !== permanentBanDuration) fail("Only the exact long-duration ban is permitted.", "network_policy_body");
    return "admin_ban_synthetic_user";
  }

  if (kind !== "admin" && url.pathname === "/auth/v1/token" && method === "POST") {
    const queryKeys = [...url.searchParams.keys()];
    if (queryKeys.length !== 1 || queryKeys[0] !== "grant_type") {
      fail("An unapproved token query was blocked before dispatch.", "network_policy_query");
    }
    const grantType = url.searchParams.get("grant_type");
    if (grantType === "password") {
      assertObjectWithExactKeys(body, ["email", "password", "gotrue_meta_security"], "Password grant body");
      assertObjectWithExactKeys(body.gotrue_meta_security, [], "Password grant security metadata");
      return "password_grant";
    }
    if (grantType === "refresh_token") {
      assertObjectWithExactKeys(body, ["refresh_token"], "Refresh grant body");
      return "refresh_grant";
    }
    fail("An unapproved token grant was blocked before dispatch.", "network_policy_query");
  }

  if (kind !== "admin" && url.pathname === "/auth/v1/user" && method === "GET") {
    assertNoQuery(url);
    assertNoBody(body);
    return "verified_user_read";
  }

  if (kind !== "admin" && url.pathname === "/auth/v1/.well-known/jwks.json" && method === "GET") {
    assertNoQuery(url);
    assertNoBody(body);
    return "jwks_read";
  }

  if (kind !== "admin" && url.pathname === "/auth/v1/logout" && method === "POST") {
    assertNoBody(body);
    const keys = [...url.searchParams.keys()];
    if (keys.length !== 1 || keys[0] !== "scope" || url.searchParams.get("scope") !== "global") {
      fail("Only an exact server-global logout request is permitted.", "network_policy_query");
    }
    return "server_global_logout";
  }

  if (kind !== "admin" && url.pathname === "/rest/v1/rpc/current_profile" && method === "POST") {
    assertNoQuery(url);
    assertObjectWithExactKeys(body, [], "current_profile body");
    return "current_profile_rpc";
  }

  fail("A non-allowlisted hosted Auth probe request was blocked before dispatch.", "network_policy_path");
}

export function createBoundedFetch(kind, {
  dispatch = globalThis.fetch,
  recoveryEmails = new Set(),
  timeoutMs = requestTimeoutMs,
  onDispatch = undefined
} = {}) {
  if (typeof dispatch !== "function") fail("A callable network dispatcher is required.", "network_dispatch_missing");
  return async (input, init = {}) => {
    if (init.redirect && init.redirect !== "error") {
      fail("A redirect-following request was blocked before dispatch.", "network_policy_redirect");
    }
    const operation = validateProbeRequest(kind, input, init, recoveryEmails);
    const existingSignal = init.signal;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = existingSignal ? AbortSignal.any([existingSignal, timeoutSignal]) : timeoutSignal;
    if (onDispatch) onDispatch(operation);
    return dispatch(input, { ...init, redirect: "error", signal });
  };
}

function clientOptions(fetcher, headers = undefined) {
  return {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: { fetch: fetcher, ...(headers ? { headers } : {}) }
  };
}

function newSyntheticPersona(lane, runId) {
  return {
    lane,
    runId,
    email: `geoai-auth-probe-${runId}-${lane.toLowerCase()}@example.invalid`,
    password: `Gx!${randomBytes(30).toString("base64url")}`,
    userId: null,
    profileId: null,
    sessions: [],
    createAttempted: false,
    createOutcomeUnknown: false,
    createAbsenceProven: false,
    provisioningState: "not_attempted",
    credentialsCleared: false,
    auth: {
      primaryPasswordLogin: false,
      getClaims: false,
      getUser: false,
      currentProfile: false,
      secondaryPasswordLogin: false
    },
    cleanup: {
      serverGlobalRevokeConfirmed: false,
      refreshTokensRejected: 0,
      banned: false,
      passwordRejected: false,
      currentProfileEmpty: false,
      finalBanReadback: false
    }
  };
}

export function captureCreatedUserId(persona, data) {
  assertUuid(data?.user?.id, `persona ${persona.lane} must return one exact user id`);
  persona.userId = data.user.id;
  return persona.userId;
}

function assertCreatedPersonaShape(persona, data) {
  assert.equal(data?.user?.id, persona.userId);
  assert.equal(data?.user?.email?.toLowerCase(), persona.email);
  assert(data?.user?.email_confirmed_at, `persona ${persona.lane} must be confirmed without email delivery`);
}

function adminHeaders(adminSecretKey) {
  return {
    apikey: adminSecretKey,
    Authorization: `Bearer ${adminSecretKey}`
  };
}

export async function recoverExactSyntheticUser({ fetcher, supabaseUrl, adminSecretKey, email }) {
  const url = new URL("/auth/v1/admin/users", supabaseUrl);
  url.searchParams.set("filter", email);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "2");
  const response = await fetcher(url, { method: "GET", headers: adminHeaders(adminSecretKey) });
  if (response.status !== 200) fail("Exact synthetic-account recovery did not return HTTP 200.", "recovery_http_status", response.status);
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.users) || payload.users.length > 1) {
    fail("Exact synthetic-account recovery returned an ambiguous shape.", "recovery_ambiguous_shape");
  }
  if (payload.users.length === 0) return null;
  const user = payload.users[0];
  if (user?.email?.toLowerCase() !== email.toLowerCase()) {
    fail("The bounded recovery endpoint returned a non-matching account.", "recovery_filter_mismatch");
  }
  assertUuid(user.id, "Recovered synthetic account must contain one UUID");
  return user.id;
}

export async function recoverAmbiguousSyntheticCreate({
  lookup,
  wait = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds)),
  delaysMs = ambiguousCreateRecoveryDelaysMs
}) {
  if (typeof lookup !== "function" || typeof wait !== "function" ||
      !Array.isArray(delaysMs) || delaysMs.length !== 2 || delaysMs[0] !== 0 || delaysMs[1] !== 750) {
    fail("Ambiguous-create recovery requires the exact bounded two-read schedule.", "recovery_schedule_invalid");
  }
  const lookupErrors = [];
  for (let index = 0; index < delaysMs.length; index += 1) {
    if (delaysMs[index] > 0) await wait(delaysMs[index]);
    try {
      const userId = await lookup();
      if (userId) return { userId, attempts: index + 1, lookupErrors };
    } catch (error) {
      lookupErrors.push(safeError(error));
    }
  }
  return { userId: null, attempts: delaysMs.length, lookupErrors };
}

export function unknownCreateFailure(persona) {
  return {
    userId: "unknown",
    syntheticIdentity: persona.email,
    stage: "unknown_create_outcome",
    error: "bounded_exact_recovery_exhausted/unknown"
  };
}

async function createPersona(admin, config, adminFetch, persona, { onUuidKnown = () => {} } = {}) {
  let result;
  let requestFailure = null;
  persona.createAttempted = true;
  persona.createOutcomeUnknown = true;
  try {
    result = await admin.auth.admin.createUser({
      email: persona.email,
      password: persona.password,
      email_confirm: true,
      user_metadata: { full_name: `GeoAI synthetic hosted Auth probe ${persona.lane}` }
    });
  } catch (error) {
    requestFailure = error;
  }

  if (result?.data?.user?.id) {
    captureCreatedUserId(persona, result.data);
    persona.createOutcomeUnknown = false;
    onUuidKnown(persona);
  }
  if (requestFailure || result?.error || !persona.userId) {
    if (requestFailure && isDefinitivePreDispatchFailure(requestFailure)) {
      persona.createOutcomeUnknown = false;
      persona.createAbsenceProven = true;
      throw requestFailure;
    }
    const recovery = await recoverAmbiguousSyntheticCreate({
      lookup: () => recoverExactSyntheticUser({
        fetcher: adminFetch,
        supabaseUrl: config.supabaseUrl,
        adminSecretKey: config.adminSecretKey,
        email: persona.email
      })
    });
    if (recovery.userId) {
      persona.userId = recovery.userId;
      persona.createOutcomeUnknown = false;
      onUuidKnown(persona);
    }
    fail(
      recovery.userId
        ? `Create response for persona ${persona.lane} was ambiguous; the exact account was recovered for mandatory retirement.`
        : `Create response for persona ${persona.lane} remained ambiguous after bounded exact recovery.`,
      recovery.userId ? "ambiguous_create_recovered" : "ambiguous_create_unresolved",
      requestFailure?.status ?? result?.error?.status
    );
  }

  assertCreatedPersonaShape(persona, result.data);
}

function createUserClient(createClient, config, headers = undefined) {
  const fetcher = createBoundedFetch("user");
  return createClient(config.supabaseUrl, config.publishableKey, clientOptions(fetcher, headers));
}

async function createSession(createClient, config, persona, label) {
  const client = createUserClient(createClient, config);
  const { data, error } = await client.auth.signInWithPassword({
    email: persona.email,
    password: persona.password
  });
  assertNoError(error, `${label} password sign-in ${persona.lane}`);
  assert.equal(data?.user?.id, persona.userId);
  assert(data?.session?.access_token && data?.session?.refresh_token, `persona ${persona.lane} must receive an in-memory ${label} session`);
  persona.sessions.push({
    label,
    client,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token
  });
  if (label === "primary") persona.auth.primaryPasswordLogin = true;
  if (label === "secondary") persona.auth.secondaryPasswordLogin = true;
  return { client, data };
}

async function authenticatePersona(createClient, config, persona) {
  const primary = await createSession(createClient, config, persona, "primary");
  const primaryAccessToken = primary.data.session.access_token;

  const { data: claimsData, error: claimsError } = await primary.client.auth.getClaims(primaryAccessToken);
  assertNoError(claimsError, `getClaims ${persona.lane}`);
  assert.equal(claimsData?.claims?.sub, persona.userId);
  assert.equal(claimsData?.claims?.role, "authenticated");
  assert.equal(claimsData?.claims?.is_anonymous, false);
  persona.auth.getClaims = true;

  const { data: userData, error: userError } = await primary.client.auth.getUser(primaryAccessToken);
  assertNoError(userError, `getUser ${persona.lane}`);
  assert.equal(userData?.user?.id, persona.userId);
  assert.equal(userData?.user?.email?.toLowerCase(), persona.email);
  persona.auth.getUser = true;

  const profileResponse = await primary.client.schema("api").rpc("current_profile");
  assertNoError(profileResponse.error, `api.current_profile ${persona.lane}`);
  assert.equal(profileResponse.status, 200, `persona ${persona.lane} current_profile must return HTTP 200`);
  assert(Array.isArray(profileResponse.data) && profileResponse.data.length === 1, `persona ${persona.lane} must resolve exactly one profile`);
  const profile = profileResponse.data[0];
  assertUuid(profile?.id, `persona ${persona.lane} must resolve one profile id`);
  assert.equal(profile.auth_user_id, persona.userId);
  assert.equal(profile.email?.toLowerCase(), persona.email);
  assert.equal(profile.status, "active");
  assert.equal(profile.identity_kind, "user");
  persona.profileId = profile.id;
  persona.auth.currentProfile = true;

  await createSession(createClient, config, persona, "secondary");
  assert.equal(persona.sessions.length, 2, `persona ${persona.lane} must hold two independent sessions before retirement`);
  assert.notEqual(persona.sessions[0].refreshToken, persona.sessions[1].refreshToken, `persona ${persona.lane} sessions must have distinct refresh tokens`);
}

function isRetryableOrUnknown(error) {
  const status = Number.isInteger(error?.status) ? error.status : null;
  return !error || error?.name === "AuthRetryableFetchError" || status === null || status === 0 || status === 429 || status >= 500;
}

export function assertTerminalAuthFailure({ error, data }, { stage, allowedCodes, allowedStatuses }) {
  if (!error || data?.session) fail(`${stage} did not prove a terminal denial.`, "terminal_denial_unproven");
  if (isRetryableOrUnknown(error)) fail(`${stage} returned a retryable or unknown failure.`, "terminal_denial_unproven", error?.status);
  if (!allowedCodes.includes(error.code) || !allowedStatuses.includes(error.status)) {
    fail(`${stage} returned a non-terminal code/status (${safeError(error)}).`, "terminal_denial_unproven", error.status);
  }
  return error.code;
}

export function assertAnonymousCurrentProfileDenied(response) {
  const status = Number.isInteger(response?.status) ? response.status : null;
  if (!response?.error || status === null || status === 0 || status === 429 || status >= 500) {
    fail("Anonymous current_profile denial was not proven.", "anonymous_denial_unproven", response?.status);
  }
  if (![401, 403].includes(status) || response.error.code !== "42501") {
    fail("Anonymous current_profile returned a non-terminal code/status.", "anonymous_denial_unproven", response.status);
  }
  if (!(response.data === null || (Array.isArray(response.data) && response.data.length === 0))) {
    fail("Anonymous current_profile returned data.", "anonymous_profile_visible");
  }
}

export function assertRetiredCurrentProfileEmpty(response) {
  if (response?.error || response?.status !== 200 || !Array.isArray(response?.data) || response.data.length !== 0) {
    fail("The retired stale JWT did not receive an exact successful empty current_profile result.", "retired_profile_not_empty", response?.status);
  }
}

export function assertServerGlobalRevokeResponse(response) {
  if (!response || ![200, 204].includes(response.status)) {
    fail("The raw server-global logout endpoint did not confirm success.", "server_global_revoke_unproven", response?.status);
  }
}

export function assertFutureBan(user, expectedUserId, now = Date.now()) {
  if (user?.id !== expectedUserId) fail("Admin read-back did not return the exact synthetic user.", "ban_readback_identity_mismatch");
  const bannedUntil = Date.parse(user?.banned_until ?? "");
  if (!Number.isFinite(bannedUntil) || bannedUntil <= now) {
    fail("Admin read-back did not prove a future ban.", "ban_readback_not_future");
  }
  return bannedUntil;
}

async function verifyAnonymousDenial(createClient, config) {
  const anonymous = createUserClient(createClient, config);
  const response = await anonymous.schema("api").rpc("current_profile");
  assertAnonymousCurrentProfileDenied(response);
}

export function buildPreviewChildEnvironment(config, personas, env = process.env) {
  const childEnvironment = {};
  for (const name of ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "NODE_OPTIONS", "PLAYWRIGHT_BROWSERS_PATH"]) {
    if (typeof env[name] === "string") childEnvironment[name] = env[name];
  }
  for (const name of previewSeamEnvironmentNames) childEnvironment[name] = env[name];
  Object.assign(childEnvironment, {
    GEOAI_REAL_PASSWORD_AUTH_EXPLICIT_RUN: "existing-password-only-live-acceptance",
    GEOAI_REAL_PASSWORD_AUTH_SCOPE: "primary_and_secondary",
    GEOAI_REAL_PASSWORD_AUTH_SUPABASE_PROJECT_REF: exactProjectRef,
    GEOAI_REAL_PASSWORD_AUTH_EXPECTED_COMMIT_SHA: config.expectedCommitSha,
    GEOAI_REAL_PASSWORD_AUTH_PRIMARY_EMAIL: personas[0].email,
    GEOAI_REAL_PASSWORD_AUTH_PRIMARY_PASSWORD: personas[0].password,
    GEOAI_REAL_PASSWORD_AUTH_PRIMARY_USER_ID: personas[0].userId,
    GEOAI_REAL_PASSWORD_AUTH_SECONDARY_EMAIL: personas[1].email,
    GEOAI_REAL_PASSWORD_AUTH_SECONDARY_PASSWORD: personas[1].password,
    GEOAI_REAL_PASSWORD_AUTH_SECONDARY_USER_ID: personas[1].userId
  });
  return childEnvironment;
}

export function runExistingPreviewHarness(config, personas, { env = process.env, spawn = spawnSync } = {}) {
  if (config.previewSeam !== exactPreviewSeamOptIn) return "not_requested";
  const childEnvironment = buildPreviewChildEnvironment(config, personas, env);
  const result = spawn(process.execPath, [resolve(repositoryRoot, "scripts/sprint10-real-password-auth-run.mjs")], {
    cwd: repositoryRoot,
    env: childEnvironment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 450_000,
    maxBuffer: 16 * 1024 * 1024
  });
  if (result?.error?.code === "ETIMEDOUT" || result?.signal === "SIGTERM") {
    return { status: "failed_existing_reviewed_runner", stage: "preview_outer_timeout" };
  }
  if (result.error) return { status: "failed_existing_reviewed_runner", stage: "preview_runner_spawn" };
  let diagnostic;
  try { diagnostic = parseAuthDiagnostic(result.stdout, result.status); }
  catch { return { status: "failed_existing_reviewed_runner", stage: "preview_runner_report_contract" }; }
  return diagnostic.status === "PASS"
    ? "passed_existing_reviewed_runner"
    : { status: "failed_existing_reviewed_runner", stage: hostedPreviewFailureStage(diagnostic) };
}

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

export function assertActiveCurrentPersona(personas, runId, invocationState) {
  const primary = personas?.[0];
  const secondary = personas?.[1];
  const cleanupInactive = (persona) => persona?.cleanup &&
    persona.cleanup.serverGlobalRevokeConfirmed === false && persona.cleanup.refreshTokensRejected === 0 &&
    persona.cleanup.banned === false && persona.cleanup.passwordRejected === false &&
    persona.cleanup.currentProfileEmpty === false && persona.cleanup.finalBanReadback === false;
  if (!primary || !secondary || primary.lane !== "A" || secondary.lane !== "B" ||
      primary.runId !== runId || secondary.runId !== runId || !/^[0-9a-f]{18}$/.test(runId) ||
      !uuidPattern.test(primary.userId ?? "") || !uuidPattern.test(primary.profileId ?? "") ||
      !uuidPattern.test(secondary.userId ?? "") || !uuidPattern.test(secondary.profileId ?? "") ||
      primary.userId === secondary.userId || primary.profileId === secondary.profileId ||
      primary.provisioningState !== "active" || secondary.provisioningState !== "active" ||
      typeof primary.email !== "string" || typeof primary.password !== "string" || primary.password.length < 8 ||
      primary.createOutcomeUnknown !== false || !Array.isArray(primary.sessions) || primary.sessions.length !== 2 ||
      primary.sessions.some((session) => !session?.accessToken || !session?.refreshToken) ||
      !cleanupInactive(primary) || !cleanupInactive(secondary) || !invocationState || invocationState.invoked !== false) {
    fail("The live journey requires one fresh active current-run persona A and an unused seam.", "active_persona_invalid");
  }
}

export function buildLiveJourneyChildEnvironment(config, personas, env = process.env) {
  if (!config?.liveJourney) fail("The optional live-journey seam is not configured.", "live_seam_disabled");
  const childEnvironment = {};
  for (const name of [
    "PATH", "HOME", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "TZ",
    "PLAYWRIGHT_BROWSERS_PATH", "SystemRoot", "WINDIR", "ComSpec", "PATHEXT"
  ]) {
    if (typeof env[name] === "string") childEnvironment[name] = env[name];
  }
  Object.assign(childEnvironment, {
    GEOAI_E2E_BASE_URL: env.GEOAI_E2E_BASE_URL,
    GEOAI_SPRINT10_LIVE_EXPLICIT_RUN: "root-paid-live-journey-2026-09-18",
    GEOAI_SPRINT10_LIVE_SCOPE: config.liveJourney.scope,
    GEOAI_SPRINT10_LIVE_PREVIEW_URL: config.liveJourney.previewUrl,
    GEOAI_SPRINT10_LIVE_EXPECTED_COMMIT_SHA: config.expectedCommitSha,
    GEOAI_SPRINT10_LIVE_SUPABASE_PROJECT_REF: exactProjectRef,
    GEOAI_SPRINT10_LIVE_PREVIEW_BYPASS_SECRET: env.GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET,
    GEOAI_SPRINT10_LIVE_EMAIL: personas[0].email,
    GEOAI_SPRINT10_LIVE_PASSWORD: personas[0].password,
    GEOAI_SPRINT10_LIVE_USER_ID: personas[0].userId,
    GEOAI_SPRINT10_LIVE_EXPECTED_LEDGER_ID: config.liveJourney.ledgerId,
    GEOAI_SPRINT10_LIVE_LEDGER_ROOT: config.liveJourney.ledgerRoot,
    GEOAI_SPRINT10_LIVE_LEDGER_PATH: config.liveJourney.ledgerPath,
    GEOAI_SPRINT10_LIVE_DEPLOYMENT_RECEIPT_PATH: env.GEOAI_REAL_PASSWORD_AUTH_DEPLOYMENT_RECEIPT_PATH,
    GEOAI_SPRINT10_LIVE_RUN_APPROVAL: config.liveJourney.liveApproval
  });
  return childEnvironment;
}

function parseLiveReceipts(value, scope, { allowPartialPrefix = false } = {}) {
  if (!Array.isArray(value) || value.length > 2) fail("The live child receipt list is not accepted.", "live_receipt_invalid");
  const expected = LIVE_SCOPE_RECEIPT_PLAN[scope];
  if (!expected || (!allowPartialPrefix && value.length !== expected.length) ||
      (allowPartialPrefix && value.length > expected.length)) {
    fail("The live child spend receipt does not match the selected bounded scope.", "live_receipt_invalid");
  }
  const seen = new Set();
  const receipts = value.map((receipt, index) => {
    const expectedReceipt = expected[index];
    if (!exactKeys(receipt, ["id", "route", "depth", "state", "estimatedUsd"]) ||
        !Number.isSafeInteger(receipt.id) || receipt.id < 1 || seen.has(receipt.id) ||
        receipt.route !== expectedReceipt?.route || receipt.depth !== expectedReceipt?.depth ||
        receipt.state !== "settled" ||
        typeof receipt.estimatedUsd !== "number" || !Number.isFinite(receipt.estimatedUsd) ||
        receipt.estimatedUsd < 0 || receipt.estimatedUsd > expectedReceipt.reserveUsd) {
      fail("A live child spend receipt is malformed.", "live_receipt_invalid");
    }
    seen.add(receipt.id);
    return {
      id: receipt.id,
      route: receipt.route,
      depth: receipt.depth,
      state: receipt.state,
      estimatedUsd: receipt.estimatedUsd
    };
  });
  return receipts;
}

export function parseLiveJourneyChildReceipt(result, expected) {
  let value;
  try { value = JSON.parse(result?.stdout ?? ""); }
  catch { fail("The live child did not return one accepted JSON receipt.", "live_receipt_invalid"); }
  if (!value || value.scope !== expected.scope || value.previewHost !== expected.previewHost ||
      value.commit !== expected.commit) {
    fail("The live child receipt is not bound to the exact Preview tuple.", "live_receipt_invalid");
  }
  if (value.status === "PASS") {
    const receipts = parseLiveReceipts(value.receipts, expected.scope);
    if (result.status !== 0 || !exactKeys(value, ["status", "scope", "previewHost", "commit", "browserLocalPersistenceOnly", "receipts"]) ||
        value.browserLocalPersistenceOnly !== true) {
      fail("The live PASS receipt is not accepted.", "live_receipt_invalid");
    }
    return { status: "PASS", scope: value.scope, previewHost: value.previewHost, commit: value.commit, receipts,
      browserLocalPersistenceOnly: true };
  }
  if (value.status === "INCONCLUSIVE") {
    const receipts = parseLiveReceipts(value.receipts, expected.scope);
    if (result.status !== 2 || !exactKeys(value, ["status", "scope", "previewHost", "commit", "reason", "receipts"]) ||
        typeof value.reason !== "string" || !/^[A-Za-z0-9 .,:;()/_-]{1,500}$/.test(value.reason)) {
      fail("The live INCONCLUSIVE receipt is not accepted.", "live_receipt_invalid");
    }
    return { status: "INCONCLUSIVE", scope: value.scope, previewHost: value.previewHost, commit: value.commit, receipts,
      reason: value.reason };
  }
  if (value.status === "FAIL_CLEANUP") {
    const receipts = parseLiveReceipts(value.receipts, expected.scope, { allowPartialPrefix: true });
    if (result.status !== 1 || !exactKeys(value, ["status", "scope", "previewHost", "commit", "stage", "receipts"]) ||
        typeof value.stage !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(value.stage)) {
      fail("The live cleanup-failure receipt is not accepted.", "live_receipt_invalid");
    }
    return { status: "FAIL_CLEANUP", scope: value.scope, previewHost: value.previewHost, commit: value.commit, receipts,
      stage: value.stage };
  }
  fail("The live child returned an unsupported status.", "live_receipt_invalid");
}

export function sanitizedCleanupFailures(failures) {
  return failures.map((failure) => ({
    userId: uuidPattern.test(failure?.userId ?? "") ? failure.userId : "unknown",
    stage: typeof failure?.stage === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(failure.stage)
      ? failure.stage
      : "unknown",
    error: typeof failure?.error === "string" && /^[A-Za-z0-9_/-]{1,120}$/.test(failure.error)
      ? failure.error
      : "unknown/unknown"
  }));
}

export function runReviewedLiveJourney(
  config,
  personas,
  runId,
  { env = process.env, spawn = spawnSync, invocationState = { invoked: false } } = {}
) {
  if (!config.liveJourney) return { status: "NOT_REQUESTED" };
  assertActiveCurrentPersona(personas, runId, invocationState);
  invocationState.invoked = true;
  const childEnvironment = buildLiveJourneyChildEnvironment(config, personas, env);
  const result = spawn(process.execPath, [resolve(repositoryRoot, "scripts/sprint10-live-journey-run.mjs")], {
    cwd: repositoryRoot,
    env: childEnvironment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 810_000,
    killSignal: "SIGTERM",
    maxBuffer: 256 * 1024
  });
  if (result.error?.code === "ETIMEDOUT" || result.signal === "SIGTERM") {
    return { status: "FAIL", stage: "live_child_timeout" };
  }
  if (result.error || result.signal) return { status: "FAIL", stage: "live_child_unconfirmed" };
  try {
    return parseLiveJourneyChildReceipt(result, {
      scope: config.liveJourney.scope,
      previewHost: config.liveJourney.previewHost,
      commit: config.expectedCommitSha
    });
  } catch {
    return {
      status: "FAIL",
      stage: result.status === 0 || [1, 2].includes(result.status)
        ? "live_child_invalid_receipt"
        : "live_child_failed"
    };
  }
}

export async function runBestEffortStages(stages, failureIdentity, onStage = () => {}) {
  const failures = [];
  for (const [stage, operation] of stages) {
    try {
      await operation();
    } catch (error) {
      failures.push({ ...failureIdentity, stage, error: safeError(error) });
    } finally {
      try {
        onStage(stage);
      } catch (error) {
        failures.push({ ...failureIdentity, stage: `${stage}_checkpoint`, error: safeError(error) });
      }
    }
  }
  return failures;
}

async function rawServerGlobalRevoke(config, persona) {
  const primary = persona.sessions[0];
  if (!primary?.accessToken) fail("Primary access token is unavailable for server-global revoke.", "session_unavailable");
  const fetcher = createBoundedFetch("user");
  const response = await fetcher(`${config.supabaseUrl}/auth/v1/logout?scope=global`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${primary.accessToken}`
    }
  });
  assertServerGlobalRevokeResponse(response);
  persona.cleanup.serverGlobalRevokeConfirmed = true;
}

async function assertRefreshRejected(createClient, config, persona, session) {
  if (!session?.refreshToken) fail("Refresh token is unavailable for revocation proof.", "session_unavailable");
  const probe = createUserClient(createClient, config);
  const result = await probe.auth.refreshSession({ refresh_token: session.refreshToken });
  assertTerminalAuthFailure(result, {
    stage: `${session.label} refresh replay ${persona.lane}`,
    allowedCodes: ["refresh_token_not_found", "refresh_token_already_used", "session_not_found", "session_expired"],
    allowedStatuses: [400, 401, 403]
  });
  persona.cleanup.refreshTokensRejected += 1;
}

async function applyAdminBan(admin, persona) {
  const { data, error } = await admin.auth.admin.updateUserById(persona.userId, {
    ban_duration: permanentBanDuration
  });
  assertNoError(error, `Admin ban ${persona.lane}`);
  assertFutureBan(data?.user, persona.userId);
  persona.cleanup.banned = true;
}

async function assertPasswordRejected(createClient, config, persona) {
  const probe = createUserClient(createClient, config);
  const result = await probe.auth.signInWithPassword({ email: persona.email, password: persona.password });
  assertTerminalAuthFailure(result, {
    stage: `password sign-in after ban ${persona.lane}`,
    allowedCodes: ["user_banned"],
    allowedStatuses: [400]
  });
  persona.cleanup.passwordRejected = true;
}

async function assertStaleJwtProfileEmpty(createClient, config, persona) {
  const primary = persona.sessions[0];
  if (!primary?.accessToken) fail("Primary access token is unavailable for stale-JWT proof.", "session_unavailable");
  const client = createUserClient(createClient, config, { Authorization: `Bearer ${primary.accessToken}` });
  const response = await client.schema("api").rpc("current_profile");
  assertRetiredCurrentProfileEmpty(response);
  persona.cleanup.currentProfileEmpty = true;
}

async function assertFinalBanReadback(admin, persona) {
  const { data, error } = await admin.auth.admin.getUserById(persona.userId);
  assertNoError(error, `final Admin read-back ${persona.lane}`);
  assertFutureBan(data?.user, persona.userId);
  persona.cleanup.finalBanReadback = true;
}

function clearPersonaCredentials(persona) {
  persona.password = null;
  for (const session of persona.sessions) {
    session.accessToken = null;
    session.refreshToken = null;
    session.client = null;
  }
  persona.sessions = [];
  persona.credentialsCleared = true;
}

export async function retirePersona(createClient, admin, adminFetch, config, persona, { onStage = () => {} } = {}) {
  const failures = [];
  if (!persona.userId) {
    if (persona.createAttempted && !persona.createAbsenceProven) {
      failures.push(unknownCreateFailure(persona));
    }
    clearPersonaCredentials(persona);
    return failures;
  }

  failures.push(...await runBestEffortStages([
    ["server_global_revoke", () => rawServerGlobalRevoke(config, persona)],
    ["primary_refresh_rejected", () => assertRefreshRejected(createClient, config, persona, persona.sessions[0])],
    ["secondary_refresh_rejected", () => assertRefreshRejected(createClient, config, persona, persona.sessions[1])],
    ["admin_ban", () => applyAdminBan(admin, persona)],
    ["password_rejected_after_ban", () => assertPasswordRejected(createClient, config, persona)],
    ["stale_jwt_current_profile_empty", () => assertStaleJwtProfileEmpty(createClient, config, persona)],
    ["retired_user_readback", () => assertFinalBanReadback(admin, persona)]
  ], { userId: persona.userId }, onStage));
  clearPersonaCredentials(persona);
  return failures;
}

function personaRetirementProven(persona) {
  if (!persona.userId) return (!persona.createAttempted || persona.createAbsenceProven) && persona.credentialsCleared;
  return persona.cleanup.serverGlobalRevokeConfirmed === true && persona.cleanup.refreshTokensRejected === 2 &&
    persona.cleanup.banned === true && persona.cleanup.passwordRejected === true &&
    persona.cleanup.currentProfileEmpty === true && persona.cleanup.finalBanReadback === true &&
    persona.credentialsCleared === true;
}

function lifecycleCheckpointInput(config, runId, personas, state) {
  return {
    state,
    runId,
    projectRef: exactProjectRef,
    gitHead: config.expectedCommitSha,
    personas: personas.map(({ lane, provisioningState, userId }) => ({
      lane,
      state: provisioningState,
      userId: uuidPattern.test(userId ?? "") ? userId : null
    }))
  };
}

function observedLifecycle(personas, { anonymousDenial, isolatedProfiles, previewHarness }) {
  return {
    createAttemptsMarked: personas.filter((persona) => persona.createAttempted).length,
    uuidsKnown: personas.filter((persona) => uuidPattern.test(persona.userId ?? "")).length,
    anonymousCurrentProfileDenied: anonymousDenial,
    isolatedProfiles,
    previewHarness,
    auth: personas.map((persona) => ({
      lane: persona.lane,
      primaryPasswordLogin: persona.auth.primaryPasswordLogin,
      getClaims: persona.auth.getClaims,
      getUser: persona.auth.getUser,
      currentProfile: persona.auth.currentProfile,
      secondaryPasswordLogin: persona.auth.secondaryPasswordLogin
    }))
  };
}

function terminalPersonaEvidence(persona) {
  return {
    lane: persona.lane,
    userId: uuidPattern.test(persona.userId ?? "") ? persona.userId : null,
    lifecycleState: persona.provisioningState,
    createAttempted: persona.createAttempted,
    createAbsenceProven: persona.createAbsenceProven,
    serverGlobalRevokeConfirmed: persona.cleanup.serverGlobalRevokeConfirmed,
    refreshTokensRejected: persona.cleanup.refreshTokensRejected,
    banned: persona.cleanup.banned,
    passwordRejected: persona.cleanup.passwordRejected,
    currentProfileEmpty: persona.cleanup.currentProfileEmpty,
    finalBanReadback: persona.cleanup.finalBanReadback,
    credentialsCleared: persona.credentialsCleared,
    retirementProven: personaRetirementProven(persona)
  };
}

function successfulChecks(personas, observations) {
  return {
    adminCreateUserWithoutEmailDelivery: personas.filter((persona) => uuidPattern.test(persona.userId ?? "")).length,
    primaryPasswordLogin: personas.filter((persona) => persona.auth.primaryPasswordLogin).length,
    independentSecondarySessionLogin: personas.filter((persona) => persona.auth.secondaryPasswordLogin).length,
    getClaims: personas.filter((persona) => persona.auth.getClaims).length,
    getUser: personas.filter((persona) => persona.auth.getUser).length,
    currentProfile: personas.filter((persona) => persona.auth.currentProfile).length,
    isolatedProfiles: observations.isolatedProfiles,
    anonymousCurrentProfileDenied: observations.anonymousDenial,
    previewHarness: observations.previewHarness
  };
}

function successfulRetirement(personas) {
  return {
    rawServerGlobalRevokeConfirmed: personas.filter((persona) => persona.cleanup.serverGlobalRevokeConfirmed).length,
    independentRefreshTokensRejected: personas.reduce((sum, persona) => sum + persona.cleanup.refreshTokensRejected, 0),
    permanentAdminBan: personas.filter((persona) => persona.cleanup.banned).length,
    passwordLoginRejectedWithUserBannedCode: personas.filter((persona) => persona.cleanup.passwordRejected).length,
    staleJwtCurrentProfileSuccessfulEmptyResult: personas.filter((persona) => persona.cleanup.currentProfileEmpty).length,
    finalFutureBanReadback: personas.filter((persona) => persona.cleanup.finalBanReadback).length,
    hardDeletedUsers: 0,
    profileRowsPreservedByDesignNotBroadReadBack: personas.filter((persona) => uuidPattern.test(persona.profileId ?? "")).length
  };
}

export async function runHostedProbe(options = {}) {
  const environment = options.env ?? process.env;
  const gitHead = options.gitHead ?? readGitState();
  const config = options.config ?? validateRuntimeConfig(environment, options.argv ?? process.argv, gitHead);
  const createClient = options.createClient ?? (await import("@supabase/supabase-js")).createClient;
  const runId = options.runId ?? randomUUID().replaceAll("-", "").slice(0, 18);
  const personas = options.personas ?? [newSyntheticPersona("A", runId), newSyntheticPersona("B", runId)];
  const operations = {
    createPersona: options.operations?.createPersona ?? createPersona,
    authenticatePersona: options.operations?.authenticatePersona ?? authenticatePersona,
    verifyAnonymousDenial: options.operations?.verifyAnonymousDenial ?? verifyAnonymousDenial,
    runExistingPreviewHarness: options.operations?.runExistingPreviewHarness ?? runExistingPreviewHarness,
    runReviewedLiveJourney: options.operations?.runReviewedLiveJourney ?? runReviewedLiveJourney,
    retirePersona: options.operations?.retirePersona ?? retirePersona,
    writeCheckpoint: options.operations?.writeCheckpoint ?? writeActivePersonaCheckpoint,
    onEvent: options.operations?.onEvent ?? (() => {})
  };
  const emitReceipt = options.emitReceipt ?? ((receipt) => console.log(JSON.stringify(receipt)));
  const setExitCode = options.setExitCode ?? ((code) => { process.exitCode = code; });
  const recoveryEmails = new Set(personas.map((persona) => persona.email));
  const adminFetch = createBoundedFetch("admin", { recoveryEmails });
  const admin = createClient(config.supabaseUrl, config.adminSecretKey, clientOptions(adminFetch));
  const cleanupFailures = [];
  let executionError = null;
  let previewHarness = "not_requested";
  let liveJourney = { status: "NOT_REQUESTED" };
  let checkpointWritten = false;
  let anonymousDenialObserved = false;
  let isolatedProfilesObserved = false;
  const liveInvocationState = { invoked: false };

  try {
    if (config.liveJourney) {
      operations.writeCheckpoint(config.liveJourney.checkpointPath,
        lifecycleCheckpointInput(config, runId, personas, "provisioning"));
      checkpointWritten = true;
      operations.onEvent("checkpoint_initialized", { personas, config });
    }
    for (const persona of personas) {
      if (config.liveJourney) {
        persona.createAttempted = true;
        persona.createOutcomeUnknown = true;
        persona.provisioningState = "create_dispatched";
        operations.writeCheckpoint(config.liveJourney.checkpointPath,
          lifecycleCheckpointInput(config, runId, personas, "provisioning"), { replace: true });
        operations.onEvent(`${persona.lane}_create_intent_recorded`, { personas, config });
      }
      await operations.createPersona(admin, config, adminFetch, persona, {
        onUuidKnown(knownPersona) {
          if (!config.liveJourney) return;
          knownPersona.provisioningState = "uuid_known";
          operations.writeCheckpoint(config.liveJourney.checkpointPath,
            lifecycleCheckpointInput(config, runId, personas, "provisioning"), { replace: true });
          operations.onEvent(`${knownPersona.lane}_uuid_known`, { personas, config });
        }
      });
    }
    assert.notEqual(personas[0].userId, personas[1].userId);
    for (const persona of personas) {
      await operations.authenticatePersona(createClient, config, persona);
      if (config.liveJourney) {
        persona.provisioningState = "active";
        operations.writeCheckpoint(config.liveJourney.checkpointPath,
          lifecycleCheckpointInput(config, runId, personas, "provisioning"), { replace: true });
        operations.onEvent(`${persona.lane}_authenticated`, { personas, config });
      }
    }
    assert.notEqual(personas[0].profileId, personas[1].profileId, "A/B profiles must remain isolated");
    assert.equal(personas[0].userId === personas[1].userId, false);
    isolatedProfilesObserved = true;
    await operations.verifyAnonymousDenial(createClient, config);
    anonymousDenialObserved = true;
    if (config.liveJourney) {
      operations.writeCheckpoint(config.liveJourney.checkpointPath,
        lifecycleCheckpointInput(config, runId, personas, "active"), { replace: true });
      operations.onEvent("checkpoint_active", { personas, config });
    }
    const previewResult = operations.runExistingPreviewHarness(config, personas);
    if (typeof previewResult === "string") {
      previewHarness = previewResult;
    } else {
      if (!exactKeys(previewResult, ["status", "stage"]) ||
          previewResult?.status !== "failed_existing_reviewed_runner" ||
          !acceptedPreviewFailureStages.has(previewResult?.stage)) {
        fail("The optional existing real-password Preview harness returned an unaccepted failure stage.");
      }
      previewHarness = "failed_existing_reviewed_runner";
      liveJourney = { status: "FAIL", stage: previewResult.stage };
      fail("The optional existing real-password Preview harness failed closed; only its fixed safe failure stage was retained.");
    }
    operations.onEvent("preview_child_complete", { personas, config });
    if (config.liveJourney) {
      liveJourney = operations.runReviewedLiveJourney(config, personas, runId, { invocationState: liveInvocationState });
      operations.onEvent("live_child_complete", { personas, config });
    }
  } catch (error) {
    executionError = error instanceof Error ? error : new Error("The hosted Auth probe failed closed.");
  } finally {
    for (const persona of personas) {
      try {
        cleanupFailures.push(...await operations.retirePersona(createClient, admin, adminFetch, config, persona, {
          onStage(stage) {
            if (config.liveJourney && checkpointWritten) {
              operations.writeCheckpoint(config.liveJourney.checkpointPath,
                lifecycleCheckpointInput(config, runId, personas, "active"), { replace: true });
            }
            operations.onEvent(`${persona.lane}_retirement_${stage}`, { personas, config });
          }
        }));
      } catch (error) {
        cleanupFailures.push({
          userId: persona.userId ?? "unknown",
          stage: "retirement_unexpected_failure",
          error: safeError(error)
        });
        clearPersonaCredentials(persona);
      }
      persona.provisioningState = personaRetirementProven(persona) ? "retired" : "retirement_failed";
      if (config.liveJourney && checkpointWritten) {
        try {
          const terminalSoFar = personas.every((candidate) =>
            candidate.provisioningState === "retired" || candidate.provisioningState === "retirement_failed");
          const state = terminalSoFar
            ? personas.every((candidate) => candidate.provisioningState === "retired") ? "retired" : "retirement_failed"
            : "active";
          operations.writeCheckpoint(config.liveJourney.checkpointPath,
            lifecycleCheckpointInput(config, runId, personas, state), { replace: true });
          operations.onEvent(`${persona.lane}_retirement_complete`, { personas, config });
        } catch (error) {
          cleanupFailures.push({
            userId: persona.userId ?? "unknown",
            stage: "checkpoint_retirement_state",
            error: safeError(error)
          });
        }
      }
    }
  }

  if (cleanupFailures.length > 0 && !config.liveJourney) {
    console.error(JSON.stringify({
      status: "FAIL_ACTION_REQUIRED",
      projectRef: exactProjectRef,
      cleanupFailures
    }));
    fail("Terminal credential retirement was not proven for every potentially created synthetic user.", "retirement_unproven");
  }
  if (config.liveJourney) {
    const observations = { anonymousDenial: anonymousDenialObserved, isolatedProfiles: isolatedProfilesObserved, previewHarness };
    const sanitizedLiveJourney = executionError && liveJourney.status === "NOT_REQUESTED"
      ? { status: "FAIL", stage: "pre_live_failure" }
      : liveJourney;
    const retirementProven = personas.every(personaRetirementProven);
    const successStatus = !executionError && retirementProven && cleanupFailures.length === 0 &&
      ["PASS", "INCONCLUSIVE"].includes(sanitizedLiveJourney.status)
      ? sanitizedLiveJourney.status
      : null;
    const baseReceipt = {
      schemaVersion: "geoai.sprint10.hosted-auth-live-journey-receipt.v1",
      projectRef: exactProjectRef,
      gitHead: config.expectedCommitSha,
      previewHost: config.liveJourney.previewHost,
      scope: config.liveJourney.scope,
      ledgerId: config.liveJourney.ledgerId,
      liveJourney: sanitizedLiveJourney,
      secretMaterialEmitted: false
    };
    if (successStatus) {
      emitReceipt({
        ...baseReceipt,
        status: successStatus,
        checks: successfulChecks(personas, observations),
        retirement: successfulRetirement(personas)
      });
      setExitCode(successStatus === "PASS" ? 0 : 2);
      return;
    }
    const actionRequired = cleanupFailures.length > 0 || !retirementProven;
    emitReceipt({
      ...baseReceipt,
      status: actionRequired ? "FAIL_ACTION_REQUIRED" : "FAIL",
      observed: observedLifecycle(personas, observations),
      personas: personas.map(terminalPersonaEvidence),
      ...(actionRequired ? { cleanupFailures: sanitizedCleanupFailures(cleanupFailures) } : {})
    });
    setExitCode(1);
    return;
  }
  if (executionError) throw executionError;

  console.log(JSON.stringify({
    schemaVersion: "geoai.sprint10.hosted-auth-probe-receipt.v2",
    status: "PASS",
    projectRef: exactProjectRef,
    gitHead: config.expectedCommitSha,
    createdSyntheticUsers: personas.map((persona) => ({
      lane: persona.lane,
      userId: persona.userId,
      profileId: persona.profileId,
      cleanup: persona.cleanup
    })),
    checks: {
      adminCreateUserWithoutEmailDelivery: 2,
      primaryPasswordLogin: 2,
      independentSecondarySessionLogin: 2,
      getClaims: 2,
      getUser: 2,
      currentProfile: 2,
      isolatedProfiles: true,
      anonymousCurrentProfileDenied: true,
      previewHarness
    },
    retirement: {
      rawServerGlobalRevokeConfirmed: 2,
      independentRefreshTokensRejected: 4,
      permanentAdminBan: 2,
      passwordLoginRejectedWithUserBannedCode: 2,
      staleJwtCurrentProfileSuccessfulEmptyResult: 2,
      finalFutureBanReadback: 2,
      hardDeletedUsers: 0,
      profileRowsPreservedByDesignNotBroadReadBack: 2
    },
    secretMaterialEmitted: false
  }));
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  runHostedProbe().catch((error) => {
    console.error(error instanceof Error ? error.message : "The hosted Auth probe failed closed.");
    process.exitCode = 1;
  });
}
