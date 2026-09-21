#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import {
  emptyAuthDiagnosticCounts,
  fixedFailedTestLane,
  hostedPreviewFailureStage,
  makeAuthDiagnostic,
  parseAuthDiagnostic,
  safeAuthProcessOutcome,
  AUTH_FAILURE_STEPS,
  fixedFailedAuthStep
} from "./sprint10-real-password-auth-diagnostics.mjs";

const secret = "planted-password-never-forward";
const specSource = readFileSync(new URL("../tests/e2e/sprint10-real-password-auth.spec.ts", import.meta.url), "utf8");
const loginPanelSource = readFileSync(new URL("../components/auth/login-panel.tsx", import.meta.url), "utf8");
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
assert.equal(fixedFailedAuthStep(report, "dual_session_isolation"), undefined);
const checkpointReport = (description) => ({ suites: [{ specs: [{ ...report.suites[0].specs[0], tests: [{
  ...report.suites[0].specs[0].tests[0], annotations: [{ type: "auth-failed-step", description }]
}] }] }] });
for (const failedStep of AUTH_FAILURE_STEPS) {
  assert.equal(fixedFailedAuthStep(checkpointReport(failedStep), "dual_session_isolation"), failedStep);
  const diagnostic = makeAuthDiagnostic({ ...failure, failedStep });
  assert.deepEqual(parseAuthDiagnostic(JSON.stringify(diagnostic), 1), diagnostic);
  assert(!JSON.stringify(diagnostic).includes(secret));
}
for (const failedStep of [secret, "https://private.invalid", null, 1, {}, "unknown", "logout_session\n", "logout_session:private-secret"]) {
  assert.throws(() => fixedFailedAuthStep(checkpointReport(failedStep), "dual_session_isolation"));
  assert.throws(() => parseAuthDiagnostic(JSON.stringify({ ...failure, failedStep }), 1));
}
for (const patch of [{ status: "PASS" }, { stage: "preflight" }, { testLane: "none" }]) {
  assert.throws(() => makeAuthDiagnostic({ ...failure, failedStep: "login_ui", ...patch }));
}
const duplicate = checkpointReport("login_ui");
duplicate.suites[0].specs[0].tests[0].annotations.push({ type: "auth-failed-step", description: "logout" });
assert.throws(() => fixedFailedAuthStep(duplicate, "dual_session_isolation"));
assert.equal(fixedFailedAuthStep(checkpointReport("login_ui"), "primary_continuity"), undefined);
const historicalLoginReceipt = makeAuthDiagnostic({ ...failure, failedStep: "login_ui" });
assert.deepEqual(parseAuthDiagnostic(JSON.stringify(historicalLoginReceipt), 1), historicalLoginReceipt,
  "The prior coarse login_ui receipt must remain parse-compatible.");
const passing = checkpointReport("login_ui");
passing.suites[0].specs[0].tests[0].status = "expected";
assert.equal(fixedFailedAuthStep(passing, "dual_session_isolation"), undefined);
const helperSource = specSource.slice(specSource.indexOf("async function authStep<"), specSource.indexOf("function canonicalOrigin"));
const annotations = [];
const authStep = new Function("test", `${stripTypeScriptTypes(helperSource)}; return authStep;`)({ info: () => ({ annotations }) });
assert.equal(await authStep("login_ui", () => 7), 7);
assert.deepEqual(annotations, [], "Successful checkpoints emit nothing.");
const originalFailure = new Error(secret);
await assert.rejects(authStep("session_initial", () => { throw originalFailure; }), (error) => error === originalFailure);
await assert.rejects(authStep("cleanup", () => { throw new Error(secret); }));
assert.deepEqual(annotations, [{ type: "auth-failed-step", description: "session_initial" }], "Cleanup must not overwrite the first failure.");
assert(!JSON.stringify(annotations).includes(secret));
const logoutSteps = ["logout_click", "logout_navigation", "logout_session", "logout_guarded_api",
  "logout_revisit_navigation", "logout_revisit_redirect"];
const logoutSource = specSource.slice(specSource.indexOf("async function signOutAndVerify("), specSource.indexOf("test.describe("));
assert.deepEqual([...logoutSource.matchAll(/authStep\("([a-z_]+)"/g)].map((match) => match[1]), logoutSteps,
  "Every logout operation must retain its ordered, fixed checkpoint.");
for (const failedStep of [null, ...logoutSteps, "logout_session_invalid", "logout_guarded_api_invalid"]) {
  annotations.length = 0;
  const visited = [];
  let redirects = 0;
  const operation = (step) => { if (failedStep === step) throw originalFailure; };
  const signOutAndVerify = new Function("authStep", "readSessionEvidence", "readGuardedApiEvidence", "guard", "expectLoginRedirect",
    `${stripTypeScriptTypes(logoutSource)}; return signOutAndVerify;`)(
    (step, run) => { visited.push(step); return authStep(step, run); },
    async (_page, identity) => {
      assert.equal(identity, "signed-out-no-identity");
      operation("logout_session");
      return { status: 200, noStore: true, authenticated: failedStep === "logout_session_invalid", supabaseAuthenticated: false };
    },
    async () => {
      operation("logout_guarded_api");
      return { status: failedStep === "logout_guarded_api_invalid" ? 200 : 401, code: "authentication_required", noStore: true };
    },
    (condition) => { if (!condition) throw originalFailure; },
    async (_page, next) => {
      assert.equal(next, "/profile");
      operation(redirects++ === 0 ? "logout_navigation" : "logout_revisit_redirect");
    }
  );
  const page = {
    getByRole(role, options) {
      assert.equal(role, "button");
      assert.deepEqual(options, { name: "Sign out", exact: true });
      return { click: async () => operation("logout_click") };
    },
    goto: async (path) => { assert.equal(path, "/profile"); operation("logout_revisit_navigation"); }
  };
  if (failedStep === null) {
    await authStep("logout", () => signOutAndVerify(page));
    assert.deepEqual(visited, logoutSteps);
    assert.deepEqual(annotations, []);
  } else {
    const expectedStep = failedStep.replace(/_invalid$/, "");
    await assert.rejects(authStep("logout", () => signOutAndVerify(page)), (error) => error === originalFailure);
    await assert.rejects(authStep("cleanup", () => { throw originalFailure; }));
    assert.deepEqual(visited, logoutSteps.slice(0, logoutSteps.indexOf(expectedStep) + 1));
    assert.deepEqual(annotations, [{ type: "auth-failed-step", description: expectedStep }],
      "Neither the coarse logout wrapper nor cleanup may overwrite the first precise checkpoint.");
    assert(!JSON.stringify(annotations).includes(secret));
  }
}
const historicalLogoutReceipt = makeAuthDiagnostic({ ...failure, failedStep: "logout" });
assert.deepEqual(parseAuthDiagnostic(JSON.stringify(historicalLogoutReceipt), 1), historicalLogoutReceipt);
const malformedLogoutAnnotation = checkpointReport("logout_session");
malformedLogoutAnnotation.suites[0].specs[0].tests[0].annotations[0].rawError = secret;
assert.throws(() => fixedFailedAuthStep(malformedLogoutAnnotation, "dual_session_isolation"));
for (const [, step] of specSource.matchAll(/authStep\("([a-z_]+)"/g)) assert(AUTH_FAILURE_STEPS.includes(step));
for (const expectedSubstep of [
  "login_navigation", "login_heading", "login_sample_seed", "login_identifier_control",
  "login_password_control", "login_submit_dispatch", "login_token_response_missing",
  "login_token_response_4xx", "login_token_response_5xx", "login_token_response_other",
  "login_profile_response_missing", "login_profile_response_4xx", "login_profile_response_5xx",
  "login_profile_response_other", "login_profile_navigation", "login_profile_hydration"
]) {
  assert(AUTH_FAILURE_STEPS.includes(expectedSubstep), `${expectedSubstep} must be a fixed safe diagnostic.`);
  assert(specSource.includes(`authStep("${expectedSubstep}"`) || specSource.includes(`"${expectedSubstep}" as const`),
    `${expectedSubstep} must be produced by the browser login flow.`);
}
assert.match(specSource, /Promise\.allSettled\(\[/,
  "Token, profile response and navigation evidence must be classified without an unhandled rejected waiter.");
assert.match(specSource, /grant_type"\) === "password"/,
  "The login response diagnostic must bind only to the existing-password token exchange.");
assert.match(specSource, /response\.request\(\)\.isNavigationRequest\(\)/,
  "Profile status classification must use the document-navigation response only.");
assert.doesNotMatch(specSource, /auth-failed-(?:url|body|error)|page\.on\("console"|page\.screenshot/,
  "Login diagnostics must not emit raw URLs, bodies, console data or screenshots.");
function assertBoundedLoginWaiters(source) {
  const loginStart = source.indexOf("async function loginWithExistingPassword");
  const loginEnd = source.indexOf("type SessionEvidence", loginStart);
  assert(loginStart >= 0 && loginEnd > loginStart, "The exact login helper must remain inspectable.");
  const helper = source.slice(loginStart, loginEnd);
  assert.match(source, /const loginDiagnosticWaitTimeoutMs = 30_000;/,
    "The fixed login diagnostic wait must be explicit and remain within the existing page/test budget.");
  assert.equal((helper.match(/timeout: loginDiagnosticWaitTimeoutMs/g) ?? []).length, 4,
    "Submit, token response, profile response and profile navigation must each have an explicit finite timeout.");
}
assertBoundedLoginWaiters(specSource);
assert.throws(() => assertBoundedLoginWaiters(specSource.replace(
  "click({ timeout: loginDiagnosticWaitTimeoutMs })", "click()"
)), undefined, "A regression to an implicit submit wait must fail the offline contract.");
assert.match(loginPanelSource, /window\.location\.assign\(destination\)/,
  "The profile response diagnostic relies on the current full-document login navigation.");
assert.match(loginPanelSource, /window\.location\.replace\(destination\)/,
  "The authenticated-state path must also retain full-document navigation.");
assert.equal(hostedPreviewFailureStage({ ...failure, testLane: "none" }), "preview_test_execution_none");

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
    fixedFailureSteps: AUTH_FAILURE_STEPS.length,
    checkpointPrivacyAndStatusDenials: 21,
    checkpointProducerFirstFailurePreserved: 1,
    historicalLoginUiReceiptCompatible: 1,
    historicalLogoutReceiptCompatible: 1,
    fixedLogoutSubsteps: logoutSteps.length,
    logoutProducerFirstFailurePreserved: logoutSteps.length + 2,
    logoutSuccessOrderPreserved: 1,
    fixedLoginSubsteps: 16,
    boundedLoginWaiters: 4,
    unboundedWaiterNegative: 1,
    fullDocumentNavigationContract: 2,
    unknownFailureLaneProjection: 1,
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
