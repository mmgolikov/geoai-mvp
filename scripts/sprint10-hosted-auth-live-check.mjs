#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  chmodSync,
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
  estimatedOrReservedUsd: 0,
  notes: []
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
  ledgerValidator(root, path) {
    earlyLedgerValidations += 1;
    assert.equal(root, privateRoot);
    assert.equal(path, ledgerPath);
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
  ledgerValidator() { throw new Error("Auth-only mode must not inspect the live ledger"); }
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
    ledgerValidator: () => ledger
  }), undefined, `${name} must fail before any account creation`);
}

const personas = [
  {
    lane: "A", runId, email: "offline-a@example.invalid", password: "offline-a-password",
    userId: userA, profileId: profileA, createOutcomeUnknown: false,
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
    userId: userB, profileId: profileB, createOutcomeUnknown: false,
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
  { id: 1, route: "ai", depth: "standard", state: "settled", estimatedUsd: 1.25 },
  { id: 2, route: "create", depth: "quick", state: "settled", estimatedUsd: 2.5 }
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
  personas: [{ lane: "A", userId: userA }, { lane: "B", userId: userB }]
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
  personas: [{ lane: "A", userId: userA }, { lane: "B", userId: userB }]
}, { replace: true });
assert.equal(retiredCheckpoint.state, "retired");
assert.equal(JSON.parse(readFileSync(checkpointPath, "utf8")).state, "retired");

const failedCheckpointPath = join(privateRoot, "cleanup-failed-personas.json");
writeActivePersonaCheckpoint(failedCheckpointPath, {
  state: "active", runId, projectRef: "pphdqkurxneyagvnnjdt", gitHead: head,
  personas: [{ lane: "A", userId: userA }, { lane: "B", userId: userB }]
});
const failedCheckpoint = writeActivePersonaCheckpoint(failedCheckpointPath, {
  state: "retirement_failed", runId, projectRef: "pphdqkurxneyagvnnjdt", gitHead: head,
  personas: [{ lane: "A", userId: userA }, { lane: "B", userId: userB }]
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

const operator = readFileSync(new URL("./sprint10-hosted-auth-probe.mjs", import.meta.url), "utf8");
const handoff = readFileSync(new URL("../docs/sprint10/HOSTED_AUTH_PROBE_HANDOFF.md", import.meta.url), "utf8");
const ownedSources = [
  operator,
  handoff,
  readFileSync(new URL("./sprint10-hosted-auth-probe-check.mjs", import.meta.url), "utf8"),
  readFileSync(new URL("./sprint10-hosted-auth-live-check.mjs", import.meta.url), "utf8")
];
for (const source of ownedSources) {
  assert.doesNotMatch(source, /\beyJ[A-Za-z0-9_-]{20,}[.][A-Za-z0-9_-]{8,}[.][A-Za-z0-9_-]{8,}/,
    "owned files must not contain a JWT-shaped value");
  assert.doesNotMatch(source, /\bsk-(?!test(?:ing)?[-_])[A-Za-z0-9_-]{20,}/,
    "owned files must not contain a provider-key-shaped value");
  assert.doesNotMatch(source, /\bsb_(?:secret|publishable)_(?!test_)[A-Za-z0-9_-]{16,}/,
    "owned files must not contain a Supabase-key-shaped value");
}
const activeCheckpointWrite = operator.indexOf("state: \"active\"");
const previewHarnessCall = operator.indexOf("previewHarness = runExistingPreviewHarness", activeCheckpointWrite);
const liveCall = operator.indexOf("liveJourney = runReviewedLiveJourney");
const retirementFinally = operator.indexOf("} finally {", liveCall);
const retirementCall = operator.indexOf("retirePersona(createClient", retirementFinally);
assert(activeCheckpointWrite > 0 && previewHarnessCall > activeCheckpointWrite && liveCall > previewHarnessCall,
  "the private active-persona checkpoint must precede both browser children");
assert(liveCall > 0 && retirementFinally > liveCall && retirementCall > retirementFinally,
  "the live child must remain inside the try governed by unconditional persona retirement");
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
    strictReceiptDenials: 3,
    singleChildSpawn: passSpawns,
    timeoutFailClosed: 1,
    invalidReceiptFailClosed: 1,
    atomicCheckpointTransitions: 4,
    cleanupFailureSanitization: 1,
    ownedFileSecretPatternScan: ownedSources.length,
    unconditionalRetirementSourceOrder: 1
  }
}));
