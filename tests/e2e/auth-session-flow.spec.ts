import { expect, test, type Page } from "@playwright/test";

const mockSessionKey = "geoai-mock-demo-session-v1";

async function expectLoginRedirect(page: Page, expectedNext: string) {
  await expect(page).toHaveURL((url) =>
    url.pathname === "/login" && url.searchParams.get("next") === expectedNext
  );
  await expect(page.getByRole("heading", { name: "Sign in to GeoAI" })).toBeVisible();
}

async function expectAuthenticatedProfileControl(page: Page) {
  const profileLink = page.getByRole("link", { name: "Open demo profile" });
  await expect(profileLink).toBeVisible();
  await expect(profileLink).toHaveAttribute("data-authenticated", "true");
}

test.describe("authenticated product route session", () => {
  test("redirects a guest, restores the demo session, and gates again after logout", async ({ page }) => {
    await page.goto("/workspace?segment=b2b");
    await expectLoginRedirect(page, "/workspace?segment=b2b");

    await page.getByRole("button", { name: "Use demo credentials" }).click();
    await expect(page.getByLabel("Email or phone")).toHaveValue("demo@geoai.space");
    await expect(page.getByLabel("Password")).toHaveValue("111111");
    await page.getByRole("button", { name: "Open demo" }).click();

    await expect(page).toHaveURL((url) =>
      url.pathname === "/workspace" && url.searchParams.get("segment") === "b2b"
    );
    await expectAuthenticatedProfileControl(page);
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), mockSessionKey)).toBe("active");

    await page.reload();
    await expect(page).toHaveURL((url) =>
      url.pathname === "/workspace" && url.searchParams.get("segment") === "b2b"
    );
    await expectAuthenticatedProfileControl(page);

    await page.goto("/projects");
    await expect(page).toHaveURL((url) => url.pathname === "/projects");
    await expectAuthenticatedProfileControl(page);

    await page.goto("/explore");
    await expect(page).toHaveURL((url) => url.pathname === "/workspace");
    await expectAuthenticatedProfileControl(page);

    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expectLoginRedirect(page, "/profile");
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), mockSessionKey)).toBeNull();

    await page.goto("/workspace");
    await expectLoginRedirect(page, "/workspace");
  });
});

test.describe("public Auth signup containment", () => {
  test("sends existing-user-only email and phone OTP requests", async ({ page }) => {
    const otpRequests: Array<Record<string, unknown>> = [];
    const signupRequests: string[] = [];

    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/auth/v1/signup") signupRequests.push(request.url());
    });
    await page.route(/^https:\/\/bkmfcjzalcvdsdvyxpgi[.]supabase[.]co\/auth\/v1\/otp(?:[?].*)?$/, async (route) => {
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
