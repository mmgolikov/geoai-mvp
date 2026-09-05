import {
  LIVE_POINT_CAPS,
  LIVE_POINT_CONTEXT_CATEGORIES,
  type LivePointAbsenceReceipt,
  type LivePointCategorySummary,
  type LivePointContextCategory,
  type LivePointContextMetric,
  type LivePointContextResult,
  type LivePointDistanceReceipt,
  type LivePointRequest,
  type LivePointResolution,
  type LivePointWarning,
  type MissingDataReceipt,
  type Position
} from "./contracts";
import { LivePointCoreError } from "./errors";
import { measurePointAgainstGeometry } from "./geometry";
import { compareCanonicalText, semanticHash } from "./hash";
import {
  assertE1FixtureAuthority,
  assertE1SourceRights,
  type LivePointSnapshotRepository
} from "./repository-core";
import type { LivePointCasePack, LivePointSnapshotContextFeature } from "./snapshot-types";

const UTM_IMPLEMENTATION_VERSION = "1.0.0";
const ABSENCE_PROOF_LIMIT =
  "No matching record was observed in the bounded frozen source snapshot and query window; this is not proof of real-world absence.";

export interface ContextBuildResult {
  context: LivePointContextResult | null;
  warnings: LivePointWarning[];
}

function clickedPosition(resolution: LivePointResolution): Position {
  return [resolution.clicked_point.longitude, resolution.clicked_point.latitude];
}

function casePackForResolution(
  resolution: LivePointResolution,
  repository: LivePointSnapshotRepository
): LivePointCasePack | null {
  if (!resolution.snapshot_anchor) return null;
  const byCoverage = repository.casePacksById.get(resolution.coverage.case_pack_id);
  if (byCoverage?.snapshot.id === resolution.snapshot_anchor.snapshot_id) return byCoverage;
  return [...repository.casePacksById.values()].find(
    (casePack) => casePack.snapshot.id === resolution.snapshot_anchor.snapshot_id
  ) ?? null;
}

function distanceFromAnchor(
  anchor: Position,
  feature: LivePointSnapshotContextFeature,
  casePack: LivePointCasePack
): number {
  return Number(measurePointAgainstGeometry(anchor, feature.geometry, casePack.calculationCrs).distanceM.toFixed(3));
}

function createDistanceReceipt(
  anchor: Position,
  feature: LivePointSnapshotContextFeature,
  distanceM: number,
  casePack: LivePointCasePack
): LivePointDistanceReceipt {
  const core = {
    value_m: distanceM,
    method: "utm_euclidean_point_to_point" as const,
    origin_basis: "clicked_point" as const,
    destination_basis: "source_feature_point" as const,
    calculation_crs: casePack.calculationCrs,
    calculation_model: "wgs84_utm_transverse_mercator" as const,
    library: "geoai_wgs84_utm" as const,
    library_version: UTM_IMPLEMENTATION_VERSION,
    source_snapshot_ids: [casePack.snapshot.id],
    graph_version: null,
    calculated_at: casePack.snapshot.retrievedAt,
    input_geometry_hashes: [
      semanticHash({ type: "Point", coordinates: anchor }),
      semanticHash(feature.geometry)
    ] as [string, string],
    fallback_note: null
  };
  const distanceHash = semanticHash(core);
  return {
    distance_id: `distance_${distanceHash.slice(0, 24)}`,
    distance_hash: distanceHash,
    ...core
  };
}

function createMetric(
  core: Omit<LivePointContextMetric, "metric_id" | "metric_hash">
): LivePointContextMetric {
  const metricHash = semanticHash(core);
  return {
    metric_id: `metric_${metricHash.slice(0, 24)}`,
    metric_hash: metricHash,
    ...core
  };
}

function createAbsenceReceipt(
  category: LivePointContextCategory,
  radiusM: number,
  casePack: LivePointCasePack,
  coverageState: "measured_partial" | "coverage_unknown"
): LivePointAbsenceReceipt {
  const queryCore = {
    category,
    radius_m: radiusM,
    snapshot_ids: [casePack.snapshot.id],
    coverage_state: coverageState,
    predicate_version: "point-to-object-context-category-v1"
  };
  const queryHash = semanticHash(queryCore);
  return {
    absence_id: `absence_${queryHash.slice(0, 24)}`,
    query_id: `query_${queryHash.slice(0, 24)}`,
    query_hash: queryHash,
    category,
    radius_m: radiusM,
    snapshot_ids: [casePack.snapshot.id],
    queried_at: casePack.snapshot.retrievedAt,
    result_count: 0,
    coverage_state: coverageState,
    absence_semantics: "no_records_returned_only",
    supports_absence_conclusion: false,
    evidence_ids: [casePack.snapshot.acquisitionReceiptId]
  };
}

export function buildLivePointContext(
  request: LivePointRequest,
  resolution: LivePointResolution,
  repository: LivePointSnapshotRepository
): ContextBuildResult {
  if (resolution.status === "outside_coverage") return { context: null, warnings: [] };
  assertE1FixtureAuthority(repository);
  assertE1SourceRights(repository);
  const casePack = casePackForResolution(resolution, repository);
  if (!casePack) {
    throw new LivePointCoreError(
      "SNAPSHOT_MISSING",
      "The resolution snapshot cannot be reloaded from the injected synthetic fixture."
    );
  }

  const anchor = clickedPosition(resolution);
  const categories = request.requested_categories.length > 0
    ? request.requested_categories
    : [...LIVE_POINT_CONTEXT_CATEGORIES];
  const categorySet = new Set<LivePointContextCategory>(categories);
  const radiusM = request.context_radius_m;
  const centerDistanceM = measurePointAgainstGeometry(
    anchor,
    {
      type: "Point",
      coordinates: [casePack.coverage.center.longitude, casePack.coverage.center.latitude]
    },
    casePack.calculationCrs
  ).distanceM;
  const requestedWindowFullyMeasured =
    centerDistanceM + radiusM <= casePack.snapshot.completeCoverageRadiusM + 0.5;
  const coverageState = requestedWindowFullyMeasured ? "measured_partial" as const : "coverage_unknown" as const;

  const observed = casePack.contextFeatures
    .filter((feature) => categorySet.has(feature.category))
    .map((feature) => ({ feature, distanceM: distanceFromAnchor(anchor, feature, casePack) }))
    .filter(({ distanceM }) => distanceM <= radiusM)
    .sort((left, right) => left.distanceM - right.distanceM || compareCanonicalText(left.feature.id, right.feature.id));
  const returned = observed.slice(0, LIVE_POINT_CAPS.facilities);
  const truncated = returned.length !== observed.length;

  const facilities = returned.map(({ feature, distanceM }) => ({
    feature_id: feature.id,
    source_id: feature.sourceId,
    category: feature.category,
    display_name: feature.displayName,
    distance_m: distanceM,
    geometry_basis: "synthetic_point" as const,
    feature_hash: feature.featureHash,
    authority_status: "open_context_not_official" as const
  }));

  const metrics: LivePointContextMetric[] = [];
  const categorySummaries: LivePointCategorySummary[] = [];
  const missingData: MissingDataReceipt[] = [];
  for (const category of categories) {
    const allForCategory = observed.filter(({ feature }) => feature.category === category);
    const returnedForCategory = returned.filter(({ feature }) => feature.category === category);
    const nearest = allForCategory[0] ?? null;
    const absenceReceipt = nearest ? null : createAbsenceReceipt(category, radiusM, casePack, coverageState);
    const status = nearest
      ? "observed" as const
      : requestedWindowFullyMeasured
        ? "not_observed_in_source_snapshot" as const
        : "coverage_unknown" as const;
    categorySummaries.push({
      category,
      status,
      observed_count: allForCategory.length,
      returned_count: returnedForCategory.length,
      nearest_feature_id: nearest?.feature.id ?? null,
      nearest_distance_m: nearest?.distanceM ?? null,
      proof_limit: nearest
        ? "Observed source records are open-context snapshot records, not proof of present service quality, capacity or availability."
        : ABSENCE_PROOF_LIMIT,
      absence_receipt: absenceReceipt
    });

    metrics.push(createMetric({
      category,
      label: `${category} records observed in source snapshot`,
      value: allForCategory.length,
      unit: "count",
      status: nearest ? "observed" : "not_observed_in_source_snapshot",
      formula: "count(source snapshot records matching the frozen category predicate within the requested radius)",
      distance_method: "not_applicable",
      source_feature_ids: allForCategory.map(({ feature }) => feature.id),
      snapshot_ids: [casePack.snapshot.id],
      graph_version: null,
      calculated_at: casePack.snapshot.retrievedAt,
      proof_limit: ABSENCE_PROOF_LIMIT,
      distance_receipt: null
    }));
    if (nearest) {
      metrics.push(createMetric({
        category,
        label: `Nearest observed ${category} source feature`,
        value: nearest.distanceM,
        unit: "metre",
        status: "observed",
        formula: "projected Euclidean distance from the exact clicked point to the extracted source feature point",
        distance_method: "utm_euclidean_point_to_point",
        source_feature_ids: [nearest.feature.id],
        snapshot_ids: [casePack.snapshot.id],
        graph_version: null,
        calculated_at: casePack.snapshot.retrievedAt,
        proof_limit: "Straight-line screening distance is not walking, driving, access, entrance or service-availability distance.",
        distance_receipt: createDistanceReceipt(anchor, nearest.feature, nearest.distanceM, casePack)
      }));
    } else {
      const missingStatus = requestedWindowFullyMeasured
        ? "not_observed_in_source_snapshot" as const
        : "coverage_unknown" as const;
      const missingHash = semanticHash({ category, radiusM, snapshotId: casePack.snapshot.id, missingStatus });
      missingData.push({
        missing_id: `missing_${missingHash.slice(0, 24)}`,
        field_or_category: category,
        status: missingStatus,
        reason: ABSENCE_PROOF_LIMIT,
        impact: "No positive proximity or availability conclusion can be made for this category.",
        required_next_source_or_action: "Validate against an approved current source and, where relevant, official or client records."
      });
    }
  }

  const anchorCore = {
    anchor_kind: resolution.status === "resolved" ? "resolved_entity" as const : "clicked_point" as const,
    anchor_entity_id: resolution.status === "resolved" ? resolution.selected_object.entity_id : null,
    anchor_position: resolution.clicked_point,
    resolution_hash: resolution.resolution_hash
  };
  const anchorHash = semanticHash(anchorCore);
  const contextCore = {
    quality: "partial" as const,
    anchor_kind: anchorCore.anchor_kind,
    anchor_id: `anchor_${anchorHash.slice(0, 24)}`,
    anchor_hash: anchorHash,
    anchor_resolution_hash: resolution.resolution_hash,
    anchor_entity_id: anchorCore.anchor_entity_id,
    anchor_position: anchorCore.anchor_position,
    radius_m: radiusM,
    total_observed_count: observed.length,
    returned_count: facilities.length,
    truncated,
    truncation_reason: truncated
      ? `Returned facilities are capped at ${LIVE_POINT_CAPS.facilities}; category totals preserve full observed counts.`
      : null,
    category_summaries: categorySummaries,
    metrics,
    facilities,
    missing_data: missingData,
    source_coverage: {
      case_pack_id: casePack.id,
      complete_coverage_radius_m: casePack.snapshot.completeCoverageRadiusM,
      outer_evaluation_radius_m: casePack.snapshot.outerEvaluationRadiusM,
      requested_window_fully_measured: requestedWindowFullyMeasured,
      status: coverageState,
      coverage_geometry_hash: casePack.coverage.geometryHash,
      complete_geometry_hash: casePack.coverage.completeness.completeGeometryHash,
      proof_limit: casePack.coverage.completeness.proofLimit
    },
    snapshot_anchor: resolution.snapshot_anchor
  };
  const contextHash = semanticHash(contextCore);
  const warnings: LivePointWarning[] = [{
    code: "PARTIAL_CONTEXT_SOURCE",
    message: requestedWindowFullyMeasured
      ? "The requested window is within the measured acquisition predicate, but open snapshot coverage is not complete real-world coverage."
      : "The requested window extends beyond the measured source-predicate coverage and must be treated as coverage unknown."
  }];
  if (truncated) warnings.push({ code: "CONTEXT_TRUNCATED", message: contextCore.truncation_reason! });

  return {
    context: {
      context_id: `context_${contextHash.slice(0, 24)}`,
      context_hash: contextHash,
      ...contextCore
    },
    warnings
  };
}
