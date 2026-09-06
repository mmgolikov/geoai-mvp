import {
  type CandidateAssertionService
} from "./candidate-assertion-core";
import {
  LIVE_POINT_CAPS,
  LIVE_POINT_GEOMETRY_VERSION,
  LIVE_POINT_RESOLVER_VERSION,
  type LivePointCandidate,
  type LivePointEntityType,
  type LivePointMatchMethod,
  type LivePointRequest,
  type LivePointResolution,
  type LivePointWarning,
  type Position
} from "./contracts";
import { LivePointCoreError } from "./errors";
import {
  geometryContainsPoint,
  measurePointAgainstGeometry
} from "./geometry";
import { compareCanonicalText, semanticHash } from "./hash";
import {
  assertResolverCoverageRegistryAuthority,
  assertResolverRepositoryAuthority,
  createSnapshotAnchor,
  type LivePointSnapshotRepository
} from "./repository-core";
import type {
  LivePointCasePack,
  LivePointSnapshotObject
} from "./snapshot-types";

const BOUNDARY_TOLERANCE_M = 0.5;
const AMBIGUITY_MARGIN_M = 2;
const DEFAULT_SEARCH_RADIUS_M = 70;
const CLASS_NEAREST_THRESHOLD_M: Record<LivePointEntityType, number> = {
  building: 15,
  building_part: 10,
  building_complex: 20,
  land_use: 15,
  road_segment: 12,
  poi: 25
};

export interface ResolveDependencies {
  assertionService?: CandidateAssertionService;
  /** Server-derived only. There is no client field for tenant scope. */
  tenantScope?: string;
}

export interface ResolveResult {
  resolution: LivePointResolution;
  warnings: LivePointWarning[];
}

function clickedPosition(request: LivePointRequest): Position {
  return [request.input.clicked_point.longitude, request.input.clicked_point.latitude];
}

function insideCasePack(position: Position, casePack: LivePointCasePack): boolean {
  const [west, south, east, north] = casePack.coverage.bbox;
  if (position[0] < west || position[0] > east || position[1] < south || position[1] > north) return false;
  return geometryContainsPoint(position, casePack.coverage.geometry, casePack.calculationCrs);
}

function nearestCasePack(position: Position, repository: LivePointSnapshotRepository): LivePointCasePack {
  const nearest = [...repository.casePacksById.values()]
    .map((casePack) => ({
      casePack,
      distance: measurePointAgainstGeometry(
        position,
        { type: "Point", coordinates: [casePack.coverage.center.longitude, casePack.coverage.center.latitude] },
        casePack.calculationCrs
      ).distanceM
    }))
    .sort((left, right) => left.distance - right.distance || compareCanonicalText(left.casePack.id, right.casePack.id))[0];
  if (!nearest) {
    throw new LivePointCoreError("SNAPSHOT_MISSING", "The synthetic fixture has no controlled coverage case pack.");
  }
  return nearest.casePack;
}

function findCasePack(position: Position, repository: LivePointSnapshotRepository): LivePointCasePack | null {
  return [...repository.casePacksById.values()]
    .filter((casePack) => insideCasePack(position, casePack))
    .sort((left, right) => compareCanonicalText(left.id, right.id))[0] ?? null;
}

function assertCoordinateOrder(request: LivePointRequest, repository: LivePointSnapshotRepository): void {
  if (request.input.clicked_point.coordinate_order_confirmed) return;
  const original = clickedPosition(request);
  const alternate: Position = [original[1], original[0]];
  if (alternate[1] < -90 || alternate[1] > 90 || alternate[0] < -180 || alternate[0] > 180 ||
      (alternate[0] === original[0] && alternate[1] === original[1])) return;
  if (findCasePack(alternate, repository)) {
    throw new LivePointCoreError(
      "COORDINATE_ORDER_SUSPECTED",
      "The alternate longitude/latitude order falls inside controlled coverage; confirm the submitted named order before resolution."
    );
  }
}

function intentAllows(entityType: LivePointEntityType, request: LivePointRequest): boolean {
  switch (request.selection_intent) {
    case "building":
      return entityType === "building" || entityType === "building_part" || entityType === "building_complex";
    case "road":
      return entityType === "road_segment";
    case "poi":
      return entityType === "poi";
    case "land_use":
      return entityType === "land_use";
    default:
      return true;
  }
}

function createCandidate(
  object: LivePointSnapshotObject,
  position: Position,
  casePack: LivePointCasePack,
  allowNearestIdentity: boolean
): LivePointCandidate | null {
  const measurement = measurePointAgainstGeometry(
    position,
    object.geometry,
    casePack.calculationCrs,
    BOUNDARY_TOLERANCE_M
  );
  if (measurement.containment === "outside" &&
      (!allowNearestIdentity || measurement.distanceM > CLASS_NEAREST_THRESHOLD_M[object.entityType])) return null;

  const matchMethod = measurement.containment === "inside"
    ? "point_in_polygon" as const
    : measurement.containment === "boundary"
      ? "point_on_boundary" as const
      : "nearest_feature" as const;
  const entityHash = semanticHash({
    id: object.id,
    sourceId: object.sourceId,
    entityType: object.entityType,
    geometryHash: object.geometryHash,
    sourceAsOf: object.sourceAsOf
  });
  return {
    candidate_id: object.id,
    entity_id: object.id,
    entity_hash: entityHash,
    geometry_id: object.geometryId,
    geometry_hash: object.geometryHash,
    geometry_type: object.geometry.type,
    geometry_version: LIVE_POINT_GEOMETRY_VERSION,
    source_id: object.sourceId,
    source_namespace: object.sourceNamespace,
    entity_type: object.entityType,
    display_name: object.displayName,
    source_tags: object.sourceTags,
    match_method: matchMethod,
    containment: measurement.containment,
    distance_m: Number(measurement.distanceM.toFixed(3)),
    distance_method: object.geometry.type === "LineString"
      ? "utm_point_to_line"
      : object.geometry.type === "Point"
        ? "utm_point_to_point"
        : "utm_point_to_boundary",
    authority_status: "open_context_not_official",
    source_as_of: object.sourceAsOf,
    retrieved_at: object.retrievedAt,
    limitations: object.limitations,
    candidate_assertion: null
  };
}

function candidateHashProjection(candidate: LivePointCandidate): unknown {
  const { candidate_assertion: _assertion, ...projection } = candidate;
  return projection;
}

function orderEligibleCandidates(candidates: LivePointCandidate[], request: LivePointRequest): LivePointCandidate[] {
  const containsPolygon = candidates.some((candidate) =>
    candidate.entity_type !== "road_segment" && candidate.containment !== "outside");
  const filtered = request.selection_intent === "general_object" && containsPolygon
    ? candidates.filter((candidate) => candidate.entity_type !== "road_segment")
    : candidates;

  return filtered
    // Canonical source-identity ordering is presentation-only; it never chooses
    // among two or more eligible records.
    .sort((left, right) => compareCanonicalText(left.entity_id, right.entity_id));
}

function buildCoverageReceipt(casePack: LivePointCasePack, insideCoverage: boolean) {
  return {
    coverage_id: casePack.coverage.id,
    case_pack_id: casePack.id,
    inside_coverage: insideCoverage,
    coverage_status: "measured_partial" as const,
    radius_m: casePack.coverage.radiusM,
    bbox: casePack.coverage.bbox,
    geometry_hash: casePack.coverage.geometryHash,
    calculation_crs: casePack.calculationCrs,
    proof_limit: "Coverage is the exact hashed controlled snapshot polygon; it does not establish complete real-world feature coverage."
  };
}

function requestHash(request: LivePointRequest): string {
  return semanticHash({
    schema_id: request.schema_id,
    profile_version: request.profile_version,
    scenario_id: request.scenario_id,
    operation: request.operation,
    input: request.input,
    selection_intent: request.selection_intent,
    requested_categories: request.requested_categories,
    context_radius_m: request.context_radius_m,
    locale: request.locale,
    analysis_lens: request.analysis_lens,
    anchors: request.anchors
  });
}

export function resolveLivePoint(
  request: LivePointRequest,
  repository: LivePointSnapshotRepository,
  dependencies: ResolveDependencies = {}
): ResolveResult {
  // Coverage is evaluated from the injected registry before any source-rights
  // decision or snapshot anchor is consulted. This makes outside-coverage a
  // true zero-source outcome.
  assertResolverCoverageRegistryAuthority(repository);
  const tenantScope = dependencies.tenantScope ??
    (repository.fixtureAuthority === "synthetic_non_runtime"
      ? "synthetic_non_runtime_tenant"
      : "frozen_open_context_preview");
  assertCoordinateOrder(request, repository);

  const position = clickedPosition(request);
  const pointHash = semanticHash(request.input.clicked_point);
  const activeCasePack = findCasePack(position, repository);
  const casePack = activeCasePack ?? nearestCasePack(position, repository);

  if (!activeCasePack) {
    const candidateSetHash = semanticHash([]);
    const resolutionCore = {
      status: "outside_coverage" as const,
      pointHash,
      candidateSetHash,
      snapshotId: null,
      resolverVersion: LIVE_POINT_RESOLVER_VERSION
    };
    const resolutionHash = semanticHash(resolutionCore);
    return {
      warnings: [],
      resolution: {
        resolution_id: `resolution_${resolutionHash.slice(0, 24)}`,
        resolution_hash: resolutionHash,
        status: "outside_coverage",
        clicked_point: request.input.clicked_point,
        coverage: buildCoverageReceipt(casePack, false),
        selected_object: null,
        candidates: [],
        ambiguity_reasons: [],
        selection_receipt: {
          resolver_version: LIVE_POINT_RESOLVER_VERSION,
          deterministic: true,
          selection_method: "none",
          input_hash: pointHash,
          candidate_set_hash: candidateSetHash,
          candidate_count: 0,
          eligible_candidate_count: 0,
          search_radius_m: DEFAULT_SEARCH_RADIUS_M,
          boundary_tolerance_m: BOUNDARY_TOLERANCE_M,
          ambiguity_margin_m: AMBIGUITY_MARGIN_M,
          selected_candidate_id: null,
          snapshot_ids: []
        },
        rights_state: "not_evaluated",
        snapshot_anchor: null,
        resolved_at: repository.coverageRegistryGeneratedAt
      }
    };
  }

  assertResolverRepositoryAuthority(repository);
  const snapshotAnchor = createSnapshotAnchor(repository, activeCasePack);
  const resolvedAt = activeCasePack.snapshot.retrievedAt;

  const rawCandidates = activeCasePack.objects
    .filter((object) => intentAllows(object.entityType, request))
    .map((object) => createCandidate(
      object,
      position,
      activeCasePack,
      repository.fixtureAuthority === "synthetic_non_runtime"
    ))
    .filter((candidate): candidate is LivePointCandidate => candidate !== null);
  const candidates = orderEligibleCandidates(rawCandidates, request);
  if (candidates.length > LIVE_POINT_CAPS.candidates) {
    throw new LivePointCoreError(
      "CANDIDATE_SET_OVERFLOW",
      "The complete eligible candidate set exceeds the controlled chooser cap; refine or zoom before selection.",
      false,
      {
        eligible_count: candidates.length,
        eligible_count_withheld_reason: null,
        refinement_action: "submit_more_precise_point_or_zoom"
      }
    );
  }

  const candidateSetHash = semanticHash(candidates.map(candidateHashProjection));
  const baseStatus = candidates.length === 0
    ? "no_result" as const
    : candidates.length === 1
      ? "resolved" as const
      : "ambiguous" as const;
  const baseResolutionHash = semanticHash({
    status: baseStatus,
    pointHash,
    candidateSetHash,
    snapshotId: activeCasePack.snapshot.id,
    resolverVersion: LIVE_POINT_RESOLVER_VERSION
  });

  let selectedCandidate: LivePointCandidate | null = baseStatus === "resolved" ? candidates[0] : null;
  let selectionMethod: LivePointMatchMethod = selectedCandidate?.match_method ?? "none";
  let status: "resolved" | "ambiguous" | "no_result" = baseStatus;
  const assertionService = dependencies.assertionService;

  if (request.candidate_assertion) {
    if (baseStatus !== "ambiguous") {
      throw new LivePointCoreError("CANDIDATE_ASSERTION_INVALID", "Candidate assertion is not valid for this resolution.");
    }
    if (!assertionService) {
      throw new LivePointCoreError(
        "CONTRACT_VALIDATION_FAILED",
        "Candidate assertion validation requires one injected server-owned assertion service."
      );
    }
    const consumed = assertionService.consume(request.candidate_assertion.token, {
      tenantScope,
      requestHash: requestHash(request),
      pointHash,
      resolutionHash: baseResolutionHash,
      candidateSetHash,
      snapshotId: activeCasePack.snapshot.id
    });
    if (!consumed.ok) {
      throw new LivePointCoreError(
        consumed.reason === "access_denied" ? "ACCESS_DENIED" : "CANDIDATE_ASSERTION_INVALID",
        "Candidate assertion is invalid, expired or already used."
      );
    }
    selectedCandidate = candidates.find((candidate) => candidate.candidate_id === consumed.candidateId) ?? null;
    if (!selectedCandidate) {
      throw new LivePointCoreError("CANDIDATE_ASSERTION_INVALID", "Candidate assertion is invalid, expired or already used.");
    }
    status = "resolved";
    selectionMethod = "candidate_assertion";
  }

  const finalResolutionHash = status === baseStatus
    ? baseResolutionHash
    : semanticHash({
        status,
        selectedCandidateId: selectedCandidate?.candidate_id ?? null,
        baseResolutionHash,
        candidateSetHash,
        resolverVersion: LIVE_POINT_RESOLVER_VERSION
      });

  const candidatesWithAssertions = status === "ambiguous"
    ? (() => {
        if (!assertionService) {
          throw new LivePointCoreError(
            "CONTRACT_VALIDATION_FAILED",
            "Ambiguity requires one injected server-owned assertion service."
          );
        }
        return candidates.map((candidate) => ({
        ...candidate,
        candidate_assertion: assertionService.issue({
          tenantScope,
          requestHash: requestHash(request),
          pointHash,
          resolutionHash: baseResolutionHash,
          candidateSetHash,
          snapshotId: activeCasePack.snapshot.id,
          candidateId: candidate.candidate_id
        })
        }));
      })()
    : candidates;
  if (selectedCandidate) {
    selectedCandidate = { ...selectedCandidate, candidate_assertion: null };
  }

  const warnings: LivePointWarning[] = [];
  if (selectedCandidate?.containment === "boundary") {
    warnings.push({
      code: "BOUNDARY_CONTACT",
      message: "The point touches the selected source geometry boundary within the declared metric tolerance."
    });
  }
  if (candidates.some((candidate) => candidate.display_name === null)) {
    warnings.push({
      code: "UNNAMED_SOURCE_FEATURE",
      message: "At least one candidate has no name in the frozen source snapshot."
    });
  }
  if (repository.fixtureAuthority === "quarantined_non_runtime") {
    if (candidates.some((candidate) =>
      candidate.limitations.some((item) => item.startsWith("Source classification conflict:")))) {
      warnings.push({
        code: "SOURCE_CONFLICT",
        message: "The frozen source carries a visible classification conflict; no hierarchy or official meaning is inferred."
      });
    }
    if (status === "no_result") {
      warnings.push({
        code: "PARTIAL_CONTEXT_SOURCE",
        message: "No eligible feature was observed at this point in the named snapshot; this is not proof of real-world absence."
      });
    }
    warnings.push({
      code: "SOURCE_FRESHNESS_UNKNOWN",
      message: "Per-feature source version and observation time are unavailable; only the frozen snapshot time is known."
    });
  }

  const emittedCandidates = status === "resolved" && selectedCandidate
    ? [selectedCandidate]
    : candidatesWithAssertions;
  const common = {
    resolution_id: `resolution_${finalResolutionHash.slice(0, 24)}`,
    resolution_hash: finalResolutionHash,
    clicked_point: request.input.clicked_point,
    coverage: buildCoverageReceipt(activeCasePack, true),
    candidates: emittedCandidates,
    selection_receipt: {
      resolver_version: LIVE_POINT_RESOLVER_VERSION,
      deterministic: true as const,
      selection_method: selectionMethod,
      input_hash: pointHash,
      candidate_set_hash: candidateSetHash,
      candidate_count: candidates.length,
      eligible_candidate_count: candidates.length,
      search_radius_m: DEFAULT_SEARCH_RADIUS_M,
      boundary_tolerance_m: BOUNDARY_TOLERANCE_M,
      ambiguity_margin_m: AMBIGUITY_MARGIN_M,
      selected_candidate_id: selectedCandidate?.candidate_id ?? null,
      snapshot_ids: [activeCasePack.snapshot.id]
    },
    snapshot_anchor: snapshotAnchor,
    rights_state: "cleared" as const,
    resolved_at: resolvedAt
  };

  if (status === "resolved" && selectedCandidate) {
    return {
      warnings,
      resolution: {
        ...common,
        status: "resolved",
        selected_object: selectedCandidate,
        ambiguity_reasons: []
      }
    };
  }
  if (status === "ambiguous" && emittedCandidates.length >= 2) {
    return {
      warnings,
      resolution: {
        ...common,
        status: "ambiguous",
        selected_object: null,
        candidates: emittedCandidates as [LivePointCandidate, LivePointCandidate, ...LivePointCandidate[]],
        ambiguity_reasons: [
          "Two or more eligible source features remain; the core does not choose between them."
        ]
      }
    };
  }
  return {
    warnings,
    resolution: {
      ...common,
      status: "no_result",
      selected_object: null,
      candidates: [],
      ambiguity_reasons: []
    }
  };
}
