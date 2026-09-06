import { LIVE_POINT_CAPS, LIVE_POINT_CAVEAT } from "./contracts";
import { semanticHash } from "./hash";

export interface LivePointSemanticIssue {
  code:
    | "ABSTENTION_MATRIX"
    | "AMBIGUOUS_MATRIX"
    | "BUNDLE_ANCHOR"
    | "CANDIDATE_ASSERTION_BINDING"
    | "CANDIDATE_COUNTS"
    | "CONTEXT_ANCHOR"
    | "CONTEXT_COUNTS"
    | "CONVERSATION_ANCHOR"
    | "ENTITY_ANCHOR"
    | "GEOMETRY_BYTES"
    | "HASH_INTEGRITY"
    | "METRIC_HASH_ANCHOR"
    | "MODEL_PARITY"
    | "ORPHAN_CLAIM_REFERENCE"
    | "ORPHAN_RENDER_REFERENCE"
    | "OUTSIDE_COVERAGE_ZERO_CALL"
    | "RESPONSE_BYTES"
    | "RESOLVED_MATRIX"
    | "RIGHTS_CROSSWALK"
    | "SNAPSHOT_ANCHOR"
    | "SUCCESS_BUNDLE_FOR_ABSTENTION"
    | "SYNTHETIC_PROVENANCE"
    | "TRUNCATION_RECEIPT"
    | "USER_VISIBLE_RANKING";
  path: string;
  message: string;
}

export interface LivePointSemanticValidation {
  ok: boolean;
  issues: LivePointSemanticIssue[];
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function sameStrings(left: unknown, right: unknown): boolean {
  const leftStrings = strings(left);
  const rightStrings = strings(right);
  return leftStrings.length === rightStrings.length &&
    leftStrings.every((value, index) => value === rightStrings[index]);
}

function samePoint(left: unknown, right: unknown): boolean {
  if (!isRecord(left) || !isRecord(right)) return false;
  return left.longitude === right.longitude && left.latitude === right.latitude &&
    left.crs === right.crs && left.coordinate_order_confirmed === right.coordinate_order_confirmed;
}

function sameSnapshotAnchor(left: JsonRecord | null, right: JsonRecord | null): boolean {
  if (!left || !right) return left === right;
  return [
    "manifest_id",
    "snapshot_id",
    "snapshot_hash",
    "snapshot_semantic_hash",
    "source_as_of",
    "retrieved_at",
    "acquisition_receipt_id",
    "rights_status"
  ].every((key) => left[key] === right[key]);
}

function withoutKeys(record: JsonRecord, keys: readonly string[]): JsonRecord {
  const excluded = new Set(keys);
  return Object.fromEntries(Object.entries(record).filter(([key]) => !excluded.has(key)));
}

function assertContentHash(
  issues: LivePointSemanticIssue[],
  record: JsonRecord,
  hashKey: string,
  path: string,
  idKey?: string,
  idPrefix?: string
): string {
  const expectedHash = semanticHash(withoutKeys(record, [hashKey, ...(idKey ? [idKey] : [])]));
  if (record[hashKey] !== expectedHash) {
    addIssue(issues, "HASH_INTEGRITY", `${path}.${hashKey}`, "Content hash does not match the canonical record projection.");
  }
  if (idKey && idPrefix && record[idKey] !== `${idPrefix}${expectedHash.slice(0, 24)}`) {
    addIssue(issues, "HASH_INTEGRITY", `${path}.${idKey}`, "Content-addressed ID does not match the canonical hash.");
  }
  return expectedHash;
}

function addIssue(
  issues: LivePointSemanticIssue[],
  code: LivePointSemanticIssue["code"],
  path: string,
  message: string
): void {
  if (!issues.some((issue) => issue.code === code && issue.path === path)) {
    issues.push({ code, path, message });
  }
}

function findForbiddenOutputKeys(value: unknown, path: string, issues: LivePointSemanticIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => findForbiddenOutputKeys(entry, `${path}[${index}]`, issues));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (/^(?:rank|score|preference|preferred|winner|decision_score)$/i.test(key)) {
      addIssue(issues, "USER_VISIBLE_RANKING", `${path}.${key}`, "Ranking or preference fields are not part of the frozen profile.");
    }
    findForbiddenOutputKeys(nested, `${path}.${key}`, issues);
  }
}

/**
 * Cross-field validation for the frozen profile. JSON Schema remains the shape
 * authority; this validator enforces status, rights, anchor, reference and byte
 * invariants that JSON Schema cannot express safely.
 */
export function validateLivePointSemantics(value: unknown): LivePointSemanticValidation {
  const issues: LivePointSemanticIssue[] = [];
  findForbiddenOutputKeys(value, "$", issues);
  if (!isRecord(value)) return { ok: issues.length === 0, issues };

  const result = isRecord(value.result) ? value.result : value;
  const resolution = isRecord(result.resolution) ? result.resolution : null;
  const execution = isRecord(value.execution) ? value.execution : null;
  const context = isRecord(result.context) ? result.context : null;
  const bundle = isRecord(result.evidence_bundle) ? result.evidence_bundle : null;
  const narrative = isRecord(result.narrative) ? result.narrative : null;
  const model = isRecord(result.model_receipt) ? result.model_receipt : null;
  const renderPlan = isRecord(result.render_plan) ? result.render_plan : null;
  const governance = isRecord(result.governance) ? result.governance : null;
  const conversation = isRecord(result.conversation_anchors) ? result.conversation_anchors : null;

  if (typeof value.caveat === "string" && value.caveat !== LIVE_POINT_CAVEAT) {
    addIssue(issues, "RIGHTS_CROSSWALK", "$.caveat", "The exact mandatory caveat changed.");
  }
  if (value.response_kind === "geometry_artifact") {
    const geometry = result.geometry;
    if (result.geometry_hash !== semanticHash(geometry)) {
      addIssue(issues, "HASH_INTEGRITY", "$.result.geometry_hash", "Geometry artifact hash does not match the canonical geometry payload.");
    }
    if (Buffer.byteLength(JSON.stringify(geometry), "utf8") > LIVE_POINT_CAPS.inlineGeometryBytes) {
      addIssue(issues, "GEOMETRY_BYTES", "$.result.geometry", "Geometry artifact exceeds the controlled inline geometry byte cap.");
    }
    return { ok: issues.length === 0, issues };
  }
  if (!resolution) return { ok: issues.length === 0, issues };

  const status = resolution.status;
  const selected = isRecord(resolution.selected_object) ? resolution.selected_object : null;
  const candidates = records(resolution.candidates);
  const selection = isRecord(resolution.selection_receipt) ? resolution.selection_receipt : null;
  const coverage = isRecord(resolution.coverage) ? resolution.coverage : null;
  const snapshotAnchor = isRecord(resolution.snapshot_anchor) ? resolution.snapshot_anchor : null;
  const candidateIds = candidates.map((candidate) => candidate.candidate_id).filter((id): id is string => typeof id === "string");
  const uniqueCandidateIds = new Set(candidateIds);
  if (candidateIds.length !== candidates.length || uniqueCandidateIds.size !== candidates.length) {
    addIssue(issues, "CANDIDATE_COUNTS", "$.result.resolution.candidates", "Candidate IDs must be complete and unique.");
  }
  for (const [index, candidate] of candidates.entries()) {
    const expectedEntityHash = semanticHash({
      id: candidate.entity_id,
      sourceId: candidate.source_id,
      entityType: candidate.entity_type,
      geometryHash: candidate.geometry_hash,
      sourceAsOf: candidate.source_as_of
    });
    if (candidate.candidate_id !== candidate.entity_id || candidate.entity_hash !== expectedEntityHash) {
      addIssue(issues, "HASH_INTEGRITY", `$.result.resolution.candidates[${index}].entity_hash`, "Candidate identity hash or ID is not canonical.");
    }
  }

  const pointHash = semanticHash(resolution.clicked_point);
  const candidateSetHash = selection?.candidate_set_hash;
  const snapshotId = snapshotAnchor?.snapshot_id ?? null;
  const resolverVersion = selection?.resolver_version;
  if (selection?.input_hash !== pointHash) {
    addIssue(issues, "HASH_INTEGRITY", "$.result.resolution.selection_receipt.input_hash", "Clicked-point hash is not canonical.");
  }
  if (selection?.selection_method !== "candidate_assertion") {
    const expectedCandidateSetHash = semanticHash(candidates.map((candidate) =>
      withoutKeys(candidate, ["candidate_assertion"])
    ));
    if (candidateSetHash !== expectedCandidateSetHash) {
      addIssue(issues, "HASH_INTEGRITY", "$.result.resolution.selection_receipt.candidate_set_hash", "Complete candidate-set hash is not canonical.");
    }
  }

  let expectedResolutionHash: string | null = null;
  if (typeof candidateSetHash === "string" && typeof resolverVersion === "string") {
    if (status === "outside_coverage") {
      expectedResolutionHash = semanticHash({
        status: "outside_coverage",
        pointHash,
        candidateSetHash,
        snapshotId: null,
        resolverVersion
      });
    } else if (status === "coordinate_context_only" && typeof snapshotId === "string") {
      const priorResolutionHash = semanticHash({
        status: "no_result",
        pointHash,
        candidateSetHash,
        snapshotId,
        resolverVersion
      });
      expectedResolutionHash = semanticHash({
        status: "coordinate_context_only",
        prior_resolution_hash: priorResolutionHash,
        point_hash: pointHash,
        snapshot_id: snapshotId,
        resolver_version: resolverVersion
      });
    } else if (selection?.selection_method === "candidate_assertion" && typeof snapshotId === "string") {
      const baseResolutionHash = semanticHash({
        status: "ambiguous",
        pointHash,
        candidateSetHash,
        snapshotId,
        resolverVersion
      });
      expectedResolutionHash = semanticHash({
        status: "resolved",
        selectedCandidateId: selection.selected_candidate_id,
        baseResolutionHash,
        candidateSetHash,
        resolverVersion
      });
    } else if (typeof snapshotId === "string") {
      expectedResolutionHash = semanticHash({
        status,
        pointHash,
        candidateSetHash,
        snapshotId,
        resolverVersion
      });
    }
  }
  if (expectedResolutionHash !== null &&
      (resolution.resolution_hash !== expectedResolutionHash ||
       resolution.resolution_id !== `resolution_${expectedResolutionHash.slice(0, 24)}`)) {
    addIssue(issues, "HASH_INTEGRITY", "$.result.resolution.resolution_hash", "Resolution hash or content-addressed ID is not canonical.");
  }

  if (status === "resolved") {
    const selectedId = selected?.candidate_id;
    if (!selected || candidates.length !== 1 || candidates[0]?.candidate_id !== selectedId ||
        selection?.selected_candidate_id !== selectedId) {
      addIssue(issues, "RESOLVED_MATRIX", "$.result.resolution", "Resolved output must expose exactly the selected candidate.");
    }
    const assertionSelection = selection?.selection_method === "candidate_assertion";
    if (!assertionSelection &&
        (!selected || selection?.selection_method !== selected.match_method ||
         !["point_in_polygon", "point_on_boundary", "nearest_feature"].includes(String(selection?.selection_method)))) {
      addIssue(issues, "RESOLVED_MATRIX", "$.result.resolution.selection_receipt.selection_method", "Resolved non-assertion selection method must equal the selected candidate match method.");
    }
    const eligible = selection?.eligible_candidate_count;
    const total = selection?.candidate_count;
    if (assertionSelection
      ? !(typeof eligible === "number" && eligible >= 2 && eligible <= LIVE_POINT_CAPS.candidates && total === eligible)
      : !(eligible === 1 && total === 1)) {
      addIssue(issues, "CANDIDATE_COUNTS", "$.result.resolution.selection_receipt", "Resolved candidate counts do not match the selection path.");
    }
    if (selected && selected.candidate_assertion !== null) {
      addIssue(issues, "CANDIDATE_ASSERTION_BINDING", "$.result.resolution.selected_object", "A consumed assertion must not be re-emitted.");
    }
  } else if (status === "ambiguous") {
    if (selected !== null || candidates.length < 2 || candidates.length > LIVE_POINT_CAPS.candidates ||
        selection?.selected_candidate_id !== null || selection?.candidate_count !== candidates.length ||
        selection?.eligible_candidate_count !== candidates.length || selection?.selection_method !== "none") {
      addIssue(issues, "AMBIGUOUS_MATRIX", "$.result.resolution", "Ambiguous output must expose the complete 2-20 candidate set without selection.");
    }
    for (const [index, candidate] of candidates.entries()) {
      const assertion = isRecord(candidate.candidate_assertion) ? candidate.candidate_assertion : null;
      if (!assertion || assertion.tenant_scope !== undefined ||
          assertion.intended_scope !== "candidate_selection" ||
          assertion.point_hash !== selection?.input_hash ||
          assertion.resolution_hash !== resolution.resolution_hash ||
          assertion.candidate_set_hash !== selection?.candidate_set_hash ||
          assertion.snapshot_id !== snapshotAnchor?.snapshot_id) {
        addIssue(issues, "CANDIDATE_ASSERTION_BINDING", `$.result.resolution.candidates[${index}].candidate_assertion`, "Chooser assertion receipt is incomplete, exposed or bound to another resolution.");
      }
    }
  } else if (["coordinate_context_only", "no_result", "outside_coverage"].includes(String(status))) {
    const expectedSelectionMethod = status === "coordinate_context_only" ? "coordinate_only" : "none";
    if (selected !== null || candidates.length !== 0 || selection?.selected_candidate_id !== null ||
        selection?.candidate_count !== 0 || selection?.eligible_candidate_count !== 0 ||
        selection?.selection_method !== expectedSelectionMethod) {
      addIssue(issues, "ABSTENTION_MATRIX", "$.result.resolution", "Abstention states cannot expose or count a selected candidate.");
    }
  }

  for (const [index, candidate] of candidates.entries()) {
    if (candidate.source_namespace !== "SyntheticFixture") {
      addIssue(issues, "SYNTHETIC_PROVENANCE", `$.result.resolution.candidates[${index}].source_namespace`, "E1 output may reference only explicit SyntheticFixture provenance.");
    }
  }

  if (status === "outside_coverage") {
    const stageNames = records(execution?.stage_timings).map((stage) => stage.stage);
    if (coverage?.inside_coverage !== false || resolution.rights_state !== "not_evaluated" ||
        resolution.snapshot_anchor !== null || !sameStrings(selection?.snapshot_ids, []) ||
        !sameStrings(execution?.snapshot_ids, []) || execution?.rights_decision !== "not_evaluated" ||
        execution?.rights_state !== "not_evaluated" || execution?.runtime_network_used !== false ||
        execution?.persistence_used !== false || stageNames.some((stage) =>
          ["load_snapshot", "context", "evidence", "narrative"].includes(String(stage)))) {
      addIssue(issues, "OUTSIDE_COVERAGE_ZERO_CALL", "$.result.resolution", "Outside coverage must stop before rights, snapshot, source, context, evidence and model work.");
    }
    if (context || bundle || narrative || model || renderPlan || governance || conversation) {
      addIssue(issues, "SUCCESS_BUNDLE_FOR_ABSTENTION", "$.result", "Outside coverage can only be returned by the resolve-stage envelope.");
    }
  } else {
    if (coverage?.inside_coverage !== true || !snapshotAnchor || resolution.rights_state !== "cleared") {
      addIssue(issues, "SNAPSHOT_ANCHOR", "$.result.resolution", "In-coverage success requires one rights-cleared snapshot anchor.");
    }
    if (execution && (execution.rights_decision !== "cleared_for_experiment" ||
        execution.rights_state !== "cleared" || execution.runtime_network_used !== false ||
        execution.persistence_used !== false || !sameStrings(execution.snapshot_ids, [String(snapshotAnchor?.snapshot_id)]))) {
      addIssue(issues, "RIGHTS_CROSSWALK", "$.execution", "In-coverage success requires the exact cleared rights crosswalk and snapshot receipt.");
    }
    if (!sameStrings(selection?.snapshot_ids, [String(snapshotAnchor?.snapshot_id)])) {
      addIssue(issues, "SNAPSHOT_ANCHOR", "$.result.resolution.selection_receipt.snapshot_ids", "Selection snapshot IDs must equal the exact active resolution snapshot.");
    }
  }

  if (status === "no_result" && (bundle || narrative || model || renderPlan || governance || conversation)) {
    addIssue(issues, "SUCCESS_BUNDLE_FOR_ABSTENTION", "$.result", "Resolve-stage no_result cannot author a composed success bundle.");
  }

  if (context) {
    assertContentHash(issues, context, "context_hash", "$.result.context", "context_id", "context_");
    const anchorCore = {
      anchor_kind: context.anchor_kind,
      anchor_entity_id: context.anchor_entity_id,
      anchor_position: context.anchor_position,
      resolution_hash: context.anchor_resolution_hash
    };
    const expectedAnchorHash = semanticHash(anchorCore);
    const expectedEntityId = status === "resolved" ? selected?.entity_id ?? null : null;
    if (context.anchor_resolution_hash !== resolution.resolution_hash ||
        context.anchor_entity_id !== expectedEntityId ||
        !samePoint(context.anchor_position, resolution.clicked_point) ||
        context.anchor_hash !== expectedAnchorHash ||
        context.anchor_id !== `anchor_${expectedAnchorHash.slice(0, 24)}` ||
        (status === "resolved" ? context.anchor_kind !== "resolved_entity" : context.anchor_kind !== "clicked_point")) {
      addIssue(issues, "CONTEXT_ANCHOR", "$.result.context", "Context anchor does not match the exact resolution and clicked point.");
    }
    const facilities = records(context.facilities);
    if (context.returned_count !== facilities.length ||
        typeof context.total_observed_count !== "number" || context.total_observed_count < facilities.length) {
      addIssue(issues, "CONTEXT_COUNTS", "$.result.context", "Context observed and returned counts are inconsistent.");
    }
    if (context.truncated !== (context.truncation_reason !== null)) {
      addIssue(issues, "TRUNCATION_RECEIPT", "$.result.context", "Context truncation flag and reason must agree.");
    }
    const contextSnapshot = isRecord(context.snapshot_anchor) ? context.snapshot_anchor : null;
    if (!sameSnapshotAnchor(contextSnapshot, snapshotAnchor) ||
        isRecord(context.source_coverage) && context.source_coverage.coverage_geometry_hash !== coverage?.geometry_hash) {
      addIssue(issues, "CONTEXT_ANCHOR", "$.result.context.snapshot_anchor", "Context snapshot or coverage receipt drifted from the resolution.");
    }
    for (const [index, metric] of records(context.metrics).entries()) {
      assertContentHash(
        issues,
        metric,
        "metric_hash",
        `$.result.context.metrics[${index}]`,
        "metric_id",
        "metric_"
      );
      const distance = isRecord(metric.distance_receipt) ? metric.distance_receipt : null;
      if (distance) {
        assertContentHash(
          issues,
          distance,
          "distance_hash",
          `$.result.context.metrics[${index}].distance_receipt`,
          "distance_id",
          "distance_"
        );
      }
    }
    for (const [index, summary] of records(context.category_summaries).entries()) {
      const absence = isRecord(summary.absence_receipt) ? summary.absence_receipt : null;
      if (!absence) continue;
      const expectedQueryHash = semanticHash({
        category: absence.category,
        radius_m: absence.radius_m,
        snapshot_ids: absence.snapshot_ids,
        coverage_state: absence.coverage_state,
        predicate_version: "point-to-object-context-category-v1"
      });
      if (absence.query_hash !== expectedQueryHash ||
          absence.query_id !== `query_${expectedQueryHash.slice(0, 24)}` ||
          absence.absence_id !== `absence_${expectedQueryHash.slice(0, 24)}`) {
        addIssue(issues, "HASH_INTEGRITY", `$.result.context.category_summaries[${index}].absence_receipt`, "Absence query hash or content-addressed IDs are not canonical.");
      }
    }
    for (const [index, missing] of records(context.missing_data).entries()) {
      const expectedMissingHash = semanticHash({
        category: missing.field_or_category,
        radiusM: context.radius_m,
        snapshotId: snapshotAnchor?.snapshot_id,
        missingStatus: missing.status
      });
      if (missing.missing_id !== `missing_${expectedMissingHash.slice(0, 24)}`) {
        addIssue(issues, "HASH_INTEGRITY", `$.result.context.missing_data[${index}].missing_id`, "Missing-data ID is not content-addressed to its deterministic query.");
      }
    }
  }

  if (bundle) {
    assertContentHash(issues, bundle, "bundle_hash", "$.result.evidence_bundle", "bundle_id", "bundle_");
    const bundleSnapshot = isRecord(bundle.snapshot_anchor) ? bundle.snapshot_anchor : null;
    if (bundle.resolution_hash !== resolution.resolution_hash ||
        bundle.context_hash !== (context?.context_hash ?? null) ||
        !sameSnapshotAnchor(bundleSnapshot, snapshotAnchor)) {
      addIssue(issues, "BUNDLE_ANCHOR", "$.result.evidence_bundle", "Evidence bundle anchors do not match the resolution/context snapshot.");
    }
    const expectedEntityId = status === "resolved" ? selected?.entity_id ?? null : null;
    const expectedEntityHash = status === "resolved" ? selected?.entity_hash ?? null : null;
    const expectedGeometryHash = status === "resolved" ? selected?.geometry_hash ?? null : null;
    if (bundle.entity_id !== expectedEntityId || bundle.entity_hash !== expectedEntityHash ||
        bundle.geometry_hash !== expectedGeometryHash) {
      addIssue(issues, "ENTITY_ANCHOR", "$.result.evidence_bundle", "Evidence entity/geometry anchors do not match the selected object.");
    }
    const metricHashes = records(context?.metrics).map((metric) => metric.metric_hash).filter((hash): hash is string => typeof hash === "string");
    if (!sameStrings(bundle.metric_hashes, metricHashes) || !sameStrings(conversation?.metric_hashes, metricHashes)) {
      addIssue(issues, "METRIC_HASH_ANCHOR", "$.result.evidence_bundle.metric_hashes", "Metric hash lists must be exact and ordered.");
    }
    if (bundle.rights_state !== "cleared" || isRecord(bundle.terms_receipt) &&
        bundle.terms_receipt.rights_status !== "cleared_for_experiment") {
      addIssue(issues, "RIGHTS_CROSSWALK", "$.result.evidence_bundle", "Evidence bundle rights are not cleared for the exact synthetic operation.");
    }
    const geometryReceipt = isRecord(bundle.geometry_receipt) ? bundle.geometry_receipt : null;
    if (geometryReceipt && geometryReceipt.source_namespace !== "SyntheticFixture") {
      addIssue(issues, "SYNTHETIC_PROVENANCE", "$.result.evidence_bundle.geometry_receipt", "Geometry provenance must remain explicitly synthetic.");
    }
    const acquisition = isRecord(bundle.acquisition_receipt) ? bundle.acquisition_receipt : null;
    if (acquisition) {
      assertContentHash(issues, acquisition, "receipt_hash", "$.result.evidence_bundle.acquisition_receipt", "receipt_id");
      if (acquisition.receipt_id !== snapshotAnchor?.acquisition_receipt_id ||
          acquisition.source_as_of !== snapshotAnchor?.source_as_of ||
          acquisition.retrieved_at !== snapshotAnchor?.retrieved_at) {
        addIssue(issues, "SNAPSHOT_ANCHOR", "$.result.evidence_bundle.acquisition_receipt", "Acquisition receipt must equal the exact active snapshot acquisition binding and timestamps.");
      }
    }
    const terms = isRecord(bundle.terms_receipt) ? bundle.terms_receipt : null;
    if (terms) {
      assertContentHash(issues, terms, "terms_receipt_hash", "$.result.evidence_bundle.terms_receipt", "terms_receipt_id");
    }
    if (execution && (execution.geometry_byte_count !== (geometryReceipt?.byte_size ?? 0) ||
        Number(execution.geometry_byte_count) > LIVE_POINT_CAPS.allInlineGeometryBytes ||
        Number(geometryReceipt?.byte_size ?? 0) > LIVE_POINT_CAPS.inlineGeometryBytes)) {
      addIssue(issues, "GEOMETRY_BYTES", "$.execution.geometry_byte_count", "Geometry byte receipts exceed or disagree with the exact payload.");
    }
  }

  if (narrative && bundle) {
    const evidenceIds = new Set(records(bundle.evidence_items)
      .map((item) => item.evidence_id).filter((id): id is string => typeof id === "string"));
    const metricIds = new Set(records(context?.metrics)
      .map((metric) => metric.metric_id).filter((id): id is string => typeof id === "string"));
    for (const [index, claim] of records(narrative.claims).entries()) {
      if (strings(claim.evidence_ids).some((id) => !evidenceIds.has(id)) ||
          strings(claim.metric_ids).some((id) => !metricIds.has(id))) {
        addIssue(issues, "ORPHAN_CLAIM_REFERENCE", `$.result.narrative.claims[${index}]`, "Narrative claim references unknown evidence or metrics.");
      }
    }
    const anchors = isRecord(narrative.anchors) ? narrative.anchors : null;
    if (narrative.caveat !== LIVE_POINT_CAVEAT || anchors?.entity_id !== bundle.entity_id ||
        anchors?.geometry_hash !== bundle.geometry_hash || anchors?.evidence_bundle_hash !== bundle.bundle_hash ||
        anchors?.snapshot_hash !== snapshotAnchor?.snapshot_hash || !sameStrings(anchors?.metric_hashes, bundle.metric_hashes)) {
      addIssue(issues, "BUNDLE_ANCHOR", "$.result.narrative.anchors", "Narrative anchors or caveat drifted from deterministic evidence.");
    }
    const shouldPreserveEntity = bundle.entity_id !== null;
    for (const [index, followUp] of records(narrative.follow_ups).entries()) {
      if (followUp.preserve_entity !== shouldPreserveEntity) {
        addIssue(issues, "ENTITY_ANCHOR", `$.result.narrative.follow_ups[${index}].preserve_entity`, "A follow-up may preserve an entity only when the deterministic result has one exact entity anchor.");
      }
    }
  }

  if (renderPlan && bundle) {
    assertContentHash(issues, renderPlan, "render_plan_hash", "$.result.render_plan", "render_plan_id", "render_");
    const narrativeId = `narrative_${String(bundle.bundle_hash).slice(0, 24)}`;
    const known = new Set<string>([
      String(resolution.resolution_id),
      ...(context ? [String(context.context_id)] : []),
      String(bundle.bundle_id),
      narrativeId,
      ...records(bundle.evidence_items).map((item) => String(item.evidence_id)),
      ...records(context?.metrics).map((metric) => String(metric.metric_id))
    ]);
    const referenceIds = strings(renderPlan.reference_ids);
    if (new Set(referenceIds).size !== referenceIds.length ||
        records(renderPlan.components).some((component) =>
          typeof component.data_reference !== "string" ||
          !known.has(component.data_reference) || !referenceIds.includes(component.data_reference))) {
      addIssue(issues, "ORPHAN_RENDER_REFERENCE", "$.result.render_plan", "Render references must be unique and resolve to deterministic result records.");
    }
  }

  if (conversation && bundle) {
    if (conversation.snapshot_id !== snapshotAnchor?.snapshot_id ||
        conversation.snapshot_hash !== snapshotAnchor?.snapshot_hash ||
        conversation.resolution_hash !== resolution.resolution_hash ||
        conversation.entity_id !== bundle.entity_id || conversation.geometry_hash !== bundle.geometry_hash ||
        conversation.evidence_bundle_hash !== bundle.bundle_hash || !sameStrings(conversation.metric_hashes, bundle.metric_hashes)) {
      addIssue(issues, "CONVERSATION_ANCHOR", "$.result.conversation_anchors", "Conversation anchors do not match the deterministic bundle.");
    }
  }

  const parity = isRecord(model?.deterministic_parity) ? model.deterministic_parity : null;
  if (model && bundle && (model.state !== "not_requested" || model.attempt_count !== 0 ||
      model.tool_call_count !== 0 || model.store !== false || model.output_mode !== "deterministic_template" ||
      parity?.entity_id !== bundle.entity_id || parity?.geometry_hash !== bundle.geometry_hash ||
      parity?.evidence_bundle_hash !== bundle.bundle_hash || parity?.snapshot_hash !== snapshotAnchor?.snapshot_hash ||
      !sameStrings(parity?.metric_hashes, bundle.metric_hashes))) {
    addIssue(issues, "MODEL_PARITY", "$.result.model_receipt", "E1 must remain model-free and exactly anchored to deterministic evidence.");
  }

  if (governance && (governance.rights_state !== "cleared" || governance.caveat !== LIVE_POINT_CAVEAT)) {
    addIssue(issues, "RIGHTS_CROSSWALK", "$.result.governance", "Governance rights or caveat drifted from the frozen profile.");
  }

  if (execution && typeof execution.response_byte_count === "number") {
    const byteLength = Buffer.byteLength(JSON.stringify(value), "utf8");
    if (execution.response_byte_count !== byteLength || byteLength > LIVE_POINT_CAPS.responseBytes) {
      addIssue(issues, "RESPONSE_BYTES", "$.execution.response_byte_count", "Response byte receipt must equal the serialized envelope and stay within the cap.");
    }
  }

  return { ok: issues.length === 0, issues };
}

export function assertLivePointSemantics(value: unknown): void {
  const validation = validateLivePointSemantics(value);
  if (!validation.ok) {
    throw new Error(`Live-point semantic validation failed: ${JSON.stringify(validation.issues)}`);
  }
}
