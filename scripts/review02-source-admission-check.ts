import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import type { PilotIdentityDecision } from "../src/lib/auth/require-pilot-identity";

// Exercise the installed Next cache and real route/lease/admission modules.
// Only Auth/runtime/source adapters are injected; all network access is denied.
const fixture = globalThis as typeof globalThis & {
  AsyncLocalStorage: typeof AsyncLocalStorage;
  __review02Cache?: unknown;
  __incrementalCache?: unknown;
  __review02Identity?: PilotIdentityDecision;
  __review02SurfaceEnabled?: boolean;
  __review02Build?: (input: Record<string, unknown>) => Promise<unknown>;
};
fixture.AsyncLocalStorage = AsyncLocalStorage;
const require = createRequire(import.meta.url);
fixture.__review02Cache = require("next/dist/server/web/spec-extension/unstable-cache.js").unstable_cache;
const entries = new Map<string, { data: { body: string } }>();
fixture.__incrementalCache = {
  generateSimpleCacheKey: async (value: string) => createHash("sha256").update(value).digest("hex"),
  get: async (key: string) => entries.has(key) ? { value: structuredClone(entries.get(key)), isStale: false } : null,
  set: async (key: string, value: { data: { body: string } }) => { entries.set(key, structuredClone(value)); }
};
const root = new URL("../", import.meta.url);
const stub = (source: string) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true as const });
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return stub("export {};");
    if (specifier === "next/cache") return stub("export const unstable_cache = globalThis.__review02Cache;");
    if (specifier === "next/server") return stub("export const NextResponse = { json: (body, init = {}) => new Response(JSON.stringify(body), { status: init.status ?? 200, headers: init.headers }) };");
    if (specifier.endsWith("/require-pilot-identity")) return stub("export const requirePilotIdentity = async () => globalThis.__review02Identity; export const requirePilotMutationOrigin = () => null;");
    if (specifier.endsWith("/openai-upstream-gate")) return stub("export const getPointObjectSurfaceStatus = () => ({ enabled: globalThis.__review02SurfaceEnabled });");
    if (specifier.endsWith("/point-to-object-live-evidence")) return stub("export const buildLivePointObjectEvidencePack = input => globalThis.__review02Build(input); export class LivePointEvidenceError extends Error {}");
    if (specifier.startsWith("@/")) return nextResolve(new URL(`${specifier.slice(2)}.ts`, root).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
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

const { semanticHash } = await import(new URL("src/lib/point-to-object/hash.ts", root).href);
const { acquirePublicEvidenceLease: acquire, reusePublicEvidenceLease: reuse, PublicEvidenceLeaseError } =
  await import(new URL("src/lib/prototype/point-to-object-evidence-lease.ts", root).href);
const { createPointObjectContextSourceAdmission, pointObjectContextAcquisitionPolicy, PointObjectSourceAdmissionError } =
  await import(new URL("src/lib/prototype/point-to-object-source-admission.ts", root).href);
const route = await import(new URL("app/api/prototype/point-to-object/context/route.ts", root).href);
const runtimePolicy = await import(new URL("src/lib/prototype/point-object-runtime-policy.ts", root).href);
const previousFetch = globalThis.fetch;
const previousNow = Date.now;
const metadataKeys = ["VERCEL_ENV", "VERCEL_GIT_COMMIT_REF", "VERCEL_DEPLOYMENT_ID", "VERCEL_URL"] as const;
const previousMetadata = Object.fromEntries(metadataKeys.map((key) => [key, process.env[key]]));
let now = Date.parse("2026-10-02T10:03:00.000Z");
Date.now = () => now;
process.env.VERCEL_DEPLOYMENT_ID = "dpl_review02_offline";
process.env.VERCEL_ENV = "preview";
delete process.env.VERCEL_GIT_COMMIT_REF;
delete process.env.VERCEL_URL;
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls += 1; throw new Error("Network/provider access is forbidden."); };
let sourceCalls = 0;
let admissionCalls = 0;
let hold: Promise<void> | null = null;
let failSource = false;
const lookup = { longitude: 55.27, latitude: 25.2, locale: "en", osmFeatureId: "way/123", expectedCountryCode: "ae" };
const geoContext = {
  radiusM: 400, coverage: "unavailable", sampleSize: 0, capReached: false, groups: [],
  mappedBuildingCount: 0, mappedLevelsKnownCount: 0, medianMappedLevels: null,
  nearestTransitM: null, nearestMajorRoadM: null,
  districtCharacter: { code: "low_signal", confidence: "low", ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1", driverGroups: [] }
};
fixture.__review02Build = async (input) => {
  sourceCalls += 1;
  if (hold) await hold;
  if (failSource) throw new Error("Offline source failure");
  const core = {
    protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2", caseKey: "live", caseId: "review02_offline",
    coordinates: { longitude: input.longitude, latitude: input.latitude, crs: "EPSG:4326" },
    resolution: { status: "resolved", coordinateAssociation: "trusted_open_map_identity", resultCentroidDistanceM: 0 },
    selectedObject: { sourceFeatureId: input.osmFeatureId ?? "way/123", name: "Offline object", displayAddress: "Dubai",
      featureClass: "building", geometryType: "Polygon", addressParts: {}, tags: {}, metrics: null },
    linkedEntity: null,
    source: { sourceResponseHash: "a".repeat(64), acquiredAt: new Date(now).toISOString(),
      fabricStatus: "unavailable", fabricObservedAt: null, fabricResponseHash: null, fabricDiagnostic: { failureCode: "timeout" } },
    nearbyContext: [], geoContext, evidence: [], conflicts: [], missingInformation: [], limitations: [], caveat: "Offline public fixture"
  };
  const evidencePackHash = semanticHash(core);
  return { ...core, evidencePackHash, evidencePackId: `p2o_live_evidence_${evidencePackHash.slice(0, 24)}`, displayGeometry: null };
};

function user(index: number): Extract<PilotIdentityDecision, { allowed: true }> {
  const id = `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`;
  return { allowed: true, mode: "supabase_auth", context: {
    requestId: "offline", status: "verified", verified: true, supabase: null,
    user: { id, is_anonymous: false } as NonNullable<Extract<PilotIdentityDecision, { allowed: true }>["context"]>["user"],
    profile: { id: `profile-${index}`, authUserId: id, email: null, fullName: null, status: "active", identityKind: "user" }
  } };
}
const publicIdentity = { allowed: true, mode: "demo_public", context: null } as const;
let checks = 0;
function limited(run: () => unknown) { assert.throws(run, PointObjectSourceAdmissionError); checks += 1; }
function request(id: number, extra: Record<string, string> = {}) {
  return new Request("https://preview.example.test/api/prototype/point-to-object/context", {
    method: "POST", headers: { origin: "https://preview.example.test", "content-type": "application/json", ...extra },
    body: JSON.stringify({ caseKey: "dubai", longitude: 55.27, latitude: 25.2, locale: "en", expectedSourceFeatureId: `way/${id}` })
  });
}

try {
  const reviewPolicy = { environment: { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/sprint10-control-20260918",
    VERCEL_DEPLOYMENT_ID: "dpl_offline_review02" }, surfaceEnabled: true };
  assert.deepEqual(pointObjectContextAcquisitionPolicy(reviewPolicy), {
    scope: "review02_preview_testers", clientMaximum: 60, globalMaximum: 60
  }); checks += 1;
  assert.equal(pointObjectContextAcquisitionPolicy({ ...reviewPolicy, environment: {
    VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/sprint10-control-20260918", VERCEL_URL: "geoai-offline.vercel.app"
  } }).clientMaximum, 60); checks += 1;
  for (const policy of [
    { ...reviewPolicy, environment: { ...reviewPolicy.environment, VERCEL_ENV: "production" } },
    { ...reviewPolicy, environment: { ...reviewPolicy.environment, VERCEL_GIT_COMMIT_REF: "codex/another-preview" } },
    { ...reviewPolicy, environment: { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/sprint10-control-20260918" } },
    { ...reviewPolicy, environment: { VERCEL_ENV: "preview", VERCEL_DEPLOYMENT_ID: "dpl_offline_review02" } },
    { ...reviewPolicy, environment: {} },
    { ...reviewPolicy, surfaceEnabled: false }
  ]) {
    assert.equal(pointObjectContextAcquisitionPolicy(policy).clientMaximum, 12);
    assert.equal(pointObjectContextAcquisitionPolicy(policy).globalMaximum, 60);
    const normal = createPointObjectContextSourceAdmission(() => now);
    for (let count = 0; count < 12; count += 1) normal(user(70), policy);
    limited(() => normal(user(70), policy));
  }
  const testersAdmit = createPointObjectContextSourceAdmission(() => now);
  for (let count = 0; count < 60; count += 1) testersAdmit(user(70), reviewPolicy);
  limited(() => testersAdmit(user(70), reviewPolicy));
  limited(() => testersAdmit(user(71), reviewPolicy)); // Existing global source capacity remains 60.
  const demoTestersAdmit = createPointObjectContextSourceAdmission(() => now);
  for (let count = 0; count < 60; count += 1) demoTestersAdmit(publicIdentity, reviewPolicy);
  limited(() => demoTestersAdmit(publicIdentity, reviewPolicy)); // Tester scope is deployment-bound, not personal.
  const admit = createPointObjectContextSourceAdmission(() => now);
  for (let index = 0; index < 12; index += 1) admit(user(1));
  limited(() => admit(user(1)));
  for (let index = 0; index < 12; index += 1) admit(user(2));
  limited(() => admit(user(2))); // Outside the exact approved Preview, every user retains the standard quota.
  checks += 1;
  const publicAdmit = createPointObjectContextSourceAdmission(() => now);
  for (let index = 0; index < 12; index += 1) publicAdmit(publicIdentity);
  limited(() => publicAdmit(publicIdentity));
  const mismatched = user(3);
  mismatched.context!.profile!.authUserId = user(4).context!.user!.id;
  limited(() => publicAdmit(mismatched));
  const anonymous = user(3);
  anonymous.context!.user!.is_anonymous = true;
  limited(() => publicAdmit(anonymous));
  const ambiguous = user(3);
  delete ambiguous.context!.user!.is_anonymous;
  limited(() => publicAdmit(ambiguous));

  const globalAdmit = createPointObjectContextSourceAdmission(() => now);
  for (let id = 1; id <= 5; id += 1) for (let count = 0; count < 12; count += 1) globalAdmit(user(id));
  limited(() => globalAdmit(user(6)));
  now += 10 * 60_000;
  for (let count = 0; count < 12; count += 1) globalAdmit(user(6));
  limited(() => globalAdmit(user(6))); checks += 1;

  let release!: () => void;
  hold = new Promise<void>((resolve) => { release = resolve; });
  const burst = Array.from({ length: 24 }, () => acquire(lookup, () => { admissionCalls += 1; }));
  // Let the real Next cache lookup reach the injected source before releasing it.
  for (let step = 0; step < 20 && sourceCalls === 0; step += 1) await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(admissionCalls, 1);
  assert.equal(sourceCalls, 1);
  release(); hold = null;
  const leases = await Promise.all(burst);
  assert.equal(admissionCalls, 1);
  assert.equal(sourceCalls, 1);
  assert.equal(entries.size, 1);
  assert.notEqual(leases[0].pack, leases[1].pack);
  assert.notEqual(leases[0].receipt, leases[1].receipt);
  leases[0].pack.selectedObject.sourceFeatureId = "way/999";
  leases[0].receipt.evidencePackHash = "b".repeat(64);
  assert.equal(leases[1].pack.selectedObject.sourceFeatureId, "way/123");
  assert.notEqual(leases[1].receipt.evidencePackHash, leases[0].receipt.evidencePackHash); checks += 4;
  const cached = await acquire(lookup, () => { throw new Error("A cache hit must not consume quota."); });
  assert.deepEqual(cached, leases[1]);
  assert.deepEqual(await reuse(lookup, cached.receipt), cached);
  assert.equal(sourceCalls, 1); checks += 2;
  for (const changed of [{ longitude: 55.28 }, { latitude: 25.21 }, { locale: "ru,en" }, { osmFeatureId: "way/124" }, { expectedCountryCode: "sg" }]) {
    await assert.rejects(() => reuse({ ...lookup, ...changed }, cached.receipt), PublicEvidenceLeaseError); checks += 1;
  }
  assert.equal(sourceCalls, 1);
  await assert.rejects(() => reuse(lookup, { ...cached.receipt, sourceResponseHash: "f".repeat(64) }), PublicEvidenceLeaseError); checks += 1;
  const stored = [...entries.values()][0];
  const corrupted = JSON.parse(stored.data.body);
  corrupted.pack.displayGeometry = { type: "Polygon", coordinates: [] };
  stored.data.body = JSON.stringify(corrupted);
  await assert.rejects(() => acquire(lookup, () => { throw new Error("Corrupt cache is not a source acquisition."); }), PublicEvidenceLeaseError);
  assert.equal(sourceCalls, 1); checks += 1;
  entries.clear();
  await assert.rejects(() => reuse(lookup, cached.receipt), PublicEvidenceLeaseError);
  assert.equal(sourceCalls, 1); checks += 1;
  const refreshed = await acquire(lookup, () => { admissionCalls += 1; });
  assert.equal(sourceCalls, 2);
  now += 15 * 60_000;
  await assert.rejects(() => reuse(lookup, refreshed.receipt), PublicEvidenceLeaseError);
  const later = await acquire(lookup, () => { admissionCalls += 1; });
  assert.notEqual(later.receipt.cacheWindow, refreshed.receipt.cacheWindow);
  assert.equal(admissionCalls, 3); checks += 2;
  process.env.VERCEL_DEPLOYMENT_ID = "dpl_review02_other";
  await assert.rejects(() => reuse(lookup, later.receipt), PublicEvidenceLeaseError);
  process.env.VERCEL_DEPLOYMENT_ID = "dpl_review02_offline"; checks += 1;
  entries.clear(); failSource = true;
  const failed = Array.from({ length: 6 }, () => acquire(lookup, () => { admissionCalls += 1; }));
  const failures = await Promise.allSettled(failed);
  assert.ok(failures.every((result) => result.status === "rejected"));
  assert.equal(entries.size, 0);
  assert.equal(admissionCalls, 4);
  failSource = false;
  await acquire(lookup, () => { admissionCalls += 1; });
  assert.equal(admissionCalls, 5); checks += 2;

  fixture.__review02Identity = { allowed: false, response: Response.json({ code: "authentication_required" }, { status: 401 }) };
  fixture.__review02SurfaceEnabled = true;
  const beforeDeniedCalls = sourceCalls;
  assert.equal((await route.POST(request(801))).status, 401);
  assert.equal(sourceCalls, beforeDeniedCalls); checks += 1;
  fixture.__review02Identity = user(40);
  fixture.__review02SurfaceEnabled = runtimePolicy.resolvePointObjectRuntimePolicy({ VERCEL_ENV: "production", NODE_ENV: "production" }, {
    openAiKeyConfigured: false, generalUpstreamEnabled: false
  }).surface.enabled;
  assert.equal((await route.POST(request(801))).status, 403);
  assert.equal(sourceCalls, beforeDeniedCalls); checks += 1;
  fixture.__review02SurfaceEnabled = true;
  const routeBurst = await Promise.all(Array.from({ length: 24 }, () => route.POST(request(801))));
  assert.ok(routeBurst.every((response) => response.status === 200));
  assert.equal(sourceCalls, beforeDeniedCalls + 1);
  assert.equal((await route.POST(request(801))).status, 200);
  assert.equal(sourceCalls, beforeDeniedCalls + 1); checks += 2;
  for (let id = 802; id <= 812; id += 1) assert.equal((await route.POST(request(id))).status, 200);
  const denied = await route.POST(request(813, { "x-forwarded-for": "203.0.113.19", "x-real-ip": "203.0.113.20", "x-geoai-rate-profile": "founder" }));
  assert.equal(denied.status, 429);
  assert.equal((await denied.json()).rateLimitScope, "source_acquisition");
  assert.equal(denied.headers.get("retry-after"), "600");
  const beforeBlocked = sourceCalls;
  assert.equal((await route.POST(request(814, { "x-forwarded-for": "203.0.113.99" }))).status, 429);
  assert.equal(sourceCalls, beforeBlocked);
  assert.equal((await route.POST(request(801))).status, 200);
  assert.equal(sourceCalls, beforeBlocked); checks += 3;
  fixture.__review02Identity = user(41);
  for (let id = 901; id <= 912; id += 1) assert.equal((await route.POST(request(id))).status, 200);
  assert.equal((await route.POST(request(913))).status, 429); checks += 1;
  fixture.__review02Identity = publicIdentity;
  for (let id = 1001; id <= 1012; id += 1) assert.equal((await route.POST(request(id))).status, 200);
  assert.equal((await route.POST(request(1013, { "x-geoai-user-id": user(42).context!.user!.id, "x-vercel-forwarded-for": "203.0.113.30" }))).status, 429);
  assert.equal((await route.POST(request(1014, { "x-forwarded-for": "203.0.113.100", "x-geoai-rate-profile": "founder" }))).status, 429); checks += 2;

  // Header claims cannot activate the budget without exact trusted server metadata.
  assert.equal((await route.POST(request(1015, { "x-vercel-env": "preview", "x-vercel-git-commit-ref": "codex/sprint10-control-20260918",
    "x-vercel-deployment-id": "dpl_claimed_by_browser" }))).status, 429); checks += 1;
  now += 10 * 60_000;
  entries.clear();
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_GIT_COMMIT_REF = "codex/sprint10-control-20260918";
  process.env.VERCEL_DEPLOYMENT_ID = "dpl_review02_testers";
  fixture.__review02Identity = user(52);
  const beforeTesterCalls = sourceCalls;
  for (let id = 2001; id <= 2060; id += 1) assert.equal((await route.POST(request(id))).status, 200);
  assert.equal(sourceCalls, beforeTesterCalls + 60);
  assert.equal((await route.POST(request(2061))).status, 429);
  fixture.__review02Identity = user(53);
  assert.equal((await route.POST(request(2062))).status, 429, "The tester budget cannot enlarge global provider acquisition capacity.");
  assert.equal((await route.POST(request(2001))).status, 200);
  assert.equal(sourceCalls, beforeTesterCalls + 60); checks += 3;
  assert.equal(networkCalls, 0);
  console.log(`review02 source admission: PASS (${checks} checks; real Next cache; ${sourceCalls} injected acquisitions; network/provider calls=0; exact Preview tester budget=60; global capacity=60)`);
} finally {
  globalThis.fetch = previousFetch;
  Date.now = previousNow;
  for (const key of metadataKeys) {
    if (previousMetadata[key] === undefined) delete process.env[key];
    else process.env[key] = previousMetadata[key];
  }
  delete fixture.__review02Cache; delete fixture.__incrementalCache;
  delete fixture.__review02Identity; delete fixture.__review02SurfaceEnabled; delete fixture.__review02Build;
}
