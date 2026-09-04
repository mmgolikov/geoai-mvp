import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Let Node return the canonical resolution error below.
      }
    }
    return nextResolve(specifier, context);
  }
});

const {
  buildPointObjectAreaContextOverpassQuery,
  normalizePointObjectAreaContext,
  parsePointObjectAreaContextRequest
} = await import("../src/lib/prototype/point-to-object-area-context-contract");

const request = parsePointObjectAreaContextRequest({
  marketKey: "dubai",
  locale: "en",
  aoiCoordinates: [[
    [55.2700, 25.2050],
    [55.2730, 25.2050],
    [55.2730, 25.2080],
    [55.2700, 25.2080],
    [55.2700, 25.2050]
  ]]
});

if (!request.ok) throw new Error(request.error);
assert.equal(request.ok, true);

const query = buildPointObjectAreaContextOverpassQuery(request.value);
assert.match(query, /poly:"25\.205000 55\.270000/);
assert.match(query, /\["building"\]/);
assert.match(query, /out tags center 301/);

const result = normalizePointObjectAreaContext({
  osm3s: { timestamp_osm_base: "2026-09-04T06:00:00Z" },
  elements: [
    { type: "way", id: 12, center: { lon: 55.271, lat: 25.206 }, tags: { name: "Tower", building: "office", "building:levels": "20" } },
    { type: "node", id: 13, lon: 55.2715, lat: 25.2065, tags: { shop: "supermarket", name: "Market" } },
    { type: "node", id: 14, lon: 55.272, lat: 25.207, tags: { public_transport: "station", name: "Station" } },
    { type: "way", id: 15, center: { lon: 55.290, lat: 25.220 }, tags: { building: "apartments" } }
  ]
}, request.value, "2026-09-04T06:01:00Z");

assert.equal(result.protocol, "POINT_TO_OBJECT_001_AREA_CONTEXT_V1");
assert.equal(result.mode, "results");
assert.equal(result.summary.sampleSize, 3);
assert.equal(result.summary.mappedBuildingCount, 1);
assert.equal(result.summary.medianMappedLevels, 20);
assert.equal(result.summary.groups.find((group) => group.group === "commercial")?.count, 1);
assert.equal(result.coverage.inclusionMethod, "returned_center_inside_aoi");
assert.equal(result.coverage.completeInventory, false);
assert.equal(result.features.some((feature) => feature.sourceFeatureId === "way/15"), false);
assert.equal(result.source.persistenceUsed, false);

for (const invalid of [
  { ...request.value, marketKey: "unsupported" },
  { ...request.value, aoiCoordinates: [[...request.value.aoiCoordinates[0].slice(0, -1)]] },
  { ...request.value, aoiCoordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
  { ...request.value, extra: true }
]) {
  assert.equal(parsePointObjectAreaContextRequest(invalid).ok, false);
}

console.log("Point-to-object bounded AOI context contract passed.");
