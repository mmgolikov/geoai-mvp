import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@supabase/ssr") return {
      url: `data:text/javascript,${encodeURIComponent(`
        export const createServerClient = (url, key, options) => {
          globalThis.__geoaiSupabaseDeadlineFactories.push({ url, key, options });
          return {
            auth: {
              getClaims: () => options.global.fetch(new Request(url + "/auth/v1/user", {
                method: "GET",
                headers: { apikey: key }
              }))
            }
          };
        };
      `)}`,
      shortCircuit: true
    };
    if (specifier === "next/headers") return {
      url: "data:text/javascript,export%20const%20cookies%20%3D%20async%20()%20%3D%3E%20globalThis.__geoaiDeadlineCookieStore",
      shortCircuit: true
    };
    if (specifier === "@/src/lib/auth/auth-mode") return {
      url: "data:text/javascript,export%20const%20getEffectiveAuthMode%20%3D%20()%20%3D%3E%20%27supabase_auth%27",
      shortCircuit: true
    };
    if (specifier === "@/src/lib/supabase/config") return {
      url: "data:text/javascript,export%20const%20getSupabaseUrl%20%3D%20()%20%3D%3E%20%27https%3A%2F%2Fsupabase.example.test%27%3Bexport%20const%20getSupabasePublishableKey%20%3D%20()%20%3D%3E%20%27sb_publishable_offline_fixture%27",
      shortCircuit: true
    };
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%20%3D%20fn%20%3D%3E%20fn", shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".ts")) return {
      format: "module",
      shortCircuit: true,
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url })
    };
    return nextLoad(url, context);
  }
});

const {
  POINT_OBJECT_SOURCE_BROWSER_TIMEOUT_MS,
  POINT_OBJECT_SOURCE_CACHE_COMPLETION_MARGIN_MS,
  POINT_OBJECT_SOURCE_HARNESS_RESPONSE_TIMEOUT_MS,
  POINT_OBJECT_SOURCE_PLATFORM_MAX_DURATION_SECONDS,
  POINT_OBJECT_SOURCE_ROUTE_DEADLINE_MS,
  POINT_OBJECT_SOURCE_UPSTREAM_TIMEOUT_MS,
  PointObjectSourceDeadlineError,
  createPointObjectSourceRequestDeadline,
  isPointObjectSourceDeadlineError,
  pointObjectRequestAuthDeadlineSignal,
  pointObjectSourceCanUseSharedCache,
  pointObjectSourceResponseIsCurrent,
  samePointObjectAreaRequest,
  waitForPointObjectSourceOperation,
  withPointObjectSourceRequestDeadline
} = await import("../src/lib/prototype/source-request-deadline");

type SupabaseFactoryFixture = {
  url: string;
  key: string;
  options: {
    global?: { fetch: typeof fetch };
    cookies: {
      getAll(): unknown;
      setAll(cookies: Array<{ name: string; value: string; options: Record<string, unknown> }>): void;
    };
  };
};
const supabaseFixtures = globalThis as typeof globalThis & {
  __geoaiSupabaseDeadlineFactories?: SupabaseFactoryFixture[];
  __geoaiDeadlineCookieStore?: {
    getAll(): Array<{ name: string; value: string }>;
    set(name: string, value: string, options: Record<string, unknown>): void;
  };
};
const cookieWrites: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
supabaseFixtures.__geoaiSupabaseDeadlineFactories = [];
supabaseFixtures.__geoaiDeadlineCookieStore = {
  getAll: () => [{ name: "fixture-session", value: "cookie-value" }],
  set: (name, value, options) => cookieWrites.push({ name, value, options })
};

assert.equal(POINT_OBJECT_SOURCE_UPSTREAM_TIMEOUT_MS, 24_000, "The existing valid upstream budget must remain unchanged.");
assert.ok(POINT_OBJECT_SOURCE_UPSTREAM_TIMEOUT_MS < POINT_OBJECT_SOURCE_ROUTE_DEADLINE_MS);
assert.ok(POINT_OBJECT_SOURCE_ROUTE_DEADLINE_MS < POINT_OBJECT_SOURCE_PLATFORM_MAX_DURATION_SECONDS * 1_000);
assert.ok(POINT_OBJECT_SOURCE_PLATFORM_MAX_DURATION_SECONDS * 1_000 < POINT_OBJECT_SOURCE_BROWSER_TIMEOUT_MS);
assert.ok(POINT_OBJECT_SOURCE_BROWSER_TIMEOUT_MS < POINT_OBJECT_SOURCE_HARNESS_RESPONSE_TIMEOUT_MS);
assert.equal(POINT_OBJECT_SOURCE_CACHE_COMPLETION_MARGIN_MS, 1_000);
const cacheSafeDeadline = createPointObjectSourceRequestDeadline();
assert.equal(pointObjectSourceCanUseSharedCache(cacheSafeDeadline.signal), true,
  "A fresh route retains the validated shared source cache when the complete internal timeout fits.");
cacheSafeDeadline.dispose();
const cacheUnsafeDeadline = createPointObjectSourceRequestDeadline(20);
assert.equal(pointObjectSourceCanUseSharedCache(cacheUnsafeDeadline.signal), false,
  "A late route must use direct cancellation rather than allow shared cache work to outlive its budget.");
cacheUnsafeDeadline.dispose();

const originalRequest = new Request("https://geoai.example.test/api/prototype/point-to-object/find", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: "https://geoai.example.test" },
  body: JSON.stringify({ bounded: true })
});
const boundController = new AbortController();
const boundRequest = withPointObjectSourceRequestDeadline(originalRequest, boundController.signal);
assert.equal(boundRequest, originalRequest, "The framework-owned request identity must not be reconstructed across runtimes.");
assert.equal(pointObjectRequestAuthDeadlineSignal(boundRequest), boundController.signal);
assert.deepEqual(await boundRequest.json(), { bounded: true }, "The deadline-bound request must preserve the exact body.");

const { readBoundedJson } = await import("../src/lib/http/bounded-json");
let bodyReadCancelled = false;
const stalledBodyRequest = new Request("https://geoai.example.test/api/prototype/point-to-object/find", {
  method: "POST",
  body: new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"bounded":'));
    },
    cancel() {
      bodyReadCancelled = true;
    }
  }),
  duplex: "half"
} as RequestInit & { duplex: "half" });
const bodyReadDeadline = createPointObjectSourceRequestDeadline(15);
await assert.rejects(
  bodyReadDeadline.run(async (signal) => await readBoundedJson(stalledBodyRequest, 2_048, signal)),
  isPointObjectSourceDeadlineError,
  "The route deadline must terminate a stalled inbound body read."
);
bodyReadDeadline.dispose();
assert.equal(bodyReadCancelled, true, "A stalled inbound body reader must be physically cancelled at deadline.");

const { createRequestScopedSupabaseClient } = await import("../src/lib/supabase/ssr-server");
await createRequestScopedSupabaseClient();
const defaultFactory = supabaseFixtures.__geoaiSupabaseDeadlineFactories.at(-1);
assert.ok(defaultFactory);
assert.equal(Object.hasOwn(defaultFactory.options, "global"), false,
  "Default Auth callers must retain the previous client options without a custom fetch.");
assert.deepEqual(defaultFactory.options.cookies.getAll(), [{ name: "fixture-session", value: "cookie-value" }]);
defaultFactory.options.cookies.setAll([{ name: "refreshed", value: "next-cookie", options: { sameSite: "lax" } }]);
assert.deepEqual(cookieWrites, [{ name: "refreshed", value: "next-cookie", options: { sameSite: "lax" } }],
  "The opt-in deadline refactor must preserve cookie reads and writes.");

const authTransportDeadline = new AbortController();
const deadlineClient = await createRequestScopedSupabaseClient(authTransportDeadline.signal) as unknown as {
  auth: { getClaims(): Promise<Response> };
};
const deadlineFactory = supabaseFixtures.__geoaiSupabaseDeadlineFactories.at(-1);
assert.ok(deadlineFactory?.options.global?.fetch);
const deadlineFetch = deadlineFactory.options.global.fetch;
const originalAuthFetch = globalThis.fetch;
const transportCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
try {
  globalThis.fetch = async (input, init) => {
    transportCalls.push({ input, init });
    assert.ok(init?.signal);
    return await new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    });
  };

  const inputAbort = new AbortController();
  const initAbort = new AbortController();
  const input = new Request("https://supabase.example.test/auth/v1/input-fixture", {
    method: "POST",
    headers: { "X-Input-Fixture": "kept" },
    body: "input-body",
    signal: inputAbort.signal
  });
  const init: RequestInit = {
    method: "PATCH",
    headers: { "X-Init-Fixture": "kept" },
    body: "init-body",
    signal: initAbort.signal
  };
  const initAbortCall = deadlineFetch(input, init);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const firstTransport = transportCalls.at(-1);
  assert.equal(firstTransport?.input, input);
  assert.equal(firstTransport?.init?.method, "PATCH");
  assert.equal(new Headers(firstTransport?.init?.headers).get("X-Init-Fixture"), "kept");
  assert.equal(firstTransport?.init?.body, "init-body");
  assert.notEqual(firstTransport?.init?.signal, initAbort.signal,
    "The per-client fetch must combine, not replace with only one caller signal.");
  initAbort.abort(new DOMException("init fixture", "AbortError"));
  await assert.rejects(initAbortCall, { name: "AbortError" });

  const secondInputAbort = new AbortController();
  const inputAbortCall = deadlineFetch(new Request("https://supabase.example.test/auth/v1/input-abort", {
    signal: secondInputAbort.signal
  }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  secondInputAbort.abort(new DOMException("input fixture", "AbortError"));
  await assert.rejects(inputAbortCall, { name: "AbortError" });

  const authCall = deadlineClient.auth.getClaims();
  await new Promise((resolve) => setTimeout(resolve, 0));
  authTransportDeadline.abort(new PointObjectSourceDeadlineError());
  await assert.rejects(authCall, isPointObjectSourceDeadlineError,
    "The actual per-client Auth transport must observe the route deadline abort.");
  assert.equal(transportCalls.length, 3);
} finally {
  globalThis.fetch = originalAuthFetch;
}

let slowAuthCancelled = false;
let sourceCallsAfterAuth = 0;
const authDeadline = createPointObjectSourceRequestDeadline(15);
await assert.rejects(
  authDeadline.run(async (signal) => {
    await waitForPointObjectSourceOperation(new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        slowAuthCancelled = true;
        reject(signal.reason);
      }, { once: true });
    }), signal);
    sourceCallsAfterAuth += 1;
  }),
  isPointObjectSourceDeadlineError,
  "A delayed Auth phase must terminate at the shared route deadline."
);
authDeadline.dispose();
assert.equal(slowAuthCancelled, true);
assert.equal(sourceCallsAfterAuth, 0, "A timed-out or failed Auth phase must never dispatch the source.");

const areaIdentity = {
  marketKey: "dubai",
  locale: "en",
  aoiCoordinates: [[[55.270, 25.205], [55.273, 25.205], [55.273, 25.208], [55.270, 25.205]]] as const
};
assert.equal(samePointObjectAreaRequest(areaIdentity, structuredClone(areaIdentity)), true);
assert.equal(samePointObjectAreaRequest(areaIdentity, { ...areaIdentity, marketKey: "singapore" }), false);
assert.equal(samePointObjectAreaRequest(areaIdentity, {
  ...areaIdentity,
  aoiCoordinates: [[[103.85, 1.28], [103.86, 1.28], [103.86, 1.29], [103.85, 1.28]]] as const
}), false, "A previous market/AOI result must never be retained as current.");
const currentController = new AbortController();
assert.equal(pointObjectSourceResponseIsCurrent(7, 7, currentController.signal), true);
assert.equal(pointObjectSourceResponseIsCurrent(6, 7, currentController.signal), false);
currentController.abort();
assert.equal(pointObjectSourceResponseIsCurrent(7, 7, currentController.signal), false);

const { resolvePointObjectAreaContext, PointObjectAreaContextError } = await import("../src/lib/prototype/point-to-object-area-context");
const { findPointObjects, PointObjectFindError } = await import("../src/lib/prototype/point-to-object-find");
const areaRequest = {
  marketKey: "dubai",
  locale: "en",
  aoiCoordinates: [[[55.270, 25.205], [55.273, 25.205], [55.273, 25.208], [55.270, 25.205]]] as [[number, number][]]
} as const;
const findRequest = {
  marketKey: "singapore",
  locale: "en",
  bounds: [103.84, 1.27, 103.86, 1.29] as [number, number, number, number],
  group: "construction",
  mappedMinimumLevels: null,
  mappedMaximumLevels: null,
  limit: 12
} as const;

const originalFetch = globalThis.fetch;
let upstreamCalls = 0;
let headerWaitCancelled = false;
let bodyCancelled = false;
try {
  const headerController = new AbortController();
  globalThis.fetch = async (_input, init) => {
    upstreamCalls += 1;
    const signal = init?.signal;
    assert.ok(signal);
    return await new Promise<Response>((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        headerWaitCancelled = true;
        reject(signal.reason);
      }, { once: true });
    });
  };
  const headerPromise = resolvePointObjectAreaContext(areaRequest, undefined, headerController.signal);
  await new Promise((resolve) => setTimeout(resolve, 0));
  headerController.abort(new PointObjectSourceDeadlineError());
  await assert.rejects(headerPromise, (error: unknown) =>
    error instanceof PointObjectAreaContextError && error.httpStatus === 504
  );
  assert.equal(upstreamCalls, 1);
  assert.equal(headerWaitCancelled, true, "The shared route signal must cancel a source waiting for response headers.");

  const bodyController = new AbortController();
  globalThis.fetch = async (_input, init) => {
    upstreamCalls += 1;
    assert.ok(init?.signal);
    return new Response(new ReadableStream<Uint8Array>({
      cancel() {
        bodyCancelled = true;
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const bodyPromise = findPointObjects(findRequest, undefined, bodyController.signal);
  await new Promise((resolve) => setTimeout(resolve, 0));
  bodyController.abort(new PointObjectSourceDeadlineError());
  await assert.rejects(bodyPromise, (error: unknown) =>
    error instanceof PointObjectFindError && error.httpStatus === 504 && error.code === "OVERPASS_TIMEOUT"
  );
  assert.equal(upstreamCalls, 2, "Header and body failures must each use exactly one upstream attempt without retry.");
  assert.equal(bodyCancelled, true, "The response reader must be cancelled when the shared deadline expires during the body.");
} finally {
  globalThis.fetch = originalFetch;
}

const areaRoute = readFileSync(new URL("../app/api/prototype/point-to-object/area-context/route.ts", import.meta.url), "utf8");
const findRoute = readFileSync(new URL("../app/api/prototype/point-to-object/find/route.ts", import.meta.url), "utf8");
for (const [name, source, operation] of [
  ["area-context", areaRoute, "resolvePointObjectAreaContext"],
  ["find", findRoute, "findPointObjects"]
] as const) {
  const post = source.slice(source.indexOf("export async function POST"));
  const deadlineIndex = post.indexOf("const sourceDeadline = createPointObjectSourceRequestDeadline");
  const identityIndex = post.indexOf("await requirePilotIdentity(request)");
  const operationIndex = post.lastIndexOf(`await ${operation}(`);
  assert.match(source, /export const runtime = "nodejs";\s*export const maxDuration = 45;/);
  assert.ok(deadlineIndex >= 0 && identityIndex > deadlineIndex && operationIndex > identityIndex,
    `${name} must start one deadline before Auth and preserve identity-before-source ordering.`);
  assert.match(source, /SOURCE_REQUEST_TIMEOUT/);
  assert.equal((source.match(new RegExp(`await ${operation}\\(`, "g")) ?? []).length, 1,
    `${name} must retain exactly one source dispatch site.`);
}

const routeFaults = globalThis as typeof globalThis & {
  __geoaiDeadlineAuthAbortObserved?: number;
  __geoaiDeadlineSourceCalls?: number;
};
routeFaults.__geoaiDeadlineAuthAbortObserved = 0;
routeFaults.__geoaiDeadlineSourceCalls = 0;
const nextResponseStub = `
const NextResponse = {
  json(body, init = {}) {
    return new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) }
    });
  }
};`;
const authFaultStub = `
const requirePilotIdentity = async (request) => await new Promise((resolve) => {
  pointObjectRequestAuthDeadlineSignal(request).addEventListener("abort", () => {
    globalThis.__geoaiDeadlineAuthAbortObserved += 1;
  }, { once: true });
  setTimeout(() => resolve({ allowed: true, mode: "demo_public", context: null }), 30);
});
const requirePilotMutationOrigin = () => null;`;
const authDeniedStub = `
const requirePilotIdentity = async () => ({
  allowed: false,
  response: Response.json({ ok: false, code: "authentication_required" }, { status: 401 })
});
const requirePilotMutationOrigin = () => null;`;

async function loadAuthRoute(source: string, kind: "area" | "find", authStub: string, timeoutMs: number) {
  let transformed = source
    .replace('import { NextResponse } from "next/server";', nextResponseStub)
    .replace('import { getPointObjectSurfaceStatus } from "@/src/lib/ai/openai-upstream-gate";',
      'const getPointObjectSurfaceStatus = () => ({ enabled: true });')
    .replace('import { requirePilotIdentity, requirePilotMutationOrigin } from "@/src/lib/auth/require-pilot-identity";', authStub)
    .replace("isPointObjectSourceDeadlineError,\n  withPointObjectSourceRequestDeadline", "isPointObjectSourceDeadlineError,\n  pointObjectRequestAuthDeadlineSignal,\n  withPointObjectSourceRequestDeadline")
    .replace("createPointObjectSourceRequestDeadline(undefined, incomingRequest.signal)",
      `createPointObjectSourceRequestDeadline(${timeoutMs}, incomingRequest.signal)`);
  transformed = kind === "area"
    ? transformed.replace('import { resolvePointObjectAreaContext, PointObjectAreaContextError } from "@/src/lib/prototype/point-to-object-area-context";', `
        class PointObjectAreaContextError extends Error {}
        const resolvePointObjectAreaContext = async () => {
          globalThis.__geoaiDeadlineSourceCalls += 1;
          return { mode: "empty" };
        };`)
    : transformed.replace('import { findPointObjects, PointObjectFindError } from "@/src/lib/prototype/point-to-object-find";', `
        class PointObjectFindError extends Error {}
        const findPointObjects = async () => {
          globalThis.__geoaiDeadlineSourceCalls += 1;
          return { mode: "empty" };
        };`);
  const javascript = stripTypeScriptTypes(transformed, { mode: "transform", sourceMap: false });
  return await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`) as {
    POST(request: Request): Promise<Response>;
  };
}

for (const [kind, source, path] of [
  ["area", areaRoute, "area-context"],
  ["find", findRoute, "find"]
] as const) {
  const route = await loadAuthRoute(source, kind, authFaultStub, 10);
  const request = () => new Request(`https://geoai.example.test/api/prototype/point-to-object/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://geoai.example.test" },
    body: "{}"
  });
  const response = await route.POST(request());
  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), {
    mode: "unavailable",
    code: "SOURCE_REQUEST_TIMEOUT",
    error: kind === "area" ? "Open-map area context did not complete in time." : "Open-map Find did not complete in time.",
    retryable: true
  });
  const deniedRoute = await loadAuthRoute(source, kind, authDeniedStub, 1_000);
  const denied = await deniedRoute.POST(request());
  assert.equal(denied.status, 401);
}
assert.equal(routeFaults.__geoaiDeadlineAuthAbortObserved, 2,
  "Each actual route must propagate its deadline into the delayed Auth operation.");
await new Promise((resolve) => setTimeout(resolve, 35));
assert.equal(routeFaults.__geoaiDeadlineSourceCalls, 0,
  "Late completion of a non-cancellable Auth transport must not resume either route or dispatch its source.");
assert.doesNotMatch(`${areaRoute}\n${findRoute}`, /callTrackedOpenAi|OPENAI_API_KEY/,
  "Deadline/error handling must not create an unpaid-to-paid escalation path.");

const client = readFileSync(new URL("../components/point-to-object/prototype-client-v5.tsx", import.meta.url), "utf8");
assert.match(client, /AbortSignal\.timeout\(POINT_OBJECT_SOURCE_BROWSER_TIMEOUT_MS\)/);
assert.match(client, /samePointObjectAreaRequest\(current\.request, areaRequest\) \? current : null/,
  "A same-request failure must preserve the last valid area context while a changed AOI must clear it.");
assert.match(client, /pointObjectSourceResponseIsCurrent\(requestId, areaContextRequestIdRef\.current, controller\.signal\)/);
assert.match(client, /pointObjectSourceResponseIsCurrent\(requestId, findRequestIdRef\.current, controller\.signal\)/);

const { pointObjectSourceFailure } = await import("../src/lib/prototype/point-to-object-source-recovery");
assert.equal(pointObjectSourceFailure(504, { code: "SOURCE_REQUEST_TIMEOUT" }), "timeout",
  "The stable route timeout must retain the existing recoverable browser error classification.");

console.log("SOURCE11 deadline check passed: ordered budgets, pre-Auth deadline, no source after Auth timeout, one-attempt header/body cancellation, stable 504 mapping, last-good preservation, stale-response guards.");
