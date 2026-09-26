import { createServer, type Server } from "node:http";
import { test, expect, type Page } from "@playwright/test";
import { installLoopbackBrowserHarness, requireLoopbackTestOrigin } from "./helpers/local-webkit-csp";

const userId = "11111111-1111-4111-8111-111111111111";
const fakeOrigin = "http://127.0.0.1:54321";
const user = {
  id: userId, aud: "authenticated", role: "authenticated", email: "session-check@example.invalid",
  phone: "", is_anonymous: false, app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Synthetic session user" }, identities: [],
  created_at: "2026-09-26T00:00:00.000Z", updated_at: "2026-09-26T00:00:00.000Z"
};
const serverUser = {
  id: userId, email: user.email, phone: null, name: "Synthetic session user", isDemoUser: false,
  profile: { fullName: "Synthetic session user", region: "UAE", defaultAudience: "b2b", defaultRole: "developer", contactPhone: "", avatarUrl: null }
};
let fakeServer: Server | null = null;

function tokenResponse() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1_000);
  return {
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, aud: "authenticated", role: "authenticated", is_anonymous: false, session_id: userId, iat: now - 60, exp: now + 3600 })}.synthetic-signature`,
    refresh_token: "synthetic-refresh-not-a-real-token", token_type: "bearer", expires_in: 3600, expires_at: now + 3600, user
  };
}

test.beforeAll(async () => {
  // Only the product's loopback SSR dependency. No hosted backend or real user.
  fakeServer = createServer((request, response) => {
    const url = new URL(request.url ?? "/", fakeOrigin);
    response.setHeader("Content-Type", "application/json");
    let subject: string | null = null;
    try { subject = JSON.parse(Buffer.from(String(request.headers.authorization).split(".")[1], "base64url").toString()).sub; } catch { /* deny */ }
    if (subject !== userId) { response.statusCode = 401; response.end("{}"); return; }
    if (request.method === "GET" && url.pathname === "/auth/v1/user") { response.end(JSON.stringify(user)); return; }
    if (request.method === "POST" && url.pathname === "/rest/v1/rpc/current_profile") {
      response.end(JSON.stringify([{ id: "22222222-2222-4222-8222-222222222222", auth_user_id: userId, email: user.email,
        full_name: "Synthetic session user", status: "active", identity_kind: "user" }])); return;
    }
    response.statusCode = 404; response.end("{}");
  });
  await new Promise<void>((resolve, reject) => { fakeServer!.once("error", reject); fakeServer!.listen(54321, "127.0.0.1", resolve); });
});
test.afterAll(async () => {
  if (fakeServer) { fakeServer.closeAllConnections(); await new Promise<void>((resolve, reject) => fakeServer!.close(error => error ? reject(error) : resolve())); }
  fakeServer = null;
});

// Local SDK endpoint is intercepted, not on the hosted production CSP allowlist.
// This is a synthetic transport exception only, never a hosted protection bypass.
test.use({ bypassCSP: true });

async function fixture(page: Page, browserName: string, baseURL: string, unavailable: boolean, hydrationProbe = false) {
  requireLoopbackTestOrigin(baseURL);
  await installLoopbackBrowserHarness(page, browserName, baseURL);
  let passwordPosts = 0, optionalReads = 0, paidPosts = 0, sessionReads = 0;
  let releaseScripts!: () => void;
  const scriptGate = new Promise<void>(resolve => { releaseScripts = resolve; });
  if (hydrationProbe) await page.route(url => url.origin === new URL(baseURL).origin && url.pathname.startsWith("/_next/static/") && url.pathname.endsWith(".js"), async route => {
    await scriptGate;
    await route.fallback();
  });
  let release!: () => void;
  const profileGate = new Promise<void>(resolve => { release = resolve; });
  await page.route(url => url.origin === fakeOrigin && url.pathname === "/auth/v1/token", async route => {
    expect(route.request().method()).toBe("POST");
    expect(new URL(route.request().url()).searchParams.get("grant_type")).toBe("password");
    expect(route.request().postDataJSON()).toMatchObject({ email: user.email, password: "synthetic-fixture-password" });
    passwordPosts++;
    await route.fulfill({ json: tokenResponse() });
  });
  await page.route(url => url.origin === fakeOrigin && url.pathname === "/auth/v1/user", async route => {
    optionalReads++;
    await profileGate;
    await route.fulfill({ json: user }).catch(() => {}); // Login navigation may have cancelled the optional request.
  });
  await page.route("**/api/auth/session", async route => {
    sessionReads++;
    expect(route.request().method()).toBe("GET");
    if (passwordPosts && unavailable) { await route.fulfill({ status: 503, json: { ok: false } }); return; }
    await route.fulfill({ headers: { "cache-control": "private, no-store" }, json: passwordPosts
      ? { isAuthenticated: true, supabaseAuthenticated: true, isDemo: false, sessionStatus: "supabase_user_with_profile", user: serverUser, supabaseUser: { id: userId } }
      : { isAuthenticated: false, supabaseAuthenticated: false, isDemo: false, sessionStatus: "session_missing", user: null } });
  });
  await page.route("**/api/prototype/point-to-object/**", async route => {
    if (route.request().method() === "POST") paidPosts++;
    await route.abort("blockedbyclient");
  });
  await page.goto("/login?next=%2Fprofile", { waitUntil: hydrationProbe ? "commit" : "load" });
  await expect(page.getByRole("heading", { name: "Sign in to GeoAI" })).toBeVisible();
  if (hydrationProbe) {
    // Deliberately hold all client chunks after SSR. Never synthesize readiness
    // or rewrite an input value: the real product must prevent premature input.
    try {
      await expect(page.locator("#login-identifier")).toBeDisabled();
      await expect(page.locator("#login-password")).toBeDisabled();
      await expect(page.getByRole("button", { name: "Loading sign-in…", exact: true })).toBeDisabled();
      for (const name of ["Email", "Phone"]) await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
      expect(sessionReads).toBe(0);
      expect(passwordPosts).toBe(0);
    } finally { releaseScripts(); }
  }
  await expect(page.locator("#login-identifier")).toBeEnabled();
  await expect(page.locator("#login-password")).toBeEnabled();
  await page.locator("#login-identifier").fill(user.email);
  await page.locator("#login-password").fill("synthetic-fixture-password");
  await expect(page.locator("#login-identifier")).toHaveValue(user.email);
  await expect(page.locator("#login-password")).toHaveValue("synthetic-fixture-password");
  return { release, counts: () => ({ passwordPosts, optionalReads, paidPosts }) };
}

test("token success with unavailable server confirmation stays on login and tells the truth", async ({ page, browserName, baseURL }) => {
  const state = await fixture(page, browserName, String(baseURL), true);
  try {
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Sign-in could not be confirmed. Check the connection and reload the page to verify the existing session.", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => url.pathname === "/login");
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
    expect(state.counts()).toMatchObject({ passwordPosts: 1, optionalReads: 0, paidPosts: 0 });
  } finally { state.release(); }
});

test("SSR login waits for hydration then retains input and confirms exactly one password sign-in", async ({ page, browserName, baseURL }, testInfo) => {
  const state = await fixture(page, browserName, String(baseURL), false, true);
  try {
    const inputs = await page.locator("#login-identifier, #login-password").evaluateAll(elements => elements.map(element => {
      const input = element as HTMLInputElement;
      return { id: input.id, value: input.value, valueMissing: input.validity.valueMissing, disabled: input.disabled };
    }));
    await testInfo.attach("hydration-input-state", { body: JSON.stringify({ inputs, counts: state.counts() }, null, 2), contentType: "application/json" });
    await page.screenshot({ path: testInfo.outputPath("hydration-input-state.png") });
    await expect(page.locator("#login-identifier")).toHaveValue(user.email);
    expect(state.counts().passwordPosts).toBe(0);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect.poll(() => state.counts().optionalReads).toBeGreaterThan(0);
    await expect(page).toHaveURL(url => url.pathname === "/profile", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Your profile", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    expect(state.counts()).toMatchObject({ passwordPosts: 1, paidPosts: 0 });
  } finally { state.release(); }
});

test("verified server identity reaches the real profile while optional browser metadata is still held", async ({ page, browserName, baseURL }) => {
  const state = await fixture(page, browserName, String(baseURL), false);
  try {
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect.poll(() => state.counts().optionalReads).toBeGreaterThan(0);
    // The gate is released only in finally: the old provider cannot pass this.
    await expect(page).toHaveURL(url => url.pathname === "/profile", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Your profile", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    expect(state.counts()).toMatchObject({ passwordPosts: 1, paidPosts: 0 });
  } finally { state.release(); }
});
