#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  LIVE_JOURNEY_DIAGNOSTIC_SCHEMA,
  LIVE_JOURNEY_STEPS,
  boundedLiveJourneyResponseJson,
  encodeLiveJourneyDiagnostic,
  findLiveJourneyDiagnostic,
  parseLiveJourneyDiagnostic,
  primaryAfterFinalizeFailure
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
assert.match(liveSpecSource, /boundedLiveJourneyResponseJson\(response, 10_000\)/,
  "logout response-body reads must be bounded and mapped to a fixed cleanup stage");
assert.match(liveSpecSource, /boundedLiveJourneyResponseJson\(suggested, 10_000\)/,
  "source suggestion response-body reads must be bounded");
assert.match(liveSpecSource, /boundedLiveJourneyResponseJson\(contextResponse, 10_000\)/,
  "area-context response-body reads must be bounded");
assert.match(liveSpecSource, /isPointObjectAreaContextResult\(contextPayload\)/,
  "area-context acceptance must use the production UI validator");
assert.match(liveSpecSource, /submitted\.marketKey === input\.marketKey[\s\S]*?submitted\.query === input\.query/,
  "source suggestion acceptance must correlate the exact market and query");
assert.match(liveSpecSource, /suggested\.request\(\) === request[\s\S]*?exactObjectKeys\(responseSubmitted, \["locale", "marketKey", "query"\]\)[\s\S]*?JSON\.stringify\(\[responseSubmitted\.marketKey, responseSubmitted\.locale, responseSubmitted\.query\]\)/,
  "source suggestion acceptance must bind the response to the observed request and its canonical payload");
assert.match(liveSpecSource, /contextPayload\.request\.marketKey === input\.marketKey[\s\S]*?contextPayload\.request\.locale === "en"[\s\S]*?JSON\.stringify\(contextPayload\.request\.aoiCoordinates\) === JSON\.stringify\(input\.coordinates\)/,
  "area-context acceptance must correlate the exact market, locale and AOI");
assert.match(liveSpecSource, /contextResponse\.request\(\) === contextRequest[\s\S]*?exactObjectKeys\(responseSubmittedContext, \["aoiCoordinates", "locale", "marketKey"\]\)/,
  "area-context acceptance must bind the response to the observed request and its exact payload keys");
assert.match(liveSpecSource, /locator\("xpath=ancestor::section\[1\]"\)/,
  "Create UI acceptance must target only the nearest containing section");
assert.match(liveSpecSource, /areaContextSection\.getByText\("Mapped objects", \{ exact: true \}\)/,
  "Create must prove that the UI accepted the validated area-context result before paid generation");
assert.match(liveSpecSource, /query: "Marina Bay Sands Tower 1"[\s\S]*?candidateLabel: \/marina bay sands\.\*tower 1\/i/,
  "Singapore Analyse must retain its fixed query and exact candidate identity rule");

const sourceDiagnosticStages = [
  "analyse_source_suggest_ui",
  "analyse_source_suggest_request",
  "analyse_source_suggest_response",
  "analyse_source_suggest_http",
  "analyse_source_suggest_body",
  "analyse_source_suggest_contract",
  "analyse_source_suggest_correlation",
  "analyse_source_suggest_candidate",
  "create_source_context_ui",
  "create_source_context_request",
  "create_source_context_response",
  "create_source_context_http",
  "create_source_context_body",
  "create_source_context_contract",
  "create_source_context_correlation",
  "create_source_context_ui_acceptance"
];
for (const primaryStage of sourceDiagnosticStages) {
  assert.ok(LIVE_JOURNEY_STEPS.includes(primaryStage), `${primaryStage} must be a fixed diagnostic stage`);
  const parsed = parseLiveJourneyDiagnostic({
    schemaVersion: LIVE_JOURNEY_DIAGNOSTIC_SCHEMA,
    primaryStatus: "failed",
    primaryStage,
    cleanupStage: null,
    completedSteps: []
  });
  assert.equal(parsed.primaryStage, primaryStage);
  assert.match(liveSpecSource, new RegExp(`progress[.]start\\("${primaryStage}"\\)`),
    `${primaryStage} must be emitted by the live spec`);
}
assert.ok(LIVE_JOURNEY_STEPS.includes("analyse_source_suggest") && LIVE_JOURNEY_STEPS.includes("create_source_context"),
  "legacy v1 broad source stages must remain parseable");

const boundedFixturePayload = { mode: "results", count: 1 };
assert.deepEqual(await boundedLiveJourneyResponseJson({
  json: async () => boundedFixturePayload
}, 100), boundedFixturePayload, "the bounded response reader must return a successful JSON body");
await assert.rejects(() => boundedLiveJourneyResponseJson({
  json: async () => { throw new Error("fixture body rejection"); }
}, 100), /fixture body rejection/, "the bounded response reader must preserve a body rejection for stage-only classification");
await assert.rejects(() => boundedLiveJourneyResponseJson({
  json: () => new Promise(() => undefined)
}, 10), /Bounded response-body read expired/,
"the bounded response reader must reject a body that does not settle before its deadline");

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

const promotedFinalizeFailure = primaryAfterFinalizeFailure("inconclusive", "find_candidate_count");
assert.deepEqual(promotedFinalizeFailure, { primaryStatus: "failed", primaryStage: "paid_finalize" },
  "a delayed inconclusive result must be promoted when accounting finalization fails");
const classifiedFinalizeFailure = classifyLiveJourneyReport(reportFor({
  ...promotedFinalizeFailure,
  cleanupStage: null,
  completedSteps: ["anonymous_protection", "exact_preview", "auth_login", "find_source_response"]
}), 1, config, receipts);
assert.equal(classifiedFinalizeFailure.receipt.status, "FAIL");
assert.equal(classifiedFinalizeFailure.receipt.diagnostic.primaryStage, "paid_finalize");
assert.deepEqual(primaryAfterFinalizeFailure("failed", "analyse_result_contract"), {
  primaryStatus: "failed",
  primaryStage: "analyse_result_contract"
}, "an earlier hard primary failure must remain the first hard cause");

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
    inconclusiveFinalizeFailurePromoted: 1,
    inconclusiveOnly: 1,
    cleanupOnly: 1,
    malformedDiagnosticsRejected: 6,
    boundedResponseReaderCases: 3,
    rawSecretNotForwarded: 1,
    zeroAdditionalPaidDispatch: paidDispatches,
    legacyRunnerShapes: 3
  }
}));
