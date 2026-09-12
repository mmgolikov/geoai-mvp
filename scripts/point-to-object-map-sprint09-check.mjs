import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { featureFilter } from "@maplibre/maplibre-gl-style-spec";

registerHooks({ resolve(specifier, context, next) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return next(`${specifier}.ts`, context); } catch { /* canonical error below */ }
  }
  return next(specifier, context);
} });

const {
  planPointObjectCompleteFootprints,
  pointObjectCompleteFootprintOverlap,
  pointObjectCompleteFootprintOverlapThreshold,
  pointObjectCompleteFootprintMaxSourceFeatures
} = await import("../src/lib/prototype/point-to-object-map-partition.ts");
const { buildPointObjectKnownFootprintFilter } = await import("../src/lib/prototype/point-to-object-map-replacement.ts");

const rectangle = (west, south, east, north) => ({
  type: "Polygon",
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]]
});
const aoi = rectangle(0, 0, 10, 10);

function tileFeature(id, geometry, { clipped = false, properties = {} } = {}) {
  const rings = (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates).flat();
  return {
    type: "Feature",
    id,
    properties: { building: "yes", ...properties },
    geometry,
    tile: { z: 14, x: 1, y: 1 },
    _vectorTileFeature: {
      extent: 4096,
      loadGeometry: () => rings.map((ring, ringIndex) => ring.map((_position, positionIndex) => ({
        x: clipped && ringIndex === 0 && positionIndex < 2 ? 0 : 200 + positionIndex * 20,
        y: 300 + ringIndex * 50 + positionIndex * 20
      })))
    }
  };
}

const ratios = [
  [rectangle(-5.1, 1, 4.9, 2), 0.49],
  [rectangle(-5, 1, 5, 2), 0.5],
  [rectangle(-4.9, 1, 5.1, 2), 0.51]
];
for (const [geometry, expected] of ratios) {
  const overlap = pointObjectCompleteFootprintOverlap(geometry, aoi);
  assert(overlap);
  assert(Math.abs(overlap.fraction - expected) < 1e-8, `${expected * 100}% overlap must be measured, got ${overlap.fraction}`);
}
assert.equal(pointObjectCompleteFootprintOverlapThreshold, 0.5);

const thresholdPlan = planPointObjectCompleteFootprints(ratios.map(([geometry], index) => tileFeature(index + 1, geometry)), aoi);
assert.equal(thresholdPlan.coverage, "complete");
assert.equal(thresholdPlan.completeParents, 3);
assert.equal(thresholdPlan.hiddenParents, 3, "The visual policy hides every positive intersection consistently");

const touchPlan = planPointObjectCompleteFootprints([tileFeature(10, rectangle(10, 1, 11, 2))], aoi);
assert.equal(touchPlan.coverage, "complete");
assert.equal(touchPlan.hiddenParents, 0, "Mere AOI boundary touch remains visible");

const courtyard = {
  type: "Polygon",
  coordinates: [
    rectangle(0, 0, 10, 10).coordinates[0],
    rectangle(2, 2, 8, 8).coordinates[0]
  ]
};
const courtyardOverlap = pointObjectCompleteFootprintOverlap(courtyard, rectangle(0, 0, 5, 10));
assert(courtyardOverlap);
assert(Math.abs(courtyardOverlap.fraction - 0.5) < 1e-8, "Courtyard holes contribute no building area");

const multipart = {
  type: "MultiPolygon",
  coordinates: [rectangle(1, 1, 2, 2).coordinates, rectangle(11, 1, 12, 2).coordinates]
};
const multipartPlan = planPointObjectCompleteFootprints([tileFeature(11, multipart)], aoi);
assert.equal(multipartPlan.hiddenParents, 1, "A multipart aggregate with a positive-overlap member is safely replaced");
assert.deepEqual(multipartPlan.retained.features[0].geometry.coordinates, [rectangle(11, 1, 12, 2).coordinates], "The non-overlap sibling remains visible");

const memberOrder = [
  rectangle(1, 1, 2, 2).coordinates,
  rectangle(11, 1, 12, 2).coordinates,
  rectangle(3, 3, 4, 4).coordinates
];
const memberOrderForward = planPointObjectCompleteFootprints([
  tileFeature(12, { type: "MultiPolygon", coordinates: memberOrder }, { properties: { name: "member-order" } })
], aoi);
const memberOrderReverse = planPointObjectCompleteFootprints([
  tileFeature(12, { type: "MultiPolygon", coordinates: [...memberOrder].reverse() }, { properties: { name: "member-order" } })
], aoi);
assert.deepEqual(
  { predicates: memberOrderReverse.predicates, retained: memberOrderReverse.retained },
  { predicates: memberOrderForward.predicates, retained: memberOrderForward.retained },
  "Reordered Polygon members cannot change a stable aggregate renderer signature"
);

const duplicate = tileFeature(20, rectangle(1, 1, 2, 2), { properties: { name: "dedup" } });
const duplicatePlan = planPointObjectCompleteFootprints([
  duplicate,
  tileFeature(20, rectangle(1, 1, 2, 2), { properties: { name: "dedup" } })
], aoi);
assert.deepEqual(
  { coverage: duplicatePlan.coverage, complete: duplicatePlan.completeParents, hidden: duplicatePlan.hiddenParents, unknown: duplicatePlan.unknownFeatures },
  { coverage: "complete", complete: 1, hidden: 1, unknown: 0 },
  "Buffered copies of one complete source parent are deduplicated"
);

const coveredClip = tileFeature(20, rectangle(1, 1, 2, 2), { clipped: true, properties: { name: "dedup" } });
const seamCoveredPlan = planPointObjectCompleteFootprints([duplicate, coveredClip], aoi);
assert.equal(seamCoveredPlan.coverage, "complete", "A clipped duplicate is safe only when a core tile supplies its complete parent");
assert.equal(seamCoveredPlan.hiddenParents, 1);

const clippedOnlyPlan = planPointObjectCompleteFootprints([
  tileFeature(21, rectangle(1, 1, 2, 2), { clipped: true, properties: { name: "seam-only" } })
], aoi);
assert.equal(clippedOnlyPlan.coverage, "partial");
assert.equal(clippedOnlyPlan.hiddenParents, 1, "A clipped fragment may prove positive intersection for a stable parent");
assert.equal(clippedOnlyPlan.tileMatchedParents, 1);
assert.match(clippedOnlyPlan.reason, /not_complete_inventory/, "A tile-backed visual match never claims complete inventory");

const anonymousClippedPlan = planPointObjectCompleteFootprints([
  tileFeature(undefined, rectangle(1, 1, 2, 2), { clipped: true, properties: { name: "anonymous seam" } })
], aoi);
assert.equal(anonymousClippedPlan.coverage, "partial");
assert.equal(anonymousClippedPlan.hiddenParents, 0, "A clipped fragment without stable parent identity remains native");

const dense = [];
for (let column = 0; column < 25; column += 1) for (let row = 0; row < 11; row += 1) {
  const west = 0.2 + column * 0.35;
  const south = 0.2 + row * 0.7;
  dense.push(tileFeature(1_000 + dense.length, rectangle(west, south, west + 0.18, south + 0.3), {
    properties: { name: `dense-${dense.length}` }
  }));
}
const densePlan = planPointObjectCompleteFootprints(dense, aoi);
const denseReversedPlan = planPointObjectCompleteFootprints([...dense].reverse(), aoi);
assert.equal(dense.length, 275);
assert.deepEqual(
  { coverage: densePlan.coverage, complete: densePlan.completeParents, hidden: densePlan.hiddenParents, unknown: densePlan.unknownFeatures },
  { coverage: "complete", complete: 275, hidden: 275, unknown: 0 },
  "The founder-equivalent 275-building AOI must not inherit the old 32-feature preparation cap"
);
assert.deepEqual(
  { predicates: denseReversedPlan.predicates, retained: denseReversedPlan.retained },
  { predicates: densePlan.predicates, retained: densePlan.retained },
  "An unchanged tile inventory must produce a stable renderer signature regardless of query order"
);
const unicodeOrder = [
  tileFeature(40_001, rectangle(1, 1, 2, 2), { properties: { name: "\u00e9" } }),
  tileFeature(40_002, rectangle(3, 1, 4, 2), { properties: { name: "e\u0301" } })
];
const unicodeForwardPlan = planPointObjectCompleteFootprints(unicodeOrder, aoi);
const unicodeReversePlan = planPointObjectCompleteFootprints([...unicodeOrder].reverse(), aoi);
assert.deepEqual(
  { predicates: unicodeReversePlan.predicates, retained: unicodeReversePlan.retained },
  { predicates: unicodeForwardPlan.predicates, retained: unicodeForwardPlan.retained },
  "Canonical-equivalent Unicode labels cannot make source-query order change the renderer signature"
);

const longRing = Array.from({ length: 1_000 }, (_, index) => {
  const angle = index / 1_000 * Math.PI * 2;
  return [5 + Math.cos(angle), 5 + Math.sin(angle)];
});
longRing.push(longRing[0]);
const detailedFeature = tileFeature(30_000, { type: "Polygon", coordinates: [longRing] });
planPointObjectCompleteFootprints([detailedFeature], aoi); // JIT warm-up; not part of the guard.
const detailedRuns = Array.from({ length: 3 }, () => {
  const started = performance.now();
  const plan = planPointObjectCompleteFootprints([detailedFeature], aoi);
  return { plan, elapsedMs: performance.now() - started };
});
const detailedPlan = detailedRuns[0].plan;
const detailedElapsedMs = detailedRuns.map(({ elapsedMs }) => elapsedMs).sort((left, right) => left - right)[1];
assert.equal(detailedPlan.hiddenParents, 1);
assert(detailedElapsedMs < 250, `A 1,000-vertex source ring must remain UI-bounded; measured ${detailedElapsedMs.toFixed(1)} ms`);

const unmeasurableRing = Array.from({ length: 4_000 }, (_, index) => {
  const angle = index / 4_000 * Math.PI * 2;
  return [5 + Math.cos(angle), 5 + Math.sin(angle)];
});
unmeasurableRing.push(unmeasurableRing[0]);
const unmeasurablePlan = planPointObjectCompleteFootprints([
  tileFeature(30_001, { type: "Polygon", coordinates: [unmeasurableRing] })
], aoi);
assert.equal(unmeasurablePlan.coverage, "partial");
assert.equal(unmeasurablePlan.hiddenParents, 0, "Geometry outside the exact overlap budget cannot be hidden by a heuristic anchor");
assert.equal(unmeasurablePlan.predicates.length, 0);
assert(unmeasurablePlan.unknownFeatures >= 1);
const invalidBowTiePlan = planPointObjectCompleteFootprints([
  tileFeature(30_002, { type: "Polygon", coordinates: [[[1, 1], [3, 3], [1, 3], [3, 1], [1, 1]]] })
], aoi);
assert.equal(invalidBowTiePlan.coverage, "partial");
assert.equal(invalidBowTiePlan.hiddenParents, 0, "An invalid self-crossing ring cannot be promoted by its apparent interior anchor");
assert.equal(invalidBowTiePlan.predicates.length, 0);

const giantAggregatePositive = [
  rectangle(1, 1, 2, 2).coordinates,
  rectangle(-5.1, 3, 4.9, 4).coordinates,
  rectangle(8, 8, 11, 9).coordinates
];
const giantAggregateTouch = rectangle(10, 5, 11, 6).coordinates;
const giantAggregateOutside = Array.from({ length: 1_597 }, (_, index) => {
  const west = 20 + index * 0.01;
  return rectangle(west, 1, west + 0.005, 1.005).coordinates;
});
const giantAggregateMembers = [...giantAggregatePositive, giantAggregateTouch, ...giantAggregateOutside];
const giantAggregateGeometry = { type: "MultiPolygon", coordinates: giantAggregateMembers };
const giantAggregateBytes = JSON.stringify(giantAggregateGeometry);
const giantAggregatePlan = planPointObjectCompleteFootprints([
  tileFeature(50_000, giantAggregateGeometry)
], aoi);
assert.equal(giantAggregateMembers.length, 1_601);
assert.equal(giantAggregateMembers.reduce((sum, polygon) => sum + polygon[0].length, 0), 8_005);
assert.equal(giantAggregatePlan.coverage, "partial", "A tile aggregate remains partial when its vector geometry touches the tile edge");
assert.equal(giantAggregatePlan.hiddenParents, 1, "Aggregate size is not confused with physical-building count");
assert.equal(giantAggregatePlan.predicates.length, 1, "One bounded predicate masks the native aggregate");
const giantRetainedMembers = giantAggregatePlan.retained.features.flatMap((feature) => feature.geometry.coordinates);
assert.equal(giantAggregatePlan.retained.features.length, 4, "Retained payload is chunked below the renderer member cap");
assert.equal(giantRetainedMembers.length, 1_598);
assert.deepEqual(
  giantRetainedMembers,
  [giantAggregateTouch, ...giantAggregateOutside],
  "Every touch-only/outside sibling is retained byte-for-byte"
);
assert.equal(JSON.stringify(giantAggregateGeometry), giantAggregateBytes, "Planning cannot mutate the source aggregate");

const invalidAggregatePlan = planPointObjectCompleteFootprints([
  tileFeature(50_001, {
    type: "MultiPolygon",
    coordinates: [
      rectangle(1, 1, 2, 2).coordinates,
      rectangle(30, 1, 31, 2).coordinates,
      [[[20, 1], [22, 3], [20, 3], [22, 1], [20, 1]]]
    ]
  })
], aoi);
assert.equal(invalidAggregatePlan.coverage, "partial");
assert.equal(invalidAggregatePlan.hiddenParents, 0, "One unmeasurable member keeps the entire native aggregate fail-closed");
assert.equal(invalidAggregatePlan.predicates.length, 0);
assert.equal(invalidAggregatePlan.retained.features.length, 0, "No partial retained copy may accompany an unmasked aggregate");

const dubaiShapedMembers = [
  ...Array.from({ length: 54 }, (_, index) => {
    const west = 0.1 + index % 9 * 0.9;
    const south = 0.1 + Math.floor(index / 9) * 0.9;
    return rectangle(west, south, west + 0.2, south + 0.2).coordinates;
  }),
  ...Array.from({ length: 3_199 }, (_, index) => {
    const west = 20 + index * 0.001;
    return rectangle(west, 2, west + 0.0005, 2.0005).coordinates;
  })
];
const dubaiShapedStart = performance.now();
const dubaiShapedPlan = planPointObjectCompleteFootprints([
  tileFeature(57_466_230, { type: "MultiPolygon", coordinates: dubaiShapedMembers })
], aoi);
const dubaiShapedElapsedMs = performance.now() - dubaiShapedStart;
assert.equal(dubaiShapedMembers.length, 3_253);
assert.equal(dubaiShapedPlan.hiddenParents, 1);
assert.equal(dubaiShapedPlan.predicates.length, 1);
assert.equal(dubaiShapedPlan.retained.features.flatMap((feature) => feature.geometry.coordinates).length, 3_199);
assert(dubaiShapedElapsedMs < 500, `A live-shaped 3,253-member aggregate must remain UI-bounded; measured ${dubaiShapedElapsedMs.toFixed(1)} ms`);

const smallAoi = rectangle(55.27, 25.205, 55.271, 25.206);
const smallHalf = rectangle(55.2698, 25.2052, 55.2704, 25.2056);
const smallPlan = planPointObjectCompleteFootprints([tileFeature(2, smallHalf)], smallAoi);
const composed = buildPointObjectKnownFootprintFilter(null, smallPlan.predicates);
assert(composed.applied);
const compiled = featureFilter(composed.filter, "layers.sprint09.complete-footprints");
assert.equal(compiled.needGeometry, true, "A small geometry anchor scopes the exact aggregated tile feature");
assert.match(JSON.stringify(composed.filter), /building/, "Primitive properties guard against reused-ID collisions");

const overLimitPlan = planPointObjectCompleteFootprints(
  Array.from({ length: pointObjectCompleteFootprintMaxSourceFeatures + 1 }, (_, index) => tileFeature(20_000 + index, rectangle(1, 1, 2, 2))),
  aoi
);
assert.equal(overLimitPlan.coverage, "partial");
assert.equal(overLimitPlan.predicates.length, 0, "A source cap fails closed instead of claiming complete coverage");

console.log(`Sprint09 building-replacement contract passed: measured 49/50/51 analytics, positive visual overlap, boundary touch, holes, multipart, stable seam parents, dedup, 275 parents, ${detailedElapsedMs.toFixed(1)} ms/1,000-vertex and ${dubaiShapedElapsedMs.toFixed(1)} ms/3,253-member guards with fail-closed caps.`);
