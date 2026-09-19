#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { POINT_OBJECT_SOURCE_HARNESS_RESPONSE_TIMEOUT_MS } from "../src/lib/prototype/source-request-deadline.ts";

import {
  LIVE_JOURNEY_STEPS,
  analyseSuggestionCorrelationChecks,
  parseLiveJourneyDiagnostic
} from "./sprint10-live-journey-diagnostics.mjs";

const liveSpec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
assert.equal(POINT_OBJECT_SOURCE_HARNESS_RESPONSE_TIMEOUT_MS, 60_000,
  "the regional source request/response envelope must remain exactly 60 seconds");
assert.match(liveSpec, /import \{ POINT_OBJECT_SOURCE_HARNESS_RESPONSE_TIMEOUT_MS as SOURCE_REQUEST_HARNESS_TIMEOUT_MS \} from "\.\.\/\.\.\/src\/lib\/prototype\/source-request-deadline";/,
  "the harness must use the production deadline contract rather than a drifting local literal");
assert.doesNotMatch(liveSpec, /(?:const|let|var) SOURCE_REQUEST_HARNESS_TIMEOUT_MS\s*=/,
  "the shared source response deadline must not be shadowed in the harness");
const exactBody = Object.freeze({ locale: "en", marketKey: "singapore", query: "Marina Bay Sands Tower 1" });
const sharedRequest = {};

function checks(overrides = {}) {
  return analyseSuggestionCorrelationChecks({
    observedRequest: sharedRequest,
    responseRequest: sharedRequest,
    submitted: exactBody,
    responseSubmitted: { ...exactBody },
    expectedMarketKey: "singapore",
    expectedLocale: "en",
    expectedQuery: "Marina Bay Sands Tower 1",
    allCoordinatesInMarket: true,
    ...overrides
  });
}

assert.deepEqual(checks(), {
  requestIdentity: true,
  requestContract: true,
  marketLocale: true,
  query: true,
  coordinates: true
});

const distinctWrapper = checks({ responseRequest: {} });
assert.deepEqual(distinctWrapper, {
  requestIdentity: false,
  requestContract: true,
  marketLocale: true,
  query: true,
  coordinates: true
}, "distinct request objects with identical bounded bodies must isolate only the request-identity stage");

assert.equal(checks({ responseSubmitted: { ...exactBody, extra: "not accepted" } }).requestContract, false);
assert.equal(checks({ responseSubmitted: { ...exactBody, marketKey: "dubai" } }).marketLocale, false);
assert.equal(checks({ responseSubmitted: { ...exactBody, query: "different public query" } }).query, false);
assert.equal(checks({ allCoordinatesInMarket: false }).coordinates, false);

const analyseStages = [
  "analyse_source_suggest_request_identity",
  "analyse_source_suggest_request_contract",
  "analyse_source_suggest_market_locale",
  "analyse_source_suggest_query",
  "analyse_source_suggest_coordinates"
];
const findUiStages = [
  "find_source_ui_navigation",
  "find_source_ui_tab",
  "find_source_ui_default_2d",
  "find_source_ui_initial_cta",
  "find_source_ui_city_change",
  "find_source_ui_city_pending",
  "find_source_ui_city_ready",
  "find_source_ui_role",
  "find_source_ui_scenario",
  "find_source_ui_group"
];
const findStages = [
  ...findUiStages,
  "find_source_camera",
  "find_source_cta",
  "find_source_pre_dispatch",
  "find_source_response_wait",
  "find_source_http",
  "find_source_body",
  "find_source_contract"
];
for (const stage of [...analyseStages, ...findStages]) {
  assert.ok(LIVE_JOURNEY_STEPS.includes(stage));
  assert.match(liveSpec, new RegExp(`progress[.]start\\("${stage}"\\)`));
  assert.equal(parseLiveJourneyDiagnostic({
    schemaVersion: "geoai.sprint10.live-journey-diagnostic.v1",
    primaryStatus: "failed",
    primaryStage: stage,
    cleanupStage: null,
    completedSteps: []
  }).primaryStage, stage);
}

assert.deepEqual(findUiStages.map((stage) => LIVE_JOURNEY_STEPS.indexOf(stage)),
  [...findUiStages].map((_, index) => LIVE_JOURNEY_STEPS.indexOf(findUiStages[0]) + index),
  "the fixed Find UI diagnostic enum must remain contiguous and canonical");
for (const unsafeStage of ["find_source_ui_raw_error", "find_source_ui_timeout_30000_secret"]) {
  assert.throws(() => parseLiveJourneyDiagnostic({
    schemaVersion: "geoai.sprint10.live-journey-diagnostic.v1",
    primaryStatus: "failed",
    primaryStage: unsafeStage,
    cleanupStage: null,
    completedSteps: []
  }), /malformed/, "arbitrary or raw Find UI stages must remain outside safe receipts");
}
assert.throws(() => parseLiveJourneyDiagnostic({
  schemaVersion: "geoai.sprint10.live-journey-diagnostic.v1",
  primaryStatus: "failed",
  primaryStage: "find_source_ui_navigation",
  cleanupStage: null,
  completedSteps: ["find_source_ui_navigation", "find_source_ui_raw_error"]
}), /malformed/, "completed steps must reject arbitrary Find UI diagnostic text");
assert.match(liveSpec, /test[.]use\(\{ trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" \}\)/,
  "the diagnostic refinement must not enable raw screenshots, traces or video");

for (const functionName of ["runDubaiFind", "runSingaporeFind"]) {
  const nextMarker = functionName === "runDubaiFind" ? "\nasync function runSingaporeFind" : "\ntype LiveCreateCase";
  const body = liveSpec.split(`async function ${functionName}`)[1]?.split(nextMarker)[0] ?? "";
  assert.ok(body.length > 0, `${functionName} must remain present`);
  let previous = -1;
  const expectedFindStages = functionName === "runDubaiFind"
    ? [
        "find_source_ui_navigation", "find_source_ui_tab", "find_source_ui_role",
        "find_source_ui_scenario", "find_source_ui_group",
        ...findStages.slice(findUiStages.length)
      ]
    : findStages;
  assert.ok(body.indexOf('progress.start("find_source_ui")') < body.indexOf('progress.start("find_source_ui_navigation")'),
    `${functionName} must replace the historical broad UI stage before any awaited UI action`);
  assert.doesNotMatch(body, /progress[.]complete\("find_source_ui"\)/,
    `${functionName} must not append the historical broad UI stage after granular completed steps`);
  for (const stage of expectedFindStages) {
    const index = body.indexOf(`progress.start("${stage}")`);
    assert.ok(index > previous, `${functionName} must emit ${stage} in canonical order`);
    previous = index;
  }
  const uiChecks = functionName === "runDubaiFind"
    ? [
        ["find_source_ui_navigation", 'page.goto("/prototype/point-to-object")'],
        ["find_source_ui_tab", 'getByRole("tab", { name: "Find", exact: true }).click()'],
        ["find_source_ui_role", 'selectOption("consultant_broker")'],
        ["find_source_ui_scenario", 'selectOption("b2b_hotel_development")'],
        ["find_source_ui_group", 'toHaveValue("hospitality")']
      ]
    : [
        ["find_source_ui_navigation", 'page.goto("/prototype/point-to-object")'],
        ["find_source_ui_tab", 'getByRole("tab", { name: "Find", exact: true }).click()'],
        ["find_source_ui_default_2d", 'toHaveAttribute("aria-pressed", "true")'],
        ["find_source_ui_initial_cta", "toBeEnabled({ timeout: 30_000 })"],
        ["find_source_ui_city_change", 'selectOption("singapore")'],
        ["find_source_ui_city_pending", "toBeDisabled()"],
        ["find_source_ui_city_ready", "toBeEnabled({ timeout: 30_000 })"],
        ["find_source_ui_role", 'selectOption("consultant_broker")'],
        ["find_source_ui_scenario", 'selectOption("b2b_commercial_real_estate")'],
        ["find_source_ui_group", 'toHaveValue("commercial_office")']
      ];
  for (const [stage, check] of uiChecks) {
    const start = body.indexOf(`progress.start("${stage}")`);
    const assertion = body.indexOf(check, start);
    const complete = body.indexOf(`progress.complete("${stage}")`, assertion);
    assert.ok(start >= 0 && assertion > start && complete > assertion,
      `${functionName} must bind ${stage} around its exact existing UI action/assertion`);
  }
  assert.match(body, /boundedLiveJourneyResponseJson\(response, 10_000\)/,
    `${functionName} must use the existing bounded response-body reader`);
  assert.match(body, /observeSourcePostResponse\(page, "\/api\/prototype\/point-to-object\/find", SOURCE_REQUEST_HARNESS_TIMEOUT_MS\)/,
    `${functionName} must observe response and request-failure outcomes within the shared 60-second source envelope`);
  assert.doesNotMatch(body, /await response[.]json\(\)/,
    `${functionName} must not restore an unbounded body read`);
  assert.ok(body.indexOf("installFindPreDispatchGate") < body.indexOf('getByTestId("find-search-cta").click()'),
    `${functionName} must install its fail-closed request gate before dispatch`);
}

const findGate = liveSpec.split("async function installFindPreDispatchGate")[1]?.split("\n}\n\nfunction acceptedFindResponse")[0] ?? "";
assert.match(findGate, /setTimeout\([\s\S]*?SOURCE_REQUEST_HARNESS_TIMEOUT_MS\)/,
  "the fail-closed Find pre-dispatch request gate must use the same bounded source envelope");
assert.match(findGate, /route[.]request\(\)[.]method\(\) !== "POST"[\s\S]*?\? "method"/,
  "a non-POST Find dispatch must retain its fixed method reason");
const preDispatchFailureMapping = liveSpec.split("function markFindPreDispatchFailure")[1]?.split("\n}\n\nfunction exactObjectKeys")[0] ?? "";
for (const [reason, stage] of [
  ["method", "find_source_pre_dispatch_method"],
  ["shape", "find_source_pre_dispatch_shape"],
  ["market_or_locale", "find_source_pre_dispatch_market_or_locale"],
  ["criteria", "find_source_pre_dispatch_criteria"],
  ["bounds", "find_source_pre_dispatch_bounds"],
  ["timeout", "find_source_pre_dispatch_timeout"]
]) {
  assert.match(preDispatchFailureMapping, new RegExp(`reason === "${reason}"[\\s\\S]*?progress[.]start\\("${stage}"\\)`),
    `${reason} must map to its fixed pre-dispatch diagnostic stage`);
}
const sourceObserver = liveSpec.split("function observeSourcePostResponse")[1]?.split("\n}\n\nfunction requireFindSourceResponse")[0] ?? "";
assert.match(sourceObserver, /page[.]on\("response", onResponse\)/,
  "the source observer must distinguish an HTTP response from a missing response");
assert.match(sourceObserver, /page[.]on\("requestfailed", onRequestFailed\)/,
  "the source observer must distinguish a failed browser request from a harness timeout");
assert.match(sourceObserver, /setTimeout\(\(\) => finish\(\{ kind: "timeout" \}\), timeoutMs\)/,
  "the source observer must retain a bounded timeout outcome");
const createBody = liveSpec.split("async function runMarketCreate")[1]?.split("\nasync function runDubaiCreate")[0] ?? "";
assert.equal((createBody.match(/SOURCE_REQUEST_HARNESS_TIMEOUT_MS/g) ?? []).length, 2,
  "area-context request and response observation must both use the shared 60-second source envelope");
assert.match(createBody, /finally \{[\s\S]*?if \(!contextRequestObserved\) contextResponseObservation[.]cancel\(\)/,
  "a failed Create upload or request wait must remove its response observers");
const suggestBody = liveSpec.split("async function runAnalyseSourceSuggest")[1]?.split("\nasync function logoutVerified")[0] ?? "";
assert.doesNotMatch(suggestBody, /SOURCE_REQUEST_HARNESS_TIMEOUT_MS/,
  "the regional source deadline alignment must not alter suggestion waits");

assert.match(liveSpec, /allCoordinatesInMarket: resultRecords[.]every[\s\S]*?coordinatesMatchPointObjectMarket/,
  "all returned candidates must remain inside the selected market");
assert.match(liveSpec, /candidateLabel: \/marina bay sands[.]\*tower 1\/i/,
  "the fixed Singapore subject must not be replaced by a fallback candidate");
assert.match(liveSpec, /try \{ initial = await browserSessionState\(page, expectedUserId\); \}[\s\S]*?logout_session_precheck/,
  "a thrown initial session read must map to the fixed precheck stage rather than raw logout_unknown");

for (const legacy of ["analyse_source_suggest_correlation", "find_source_response"]) {
  assert.ok(LIVE_JOURNEY_STEPS.includes(legacy), `${legacy} must remain parseable for historical receipts`);
}

console.log(JSON.stringify({
  status: "PASS",
  cases: {
    exactCorrelation: 1,
    distinctRequestIdentity: 1,
    requestContract: 1,
    marketLocale: 1,
    exactQuery: 1,
    allCandidateCoordinates: 1,
    findFlows: 2,
    fixedStages: analyseStages.length + findStages.length,
    historicalStagesRetained: 2,
    paidOrHostedDispatches: 0
  }
}));
