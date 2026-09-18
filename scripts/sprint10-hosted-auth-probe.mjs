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
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

function fail(message) {
  throw new Error(message);
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

function readGitState() {
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const status = spawnSync("git", ["status", "--porcelain"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (head.status !== 0 || status.status !== 0 || status.stdout.length !== 0) {
    fail("The hosted Auth probe requires a clean readable Git HEAD.");
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
  if (error) fail(`${stage} failed (${safeError(error)}).`);
}

function boundedFetch(kind) {
  const adminAuthPaths = new Set(["/auth/v1/admin/users"]);
  const userAuthPaths = new Set([
    "/auth/v1/token",
    "/auth/v1/user",
    "/auth/v1/logout",
    "/auth/v1/.well-known/jwks.json"
  ]);
  return async (input, init = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (url.origin !== exactSupabaseOrigin) fail("A request outside the exact Supabase origin was blocked before dispatch.");
    const method = String(init.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
    const isAdminUserPath = url.pathname === "/auth/v1/admin/users" ||
      /^\/auth\/v1\/admin\/users\/[0-9a-f-]{36}$/i.test(url.pathname);
    const isUserAuthPath = userAuthPaths.has(url.pathname);
    const isProfileRpc = url.pathname === "/rest/v1/rpc/current_profile" && method === "POST";
    if ((kind === "admin" && isAdminUserPath && ["GET", "POST", "PUT"].includes(method)) ||
        (kind !== "admin" && isUserAuthPath && ["GET", "POST"].includes(method)) ||
        (kind !== "admin" && isProfileRpc)) {
      const existingSignal = init.signal;
      const timeoutSignal = AbortSignal.timeout(20_000);
      const signal = existingSignal ? AbortSignal.any([existingSignal, timeoutSignal]) : timeoutSignal;
      return fetch(input, { ...init, signal });
    }
    if (kind === "admin" && adminAuthPaths.has(url.pathname)) {
      fail("An unsupported Admin Auth method was blocked before dispatch.");
    }
    fail("A non-allowlisted hosted Auth probe request was blocked before dispatch.");
  };
}

function clientOptions(kind) {
  return {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: { fetch: boundedFetch(kind) }
  };
}

function newSyntheticPersona(lane, runId) {
  return {
    lane,
    email: `geoai-auth-probe-${runId}-${lane.toLowerCase()}@example.invalid`,
    password: `Gx!${randomBytes(30).toString("base64url")}`,
    userId: null,
    profileId: null,
    client: null,
    accessToken: null,
    refreshToken: null,
    cleanup: {
      globalSignOut: false,
      refreshRejected: false,
      banned: false,
      passwordRejected: false,
      currentProfileDenied: false
    }
  };
}

function assertUuid(value, stage) {
  assert.match(String(value ?? ""), /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, stage);
}

async function createPersona(admin, persona) {
  const { data, error } = await admin.auth.admin.createUser({
    email: persona.email,
    password: persona.password,
    email_confirm: true,
    user_metadata: { full_name: `GeoAI synthetic hosted Auth probe ${persona.lane}` }
  });
  assertNoError(error, `create persona ${persona.lane}`);
  assertUuid(data?.user?.id, `persona ${persona.lane} must return one exact user id`);
  assert.equal(data.user.email?.toLowerCase(), persona.email);
  assert(data.user.email_confirmed_at, `persona ${persona.lane} must be confirmed without email delivery`);
  persona.userId = data.user.id;
}

async function authenticatePersona(createClient, config, persona) {
  persona.client = createClient(config.supabaseUrl, config.publishableKey, clientOptions("user"));
  const { data: signIn, error: signInError } = await persona.client.auth.signInWithPassword({
    email: persona.email,
    password: persona.password
  });
  assertNoError(signInError, `password sign-in ${persona.lane}`);
  assert.equal(signIn?.user?.id, persona.userId);
  assert(signIn?.session?.access_token && signIn?.session?.refresh_token, `persona ${persona.lane} must receive an in-memory session`);
  persona.accessToken = signIn.session.access_token;
  persona.refreshToken = signIn.session.refresh_token;

  const { data: claimsData, error: claimsError } = await persona.client.auth.getClaims(persona.accessToken);
  assertNoError(claimsError, `getClaims ${persona.lane}`);
  assert.equal(claimsData?.claims?.sub, persona.userId);
  assert.equal(claimsData?.claims?.role, "authenticated");
  assert.equal(claimsData?.claims?.is_anonymous, false);

  const { data: userData, error: userError } = await persona.client.auth.getUser(persona.accessToken);
  assertNoError(userError, `getUser ${persona.lane}`);
  assert.equal(userData?.user?.id, persona.userId);
  assert.equal(userData?.user?.email?.toLowerCase(), persona.email);

  const { data: profileRows, error: profileError } = await persona.client.schema("api").rpc("current_profile");
  assertNoError(profileError, `api.current_profile ${persona.lane}`);
  assert(Array.isArray(profileRows) && profileRows.length === 1, `persona ${persona.lane} must resolve exactly one profile`);
  const profile = profileRows[0];
  assertUuid(profile?.id, `persona ${persona.lane} must resolve one profile id`);
  assert.equal(profile.auth_user_id, persona.userId);
  assert.equal(profile.email?.toLowerCase(), persona.email);
  assert.equal(profile.status, "active");
  assert.equal(profile.identity_kind, "user");
  persona.profileId = profile.id;
}

async function verifyAnonymousDenial(createClient, config) {
  const anonymous = createClient(config.supabaseUrl, config.publishableKey, clientOptions("anon"));
  const { data, error } = await anonymous.schema("api").rpc("current_profile");
  assert(error, "anon api.current_profile must fail closed");
  assert(data === null || (Array.isArray(data) && data.length === 0), "anon api.current_profile must return no profile");
}

function runExistingPreviewHarness(config, personas) {
  if (config.previewSeam !== exactPreviewSeamOptIn) return "not_requested";
  const childEnvironment = {};
  for (const name of ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "NODE_OPTIONS", "PLAYWRIGHT_BROWSERS_PATH"]) {
    if (typeof process.env[name] === "string") childEnvironment[name] = process.env[name];
  }
  for (const name of previewSeamEnvironmentNames) childEnvironment[name] = process.env[name];
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
  const result = spawnSync(process.execPath, [resolve(repositoryRoot, "scripts/sprint10-real-password-auth-run.mjs")], {
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

async function retirePersona(createClient, admin, config, persona, cleanupFailures) {
  if (!persona.userId) return;
  if (persona.client && persona.refreshToken) {
    const { error } = await persona.client.auth.signOut({ scope: "global" });
    if (error) cleanupFailures.push({ userId: persona.userId, stage: "global_signout", error: safeError(error) });
    else persona.cleanup.globalSignOut = true;

    const refreshProbe = createClient(config.supabaseUrl, config.publishableKey, clientOptions("user"));
    const { data: refreshData, error: refreshError } = await refreshProbe.auth.refreshSession({
      refresh_token: persona.refreshToken
    });
    if (!refreshError || refreshData?.session) {
      if (refreshData?.session) await refreshProbe.auth.signOut({ scope: "global" });
      cleanupFailures.push({ userId: persona.userId, stage: "refresh_token_still_active", error: "unexpected_success" });
    } else {
      persona.cleanup.refreshRejected = true;
    }
  } else {
    cleanupFailures.push({ userId: persona.userId, stage: "global_signout", error: "session_unavailable" });
  }

  const { data: bannedData, error: banError } = await admin.auth.admin.updateUserById(persona.userId, {
    ban_duration: permanentBanDuration
  });
  if (banError) {
    cleanupFailures.push({ userId: persona.userId, stage: "admin_ban", error: safeError(banError) });
  } else {
    const bannedUntil = Date.parse(bannedData?.user?.banned_until ?? "");
    if (!Number.isFinite(bannedUntil) || bannedUntil <= Date.now()) {
      cleanupFailures.push({ userId: persona.userId, stage: "admin_ban_readback", error: "missing_future_banned_until" });
    } else {
      persona.cleanup.banned = true;
    }
  }

  const passwordProbe = createClient(config.supabaseUrl, config.publishableKey, clientOptions("user"));
  const { data: passwordData, error: passwordError } = await passwordProbe.auth.signInWithPassword({
    email: persona.email,
    password: persona.password
  });
  if (!passwordError || passwordData?.session) {
    if (passwordData?.session) await passwordProbe.auth.signOut({ scope: "global" });
    cleanupFailures.push({ userId: persona.userId, stage: "password_still_active", error: "unexpected_success" });
  } else {
    persona.cleanup.passwordRejected = true;
  }

  if (persona.accessToken) {
    const retiredProfileClient = createClient(config.supabaseUrl, config.publishableKey, {
      ...clientOptions("user"),
      global: {
        ...clientOptions("user").global,
        headers: { Authorization: `Bearer ${persona.accessToken}` }
      }
    });
    const { data: retiredRows, error: retiredError } = await retiredProfileClient.schema("api").rpc("current_profile");
    if (retiredError || (Array.isArray(retiredRows) && retiredRows.length === 0)) {
      persona.cleanup.currentProfileDenied = true;
    } else {
      cleanupFailures.push({ userId: persona.userId, stage: "retired_current_profile_visible", error: "unexpected_profile" });
    }
  }

  const { data: readback, error: readbackError } = await admin.auth.admin.getUserById(persona.userId);
  if (readbackError || readback?.user?.id !== persona.userId || !readback.user.banned_until) {
    cleanupFailures.push({ userId: persona.userId, stage: "retired_user_readback", error: safeError(readbackError) });
  }

  persona.password = null;
  persona.accessToken = null;
  persona.refreshToken = null;
  persona.client = null;
}

async function runHostedProbe() {
  const gitHead = readGitState();
  const config = validateRuntimeConfig(process.env, process.argv, gitHead);
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(config.supabaseUrl, config.adminSecretKey, clientOptions("admin"));
  const runId = randomUUID().replaceAll("-", "").slice(0, 18);
  const personas = [newSyntheticPersona("A", runId), newSyntheticPersona("B", runId)];
  const cleanupFailures = [];
  let executionError = null;
  let previewHarness = "not_requested";

  try {
    for (const persona of personas) await createPersona(admin, persona);
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
      try {
        await retirePersona(createClient, admin, config, persona, cleanupFailures);
      } catch (error) {
        cleanupFailures.push({ userId: persona.userId ?? "unknown", stage: "retirement_exception", error: safeError(error) });
      }
    }
  }

  if (cleanupFailures.length > 0) {
    console.error(JSON.stringify({
      status: "FAIL_ACTION_REQUIRED",
      projectRef: exactProjectRef,
      cleanupFailures
    }));
    fail("Terminal credential retirement was not proven for every created synthetic user.");
  }
  if (executionError) throw executionError;

  console.log(JSON.stringify({
    schemaVersion: "geoai.sprint10.hosted-auth-probe-receipt.v1",
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
      passwordLogin: 2,
      getClaims: 2,
      getUser: 2,
      currentProfile: 2,
      isolatedProfiles: true,
      anonymousCurrentProfileDenied: true,
      previewHarness
    },
    retirement: {
      globalSignOut: 2,
      refreshTokenRejected: 2,
      permanentAdminBan: 2,
      passwordLoginRejected: 2,
      currentProfileDenied: 2,
      authUsersHardDeleted: 0,
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
