import { expect, test, type Page } from "@playwright/test";

type FocusedControl = {
  href: string | null;
  label: string | null;
  text: string;
};

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile-390", width: 390, height: 844 }
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => {
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    return {
      clientWidth: scrollingElement.clientWidth,
      scrollWidth: scrollingElement.scrollWidth
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

async function tabUntil(page: Page, matches: (control: FocusedControl) => boolean, maximumTabs = 20) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    const control = await page.evaluate<FocusedControl>(() => {
      const activeElement = document.activeElement;
      return {
        href: activeElement instanceof HTMLAnchorElement
          ? `${activeElement.pathname}${activeElement.search}`
          : null,
        label: activeElement?.getAttribute("aria-label") ?? null,
        text: activeElement?.textContent?.replace(/\s+/g, " ").trim() ?? ""
      };
    });
    if (matches(control)) return control;
  }

  throw new Error(`Expected keyboard target was not reached after ${maximumTabs} Tab presses.`);
}

for (const viewport of viewports) {
  test.describe(`${viewport.name} public access entry`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("keeps the landing and login entry usable without horizontal overflow", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1, name: "Ask the map. Move with evidence." })).toBeVisible();

      const demoLink = page.getByRole("link", { name: "View demo" }).last();
      const requestLink = page.getByRole("link", { name: "Leave a request" }).last();
      await expect(demoLink).toBeVisible();
      await expect(demoLink).toHaveAttribute("href", "/login?next=/workspace&intent=demo");
      await expect(requestLink).toBeVisible();
      await expect(requestLink).toHaveAttribute("href", "/login?next=/workspace&intent=request");
      await expect(page.getByRole("link", { name: "Sign in to GeoAI" })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await demoLink.click();
      await expect(page).toHaveURL((url) =>
        url.pathname === "/login"
        && url.searchParams.get("next") === "/workspace"
        && url.searchParams.get("intent") === "demo"
      );
      await expect(page.getByRole("heading", { level: 1, name: "Sign in to GeoAI" })).toBeVisible();
      await expect(page.getByLabel("Email or phone")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Use demo credentials" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  });
}

test.describe("mobile keyboard and target-size access", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens the demo workspace with the keyboard and exposes the authenticated profile control", async ({ page }) => {
    await page.goto("/");

    const demoLink = page.getByRole("link", { name: "View demo" }).last();
    const requestLink = page.getByRole("link", { name: "Leave a request" }).last();
    const profileLink = page.getByRole("link", { name: "Sign in to GeoAI" });

    for (const control of [demoLink, requestLink, profileLink]) {
      const box = await control.boundingBox();
      expect(box, "Primary mobile controls must have a rendered box").not.toBeNull();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(40);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    }

    await tabUntil(page, (control) => control.href === "/login?next=/workspace&intent=demo");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("intent") === "demo");

    await tabUntil(page, (control) => control.text === "Use demo credentials");
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Email or phone")).toHaveValue("demo@geoai.space");
    await expect(page.getByLabel("Password")).toHaveValue("111111");

    await tabUntil(page, (control) => control.text === "Open demo");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL((url) => url.pathname === "/workspace");

    const authenticatedProfile = page.getByRole("link", { name: "Open demo profile" });
    await expect(authenticatedProfile).toBeVisible();
    await expect(authenticatedProfile).toHaveAttribute("data-authenticated", "true");

    await tabUntil(page, (control) => control.label === "Open demo profile");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL((url) => url.pathname === "/profile");
    await expect(page.getByRole("heading", { level: 1, name: "Your profile" })).toBeVisible();
  });
});
