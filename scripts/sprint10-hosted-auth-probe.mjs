#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const exactProjectRef = "pphdqkurxneyagvnnjdt";
const exactSupabaseOrigin = `https://${exactProjectRef}.supabase.co`;
const exactRunOptIn = "create-two-synthetic-password-personas";
const exactPreviewSeamOptIn = "run-existing-real-password-preview-harness";
const permanentBanDuration = "876000h";
const requestTimeoutMs = 20_000;
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

export function validateRuntimeConfig(env, argv, gitHead, nodeMajor = Number(process.versions.node.split(".")[0])) {
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
  return {
    projectRef,
    supabaseUrl,
    publishableKey,
    adminSecretKey,
    expectedCommitSha,
    previewSeam
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
    email: `geoai-auth-probe-${runId}-${lane.toLowerCase()}@example.invalid`,
    password: `Gx!${randomBytes(30).toString("base64url")}`,
    userId: null,
    profileId: null,
    sessions: [],
    createAbsenceProven: false,
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

async function createPersona(admin, config, adminFetch, persona) {
  let result;
  let requestFailure = null;
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

  if (result?.data?.user?.id) captureCreatedUserId(persona, result.data);
  if (requestFailure || result?.error || !persona.userId) {
    const recoveredUserId = await recoverExactSyntheticUser({
      fetcher: adminFetch,
      supabaseUrl: config.supabaseUrl,
      adminSecretKey: config.adminSecretKey,
      email: persona.email
    });
    if (recoveredUserId) persona.userId = recoveredUserId;
    else persona.createAbsenceProven = true;
    fail(
      recoveredUserId
        ? `Create response for persona ${persona.lane} was ambiguous; the exact account was recovered for mandatory retirement.`
        : `Create response for persona ${persona.lane} failed and exact-account absence was proven.`,
      recoveredUserId ? "ambiguous_create_recovered" : "create_failed_absence_proven",
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

  const { data: userData, error: userError } = await primary.client.auth.getUser(primaryAccessToken);
  assertNoError(userError, `getUser ${persona.lane}`);
  assert.equal(userData?.user?.id, persona.userId);
  assert.equal(userData?.user?.email?.toLowerCase(), persona.email);

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
    timeout: 240_000,
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.error || result.status !== 0) {
    fail("The optional existing real-password Preview harness failed closed; its secret-bearing output was suppressed.");
  }
  return "passed_existing_reviewed_runner";
}

export async function runBestEffortStages(stages, failureIdentity) {
  const failures = [];
  for (const [stage, operation] of stages) {
    try {
      await operation();
    } catch (error) {
      failures.push({ ...failureIdentity, stage, error: safeError(error) });
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
}

async function retirePersona(createClient, admin, adminFetch, config, persona) {
  const failures = [];
  if (!persona.userId && !persona.createAbsenceProven) {
    try {
      const recoveredUserId = await recoverExactSyntheticUser({
        fetcher: adminFetch,
        supabaseUrl: config.supabaseUrl,
        adminSecretKey: config.adminSecretKey,
        email: persona.email
      });
      if (recoveredUserId) persona.userId = recoveredUserId;
      else persona.createAbsenceProven = true;
    } catch (error) {
      failures.push({
        userId: "unknown",
        syntheticIdentity: persona.email,
        stage: "recover_ambiguous_create",
        error: safeError(error)
      });
    }
  }

  if (!persona.userId) {
    if (!persona.createAbsenceProven && failures.length === 0) {
      failures.push({
        userId: "unknown",
        syntheticIdentity: persona.email,
        stage: "unknown_create_outcome",
        error: "user_id_unavailable/unknown"
      });
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
  ], { userId: persona.userId }));
  clearPersonaCredentials(persona);
  return failures;
}

async function runHostedProbe() {
  const gitHead = readGitState();
  const config = validateRuntimeConfig(process.env, process.argv, gitHead);
  const { createClient } = await import("@supabase/supabase-js");
  const runId = randomUUID().replaceAll("-", "").slice(0, 18);
  const personas = [newSyntheticPersona("A", runId), newSyntheticPersona("B", runId)];
  const recoveryEmails = new Set(personas.map((persona) => persona.email));
  const adminFetch = createBoundedFetch("admin", { recoveryEmails });
  const admin = createClient(config.supabaseUrl, config.adminSecretKey, clientOptions(adminFetch));
  const cleanupFailures = [];
  let executionError = null;
  let previewHarness = "not_requested";

  try {
    for (const persona of personas) await createPersona(admin, config, adminFetch, persona);
    assert.notEqual(personas[0].userId, personas[1].userId);
    for (const persona of personas) await authenticatePersona(createClient, config, persona);
    assert.notEqual(personas[0].profileId, personas[1].profileId, "A/B profiles must remain isolated");
    assert.equal(personas[0].userId === personas[1].userId, false);
    await verifyAnonymousDenial(createClient, config);
    previewHarness = runExistingPreviewHarness(config, personas);
  } catch (error) {
    executionError = error instanceof Error ? error : new Error("The hosted Auth probe failed closed.");
  } finally {
    for (const persona of personas) {
      cleanupFailures.push(...await retirePersona(createClient, admin, adminFetch, config, persona));
    }
  }

  if (cleanupFailures.length > 0) {
    console.error(JSON.stringify({
      status: "FAIL_ACTION_REQUIRED",
      projectRef: exactProjectRef,
      cleanupFailures
    }));
    fail("Terminal credential retirement was not proven for every potentially created synthetic user.", "retirement_unproven");
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
