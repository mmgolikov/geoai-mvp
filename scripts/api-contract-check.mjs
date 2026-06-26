const baseUrl = (process.env.GEOAI_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const routes = [
  "/api/db/health",
  "/api/storage/health",
  "/api/platform/activation-status",
  "/api/pilot-backend/status",
  "/api/known-limitations",
  "/api/auth/session"
];
const secretPatterns = [
  /sk-[a-z0-9]/i,
  /postgres:\/\/[^"'\s]+:[^"'\s]+@/i,
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`);
  const text = await response.text();
  assert(response.status === 200, `${route} returned HTTP ${response.status}`);
  assert(!secretPatterns.some((pattern) => pattern.test(text)), `${route} appears to expose a secret-like value`);
  const payload = JSON.parse(text);
  assert(typeof payload === "object" && payload !== null, `${route} did not return a JSON object`);

  if (route === "/api/pilot-backend/status") {
    assert(typeof payload.status === "string", "pilot backend status is missing");
    assert(typeof payload.canRunDemoPilot === "boolean", "canRunDemoPilot is missing");
    assert(typeof payload.canRunConfidentialPilot === "boolean", "canRunConfidentialPilot is missing");
    assert(Array.isArray(payload.capabilities), "capabilities must be an array");
    if (payload.canRunConfidentialPilot) {
      const verified = payload.capabilities.filter((item) => item.status === "verified_active" || item.status === "configured_ready");
      assert(verified.length >= 8, "confidential pilot cannot be true without verified/configured capabilities");
    }
  }
}

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  checked: routes,
  caveat: "Contract check validates API shape and secret hygiene; it is not a security certification."
}, null, 2));
