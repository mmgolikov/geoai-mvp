export const LIVE_JOURNEY_DIAGNOSTIC_SCHEMA = "geoai.sprint10.live-journey-diagnostic.v1";
export const LIVE_JOURNEY_DIAGNOSTIC_MARKER = "LIVE_JOURNEY_DIAGNOSTIC_V1:";

export const LIVE_JOURNEY_STEPS = Object.freeze([
  "anonymous_protection",
  "exact_preview",
  "auth_login",
  "analyse_source_suggest",
  "analyse_source_context",
  "analyse_paid_response",
  "analyse_paid_terminal",
  "analyse_result_contract",
  "analyse_evidence_capture",
  "analyse_local_save",
  "analyse_local_reopen",
  "find_source_response",
  "find_candidate_count",
  "find_compare",
  "find_local_save",
  "find_local_reopen",
  "create_source_context",
  "create_paid_response",
  "create_paid_terminal",
  "create_result_contract",
  "create_local_save",
  "create_local_reopen",
  "paid_terminal",
  "scope_paid_counts",
  "network_policy",
  "paid_finalize"
]);

export const LIVE_JOURNEY_CLEANUP_STAGES = Object.freeze([
  "logout_session_precheck",
  "logout_profile_navigation",
  "logout_action_missing",
  "logout_response",
  "logout_session",
  "logout_unknown"
]);

const stepSet = new Set(LIVE_JOURNEY_STEPS);
const cleanupSet = new Set(LIVE_JOURNEY_CLEANUP_STAGES);
const primaryStatuses = new Set(["failed", "inconclusive"]);

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

export function parseLiveJourneyDiagnostic(value) {
  if (!exactKeys(value, ["schemaVersion", "primaryStatus", "primaryStage", "cleanupStage", "completedSteps"]) ||
      value.schemaVersion !== LIVE_JOURNEY_DIAGNOSTIC_SCHEMA ||
      !(value.primaryStatus === null || primaryStatuses.has(value.primaryStatus)) ||
      !(value.primaryStage === null || stepSet.has(value.primaryStage)) ||
      !(value.cleanupStage === null || cleanupSet.has(value.cleanupStage)) ||
      !Array.isArray(value.completedSteps) || value.completedSteps.length > LIVE_JOURNEY_STEPS.length ||
      value.completedSteps.some((step) => !stepSet.has(step)) ||
      new Set(value.completedSteps).size !== value.completedSteps.length ||
      (value.primaryStatus === null) !== (value.primaryStage === null) ||
      (value.primaryStatus === null && value.cleanupStage === null)) {
    throw new Error("The live journey diagnostic is malformed.");
  }
  let previous = -1;
  for (const step of value.completedSteps) {
    const index = LIVE_JOURNEY_STEPS.indexOf(step);
    if (index <= previous) throw new Error("The live journey completed-step sequence is not canonical.");
    previous = index;
  }
  return Object.freeze({
    schemaVersion: LIVE_JOURNEY_DIAGNOSTIC_SCHEMA,
    primaryStatus: value.primaryStatus,
    primaryStage: value.primaryStage,
    cleanupStage: value.cleanupStage,
    completedSteps: Object.freeze([...value.completedSteps])
  });
}

export function encodeLiveJourneyDiagnostic(value) {
  const parsed = parseLiveJourneyDiagnostic({ schemaVersion: LIVE_JOURNEY_DIAGNOSTIC_SCHEMA, ...value });
  return `${LIVE_JOURNEY_DIAGNOSTIC_MARKER}${Buffer.from(JSON.stringify(parsed), "utf8").toString("base64url")}:END`;
}

export function primaryAfterFinalizeFailure(primaryStatus, primaryStage) {
  if (primaryStatus === "failed") return { primaryStatus, primaryStage };
  return { primaryStatus: "failed", primaryStage: "paid_finalize" };
}

export function findLiveJourneyDiagnostic(value) {
  if (typeof value === "string") {
    const match = new RegExp(`${LIVE_JOURNEY_DIAGNOSTIC_MARKER}([A-Za-z0-9_-]{1,4096}):END`).exec(value);
    if (!match) return null;
    let decoded;
    try { decoded = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8")); }
    catch { throw new Error("The live journey diagnostic marker is malformed."); }
    return parseLiveJourneyDiagnostic(decoded);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const diagnostic = findLiveJourneyDiagnostic(item);
      if (diagnostic) return diagnostic;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const diagnostic = findLiveJourneyDiagnostic(item);
      if (diagnostic) return diagnostic;
    }
  }
  return null;
}
