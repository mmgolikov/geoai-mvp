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
  pointObjectReplacementMinimumReliableZoom,
  restorePointObjectMapFilter,
  snapshotPointObjectMapFilter,
  validatePointObjectReplacementAoi
} = await import("../src/lib/prototype/point-to-object-map-replacement");

const TILE_EXTENT = 8_192;

function webMercatorPosition([longitude, latitude]) {
  return [
    (180 + longitude) / 360,
    (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360))) / 360
  ];
}

function firstGeometryPosition(geometry) {
  return geometry.type === "Polygon"
    ? geometry.coordinates[0][0]
    : geometry.coordinates[0][0][0];
}

function canonicalForPosition(position, zoom) {
  const [x, y] = webMercatorPosition(position);
  const scale = 2 ** zoom;
  return { z: zoom, x: Math.floor(x * scale), y: Math.floor(y * scale) };
}

function tilePoint(position, canonical) {
  const [x, y] = webMercatorPosition(position);
  const scale = 2 ** canonical.z;
  return {
    x: Math.round(x * scale * TILE_EXTENT) - canonical.x * TILE_EXTENT,
    y: Math.round(y * scale * TILE_EXTENT) - canonical.y * TILE_EXTENT
  };
}

function vectorTilePolygonFeature(geometry, canonical, { id, properties = {} } = {}) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const feature = {
    type: 3,
    properties,
    geometry: polygons.flatMap((polygon) =>
      polygon.map((ring) => ring.map((position) => tilePoint(position, canonical)))
    )
  };
  if (id !== undefined) feature.id = id;
  return feature;
}

function mapLibreKeeps(filter, geometry, { zoom = 14, id, properties = {}, canonical } = {}) {
  const tile = canonical ?? canonicalForPosition(firstGeometryPosition(geometry), zoom);
  const feature = vectorTilePolygonFeature(geometry, tile, { id, properties });
  return featureFilter(filter).filter({ zoom }, feature, tile);
}

function rectangle(west, south, east, north) {
  return {
    type: "Polygon",
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]]
  };
}

function multiPolygon(...polygons) {
  return { type: "MultiPolygon", coordinates: polygons.map((polygon) => polygon.coordinates) };
}

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
    ["<", ["zoom"], 13],
    ["!=", ["geometry-type"], "Polygon"],
    [">", ["distance", aoi], 0],
    [
      "==",
      [
        "distance",
        {
          type: "MultiPolygon",
          coordinates: [[
            [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
            aoi.coordinates[0]
          ]]
        }
      ],
      0
    ]
  ]
]);
assert.equal(JSON.stringify(originalFilter), originalBytes, "Building replacement must not mutate the source filter.");
assert.equal(createExpression(plan.filter).result, "success", "The composed filter must compile in MapLibre 5.11.");
assert.equal(featureFilter(plan.filter).needGeometry, true, "The compiled replacement must request feature geometry.");

const insideBuilding = rectangle(55.2705, 25.2055, 55.2710, 25.2060);
const outsideLandmark = rectangle(55.2780, 25.2055, 55.2785, 25.2060);
const boundaryBuilding = rectangle(55.2695, 25.2055, 55.2705, 25.2060);
const multipartBuilding = multiPolygon(insideBuilding, outsideLandmark);
const spatialPlan = buildPointObjectBuildingReplacementFilter(null, aoi);
const legacyMinimumDistanceFilter = [
  "any",
  ["!=", ["geometry-type"], "Polygon"],
  [">", ["distance", aoi], 0]
];

assert.equal(
  mapLibreKeeps(legacyMinimumDistanceFilter, multipartBuilding, { id: "shared-building" }),
  false,
  "Regression proof: minimum-distance filtering removes a whole multipart feature when one component touches the AOI."
);
assert.equal(mapLibreKeeps(spatialPlan.filter, insideBuilding), false, "A fully internal building may be hidden.");
assert.equal(mapLibreKeeps(spatialPlan.filter, outsideLandmark), true, "An outside landmark must remain visible.");
assert.equal(
  mapLibreKeeps(spatialPlan.filter, multipartBuilding, { id: "shared-building" }),
  true,
  "A multipart feature with an outside component must be retained whole."
);
assert.equal(
  mapLibreKeeps(spatialPlan.filter, boundaryBuilding),
  true,
  "A boundary-crossing component must be conservatively retained."
);

for (const id of ["duplicate-id", undefined]) {
  assert.equal(mapLibreKeeps(spatialPlan.filter, insideBuilding, { id }), false);
  assert.equal(
    mapLibreKeeps(spatialPlan.filter, outsideLandmark, { id }),
    true,
    `Spatial replacement must not conflate ${id === undefined ? "missing" : "duplicate"} feature IDs.`
  );
}

assert.equal(pointObjectReplacementMinimumReliableZoom, 13);
assert.equal(
  mapLibreKeeps(spatialPlan.filter, insideBuilding, { zoom: 12 }),
  true,
  "Below MapLibre's reliable distance zoom, source buildings must fail open visually."
);
assert.equal(mapLibreKeeps(spatialPlan.filter, insideBuilding, { zoom: 13 }), false);
assert.equal(mapLibreKeeps(spatialPlan.filter, insideBuilding, { zoom: 16 }), false);

const tileScale = 2 ** 14;
const dubaiTileX = Math.floor(((55.27 + 180) / 360) * tileScale);
const adjacentTileBoundary = ((dubaiTileX + 1) / tileScale) * 360 - 180;
const tileBoundaryAoi = rectangle(
  adjacentTileBoundary - 0.0008,
  25.205,
  adjacentTileBoundary - 0.0001,
  25.206
);
const westTileBuilding = rectangle(
  adjacentTileBoundary - 0.0006,
  25.2052,
  adjacentTileBoundary - 0.0003,
  25.2056
);
const eastTileLandmark = rectangle(
  adjacentTileBoundary + 0.0002,
  25.2052,
  adjacentTileBoundary + 0.0005,
  25.2056
);
const tileBoundaryPlan = buildPointObjectBuildingReplacementFilter(null, tileBoundaryAoi);
assert.equal(mapLibreKeeps(tileBoundaryPlan.filter, westTileBuilding, { id: 77 }), false);
assert.equal(
  mapLibreKeeps(tileBoundaryPlan.filter, eastTileLandmark, { id: 77 }),
  true,
  "A same-ID feature in the adjacent tile must remain visible."
);

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

for (let cycle = 0; cycle < 5; cycle += 1) {
  const replacement = buildPointObjectBuildingReplacementFilter(snapshot.filter, plan.aoi);
  assert.equal(replacement.applied, true);
  assert.notDeepEqual(replacement.filter, snapshot.filter);
  assert.deepEqual(
    restorePointObjectMapFilter(snapshot),
    ["has", "height"],
    `Restore cycle ${cycle + 1} must reproduce the exact baseline filter.`
  );
}

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

const concaveAoiWithHole = {
  type: "Polygon",
  coordinates: [
    [[55.270, 25.205], [55.276, 25.205], [55.276, 25.211], [55.273, 25.211], [55.273, 25.208], [55.270, 25.208], [55.270, 25.205]],
    [[55.271, 25.206], [55.272, 25.206], [55.272, 25.207], [55.271, 25.207], [55.271, 25.206]]
  ]
};
const complexPlan = buildPointObjectBuildingReplacementFilter(null, concaveAoiWithHole);
assert.equal(mapLibreKeeps(complexPlan.filter, rectangle(55.2702, 25.2052, 55.2707, 25.2057)), false);
assert.equal(
  mapLibreKeeps(complexPlan.filter, rectangle(55.2712, 25.2062, 55.2717, 25.2067)),
  true,
  "A building in an AOI hole must remain visible."
);
assert.equal(
  mapLibreKeeps(complexPlan.filter, rectangle(55.2705, 25.2090, 55.2710, 25.2095)),
  true,
  "A building in a concavity void must remain visible."
);
assert.equal(mapLibreKeeps(complexPlan.filter, rectangle(55.2740, 25.2090, 55.2745, 25.2095)), false);

const secondAoi = rectangle(55.2775, 25.2050, 55.2790, 25.2065);
const secondPlan = buildPointObjectBuildingReplacementFilter(null, secondAoi);
assert.equal(mapLibreKeeps(spatialPlan.filter, insideBuilding), false);
assert.equal(mapLibreKeeps(secondPlan.filter, insideBuilding), true);
assert.equal(mapLibreKeeps(spatialPlan.filter, outsideLandmark), true);
assert.equal(mapLibreKeeps(secondPlan.filter, outsideLandmark), false);

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
