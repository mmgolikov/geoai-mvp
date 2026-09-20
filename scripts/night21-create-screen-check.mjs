import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createScreenMetrics, readCreateScreen, CREATE_MIN_SCREEN_SPAN_RATIO } from "../tests/e2e/helpers/night21-create-screen.ts";

const point = (x, y, surface = "base", w = 1) => ({ x, y, surface, w });
const valid = { width: 1000, height: 800, points: [point(200, 650), point(800, 650), point(200, 150, "roof"), point(800, 150, "roof")] };
assert.deepEqual(createScreenMetrics(valid), { valid: true, framed: true, useful: true, largestSpanRatio: 0.625, baseVertices: 2, roofVertices: 2 });
const clippedRoof = { ...valid, points: valid.points.map(p => p.surface === "roof" ? { ...p, y: -50 } : p) };
assert.ok(clippedRoof.points.filter(p => p.surface === "base").every(p => p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 800));
assert.equal(createScreenMetrics(clippedRoof).framed, false, "ground fits but roof clips must FAIL");
const tiny = { ...valid, points: valid.points.map(p => ({ ...p, x: 500 + (p.x - 500) * 0.1, y: 400 + (p.y - 400) * 0.1 })) };
assert.equal(createScreenMetrics(tiny).framed, true);
assert.equal(createScreenMetrics(tiny).useful, false, "a postage-stamp model must FAIL even when entirely visible");
for (const invalid of [
  { ...valid, width: 0 }, { ...valid, height: Infinity }, { ...valid, points: [] },
  { ...valid, points: valid.points.filter(p => p.surface === "base") },
  { ...valid, points: valid.points.map(p => ({ ...p, x: NaN })) },
  { ...valid, points: valid.points.map(p => ({ ...p, w: -1 })) }
]) assert.equal(createScreenMetrics(invalid).valid, false);
assert.equal(CREATE_MIN_SCREEN_SPAN_RATIO, 0.3);
const thinButUseful = { ...valid, points: [point(490, 200), point(510, 200), point(490, 600, "roof"), point(510, 600, "roof")] };
assert.equal(createScreenMetrics(thinButUseful).useful, true, "do not demand uniform distribution or high site coverage");

// Bind the private-API oracle to the actually installed primary source. Any
// MapLibre upgrade must deliberately revalidate these metre/matrix semantics.
const pkg = JSON.parse(readFileSync(new URL("../node_modules/maplibre-gl/package.json", import.meta.url), "utf8"));
assert.equal(pkg.version, "6.9.0");
const native = readFileSync(new URL("../node_modules/maplibre-gl/src/geo/projection/mercator_transform.ts", import.meta.url), "utf8");
assert.match(native, /coordinatePoint\(coord: MercatorCoordinate, elevation: number = 0, pixelMatrix: mat4 = this\._pixelMatrix\)/);
assert.match(native, /\[coord.x \* this.worldSize, coord.y \* this.worldSize, elevation, 1\]/);
assert.match(native, /return new Point\(p\[0\] \/ p\[3\], p\[1\] \/ p\[3\]\)/);

// Run the actual browser collector against a controlled native-transform double:
// preserve source bytes and send baseM/heightM as metres, not mercator z.
const geometry = { type: "FeatureCollection", features: [{ type: "Feature", properties: { baseM: 12, heightM: 80 },
  geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }] };
const elevations = [];
const project = (coord, elevation) => ({ x: coord.x * 800, y: coord.y * 800 - elevation });
const transform = { worldSize: 512, _pixelMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  coordinatePoint(coord, elevation) { elevations.push(elevation); return project(coord, elevation); } };
const map = { _camera: { transform }, style: { projection: { name: "mercator" } }, getProjection: () => undefined,
  getSource: () => ({ getData: async () => geometry }), getCanvas: () => ({ clientWidth: 1000, clientHeight: 800 }),
  getPitch: () => 50, queryRenderedFeatures: () => [{ source: "create-result-preview-massing" }, { source: "openmaptiles" }],
  project: ([lng, lat]) => project({ x: (180 + lng) / 360, y: (180 - 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))) / 360 }, 0) };
const preview = { evaluate: async callback => callback({ getAttribute: () => "map",
  __reactFiber$test: { memoizedState: { memoizedState: { current: map }, next: null }, return: null } }) };
const result = await readCreateScreen(preview);
assert.deepEqual(result.geometry, geometry);
assert.equal(result.projection.points.length, 8);
assert.deepEqual(elevations, [0, 12, 80, 0, 12, 80, 0, 12, 80, 0, 12, 80]);
assert.ok(result.projection.points.every(p => p.w === 1));
map.style.projection.name = "globe";
await assert.rejects(() => readCreateScreen(preview), /requires the pinned native Mercator transform/);
map.style.projection.name = undefined;
await assert.rejects(() => readCreateScreen(preview), /requires the pinned native Mercator transform/);
map.style.projection.name = "mercator";
map._camera = {};
await assert.rejects(() => readCreateScreen(preview), /requires the pinned native Mercator transform/);

console.log("NIGHT21 Create screen oracle PASS: valid, clipped-roof, postage-stamp, nonfinite/behind-camera, metre projection and missing-transform checks. Offline only.");
