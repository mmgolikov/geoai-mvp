import { expect, test, type Page } from "@playwright/test";

const mockSessionKey = "geoai-mock-demo-session-v1";

async function expectLoginRedirect(page: Page, expectedNext: string) {
  await expect(page).toHaveURL((url) =>
    url.pathname === "/login" && url.searchParams.get("next") === expectedNext
  );
  await expect(page.getByRole("heading", { name: "Sign in to GeoAI" })).toBeVisible();
}

test.describe("authenticated product route session", () => {
  test("preserves a bounded continuation and rejects browser-only demo authority", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/prototype/point-to-object?mode=find");
      await expectLoginRedirect(page, "/prototype/point-to-object?mode=find");
      expect(pageErrors, `Login hydration errors at ${viewport.width}px`).toEqual([]);
    }

    await page.goto("/workspace?segment=b2b");
    await expectLoginRedirect(page, "/workspace?segment=b2b");

    await expect(page.getByRole("button", { name: "Open demo access" })).toHaveCount(0);
    const demoProfileKey = "geoai-user-profile-v1:demo-user-geoai";
    await page.evaluate(({ marker, profile }) => {
      window.localStorage.setItem(marker, "active");
      window.localStorage.setItem(profile, JSON.stringify({ fullName: "Private demo residue" }));
    }, { marker: mockSessionKey, profile: demoProfileKey });
    await page.reload();
    await expectLoginRedirect(page, "/workspace?segment=b2b");
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), mockSessionKey)).toBeNull();
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), demoProfileKey)).toBeNull();

    await page.getByLabel("Email or phone").fill("demo@geoai.space");
    await page.getByLabel("Password").fill("111111");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Browser-local demo access is unavailable while protected sign-in is required.", { exact: true })).toBeVisible();
    await expectLoginRedirect(page, "/workspace?segment=b2b");
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), mockSessionKey)).toBeNull();
    expect(pageErrors).toEqual([]);
  });
});

test.describe("public Auth signup containment", () => {
  // The local Supabase fixture is deliberately absent from the production CSP.
  // Bypass CSP only in this intercepted browser context; page.route fulfils the
  // request locally, while the assertions still prove shouldCreateUser=false.
  test.use({ bypassCSP: true });

  test("sends existing-user-only email and phone OTP requests", async ({ page }) => {
    const otpRequests: Array<Record<string, unknown>> = [];
    const signupRequests: string[] = [];

    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/auth/v1/signup") signupRequests.push(request.url());
    });
    await page.route("**/auth/v1/otp*", async (route) => {
      otpRequests.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("/login?next=%2Fworkspace");
    await page.getByLabel("Email or phone").fill("existing.user@example.com");
    await page.getByRole("button", { name: "Send sign-in link" }).click();
    await expect(page.getByText("Check your email and open the GeoAI sign-in link.", { exact: true })).toBeVisible();
    await expect.poll(() => otpRequests.length).toBe(1);
    expect(otpRequests[0]).toMatchObject({
      email: "existing.user@example.com",
      create_user: false
    });

    await page.getByRole("button", { name: "Phone", exact: true }).click();
    await page.getByLabel("Email or phone").fill("+971501234567");
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByText("Enter the six-digit code sent to your phone.", { exact: true })).toBeVisible();
    await expect.poll(() => otpRequests.length).toBe(2);
    expect(otpRequests[1]).toMatchObject({
      phone: "+971501234567",
      channel: "sms",
      create_user: false
    });

    expect(otpRequests.every((request) => request.create_user === false)).toBe(true);
    expect(signupRequests).toEqual([]);
  });
});
