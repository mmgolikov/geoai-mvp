import { expect, test, type Page } from "@playwright/test";

const rehearsalProjectRef = "bkmfcjzalcvdsdvyxpgi";
const mockSessionKey = "geoai-mock-demo-session-v1";
const realEmail = process.env.GEOAI_REAL_AUTH_EMAIL?.trim().toLowerCase() ?? "";
const realPassword = process.env.GEOAI_REAL_AUTH_PASSWORD ?? "";
const expectedUserId = process.env.GEOAI_REAL_AUTH_EXPECTED_USER_ID?.trim() ?? "";
const expectedProjectRef = process.env.GEOAI_REAL_AUTH_PROJECT_REF?.trim() ?? "";
const runApproval = process.env.GEOAI_REAL_AUTH_RUN_APPROVAL?.trim() ?? "";
const baseUrl = process.env.GEOAI_E2E_BASE_URL?.trim() ?? "";

const personaConfigured = Boolean(
  realEmail
  && realPassword
  && expectedUserId
  && expectedProjectRef
  && baseUrl
  && runApproval === `read-only:${expectedProjectRef}`
);

function validateReadOnlyTarget() {
  if (expectedProjectRef !== rehearsalProjectRef) {
    throw new Error(`Real Auth persona is restricted to rehearsal project ${rehearsalProjectRef}.`);
  }
  if (realEmail === "demo@geoai.space" || realPassword === "111111") {
    throw new Error("The browser-only demo credentials cannot be used as a real Supabase persona.");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(expectedUserId)) {
    throw new Error("GEOAI_REAL_AUTH_EXPECTED_USER_ID must be the exact UUID of the approved rehearsal user.");
  }

  const target = new URL(baseUrl);
  const localTarget = target.hostname === "127.0.0.1" || target.hostname === "localhost";
  if (!localTarget && target.protocol !== "https:") {
    throw new Error("Real Auth persona targets must use HTTPS unless the app is running locally.");
  }
  if (!localTarget && !target.hostname.endsWith(".vercel.app")) {
    throw new Error("Real Auth persona is restricted to an exact Vercel Preview or a local app.");
  }
  if (target.hostname === "geoai-mvp.vercel.app") {
    throw new Error("Real Auth persona must never run against released Production.");
  }
}

async function expectLoginRedirect(page: Page, expectedNext: string) {
  await expect(page).toHaveURL((url) =>
    url.pathname === "/login" && url.searchParams.get("next") === expectedNext
  );
  await expect(page.getByRole("heading", { name: "Sign in or create account" })).toBeVisible();
}

async function readSession(page: Page) {
  const response = await page.request.get("/api/auth/session", {
    headers: { Accept: "application/json" }
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  return response.json() as Promise<{
    isAuthenticated?: unknown;
    isDemo?: unknown;
    sessionStatus?: unknown;
    user?: { id?: unknown; email?: unknown } | null;
  }>;
}

test.describe("approved real email Auth persona", () => {
  test.skip(
    !personaConfigured,
    "Requires trusted operator credentials plus GEOAI_REAL_AUTH_RUN_APPROVAL=read-only:<rehearsal-ref>."
  );

  test.beforeAll(() => {
    validateReadOnlyTarget();
  });

  test("signs in, restores the cookie session, opens Profile, and logs out without mutations", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.evaluate((key) => window.localStorage.removeItem(key), mockSessionKey);

    await page.goto("/login?next=%2Fworkspace&intent=request");
    await page.getByLabel("Email or phone").fill(realEmail);
    await page.getByLabel("Password").fill(realPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL((url) => url.pathname === "/workspace");
    const profileLink = page.getByRole("link", { name: "Open your profile" });
    await expect(profileLink).toBeVisible();
    await expect(profileLink).toHaveAttribute("data-authenticated", "true");
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), mockSessionKey)).toBeNull();

    const signedInSession = await readSession(page);
    expect(signedInSession.isAuthenticated).toBe(true);
    expect(signedInSession.isDemo).toBe(false);
    expect(signedInSession.sessionStatus).toBe("supabase_user_with_profile");
    expect(signedInSession.user?.id).toBe(expectedUserId);
    expect(String(signedInSession.user?.email ?? "").toLowerCase()).toBe(realEmail);

    await page.reload();
    await expect(page).toHaveURL((url) => url.pathname === "/workspace");
    await expect(page.getByRole("link", { name: "Open your profile" })).toHaveAttribute("data-authenticated", "true");

    for (const route of ["/projects", "/explore"]) {
      await page.goto(route);
      await expect(page).toHaveURL((url) => url.pathname === route);
      await expect(page.getByRole("link", { name: "Open your profile" })).toHaveAttribute("data-authenticated", "true");
    }

    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
    await expect(page.getByText(realEmail, { exact: true })).toBeVisible();

    await page.getByPlaceholder("new@email.com").fill(realEmail);
    await page.getByRole("button", { name: "Send confirmation" }).click();
    await expect(page.getByText("This is already your account email.", { exact: true })).toBeVisible();

    await page.getByLabel("New password").fill("GeoAI-read-only-check-01");
    await page.getByLabel("Confirm new password").fill("GeoAI-read-only-check-02");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("The password confirmation does not match.", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expectLoginRedirect(page, "/profile");

    const signedOutSession = await readSession(page);
    expect(signedOutSession.isAuthenticated).toBe(false);
    expect(signedOutSession.isDemo).toBe(false);

    await page.goto("/workspace");
    await expectLoginRedirect(page, "/workspace");
  });
});
