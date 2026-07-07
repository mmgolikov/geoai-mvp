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
    assertString(payload.caveat, "db health missing caveat");
    assertArray(payload.blockers, "db health missing blockers");
    assertArray(payload.nextActions, "db health missing nextActions");
  }

  if (route === "/api/platform/activation-status") {
    assertString(payload.activationStatus, "platform activation missing activationStatus");
    assertString(payload.repositoryMode, "platform activation missing repositoryMode");
    assertArray(payload.blockers, "platform activation missing blockers");
    assertArray(payload.nextActions, "platform activation missing nextActions");
  }

  if (route === "/api/pilot-backend/status") {
    assertString(payload.status, "pilot backend status is missing");
    assert(typeof payload.canRunDemoPilot === "boolean", "canRunDemoPilot is missing");
    assert(typeof payload.canRunConfidentialPilot === "boolean", "canRunConfidentialPilot is missing");
    assertArray(payload.capabilities, "capabilities must be an array");
    assertArray(payload.blockers, "pilot backend blockers must be an array");
    assertArray(payload.nextActions, "pilot backend nextActions must be an array");
    assertArray(payload.caveats, "pilot backend caveats must be an array");
    assertObject(payload.supabaseActivation, "pilot backend missing supabaseActivation");
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

  if (dataFoundationRoutes.has(route)) {
    assertDataFoundationPayload(route, payload);
  } else {
    assertBackendPayload(route, payload);
  }

  checked.push(route);
}

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  checked,
  caveat: "Contract check validates API shape and secret hygiene; it is not a security certification."
}, null, 2));
