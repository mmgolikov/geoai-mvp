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

    test("keeps the landing product entries and login usable without horizontal overflow", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1, name: "Turn a location into a decision path." })).toBeVisible();

      const hero = page.locator("main > section").first();
      const mapLink = hero.getByRole("link", { name: "Open map", exact: true });
      const projectsLink = hero.getByRole("link", { name: "Projects", exact: true });
      await expect(mapLink).toHaveAttribute("href", "/prototype/point-to-object");
      await expect(projectsLink).toHaveAttribute("href", "/projects?view=spatial");
      await expect(page.getByRole("link", { name: "Profile", exact: true }).last()).toHaveAttribute("href", "/profile");
      await expectNoHorizontalOverflow(page);

      await page.goto("/login?next=/workspace&intent=demo");
      await expect(page.getByRole("heading", { level: 1, name: "Sign in to GeoAI" })).toBeVisible();
      await expect(page.getByLabel("Email or phone")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Open demo access" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  });
}

test.describe("mobile keyboard and target-size access", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("switches landing locale and opens the demo workspace with the keyboard", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Turn a location into a decision path." })).toBeVisible();
    const hero = page.locator("main > section").first();
    const mapLink = hero.getByRole("link", { name: "Open map", exact: true });
    const projectsLink = hero.getByRole("link", { name: "Projects", exact: true });
    const russianLocale = page.getByRole("button", { name: "RU", exact: true });

    for (const control of [mapLink, projectsLink, russianLocale]) {
      const box = await control.boundingBox();
      expect(box, "Primary mobile controls must have a rendered box").not.toBeNull();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(40);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    }

    await russianLocale.click();
    await expect(page.getByRole("heading", { level: 1, name: "Превратите локацию в понятный путь к решению." })).toBeVisible();
    const russianHero = page.locator("main > section").first();
    await expect(russianHero.getByRole("link", { name: "Открыть карту", exact: true })).toHaveAttribute("href", "/prototype/point-to-object");
    await expect(russianHero.getByRole("link", { name: "Проекты", exact: true })).toHaveAttribute("href", "/projects?view=spatial");

    await page.getByRole("button", { name: "EN", exact: true }).click();
    await tabUntil(page, (control) => control.href === "/prototype/point-to-object", 40);

    await page.goto("/login?next=/workspace&intent=demo");
    await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("intent") === "demo");

    await tabUntil(page, (control) => control.text === "Open demo access");
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
