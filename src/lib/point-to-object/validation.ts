import {
  LIVE_POINT_ANALYSIS_LENSES,
  LIVE_POINT_CAPS,
  LIVE_POINT_CONTEXT_CATEGORIES,
  LIVE_POINT_OPERATIONS,
  LIVE_POINT_PROFILE_VERSION,
  LIVE_POINT_SCHEMA_ID,
  LIVE_POINT_SCENARIO_ID,
  LIVE_POINT_SELECTION_INTENTS,
  type CandidateAssertionInput,
  type LivePointAnalysisLens,
  type LivePointContextCategory,
  type LivePointErrorCode,
  type LivePointOperation,
  type LivePointRequest,
  type LivePointRequestAnchors,
  type LivePointSelectionIntent
} from "./contracts";
import { isSha256 } from "./hash";

export type RequestValidationResult =
  | { ok: true; value: LivePointRequest }
  | { ok: false; code: LivePointErrorCode; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isBoundedString(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === "string" && value.length >= minimum && value.length <= maximum;
}

function parseAnchors(value: unknown): LivePointRequestAnchors | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "snapshot_id",
    "snapshot_hash",
    "resolution_hash",
    "entity_id",
    "geometry_hash",
    "evidence_bundle_hash",
    "metric_hashes",
    "preserve_entity",
    "preserve_bundle",
    "refresh_requested"
  ])) return undefined;

  if (!isBoundedString(value.snapshot_id, 1, 256) || !isSha256(value.snapshot_hash) ||
      !(value.resolution_hash === null || isSha256(value.resolution_hash)) ||
      !(value.entity_id === null || isBoundedString(value.entity_id, 1, 512)) ||
      !(value.geometry_hash === null || isSha256(value.geometry_hash)) ||
      !(value.evidence_bundle_hash === null || isSha256(value.evidence_bundle_hash)) ||
      !Array.isArray(value.metric_hashes) || value.metric_hashes.length > 64 ||
      !value.metric_hashes.every(isSha256) || new Set(value.metric_hashes).size !== value.metric_hashes.length ||
      typeof value.preserve_entity !== "boolean" || typeof value.preserve_bundle !== "boolean" ||
      typeof value.refresh_requested !== "boolean") {
    return undefined;
  }

  if (!value.refresh_requested && value.preserve_entity && value.entity_id === null) return undefined;
  if (!value.refresh_requested && value.preserve_bundle && value.evidence_bundle_hash === null) return undefined;

  return {
    snapshot_id: value.snapshot_id,
    snapshot_hash: value.snapshot_hash,
    resolution_hash: value.resolution_hash,
    entity_id: value.entity_id,
    geometry_hash: value.geometry_hash,
    evidence_bundle_hash: value.evidence_bundle_hash,
    metric_hashes: [...value.metric_hashes],
    preserve_entity: value.preserve_entity,
    preserve_bundle: value.preserve_bundle,
    refresh_requested: value.refresh_requested
  };
}

function parseCandidateAssertion(value: unknown): CandidateAssertionInput | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || !hasOnlyKeys(value, ["token"]) ||
      typeof value.token !== "string" || !/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(value.token)) {
    return undefined;
  }
  return { token: value.token };
}

export function parseLivePointRequest(
  value: unknown,
  expectedOperation: LivePointOperation
): RequestValidationResult {
  let requestBytes: number;
  try {
    requestBytes = Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return { ok: false, code: "INVALID_REQUEST", message: "Request must be serializable JSON." };
  }
  if (requestBytes > LIVE_POINT_CAPS.requestBytes) {
    return { ok: false, code: "INPUT_LIMIT_EXCEEDED", message: "Request exceeds the frozen byte cap." };
  }
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "schema_id",
    "profile_version",
    "scenario_id",
    "operation",
    "input",
    "selection_intent",
    "candidate_assertion",
    "requested_categories",
    "context_radius_m",
    "locale",
    "analysis_lens",
    "anchors"
  ])) {
    return { ok: false, code: "INVALID_REQUEST", message: "Request must use the exact live-point profile." };
  }

  if (value.schema_id !== LIVE_POINT_SCHEMA_ID || value.profile_version !== LIVE_POINT_PROFILE_VERSION) {
    return { ok: false, code: "INVALID_REQUEST", message: "Unsupported schema_id or profile_version." };
  }
  if (value.scenario_id !== LIVE_POINT_SCENARIO_ID) {
    return { ok: false, code: "INVALID_REQUEST", message: "Unsupported scenario_id for this profile." };
  }
  if (!LIVE_POINT_OPERATIONS.includes(value.operation as LivePointOperation) ||
      value.operation !== expectedOperation) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: `This endpoint accepts only the ${expectedOperation} operation.`
    };
  }

  if (!isRecord(value.input) || value.input.kind !== "point") {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "Profile 0.1.0-rc.1 accepts only a named WGS84 point; uploaded or drawn AOIs are rejected."
    };
  }
  if (!hasOnlyKeys(value.input, ["kind", "clicked_point"]) ||
      !isRecord(value.input.clicked_point) ||
      !hasOnlyKeys(value.input.clicked_point, [
        "longitude",
        "latitude",
        "crs",
        "coordinate_order_confirmed"
      ])) {
    return { ok: false, code: "INVALID_REQUEST", message: "Point input has unexpected or missing fields." };
  }

  const longitude = value.input.clicked_point.longitude;
  const latitude = value.input.clicked_point.latitude;
  if (typeof longitude !== "number" || !Number.isFinite(longitude) ||
      typeof latitude !== "number" || !Number.isFinite(latitude) ||
      value.input.clicked_point.crs !== "EPSG:4326" ||
      typeof value.input.clicked_point.coordinate_order_confirmed !== "boolean") {
    return { ok: false, code: "INVALID_COORDINATE", message: "Point must contain finite named WGS84 coordinates." };
  }
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return { ok: false, code: "INVALID_COORDINATE", message: "Point falls outside WGS84 bounds." };
  }

  if (!LIVE_POINT_SELECTION_INTENTS.includes(value.selection_intent as LivePointSelectionIntent)) {
    return { ok: false, code: "INVALID_REQUEST", message: "Invalid selection_intent enum." };
  }
  const candidateAssertion = parseCandidateAssertion(value.candidate_assertion);
  if (candidateAssertion === undefined) {
    return { ok: false, code: "CANDIDATE_ASSERTION_INVALID", message: "Candidate assertion is malformed." };
  }

  if (!Array.isArray(value.requested_categories) ||
      value.requested_categories.length > LIVE_POINT_CAPS.requestedCategories ||
      !value.requested_categories.every((category) =>
        LIVE_POINT_CONTEXT_CATEGORIES.includes(category as LivePointContextCategory)) ||
      new Set(value.requested_categories).size !== value.requested_categories.length) {
    return { ok: false, code: "INVALID_REQUEST", message: "Invalid or duplicate requested context category." };
  }
  if (typeof value.context_radius_m !== "number" || !Number.isFinite(value.context_radius_m) ||
      value.context_radius_m < 0 || value.context_radius_m > LIVE_POINT_CAPS.contextRadiusM) {
    return { ok: false, code: "INVALID_REQUEST", message: "Context radius is outside the profile cap." };
  }
  if (!isBoundedString(value.locale, 2, 35) ||
      !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value.locale)) {
    return { ok: false, code: "INVALID_REQUEST", message: "Locale must be a bounded BCP-47 language tag." };
  }
  if (!LIVE_POINT_ANALYSIS_LENSES.includes(value.analysis_lens as LivePointAnalysisLens)) {
    return { ok: false, code: "INVALID_REQUEST", message: "Invalid analysis_lens enum." };
  }

  const anchors = parseAnchors(value.anchors);
  if (anchors === undefined) {
    return { ok: false, code: "INVALID_REQUEST", message: "Invalid snapshot or conversation anchors." };
  }

  return {
    ok: true,
    value: {
      schema_id: LIVE_POINT_SCHEMA_ID,
      profile_version: LIVE_POINT_PROFILE_VERSION,
      scenario_id: LIVE_POINT_SCENARIO_ID,
      operation: expectedOperation,
      input: {
        kind: "point",
        clicked_point: {
          longitude,
          latitude,
          crs: "EPSG:4326",
          coordinate_order_confirmed: value.input.clicked_point.coordinate_order_confirmed
        }
      },
      selection_intent: value.selection_intent as LivePointSelectionIntent,
      candidate_assertion: candidateAssertion,
      requested_categories: value.requested_categories as LivePointContextCategory[],
      context_radius_m: value.context_radius_m,
      locale: value.locale,
      analysis_lens: value.analysis_lens as LivePointAnalysisLens,
      anchors
    }
  };
}
