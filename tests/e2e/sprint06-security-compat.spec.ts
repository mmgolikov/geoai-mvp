import { expect, test } from "@playwright/test";

test("Security06 keeps the accepted landing images and map entry usable in EN and RU", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [390, 430, 1440]) {
    await page.setViewportSize({ width, height: 932 });
    await page.goto("/");
    for (const locale of ["EN", "RU"] as const) {
      await page.getByRole("button", { name: locale, exact: true }).click();
      const hero = page.locator("main > section").first();
      await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
      const action = locale === "EN" ? "Open map" : "Открыть карту";
      const links = hero.getByRole("link", { name: action, exact: true });
      await expect(links).toHaveCount(2);
      for (const link of await links.all()) await expect(link).toHaveAttribute("href", "/prototype/point-to-object");
      const image = hero.locator("img:visible");
      await expect(image).toHaveCount(1);
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`landing-${width}-${locale}.png`), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});
