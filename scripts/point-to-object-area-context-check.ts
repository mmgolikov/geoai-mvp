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
  POINT_OBJECT_AREA_QUERY_TIMEOUT_SECONDS,
  POINT_OBJECT_AREA_UPSTREAM_MEMORY_MAX_BYTES,
  PointObjectAreaContextPayloadError
} = await import("../src/lib/prototype/point-to-object-area-context-contract");
const {
  PointObjectAreaContextError,
  resolvePointObjectAreaContext
} = await import("../src/lib/prototype/point-to-object-area-context");
const { isPointObjectAreaContextResult } = await import("../src/lib/prototype/point-to-object-create-result");

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
assert.equal(POINT_OBJECT_AREA_QUERY_TIMEOUT_SECONDS, 12);
assert.match(query, /\[timeout:12\]/);
assert.doesNotMatch(query, /\[timeout:6\]/);
assert.match(query, new RegExp(`\\[maxsize:${POINT_OBJECT_AREA_UPSTREAM_MEMORY_MAX_BYTES}\\]`));
assert.equal(query.includes("maxsize:524288"), false, "Overpass execution memory must not reuse the 512 KiB HTTP response cap.");
assert.equal(query.split("\n").filter((line) => /^(?:nwr|node|way)\(poly:/.test(line)).length, 12,
  "The timeout resilience change must not broaden the bounded selector count.");
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

const decimalResult = normalizePointObjectAreaContext({
  osm3s: { timestamp_osm_base: "2026-09-04T06:00:00Z" },
  elements: [
    { type: "way", id: 21, center: { lon: 55.271, lat: 25.206 }, tags: { name: "Decimal Tower", building: "office", "building:levels": "2.5" } },
    { type: "way", id: 22, center: { lon: 55.2715, lat: 25.2065 }, tags: { name: "Half-level block", building: "apartments", "building:levels": "0.5" } }
  ]
}, request.value, "2026-09-04T06:01:00Z");
assert.equal(decimalResult.features[0]?.mappedBuildingLevels, 2.5,
  "The producer must preserve its normalized one-decimal mapped level without rounding.");
assert.equal(decimalResult.features[0]?.observedTags["building:levels"], "2.5",
  "Consumer alignment must not alter the source tag retained in observed facts.");
assert.equal(decimalResult.features[1]?.mappedBuildingLevels, 0.5,
  "The complete producer/consumer result must accept a positive decimal below one.");
assert.equal(decimalResult.features[1]?.observedTags["building:levels"], "0.5",
  "Sub-one producer values must retain their exact source tag.");
assert.equal(decimalResult.summary.mappedLevelsKnownCount, 2);
assert.equal(decimalResult.summary.medianMappedLevels, 1.5,
  "The producer summary must retain its existing one-decimal median rule.");
assert.equal(isPointObjectAreaContextResult(decimalResult), true,
  "A producer-normalized one-decimal mapped level must pass the full production consumer contract.");

function withFirstMappedLevel(value: unknown) {
  const candidate: any = structuredClone(decimalResult);
  candidate.features[0].mappedBuildingLevels = value;
  return candidate;
}

for (const invalidLevel of [2.55, 0, 200.1, 200.5, 201.5, 299.9, 300.1, -0.1, -2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.equal(isPointObjectAreaContextResult(withFirstMappedLevel(invalidLevel)), false,
    `Mapped level must belong to the producer-decimal or legacy-integer contract: ${String(invalidLevel)}`);
}

for (let tick = 1; tick <= 2_000; tick += 1) {
  const producerLevel = tick / 10;
  const producerTickResult = withFirstMappedLevel(producerLevel);
  producerTickResult.summary.medianMappedLevels = Number(((producerLevel + 0.5) / 2).toFixed(1));
  assert.equal(isPointObjectAreaContextResult(producerTickResult), true,
    `Every producer-valid one-decimal tick from 0.1 through 200 must pass the consumer: ${producerLevel}`);
}

for (const boundaryLevel of [0.1, 200, 201, 300]) {
  const boundaryResult = withFirstMappedLevel(boundaryLevel);
  boundaryResult.summary.medianMappedLevels = Number(((boundaryLevel + 0.5) / 2).toFixed(1));
  assert.equal(isPointObjectAreaContextResult(boundaryResult), true,
    `Producer and legacy integer boundaries must remain accepted: ${boundaryLevel}`);
}
for (let legacyLevel = 201; legacyLevel <= 300; legacyLevel += 1) {
  const legacyResult = withFirstMappedLevel(legacyLevel);
  legacyResult.summary.medianMappedLevels = Number(((legacyLevel + 0.5) / 2).toFixed(1));
  assert.equal(isPointObjectAreaContextResult(legacyResult), true,
    `Historical whole-integer mapped levels from 201 through 300 must remain readable: ${legacyLevel}`);
}
const nullableLevelResult = withFirstMappedLevel(null);
nullableLevelResult.summary.mappedLevelsKnownCount = 1;
nullableLevelResult.summary.medianMappedLevels = 0.5;
assert.equal(isPointObjectAreaContextResult(nullableLevelResult), true,
  "A null mapped level must remain valid when the summary reflects the remaining known level.");

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

let runtimeTimeoutCalls = 0;
await assert.rejects(
  resolvePointObjectAreaContext(request.value, async () => {
    runtimeTimeoutCalls += 1;
    return {
      elements: [],
      remark: "runtime error: Query timed out in query at line 1 after 7 seconds."
    };
  }),
  (error: unknown) => error instanceof PointObjectAreaContextError && error.httpStatus === 504 && error.retryable,
  "An HTTP 200 Overpass timeout remark must retain timeout semantics."
);
assert.equal(runtimeTimeoutCalls, 1, "A retryable Overpass runtime timeout must remain one upstream attempt.");

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
