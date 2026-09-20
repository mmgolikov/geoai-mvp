import assert from "node:assert/strict";
import { createHash } from "node:crypto";
// @ts-expect-error Node strip-types requires the explicit extension.
import { validateSprint10FindAnalysisRequest, type Sprint10GoalDepthSource } from "./sprint10-live-journey-gate.ts";

export const CONSTRUCTION_FIND_CASE = Object.freeze({
  scope: "dubai-find-construction", marketKey: "dubai", locale: "en",
  role: "developer", scenario: "b2b_redevelopment_selected_aoi", group: "construction",
  // NEW test area, not the founder's original viewport/AOI. One approved OSM
  // way/full GET located the reference object; it is not a frozen result cohort.
  locationBasis: "https://api.openstreetmap.org/api/0.6/way/1264541009/full.json",
  referenceBounds: [55.3601724, 25.2063127, 55.3605596, 25.2066239],
  targetBounds: [55.352, 25.199, 55.369, 25.214],
  viewportEnvelope: [55.34, 25.19, 55.38, 25.23],
  limit: 12, aiPosts: 3, reserveUsdEach: 1.2,
  question: "What evidence supports this screening result, and what must be validated before a redevelopment decision?"
} as const);
type Candidate = Record<string, unknown>;
function record(value: unknown): value is Candidate { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
export function assertConstructionViewport(bounds: unknown): asserts bounds is number[] {
  assert.ok(Array.isArray(bounds) && bounds.length === 4 && bounds.every(Number.isFinite));
  const [w, s, e, n] = bounds as number[];
  const envelope = CONSTRUCTION_FIND_CASE.viewportEnvelope;
  assert.ok(w < e && s < n && w >= envelope[0] && s >= envelope[1] && e <= envelope[2] && n <= envelope[3]);
  const ref = CONSTRUCTION_FIND_CASE.referenceBounds;
  assert.ok(w <= ref[0] && s <= ref[1] && e >= ref[2] && n >= ref[3], "New viewport must include the observed reference geometry");
}
export function acceptedConstructionFindRequest(value: unknown, frozenViewport: readonly number[]): value is Candidate & { bounds: number[] } {
  try {
    assertConstructionViewport(frozenViewport);
    assert.ok(record(value));
    assert.deepEqual(Object.keys(value).sort(), ["bounds", "group", "limit", "locale", "mappedMaximumLevels", "mappedMinimumLevels", "marketKey"].sort());
    assertConstructionViewport(value.bounds);
    assert.ok(value.bounds.every((n, i) => Math.abs(n - frozenViewport[i]) <= 1e-7));
    assert.equal(value.marketKey, "dubai"); assert.equal(value.locale, "en"); assert.equal(value.group, "construction");
    assert.equal(value.limit, 12); assert.equal(value.mappedMinimumLevels, null); assert.equal(value.mappedMaximumLevels, null);
    return true;
  } catch { return false; }
}
function assertRing(ring: unknown) {
  assert.ok(Array.isArray(ring) && ring.length >= 4);
  for (const position of ring) assert.ok(Array.isArray(position) && position.length === 2 && position.every(Number.isFinite) && Math.abs(position[0]) <= 180 && Math.abs(position[1]) <= 90);
  assert.deepEqual(ring[0], ring[ring.length - 1]);
  assert.ok(new Set(ring.slice(0, -1).map(p => JSON.stringify(p))).size >= 3);
  const twiceArea = ring.slice(0, -1).reduce((sum, p, i) => sum + p[0] * ring[i + 1][1] - ring[i + 1][0] * p[1], 0);
  assert.ok(Math.abs(twiceArea) > 1e-12, "A zero-area ring is not a footprint");
}
export function freezeConstructionFindCohort(candidates: readonly Candidate[], bounds: readonly number[]) {
  assertConstructionViewport(bounds);
  assert.ok(candidates.length >= 3, "Three real Find results required before any paid analysis");
  const selected = candidates.slice(0, 3); // Source ordering, never invented/preselected IDs.
  const sources = selected.map(candidate => {
    assert.ok(typeof candidate.sourceFeatureId === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(candidate.sourceFeatureId));
    assert.equal(`${candidate.sourceElementType}/${candidate.sourceElementId}`, candidate.sourceFeatureId);
    assert.equal(candidate.group, "construction");
    assert.equal(candidate.evidenceClass, "observed_in_open_map_source");
    assert.ok(record(candidate.observedTags) && (candidate.observedTags.building === "construction" || ["construction", "brownfield"].includes(String(candidate.observedTags.landuse))));
    const x = candidate.longitude, y = candidate.latitude;
    assert.ok(typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y));
    assert.ok(x >= bounds[0] && y >= bounds[1] && x <= bounds[2] && y <= bounds[3]);
    if (candidate.geometry != null) {
      assert.equal(candidate.geometryProvenance, "confirmed_complete_footprint");
      assert.equal(candidate.geometryStatus, "available");
      assert.ok(record(candidate.geometry) && ["Polygon", "MultiPolygon"].includes(String(candidate.geometry.type)));
      const polygons = candidate.geometry.type === "Polygon" ? [candidate.geometry.coordinates] : candidate.geometry.coordinates;
      assert.ok(Array.isArray(polygons) && polygons.length > 0);
      for (const polygon of polygons) { assert.ok(Array.isArray(polygon) && polygon.length > 0); polygon.forEach(assertRing); }
    } else {
      assert.ok(candidate.geometryStatus === "point_only" || candidate.geometryStatus === "unavailable");
      assert.ok(candidate.geometryProvenance == null, "Absent footprint cannot acquire geometry provenance");
    }
    return { sourceFeatureId: candidate.sourceFeatureId, longitude: x, latitude: y };
  });
  assert.equal(new Set(sources.map(source => source.sourceFeatureId)).size, 3);
  return {
    selected, sources,
    manifest: { scope: CONSTRUCTION_FIND_CASE.scope, areaKind: "new_reference_nearby_test_area_not_original_aoi", bounds: [...bounds],
      role: CONSTRUCTION_FIND_CASE.role, scenario: CONSTRUCTION_FIND_CASE.scenario, group: CONSTRUCTION_FIND_CASE.group,
      question: CONSTRUCTION_FIND_CASE.question, depth: "standard", candidates: sources.map((source, i) => ({ ...source,
        geometrySha256: createHash("sha256").update(JSON.stringify(selected[i].geometry ?? null)).digest("hex") })) }
  };
}
export function validateConstructionAnalysisRequest(body: unknown, occurrence: number, sources: readonly Sprint10GoalDepthSource[] | null) {
  assert.ok(record(body));
  assert.equal(body.role, CONSTRUCTION_FIND_CASE.role); assert.equal(body.scenario, CONSTRUCTION_FIND_CASE.scenario);
  // Reuse the existing strict exact-source, Standard/custom/question/body guard.
  validateSprint10FindAnalysisRequest({ ...body, role: "consultant_broker", scenario: "b2b_hotel_development" }, occurrence, sources);
}
