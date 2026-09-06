import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    },
    fileName: filename
  });
  module._compile(output.outputText, filename);
};

const {
  buildPointObjectFindOverpassQuery,
  normalizePointObjectFindCandidates,
  pointObjectFindOverpassRuntimeError,
  parsePointObjectFindRequest,
  POINT_OBJECT_FIND_CAVEAT,
  POINT_OBJECT_FIND_GROUPS
} = require("../src/lib/prototype/point-to-object-find-contract.ts");
const { POINT_OBJECT_MARKETS } = require("../src/lib/prototype/point-to-object-markets.ts");

assert.equal(POINT_OBJECT_FIND_GROUPS.length, 9);
assert.equal(POINT_OBJECT_MARKETS.length, 9);
assert.equal(
  POINT_OBJECT_FIND_CAVEAT,
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
);

const valid = parsePointObjectFindRequest({
  marketKey: "dubai",
  locale: "en",
  bounds: [55.25, 25.18, 55.29, 25.22],
  group: "commercial_office",
  mappedMinimumLevels: 12,
  mappedMaximumLevels: 20,
  limit: 10
});
assert.equal(valid.ok, true);
assert.equal(parsePointObjectFindRequest({
  ...valid.value,
  mappedMinimumLevels: 1,
  mappedMaximumLevels: 100
}).ok, true);

for (const market of POINT_OBJECT_MARKETS) {
  const [longitude, latitude] = market.center;
  assert.equal(parsePointObjectFindRequest({
    marketKey: market.key,
    locale: "ru",
    bounds: [longitude - 0.005, latitude - 0.005, longitude + 0.005, latitude + 0.005],
    group: "residential",
    mappedMinimumLevels: null,
    mappedMaximumLevels: null,
    limit: 5
  }).ok, true, `${market.key} must accept a bounded Find request around its configured centre.`);
}

const query = buildPointObjectFindOverpassQuery(valid.value);
assert.match(query, /^\[out:json\]\[timeout:5\]\[maxsize:33554432\];/);
assert.match(query, /\["building:levels"\]/);
assert.match(query, /out tags center 81;/);
assert.doesNotMatch(query, /score|rank|valuation|zoning/i);

for (const candidate of [
  { ...valid.value, marketKey: "london" },
  { ...valid.value, bounds: [54.8, 24.8, 55.8, 25.6] },
  { ...valid.value, bounds: [55.25, 25.18, 56, 25.22] },
  { ...valid.value, mappedMinimumLevels: 0 },
  { ...valid.value, mappedMaximumLevels: 101 },
  { ...valid.value, mappedMinimumLevels: 21, mappedMaximumLevels: 20 },
  { ...valid.value, limit: 21 },
  { ...valid.value, group: "investment_score" },
  { ...valid.value, unexpected: true }
]) {
  assert.equal(parsePointObjectFindRequest(candidate).ok, false);
}

const payload = {
  osm3s: { timestamp_osm_base: "2026-09-04T07:00:00Z" },
  elements: [
    { type: "way", id: 42, center: { lon: 55.27, lat: 25.2 }, tags: { name: "Tower B", building: "office", "building:levels": "8", website: "https://ignored.example" } },
    { type: "way", id: 41, center: { lon: 55.271, lat: 25.201 }, tags: { "name:en": "Tower A", office: "company", "building:levels": "16" } },
    { type: "node", id: 43, lon: 55.272, lat: 25.202, tags: { office: "estate_agent", "building:levels": "12" } },
    { type: "way", id: 44, center: { lon: 55.273, lat: 25.203 }, tags: { building: "apartments", "building:levels": "30" } },
    { type: "way", id: 45, center: { lon: 55.4, lat: 25.2 }, tags: { building: "office", "building:levels": "20" } },
    { type: "way", id: 46, center: { lon: 55.274, lat: 25.204 }, tags: { name: "Unknown Levels", building: "office", "building:levels": "unknown" } },
    { type: "way", id: "not-an-id", center: { lon: 55.27, lat: 25.2 }, tags: { building: "office", "building:levels": "20" } }
  ]
};
const normalized = normalizePointObjectFindCandidates(payload, valid.value);
assert.deepEqual(normalized.candidates.map((candidate) => candidate.sourceFeatureId), ["node/43", "way/41"]);
assert.equal(normalized.candidates[1]?.label, "Tower A");
assert.equal(normalized.candidates[1]?.mappedBuildingLevels, 16);
assert.equal(normalized.candidates[1]?.evidenceClass, "observed_in_open_map_source");
assert.equal(normalized.candidates[1]?.observedTags.website, undefined);
assert.equal(normalized.observedAt, "2026-09-04T07:00:00.000Z");
assert.equal(normalized.capReached, false);

const minimumOnly = normalizePointObjectFindCandidates(payload, {
  ...valid.value,
  mappedMaximumLevels: null
});
assert.deepEqual(minimumOnly.candidates.map((candidate) => candidate.sourceFeatureId), ["node/43", "way/41"]);

const maximumOnly = normalizePointObjectFindCandidates(payload, {
  ...valid.value,
  mappedMinimumLevels: null,
  mappedMaximumLevels: 8
});
assert.deepEqual(maximumOnly.candidates.map((candidate) => candidate.sourceFeatureId), ["way/42"]);

const withoutLevelsFilter = normalizePointObjectFindCandidates(payload, {
  ...valid.value,
  mappedMinimumLevels: null,
  mappedMaximumLevels: null
});
assert.equal(withoutLevelsFilter.candidates.find((candidate) => candidate.sourceFeatureId === "way/46")?.mappedBuildingLevels, null);

const empty = normalizePointObjectFindCandidates({ elements: [] }, valid.value);
assert.deepEqual(empty.candidates, []);
assert.equal(empty.upstreamElementCount, 0);

assert.equal(pointObjectFindOverpassRuntimeError({ elements: [] }), false);
assert.equal(pointObjectFindOverpassRuntimeError({ elements: [], remark: "runtime error: Query ran out of memory" }), true);
assert.equal(pointObjectFindOverpassRuntimeError({ elements: payload.elements.slice(0, 1), remark: "runtime error: partial result" }), true);
assert.equal(pointObjectFindOverpassRuntimeError({ elements: [], remark: "   " }), false);
assert.throws(
  () => normalizePointObjectFindCandidates({ elements: [], remark: "runtime error: Query ran out of memory" }, valid.value),
  (error) => error?.code === "OVERPASS_RUNTIME_FAILURE"
);
assert.throws(
  () => normalizePointObjectFindCandidates({ elements: payload.elements.slice(0, 1), remark: "runtime error: partial result" }, valid.value),
  (error) => error?.code === "OVERPASS_RUNTIME_FAILURE"
);

const findService = readFileSync(new URL("../src/lib/prototype/point-to-object-find.ts", import.meta.url), "utf8");
assert.match(findService, /cache: "no-store"/, "Raw Overpass responses must bypass the Next data cache");
assert.doesNotMatch(findService, /cache: "force-cache"/, "HTTP 200 runtime failures must not be cached before validation");
assert.match(findService, /assertUsablePointObjectFindPayload\(payload\);[\s\S]*const fetchCachedOverpassPayload = unstable_cache/, "Only validated Overpass payloads may enter the 15-minute cache");
assert.match(findService, /return \{ payload, acquiredAt: new Date\(\)\.toISOString\(\) \};[\s\S]*const fetchCachedOverpassPayload = unstable_cache/, "A cache hit must preserve the upstream acquisition timestamp instead of manufacturing fresh evidence");
assert.doesNotMatch(findService, /const acquiredAt = new Date\(\)\.toISOString\(\);/, "Evidence acquisition time must not be recomputed after cache retrieval");
assert.match(findService, /assertUsablePointObjectFindPayload\(payload\);[\s\S]*normalizePointObjectFindCandidates\(payload, request\)/, "Custom loaders must also fail closed before empty or partial normalization");
assert.match(findService, /"OVERPASS_RUNTIME_ERROR"[\s\S]*502[\s\S]*true/, "Overpass runtime remarks must be retryable upstream failures, never zero-result success");

console.log("point-to-object Find checks passed");
