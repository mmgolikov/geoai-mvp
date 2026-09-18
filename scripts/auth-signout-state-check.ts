import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
// @ts-expect-error Node's strip-types runner requires the physical .ts suffix; production imports remain extensionless.
import { createSingleFlight, readBrowserServerSession, requestConfirmedBrowserSignOut, resolveBrowserSignOutDisposition } from "../src/lib/auth/browser-session-transport.ts";

const exampleUser = {
  id: "synthetic-user",
  email: "synthetic@example.invalid",
  phone: null,
  profile: {
    fullName: "Synthetic User",
    region: "UAE",
    defaultAudience: "b2b" as const,
    defaultRole: "developer" as const,
    contactPhone: "",
    avatarUrl: null
  }
};

const confirmed = await requestConfirmedBrowserSignOut(async () => new Response(JSON.stringify({
  ok: true,
  status: "signed_out"
}), { status: 200, headers: { "Content-Type": "application/json" } }));
assert.deepEqual(confirmed, { ok: true, reason: "confirmed" });

const rejected = await requestConfirmedBrowserSignOut(async () => new Response(JSON.stringify({
  ok: false,
  status: "logout_failed"
}), { status: 503, headers: { "Content-Type": "application/json" } }));
assert.deepEqual(rejected, { ok: false, reason: "server_rejected" });

const malformedSuccess = await requestConfirmedBrowserSignOut(async () => new Response("not-json", { status: 200 }));
assert.deepEqual(malformedSuccess, { ok: false, reason: "server_rejected" });

const networkFailure = await requestConfirmedBrowserSignOut(async () => {
  throw new TypeError("synthetic network failure");
});
assert.deepEqual(networkFailure, { ok: false, reason: "network_failure" });

const timeout = await requestConfirmedBrowserSignOut((_input, init) => new Promise((_resolve, reject) => {
  init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
}), 5);
assert.deepEqual(timeout, { ok: false, reason: "timeout" });

const authenticated = await readBrowserServerSession(async () => new Response(JSON.stringify({
  isAuthenticated: true,
  user: exampleUser
}), { status: 200, headers: { "Content-Type": "application/json" } }));
assert.equal(authenticated.status, "authenticated");
assert.equal(authenticated.status === "authenticated" ? authenticated.user.id : null, exampleUser.id);

const anonymous = await readBrowserServerSession(async () => new Response(JSON.stringify({
  isAuthenticated: false,
  user: null
}), { status: 200, headers: { "Content-Type": "application/json" } }));
assert.deepEqual(anonymous, { status: "anonymous" });

const unavailable = await readBrowserServerSession(async () => new Response("unavailable", { status: 503 }));
assert.deepEqual(unavailable, { status: "unavailable" });

assert.deepEqual(resolveBrowserSignOutDisposition(confirmed, null), { status: "signed_out" });
assert.deepEqual(resolveBrowserSignOutDisposition(rejected, anonymous), { status: "signed_out" });
assert.equal(resolveBrowserSignOutDisposition(rejected, authenticated).status, "still_authenticated");
assert.deepEqual(resolveBrowserSignOutDisposition(networkFailure, unavailable), { status: "unconfirmed" });

const singleFlight = createSingleFlight<number>();
let operationCount = 0;
let releaseOperation: ((value: number) => void) | null = null;
const first = singleFlight.run(() => {
  operationCount += 1;
  return new Promise<number>((resolve) => {
    releaseOperation = resolve;
  });
});
const repeated = singleFlight.run(async () => 99);
assert.equal(repeated, first, "repeated sign-out must reuse the in-flight operation");
assert.equal(operationCount, 1);
assert.ok(releaseOperation);
(releaseOperation as (value: number) => void)(7);
assert.equal(await repeated, 7);
assert.equal(await singleFlight.run(async () => 8), 8, "a later retry must start after settlement");

const provider = await readFile(new URL("../components/auth/auth-provider.tsx", import.meta.url), "utf8");
const signOutStart = provider.indexOf("function signOut() {");
const signOutEnd = provider.indexOf("\n  const value:", signOutStart);
const signOutSource = provider.slice(signOutStart, signOutEnd);
assert.ok(signOutSource.includes("requestConfirmedBrowserSignOut()"));
assert.ok(signOutSource.indexOf("requestConfirmedBrowserSignOut()") < signOutSource.lastIndexOf("clearBrowserDemoStorage()"));
assert.ok(signOutSource.includes('disposition.status === "still_authenticated"'));
assert.ok(!signOutSource.includes("finally {\n        setSession(createAnonymousSession())"));

const profile = await readFile(new URL("../components/auth/profile-panel.tsx", import.meta.url), "utf8");
assert.ok(profile.includes('pendingAction === "logout"'));
assert.ok(profile.includes("Your current session remains active"));
assert.ok(profile.includes("Текущая сессия остаётся активной"));

console.log("Auth sign-out state contract: PASS (confirmed, 503, network, timeout, reconciliation, single-flight, retry UI)");
