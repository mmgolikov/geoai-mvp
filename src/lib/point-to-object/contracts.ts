export const LIVE_POINT_SCHEMA_ID =
  "urn:geoai:point-to-object-001:evidence-bundle:0.1.0-rc.1" as const;
export const LIVE_POINT_PROFILE_VERSION = "0.1.0-rc.1" as const;
export const LIVE_POINT_SCENARIO_ID = "b2b_redevelopment_selected_aoi" as const;
export const LIVE_POINT_CANONICAL_SCHEMA_VERSION = "0.3.0" as const;
export const LIVE_POINT_RESOLVER_VERSION = "point-to-object-resolver-v1" as const;
export const LIVE_POINT_CONTEXT_VERSION = "point-to-object-context-v1" as const;
export const LIVE_POINT_CLAIM_POLICY_VERSION = "point-to-object-claim-policy-v1" as const;
export const LIVE_POINT_GEOMETRY_VERSION = "geojson-wgs84-v1" as const;

// Internal aliases only. Public route authority is schema_id + profile_version above.
export const LIVE_POINT_PROFILE = "point_to_object_e1_core_v1" as const;
export const LIVE_POINT_SCHEMA_VERSION = "point-to-object-api-v1" as const;

export const LIVE_POINT_CAVEAT =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion." as const;

export const LIVE_POINT_OPERATIONS = [
  "resolve_entity",
  "get_context",
  "get_evidence_bundle"
] as const;
export type LivePointOperation = (typeof LIVE_POINT_OPERATIONS)[number];

export const LIVE_POINT_SELECTION_INTENTS = [
  "general_object",
  "building",
  "road",
  "poi",
  "land_use"
] as const;
export type LivePointSelectionIntent = (typeof LIVE_POINT_SELECTION_INTENTS)[number];

export const LIVE_POINT_ANALYSIS_LENSES = [
  "open_context_summary",
  "nearby_services",
  "source_and_limits",
  "official_validation_actions",
  "prohibited_high_impact_claim"
] as const;
export type LivePointAnalysisLens = (typeof LIVE_POINT_ANALYSIS_LENSES)[number];

export const LIVE_POINT_RESOLUTION_STATUSES = [
  "resolved",
  "ambiguous",
  "coordinate_context_only",
  "no_result",
  "outside_coverage"
] as const;
export type LivePointResolutionStatus = (typeof LIVE_POINT_RESOLUTION_STATUSES)[number];

export const LIVE_POINT_ENTITY_TYPES = [
  "building",
  "building_part",
  "building_complex",
  "land_use",
  "road_segment",
  "poi"
] as const;
export type LivePointEntityType = (typeof LIVE_POINT_ENTITY_TYPES)[number];

export const LIVE_POINT_CONTEXT_CATEGORIES = [
  "school",
  "childcare",
  "clinic",
  "hospital",
  "pharmacy",
  "grocery",
  "supermarket",
  "retail_anchor",
  "public_transport_stop",
  "public_transport_station",
  "major_road",
  "park_green_space"
] as const;
export type LivePointContextCategory = (typeof LIVE_POINT_CONTEXT_CATEGORIES)[number];

export const LIVE_POINT_WARNING_CODES = [
  "BOUNDARY_CONTACT",
  "PARTIAL_CONTEXT_SOURCE",
  "SOURCE_FRESHNESS_UNKNOWN",
  "SOURCE_STALE",
  "SOURCE_CONFLICT",
  "CONTEXT_TRUNCATED",
  "CENTROID_FALLBACK",
  "MODEL_FALLBACK",
  "COORDINATE_CONTEXT_ONLY",
  "UNNAMED_SOURCE_FEATURE"
] as const;
export type LivePointWarningCode = (typeof LIVE_POINT_WARNING_CODES)[number];

export const LIVE_POINT_ERROR_CODES = [
  "INVALID_REQUEST",
  "INVALID_COORDINATE",
  "COORDINATE_ORDER_SUSPECTED",
  "INPUT_LIMIT_EXCEEDED",
  "ANCHOR_MISMATCH",
  "SNAPSHOT_MISSING",
  "SNAPSHOT_CORRUPT",
  "SNAPSHOT_HASH_MISMATCH",
  "SNAPSHOT_INDEX_UNAVAILABLE",
  "GEOMETRY_NOT_FOUND",
  "GEOMETRY_HASH_MISMATCH",
  "RIGHTS_UNKNOWN",
  "RIGHTS_BLOCKED",
  "SOURCE_STALE_BLOCKED",
  "PREVIEW_DISABLED",
  "PRODUCTION_DENIED",
  "ACCESS_DENIED",
  "CONTRACT_VALIDATION_FAILED",
  "CANDIDATE_ASSERTION_INVALID",
  "CANDIDATE_SET_OVERFLOW",
  "INTERNAL_ERROR"
] as const;
export type LivePointErrorCode = (typeof LIVE_POINT_ERROR_CODES)[number];

export type LivePointErrorStatus = "invalid_input" | "source_unavailable" | "blocked" | "failed";
export type LivePointExecutionStatus = "completed" | "partial";

export const LIVE_POINT_MODEL_STATES = [
  "not_requested",
  "completed",
  "fallback",
  "blocked_by_gate",
  "timeout",
  "refusal",
  "incomplete",
  "missing_output",
  "invalid_output",
  "upstream_error"
] as const;
export type LivePointModelState = (typeof LIVE_POINT_MODEL_STATES)[number];

export const LIVE_POINT_CAPS = {
  requestBytes: 32 * 1024,
  responseBytes: 1024 * 1024,
  inlineGeometryBytes: 256_000,
  allInlineGeometryBytes: 256 * 1024,
  candidates: 20,
  facilities: 100,
  requestedCategories: 20,
  contextRadiusM: 1_500,
  modelTimeoutMs: 12_000,
  modelMaxOutputTokens: 700,
  modelMaxCostUsd: 0.1
} as const;

export type Position = [longitude: number, latitude: number];
export type GeoJsonGeometry =
  | { type: "Point"; coordinates: Position }
  | { type: "LineString"; coordinates: Position[] }
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };

export interface LivePointInput {
  kind: "point";
  clicked_point: {
    longitude: number;
    latitude: number;
    crs: "EPSG:4326";
    coordinate_order_confirmed: boolean;
  };
}

export interface CandidateAssertionInput {
  token: string;
}

export interface LivePointRequestAnchors {
  snapshot_id: string;
  snapshot_hash: string;
  resolution_hash: string | null;
  entity_id: string | null;
  geometry_hash: string | null;
  evidence_bundle_hash: string | null;
  metric_hashes: string[];
  preserve_entity: boolean;
  preserve_bundle: boolean;
  refresh_requested: boolean;
}

export interface LivePointRequest {
  schema_id: typeof LIVE_POINT_SCHEMA_ID;
  profile_version: typeof LIVE_POINT_PROFILE_VERSION;
  scenario_id: typeof LIVE_POINT_SCENARIO_ID;
  operation: LivePointOperation;
  input: LivePointInput;
  selection_intent: LivePointSelectionIntent;
  candidate_assertion: CandidateAssertionInput | null;
  requested_categories: LivePointContextCategory[];
  context_radius_m: number;
  locale: string;
  analysis_lens: LivePointAnalysisLens;
  anchors: LivePointRequestAnchors | null;
}

export interface LivePointWarning {
  code: LivePointWarningCode;
  message: string;
}

export interface LivePointExecutionReceipt {
  request_id: string;
  trace_id: string;
  operation: LivePointOperation;
  status: LivePointExecutionStatus;
  resolver_version: typeof LIVE_POINT_RESOLVER_VERSION;
  context_version: typeof LIVE_POINT_CONTEXT_VERSION;
  claim_policy_version: typeof LIVE_POINT_CLAIM_POLICY_VERSION;
  snapshot_ids: string[];
  warnings: LivePointWarning[];
  stage_timings: Array<{
    stage: "validate" | "load_snapshot" | "resolve" | "context" | "evidence" | "narrative" | "serialize";
    duration_ms: number;
  }>;
  cache_state: "injected_synthetic_fixture" | "coverage_registry_only";
  request_byte_count: number;
  response_byte_count: number;
  geometry_byte_count: number;
  caps: typeof LIVE_POINT_CAPS;
  rights_decision: "cleared_for_experiment" | "not_evaluated";
  rights_state: "cleared" | "not_evaluated";
  runtime_network_used: false;
  persistence_used: false;
}

interface LivePointExecutionEnvelopeBase {
  schema_id: typeof LIVE_POINT_SCHEMA_ID;
  profile_version: typeof LIVE_POINT_PROFILE_VERSION;
  canonical_schema_version: typeof LIVE_POINT_CANONICAL_SCHEMA_VERSION;
  response_id: string;
  generated_at: string;
  caveat: typeof LIVE_POINT_CAVEAT;
}

export interface LivePointErrorEnvelope {
  schema_id: typeof LIVE_POINT_SCHEMA_ID;
  profile_version: typeof LIVE_POINT_PROFILE_VERSION;
  response_kind: "error";
  response_id: string;
  generated_at: string;
  caveat: typeof LIVE_POINT_CAVEAT;
  status: LivePointErrorStatus;
  errors: LivePointErrorItem[];
}

export type LivePointErrorItem =
  | {
      code: Exclude<LivePointErrorCode, "CANDIDATE_SET_OVERFLOW">;
      message: string;
      retryable: boolean;
      eligible_count?: never;
      eligible_count_withheld_reason?: never;
      refinement_action?: never;
    }
  | {
      code: "CANDIDATE_SET_OVERFLOW";
      message: string;
      retryable: false;
      eligible_count: number | null;
      eligible_count_withheld_reason: "count_not_safe_to_disclose" | null;
      refinement_action: "submit_more_precise_point_or_zoom";
    };

export interface SnapshotAnchor {
  manifest_id: string;
  snapshot_id: string;
  snapshot_hash: string;
  snapshot_semantic_hash: string;
  source_as_of: string;
  retrieved_at: string;
  acquisition_receipt_id: string;
  rights_status: "cleared_for_experiment";
}

export interface LivePointCoverageReceipt {
  coverage_id: string;
  case_pack_id: string;
  inside_coverage: boolean;
  coverage_status: "measured_partial";
  radius_m: number;
  bbox: [number, number, number, number];
  geometry_hash: string;
  calculation_crs: "EPSG:32640" | "EPSG:32648";
  proof_limit: string;
}

export type LivePointMatchMethod =
  | "candidate_assertion"
  | "point_in_polygon"
  | "point_on_boundary"
  | "nearest_feature"
  | "coordinate_only"
  | "none";

export interface CandidateAssertionReceipt {
  token: string;
  tenant_binding_hash: string;
  intended_scope: "candidate_selection";
  expires_at: string;
  request_hash: string;
  point_hash: string;
  resolution_hash: string;
  candidate_set_hash: string;
  snapshot_id: string;
}

export interface LivePointCandidate {
  candidate_id: string;
  entity_id: string;
  entity_hash: string;
  geometry_id: string;
  geometry_hash: string;
  geometry_type: GeoJsonGeometry["type"];
  geometry_version: typeof LIVE_POINT_GEOMETRY_VERSION;
  source_id: string;
  source_namespace: "SyntheticFixture";
  entity_type: LivePointEntityType;
  display_name: string | null;
  source_tags: Record<string, string>;
  match_method: Exclude<LivePointMatchMethod, "coordinate_only" | "none">;
  containment: "inside" | "boundary" | "outside";
  distance_m: number;
  distance_method: "utm_point_to_boundary" | "utm_point_to_line" | "utm_point_to_point";
  authority_status: "open_context_not_official";
  source_as_of: string;
  retrieved_at: string;
  limitations: string[];
  candidate_assertion: CandidateAssertionReceipt | null;
}

export interface LivePointSelectionReceipt {
  resolver_version: typeof LIVE_POINT_RESOLVER_VERSION;
  deterministic: true;
  selection_method: LivePointMatchMethod;
  input_hash: string;
  candidate_set_hash: string;
  candidate_count: number;
  eligible_candidate_count: number;
  search_radius_m: number;
  boundary_tolerance_m: number;
  ambiguity_margin_m: number;
  selected_candidate_id: string | null;
  snapshot_ids: string[];
}

interface LivePointResolutionBase {
  resolution_id: string;
  resolution_hash: string;
  clicked_point: LivePointInput["clicked_point"];
  coverage: LivePointCoverageReceipt;
  candidates: LivePointCandidate[];
  ambiguity_reasons: string[];
  selection_receipt: LivePointSelectionReceipt;
  resolved_at: string;
}

export type LivePointResolution =
  | (LivePointResolutionBase & {
      status: "resolved";
      selected_object: LivePointCandidate;
      ambiguity_reasons: [];
      rights_state: "cleared";
      snapshot_anchor: SnapshotAnchor;
    })
  | (LivePointResolutionBase & {
      status: "ambiguous";
      selected_object: null;
      candidates: [LivePointCandidate, LivePointCandidate, ...LivePointCandidate[]];
      rights_state: "cleared";
      snapshot_anchor: SnapshotAnchor;
    })
  | (LivePointResolutionBase & {
      status: "coordinate_context_only";
      selected_object: null;
      candidates: [];
      ambiguity_reasons: [];
      rights_state: "cleared";
      snapshot_anchor: SnapshotAnchor;
    })
  | (LivePointResolutionBase & {
      status: "no_result";
      selected_object: null;
      candidates: [];
      ambiguity_reasons: [];
      rights_state: "cleared";
      snapshot_anchor: SnapshotAnchor;
    })
  | (LivePointResolutionBase & {
      status: "outside_coverage";
      selected_object: null;
      candidates: [];
      ambiguity_reasons: [];
      rights_state: "not_evaluated";
      snapshot_anchor: null;
    });

export type MissingDataStatus =
  | "not_observed_in_source_snapshot"
  | "coverage_unknown"
  | "source_unavailable"
  | "not_calculable"
  | "unknown";

export interface MissingDataReceipt {
  missing_id: string;
  field_or_category: string;
  status: MissingDataStatus;
  reason: string;
  impact: string;
  required_next_source_or_action: string;
}

export interface LivePointAbsenceReceipt {
  absence_id: string;
  query_id: string;
  query_hash: string;
  category: LivePointContextCategory;
  radius_m: number;
  snapshot_ids: string[];
  queried_at: string;
  result_count: 0;
  coverage_state: "measured_partial" | "coverage_unknown";
  absence_semantics: "no_records_returned_only";
  supports_absence_conclusion: false;
  evidence_ids: string[];
}

export type LivePointCategoryStatus =
  | "observed"
  | "not_observed_in_source_snapshot"
  | "coverage_unknown"
  | "source_unavailable";

export interface LivePointContextMetric {
  metric_id: string;
  metric_hash: string;
  category: LivePointContextCategory;
  label: string;
  value: number | null;
  unit: "count" | "metre";
  status: "observed" | "not_observed_in_source_snapshot" | "not_calculable";
  formula: string;
  distance_method:
    | "utm_euclidean_point_to_point"
    | "utm_point_to_line"
    | "utm_point_to_boundary"
    | "not_applicable";
  source_feature_ids: string[];
  snapshot_ids: string[];
  graph_version: null;
  calculated_at: string;
  proof_limit: string;
  distance_receipt: LivePointDistanceReceipt | null;
}

export interface LivePointDistanceReceipt {
  distance_id: string;
  distance_hash: string;
  value_m: number;
  method: "utm_euclidean_point_to_point";
  origin_basis: "clicked_point";
  destination_basis: "source_feature_point";
  calculation_crs: "EPSG:32640" | "EPSG:32648";
  calculation_model: "wgs84_utm_transverse_mercator";
  library: "geoai_wgs84_utm";
  library_version: string;
  source_snapshot_ids: string[];
  graph_version: null;
  calculated_at: string;
  input_geometry_hashes: [string, string];
  fallback_note: null;
}

export interface LivePointContextFeature {
  feature_id: string;
  source_id: string;
  category: LivePointContextCategory;
  display_name: string | null;
  distance_m: number;
  geometry_basis: "synthetic_point";
  feature_hash: string;
  authority_status: "open_context_not_official";
}

export interface LivePointCategorySummary {
  category: LivePointContextCategory;
  status: LivePointCategoryStatus;
  observed_count: number;
  returned_count: number;
  nearest_feature_id: string | null;
  nearest_distance_m: number | null;
  proof_limit: string;
  absence_receipt: LivePointAbsenceReceipt | null;
}

export interface LivePointContextResult {
  context_id: string;
  context_hash: string;
  quality: "complete" | "partial" | "not_requested" | "not_available";
  anchor_kind: "resolved_entity" | "clicked_point";
  anchor_id: string;
  anchor_hash: string;
  anchor_resolution_hash: string;
  anchor_entity_id: string | null;
  anchor_position: LivePointInput["clicked_point"];
  radius_m: number;
  total_observed_count: number;
  returned_count: number;
  truncated: boolean;
  truncation_reason: string | null;
  category_summaries: LivePointCategorySummary[];
  metrics: LivePointContextMetric[];
  facilities: LivePointContextFeature[];
  missing_data: MissingDataReceipt[];
  source_coverage: {
    case_pack_id: string;
    complete_coverage_radius_m: number;
    outer_evaluation_radius_m: number;
    requested_window_fully_measured: boolean;
    status: "measured_partial" | "coverage_unknown";
    coverage_geometry_hash: string;
    complete_geometry_hash: string;
    proof_limit: string;
  };
  snapshot_anchor: SnapshotAnchor;
}

export interface GeometryReceipt {
  geometry_id: string;
  geometry_hash: string;
  geometry_type: GeoJsonGeometry["type"];
  geometry_version: typeof LIVE_POINT_GEOMETRY_VERSION;
  byte_size: number;
  source_feature_id: string;
  source_namespace: "SyntheticFixture";
  snapshot_id: string;
  origin: "source_vector";
  validation: "valid";
  rights_status: "cleared_for_experiment";
}

export interface AcquisitionReceipt {
  receipt_id: string;
  receipt_hash: string;
  source_id: "synthetic_fixture";
  kind: "acquisition";
  source_as_of: string;
  retrieved_at: string;
  query_radius_m: number;
  normalized_radius_m: number;
  runtime_network_used: false;
}

export interface TermsReceipt {
  terms_receipt_id: string;
  terms_receipt_hash: string;
  license_id: "Synthetic-Non-Runtime-1.0";
  license_url: string;
  rights_status: "cleared_for_experiment";
  attribution: string;
  attribution_url: string;
  allowed_operations: string[];
  prohibited_claims: string[];
}

export type EvidenceQualityStatus =
  | "sufficient_for_open_context"
  | "partial_open_context"
  | "insufficient_evidence"
  | "blocked_by_identity"
  | "blocked_by_conflict";

export interface LivePointEvidenceBundle {
  bundle_id: string;
  bundle_version: 1;
  bundle_hash: string;
  created_at: string;
  quality_status: EvidenceQualityStatus;
  rights_state: "cleared";
  entity_id: string | null;
  entity_hash: string | null;
  geometry_hash: string | null;
  resolution_hash: string;
  context_hash: string | null;
  metric_hashes: string[];
  snapshot_anchor: SnapshotAnchor;
  geometry_receipt: GeometryReceipt | null;
  acquisition_receipt: AcquisitionReceipt;
  terms_receipt: TermsReceipt;
  evidence_items: Array<{
    evidence_id: string;
    kind: "source_identity" | "geometry" | "context_observation" | "calculated_metric";
    source_id: string;
    snapshot_id: string;
    field: string;
    value: string | number | boolean | null;
    proof_limit: string;
  }>;
  absence_receipts: LivePointAbsenceReceipt[];
  missing_data: MissingDataReceipt[];
  conflicts: Array<{
    conflict_id: string;
    field: string;
    evidence_ids: [string, string, ...string[]];
    status: "unresolved";
  }>;
  limitations: string[];
}

export interface LivePointNarrativeAnchors {
  entity_id: string | null;
  geometry_hash: string | null;
  evidence_bundle_hash: string;
  snapshot_hash: string;
  metric_hashes: string[];
}

export interface LivePointFollowUp {
  id: string;
  label: string;
  analysis_lens: Exclude<LivePointAnalysisLens, "prohibited_high_impact_claim">;
  preserve_entity: boolean;
  preserve_bundle: true;
  refresh_requested: false;
}

export interface LivePointNarrative {
  answer_status:
    | "answerable_for_open_context"
    | "partially_answerable"
    | "insufficient_evidence"
    | "blocked";
  headline: string;
  summary: string;
  claims: Array<{
    claim_id: string;
    claim_type:
      | "verified_fact"
      | "deterministic_calculation"
      | "model_inference"
      | "screening_hypothesis"
      | "missing_data"
      | "required_validation";
    text: string;
    evidence_ids: string[];
    metric_ids: string[];
    validation_required: boolean;
  }>;
  risks_and_constraints: string[];
  recommended_next_action: string;
  follow_ups: LivePointFollowUp[];
  caveat: typeof LIVE_POINT_CAVEAT;
  anchors: LivePointNarrativeAnchors;
}

export interface LivePointModelReceipt {
  state: LivePointModelState;
  model: string | null;
  projection_hash: string | null;
  attempt_count: 0 | 1;
  timeout_ms: typeof LIVE_POINT_CAPS.modelTimeoutMs;
  max_output_tokens: typeof LIVE_POINT_CAPS.modelMaxOutputTokens;
  max_cost_usd: typeof LIVE_POINT_CAPS.modelMaxCostUsd;
  tool_call_count: 0;
  store: false;
  fallback_used: boolean;
  output_mode: "deterministic_template" | "validated_structured_output";
  deterministic_parity: {
    entity_id: string | null;
    geometry_hash: string | null;
    evidence_bundle_hash: string;
    snapshot_hash: string;
    metric_hashes: string[];
  };
}

export interface LivePointComposeResult {
  resolution: LivePointResolution;
  context: LivePointContextResult | null;
  evidence_bundle: LivePointEvidenceBundle;
  narrative: LivePointNarrative;
  model_receipt: LivePointModelReceipt;
  render_plan: {
    render_plan_id: string;
    render_plan_hash: string;
    components: Array<{
      component_id: string;
      component_type: "identity" | "context" | "evidence" | "narrative" | "limitations";
      data_reference: string;
    }>;
    highlight_geometry_id: string | null;
    reference_ids: string[];
    accessibility_summary: string;
  };
  governance: {
    claim_level: "open_context_screening";
    rights_state: "cleared";
    validation_state: "official_validation_required";
    privacy_state: "minimized_public_open_context";
    policy_version: typeof LIVE_POINT_CLAIM_POLICY_VERSION;
    caveat: typeof LIVE_POINT_CAVEAT;
  };
  conversation_anchors: LivePointRequestAnchors;
}

export interface LivePointResolveStageResult {
  resolution: LivePointResolution;
}

export interface LivePointContextStageResult {
  resolution: LivePointResolution;
  context: LivePointContextResult | null;
}

export type LivePointApiEnvelope = LivePointExecutionEnvelopeBase & (
  | {
      response_kind: "resolve_stage";
      execution: LivePointExecutionReceipt & { operation: "resolve_entity" };
      result: LivePointResolveStageResult;
    }
  | {
      response_kind: "context_stage";
      execution: LivePointExecutionReceipt & { operation: "get_context" };
      result: LivePointContextStageResult;
    }
  | {
      response_kind: "evidence_bundle_root";
      execution: LivePointExecutionReceipt & { operation: "get_evidence_bundle" };
      result: LivePointComposeResult;
    }
);

export interface LivePointStatusResult {
  available: false;
  mode: "deterministic_scaffolding";
  runtime_source_family: "disabled";
  runtime_network_used: false;
  persistence_used: false;
  snapshot_anchor: null;
  quality_gates: {
    rights: "no_go";
    hash: "hold";
    aoi: "no_go";
    gold: "no_go";
  };
  supported_operations: [];
  supported_entity_types: [];
  supported_selection_intents: [];
}

export interface LivePointStatusEnvelope {
  schema_id: typeof LIVE_POINT_SCHEMA_ID;
  profile_version: typeof LIVE_POINT_PROFILE_VERSION;
  canonical_schema_version: typeof LIVE_POINT_CANONICAL_SCHEMA_VERSION;
  response_kind: "status";
  response_id: string;
  generated_at: string;
  caveat: typeof LIVE_POINT_CAVEAT;
  result: LivePointStatusResult;
}

export interface RawGeometryResponse {
  geometry_id: string;
  geometry_hash: string;
  geometry_version: typeof LIVE_POINT_GEOMETRY_VERSION;
  geometry: GeoJsonGeometry;
}

export interface LivePointGeometryArtifactEnvelope {
  schema_id: typeof LIVE_POINT_SCHEMA_ID;
  profile_version: typeof LIVE_POINT_PROFILE_VERSION;
  canonical_schema_version: typeof LIVE_POINT_CANONICAL_SCHEMA_VERSION;
  response_kind: "geometry_artifact";
  response_id: string;
  generated_at: string;
  caveat: typeof LIVE_POINT_CAVEAT;
  result: RawGeometryResponse;
}
