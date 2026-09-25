import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes, createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

// Run the installed Next15 cache implementation against an isolated in-memory
// IncrementalCache, not a replacement cache algorithm or an external service.
globalThis.AsyncLocalStorage = AsyncLocalStorage;
const require = createRequire(import.meta.url);
const { unstable_cache } = require("next/dist/server/web/spec-extension/unstable-cache.js");
const { workAsyncStorage } = require("next/dist/server/app-render/work-async-storage.external.js");
globalThis.__leaseCache = unstable_cache;
let sourceCalls = 0;
let packTransform = (pack) => pack;
const entries = new Map();
let stale = false;
globalThis.__incrementalCache = {
  generateSimpleCacheKey: async (value) => createHash("sha256").update(value).digest("hex"),
  get: async (key) => entries.has(key) ? { value: structuredClone(entries.get(key)), isStale: stale } : null,
  set: async (key, value) => { entries.set(key, structuredClone(value)); }
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%3DglobalThis.__leaseCache", shortCircuit: true };
    if (specifier.endsWith("/point-to-object-live-evidence")) return {
      url: `data:text/javascript,${encodeURIComponent("export const buildLivePointObjectEvidencePack=(input)=>globalThis.__leaseBuild(input); export class LivePointEvidenceError extends Error {}")}`,
      shortCircuit: true
    };
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
const { semanticHash } = await import("../src/lib/point-to-object/hash.ts");
const { acquirePublicEvidenceLease: acquire, reusePublicEvidenceLease: reuse, PublicEvidenceLeaseError } = await import("../src/lib/prototype/point-to-object-evidence-lease.ts");
const { parsePublicEvidenceReceipt, publicEvidenceReceiptIsCurrent } = await import("../src/lib/prototype/point-to-object-evidence-receipt.ts");
const input = { longitude: 55.27, latitude: 25.2, locale: "en", osmFeatureId: "way/123", expectedCountryCode: "ae" };
const oldNow = Date.now;
const oldFetch = globalThis.fetch;
const oldDeployment = process.env.VERCEL_DEPLOYMENT_ID;
let now = Date.parse("2026-09-21T12:03:00.000Z");
Date.now = () => now;
globalThis.fetch = async () => { throw new Error("This test must not contact a network or provider."); };
process.env.VERCEL_DEPLOYMENT_ID = "dpl_offline_one";
const buildFixture = async (lookup) => {
  sourceCalls += 1;
  assert.equal(lookup.deadlineAtMs, now + 12_000);
  assert.deepEqual(Object.keys(lookup).sort(), ["deadlineAtMs", "expectedCountryCode", "latitude", "locale", "longitude", "osmFeatureId", "includeClimate"].sort());
  assert.equal(lookup.includeClimate, true);
  const core = {
    protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2", caseKey: "live", caseId: "live_way_123",
    coordinates: { longitude: lookup.longitude, latitude: lookup.latitude, crs: "EPSG:4326" },
    resolution: { status: "resolved" }, selectedObject: { sourceFeatureId: lookup.osmFeatureId ?? "way/123" }, linkedEntity: null,
    source: { sourceResponseHash: "a".repeat(64), acquiredAt: new Date(now).toISOString() },
    nearbyContext: [], geoContext: {}, evidence: [], conflicts: [], missingInformation: [], limitations: [], caveat: "Offline public fixture"
  };
  const hash = semanticHash(core);
  return packTransform({ ...core, evidencePackHash: hash, evidencePackId: `p2o_live_evidence_${hash.slice(0, 24)}`, displayGeometry: null });
};
globalThis.__leaseBuild = buildFixture;
let checks = 0;
async function rejected(run) { await assert.rejects(run, PublicEvidenceLeaseError); checks += 1; }
try {
  await rejected(() => reuse(input, null));
  assert.equal(sourceCalls, 0);
  const first = await acquire(input);
  assert.ok(parsePublicEvidenceReceipt(first.receipt));
  assert.equal(entries.size, 1);
  assert.equal(first.receipt.expiresAt, new Date(now + 900_000).toISOString());
  assert.deepEqual(await reuse(input, first.receipt), first);
  assert.deepEqual(await acquire(input), first);
  assert.equal(sourceCalls, 1, "Context and AI use the same actual Next cache key."); checks += 4;
  first.pack.selectedObject.sourceFeatureId = "way/999";
  assert.equal((await reuse(input, first.receipt)).pack.selectedObject.sourceFeatureId, "way/123", "Returned data cannot mutate stored entries."); checks += 1;
  for (const variant of [{ longitude: 55.28 }, { latitude: 25.21 }, { locale: "ru,en" }, { osmFeatureId: "way/124" }, { expectedCountryCode: "sg" }]) {
    await rejected(() => reuse({ ...input, ...variant }, first.receipt));
  }
  assert.equal(sourceCalls, 1, "Lookup-only misses do not reacquire sources.");
  assert.equal((await reuse({ ...input, longitude: 55.27000001 }, first.receipt)).receipt.evidencePackHash, first.receipt.evidencePackHash); checks += 1;
  await rejected(() => reuse(input, { ...first.receipt, evidencePackHash: "b".repeat(64) }));
  process.env.VERCEL_DEPLOYMENT_ID = "dpl_offline_other";
  await rejected(() => reuse(input, first.receipt));
  process.env.VERCEL_DEPLOYMENT_ID = "dpl_offline_one";
  assert.equal(sourceCalls, 1);
  const reverse = await acquire({ ...input, osmFeatureId: null });
  assert.equal(reverse.receipt.lookupSourceFeatureId, null);
  assert.equal((await reuse({ ...input, osmFeatureId: null }, reverse.receipt)).pack.selectedObject.sourceFeatureId, "way/123"); checks += 1;
  // Eviction fails before any source/provider dispatch, even with a valid receipt.
  entries.clear();
  await rejected(() => reuse(input, first.receipt));
  assert.equal(sourceCalls, 2);
  const muscat = await acquire({ ...input, longitude: 58.41, latitude: 23.59, expectedCountryCode: "om" });
  assert.equal((await reuse({ ...input, longitude: 58.41, latitude: 23.59, expectedCountryCode: "om" }, muscat.receipt)).receipt.evidencePackHash, muscat.receipt.evidencePackHash); checks += 1;
  entries.clear();
  const fresh = await acquire(input);
  const stored = [...entries.values()][0];
  const corrupted = JSON.parse(stored.data.body);
  corrupted.pack.displayGeometry = { type: "Polygon", coordinates: [] };
  stored.data.body = JSON.stringify(corrupted);
  await rejected(() => reuse(input, fresh.receipt));
  entries.clear();
  const expired = await acquire(input);
  now += 900_000;
  await rejected(() => reuse(input, expired.receipt));
  assert.equal(publicEvidenceReceiptIsCurrent(expired.receipt), false);
  const refreshed = await acquire(input);
  assert.notEqual(refreshed.receipt.cacheWindow, expired.receipt.cacheWindow); checks += 1;
  // Actual Next App Router stale return: revalidation invokes lookup-only
  // closure, never builder. Explicit receipt validity remains decisive.
  stale = true;
  const beforeStaleCalls = sourceCalls;
  const work = { nextFetchId: 1, route: "/offline", isDraftMode: false };
  const previousError = console.error;
  console.error = () => {};
  try {
    const returned = await workAsyncStorage.run(work, () => reuse(input, refreshed.receipt));
    assert.equal(returned.receipt.evidencePackHash, refreshed.receipt.evidencePackHash);
    await Promise.all(Object.values(work.pendingRevalidates ?? {}));
    assert.equal(sourceCalls, beforeStaleCalls);
  } finally { console.error = previousError; }
  stale = false; checks += 1;
  for (const transform of [
    (pack) => ({ ...pack, projectId: "private-project" }),
    (pack) => ({ ...pack, selectedObject: { ...pack.selectedObject, password: "private" } }),
    (pack) => ({ ...pack, limitations: ["🙂".repeat(140_000)] }),
    (pack) => ({ ...pack, evidencePackHash: "f".repeat(64) })
  ]) {
    entries.clear(); packTransform = transform;
    await rejected(() => acquire(input));
    assert.equal(entries.size, 0, "Invalid/oversized/non-public entries cannot be persisted.");
  }
  packTransform = (pack) => pack;
  for (const patch of [{ expiresAt: new Date(now + 999_000).toISOString() }, { cacheWindow: -1 }, { sourceLocale: "fr" }, { question: "private" }, { lookupSourceFeatureId: "way/bad" }]) {
    assert.equal(parsePublicEvidenceReceipt({ ...refreshed.receipt, ...patch }), null); checks += 1;
  }
  // Source failure is never cached as an empty object.
  entries.clear();
  globalThis.__leaseBuild = async () => { throw new Error("offline upstream failure"); };
  await assert.rejects(() => acquire(input), /offline upstream failure/);
  assert.equal(entries.size, 0); checks += 1;
  globalThis.__leaseBuild = buildFixture;
  const { parseLiveResolvedObject } = await import("../components/point-to-object/live-session.ts");
  const { selectionWithCurrentEvidence } = await import("../components/point-to-object/evidence-selection.ts");
  const latest = await acquire(input);
  const subject = {
    name: "Public object", address: "Dubai", featureClass: "building", sourceFeatureId: "way/123", geometryType: null,
    coordinateAssociation: "trusted_open_map_identity", resultCentroidDistanceM: 0, addressParts: {}, tags: {}, metrics: null, linkedEntity: null,
    geoContext: { radiusM: 400, coverage: "available", sampleSize: 0, capReached: false, groups: [], mappedBuildingCount: 0,
      mappedLevelsKnownCount: 0, medianMappedLevels: null, nearestTransitM: null, nearestMajorRoadM: null,
      districtCharacter: { code: "low_signal", confidence: "low", ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1", driverGroups: [] } }
  };
  // Verify the real session parser, including historical records with no lease.
  assert.ok(parseLiveResolvedObject(subject)); checks += 1;
  const resolved = { ...subject, evidenceReceipt: latest.receipt };
  assert.deepEqual(parseLiveResolvedObject(resolved)?.evidenceReceipt, latest.receipt); checks += 1;
  assert.equal(parseLiveResolvedObject({ ...subject, evidenceReceipt: { ...latest.receipt, question: "private" } }), null); checks += 1;
  const selection = { locationKey: "dubai", longitude: input.longitude, latitude: input.latitude,
    object: { sourceFeatureId: "way/123", name: "Public object", geometry: null }, resolvedObject: resolved };
  let contextCalls = 0;
  const refreshRequest = async (url, init) => {
    contextCalls += 1;
    assert.equal(url, "/api/prototype/point-to-object/context");
    assert.deepEqual(JSON.parse(init.body), { caseKey: "dubai", longitude: input.longitude, latitude: input.latitude, locale: "en", expectedSourceFeatureId: "way/123" });
    return Response.json({ mode: "resolved", subject: resolved });
  };
  const signal = new AbortController().signal;
  assert.equal(await selectionWithCurrentEvidence(selection, "en", signal, refreshRequest), selection);
  assert.equal(contextCalls, 0, "A second depth does not refresh an accepted source snapshot."); checks += 1;
  const legacySelection = { ...selection, resolvedObject: subject };
  assert.equal((await selectionWithCurrentEvidence(legacySelection, "en", signal, refreshRequest)).resolvedObject.evidenceReceipt.evidencePackHash, latest.receipt.evidencePackHash);
  assert.equal(contextCalls, 1, "Legacy selection remains readable and refreshes exactly once before new analysis."); checks += 1;
  for (const invalidSubject of [subject, { ...resolved, sourceFeatureId: "way/999" }, { ...resolved, evidenceReceipt: expired.receipt }]) {
    await assert.rejects(() => selectionWithCurrentEvidence(legacySelection, "en", signal, async () => Response.json({ mode: "resolved", subject: invalidSubject })), /analysis was not started/); checks += 1;
  }
  await assert.rejects(() => selectionWithCurrentEvidence(legacySelection, "en", signal, async () => Response.json({ mode: "unavailable" }, { status: 429 })), /analysis was not started/); checks += 1;
  console.log(`point-to-object-evidence-lease-check: PASS (${checks} cases; installed Next cache; zero network/provider calls)`);
} finally {
  Date.now = oldNow; globalThis.fetch = oldFetch;
  if (oldDeployment === undefined) delete process.env.VERCEL_DEPLOYMENT_ID; else process.env.VERCEL_DEPLOYMENT_ID = oldDeployment;
  delete globalThis.__incrementalCache; delete globalThis.__leaseCache; delete globalThis.__leaseBuild;
}
