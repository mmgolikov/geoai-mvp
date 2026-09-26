import { createServer, type Server } from "node:http";
import { test, expect, type Page } from "@playwright/test";
import { installLoopbackBrowserHarness, requireLoopbackTestOrigin } from "./helpers/local-webkit-csp";

const userId = "11111111-1111-4111-8111-111111111111";
const fakeOrigin = "http://127.0.0.1:54321";
const user = {
  id: userId, aud: "authenticated", role: "authenticated", email: "delayed-confirmation@example.invalid",
  phone: "", is_anonymous: false, app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Synthetic confirmation user" }, identities: [],
  created_at: "2026-09-26T00:00:00.000Z", updated_at: "2026-09-26T00:00:00.000Z"
};
const serverUser = { id: userId, email: user.email, phone: null, name: "Synthetic confirmation user", isDemoUser: false,
  profile: { fullName: "Synthetic confirmation user", region: "UAE", defaultAudience: "b2b", defaultRole: "developer", contactPhone: "", avatarUrl: null } };
const unconfirmed = "Sign-in could not be confirmed. Check the connection and reload the page to verify the existing session.";
let fakeServer: Server | null = null;

function tokenResponse() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1_000);
  return { access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, aud: "authenticated", role: "authenticated", is_anonymous: false, session_id: userId, iat: now - 60, exp: now + 3600 })}.synthetic-signature`,
    refresh_token: "synthetic-refresh-not-a-real-token", token_type: "bearer", expires_in: 3600, expires_at: now + 3600, user };
}

test.beforeAll(async () => {
  // Exact loopback SSR fixture, not an actual backend and never hosted credentials.
  fakeServer = createServer((request, response) => {
    const url = new URL(request.url ?? "/", fakeOrigin);
    response.setHeader("Content-Type", "application/json");
    let subject: string | null = null;
    try { subject = JSON.parse(Buffer.from(String(request.headers.authorization).split(".")[1], "base64url").toString()).sub; } catch { /* deny */ }
    if (subject !== userId) { response.statusCode = 401; response.end("{}"); return; }
    if (request.method === "GET" && url.pathname === "/auth/v1/user") { response.end(JSON.stringify(user)); return; }
    if (request.method === "POST" && url.pathname === "/rest/v1/rpc/current_profile") {
      response.end(JSON.stringify([{ id: "22222222-2222-4222-8222-222222222222", auth_user_id: userId, email: user.email,
        full_name: "Synthetic confirmation user", status: "active", identity_kind: "user" }])); return;
    }
    response.statusCode = 404; response.end("{}");
  });
  await new Promise<void>((resolve, reject) => { fakeServer!.once("error", reject); fakeServer!.listen(54321, "127.0.0.1", resolve); });
});
test.afterAll(async () => {
  if (fakeServer) { fakeServer.closeAllConnections(); await new Promise<void>((resolve, reject) => fakeServer!.close(error => error ? reject(error) : resolve())); }
  fakeServer = null;
});
test.use({ bypassCSP: true }); // Loopback mock SDK only; no hosted policy exception.

async function fixture(page: Page, browserName: string, baseURL: string) {
  requireLoopbackTestOrigin(baseURL);
  await installLoopbackBrowserHarness(page, browserName, baseURL);
  let passwordPosts = 0, confirmationReads = 0, paidPosts = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(url => url.origin === fakeOrigin && url.pathname === "/auth/v1/token", async route => {
    expect(route.request().method()).toBe("POST");
    expect(new URL(route.request().url()).searchParams.get("grant_type")).toBe("password");
    expect(route.request().postDataJSON()).toMatchObject({ email: user.email, password: "synthetic-fixture-password" });
    passwordPosts++;
    await route.fulfill({ json: tokenResponse() });
  });
  await page.route(url => url.origin === fakeOrigin && url.pathname === "/auth/v1/user", route => route.fulfill({ json: user }));
  await page.route("**/api/auth/session", async route => {
    expect(route.request().method()).toBe("GET");
    const confirming = passwordPosts > 0;
    if (confirming) { confirmationReads++; await gate; }
    await route.fulfill({ headers: { "cache-control": "private, no-store" }, json: confirming
      ? { isAuthenticated: true, supabaseAuthenticated: true, isDemo: false, sessionStatus: "supabase_user_with_profile", user: serverUser, supabaseUser: { id: userId } }
      : { isAuthenticated: false, supabaseAuthenticated: false, isDemo: false, sessionStatus: "session_missing", user: null }
    }).catch(() => {}); // Expected for the deliberately expired/aborted request.
  });
  await page.route("**/api/prototype/point-to-object/**", async route => {
    if (route.request().method() === "POST") paidPosts++;
    await route.abort("blockedbyclient");
  });
  await page.goto("/login?next=%2Fprofile", { waitUntil: "load" });
  await expect(page.locator("#login-identifier")).toBeEnabled();
  await page.locator("#login-identifier").fill(user.email);
  await page.locator("#login-password").fill("synthetic-fixture-password");
  // Install after hydration, before the actual password action. Both timer and
  // performance.now advance; the held response supplies the independent gate.
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect.poll(() => confirmationReads).toBe(1);
  return { release, counts: () => ({ passwordPosts, confirmationReads, paidPosts }) };
}

test("one same-user password confirmation can finish at 25 seconds, not at the old 10-second deadline", async ({ page, browserName, baseURL }, testInfo) => {
  const state = await fixture(page, browserName, String(baseURL));
  try {
    await page.clock.runFor(25_000);
    await expect(page).toHaveURL(url => url.pathname === "/login");
    await expect(page.getByText(unconfirmed, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Please wait…", exact: true })).toBeDisabled();
    await expect(page.locator('[data-nextjs-dialog], .vite-error-overlay')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("pending-confirmation-25s.png"), fullPage: true });
    expect(state.counts()).toEqual({ passwordPosts: 1, confirmationReads: 1, paidPosts: 0 });
    state.release();
    await page.clock.resume();
    await expect(page).toHaveURL(url => url.pathname === "/profile");
    await expect(page.getByRole("heading", { name: "Your profile", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("confirmed-profile.png"), fullPage: true });
    expect(state.counts().passwordPosts).toBe(1);
    expect(state.counts().paidPosts).toBe(0);
  } finally { state.release(); }
});

test("confirmation exceeding 30 seconds fails truthfully without resending password or accepting its late response", async ({ page, browserName, baseURL }, testInfo) => {
  const state = await fixture(page, browserName, String(baseURL));
  try {
    await page.clock.runFor(30_001);
    await expect(page.getByText(unconfirmed, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => url.pathname === "/login");
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
    await expect(page.locator('[data-nextjs-dialog], .vite-error-overlay')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("unconfirmed-timeout-30s.png"), fullPage: true });
    state.release();
    await page.clock.runFor(1_000);
    await expect(page.getByText(unconfirmed, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => url.pathname === "/login");
    expect(state.counts()).toEqual({ passwordPosts: 1, confirmationReads: 1, paidPosts: 0 });
  } finally { state.release(); }
});
