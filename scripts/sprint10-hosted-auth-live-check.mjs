#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertActiveCurrentPersona,
  buildLiveJourneyChildEnvironment,
  parseLiveJourneyChildReceipt,
  runHostedProbe,
  runReviewedLiveJourney,
  sanitizedCleanupFailures,
  validateRuntimeConfig,
  writeActivePersonaCheckpoint
} from "./sprint10-hosted-auth-probe.mjs";

const exactLedgerId = "5aa405b3-bbda-48aa-aeea-ca3357be4042";
const exactCycleId = "GEOAI_FOUR_SPRINTS_2026_09_18";
const head = "a".repeat(40);
const previewUrl = "https://geoai-auth-live-seam-geoaidev.vercel.app";
const previewHost = new URL(previewUrl).hostname;
const userA = "11111111-1111-4111-8111-111111111111";
const profileA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userB = "22222222-2222-4222-8222-222222222222";
const profileB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const runId = "0123456789abcdef01";
const privateRoot = realpathSync(mkdtempSync(join(tmpdir(), "geoai-auth-live-offline-")));
chmodSync(privateRoot, 0o700);
const ledgerPath = join(privateRoot, "cycle-ledger.json");
const checkpointPath = join(privateRoot, "active-personas.json");

const ledger = {
  schemaVersion: 1,
  cycleId: exactCycleId,
  ledgerId: exactLedgerId,
  createdAt: "2026-09-18T00:00:00.000Z",
  ceilingUsd: 15,
  generation: 0,
  receipts: [],
  estimatedOrReservedUsd: 0
};
writeFileSync(ledgerPath, `${JSON.stringify(ledger)}\n`, { mode: 0o600 });
chmodSync(ledgerPath, 0o600);

const publishable = ["sb", "publishable", "offline"].join("_") + "x".repeat(32);
const adminSecret = ["sb", "secret", "offline"].join("_") + "y".repeat(32);
const baseEnvironment = {
  PATH: "/usr/bin:/bin",
  HOME: "/tmp/offline-home",
  LANG: "C",
  NODE_OPTIONS: "--offline-sentinel",
  UNRELATED_RUNTIME_SECRET: "unrelated-sentinel",
  GEOAI_HOSTED_AUTH_PROBE_EXPLICIT_RUN: "create-two-synthetic-password-personas",
  GEOAI_HOSTED_AUTH_PROBE_PROJECT_REF: "pphdqkurxneyagvnnjdt",
  GEOAI_HOSTED_AUTH_PROBE_SUPABASE_URL: "https://pphdqkurxneyagvnnjdt.supabase.co",
  GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY: publishable,
  GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY: adminSecret,
  GEOAI_HOSTED_AUTH_PROBE_EXPECTED_COMMIT_SHA: head,
  GEOAI_HOSTED_AUTH_PROBE_RUN_APPROVAL: `hosted-auth-probe:pphdqkurxneyagvnnjdt:${head}`,
  GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM: "run-existing-real-password-preview-harness",
  GEOAI_E2E_BASE_URL: previewUrl,
  GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL: previewUrl,
  GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET: "offline-preview-bypass-value",
  GEOAI_REAL_PASSWORD_AUTH_DEPLOYMENT_RECEIPT_PATH: join(privateRoot, "deployment-receipt.json"),
  GEOAI_REAL_PASSWORD_AUTH_RUN_APPROVAL: "offline-existing-auth-approval",
  GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SEAM: "run-reviewed-sprint10-live-journey-before-retirement",
  GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SCOPE: "journey",
  GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_ROOT: privateRoot,
  GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_PATH: ledgerPath,
  GEOAI_HOSTED_AUTH_PROBE_LIVE_EXPECTED_LEDGER_ID: exactLedgerId,
  GEOAI_HOSTED_AUTH_PROBE_LIVE_RUN_APPROVAL: `paid-live-journey:${exactLedgerId}:${previewHost}:${head}:journey`,
  GEOAI_HOSTED_AUTH_PROBE_ACTIVE_PERSONA_RECEIPT_PATH: checkpointPath
};

let earlyLedgerValidations = 0;
const actualValidatedConfig = validateRuntimeConfig(baseEnvironment, ["node", "operator"], head, 22);
assert.equal(actualValidatedConfig.liveJourney.ledgerId, exactLedgerId,
  "the combined seam must use the live runner's real exported read-only ledger validator");
const config = validateRuntimeConfig(baseEnvironment, ["node", "operator"], head, 22, {
  ledgerPreflight(root, path, scope) {
    earlyLedgerValidations += 1;
    assert.equal(root, privateRoot);
    assert.equal(path, ledgerPath);
    assert.equal(scope, "journey");
    return ledger;
  }
});
assert.equal(earlyLedgerValidations, 1, "live opt-in must validate the existing ledger before account creation");
assert.equal(config.liveJourney.scope, "journey");
assert.equal(config.liveJourney.checkpointPath, checkpointPath);

const authOnlyConfig = validateRuntimeConfig({
  ...baseEnvironment,
  GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM: "disabled",
  GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SEAM: "disabled"
}, ["node", "operator"], head, 22, {
  ledgerPreflight() { throw new Error("Auth-only mode must not inspect the live ledger"); }
});
assert.equal(authOnlyConfig.liveJourney, null);

for (const [name, delta] of [
  ["partial opt-in", { GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SEAM: "yes" }],
  ["missing Preview Auth seam", { GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM: "disabled" }],
  ["wrong scope", { GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SCOPE: "all" }],
  ["wrong ledger id", { GEOAI_HOSTED_AUTH_PROBE_LIVE_EXPECTED_LEDGER_ID: "00000000-0000-4000-8000-000000000000" }],
  ["wrong approval", { GEOAI_HOSTED_AUTH_PROBE_LIVE_RUN_APPROVAL: "approved" }],
  ["Production Preview", {
    GEOAI_E2E_BASE_URL: "https://geoai-mvp.vercel.app",
    GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL: "https://geoai-mvp.vercel.app"
  }]
]) {
  assert.throws(() => validateRuntimeConfig({ ...baseEnvironment, ...delta }, ["node", "operator"], head, 22, {
    ledgerPreflight: () => ledger
  }), undefined, `${name} must fail before any account creation`);
}

const personas = [
  {
    lane: "A", runId, email: "offline-a@example.invalid", password: "offline-a-password",
    userId: userA, profileId: profileA, createOutcomeUnknown: false, provisioningState: "active",
    sessions: [
      { accessToken: "a-access-1", refreshToken: "a-refresh-1" },
      { accessToken: "a-access-2", refreshToken: "a-refresh-2" }
    ],
    cleanup: {
      serverGlobalRevokeConfirmed: false, refreshTokensRejected: 0, banned: false,
      passwordRejected: false, currentProfileEmpty: false, finalBanReadback: false
    }
  },
  {
    lane: "B", runId, email: "offline-b@example.invalid", password: "offline-b-password",
    userId: userB, profileId: profileB, createOutcomeUnknown: false, provisioningState: "active",
    sessions: [
      { accessToken: "b-access-1", refreshToken: "b-refresh-1" },
      { accessToken: "b-access-2", refreshToken: "b-refresh-2" }
    ],
    cleanup: {
      serverGlobalRevokeConfirmed: false, refreshTokensRejected: 0, banned: false,
      passwordRejected: false, currentProfileEmpty: false, finalBanReadback: false
    }
  }
];

assert.doesNotThrow(() => assertActiveCurrentPersona(personas, runId, { invoked: false }));
assert.throws(() => assertActiveCurrentPersona(personas, "f".repeat(18), { invoked: false }));
assert.throws(() => assertActiveCurrentPersona(personas, runId, { invoked: true }));
assert.throws(() => assertActiveCurrentPersona([
  { ...personas[0], cleanup: { ...personas[0].cleanup, banned: true } },
  personas[1]
], runId, { invoked: false }));

const childEnvironment = buildLiveJourneyChildEnvironment(config, personas, baseEnvironment);
for (const key of [
  "GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY",
  "GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY",
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SEAM",
  "NODE_OPTIONS",
  "UNRELATED_RUNTIME_SECRET"
]) assert.equal(childEnvironment[key], undefined, `${key} must not reach the live child`);
assert.equal(childEnvironment.GEOAI_SPRINT10_LIVE_EMAIL, personas[0].email);
assert.equal(childEnvironment.GEOAI_SPRINT10_LIVE_PASSWORD, personas[0].password);
assert.equal(childEnvironment.GEOAI_SPRINT10_LIVE_USER_ID, userA);
assert(!Object.values(childEnvironment).includes(personas[1].email));
assert(!Object.values(childEnvironment).includes(personas[1].password));
assert(!Object.values(childEnvironment).includes(userB));
assert(!Object.values(childEnvironment).includes("a-access-1"));
assert(!Object.values(childEnvironment).includes("b-refresh-2"));

const paidReceipts = [
  { id: 1, route: "ai", depth: "standard", state: "settled", estimatedUsd: 1.2 },
  { id: 2, route: "create", depth: "standard", state: "settled", estimatedUsd: 0.3 }
];
const childTuple = { scope: "journey", previewHost, commit: head };
const childResult = (status, value) => ({ status, signal: null, error: null, stdout: JSON.stringify(value), stderr: "suppressed" });
const passValue = { status: "PASS", ...childTuple, browserLocalPersistenceOnly: true, receipts: paidReceipts };
const inconclusiveValue = { status: "INCONCLUSIVE", ...childTuple, reason: "Find returned one candidate.", receipts: paidReceipts };
const cleanupValue = { status: "FAIL_CLEANUP", ...childTuple, stage: "logout", receipts: paidReceipts };

assert.equal(parseLiveJourneyChildReceipt(childResult(0, passValue), childTuple).status, "PASS");
assert.equal(parseLiveJourneyChildReceipt(childResult(2, inconclusiveValue), childTuple).status, "INCONCLUSIVE");
assert.equal(parseLiveJourneyChildReceipt(childResult(1, cleanupValue), childTuple).status, "FAIL_CLEANUP");
assert.throws(() => parseLiveJourneyChildReceipt(childResult(0, { ...passValue, extra: true }), childTuple));
assert.throws(() => parseLiveJourneyChildReceipt(childResult(0, { ...passValue, receipts: [] }), childTuple));
assert.throws(() => parseLiveJourneyChildReceipt(childResult(2, { ...inconclusiveValue, reason: "bad\nreason" }), childTuple));
for (const receipts of [
  [{ ...paidReceipts[0], depth: "quick" }, paidReceipts[1]],
  [{ ...paidReceipts[0], estimatedUsd: 1.20000001 }, paidReceipts[1]],
  [paidReceipts[0], { ...paidReceipts[1], estimatedUsd: 0.30000001 }],
  [{ ...paidReceipts[0], state: "reserved" }, paidReceipts[1]],
  [{ ...paidReceipts[0], state: "unknown" }, paidReceipts[1]],
  [paidReceipts[0], { ...paidReceipts[1], id: 1 }],
  [{ ...paidReceipts[0], route: "create" }, paidReceipts[1]],
  [paidReceipts[0]],
  [...paidReceipts, { id: 3, route: "create", depth: "standard", state: "settled", estimatedUsd: 0.01 }]
]) {
  assert.throws(() => parseLiveJourneyChildReceipt(childResult(0, { ...passValue, receipts }), childTuple));
  assert.throws(() => parseLiveJourneyChildReceipt(childResult(2, { ...inconclusiveValue, receipts }), childTuple));
}
assert.equal(parseLiveJourneyChildReceipt(childResult(1, { ...cleanupValue, receipts: [] }), childTuple).receipts.length, 0);
assert.equal(parseLiveJourneyChildReceipt(childResult(1, { ...cleanupValue, receipts: [paidReceipts[0]] }), childTuple).receipts.length, 1);
assert.throws(() => parseLiveJourneyChildReceipt(childResult(1, {
  ...cleanupValue,
  receipts: [paidReceipts[1]]
}), childTuple), undefined, "cleanup receipts must be an ordered settled prefix");
assert.throws(() => parseLiveJourneyChildReceipt(childResult(2, cleanupValue), childTuple));
for (const [scope, receipts] of [
  ["dubai-analyse", [paidReceipts[0]]],
  ["dubai-find", []],
  ["singapore-create", [paidReceipts[1]]]
]) {
  const tuple = { scope, previewHost, commit: head };
  assert.equal(parseLiveJourneyChildReceipt(childResult(0, {
    status: "PASS",
    ...tuple,
    browserLocalPersistenceOnly: true,
    receipts
  }), tuple).status, "PASS");
}

let passSpawns = 0;
let passSpawnOptions;
const invocationState = { invoked: false };
const pass = runReviewedLiveJourney(config, personas, runId, {
  env: baseEnvironment,
  invocationState,
  spawn: (_command, _args, options) => {
    passSpawns += 1;
    passSpawnOptions = options;
    return childResult(0, passValue);
  }
});
assert.equal(pass.status, "PASS");
assert.equal(passSpawns, 1);
assert.equal(passSpawnOptions.timeout, 810_000);
assert.equal(passSpawnOptions.killSignal, "SIGTERM");
assert.equal(passSpawnOptions.env.NODE_OPTIONS, undefined);
assert.throws(() => runReviewedLiveJourney(config, personas, runId, {
  env: baseEnvironment,
  invocationState,
  spawn: () => { throw new Error("must not spawn twice"); }
}), undefined, "one probe run may invoke the live child only once");

const inconclusive = runReviewedLiveJourney(config, personas, runId, {
  env: baseEnvironment,
  invocationState: { invoked: false },
  spawn: () => childResult(2, inconclusiveValue)
});
assert.equal(inconclusive.status, "INCONCLUSIVE");
assert.equal(inconclusive.reason, "Find returned one candidate.");

const cleanupFailure = runReviewedLiveJourney(config, personas, runId, {
  env: baseEnvironment,
  invocationState: { invoked: false },
  spawn: () => childResult(1, cleanupValue)
});
assert.deepEqual(cleanupFailure, parseLiveJourneyChildReceipt(childResult(1, cleanupValue), childTuple));

const timeout = runReviewedLiveJourney(config, personas, runId, {
  env: baseEnvironment,
  invocationState: { invoked: false },
  spawn: () => ({ status: null, signal: "SIGTERM", error: { code: "ETIMEDOUT" }, stdout: "secret", stderr: "secret" })
});
assert.deepEqual(timeout, { status: "FAIL", stage: "live_child_timeout" });

const invalidReceipt = runReviewedLiveJourney(config, personas, runId, {
  env: baseEnvironment,
  invocationState: { invoked: false },
  spawn: () => ({ status: 0, signal: null, error: null, stdout: "not-json", stderr: "secret" })
});
assert.deepEqual(invalidReceipt, { status: "FAIL", stage: "live_child_invalid_receipt" });

const activeCheckpoint = writeActivePersonaCheckpoint(checkpointPath, {
  state: "active", runId, projectRef: "pphdqkurxneyagvnnjdt", gitHead: head,
  personas: [{ lane: "A", state: "active", userId: userA }, { lane: "B", state: "active", userId: userB }]
});
assert.equal(activeCheckpoint.state, "active");
assert.equal(lstatSync(checkpointPath).mode & 0o077, 0);
const checkpointText = readFileSync(checkpointPath, "utf8");
const checkpointJson = JSON.parse(checkpointText);
assert.deepEqual(Object.keys(checkpointJson).sort(), ["gitHead", "personas", "projectRef", "runId", "schemaVersion", "state"].sort());
for (const forbidden of [personas[0].email, personas[0].password, personas[1].email, adminSecret, publishable, "accessToken", "refreshToken"]) {
  assert(!checkpointText.includes(forbidden), "checkpoint must contain no email, password, key or token material");
}
const retiredCheckpoint = writeActivePersonaCheckpoint(checkpointPath, {
  state: "retired", runId, projectRef: "pphdqkurxneyagvnnjdt", gitHead: head,
  personas: [{ lane: "A", state: "retired", userId: userA }, { lane: "B", state: "retired", userId: userB }]
}, { replace: true });
assert.equal(retiredCheckpoint.state, "retired");
assert.equal(JSON.parse(readFileSync(checkpointPath, "utf8")).state, "retired");

const failedCheckpointPath = join(privateRoot, "cleanup-failed-personas.json");
writeActivePersonaCheckpoint(failedCheckpointPath, {
  state: "provisioning", runId, projectRef: "pphdqkurxneyagvnnjdt", gitHead: head,
  personas: [{ lane: "A", state: "uuid_known", userId: userA }, { lane: "B", state: "create_dispatched", userId: null }]
});
const failedCheckpoint = writeActivePersonaCheckpoint(failedCheckpointPath, {
  state: "retirement_failed", runId, projectRef: "pphdqkurxneyagvnnjdt", gitHead: head,
  personas: [{ lane: "A", state: "retired", userId: userA }, { lane: "B", state: "retirement_failed", userId: null }]
}, { replace: true });
assert.equal(failedCheckpoint.state, "retirement_failed");
assert.equal(JSON.parse(readFileSync(failedCheckpointPath, "utf8")).state, "retirement_failed");
const sanitizedFailures = sanitizedCleanupFailures([{
  userId: userA,
  stage: "logout_session",
  error: "auth/logout_failed",
  syntheticIdentity: personas[0].email,
  password: personas[0].password
}]);
assert.deepEqual(sanitizedFailures, [{
  userId: userA,
  stage: "logout_session",
  error: "auth/logout_failed"
}]);

const retirementStages = [
  "server_global_revoke",
  "primary_refresh_rejected",
  "secondary_refresh_rejected",
  "admin_ban",
  "password_rejected_after_ban",
  "stale_jwt_current_profile_empty",
  "retired_user_readback"
];
const lifecycleFaults = [
  "checkpoint_initialized",
  "A_create_dispatched",
  "A_uuid_known",
  "B_create_dispatched",
  "B_uuid_known",
  "A_authenticated",
  "B_authenticated",
  "checkpoint_active",
  "preview_child_complete",
  "live_child_complete",
  "A_retirement_unexpected_throw",
  ...retirementStages.flatMap((stage) => [`A_retirement_${stage}`, `B_retirement_${stage}`])
];

async function runLifecycleFixture(faultAt = null, liveStatus = "PASS") {
  const suffix = String(faultAt ?? liveStatus).replaceAll(/[^A-Za-z0-9_-]/g, "_");
  const path = join(privateRoot, `lifecycle-${suffix}.json`);
  const fixtureConfig = {
    ...config,
    liveJourney: { ...config.liveJourney, checkpointPath: path }
  };
  const counters = { creates: 0, preview: 0, live: 0, retire: 0 };
  const createByLane = { A: 0, B: 0 };
  const receipts = [];
  const exits = [];
  let faultSnapshot = null;
  const ids = { A: userA, B: userB };
  const profiles = { A: profileA, B: profileB };
  const operations = {
    onEvent(event) {
      if (event === faultAt && !event.includes("_retirement_")) {
        faultSnapshot = JSON.parse(readFileSync(path, "utf8"));
        throw new Error(`offline_fault_${event}`);
      }
    },
    async createPersona(_admin, _config, _fetch, persona, { onUuidKnown }) {
      counters.creates += 1;
      createByLane[persona.lane] += 1;
      persona.createAttempted = true;
      persona.createOutcomeUnknown = false;
      persona.userId = ids[persona.lane];
      onUuidKnown(persona);
    },
    async authenticatePersona(_createClient, _config, persona) {
      persona.auth = {
        primaryPasswordLogin: true,
        getClaims: true,
        getUser: true,
        currentProfile: true,
        secondaryPasswordLogin: true
      };
      persona.profileId = profiles[persona.lane];
      persona.sessions = [
        { accessToken: `${persona.lane}-access-1`, refreshToken: `${persona.lane}-refresh-1` },
        { accessToken: `${persona.lane}-access-2`, refreshToken: `${persona.lane}-refresh-2` }
      ];
    },
    async verifyAnonymousDenial() {},
    runExistingPreviewHarness() {
      counters.preview += 1;
      return "passed_existing_reviewed_runner";
    },
    runReviewedLiveJourney() {
      counters.live += 1;
      return liveStatus === "INCONCLUSIVE"
        ? { status: "INCONCLUSIVE", scope: "journey", previewHost, commit: head, receipts: paidReceipts,
            reason: "Find returned one candidate." }
        : { status: "PASS", scope: "journey", previewHost, commit: head, receipts: paidReceipts,
            browserLocalPersistenceOnly: true };
    },
    async retirePersona(_createClient, _admin, _fetch, _config, persona, { onStage }) {
      counters.retire += 1;
      if (faultAt === `${persona.lane}_retirement_unexpected_throw`) {
        faultSnapshot = JSON.parse(readFileSync(path, "utf8"));
        throw new Error("offline_unexpected_retirement_throw");
      }
      const failures = [];
      if (!persona.userId) {
        persona.credentialsCleared = true;
        if (persona.createAttempted && !persona.createAbsenceProven) {
          failures.push({ userId: "unknown", stage: "unknown_create_outcome", error: "offline/unknown" });
        }
        return failures;
      }
      for (const stage of retirementStages) {
        const event = `${persona.lane}_retirement_${stage}`;
        if (event === faultAt) {
          faultSnapshot = JSON.parse(readFileSync(path, "utf8"));
          failures.push({ userId: persona.userId, stage, error: "offline/fault" });
        } else if (stage === "server_global_revoke") persona.cleanup.serverGlobalRevokeConfirmed = true;
        else if (stage.includes("refresh_rejected")) persona.cleanup.refreshTokensRejected += 1;
        else if (stage === "admin_ban") persona.cleanup.banned = true;
        else if (stage === "password_rejected_after_ban") persona.cleanup.passwordRejected = true;
        else if (stage === "stale_jwt_current_profile_empty") persona.cleanup.currentProfileEmpty = true;
        else if (stage === "retired_user_readback") persona.cleanup.finalBanReadback = true;
        onStage(stage);
      }
      persona.sessions = [];
      persona.password = null;
      persona.credentialsCleared = true;
      return failures;
    }
  };
  await runHostedProbe({
    config: fixtureConfig,
    gitHead: head,
    runId,
    createClient: () => ({}),
    operations,
    emitReceipt: (receipt) => receipts.push(receipt),
    setExitCode: (code) => exits.push(code)
  });
  assert.equal(receipts.length, 1);
  assert.equal(exits.length, 1);
  assert(counters.creates <= 2, "a lifecycle failure must never replay synthetic creation");
  assert(createByLane.A <= 1 && createByLane.B <= 1,
    "each synthetic lane may dispatch create at most once");
  const finalCheckpoint = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
  if (faultAt) {
    assert(faultSnapshot, `${faultAt} must leave an inspectable pre-fault checkpoint`);
    assert.equal(faultSnapshot.runId, runId);
    assert.deepEqual(faultSnapshot.personas.map((persona) => persona.lane), ["A", "B"]);
    assert(!JSON.stringify(faultSnapshot).includes("@example.invalid"));
    assert.equal(receipts[0].status, faultAt.includes("_retirement_") || faultAt.endsWith("_create_dispatched")
      ? "FAIL_ACTION_REQUIRED" : "FAIL");
    assert.equal(receipts[0].observed.createDispatched,
      receipts[0].personas.filter((persona) => persona.createAttempted).length);
  }
  return { counters, createByLane, receipt: receipts[0], exit: exits[0], faultSnapshot, finalCheckpoint };
}

const integratedPass = await runLifecycleFixture();
assert.equal(integratedPass.receipt.status, "PASS");
assert.equal(integratedPass.exit, 0);
assert.deepEqual(integratedPass.counters, { creates: 2, preview: 1, live: 1, retire: 2 });
assert.equal(integratedPass.finalCheckpoint.state, "retired");
assert.equal(integratedPass.receipt.checks.adminCreateUserWithoutEmailDelivery, 2);
assert.equal(integratedPass.receipt.retirement.finalFutureBanReadback, 2);
const integratedInconclusive = await runLifecycleFixture(null, "INCONCLUSIVE");
assert.equal(integratedInconclusive.receipt.status, "INCONCLUSIVE");
assert.equal(integratedInconclusive.exit, 2);
for (const faultAt of lifecycleFaults) {
  const outcome = await runLifecycleFixture(faultAt);
  assert.equal(outcome.exit, 1);
  assert.equal(Object.hasOwn(outcome.receipt, "checks"), false,
    "failure receipts must not contain intended happy-path Auth counts");
  assert.equal(Object.hasOwn(outcome.receipt, "retirement"), false,
    "failure receipts must not contain aggregate retirement claims");
  if (faultAt.includes("_retirement_")) assert.equal(outcome.finalCheckpoint.state, "retirement_failed");
  if (faultAt === "checkpoint_initialized") {
    assert.equal(outcome.receipt.observed.createDispatched, 0);
    assert.equal(outcome.receipt.observed.uuidsKnown, 0);
  }
  if (faultAt === "A_create_dispatched") {
    assert.deepEqual(outcome.faultSnapshot.personas[0], { lane: "A", state: "create_dispatched", userId: null });
  }
  if (faultAt === "A_uuid_known") {
    assert.deepEqual(outcome.faultSnapshot.personas[0], { lane: "A", state: "uuid_known", userId: userA });
  }
  if (faultAt === "B_uuid_known") {
    assert.deepEqual(outcome.faultSnapshot.personas[1], { lane: "B", state: "uuid_known", userId: userB });
  }
}

const operator = readFileSync(new URL("./sprint10-hosted-auth-probe.mjs", import.meta.url), "utf8");
const handoff = readFileSync(new URL("../docs/sprint10/HOSTED_AUTH_PROBE_HANDOFF.md", import.meta.url), "utf8");
const ownedSources = [
  operator,
  handoff,
  readFileSync(new URL("./sprint10-hosted-auth-probe-check.mjs", import.meta.url), "utf8"),
  readFileSync(new URL("./sprint10-hosted-auth-live-check.mjs", import.meta.url), "utf8"),
  readFileSync(new URL("./sprint10-live-journey-run.mjs", import.meta.url), "utf8"),
  readFileSync(new URL("./sprint10-live-journey-runner-offline-check.mjs", import.meta.url), "utf8")
];
for (const source of ownedSources) {
  assert.doesNotMatch(source, /\beyJ[A-Za-z0-9_-]{20,}[.][A-Za-z0-9_-]{8,}[.][A-Za-z0-9_-]{8,}/,
    "owned files must not contain a JWT-shaped value");
  assert.doesNotMatch(source, /\bsk-(?!test(?:ing)?[-_])[A-Za-z0-9_-]{20,}/,
    "owned files must not contain a provider-key-shaped value");
  assert.doesNotMatch(source, /\bsb_(?:secret|publishable)_(?!test_)[A-Za-z0-9_-]{16,}/,
    "owned files must not contain a Supabase-key-shaped value");
}
assert.match(operator, /schemaVersion: "geoai[.]sprint10[.]hosted-auth-probe-receipt[.]v2"/,
  "the Auth-only v2 receipt must remain available unchanged");
for (const name of [
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SEAM",
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SCOPE",
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_ROOT",
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_PATH",
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_EXPECTED_LEDGER_ID",
  "GEOAI_HOSTED_AUTH_PROBE_LIVE_RUN_APPROVAL",
  "GEOAI_HOSTED_AUTH_PROBE_ACTIVE_PERSONA_RECEIPT_PATH"
]) {
  assert.match(operator, new RegExp(`\\b${name}\\b`));
  assert.match(handoff, new RegExp(`\\b${name}\\b`));
}
assert.match(handoff, /browser-local save\/reopen/i);
assert.match(handoff, /No hosted call was executed during implementation/i);

rmSync(privateRoot, { recursive: true, force: true });

console.log(JSON.stringify({
  status: "PASS",
  cases: {
    authOnlyNoLiveLedgerRead: 1,
    earlyLiveLedgerRead: earlyLedgerValidations,
    livePreflightDenials: 6,
    activePersonaGuards: 4,
    childEnvironmentSecretExclusions: 10,
    childReceiptStates: 3,
    strictReceiptDenials: 23,
    exactScopeReceiptMatrices: 4,
    singleChildSpawn: passSpawns,
    timeoutFailClosed: 1,
    invalidReceiptFailClosed: 1,
    atomicCheckpointTransitions: 4,
    cleanupFailureSanitization: 1,
    ownedFileSecretPatternScan: ownedSources.length,
    integratedLifecycleSuccessStates: 2,
    integratedLifecycleFaults: lifecycleFaults.length
  }
}));
