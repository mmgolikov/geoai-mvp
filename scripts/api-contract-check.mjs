const baseUrl = (process.env.GEOAI_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");

const routes = [
  "/api/health",
  "/api/data-sources",
  "/api/data-sources/readiness",
  "/api/external-data/manifest",
  "/api/external-data/status",
  "/api/source-lineage",
  "/api/db/health",
  "/api/storage/health",
  "/api/platform/activation-status",
  "/api/pilot-backend/status",
  "/api/known-limitations",
  "/api/auth/session"
];

const dataFoundationRoutes = new Set([
  "/api/data-sources",
  "/api/data-sources/readiness",
  "/api/external-data/manifest",
  "/api/external-data/status",
  "/api/source-lineage"
]);

const secretPatterns = [
  /sk-[a-z0-9]/i,
  /postgres:\/\/[^"'\s]+:[^"'\s]+@/i,
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/
];

const requiredCaveatPattern = /screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertString(value, message) {
  assert(typeof value === "string" && value.trim().length > 0, message);
}

function assertArray(value, message) {
  assert(Array.isArray(value), message);
}

function assertObject(value, message) {
  assert(typeof value === "object" && value !== null && !Array.isArray(value), message);
}

function assertCaveat(value, message) {
  const values = Array.isArray(value) ? value : [value];
  assert(values.some((item) => typeof item === "string" && item.trim().length > 0), message);
}

function assertNoPositiveReadinessClaim(route, text, payload) {
  const normalized = text.toLowerCase();
  const hasReadyPhrase = /production[-_]ready|pilot[-_]ready/.test(normalized);
  if (!hasReadyPhrase) return;

  const hasExplicitNegative = /not[-_ ]production[-_ ]ready|not[-_ ]pilot[-_ ]ready|not_production_ready_or_pilot_ready/.test(normalized);
  const hardVerified = payload.runtimeReadiness?.hardAccessVerified === true &&
    payload.runtimeReadiness?.schemaReady === true &&
    payload.runtimeReadiness?.storageReady === true;
  assert(hasExplicitNegative || hardVerified, `${route} appears to make a production-ready or pilot-ready claim without hard runtime verification`);
}

function assertRuntimeReadiness(route, runtimeReadiness) {
  assertObject(runtimeReadiness, `${route} missing runtimeReadiness`);
  assertString(runtimeReadiness.runtimeMode, `${route} runtimeReadiness missing runtimeMode`);
  assertString(runtimeReadiness.repositoryMode, `${route} runtimeReadiness missing repositoryMode`);
  assert(typeof runtimeReadiness.supabaseConfigured === "boolean", `${route} runtimeReadiness missing supabaseConfigured`);
  assert(typeof runtimeReadiness.hasSupabasePublicEnv === "boolean", `${route} runtimeReadiness missing hasSupabasePublicEnv`);
  assert(typeof runtimeReadiness.hasSupabaseServerEnv === "boolean", `${route} runtimeReadiness missing hasSupabaseServerEnv`);
  assert(typeof runtimeReadiness.hasSupabaseServiceRoleEnv === "boolean", `${route} runtimeReadiness missing hasSupabaseServiceRoleEnv`);
  assert(typeof runtimeReadiness.serviceRoleUsedForWrites === "boolean", `${route} runtimeReadiness missing serviceRoleUsedForWrites`);
  assert(runtimeReadiness.serviceRoleUsedForWrites === false, `${route} runtimeReadiness must never report service-role writes`);
  assert(typeof runtimeReadiness.canReadHealthcheck === "boolean", `${route} runtimeReadiness missing canReadHealthcheck`);
  assert(typeof runtimeReadiness.canReadSourceRegistry === "boolean", `${route} runtimeReadiness missing canReadSourceRegistry`);
  assert(typeof runtimeReadiness.canReadExternalSnapshots === "boolean", `${route} runtimeReadiness missing canReadExternalSnapshots`);
  assert(typeof runtimeReadiness.schemaReady === "boolean", `${route} runtimeReadiness missing schemaReady`);
  assert(typeof runtimeReadiness.postgisReady === "boolean", `${route} runtimeReadiness missing postgisReady`);
  assert(typeof runtimeReadiness.storageReady === "boolean", `${route} runtimeReadiness missing storageReady`);
  assert(typeof runtimeReadiness.localApiFallbackActive === "boolean", `${route} runtimeReadiness missing localApiFallbackActive`);
  assertArray(runtimeReadiness.blockers, `${route} runtimeReadiness missing blockers`);
  assertArray(runtimeReadiness.nextActions, `${route} runtimeReadiness missing nextActions`);
  assertCaveat(runtimeReadiness.caveats ?? runtimeReadiness.caveat, `${route} runtimeReadiness missing caveats`);
  assertString(runtimeReadiness.generatedAt, `${route} runtimeReadiness missing generatedAt`);
}

function assertDataFoundationPayload(route, payload) {
  assert(payload.ok === true, `${route} must return ok: true`);
  assertString(payload.version, `${route} missing version`);
  assertString(payload.mode, `${route} missing mode`);
  assertString(payload.source, `${route} missing source`);
  assertObject(payload.summary, `${route} missing summary`);
  assertObject(payload.manifest, `${route} missing manifest`);
  assertObject(payload.sourceQuality, `${route} missing sourceQuality`);
  assertArray(payload.sourceQuality.groups, `${route} sourceQuality.groups must be an array`);
  assert(payload.sourceQuality.groups.length >= 5, `${route} should expose the five core source-quality groups`);
  assertArray(payload.sourceGroups, `${route} missing sourceGroups`);
  assertArray(payload.readiness, `${route} missing readiness`);
  assertArray(payload.lineage, `${route} missing lineage`);
  assertArray(payload.blockers, `${route} missing blockers`);
  assertArray(payload.nextActions, `${route} missing nextActions`);
  assertString(payload.caveat, `${route} missing caveat`);
  assert(requiredCaveatPattern.test(payload.caveat), `${route} caveat does not match required data-honesty framing`);
  assertString(payload.generatedAt, `${route} missing generatedAt`);

  for (const group of payload.sourceGroups) {
    assertObject(group, `${route} sourceGroups entries must be objects`);
    assertString(group.id, `${route} source group missing id`);
    assertString(group.name, `${route} source group missing name`);
    assertString(group.status, `${route} source group missing status`);
    assertString(group.dataMode, `${route} source group missing dataMode`);
    assertString(group.confidence, `${route} source group missing confidence`);
    assertString(group.caveat, `${route} source group missing caveat`);
    assertString(group.nextValidationStep, `${route} source group missing nextValidationStep`);
    assertObject(group.sourceQuality, `${route} source group missing sourceQuality`);
    assertString(group.sourceQuality.validationStatus, `${route} source group sourceQuality missing validationStatus`);
  }

  for (const lineage of payload.lineage) {
    assertObject(lineage, `${route} lineage entries must be objects`);
    assertString(lineage.sourceGroupId, `${route} lineage missing sourceGroupId`);
    assertString(lineage.sourceGroupName, `${route} lineage missing sourceGroupName`);
    assertString(lineage.status, `${route} lineage missing status`);
    assertString(lineage.caveat, `${route} lineage missing caveat`);
    assertString(lineage.nextValidationStep, `${route} lineage missing nextValidationStep`);
  }
}

function assertBackendPayload(route, payload) {
  if (route === "/api/health") {
    assert(payload.status === "ok", "health status must be ok");
    assertString(payload.mode, "health missing mode");
    assertString(payload.dataStatus, "health missing dataStatus");
    assert(/live official integrations are not connected/i.test(payload.dataStatus), "health must preserve no-live-official-integration framing");
  }

  if (route === "/api/db/health") {
    assertString(payload.status, "db health missing status");
    assertString(payload.repositoryMode, "db health missing repositoryMode");
    assertString(payload.runtimeMode, "db health missing runtimeMode");
    assert(typeof payload.supabaseConfigured === "boolean", "db health missing supabaseConfigured");
    assert(typeof payload.healthcheckReachable === "boolean", "db health missing healthcheckReachable");
    assert(typeof payload.schemaReady === "boolean", "db health missing schemaReady");
    assert(typeof payload.postgisReady === "boolean", "db health missing postgisReady");
    assert(typeof payload.sourceRegistryReady === "boolean", "db health missing sourceRegistryReady");
    assert(typeof payload.externalSnapshotsReady === "boolean", "db health missing externalSnapshotsReady");
    assertString(payload.caveat, "db health missing caveat");
    assertCaveat(payload.caveats ?? payload.caveat, "db health missing caveats");
    assertArray(payload.blockers, "db health missing blockers");
    assertArray(payload.nextActions, "db health missing nextActions");
    assertRuntimeReadiness(route, payload.runtimeReadiness);
  }

  if (route === "/api/platform/activation-status") {
    assertString(payload.activationStatus, "platform activation missing activationStatus");
    assertString(payload.repositoryMode, "platform activation missing repositoryMode");
    assertString(payload.runtimeMode, "platform activation missing runtimeMode");
    assert(typeof payload.supabaseConfigured === "boolean", "platform activation missing supabaseConfigured");
    assert(typeof payload.supabaseReachable === "boolean", "platform activation missing supabaseReachable");
    assert(typeof payload.localApiFallbackActive === "boolean", "platform activation missing localApiFallbackActive");
    assertArray(payload.blockers, "platform activation missing blockers");
    assertArray(payload.nextActions, "platform activation missing nextActions");
    assertCaveat(payload.caveats ?? payload.caveat, "platform activation missing caveats");
    assertRuntimeReadiness(route, payload.runtimeReadiness);
  }

  if (route === "/api/pilot-backend/status") {
    assertString(payload.status, "pilot backend status is missing");
    assertString(payload.repositoryMode, "pilot backend missing repositoryMode");
    assertString(payload.runtimeMode, "pilot backend missing runtimeMode");
    assert(typeof payload.canRunDemoPilot === "boolean", "canRunDemoPilot is missing");
    assert(typeof payload.canRunDemoWorkflow === "boolean", "canRunDemoWorkflow is missing");
    assert(typeof payload.canRunConfidentialPilot === "boolean", "canRunConfidentialPilot is missing");
    assert(typeof payload.supabaseConfigured === "boolean", "pilot backend missing supabaseConfigured");
    assert(typeof payload.localApiFallbackActive === "boolean", "pilot backend missing localApiFallbackActive");
    assertArray(payload.capabilities, "capabilities must be an array");
    assertArray(payload.blockers, "pilot backend blockers must be an array");
    assertArray(payload.nextActions, "pilot backend nextActions must be an array");
    assertArray(payload.caveats, "pilot backend caveats must be an array");
    assertCaveat(payload.caveats, "pilot backend missing caveats");
    assertObject(payload.supabaseActivation, "pilot backend missing supabaseActivation");
    assertRuntimeReadiness(route, payload.runtimeReadiness);
    if (payload.canRunConfidentialPilot) {
      const verified = payload.capabilities.filter((item) => item.status === "verified_active" || item.status === "configured_ready");
      assert(verified.length >= 8, "confidential pilot cannot be true without verified/configured capabilities");
    }
  }
}

const checked = [];

for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`);
  const text = await response.text();
  assert(response.status === 200, `${route} returned HTTP ${response.status}`);
  assert(!secretPatterns.some((pattern) => pattern.test(text)), `${route} appears to expose a secret-like value`);
  const payload = JSON.parse(text);
  assertObject(payload, `${route} did not return a JSON object`);
  assertNoPositiveReadinessClaim(route, text, payload);

  if (dataFoundationRoutes.has(route)) {
    assertDataFoundationPayload(route, payload);
  } else {
    assertBackendPayload(route, payload);
  }

  checked.push(route);
}

const boundedPointRoutes = [
  "/api/context/climate",
  "/api/context/solar-energy",
  "/api/context/air-quality",
  "/api/context/demographics",
  "/api/context/accessibility",
  "/api/context/spatial",
  "/api/external-data/climate-context"
];

for (const route of boundedPointRoutes) {
  const missing = await fetch(`${baseUrl}${route}`);
  assert(missing.status === 400, `${route} must reject missing coordinates instead of querying (0, 0)`);
  const outOfRange = await fetch(`${baseUrl}${route}?lat=91&lng=181`);
  assert(outOfRange.status === 400, `${route} must reject out-of-range coordinates`);
  checked.push(`${route}#coordinate-guard`);
}

const openMeteoGate = await fetch(`${baseUrl}/api/context/climate?lat=25.2048&lng=55.2708`);
assert(openMeteoGate.status === 200, "Open-Meteo licence gate route must return a declared state");
const openMeteoPayload = await openMeteoGate.json();
assert(openMeteoPayload.status === "permission_required", "Open-Meteo free API must remain permission-gated");
assert(openMeteoPayload.metrics?.avgTemperatureC === null, "Permission-gated Open-Meteo must not return fabricated metrics");
checked.push("/api/context/climate#open-meteo-license-gate");

const legacySolarGate = await fetch(`${baseUrl}/api/context/solar-energy?lat=25.2048&lng=55.2708`);
assert(legacySolarGate.status === 200, "Legacy solar route must return a declared fallback state");
const legacySolarPayload = await legacySolarGate.json();
assert(legacySolarPayload.status === "sample_fallback", "Legacy solar route must not bypass the controlled source pack");
assert(legacySolarPayload.fallbackReason === "runtime_source_pack_required", "Legacy solar fallback reason changed unexpectedly");
checked.push("/api/context/solar-energy#controlled-pack-gate");

const productionSourcePack = await fetch(`${baseUrl}/api/external-data/source-connection-pack`);
assert(productionSourcePack.status === 503, "Generic production runtime must fail closed before provider execution");
const productionSourcePackPayload = await productionSourcePack.json();
assert(productionSourcePackPayload.effectiveMode === "disabled", "Production source pack must report disabled mode");
assert(productionSourcePackPayload.activationAllowed === false, "Production source pack must deny activation");
assert(Array.isArray(productionSourcePackPayload.sources) && productionSourcePackPayload.sources.length === 0, "Production source pack must return zero provider observations");
checked.push("/api/external-data/source-connection-pack#production-fail-closed");

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  checked,
  caveat: "Contract check validates API shape and secret hygiene; it is not a security certification."
}, null, 2));
