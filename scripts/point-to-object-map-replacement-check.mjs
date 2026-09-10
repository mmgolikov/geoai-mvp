import assert from "node:assert/strict";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { readFileSync } from "node:fs";
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
  buildPointObjectNativeSelectionOutside,
  buildPointObjectReplacementBoundaryAoi,
  pointObjectReplacementBoundaryToleranceM,
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
  return featureFilter(filter, "layers.replacement.filter").filter({ zoom }, feature, tile);
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
            buildPointObjectReplacementBoundaryAoi(aoi).coordinates[0]
          ]]
        }
      ],
      0
    ]
  ]
]);
assert.equal(JSON.stringify(originalFilter), originalBytes, "Building replacement must not mutate the source filter.");
assert.equal(createExpression(plan.filter, "layers.replacement.filter").result, "success", "The composed filter must compile in the installed MapLibre.");
assert.equal(featureFilter(plan.filter, "layers.replacement.filter").needGeometry, true, "The compiled replacement must request feature geometry.");

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
assert.equal(pointObjectReplacementBoundaryToleranceM, 0.001, "The numerical boundary offset is one millimetre, not a site buffer");
function nativeRoundTrip(geometry, canonical) {
  const convertRing = ring => ring.map(position => {
    const point = tilePoint(position, canonical);
    const x = (canonical.x + point.x / TILE_EXTENT) / 2 ** canonical.z;
    const y = (canonical.y + point.y / TILE_EXTENT) / 2 ** canonical.z;
    return [x * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI];
  });
  return { type: "Polygon", coordinates: geometry.coordinates.map(convertRing) };
}
for (const sourceZoom of [13, 14, 18, 22]) {
  const canonical = canonicalForPosition(aoi.coordinates[0][0], sourceZoom);
  const nativeAoi = nativeRoundTrip(aoi, canonical);
  const nativePlan = buildPointObjectBuildingReplacementFilter(null, nativeAoi);
  assert.equal(mapLibreKeeps(nativePlan.filter, nativeAoi, { zoom: Math.max(18, sourceZoom), canonical }), false, `Exact native footprint must be hidden, source z${sourceZoom} including overscale`);
  const numericalAoi = buildPointObjectReplacementBoundaryAoi(nativeAoi);
  for (const [index, position] of nativeAoi.coordinates[0].entries()) {
    const dx = (position[0] - numericalAoi.coordinates[0][index][0]) * 111_320 * Math.cos(position[1] * Math.PI / 180);
    const dy = (position[1] - numericalAoi.coordinates[0][index][1]) * 110_574;
    assert(Math.hypot(dx, dy) <= 0.002001, "Numerical corner displacement must never exceed 2 mm");
  }
  if (sourceZoom === 22) for (const outsideM of [0.01, 0.1, 10]) {
    const eastShift = outsideM / (111_320 * Math.cos(nativeAoi.coordinates[0][0][1] * Math.PI / 180));
    const crossing = structuredClone(nativeAoi);
    for (const index of [1, 2]) crossing.coordinates[0][index][0] += eastShift;
    assert.equal(mapLibreKeeps(nativePlan.filter, crossing, { zoom: 22, canonical }), true, `${outsideM} m observed outside geometry must remain`);
  }
}
const difc = JSON.parse(readFileSync("tests/fixtures/difc-native-building-sept10.json", "utf8")).selection.object.geometry;
const difcPlan = buildPointObjectBuildingReplacementFilter(null, difc);
assert.equal(difcPlan.applied, true);
for (const sourceZoom of [14, 18]) assert.equal(mapLibreKeeps(difcPlan.filter, difc, { zoom: 19, canonical: canonicalForPosition(difc.coordinates[0][0], sourceZoom) }), false, "Genuine native DIFC L-shape must be hidden by its exact footprint");
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
assert.equal(createExpression(featurePlan.filter, "layers.replacement.filter").result, "success");

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

// Exercise the native highlight predicate with the same real style evaluator.
// A reused ID outside the selected geometry must not be recolored.
const mapSource = readFileSync("components/point-to-object/live-object-map.tsx", "utf8");
const currentNativeFunction = mapSource.slice(mapSource.indexOf("function currentNativeSelectionGeometry("), mapSource.indexOf("function setSelectedVolumeVisibility("));
const collectNative = new Function("selectionCanShowVolume", "safeFeatureId", "featureName", "safeNumericProperty", "sanitizeGeometry", `${stripTypeScriptTypes(currentNativeFunction)}; return currentNativeSelectionGeometry;`)(
  () => true, feature => String(feature.id), feature => feature.properties.name,
  (properties, keys) => keys.map(key => properties[key]).find(value => typeof value === "number") ?? null,
  geometry => geometry
);
const sourceFragment = rectangle(55.27, 25.205, 55.272, 25.207);
const overlappingFragment = rectangle(55.2719, 25.205, 55.274, 25.207);
const touchingFragment = rectangle(55.274, 25.205, 55.275, 25.207);
const mixedFragment = multiPolygon(rectangle(55.271, 25.2055, 55.2715, 25.206), rectangle(55.28, 25.205, 55.281, 25.206));
const nativeSelection = { longitude: 55.2705, latitude: 25.206, object: { name: "Same metadata", sourceFeatureId: "901", geometry: sourceFragment, renderHeightM: 42, renderMinHeightM: 4 } };
const collected = collectNative({ querySourceFeatures: () => [sourceFragment, overlappingFragment, touchingFragment, mixedFragment].map(geometry => ({ id: 901, properties: { name: "Same metadata", render_height: 42, render_min_height: 4 }, geometry })) }, nativeSelection);
assert.deepEqual(collected, [sourceFragment, overlappingFragment], "Only connected positive-interior tile fragments may join; touching and mixed outside components stay excluded even with identical metadata");
assert.equal(nativeSelection.object.geometry, sourceFragment, "Native render matching must not mutate canonical selection geometry");
const seamSelection = { ...nativeSelection, longitude: 55.27195 };
const seamCollected = collectNative({ querySourceFeatures: () => [sourceFragment, overlappingFragment, touchingFragment, mixedFragment].map(geometry => ({ id: 901, properties: { name: "Same metadata", render_height: 42, render_min_height: 4 }, geometry })) }, seamSelection);
assert.deepEqual(seamCollected, [sourceFragment, overlappingFragment], "An anchor in overlapping tile buffers must seed both legitimate fragments without admitting mixed outside components");
const courtyardNative = { type: "Polygon", coordinates: [sourceFragment.coordinates[0], rectangle(55.2708, 25.2055, 55.2715, 25.2065).coordinates[0]] };
const holeTouchingNative = rectangle(55.2708, 25.2055, 55.2711, 25.206);
const courtyardCollected = collectNative({ querySourceFeatures: () => [courtyardNative, holeTouchingNative].map(geometry => ({ id: 901, properties: { name: "Same metadata", render_height: 42, render_min_height: 4 }, geometry })) }, { ...nativeSelection, object: { ...nativeSelection.object, geometry: courtyardNative } });
assert.deepEqual(courtyardCollected, [courtyardNative], "A reused-ID building touching the inner courtyard boundary must not connect through a hole");
const highlightFunctions = mapSource.slice(mapSource.indexOf("function selectionCanShowVolume("), mapSource.indexOf("function setHighlight("));
let nativeColor;
const fakeMap = { getLayer: () => true, setFilter: () => {}, setLayoutProperty: () => {}, setPaintProperty: (_layer, _property, value) => { nativeColor = value; } };
// The helper depends only on this native layer identifier, not React or a DOM.
const applyNativeHighlight = new Function("BUILDINGS_3D_LAYER_ID", "HIGHLIGHT_NATIVE_FILL_LAYER_ID", "buildPointObjectNativeSelectionOutside", `${stripTypeScriptTypes(highlightFunctions)}; return setSelectedVolumeVisibility;`)("geoai-buildings-3d", "geoai-live-native-selection-fill", buildPointObjectNativeSelectionOutside);
const highlighted = { object: { sourceFeatureId: "901", geometry: plan.aoi, renderHeightM: 42, renderMinHeightM: 4 } };
applyNativeHighlight(fakeMap, highlighted, "3d", true);
assert.equal(nativeColor[0], "case");
assert.equal(mapLibreKeeps(nativeColor[1], insideBuilding, { id: 901 }), true, "Native selected feature must receive highlight color");
assert.equal(mapLibreKeeps(nativeColor[1], outsideLandmark, { id: 901 }), false, "A distant reused ID must not receive highlight color");
assert.equal(mapLibreKeeps(nativeColor[1], insideBuilding, { id: 902 }), false, "A different feature must not receive highlight color");
assert.equal(mapLibreKeeps(nativeColor[1], rectangle(55.273, 25.205, 55.274, 25.206), { id: 901 }), false, "An edge-touching reused ID must remain native");
assert.equal(mapLibreKeeps(nativeColor[1], rectangle(55.273, 25.208, 55.274, 25.209), { id: 901 }), false, "A vertex-touching reused ID must remain native");
assert.equal(mapLibreKeeps(nativeColor[1], multiPolygon(insideBuilding, outsideLandmark), { id: 901 }), false, "A mixed multipart feature sharing the selected component must remain native whole");
const selectedMultipart = multiPolygon(...[insideBuilding, outsideLandmark].map(polygon => nativeRoundTrip(polygon, canonicalForPosition(firstGeometryPosition(polygon), 14))));
const clippedCourtyard = { type: "Polygon", coordinates: [
  [[55.28279995545745,25.21370005073568],[55.28279995545745,25.214399989082438],[55.28321385383606,25.214399989082438],[55.28321385383606,25.21370005073568],[55.28279995545745,25.21370005073568]],
  [[55.28299994766712,25.213899946864956],[55.28321385383606,25.213899946864956],[55.28321385383606,25.21419994210889],[55.28299994766712,25.21419994210889],[55.28299994766712,25.213899946864956]]
] };
assert.equal(validatePointObjectReplacementAoi(clippedCourtyard).valid, false, "Create input validation must remain strict on boundary-touching holes");
assert(buildPointObjectNativeSelectionOutside(clippedCourtyard), "Native clipped courtyard may separate coincident tile edges within the bounded tolerance");
applyNativeHighlight(fakeMap, { object: { ...highlighted.object, geometry: selectedMultipart } }, "3d", true);
assert.equal(mapLibreKeeps(nativeColor[1], selectedMultipart, { id: 901 }), true, "Selected multipart components must all retain native highlighting");
assert.equal(mapLibreKeeps(nativeColor[1], { type: "Polygon", coordinates: selectedMultipart.coordinates[0] }, { id: 901 }), true, "A native tile fragment contained in one selected component may be highlighted");
applyNativeHighlight(fakeMap, highlighted, "3d", false);
assert.equal(nativeColor, "#d6dcdf", "Volume toggle must restore native source color");
applyNativeHighlight(fakeMap, highlighted, "2d", true);
assert.equal(nativeColor, "#d6dcdf", "2D must not color a hidden native extrusion");
applyNativeHighlight(fakeMap, { object: { ...highlighted.object, sourceFeatureId: null } }, "3d", true);
assert.equal(nativeColor, "#d6dcdf", "Missing source identity must not invent a duplicate prism");
assert(!mapSource.includes('const HIGHLIGHT_VOLUME_LAYER_ID'), "Selection must not create a second coplanar extrusion layer");
console.log("Point-to-object MapLibre building-replacement/native-highlight contract passed.");
