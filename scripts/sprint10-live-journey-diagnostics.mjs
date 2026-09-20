export const LIVE_JOURNEY_DIAGNOSTIC_SCHEMA = "geoai.sprint10.live-journey-diagnostic.v1";
export const LIVE_JOURNEY_DIAGNOSTIC_MARKER = "LIVE_JOURNEY_DIAGNOSTIC_V1:";

export const LIVE_JOURNEY_STEPS = Object.freeze([
  "anonymous_protection",
  "exact_preview",
  "auth_login",
  // Retained for strict parsing of already-issued v1 receipts. New runs use the fixed substages below.
  "analyse_source_suggest",
  "analyse_source_suggest_ui",
  "analyse_source_suggest_request",
  "analyse_source_suggest_response",
  "analyse_source_suggest_http",
  "analyse_source_suggest_body",
  "analyse_source_suggest_contract",
  // Retained for strict parsing of already-issued v1 receipts. New runs use the fixed checks below.
  "analyse_source_suggest_correlation",
  "analyse_source_suggest_request_identity",
  "analyse_source_suggest_request_contract",
  "analyse_source_suggest_market_locale",
  "analyse_source_suggest_query",
  "analyse_source_suggest_coordinates",
  "analyse_source_suggest_candidate",
  "analyse_source_context",
  "analyse_depth_select",
  "analyse_depth_click",
  "analyse_depth_request",
  "analyse_depth_contract",
  "analyse_depth_inflight",
  "analyse_depth_response",
  "analyse_depth_response_body",
  "analyse_budget_scope_denied",
  "analyse_budget_contract_denied",
  "analyse_budget_reservation_denied",
  "analyse_paid_response",
  "analyse_paid_aborted",
  "analyse_paid_network_failed",
  "analyse_paid_response_timeout",
  "analyse_paid_terminal",
  "analyse_result_contract",
  "analyse_evidence_capture",
  "analyse_local_save",
  "analyse_local_reopen",
  // Retained for strict parsing of already-issued v1 receipts. New runs use the fixed substages below.
  "find_source_response",
  "find_source_ui",
  "find_source_ui_navigation",
  "find_source_ui_tab",
  "find_source_ui_default_2d",
  "find_source_ui_initial_cta",
  "find_source_ui_city_change",
  "find_source_ui_city_pending",
  "find_source_ui_city_ready",
  "find_source_ui_role",
  "find_source_ui_scenario",
  "find_source_ui_group",
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
  "find_candidate_count",
  "find_compare",
  "find_compare_select",
  "find_compare_compact",
  "find_compare_dashboard",
  "find_compare_basemap",
  "find_compare_geometry",
  "find_compare_markers",
  "find_compare_bounds",
  "find_compare_artifact",
  "find_local_save",
  "find_local_reopen",
  "find_candidate_open",
  "find_candidate_context_response",
  "find_candidate_context_contract",
  "find_candidate_selection",
  "find_candidate_no_replay",
  "find_candidate_question",
  "find_return_navigation",
  "find_return_tab",
  "find_return_dashboard",
  "find_return_artifact",
  "find_return_no_replay",
  "find_return_saved_navigation",
  "find_return_saved_filter",
  "find_return_saved_open",
  "find_return_saved_verify",
  "find_return_saved_identity",
  "find_return_saved_no_replay",
  "find_return_paid_count",
  // Retained for strict parsing of already-issued v1 receipts. New runs use the fixed substages below.
  "create_source_context",
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
  "create_source_context_ui_acceptance",
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

// Completed steps are an accumulated set, not a cross-mode execution timeline.
// Keep the parser strict; only producers explicitly request canonical ordering.
export function canonicalLiveJourneyCompletedSteps(steps) {
  if (!Array.isArray(steps) || steps.length > LIVE_JOURNEY_STEPS.length ||
      steps.some((step) => !stepSet.has(step)) || new Set(steps).size !== steps.length) {
    throw new Error("The completed live journey step set is malformed.");
  }
  return LIVE_JOURNEY_STEPS.filter((step) => steps.includes(step));
}

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

export function analyseSuggestionCorrelationChecks({
  observedRequest,
  responseRequest,
  submitted,
  responseSubmitted,
  expectedMarketKey,
  expectedLocale,
  expectedQuery,
  allCoordinatesInMarket
}) {
  const requestKeys = ["locale", "marketKey", "query"];
  const requestContract = exactKeys(submitted, requestKeys) && exactKeys(responseSubmitted, requestKeys);
  return Object.freeze({
    requestIdentity: responseRequest === observedRequest,
    requestContract,
    marketLocale: requestContract && responseSubmitted.marketKey === submitted.marketKey &&
      responseSubmitted.locale === submitted.locale && submitted.marketKey === expectedMarketKey &&
      submitted.locale === expectedLocale,
    query: requestContract && responseSubmitted.query === submitted.query && submitted.query === expectedQuery,
    coordinates: allCoordinatesInMarket === true
  });
}

export async function boundedLiveJourneyResponseJson(response, timeoutMs) {
  if (!response || typeof response.json !== "function" || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    throw new Error("The bounded live response reader configuration is invalid.");
  }
  let timeout;
  try {
    return await Promise.race([
      response.json(),
      new Promise((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("Bounded response-body read expired.")), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
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
