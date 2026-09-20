export const REAL_PASSWORD_AUTH_DIAGNOSTIC_SCHEMA = "geoai.sprint10.real-password-auth-diagnostic.v1";

const STAGES = new Set([
  "preflight",
  "discovery_spawn",
  "discovery_parse",
  "discovery_contract",
  "browser_spawn",
  "child_timeout",
  "report_parse",
  "test_execution",
  "report_contract",
  "complete"
]);
const LANES = new Set(["none", "primary_continuity", "dual_session_isolation"]);
export const AUTH_FAILURE_STEPS = Object.freeze([
  "anonymous_protection", "exact_preview", "login_ui",
  "login_navigation", "login_heading", "login_sample_seed", "login_identifier_control",
  "login_password_control", "login_submit_dispatch", "login_token_response_missing",
  "login_token_response_4xx", "login_token_response_5xx", "login_token_response_other",
  "login_profile_response_missing", "login_profile_response_4xx", "login_profile_response_5xx",
  "login_profile_response_other", "login_profile_navigation", "login_profile_hydration",
  "session_initial", "guarded_api",
  "local_sample_login", "profile_reload", "session_reload", "local_sample_reload", "logout",
  "local_sample_logout", "network_policy", "session_isolation", "local_sample_isolation", "cleanup"
]);
const OUTCOMES = new Set(["not_started", "success", "nonzero", "timeout", "spawn_error"]);
const ERROR_CODES = new Set([null, "ETIMEDOUT", "ENOBUFS", "ENOENT", "OTHER"]);
const TEST_LANES_BY_TITLE = new Map([
  ["verifies exact Preview, SSR continuity, guarded API and logout without data mutations", "primary_continuity"],
  ["keeps two existing-user browser cookie sessions isolated", "dual_session_isolation"]
]);
const COUNT_KEYS = [
  "expectedProjects", "discoveredProjects", "expectedTests", "discoveredTests",
  "passed", "skipped", "unexpected", "flaky"
];

function exactKeys(value, expected) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join("\u0000") === [...expected].sort().join("\u0000");
}

function boundedCount(value) {
  return Number.isInteger(value) && value >= 0 && value <= 10;
}

export function emptyAuthDiagnosticCounts(expectedTests = 0) {
  return {
    expectedProjects: 1,
    discoveredProjects: 0,
    expectedTests,
    discoveredTests: 0,
    passed: 0,
    skipped: 0,
    unexpected: 0,
    flaky: 0
  };
}

export function safeAuthProcessOutcome(result) {
  const rawCode = typeof result?.error?.code === "string" ? result.error.code : null;
  const errorCode = rawCode === null ? null : ["ETIMEDOUT", "ENOBUFS", "ENOENT"].includes(rawCode) ? rawCode : "OTHER";
  if (rawCode === "ETIMEDOUT" || result?.signal === "SIGTERM") return { processOutcome: "timeout", errorCode: "ETIMEDOUT" };
  if (result?.error) return { processOutcome: "spawn_error", errorCode };
  if (result?.status !== 0) return { processOutcome: "nonzero", errorCode: null };
  return { processOutcome: "success", errorCode: null };
}

export function fixedFailedTestLane(report) {
  const lanes = new Set();
  const visit = (suite) => {
    for (const spec of Array.isArray(suite?.specs) ? suite.specs : []) {
      const failed = spec?.ok === false || (Array.isArray(spec?.tests) && spec.tests.some((test) =>
        test?.status === "unexpected" || test?.status === "flaky" || test?.status === "skipped"));
      if (failed && TEST_LANES_BY_TITLE.has(spec?.title)) lanes.add(TEST_LANES_BY_TITLE.get(spec.title));
    }
    for (const child of Array.isArray(suite?.suites) ? suite.suites : []) visit(child);
  };
  for (const suite of Array.isArray(report?.suites) ? report.suites : []) visit(suite);
  return lanes.size === 1 ? [...lanes][0] : "none";
}

export function makeAuthDiagnostic({ status, stage, testLane = "none", httpStatus = null, counts,
  processOutcome = "not_started", errorCode = null, timeoutMs, failedStep = undefined }) {
  const value = {
    schemaVersion: REAL_PASSWORD_AUTH_DIAGNOSTIC_SCHEMA,
    status,
    stage,
    testLane,
    httpStatus,
    counts,
    processOutcome,
    errorCode,
    timeoutMs,
    ...(failedStep === undefined ? {} : { failedStep })
  };
  return validateAuthDiagnostic(value);
}

export function validateAuthDiagnostic(value, exitStatus) {
  const stepPresent = Object.hasOwn(value ?? {}, "failedStep");
  if (!exactKeys(value, ["schemaVersion", "status", "stage", "testLane", "httpStatus", "counts",
    "processOutcome", "errorCode", "timeoutMs", ...(stepPresent ? ["failedStep"] : [])]) || value.schemaVersion !== REAL_PASSWORD_AUTH_DIAGNOSTIC_SCHEMA ||
      !["PASS", "FAIL"].includes(value.status) || !STAGES.has(value.stage) || !LANES.has(value.testLane) ||
      !(value.httpStatus === null || (Number.isInteger(value.httpStatus) && value.httpStatus >= 100 && value.httpStatus <= 599)) ||
      !exactKeys(value.counts, COUNT_KEYS) || !COUNT_KEYS.every((key) => boundedCount(value.counts[key])) ||
      !OUTCOMES.has(value.processOutcome) || !ERROR_CODES.has(value.errorCode) ||
      !Number.isInteger(value.timeoutMs) || value.timeoutMs < 0 || value.timeoutMs > 450_000) {
    throw new Error("The real-password Auth diagnostic report contract was not accepted.");
  }
  if (stepPresent && (value.status !== "FAIL" || value.stage !== "test_execution" || value.testLane === "none" ||
      !AUTH_FAILURE_STEPS.includes(value.failedStep))) throw new Error("The Auth failure checkpoint was not accepted.");
  if (value.status === "PASS") {
    if (value.stage !== "complete" || value.testLane !== "none" || value.httpStatus !== null ||
        value.processOutcome !== "success" || value.errorCode !== null || value.counts.expectedProjects !== 1 ||
        value.counts.discoveredProjects !== 1 || value.counts.expectedTests < 1 ||
        value.counts.discoveredTests !== value.counts.expectedTests || value.counts.passed !== value.counts.expectedTests ||
        value.counts.skipped !== 0 || value.counts.unexpected !== 0 || value.counts.flaky !== 0 ||
        (exitStatus !== undefined && exitStatus !== 0)) {
      throw new Error("The real-password Auth PASS diagnostic was not accepted.");
    }
  } else if (value.stage === "complete" || (exitStatus !== undefined && exitStatus !== 1)) {
    throw new Error("The real-password Auth FAIL diagnostic was not accepted.");
  }
  return value;
}

/** Project only a fixed checkpoint annotation, never error messages, stacks or values. */
export function fixedFailedAuthStep(report, lane) {
  if (!LANES.has(lane) || lane === "none") return undefined;
  const steps = [];
  let visited = 0;
  const visit = (suites, depth = 0) => {
    if (depth > 20) throw new Error("Auth checkpoint traversal exceeded its bound.");
    for (const suite of Array.isArray(suites) ? suites : []) {
      if (++visited > 1000) throw new Error("Auth checkpoint traversal exceeded its bound.");
      for (const spec of Array.isArray(suite?.specs) ? suite.specs : []) {
        if (TEST_LANES_BY_TITLE.get(spec?.title) !== lane) continue;
        for (const test of Array.isArray(spec.tests) ? spec.tests : []) {
          if (test?.status !== "unexpected") continue;
          for (const annotation of Array.isArray(test.annotations) ? test.annotations : []) {
            if (annotation?.type !== "auth-failed-step") continue;
            if (!exactKeys(annotation, ["type", "description"]) || !AUTH_FAILURE_STEPS.includes(annotation.description) || steps.length) {
              throw new Error("Auth checkpoint annotation is malformed or ambiguous.");
            }
            steps.push(annotation.description);
          }
        }
      }
      visit(suite?.suites, depth + 1);
    }
  };
  visit(report?.suites);
  return steps[0];
}

export function parseAuthDiagnostic(stdout, exitStatus) {
  let value;
  try { value = JSON.parse(stdout || ""); }
  catch { throw new Error("The real-password Auth child did not return a safe diagnostic report."); }
  return validateAuthDiagnostic(value, exitStatus);
}

export function hostedPreviewFailureStage(diagnostic) {
  validateAuthDiagnostic(diagnostic, 1);
  if (diagnostic.status !== "FAIL") throw new Error("A PASS diagnostic has no hosted failure stage.");
  if (diagnostic.stage === "test_execution") {
    return `preview_test_execution_${diagnostic.testLane}`;
  }
  return `preview_${diagnostic.stage}`;
}
