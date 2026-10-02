import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%3Dfn%3D%3Efn", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) return next(`${specifier}.ts`, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && url.endsWith(".ts")) return { format: "module", shortCircuit: true, source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url }) };
    return next(url, context);
  }
});

const { buildOverpassCombinedContextQuery, buildLivePointObjectEvidencePack, normalizeOverpassUrbanFabric } = await import("../src/lib/prototype/point-to-object-live-evidence");
const { normalizePointObjectContext, parseNormalizedPointObjectContext } = await import("../src/lib/prototype/point-to-object-normalized-context");
let checks = 0;
const check = (value: unknown, message: string) => { assert.ok(value, message); checks++; };
const point: [number, number] = [55.27, 25.2];
const query = buildOverpassCombinedContextQuery(point);
check(query.includes("around:800,") && query.includes("around:400,"), "source query retains both declared scopes");
check(query.includes(")->.nearby;") && query.includes(")->.uses;") && query.endsWith("out tags center 440;"), "both scopes feed one bounded output");
check((query.match(/\[out:json\]/g) ?? []).length === 1 && query.includes("[timeout:4][maxsize:33554432]"), "one response with original execution guards");

const elements = [
  { type: "node", id: 123, lon: 55.27, lat: 25.2, tags: { name: "Selected school", amenity: "school" } },
  { type: "node", id: 124, lon: 55.271, lat: 25.2, tags: { name: "Nearby school", amenity: "school" } },
  { type: "way", id: 125, center: { lon: 55.272, lat: 25.2 }, tags: { name: "Office", building: "office" } },
  { type: "way", id: 126, center: { lon: 55.273, lat: 25.2 }, tags: { name: "Industrial school fixture", building: "industrial", amenity: "school" } },
  { type: "node", id: 127, lon: 55.276, lat: 25.2, tags: { name: "Outer school", amenity: "school" } }
];
const originalFetch = globalThis.fetch;
let injectedSourceRequests = 0;
globalThis.fetch = async (url, init) => {
  injectedSourceRequests++;
  check(Boolean(init?.signal), "source dispatch has bounded signal");
  const actual = new URL(String(url)).searchParams.get("data") ?? "";
  if (actual.includes("out body geom 1")) return Response.json({ elements: [elements[0]] });
  assert.equal(actual, query);
  return Response.json({ elements, osm3s: { timestamp_osm_base: "2026-10-02T12:00:00Z" } });
};
try {
  const pack = await buildLivePointObjectEvidencePack({ longitude: point[0], latitude: point[1], osmFeatureId: "node/123", locale: "en", expectedCountryCode: "ae", deadlineAtMs: Date.now() + 12_000 });
  check(injectedSourceRequests === 2, "exact + one combined enrichment, not two enrichments/retries");
  check(pack.geoContext.sampleSize === 4 && pack.geoContext.coverage === "available", "400m sample excludes outer returned centre");
  check(pack.nearbyContext.every(place => place.sourceFeatureId !== "node/123" && Array.isArray(place.coordinates)), "public place positions retain source centres and exclude subject");
  const normalized = normalizePointObjectContext(pack);
  check(parseNormalizedPointObjectContext(normalized), "actual builder produces valid common context");
  check(normalized.places.every(place => place.id !== "node/127") && normalized.places.find(place => place.id === "way/126")?.group === "industrial", "spatial display uses the same primary inventory classification");
  check(Boolean(pack.source.fabricAcquiredAt) && pack.source.fabricAcquiredAt === pack.source.contextAcquiredAt && normalized.source.acquiredAt === pack.source.fabricAcquiredAt, "actual source acquisition timestamp is shared, not cache delivery time");
  check(normalizeOverpassUrbanFabric({ elements: Array.from({ length: 440 }, (_, i) => ({ ...elements[1], id: i + 1000 })) }, point, 440).capReached, "global cap remains explicitly partial");
} finally { globalThis.fetch = originalFetch; }
console.log(JSON.stringify({ status: "PASS", checks, injectedSourceRequests, networkCalls: 0, coverage: "combined source query, actual builder, centres, classification, timestamps and cap" }));
