import assert from "node:assert/strict";

// Exercise the actual Next route adapter, not a synthetic native Request.
// Deliberately invalid bodies must stop before any source or paid operation.
const base = new URL(process.env.GEOAI_TEST_BASE_URL ?? "http://127.0.0.1:3000");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
assert.ok(["http:", "https:"].includes(base.protocol));
assert.equal(base.username + base.password + base.search + base.hash, "");
assert.equal(base.pathname, "/");
for (const route of ["find", "area-context"]) {
  const response = await fetch(new URL(`/api/prototype/point-to-object/${route}`, base), {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/json", Origin: base.origin },
    body: "{}",
    signal: AbortSignal.timeout(10_000)
  });
  // 400 = body rejected, 401 = identity required, 403 = surface/access denied.
  // In all cases a framework Request passed through without the former 502.
  assert.ok([400, 401, 403].includes(response.status), `${route}: unexpected status ${response.status}`);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  await response.body?.cancel();
  console.log(`Actual Next framework Request: ${route} ${response.status} PASS`);
}
