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
  limit: 10
});
assert.equal(valid.ok, true);

for (const market of POINT_OBJECT_MARKETS) {
  const [longitude, latitude] = market.center;
  assert.equal(parsePointObjectFindRequest({
    marketKey: market.key,
    locale: "ru",
    bounds: [longitude - 0.005, latitude - 0.005, longitude + 0.005, latitude + 0.005],
    group: "residential",
    mappedMinimumLevels: null,
    limit: 5
  }).ok, true, `${market.key} must accept a bounded Find request around its configured centre.`);
}

const query = buildPointObjectFindOverpassQuery(valid.value);
assert.match(query, /^\[out:json\]\[timeout:5\]\[maxsize:524288\];/);
assert.match(query, /\["building:levels"\]/);
assert.match(query, /out tags center 81;/);
assert.doesNotMatch(query, /score|rank|valuation|zoning/i);

for (const candidate of [
  { ...valid.value, marketKey: "london" },
  { ...valid.value, bounds: [54.8, 24.8, 55.8, 25.6] },
  { ...valid.value, bounds: [55.25, 25.18, 56, 25.22] },
  { ...valid.value, mappedMinimumLevels: 0 },
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

const empty = normalizePointObjectFindCandidates({ elements: [] }, valid.value);
assert.deepEqual(empty.candidates, []);
assert.equal(empty.upstreamElementCount, 0);

console.log("point-to-object Find checks passed");
