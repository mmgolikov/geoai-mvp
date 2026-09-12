import { expect, test } from "@playwright/test";
import { installLocalWebKitHttpCsp } from "./helpers/local-webkit-csp";

for (const width of [390, 430, 1440]) {
  test(`Security06 keeps the accepted landing images and map entry usable in EN and RU at ${width}px`, async ({ page }, testInfo) => {
    await installLocalWebKitHttpCsp(page, testInfo.project.use.browserName, testInfo.project.use.baseURL);
    const errors: string[] = [];
    const heroRequests: URL[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.pathname === "/_next/image" && url.searchParams.get("url") === "/landing/sprint07-workspace-capture.png") heroRequests.push(url);
    });
    await page.setViewportSize({ width, height: 932 });
    // One responsive picture must finish normal document load, without a hidden optimizer request.
    await page.goto("/");
    for (const locale of ["EN", "RU"] as const) {
      const localeButton = page.getByRole("button", { name: locale, exact: true });
      // DOM readiness can precede hydration; confirm the locale interaction took effect.
      await expect.poll(async () => {
        await localeButton.click();
        return localeButton.getAttribute("aria-pressed");
      }).toBe("true");
      const hero = page.locator("main > section").first();
      await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
      const action = locale === "EN" ? "Open map" : "Открыть карту";
      const links = hero.getByRole("link", { name: action, exact: true });
      await expect(links).toHaveCount(2);
      for (const link of await links.all()) await expect(link).toHaveAttribute("href", "/prototype/point-to-object");
      const requestAction = locale === "EN" ? "Leave a request" : "Оставить заявку";
      await expect(hero.getByRole("link", { name: requestAction, exact: true })).toHaveAttribute("href", "/request-access");
      const objectActions = hero.getByRole("navigation", { name: locale === "EN" ? "Choose an action for the selected place" : "Выберите действие с объектом" });
      const bubbles = objectActions.getByRole("link");
      await expect(bubbles).toHaveCount(3);
      await expect(bubbles.first()).toHaveCSS("min-height", "44px");
      for (const [index, mode] of ["analyse", "find", "create"].entries()) {
        const bubble = bubbles.nth(index);
        await expect(bubble).toHaveAttribute("href", `/prototype/point-to-object?mode=${mode}`);
        const box = await bubble.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      const image = hero.locator("img:visible");
      await expect(hero.locator("picture")).toHaveCount(1);
      await expect(hero.locator("img")).toHaveCount(1);
      await expect(image).toHaveCount(1);
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
      const asset = "/landing/sprint07-workspace-capture.png";
      expect(decodeURIComponent(await image.evaluate((element: HTMLImageElement) => element.currentSrc))).toContain(asset);
      const imageBox = await image.boundingBox();
      const servedWidth = Number(new URL(await image.evaluate((element: HTMLImageElement) => element.currentSrc)).searchParams.get("w"));
      expect(servedWidth, "Serve the full CSS-windowed raster at sufficient resolution, not just the visible crop width").toBeGreaterThanOrEqual(Math.floor(imageBox!.width));
      for (const request of heroRequests) {
        expect(request.searchParams.get("url")).toBe(asset);
        expect(request.searchParams.get("w")).not.toBe("16");
      }
      await page.evaluate(async () => { await document.fonts.ready; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    }
    // Complete normal-navigation network assertions before any full-page capture.
    // Capture can temporarily resize the browser viewport and select a tiny srcset
    // candidate; it must not contaminate this or another width's loading checks.
    // Every width gets a fresh Playwright page/context, while both locale images remain.
    for (const locale of ["EN", "RU"] as const) {
      const localeButton = page.getByRole("button", { name: locale, exact: true });
      await expect.poll(async () => {
        await localeButton.click();
        return localeButton.getAttribute("aria-pressed");
      }).toBe("true");
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.screenshot({ path: testInfo.outputPath(`landing-${width}-${locale}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}

test("landing action bubbles open the corresponding workspace mode on mobile", async ({ page }, testInfo) => {
  await page.route(/^https:\/\//, route => route.abort());
  await page.route("**/api/prototype/point-to-object/**", route => route.fulfill({ status: 503, json: { mode: "unavailable", error: "Offline navigation check." } }));
  await installLocalWebKitHttpCsp(page, testInfo.project.use.browserName, testInfo.project.use.baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [mode, label] of [["analyse", "Analyse"], ["find", "Find"], ["create", "Create"]]) {
    await page.goto("/");
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.getByRole("navigation", { name: "Choose an action for the selected place" }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/prototype/point-to-object\\?mode=${mode}$`));
    await expect(page.getByRole("tab", { name: label, exact: true })).toHaveAttribute("aria-selected", "true");
  }
});
