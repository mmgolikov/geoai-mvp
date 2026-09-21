import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%3Dfn%3D%3Efn", shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".ts")) return { format: "module", shortCircuit: true,
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url }) };
    return nextLoad(url, context);
  }
});
const { runOverpassWithinBudget: run } = await import("../src/lib/prototype/point-to-object-source-budget.ts");
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function fakeClock() {
  let now = 0;
  const timers = [];
  return {
    now: () => now,
    timeout: (ms) => { const controller = new AbortController(); timers.push({ at: now + ms, controller }); return controller.signal; },
    advance: (ms) => { now += ms; for (const timer of timers) if (timer.at <= now) timer.controller.abort(new DOMException("Deadline", "TimeoutError")); },
    timers
  };
}
let checks = 0;
{
  const clock = fakeClock();
  let release, networkSignal;
  const result = run(12_000, () => new Promise(resolve => { release = resolve; }), async signal => { networkSignal = signal; return "ok"; }, clock);
  clock.advance(1_200); release();
  assert.equal(await result, "ok");
  assert.equal(networkSignal.aborted, false);
  assert.deepEqual(clock.timers.map(timer => timer.at), [12_000, 5_700], "Queue time must not consume the 4.5-second network allowance."); checks++;
}
{
  const clock = fakeClock(); let release; let calls = 0;
  const result = run(12_000, () => new Promise(resolve => { release = resolve; }), async () => { calls++; }, clock);
  clock.advance(8_001); release();
  await assert.rejects(result, { name: "TimeoutError" }); assert.equal(calls, 0); checks++;
}
{
  const clock = fakeClock(); let signal; let release;
  const result = run(12_000, () => new Promise(resolve => { release = resolve; }), requestSignal => { signal = requestSignal; return new Promise(() => {}); }, clock);
  clock.advance(7_800); release(); await flush();
  assert.equal(signal.aborted, false);
  assert.deepEqual(clock.timers.map(timer => timer.at), [12_000, 12_000]);
  clock.advance(4_200);
  await assert.rejects(result, { name: "TimeoutError" }); assert.equal(signal.aborted, true); checks++;
}
{
  const clock = fakeClock(); let calls = 0;
  const result = run(12_000, () => new Promise(() => {}), async () => { calls++; }, clock);
  clock.advance(12_000); await assert.rejects(result, { name: "TimeoutError" }); assert.equal(calls, 0); checks++;
}
{
  // Exact lookup then two enrichments share one absolute deadline, not 12 seconds each.
  const clock = fakeClock();
  await run(12_000, async () => { clock.advance(1_200); }, async () => { clock.advance(4_000); return "exact"; }, clock);
  let firstRelease, secondRelease, dispatched = 0;
  const first = run(12_000, () => new Promise(resolve => { firstRelease = resolve; }), async () => { dispatched++; return "nearby"; }, clock);
  const second = run(12_000, () => new Promise(resolve => { secondRelease = resolve; }), async () => { dispatched++; return "fabric"; }, clock);
  clock.advance(1_200); firstRelease(); assert.equal(await first, "nearby");
  clock.advance(1_200); secondRelease(); assert.equal(await second, "fabric");
  assert.equal(dispatched, 2); assert.ok(clock.timers.every(timer => timer.at <= 12_000)); checks++;
}

// Exercise the actual evidence builder with HTTP fixtures: provider failure is
// unavailable, never an available zero-count neighbourhood. No external calls.
const { buildLivePointObjectEvidencePack } = await import("../src/lib/prototype/point-to-object-live-evidence.ts");
const originalFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = async (url, init) => {
  requests++;
  const query = new URL(url).searchParams.get("data");
  assert.ok(query.includes("[timeout:4]")); assert.ok(init.signal);
  if (query.includes("out body geom 1")) return Response.json({ elements: [{ type: "node", id: 123, lon: 55.27, lat: 25.2, tags: { name: "Offline public fixture", amenity: "school" } }] });
  return new Response("Provider private diagnostics must not be copied", { status: 504 });
};
try {
  const pack = await buildLivePointObjectEvidencePack({ longitude: 55.27, latitude: 25.2, osmFeatureId: "node/123", locale: "en", expectedCountryCode: "ae", deadlineAtMs: Date.now() + 12_000 });
  assert.equal(requests, 3);
  assert.equal(pack.source.contextStatus, "unavailable"); assert.equal(pack.geoContext.coverage, "unavailable");
  assert.equal(pack.source.contextDiagnostic.failureCode, "timeout"); assert.equal(pack.source.fabricDiagnostic.failureCode, "timeout");
  assert.equal(pack.source.wikidataStatus, "not_requested_no_qid");
  assert.equal(pack.nearbyContext.length, 0); assert.equal(pack.geoContext.groups.length, 0);
  assert.equal("wikidataElapsedMs" in pack.source, false, "Transport timings must not destabilize evidence identity.");
  assert.deepEqual(Object.keys(pack.source.contextDiagnostic), ["failureCode"]);
  assert.deepEqual(Object.keys(pack.source.fabricDiagnostic), ["failureCode"]);
  assert.ok(!JSON.stringify(pack).includes("private diagnostics")); checks++;
} finally { globalThis.fetch = originalFetch; }
console.log(`PASS ${checks} source budget cases: admission, network allowance, total deadline, exact + enrichments, truthful unavailable diagnostics.`);
