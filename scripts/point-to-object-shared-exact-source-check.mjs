import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes, createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

globalThis.AsyncLocalStorage = AsyncLocalStorage;
const require = createRequire(import.meta.url);
const { unstable_cache } = require("next/dist/server/web/spec-extension/unstable-cache.js");
const { workAsyncStorage } = require("next/dist/server/app-render/work-async-storage.external.js");
globalThis.__exactCache = unstable_cache;
const entries = new Map(); let stale = false;
globalThis.__incrementalCache = {
  generateSimpleCacheKey: async value => createHash("sha256").update(value).digest("hex"),
  get: async key => entries.has(key) ? { value: structuredClone(entries.get(key)), isStale: stale } : null,
  set: async (key, value) => { entries.set(key, structuredClone(value)); }
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%3DglobalThis.__exactCache", shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && new URL(url).pathname.endsWith(".ts")) return { format: "module", shortCircuit: true,
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url }) };
    return nextLoad(url, context);
  }
});
const sourceUrl = new URL("../src/lib/prototype/point-to-object-exact-source.ts", import.meta.url);
// Distinct module evaluations mean two independent process-local Maps, but one
// installed Next IncrementalCache. A shared module Map cannot make these pass.
const writer = await import(`${sourceUrl.href}?instance=find`);
const reader = await import(`${sourceUrl.href}?instance=context`);
const originalFetch = globalThis.fetch, originalNow = Date.now, originalDeployment = process.env.VERCEL_DEPLOYMENT_ID;
globalThis.fetch = async () => { throw new Error("Network is forbidden in this check"); };
process.env.VERCEL_DEPLOYMENT_ID = "offline_exact_deployment";
let now = Date.parse("2026-09-21T12:14:00.000Z"); Date.now = () => now;
const sourceTime = new Date(now).toISOString();
const element = { type: "way", id: 123, tags: { building: "office", height: "42" }, geometry: [
  {lon:55.27,lat:25.2},{lon:55.271,lat:25.2},{lon:55.271,lat:25.201},{lon:55.27,lat:25.201},{lon:55.27,lat:25.2}
] };
const payload = { osm3s: { timestamp_osm_base: "2026-09-21T12:00:00Z" }, elements: [element] };
let lookups = 0;
const forbiddenLookup = async () => { lookups++; throw new Error("Original exact fallback requested"); };
const requestContext = async fn => {
  const store = { route: "/offline", page: "/offline/route", isStaticGeneration: false, isDraftMode: false, fetchCache: "auto", pendingRevalidates: {} };
  const result = await workAsyncStorage.run(store, fn);
  await Promise.all(Object.values(store.pendingRevalidates));
  return result;
};
let checks = 0;
try {
  await writer.shareExactFindElements(payload, sourceTime, ["way/123"]);
  assert.equal(entries.size, 1);
  await assert.rejects(reader.readExactSourceElement("way/123", forbiddenLookup), /fallback requested/);
  assert.equal(lookups, 1, "Separate function has no writer's Map"); checks++;
  now += 30_000;
  await writer.shareExactFindElements(payload, new Date(now).toISOString(), ["way/123"]);
  assert.equal((await reader.readSharedExactFindSnapshot("way/123")).acquiredAt, sourceTime, "Identical reacquisition cannot renew source time");
  const newerObservation = structuredClone(payload); newerObservation.osm3s.timestamp_osm_base = new Date(now).toISOString();
  await writer.shareExactFindElements(newerObservation, new Date(now).toISOString(), ["way/123"]);
  assert.equal((await reader.readSharedExactFindSnapshot("way/123")).observedAt, payload.osm3s.timestamp_osm_base);
  for (const change of [entry => { entry.tags.height = "43"; }, entry => { entry.geometry[1].lon += 0.0001; }]) {
    const changedPayload = structuredClone(payload); change(changedPayload.elements[0]);
    await assert.rejects(writer.shareExactFindElements(changedPayload, new Date(now).toISOString(), ["way/123"]), writer.ExactFindSnapshotConflictError);
    assert.deepEqual((await reader.readSharedExactFindSnapshot("way/123")).element, element);
  }
  now -= 30_000; checks++;
  now += 120_000; // Rollover: acquired one minute before window end, read two minutes later.
  let snapshot = await requestContext(() => reader.readSharedExactFindSnapshot("way/123"));
  assert.ok(snapshot); assert.equal(snapshot.acquiredAt, sourceTime);
  const rolloverChanged = structuredClone(payload); rolloverChanged.elements[0].tags.height = "44";
  await assert.rejects(writer.shareExactFindElements(rolloverChanged, new Date(now).toISOString(), ["way/123"]), writer.ExactFindSnapshotConflictError);
  let receipt = await reader.readExactSourceElement("way/123", forbiddenLookup, now, snapshot);
  assert.deepEqual(receipt.element, element); assert.equal(lookups, 1); checks++;
  now += 240_000; // Old five-minute local TTL has expired, original 15-minute snapshot has not.
  snapshot = await requestContext(() => reader.readSharedExactFindSnapshot("way/123"));
  assert.ok(snapshot); assert.equal(snapshot.acquiredAt, sourceTime); checks++;

  // Installed Next bypasses nested unstable_cache. The production wiring must
  // read first, then pass the validated server-only snapshot to the pack builder.
  const nested = await requestContext(() => unstable_cache(async () => reader.readSharedExactFindSnapshot("way/123"), ["nested-miss"])());
  assert.equal(nested, null);
  const seeded = await requestContext(async () => {
    const prebound = await reader.readSharedExactFindSnapshot("way/123");
    return unstable_cache(async () => reader.readExactSourceElement("way/123", forbiddenLookup, now, prebound), ["outer-exact-pass"])();
  });
  assert.equal(seeded.acquiredAt, sourceTime); assert.equal(lookups, 1); checks++;
  const sizeBeforeMissing = entries.size;
  assert.equal(await reader.readSharedExactFindSnapshot("way/999"), null);
  assert.equal(entries.size, sizeBeforeMissing, "Lookup misses must not cache null or errors");
  await assert.rejects(reader.readExactSourceElement("way/999", forbiddenLookup, now, snapshot), /fallback requested/); checks++;
  const changed = structuredClone(snapshot); changed.element.geometry[0].lon = 50;
  await assert.rejects(reader.readExactSourceElement("way/123", forbiddenLookup, now, changed), /fallback requested/); checks++;

  const sourceEntry = [...entries.values()].find(entry => JSON.parse(entry.data.body)?.sourceFeatureId === "way/123");
  const beforeTamper = sourceEntry.data.body;
  const invalid = JSON.parse(beforeTamper); invalid.element.tags.height = "999"; sourceEntry.data.body = JSON.stringify(invalid);
  assert.equal(await reader.readSharedExactFindSnapshot("way/123"), null);
  sourceEntry.data.body = beforeTamper; checks++;
  for (const extra of [{ userId: "private" }, { tags: { building: "office", password: "private" } }]) {
    await writer.shareExactFindElements({ elements: [{ ...element, ...extra, id: 456 }] }, sourceTime, ["way/456"]);
    assert.equal(await reader.readSharedExactFindSnapshot("way/456"), null);
  }
  assert.ok(!JSON.stringify([...entries.values()]).includes("private")); checks++;
  const originalSet = globalThis.__incrementalCache.set;
  for (const failingSet of [async () => { throw new Error("Offline cache write failed"); }, async () => {}]) {
    globalThis.__incrementalCache.set = failingSet;
    try {
      await assert.rejects(writer.shareExactFindElements({ elements: [{ ...element, id: 789 }] }, sourceTime, ["way/789"]), writer.ExactFindSnapshotUnavailableError);
    } finally { globalThis.__incrementalCache.set = originalSet; }
  }
  checks++;
  process.env.VERCEL_DEPLOYMENT_ID = "other_deployment";
  assert.equal(await reader.readSharedExactFindSnapshot("way/123"), null);
  process.env.VERCEL_DEPLOYMENT_ID = "offline_exact_deployment"; checks++;

  now = Date.parse(sourceTime) + 899_999;
  assert.ok(await reader.readSharedExactFindSnapshot("way/123"));
  now += 1;
  stale = true;
  const originalError = console.error; console.error = () => {};
  try { assert.equal(await requestContext(() => reader.readSharedExactFindSnapshot("way/123")), null); }
  finally { console.error = originalError; }
  stale = false;
  const beforeReseed = entries.size;
  await writer.shareExactFindElements(payload, sourceTime, ["way/123"]);
  assert.equal(entries.size, beforeReseed); assert.equal(await reader.readSharedExactFindSnapshot("way/123"), null); checks++;

  // Exercise the actual builder's final identity/anchor validation with a new snapshot.
  const { buildLivePointObjectEvidencePack } = await import("../src/lib/prototype/point-to-object-live-evidence.ts");
  now = Date.parse(sourceTime) + 60_000;
  snapshot = await reader.readSharedExactFindSnapshot("way/123");
  globalThis.fetch = async () => new Response("Offline optional source unavailable", { status: 503 });
  const pack = await buildLivePointObjectEvidencePack({ longitude: 55.2705, latitude: 25.2005, osmFeatureId: "way/123", locale: "en", expectedCountryCode: "ae", serverExactSnapshot: snapshot });
  assert.equal(pack.source.acquiredAt, sourceTime); assert.equal(pack.selectedObject.sourceFeatureId, "way/123");
  assert.equal(pack.geoContext.coverage, "unavailable"); assert.equal(pack.displayGeometry.type, "Polygon");
  await assert.rejects(buildLivePointObjectEvidencePack({ longitude: 103.85, latitude: 1.3, osmFeatureId: "way/123", locale: "en", expectedCountryCode: "sg", serverExactSnapshot: snapshot }), error => error.httpStatus === 409); checks++;
  const { acquirePublicEvidenceLease, reusePublicEvidenceLease } = await import("../src/lib/prototype/point-to-object-evidence-lease.ts");
  const lookup = { longitude: 55.2705, latitude: 25.2005, osmFeatureId: "way/123", locale: "en", expectedCountryCode: "ae" };
  const leased = await requestContext(() => acquirePublicEvidenceLease(lookup));
  assert.equal(leased.pack.source.acquiredAt, sourceTime);
  assert.equal(leased.receipt.acquiredAt, sourceTime);
  assert.equal(leased.pack.selectedObject.sourceFeatureId, "way/123");
  globalThis.fetch = async () => { throw new Error("Lease reuse must not acquire any source"); };
  const reused = await requestContext(() => reusePublicEvidenceLease(lookup, leased.receipt));
  assert.equal(reused.pack.evidencePackHash, leased.pack.evidencePackHash); checks++;
  now = Date.parse(sourceTime) + 900_000;
  const updatedPayload = structuredClone(payload); updatedPayload.elements[0].tags.height = "99";
  await writer.shareExactFindElements(updatedPayload, new Date(now).toISOString(), ["way/123"]);
  await assert.rejects(requestContext(() => acquirePublicEvidenceLease(lookup)), error => error.code === "AI_EVIDENCE_REFRESH_REQUIRED"); checks++;
  console.log(`PASS ${checks} shared exact-source cases: isolated contexts, rollover, original TTL, nested Next cache, tamper, identity, privacy, original fallback and anchor binding.`);
} finally {
  globalThis.fetch = originalFetch; Date.now = originalNow;
  if (originalDeployment === undefined) delete process.env.VERCEL_DEPLOYMENT_ID; else process.env.VERCEL_DEPLOYMENT_ID = originalDeployment;
}
