import { createServer, type Server } from "node:http";
import { expect, test, type BrowserContext } from "@playwright/test";

import { externalHttpUrlPattern, installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

const browserIdentityKey = "geoai:point-to-object:browser-identity:v1";
const authCookieName = "sb-127-auth-token";
const primaryUserId = "11111111-1111-4111-8111-111111111111";
const secondaryUserId = "22222222-2222-4222-8222-222222222222";
const delayedUploadName = "delayed-account-switch.geojson";
let fakeSupabase: Server | null = null;

function authUser(userId: string) {
  const timestamp = "2026-09-19T12:00:00.000Z";
  return {
    id: userId, aud: "authenticated", role: "authenticated", email: `${userId === primaryUserId ? "primary" : "secondary"}@restore-e2e.invalid`,
    email_confirmed_at: timestamp, phone: "", confirmed_at: timestamp, last_sign_in_at: timestamp,
    app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "Restoration test user" },
    identities: [], created_at: timestamp, updated_at: timestamp, is_anonymous: false
  };
}

function authCookie(userId: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: userId, aud: "authenticated", role: "authenticated", email: authUser(userId).email, is_anonymous: false,
    session_id: userId, iat: Math.floor(Date.now() / 1_000) - 60, exp: Math.floor(Date.now() / 1_000) + 3_600
  })}.synthetic-signature`;
  return `base64-${Buffer.from(JSON.stringify({
    access_token: accessToken, token_type: "bearer", expires_in: 3_600,
    expires_at: Math.floor(Date.now() / 1_000) + 3_600, refresh_token: `synthetic-refresh-${userId}`, user: authUser(userId)
  })).toString("base64url")}`;
}

function userIdFromAuthorization(value: string | undefined): string | null {
  try {
    const token = value?.replace(/^Bearer\s+/i, "");
    return token ? JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")).sub ?? null : null;
  } catch {
    return null;
  }
}

async function startFakeSupabase(): Promise<Server> {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1:54321");
    response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3117");
    response.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, x-supabase-api-version");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Content-Type", "application/json");
    if (request.method === "OPTIONS") { response.statusCode = 204; response.end(); return; }
    const userId = userIdFromAuthorization(request.headers.authorization);
    if (userId !== primaryUserId && userId !== secondaryUserId) { response.statusCode = 401; response.end(JSON.stringify({ message: "Synthetic session missing." })); return; }
    if (request.method === "GET" && url.pathname === "/auth/v1/user") { response.end(JSON.stringify(authUser(userId))); return; }
    if (request.method === "POST" && url.pathname === "/rest/v1/rpc/current_profile") {
      response.end(JSON.stringify([{ id: `profile-${userId}`, auth_user_id: userId, email: authUser(userId).email, full_name: "Restoration test user", status: "active", identity_kind: "user" }]));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ message: "Synthetic endpoint unavailable." }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(54321, "127.0.0.1", resolve);
  });
  return server;
}

async function installCookie(context: BrowserContext, baseURL: string, userId: string) {
  await context.addCookies([{ name: authCookieName, value: authCookie(userId), url: baseURL, sameSite: "Lax" }]);
}

test.beforeAll(async () => { fakeSupabase = await startFakeSupabase(); });
test.afterAll(async () => {
  if (fakeSupabase) await new Promise<void>((resolve, reject) => fakeSupabase!.close((error) => error ? reject(error) : resolve()));
  fakeSupabase = null;
});

test("a delayed file read cannot apply an old-account AOI after identity reconciliation", async ({ browser, browserName }, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const context = await browser.newContext({ baseURL });
  await installCookie(context, baseURL, primaryUserId);
  const page = await context.newPage();
  await installLoopbackBrowserHarness(page, browserName, baseURL);
  await page.route(externalHttpUrlPattern(baseURL), async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "https://tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
      await route.fulfill({ json: { version: 8, name: "Account-switch restoration map", sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e8edf0" } }] } });
      return;
    }
    await route.abort("blockedbyclient");
  });
  let areaContextRequests = 0;
  await page.route("**/api/prototype/point-to-object/area-context", async (route) => {
    areaContextRequests += 1;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ mode: "unavailable" }) });
  });
  const primaryIdentity = `user:${primaryUserId}`;
  const secondaryIdentity = `user:${secondaryUserId}`;
  const secondaryStorageKey = `geoai:point-to-object:projects:v1:${encodeURIComponent(secondaryIdentity)}`;
  const secondaryBytes = JSON.stringify({ schemaVersion: 1, identityKey: secondaryIdentity, activeProjectId: null, projects: [] });
  await page.addInitScript(({ browserIdentityKey, delayedUploadName, primaryIdentity, secondaryStorageKey, secondaryBytes }) => {
    localStorage.setItem(browserIdentityKey, primaryIdentity);
    localStorage.setItem(secondaryStorageKey, secondaryBytes);
    const originalText = File.prototype.text;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    Object.defineProperty(File.prototype, "text", {
      configurable: true,
      value: function (this: File) {
        if (this.name !== delayedUploadName) return originalText.call(this);
        Object.defineProperty(globalThis, "__geoaiDelayedUploadStarted", { configurable: true, value: true });
        return gate.then(() => JSON.stringify({ type: "Polygon", coordinates: [[[55.27, 25.2], [55.272, 25.2], [55.272, 25.202], [55.27, 25.2]]] }));
      }
    });
    Object.defineProperty(globalThis, "__geoaiReleaseDelayedUpload", { configurable: true, value: release });
  }, { browserIdentityKey, delayedUploadName, primaryIdentity, secondaryStorageKey, secondaryBytes });

  await page.goto("/prototype/point-to-object?mode=create");
  const workspace = page.locator("main[data-project-restoration]");
  await expect(workspace).toHaveAttribute("data-project-restoration", "ready");
  await expect(page.getByRole("tab", { name: "Create", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: delayedUploadName, mimeType: "application/geo+json", buffer: Buffer.from("delayed fixture body")
  });
  await expect.poll(() => page.evaluate(() => (globalThis as Record<string, unknown>).__geoaiDelayedUploadStarted)).toBe(true);

  await installCookie(context, baseURL, secondaryUserId);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), browserIdentityKey)).toBe(secondaryIdentity);
  await expect(workspace).toHaveAttribute("data-project-restoration", "ready");
  await page.evaluate(() => ((globalThis as Record<string, unknown>).__geoaiReleaseDelayedUpload as () => void)());
  await page.waitForTimeout(100);

  await expect(page.getByText(/Area ready/)).toHaveCount(0);
  expect(areaContextRequests).toBe(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), secondaryStorageKey)).toBe(secondaryBytes);
  await context.close();
});
