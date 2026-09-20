import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
// @ts-expect-error Node transform-types requires the explicit extension.
import { readComparisonMapDiagnostic, observeComparisonMapNetwork, parseComparisonMapDiagnostic, comparisonMapDiagnosticsFromReport, withComparisonGeometryDeadline, ComparisonGeometryProbeTimeout } from "../tests/e2e/helpers/sprint10-map-diagnostics.ts";

const events = new EventEmitter();
const observer = observeComparisonMapNetwork(events as unknown as Page);
const request = (url: string) => ({ url: () => url,
  headers: () => { throw new Error("Headers must never be read"); }, postData: () => { throw new Error("Body must never be read"); } });
const good = request("https://tiles.openfreemap.org/styles/liberty?token=private-sentinel");
const bad = request("https://tiles.openfreemap.org/planet/123.pbf?secret=private-sentinel");
const pending = request("https://tiles.openfreemap.org/font/456.pbf");
const unknown = request("https://unknown.invalid/private-sentinel");
for (const item of [good, bad, pending, unknown]) events.emit("request", item);
events.emit("response", { request: () => good, status: () => 200 });
events.emit("requestfinished", good);
events.emit("response", { request: () => bad, status: () => 503 });
events.emit("requestfailed", bad);
const network = observer.snapshot();
assert.deepEqual(network, { host: "tiles.openfreemap.org", requests: 3, responses: 2, failed: 1, pending: 1,
  statusCounts: [{ status: 200, count: 1 }, { status: 503, count: 1 }] });
observer.dispose();
events.emit("request", good);
assert.deepEqual(observer.snapshot(), network, "Disposed diagnostic observers must not retain event subscriptions.");

Object.assign(globalThis, { innerWidth: 1440, innerHeight: 1000 });
const fakeMap = {
  getStyle: () => ({ sources: { public: {}, "geoai-find-footprints": {} }, layers: [
    { id: "road", source: "public", type: "line" }, { id: "fill", source: "public", type: "fill" },
    { id: "selection", source: "geoai-find-footprints", type: "fill" }] }),
  getSource: () => ({ getData: () => { throw new Error("Diagnostic must not wait for GeoJSON getData"); } }),
  queryRenderedFeatures: () => Array.from({ length: 7 }, () => ({})),
  getCanvas: () => ({ clientWidth: 400, clientHeight: 420, width: 800, height: 840,
    getBoundingClientRect: () => ({ left: 900, right: 1300, top: 850, bottom: 1270 }) }),
  getZoom: () => 17.5, getPitch: () => 0, isSourceLoaded: (id: string) => id === "public",
  isStyleLoaded: () => false, areTilesLoaded: () => true, loaded: () => false, isMoving: () => false
};
const element = { "__reactFiber$test": { memoizedState: { memoizedState: { current: fakeMap }, next: null }, return: null } };
const locator = { evaluate: async (fn: (value: unknown) => unknown) => fn(element) } as unknown as Locator;
const diagnostic = await readComparisonMapDiagnostic(locator, network);
assert.equal(diagnostic.readStatus, "ok");
assert.equal(diagnostic.map?.basemapFeatures, 7);
assert.equal(diagnostic.map?.nativeSourcesLoaded, 1);
assert.equal(diagnostic.map?.geoaiSourcesLoaded, 0);
assert.equal(diagnostic.map?.visibleHeight, 150);
const serialized = JSON.stringify(diagnostic);
assert.doesNotMatch(serialized, /private-sentinel|https:|headers|token|secret|123[.]pbf/);
const report = { suites: [{ annotations: [{ type: "find-comparison-map-failure", description: serialized }] }] };
assert.deepEqual(comparisonMapDiagnosticsFromReport(report), [diagnostic]);
assert.deepEqual(comparisonMapDiagnosticsFromReport({ suites: [{ annotations: [] }] }), [], "Old reports without map evidence remain compatible.");
assert.throws(() => comparisonMapDiagnosticsFromReport({ annotations: [{ type: "find-comparison-map-failure", description: "not-json" }] }));
assert.throws(() => comparisonMapDiagnosticsFromReport({ annotations: [...report.suites[0].annotations, ...report.suites[0].annotations] }));
for (const corrupt of [
  { ...diagnostic, headers: "private-sentinel" },
  { ...diagnostic, map: { ...diagnostic.map, url: "private-sentinel" } },
  { ...diagnostic, network: { ...network, host: "unknown.invalid" } },
  { ...diagnostic, network: { ...network, headers: {} } },
  { ...diagnostic, network: { ...network, statusCounts: [{ status: 700, count: 1 }] } },
  { ...diagnostic, network: { ...network, statusCounts: [{ status: 200, count: 1, body: "private-sentinel" }] } },
  { ...diagnostic, readStatus: "unknown" },
  { ...diagnostic, failureKind: "unknown" },
  { ...diagnostic, stage: "find_compare_geometry" },
  { ...diagnostic, map: { ...diagnostic.map, styleLoaded: "true" } },
  ...[NaN, Infinity, -1, 100001, 1.5].map((width) => ({ ...diagnostic, map: { ...diagnostic.map, width } }))
]) assert.throws(() => parseComparisonMapDiagnostic(corrupt));
const unavailable = await readComparisonMapDiagnostic({ evaluate: async () => null } as unknown as Locator, network);
assert.equal(unavailable.readStatus, "unavailable");
assert.equal(unavailable.map, null);
const helperSource = readFileSync(new URL("../tests/e2e/helpers/sprint10-map-diagnostics.ts", import.meta.url), "utf8");
assert.doesNotMatch(helperSource, /[.]getData\(|[.]headers\(|[.]body\(|[.]postData\(|[.]screenshot\(|[.]route\(/);
const spec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
const find = spec.split("async function runDubaiFind")[1].split("async function runSingaporeFind")[0];
assert.ok(find.indexOf("observeComparisonMapNetwork(page)") < find.indexOf('name: "Open full comparison dashboard"'));
assert.match(find, /readComparisonMapDiagnostic\(map, comparisonNetwork[.]snapshot\(\)\)\)[.]map\?[.]basemapFeatures \?\? 0\)[.]toBeGreaterThan\(0\)/,
  "The real basemap acceptance assertion must retain >0 without waiting for GeoJSON.");
assert.match(find, /readComparisonMapDiagnostic\(map, comparisonNetwork[.]snapshot\(\)\)[\s\S]*?throw error;/,
  "Failure diagnostics must preserve the original failure.");
assert.match(find, /withComparisonGeometryDeadline\(quality20MapState\(map\)\)/);
assert.match(find, /expect\(feature\?[.]geometry\)[.]toEqual\(candidate[.]geometry\)/, "Exact source footprints remain required.");
assert.equal(await withComparisonGeometryDeadline(Promise.resolve(7)), 7);
await assert.rejects(withComparisonGeometryDeadline(new Promise(() => {})), ComparisonGeometryProbeTimeout);
parseComparisonMapDiagnostic({ ...diagnostic, stage: "find_compare_geometry", failureKind: "geometry_probe_timeout" });
console.log("PASS: bounded numeric map probe without GeoJSON reads; fixed-host status counters; privacy/malformed rejection; old-report compatibility; unchanged real basemap gate. Synthetic diagnostic fixtures only.");
