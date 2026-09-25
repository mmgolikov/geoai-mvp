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

const { buildOverpassUrbanFabricQuery, normalizeOverpassUrbanFabric, resolveLiveNearbyContext,
  buildLivePointObjectEvidencePack } = await import("../src/lib/prototype/point-to-object-live-evidence.ts");
const { rememberExactFindElements } = await import("../src/lib/prototype/point-to-object-exact-source.ts");
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
    { type: "way", id: 2, center: { lon: 55.2701, lat: 25.2001 }, tags: { building: "apartments", "building:levels": "8" } },
    { type: "node", id: 3, lon: 55.2702, lat: 25.2002, tags: { amenity: "school", name: "Fixture school" } },
    { type: "way", id: 4, center: { lon: 55.28, lat: 25.2 }, tags: { building: "hotel" } }
  ]
};
const profile = normalizeOverpassUrbanFabric(fixture, point);
assert.equal(profile.coverage, "available");
assert.equal(profile.sampleSize, 2, "A feature centre outside 400m cannot enter the profile even if its boundary intersects the circle.");
assert.equal(profile.mappedBuildingCount, 1);
assert.equal(profile.medianMappedLevels, 8);
assert.deepEqual(new Set(profile.groups.map(item => item.group)), new Set(["residential", "education"]));
checks++;

// Exercise the real retrieval + pack assembly boundary without network calls.
// Existing Find subject is reused; only two bounded enrichments may dispatch.
const originalFetch = globalThis.fetch;
const cases = [
  { name: "valid", response: () => Response.json(fixture), status: "available", diagnostic: null },
  { name: "empty", response: () => Response.json({ elements: [] }), status: "available", diagnostic: null },
  { name: "partial", response: () => Response.json({ ...fixture, remark: "runtime timeout" }), status: "unavailable", diagnostic: "invalid_response" },
  { name: "malformed", response: () => Response.json({ elements: null }), status: "unavailable", diagnostic: "invalid_response" },
  { name: "oversize", response: () => new Response("ignored", { headers: { "content-length": String(512 * 1024 + 1) } }), status: "unavailable", diagnostic: "response_too_large" },
  { name: "timeout", response: () => new Response("private provider diagnostics", { status: 504 }), status: "unavailable", diagnostic: "timeout" }
];
try {
  for (const testCase of cases) {
    let requests = 0;
    rememberExactFindElements({ elements: [{ type: "node", id: 1, lon: point[0], lat: point[1], tags: { amenity: "school", name: "Subject fixture" } }] }, new Date().toISOString());
    globalThis.fetch = async (url, init) => {
      requests++;
      const requestQuery = new URL(url).searchParams.get("data");
      assert.ok(!requestQuery.includes("out body geom 1"), "Do not reacquire the exact Find subject.");
      assert.equal(init.redirect, "error");
      assert.equal(init.cache, "no-store", "Only validated results may enter the application cache.");
      assert.ok(init.signal);
      return testCase.response();
    };
    const pack = await buildLivePointObjectEvidencePack({ longitude: point[0], latitude: point[1], osmFeatureId: "node/1", locale: "en", expectedCountryCode: "ae" });
    assert.equal(requests, 2, `${testCase.name}: no retries or subject reacquisition`);
    assert.equal(pack.source.contextStatus, testCase.status);
    assert.equal(pack.geoContext.coverage, testCase.status);
    assert.equal(pack.source.fabricDiagnostic.failureCode, testCase.diagnostic);
    assert.equal(pack.source.contextDiagnostic.failureCode, testCase.diagnostic);
    assert.equal(pack.source.wikidataStatus, "not_requested_no_qid");
    if (testCase.status === "unavailable") {
      assert.equal(pack.source.fabricResponseHash, null);
      assert.equal(pack.source.contextResponseHash, null);
      assert.deepEqual(pack.geoContext.groups, []);
      assert.ok(!JSON.stringify(pack).includes("private provider diagnostics"));
    }
    checks++;
  }
} finally { globalThis.fetch = originalFetch; }
console.log(`PASS ${checks} context retrieval cases: shared spatial query, radius, source identity reuse, valid empty versus partial/invalid/oversize/timeout, bounded attempts, private diagnostic exclusion.`);
