import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

// Execute the real source adapter offline; bypass only framework cache/server markers.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%20%3D%20fn%20%3D%3E%20fn", shortCircuit: true };
    const routeAdapters: Record<string, string> = {
      "next/server": "export const NextResponse = { json: (body, init) => Response.json(body, init) };",
      "@/src/lib/ai/openai-upstream-gate": "export const getPointObjectSurfaceStatus = () => ({enabled:true});",
      "@/src/lib/auth/require-pilot-identity": "export const requirePilotIdentity = async () => globalThis.__night21Authorized ? {allowed:true} : {allowed:false,response:Response.json({mode:'unavailable'}, {status:401})}; export const requirePilotMutationOrigin = () => null;"
    };
    if (routeAdapters[specifier]) return { url: `data:text/javascript,${encodeURIComponent(routeAdapters[specifier])}`, shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".ts")) return {
      format: "module", shortCircuit: true,
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url })
    };
    return nextLoad(url, context);
  }
});

const { buildLivePointObjectEvidencePack, LivePointEvidenceError } = await import("../src/lib/prototype/point-to-object-live-evidence");
const { rememberExactFindElements } = await import("../src/lib/prototype/point-to-object-exact-source");
const { semanticHash } = await import("../src/lib/point-to-object/hash");
const { parsePublicEvidenceReceipt, PUBLIC_EVIDENCE_LEASE_MS } = await import("../src/lib/prototype/point-to-object-evidence-receipt");
const originalFetch = globalThis.fetch;
const queries: string[] = [];
const climateQueries: string[] = [];
// Adapters intentionally sanitize fetch errors. Keep mock-contract violations
// outside that catch boundary so an assertion cannot masquerade as an outage.
const fetchContractErrors: unknown[] = [];
let nextId = 810001;
function element(id: number, longitude = 55.27) {
  return { type: "way", id, tags: { name: "Synthetic exact-source test building", building: "yes", height: "42" },
    geometry: [
      { lon: longitude, lat: 25.2 }, { lon: longitude + 0.0002, lat: 25.2 },
      { lon: longitude + 0.0002, lat: 25.2002 }, { lon: longitude, lat: 25.2002 }, { lon: longitude, lat: 25.2 }
    ] };
}
function request(id: number) {
  return { longitude: 55.2701, latitude: 25.2001, locale: "en", osmFeatureId: `way/${id}`, expectedCountryCode: "ae" as const, deadlineAtMs: Date.now() + 12_000 };
}
function mockFetch(handler: (query: string) => Response | Promise<Response>, includeClimate = false) {
  queries.length = 0;
  climateQueries.length = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    try {
      assert.equal(init?.redirect, "error");
      assert.ok(init?.signal, "Queue, fetch and body retain a bounded deadline.");
      if (includeClimate && url.origin === "https://power.larc.nasa.gov") {
        assert.equal(url.pathname, "/api/temporal/monthly/point");
        assert.equal(url.searchParams.get("parameters"), "T2M,T2M_MAX,RH2M");
        assert.equal(url.searchParams.get("longitude"), "55.2701");
        assert.equal(url.searchParams.get("latitude"), "25.2001");
        climateQueries.push(url.href);
        return new Response("Synthetic optional climate outage", { status: 503 });
      }
      assert.equal(url.origin, "https://overpass-api.de", "Exact source must never fall back to reverse/nearest search or another provider.");
    } catch (error) {
      fetchContractErrors.push(error);
      throw error;
    }
    const query = url.searchParams.get("data") ?? "";
    queries.push(query);
    return handler(query);
  };
}
let checks = 0;
try {
  const id = nextId++;
  mockFetch((query) => query.includes(`way(${id});`) ? Response.json({ elements: [element(id)] }) : new Response("unavailable", { status: 503 }));
  const pack = await buildLivePointObjectEvidencePack(request(id));
  assert.match(queries[0], new RegExp(`way\\(${id}\\);`), "Mandatory exact-source lookup must take the first source admission slot, before optional context.");
  assert.equal(queries.length, 3);
  assert.equal(pack.selectedObject.sourceFeatureId, `way/${id}`);
  assert.equal(pack.selectedObject.tags["tag.height"], "42");
  assert.equal(pack.displayGeometry?.type, "Polygon");
  assert.equal(pack.source.sourceResponseHash, semanticHash(element(id)));
  assert.equal(pack.source.contextStatus, "unavailable");
  assert.equal(pack.source.fabricStatus, "unavailable");
  assert.equal(pack.source.contextResponseHash, null);
  assert.equal(pack.source.fabricResponseHash, null);
  assert.equal(pack.geoContext.coverage, "unavailable", "An outage must not become a measured zero.");
  assert.equal(pack.climate, undefined, "Legacy direct requests do not implicitly opt into climate.");
  assert.equal(climateQueries.length, 0);
  checks++;

  const cases: Array<{ name: string; response: (id: number) => Response | Promise<Response>; status: number; code: string; retry?: number }> = [
    { name: "fetch timeout", response: () => { throw new DOMException("PRIVATE_PROVIDER_DIAGNOSTIC", "TimeoutError"); }, status: 504, code: "OVERPASS_TIMEOUT" },
    { name: "HTTP timeout", response: () => new Response("PRIVATE_PROVIDER_DIAGNOSTIC", { status: 504 }), status: 504, code: "OVERPASS_TIMEOUT" },
    { name: "HTTP 502", response: () => new Response("PRIVATE_PROVIDER_DIAGNOSTIC", { status: 502 }), status: 502, code: "OVERPASS_UNAVAILABLE" },
    { name: "network failure", response: () => { throw new TypeError("PRIVATE_PROVIDER_DIAGNOSTIC"); }, status: 502, code: "OVERPASS_UNAVAILABLE" },
    { name: "rate limit", response: () => new Response("PRIVATE_PROVIDER_DIAGNOSTIC", { status: 429, headers: { "Retry-After": "37" } }), status: 429, code: "OVERPASS_RATE_LIMITED", retry: 37 },
    { name: "malformed JSON", response: () => new Response("PRIVATE_PROVIDER_DIAGNOSTIC"), status: 502, code: "OVERPASS_RESPONSE_INVALID" },
    { name: "runtime remark", response: () => Response.json({ elements: [], remark: "PRIVATE_PROVIDER_DIAGNOSTIC" }), status: 502, code: "OVERPASS_RESPONSE_INVALID" },
    { name: "wrong schema", response: () => Response.json({ elements: {} }), status: 502, code: "OVERPASS_RESPONSE_INVALID" },
    { name: "oversize header", response: () => new Response("x", { headers: { "Content-Length": String(512 * 1024 + 1) } }), status: 502, code: "OVERPASS_RESPONSE_TOO_LARGE" },
    { name: "oversize stream", response: () => new Response("x".repeat(512 * 1024 + 1)), status: 502, code: "OVERPASS_RESPONSE_TOO_LARGE" },
    { name: "body timeout", response: () => new Response(new ReadableStream({ start(controller) { controller.error(new DOMException("PRIVATE_PROVIDER_DIAGNOSTIC", "TimeoutError")); } })), status: 504, code: "OVERPASS_TIMEOUT" },
    { name: "empty exact result", response: () => Response.json({ elements: [] }), status: 422, code: "OBJECT_NOT_RESOLVED" },
    { name: "multiple results", response: (id) => Response.json({ elements: [element(id), element(id + 1)] }), status: 502, code: "OVERPASS_RESPONSE_INVALID" },
    { name: "identity mismatch", response: (id) => Response.json({ elements: [element(id + 1)] }), status: 409, code: "OBJECT_NOT_RESOLVED" },
    { name: "wrong anchor", response: (id) => Response.json({ elements: [element(id, 56)] }), status: 409, code: "OBJECT_NOT_RESOLVED" }
  ];
  for (const scenario of cases) {
    const id = nextId++;
    mockFetch(() => scenario.response(id));
    await assert.rejects(buildLivePointObjectEvidencePack(request(id)), (error: unknown) => {
      assert.ok(error instanceof LivePointEvidenceError, scenario.name);
      assert.equal(error.httpStatus, scenario.status, scenario.name);
      assert.equal(error.code, scenario.code, scenario.name);
      assert.equal(error.retryAfterSeconds, scenario.retry, scenario.name);
      assert.doesNotMatch(error.message, /PRIVATE_PROVIDER_DIAGNOSTIC/);
      return true;
    });
    assert.equal(queries.length, 1, `${scenario.name}: no retries, optional requests or nearest-object substitution after mandatory failure.`);
    assert.equal(climateQueries.length, 0);
    checks++;
  }

  const warmId = nextId++;
  const acquiredAt = new Date(Date.now() - 1000).toISOString();
  rememberExactFindElements({ elements: [element(warmId)] }, acquiredAt);
  mockFetch(() => new Response("unavailable", { status: 503 }), true);
  // Match the public lease's production acquisition options. An unavailable
  // climate result is still evidence and must participate in the full hash.
  const warm = await buildLivePointObjectEvidencePack({ ...request(warmId), includeClimate: true });
  assert.equal(climateQueries.length, 1, "Exactly one explicit optional climate request; no retry or fallback.");
  assert.equal(warm.climate?.status, "unavailable");
  assert.equal(warm.climate?.status === "unavailable" && warm.climate.reason, "http_error");
  assert.equal(queries.length, 2, "A valid server-owned Find snapshot needs only optional context requests.");
  assert.ok(queries.every((query) => !query.includes(`way(${warmId});`)));
  assert.equal(warm.source.acquiredAt, acquiredAt);
  assert.equal(warm.source.sourceResponseHash, semanticHash(element(warmId)));
  assert.equal(warm.selectedObject.tags["tag.height"], "42");
  assert.deepEqual(warm.displayGeometry, pack.displayGeometry);
  checks++;
  const warmCore = Object.fromEntries(Object.entries(warm).filter(([key]) => !["evidencePackHash", "evidencePackId", "displayGeometry"].includes(key)));
  assert.equal(semanticHash(warmCore), warm.evidencePackHash, "No source or climate field is exempted from the pack hash.");
  const withoutClimate = { ...warmCore };
  delete withoutClimate.climate;
  assert.notEqual(semanticHash(withoutClimate), warm.evidencePackHash, "Omitting optional climate is not the same evidence snapshot.");
  assert.notEqual(semanticHash({ ...warmCore, climate: { ...warm.climate, reason: "network_error" } }), warm.evidencePackHash, "Changing the climate outage evidence must change the pack hash.");
  checks += 2;

  // Actual route + source module. Only framework/runtime/identity adapters are
  // isolated: no credentials, hosted auth or network. This is not auth acceptance.
  const harness = globalThis as typeof globalThis & { __night21Authorized?: boolean };
  const route = await import("../app/api/prototype/point-to-object/context/route");
  function routeRequest(id: number, extra: Record<string, unknown> = {}, origin = "https://preview.example.test") {
    return new Request("https://preview.example.test/api/prototype/point-to-object/context", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ caseKey: "dubai", longitude: 55.2701, latitude: 25.2001, locale: "en", expectedSourceFeatureId: `way/${id}`, ...extra })
    });
  }
  try {
    mockFetch(() => { throw new Error("No source access permitted for rejected input"); });
    harness.__night21Authorized = false;
    assert.equal((await route.POST(routeRequest(nextId++))).status, 401);
    harness.__night21Authorized = true;
    assert.equal((await route.POST(routeRequest(nextId++, {}, "https://other.example.test"))).status, 403);
    assert.equal((await route.POST(routeRequest(nextId++, { evidencePackHash: "client-forged" }))).status, 400);
    assert.equal((await route.POST(routeRequest(nextId++, { displayGeometry: pack.displayGeometry }))).status, 400);
    assert.equal(queries.length, 0, "Denied auth/origin or client-supplied evidence cannot acquire sources.");
    assert.equal(climateQueries.length, 0);
    checks += 4;
    for (const scenario of cases.slice(0, 8)) {
      const id = nextId++;
      mockFetch(() => scenario.response(id));
      const response = await route.POST(routeRequest(id));
      assert.equal(response.status, scenario.status, scenario.name);
      const body = await response.json();
      assert.equal(body.mode, "unavailable");
      assert.equal(body.code, scenario.code);
      assert.equal(response.headers.get("Retry-After"), scenario.retry ? String(scenario.retry) : null);
      assert.match(response.headers.get("Cache-Control") ?? "", /private, no-store/);
      assert.equal(response.headers.get("Vary"), "Cookie");
      assert.doesNotMatch(JSON.stringify(body), /PRIVATE_PROVIDER_DIAGNOSTIC|https?:|elements/);
      assert.equal(queries.length, 1);
      assert.equal(climateQueries.length, 0, "Mandatory source failure prevents optional climate acquisition.");
      checks++;
    }
    mockFetch(() => new Response("unavailable", { status: 503 }), true);
    const response = await route.POST(routeRequest(warmId));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.schemaVersion, 2);
    assert.equal(body.subject.sourceFeatureId, `way/${warmId}`);
    assert.equal(body.subject.renderHeightM, 42);
    assert.equal(body.subject.geometryProvenance, "confirmed_complete_footprint");
    assert.deepEqual(body.subject.displayGeometry, warm.displayGeometry);
    const receipt = parsePublicEvidenceReceipt(body.evidenceReceipt);
    assert.ok(receipt, "Context must return an exact, well-formed public evidence lease.");
    assert.deepEqual(body.subject.evidenceReceipt, receipt, "Subject and response must expose the same source receipt.");
    assert.equal(queries.length, 2, "The route also reuses the original exact Find snapshot.");
    assert.equal(climateQueries.length, 1);
    assert.deepEqual(body.subject.climate, warm.climate, "Direct and route packs use the same explicit optional-source fixture.");
    assert.equal(receipt.evidencePackHash, warm.evidencePackHash);
    assert.equal(receipt.sourceResponseHash, warm.source.sourceResponseHash);
    assert.equal(receipt.acquiredAt, acquiredAt, "The lease must preserve the original source acquisition time.");
    assert.equal(receipt.sourceLocale, "en");
    assert.equal(receipt.lookupSourceFeatureId, `way/${warmId}`);
    assert.equal(Date.parse(receipt.expiresAt) - Date.parse(receipt.createdAt), PUBLIC_EVIDENCE_LEASE_MS);
    assert.equal(receipt.cacheWindow, Math.floor(Date.parse(receipt.createdAt) / PUBLIC_EVIDENCE_LEASE_MS));
    checks++;
  } finally {
    delete harness.__night21Authorized;
  }
  assert.deepEqual(fetchContractErrors, [], "Provider sanitization must not hide a violated offline fetch contract.");
} finally {
  globalThis.fetch = originalFetch;
}
console.log(`NIGHT21 source reliability PASS: ${checks} offline cases; exact identity first; bounded sanitized errors; no retries/fallback; server snapshot geometry/height/hash/time preserved; optional outage is unavailable, not zero.`);
