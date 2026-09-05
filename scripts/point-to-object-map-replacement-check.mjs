import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createExpression, featureFilter } from "@maplibre/maplibre-gl-style-spec";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Let Node report the canonical resolution error below.
      }
    }
    return nextResolve(specifier, context);
  }
});

const {
  buildPointObjectBuildingReplacementFilter,
  clonePointObjectMapFilter,
  restorePointObjectMapFilter,
  snapshotPointObjectMapFilter,
  validatePointObjectReplacementAoi
} = await import("../src/lib/prototype/point-to-object-map-replacement");

const aoi = {
  type: "Polygon",
  coordinates: [[
    [55.2700, 25.2050],
    [55.2730, 25.2050],
    [55.2730, 25.2080],
    [55.2700, 25.2080],
    [55.2700, 25.2050]
  ]]
};
const originalFilter = ["==", "extrude", "true"];
const originalBytes = JSON.stringify(originalFilter);

const validation = validatePointObjectReplacementAoi(aoi);
assert.equal(validation.valid, true);
const plan = buildPointObjectBuildingReplacementFilter(originalFilter, aoi);
assert.equal(plan.applied, true);
assert.equal(plan.reason, null);
assert.deepEqual(plan.filter, [
  "all",
  ["==", ["get", "extrude"], "true"],
  [
    "any",
    ["!=", ["geometry-type"], "Polygon"],
    [">", ["distance", aoi], 0]
  ]
]);
assert.equal(JSON.stringify(originalFilter), originalBytes, "Building replacement must not mutate the source filter.");
assert.equal(createExpression(plan.filter).result, "success", "The composed filter must compile in MapLibre 5.11.");
assert.equal(featureFilter(plan.filter).needGeometry, true, "The compiled replacement must request feature geometry.");

aoi.coordinates[0][0][0] = 0;
originalFilter[2] = "changed";
assert.equal(plan.aoi.coordinates[0][0][0], 55.27, "The filter plan must own a deep AOI snapshot.");
assert.equal(plan.filter[1][2], "true", "The filter plan must own a deep source-filter snapshot.");

const snapshotSource = ["has", "height"];
const snapshot = snapshotPointObjectMapFilter(snapshotSource);
snapshotSource[1] = "changed";
assert.deepEqual(snapshot.filter, ["has", "height"]);
assert.equal(Object.isFrozen(snapshot), true);
assert.equal(Object.isFrozen(snapshot.filter), true);
const restored = restorePointObjectMapFilter(snapshot);
restored[1] = "restored mutation";
assert.deepEqual(snapshot.filter, ["has", "height"], "Restoring must return an independent mutable clone.");
assert.notEqual(clonePointObjectMapFilter(snapshot.filter), snapshot.filter);

const featurePlan = buildPointObjectBuildingReplacementFilter(null, {
  type: "Feature",
  properties: { untrusted: "ignored" },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [103.85, 1.28],
      [103.86, 1.28],
      [103.86, 1.29],
      [103.85, 1.29],
      [103.85, 1.28]
    ]]
  }
});
assert.equal(featurePlan.applied, true);
assert.deepEqual(featurePlan.filter[0], "any");
assert.equal(createExpression(featurePlan.filter).result, "success");

const polygonWithHole = {
  type: "Polygon",
  coordinates: [
    [[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]],
    [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]
  ]
};
assert.equal(validatePointObjectReplacementAoi(polygonWithHole).valid, true);
assert.equal(buildPointObjectBuildingReplacementFilter(null, polygonWithHole).applied, true);

for (const invalidAoi of [
  null,
  { type: "LineString", coordinates: [[0, 0], [1, 1]] },
  { type: "Polygon", coordinates: [] },
  { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] },
  { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0], [0, 0]]] },
  { type: "Polygon", coordinates: [[[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]] },
  { type: "Polygon", coordinates: [[[181, 0], [181, 1], [179, 1], [181, 0]]] },
  { type: "Polygon", coordinates: [[[0, 0], [1, 0], [2, 0], [0, 0]]] },
  {
    type: "Polygon",
    coordinates: [
      [[0, 0], [3, 0], [3, 3], [0, 3], [0, 0]],
      [[4, 4], [5, 4], [5, 5], [4, 5], [4, 4]]
    ]
  }
]) {
  const fallbackSource = ["has", "building"];
  const invalidPlan = buildPointObjectBuildingReplacementFilter(fallbackSource, invalidAoi);
  assert.equal(invalidPlan.applied, false);
  assert.deepEqual(invalidPlan.filter, fallbackSource, "Invalid AOI must return the original filter value.");
  assert.notEqual(invalidPlan.filter, fallbackSource, "Invalid AOI fallback must still be snapshot-safe.");
  assert.equal(invalidPlan.aoi, null);
  assert.equal(typeof invalidPlan.reason, "string");
}

console.log("Point-to-object MapLibre building-replacement filter contract passed.");
