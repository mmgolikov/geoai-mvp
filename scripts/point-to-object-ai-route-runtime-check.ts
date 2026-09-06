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
};

fixtureGlobal.__geoaiAiRuntimeStatus = () => ({
  enabled: resolvePointObjectRuntimePolicy(process.env, {
    openAiKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    generalUpstreamEnabled: false
  }).ai.enabled
});
fixtureGlobal.__geoaiAiEvidenceCalls = 0;
fixtureGlobal.__geoaiAiProviderCalls = 0;

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
  .replace(/import \{\s*generatePointObjectAiAnalysis,\s*PointObjectAiServiceError\s*\} from "@\/src\/lib\/prototype\/point-to-object-ai";/,
    `class PointObjectAiServiceError extends Error { constructor(code, httpStatus, message) { super(message); this.code = code; this.httpStatus = httpStatus; } }
     const generatePointObjectAiAnalysis = async () => { globalThis.__geoaiAiProviderCalls += 1; return { mode: "openai_analysis", analysis: { summary: "Offline grounded result" } }; };`)
  .replace(/import \{\s*buildLivePointObjectEvidencePack as buildPointObjectEvidencePack,\s*LivePointEvidenceError\s*\} from "@\/src\/lib\/prototype\/point-to-object-live-evidence";/,
    `class LivePointEvidenceError extends Error { constructor(code, httpStatus, message, retryable = false) { super(message); this.code = code; this.httpStatus = httpStatus; this.retryable = retryable; } }
     const buildPointObjectEvidencePack = async () => { globalThis.__geoaiAiEvidenceCalls += 1; return {
       selectedObject: { name: "Offline object", displayAddress: "Offline address", featureClass: "building", sourceFeatureId: "way/123", geometryType: "Polygon", addressParts: {}, tags: {}, metrics: {} },
       resolution: { matchMethod: "explicit_osm_feature", coordinateAssociation: "inside", resultCentroidDistanceM: 0 },
       source: { attribution: "Offline open-map fixture" }, geoContext: null, linkedEntity: null
     }; };`)
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

async function execute(requestOrigin = origin) {
  const issued = await challenge();
  assert.equal(issued.response.status, 200);
  assert.ok(issued.challenge);
  assert.ok(issued.cookie);
  return route.POST(new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: requestOrigin, Cookie: issued.cookie, "x-forwarded-for": "203.0.113.40" },
    body: JSON.stringify({
      caseKey: "moscow", longitude: 37.62, latitude: 55.75, locale: "en", depth: "standard",
      goal: "development_screening", perspective: "developer", horizon: "current", question: null,
      expectedSourceFeatureId: "way/123", consent: true, challenge: issued.challenge
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

console.log("AI actual-route offline checks passed: Production flag/key denial matrix, Preview compatibility, origin/challenge protection and one bounded generated result.");
