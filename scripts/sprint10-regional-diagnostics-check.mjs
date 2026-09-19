#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  LIVE_JOURNEY_STEPS,
  analyseSuggestionCorrelationChecks,
  parseLiveJourneyDiagnostic
} from "./sprint10-live-journey-diagnostics.mjs";

const liveSpec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
assert.match(liveSpec, /const SOURCE_REQUEST_HARNESS_TIMEOUT_MS = 60_000;/,
  "the regional source request/response envelope must remain exactly 60 seconds");
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
const findStages = [
  "find_source_ui",
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

for (const functionName of ["runDubaiFind", "runSingaporeFind"]) {
  const nextMarker = functionName === "runDubaiFind" ? "\nasync function runSingaporeFind" : "\ntype LiveCreateCase";
  const body = liveSpec.split(`async function ${functionName}`)[1]?.split(nextMarker)[0] ?? "";
  assert.ok(body.length > 0, `${functionName} must remain present`);
  let previous = -1;
  for (const stage of findStages) {
    const index = body.indexOf(`progress.start("${stage}")`);
    assert.ok(index > previous, `${functionName} must emit ${stage} in canonical order`);
    previous = index;
  }
  assert.match(body, /boundedLiveJourneyResponseJson\(response, 10_000\)/,
    `${functionName} must use the existing bounded response-body reader`);
  assert.match(body, /waitForResponse\([\s\S]*?timeout: SOURCE_REQUEST_HARNESS_TIMEOUT_MS/,
    `${functionName} must use the shared 60-second source response envelope`);
  assert.doesNotMatch(body, /await response[.]json\(\)/,
    `${functionName} must not restore an unbounded body read`);
  assert.ok(body.indexOf("installFindPreDispatchGate") < body.indexOf('getByTestId("find-search-cta").click()'),
    `${functionName} must install its fail-closed request gate before dispatch`);
}

const findGate = liveSpec.split("async function installFindPreDispatchGate")[1]?.split("\n}\n\nfunction acceptedFindResponse")[0] ?? "";
assert.match(findGate, /setTimeout\([\s\S]*?SOURCE_REQUEST_HARNESS_TIMEOUT_MS\)/,
  "the fail-closed Find pre-dispatch request gate must use the same bounded source envelope");
const createBody = liveSpec.split("async function runMarketCreate")[1]?.split("\nasync function runDubaiCreate")[0] ?? "";
assert.equal((createBody.match(/timeout: SOURCE_REQUEST_HARNESS_TIMEOUT_MS/g) ?? []).length, 2,
  "area-context request and response waits must both use the shared 60-second source envelope");
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
