const baseUrl = (process.env.GEOAI_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const response = await fetch(`${baseUrl}/`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(response.ok, `Root route returned HTTP ${response.status}`);
const csp = response.headers.get("content-security-policy") ?? "";
assert(csp.includes("default-src 'self'"), "CSP default-src boundary is missing");
assert(csp.includes("frame-ancestors 'none'"), "CSP frame-ancestors boundary is missing");
assert(csp.includes("https://*.mapbox.com"), "CSP blocks the declared Mapbox browser path");
assert(csp.includes("https://*.supabase.co") && csp.includes("wss://*.supabase.co"), "CSP blocks future Supabase Auth/API/realtime browser paths");
assert(response.headers.get("strict-transport-security")?.includes("max-age="), "HSTS is missing");
assert(response.headers.get("x-content-type-options") === "nosniff", "MIME sniffing protection is missing");
assert(response.headers.get("x-frame-options") === "DENY", "Legacy frame protection is missing");
assert(response.headers.get("referrer-policy") === "strict-origin-when-cross-origin", "Referrer policy is missing");
assert(response.headers.get("permissions-policy")?.includes("camera=()"), "Permissions policy is missing");
assert(!response.headers.has("x-powered-by"), "X-Powered-By must be disabled");

console.log("Security-header contract passed: CSP dependencies, clickjacking, MIME, referrer, permissions, HSTS and server disclosure controls are present.");
