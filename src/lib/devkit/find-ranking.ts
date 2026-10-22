import type { MultiPolygon, Polygon } from "geojson";
import type { Claim, Constraint, Evidence, JsonObject, ProjectBrief, SpatialObject } from "./contracts";
import {
  POINT_OBJECT_FIND_CAVEAT,
  parsePointObjectFindRequest,
  pointObjectFindCandidateResultKind,
  type PointObjectFindCandidate,
  type PointObjectFindResult
} from "../prototype/point-to-object-find-contract";
import { sourceElementFootprint } from "../prototype/point-to-object-source-geometry";
import { validatePointObjectReplacementAoi } from "../prototype/point-to-object-map-replacement";

export const DEVKIT_FIND_SCENARIO = "developer_redevelopment_screening_v1" as const;
export const DEVKIT_FIND_CAVEAT = POINT_OBJECT_FIND_CAVEAT;
export type DevkitFindInputKind = "existing_find_result" | "synthetic_fixture";
export type DevkitFindCriteria = {
  scenarioId: typeof DEVKIT_FIND_SCENARIO;
  maximumMappedLevels: number;
  maximumReferenceDistanceKm: number;
  referencePoint: { longitude: number; latitude: number; label: string };
};
export type DevkitFindCriterionKey = "redevelopment_tag" | "mapped_levels" | "source_footprint" | "reference_distance";
export type DevkitFindCriterion = {
  key: DevkitFindCriterionKey;
  status: "met" | "not_met" | "unknown";
  value: string | number | boolean | null;
  rawValue: string | null;
  unit: "tag" | "levels" | "geometry" | "km";
  reason: string;
  evidence: {
    sourceFeatureId: PointObjectFindCandidate["sourceFeatureId"];
    sourceResponseHash: string;
    fragment: string;
    sourceSnapshotAt: string | null;
    acquiredAt: string;
    objectObservedAt: null;
    method: "source_tag" | "validated_source_geometry" | "great_circle_representative_point";
  };
};
export type DevkitFindRankedCandidate = {
  candidate: PointObjectFindCandidate;
  criteria: DevkitFindCriterion[];
  metCount: number;
  mismatchCount: number;
  unknownCount: number;
  representativeDistanceKm: number;
};
export type DevkitFindRanking = {
  protocol: "DEVKIT_FIND_RANKING_V1";
  inputKind: DevkitFindInputKind;
  scenario: DevkitFindCriteria;
  result: PointObjectFindResult;
  candidates: DevkitFindRankedCandidate[];
  ordering: "met_desc_mismatch_asc_distance_asc_source_identity_asc";
  caveat: typeof DEVKIT_FIND_CAVEAT;
};
export type DevkitFindSelection = {
  protocol: "DEVKIT_FIND_SELECTION_V1";
  inputKind: DevkitFindInputKind;
  scenario: DevkitFindCriteria;
  candidate: PointObjectFindCandidate;
  subjectKind: "building" | "poi" | "open_map_area" | "unknown";
  parcelId: null;
  screeningGeometry: Polygon | MultiPolygon | null;
  geometryRole: "source_footprint_not_legal_boundary" | "representative_point_only";
  source: PointObjectFindResult["source"];
  query: PointObjectFindResult["criteria"];
  coverage: PointObjectFindResult["coverage"];
  criteria: DevkitFindCriterion[];
  limitations: readonly string[];
  caveat: typeof DEVKIT_FIND_CAVEAT;
};
/** Serializable input, with the existing Find shortlist shape. Storage belongs to the project owner. */
export type DevkitFindState = {
  version: 1;
  inputKind: DevkitFindInputKind;
  result: PointObjectFindResult;
  criteria: DevkitFindCriteria;
  shortlist: PointObjectFindCandidate[];
  selectedSourceFeatureId: PointObjectFindCandidate["sourceFeatureId"] | null;
};

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const date = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const tag = (value: string | undefined) => value?.trim().toLowerCase() ?? "";
const physical = (value: string | undefined) => !!tag(value) && !["no", "false", "0"].includes(tag(value));

export function validateDevkitFindCriteria(value: unknown): value is DevkitFindCriteria {
  if (!record(value) || value.scenarioId !== DEVKIT_FIND_SCENARIO || !record(value.referencePoint)) return false;
  const point = value.referencePoint;
  return Number.isInteger(value.maximumMappedLevels) && Number(value.maximumMappedLevels) >= 1 && Number(value.maximumMappedLevels) <= 100 &&
    finite(value.maximumReferenceDistanceKm) && value.maximumReferenceDistanceKm > 0 && value.maximumReferenceDistanceKm <= 50 &&
    finite(point.longitude) && Math.abs(point.longitude) <= 180 && finite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    typeof point.label === "string" && !!point.label.trim() && point.label.length <= 160;
}

/** Spherical distance between source representative point and the user's reference, never a route distance. */
export function devkitFindDistanceKm(first: { longitude: number; latitude: number }, second: { longitude: number; latitude: number }): number {
  const rad = Math.PI / 180;
  const lat = (second.latitude - first.latitude) * rad;
  const lon = (second.longitude - first.longitude) * rad;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(first.latitude * rad) * Math.cos(second.latitude * rad) * Math.sin(lon / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

function validatedFootprint(candidate: PointObjectFindCandidate): Polygon | MultiPolygon | null {
  if (candidate.sourceElementType === "node" || candidate.geometryStatus !== "available" ||
      candidate.geometryProvenance !== "confirmed_complete_footprint" || !candidate.geometry ||
      pointObjectFindCandidateResultKind(candidate) !== "mapped_building_or_landuse") return null;
  const geometry = candidate.geometry;
  if (geometry.type === "Polygon") return validatePointObjectReplacementAoi(geometry).valid ? geometry : null;
  // MultiPolygon source provenance comes from the existing complete-geometry normalizer;
  // each member is checked again after storage. No union or parcel geometry is fabricated.
  if (geometry.type !== "MultiPolygon" || !Array.isArray(geometry.coordinates) || !geometry.coordinates.length || geometry.coordinates.length > 100) return null;
  if (!geometry.coordinates.every(coordinates => Array.isArray(coordinates) && validatePointObjectReplacementAoi({ type: "Polygon", coordinates }).valid)) return null;
  const normalized = sourceElementFootprint({ type: "relation", tags: { ...candidate.observedTags, type: "multipolygon" },
    members: geometry.coordinates.flatMap(polygon => polygon.map((ring, index) => ({ type: "way", role: index === 0 ? "outer" : "inner",
      geometry: ring.map(point => ({ lon: point[0], lat: point[1] })) }))) });
  return normalized ? geometry : null;
}

function validCoverage(coverage: PointObjectFindResult["coverage"], limit: number): boolean {
  return !!coverage && coverage.kind === "bounded_open_map_sample" && coverage.completeInventory === false &&
    finite(coverage.approximateAreaSqKm) && coverage.approximateAreaSqKm >= 0 && coverage.approximateAreaSqKm <= 36 &&
    Number.isInteger(coverage.returnedCandidateCount) && coverage.returnedCandidateCount >= 0 && coverage.returnedCandidateCount <= limit &&
    Number.isInteger(coverage.normalizedCandidateCount) && coverage.normalizedCandidateCount >= coverage.returnedCandidateCount &&
    Number.isInteger(coverage.upstreamElementCount) && coverage.upstreamElementCount >= coverage.normalizedCandidateCount &&
    coverage.upstreamQueryLimit === 80 && typeof coverage.capReached === "boolean";
}

function assertResult(result: PointObjectFindResult): void {
  if (!result || result.protocol !== "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1" ||
      !["results", "empty"].includes(result.mode) || result.ordering !== "source_identity_ascending_not_ranked" ||
      !parsePointObjectFindRequest(result.criteria).ok || !Array.isArray(result.candidates) || result.candidates.length > 20 ||
      (result.mode === "empty" && result.candidates.length !== 0) ||
      !result.source || result.source.name !== "OpenStreetMap" || result.source.service !== "Overpass API" ||
      result.source.officialStatus !== "open_context_not_official" || result.source.licenceId !== "ODbL-1.0" ||
      result.source.licenceUrl !== "https://www.openstreetmap.org/copyright" ||
      result.source.freshness !== "runtime_response_feature_time_unavailable" ||
      result.source.runtimeNetworkUsed !== true || result.source.persistenceUsed !== false ||
      !/^[a-f0-9]{64}$/.test(result.source.sourceResponseHash) || !date(result.source.acquiredAt) ||
      (result.source.observedAt !== null && !date(result.source.observedAt)) ||
      !validCoverage(result.coverage, result.criteria.limit) || result.coverage.returnedCandidateCount !== result.candidates.length ||
      !Array.isArray(result.limitations) || result.limitations.some(value => typeof value !== "string") || result.caveat !== DEVKIT_FIND_CAVEAT) {
    throw new Error("A valid bounded existing Find result and its source receipt are required.");
  }
  const ids = new Set<string>();
  const [west, south, east, north] = result.criteria.bounds;
  for (const candidate of result.candidates) {
    if (!candidate || !/^(node|way|relation)\/[1-9]\d{0,19}$/.test(candidate.sourceFeatureId) ||
        candidate.sourceFeatureId !== `${candidate.sourceElementType}/${candidate.sourceElementId}` || ids.has(candidate.sourceFeatureId) ||
        candidate.group !== result.criteria.group || candidate.evidenceClass !== "observed_in_open_map_source" ||
        typeof candidate.label !== "string" || !candidate.label.trim() || candidate.label.length > 240 ||
        !finite(candidate.longitude) || !finite(candidate.latitude) || candidate.longitude < west || candidate.longitude > east ||
        candidate.latitude < south || candidate.latitude > north || !record(candidate.observedTags) ||
        Object.keys(candidate.observedTags).length > 24 ||
        Object.entries(candidate.observedTags).some(([key, value]) => key.length > 80 || typeof value !== "string" || value.length > 240) ||
        !candidate.matchedTag || typeof candidate.matchedTag.key !== "string" || !candidate.matchedTag.value ||
        candidate.observedTags[candidate.matchedTag.key] !== candidate.matchedTag.value) {
      throw new Error("Find candidate identity, bounds or source-tag evidence is invalid or duplicated.");
    }
    ids.add(candidate.sourceFeatureId);
  }
}

function evaluate(candidate: PointObjectFindCandidate, result: PointObjectFindResult, scenario: DevkitFindCriteria): DevkitFindRankedCandidate {
  const evidence = (fragment: string, method: DevkitFindCriterion["evidence"]["method"]): DevkitFindCriterion["evidence"] => ({
    sourceFeatureId: candidate.sourceFeatureId, sourceResponseHash: result.source.sourceResponseHash, fragment,
    sourceSnapshotAt: result.source.observedAt, acquiredAt: result.source.acquiredAt, objectObservedAt: null, method
  });
  const building = tag(candidate.observedTags.building);
  const landuse = tag(candidate.observedTags.landuse);
  const redevelopment = building === "construction" || ["construction", "brownfield"].includes(landuse);
  const hasPhysicalTag = physical(building) || physical(landuse);
  const rawLevels = candidate.observedTags["building:levels"] ?? null;
  const parsedLevels = rawLevels !== null && /^[1-9]\d{0,2}$/.test(rawLevels.trim()) && Number(rawLevels) <= 300 ? Number(rawLevels) : null;
  const levels = parsedLevels !== null && candidate.mappedBuildingLevels === parsedLevels ? parsedLevels : null;
  const footprint = validatedFootprint(candidate);
  const distance = devkitFindDistanceKm(candidate, scenario.referencePoint);
  const criteria: DevkitFindCriterion[] = [
    { key: "redevelopment_tag", status: redevelopment ? "met" : hasPhysicalTag ? "not_met" : "unknown",
      value: redevelopment ? "mapped_redevelopment_signal" : hasPhysicalTag ? "other_mapped_physical_use" : null,
      rawValue: [building && `building=${candidate.observedTags.building}`, landuse && `landuse=${candidate.observedTags.landuse}`].filter(Boolean).join("; ") || null,
      unit: "tag", reason: redevelopment ? "explicit_redevelopment_tag" : hasPhysicalTag ? "different_mapped_use" : "physical_use_missing",
      evidence: evidence("tags.building; tags.landuse", "source_tag") },
    { key: "mapped_levels", status: levels === null ? "unknown" : levels <= scenario.maximumMappedLevels ? "met" : "not_met",
      value: levels, rawValue: rawLevels, unit: "levels",
      reason: levels === null ? rawLevels !== null && parsedLevels !== candidate.mappedBuildingLevels ? "levels_conflict_or_invalid" : "explicit_levels_unavailable" : "explicit_mapped_levels_only",
      evidence: evidence("tags.building:levels; mappedBuildingLevels", "source_tag") },
    { key: "source_footprint", status: footprint ? "met" : "unknown", value: footprint ? true : null,
      rawValue: candidate.geometryStatus ?? null, unit: "geometry", reason: footprint ? "complete_source_footprint" : "complete_source_footprint_unavailable",
      evidence: evidence("geometry; geometryProvenance; geometryStatus", "validated_source_geometry") },
    { key: "reference_distance", status: distance <= scenario.maximumReferenceDistanceKm ? "met" : "not_met",
      value: distance, rawValue: `${candidate.longitude},${candidate.latitude}`, unit: "km", reason: "approximate_representative_point_distance",
      evidence: evidence("longitude; latitude; scenario.referencePoint (user assumption)", "great_circle_representative_point") }
  ];
  return { candidate, criteria, metCount: criteria.filter(item => item.status === "met").length,
    mismatchCount: criteria.filter(item => item.status === "not_met").length,
    unknownCount: criteria.filter(item => item.status === "unknown").length, representativeDistanceKm: distance };
}

/** Re-ranks only the returned sample; unknowns are never converted into measurements or confirmed mismatches. */
export function rankDevkitFindCandidates(result: PointObjectFindResult, scenario: DevkitFindCriteria, inputKind: DevkitFindInputKind): DevkitFindRanking {
  if (!validateDevkitFindCriteria(scenario)) throw new Error("Choose valid, explicit redevelopment screening preferences.");
  if (!["existing_find_result", "synthetic_fixture"].includes(inputKind)) throw new Error("Find input provenance must be explicit.");
  assertResult(result);
  const snapshot = copy(result);
  const criteria = copy(scenario);
  const candidates = snapshot.candidates.map(candidate => evaluate(candidate, snapshot, criteria));
  candidates.sort((a, b) => b.metCount - a.metCount || a.mismatchCount - b.mismatchCount ||
    a.representativeDistanceKm - b.representativeDistanceKm ||
    (a.candidate.sourceFeatureId < b.candidate.sourceFeatureId ? -1 : a.candidate.sourceFeatureId > b.candidate.sourceFeatureId ? 1 : 0));
  return { protocol: "DEVKIT_FIND_RANKING_V1", inputKind, scenario: criteria, result: snapshot, candidates,
    ordering: "met_desc_mismatch_asc_distance_asc_source_identity_asc", caveat: DEVKIT_FIND_CAVEAT };
}

export function selectDevkitFindCandidate(ranking: DevkitFindRanking, sourceFeatureId: string): DevkitFindSelection {
  const item = ranking.candidates.find(row => row.candidate.sourceFeatureId === sourceFeatureId);
  if (!item) throw new Error("The selected candidate must belong to this exact Find response.");
  const candidate = item.candidate;
  const kind = pointObjectFindCandidateResultKind(candidate);
  const subjectKind = kind === "mapped_poi" ? "poi" : physical(candidate.observedTags.building) ? "building" :
    physical(candidate.observedTags.landuse) ? "open_map_area" : "unknown";
  const geometry = validatedFootprint(candidate);
  return copy({ protocol: "DEVKIT_FIND_SELECTION_V1", inputKind: ranking.inputKind, scenario: ranking.scenario, candidate,
    subjectKind, parcelId: null, screeningGeometry: geometry,
    geometryRole: geometry ? "source_footprint_not_legal_boundary" : "representative_point_only",
    source: ranking.result.source, query: ranking.result.criteria, coverage: ranking.result.coverage,
    criteria: item.criteria, limitations: ranking.result.limitations, caveat: DEVKIT_FIND_CAVEAT });
}

export function createDevkitFindState(result: PointObjectFindResult, criteria: DevkitFindCriteria, inputKind: DevkitFindInputKind): DevkitFindState {
  const ranking = rankDevkitFindCandidates(result, criteria, inputKind);
  return { version: 1, inputKind, result: ranking.result, criteria: ranking.scenario, shortlist: [], selectedSourceFeatureId: null };
}

export function parseDevkitFindState(value: unknown): DevkitFindState | null {
  try {
    if (!record(value) || value.version !== 1 || !Array.isArray(value.shortlist) || value.shortlist.length > 3 ||
        !(value.selectedSourceFeatureId === null || typeof value.selectedSourceFeatureId === "string")) return null;
    const state = value as unknown as DevkitFindState;
    const ranking = rankDevkitFindCandidates(state.result, state.criteria, state.inputKind);
    const ids = new Set<string>();
    for (const candidate of state.shortlist) {
      const original = ranking.result.candidates.find(row => row.sourceFeatureId === candidate?.sourceFeatureId);
      if (!original || ids.has(candidate.sourceFeatureId) || canonicalJson(original) !== canonicalJson(candidate)) return null;
      ids.add(candidate.sourceFeatureId);
    }
    if (state.selectedSourceFeatureId !== null) selectDevkitFindCandidate(ranking, state.selectedSourceFeatureId);
    return copy(state);
  } catch { return null; }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (record(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}


/** Restores a selection by recomputing derived identity/criteria, never trusting saved conclusions. */
export function parseDevkitFindSelection(value: unknown): DevkitFindSelection | null {
  try {
    if (!record(value) || value.protocol !== "DEVKIT_FIND_SELECTION_V1") return null;
    const selected = value as unknown as DevkitFindSelection;
    if (!validCoverage(selected.coverage, selected.query.limit) || selected.coverage.returnedCandidateCount < 1) return null;
    const result: PointObjectFindResult = {
      protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1", mode: "results", criteria: selected.query,
      candidates: [selected.candidate], ordering: "source_identity_ascending_not_ranked",
      coverage: { ...selected.coverage, returnedCandidateCount: 1 }, source: selected.source,
      limitations: selected.limitations, caveat: selected.caveat
    };
    const restored = selectDevkitFindCandidate(rankDevkitFindCandidates(result, selected.scenario, selected.inputKind), selected.candidate.sourceFeatureId);
    restored.coverage = copy(selected.coverage);
    return canonicalJson(restored) === canonicalJson(selected) ? restored : null;
  } catch { return null; }
}

export type DevkitFindProjectBriefMapping = {
  brief: ProjectBrief;
  objects: SpatialObject[];
  evidence: Evidence[];
  claims: Claim[];
  constraints: Constraint[];
  selection: DevkitFindSelection;
  aoiChange: "not_requested";
};

/** Foundation-v1 adapter proposal. The workflow owner merges by ID and revises
 * project inputs. This function neither replaces an existing AOI nor saves a project. */
export function mapDevkitFindSelectionToProjectBrief(
  selection: DevkitFindSelection,
  target: { projectId: string; brief: ProjectBrief }
): DevkitFindProjectBriefMapping {
  if (!target.projectId.trim() || target.brief.marketKey !== selection.query.marketKey) {
    throw new Error("Choose a project in the same market; an existing project/AOI cannot silently change jurisdiction.");
  }
  const validated = parseDevkitFindSelection(selection);
  if (!validated) throw new Error("The Find selection must preserve validated source identity and derived criterion evidence.");
  selection = validated;
  const candidate = selection.candidate;
  const prefix = `find:${candidate.sourceElementType}:${candidate.sourceElementId}:${selection.source.sourceResponseHash.slice(0, 12)}`;
  const evidenceId = `${prefix}:source`;
  const objectId = `${prefix}:object`;
  const isObject = selection.subjectKind === "building" || selection.subjectKind === "poi";
  const subjectId = isObject ? objectId : target.projectId;
  const synthetic = selection.inputKind === "synthetic_fixture";
  const evidence: Evidence = {
    id: evidenceId, subjectId, label: `${synthetic ? "Synthetic Find fixture" : "Open-map Find response"} · ${candidate.sourceFeatureId}`,
    sourceId: synthetic ? "devkit-find-synthetic-fixture-v1" : "OpenStreetMap/Overpass",
    sourceUrl: synthetic ? null : `https://www.openstreetmap.org/${candidate.sourceFeatureId}`,
    // Preserve original source identity, raw tags, query and date semantics. Full
    // selection remains available separately for the caller's Find-state save.
    excerpt: JSON.stringify({ sourceFeatureId: candidate.sourceFeatureId, sourceElementType: candidate.sourceElementType,
      sourceElementId: candidate.sourceElementId, observedTags: candidate.observedTags, matchedTag: candidate.matchedTag,
      query: selection.query, sourceSnapshotAt: selection.source.observedAt, objectObservedAt: null,
      inputKind: selection.inputKind, geometryRole: selection.geometryRole }),
    acquiredAt: selection.source.acquiredAt, validAt: null, responseHash: selection.source.sourceResponseHash,
    trust: synthetic ? "synthetic" : "public_source", status: "partial",
    provenance: { protocol: "DEVKIT_FIND_EVIDENCE_V1", findSelection: copy(selection) as unknown as JsonObject },
    rights: { licence: synthetic ? "synthetic-demo" : selection.source.licenceId,
      attribution: synthetic ? "GeoAI synthetic Find fixture; no source observation" : selection.source.attribution,
      permittedUse: synthetic ? "synthetic_demo" : "unknown", redistribution: "unknown" }
  };
  const objects: SpatialObject[] = isObject ? [{
    id: objectId, kind: selection.subjectKind === "poi" ? "poi" : "building", label: candidate.label,
    sourceFeatureId: candidate.sourceFeatureId,
    geometry: selection.screeningGeometry ?? { type: "Point", coordinates: [candidate.longitude, candidate.latitude] },
    crs: "EPSG:4326", trust: synthetic ? "synthetic" : "public_source", evidenceIds: [evidenceId]
  }] : [];
  const criterionClaims: Claim[] = selection.criteria.map(item => ({
    id: `${prefix}:${item.key}`, subjectId, field: `find.${candidate.sourceFeatureId}.${item.key}`,
    value: item.value, unit: item.unit, status: item.status === "unknown" ? "unknown" : "derived", evidenceIds: [evidenceId],
    explanation: `${item.status}; ${item.reason}; user scenario ${selection.scenario.scenarioId}. Object observation date unknown.`
  }));
  const constraints: Constraint[] = [{
    id: `${prefix}:parcel-link-unknown`, subjectId, label: "Find has not established a legal parcel link",
    status: "unknown", severity: "critical", geometry: null, evidenceIds: [evidenceId],
    impact: "The selected open-map identity cannot establish rights, planning permission or development feasibility.",
    nextAction: "Link authorized parcel/planning evidence explicitly; retain the current AOI until the user chooses an evidenced screening extent."
  }];
  const requirement = `Find candidate ${candidate.sourceFeatureId}: ${candidate.label}`;
  const assumption = `Find screening preferences: mapped levels <= ${selection.scenario.maximumMappedLevels}; representative-point distance <= ${selection.scenario.maximumReferenceDistanceKm} km to ${selection.scenario.referencePoint.label} (${selection.scenario.referencePoint.longitude}, ${selection.scenario.referencePoint.latitude}, WGS84). These are user assumptions, not planning rules.`;
  return copy({
    brief: { ...target.brief, requirements: [...new Set([...target.brief.requirements, requirement])],
      assumptions: [...new Set([...target.brief.assumptions, assumption, DEVKIT_FIND_CAVEAT])] },
    objects, evidence: [evidence], claims: [{ id: `${prefix}:selected`, subjectId, field: "find.selected_source_feature_id", value: candidate.sourceFeatureId, unit: null,
      status: "derived", evidenceIds: [evidenceId], explanation: "User-selected open-map candidate; no parcel or development-right assertion." }, ...criterionClaims], constraints, selection, aoiChange: "not_requested"
  });
}


/** Exact selection can survive the foundation project's evidence save/export/reopen. */
export function restoreDevkitFindSelectionFromEvidence(evidence: Evidence): DevkitFindSelection | null {
  if (evidence.provenance?.protocol !== "DEVKIT_FIND_EVIDENCE_V1") return null;
  const selection = parseDevkitFindSelection(evidence.provenance.findSelection);
  return selection && selection.source.sourceResponseHash === evidence.responseHash && selection.source.acquiredAt === evidence.acquiredAt &&
    evidence.validAt === null && evidence.trust === (selection.inputKind === "synthetic_fixture" ? "synthetic" : "public_source") ? selection : null;
}
