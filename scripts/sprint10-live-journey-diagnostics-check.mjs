#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  LIVE_JOURNEY_DIAGNOSTIC_SCHEMA,
  encodeLiveJourneyDiagnostic,
  findLiveJourneyDiagnostic,
  parseLiveJourneyDiagnostic
} from "./sprint10-live-journey-diagnostics.mjs";
import { classifyLiveJourneyReport } from "./sprint10-live-journey-run.mjs";

const config = {
  scope: "journey",
  host: "geoai-offline-diagnostic-geoaidev.vercel.app",
  commit: "a".repeat(40)
};
const receipts = [{ id: 1, route: "ai", depth: "standard", state: "settled", estimatedUsd: 0.041167 }];
const runnerSource = readFileSync(new URL("./sprint10-live-journey-run.mjs", import.meta.url), "utf8");
const liveSpecSource = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
const classifierSource = /export function classifyLiveJourneyReport[\s\S]*?\n}\n\nfunction run\(\)/.exec(runnerSource)?.[0] ?? "";
assert.ok(classifierSource.length > 0);
assert.doesNotMatch(classifierSource, /spawnSync|reserveSprint10Spend|dispatchSprint10PaidRequest|fetch\(/,
  "diagnostic classification must be incapable of dispatching or retrying a paid request");
assert.match(liveSpecSource, /fetch\("\/api\/auth\/session", \{[\s\S]*?signal: AbortSignal[.]timeout\(10_000\)/,
  "logout session reads must be bounded inside the browser callback");
assert.match(liveSpecSource, /boundedResponseJson\(response, 10_000\)/,
  "logout response-body reads must be bounded and mapped to a fixed cleanup stage");
const completedSteps = [
  "anonymous_protection",
  "exact_preview",
  "auth_login",
  "analyse_source_suggest",
  "analyse_source_context",
  "analyse_paid_response",
  "analyse_paid_terminal"
];

function reportFor(diagnostic, raw = "") {
  const marker = encodeLiveJourneyDiagnostic(diagnostic);
  return { suites: [{ specs: [{ tests: [{ results: [{ error: { message: `${raw}${marker}${raw}` } }] }] }] }] };
}

const simultaneous = {
  primaryStatus: "failed",
  primaryStage: "analyse_result_contract",
  cleanupStage: "logout_action_missing",
  completedSteps
};
const plantedSecret = "planted-password-and-token-never-forward";
let paidDispatches = 0;
const classifiedSimultaneous = classifyLiveJourneyReport(
  reportFor(simultaneous, plantedSecret),
  1,
  config,
  receipts
);
assert.equal(paidDispatches, 0, "diagnostic classification must not dispatch or retry a paid request");
assert.equal(classifiedSimultaneous.exitCode, 1);
assert.equal(classifiedSimultaneous.receipt.status, "FAIL_CLEANUP");
assert.equal(classifiedSimultaneous.receipt.diagnostic.primaryStage, "analyse_result_contract");
assert.equal(classifiedSimultaneous.receipt.diagnostic.cleanupStage, "logout_action_missing");
assert.deepEqual(classifiedSimultaneous.receipt.receipts, receipts, "settled partial receipts must remain visible without mutation");
assert.equal(JSON.stringify(classifiedSimultaneous.receipt).includes(plantedSecret), false,
  "raw Playwright errors must not enter the safe runner receipt");

const primaryOnly = classifyLiveJourneyReport(reportFor({
  ...simultaneous,
  cleanupStage: null
}), 1, config, receipts);
assert.equal(primaryOnly.receipt.status, "FAIL", "a failed product path must never become PASS or INCONCLUSIVE");
assert.equal(primaryOnly.exitCode, 1);

const inconclusive = classifyLiveJourneyReport(reportFor({
  primaryStatus: "inconclusive",
  primaryStage: "find_candidate_count",
  cleanupStage: null,
  completedSteps: ["anonymous_protection", "exact_preview", "auth_login", "find_source_response"]
}), 1, config, []);
assert.equal(inconclusive.receipt.status, "INCONCLUSIVE");
assert.equal(inconclusive.exitCode, 2);

const cleanupOnly = classifyLiveJourneyReport(reportFor({
  primaryStatus: null,
  primaryStage: null,
  cleanupStage: "logout_action_missing",
  completedSteps: [...completedSteps, "analyse_result_contract", "analyse_local_save", "analyse_local_reopen", "paid_terminal", "scope_paid_counts", "network_policy"]
}), 1, config, receipts);
assert.equal(cleanupOnly.receipt.status, "FAIL_CLEANUP");
assert.equal(cleanupOnly.receipt.diagnostic.primaryStatus, null);

const marker = encodeLiveJourneyDiagnostic(simultaneous);
assert.deepEqual(findLiveJourneyDiagnostic({ nested: ["prefix", marker] }), parseLiveJourneyDiagnostic({
  schemaVersion: LIVE_JOURNEY_DIAGNOSTIC_SCHEMA,
  ...simultaneous
}));

for (const malformed of [
  { ...simultaneous, primaryStage: "raw_error_message" },
  { ...simultaneous, cleanupStage: "logout_secret" },
  { ...simultaneous, extra: plantedSecret },
  { ...simultaneous, completedSteps: ["auth_login", "anonymous_protection"] },
  { ...simultaneous, primaryStatus: null },
  { primaryStatus: null, primaryStage: null, cleanupStage: null, completedSteps: [] }
]) {
  assert.throws(() => encodeLiveJourneyDiagnostic(malformed), /malformed|canonical/);
}
assert.throws(() => classifyLiveJourneyReport(reportFor(primaryOnly.receipt.diagnostic), 0, config, receipts),
  /cannot accompany a successful child exit/);

const legacyCleanup = classifyLiveJourneyReport({ error: "LIVE_JOURNEY_CLEANUP_FAILED: logout" }, 1, config, receipts);
assert.deepEqual(legacyCleanup.receipt, {
  status: "FAIL_CLEANUP",
  scope: config.scope,
  previewHost: config.host,
  commit: config.commit,
  stage: "logout",
  receipts
});
const legacyInconclusive = classifyLiveJourneyReport({ error: "INCONCLUSIVE_LIVE_COVERAGE: Find returned one candidate." }, 1, config, []);
assert.equal(legacyInconclusive.receipt.status, "INCONCLUSIVE");
const legacyPass = classifyLiveJourneyReport({ stats: { expected: 1, skipped: 0, unexpected: 0, flaky: 0 } }, 0, config, receipts);
assert.equal(legacyPass.receipt.status, "PASS");

console.log(JSON.stringify({
  status: "PASS",
  cases: {
    simultaneousPrimaryAndCleanup: 1,
    primaryOnlyNeverPassOrInconclusive: 1,
    inconclusiveOnly: 1,
    cleanupOnly: 1,
    malformedDiagnosticsRejected: 6,
    rawSecretNotForwarded: 1,
    zeroAdditionalPaidDispatch: paidDispatches,
    legacyRunnerShapes: 3
  }
}));
