import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { featureFilter } from "@maplibre/maplibre-gl-style-spec";
registerHooks({ resolve(specifier, context, next) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return next(`${specifier}.ts`, context); } catch { /* Report ordinary resolution below. */ }
  }
  return next(specifier, context);
} });
const { buildPointObjectBuildingReplacementFilter, buildPointObjectKnownFootprintFilter, pointObjectNativeBuilding3dFilter, validatePointObjectReplacementAoi, snapshotPointObjectMapFilter } = await import("../src/lib/prototype/point-to-object-map-replacement.ts");
const { findResultCoordinateBounds } = await import("../src/lib/prototype/point-to-object-find-viewport.ts");
const { partitionPointObjectMapBuilding, planPointObjectBuildingReplacement, pointObjectPreparedPartitionPredicate } = await import("../src/lib/prototype/point-to-object-map-partition.ts");
const { reconcilePointObjectPartitionRenderer, clearPointObjectPartitionRenderer } = await import("../src/lib/prototype/point-to-object-map-partition-renderer.ts");
const { pointObjectTilePolygonMemberAt } = await import("../src/lib/prototype/point-to-object-map-selection.ts");
const { createPointObjectMapResultOpenGuard, groupExactPointObjectProjectResults } = await import("../src/lib/prototype/point-to-object-map-project-groups.ts");

const rectangle = (w, s, e, n) => ({ type: "Polygon", coordinates: [[[w,s],[e,s],[e,n],[w,n],[w,s]]] });
const mercator = ([lng, lat]) => [(lng + 180) / 360, (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2];
function nativeGeometry(geometry) {
  const point = position => {
    const [x,y] = mercator(position).map(value => Math.round(value * 2 ** 18 * 8192) / (2 ** 18 * 8192));
    return [x * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI];
  };
  return geometry.type === "Polygon" ? { ...geometry, coordinates: geometry.coordinates.map(ring => ring.map(point)) } : { ...geometry, coordinates: geometry.coordinates.map(polygon => polygon.map(ring => ring.map(point))) };
}
function keeps(filter, geometry, properties = {}, z = 18) {
  const parts = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const origin = mercator(parts[0][0][0]);
  const canonical = { z, x: Math.floor(origin[0] * 2 ** z), y: Math.floor(origin[1] * 2 ** z) };
  const rings = parts.flatMap(part => part.map(ring => ring.map(position => {
    const point = mercator(position);
    return { x: Math.round((point[0] * 2 ** z - canonical.x) * 8192), y: Math.round((point[1] * 2 ** z - canonical.y) * 8192) };
  })));
  return featureFilter(filter, "layers.sprint07.filter").filter({ zoom: 18 }, { type: 3, id: 901, properties, geometry: rings }, canonical);
}

// Representative broad site; these are deterministic fixtures, not measured
// founder AOI/source coverage. Interiors cross several native z18 tiles.
const aoi = rectangle(55.32, 25.224, 55.326, 25.229);
const plan = buildPointObjectBuildingReplacementFilter(null, aoi);
assert(plan.applied);
const buildings = [];
for (let x = 0; x < 5; x++) for (let y = 0; y < 4; y++) buildings.push(rectangle(55.3203 + x * .001, 25.2243 + y * .001, 55.3206 + x * .001, 25.2246 + y * .001));
for (const geometry of buildings) assert.equal(keeps(plan.filter, geometry), false, "Every verified fully interior independent source building is hidden");
const outside = rectangle(55.327,25.2245,55.328,25.225);
const crossing = rectangle(55.3258,25.225,55.3262,25.2255);
assert.equal(keeps(plan.filter, outside), true);
assert.equal(keeps(plan.filter, crossing), true);
assert.equal(keeps(plan.filter, { type: "MultiPolygon", coordinates: [buildings[0].coordinates, outside.coordinates] }), true, "Unpartitioned mixed multipart stays whole; do not claim complete source removal");
const mixed = { type: "Feature", id: 901, properties: { render_height: 5, render_min_height: 0 }, geometry: { type: "MultiPolygon", coordinates: [...buildings.map(building => building.coordinates), outside.coordinates, crossing.coordinates] } };
const mixedBytes = JSON.stringify(mixed);
const partition = partitionPointObjectMapBuilding(mixed, aoi);
assert.equal(partition.hiddenMembers, 20);
assert.equal(partition.retainedMembers, 2);
assert.deepEqual(partition.retained.geometry.coordinates, [outside.coordinates, crossing.coordinates], "The legacy complete-containment partition remains available for analysis");
assert.deepEqual(partition.retained.properties, mixed.properties);
assert.equal(partition.retained.id, mixed.id);
assert.equal(JSON.stringify(mixed), mixedBytes, "Partition must not mutate source evidence");
const nativeMixed = { ...mixed, geometry: nativeGeometry(mixed.geometry) };
const prepared = pointObjectPreparedPartitionPredicate(nativeMixed);
assert(prepared);
assert.equal(keeps(prepared, nativeMixed.geometry, nativeMixed.properties), true);
assert.equal(keeps(prepared, rectangle(55.34,25.224,55.341,25.225), mixed.properties), false, "Same ID outside prepared geometry must never be suppressed");
const aoiHole = { ...aoi, coordinates: [...aoi.coordinates, rectangle(55.322,25.226,55.323,25.227).coordinates[0]] };
const surroundsHole = rectangle(55.3215,25.2255,55.3235,25.2275);
const holeBuilding = rectangle(55.3222,25.2262,55.3224,25.2264);
const tangentOutside = rectangle(55.326,25.225,55.327,25.226);
const holeMixed = { ...mixed, geometry: { type: "MultiPolygon", coordinates: [buildings[0].coordinates, surroundsHole.coordinates, holeBuilding.coordinates, tangentOutside.coordinates] } };
const holePartition = partitionPointObjectMapBuilding(holeMixed, aoiHole);
assert.equal(holePartition.hiddenMembers, 1);
assert.deepEqual(holePartition.retained.geometry.coordinates, [surroundsHole.coordinates, holeBuilding.coordinates, tangentOutside.coordinates]);
const courtyard = { ...mixed, geometry: { type: "Polygon", coordinates: [...surroundsHole.coordinates, aoiHole.coordinates[1]] } };
assert.equal(partitionPointObjectMapBuilding(courtyard, aoiHole).retained, null, "A genuine courtyard preserving the AOI hole may be hidden as a complete polygon");
const selectionAggregate = { type: "MultiPolygon", coordinates: [courtyard.geometry.coordinates, outside.coordinates] };
const selectionBytes = JSON.stringify(selectionAggregate);
assert.deepEqual(pointObjectTilePolygonMemberAt(selectionAggregate, [55.3216,25.2256]), courtyard.geometry, "Select the complete source member and preserve its courtyard rings");
assert.equal(pointObjectTilePolygonMemberAt(selectionAggregate, [55.3222,25.2262]), null, "A courtyard is not filled building geometry");
assert.equal(pointObjectTilePolygonMemberAt(selectionAggregate, [55.3215,25.2255]), null, "Exact edge or vertex is deliberately unresolved");
assert.equal(pointObjectTilePolygonMemberAt(selectionAggregate, [55.34,25.24]), null, "No member must not pick the nearest arbitrary component");
assert.equal(pointObjectTilePolygonMemberAt({ type: "MultiPolygon", coordinates: [courtyard.geometry.coordinates, courtyard.geometry.coordinates] }, [55.3216,25.2256]), null, "Overlapping member identity is ambiguous");
assert.equal(JSON.stringify(selectionAggregate), selectionBytes, "Selection does not rewrite source rings");

const acute = { type: "Polygon", coordinates: [[[55.32,25.224],[55.326,25.224],[55.3203,25.225],[55.32,25.224]]] };
assert(validatePointObjectReplacementAoi(acute).valid);
const acutePlan = buildPointObjectBuildingReplacementFilter(null, acute);
assert(acutePlan.applied, "A valid acute corner must not disable replacement across the entire AOI");
assert.equal(keeps(acutePlan.filter, rectangle(55.3205,25.2242,55.3207,25.2243)), false);
assert.equal(keeps(acutePlan.filter, outside), true);

const outline = rectangle(55.32,25.224,55.322,25.226);
for (const hide_3d of [true, "true", 1, "1"]) assert.equal(keeps(pointObjectNativeBuilding3dFilter, outline, { hide_3d, render_height: 100 }), false, "Native outline must not cover multilevel parts with a uniform prism");
for (const hide_3d of [undefined, false, "false", 0]) assert.equal(keeps(pointObjectNativeBuilding3dFilter, outline, { hide_3d, render_height: 25 }), true, "Native part remains available for source-height extrusion");
const composed = buildPointObjectBuildingReplacementFilter(pointObjectNativeBuilding3dFilter, aoi);
assert.equal(keeps(composed.filter, outside, { hide_3d: true }), false, "Replacement must preserve the source 3D outline filter");
assert.equal(keeps(composed.filter, outside, { render_height: 25 }), true);
const legacyComposed = buildPointObjectKnownFootprintFilter(
  ["==", "extrude", "true"],
  [["==", ["get", "replace"], true]]
);
assert(legacyComposed.applied);
assert.equal(keeps(legacyComposed.filter, outside, { extrude: "true", replace: false }), true, "A legacy basemap filter retains non-matching outside buildings after expression composition");
assert.equal(keeps(legacyComposed.filter, outside, { extrude: "true", replace: true }), false);

assert.deepEqual(findResultCoordinateBounds([{ longitude:55.32,latitude:25.22 },{ longitude:55.33,latitude:25.23 }]), [55.32,25.22,55.33,25.23]);
assert.deepEqual(findResultCoordinateBounds([{ longitude:55.32,latitude:25.22 }]), [55.32,25.22,55.32,25.22]);
assert.equal(findResultCoordinateBounds([]), null);
assert.equal(findResultCoordinateBounds([{ longitude:NaN,latitude:25.22 }]), null);
assert.equal(findResultCoordinateBounds([{ longitude:55.32,latitude:25.22 },{ longitude:103.85,latitude:1.3 }]), null, "A corrupted cross-market set must not cause an unbounded fit");
const coincident = [{ id: "saved-a", longitude: 55.32, latitude: 25.22 }, { id: "saved-b", longitude: 55.32, latitude: 25.22 }, { id: "nearby-not-equal", longitude: 55.32000001, latitude: 25.22 }];
const coincidentBytes = JSON.stringify(coincident);
const exactGroups = groupExactPointObjectProjectResults(coincident);
assert.deepEqual(exactGroups.map(group => group.results.map(result => result.id)), [["saved-a", "saved-b"], ["nearby-not-equal"]], "Only exact identical coordinates group, preserving artifact order and identity");
assert.equal(JSON.stringify(coincident), coincidentBytes, "Grouping never moves source markers or mutates saved artifacts");
assert.deepEqual(groupExactPointObjectProjectResults([{ id: "bad", longitude: NaN, latitude: 25.22 }]), []);
const openGuard = createPointObjectMapResultOpenGuard();
let releaseOpen;
let openCalls = 0;
const pendingOpen = openGuard.run(() => { openCalls++; return new Promise(resolve => { releaseOpen = resolve; }); });
assert.equal(openGuard.isPending(), true);
assert.equal(await openGuard.run(() => { openCalls++; }), false, "A second click or keypress must not begin another restore while loading");
assert.equal(openCalls, 1);
releaseOpen(false);
await pendingOpen;
assert.equal(openGuard.isPending(), false, "Failed restore unlocks retry");
await openGuard.run(() => true);
assert.equal(openGuard.isPending(), true, "Queued reload stays locked until the map unloads");
assert.equal(await openGuard.run(() => { openCalls++; }), false);
assert.equal(openCalls, 1);
const failedGuard = createPointObjectMapResultOpenGuard();
await assert.rejects(failedGuard.run(() => { throw new Error("fixture restore failure"); }));
assert.equal(failedGuard.isPending(), false);
// Async source-readiness contract: original outside geometry remains visible
// until its exact retained replacement is available to the renderer.
const layers = [{ id: "building", type: "fill-extrusion", source: "openmaptiles", "source-layer": "building", filter: pointObjectNativeBuilding3dFilter, paint: { "fill-extrusion-height": ["get", "render_height"], "fill-extrusion-base": ["get", "render_min_height"], "fill-extrusion-color": "#d6dcdf" } }];
const sources = new Map();
const listeners = new Set();
let rendererFilterWrites = 0;
let rendererRepaints = 0;
const fakeMap = {
  getStyle: () => ({ layers }),
  getLayer: id => layers.find(layer => layer.id === id),
  getFilter: id => layers.find(layer => layer.id === id)?.filter,
  setFilter: (id, filter) => { rendererFilterWrites++; fakeMap.getLayer(id).filter = filter; },
  querySourceFeatures: () => [nativeMixed],
  getSource: id => sources.get(id),
  isSourceLoaded: id => sources.get(id)?.loaded === true,
  addSource: (id, spec) => sources.set(id, { data: spec.data, loaded: false, setData(data) { this.data = data; this.loaded = false; } }),
  addLayer: (layer, before) => layers.splice(layers.findIndex(candidate => candidate.id === before), 0, layer),
  setLayoutProperty: (id, key, value) => { const layer = fakeMap.getLayer(id); layer.layout ??= {}; layer.layout[key] = value; },
  setPaintProperty: (id, key, value) => { fakeMap.getLayer(id).paint[key] = value; },
  triggerRepaint: () => { rendererRepaints++; },
  on: (_type, listener) => listeners.add(listener),
  off: (_type, listener) => listeners.delete(listener)
};
const originals = new Map([["building", snapshotPointObjectMapFilter(pointObjectNativeBuilding3dFilter)]]);
const initialPartitionReady = reconcilePointObjectPartitionRenderer(fakeMap, aoi, ["building"], originals);
assert.equal(initialPartitionReady, false, "A newly added retained source is pending, so generated geometry must not be shown yet");
assert.equal(keeps(fakeMap.getFilter("building"), nativeMixed.geometry, nativeMixed.properties), true, "Original mixed feature must remain until retained source loads");
const retainedSourceId = "geoai-existing-partition-source:openmaptiles";
sources.get(retainedSourceId).loaded = true;
for (const listener of listeners) listener({ sourceId: retainedSourceId });
assert.equal(keeps(fakeMap.getFilter("building"), nativeMixed.geometry, nativeMixed.properties), false, "Prepared retained geometry now permits native replacement");
assert(rendererRepaints >= 1, "Retained readiness schedules a terminal map idle reconciliation");
assert.equal(reconcilePointObjectPartitionRenderer(fakeMap, aoi, ["building"], originals), true, "The renderer reports ready only after retained geometry and native masking are both active");
const writesAfterReady = rendererFilterWrites;
for (const listener of listeners) listener({ sourceId: retainedSourceId });
assert.equal(rendererFilterWrites, writesAfterReady, "Repeated source-ready events must not mutate an identical native filter");
const copiedLayer = fakeMap.getLayer("geoai-existing-partition-layer:building");
assert.deepEqual(copiedLayer.paint["fill-extrusion-height"], ["get", "render_height"]);
assert.deepEqual(copiedLayer.filter, pointObjectNativeBuilding3dFilter, "Original outline policy must survive source replacement");
assert.deepEqual(sources.get(retainedSourceId).data.features[0], planPointObjectBuildingReplacement([nativeMixed], aoi).retained.features[0], "The visual renderer uses positive overlap while preserving exact non-overlap siblings");
const nextAoi = rectangle(55.320,25.224,55.322,25.226);
reconcilePointObjectPartitionRenderer(fakeMap, nextAoi, ["building"], originals);
assert.equal(sources.get(retainedSourceId).loaded, false);
assert.equal(keeps(fakeMap.getFilter("building"), nativeMixed.geometry, nativeMixed.properties), true, "A new AOI restores originals before replacing retained data");
clearPointObjectPartitionRenderer(fakeMap);
fakeMap.setFilter("building", pointObjectNativeBuilding3dFilter);
assert.equal(listeners.size, 0, "Restore cancels late source-ready responses");
assert.equal(copiedLayer.layout.visibility, "none");
assert.deepEqual(fakeMap.getFilter("building"), pointObjectNativeBuilding3dFilter);
console.log("Sprint07 map contract passed: positive-overlap members, exact outside/hole/tangent retention, async source readiness/restore, acute AOI, native outline policy, bounded result fit, exact-coordinate grouping and duplicate-open guard.");
