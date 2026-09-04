import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = process.cwd();
const LIVE_POINT_SCHEMA_ID = "urn:geoai:point-to-object-001:evidence-bundle:0.1.0-rc.1" as const;
const LIVE_POINT_PROFILE_VERSION = "0.1.0-rc.1" as const;
const LIVE_POINT_SCENARIO_ID = "b2b_redevelopment_selected_aoi" as const;
const LIVE_POINT_CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion." as const;
const LIVE_POINT_OPERATIONS = ["resolve_entity", "get_context", "get_evidence_bundle"] as const;
const LIVE_POINT_SELECTION_INTENTS = ["general_object", "building", "road", "poi", "land_use"] as const;
const LIVE_POINT_RESOLUTION_STATUSES = ["resolved", "ambiguous", "coordinate_context_only", "no_result", "outside_coverage"] as const;
const LIVE_POINT_ENTITY_TYPES = ["building", "building_part", "building_complex", "land_use", "road_segment", "poi"] as const;
const LIVE_POINT_CONTEXT_CATEGORIES = ["school", "childcare", "clinic", "hospital", "pharmacy", "grocery", "supermarket", "retail_anchor", "public_transport_stop", "public_transport_station", "major_road", "park_green_space"] as const;
const LIVE_POINT_WARNING_CODES = ["BOUNDARY_CONTACT", "PARTIAL_CONTEXT_SOURCE", "SOURCE_FRESHNESS_UNKNOWN", "SOURCE_STALE", "SOURCE_CONFLICT", "CONTEXT_TRUNCATED", "CENTROID_FALLBACK", "MODEL_FALLBACK", "COORDINATE_CONTEXT_ONLY", "UNNAMED_SOURCE_FEATURE"] as const;
const LIVE_POINT_ERROR_CODES = ["INVALID_REQUEST", "INVALID_COORDINATE", "COORDINATE_ORDER_SUSPECTED", "INPUT_LIMIT_EXCEEDED", "ANCHOR_MISMATCH", "SNAPSHOT_MISSING", "SNAPSHOT_CORRUPT", "SNAPSHOT_HASH_MISMATCH", "SNAPSHOT_INDEX_UNAVAILABLE", "GEOMETRY_NOT_FOUND", "GEOMETRY_HASH_MISMATCH", "RIGHTS_UNKNOWN", "RIGHTS_BLOCKED", "SOURCE_STALE_BLOCKED", "PREVIEW_DISABLED", "PRODUCTION_DENIED", "ACCESS_DENIED", "CONTRACT_VALIDATION_FAILED", "CANDIDATE_ASSERTION_INVALID", "CANDIDATE_SET_OVERFLOW", "INTERNAL_ERROR"] as const;
const LIVE_POINT_MODEL_STATES = ["not_requested", "completed", "fallback", "blocked_by_gate", "timeout", "refusal", "incomplete", "missing_output", "invalid_output", "upstream_error"] as const;
const LIVE_POINT_CAPS = { requestBytes: 32768, responseBytes: 1048576, inlineGeometryBytes: 256000, allInlineGeometryBytes: 262144, candidates: 20, facilities: 100, requestedCategories: 20, contextRadiusM: 1500 } as const;
const PRODUCT_AUTHORITIES = {
  product_change_request_sha256: "03ffd6117794b5560b02fb41ac9a5b81a84b7b81f0ae016d0b951190a9b7e9cd",
  product_change_request_bytes: 23455,
  product_contract_sha256: "f18fc665800879bb33de66227b9f6175984bc5b0a2d8e08307f94acd7f8290d2",
  product_contract_bytes: 39393,
  product_state_claim_matrix_sha256: "9aff3d43b114f1da1808343a694f565e237a24968e2c8780f30d62aa27f5752b",
  product_state_claim_matrix_bytes: 21948
} as const;

type LivePointErrorCode = (typeof LIVE_POINT_ERROR_CODES)[number];
type LivePointErrorStatus = "invalid_input" | "source_unavailable" | "blocked" | "failed";
type LivePointOperation = (typeof LIVE_POINT_OPERATIONS)[number];
const SCHEMA_PATH = path.join(
  ROOT,
  "docs/change-requests/point-to-object-001/point-to-object-evidence-bundle-0.1.0-rc.1.schema.json"
);
const CONTRACT_MANIFEST_PATH = path.join(
  ROOT,
  "tests/fixtures/point-to-object/contract-manifest-0.1.0-rc.1.json"
);

type JsonObject = Record<string, unknown>;

function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

function jsonFile(filePath: string): JsonObject {
  return JSON.parse(readFileSync(filePath, "utf8")) as JsonObject;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as JsonObject)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, entry]) => [key, canonicalize(entry)]));
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function semanticHash(value: unknown): string {
  return sha256(canonicalJson(value));
}

async function importErasableTypeScript(filePath: string, transforms: Array<[RegExp, string]> = []): Promise<Record<string, unknown>> {
  let source = readFileSync(filePath, "utf8");
  for (const [pattern, replacement] of transforms) source = source.replace(pattern, replacement);
  const javascript = stripTypeScriptTypes(source, { mode: "transform", sourceMap: false });
  return await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`) as Record<string, unknown>;
}

function expectInvalidSchemaRequest(validateRequest: ReturnType<Ajv2020["compile"]>, candidate: unknown): void {
  assert.equal(validateRequest(candidate), false, "Expected compiled request schema to reject input.");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function collectFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const filePath = path.join(directory, entry);
    return statSync(filePath).isDirectory() ? collectFiles(filePath) : [filePath];
  });
}

function compileSchema(): {
  schema: JsonObject;
  validateRoot: ReturnType<Ajv2020["compile"]>;
  validateRequest: ReturnType<Ajv2020["compile"]>;
  validateCandidateAssertionReceipt: ReturnType<Ajv2020["compile"]>;
} {
  const schemaBytes = readFileSync(SCHEMA_PATH);
  const schema = JSON.parse(schemaBytes.toString("utf8")) as JsonObject;
  const contractManifest = jsonFile(CONTRACT_MANIFEST_PATH);
  assert.equal(schema.$id, LIVE_POINT_SCHEMA_ID);
  assert.equal(contractManifest.schema_id, LIVE_POINT_SCHEMA_ID);
  assert.equal(contractManifest.profile_version, LIVE_POINT_PROFILE_VERSION);
  assert.equal(sha256(schemaBytes), contractManifest.schema_sha256);
  for (const [key, value] of Object.entries(PRODUCT_AUTHORITIES)) {
    assert.equal(contractManifest[key], value, `Product authority pin drifted: ${key}.`);
  }

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateRoot = ajv.compile(schema);
  const validateRequest = ajv.getSchema(`${LIVE_POINT_SCHEMA_ID}#/$defs/request`);
  const validateCandidateAssertionReceipt = ajv.getSchema(`${LIVE_POINT_SCHEMA_ID}#/$defs/candidateAssertionReceipt`);
  assert.ok(validateRequest, "Compiled request schema was not addressable by exact profile $id.");
  assert.ok(validateCandidateAssertionReceipt, "Compiled candidate assertion receipt schema was not addressable by exact profile $id.");
  return { schema, validateRoot, validateRequest, validateCandidateAssertionReceipt };
}

function assertFiniteEnums(schema: JsonObject): void {
  const definitions = schema.$defs as Record<string, JsonObject>;
  assert.deepEqual(definitions.operation.enum, [...LIVE_POINT_OPERATIONS]);
  assert.deepEqual(definitions.selectionIntent.enum, [...LIVE_POINT_SELECTION_INTENTS]);
  assert.deepEqual(definitions.resolutionStatus.enum, [...LIVE_POINT_RESOLUTION_STATUSES]);
  assert.deepEqual(definitions.entityType.enum, [...LIVE_POINT_ENTITY_TYPES]);
  assert.deepEqual(definitions.contextCategory.enum, [...LIVE_POINT_CONTEXT_CATEGORIES]);
  assert.deepEqual(definitions.warningCode.enum, [...LIVE_POINT_WARNING_CODES]);
  assert.deepEqual([...(definitions.errorCode.enum as string[])].sort(), [...LIVE_POINT_ERROR_CODES].sort());
  assert.deepEqual(definitions.modelState.enum, [...LIVE_POINT_MODEL_STATES]);
  assert.equal((definitions.caveat as JsonObject).const, LIVE_POINT_CAVEAT);
}

function validRequest(): any {
  return {
    schema_id: LIVE_POINT_SCHEMA_ID,
    profile_version: LIVE_POINT_PROFILE_VERSION,
    scenario_id: LIVE_POINT_SCENARIO_ID,
    operation: "resolve_entity",
    input: {
      kind: "point",
      clicked_point: {
        longitude: 55.274376,
        latitude: 25.197197,
        crs: "EPSG:4326",
        coordinate_order_confirmed: true
      }
    },
    selection_intent: "general_object",
    candidate_assertion: null,
    requested_categories: ["school", "hospital"],
    context_radius_m: 450,
    locale: "en-AE",
    analysis_lens: "open_context_summary",
    anchors: null
  };
}

function assertRequestParser(validateRequest: ReturnType<Ajv2020["compile"]>): void {
  const request = validRequest();
  assert.equal(validateRequest(request), true, JSON.stringify(validateRequest.errors));

  const extra = { ...request, source_url: "https://example.invalid/overpass" };
  expectInvalidSchemaRequest(validateRequest, extra);

  for (const kind of ["polygon", "uploaded_aoi", "drawn_aoi", "source_object"]) {
    const invalid = clone(request) as JsonObject;
    invalid.input = { kind, clicked_point: request.input.clicked_point };
    expectInvalidSchemaRequest(validateRequest, invalid);
  }

  const coordinateArray = clone(request) as JsonObject;
  coordinateArray.input = { kind: "point", clicked_point: [55.274376, 25.197197] };
  expectInvalidSchemaRequest(validateRequest, coordinateArray);

  for (const [longitude, latitude] of [[181, 25], [55, 91], [Number.NaN, 25], [55, Number.POSITIVE_INFINITY]]) {
    const invalid = clone(request);
    invalid.input.clicked_point.longitude = longitude;
    invalid.input.clicked_point.latitude = latitude;
    expectInvalidSchemaRequest(validateRequest, invalid);
  }

  const tooManyCategories = clone(request) as JsonObject;
  tooManyCategories.requested_categories = Array.from({ length: LIVE_POINT_CAPS.requestedCategories + 1 }, (_, index) => `category_${index}`);
  expectInvalidSchemaRequest(validateRequest, tooManyCategories);

  const oversizedRadius = clone(request);
  oversizedRadius.context_radius_m = LIVE_POINT_CAPS.contextRadiusM + 1;
  expectInvalidSchemaRequest(validateRequest, oversizedRadius);

  const unsupportedIntent = clone(request) as JsonObject;
  unsupportedIntent.selection_intent = "walking_route";
  expectInvalidSchemaRequest(validateRequest, unsupportedIntent);

  const malformedAssertion = clone(request) as JsonObject;
  malformedAssertion.candidate_assertion = { token: "unsigned" };
  expectInvalidSchemaRequest(validateRequest, malformedAssertion);

  const wrongScenario = clone(request) as JsonObject;
  wrongScenario.scenario_id = "b2c_point_context";
  expectInvalidSchemaRequest(validateRequest, wrongScenario);
}

async function assertRuntimeRequestParser(): Promise<void> {
  const validationPath = path.join(ROOT, "src/lib/point-to-object/validation.ts");
  const runtime = await importErasableTypeScript(validationPath, [
    [/import \{[\s\S]*?\} from "\.\/contracts";\n/, `const LIVE_POINT_ANALYSIS_LENSES = ${JSON.stringify(["open_context_summary", "nearby_services", "source_and_limits", "official_validation_actions", "prohibited_high_impact_claim"])};
const LIVE_POINT_CAPS = ${JSON.stringify(LIVE_POINT_CAPS)};
const LIVE_POINT_CONTEXT_CATEGORIES = ${JSON.stringify([...LIVE_POINT_CONTEXT_CATEGORIES])};
const LIVE_POINT_OPERATIONS = ${JSON.stringify([...LIVE_POINT_OPERATIONS])};
const LIVE_POINT_PROFILE_VERSION = ${JSON.stringify(LIVE_POINT_PROFILE_VERSION)};
const LIVE_POINT_SCHEMA_ID = ${JSON.stringify(LIVE_POINT_SCHEMA_ID)};
const LIVE_POINT_SCENARIO_ID = ${JSON.stringify(LIVE_POINT_SCENARIO_ID)};
const LIVE_POINT_SELECTION_INTENTS = ${JSON.stringify([...LIVE_POINT_SELECTION_INTENTS])};
`],
    [/import \{ isSha256 \} from "\.\/hash";\n/, "const isSha256 = (value) => typeof value === \"string\" && /^[a-f0-9]{64}$/.test(value);\n"]
  ]);
  const parseLivePointRequest = runtime.parseLivePointRequest as (value: unknown, operation: LivePointOperation) => JsonObject;
  const request = validRequest();
  assert.equal(parseLivePointRequest(request, "resolve_entity").ok, true);
  assert.deepEqual(parseLivePointRequest({ ...request, operation: "get_context" }, "resolve_entity"), {
    ok: false,
    code: "INVALID_REQUEST",
    message: "This endpoint accepts only the resolve_entity operation."
  });
  for (const kind of ["polygon", "uploaded_aoi", "drawn_aoi", "source_object"]) {
    const candidate = clone(request);
    candidate.input.kind = kind;
    assert.equal(parseLivePointRequest(candidate, "resolve_entity").ok, false, `${kind} must fail runtime point-only parsing.`);
  }
  const badCoordinate = clone(request);
  badCoordinate.input.clicked_point.longitude = 181;
  assert.equal(parseLivePointRequest(badCoordinate, "resolve_entity").code, "INVALID_COORDINATE");
  const badAssertion = clone(request);
  badAssertion.candidate_assertion = { token: "unsigned" };
  assert.equal(parseLivePointRequest(badAssertion, "resolve_entity").code, "CANDIDATE_ASSERTION_INVALID");
  const extra = { ...request, user_visible_rank: 1 };
  assert.equal(parseLivePointRequest(extra, "resolve_entity").code, "INVALID_REQUEST");
}

async function assertFeatureGate(): Promise<void> {
  const featureGateModule = await importErasableTypeScript(path.join(ROOT, "src/lib/point-to-object/feature-gate.ts"));
  const getLivePointFeatureGate = featureGateModule.getLivePointFeatureGate as (environment?: Record<string, string>) => JsonObject;
  assert.deepEqual(getLivePointFeatureGate({}), {
    enabled: false,
    environment: "local",
    reason: "main_gate_hold"
  });
  assert.deepEqual(getLivePointFeatureGate({
    GEOAI_ENABLE_LIVE_POINT_PREVIEW: "true",
    VERCEL: "1",
    VERCEL_ENV: "production"
  }), {
    enabled: false,
    environment: "production",
    reason: "production_denied"
  });
  assert.deepEqual(getLivePointFeatureGate({
    GEOAI_ENABLE_LIVE_POINT_PREVIEW: "true",
    VERCEL: "1",
    VERCEL_ENV: "preview"
  }), {
    enabled: false,
    environment: "preview",
    reason: "main_gate_hold"
  });
  assert.deepEqual(getLivePointFeatureGate({
    GEOAI_ENABLE_LIVE_POINT_PREVIEW: "true",
    VERCEL: "1",
    VERCEL_ENV: "production"
  }), getLivePointFeatureGate({
    GEOAI_ENABLE_LIVE_POINT_PREVIEW: "true",
    VERCEL_ENV: "production"
  }), "Production denial must not depend on VERCEL=1 being present.");
}

async function assertErrorStatusMatrix(): Promise<void> {
  const errorModule = await importErasableTypeScript(path.join(ROOT, "src/lib/point-to-object/errors.ts"));
  const errorStatusForCode = errorModule.errorStatusForCode as (code: LivePointErrorCode) => LivePointErrorStatus;
  const expected: Record<LivePointErrorStatus, LivePointErrorCode[]> = {
    invalid_input: ["INVALID_REQUEST", "INVALID_COORDINATE", "COORDINATE_ORDER_SUSPECTED", "INPUT_LIMIT_EXCEEDED", "ANCHOR_MISMATCH", "CANDIDATE_ASSERTION_INVALID"],
    source_unavailable: ["SNAPSHOT_MISSING", "SNAPSHOT_CORRUPT", "SNAPSHOT_HASH_MISMATCH", "SNAPSHOT_INDEX_UNAVAILABLE", "GEOMETRY_NOT_FOUND", "GEOMETRY_HASH_MISMATCH"],
    blocked: ["RIGHTS_UNKNOWN", "RIGHTS_BLOCKED", "SOURCE_STALE_BLOCKED", "CANDIDATE_SET_OVERFLOW", "PREVIEW_DISABLED", "PRODUCTION_DENIED", "ACCESS_DENIED"],
    failed: ["CONTRACT_VALIDATION_FAILED", "INTERNAL_ERROR"]
  };
  const seen = new Set<LivePointErrorCode>();
  for (const [status, codes] of Object.entries(expected) as Array<[LivePointErrorStatus, LivePointErrorCode[]]>) {
    for (const code of codes) {
      assert.equal(errorStatusForCode(code), status, `${code} must map to ${status}.`);
      seen.add(code);
    }
  }
  assert.deepEqual([...seen].sort(), [...LIVE_POINT_ERROR_CODES].sort());
}

function assertSchemaNegativeCases(validateRoot: ReturnType<Ajv2020["compile"]>): void {
  const baseError = {
    schema_id: LIVE_POINT_SCHEMA_ID,
    profile_version: LIVE_POINT_PROFILE_VERSION,
    response_kind: "error",
    response_id: "response-1",
    generated_at: "2026-08-31T17:41:47.000Z",
    caveat: LIVE_POINT_CAVEAT,
    status: "blocked",
    errors: [{ code: "PRODUCTION_DENIED", message: "Disabled in Production.", retryable: false }]
  };
  assert.equal(validateRoot(baseError), true, JSON.stringify(validateRoot.errors));
  assert.equal(validateRoot({ ...baseError, status: "source_unavailable" }), false, "Error code/status mismatch must fail schema validation.");
  assert.equal(validateRoot({ ...baseError, status: "no_result" }), false, "Resolution status must never enter an error envelope.");
  assert.equal(validateRoot({ ...baseError, errors: [] }), false, "Non-success envelope requires at least one typed error.");
  assert.equal(validateRoot({ ...baseError, unexpected: true }), false, "Compiled envelopes must reject extra properties.");
  assert.equal(validateRoot({ ...baseError, errors: [{ code: "NO_RESULT", message: "wrong vocabulary", retryable: false }] }), false);
  assert.equal(validateRoot({
    ...baseError,
    errors: [{ ...baseError.errors[0], eligible_count: null }]
  }), false, "Only CANDIDATE_SET_OVERFLOW may expose overflow detail fields.");

  const overflowWithCount = {
    ...baseError,
    errors: [{
      code: "CANDIDATE_SET_OVERFLOW",
      message: "More than twenty eligible candidates remain.",
      retryable: false,
      eligible_count: 21,
      eligible_count_withheld_reason: null,
      refinement_action: "submit_more_precise_point_or_zoom"
    }]
  };
  assert.equal(validateRoot(overflowWithCount), true, JSON.stringify(validateRoot.errors));
  assert.equal(validateRoot({
    ...overflowWithCount,
    errors: [{ ...overflowWithCount.errors[0], eligible_count: null, eligible_count_withheld_reason: "count_not_safe_to_disclose" }]
  }), true, JSON.stringify(validateRoot.errors));
  assert.equal(validateRoot({ ...overflowWithCount, errors: [{ ...overflowWithCount.errors[0], eligible_count: 20 }] }), false);
  assert.equal(validateRoot({ ...overflowWithCount, errors: [{ code: "CANDIDATE_SET_OVERFLOW", message: "overflow", retryable: false }] }), false);
}

function syntheticRoot(): any {
  const h = sha256;
  const snapshotAnchor = {
    manifest_id: "manifest-hold-v1", snapshot_id: "snapshot-hold-v1", snapshot_hash: h("snapshot-bytes"), snapshot_semantic_hash: h("snapshot-semantic"),
    source_as_of: "2026-08-31T17:41:47.000Z", retrieved_at: "2026-08-31T17:41:47.000Z", acquisition_receipt_id: "acquisition-hold-v1", rights_status: "cleared_for_experiment"
  };
  const point = { longitude: 55.274376, latitude: 25.197197, crs: "EPSG:4326", coordinate_order_confirmed: true };
  const geometryHash = h("geometry");
  const entityHash = h("entity");
  const resolutionHash = h("resolution");
  const contextHash = h("context");
  const metricHash = h("metric");
  const bundleHash = h("bundle");
  const candidate = {
    candidate_id: "candidate-1", entity_id: "entity-1", entity_hash: entityHash, geometry_id: "geometry-1", geometry_hash: geometryHash,
    geometry_type: "Polygon", geometry_version: "geojson-wgs84-v1", source_id: "synthetic/object-1", source_namespace: "SyntheticFixture", entity_type: "building",
    display_name: "Synthetic non-runtime building", source_tags: { building: "yes" }, match_method: "point_in_polygon", containment: "inside", distance_m: 0,
    distance_method: "utm_point_to_boundary", authority_status: "open_context_not_official", source_as_of: snapshotAnchor.source_as_of,
    retrieved_at: snapshotAnchor.retrieved_at, limitations: ["Synthetic contract fixture only."], candidate_assertion: null
  };
  const resolution = {
    status: "resolved", resolution_id: "resolution-1", resolution_hash: resolutionHash, clicked_point: point,
    coverage: { coverage_id: "coverage-1", case_pack_id: "case-pack-hold", inside_coverage: true, coverage_status: "measured_partial", radius_m: 450,
      bbox: [55.27, 25.19, 55.28, 25.2], geometry_hash: h("coverage"), calculation_crs: "EPSG:32640", proof_limit: "Synthetic bounded coverage only." },
    selected_object: candidate, candidates: [candidate], ambiguity_reasons: [],
    selection_receipt: { resolver_version: "point-to-object-resolver-v1", deterministic: true, selection_method: "point_in_polygon", input_hash: h("input"),
      candidate_set_hash: h("candidate-set"), candidate_count: 1, eligible_candidate_count: 1, search_radius_m: 70, boundary_tolerance_m: 0.5,
      ambiguity_margin_m: 2, selected_candidate_id: "candidate-1", snapshot_ids: [snapshotAnchor.snapshot_id] },
    rights_state: "cleared", snapshot_anchor: snapshotAnchor, resolved_at: "2026-08-31T17:41:47.000Z"
  };
  const metric = {
    metric_id: "metric-1", metric_hash: metricHash, category: "school", label: "Observed source feature count", value: 1, unit: "count", status: "observed",
    formula: "count(source_feature_ids)", distance_method: "utm_euclidean_point_to_point", source_feature_ids: ["feature-1"], snapshot_ids: [snapshotAnchor.snapshot_id],
    graph_version: null, calculated_at: "2026-08-31T17:41:47.000Z", proof_limit: "Source-scoped synthetic count only.",
    distance_receipt: { distance_id: "distance-1", distance_hash: h("distance"), value_m: 100, method: "utm_euclidean_point_to_point", origin_basis: "clicked_point",
      destination_basis: "source_feature_point", calculation_crs: "EPSG:32640", calculation_model: "wgs84_utm_transverse_mercator", library: "geoai_wgs84_utm", library_version: "1.0.0",
      source_snapshot_ids: [snapshotAnchor.snapshot_id], graph_version: null, calculated_at: "2026-08-31T17:41:47.000Z", input_geometry_hashes: [h("point"), h("feature")], fallback_note: null }
  };
  const context = {
    context_id: "context-1", context_hash: contextHash, quality: "partial", anchor_kind: "resolved_entity",
    anchor_id: `anchor_${h(canonicalJson({ anchor_kind: "resolved_entity", anchor_entity_id: "entity-1", anchor_position: point, resolution_hash: resolutionHash })).slice(0, 24)}`,
    anchor_hash: h(canonicalJson({ anchor_kind: "resolved_entity", anchor_entity_id: "entity-1", anchor_position: point, resolution_hash: resolutionHash })),
    anchor_resolution_hash: resolutionHash, anchor_entity_id: "entity-1", anchor_position: point, radius_m: 450, total_observed_count: 1, returned_count: 1, truncated: false, truncation_reason: null,
    category_summaries: [{ category: "school", status: "observed", observed_count: 1, returned_count: 1, nearest_feature_id: "feature-1", nearest_distance_m: 100,
      proof_limit: "Synthetic source-scoped context.", absence_receipt: null }],
    metrics: [metric], facilities: [{ feature_id: "feature-1", source_id: "synthetic/facility-1", category: "school", display_name: "Synthetic school", distance_m: 100,
      geometry_basis: "synthetic_point", feature_hash: h("feature"), authority_status: "open_context_not_official" }], missing_data: [],
    source_coverage: { case_pack_id: "case-pack-hold", complete_coverage_radius_m: 300, outer_evaluation_radius_m: 450, requested_window_fully_measured: false,
      status: "coverage_unknown", coverage_geometry_hash: resolution.coverage.geometry_hash, complete_geometry_hash: h("complete-coverage"), proof_limit: "Synthetic HOLD coverage." },
    snapshot_anchor: snapshotAnchor
  };
  const evidenceBundle = {
    bundle_id: "bundle-1", bundle_version: 1, bundle_hash: bundleHash, created_at: "2026-08-31T17:41:47.000Z", quality_status: "partial_open_context", rights_state: "cleared",
    entity_id: "entity-1", entity_hash: entityHash, geometry_hash: geometryHash, resolution_hash: resolutionHash, context_hash: contextHash, metric_hashes: [metricHash],
    snapshot_anchor: snapshotAnchor,
    geometry_receipt: { geometry_id: "geometry-1", geometry_hash: geometryHash, geometry_type: "Polygon", geometry_version: "geojson-wgs84-v1", byte_size: 512,
      source_feature_id: "synthetic/object-1", source_namespace: "SyntheticFixture", snapshot_id: snapshotAnchor.snapshot_id, origin: "source_vector", validation: "valid", rights_status: "cleared_for_experiment" },
    acquisition_receipt: { receipt_id: "acquisition-hold-v1", receipt_hash: h("acquisition"), source_id: "synthetic_fixture", kind: "acquisition", source_as_of: snapshotAnchor.source_as_of,
      retrieved_at: snapshotAnchor.retrieved_at, query_radius_m: 500, normalized_radius_m: 450, runtime_network_used: false },
    terms_receipt: { terms_receipt_id: "terms-hold-v1", terms_receipt_hash: h("terms"), license_id: "Synthetic-Non-Runtime-1.0", license_url: "urn:geoai:synthetic-non-runtime-fixture",
      rights_status: "cleared_for_experiment", attribution: "GeoAI synthetic non-runtime fixture", attribution_url: "urn:geoai:synthetic-non-runtime-fixture",
      allowed_operations: ["synthetic_contract_validation"], prohibited_claims: ["official parcel identity"] },
    evidence_items: [
      { evidence_id: "evidence-identity", kind: "source_identity", source_id: "synthetic/object-1", snapshot_id: snapshotAnchor.snapshot_id, field: "entity_id", value: "entity-1", proof_limit: "Synthetic identity fixture." },
      { evidence_id: "evidence-metric", kind: "calculated_metric", source_id: "synthetic/facility-1", snapshot_id: snapshotAnchor.snapshot_id, field: "metric-1", value: 1, proof_limit: "Synthetic metric fixture." }
    ], absence_receipts: [], missing_data: [], conflicts: [], limitations: ["Synthetic contract fixture only."]
  };
  const result = {
    resolution, context, evidence_bundle: evidenceBundle,
    narrative: { answer_status: "partially_answerable", headline: "Synthetic open-context fixture", summary: "Synthetic validation output.",
      claims: [{ claim_id: "claim-1", claim_type: "verified_fact", text: "The synthetic fixture contains one object.", evidence_ids: ["evidence-identity"], metric_ids: [], validation_required: true },
        { claim_id: "claim-2", claim_type: "deterministic_calculation", text: "One synthetic feature was counted.", evidence_ids: ["evidence-metric"], metric_ids: ["metric-1"], validation_required: true }],
      risks_and_constraints: ["Synthetic and non-runtime."], recommended_next_action: "Keep runtime disabled.", follow_ups: [], caveat: LIVE_POINT_CAVEAT,
      anchors: { entity_id: "entity-1", geometry_hash: geometryHash, evidence_bundle_hash: bundleHash, snapshot_hash: snapshotAnchor.snapshot_hash, metric_hashes: [metricHash] } },
    model_receipt: { state: "not_requested", model: null, projection_hash: null, attempt_count: 0, timeout_ms: 12000, max_output_tokens: 700, max_cost_usd: 0.1,
      tool_call_count: 0, store: false, fallback_used: false, output_mode: "deterministic_template",
      deterministic_parity: { entity_id: "entity-1", geometry_hash: geometryHash, evidence_bundle_hash: bundleHash, snapshot_hash: snapshotAnchor.snapshot_hash, metric_hashes: [metricHash] } },
    render_plan: { render_plan_id: "render-1", render_plan_hash: h("render"), components: [
      { component_id: "component-identity", component_type: "identity", data_reference: "entity-1" },
      { component_id: "component-context", component_type: "context", data_reference: "context-1" },
      { component_id: "component-evidence", component_type: "evidence", data_reference: "bundle-1" }
    ], highlight_geometry_id: "geometry-1", reference_ids: ["entity-1", "geometry-1", "context-1", "bundle-1"], accessibility_summary: "Synthetic labels and focus order are explicit." },
    governance: { claim_level: "open_context_screening", rights_state: "cleared", validation_state: "official_validation_required", privacy_state: "minimized_public_open_context",
      policy_version: "point-to-object-claim-policy-v1", caveat: LIVE_POINT_CAVEAT },
    conversation_anchors: { snapshot_id: snapshotAnchor.snapshot_id, snapshot_hash: snapshotAnchor.snapshot_hash, resolution_hash: resolutionHash, entity_id: "entity-1", geometry_hash: geometryHash,
      evidence_bundle_hash: bundleHash, metric_hashes: [metricHash], preserve_entity: true, preserve_bundle: true, refresh_requested: false }
  };
  const root = {
    schema_id: LIVE_POINT_SCHEMA_ID, profile_version: LIVE_POINT_PROFILE_VERSION, canonical_schema_version: "0.3.0", response_kind: "evidence_bundle_root", response_id: "response-1",
    generated_at: "2026-08-31T17:41:47.000Z", caveat: LIVE_POINT_CAVEAT,
    execution: { request_id: "request-1", trace_id: "trace-1", operation: "get_evidence_bundle", status: "partial", resolver_version: "point-to-object-resolver-v1",
      context_version: "point-to-object-context-v1", claim_policy_version: "point-to-object-claim-policy-v1", snapshot_ids: [snapshotAnchor.snapshot_id], warnings: [],
      stage_timings: [{ stage: "validate", duration_ms: 1 }], cache_state: "injected_synthetic_fixture", request_byte_count: 1024, response_byte_count: 0,
      geometry_byte_count: 512, caps: { ...LIVE_POINT_CAPS, modelTimeoutMs: 12000, modelMaxOutputTokens: 700, modelMaxCostUsd: 0.1 },
      rights_decision: "cleared_for_experiment", rights_state: "cleared", runtime_network_used: false, persistence_used: false },
    result
  };
  for (let index = 0; index < 4; index += 1) root.execution.response_byte_count = Buffer.byteLength(JSON.stringify(root));
  return root;
}

function semanticErrors(root: any): string[] {
  const errors: string[] = [];
  const execution = root.execution;
  const result = root.result;
  const resolution = result?.resolution;
  if (execution?.rights_decision !== "cleared_for_experiment" || execution?.rights_state !== "cleared" || result?.evidence_bundle?.rights_state !== "cleared" || result?.governance?.rights_state !== "cleared") errors.push("RIGHTS_CROSSWALK");
  if (execution?.response_byte_count !== Buffer.byteLength(JSON.stringify(root)) || execution?.response_byte_count > LIVE_POINT_CAPS.responseBytes) errors.push("RESPONSE_BYTES");
  if (execution?.geometry_byte_count > LIVE_POINT_CAPS.allInlineGeometryBytes || result?.evidence_bundle?.geometry_receipt?.byte_size > LIVE_POINT_CAPS.inlineGeometryBytes || execution?.geometry_byte_count !== (result?.evidence_bundle?.geometry_receipt?.byte_size ?? 0)) errors.push("GEOMETRY_BYTES");
  const candidates = resolution?.candidates ?? [];
  if (resolution?.status === "resolved") {
    if (candidates.length !== 1 || !resolution.selected_object || resolution.selected_object.candidate_id !== candidates[0]?.candidate_id || resolution.selection_receipt.selected_candidate_id !== candidates[0]?.candidate_id) errors.push("RESOLVED_MATRIX");
  }
  if (resolution?.status === "ambiguous" && (candidates.length < 2 || candidates.length > 20 || resolution.selected_object !== null || resolution.selection_receipt.selected_candidate_id !== null)) errors.push("AMBIGUOUS_MATRIX");
  if (["coordinate_context_only", "no_result", "outside_coverage"].includes(resolution?.status) && (candidates.length !== 0 || resolution.selected_object !== null)) errors.push("ABSTENTION_MATRIX");
  if (resolution?.selection_receipt?.candidate_count !== candidates.length || resolution?.selection_receipt?.eligible_candidate_count !== candidates.length) errors.push("CANDIDATE_COUNTS");
  const context = result?.context;
  if (context) {
    if (context.returned_count !== context.facilities.length || context.total_observed_count < context.returned_count) errors.push("CONTEXT_COUNTS");
    if (context.truncated !== (context.truncation_reason !== null)) errors.push("TRUNCATION_RECEIPT");
    const anchorCore = { anchor_kind: context.anchor_kind, anchor_entity_id: context.anchor_entity_id, anchor_position: context.anchor_position, resolution_hash: context.anchor_resolution_hash };
    const expectedAnchorHash = semanticHash(anchorCore);
    if (context.anchor_resolution_hash !== resolution.resolution_hash ||
        context.anchor_entity_id !== (context.anchor_kind === "resolved_entity" ? resolution.selected_object?.entity_id : null) ||
        canonicalJson(context.anchor_position) !== canonicalJson(resolution.clicked_point) ||
        context.anchor_hash !== expectedAnchorHash || context.anchor_id !== `anchor_${expectedAnchorHash.slice(0, 24)}`) errors.push("CONTEXT_ANCHOR");
    if (context.source_coverage.coverage_geometry_hash !== resolution.coverage.geometry_hash) errors.push("COVERAGE_REFERENCE");
  }
  const bundle = result?.evidence_bundle;
  if (bundle?.resolution_hash !== resolution?.resolution_hash || bundle?.context_hash !== context?.context_hash || bundle?.snapshot_anchor?.snapshot_hash !== resolution?.snapshot_anchor?.snapshot_hash) errors.push("BUNDLE_ANCHOR");
  if (bundle?.entity_id !== resolution?.selected_object?.entity_id || bundle?.entity_hash !== resolution?.selected_object?.entity_hash || bundle?.geometry_hash !== resolution?.selected_object?.geometry_hash) errors.push("ENTITY_ANCHOR");
  const metricHashes = (context?.metrics ?? []).map((metric: any) => metric.metric_hash);
  if (canonicalJson(bundle?.metric_hashes) !== canonicalJson(metricHashes) || canonicalJson(result?.conversation_anchors?.metric_hashes) !== canonicalJson(metricHashes)) errors.push("METRIC_HASH_ANCHOR");
  const evidenceIds = new Set((bundle?.evidence_items ?? []).map((item: any) => item.evidence_id));
  const metricIds = new Set((context?.metrics ?? []).map((item: any) => item.metric_id));
  for (const claim of result?.narrative?.claims ?? []) {
    if (claim.evidence_ids.some((id: string) => !evidenceIds.has(id)) || claim.metric_ids.some((id: string) => !metricIds.has(id))) errors.push("ORPHAN_CLAIM_REFERENCE");
  }
  const knownRenderIds = new Set([resolution?.selected_object?.entity_id, resolution?.selected_object?.geometry_id, context?.context_id, bundle?.bundle_id, ...evidenceIds, ...metricIds].filter(Boolean));
  for (const component of result?.render_plan?.components ?? []) if (!knownRenderIds.has(component.data_reference) || !result.render_plan.reference_ids.includes(component.data_reference)) errors.push("ORPHAN_RENDER_REFERENCE");
  const anchors = result?.conversation_anchors;
  if (anchors?.snapshot_hash !== bundle?.snapshot_anchor?.snapshot_hash || anchors?.resolution_hash !== resolution?.resolution_hash || anchors?.entity_id !== bundle?.entity_id || anchors?.geometry_hash !== bundle?.geometry_hash || anchors?.evidence_bundle_hash !== bundle?.bundle_hash) errors.push("CONVERSATION_ANCHOR");
  const modelParity = result?.model_receipt?.deterministic_parity;
  if (modelParity?.entity_id !== bundle?.entity_id || modelParity?.geometry_hash !== bundle?.geometry_hash || modelParity?.evidence_bundle_hash !== bundle?.bundle_hash || modelParity?.snapshot_hash !== bundle?.snapshot_anchor?.snapshot_hash) errors.push("MODEL_PARITY");
  const forbiddenKeys: string[] = [];
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(visit);
    for (const [key, nested] of Object.entries(value as JsonObject)) {
      if (/^(?:rank|score|preference|preferred|winner|decision_score)$/i.test(key)) forbiddenKeys.push(key);
      visit(nested);
    }
  };
  visit(root);
  if (forbiddenKeys.length > 0) errors.push("USER_VISIBLE_RANKING");
  return [...new Set(errors)];
}

function assertSemanticValidation(validateRoot: ReturnType<Ajv2020["compile"]>): void {
  const root = syntheticRoot();
  assert.equal(validateRoot(root), true, JSON.stringify(validateRoot.errors));
  assert.deepEqual(semanticErrors(root), []);

  const mutations: Array<[string, (candidate: any) => void, string]> = [
    ["rights", (candidate) => { candidate.result.governance.rights_state = "blocked"; }, "RIGHTS_CROSSWALK"],
    ["response cap", (candidate) => { candidate.execution.response_byte_count = LIVE_POINT_CAPS.responseBytes + 1; }, "RESPONSE_BYTES"],
    ["geometry cap", (candidate) => { candidate.execution.geometry_byte_count = LIVE_POINT_CAPS.allInlineGeometryBytes + 1; }, "GEOMETRY_BYTES"],
    ["selected mismatch", (candidate) => { candidate.result.resolution.selected_object.candidate_id = "other"; }, "RESOLVED_MATRIX"],
    ["context count", (candidate) => { candidate.result.context.returned_count = 2; }, "CONTEXT_COUNTS"],
    ["anchor", (candidate) => { candidate.result.context.anchor_hash = sha256("wrong"); }, "CONTEXT_ANCHOR"],
    ["anchor resolution", (candidate) => { candidate.result.context.anchor_resolution_hash = sha256("wrong"); }, "CONTEXT_ANCHOR"],
    ["bundle hash reference", (candidate) => { candidate.result.evidence_bundle.resolution_hash = sha256("wrong"); }, "BUNDLE_ANCHOR"],
    ["claim ref", (candidate) => { candidate.result.narrative.claims[0].evidence_ids = ["missing-evidence"]; }, "ORPHAN_CLAIM_REFERENCE"],
    ["render ref", (candidate) => { candidate.result.render_plan.components[0].data_reference = "missing"; }, "ORPHAN_RENDER_REFERENCE"],
    ["conversation", (candidate) => { candidate.result.conversation_anchors.snapshot_hash = sha256("wrong"); }, "CONVERSATION_ANCHOR"],
    ["ranking", (candidate) => { candidate.result.resolution.candidates[0].rank = 1; }, "USER_VISIBLE_RANKING"]
  ];
  for (const [label, mutate, expected] of mutations) {
    const candidate = clone(root);
    mutate(candidate);
    candidate.execution.response_byte_count = Buffer.byteLength(JSON.stringify(candidate));
    assert.ok(semanticErrors(candidate).includes(expected), `${label} mutation must fail with ${expected}.`);
  }

  const resolvedTwo = clone(root);
  resolvedTwo.result.resolution.candidates.push({ ...resolvedTwo.result.resolution.candidates[0], candidate_id: "candidate-2", entity_id: "entity-2" });
  resolvedTwo.result.resolution.selection_receipt.candidate_count = 2;
  resolvedTwo.result.resolution.selection_receipt.eligible_candidate_count = 2;
  assert.equal(validateRoot(resolvedTwo), false, "Resolved response must expose exactly one candidate.");

  const ambiguousOne = clone(root);
  ambiguousOne.result.resolution.status = "ambiguous";
  ambiguousOne.result.resolution.selected_object = null;
  ambiguousOne.result.resolution.ambiguity_reasons = ["Synthetic ambiguity"];
  ambiguousOne.result.resolution.selection_receipt.selected_candidate_id = null;
  assert.equal(validateRoot(ambiguousOne), false, "Ambiguous response requires 2–20 complete candidates.");
}

let coreHooksRegistered = false;

function registerCoreTypeScriptHooks(): void {
  if (coreHooksRegistered) return;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if ((specifier.startsWith("./") || specifier.startsWith("../")) &&
          !/\.[cm]?[jt]sx?$/.test(specifier)) {
        try {
          return nextResolve(`${specifier}.ts`, context);
        } catch {
          // Let Node produce the canonical resolution error below.
        }
      }
      return nextResolve(specifier, context);
    }
  });
  coreHooksRegistered = true;
}

async function importCore(moduleName: string): Promise<Record<string, any>> {
  registerCoreTypeScriptHooks();
  return await import(pathToFileURL(
    path.join(ROOT, "src/lib/point-to-object", `${moduleName}.ts`)
  ).href) as Record<string, any>;
}

function stabilizeResponseBytes(envelope: any): void {
  for (let index = 0; index < 8; index += 1) {
    const next = Buffer.byteLength(JSON.stringify(envelope), "utf8");
    if (envelope.execution.response_byte_count === next) return;
    envelope.execution.response_byte_count = next;
  }
  assert.equal(envelope.execution.response_byte_count, Buffer.byteLength(JSON.stringify(envelope), "utf8"));
}

function actualSuccessEnvelope(
  responseKind: "resolve_stage" | "evidence_bundle_root",
  operation: LivePointOperation,
  request: any,
  result: any,
  warnings: any[],
  stages: string[]
): any {
  const resolution = result.resolution;
  const outsideCoverage = resolution.status === "outside_coverage";
  const envelope = {
    schema_id: LIVE_POINT_SCHEMA_ID,
    profile_version: LIVE_POINT_PROFILE_VERSION,
    canonical_schema_version: "0.3.0",
    response_kind: responseKind,
    response_id: `response_${responseKind}_${resolution.resolution_hash.slice(0, 16)}`,
    generated_at: resolution.resolved_at,
    caveat: LIVE_POINT_CAVEAT,
    execution: {
      request_id: `request_${semanticHash(request).slice(0, 24)}`,
      trace_id: `trace_${semanticHash({ request, responseKind }).slice(0, 24)}`,
      operation,
      status: warnings.length > 0 || responseKind === "evidence_bundle_root" ? "partial" : "completed",
      resolver_version: "point-to-object-resolver-v1",
      context_version: "point-to-object-context-v1",
      claim_policy_version: "point-to-object-claim-policy-v1",
      snapshot_ids: outsideCoverage ? [] : [resolution.snapshot_anchor.snapshot_id],
      warnings,
      stage_timings: stages.map((stage) => ({ stage, duration_ms: 0 })),
      cache_state: outsideCoverage ? "coverage_registry_only" : "injected_synthetic_fixture",
      request_byte_count: Buffer.byteLength(JSON.stringify(request), "utf8"),
      response_byte_count: 0,
      geometry_byte_count: result.evidence_bundle?.geometry_receipt?.byte_size ?? 0,
      caps: {
        ...LIVE_POINT_CAPS,
        modelTimeoutMs: 12000,
        modelMaxOutputTokens: 700,
        modelMaxCostUsd: 0.1
      },
      rights_decision: outsideCoverage ? "not_evaluated" : "cleared_for_experiment",
      rights_state: outsideCoverage ? "not_evaluated" : "cleared",
      runtime_network_used: false,
      persistence_used: false
    },
    result
  };
  stabilizeResponseBytes(envelope);
  return envelope;
}

async function assertActualCorePipeline(validateRoot: ReturnType<Ajv2020["compile"]>): Promise<void> {
  const synthetic = await importCore("synthetic-repository");
  const resolver = await importCore("resolver");
  const compose = await importCore("compose");
  const assertionCore = await importCore("candidate-assertion-core");
  const semantics = await importCore("semantic-validator");
  const createRepository = synthetic.createSyntheticLivePointRepository as (options?: JsonObject) => any;
  const createRequest = synthetic.createSyntheticLivePointRequest as (overrides?: JsonObject) => any;
  const resolve = resolver.resolveLivePoint as (request: any, repository: any, dependencies?: JsonObject) => any;
  const composeDeterministically = compose.composeLivePointDeterministically as
    (request: any, repository: any, dependencies?: JsonObject) => any;
  const validateSemantics = semantics.validateLivePointSemantics as
    (value: unknown) => { ok: boolean; issues: unknown[] };
  const AssertionService = assertionCore.InMemoryCandidateAssertionService as new (options?: JsonObject) => any;

  const assertEnvelope = (envelope: any, label: string): void => {
    assert.equal(validateRoot(envelope), true, `${label} schema: ${JSON.stringify(validateRoot.errors)}`);
    const semantic = validateSemantics(envelope);
    assert.equal(semantic.ok, true, `${label} semantics: ${JSON.stringify(semantic.issues)}`);
  };

  const resolvedRequest = createRequest({ operation: "get_evidence_bundle" });
  const resolvedRun = composeDeterministically(resolvedRequest, createRepository({ objectCount: 1 }));
  const resolvedEnvelope = actualSuccessEnvelope(
    "evidence_bundle_root",
    "get_evidence_bundle",
    resolvedRequest,
    resolvedRun.result,
    resolvedRun.warnings,
    ["validate", "load_snapshot", "resolve", "context", "evidence", "narrative", "serialize"]
  );
  assertEnvelope(resolvedEnvelope, "actual resolved pipeline");
  const replayRun = composeDeterministically(resolvedRequest, createRepository({ objectCount: 1 }));
  assert.equal(
    semanticHash(resolvedRun.result),
    semanticHash(replayRun.result),
    "Identical synthetic input and versions must replay to an identical deterministic result."
  );

  const assertionService = new AssertionService();
  const ambiguousRequest = createRequest({ operation: "resolve_entity" });
  const ambiguousRun = resolve(ambiguousRequest, createRepository({ objectCount: 2 }), {
    tenantScope: "synthetic_test_tenant",
    assertionService
  });
  const ambiguousEnvelope = actualSuccessEnvelope(
    "resolve_stage",
    "resolve_entity",
    ambiguousRequest,
    { resolution: ambiguousRun.resolution },
    ambiguousRun.warnings,
    ["validate", "load_snapshot", "resolve", "serialize"]
  );
  assertEnvelope(ambiguousEnvelope, "actual ambiguity pipeline");
  assert.equal(ambiguousRun.resolution.candidates.length, 2);
  const anchorMutationToken = ambiguousRun.resolution.candidates[0].candidate_assertion.token;
  assert.throws(
    () => resolve(createRequest({
      operation: "resolve_entity",
      candidate_assertion: { token: anchorMutationToken },
      anchors: {
        snapshot_id: "synthetic-snapshot-v1",
        snapshot_hash: sha256("mutated-anchor"),
        resolution_hash: null,
        entity_id: null,
        geometry_hash: null,
        evidence_bundle_hash: null,
        metric_hashes: [],
        preserve_entity: false,
        preserve_bundle: false,
        refresh_requested: true
      }
    }), createRepository({ objectCount: 2 }), {
      tenantScope: "synthetic_test_tenant",
      assertionService
    }),
    (error: any) => error?.code === "CANDIDATE_ASSERTION_INVALID",
    "Chooser assertions must bind the complete request anchors, including refresh intent."
  );
  const selectedToken = ambiguousRun.resolution.candidates[1].candidate_assertion.token;
  const selectedRequest = createRequest({
    operation: "resolve_entity",
    candidate_assertion: { token: selectedToken }
  });
  const selectedRun = resolve(selectedRequest, createRepository({ objectCount: 2 }), {
    tenantScope: "synthetic_test_tenant",
    assertionService
  });
  assert.equal(selectedRun.resolution.status, "resolved");
  assert.equal(selectedRun.resolution.candidates.length, 1, "Chooser success must emit only the selected candidate.");
  assert.equal(selectedRun.resolution.selected_object.candidate_id, "synthetic-object-002");
  assert.equal(selectedRun.resolution.selection_receipt.eligible_candidate_count, 2);
  assertEnvelope(actualSuccessEnvelope(
    "resolve_stage",
    "resolve_entity",
    selectedRequest,
    { resolution: selectedRun.resolution },
    selectedRun.warnings,
    ["validate", "load_snapshot", "resolve", "serialize"]
  ), "actual chooser pipeline");
  assert.throws(
    () => resolve(selectedRequest, createRepository({ objectCount: 2 }), {
      tenantScope: "synthetic_test_tenant",
      assertionService
    }),
    (error: any) => error?.code === "CANDIDATE_ASSERTION_INVALID",
    "Consumed chooser assertion must fail closed on replay."
  );

  const crossTenantService = new AssertionService();
  const crossTenantAmbiguity = resolve(ambiguousRequest, createRepository({ objectCount: 2 }), {
    tenantScope: "tenant_alpha",
    assertionService: crossTenantService
  });
  const crossTenantRequest = createRequest({
    operation: "resolve_entity",
    candidate_assertion: { token: crossTenantAmbiguity.resolution.candidates[0].candidate_assertion.token }
  });
  assert.throws(
    () => resolve(crossTenantRequest, createRepository({ objectCount: 2 }), {
      tenantScope: "tenant_beta",
      assertionService: crossTenantService
    }),
    (error: any) => error?.code === "ACCESS_DENIED",
    "Cross-tenant chooser assertion must fail with non-enumerating access denial."
  );

  const noResultRequest = createRequest({ operation: "resolve_entity" });
  const noResultRun = resolve(noResultRequest, createRepository({ objectCount: 0, includeContext: false }));
  assert.equal(noResultRun.resolution.status, "no_result");
  assertEnvelope(actualSuccessEnvelope(
    "resolve_stage",
    "resolve_entity",
    noResultRequest,
    { resolution: noResultRun.resolution },
    noResultRun.warnings,
    ["validate", "load_snapshot", "resolve", "serialize"]
  ), "actual no-result pipeline");

  const coordinateRequest = createRequest({ operation: "get_evidence_bundle" });
  const coordinateRun = composeDeterministically(
    coordinateRequest,
    createRepository({ objectCount: 0, includeContext: true })
  );
  assert.equal(coordinateRun.result.resolution.status, "coordinate_context_only");
  assertEnvelope(actualSuccessEnvelope(
    "evidence_bundle_root",
    "get_evidence_bundle",
    coordinateRequest,
    coordinateRun.result,
    coordinateRun.warnings,
    ["validate", "load_snapshot", "resolve", "context", "evidence", "narrative", "serialize"]
  ), "actual coordinate-context pipeline");

  const outsideRepository = createRepository({ objectCount: 1, rightsDecision: "unknown" });
  outsideRepository.snapshot.casePacks[0].objects[0].sourceNamespace = "OpenStreetMap";
  const outsideRequest = createRequest({
    operation: "resolve_entity",
    input: {
      kind: "point",
      clicked_point: {
        longitude: 0,
        latitude: 0,
        crs: "EPSG:4326",
        coordinate_order_confirmed: true
      }
    }
  });
  const outsideRun = resolve(outsideRequest, outsideRepository);
  assert.equal(outsideRun.resolution.status, "outside_coverage");
  assert.equal(outsideRun.resolution.rights_state, "not_evaluated");
  assert.equal(outsideRun.resolution.snapshot_anchor, null);
  assertEnvelope(actualSuccessEnvelope(
    "resolve_stage",
    "resolve_entity",
    outsideRequest,
    { resolution: outsideRun.resolution },
    outsideRun.warnings,
    ["validate", "resolve", "serialize"]
  ), "actual outside-coverage zero-source pipeline");

  assert.throws(
    () => resolve(ambiguousRequest, createRepository({ objectCount: 1, rightsDecision: "unknown" })),
    (error: any) => error?.code === "RIGHTS_UNKNOWN",
    "In-coverage source access must fail closed when rights are unknown."
  );

  let overflow: any = null;
  try {
    resolve(ambiguousRequest, createRepository({ objectCount: 21 }), {
      tenantScope: "synthetic_test_tenant",
      assertionService: new AssertionService()
    });
  } catch (error) {
    overflow = error;
  }
  assert.equal(overflow?.code, "CANDIDATE_SET_OVERFLOW");
  assert.equal(overflow?.status, "blocked");
  assert.deepEqual(overflow?.details, {
    eligible_count: 21,
    eligible_count_withheld_reason: null,
    refinement_action: "submit_more_precise_point_or_zoom"
  });
  const overflowEnvelope = {
    schema_id: LIVE_POINT_SCHEMA_ID,
    profile_version: LIVE_POINT_PROFILE_VERSION,
    response_kind: "error",
    response_id: "response_overflow",
    generated_at: "2026-08-31T17:41:47.000Z",
    caveat: LIVE_POINT_CAVEAT,
    status: overflow.status,
    errors: [{
      code: overflow.code,
      message: overflow.message,
      retryable: overflow.retryable,
      ...overflow.details
    }]
  };
  assert.equal(validateRoot(overflowEnvelope), true, JSON.stringify(validateRoot.errors));
}

async function assertActualPipeline(
  validateRoot: ReturnType<Ajv2020["compile"]>,
  validateCandidateAssertionReceipt: ReturnType<Ajv2020["compile"]>
): Promise<void> {
  const [synthetic, resolver, contextModule, evidenceModule, composeModule, semanticModule,
    assertionModule] = await Promise.all([
    importCore("synthetic-repository"),
    importCore("resolver"),
    importCore("context"),
    importCore("evidence"),
    importCore("compose"),
    importCore("semantic-validator"),
    importCore("candidate-assertion-core")
  ]);
  const createRepository = synthetic.createSyntheticLivePointRepository as (options?: any) => any;
  const createRequest = synthetic.createSyntheticLivePointRequest as (overrides?: any) => any;
  const validateSemantics = semanticModule.validateLivePointSemantics as (value: unknown) => {
    ok: boolean;
    issues: Array<{ code: string }>;
  };
  const semanticCodes = (value: unknown) => validateSemantics(value).issues.map((issue) => issue.code);
  const dependencies = { tenantScope: "tenant_alpha" };

  const request = createRequest({ operation: "get_evidence_bundle" });
  const repository = createRepository({ objectCount: 1, includeContext: true });
  const resolved = resolver.resolveLivePoint(request, repository, dependencies);
  const context = contextModule.buildLivePointContext(request, resolved.resolution, repository);
  const evidence = evidenceModule.buildLivePointEvidenceBundle(resolved.resolution, context.context, repository);
  const composed = composeModule.composeLivePointDeterministically(request, repository, dependencies);
  assert.deepEqual(composed.result.resolution, resolved.resolution, "Compose must reuse the exact resolver contract.");
  assert.deepEqual(composed.result.context, context.context, "Compose must reuse the exact context contract.");
  assert.deepEqual(composed.result.evidence_bundle, evidence, "Compose must reuse the exact evidence contract.");
  assert.equal(composed.result.resolution.candidates.length, 1);
  assert.equal(composed.result.resolution.candidates[0].source_namespace, "SyntheticFixture");
  const root = actualSuccessEnvelope(
    "evidence_bundle_root",
    "get_evidence_bundle",
    request,
    composed.result,
    composed.warnings,
    ["validate", "load_snapshot", "resolve", "context", "evidence", "narrative", "serialize"]
  );
  assert.equal(validateRoot(root), true, JSON.stringify(validateRoot.errors));
  assert.deepEqual(validateSemantics(root), { ok: true, issues: [] });

  const geometry = { type: "Point", coordinates: [55.274376, 25.197197] };
  const geometryArtifact = {
    schema_id: LIVE_POINT_SCHEMA_ID,
    profile_version: LIVE_POINT_PROFILE_VERSION,
    canonical_schema_version: "0.3.0",
    response_kind: "geometry_artifact",
    response_id: "geometry_artifact_synthetic_001",
    generated_at: "2026-08-31T17:41:47.000Z",
    caveat: LIVE_POINT_CAVEAT,
    result: {
      geometry_id: "synthetic-geometry-001",
      geometry_hash: semanticHash(geometry),
      geometry_version: "geojson-wgs84-v1",
      geometry
    }
  };
  assert.equal(validateRoot(geometryArtifact), true, JSON.stringify(validateRoot.errors));
  assert.deepEqual(validateSemantics(geometryArtifact), { ok: true, issues: [] });
  const wrongGeometryHash = clone(geometryArtifact);
  wrongGeometryHash.result.geometry_hash = sha256("wrong-geometry");
  assert.ok(semanticCodes(wrongGeometryHash).includes("HASH_INTEGRITY"),
    "Geometry artifact hash mismatch must fail semantic validation.");
  const oversizedGeometryArtifact: any = clone(geometryArtifact);
  oversizedGeometryArtifact.result.geometry = {
    type: "LineString",
    coordinates: Array.from({ length: 10_000 }, (_, index) => [
      55.12345678901234 + index * 0.000000000001,
      25.12345678901234 + index * 0.000000000001
    ])
  };
  oversizedGeometryArtifact.result.geometry_hash = semanticHash(oversizedGeometryArtifact.result.geometry);
  assert.ok(
    Buffer.byteLength(JSON.stringify(oversizedGeometryArtifact.result.geometry), "utf8") >
      LIVE_POINT_CAPS.inlineGeometryBytes,
    "Oversized geometry fixture must exceed the exact inline cap."
  );
  assert.ok(semanticCodes(oversizedGeometryArtifact).includes("GEOMETRY_BYTES"),
    "Oversized geometry artifact must fail semantic validation.");

  const mutations: Array<[string, (candidate: any) => void, string]> = [
    ["rights", (candidate) => { candidate.result.governance.rights_state = "blocked"; }, "RIGHTS_CROSSWALK"],
    ["geometry cap", (candidate) => { candidate.execution.geometry_byte_count = LIVE_POINT_CAPS.allInlineGeometryBytes + 1; }, "GEOMETRY_BYTES"],
    ["selected mismatch", (candidate) => { candidate.result.resolution.selected_object.candidate_id = "other"; }, "RESOLVED_MATRIX"],
    ["resolved selection method", (candidate) => { candidate.result.resolution.selection_receipt.selection_method = "none"; }, "RESOLVED_MATRIX"],
    ["context count", (candidate) => { candidate.result.context.returned_count += 1; }, "CONTEXT_COUNTS"],
    ["anchor", (candidate) => { candidate.result.context.anchor_hash = sha256("wrong"); }, "CONTEXT_ANCHOR"],
    ["coordinated metric hash tamper", (candidate) => {
      const tamperedHash = sha256("coordinated-metric-tamper");
      candidate.result.context.metrics[0].metric_hash = tamperedHash;
      candidate.result.evidence_bundle.metric_hashes[0] = tamperedHash;
      candidate.result.narrative.anchors.metric_hashes[0] = tamperedHash;
      candidate.result.model_receipt.deterministic_parity.metric_hashes[0] = tamperedHash;
      candidate.result.conversation_anchors.metric_hashes[0] = tamperedHash;
    }, "HASH_INTEGRITY"],
    ["bundle content hash", (candidate) => { candidate.result.evidence_bundle.limitations[0] = "Tampered limitation."; }, "HASH_INTEGRITY"],
    ["render content hash", (candidate) => { candidate.result.render_plan.accessibility_summary = "Tampered summary."; }, "HASH_INTEGRITY"],
    ["snapshot lineage", (candidate) => {
      candidate.result.context.snapshot_anchor = {
        ...candidate.result.context.snapshot_anchor,
        snapshot_id: "tampered-snapshot"
      };
      candidate.result.evidence_bundle.snapshot_anchor = {
        ...candidate.result.evidence_bundle.snapshot_anchor,
        snapshot_id: "tampered-snapshot"
      };
      candidate.result.conversation_anchors.snapshot_id = "tampered-snapshot";
    }, "CONTEXT_ANCHOR"],
    ["acquisition lineage", (candidate) => {
      candidate.result.evidence_bundle.acquisition_receipt.receipt_id = "tampered-acquisition";
    }, "SNAPSHOT_ANCHOR"],
    ["bundle reference", (candidate) => { candidate.result.evidence_bundle.resolution_hash = sha256("wrong"); }, "BUNDLE_ANCHOR"],
    ["claim reference", (candidate) => { candidate.result.narrative.claims[0].evidence_ids = ["missing-evidence"]; }, "ORPHAN_CLAIM_REFERENCE"],
    ["render reference", (candidate) => { candidate.result.render_plan.components[0].data_reference = "missing"; }, "ORPHAN_RENDER_REFERENCE"],
    ["conversation", (candidate) => { candidate.result.conversation_anchors.snapshot_hash = sha256("wrong"); }, "CONVERSATION_ANCHOR"],
    ["ranking", (candidate) => { candidate.result.resolution.candidates[0].rank = 1; }, "USER_VISIBLE_RANKING"]
  ];
  for (const [label, mutate, expected] of mutations) {
    const candidate = clone(root);
    mutate(candidate);
    stabilizeResponseBytes(candidate);
    assert.ok(semanticCodes(candidate).includes(expected), `${label} must fail with ${expected}.`);
  }

  const outsideRequest = createRequest({
    operation: "resolve_entity",
    input: {
      kind: "point",
      clicked_point: { longitude: 10, latitude: 10, crs: "EPSG:4326", coordinate_order_confirmed: true }
    }
  });
  const blockedRightsRepository = createRepository({ objectCount: 1, rightsDecision: "blocked" });
  blockedRightsRepository.snapshot.casePacks[0].objects[0].sourceNamespace = "OpenStreetMap";
  const outside = resolver.resolveLivePoint(outsideRequest, blockedRightsRepository, dependencies);
  assert.equal(outside.resolution.status, "outside_coverage");
  assert.equal(outside.resolution.snapshot_anchor, null);
  assert.equal(outside.resolution.rights_state, "not_evaluated");
  assert.deepEqual(outside.resolution.selection_receipt.snapshot_ids, []);
  const outsideEnvelope = actualSuccessEnvelope(
    "resolve_stage",
    "resolve_entity",
    outsideRequest,
    { resolution: outside.resolution },
    outside.warnings,
    ["validate", "resolve", "serialize"]
  );
  assert.equal(validateRoot(outsideEnvelope), true, JSON.stringify(validateRoot.errors));
  assert.deepEqual(validateSemantics(outsideEnvelope), { ok: true, issues: [] });
  assert.deepEqual(outsideEnvelope.execution.snapshot_ids, []);
  assert.equal(outsideEnvelope.execution.rights_state, "not_evaluated");
  const outsideWrongMethod = clone(outsideEnvelope);
  outsideWrongMethod.result.resolution.selection_receipt.selection_method = "point_in_polygon";
  stabilizeResponseBytes(outsideWrongMethod);
  assert.ok(semanticCodes(outsideWrongMethod).includes("ABSTENTION_MATRIX"),
    "Outside coverage must reject a non-none selection method.");
  const outsideContext = contextModule.buildLivePointContext(
    { ...outsideRequest, operation: "get_context" },
    outside.resolution,
    blockedRightsRepository
  );
  assert.deepEqual(outsideContext, { context: null, warnings: [] },
    "Outside coverage context must stop before source and rights validation.");
  assert.throws(
    () => evidenceModule.buildLivePointEvidenceBundle(outside.resolution, null, blockedRightsRepository),
    (error: any) => error?.code === "CONTRACT_VALIDATION_FAILED",
    "Outside coverage evidence composition must fail before source and rights validation."
  );
  assert.throws(
    () => composeModule.composeLivePointDeterministically(
      { ...outsideRequest, operation: "get_evidence_bundle" },
      blockedRightsRepository,
      dependencies
    ),
    (error: any) => error?.code === "CONTRACT_VALIDATION_FAILED",
    "Outside coverage compose must stop without traversing source records."
  );

  const noResultRequest = createRequest({ operation: "resolve_entity" });
  const noResultRepository = createRepository({ objectCount: 0, includeContext: false });
  const noResult = resolver.resolveLivePoint(noResultRequest, noResultRepository, dependencies);
  assert.equal(noResult.resolution.status, "no_result");
  const noResultEnvelope = actualSuccessEnvelope(
    "resolve_stage",
    "resolve_entity",
    noResultRequest,
    { resolution: noResult.resolution },
    noResult.warnings,
    ["validate", "load_snapshot", "resolve", "serialize"]
  );
  assert.equal(validateRoot(noResultEnvelope), true, JSON.stringify(validateRoot.errors));
  assert.deepEqual(validateSemantics(noResultEnvelope), { ok: true, issues: [] });
  const noResultWrongMethod = clone(noResultEnvelope);
  noResultWrongMethod.result.resolution.selection_receipt.selection_method = "nearest_feature";
  stabilizeResponseBytes(noResultWrongMethod);
  assert.ok(semanticCodes(noResultWrongMethod).includes("ABSTENTION_MATRIX"),
    "No-result must reject a non-none selection method.");

  const coordinateRequest = createRequest({ operation: "get_evidence_bundle" });
  const coordinateRepository = createRepository({ objectCount: 0, includeContext: true });
  const coordinate = composeModule.composeLivePointDeterministically(
    coordinateRequest,
    coordinateRepository,
    dependencies
  );
  assert.equal(coordinate.result.resolution.status, "coordinate_context_only");
  assert.ok(coordinate.result.narrative.follow_ups.every((followUp: any) => followUp.preserve_entity === false),
    "Coordinate-only follow-ups must not claim a preserved entity anchor.");
  const coordinateEnvelope = actualSuccessEnvelope(
    "evidence_bundle_root",
    "get_evidence_bundle",
    coordinateRequest,
    coordinate.result,
    coordinate.warnings,
    ["validate", "load_snapshot", "resolve", "context", "evidence", "narrative", "serialize"]
  );
  assert.equal(validateRoot(coordinateEnvelope), true, JSON.stringify(validateRoot.errors));
  assert.deepEqual(validateSemantics(coordinateEnvelope), { ok: true, issues: [] });
  const coordinateWrongMethod = clone(coordinateEnvelope);
  coordinateWrongMethod.result.resolution.selection_receipt.selection_method = "none";
  stabilizeResponseBytes(coordinateWrongMethod);
  assert.ok(semanticCodes(coordinateWrongMethod).includes("ABSTENTION_MATRIX"),
    "Coordinate context must require the coordinate_only selection method.");

  let nonceIndex = 0;
  const assertionService = new assertionModule.InMemoryCandidateAssertionService({
    now: () => Date.parse("2026-08-31T17:41:47.000Z"),
    signingKey: Buffer.alloc(32, 7),
    createNonce: () => Buffer.alloc(32, ++nonceIndex)
  });
  const chooserRepository = createRepository({ objectCount: 2, includeContext: true });
  const chooserBaseRequest = createRequest({ operation: "get_evidence_bundle" });
  const ambiguousComposed = composeModule.composeLivePointDeterministically(
    chooserBaseRequest,
    chooserRepository,
    { tenantScope: "tenant_alpha", assertionService }
  );
  assert.equal(ambiguousComposed.result.resolution.status, "ambiguous");
  assert.ok(ambiguousComposed.result.narrative.follow_ups.every((followUp: any) => followUp.preserve_entity === false),
    "Ambiguous follow-ups must not claim a preserved entity anchor.");
  const ambiguousEnvelope = actualSuccessEnvelope(
    "evidence_bundle_root",
    "get_evidence_bundle",
    chooserBaseRequest,
    ambiguousComposed.result,
    ambiguousComposed.warnings,
    ["validate", "load_snapshot", "resolve", "context", "evidence", "narrative", "serialize"]
  );
  assert.deepEqual(validateSemantics(ambiguousEnvelope), { ok: true, issues: [] });
  const ambiguousWrongMethod = clone(ambiguousEnvelope);
  ambiguousWrongMethod.result.resolution.selection_receipt.selection_method = "point_in_polygon";
  stabilizeResponseBytes(ambiguousWrongMethod);
  assert.ok(semanticCodes(ambiguousWrongMethod).includes("AMBIGUOUS_MATRIX"),
    "Ambiguity must require the none selection method until assertion consumption.");
  const ambiguous = resolver.resolveLivePoint(chooserBaseRequest, chooserRepository, {
    tenantScope: "tenant_alpha",
    assertionService
  });
  assert.equal(ambiguous.resolution.status, "ambiguous");
  assert.equal(ambiguous.resolution.candidates.length, 2);
  for (const candidate of ambiguous.resolution.candidates) {
    assert.equal(candidate.source_namespace, "SyntheticFixture");
    assert.ok(candidate.candidate_assertion);
    assert.equal("tenant_scope" in candidate.candidate_assertion, false, "Raw tenant scope must never be emitted.");
    assert.equal(candidate.candidate_assertion.intended_scope, "candidate_selection");
    assert.equal(
      validateCandidateAssertionReceipt(candidate.candidate_assertion),
      true,
      JSON.stringify(validateCandidateAssertionReceipt.errors)
    );
  }
  const chosen = ambiguous.resolution.candidates[1];
  const chooserRequest = {
    ...chooserBaseRequest,
    candidate_assertion: { token: chosen.candidate_assertion.token }
  };
  const chooser = composeModule.composeLivePointDeterministically(chooserRequest, chooserRepository, {
    tenantScope: "tenant_alpha",
    assertionService
  });
  assert.equal(chooser.result.resolution.status, "resolved");
  assert.equal(chooser.result.resolution.candidates.length, 1);
  assert.equal(chooser.result.resolution.selected_object.candidate_id, chosen.candidate_id);
  assert.equal(chooser.result.resolution.selection_receipt.candidate_count, 2);
  assert.equal(chooser.result.resolution.selection_receipt.eligible_candidate_count, 2);
  assert.equal(
    chooser.result.resolution.selection_receipt.candidate_set_hash,
    ambiguous.resolution.selection_receipt.candidate_set_hash
  );
  assert.equal(chooser.result.resolution.selected_object.candidate_assertion, null);
  assert.ok(chooser.result.narrative.follow_ups.every((followUp: any) => followUp.preserve_entity === true),
    "Resolved follow-ups must preserve the selected entity anchor.");
  const chooserEnvelope = actualSuccessEnvelope(
    "evidence_bundle_root",
    "get_evidence_bundle",
    chooserRequest,
    chooser.result,
    chooser.warnings,
    ["validate", "load_snapshot", "resolve", "context", "evidence", "narrative", "serialize"]
  );
  assert.equal(validateRoot(chooserEnvelope), true, JSON.stringify(validateRoot.errors));
  assert.deepEqual(validateSemantics(chooserEnvelope), { ok: true, issues: [] });

  const overflowRepository = createRepository({ objectCount: 21, includeContext: false });
  const overflowRequest = createRequest({ operation: "resolve_entity" });
  let overflow: any = null;
  try {
    resolver.resolveLivePoint(overflowRequest, overflowRepository, dependencies);
  } catch (error) {
    overflow = error;
  }
  assert.equal(overflow?.code, "CANDIDATE_SET_OVERFLOW");
  assert.deepEqual(overflow?.details, {
    eligible_count: 21,
    eligible_count_withheld_reason: null,
    refinement_action: "submit_more_precise_point_or_zoom"
  });
  const overflowEnvelope = {
    schema_id: LIVE_POINT_SCHEMA_ID,
    profile_version: LIVE_POINT_PROFILE_VERSION,
    response_kind: "error",
    response_id: "response_candidate_set_overflow",
    generated_at: "2026-08-31T17:41:47.000Z",
    caveat: LIVE_POINT_CAVEAT,
    status: overflow.status,
    errors: [{
      code: overflow.code,
      message: overflow.message,
      retryable: overflow.retryable,
      ...overflow.details
    }]
  };
  assert.equal(validateRoot(overflowEnvelope), true, JSON.stringify(validateRoot.errors));

  const tamperedContextRepository = createRepository({ objectCount: 1, includeContext: true });
  tamperedContextRepository.snapshot.casePacks[0].contextFeatures[0].sourceTags.category = "tampered";
  assert.throws(
    () => resolver.resolveLivePoint(request, tamperedContextRepository, dependencies),
    (error: any) => error?.code === "SNAPSHOT_HASH_MISMATCH",
    "Synthetic context-feature tampering must fail before resolution output."
  );
  const tamperedReceiptIndexRepository = createRepository({ objectCount: 1, includeContext: true });
  tamperedReceiptIndexRepository.sourceReceiptsById.clear();
  assert.throws(
    () => resolver.resolveLivePoint(request, tamperedReceiptIndexRepository, dependencies),
    (error: any) => error?.code === "SNAPSHOT_CORRUPT",
    "Synthetic source-receipt index tampering must fail before resolution output."
  );
}

async function assertRepositoryAuthorityQuarantine(): Promise<void> {
  const [repositoryAuthorityModule, syntheticModule] = await Promise.all([
    importCore("repository-core"),
    importCore("synthetic-repository")
  ]);
  const syntheticRepository = syntheticModule.createSyntheticLivePointRepository();
  const explicitlyQuarantined = { ...syntheticRepository, fixtureAuthority: "quarantined_non_runtime" };
  assert.throws(
    () => repositoryAuthorityModule.assertE1CoverageRegistryAuthority(explicitlyQuarantined),
    (error: any) => error?.code === "PREVIEW_DISABLED",
    "No quarantined repository may become E1 authority even when its internal records are otherwise valid."
  );
}

function assertStaticBoundaries(): void {
  for (const heldSurface of [
    "app/prototypes/live-point",
    "app/api/prototypes/live-point"
  ]) {
    assert.equal(collectFiles(path.join(ROOT, heldSurface)).length, 0,
      `${heldSurface} must contain no active files while UI/API integration is held.`);
  }

  const candidateSurfaceAllowlist = new Set([
    "app/prototype/point-to-object/page.tsx",
    "app/prototype/point-to-object/analysis/page.tsx",
    "app/prototype/point-to-object/source-offer/page.tsx",
    "app/api/prototype/point-to-object/ai/route.ts",
    "app/api/prototype/point-to-object/analysis-runs/route.ts",
    "app/api/prototype/point-to-object/area-context/route.ts",
    "app/api/prototype/point-to-object/cases/route.ts",
    "app/api/prototype/point-to-object/context/route.ts",
    "app/api/prototype/point-to-object/create/route.ts",
    "app/api/prototype/point-to-object/find/route.ts",
    "app/api/prototype/point-to-object/resolve/route.ts",
    "app/api/prototype/point-to-object/search/route.ts",
    "app/api/prototype/point-to-object/suggest/route.ts",
    "components/point-to-object/analysis-client.tsx",
    "components/point-to-object/create-panel.tsx",
    "components/point-to-object/live-object-map.tsx",
    "components/point-to-object/live-session.ts",
    "components/point-to-object/live-types.ts",
    "components/point-to-object/locale-provider.tsx",
    "components/point-to-object/prototype-client-v5.tsx",
    "components/point-to-object/prototype-client.tsx",
    "components/point-to-object/prototype-header.tsx"
  ]);
  const candidateSurfaceFiles = [
    ...collectFiles(path.join(ROOT, "app/prototype/point-to-object")),
    ...collectFiles(path.join(ROOT, "app/api/prototype/point-to-object")),
    ...collectFiles(path.join(ROOT, "components/point-to-object"))
  ].filter((entry) => /\.(?:ts|tsx)$/.test(entry));
  assert.deepEqual(
    candidateSurfaceFiles.map((filePath) => path.relative(ROOT, filePath).split(path.sep).join("/")).sort(),
    [...candidateSurfaceAllowlist].sort(),
    "Only the exact isolated point-to-object Candidate UI/API files are allowed."
  );
  const pointObjectIntegrationAllowlist = new Set([
    ...candidateSurfaceAllowlist,
    "app/layout.tsx",
    "app/profile/page.tsx",
    "components/auth/profile-panel.tsx"
  ]);

  const prototypeUiFiles = candidateSurfaceFiles.filter((filePath) =>
    filePath.includes(`${path.sep}app${path.sep}prototype${path.sep}`) ||
    filePath.includes(`${path.sep}components${path.sep}point-to-object${path.sep}`)
  );
  const prototypeUiSource = prototypeUiFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n");
  const prototypeI18nSource = readFileSync(path.join(ROOT, "src/lib/prototype/point-to-object-i18n.ts"), "utf8");
  for (const removedUserFacingLabel of [
    "Preview · Not Released",
    "Point-to-object Candidate",
    "Source Conflict",
    "Source Refresh Unknown",
    "Evidence-bound, never the selector",
    "Information still needed",
    "Select map centre",
    'type="checkbox"'
  ]) {
    assert.equal(prototypeUiSource.includes(removedUserFacingLabel), false,
      `Removed prototype UI label/control returned: ${removedUserFacingLabel}.`);
  }
  assert.match(prototypeUiSource, /OpenFreeMap/, "The prototype must use a live OpenFreeMap surface.");
  assert.match(prototypeUiSource, /\/prototype\/point-to-object\/analysis/, "The prototype must navigate to a dedicated analysis page.");
  assert.match(`${prototypeUiSource}\n${prototypeI18nSource}`, /Back to map/, "The analysis page must return to the live map.");
  assert.match(`${prototypeUiSource}\n${prototypeI18nSource}`, /Run focused analysis/, "The analysis page must support a custom follow-up.");
  const analysisClientSource = readFileSync(path.join(ROOT, "components/point-to-object/analysis-client.tsx"), "utf8");
  const prototypeClientSource = ["prototype-client.tsx", "prototype-client-v5.tsx"]
    .map((name) => readFileSync(path.join(ROOT, "components/point-to-object", name), "utf8")).join("\n");
  const liveMapSource = readFileSync(path.join(ROOT, "components/point-to-object/live-object-map.tsx"), "utf8");
  const contextRouteSource = readFileSync(path.join(ROOT, "app/api/prototype/point-to-object/context/route.ts"), "utf8");
  assert.equal(analysisClientSource.includes("osmFeatureId"), false,
    "The browser must not promote vector-tile feature IDs into OSM object identities.");
  assert.match(prototypeClientSource, /\/api\/prototype\/point-to-object\/context/,
    "A direct selection must resolve live object context through the isolated route.");
  assert.match(prototypeClientSource, /AbortController/,
    "A superseded click must cancel its browser context request.");
  assert.match(prototypeClientSource, /contextRequestId\.current/,
    "A stale context response must be unable to overwrite a newer selection.");
  assert.match(prototypeClientSource, /setTimeout\([\s\S]*250/,
    "Direct-click enrichment must debounce rapid exploratory clicks.");
  assert.match(prototypeClientSource, /setSessionReady\(true\)[\s\S]*sessionReady \? \([\s\S]*<LiveObjectMap/,
    "The map must mount only after browser-session restoration so a reload cannot overwrite the saved viewport.");
  assert.match(contextRouteSource, /previewRuntimeAllowed\(\)/,
    "The live context route must remain Preview-gated.");
  assert.equal(contextRouteSource.includes("frozen-osm-repository"), false,
    "The live context route must not trace frozen case data.");
  assert.equal(readFileSync(path.join(ROOT, "app/api/prototype/point-to-object/ai/route.ts"), "utf8").includes("frozen-osm-repository"), false,
    "The live AI route must not trace frozen case data.");
  assert.match(analysisClientSource, /expectedSourceFeatureId/,
    "The browser must bind analysis to the server-resolved selection identity.");
  const networkParserIndex = analysisClientSource.indexOf("const payload = parsePointObjectAiResponse(rawPayload)");
  const networkCommitIndex = analysisClientSource.indexOf("commitAnalysis(normalized, activeSelection)", networkParserIndex);
  assert.ok(networkParserIndex >= 0 && networkCommitIndex > networkParserIndex,
    "The browser must runtime-validate the V3 network response before committing it to UI state or session storage.");
  assert.equal(/response\.json\(\) as PointObjectAiResponse/.test(analysisClientSource), false,
    "The network response must not bypass runtime validation through a TypeScript cast.");
  assert.match(readFileSync(path.join(ROOT, "app/api/prototype/point-to-object/ai/route.ts"), "utf8"), /AI_OBJECT_CHANGED/,
    "The server must fail closed when the selected OSM identity changes before analysis.");
  assert.match(liveMapSource, /\["2d", "3d"\]/,
    "The live map must expose explicit 2D and 3D modes.");
  for (const stylePath of ["styles/liberty", "styles/positron", "styles/bright"]) {
    assert.match(liveMapSource, new RegExp(stylePath.replace("/", "\\/")), `Missing OpenFreeMap style ${stylePath}.`);
  }
  assert.match(liveMapSource, /map\.on\("style\.load", handleStyleReady\)/,
    "GeoAI map layers must be restored after every basemap style load.");
  assert.match(liveMapSource, /handleStyleReady[\s\S]*applyViewMode\(map, viewModeRef\.current,[\s\S]{0,100}false, false\)/,
    "Basemap style loads must restore active 2D/3D handlers and layers without overwriting the live camera.");
  assert.match(liveMapSource, /viewport: \{ \.\.\.current\.viewport, \.\.\.CAMERA\[nextMode\], viewMode: nextMode \}/,
    "A 2D/3D toggle must persist camera and mode as one consistent viewport state.");
  assert.match(liveMapSource, /if \(!map\) return;[\s\S]*applyViewMode\(map, nextMode,[\s\S]{0,100}\);[\s\S]*if \(!map\.isStyleLoaded\(\)\) return;/,
    "A 2D/3D camera change must apply immediately, including while the basemap style is loading.");
  assert.match(liveMapSource, /applyViewMode\(map, initialViewMode,[\s\S]{0,100}false, false\)/,
    "Restoring a session must preserve its saved custom 3D camera rather than reset to the canonical angle.");
  assert.match(liveMapSource, /viewport:[\s\S]*viewMode: viewModeRef\.current/,
    "The selected map viewport must persist its explicit 2D/3D mode.");
  assert.match(liveMapSource, /selectionCanShowVolume\([\s\S]*renderHeightM !== null/,
    "Selected 3D volume must require a real rendered height.");
  for (const action of ["Object profile", "Development screening", "Redevelopment", "Due diligence"]) {
    assert.match(`${analysisClientSource}\n${prototypeI18nSource}`, new RegExp(action), `Missing focused analysis action: ${action}.`);
  }
  const liveEvidenceSource = readFileSync(path.join(ROOT, "src/lib/prototype/point-to-object-live-evidence.ts"), "utf8");
  const aiCoreSource = readFileSync(path.join(ROOT, "src/lib/prototype/point-to-object-ai-core.ts"), "utf8");
  assert.equal(aiCoreSource.includes("clickedPoint"), false,
    "The AI projection must describe the normalized coordinate as an analysis point, not as the original click.");
  assert.equal(aiCoreSource.includes("clicked_coordinates"), false,
    "The AI evidence vocabulary must describe normalized analysis coordinates truthfully.");
  assert.equal(liveEvidenceSource.includes("lookup_bbox_or_centroid_proximity_not_point_in_polygon"), false,
    "Live server grounding must not use bbox/centroid proximity as an object-identity surrogate.");
  assert.match(liveEvidenceSource, /\^\(node\|way\|relation\)\\\/\(\[1-9\]\\d\{0,19\}\)\$/,
    "Trusted Find/Search handoff must accept only a strict OpenStreetMap node/way/relation identity.");
  assert.match(liveEvidenceSource, /new URL\("lookup", endpoint\)/,
    "Trusted Find/Search handoff must resolve the exact OpenStreetMap identity through Nominatim lookup.");
  assert.match(liveEvidenceSource, /candidate\.osmType === sourceFeatureId\.type && candidate\.osmId === sourceFeatureId\.id/,
    "Nominatim lookup must fail closed unless the returned object exactly matches the requested identity.");
  assert.match(liveEvidenceSource, /trustedIdentity \? lookupPlace\([\s\S]*\) : reversePlace\(/,
    "Direct map clicks must continue to use coordinate-based reverse resolution when no trusted identity is supplied.");
  const nextConfigSource = readFileSync(path.join(ROOT, "next.config.ts"), "utf8");
  assert.match(nextConfigSource, /https:\/\/tiles\.openfreemap\.org/, "CSP must permit the selected live-map tile host.");

  const runtimeFiles = [
    ...collectFiles(path.join(ROOT, "src/lib/point-to-object"))
  ].filter((filePath) => /\.(?:ts|tsx|js|mjs)$/.test(filePath));
  const forbidden = [
    /nominatim/i,
    /overpass-api|\/api\/interpreter/i,
    /overture/i,
    /mapbox/i
  ];
  for (const filePath of runtimeFiles) {
    const source = readFileSync(filePath, "utf8");
    for (const pattern of forbidden) {
      assert.equal(pattern.test(source), false, `Forbidden runtime evidence/provider reference ${pattern} in ${path.relative(ROOT, filePath)}.`);
    }
  }

  const wrapperPath = path.join(ROOT, "src/lib/point-to-object/candidate-assertion.ts");
  const wrapper = readFileSync(wrapperPath, "utf8");
  assert.match(wrapper, /^import "server-only";/, "Candidate assertion route wrapper must stay server-only.");
  assert.match(wrapper, /candidate-assertion-core/, "Server-only wrapper must re-export the tested pure assertion core.");

  for (const root of ["app", "components"]) {
    for (const filePath of collectFiles(path.join(ROOT, root)).filter((entry) => /\.(?:ts|tsx)$/.test(entry))) {
      const source = readFileSync(filePath, "utf8");
      const relativePath = path.relative(ROOT, filePath).split(path.sep).join("/");
      const integratesPointToObject = /(?:src\/lib|@\/src\/lib|\.\.\/.*src\/lib)\/point-to-object|point-to-object\//.test(source);
      if (integratesPointToObject) {
        assert.equal(pointObjectIntegrationAllowlist.has(relativePath), true,
          `${relativePath} is not allowlisted to integrate the point-to-object Candidate.`);
      }
      assert.equal(source.includes("point-to-object/candidate-assertion-core"), false,
        `${relativePath} must not import the pure candidate assertion core.`);
    }
  }

  const sourceAggregate = runtimeFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n");
  assert.equal(/fetch\s*\(/.test(sourceAggregate), false, "Point-to-object runtime must not perform network fetches.");
  assert.equal(/\bopenai\b|from\s+["']openai["']|require\(["']openai["']\)/i.test(sourceAggregate), false,
    "Point-to-object core must not integrate OpenAI while G4 is held.");
  assert.equal(/process\.env|Deno\.env/.test(sourceAggregate), false,
    "Point-to-object core must not read environment variables while runtime integration is held.");
  assert.equal(/SUPABASE_|OPENAI_API_KEY|MAPBOX_TOKEN/.test(sourceAggregate), false, "Runtime must not read provider credentials.");
  assert.ok(sourceAggregate.includes(LIVE_POINT_CAVEAT), "Exact caveat must be bound in runtime contract code.");

  const packageJson = jsonFile(path.join(ROOT, "package.json"));
  const dependencies = (packageJson.dependencies ?? {}) as Record<string, unknown>;
  assert.equal(dependencies.ajv, "8.20.0", "AJV must remain exactly pinned.");
  assert.equal(dependencies["ajv-formats"], "3.0.1", "AJV formats must remain exactly pinned.");
  for (const heldDependency of ["openai", "proj4", "tsx"]) {
    assert.equal(dependencies[heldDependency], undefined,
      `${heldDependency} must not become a direct dependency in the bounded E1 package.`);
  }
}

async function assertCandidateAiSafety(): Promise<void> {
  const aiCorePath = path.join(ROOT, "src/lib/prototype/point-to-object-ai-core.ts");
  assert.ok(existsSync(aiCorePath), "Candidate AI core is required for bounded Preview safety tests.");
  const aiServiceSource = readFileSync(path.join(ROOT, "src/lib/prototype/point-to-object-ai.ts"), "utf8");
  assert.match(aiServiceSource, /code === "EVIDENCE_INSUFFICIENT"/,
    "A routine focused-answer evidence mismatch must receive one bounded server-side repair instead of forcing a manual retry.");
  assert.match(aiServiceSource, /validation\.detail \?\? null/,
    "The bounded repair request must receive the internal validation detail needed to correct the failed evidence gate.");
  const aiCore = await importErasableTypeScript(aiCorePath, [
    [
      /import \{ LIVE_POINT_CAVEAT \} from "@\/src\/lib\/point-to-object\/contracts";\n/,
      `const LIVE_POINT_CAVEAT = ${JSON.stringify(LIVE_POINT_CAVEAT)};\n`
    ],
    [/import \{ semanticHash \} from "@\/src\/lib\/point-to-object\/hash";\n/, "const semanticHash = (value) => JSON.stringify(value);\n"],
    [/import type \{[\s\S]*?\} from "\.\/point-to-object-live-evidence";\n/, ""],
    [/import type \{ PointObjectLocale \} from "\.\/point-to-object-markets";\n/, ""]
  ]);
  const liveSessionPath = path.join(ROOT, "components/point-to-object/live-session.ts");
  const liveSession = await importErasableTypeScript(liveSessionPath, [
    [
      /import \{ LIVE_POINT_CAVEAT \} from "@\/src\/lib\/point-to-object\/contracts";\n/,
      `const LIVE_POINT_CAVEAT = ${JSON.stringify(LIVE_POINT_CAVEAT)};\n`
    ],
    [
      /import \{\n  POINT_OBJECT_ANALYSIS_PROMPT_VERSION,\n  POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION\n\} from "@\/components\/point-to-object\/live-types";\n/,
      `const POINT_OBJECT_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V7_2026_09_04";\nconst POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION = 5;\n`
    ],
    [
      /import \{ isPointObjectLocale, isPointObjectMarketKey \} from "@\/src\/lib\/prototype\/point-to-object-markets";\n/,
      `const isPointObjectLocale = (value) => value === "en" || value === "ru";\nconst isPointObjectMarketKey = (value) => ["dubai", "abu_dhabi", "doha", "riyadh", "jeddah", "kuala_lumpur", "singapore", "hong_kong", "moscow"].includes(value);\n`
    ]
  ]);
  const parseClientTelemetry = liveSession.parsePointObjectAiTelemetry as (value: unknown) => JsonObject | null;
  const parseClientResponse = liveSession.parsePointObjectAiResponse as (value: unknown) => JsonObject | null;
  const completionState = aiCore.responseCompletionState as (value: unknown) => "complete" | "incomplete" | "refusal" | "invalid";
  const extractUsage = aiCore.extractResponsesUsage as (value: unknown) => {
    inputTokens: number | null;
    cachedInputTokens: number | null;
    cacheWriteTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
  const estimateCost = aiCore.estimatePointObjectAiCost as (
    model: string,
    inputTokens: number | null,
    cachedInputTokens: number | null,
    cacheWriteTokens: number | null,
    outputTokens: number | null
  ) => { estimatedCostUsd: number | null; costRateSource: string | null };
  const summarizeUsage = aiCore.summarizePointObjectAiAttemptUsage as (attempts: JsonObject[]) => JsonObject;
  assert.equal(aiCore.POINT_OBJECT_AI_RESULT_SCHEMA_VERSION, 5,
    "The public analysis receipt must expose the documented V5 result schema version.");
  const buildRequest = aiCore.buildPointObjectResponsesRequest as (
    pack: JsonObject,
    analysisRequest: JsonObject,
    profile: JsonObject,
    repairCode?: string | null
  ) => JsonObject;
  const validateContent = aiCore.validatePointObjectAiContent as (
    value: unknown,
    pack: JsonObject,
    analysisRequest?: JsonObject
  ) => JsonObject | null;
  const validateContentDetailed = aiCore.validatePointObjectAiContentDetailed as (
    value: unknown,
    pack: JsonObject,
    analysisRequest: JsonObject
  ) => { ok: true; content: JsonObject } | { ok: false; code: string };

  assert.equal(completionState({ status: "completed", error: null, output_text: "{}" }), "complete");
  assert.equal(completionState({ status: "failed", error: { code: "provider_error" }, output_text: "{}" }), "invalid",
    "Failed provider responses must never be accepted solely because output_text is present.");
  assert.equal(completionState({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output_text: "{}" }), "incomplete");
  assert.deepEqual(extractUsage({ usage: {
    input_tokens: 1_000,
    input_tokens_details: { cached_tokens: 400, cache_write_tokens: 200 },
    output_tokens: 100,
    total_tokens: 1_100
  } }), { inputTokens: 1_000, cachedInputTokens: 400, cacheWriteTokens: 200, outputTokens: 100, totalTokens: 1_100 },
  "Responses usage extraction must preserve cache reads and cache writes separately.");
  const cachedCost = estimateCost("gpt-5.6-sol", 1_000, 400, 200, 100);
  assert.equal(cachedCost.estimatedCostUsd, 0.00476,
    "Cost must charge 400 ordinary input tokens, 400 cached reads, 200 cache writes and 100 output tokens at their distinct rates.");
  assert.match(cachedCost.costRateSource ?? "", /USD 4\/M ordinary input, USD 0\.4\/M cached input, USD 5\/M cache writes, USD 20\/M output/,
    "Cost provenance must disclose all four applied rates.");
  assert.equal(estimateCost("gpt-5.6-sol", 1_000, 400, 0, 100).estimatedCostUsd, 0.00456,
    "A zero-write response must preserve the ordinary-plus-cached-read cost calculation.");
  assert.deepEqual(estimateCost("gpt-5.6-sol-unrecognized", 1_000, 0, 0, 100), { estimatedCostUsd: null, costRateSource: null },
    "An unrecognized model suffix must not inherit a potentially incorrect published price.");
  assert.deepEqual(estimateCost("gpt-5.6-sol", 100, 60, 41, 10), { estimatedCostUsd: null, costRateSource: null },
    "Impossible cache-read and cache-write token totals must fail closed instead of understating or overstating cost.");
  assert.deepEqual(estimateCost("gpt-5.6-sol", 100, 0, null, 10), { estimatedCostUsd: null, costRateSource: null },
    "Missing GPT-5.6 cache-write usage must fail closed instead of presenting an incomplete estimate.");
  assert.deepEqual(extractUsage({ usage: {
    input_tokens: 100,
    input_tokens_details: { cached_tokens: 20 },
    output_tokens: 10,
    total_tokens: 110
  } }), { inputTokens: 100, cachedInputTokens: 20, cacheWriteTokens: null, outputTokens: 10, totalTokens: 110 },
  "Missing cache-write usage must remain explicitly unknown.");
  const mixedRouteUsage = summarizeUsage([
    {
      purpose: "initial", model: "gpt-5.6-terra", reasoningEffort: "medium", requestId: "resp_initial",
      usage: { inputTokens: 1_000, cachedInputTokens: 500, cacheWriteTokens: 200, outputTokens: 100, totalTokens: 1_100 }
    },
    {
      purpose: "repair", model: "gpt-5.6-sol", reasoningEffort: "medium", requestId: "resp_repair",
      usage: { inputTokens: 900, cachedInputTokens: 400, cacheWriteTokens: 100, outputTokens: 120, totalTokens: 1_020 }
    }
  ]);
  assert.deepEqual({
    inputTokens: mixedRouteUsage.inputTokens,
    cachedInputTokens: mixedRouteUsage.cachedInputTokens,
    cacheWriteTokens: mixedRouteUsage.cacheWriteTokens,
    outputTokens: mixedRouteUsage.outputTokens,
    totalTokens: mixedRouteUsage.totalTokens,
    estimatedCostUsd: mixedRouteUsage.estimatedCostUsd
  }, { inputTokens: 1_900, cachedInputTokens: 900, cacheWriteTokens: 300, outputTokens: 220, totalTokens: 2_120, estimatedCostUsd: 0.00706 },
  "Initial and repair usage must aggregate across distinct model rates without losing cache writes.");
  assert.match(String(mixedRouteUsage.costRateSource), /gpt-5\.6-terra[\s\S]*gpt-5\.6-sol/,
    "Mixed-model repair telemetry must retain both pricing sources in attempt order.");
  assert.deepEqual((mixedRouteUsage.attemptTrace as JsonObject[]).map((item) => [item.attempt, item.purpose, item.model, item.estimatedCostUsd]), [
    [1, "initial", "gpt-5.6-terra", 0.0024],
    [2, "repair", "gpt-5.6-sol", 0.00466]
  ], "The receipt must attribute model and cost to each provider request.");
  const incompleteMixedRouteUsage = summarizeUsage([
    {
      purpose: "initial", model: "gpt-5.6-terra", reasoningEffort: "medium", requestId: "resp_initial",
      usage: { inputTokens: 1_000, cachedInputTokens: 500, cacheWriteTokens: 200, outputTokens: 100, totalTokens: 1_100 }
    },
    {
      purpose: "repair", model: "gpt-5.6-sol", reasoningEffort: "medium", requestId: "resp_repair",
      usage: { inputTokens: 900, cachedInputTokens: 400, cacheWriteTokens: null, outputTokens: 120, totalTokens: 1_020 }
    }
  ]);
  assert.equal(incompleteMixedRouteUsage.cachedInputTokens, null);
  assert.equal(incompleteMixedRouteUsage.cacheWriteTokens, null);
  assert.equal(incompleteMixedRouteUsage.estimatedCostUsd, null,
    "One incomplete attempt must fail the aggregate cost closed while preserving the analysis payload.");
  assert.deepEqual((incompleteMixedRouteUsage.attemptTrace as JsonObject[])[1]?.cachedInputTokens, null,
    "A partial per-attempt cache breakdown must normalize both cache fields to unknown.");
  const impossibleCacheUsage = summarizeUsage([{
    purpose: "initial", model: "gpt-5.6-terra", reasoningEffort: "medium", requestId: "resp_invalid_cache",
    usage: { inputTokens: 100, cachedInputTokens: 80, cacheWriteTokens: 21, outputTokens: 10, totalTokens: 110 }
  }]);
  assert.equal(impossibleCacheUsage.cachedInputTokens, null);
  assert.equal(impossibleCacheUsage.cacheWriteTokens, null);
  assert.equal(impossibleCacheUsage.estimatedCostUsd, null,
    "An impossible numeric cache breakdown must normalize to unknown and fail billing closed.");
  const partialTokenUsage = summarizeUsage([{
    purpose: "initial", model: "gpt-5.6-terra", reasoningEffort: "medium", requestId: "resp_partial_tokens",
    usage: { inputTokens: null, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 10, totalTokens: 10 }
  }]);
  assert.deepEqual({
    inputTokens: partialTokenUsage.inputTokens,
    cachedInputTokens: partialTokenUsage.cachedInputTokens,
    cacheWriteTokens: partialTokenUsage.cacheWriteTokens,
    outputTokens: partialTokenUsage.outputTokens,
    totalTokens: partialTokenUsage.totalTokens,
    estimatedCostUsd: partialTokenUsage.estimatedCostUsd
  }, { inputTokens: null, cachedInputTokens: null, cacheWriteTokens: null, outputTokens: null, totalTokens: null, estimatedCostUsd: null },
  "A partial token tuple must normalize atomically so billing telemetry cannot discard valid analysis content.");
  const clientTelemetry = {
    provider: "openai",
    schemaVersion: 5,
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
    depth: "standard",
    promptVersion: "POINT_OBJECT_AI_PROMPT_V7_2026_09_04",
    requestId: "resp_repair",
    latencyMs: 1_234,
    attempts: 2,
    attemptTrace: mixedRouteUsage.attemptTrace,
    inputTokens: mixedRouteUsage.inputTokens,
    cachedInputTokens: mixedRouteUsage.cachedInputTokens,
    cacheWriteTokens: mixedRouteUsage.cacheWriteTokens,
    outputTokens: mixedRouteUsage.outputTokens,
    totalTokens: mixedRouteUsage.totalTokens,
    estimatedCostUsd: mixedRouteUsage.estimatedCostUsd,
    costRateSource: mixedRouteUsage.costRateSource,
    stored: false,
    toolCalls: 0
  };
  assert.ok(parseClientTelemetry(clientTelemetry),
    "The client must accept a fully attributed two-attempt Standard repair receipt.");
  assert.equal(parseClientTelemetry({ ...clientTelemetry, estimatedCostUsd: "malformed", costRateSource: 42 }), null,
    "Malformed non-null billing fields must not normalize to an accepted null/null pair.");
  assert.equal(parseClientTelemetry({
    ...clientTelemetry,
    cachedInputTokens: 900,
    cacheWriteTokens: null,
    estimatedCostUsd: null,
    costRateSource: null
  }), null, "A partial aggregate cache breakdown must be rejected instead of discarding the valid analysis receipt later.");
  assert.equal(parseClientTelemetry({ ...clientTelemetry, schemaVersion: 2 }), null,
    "The client must reject an analysis receipt from an undeclared schema version.");

  const mappedMetrics = {
    footprintAreaSqM: 2_450,
    footprintPerimeterM: 210,
    method: "local_equirectangular_wgs84_approximation",
    geometryGeneralized: true
  };
  const geoContext = {
    radiusM: 400,
    coverage: "available",
    sampleSize: 40,
    capReached: false,
    groups: [
      { group: "hospitality", count: 12, sharePct: 30, nearestDistanceM: 0 },
      { group: "commercial", count: 10, sharePct: 25, nearestDistanceM: 25 },
      { group: "transport", count: 8, sharePct: 20, nearestDistanceM: 240 },
      { group: "other_built", count: 10, sharePct: 25, nearestDistanceM: 15 }
    ],
    mappedBuildingCount: 28,
    mappedLevelsKnownCount: 18,
    medianMappedLevels: 12,
    nearestTransitM: 240,
    nearestMajorRoadM: 35,
    districtCharacter: {
      code: "hospitality_tourism",
      confidence: "medium",
      ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1",
      driverGroups: ["hospitality", "commercial"]
    }
  };
  const geoContextSummary = {
    radiusM: geoContext.radiusM,
    coverage: geoContext.coverage,
    sampleSize: geoContext.sampleSize,
    capReached: geoContext.capReached,
    groups: geoContext.groups,
    mappedBuildingCount: geoContext.mappedBuildingCount,
    mappedLevelsKnownCount: geoContext.mappedLevelsKnownCount,
    medianMappedLevels: geoContext.medianMappedLevels,
    nearestTransitM: geoContext.nearestTransitM,
    nearestMajorRoadM: geoContext.nearestMajorRoadM
  };
  const evidencePack = {
    protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V1",
    evidencePackId: "p2o_evidence_test",
    evidencePackHash: sha256("candidate-ai-evidence"),
    caseKey: "live",
    caseId: "live-way-1",
    coordinates: { longitude: 55.271928, latitude: 25.20811, crs: "EPSG:4326" },
    resolution: {
      status: "resolved",
      resolutionId: "resolution-test",
      resolutionHash: sha256("resolution-test"),
      matchMethod: "nominatim_reverse",
      coordinateAssociation: "open_map_geometry_contains_point",
      resultCentroidDistanceM: 12.4,
      evidenceQuality: "partial_open_context"
    },
    selectedObject: {
      entityId: "osm-way-1",
      sourceFeatureId: "way/1",
      name: "Shangri La",
      displayAddress: "Shangri La, Sheikh Zayed Road, Trade Centre, Dubai, United Arab Emirates",
      featureClass: "tourism:hotel",
      geometryType: "Polygon",
      geometryHash: sha256("geometry-test"),
      metrics: mappedMetrics,
      addressParts: {
        city_district: "Trade Centre",
        city: "Dubai",
        state: "Dubai Emirate",
        country: "United Arab Emirates"
      },
      tags: {
        "tag.building": "hotel",
        "tag.building:levels": "43",
        "tag.height": "200",
        "tag.start_date": "2003",
        "tag.tourism": "hotel",
        "tag.wikidata": "Q3751975",
        "tag.owner": "FREE_TEXT_OWNER_MUST_NOT_PROJECT"
      }
    },
    source: {
      name: "OpenStreetMap",
      service: "Nominatim",
      sourceId: "SPAT-001",
      officialStatus: "open_context_not_official"
    },
    nearbyContext: [
      { evidenceId: "EVD-CONTEXT-01", sourceFeatureId: "node/456", name: "World Trade Centre", featureClass: "public_transport:station", distanceM: 240 }
    ],
    geoContext,
    evidence: [
      { id: "EVD-OBJECT", label: "Object", value: JSON.stringify({ sourceFeatureId: "way/1", name: "Shangri La" }), sourceId: "way/1", proofLimit: "FREE_TEXT_PROOF_LIMIT_DO_NOT_PROJECT" },
      { id: "EVD-CLASSIFICATION", label: "Classification", value: JSON.stringify({ sourceFeatureId: "way/1", featureClass: "tourism:hotel" }), sourceId: "way/1", proofLimit: "Open-map classification only." },
      { id: "EVD-ADDRESS", label: "Address", value: JSON.stringify({ sourceFeatureId: "way/1", displayAddress: "Shangri La, Sheikh Zayed Road, Trade Centre, Dubai, United Arab Emirates", addressParts: { city_district: "Trade Centre", city: "Dubai", state: "Dubai Emirate", country: "United Arab Emirates" } }), sourceId: "way/1", proofLimit: "Open-map address only." },
      { id: "EVD-ALLOWED-FIELDS", label: "Attributes", value: JSON.stringify({ sourceFeatureId: "way/1", tags: { "tag.building": "hotel", "tag.building:levels": "43", "tag.height": "200", "tag.start_date": "2003", "tag.tourism": "hotel", "tag.wikidata": "Q3751975", "tag.owner": "FREE_TEXT_OWNER_MUST_NOT_PROJECT" } }), sourceId: "way/1", proofLimit: "Allowlisted tags only." },
      { id: "EVD-GEOMETRY", label: "Geometry", value: JSON.stringify({ sourceFeatureId: "way/1", geometryType: "Polygon", geometryHash: sha256("geometry-test") }), sourceId: "way/1", proofLimit: "Open-map geometry only." },
      { id: "EVD-OBJECT-METRICS", label: "Approximate mapped object footprint metrics", value: JSON.stringify({ sourceFeatureId: "way/1", geometryHash: sha256("geometry-test"), metrics: mappedMetrics }), sourceId: "way/1", proofLimit: "Approximate metrics only." },
      { id: "EVD-COORDINATES", label: "Coordinates", value: JSON.stringify({ longitude: 55.271928, latitude: 25.20811, crs: "EPSG:4326" }), sourceId: "user_point", proofLimit: "Analysis point only." },
      { id: "EVD-CONTEXT-01", label: "World Trade Centre", value: JSON.stringify({ sourceFeatureId: "node/456", name: "World Trade Centre", featureClass: "public_transport:station", distanceM: 240 }), sourceId: "node/456", proofLimit: "Bounded open-map context only." },
      { id: "EVD-CONTEXT-SUMMARY", label: "Bounded mapped context summary", value: JSON.stringify(geoContextSummary), sourceId: "SPAT-001", proofLimit: "Bounded aggregate only." },
      { id: "EVD-DISTRICT-PROFILE", label: "Rule-based mapped context profile", value: JSON.stringify({ summaryHash: JSON.stringify(geoContextSummary), districtCharacter: geoContext.districtCharacter }), sourceId: "derived:POINT_OBJECT_DISTRICT_RULE_V1", proofLimit: "Rule-based context only." },
      { id: "EVD-SOURCE", label: "Open data source", value: "OpenStreetMap / ODbL", sourceId: "SPAT-001", proofLimit: "Runtime open community-map context; feature observation time unavailable." }
    ],
    conflicts: [],
    missingInformation: [],
    limitations: [],
    caveat: LIVE_POINT_CAVEAT
  };

  const focusedAnalysisRequest = {
    depth: "deep",
    goal: "development_screening",
    perspective: "investor",
    horizon: "long_term",
    question: "What should an investor validate before advancing this location?",
    locale: "en"
  };
  const initialAnalysisRequest = { ...focusedAnalysisRequest, question: null };
  const modelProfile = {
    model: "gpt-5.6-sol",
    reasoningEffort: "high",
    verbosity: "high",
    maxOutputTokens: 3200
  };
  const request = buildRequest(evidencePack, focusedAnalysisRequest, modelProfile);
  assert.equal(request.model, modelProfile.model, "The server-selected model profile must be bound to the Responses request.");
  assert.equal(request.service_tier, "default", "Responses requests must pin Standard processing for auditable pricing.");
  assert.equal(request.store, false, "Responses request must disable storage.");
  assert.equal("tools" in request, false, "Responses request must not enable tools or retrieval.");
  assert.deepEqual(request.reasoning, { effort: "high" }, "Reasoning effort must come from the server-selected profile.");
  assert.equal((request.text as JsonObject).verbosity, "high", "Text verbosity must come from the server-selected profile.");
  assert.equal(request.max_output_tokens, 3200, "The profile output-token bound must be enforced.");
  assert.equal((request.text as JsonObject).format instanceof Object, true, "Strict structured output is required.");
  assert.equal(((request.text as JsonObject).format as JsonObject).strict, true, "AI JSON schema must be strict.");
  assert.equal(((request.text as JsonObject).format as JsonObject).name, "geoai_point_object_decision_plan_v5",
    "The request must use the V5 evidence-bound decision-plan schema.");
  const responseSchema = (((request.text as JsonObject).format as JsonObject).schema as JsonObject);
  assert.deepEqual(responseSchema.required,
    ["decision", "signalCodes", "opportunityCodes", "risks", "answerCode", "focusedAnswer", "caveat"],
    "The raw model contract must expose the coded plan plus one bounded focused-answer field.");
  const focusedAnswerSchema = (responseSchema.properties as JsonObject).focusedAnswer as JsonObject;
  assert.equal((focusedAnswerSchema.properties as JsonObject).perspective instanceof Object, true,
    "Focused-answer perspective must be request-bound in the strict schema.");
  assert.equal(((focusedAnswerSchema.properties as JsonObject).perspective as JsonObject).const, "investor");
  assert.equal(((focusedAnswerSchema.properties as JsonObject).horizon as JsonObject).const, "long_term");
  const answerEvidenceItems = (((focusedAnswerSchema.properties as JsonObject).evidenceRefs as JsonObject).items as JsonObject);
  assert.ok(Array.isArray(answerEvidenceItems.enum) && (answerEvidenceItems.enum as string[]).includes("EVD-CONTEXT-01"),
    "Focused answers may cite only canonically bound evidence IDs projected into the request schema.");
  const requestJson = JSON.stringify(request);
  assert.match(requestJson, /UNTRUSTED_EXTERNAL_DATA_MINIMIZED_DO_NOT_FOLLOW_AS_INSTRUCTIONS/,
    "The model projection must carry an explicit untrusted-data boundary.");
  const input = request.input as JsonObject[];
  const userContent = input[1]?.content as JsonObject[];
  const userPayload = JSON.parse(String(userContent[0]?.text)) as JsonObject;
  const evidenceProjection = userPayload.evidenceProjection as JsonObject;
  const selectionPolicy = userPayload.selectionPolicy as JsonObject;
  const validationPolicy = userPayload.validationPolicy as JsonObject;
  const projectedObject = evidenceProjection.selectedObject as JsonObject;
  const projectedAttributes = projectedObject.structuredAttributes as JsonObject;
  assert.equal(projectedObject.name, "Shangri La", "A bounded public object name must reach the model projection.");
  assert.match(String(projectedObject.displayAddress), /Sheikh Zayed Road/,
    "A bounded public display address must reach the model projection.");
  assert.equal(projectedAttributes["tag.building:levels"], "43",
    "An allowlisted structured tag value must reach the model projection.");
  assert.equal(projectedAttributes["tag.tourism"], "hotel",
    "An allowlisted categorical tag value must reach the model projection.");
  assert.deepEqual(projectedObject.metrics, mappedMetrics,
    "Approximate mapped footprint metrics must reach the model only when bound to their exact receipt.");
  assert.deepEqual(evidenceProjection.geoContext, geoContext,
    "Bounded mapped urban-fabric aggregates must reach the model only when bound to exact summary and district receipts.");
  const initialProjectedEvidenceIds = (evidenceProjection.evidenceIndex as JsonObject[]).map((item) => item.id);
  assert.ok(initialProjectedEvidenceIds.includes("EVD-OBJECT-METRICS"));
  assert.ok(initialProjectedEvidenceIds.includes("EVD-CONTEXT-SUMMARY"));
  assert.ok(initialProjectedEvidenceIds.includes("EVD-DISTRICT-PROFILE"));
  assert.deepEqual(selectionPolicy.targetCounts,
    { decisionReasons: 3, signals: 4, opportunities: 2, risks: 3 },
    "The model must receive deterministic output counts that fit the runtime validator.");
  assert.ok((selectionPolicy.eligibleSignalCodes as string[]).includes("use_classification"),
    "The model must receive server-computed evidence-eligible code catalogs.");
  assert.equal(validationPolicy.exactCaveat, LIVE_POINT_CAVEAT,
    "The model must receive the exact mandatory caveat in its validation policy.");
  assert.equal(selectionPolicy.focusedAnswerRequired, true,
    "A focused request must explicitly require a focused answer.");
  assert.equal(requestJson.includes("FREE_TEXT_SENTINEL_DO_NOT_PROJECT"), false,
    "Free-text evidence prose must not be sent to the model.");
  assert.equal(requestJson.includes("FREE_TEXT_PROOF_LIMIT_DO_NOT_PROJECT"), false,
    "Free-text evidence proof limits must not be sent to the model.");
  assert.equal(requestJson.includes("FREE_TEXT_OWNER_MUST_NOT_PROJECT"), false,
    "Non-allowlisted object attributes must not be sent to the model.");

  const rawPlan = {
    decision: {
      path: "existing_asset_screen",
      disposition: "continue_screening",
      confidence: "medium",
      reasonCodes: ["use_classification_available", "use_classification_available", "lifecycle_marker_available"]
    },
    signalCodes: ["use_classification", "lifecycle_marker", "source_limit", "use_classification"],
    opportunityCodes: ["lifecycle_capital_review", "existing_asset_repositioning"],
    risks: [
      { code: "non_official_source", severity: "low", confidence: "medium" },
      { code: "commercial_evidence_missing", severity: "low", confidence: "medium" }
    ],
    answerCode: "identity_rights_planning_first",
    focusedAnswer: {
      status: "partial",
      scope: "screening_implication",
      perspective: "investor",
      horizon: "long_term",
      statement: "The mapped hotel identity, form and nearby World Trade Centre station support a location screen, while the investment case still requires verified market and financial evidence.",
      evidenceRefs: ["EVD-OBJECT", "EVD-ALLOWED-FIELDS", "EVD-CONTEXT-01"],
      confidence: "low",
      missingEvidenceCodes: ["current_market", "cost_financials"],
      unsupportedReasonCode: null
    },
    caveat: LIVE_POINT_CAVEAT
  };

  const detailedValidation = validateContentDetailed(rawPlan, evidencePack, focusedAnalysisRequest);
  assert.equal(detailedValidation.ok, true,
    `Evidence-bound coded AI plan must validate: ${JSON.stringify(detailedValidation)}`);
  const validated = validateContent(rawPlan, evidencePack, focusedAnalysisRequest) as any;
  assert.ok(validated, "Evidence-bound coded AI plan must validate.");
  const nearbyReasonResult = validateContent({
    ...rawPlan,
    decision: {
      ...rawPlan.decision,
      reasonCodes: ["nearby_context_available", "use_classification_available", "lifecycle_marker_available"]
    }
  }, evidencePack, focusedAnalysisRequest) as any;
  const nearbyReason = nearbyReasonResult.decisionBrief.reasons.find((item: any) =>
    String(item.statement).startsWith("Nearby open-map context includes"));
  assert.equal(nearbyReason?.evidenceRefs.length, 1,
    "A rendered fact about one nearby feature must not over-cite an unrelated second feature.");
  const focusedAttemptTrace = (mixedRouteUsage.attemptTrace as JsonObject[]).map((item, index) =>
    index === 0 ? { ...item, purpose: "focused" } : item);
  const fullClientResponse = {
    mode: "openai",
    schemaVersion: 5,
    generatedAt: "2026-09-04T00:00:00.000Z",
    evidencePackId: evidencePack.evidencePackId,
    evidencePackHash: evidencePack.evidencePackHash,
    request: { ...focusedAnalysisRequest, focused: true },
    content: validated,
    subject: {
      name: evidencePack.selectedObject.name,
      address: evidencePack.selectedObject.displayAddress,
      featureClass: evidencePack.selectedObject.featureClass,
      sourceFeatureId: evidencePack.selectedObject.sourceFeatureId,
      resolutionMethod: evidencePack.resolution.matchMethod,
      coordinateAssociation: evidencePack.resolution.coordinateAssociation,
      sourceLabel: "© OpenStreetMap contributors",
      geometryType: evidencePack.selectedObject.geometryType,
      resultCentroidDistanceM: evidencePack.resolution.resultCentroidDistanceM,
      addressParts: evidencePack.selectedObject.addressParts,
      tags: evidencePack.selectedObject.tags,
      metrics: evidencePack.selectedObject.metrics,
      geoContext: evidencePack.geoContext
    },
    telemetry: {
      ...clientTelemetry,
      depth: "deep",
      attemptTrace: focusedAttemptTrace
    }
  };
  assert.ok(parseClientResponse(fullClientResponse),
    "The network success envelope must pass strict V3 runtime validation before client state is committed.");
  assert.equal(parseClientResponse({ ...fullClientResponse, schemaVersion: undefined }), null);
  assert.equal(parseClientResponse({ ...fullClientResponse, schemaVersion: 2 }), null);
  assert.equal(parseClientResponse({ ...fullClientResponse, schemaVersion: "3" }), null,
    "Missing, stale and stringified schema versions must be rejected before rendering.");
  assert.equal(validated.decisionBrief.reasons.length, 3, "The server must normalize decision reasons to exactly three.");
  assert.equal((validated.signals as unknown[]).length, 4, "The server must normalize signals to exactly four.");
  assert.equal((validated.opportunities as unknown[]).length, 2, "The server must normalize opportunities to exactly two.");
  assert.equal((validated.risks as unknown[]).length, 3, "The server must normalize risks to exactly three.");
  assert.equal((validated.risks as Array<{ title: string; severity: string }>).find((risk) => risk.title === "Non-authoritative source")?.severity, "medium",
    "Server policy must prevent the model from understating the non-authoritative-source risk.");
  assert.equal((validated.risks as Array<{ title: string; severity: string }>).find((risk) => risk.title === "Geometry is not a parcel")?.severity, "high",
    "Server policy must prevent the model from understating the open-map geometry boundary.");
  assert.equal((validated.risks as Array<{ title: string }>).some((risk) => risk.title === "Commercial evidence gap"), false,
    "A generic source receipt must not be reused as proof of a commercial-evidence absence.");
  const renderedSignals = validated.signals as Array<{ title: string; evidenceRefs: string[] }>;
  assert.deepEqual(renderedSignals.find((signal) => signal.title === "Mapped use classification")?.evidenceRefs,
    ["EVD-CLASSIFICATION"], "Classification text must cite only EVD-CLASSIFICATION.");
  assert.deepEqual(renderedSignals.find((signal) => signal.title === "Mapped lifecycle marker")?.evidenceRefs,
    ["EVD-ALLOWED-FIELDS"], "Lifecycle text must cite only the allowlisted-attribute receipt.");
  assert.deepEqual(renderedSignals.find((signal) => signal.title === "Open-context evidence boundary")?.evidenceRefs,
    ["EVD-SOURCE"], "Generic source limitations must cite only the live source-status receipt.");
  assert.deepEqual(renderedSignals.find((signal) => signal.title === "Mapped physical form")?.evidenceRefs,
    ["EVD-ALLOWED-FIELDS", "EVD-GEOMETRY"],
    "Mapped form text must cite only its attribute and supported polygon-geometry receipts.");
  assert.equal(validated.answerToQuestion.status, "partial", "A supported but incomplete custom answer must remain explicitly partial.");
  assert.deepEqual(validated.answerToQuestion.evidenceRefs, ["EVD-OBJECT", "EVD-ALLOWED-FIELDS", "EVD-CONTEXT-01"],
    "Model-authored focused interpretation must retain only canonically bound evidence references.");

  const sourceFacts = validated.sourceFacts as Array<{ statement: string; evidenceRefs: string[] }>;
  const locationContext = validated.locationContext as Array<{ statement: string; evidenceRefs: string[] }>;
  const nextValidation = validated.nextValidation as Array<{ title: string; action: string; priority: string; evidenceRefs: string[] }>;
  assert.ok(sourceFacts.some((item) => item.statement.includes("Shangri La") && item.evidenceRefs.includes("EVD-OBJECT")),
    "Source facts must be rebuilt server-side from the normalized evidence pack.");
  assert.ok(locationContext.some((item) => item.statement.includes("Sheikh Zayed Road") && item.evidenceRefs.includes("EVD-ADDRESS")),
    "Location context must be rebuilt server-side from the normalized evidence pack.");
  assert.ok(locationContext.some((item) => item.statement.includes("World Trade Centre") && item.evidenceRefs.includes("EVD-CONTEXT-01")),
    "Bounded nearby context must be rebuilt server-side from normalized context evidence.");
  assert.ok(sourceFacts.some((item) => item.statement.includes("footprint") && item.evidenceRefs.includes("EVD-OBJECT-METRICS")),
    "Approximate mapped footprint area and perimeter must be rendered as a receipt-backed source fact.");
  assert.ok(locationContext.some((item) => item.evidenceRefs.includes("EVD-DISTRICT-PROFILE") && item.statement.includes("hospitality and tourism-led")),
    "The rule-based district character and its drivers must be rendered as an explicitly derived context statement.");
  assert.ok(locationContext.some((item) => item.evidenceRefs.includes("EVD-CONTEXT-SUMMARY") && item.statement.includes("400 m")),
    "Context radius, sample coverage and cap state must be disclosed in the user-facing analysis.");
  assert.ok(locationContext.some((item) => item.evidenceRefs.includes("EVD-CONTEXT-SUMMARY") && item.statement.includes("mapped buildings")),
    "Mapped building count and levels coverage must be rendered from the bounded aggregate.");
  assert.deepEqual(validated.geoContext, geoContext,
    "The validated V5 result must preserve the exact server-derived geo-context profile for UI rendering.");
  assert.ok(nextValidation.length >= 4 && nextValidation[0]?.priority === "critical",
    "Prioritized validation actions must be added deterministically server-side.");

  const metricsTamperPack = {
    ...evidencePack,
    selectedObject: {
      ...evidencePack.selectedObject,
      metrics: { ...mappedMetrics, footprintAreaSqM: mappedMetrics.footprintAreaSqM + 1 }
    }
  };
  const metricsTamperRequest = buildRequest(metricsTamperPack, focusedAnalysisRequest, modelProfile);
  const metricsTamperInput = metricsTamperRequest.input as JsonObject[];
  const metricsTamperPayload = JSON.parse(String((metricsTamperInput[1]?.content as JsonObject[])[0]?.text)) as JsonObject;
  const metricsTamperProjection = metricsTamperPayload.evidenceProjection as JsonObject;
  assert.equal((metricsTamperProjection.selectedObject as JsonObject).metrics, null,
    "Substituted geometry metrics must fail closed when the exact metric receipt no longer matches.");
  assert.equal(((metricsTamperProjection.evidenceIndex as JsonObject[]) ?? []).some((item) => item.id === "EVD-OBJECT-METRICS"), false,
    "A mismatched metric receipt must not remain eligible model evidence.");

  const contextTamperPack = {
    ...evidencePack,
    geoContext: { ...geoContext, sampleSize: geoContext.sampleSize + 1 }
  };
  const contextTamperRequest = buildRequest(contextTamperPack, focusedAnalysisRequest, modelProfile);
  const contextTamperInput = contextTamperRequest.input as JsonObject[];
  const contextTamperPayload = JSON.parse(String((contextTamperInput[1]?.content as JsonObject[])[0]?.text)) as JsonObject;
  const contextTamperProjection = contextTamperPayload.evidenceProjection as JsonObject;
  assert.equal(contextTamperProjection.geoContext, null,
    "Substituted urban-fabric aggregates must fail closed when their exact summary receipt no longer matches.");
  const contextTamperEvidenceIds = ((contextTamperProjection.evidenceIndex as JsonObject[]) ?? []).map((item) => item.id);
  assert.equal(contextTamperEvidenceIds.includes("EVD-CONTEXT-SUMMARY"), false);
  assert.equal(contextTamperEvidenceIds.includes("EVD-DISTRICT-PROFILE"), false);

  const russianValidated = validateContent(rawPlan, evidencePack, { ...focusedAnalysisRequest, locale: "ru" }) as any;
  assert.ok(russianValidated, "The same evidence-bound analysis must support a Russian deterministic render.");
  assert.match(russianValidated.decisionBrief.summary, /[А-Яа-яЁё]/,
    "Russian locale must control the deterministic decision language.");
  assert.ok(russianValidated.locationContext.some((item: any) => /[А-Яа-яЁё]/.test(item.statement)),
    "Russian locale must control the deterministic geo-context language.");
  assert.deepEqual(russianValidated.geoContext, geoContext,
    "Locale changes must not alter the underlying evidence-derived geo-context data.");
  assert.equal(russianValidated.caveat, LIVE_POINT_CAVEAT,
    "The mandatory legal/data caveat remains exact across locales.");

  const allRenderedRefs = [
    ...validated.decisionBrief.reasons,
    ...(validated.signals as Array<{ evidenceRefs: string[] }>),
    ...(validated.opportunities as Array<{ evidenceRefs: string[] }>),
    ...(validated.risks as Array<{ evidenceRefs: string[] }>),
    ...sourceFacts,
    ...locationContext,
    ...(validated.answerToQuestion ? [validated.answerToQuestion] : [])
  ].flatMap((item) => item.evidenceRefs);
  const allowedEvidenceIds = new Set((evidencePack.evidence as Array<{ id: string }>).map((item) => item.id));
  assert.equal(allRenderedRefs.every((id) => allowedEvidenceIds.has(id)), true,
    "Every rendered evidence reference must be selected server-side from the evidence pack.");

  const repeated = validateContent(rawPlan, evidencePack, focusedAnalysisRequest);
  assert.deepEqual(repeated, validated, "The same coded plan and evidence must render byte-for-byte deterministic content.");
  assert.equal((validated.decisionBrief.summary as string).includes("FREE_TEXT"), false,
    "Unprojected source prose must never reach deterministic decision copy.");
  const sanitizedName = "Shangri\u202e\nLa";
  const sanitized = validateContent(
    { ...rawPlan, answerCode: null, focusedAnswer: null },
    {
      ...evidencePack,
      selectedObject: { ...evidencePack.selectedObject, name: sanitizedName },
      evidence: evidencePack.evidence.map((item: any) => item.id === "EVD-OBJECT"
        ? { ...item, value: JSON.stringify({ sourceFeatureId: "way/1", name: sanitizedName }) }
        : item)
    },
    initialAnalysisRequest
  );
  assert.ok(sanitized, "Sanitizable public source values must remain renderable.");
  assert.equal(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u.test(JSON.stringify(sanitized)), false,
    "Control and bidi characters from source values must not reach server-rendered UI copy.");

  const projectionFor = (candidate: typeof evidencePack): JsonObject => {
    const candidateRequest = buildRequest(candidate, initialAnalysisRequest, modelProfile);
    const candidateInput = candidateRequest.input as JsonObject[];
    const candidateContent = candidateInput[1]?.content as JsonObject[];
    const candidatePayload = JSON.parse(String(candidateContent[0]?.text)) as JsonObject;
    return candidatePayload.evidenceProjection as JsonObject;
  };
  const projectedEvidenceIds = (projection: JsonObject): string[] => (
    (projection.evidenceIndex as Array<{ id: string }>).map((item) => item.id)
  );

  const substitutedName = projectionFor({
    ...evidencePack,
    selectedObject: { ...evidencePack.selectedObject, name: "SUBSTITUTED_OBJECT_NAME" }
  });
  assert.equal((substitutedName.selectedObject as JsonObject).name, null,
    "An unchanged object receipt ID must not authorize a substituted selected-object name.");
  assert.equal(projectedEvidenceIds(substitutedName).includes("EVD-OBJECT"), false,
    "An object receipt whose canonical payload no longer matches the selected object must be unavailable to the model.");

  const substitutedClassification = projectionFor({
    ...evidencePack,
    selectedObject: { ...evidencePack.selectedObject, featureClass: "office:company" }
  });
  assert.equal((substitutedClassification.selectedObject as JsonObject).featureClass, null,
    "An unchanged classification receipt ID must not authorize a substituted selected-object classification.");
  assert.equal(projectedEvidenceIds(substitutedClassification).includes("EVD-CLASSIFICATION"), false,
    "A mismatched classification receipt must be removed from the eligible evidence index.");

  const substitutedAddress = projectionFor({
    ...evidencePack,
    selectedObject: { ...evidencePack.selectedObject, displayAddress: "SUBSTITUTED ADDRESS, DUBAI" }
  });
  assert.equal((substitutedAddress.selectedObject as JsonObject).displayAddress, null,
    "An unchanged address receipt ID must not authorize a substituted display address.");
  assert.deepEqual((substitutedAddress.selectedObject as JsonObject).addressHierarchy, {},
    "A failed address binding must also suppress the selected address hierarchy.");
  assert.equal(projectedEvidenceIds(substitutedAddress).includes("EVD-ADDRESS"), false,
    "A mismatched address receipt must be removed from the eligible evidence index.");

  const substitutedAddressParts = projectionFor({
    ...evidencePack,
    selectedObject: {
      ...evidencePack.selectedObject,
      addressParts: { ...evidencePack.selectedObject.addressParts, city: "Abu Dhabi" }
    }
  });
  assert.equal((substitutedAddressParts.selectedObject as JsonObject).displayAddress, null,
    "An unchanged address receipt ID must not authorize substituted structured address parts.");
  assert.equal(projectedEvidenceIds(substitutedAddressParts).includes("EVD-ADDRESS"), false,
    "Address hierarchy and display address must share one canonical receipt binding.");

  const substitutedTags = projectionFor({
    ...evidencePack,
    selectedObject: {
      ...evidencePack.selectedObject,
      tags: { ...evidencePack.selectedObject.tags, "tag.building": "office" }
    }
  });
  assert.deepEqual((substitutedTags.selectedObject as JsonObject).structuredAttributes, {},
    "An unchanged attribute receipt ID must not authorize substituted selected-object tags.");
  assert.equal(projectedEvidenceIds(substitutedTags).includes("EVD-ALLOWED-FIELDS"), false,
    "A mismatched attribute receipt must be removed from the eligible evidence index.");

  const substitutedCoordinates = projectionFor({
    ...evidencePack,
    coordinates: { ...evidencePack.coordinates, longitude: evidencePack.coordinates.longitude + 0.01 }
  });
  assert.equal((substitutedCoordinates.analysisPoint as JsonObject).longitude, null,
    "An unchanged coordinate receipt ID must not authorize substituted WGS84 coordinates.");
  assert.equal(projectedEvidenceIds(substitutedCoordinates).includes("EVD-COORDINATES"), false,
    "A mismatched coordinate receipt must be removed from the eligible evidence index.");

  const substitutedGeometryType = projectionFor({
    ...evidencePack,
    selectedObject: { ...evidencePack.selectedObject, geometryType: "MultiPolygon" }
  });
  assert.equal((substitutedGeometryType.selectedObject as JsonObject).geometryType, null,
    "An unchanged geometry receipt ID must not authorize a substituted geometry type.");
  assert.equal(projectedEvidenceIds(substitutedGeometryType).includes("EVD-GEOMETRY"), false,
    "Geometry type and hash must share one canonical receipt binding.");

  const substitutedGeometryHash = projectionFor({
    ...evidencePack,
    selectedObject: { ...evidencePack.selectedObject, geometryHash: sha256("substituted-geometry") }
  });
  assert.equal((substitutedGeometryHash.selectedObject as JsonObject).geometryHash, null,
    "An unchanged geometry receipt ID must not authorize a substituted geometry hash.");
  assert.equal(projectedEvidenceIds(substitutedGeometryHash).includes("EVD-GEOMETRY"), false,
    "A mismatched geometry hash must invalidate the geometry receipt.");

  const substitutedSourceIdentity = projectionFor({
    ...evidencePack,
    selectedObject: { ...evidencePack.selectedObject, sourceFeatureId: "way/999" }
  });
  const substitutedSourceObject = substitutedSourceIdentity.selectedObject as JsonObject;
  assert.equal(substitutedSourceObject.sourceFeatureId, null,
    "An unchanged receipt ID must not authorize a substituted selected source identity.");
  assert.deepEqual(
    projectedEvidenceIds(substitutedSourceIdentity).filter((id) => [
      "EVD-OBJECT", "EVD-CLASSIFICATION", "EVD-ADDRESS", "EVD-ALLOWED-FIELDS", "EVD-GEOMETRY"
    ].includes(id)),
    [],
    "Every selected-object receipt must bind to the same selected source feature ID."
  );

  const duplicateClassificationReceipt = projectionFor({
    ...evidencePack,
    evidence: [
      ...evidencePack.evidence,
      evidencePack.evidence.find((item: any) => item.id === "EVD-CLASSIFICATION")!
    ]
  });
  assert.equal((duplicateClassificationReceipt.selectedObject as JsonObject).featureClass, null,
    "Duplicate receipt IDs must fail closed instead of selecting an ambiguous canonical payload.");
  assert.equal(projectedEvidenceIds(duplicateClassificationReceipt).includes("EVD-CLASSIFICATION"), false,
    "An ambiguous duplicate receipt ID must not remain eligible for model or renderer use.");

  const injectedRootText = validateContentDetailed(
    { ...rawPlan, summary: "The owner is Example Holdings and the asset is worth AED 10M." },
    evidencePack,
    focusedAnalysisRequest
  );
  assert.deepEqual(injectedRootText, { ok: false, code: "SHAPE_INVALID", detail: "root_exact_keys" },
    "An injected root free-text field must fail the exact-key contract.");
  const injectedNestedText = validateContentDetailed({
    ...rawPlan,
    decision: { ...rawPlan.decision, headline: "Guaranteed investment return." }
  }, evidencePack, focusedAnalysisRequest);
  assert.deepEqual(injectedNestedText, { ok: false, code: "SHAPE_INVALID", detail: "decision_exact_keys" },
    "An injected nested free-text field must fail the exact-key contract.");

  const unknownCode = validateContentDetailed({
    ...rawPlan,
    signalCodes: ["use_classification", "invented_market_signal"]
  }, evidencePack, focusedAnalysisRequest);
  assert.deepEqual(unknownCode, { ok: false, code: "UNKNOWN_CODE", detail: "code_array_value" },
    "Unknown model-selected codes must fail closed.");

  const unsupportedButKnown = validateContent({
    ...rawPlan,
    decision: { ...rawPlan.decision, reasonCodes: ["nearby_context_available"] },
    signalCodes: ["lifecycle_marker"],
    opportunityCodes: ["lifecycle_capital_review"],
    risks: [{ code: "geometry_not_parcel", severity: "low", confidence: "low" }],
    answerCode: null,
    focusedAnswer: null
  }, { ...evidencePack, nearbyContext: [], evidence: evidencePack.evidence.filter((item: any) => item.id !== "EVD-CONTEXT-01") }, initialAnalysisRequest) as any;
  assert.ok(unsupportedButKnown, "Known but unsupported codes must be filtered and deterministically filled.");
  assert.equal(unsupportedButKnown.decisionBrief.reasons.some((item: any) => item.evidenceRefs.includes("EVD-CONTEXT-01")), false,
    "Unsupported nearby-context reason codes must be removed before rendering.");
  assert.equal((unsupportedButKnown.locationContext as unknown[]).some((item: any) => item.evidenceRefs.includes("EVD-CONTEXT-01")), false,
    "Filtered context codes must not retain unavailable evidence references.");

  const fakeNearbyName = "FAKE_NEARBY_MUST_NOT_RENDER";
  const fakeNearbyEvidencePack = {
    ...evidencePack,
    nearbyContext: [
      { evidenceId: "EVD-ADDRESS", name: fakeNearbyName, featureClass: "amenity:school", distanceM: 25 },
      ...evidencePack.nearbyContext
    ]
  };
  const fakeNearbyRequest = buildRequest(fakeNearbyEvidencePack, initialAnalysisRequest, modelProfile);
  assert.equal(JSON.stringify(fakeNearbyRequest).includes(fakeNearbyName), false,
    "A nearby item must not reach the model projection unless its evidence ID is a dedicated EVD-CONTEXT-N receipt.");
  const fakeNearbyResult = validateContent({ ...rawPlan, answerCode: null, focusedAnswer: null }, fakeNearbyEvidencePack, initialAnalysisRequest) as any;
  assert.ok(fakeNearbyResult, "A malformed nearby item must be ignored without making the remaining supported plan unusable.");
  assert.equal(JSON.stringify(fakeNearbyResult).includes(fakeNearbyName), false,
    "An existing non-context receipt such as EVD-ADDRESS must never authorize nearby-context rendering.");

  const substitutedNearbyName = "SUBSTITUTED_NEARBY_VALUE_MUST_NOT_RENDER";
  const substitutedNearbyEvidencePack = {
    ...evidencePack,
    nearbyContext: [{
      ...evidencePack.nearbyContext[0],
      name: substitutedNearbyName,
      distanceM: 25
    }]
  };
  const substitutedNearbyRequest = buildRequest(substitutedNearbyEvidencePack, initialAnalysisRequest, modelProfile);
  assert.equal(JSON.stringify(substitutedNearbyRequest).includes(substitutedNearbyName), false,
    "A dedicated nearby evidence ID must not authorize a substituted name or distance unless the receipt value is bound.");
  const substitutedNearbyResult = validateContent({ ...rawPlan, answerCode: null, focusedAnswer: null }, substitutedNearbyEvidencePack, initialAnalysisRequest) as any;
  assert.ok(substitutedNearbyResult, "A rejected nearby substitution must not invalidate the remaining supported plan.");
  assert.equal(JSON.stringify(substitutedNearbyResult).includes(substitutedNearbyName), false,
    "Server rendering must exclude nearby values whose label, source identity or distance differs from the receipt.");
  const substitutedNearbyClass = "amenity:school";
  const substitutedNearbyClassPack = {
    ...evidencePack,
    nearbyContext: [{ ...evidencePack.nearbyContext[0], featureClass: substitutedNearbyClass }]
  };
  assert.equal(JSON.stringify(buildRequest(substitutedNearbyClassPack, initialAnalysisRequest, modelProfile)).includes(substitutedNearbyClass), false,
    "A valid receipt ID must not authorize a substituted nearby feature classification.");
  assert.equal(JSON.stringify(validateContent({ ...rawPlan, answerCode: null, focusedAnswer: null }, substitutedNearbyClassPack, initialAnalysisRequest)).includes(substitutedNearbyClass), false,
    "A mismatched nearby feature class must fail closed before deterministic rendering.");

  const sparseEvidencePack = {
    ...evidencePack,
    evidence: evidencePack.evidence.filter((item: any) => ![
      "EVD-CLASSIFICATION", "EVD-ADDRESS", "EVD-ALLOWED-FIELDS"
    ].includes(item.id))
  };
  const sparseEvidenceResult = validateContent({
    ...rawPlan,
    decision: {
      ...rawPlan.decision,
      reasonCodes: ["use_classification_available", "lifecycle_marker_available", "building_form_available"]
    },
    signalCodes: ["use_classification", "lifecycle_marker", "address_context"],
    opportunityCodes: ["lifecycle_capital_review", "existing_asset_repositioning"],
    answerCode: null,
    focusedAnswer: null
  }, sparseEvidencePack, initialAnalysisRequest) as any;
  assert.ok(sparseEvidenceResult, "A sparse pack must remain renderable without borrowing evidence across fields.");
  const sparseRendered = JSON.stringify(sparseEvidenceResult);
  assert.equal(sparseRendered.includes("tourism:hotel"), false,
    "A featureClass field without EVD-CLASSIFICATION must not reach rendered content.");
  assert.equal(sparseRendered.includes("Sheikh Zayed Road"), false,
    "Address fields without EVD-ADDRESS must not reach rendered content.");
  assert.equal(sparseRendered.includes("43 mapped levels"), false,
    "Mapped-level tags without EVD-ALLOWED-FIELDS must not reach rendered content.");
  assert.equal(sparseRendered.includes("mapped height 200"), false,
    "Mapped-height tags without EVD-ALLOWED-FIELDS must not reach rendered content.");
  assert.equal(sparseRendered.includes("start-date field is 2003"), false,
    "Lifecycle tags without EVD-ALLOWED-FIELDS must not reach rendered content.");
  assert.equal(/EVD-(?:CLASSIFICATION|ADDRESS|ALLOWED-FIELDS)/.test(sparseRendered), false,
    "Removed evidence receipts must never be recreated as false references.");
  const sparseAddressSignal = (sparseEvidenceResult.signals as Array<{ title: string; observation: string; evidenceRefs: string[] }>)
    .find((signal) => signal.title === "Geographic anchor");
  assert.ok(sparseAddressSignal?.observation.startsWith("The analysis point is ") && sparseAddressSignal.evidenceRefs.includes("EVD-COORDINATES"),
    "Coordinate fallback must render only the coordinate anchor and cite only EVD-COORDINATES.");

  const classificationOnlyResult = validateContent({
    ...rawPlan,
    decision: { ...rawPlan.decision, path: "technical_baseline_first" },
    signalCodes: ["use_classification", "address_context", "object_identity", "source_limit"],
    opportunityCodes: ["operational_baseline_test", "comparative_screening"],
    answerCode: null,
    focusedAnswer: null
  }, {
    ...evidencePack,
    selectedObject: { ...evidencePack.selectedObject, geometryType: "Point" },
    evidence: evidencePack.evidence
      .filter((item: any) => item.id !== "EVD-ALLOWED-FIELDS")
      .map((item: any) => item.id === "EVD-GEOMETRY" ? {
        ...item,
        value: JSON.stringify({ sourceFeatureId: "way/1", geometryType: "Point", geometryHash: sha256("geometry-test") })
      } : item)
  }, initialAnalysisRequest) as any;
  assert.ok(classificationOnlyResult, "Classification plus point geometry must remain renderable through a non-technical path.");
  assert.equal(classificationOnlyResult.decisionBrief.headline, "Make planning evidence the next decision gate",
    "Classification alone must not support the technical-baseline-first decision path.");
  assert.equal(JSON.stringify(classificationOnlyResult).includes("mapped object geometry"), false,
    "The renderer must never invent a generic geometry phrase when no building-form geometry is supported.");

  const missingFocusedAnswer = validateContentDetailed(
    { ...rawPlan, focusedAnswer: null }, evidencePack, focusedAnalysisRequest
  );
  assert.equal(missingFocusedAnswer.ok, false,
    "A focused request must fail closed when the model omits its evidence-bound answer.");

  const mismatchedLensAnswer = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: { ...rawPlan.focusedAnswer, perspective: "developer" }
  }, evidencePack, focusedAnalysisRequest);
  assert.equal(mismatchedLensAnswer.ok, false,
    "The focused answer must be bound to the request perspective and horizon.");

  const staleFocusedRef = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: { ...rawPlan.focusedAnswer, evidenceRefs: ["EVD-CONTEXT-99"] }
  }, evidencePack, focusedAnalysisRequest);
  assert.equal(staleFocusedRef.ok, false,
    "A model-authored interpretation must reject stale or cross-object evidence references.");

  const uncitedNearbyClaim = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      ...rawPlan.focusedAnswer,
      statement: "Nearby transport improves the screening case, but the open-map context remains incomplete and requires validation.",
      evidenceRefs: ["EVD-OBJECT"]
    }
  }, evidencePack, focusedAnalysisRequest);
  assert.equal(uncitedNearbyClaim.ok, false,
    "Nearby interpretation must cite a canonically bound EVD-CONTEXT receipt.");

  const combinedObjectAndNearbyAnswer = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      ...rawPlan.focusedAnswer,
      scope: "nearby_context",
      statement: "The selected hotel and nearby World Trade Centre station support a combined object-and-location screen, while the investment case still needs verified evidence.",
      evidenceRefs: ["EVD-OBJECT", "EVD-CONTEXT-01"]
    }
  }, evidencePack, focusedAnalysisRequest);
  assert.equal(combinedObjectAndNearbyAnswer.ok, true,
    "A nearby-context answer may bind both the selected object and the cited nearby feature.");

  const genericContextCategoryAnswer = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      ...rawPlan.focusedAnswer,
      scope: "nearby_context",
      statement: "The nearby transport context supports comparative location screening, while the investment case still needs verified evidence.",
      evidenceRefs: ["EVD-CONTEXT-01"]
    }
  }, evidencePack, focusedAnalysisRequest);
  assert.equal(genericContextCategoryAnswer.ok, true,
    "A derived category phrase may bind to the canonical nearby feature class without repeating the full feature name.");

  const mixedEvidenceMappedUseAnswer = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      ...rawPlan.focusedAnswer,
      scope: "mapped_use",
      statement: "The mapped hotel use and nearby World Trade Centre station support an initial location screen, while the investment case still needs verified evidence.",
      evidenceRefs: ["EVD-CLASSIFICATION", "EVD-CONTEXT-01"]
    }
  }, evidencePack, focusedAnalysisRequest);
  assert.equal(mixedEvidenceMappedUseAnswer.ok, true,
    "The answer scope is a primary theme and may include additional canonically bound evidence classes.");

  const unrelatedMappedUseScope = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      ...rawPlan.focusedAnswer,
      scope: "mapped_use",
      statement: "Nearby World Trade Centre station supports an initial location screen, while the investment case still needs verified evidence.",
      evidenceRefs: ["EVD-CONTEXT-01"]
    }
  }, evidencePack, focusedAnalysisRequest);
  assert.equal(unrelatedMappedUseScope.ok, false,
    "The declared primary scope must still have at least one compatible canonical evidence reference.");

  const evidencePackWithoutNearby = {
    ...evidencePack,
    nearbyContext: [],
    evidence: evidencePack.evidence.filter((item: any) => !String(item.id).startsWith("EVD-CONTEXT-"))
  };
  const russianNearbyWithoutReceipt = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      status: "answered",
      scope: "nearby_context",
      perspective: "investor",
      horizon: "long_term",
      statement: "Рядом с выбранным объектом якобы находятся новая школа и большой парк, что повышает привлекательность локации.",
      evidenceRefs: ["EVD-OBJECT"],
      confidence: "medium",
      missingEvidenceCodes: [],
      unsupportedReasonCode: null
    }
  }, evidencePackWithoutNearby, {
    ...focusedAnalysisRequest,
    question: "Что находится рядом с объектом и как это влияет на привлекательность?"
  });
  assert.equal(russianNearbyWithoutReceipt.ok, false,
    "Nearby scope must require a canonical context receipt structurally, independent of answer language.");

  const roofColourQuestion = {
    ...focusedAnalysisRequest,
    question: "What colour is the roof of this building?"
  };
  const inventedRoofColour = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      status: "answered",
      scope: "mapped_form",
      perspective: "investor",
      horizon: "long_term",
      statement: "The selected building has a silver roof according to the available mapped object record.",
      evidenceRefs: ["EVD-OBJECT", "EVD-GEOMETRY"],
      confidence: "medium",
      missingEvidenceCodes: [],
      unsupportedReasonCode: null
    }
  }, evidencePack, roofColourQuestion);
  assert.equal(inventedRoofColour.ok, false,
    "A missing direct attribute must never be inferred from a generic object or geometry receipt.");

  const roofShadeQuestion = {
    ...focusedAnalysisRequest,
    question: "What shade is the roof of this building?"
  };
  const inventedRoofShade = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      status: "answered",
      scope: "mapped_form",
      perspective: "investor",
      horizon: "long_term",
      statement: "The selected building has a silver roof according to the available mapped object record.",
      evidenceRefs: ["EVD-OBJECT", "EVD-GEOMETRY"],
      confidence: "medium",
      missingEvidenceCodes: [],
      unsupportedReasonCode: null
    }
  }, evidencePack, roofShadeQuestion);
  assert.equal(inventedRoofShade.ok, false,
    "A paraphrased request for an unmapped visual attribute must fail closed.");

  for (const question of [
    "What hue is the rooftop?",
    "What tone is the facade?",
    "What does the exterior look like?",
    "Какого оттенка крыша?"
  ]) {
    const variant = validateContentDetailed({
      ...rawPlan,
      focusedAnswer: {
        status: "answered",
        scope: "mapped_form",
        perspective: "investor",
        horizon: "long_term",
        statement: "The selected object has a silver exterior according to the mapped record.",
        evidenceRefs: ["EVD-OBJECT", "EVD-GEOMETRY"],
        confidence: "medium",
        missingEvidenceCodes: [],
        unsupportedReasonCode: null
      }
    }, evidencePack, { ...focusedAnalysisRequest, question });
    assert.equal(variant.ok, false, `Unmapped visual question must fail closed: ${question}`);
  }

  const heightQuestion = {
    ...focusedAnalysisRequest,
    question: "How tall is the building?"
  };
  const heightWithInventedVisualClaims = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      status: "answered",
      scope: "mapped_form",
      perspective: "investor",
      horizon: "long_term",
      statement: "The mapped height is 200, and the building has a silver roof and marble facade.",
      evidenceRefs: ["EVD-ALLOWED-FIELDS", "EVD-GEOMETRY"],
      confidence: "medium",
      missingEvidenceCodes: [],
      unsupportedReasonCode: null
    }
  }, evidencePack, heightQuestion);
  assert.equal(heightWithInventedVisualClaims.ok, false,
    "A supported attribute must not legitimise appended unmapped physical claims.");

  const normalizedHeight = validateContent({
    ...rawPlan,
    focusedAnswer: {
      status: "answered",
      scope: "mapped_form",
      perspective: "investor",
      horizon: "long_term",
      statement: "The mapped height attribute is 200 according to the selected source record.",
      evidenceRefs: ["EVD-ALLOWED-FIELDS"],
      confidence: "medium",
      missingEvidenceCodes: [],
      unsupportedReasonCode: null
    }
  }, evidencePack, heightQuestion) as any;
  assert.equal(normalizedHeight?.answerToQuestion?.statement,
    "Mapped OpenStreetMap height attribute: 200. This open-map value has not been independently verified.",
    "Supported direct attributes must be rendered from the canonical field rather than raw model prose.");
  assert.deepEqual(normalizedHeight?.answerToQuestion?.evidenceRefs, ["EVD-ALLOWED-FIELDS"],
    "A direct-attribute answer must expose only its canonical attribute receipt.");
  assert.equal(normalizedHeight?.answerToQuestion?.confidence, "low",
    "A community-map direct attribute must not be presented as independently verified.");

  const conciseHeight = validateContent({
    ...rawPlan,
    focusedAnswer: {
      status: "answered",
      scope: "mapped_form",
      perspective: "investor",
      horizon: "long_term",
      statement: "Height: 200.",
      evidenceRefs: ["EVD-ALLOWED-FIELDS"],
      confidence: "medium",
      missingEvidenceCodes: ["physical_baseline"],
      unsupportedReasonCode: null
    }
  }, evidencePack, heightQuestion) as any;
  assert.equal(conciseHeight?.answerToQuestion?.statement,
    "Mapped OpenStreetMap height attribute: 200. This open-map value has not been independently verified.",
    "A concise exact-field model result must still resolve through canonical server rendering without a manual retry.");
  assert.deepEqual(conciseHeight?.answerToQuestion?.missingEvidence, [],
    "Model-selected generic gaps must not dilute a canonical direct-attribute answer.");

  const embeddedHeightValue = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      status: "answered",
      scope: "mapped_form",
      perspective: "investor",
      horizon: "long_term",
      statement: "The mapped height is 1200 according to the selected source record.",
      evidenceRefs: ["EVD-ALLOWED-FIELDS"],
      confidence: "medium",
      missingEvidenceCodes: [],
      unsupportedReasonCode: null
    }
  }, evidencePack, heightQuestion);
  assert.equal(embeddedHeightValue.ok, false,
    "A requested attribute value must match as a complete token rather than as a substring.");

  const unsupportedRoofColour = validateContent({
    ...rawPlan,
    focusedAnswer: {
      status: "unsupported",
      scope: "source_limitation",
      perspective: "investor",
      horizon: "long_term",
      statement: null,
      evidenceRefs: [],
      confidence: "low",
      missingEvidenceCodes: ["physical_baseline"],
      unsupportedReasonCode: "requires_client_asset_source"
    }
  }, evidencePack, roofColourQuestion) as any;
  assert.equal(unsupportedRoofColour?.answerToQuestion?.status, "unsupported",
    "A missing direct attribute must return a safe source-needed result instead of a guessed value.");

  const noisyUnsupportedRoofColour = validateContent({
    ...rawPlan,
    focusedAnswer: {
      status: "unsupported",
      scope: "mapped_form",
      perspective: "investor",
      horizon: "long_term",
      statement: "The model claims a silver roof even though the exact requested source field is not available.",
      evidenceRefs: ["EVD-OBJECT"],
      confidence: "medium",
      missingEvidenceCodes: ["physical_baseline"],
      unsupportedReasonCode: "requires_client_asset_source"
    }
  }, evidencePack, roofColourQuestion) as any;
  assert.equal(noisyUnsupportedRoofColour?.answerToQuestion?.status, "unsupported");
  assert.equal(String(noisyUnsupportedRoofColour?.answerToQuestion?.statement).includes("silver"), false,
    "Raw prose and confidence from an unsupported model result must be discarded before rendering.");
  assert.equal(noisyUnsupportedRoofColour?.answerToQuestion?.confidence, "low",
    "Unsupported answers must be normalized to deterministic low confidence.");

  const safePlanningGap = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      ...rawPlan.focusedAnswer,
      statement: "The mapped hotel and nearby World Trade Centre station support a location screen, while planning approval is not established and requires authoritative validation.",
      evidenceRefs: ["EVD-CLASSIFICATION", "EVD-CONTEXT-01"]
    }
  }, evidencePack, focusedAnalysisRequest);
  assert.equal(safePlanningGap.ok, true,
    "A negative planning-evidence statement must not be mistaken for an affirmative approval claim.");

  const affirmativePlanningClaim = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      ...rawPlan.focusedAnswer,
      statement: "The nearby World Trade Centre station supports the location and planning approval is confirmed for development.",
      evidenceRefs: ["EVD-CONTEXT-01"]
    }
  }, evidencePack, focusedAnalysisRequest);
  assert.equal(affirmativePlanningClaim.ok, false,
    "An affirmative planning-approval claim must fail without authoritative planning evidence.");

  const financialOverclaim = validateContentDetailed({
    ...rawPlan,
    focusedAnswer: {
      ...rawPlan.focusedAnswer,
      statement: "The selected object is definitely worth AED 10000000 and guarantees a strong investment return.",
      evidenceRefs: ["EVD-OBJECT"]
    }
  }, evidencePack, focusedAnalysisRequest);
  assert.equal(financialOverclaim.ok, false,
    "Unsupported value, currency and guaranteed-return claims must fail closed.");

  const marketQuestionRequest = {
    ...focusedAnalysisRequest,
    question: "What is the current market value, expected cost and investment return for this object?"
  };
  const unsupportedMarketPlan = {
    ...rawPlan,
    focusedAnswer: {
      status: "unsupported",
      scope: "source_limitation",
      perspective: "investor",
      horizon: "long_term",
      statement: null,
      evidenceRefs: [],
      confidence: "low",
      missingEvidenceCodes: ["current_market", "cost_financials"],
      unsupportedReasonCode: "requires_licensed_market_source"
    }
  };
  const unsupportedMarket = validateContent(unsupportedMarketPlan, evidencePack, marketQuestionRequest) as any;
  assert.ok(unsupportedMarket?.answerToQuestion,
    "A market question outside the current evidence must return a safe, useful unsupported result.");
  assert.equal(unsupportedMarket.answerToQuestion.status, "unsupported");
  assert.deepEqual(unsupportedMarket.answerToQuestion.missingEvidence,
    ["licensed current demand, supply and rent evidence", "verified costs and financial assumptions"]);
  assert.equal(String(unsupportedMarket.answerToQuestion.statement).includes("cannot answer this market or financial question"), true,
    "Unsupported questions must explain the exact source class needed instead of substituting a generic answer.");

  const initialPlan = { ...rawPlan, answerCode: null, focusedAnswer: null };
  const validatedInitial = validateContent(initialPlan, evidencePack, initialAnalysisRequest);
  assert.ok(validatedInitial, "An initial analysis may correctly omit a focused answer code.");
  assert.equal(validatedInitial.answerToQuestion, null, "Initial analysis must preserve a null focused answer.");
  const initialRequestSchema = ((((buildRequest(evidencePack, initialAnalysisRequest, modelProfile).text as JsonObject).format as JsonObject).schema as JsonObject).properties as JsonObject).focusedAnswer as JsonObject;
  assert.equal(initialRequestSchema.type, "null",
    "The strict initial-analysis schema must make focusedAnswer null rather than inviting unused model prose.");
  assert.equal(validateContent(rawPlan, evidencePack, initialAnalysisRequest), null,
    "An initial analysis must reject an answer code when no question was asked.");
}

async function assertLiveOverpassContext(): Promise<void> {
  const liveEvidencePath = path.join(ROOT, "src/lib/prototype/point-to-object-live-evidence.ts");
  const trustedIdentityModuleUrl = pathToFileURL(
    path.join(ROOT, "src/lib/prototype/point-to-object-trusted-identity.ts")
  ).href;
  const liveEvidence = await importErasableTypeScript(liveEvidencePath, [
    [/import "server-only";\n/, ""],
    [
      /import \{ LIVE_POINT_CAVEAT \} from "@\/src\/lib\/point-to-object\/contracts";\n/,
      `const LIVE_POINT_CAVEAT = ${JSON.stringify(LIVE_POINT_CAVEAT)};\n`
    ],
    [
      /import \{ semanticHash \} from "@\/src\/lib\/point-to-object\/hash";\n/,
      "const semanticHash = (value) => JSON.stringify(value);\n"
    ],
    [
      /import \{[\s\S]*?\} from "\.\/point-to-object-markets";\n/,
      `const nominatimLocale = (locale) => locale === "ru" ? "ru,en" : "en";\nconst pointObjectMarket = () => ({ bounds: [[54.8, 24.8], [55.8, 25.6]], countryCode: "ae" });\n`
    ],
    [
      /import \{\n  matchPointObjectTrustedIdentityAnchor,[\s\S]*?\n\} from "\.\/point-to-object-trusted-identity";\n/,
      `import { matchPointObjectTrustedIdentityAnchor, pointObjectIdentityEvidenceDescriptor, pointObjectLookupAssociation } from ${JSON.stringify(trustedIdentityModuleUrl)};\n`
    ]
  ]);
  const buildQuery = liveEvidence.buildOverpassNearbyQuery as (point: [number, number]) => string;
  const buildFabricQuery = liveEvidence.buildOverpassUrbanFabricQuery as (point: [number, number]) => string;
  const normalize = liveEvidence.normalizeOverpassNearbyContext as (
    payload: unknown,
    point: [number, number],
    selectedSourceFeatureId: string,
    locale?: string
  ) => Array<JsonObject>;
  const resolve = liveEvidence.resolveLiveNearbyContext as (
    point: [number, number],
    selectedSourceFeatureId: string,
    locale: string,
    loader: (query: string) => Promise<unknown>
  ) => Promise<JsonObject>;
  const normalizeFabric = liveEvidence.normalizeOverpassUrbanFabric as (
    payload: unknown,
    point: [number, number]
  ) => JsonObject;
  const calculateGeometryMetrics = liveEvidence.geometryMetrics as (geometry: unknown) => JsonObject | null;

  const point: [number, number] = [55.271928, 25.20811];
  const query = buildQuery(point);
  assert.match(query, /\[out:json\]\[timeout:4\]\[maxsize:524288\]/,
    "Nearby live context must enforce an upstream execution and response-size budget.");
  assert.match(query, /\(around:800,25\.208110,55\.271928\)/,
    "Nearby live context must use the normalized server-side point and a bounded 800 m radius.");
  assert.match(query, /out center 120;/,
    "Nearby live context must cap the upstream result set and request only tags plus element centres.");
  assert.equal(query.includes("owner"), false, "Nearby context must not request ownership data.");

  const fabricQuery = buildFabricQuery(point);
  assert.match(fabricQuery, /\(around:400,25\.208110,55\.271928\)/,
    "Urban-fabric aggregation must use a separately bounded 400 m radius.");
  assert.match(fabricQuery, /out tags center 320;/,
    "Urban-fabric aggregation must cap upstream elements and request only tags plus centres.");
  assert.equal(fabricQuery.includes("owner"), false,
    "Urban-fabric aggregation must not request ownership or similarly unneeded fields.");

  const fabric = normalizeFabric({ elements: [
    { type: "way", id: 101, center: { lat: 25.20812, lon: 55.27194 }, tags: { building: "apartments", "building:levels": "6" } },
    { type: "way", id: 102, center: { lat: 25.20814, lon: 55.27196 }, tags: { building: "apartments", "building:levels": "8" } },
    { type: "way", id: 103, center: { lat: 25.20816, lon: 55.27198 }, tags: { building: "apartments", "building:levels": "10" } },
    { type: "way", id: 104, center: { lat: 25.20818, lon: 55.27200 }, tags: { building: "commercial", "building:levels": "12" } },
    { type: "way", id: 105, center: { lat: 25.20820, lon: 55.27202 }, tags: { building: "office", "building:levels": "14" } },
    { type: "node", id: 106, lat: 25.20822, lon: 55.27204, tags: { shop: "supermarket" } },
    { type: "node", id: 107, lat: 25.20824, lon: 55.27206, tags: { public_transport: "station" } },
    { type: "way", id: 108, center: { lat: 25.20826, lon: 55.27208 }, tags: { highway: "primary" } }
  ] }, point);
  assert.equal(fabric.coverage, "available");
  assert.equal(fabric.sampleSize, 8);
  assert.equal(fabric.mappedBuildingCount, 5);
  assert.equal(fabric.mappedLevelsKnownCount, 5);
  assert.equal(fabric.medianMappedLevels, 10);
  assert.equal((fabric.districtCharacter as JsonObject).code, "residential",
    "The transparent district rule must derive a stable character from returned mapped-use counts.");
  assert.ok(typeof fabric.nearestTransitM === "number" && typeof fabric.nearestMajorRoadM === "number",
    "Mapped transit and major-road proximity must be derived as straight-line context metrics.");
  assert.equal((fabric.groups as JsonObject[]).some((group) => group.group === "residential" && group.count === 3), true,
    "The aggregate must expose a compact mapped activity/use mix.");

  const squareMetrics = calculateGeometryMetrics({
    type: "Polygon",
    coordinates: [[
      [55.2710, 25.2080], [55.2720, 25.2080], [55.2720, 25.2090], [55.2710, 25.2090], [55.2710, 25.2080]
    ]]
  });
  assert.ok(squareMetrics && Number(squareMetrics.footprintAreaSqM) > 9_000 && Number(squareMetrics.footprintAreaSqM) < 12_000,
    "Mapped polygon footprint area must be calculated approximately and within a defensible local range.");
  assert.equal(squareMetrics?.method, "local_equirectangular_wgs84_approximation");
  assert.equal(squareMetrics?.geometryGeneralized, true,
    "Footprint metrics must carry the generalized/open-map geometry limitation in their typed contract.");

  const payload = {
    osm3s: { timestamp_osm_base: "2026-09-03T21:00:00Z" },
    elements: [
      { type: "node", id: 1, lat: 25.2082, lon: 55.2720, tags: { amenity: "school", name: "Future School" } },
      { type: "node", id: 2, lat: 25.2083, lon: 55.2721, tags: { amenity: "hospital", name: "City Hospital" } },
      { type: "node", id: 3, lat: 25.2084, lon: 55.2722, tags: { shop: "supermarket", name: "Daily Market" } },
      { type: "node", id: 4, lat: 25.2085, lon: 55.2723, tags: { public_transport: "station", name: "Metro Station" } },
      { type: "way", id: 5, center: { lat: 25.2086, lon: 55.2724 }, tags: { highway: "primary", name: "Main Road" } },
      { type: "relation", id: 6, center: { lat: 25.2087, lon: 55.2725 }, tags: { leisure: "park", name: "City Park" } },
      { type: "node", id: 7, lat: 25.2088, lon: 55.2726, tags: { tourism: "museum", name: "City Museum" } },
      { type: "node", id: 8, lat: 25.2089, lon: 55.2727, tags: { amenity: "pharmacy", name: "Health Pharmacy" } },
      { type: "node", id: 9, lat: 25.2090, lon: 55.2728, tags: { highway: "bus_stop", name: "Central Stop" } },
      { type: "node", id: 10, lat: 25.2091, lon: 55.2729, tags: { amenity: "cafe", name: "Excluded Cafe" } },
      { type: "node", id: 11, lat: 25.2092, lon: 55.2730, tags: { amenity: "school", name: "Second School" } },
      { type: "node", id: 11, lat: 25.2500, lon: 55.3100, tags: { amenity: "school", name: "Duplicate Far School" } },
      { type: "node", id: 12, lat: 25.2093, lon: 55.2731, tags: { shop: "convenience" } },
      { type: "node", id: 13, lat: 0, lon: 0, tags: { amenity: "hospital", name: "Impossible Far Hospital" } },
      { type: "node", id: 99, lat: 25.20811, lon: 55.271928, tags: { amenity: "school", name: "Selected Object" } }
    ]
  };
  const items = normalize(payload, point, "node/99", "en-AE");
  assert.ok(items.length >= 7 && items.length <= 12,
    "The normalizer must retain a compact, decision-relevant and category-balanced context sample.");
  assert.equal(new Set(items.map((item) => item.sourceFeatureId)).size, items.length,
    "Nearby OSM identities must be deduplicated.");
  assert.equal(items.some((item) => item.sourceFeatureId === "node/99"), false,
    "The selected object must not be duplicated into its own nearby context.");
  assert.equal(items.some((item) => item.name === "Excluded Cafe"), false,
    "Non-allowlisted high-volume POI categories must be discarded.");
  assert.equal(items.some((item) => item.name === "Impossible Far Hospital"), false,
    "Implausibly distant mocked elements must fail closed.");
  assert.equal(items.every((item, index) => item.evidenceId === `EVD-CONTEXT-${index + 1}`), true,
    "Nearby context must receive stable dedicated evidence IDs.");
  assert.equal(items.every((item) => typeof item.distanceM === "number" && item.distanceM >= 0), true,
    "Every nearby record must expose a bounded straight-line distance.");
  assert.equal(items.every((item) => item.method === "overpass_around_query_element_center_haversine"), true,
    "Every nearby distance must disclose its exact non-routing method.");

  let injectedQuery = "";
  const resolved = await resolve(point, "node/99", "en-AE", async (candidateQuery) => {
    injectedQuery = candidateQuery;
    return payload;
  });
  assert.equal(injectedQuery, query, "The injected loader must receive the same bounded query used at runtime.");
  assert.equal(resolved.status, "available");
  assert.equal(resolved.observedAt, "2026-09-03T21:00:00.000Z");
  assert.ok(typeof resolved.responseHash === "string" && resolved.responseHash.length > 0,
    "A successful nearby response must receive a deterministic normalized receipt hash.");
  assert.deepEqual(
    await resolve(point, "node/99", "en", async () => { throw new Error("upstream unavailable"); }),
    { status: "unavailable", items: [], responseHash: null, observedAt: null },
    "Nearby enrichment must degrade to an explicit empty result without failing primary object resolution."
  );
}

async function assertCandidateAssertions(validateReceipt: ReturnType<Ajv2020["compile"]>): Promise<void> {
  const corePath = path.join(ROOT, "src/lib/point-to-object/candidate-assertion-core.ts");
  assert.ok(existsSync(corePath), "Pure candidate assertion core is required for executable security tests.");
  const coreModule = await importErasableTypeScript(corePath, [
    [/import type \{ CandidateAssertionReceipt \} from "\.\/contracts";\n/, ""],
    [/import \{ sha256 \} from "\.\/hash";\n/, "const sha256 = (value) => createHash(\"sha256\").update(value).digest(\"hex\");\n"],
    [/import \{ createHmac, randomBytes, timingSafeEqual \} from "node:crypto";/, "import { createHash, createHmac, randomBytes, timingSafeEqual } from \"node:crypto\";"]
  ]);
  const InMemoryCandidateAssertionService = coreModule.InMemoryCandidateAssertionService as new (options?: Record<string, unknown>) => {
    issue(binding: Record<string, string>): { token: string };
    consume(token: string, expected: Record<string, string>): JsonObject;
  };
  const hash = (seed: string) => sha256(seed);
  const key = Buffer.alloc(32, 7);
  const nonce = Buffer.alloc(32, 11);
  let now = Date.parse("2026-08-31T17:41:47.000Z");
  const store = new Map();
  const service = new InMemoryCandidateAssertionService({ now: () => now, signingKey: key, createNonce: () => nonce, store, ttlMs: 1000 });
  const binding = {
    tenantScope: "tenant_alpha",
    requestHash: hash("request"), pointHash: hash("point"), resolutionHash: hash("resolution"),
    candidateSetHash: hash("set"), snapshotId: "snapshot-v1", candidateId: "candidate-v1"
  };
  const expected = (({ candidateId: _candidateId, ...rest }) => rest)(binding);

  assert.throws(
    () => new InMemoryCandidateAssertionService({ signingKey: Buffer.alloc(31) }),
    (error: any) => error?.code === "CONTRACT_VALIDATION_FAILED",
    "Short assertion signing keys must fail with a typed contract error."
  );
  assert.throws(
    () => new InMemoryCandidateAssertionService({ signingKey: key, createNonce: () => Buffer.alloc(31) }).issue(binding),
    (error: any) => error?.code === "INTERNAL_ERROR",
    "Invalid assertion nonces must fail with a typed internal error."
  );
  assert.throws(
    () => new InMemoryCandidateAssertionService({ signingKey: key, storeCap: 0 }).issue(binding),
    (error: any) => error?.code === "INTERNAL_ERROR",
    "Assertion store exhaustion must fail with a typed internal error."
  );
  assert.throws(
    () => new InMemoryCandidateAssertionService({ signingKey: key }).issue({ ...binding, tenantScope: "INVALID" }),
    (error: any) => error?.code === "CONTRACT_VALIDATION_FAILED",
    "Invalid server-derived tenant scope must fail with a typed contract error."
  );

  const receipt = service.issue(binding);
  assert.match(receipt.token, /^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/);
  assert.equal((receipt as JsonObject).tenant_scope, undefined);
  assert.match(String((receipt as JsonObject).tenant_binding_hash), /^[a-f0-9]{64}$/);
  assert.notEqual(
    (receipt as JsonObject).tenant_binding_hash,
    sha256(`tenant-binding:${binding.tenantScope}`),
    "Tenant binding must be keyed and must not expose a low-entropy unsalted digest."
  );
  assert.equal((receipt as JsonObject).intended_scope, "candidate_selection");
  assert.equal(validateReceipt(receipt), true, JSON.stringify(validateReceipt.errors));
  assert.equal(service.consume(receipt.token, expected).ok, true);
  assert.deepEqual(service.consume(receipt.token, expected), { ok: false, reason: "invalid" }, "Assertion must be single-use.");

  const tampered = service.issue(binding);
  const tamperedToken = `${tampered.token.slice(0, -1)}${tampered.token.endsWith("A") ? "B" : "A"}`;
  assert.deepEqual(service.consume(tamperedToken, expected), { ok: false, reason: "invalid" });

  const wrongBinding = service.issue(binding);
  assert.deepEqual(service.consume(wrongBinding.token, { ...expected, requestHash: hash("other") }), { ok: false, reason: "invalid" });
  assert.deepEqual(service.consume(wrongBinding.token, expected), { ok: false, reason: "invalid" }, "Binding mismatch must consume the assertion.");

  const crossTenant = service.issue(binding);
  assert.deepEqual(service.consume(crossTenant.token, { ...expected, tenantScope: "tenant_beta" }), { ok: false, reason: "access_denied" });

  const expiring = service.issue(binding);
  now += 1001;
  assert.deepEqual(service.consume(expiring.token, expected), { ok: false, reason: "invalid" });

  const cold = service.issue(binding);
  const coldService = new InMemoryCandidateAssertionService({ now: () => now, signingKey: Buffer.alloc(32, 8), createNonce: () => Buffer.alloc(32, 12), store });
  assert.deepEqual(coldService.consume(cold.token, expected), { ok: false, reason: "invalid" }, "Cold-key/cross-instance verification must fail closed.");
}

async function main(): Promise<void> {
  const { schema, validateRoot, validateRequest, validateCandidateAssertionReceipt } = compileSchema();
  assertFiniteEnums(schema);
  assertRequestParser(validateRequest);
  await assertRuntimeRequestParser();
  await assertFeatureGate();
  await assertErrorStatusMatrix();
  assertSchemaNegativeCases(validateRoot);
  assertSemanticValidation(validateRoot);
  await assertActualCorePipeline(validateRoot);
  await assertActualPipeline(validateRoot, validateCandidateAssertionReceipt);
  await assertRepositoryAuthorityQuarantine();
  assertStaticBoundaries();
  await assertLiveOverpassContext();
  await assertCandidateAiSafety();
  await assertCandidateAssertions(validateCandidateAssertionReceipt);

  console.log(JSON.stringify({
    status: "PASS",
    profile: LIVE_POINT_PROFILE_VERSION,
    schema_id: LIVE_POINT_SCHEMA_ID,
    schema_sha256: sha256(readFileSync(SCHEMA_PATH)),
    deterministic_pack_evidence: "HOLD_NOT_IDENTITY_ACCEPTANCE",
    checks: {
      schema_compilation: true,
      exact_schema_hash: true,
      finite_enums_and_caps: true,
      point_only_request_negatives: true,
      actual_runtime_request_parser_negatives: true,
      runtime_surfaces_candidate_allowlist: true,
      production_hard_deny: true,
      typed_error_status_matrix: true,
      hmac_assertion_tamper_replay_expiry_binding_cold_key: true,
      runtime_provider_and_secret_boundary: true,
      candidate_ai_typed_plan_and_server_render_boundary: true,
      live_overpass_nearby_context_bounded_and_fail_closed: true,
      actual_resolver_context_evidence_compose_pipeline: true,
      synthetic_non_runtime_semantic_matrix: true,
      geometry_artifact_hash_and_byte_caps: true,
      synthetic_repository_authority_quarantine: true,
      frozen_external_data_candidate_only: true
    },
    caveat: LIVE_POINT_CAVEAT
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : canonicalJson(error));
  process.exitCode = 1;
});
