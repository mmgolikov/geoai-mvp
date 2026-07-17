import { expect, test, type Page } from "@playwright/test";

const mockSessionKey = "geoai-mock-demo-session-v1";

async function expectLoginRedirect(page: Page, expectedNext: string) {
  await expect(page).toHaveURL((url) =>
    url.pathname === "/login" && url.searchParams.get("next") === expectedNext
  );
  await expect(page.getByRole("heading", { name: "Sign in or create account" })).toBeVisible();
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

    for (const route of ["/projects", "/explore"]) {
      await page.goto(route);
      await expect(page).toHaveURL((url) => url.pathname === route);
      await expectAuthenticatedProfileControl(page);
    }

    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expectLoginRedirect(page, "/profile");
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), mockSessionKey)).toBeNull();

    await page.goto("/workspace");
    await expectLoginRedirect(page, "/workspace");
  });
});
