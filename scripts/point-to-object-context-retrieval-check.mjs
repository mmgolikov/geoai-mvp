import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%3Dfn%3D%3Efn", shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".ts")) return { format: "module", shortCircuit: true,
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url }) };
    return nextLoad(url, context);
  }
});

const { buildOverpassUrbanFabricQuery, buildOverpassCombinedContextQuery, normalizeOverpassUrbanFabric, resolveLiveNearbyContext,
  buildLivePointObjectEvidencePack } = await import("../src/lib/prototype/point-to-object-live-evidence.ts");
const { rememberExactFindElements } = await import("../src/lib/prototype/point-to-object-exact-source.ts");
const { normalizePointObjectContext, parseNormalizedPointObjectContext } = await import("../src/lib/prototype/point-to-object-normalized-context.ts");
const point = [55.27, 25.2];
let checks = 0;
const query = buildOverpassUrbanFabricQuery(point);
assert.equal((query.match(/\(around:/g) ?? []).length, 1, "The twelve category selectors share one spatial scan.");
assert.match(query, /\(around:400,25\.200000,55\.270000\)->\.fabric;/);
assert.match(query, /\[timeout:4\]\[maxsize:33554432\]/);
assert.match(query, /out tags center 320;/);
for (const invalid of [[181, 25], [55, -91], [NaN, 25], [55, Infinity]]) {
  assert.throws(() => buildOverpassUrbanFabricQuery(invalid));
}
checks++;

function assertCombinedQuery(query) {
  assert.equal((query.match(/\[out:json\]/g) ?? []).length, 1, "One combined provider response.");
  assert.match(query, /\[timeout:4\]\[maxsize:33554432\]/);
  assert.match(query, /nwr\(around:800,25\.200000,55\.270000\)\["amenity"/);
  assert.match(query, /nwr\(around:400,25\.200000,55\.270000\)->\.fabric;/);
  assert.ok(query.includes(")->.nearby;") && query.includes(")->.uses;"), "Both named scope sets are retained.");
  assert.ok(query.includes("(.nearby;.uses;);"), "Both scopes contribute to the output, not just one.");
  assert.ok(query.endsWith("out tags center 440;"), "Combined output keeps its actual bounded cap.");
}
const combinedQuery = buildOverpassCombinedContextQuery(point);
assertCombinedQuery(combinedQuery); checks++;
for (const mutated of [
  combinedQuery.replaceAll("around:800,", "around:400,"),
  combinedQuery.replace("around:400,", "around:800,"),
  combinedQuery.replace("(.nearby;.uses;);", "(.nearby;);"),
  combinedQuery.replace("out tags center 440;", "out tags center 320;")
]) { assert.throws(() => assertCombinedQuery(mutated), "The oracle must reject a lost radius, scope union or actual cap."); checks++; }

// Resolver injection must enforce the same trust boundary as HTTP retrieval.
// Otherwise an absent/malformed response becomes an available, hashed zero.
for (const payload of [null, {}, { elements: {} }, { elements: [], remark: "runtime failure" }]) {
  const result = await resolveLiveNearbyContext(point, "node/1", "en", async () => payload);
  assert.equal(result.status, "unavailable");
  assert.equal(result.responseHash, null);
  assert.deepEqual(result.items, []);
  checks++;
}
const validEmpty = await resolveLiveNearbyContext(point, "node/1", "en", async () => ({ elements: [] }));
assert.equal(validEmpty.status, "available");
assert.equal(typeof validEmpty.responseHash, "string");
checks++;

const fixture = {
  osm3s: { timestamp_osm_base: "2026-09-25T00:00:00Z" },
  elements: [
    { type: "node", id: 1, lon: point[0], lat: point[1], tags: { amenity: "school", name: "Subject fixture" } },
    { type: "way", id: 2, center: { lon: 55.2701, lat: 25.2001 }, tags: { building: "apartments", "building:levels": "8" } },
    { type: "node", id: 3, lon: 55.2702, lat: 25.2002, tags: { amenity: "school", name: "Fixture school" } },
    { type: "way", id: 4, center: { lon: 55.28, lat: 25.2 }, tags: { building: "hotel" } },
    { type: "node", id: 5, lon: 55.276, lat: 25.2, tags: { amenity: "clinic", name: "Outer clinic inside 800m only" } },
    { type: "node", id: 6, lon: 55.279, lat: 25.2, tags: { highway: "bus_stop", name: "Outside 800m" } },
    { type: "node", id: 7, lon: 55.2715, lat: 25.2, tags: { highway: "bus_stop", name: "Inner bus stop" } },
    { type: "node", id: 8, lon: 55.271, lat: 25.2, tags: { shop: "supermarket", name: "Inner daily services" } },
    { type: "node", id: 9, lon: 55.2725, lat: 25.2, tags: { leisure: "park", name: "Inner park" } }
  ]
};
const profile = normalizeOverpassUrbanFabric(fixture, point);
assert.equal(profile.coverage, "available");
assert.equal(profile.sampleSize, 6, "A feature centre outside 400m cannot enter the profile even if its boundary intersects the circle.");
assert.equal(profile.mappedBuildingCount, 1);
assert.equal(profile.medianMappedLevels, 8);
assert.deepEqual(new Set(profile.groups.map(item => item.group)), new Set(["residential", "education", "transport", "retail_daily_needs", "open_space"]));
checks++;

// Exercise the real retrieval + pack assembly boundary without network calls.
// Existing Find subject is reused; one combined enrichment may dispatch.
const originalFetch = globalThis.fetch;
const cappedFixture = size => ({ ...fixture, elements: Array.from({ length: size }, (_, index) => ({
  type: "node", id: 1000 + index, lon: 55.2702, lat: 25.2002,
  tags: { amenity: "school", name: `Bounded school record ${index}` }
})) });
const cases = [
  { name: "valid", response: () => Response.json(fixture), status: "available", diagnostic: null },
  { name: "empty", response: () => Response.json({ elements: [] }), status: "available", diagnostic: null },
  { name: "below-combined-cap", response: () => Response.json(cappedFixture(439)), status: "available", diagnostic: null, sampleSize: 439, capReached: false },
  { name: "combined-cap", response: () => Response.json(cappedFixture(440)), status: "available", diagnostic: null, sampleSize: 440, capReached: true },
  { name: "partial", response: () => Response.json({ ...fixture, remark: "runtime timeout" }), status: "unavailable", diagnostic: "invalid_response" },
  { name: "malformed", response: () => Response.json({ elements: null }), status: "unavailable", diagnostic: "invalid_response" },
  { name: "oversize", response: () => new Response("ignored", { headers: { "content-length": String(512 * 1024 + 1) } }), status: "unavailable", diagnostic: "response_too_large" },
  { name: "timeout", response: () => new Response("private provider diagnostics", { status: 504 }), status: "unavailable", diagnostic: "timeout" }
];
function assertValidCombinedPack(pack) {
  assert.equal(pack.selectedObject.sourceFeatureId, "node/1");
  assert.equal(pack.selectedObject.name, "Subject fixture", "The exact cached subject is not replaced by a nearby facility.");
  assert.equal(pack.geoContext.radiusM, 400);
  assert.equal(pack.geoContext.sampleSize, 6);
  assert.equal(pack.geoContext.capReached, false);
  assert.deepEqual(Object.fromEntries(pack.geoContext.groups.map(item => [item.group, item.count])), {
    transport: 1, education: 2, residential: 1, retail_daily_needs: 1, open_space: 1
  });
  assert.equal(pack.geoContext.mappedBuildingCount, 1);
  assert.equal(pack.geoContext.mappedLevelsKnownCount, 1);
  assert.equal(pack.geoContext.medianMappedLevels, 8);
  assert.equal(pack.geoContext.nearestTransitM, 151, "Nearest distance is derived from the returned centre.");
  const ids = new Set(pack.nearbyContext.map(item => item.sourceFeatureId));
  assert.deepEqual(ids, new Set(["node/3", "node/5", "node/7", "node/8", "node/9"]));
  const outer = pack.nearbyContext.find(item => item.sourceFeatureId === "node/5");
  assert.ok(outer.distanceM > 400 && outer.distanceM <= 800, "Outer clinic survives the nearby800m scope, not the fabric400m scope.");
  assert.ok(!pack.geoContext.groups.some(item => item.group === "healthcare"), "Outer clinic cannot inflate 400m healthcare count.");
  assert.ok(pack.nearbyContext.every(item => item.method === "overpass_around_query_element_center_haversine" && item.distanceM <= 800 && Array.isArray(item.coordinates)));
  const normalized = normalizePointObjectContext(pack);
  assert.ok(parseNormalizedPointObjectContext(normalized));
  assert.equal(normalized.coverage, "available");
  assert.ok(normalized.places.every(item => item.distanceM <= 400 && item.id !== "node/5"), "Common400m display does not silently use the outer800m clinic.");
}
try {
  for (const testCase of cases) {
    let requests = 0;
    rememberExactFindElements({ elements: [{ type: "node", id: 1, lon: point[0], lat: point[1], tags: { amenity: "school", name: "Subject fixture" } }] }, new Date().toISOString());
    globalThis.fetch = async (url, init) => {
      requests++;
      const requestUrl = new URL(url);
      assert.equal(requestUrl.origin, "https://overpass-api.de");
      assert.equal(requestUrl.pathname, "/api/interpreter");
      const requestQuery = requestUrl.searchParams.get("data");
      assert.ok(!requestQuery.includes("out body geom 1"), "Do not reacquire the exact Find subject.");
      assert.equal(requestQuery, combinedQuery, "The actual enrichment dispatch combines both scopes.");
      assertCombinedQuery(requestQuery);
      assert.equal(init.redirect, "error");
      assert.equal(init.cache, "no-store", "Only validated results may enter the application cache.");
      assert.ok(init.signal);
      return testCase.response();
    };
    const pack = await buildLivePointObjectEvidencePack({ longitude: point[0], latitude: point[1], osmFeatureId: "node/1", locale: "en", expectedCountryCode: "ae" });
    assert.equal(requests, 1, `${testCase.name}: one combined enrichment, no retries or subject reacquisition`);
    assert.equal(pack.source.contextStatus, testCase.status);
    assert.equal(pack.source.fabricStatus, testCase.status);
    assert.equal(pack.geoContext.coverage, testCase.status);
    assert.equal(pack.source.fabricDiagnostic.failureCode, testCase.diagnostic);
    assert.equal(pack.source.contextDiagnostic.failureCode, testCase.diagnostic);
    assert.equal(pack.source.wikidataStatus, "not_requested_no_qid");
    assert.equal(pack.source.contextRadiusM, 800);
    assert.equal(pack.source.fabricRadiusM, 400);
    if (testCase.status === "unavailable") {
      assert.equal(pack.source.fabricResponseHash, null);
      assert.equal(pack.source.contextResponseHash, null);
      assert.deepEqual(pack.geoContext.groups, []);
      assert.deepEqual(pack.nearbyContext, []);
      assert.equal(pack.source.contextAcquiredAt, null);
      assert.equal(pack.source.fabricAcquiredAt, null);
      assert.ok(!JSON.stringify(pack).includes("private provider diagnostics"));
    } else {
      assert.match(pack.source.contextResponseHash, /^[a-f0-9]{64}$/);
      assert.match(pack.source.fabricResponseHash, /^[a-f0-9]{64}$/);
      assert.ok(Number.isFinite(Date.parse(pack.source.contextAcquiredAt)));
      assert.equal(pack.source.contextAcquiredAt, pack.source.fabricAcquiredAt, "Both scopes come from one actual acquisition.");
      assert.equal(pack.source.contextObservedAt, pack.source.fabricObservedAt);
      if (testCase.name === "valid") {
        assertValidCombinedPack(pack);
        for (const mutate of [
          value => { value.geoContext.sampleSize++; },
          value => { value.nearbyContext = value.nearbyContext.filter(item => item.sourceFeatureId !== "node/5"); },
          value => { value.nearbyContext.push({ ...value.nearbyContext[0], sourceFeatureId: "node/6", distanceM: 905 }); },
          value => { value.geoContext.capReached = true; }
        ]) { const changed = structuredClone(pack); mutate(changed); assert.throws(() => assertValidCombinedPack(changed)); checks++; }
      } else if (testCase.name === "empty") {
        assert.equal(pack.geoContext.sampleSize, 0);
        assert.equal(pack.geoContext.capReached, false);
        assert.deepEqual(pack.nearbyContext, []);
        assert.ok(normalizePointObjectContext(pack).metrics.filter(item => item.unit === "count").every(item => item.value === 0), "Only validated empty responses establish sample zeros.");
      } else {
        assert.equal(pack.geoContext.sampleSize, testCase.sampleSize);
        assert.equal(pack.geoContext.capReached, testCase.capReached, "The threshold is the combined440 cap, not the legacy320 fabric cap.");
        assert.equal(pack.nearbyContext.length, 12, "Detailed nearby selection remains bounded independently of the source output cap.");
        assert.equal(normalizePointObjectContext(pack).coverage, testCase.capReached ? "partial" : "available");
        assert.ok(pack.nearbyContext.every(item => item.proofLimit.includes("not a route") && item.proofLimit.includes("complete coverage")), "Available/capped details do not claim routes or a complete inventory.");
      }
    }
    checks++;
  }
} finally { globalThis.fetch = originalFetch; }
console.log(`PASS ${checks} context retrieval cases: actual combined800+400 query and contents, per-radius centres/status/caps, source identity reuse, valid empty versus partial/invalid/oversize/timeout, bounded attempts, private diagnostic exclusion and mutation-sensitive oracles. External network/provider calls0.`);
