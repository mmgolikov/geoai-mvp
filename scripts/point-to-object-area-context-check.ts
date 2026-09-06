import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    }
    if (specifier === "next/cache") {
      const cacheStub = `export const unstable_cache = (callback) => {
        const values = new Map();
        return async (...args) => {
          const key = JSON.stringify(args);
          if (values.has(key)) return values.get(key);
          const value = await callback(...args);
          values.set(key, value);
          return value;
        };
      };`;
      return {
        url: `data:text/javascript,${encodeURIComponent(cacheStub)}`,
        shortCircuit: true
      };
    }
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
  parsePointObjectAreaContextRequest,
  POINT_OBJECT_AREA_UPSTREAM_MEMORY_MAX_BYTES,
  PointObjectAreaContextPayloadError
} = await import("../src/lib/prototype/point-to-object-area-context-contract");
const {
  PointObjectAreaContextError,
  resolvePointObjectAreaContext
} = await import("../src/lib/prototype/point-to-object-area-context");

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
assert.match(query, new RegExp(`\\[maxsize:${POINT_OBJECT_AREA_UPSTREAM_MEMORY_MAX_BYTES}\\]`));
assert.equal(query.includes("maxsize:524288"), false, "Overpass execution memory must not reuse the 512 KiB HTTP response cap.");
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

const legitimateEmpty = normalizePointObjectAreaContext({
  osm3s: { timestamp_osm_base: "2026-09-04T06:00:00Z" },
  elements: []
}, request.value, "2026-09-04T06:01:00Z");
assert.equal(legitimateEmpty.mode, "empty");
assert.equal(legitimateEmpty.coverage.upstreamElementCount, 0);

for (const invalidPayload of [
  {},
  { elements: null },
  {
    elements: [],
    remark: "runtime error: Query ran out of memory in query. It would need at least 2 MB of RAM to continue."
  },
  {
    elements: [],
    remark: "runtime error: Query timed out in query at line 1 after 7 seconds."
  }
]) {
  assert.throws(
    () => normalizePointObjectAreaContext(invalidPayload, request.value),
    PointObjectAreaContextPayloadError,
    "Malformed or runtime-failed Overpass payloads must not be normalized into zero coverage."
  );
}

await assert.rejects(
  resolvePointObjectAreaContext(request.value, async () => ({
    elements: [],
    remark: "runtime error: Query ran out of memory in query. It would need at least 2 MB of RAM to continue."
  })),
  (error: unknown) => error instanceof PointObjectAreaContextError && error.httpStatus === 502 && error.retryable,
  "An HTTP 200 Overpass runtime failure must become a retryable upstream error, never empty coverage."
);

await assert.rejects(
  resolvePointObjectAreaContext(request.value, async () => ({
    elements: [],
    remark: "runtime error: Query timed out in query at line 1 after 7 seconds."
  })),
  (error: unknown) => error instanceof PointObjectAreaContextError && error.httpStatus === 504 && error.retryable,
  "An HTTP 200 Overpass timeout remark must retain timeout semantics."
);

const originalFetch = globalThis.fetch;
let upstreamFetchCount = 0;
try {
  globalThis.fetch = async () => {
    upstreamFetchCount += 1;
    const payload = upstreamFetchCount === 1
      ? { elements: [], remark: "runtime error: Query ran out of memory." }
      : { osm3s: { timestamp_osm_base: "2026-09-04T06:00:00Z" }, elements: [] };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
  await assert.rejects(
    resolvePointObjectAreaContext(request.value),
    (error: unknown) => error instanceof PointObjectAreaContextError && error.httpStatus === 502,
    "A runtime-failed HTTP 200 payload must reject before entering the validated response cache."
  );
  const recovered = await resolvePointObjectAreaContext(request.value);
  assert.equal(recovered.mode, "empty", "A later valid zero-element response must recover as honest empty coverage.");
  assert.equal(upstreamFetchCount, 2, "The failed payload must not prevent a new provider attempt.");
  await resolvePointObjectAreaContext(request.value);
  assert.equal(upstreamFetchCount, 2, "Only the later validated response may be reused from cache.");
} finally {
  globalThis.fetch = originalFetch;
}

for (const invalid of [
  { ...request.value, marketKey: "unsupported" },
  { ...request.value, aoiCoordinates: [[...request.value.aoiCoordinates[0].slice(0, -1)]] },
  { ...request.value, aoiCoordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
  { ...request.value, extra: true }
]) {
  assert.equal(parsePointObjectAreaContextRequest(invalid).ok, false);
}

console.log("Point-to-object bounded AOI context contract passed.");
