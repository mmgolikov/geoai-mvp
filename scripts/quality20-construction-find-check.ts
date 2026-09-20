import assert from "node:assert/strict";
// @ts-expect-error Node strip-types requires explicit extensions.
import { CONSTRUCTION_FIND_CASE as C, acceptedConstructionFindRequest, assertConstructionViewport, freezeConstructionFindCohort, validateConstructionAnalysisRequest } from "../tests/e2e/helpers/sprint20-construction-find.ts";
// @ts-expect-error Node strip-types requires explicit extensions.
import { SPRINT10_LIVE_PAID_SCOPE_MATRIX, sprint10PaidPostDecision } from "../tests/e2e/helpers/sprint10-live-journey-gate.ts";

const bounds = [...C.targetBounds];
const request = { marketKey: "dubai", locale: "en", group: "construction", bounds, mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 };
assert.equal(acceptedConstructionFindRequest(request, bounds), true);
for (const patch of [{ group: "hospitality" }, { mappedMinimumLevels: 1 }, { locale: "ru" }, { limit: 3 }, { extra: true }, { bounds: [55.25, 25.19, 55.27, 25.21] }]) {
  assert.equal(acceptedConstructionFindRequest({ ...request, ...patch }, bounds), false);
}
assert.throws(() => assertConstructionViewport([55, 25, 56, 26]));
// Entirely synthetic candidates: these are not current source observations.
function candidate(n: number) {
  const x = 55.36 + n * 0.001, y = 25.206;
  return { sourceFeatureId: `way/${9000 + n}`, sourceElementType: "way", sourceElementId: String(9000 + n),
    longitude: x, latitude: y, group: "construction", observedTags: { building: "construction" }, evidenceClass: "observed_in_open_map_source",
    geometryStatus: "available", geometryProvenance: "confirmed_complete_footprint",
    geometry: { type: "Polygon", coordinates: [[[x, y], [x + 0.0002, y], [x + 0.0002, y + 0.0002], [x, y]]] } };
}
const candidates = [candidate(0), candidate(1), candidate(2), candidate(3)];
const frozen = freezeConstructionFindCohort(candidates, bounds);
assert.deepEqual(frozen.sources.map(s => s.sourceFeatureId), ["way/9000", "way/9001", "way/9002"]);
assert.equal(frozen.selected[0], candidates[0], "Preserve the original complete geometry, no reconstructed polygon");
assert.equal(frozen.manifest.candidates[0].geometrySha256.length, 64);
for (const patch of [{ sourceFeatureId: "way/9999" }, { observedTags: { building: "hotel" } }, { geometryProvenance: null }, { longitude: 55.1 },
  { geometry: { type: "Point", coordinates: [55.36, 25.206] } },
  { geometry: { type: "Polygon", coordinates: [[[55.36, 25.206], [55.361, 25.206]]] } }]) {
  assert.throws(() => freezeConstructionFindCohort([{ ...candidates[0], ...patch }, ...candidates.slice(1)], bounds));
}
assert.throws(() => freezeConstructionFindCohort(candidates.slice(0, 2), bounds));
assert.throws(() => freezeConstructionFindCohort([candidates[0], candidates[0], candidates[2]], bounds));
const pointOnly = { ...candidates[0], geometry: null, geometryStatus: "point_only", geometryProvenance: null };
assert.equal(freezeConstructionFindCohort([pointOnly, ...candidates.slice(1)], bounds).selected[0].geometry, null);
const body = { caseKey: "dubai", longitude: frozen.sources[0].longitude, latitude: frozen.sources[0].latitude, locale: "en",
  role: C.role, scenario: C.scenario, question: C.question, depth: "standard", goal: "custom", perspective: "developer",
  horizon: "one_to_three_years", expectedSourceFeatureId: frozen.sources[0].sourceFeatureId, consent: true, challenge: "offline-challenge" };
validateConstructionAnalysisRequest(body, 1, frozen.sources);
for (const patch of [{ role: "consultant_broker" }, { scenario: "b2b_hotel_development" }, { expectedSourceFeatureId: "way/99999" }, { depth: "deep" }, { question: "other" }]) {
  assert.throws(() => validateConstructionAnalysisRequest({ ...body, ...patch }, 1, frozen.sources));
}
assert.throws(() => validateConstructionAnalysisRequest(body, 4, frozen.sources));
assert.throws(() => validateConstructionAnalysisRequest(body, 1, null));
assert.deepEqual(SPRINT10_LIVE_PAID_SCOPE_MATRIX[C.scope], { ai: 3, create: 0 });
assert.equal(sprint10PaidPostDecision(C.scope, "ai", 4).ok, false);
assert.equal(sprint10PaidPostDecision(C.scope, "create", 1).ok, false);
console.log("quality20-construction-find-check: PASS (new bounded area, source cohort, complete geometry, exact intent and three-call gate; offline only)");
