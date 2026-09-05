import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";

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

const ROOT = process.cwd();
const marketsModule = await import("../src/lib/prototype/point-to-object-markets");
const markets = marketsModule.POINT_OBJECT_MARKETS;
const autocompletePath = path.join(ROOT, "src/lib/prototype/point-to-object-autocomplete.ts");
const autocompleteSource = readFileSync(autocompletePath, "utf8");
const marketStub = `
const POINT_OBJECT_MARKETS = ${JSON.stringify(markets)};
const MARKET_BY_KEY = new Map(POINT_OBJECT_MARKETS.map((market) => [market.key, market]));
const isPointObjectLocale = (value) => value === "en" || value === "ru";
const isPointObjectMarketKey = (value) => typeof value === "string" && MARKET_BY_KEY.has(value);
const pointObjectMarket = (key) => MARKET_BY_KEY.get(key) ?? POINT_OBJECT_MARKETS[0];
const POINT_OBJECT_AUTOCOMPLETE_CJK_PATTERN = /[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}]/u;
const pointObjectAutocompleteMinimumCharacters = (query) => POINT_OBJECT_AUTOCOMPLETE_CJK_PATTERN.test(query) ? 2 : 3;
const pointObjectAutocompleteQueryReady = (query) => {
  const normalized = query.normalize("NFKC").replace(/\\s/gu, "");
  return Array.from(normalized).length >= pointObjectAutocompleteMinimumCharacters(normalized);
};
`;
const transformedSource = autocompleteSource
  .replace('import "server-only";\n', "")
  .replace(/import \{[\s\S]*?\} from "\.\/point-to-object-markets";\n/, marketStub);
const javascript = stripTypeScriptTypes(transformedSource, { mode: "transform", sourceMap: false });
const autocomplete = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`) as Record<string, unknown>;

const parseRequest = autocomplete.parsePointObjectAutocompleteRequest as (value: unknown) =>
  | { ok: true; value: { marketKey: string; locale: string; query: string } }
  | { ok: false; error: string };
const buildUrl = autocomplete.buildPhotonAutocompleteUrl as (
  request: { marketKey: string; locale: string; query: string },
  endpoint?: URL
) => URL;
const normalizePayload = autocomplete.normalizePhotonAutocompletePayload as (
  payload: unknown,
  request: { marketKey: string; locale: string; query: string }
) => Array<Record<string, unknown>>;
const suggest = autocomplete.suggestPointObjects as (
  request: { marketKey: string; locale: string; query: string },
  loader: (url: URL) => Promise<unknown>
) => Promise<Record<string, unknown>>;
const fetchPayload = autocomplete.fetchPhotonAutocompletePayload as (
  url: URL,
  fetchImplementation: (input: URL | RequestInfo, init?: RequestInit & { next?: { revalidate: number } }) => Promise<Response>
) => Promise<unknown>;

assert.equal(marketsModule.pointObjectAutocompleteMinimumCharacters("Dubai"), 3);
assert.equal(marketsModule.pointObjectAutocompleteMinimumCharacters("中環"), 2);
assert.equal(marketsModule.pointObjectAutocompleteQueryReady("Du"), false);
assert.equal(marketsModule.pointObjectAutocompleteQueryReady("Dub"), true);
assert.equal(marketsModule.pointObjectAutocompleteQueryReady("中環"), true);

const parsed = parseRequest({ marketKey: "dubai", locale: "en", query: "  Marina\u0000   Bay  " });
assert.equal(parsed.ok, true);
if (!parsed.ok) throw new Error("Expected the valid autocomplete request to parse.");
assert.equal(parsed.value.query, "Marina Bay");
assert.equal(parseRequest({ marketKey: "dubai", locale: "en", query: "Ma" }).ok, false,
  "Latin autocomplete must require three non-space characters.");
assert.equal(parseRequest({ marketKey: "hong_kong", locale: "en", query: "中環" }).ok, true,
  "CJK autocomplete must accept two characters.");
assert.equal(parseRequest({ marketKey: "dubai", locale: "en", query: "Marina", extra: true }).ok, false,
  "Autocomplete must reject unknown request fields.");
assert.equal(parseRequest({ marketKey: "unsupported", locale: "en", query: "Marina" }).ok, false);

for (const market of markets) {
  const url = buildUrl(
    { marketKey: market.key, locale: "ru", query: "Central" },
    new URL("https://photon.example.test/geocoder/")
  );
  const [[west, south], [east, north]] = market.bounds;
  assert.equal(url.href.startsWith("https://photon.example.test/geocoder/api/?"), true);
  assert.equal(url.searchParams.get("q"), "Central");
  assert.equal(url.searchParams.get("bbox"), `${west},${south},${east},${north}`);
  assert.equal(url.searchParams.get("countrycode"), market.countryCode.toUpperCase());
  assert.equal(url.searchParams.get("lat"), market.center[1].toFixed(6));
  assert.equal(url.searchParams.get("lon"), market.center[0].toFixed(6));
  assert.equal(url.searchParams.get("zoom"), "12");
  assert.equal(url.searchParams.get("location_bias_scale"), "0.2");
  assert.equal(url.searchParams.get("lang"), "ru");
  assert.equal(url.searchParams.get("limit"), "5");
  assert.equal(url.searchParams.get("dedupe"), "1");
}

const dubaiRequest = { marketKey: "dubai", locale: "en", query: "Marina" };
const validFeature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [55.275, 25.205] },
  properties: {
    name: "Marina Tower",
    housenumber: "1",
    street: "Marina Walk",
    city: "Dubai",
    country: "United Arab Emirates",
    countrycode: "AE",
    osm_key: "building",
    osm_value: "commercial",
    osm_type: "W",
    osm_id: 12345,
    extent: [55.27, 25.21, 55.28, 25.20]
  }
};
const normalized = normalizePayload({
  type: "FeatureCollection",
  features: [
    validFeature,
    validFeature,
    { ...validFeature, properties: { ...validFeature.properties, osm_id: 12346, countrycode: "SG" } },
    { ...validFeature, geometry: { type: "Point", coordinates: [56.1, 25.2] }, properties: { ...validFeature.properties, osm_id: 12347 } }
  ]
}, dubaiRequest);
assert.equal(normalized.length, 1, "Only unique in-market results with the exact country code may pass.");
assert.deepEqual(normalized[0], {
  id: "way/12345",
  label: "Marina Tower",
  secondaryLabel: "1, Marina Walk, Dubai, United Arab Emirates",
  longitude: 55.275,
  latitude: 25.205,
  category: "building",
  featureType: "commercial",
  boundingBox: [25.2, 25.21, 55.27, 55.28]
});

let injectedHostname = "";
const response = await suggest(dubaiRequest, async (url) => {
  injectedHostname = url.hostname;
  return { type: "FeatureCollection", features: [validFeature] };
});
assert.equal(injectedHostname, "photon.komoot.io");
assert.equal(response.protocol, "POINT_TO_OBJECT_001_AUTOCOMPLETE_V1");
assert.equal(response.mode, "results");
assert.equal(response.provider, "Photon");
assert.equal((response.results as unknown[]).length, 1);
assert.equal((response.source as Record<string, unknown>).officialStatus, "open_context_not_official");

let observedInit: (RequestInit & { next?: { revalidate: number } }) | undefined;
const loaded = await fetchPayload(new URL("https://photon.example.test/api?q=Marina"), async (_input, init) => {
  observedInit = init;
  return new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), {
    status: 200,
    headers: { "Content-Type": "application/geo+json" }
  });
});
assert.deepEqual(loaded, { type: "FeatureCollection", features: [] });
assert.equal(observedInit?.method, "GET");
assert.equal(observedInit?.redirect, "error");
assert.equal(observedInit?.cache, "force-cache");
assert.equal(observedInit?.next?.revalidate, 86_400);
assert.equal((observedInit?.headers as Record<string, string>)["User-Agent"].startsWith("GeoAI-PointToObject-Preview/"), true);
assert.ok(observedInit?.signal, "Photon calls must carry the bounded timeout signal.");

await assert.rejects(
  () => fetchPayload(new URL("https://photon.example.test/api?q=Marina"), async () => new Response("{}", {
    status: 200,
    headers: { "Content-Length": String(256 * 1024 + 1) }
  })),
  (error: unknown) => error instanceof Error && "code" in error && error.code === "PHOTON_RESPONSE_TOO_LARGE"
);
await assert.rejects(
  () => fetchPayload(new URL("https://photon.example.test/api?q=Marina"), async () => new Response("rate limited", { status: 429 })),
  (error: unknown) => error instanceof Error && "code" in error && error.code === "PHOTON_RATE_LIMITED"
);

const routeSource = readFileSync(path.join(ROOT, "app/api/prototype/point-to-object/suggest/route.ts"), "utf8");
const previewIndex = routeSource.indexOf("if (!previewRuntimeAllowed())");
const originIndex = routeSource.indexOf("if (!sameOrigin(request))");
const bodyIndex = routeSource.indexOf("await readBoundedJson(request, 1_024)");
const parseIndex = routeSource.indexOf("parsePointObjectAutocompleteRequest(", bodyIndex);
const rateIndex = routeSource.indexOf("consumeRateLimit(request)", parseIndex);
const providerIndex = routeSource.indexOf("suggestPointObjects(", rateIndex);
assert.ok(previewIndex >= 0 && originIndex > previewIndex && bodyIndex > originIndex && parseIndex > bodyIndex && rateIndex > parseIndex && providerIndex > rateIndex,
  "Preview, same-origin, body, parser and rate gates must run before Photon.");
assert.match(routeSource, /private, no-store/);
assert.equal(routeSource.includes("Nominatim"), false, "Autocomplete must not be routed through public Nominatim.");
const explicitSearchSource = readFileSync(path.join(ROOT, "app/api/prototype/point-to-object/search/route.ts"), "utf8");
assert.match(explicitSearchSource, /searchLivePointObjects\(/,
  "The explicit Nominatim search route must remain separate and unchanged in responsibility.");

const clientSource = readFileSync(path.join(ROOT, "components/point-to-object/prototype-client-v5.tsx"), "utf8");
assert.match(clientSource, /POINT_OBJECT_MARKETS, pointObjectAutocompleteQueryReady/,
  "The client and server must share the exact autocomplete threshold helper.");
assert.match(clientSource, /if \(!pointObjectAutocompleteQueryReady\(query\) \|\| query === committedSearchQueryRef\.current\)/,
  "The client must honor the shared two-character CJK and three-character default threshold.");
const clientSuggestIndex = clientSource.indexOf('fetch("/api/prototype/point-to-object/suggest"');
const clientAbortIndex = clientSource.lastIndexOf("suggestionRequestRef.current?.abort()", clientSuggestIndex);
const clientControllerIndex = clientSource.lastIndexOf("const controller = new AbortController()", clientSuggestIndex);
const clientDebounceIndex = clientSource.lastIndexOf("window.setTimeout", clientSuggestIndex);
assert.ok(clientAbortIndex >= 0 && clientControllerIndex > clientAbortIndex && clientDebounceIndex > clientControllerIndex && clientSuggestIndex > clientDebounceIndex,
  "Autocomplete must abort the previous request before constructing and dispatching the debounced replacement.");
const clientSuggestEffectEnd = clientSource.indexOf("}, [locale, locationKey, searchQuery])", clientSuggestIndex);
assert.match(clientSource.slice(clientDebounceIndex, clientSuggestEffectEnd), /}, 600\);/,
  "Autocomplete must retain the bounded 600 ms debounce.");
assert.match(clientSource.slice(clientSuggestIndex, clientSuggestIndex + 500), /signal: controller\.signal/,
  "Autocomplete requests must remain abortable.");
assert.match(clientSource, /setSuggestionStatus\(payload\.results\.length \? "idle" : "empty"\)/,
  "A valid empty autocomplete payload must enter an explicit empty state.");
assert.match(clientSource, /suggestionStatus === "empty" \|\| suggestionStatus === "error"/,
  "Localized empty and error states must be visibly rendered.");
for (const key of ["ArrowDown", "ArrowUp", "Enter", "Escape"]) {
  assert.match(clientSource, new RegExp(`event\\.key === "${key}"`), `Autocomplete keyboard handling is missing ${key}.`);
}
const chooseResultIndex = clientSource.indexOf("function chooseSearchResult");
const keyHandlerIndex = clientSource.indexOf("function handleSearchKeyDown", chooseResultIndex);
const selectionBlock = clientSource.slice(chooseResultIndex, keyHandlerIndex);
assert.match(selectionBlock, /setMode\("analyse"\)/,
  "Selecting a suggestion must return the product to Analyse mode.");
assert.match(selectionBlock, /setNavigationTarget\([\s\S]*boundingBox: result\.boundingBox/,
  "Selecting a suggestion must pan or fit the map using the sanitized result extent.");
assert.match(clientSource, /fetch\("\/api\/prototype\/point-to-object\/search"/,
  "Explicit submit must retain the separate Nominatim search fallback.");

const routeRuntimeStub = `
const NextResponse = {
  json(body, init = {}) {
    return new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) }
    });
  }
};
const getPointObjectPreviewSurfaceStatus = () => ({ enabled: process.env.GEOAI_AUTOCOMPLETE_ROUTE_TEST_ENABLED === "1" });
const readBoundedJson = async (request, maximumBytes) => {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) return { ok: false, status: 413 };
  try { return { ok: true, value: JSON.parse(text) }; } catch { return { ok: false, status: 400 }; }
};
const parsePointObjectAutocompleteRequest = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !["marketKey", "locale", "query"].includes(key))) return { ok: false, error: "invalid" };
  const query = typeof value.query === "string" ? value.query.trim() : "";
  if (value.marketKey !== "dubai" || !["en", "ru"].includes(value.locale) || Array.from(query.replace(/\\s/gu, "")).length < 3) return { ok: false, error: "invalid" };
  return { ok: true, value: { marketKey: value.marketKey, locale: value.locale, query } };
};
class PointObjectAutocompleteError extends Error {
  constructor(code, httpStatus, message, retryable) { super(message); this.code = code; this.httpStatus = httpStatus; this.retryable = retryable; }
}
const suggestPointObjects = async (request) => {
  if (request.query === "provider failure") throw new PointObjectAutocompleteError("PHOTON_UNAVAILABLE", 502, "Place suggestions are temporarily unavailable.", true);
  return { protocol: "POINT_TO_OBJECT_001_AUTOCOMPLETE_V1", mode: "results", provider: "Photon", results: [], source: { officialStatus: "open_context_not_official" } };
};
`;
const routeRuntimeSource = routeSource
  .replace('import { NextResponse } from "next/server";', routeRuntimeStub)
  .replace(/import \{ getPointObjectPreviewSurfaceStatus \} from "@\/src\/lib\/ai\/openai-upstream-gate";\n/, "")
  .replace(/import \{ readBoundedJson \} from "@\/src\/lib\/http\/bounded-json";\n/, "")
  .replace(/import \{\n\s+parsePointObjectAutocompleteRequest,[\s\S]*?\n\} from "@\/src\/lib\/prototype\/point-to-object-autocomplete";\n/, "");
const routeRuntimeJavascript = stripTypeScriptTypes(routeRuntimeSource, { mode: "transform", sourceMap: false });
const routeRuntime = await import(`data:text/javascript;base64,${Buffer.from(routeRuntimeJavascript).toString("base64")}`) as {
  POST(request: Request): Promise<Response>;
};
function routeRequest(body: string, options: { origin?: string; ip?: string } = {}): Request {
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-forwarded-host": "preview.example.test",
    "x-forwarded-proto": "https",
    "x-forwarded-for": options.ip ?? "203.0.113.10"
  });
  if (options.origin) headers.set("Origin", options.origin);
  return new Request("https://preview.example.test/api/prototype/point-to-object/suggest", { method: "POST", headers, body });
}
const validRouteBody = JSON.stringify({ marketKey: "dubai", locale: "en", query: "Marina" });
const previousRouteTestEnabled = process.env.GEOAI_AUTOCOMPLETE_ROUTE_TEST_ENABLED;
process.env.GEOAI_AUTOCOMPLETE_ROUTE_TEST_ENABLED = "0";
const previewDenied = await routeRuntime.POST(routeRequest(validRouteBody, { origin: "https://preview.example.test" }));
assert.equal(previewDenied.status, 403);
assert.equal((await previewDenied.json() as { code?: string }).code, "AUTOCOMPLETE_DISABLED");
process.env.GEOAI_AUTOCOMPLETE_ROUTE_TEST_ENABLED = "1";
const originDenied = await routeRuntime.POST(routeRequest(validRouteBody));
assert.equal(originDenied.status, 403);
assert.equal((await originDenied.json() as { code?: string }).code, "AUTOCOMPLETE_ORIGIN_INVALID");
const invalidRequest = await routeRuntime.POST(routeRequest(JSON.stringify({ marketKey: "dubai", locale: "en", query: "Marina", extra: true }), { origin: "https://preview.example.test" }));
assert.equal(invalidRequest.status, 400);
const oversizedRequest = await routeRuntime.POST(routeRequest(JSON.stringify({ marketKey: "dubai", locale: "en", query: "x".repeat(1_100) }), { origin: "https://preview.example.test" }));
assert.equal(oversizedRequest.status, 413);
const providerFailure = await routeRuntime.POST(routeRequest(JSON.stringify({ marketKey: "dubai", locale: "en", query: "provider failure" }), { origin: "https://preview.example.test", ip: "203.0.113.20" }));
assert.equal(providerFailure.status, 502);
assert.equal((await providerFailure.json() as { code?: string }).code, "PHOTON_UNAVAILABLE");
let rateLimited: Response | null = null;
for (let index = 0; index <= 60; index += 1) {
  rateLimited = await routeRuntime.POST(routeRequest(validRouteBody, { origin: "https://preview.example.test", ip: "203.0.113.30" }));
}
assert.equal(rateLimited?.status, 429);
assert.equal(rateLimited?.headers.get("Cache-Control"), "private, no-store, max-age=0");
assert.ok(Number(rateLimited?.headers.get("Retry-After")) >= 1);
if (previousRouteTestEnabled === undefined) delete process.env.GEOAI_AUTOCOMPLETE_ROUTE_TEST_ENABLED;
else process.env.GEOAI_AUTOCOMPLETE_ROUTE_TEST_ENABLED = previousRouteTestEnabled;

console.log(`Point-to-object Photon autocomplete contract passed for ${markets.length} markets without live network access.`);
