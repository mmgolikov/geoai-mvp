#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

import {
  LIVE_JOURNEY_DIAGNOSTIC_SCHEMA,
  LIVE_JOURNEY_STEPS,
  canonicalLiveJourneyCompletedSteps,
  analyseSuggestionCorrelationChecks,
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
const paidEntrySource = liveSpecSource.slice(liveSpecSource.indexOf("async function observePaidAnalyseEntry("), liveSpecSource.indexOf("async function runDubaiAnalyse("));
assert.match(paidEntrySource, /observeSourcePostResponse\(page, "\/api\/prototype\/point-to-object\/ai", 180_000\)/);
assert.match(paidEntrySource, /getByRole\("button", \{ name: "Analyze", exact: true \}\)[.]click\(\)/);
assert.match(paidEntrySource, /finally\s*\{\s*observation[.]cancel\(\)/);
for (const [name, next, responseName] of [["runDubaiAnalyse", "runDubaiDepthCycle", "response"], ["runDubaiDepthCycle", "runSingaporeAnalyse", "baselineResponse"]]) {
  const body = liveSpecSource.split(`async function ${name}`)[1].split(`async function ${next}`)[0];
  assert.ok(body.includes(`const ${responseName} = await observePaidAnalyseEntry(page, progress);`));
}
for (const [kind, expectedStage] of [["aborted", "analyse_paid_aborted"], ["network_failed", "analyse_paid_network_failed"], ["timeout", "analyse_paid_response_timeout"], ["response", null]]) {
  let cancelled = 0;
  let clicks = 0;
  let stage = "analyse_paid_response";
  const response = { status: () => 200, request: () => ({ method: () => "POST" }) };
  const observe = new Function("observeSourcePostResponse", `${stripTypeScriptTypes(paidEntrySource, { mode: "transform", sourceMap: false })}; return observePaidAnalyseEntry;`)(
    (_page, pathname, timeoutMs) => {
      assert.equal(pathname, "/api/prototype/point-to-object/ai"); assert.equal(timeoutMs, 180_000);
      return { result: Promise.resolve({ kind, response }), cancel: () => { cancelled++; } };
    });
  const result = observe({ getByRole: () => ({ click: async () => { clicks++; } }) }, { start: value => { stage = value; } });
  if (expectedStage) await assert.rejects(result, /^Error: The paid analysis response did not complete[.]$/);
  else assert.equal(await result, response, "actual HTTP response must pass unchanged to existing status/body/identity checks");
  assert.equal(stage, expectedStage ?? "analyse_paid_response"); assert.equal(cancelled, 1); assert.equal(clicks, 1);
}
const findBody = liveSpecSource.split("async function runDubaiFind")[1].split("async function runSingaporeFind")[0];
const reopenBody = liveSpecSource.split("async function reopenSavedArtifact")[1].split("async function runDubaiAnalyse")[0];
const diagnosticBindings = [
  ["find_candidate_open", 'name: "Open object analysis", exact: true'],
  ["find_candidate_context_response", "const contextResponse = await contextPromise"],
  ["find_candidate_context_contract", "contextResponse.request().postDataJSON()"],
  ["find_candidate_selection", "expect(selection.object.sourceFeatureId)"],
  ["find_candidate_no_replay", 'afterAnalysis["POST /api/prototype/point-to-object/context"]'],
  ["find_candidate_question", 'fill(SPRINT10_PUBLIC_ANALYSIS_QUESTION)'],
  ["find_return_navigation", 'page.goto("/prototype/point-to-object")'],
  ["find_return_tab", 'getByRole("tab", { name: "Find", exact: true }).click()'],
  ["find_return_dashboard", "await verifyComparison()"],
  ["find_return_artifact", 'expect(current.artifactId).toBe(saved.artifactId)'],
  ["find_return_no_replay", "assertNoReplay(beforeReturn, policy.snapshotJourneyRequests())"],
  ["find_return_paid_count", "paidBeforeReopen + (runCandidateAnalysis ? index + 1 : 0)"],
  ["find_return_saved_navigation", 'page.goto("/projects?view=spatial")'],
  ["find_return_saved_filter", "await summary.click()"],
  ["find_return_saved_open", 'await card.getByRole("button"'],
  ["find_return_saved_verify", "await verify()"],
  ["find_return_saved_identity", "assertSameArtifact(expected, reopened)"],
  ["find_return_saved_no_replay", "assertNoReplay(before, policy.snapshotJourneyRequests())"]
];
const producer = liveSpecSource.slice(liveSpecSource.indexOf("function createLiveProgress()"), liveSpecSource.indexOf("function cleanupStage("));
const createProgress = new Function("LIVE_JOURNEY_STEPS", "canonicalLiveJourneyCompletedSteps", "guard",
  `${stripTypeScriptTypes(producer, { mode: "transform", sourceMap: false })}; return createLiveProgress;`
)(LIVE_JOURNEY_STEPS, canonicalLiveJourneyCompletedSteps, (condition) => assert.ok(condition));
const depthBody = liveSpecSource.split("async function runDubaiDepthCycle")[1].split("async function runSingaporeAnalyse")[0];
for (const [stage, action] of [
  ["analyse_depth_select", "await depthButton.click()"],
  ["analyse_depth_click", "await run.click()"],
  ["analyse_depth_request", "const request = await requestPromise"],
  ["analyse_depth_contract", "validateSprint10DepthCycleTransportIdentity(submittedRequest, chosen.id)"],
  ["analyse_depth_inflight", 'toHaveAttribute("data-in-flight-depth", depth)'],
  ["analyse_depth_response", "const response = await responsePromise"],
  ["analyse_depth_response_body", "boundedLiveJourneyResponseJson(response, 10_000)"]
]) {
  const start = depthBody.indexOf(`progress.start("${stage}")`);
  const bound = depthBody.indexOf(action, start);
  const complete = depthBody.indexOf(`progress.complete("${stage}")`, start);
  assert.ok(start >= 0 && bound > start && complete > bound, `${stage} must enclose the existing depth action`);
  const progress = createProgress();
  progress.start(stage);
  const diagnostic = { schemaVersion: LIVE_JOURNEY_DIAGNOSTIC_SCHEMA, primaryStatus: "failed", primaryStage: progress.current(), cleanupStage: null, completedSteps: progress.completed() };
  assert.deepEqual(parseLiveJourneyDiagnostic(diagnostic), diagnostic);
  assert.throws(() => parseLiveJourneyDiagnostic({ ...diagnostic, error: "private diagnostic" }));
}
for (const stage of ["analyse_budget_scope_denied", "analyse_budget_contract_denied", "analyse_budget_reservation_denied"]) {
  assert.ok(liveSpecSource.includes(`denialStage = "${stage}"`));
  const diagnostic = { schemaVersion: LIVE_JOURNEY_DIAGNOSTIC_SCHEMA, primaryStatus: "failed", primaryStage: stage, cleanupStage: null, completedSteps: [] };
  assert.deepEqual(parseLiveJourneyDiagnostic(diagnostic), diagnostic);
  assert.throws(() => parseLiveJourneyDiagnostic({ ...diagnostic, primaryStage: `${stage}:raw-error` }));
}
assert.match(liveSpecSource, /configuration[.]scope[.]endsWith\("depth-cycle"\) \? budget[.]denialStage\(\) \?\? progress[.]current\(\) : progress[.]current\(\)/);
assert.match(liveSpecSource, /if \(!guarded[.]ok\) \{\s*denialStage = "analyse_budget_reservation_denied";[\s\S]*?await route[.]abort\("blockedbyclient"\)/);
for (const [stage, action] of diagnosticBindings) {
  const saved = stage.startsWith("find_return_saved_");
  const body = saved ? reopenBody : findBody;
  const receiver = saved ? "findReturnProgress?." : "progress.";
  const start = body.indexOf(`${receiver}start("${stage}")`);
  const boundAction = body.indexOf(action, start);
  const complete = body.indexOf(`${receiver}complete("${stage}")`, start);
  assert.ok(start >= 0 && boundAction > start && complete > boundAction, `${stage} must enclose its unchanged assertion/action`);
  const progress = createProgress();
  progress.start("analyse_local_reopen");
  progress.complete("analyse_local_reopen");
  progress.start(stage);
  const marker = encodeLiveJourneyDiagnostic({ schemaVersion: LIVE_JOURNEY_DIAGNOSTIC_SCHEMA, primaryStatus: "failed",
    primaryStage: progress.current(), cleanupStage: null, completedSteps: progress.completed() });
  const classified = classifyLiveJourneyReport({ errors: [{ message: marker }] }, 1, { ...config, scope: "dubai-find-construction" }, receipts);
  assert.equal(classified.receipt.status, "FAIL");
  assert.equal(classified.receipt.diagnostic.primaryStage, stage, "completed AI reopen must never mask the later failure");
  assert.deepEqual(classified.receipt.diagnostic.completedSteps, ["analyse_local_reopen"]);
  assert.throws(() => parseLiveJourneyDiagnostic({ ...classified.receipt.diagnostic, rawError: "private-sentinel" }), /malformed/);
  assert.throws(() => progress.start(`${stage}_private_sentinel`));
}
assert.match(findBody, /reopenSavedArtifact\(page, configuration[.]userId, "find", policy, current, verifyComparison, 1, progress\)/);
assert.match(reopenBody, /if \(findReturnProgress\) guard\(kind === "find"/);
const comparisonVerifier = liveSpecSource.slice(liveSpecSource.indexOf("const verifyComparison = async () => {"), liveSpecSource.indexOf("await verifyComparison();"));
assert.match(comparisonVerifier, /const parentStep = progress[.]current\(\);\s*progress[.]start\("find_compare_dashboard"\)/,
  "reused comparison validation must begin its own diagnostic substeps");
assert.match(comparisonVerifier, /progress[.]complete\("find_compare_bounds"\);\s*progress[.]start\(parentStep\)/,
  "successful comparison validation must restore its caller before local-reopen completion");
assert.match(liveSpecSource, /progress[.]complete\("find_compare_artifact"\);\s*progress[.]start\("find_compare"\);\s*progress[.]complete\("find_compare"\)/,
  "aggregate comparison completion cannot complete the still-active artifact substep");
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
assert.match(liveSpecSource, /const responseRequest = suggested\.request\(\);[\s\S]*?guard\(responseRequest === request,[\s\S]*?analyseSuggestionCorrelationChecks\(\{[\s\S]*?observedRequest: request,[\s\S]*?responseRequest,[\s\S]*?expectedMarketKey: input\.marketKey,[\s\S]*?expectedQuery: input\.query/,
  "source suggestion acceptance must bind the response to the observed request and exact expected market/query");
for (const check of ["requestIdentity", "requestContract", "marketLocale", "query", "coordinates"]) {
  assert.match(liveSpecSource, new RegExp(`guard\\(correlation[.]${check},`),
    `source suggestion correlation must fail separately for ${check}`);
}
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
const suggestionContractSource = liveSpecSource.split('progress.start("analyse_source_suggest_contract");')[1]
  ?.split('progress.complete("analyse_source_suggest_contract");')[0] ?? "";
assert.ok(suggestionContractSource.length > 0);
assert.doesNotMatch(suggestionContractSource, /results\.length\s*>\s*0/,
  "A valid empty Photon response must reach the distinct exact-candidate stage, not be misclassified as malformed source data");

const sourceDiagnosticStages = [
  "analyse_source_suggest_ui",
  "analyse_source_suggest_request",
  "analyse_source_suggest_response",
  "analyse_source_suggest_http",
  "analyse_source_suggest_body",
  "analyse_source_suggest_contract",
  "analyse_source_suggest_request_identity",
  "analyse_source_suggest_request_contract",
  "analyse_source_suggest_market_locale",
  "analyse_source_suggest_query",
  "analyse_source_suggest_coordinates",
  "analyse_source_suggest_candidate",
  "find_source_ui",
  "find_source_camera",
  "find_source_cta",
  "find_source_pre_dispatch",
  "find_source_pre_dispatch_method",
  "find_source_pre_dispatch_shape",
  "find_source_pre_dispatch_market_or_locale",
  "find_source_pre_dispatch_criteria",
  "find_source_pre_dispatch_bounds",
  "find_source_pre_dispatch_contract_mismatch",
  "find_source_pre_dispatch_timeout",
  "find_source_response_wait",
  "find_source_response_wait_aborted",
  "find_source_response_wait_network_failed",
  "find_source_response_wait_timeout",
  "find_source_http",
  "find_source_body",
  "find_source_contract",
  "create_source_context_ui",
  "create_source_context_request",
  "create_source_context_response",
  "create_source_context_response_aborted",
  "create_source_context_response_network_failed",
  "create_source_context_response_timeout",
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
assert.ok(LIVE_JOURNEY_STEPS.includes("analyse_source_suggest") && LIVE_JOURNEY_STEPS.includes("analyse_source_suggest_correlation") &&
  LIVE_JOURNEY_STEPS.includes("find_source_response") && LIVE_JOURNEY_STEPS.includes("create_source_context"),
  "legacy v1 broad source stages must remain parseable");

const requestObject = {};
const exactSuggestionBody = { locale: "en", marketKey: "singapore", query: "Marina Bay Sands Tower 1" };
assert.deepEqual(analyseSuggestionCorrelationChecks({
  observedRequest: requestObject,
  responseRequest: requestObject,
  submitted: exactSuggestionBody,
  responseSubmitted: { ...exactSuggestionBody },
  expectedMarketKey: "singapore",
  expectedLocale: "en",
  expectedQuery: "Marina Bay Sands Tower 1",
  allCoordinatesInMarket: true
}), {
  requestIdentity: true,
  requestContract: true,
  marketLocale: true,
  query: true,
  coordinates: true
});
assert.equal(analyseSuggestionCorrelationChecks({
  observedRequest: requestObject,
  responseRequest: {},
  submitted: exactSuggestionBody,
  responseSubmitted: { ...exactSuggestionBody },
  expectedMarketKey: "singapore",
  expectedLocale: "en",
  expectedQuery: "Marina Bay Sands Tower 1",
  allCoordinatesInMarket: true
}).requestIdentity, false,
"semantically identical request bodies must not hide a distinct response-request object");

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

const findCompletedSet = ["anonymous_protection", "exact_preview", "auth_login", "find_compare_dashboard",
  "find_compare", "find_local_reopen", "analyse_paid_response", "analyse_paid_terminal", "analyse_local_save", "analyse_local_reopen"];
const originalCompleted = [...findCompletedSet];
assert.throws(() => encodeLiveJourneyDiagnostic({ ...simultaneous, completedSteps: findCompletedSet }), /canonical/);
for (const primaryStage of ["analyse_paid_aborted", "analyse_paid_network_failed", "analyse_paid_response_timeout"]) {
  const value = { ...simultaneous, primaryStage, cleanupStage: null, completedSteps: canonicalLiveJourneyCompletedSteps(findCompletedSet) };
  const projected = classifyLiveJourneyReport(reportFor(value), 1, { ...config, scope: "dubai-find-analysis" }, receipts);
  assert.equal(projected.receipt.status, "FAIL");
  assert.equal(projected.receipt.diagnostic.primaryStage, primaryStage);
  assert.deepEqual(new Set(projected.receipt.diagnostic.completedSteps), new Set(findCompletedSet));
}
assert.deepEqual(findCompletedSet, originalCompleted, "Canonical projection must not mutate or invent the observed set.");
for (const invalid of [["secret"], ["auth_login", "auth_login"], null, "auth_login"]) {
  assert.throws(() => canonicalLiveJourneyCompletedSteps(invalid), /malformed/);
}

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
    legacyRunnerShapes: 3,
    depthTransitionFailureBindings: 7,
    budgetDenialStages: 3,
    depthDiagnosticPrivateFieldOrEnumRejections: 10,
    findReturnAndCandidateFailureBindings: diagnosticBindings.length
  }
}));
