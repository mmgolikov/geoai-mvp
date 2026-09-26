import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { createSingleFlight, readBrowserServerSession, requestConfirmedBrowserSignOut,
  resolveBrowserSignOutDisposition } from "../src/lib/auth/browser-session-transport.ts";

const source = readFileSync(new URL("../components/auth/auth-provider.tsx", import.meta.url), "utf8");
function part(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert(a >= 0 && b > a, "The lifecycle source seam must remain exact.");
  return source.slice(a, b);
}
const lifecycle = part("function createAnonymousSession()", "export function AuthProvider") +
  part("  function isCurrentSessionRead(", "  useEffect(() =>") +
  part("  async function signInWithPassword(", "  async function signInWithPhone(") +
  part("  async function verifyPhoneCode(", "  async function saveProfile(") +
  part("  function signOut()", "  const value: AuthContextValue");
const startup = part("  useEffect(() =>", '  useEffect(() => {\n    if (authStatus.effectiveMode !== "supabase_auth") return;');
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness({ obsoleteGuard = false } = {}) {
  const state = { server: "A", client: "A", writes: [], reads: 0, logoutOk: true,
    unavailable: false, profile: async (user) => user, read: async () => {}, logout: async () => {}, onSignIn: async () => {} };
  const fetcher = async (path) => {
    if (path === "/api/auth/logout") {
      await state.logout();
      if (!state.logoutOk) return Response.json({}, { status: 503 });
      state.server = null;
      return Response.json({ ok: true, status: "signed_out" });
    }
    assert.equal(path, "/api/auth/session");
    state.reads += 1;
    const captured = state.server;
    await state.read(captured);
    if (state.unavailable) return Response.json({}, { status: 503 });
    return Response.json(captured ? { isAuthenticated: true, user: { id: captured } } :
      { isAuthenticated: false, sessionStatus: "session_missing" });
  };
  const signIn = async () => { state.server = "B"; await state.onSignIn(); return { data: { user: { id: "B" } }, error: null }; };
  const deps = {
    authStatus: { effectiveMode: "supabase_auth" }, authEpochRef: { current: 0 },
    refreshSequenceRef: { current: 0 }, logoutPendingRef: { current: false },
    passwordIdentityRef: { current: null }, sessionRefreshRef: { current: null },
    setSession: (value) => { state.client = value.user?.id ?? null; state.writes.push(state.client); },
    setIsSessionResolved: () => {}, loadBrowserUserProfile: (user) => state.profile(user),
    mergeLocalProfileIntoUser: (user) => user, isMockDemoSessionActive: () => false,
    clearMockDemoSession: () => {}, clearLocalUserProfile: () => {}, clearBrowserDemoStorage: () => {},
    demoUser: { id: "demo" }, isPasswordOnlyAuthEnabled: () => false,
    loadSupabaseBrowserClient: async () => ({ auth: { signInWithPassword: signIn, verifyOtp: signIn } }),
    readBrowserServerSession: () => readBrowserServerSession(fetcher),
    requestConfirmedBrowserSignOut: () => requestConfirmedBrowserSignOut(fetcher), resolveBrowserSignOutDisposition,
    signOutSingleFlightRef: { current: createSingleFlight() }
  };
  const implementation = obsoleteGuard ? lifecycle.replace(
    "return epoch === authEpochRef.current && sequence === refreshSequenceRef.current;", "return true;") : lifecycle;
  const api = new Function(...Object.keys(deps), `${stripTypeScriptTypes(implementation)};
    return { refreshSession, signOut, signInWithPassword, verifyPhoneCode };`)(...Object.values(deps));
  function cleanup() {
    let dispose;
    new Function(...Object.keys(deps), "refreshSession", "useEffect", stripTypeScriptTypes(startup))(
      ...Object.values(deps), () => {}, (effect) => { dispose = effect(); });
    assert.equal(typeof dispose, "function");
    dispose();
  }
  return { state, api, cleanup };
}

let cases = 0;
for (const obsoleteGuard of [true, false]) {
  for (const delayed of ["profile_success", "profile_failure", "session"]) {
    const { state, api } = harness({ obsoleteGuard });
    const gate = deferred(), entered = deferred();
    if (delayed === "session") state.read = async () => { entered.resolve(); await gate.promise; };
    else state.profile = async (user) => { entered.resolve(); await gate.promise; return { ...user, name: "optional metadata" }; };
    const refresh = api.refreshSession(); await entered.promise;
    assert.equal((await api.signOut()).ok, true);
    assert.equal(state.client, null);
    if (delayed === "profile_failure") gate.reject(new Error("synthetic profile failure")); else gate.resolve();
    await refresh; await new Promise(resolve => setImmediate(resolve));
    // A failed optional enrichment no longer writes at all. The two successful
    // late-completion mutants still prove the epoch/sequence guard is necessary.
    assert.equal(state.client, obsoleteGuard && delayed !== "profile_failure" ? "A" : null);
    assert.equal(state.server, null, "Client completion must never mutate the server fixture.");
    cases += 1;
  }
}
for (const delayed of ["profile", "anonymous_read"]) {
  const { state, api } = harness(); const gate = deferred(), entered = deferred();
  if (delayed === "profile") state.profile = async (user) => { if (user.id === "A") { entered.resolve(); await gate.promise; } return user; };
  else { state.server = null; state.read = async (identity) => { if (!identity) { entered.resolve(); await gate.promise; } }; }
  const old = api.refreshSession(); await entered.promise;
  state.server = "B"; await api.refreshSession(); assert.equal(state.client, "B");
  gate.resolve(); await old; await new Promise(resolve => setImmediate(resolve)); assert.equal(state.client, "B"); cases += 1;
}
for (const method of ["signInWithPassword", "verifyPhoneCode"]) {
  const { state, api } = harness(); const gate = deferred(), entered = deferred();
  state.profile = async (user) => { if (user.id === "A") { entered.resolve(); await gate.promise; } return user; };
  const old = api.refreshSession(); await entered.promise; await api.signOut();
  // The SDK's own auth event may refresh before its sign-in promise resolves.
  state.onSignIn = () => api.refreshSession();
  const result = await api[method](method === "verifyPhoneCode" ? "+971501234567" : "offline@example.invalid",
    method === "verifyPhoneCode" ? "123456" : "offline-password");
  assert.equal(result.ok, true); assert.equal(state.client, "B");
  gate.resolve(); await old; await new Promise(resolve => setImmediate(resolve)); assert.equal(state.client, "B"); cases += 1;
}
for (const method of ["signInWithPassword", "verifyPhoneCode"]) {
  for (const delayed of ["sdk_completion", "profile_completion"]) {
    const { state, api } = harness(); const gate = deferred(), entered = deferred();
    const wait = async () => { entered.resolve(); await gate.promise; };
    if (delayed === "sdk_completion") state.onSignIn = wait;
    else state.profile = async (user) => { await wait(); return user; };
    const signingIn = api[method](method === "verifyPhoneCode" ? "+971501234567" : "offline@example.invalid",
      method === "verifyPhoneCode" ? "123456" : "offline-password");
    await entered.promise;
    // Optional metadata no longer holds a verified sign-in open. Its late
    // completion still cannot resurrect identity after a subsequent logout.
    if (delayed === "profile_completion") assert.equal((await signingIn).ok, true);
    assert.equal((await api.signOut()).ok, true);
    const writesAfterLogout = [...state.writes];
    gate.resolve();
    if (delayed === "sdk_completion") assert.equal((await signingIn).ok, false);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(state.writes, writesAfterLogout, "No late write after logout, including optional metadata.");
    assert.equal(state.client, null, "A superseded sign-in must not restore client identity or report success.");
    assert.equal(state.server, null); cases += 1;
  }
}
{
  const { state, api, cleanup } = harness(); const gate = deferred(), entered = deferred();
  state.profile = async (user) => { entered.resolve(); await gate.promise; return user; };
  const old = api.refreshSession(); await entered.promise;
  assert.deepEqual(state.writes, ["A"], "Verified identity is published before optional profile metadata.");
  cleanup(); gate.resolve(); await old; await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(state.writes, ["A"], "Unmount forbids every later identity write."); cases += 1;
}
{
  const { state, api } = harness(); const gate = deferred(); state.logout = () => gate.promise;
  const logout = api.signOut(); await api.refreshSession(); assert.equal(state.reads, 0);
  assert.equal((await api.signInWithPassword("offline@example.invalid", "offline-password")).ok, false);
  gate.resolve(); assert.equal((await logout).ok, true); assert.equal(state.client, null); cases += 1;
}
for (const unavailable of [false, true]) {
  const { state, api } = harness(); state.logoutOk = false; state.unavailable = unavailable;
  assert.equal((await api.signOut()).ok, false); assert.equal(state.client, "A"); cases += 1;
}
{
  const { state, api } = harness(); await api.refreshSession(); await api.signOut();
  assert.deepEqual(state.writes, ["A", null]); cases += 1;
}
console.log(JSON.stringify({ status: "PASS", cases, originalRaceMutationCases: 3, lateCompletionGuardMutationCases: 2, networkCalls: 0,
  note: "Real provider lifecycle functions and transport, injected offline responses; no browser/server acceptance claim." }));
