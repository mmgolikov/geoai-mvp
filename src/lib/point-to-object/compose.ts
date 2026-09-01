import {
  LIVE_POINT_CAPS,
  LIVE_POINT_CAVEAT,
  LIVE_POINT_CLAIM_POLICY_VERSION,
  type LivePointComposeResult,
  type LivePointFollowUp,
  type LivePointModelReceipt,
  type LivePointNarrative,
  type LivePointRequest,
  type LivePointRequestAnchors,
  type LivePointResolution,
  type SnapshotAnchor,
  type LivePointWarning
} from "./contracts";
import { buildLivePointContext } from "./context";
import { buildLivePointEvidenceBundle } from "./evidence";
import { LivePointCoreError } from "./errors";
import { semanticHash } from "./hash";
import type { LivePointSnapshotRepository } from "./repository-core";
import { resolveLivePoint, type ResolveDependencies } from "./resolver";

export interface ComposeResult {
  result: LivePointComposeResult;
  warnings: LivePointWarning[];
}

function requireSnapshotAnchor(resolution: LivePointResolution): SnapshotAnchor {
  if (!resolution.snapshot_anchor) {
    throw new LivePointCoreError(
      "CONTRACT_VALIDATION_FAILED",
      "This operation requires an in-coverage snapshot anchor."
    );
  }
  return resolution.snapshot_anchor;
}

function promoteCoordinateContext(
  resolution: LivePointResolution,
  hasContext: boolean
): LivePointResolution {
  if (resolution.status !== "no_result" || !hasContext) return resolution;
  const resolutionHash = semanticHash({
    status: "coordinate_context_only",
    prior_resolution_hash: resolution.resolution_hash,
    point_hash: resolution.selection_receipt.input_hash,
    snapshot_id: resolution.snapshot_anchor.snapshot_id,
    resolver_version: resolution.selection_receipt.resolver_version
  });
  return {
    ...resolution,
    resolution_id: `resolution_${resolutionHash.slice(0, 24)}`,
    resolution_hash: resolutionHash,
    status: "coordinate_context_only",
    selected_object: null,
    candidates: [],
    ambiguity_reasons: [],
    selection_receipt: {
      ...resolution.selection_receipt,
      selection_method: "coordinate_only",
      selected_candidate_id: null
    }
  };
}

function boundedFollowUps(preserveEntity: boolean): LivePointFollowUp[] {
  return [
    {
      id: "followup_source_and_limits",
      label: "Review source and limits",
      analysis_lens: "source_and_limits",
      preserve_entity: preserveEntity,
      preserve_bundle: true,
      refresh_requested: false
    },
    {
      id: "followup_official_validation",
      label: "List official validation actions",
      analysis_lens: "official_validation_actions",
      preserve_entity: preserveEntity,
      preserve_bundle: true,
      refresh_requested: false
    }
  ];
}

function buildNarrative(
  request: LivePointRequest,
  resolution: LivePointResolution,
  bundle: ReturnType<typeof buildLivePointEvidenceBundle>,
  context: ReturnType<typeof buildLivePointContext>["context"]
): LivePointNarrative {
  const selected = resolution.status === "resolved" ? resolution.selected_object : null;
  const prohibited = request.analysis_lens === "prohibited_high_impact_claim";
  const observedCount = context?.total_observed_count ?? 0;
  const evidenceIds = bundle.evidence_items.map((item) => item.evidence_id);
  const metricIds = context?.metrics.map((metric) => metric.metric_id) ?? [];
  const anchors = {
    entity_id: selected?.entity_id ?? null,
    geometry_hash: selected?.geometry_hash ?? null,
    evidence_bundle_hash: bundle.bundle_hash,
    snapshot_hash: bundle.snapshot_anchor.snapshot_hash,
    metric_hashes: [...bundle.metric_hashes]
  };

  if (prohibited) {
    return {
      answer_status: "blocked",
      headline: "High-impact conclusion blocked",
      summary: "The resolved open-context identity and evidence remain visible, but this profile cannot author parcel, zoning, ownership, valuation, planning or investment conclusions.",
      claims: [],
      risks_and_constraints: [...bundle.limitations],
      recommended_next_action: "Validate the decision against approved official and client sources with accountable domain professionals.",
      follow_ups: boundedFollowUps(selected !== null),
      caveat: LIVE_POINT_CAVEAT,
      anchors
    };
  }

  const headline = selected
    ? `${selected.display_name ?? "Unnamed open-context feature"} selected for screening`
    : resolution.status === "coordinate_context_only"
      ? "Coordinate context available; object identity is unresolved"
      : "Candidate identity requires explicit selection";
  const answerStatus = resolution.status === "ambiguous"
    ? "insufficient_evidence" as const
    : selected
      ? "partially_answerable" as const
      : "partially_answerable" as const;
  const claims: LivePointNarrative["claims"] = [];
  if (selected) {
    claims.push({
      claim_id: `claim_entity_${selected.entity_hash.slice(0, 24)}`,
      claim_type: "verified_fact",
      text: "The clicked point resolves to one source-observed open-context feature in the injected frozen fixture.",
      evidence_ids: evidenceIds.filter((id) => id === `evidence_entity_${selected.entity_hash.slice(0, 24)}`),
      metric_ids: [],
      validation_required: true
    });
  }
  if (context) {
    claims.push({
      claim_id: `claim_context_${context.context_hash.slice(0, 24)}`,
      claim_type: "deterministic_calculation",
      text: `${observedCount} matching open-context records were observed across the requested categories and radius in the frozen fixture.`,
      evidence_ids: evidenceIds.filter((id) => id === bundle.acquisition_receipt.receipt_id),
      metric_ids: metricIds,
      validation_required: true
    });
  }
  return {
    answer_status: answerStatus,
    headline,
    summary: "This deterministic result describes bounded open context, missing evidence and next validation actions without authoring official or high-impact conclusions.",
    claims,
    risks_and_constraints: [...bundle.limitations],
    recommended_next_action: resolution.status === "ambiguous"
      ? "Select one candidate using its signed single-use assertion before continuing."
      : "Review missing evidence and validate relevant facts against approved official or client sources.",
    follow_ups: boundedFollowUps(selected !== null),
    caveat: LIVE_POINT_CAVEAT,
    anchors
  };
}

function modelReceipt(result: LivePointComposeResult["narrative"]): LivePointModelReceipt {
  return {
    state: "not_requested",
    model: null,
    projection_hash: null,
    attempt_count: 0,
    timeout_ms: LIVE_POINT_CAPS.modelTimeoutMs,
    max_output_tokens: LIVE_POINT_CAPS.modelMaxOutputTokens,
    max_cost_usd: LIVE_POINT_CAPS.modelMaxCostUsd,
    tool_call_count: 0,
    store: false,
    fallback_used: false,
    output_mode: "deterministic_template",
    deterministic_parity: {
      entity_id: result.anchors.entity_id,
      geometry_hash: result.anchors.geometry_hash,
      evidence_bundle_hash: result.anchors.evidence_bundle_hash,
      snapshot_hash: result.anchors.snapshot_hash,
      metric_hashes: [...result.anchors.metric_hashes]
    }
  };
}

function conversationAnchors(
  resolution: LivePointResolution,
  bundle: ReturnType<typeof buildLivePointEvidenceBundle>
): LivePointRequestAnchors {
  const selected = resolution.status === "resolved" ? resolution.selected_object : null;
  const snapshotAnchor = requireSnapshotAnchor(resolution);
  return {
    snapshot_id: snapshotAnchor.snapshot_id,
    snapshot_hash: snapshotAnchor.snapshot_hash,
    resolution_hash: resolution.resolution_hash,
    entity_id: selected?.entity_id ?? null,
    geometry_hash: selected?.geometry_hash ?? null,
    evidence_bundle_hash: bundle.bundle_hash,
    metric_hashes: [...bundle.metric_hashes],
    preserve_entity: selected !== null,
    preserve_bundle: true,
    refresh_requested: false
  };
}

function exactArrayEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function assertLivePointAnchors(
  request: LivePointRequest,
  resolution: LivePointResolution,
  bundle: ReturnType<typeof buildLivePointEvidenceBundle>
): void {
  const anchors = request.anchors;
  if (!anchors || anchors.refresh_requested) return;
  const selected = resolution.status === "resolved" ? resolution.selected_object : null;
  const snapshotAnchor = requireSnapshotAnchor(resolution);
  const matches = anchors.snapshot_id === snapshotAnchor.snapshot_id &&
    anchors.snapshot_hash === snapshotAnchor.snapshot_hash &&
    (anchors.resolution_hash === null || anchors.resolution_hash === resolution.resolution_hash) &&
    (!anchors.preserve_entity || (
      anchors.entity_id === selected?.entity_id && anchors.geometry_hash === selected?.geometry_hash
    )) &&
    (!anchors.preserve_bundle || (
      anchors.evidence_bundle_hash === bundle.bundle_hash &&
      exactArrayEqual(anchors.metric_hashes, bundle.metric_hashes)
    ));
  if (!matches) {
    throw new LivePointCoreError(
      "ANCHOR_MISMATCH",
      "The preserved snapshot, entity, geometry, resolution, bundle or metric anchors do not match this exact recomputation."
    );
  }
}

export function composeLivePointDeterministically(
  request: LivePointRequest,
  repository: LivePointSnapshotRepository,
  dependencies: ResolveDependencies = {}
): ComposeResult {
  const resolved = resolveLivePoint(request, repository, dependencies);
  const firstContext = buildLivePointContext(request, resolved.resolution, repository);
  const resolution = promoteCoordinateContext(resolved.resolution, firstContext.context !== null);
  const context = resolution === resolved.resolution
    ? firstContext.context
    : buildLivePointContext(request, resolution, repository).context;
  const bundle = buildLivePointEvidenceBundle(resolution, context, repository);
  assertLivePointAnchors(request, resolution, bundle);
  const narrative = buildNarrative(request, resolution, bundle, context);
  const model = modelReceipt(narrative);
  const renderCore = {
    components: [
      { component_id: "component_identity", component_type: "identity" as const, data_reference: resolution.resolution_id },
      ...(context ? [{ component_id: "component_context", component_type: "context" as const, data_reference: context.context_id }] : []),
      { component_id: "component_evidence", component_type: "evidence" as const, data_reference: bundle.bundle_id },
      { component_id: "component_narrative", component_type: "narrative" as const, data_reference: `narrative_${bundle.bundle_hash.slice(0, 24)}` },
      { component_id: "component_limitations", component_type: "limitations" as const, data_reference: bundle.bundle_id }
    ],
    highlight_geometry_id: resolution.status === "resolved" ? resolution.selected_object.geometry_id : null,
    reference_ids: [...new Set([
      resolution.resolution_id,
      ...(context ? [context.context_id] : []),
      bundle.bundle_id,
      `narrative_${bundle.bundle_hash.slice(0, 24)}`,
      ...bundle.evidence_items.map((item) => item.evidence_id),
      ...(context?.metrics.map((metric) => metric.metric_id) ?? [])
    ])],
    accessibility_summary: "Decision identity, evidence quality, limitations and next action are exposed as text; map geometry is supplementary."
  };
  const renderHash = semanticHash(renderCore);
  return {
    warnings: [...resolved.warnings, ...firstContext.warnings],
    result: {
      resolution,
      context,
      evidence_bundle: bundle,
      narrative,
      model_receipt: model,
      render_plan: {
        render_plan_id: `render_${renderHash.slice(0, 24)}`,
        render_plan_hash: renderHash,
        ...renderCore
      },
      governance: {
        claim_level: "open_context_screening",
        rights_state: "cleared",
        validation_state: "official_validation_required",
        privacy_state: "minimized_public_open_context",
        policy_version: LIVE_POINT_CLAIM_POLICY_VERSION,
        caveat: LIVE_POINT_CAVEAT
      },
      conversation_anchors: conversationAnchors(resolution, bundle)
    }
  };
}
