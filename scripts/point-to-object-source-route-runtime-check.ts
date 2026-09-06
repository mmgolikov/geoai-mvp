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
  __geoaiSourceRuntimeStatus?: () => { enabled: boolean };
  __geoaiSourceCalls?: Record<string, number>;
};
fixtureGlobal.__geoaiSourceRuntimeStatus = () => ({
  enabled: resolvePointObjectRuntimePolicy(process.env, {
    openAiKeyConfigured: false,
    generalUpstreamEnabled: false
  }).surface.enabled
});
fixtureGlobal.__geoaiSourceCalls = {};

const nextResponseStub = `
const NextResponse = {
  json(body, init = {}) {
    return new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) }
    });
  }
};`;

type RouteDefinition = {
  name: string;
  sourcePath: string;
  bodyLimit: number;
  clientRateLimit: number;
  validBody: Record<string, unknown>;
  replaceAdapters(source: string): string;
};

const definitions: RouteDefinition[] = [
  {
    name: "context",
    sourcePath: "app/api/prototype/point-to-object/context/route.ts",
    bodyLimit: 1_024,
    clientRateLimit: 12,
    validBody: { caseKey: "moscow", longitude: 37.62, latitude: 55.75, locale: "en", expectedSourceFeatureId: "way/123" },
    replaceAdapters(source) {
      return source.replace(/import \{\s*buildLivePointObjectEvidencePack,\s*LivePointEvidenceError\s*\} from "@\/src\/lib\/prototype\/point-to-object-live-evidence";/,
        `class LivePointEvidenceError extends Error { constructor(message) { super(message); } }
         const buildLivePointObjectEvidencePack = async () => { globalThis.__geoaiSourceCalls.context += 1; return {
           selectedObject: { name: "Offline object", displayAddress: "Offline address", featureClass: "building", sourceFeatureId: "way/123", geometryType: "Polygon", addressParts: {}, tags: {}, metrics: {} },
           resolution: { coordinateAssociation: "inside", resultCentroidDistanceM: 0 }, geoContext: null, linkedEntity: null
         }; };`);
    }
  },
  {
    name: "search",
    sourcePath: "app/api/prototype/point-to-object/search/route.ts",
    bodyLimit: 1_024,
    clientRateLimit: 20,
    validBody: { marketKey: "moscow", locale: "en", query: "Kremlin" },
    replaceAdapters(source) {
      return source.replace(/import \{\s*LivePointEvidenceError,\s*searchLivePointObjects\s*\} from "@\/src\/lib\/prototype\/point-to-object-live-evidence";/,
        `class LivePointEvidenceError extends Error { constructor(message) { super(message); } }
         const searchLivePointObjects = async () => { globalThis.__geoaiSourceCalls.search += 1; return []; };`);
    }
  },
  {
    name: "suggest",
    sourcePath: "app/api/prototype/point-to-object/suggest/route.ts",
    bodyLimit: 1_024,
    clientRateLimit: 60,
    validBody: { marketKey: "moscow", locale: "en", query: "Kremlin" },
    replaceAdapters(source) {
      return source.replace(/import \{\s*parsePointObjectAutocompleteRequest,\s*PointObjectAutocompleteError,\s*suggestPointObjects\s*\} from "@\/src\/lib\/prototype\/point-to-object-autocomplete";/,
        `class PointObjectAutocompleteError extends Error { constructor(message) { super(message); } }
         const parsePointObjectAutocompleteRequest = (value) => ({ ok: true, value });
         const suggestPointObjects = async () => { globalThis.__geoaiSourceCalls.suggest += 1; return { mode: "results", results: [] }; };`);
    }
  },
  {
    name: "find",
    sourcePath: "app/api/prototype/point-to-object/find/route.ts",
    bodyLimit: 2_048,
    clientRateLimit: 10,
    validBody: { marketKey: "moscow", locale: "en", bounds: [37.5, 55.6, 37.8, 55.9], group: "buildings", limit: 12 },
    replaceAdapters(source) {
      return source
        .replace('import { parsePointObjectFindRequest } from "@/src/lib/prototype/point-to-object-find-contract";',
          'const parsePointObjectFindRequest = (value) => ({ ok: true, value });')
        .replace('import { findPointObjects, PointObjectFindError } from "@/src/lib/prototype/point-to-object-find";',
          `class PointObjectFindError extends Error { constructor(message) { super(message); } }
           const findPointObjects = async () => { globalThis.__geoaiSourceCalls.find += 1; return { mode: "results", results: [] }; };`);
    }
  },
  {
    name: "area-context",
    sourcePath: "app/api/prototype/point-to-object/area-context/route.ts",
    bodyLimit: 20 * 1_024,
    clientRateLimit: 6,
    validBody: { marketKey: "moscow", locale: "en", aoiCoordinates: [[[37.62, 55.75], [37.621, 55.75], [37.621, 55.751], [37.62, 55.75]]] },
    replaceAdapters(source) {
      return source
        .replace('import { resolvePointObjectAreaContext, PointObjectAreaContextError } from "@/src/lib/prototype/point-to-object-area-context";',
          `class PointObjectAreaContextError extends Error { constructor(message) { super(message); } }
           const resolvePointObjectAreaContext = async () => { globalThis.__geoaiSourceCalls["area-context"] += 1; return { mode: "resolved", features: [] }; };`)
        .replace('import { parsePointObjectAreaContextRequest } from "@/src/lib/prototype/point-to-object-area-context-contract";',
          'const parsePointObjectAreaContextRequest = (value) => ({ ok: true, value });');
    }
  }
];

function configureProductionSurface(enabled: boolean) {
  process.env.VERCEL_ENV = "production";
  delete process.env.GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI;
  delete process.env.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_AI;
  delete process.env.OPENAI_API_KEY;
  if (enabled) process.env.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE = "true";
  else delete process.env.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE;
}

function request(definition: RouteDefinition, body: string, requestOrigin: string | null, ip = "203.0.113.80") {
  const origin = "https://production.example.test";
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-forwarded-host": "production.example.test",
    "x-forwarded-proto": "https",
    "x-forwarded-for": ip
  });
  if (requestOrigin) headers.set("Origin", requestOrigin);
  return new Request(`${origin}/api/prototype/point-to-object/${definition.name}`, { method: "POST", headers, body });
}

for (const definition of definitions) {
  fixtureGlobal.__geoaiSourceCalls[definition.name] = 0;
  const original = readFileSync(new URL(definition.sourcePath, repositoryRoot), "utf8");
  const transformed = definition.replaceAdapters(original)
    .replace('import { NextResponse } from "next/server";', nextResponseStub)
    .replace('import { getPointObjectSurfaceStatus } from "@/src/lib/ai/openai-upstream-gate";',
      'const getPointObjectSurfaceStatus = () => globalThis.__geoaiSourceRuntimeStatus();')
    .replace(/from "@\/([^\"]+)";/g, (_match, relative: string) =>
      `from ${JSON.stringify(new URL(`${relative}.ts`, repositoryRoot).href)};`);
  const route = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(transformed, { mode: "transform", sourceMap: false })).toString("base64")}`) as {
    POST(request: Request): Promise<Response>;
  };
  const validBody = JSON.stringify(definition.validBody);

  configureProductionSurface(false);
  const defaultDenied = await route.POST(request(definition, validBody, "https://production.example.test"));
  assert.equal(defaultDenied.status, 403, `${definition.name} must default-deny in Production.`);
  assert.equal(fixtureGlobal.__geoaiSourceCalls[definition.name], 0);

  configureProductionSurface(true);
  assert.equal(process.env.OPENAI_API_KEY, undefined, `${definition.name} surface must not require an OpenAI key.`);
  const originDenied = await route.POST(request(definition, validBody, "https://other.example.test"));
  assert.equal(originDenied.status, 403, `${definition.name} must deny cross-origin requests.`);
  assert.equal(fixtureGlobal.__geoaiSourceCalls[definition.name], 0);

  const oversized = JSON.stringify({ value: "x".repeat(definition.bodyLimit + 1_024) });
  const oversizedDenied = await route.POST(request(definition, oversized, "https://production.example.test"));
  assert.equal(oversizedDenied.status, 413, `${definition.name} must preserve its request-size cap.`);
  assert.equal(fixtureGlobal.__geoaiSourceCalls[definition.name], 0);

  const first = await route.POST(request(definition, validBody, "https://production.example.test"));
  assert.equal(first.status, 200, `${definition.name} must run with only the explicit Production surface flag.`);
  assert.match(first.headers.get("Cache-Control") ?? "", /no-store/);

  for (let index = 1; index < definition.clientRateLimit; index += 1) {
    const allowed = await route.POST(request(definition, validBody, "https://production.example.test"));
    assert.equal(allowed.status, 200, `${definition.name} must preserve its declared per-client allowance.`);
  }
  const rateLimited = await route.POST(request(definition, validBody, "https://production.example.test"));
  assert.equal(rateLimited.status, 429, `${definition.name} must preserve its per-client rate cap.`);
  assert.ok(Number(rateLimited.headers.get("Retry-After")) >= 1);
  assert.equal(fixtureGlobal.__geoaiSourceCalls[definition.name], definition.clientRateLimit);
}

console.log("Point-to-object source actual-route offline checks passed: five Production surfaces default-deny, need no OpenAI key, enforce origin/body caps and retain per-client rate limits.");
