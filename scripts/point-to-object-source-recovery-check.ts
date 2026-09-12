import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%20%3D%20fn%20%3D%3E%20fn", shortCircuit: true };
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

const { pointObjectSourceFailure, sourceRetryAfterSeconds, sourceFailureMessage, waitForSourceAdmission } = await import("../src/lib/prototype/point-to-object-source-recovery");
assert.equal(pointObjectSourceFailure(429, { code: "APPLICATION_RATE_LIMITED" }), "application_rate");
assert.equal(pointObjectSourceFailure(429, { code: "NOMINATIM_RATE_LIMITED" }), "source_rate");
assert.equal(pointObjectSourceFailure(504, {}), "timeout");
assert.equal(pointObjectSourceFailure(502, {}), "unavailable");
assert.equal(sourceRetryAfterSeconds(null), 15);
assert.equal(sourceRetryAfterSeconds("37"), 37);
assert.equal(sourceRetryAfterSeconds("3600"), 3600);
assert.equal(sourceRetryAfterSeconds("Thu, 10 Sep 2026 12:00:15 GMT", 15, Date.parse("2026-09-10T12:00:00Z")), 15);
assert.match(sourceFailureMessage("application_rate", 37, "ru"), /приложения.*37/);
assert.match(sourceFailureMessage("timeout", 0, "en"), /did not respond in time/);
const cancelled = new AbortController();
const queued = waitForSourceAdmission(new Promise<void>(() => undefined), cancelled.signal);
cancelled.abort(new DOMException("deadline", "TimeoutError"));
await assert.rejects(queued, { name: "TimeoutError" });

const { findPointObjects, PointObjectFindError } = await import("../src/lib/prototype/point-to-object-find");
const { resolvePointObjectAreaContext, PointObjectAreaContextError } = await import("../src/lib/prototype/point-to-object-area-context");
const findRequest = { marketKey: "dubai", locale: "en", bounds: [55.27, 25.20, 55.28, 25.21], group: "construction", mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 } as const;
const areaRequest = { marketKey: "dubai", locale: "en", aoiCoordinates: [[[55.270, 25.205], [55.273, 25.205], [55.273, 25.208], [55.270, 25.208], [55.270, 25.205]]] } as const;
const originalFetch = globalThis.fetch;
let calls = 0;
try {
  for (const adapter of [
    { run: () => findPointObjects({ ...findRequest, bounds: [...findRequest.bounds] }), error: PointObjectFindError },
    { run: () => resolvePointObjectAreaContext({ ...areaRequest, aoiCoordinates: [areaRequest.aoiCoordinates[0].map((point) => [...point] as [number, number])] }), error: PointObjectAreaContextError }
  ]) {
    for (const scenario of ["rate", "http-timeout", "body-timeout", "runtime-error", "empty"] as const) {
      const before = calls;
      globalThis.fetch = async (_input, init) => {
        calls += 1;
        assert.ok(init?.signal, "One deadline must also govern response-body reads.");
        if (scenario === "rate") return new Response("busy", { status: 429, headers: { "Retry-After": "37" } });
        if (scenario === "http-timeout") return new Response("busy", { status: 504 });
        if (scenario === "body-timeout") return new Response(new ReadableStream({ start(controller) { controller.error(new DOMException("body deadline", "TimeoutError")); } }));
        return Response.json(scenario === "runtime-error" ? { elements: [], remark: "runtime error: Query ran out of memory." } : { elements: [] });
      };
      if (scenario === "empty") {
        const result = await adapter.run();
        assert.equal(result.mode, "empty");
      } else {
        await assert.rejects(adapter.run(), (error: unknown) => error instanceof adapter.error &&
          error.httpStatus === (scenario === "rate" ? 429 : scenario === "runtime-error" ? 502 : 504) &&
          (scenario !== "rate" || error.retryAfterSeconds === 37));
      }
      assert.equal(calls, before + 1, "No automatic source retry, including 429 and 504.");
    }
  }
} finally {
  globalThis.fetch = originalFetch;
}
console.log("SOURCE10 offline recovery passed: app/upstream distinction, cooldown metadata, admission cancellation, body/HTTP timeout, runtime failure != empty, exactly one upstream attempt.");
