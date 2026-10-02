import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// @ts-expect-error Node's strip-types runner requires the physical .ts suffix; production imports remain extensionless.
import { resolvePointObjectRuntimePolicy } from "../src/lib/prototype/point-object-runtime-policy.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`${specifier.slice(2)}.ts`, repositoryRoot).href, context);
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* Canonical resolution below. */ }
    }
    return nextResolve(specifier, context);
  }
});

const repositoryRoot = process.argv[2] ? pathToFileURL(`${resolve(process.argv[2])}/`) : new URL("../", import.meta.url);
const fixtureGlobal = globalThis as typeof globalThis & {
  __geoaiAiRuntimeStatus?: () => { enabled: boolean };
  __geoaiAiEvidenceCalls?: number;
  __geoaiAiProviderCalls?: number;
  __geoaiAiIdentityDenial?: 401 | 403 | 503 | null;
  __geoaiAiOriginDenied?: boolean;
  __geoaiAiComparisonActive?: boolean;
  __geoaiAiLeaseMiss?: boolean;
  __geoaiAiSubjectMismatch?: boolean;
  __geoaiAiComparisonCalls?: number;
};

fixtureGlobal.__geoaiAiRuntimeStatus = () => ({
  enabled: resolvePointObjectRuntimePolicy(process.env, {
    openAiKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    generalUpstreamEnabled: false
  }).ai.enabled
});
fixtureGlobal.__geoaiAiEvidenceCalls = 0;
fixtureGlobal.__geoaiAiProviderCalls = 0;
fixtureGlobal.__geoaiAiComparisonCalls = 0;

// Execute the actual route handler. Evidence and AI services are deterministic
// offline fixtures, so the test never reads an environment file or calls a provider.
const source = readFileSync(new URL("app/api/prototype/point-to-object/ai/route.ts", repositoryRoot), "utf8")
  .replace('import { NextResponse } from "next/server";', `
    const NextResponse = { json(body, init = {}) { return new Response(JSON.stringify(body), {
      status: init.status ?? 200, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) }
    }); } };
  `)
  .replace('import { getPointObjectUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";',
    'const getPointObjectUpstreamStatus = () => globalThis.__geoaiAiRuntimeStatus();')
  .replace('import { requirePilotIdentity, requirePilotMutationOrigin } from "@/src/lib/auth/require-pilot-identity";', `
    const requirePilotIdentity = async () => {
      const status = globalThis.__geoaiAiIdentityDenial;
      return status ? { allowed: false, response: new Response(JSON.stringify({ code: "fixture_identity_denied" }), {
        status, headers: { "Cache-Control": "private, no-store", Vary: "Authorization, Cookie" }
      }) } : { allowed: true };
    };
    const requirePilotMutationOrigin = () => globalThis.__geoaiAiOriginDenied
      ? new Response(JSON.stringify({ code: "fixture_origin_denied" }), { status: 403 }) : null;
  `)
  .replace(/import \{\s*generatePointObjectAiAnalysis,\s*generatePointObjectAiComparison,\s*PointObjectAiServiceError\s*\} from "@\/src\/lib\/prototype\/point-to-object-ai";/,
    `class PointObjectAiServiceError extends Error { constructor(code, httpStatus, message) { super(message); this.code = code; this.httpStatus = httpStatus; } }
     const generatePointObjectAiAnalysis = async () => { globalThis.__geoaiAiProviderCalls += 1; return { mode: "openai_analysis", analysis: { summary: "Offline grounded result" } }; };
     const generatePointObjectAiComparison = async packs => { globalThis.__geoaiAiProviderCalls += 1; globalThis.__geoaiAiComparisonCalls += 1; return { mode: "openai_comparison", candidates: packs.map(pack => pack.selectedObject.sourceFeatureId) }; };`)
  .replace(/import \{ LivePointEvidenceError \} from "@\/src\/lib\/prototype\/point-to-object-live-evidence";/,
    `class LivePointEvidenceError extends Error {}`)
  .replace(/import \{ reusePublicEvidenceLease, PublicEvidenceLeaseError \} from "@\/src\/lib\/prototype\/point-to-object-evidence-lease";/,
    `class PublicEvidenceLeaseError extends Error { code = "AI_EVIDENCE_REFRESH_REQUIRED"; }
     const reusePublicEvidenceLease = async input => { globalThis.__geoaiAiEvidenceCalls += 1; if (globalThis.__geoaiAiLeaseMiss) throw new PublicEvidenceLeaseError(); return { pack: {
       selectedObject: { name: "Offline object", displayAddress: "Offline address", featureClass: "building", sourceFeatureId: globalThis.__geoaiAiComparisonActive ? globalThis.__geoaiAiSubjectMismatch ? "way/999" : input.osmFeatureId : "way/123", geometryType: "Polygon", addressParts: {}, tags: {}, metrics: {} },
       resolution: { matchMethod: "explicit_osm_feature", coordinateAssociation: "inside", resultCentroidDistanceM: 0 },
       source: { attribution: "Offline open-map fixture" }, geoContext: null, linkedEntity: null
     } }; };`)
  .replace(/from "@\/([^\"]+)";/g, (_match, relative: string) =>
    `from ${JSON.stringify(new URL(`${relative}.ts`, repositoryRoot).href)};`);

const route = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source, { mode: "transform", sourceMap: false })).toString("base64")}`) as {
  GET(request: Request): Promise<Response>;
  POST(request: Request): Promise<Response>;
};

const origin = "https://production.example.test";
const url = `${origin}/api/prototype/point-to-object/ai`;

function configure(environment: "preview" | "production", values: {
  preview?: string;
  surface?: string;
  ai?: string;
  key?: boolean;
}) {
  process.env.VERCEL_ENV = environment;
  process.env.NEXT_PUBLIC_AUTH_MODE = "supabase_auth";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://pphdqkurxneyagvnnjdt.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ["sb", "publishable", "synthetic_offline_fixture"].join("_");
  for (const name of [
    "GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI",
    "GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE",
    "GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_AI",
    "OPENAI_API_KEY"
  ]) delete process.env[name];
  if (values.preview !== undefined) process.env.GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI = values.preview;
  if (values.surface !== undefined) process.env.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE = values.surface;
  if (values.ai !== undefined) process.env.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_AI = values.ai;
  if (values.key) process.env.OPENAI_API_KEY = "offline-placeholder-not-a-credential";
}

async function challenge() {
  const response = await route.GET(new Request(url));
  const body = await response.json() as { challenge?: string };
  return { response, challenge: body.challenge, cookie: response.headers.get("Set-Cookie")?.split(";")[0] };
}

async function execute(requestOrigin = origin, missingReceipt = false, lookupSourceFeatureId: string | null = "way/123", expectedSourceFeatureId = "way/123") {
  const issued = await challenge();
  assert.equal(issued.response.status, 200);
  assert.ok(issued.challenge);
  assert.ok(issued.cookie);
  const receiptTime = Date.now();
  return route.POST(new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: requestOrigin, Cookie: issued.cookie, "x-forwarded-for": "203.0.113.40" },
    body: JSON.stringify({
      caseKey: "moscow", longitude: 37.62, latitude: 55.75, locale: "en", depth: "standard",
      goal: "development_screening", perspective: "developer", horizon: "current", question: null,
      expectedSourceFeatureId, consent: true, challenge: issued.challenge,
      evidenceReceipt: missingReceipt ? null : { version: "PUBLIC_EVIDENCE_LEASE_V1", evidencePackHash: "a".repeat(64), sourceResponseHash: "b".repeat(64),
        acquiredAt: new Date(receiptTime).toISOString(), createdAt: new Date(receiptTime).toISOString(), expiresAt: new Date(receiptTime + 900_000).toISOString(),
        cacheWindow: Math.floor(receiptTime / 900_000), sourceLocale: "en", lookupSourceFeatureId }
    })
  }));
}

configure("production", { key: true });
assert.equal((await route.GET(new Request(url))).status, 403, "Production must deny when both flags are absent.");

configure("production", { surface: "true", key: true });
assert.equal((await route.GET(new Request(url))).status, 403, "Surface-only Production must deny paid AI.");

configure("production", { surface: "true", ai: "true" });
assert.equal((await route.GET(new Request(url))).status, 403, "Production AI must deny without the server key.");

configure("preview", { preview: "true", key: true });
// The actual handler must return the identity decision even when runtime is
// enabled and the body is invalid/oversized. Authentication internals have
// separate kernel/browser checks; these fixtures verify route ordering only.
for (const status of [401, 403, 503] as const) {
  fixtureGlobal.__geoaiAiIdentityDenial = status;
  const deniedChallenge = await route.GET(new Request(url));
  assert.equal(deniedChallenge.status, status);
  assert.equal(deniedChallenge.headers.get("Set-Cookie"), null, "Denied identity cannot acquire a challenge.");
  for (const body of ["{", JSON.stringify({ value: "x".repeat(900_000) })]) {
    const deniedRun = await route.POST(new Request(url, { method: "POST", body }));
    assert.equal(deniedRun.status, status, "Identity must precede body parsing and runtime execution.");
    assert.equal((await deniedRun.json()).code, "fixture_identity_denied");
  }
  assert.equal(fixtureGlobal.__geoaiAiEvidenceCalls, 0);
  assert.equal(fixtureGlobal.__geoaiAiProviderCalls, 0);
}
fixtureGlobal.__geoaiAiIdentityDenial = null;
fixtureGlobal.__geoaiAiOriginDenied = true;
const rejectedMutation = await route.POST(new Request(url, { method: "POST", body: "{" }));
assert.equal(rejectedMutation.status, 403);
assert.equal((await rejectedMutation.json()).code, "fixture_origin_denied");
assert.equal(fixtureGlobal.__geoaiAiEvidenceCalls, 0);
assert.equal(fixtureGlobal.__geoaiAiProviderCalls, 0);
fixtureGlobal.__geoaiAiOriginDenied = false;

const previewReady = await route.GET(new Request(url));
assert.equal(previewReady.status, 200, "Existing explicitly enabled Preview behavior must remain available.");
assert.match(previewReady.headers.get("Cache-Control") ?? "", /no-store/);

configure("production", { surface: "true", ai: "true", key: true });
const crossOrigin = await execute("https://other.example.test");
assert.equal(crossOrigin.status, 403);
assert.equal(fixtureGlobal.__geoaiAiEvidenceCalls, 0);
assert.equal(fixtureGlobal.__geoaiAiProviderCalls, 0);

const success = await execute();
assert.equal(success.status, 200);
assert.match(success.headers.get("Cache-Control") ?? "", /no-store/);
const successBody = await success.json();
assert.equal(successBody.mode, "openai_analysis");
assert.equal(successBody.subject.sourceFeatureId, "way/123");
assert.equal(fixtureGlobal.__geoaiAiEvidenceCalls, 1);
assert.equal(fixtureGlobal.__geoaiAiProviderCalls, 1);

const missing = await execute(origin, true);
assert.equal(missing.status, 409);
assert.equal((await missing.json()).code, "AI_EVIDENCE_REFRESH_REQUIRED");
assert.equal(fixtureGlobal.__geoaiAiEvidenceCalls, 1, "No lease means no source fallback.");
assert.equal(fixtureGlobal.__geoaiAiProviderCalls, 1, "No lease means no paid provider call.");
assert.equal((await execute(origin, false, null)).status, 200, "Reverse lookup receipt may preserve its null key while expected subject remains exact.");
assert.equal(fixtureGlobal.__geoaiAiProviderCalls, 2);
assert.equal((await execute(origin, false, null, "way/999")).status, 409, "Reverse receipt must never downgrade the expected subject guard.");
assert.equal(fixtureGlobal.__geoaiAiProviderCalls, 2);

// Comparison uses the same actual handler, challenge and paid rate buckets.
// Its source lane is cache-only; service grounding has separate injected tests.
fixtureGlobal.__geoaiAiComparisonActive = true;
const receiptTime = Date.now();
const comparisonBody = {
  caseKey: "moscow", longitude: 37.62, latitude: 55.75, locale: "en", depth: "standard",
  role: "developer", scenario: "b2b_redevelopment_selected_aoi", goal: "development_screening", perspective: "developer", horizon: "current", question: null,
  expectedSourceFeatureId: "way/123", consent: true,
  comparison: [123, 124].map(id => ({ longitude: 37.62, latitude: 55.75, expectedSourceFeatureId: `way/${id}`, evidenceReceipt: {
    version: "PUBLIC_EVIDENCE_LEASE_V1", evidencePackHash: "a".repeat(64), sourceResponseHash: "b".repeat(64),
    acquiredAt: new Date(receiptTime).toISOString(), createdAt: new Date(receiptTime).toISOString(), expiresAt: new Date(receiptTime + 900_000).toISOString(),
    cacheWindow: Math.floor(receiptTime / 900_000), sourceLocale: "en", lookupSourceFeatureId: `way/${id}`
  } }))
};
async function compare(body: typeof comparisonBody, address = "203.0.113.55") {
  const issued = await challenge();
  return route.POST(new Request(url, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Cookie: issued.cookie!, "x-forwarded-for": address }, body: JSON.stringify({ ...body, challenge: issued.challenge }) }));
}
const comparisonSuccess = await compare(comparisonBody);
assert.equal(comparisonSuccess.status, 200);
assert.deepEqual((await comparisonSuccess.json()).candidates, ["way/123", "way/124"]);
assert.equal(fixtureGlobal.__geoaiAiComparisonCalls, 1, "Two snapshots produce one comparison dispatch.");
const providerBeforeNegatives = fixtureGlobal.__geoaiAiProviderCalls;
const leaseBeforeInvalid = fixtureGlobal.__geoaiAiEvidenceCalls;
for (const mutate of [
  (body: typeof comparisonBody) => { body.comparison[1] = structuredClone(body.comparison[0]); },
  (body: typeof comparisonBody) => { body.comparison[0].evidenceReceipt.lookupSourceFeatureId = "way/999"; },
  (body: typeof comparisonBody) => { body.comparison[0].evidenceReceipt.evidencePackHash = "invalid"; },
  (body: typeof comparisonBody) => { body.comparison.push(...[125, 126].map(id => ({ ...structuredClone(body.comparison[0]), expectedSourceFeatureId: `way/${id}`, evidenceReceipt: { ...body.comparison[0].evidenceReceipt, lookupSourceFeatureId: `way/${id}` } }))); }
]) {
  const malformed = structuredClone(comparisonBody); mutate(malformed);
  assert.equal((await compare(malformed)).status, 400, "Malformed, duplicate or oversized comparison fails before cache/provider.");
}
assert.equal(fixtureGlobal.__geoaiAiEvidenceCalls, leaseBeforeInvalid);
const wrongLocale = structuredClone(comparisonBody); wrongLocale.comparison[0].evidenceReceipt.sourceLocale = "ru,en";
assert.equal((await compare(wrongLocale)).status, 409, "Frozen source locale cannot be changed by a comparison request.");
fixtureGlobal.__geoaiAiLeaseMiss = true;
assert.equal((await compare(comparisonBody)).status, 409, "Cache miss fails closed without source reacquisition.");
fixtureGlobal.__geoaiAiLeaseMiss = false;
fixtureGlobal.__geoaiAiSubjectMismatch = true;
assert.equal((await compare(comparisonBody)).status, 409, "Actual server subject identity must match the candidate.");
fixtureGlobal.__geoaiAiSubjectMismatch = false;
assert.equal(fixtureGlobal.__geoaiAiProviderCalls, providerBeforeNegatives, "Every rejected comparison made zero paid dispatches.");
assert.equal((await compare(comparisonBody)).status, 429, "Comparison cannot bypass the existing four-request paid admission bucket.");
const three = structuredClone(comparisonBody); three.comparison.push({ ...structuredClone(three.comparison[0]), expectedSourceFeatureId: "way/125", evidenceReceipt: { ...three.comparison[0].evidenceReceipt, lookupSourceFeatureId: "way/125" } });
assert.equal((await compare(three, "203.0.113.56")).status, 200, "Three frozen candidates remain within the bounded comparison contract.");
assert.equal(fixtureGlobal.__geoaiAiComparisonCalls, 2);
console.log("AI actual-route offline checks passed: all legacy gates retained plus comparison identity/locale/hash/duplicate/max3/cache-miss negatives, shared four-request paid admission and one dispatch per valid comparison; network/provider calls=0 (services injected).");
