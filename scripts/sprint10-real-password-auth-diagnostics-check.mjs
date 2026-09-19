#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  emptyAuthDiagnosticCounts,
  fixedFailedTestLane,
  hostedPreviewFailureStage,
  makeAuthDiagnostic,
  parseAuthDiagnostic,
  safeAuthProcessOutcome
} from "./sprint10-real-password-auth-diagnostics.mjs";

const secret = "planted-password-never-forward";
const counts = {
  ...emptyAuthDiagnosticCounts(2),
  discoveredProjects: 1,
  discoveredTests: 2,
  passed: 1,
  unexpected: 1
};
const report = {
  suites: [{
    specs: [{
      title: "keeps two existing-user browser cookie sessions isolated",
      ok: false,
      tests: [{ status: "unexpected", results: [{ error: { message: secret, stack: secret } }] }]
    }]
  }]
};
assert.equal(fixedFailedTestLane(report), "dual_session_isolation");
const failure = makeAuthDiagnostic({
  status: "FAIL",
  stage: "test_execution",
  testLane: fixedFailedTestLane(report),
  counts,
  processOutcome: "nonzero",
  errorCode: null,
  timeoutMs: 390_000
});
const serialized = JSON.stringify(failure);
assert(!serialized.includes(secret));
assert.equal(hostedPreviewFailureStage(failure), "preview_test_execution_dual_session_isolation");
assert.deepEqual(parseAuthDiagnostic(serialized, 1), failure);

const timeout = makeAuthDiagnostic({
  status: "FAIL",
  stage: "child_timeout",
  counts: emptyAuthDiagnosticCounts(2),
  processOutcome: "timeout",
  errorCode: "ETIMEDOUT",
  timeoutMs: 390_000
});
assert.deepEqual(safeAuthProcessOutcome({ status: null, signal: "SIGTERM", error: { code: "ETIMEDOUT", message: secret } }),
  { processOutcome: "timeout", errorCode: "ETIMEDOUT" });
assert.equal(hostedPreviewFailureStage(timeout), "preview_child_timeout");

const discoveryFailure = makeAuthDiagnostic({
  status: "FAIL",
  stage: "discovery_contract",
  httpStatus: 503,
  counts: { ...emptyAuthDiagnosticCounts(2), discoveredProjects: 1, discoveredTests: 1 },
  processOutcome: "success",
  timeoutMs: 30_000
});
assert.equal(hostedPreviewFailureStage(discoveryFailure), "preview_discovery_contract");
assert.equal(discoveryFailure.httpStatus, 503);

for (const invalid of [
  "not-json",
  JSON.stringify({ ...failure, rawError: secret }),
  JSON.stringify({ ...failure, stage: "user supplied stage" }),
  JSON.stringify({ ...failure, testLane: secret }),
  JSON.stringify({ ...failure, httpStatus: 99 }),
  JSON.stringify({ ...failure, counts: { ...counts, skipped: -1 } }),
  JSON.stringify({ ...failure, processOutcome: secret }),
  JSON.stringify({ ...failure, errorCode: secret })
]) assert.throws(() => parseAuthDiagnostic(invalid, 1));

const zeroSkippedFalsePass = makeAuthDiagnostic({
  status: "FAIL",
  stage: "report_contract",
  counts: { ...emptyAuthDiagnosticCounts(2), discoveredProjects: 1, discoveredTests: 2 },
  processOutcome: "success",
  timeoutMs: 390_000
});
assert.throws(() => parseAuthDiagnostic(JSON.stringify({ ...zeroSkippedFalsePass, status: "PASS", stage: "complete" }), 0),
  undefined, "zero skipped is not a PASS when the expected tests did not pass");
assert.throws(() => parseAuthDiagnostic(JSON.stringify(failure), 0));
assert.throws(() => parseAuthDiagnostic(JSON.stringify({ ...failure, status: "PASS", stage: "complete" }), 1));
assert.throws(() => parseAuthDiagnostic(JSON.stringify(failure), 2));

const preflightChild = spawnSync(process.execPath, [
  fileURLToPath(new URL("./sprint10-real-password-auth-run.mjs", import.meta.url))
], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: { PATH: process.env.PATH ?? "/usr/bin:/bin" },
  encoding: "utf8",
  timeout: 5_000
});
const preflightDiagnostic = parseAuthDiagnostic(preflightChild.stdout, preflightChild.status);
assert.equal(preflightDiagnostic.stage, "preflight");
assert.equal(preflightDiagnostic.processOutcome, "not_started");
assert.equal(preflightChild.stderr, "");

console.log(JSON.stringify({
  status: "PASS",
  cases: {
    plantedSecretExcluded: 1,
    fixedFailureLane: 1,
    timeoutProjection: 1,
    discoveryProjection: 1,
    malformedOrProhibitedReports: 8,
    zeroSkippedFalsePassDenied: 1,
    exitStatusMismatchDenied: 3,
    runnerPreflightSanitized: 1,
    networkCalls: 0,
    browserCalls: 0
  }
}));
