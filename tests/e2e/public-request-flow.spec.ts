import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const evidenceDir = path.resolve(process.cwd(), "artifacts", "public-request-evidence");
const unsentStatement = "No information has been sent. Copy this brief and share it through an approved contact channel.";
const requiredCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-834", width: 834, height: 1112 },
  { name: "mobile-390", width: 390, height: 844 }
] as const;

type StorageSnapshot = { local: Record<string, string>; session: Record<string, string> };

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return Math.max(0, root.scrollWidth - root.clientWidth);
  });
  expect(overflow).toBe(0);
}

async function storageSnapshot(page: Page): Promise<StorageSnapshot> {
  return page.evaluate(() => ({
    local: Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(Boolean).map((key) => [key as string, localStorage.getItem(key as string) ?? ""])),
    session: Object.fromEntries(Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index)).filter(Boolean).map((key) => [key as string, sessionStorage.getItem(key as string) ?? ""]))
  }));
}

async function expectMinimumTarget(control: Locator, label: string) {
  const box = await control.boundingBox();
  expect(box, `${label} must have a rendered box`).not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(40);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
}

async function tabTo(page: Page, selector: string, limit = 24) {
  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press("Tab");
    if (await page.locator(selector).evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Keyboard focus did not reach ${selector}`);
}

for (const viewport of viewports) {
  test.describe(`${viewport.name} public request`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("separates request from demo and prepares an unsent brief without mutation or storage", async ({ page }) => {
      fs.mkdirSync(evidenceDir, { recursive: true });
      const mutationRequests: string[] = [];
      page.on("request", (request) => {
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) mutationRequests.push(`${request.method()} ${request.url()}`);
      });

      await page.goto("/");
      await expect(page.locator('a[href="/request-access"]')).toHaveCount(3);
      await expect(page.getByRole("link", { name: "View demo" }).last()).toHaveAttribute("href", "/login?next=/workspace&intent=demo");

      await page.evaluate(() => localStorage.setItem("geoai-mock-demo-session-v1", "active"));
      await page.goto("/request-access");
      await expect(page).toHaveURL((url) => url.pathname === "/request-access");
      await expect(page.getByRole("heading", { level: 1, name: "Prepare a bounded request brief." })).toBeVisible();
      await expect(page.getByText(requiredCaveat, { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const before = await storageSnapshot(page);
      const accessibility = await new AxeBuilder({ page }).analyze();
      const blockingViolations = accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
      expect(blockingViolations).toEqual([]);

      await page.getByLabel("Organization").fill("GeoAI Evidence Organization");
      await page.getByLabel("Work email").fill("evidence@example.com");
      await page.getByLabel("Use case / decision to support").fill("Screen candidate locations for a documented investment decision.");
      await page.getByLabel("Geography / AOI description").fill("Dubai Marina sample AOI.");
      await page.getByLabel("Optional note").fill("Public test data only.");
      await page.getByRole("button", { name: "Prepare request brief" }).click();

      await expect(page.getByText(unsentStatement, { exact: true })).toBeVisible();
      const generated = page.getByLabel("Generated request brief");
      await expect(generated).toHaveValue(/GeoAI Evidence Organization/);
      await expect(page.getByRole("button", { name: "Copy request brief" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Open demo instead" })).toHaveAttribute("href", "/login?next=/workspace&intent=demo");
      for (const prohibited of ["Request sent", "Request submitted", "Request received", "We will contact you", "Successfully delivered"]) {
        await expect(page.getByText(prohibited, { exact: true })).toHaveCount(0);
      }

      await expectMinimumTarget(page.getByRole("button", { name: "Prepare request brief" }), "Prepare request brief");
      await expectMinimumTarget(page.getByRole("button", { name: "Copy request brief" }), "Copy request brief");
      await expectMinimumTarget(page.getByRole("link", { name: "Open demo instead" }), "Open demo instead");
      await expectNoHorizontalOverflow(page);
      expect(await storageSnapshot(page)).toEqual(before);
      expect(mutationRequests).toEqual([]);

      await page.screenshot({ path: path.join(evidenceDir, `${viewport.name}.png`), fullPage: true });
      fs.writeFileSync(path.join(evidenceDir, `${viewport.name}-axe.json`), `${JSON.stringify(accessibility, null, 2)}\n`);
      fs.writeFileSync(path.join(evidenceDir, `${viewport.name}-manifest.json`), `${JSON.stringify({ viewport, mutationRequests, storageUnchanged: true, horizontalOverflowPx: 0, seriousCriticalAxeViolations: 0 }, null, 2)}\n`);
    });
  });
}

test("legacy request intent redirects to the public request route", async ({ page }) => {
  const response = await page.request.get("/login?next=/workspace&intent=request", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/request-access");
  await page.goto("/login?next=/workspace&intent=request");
  await expect(page).toHaveURL((url) => url.pathname === "/request-access");
});

test.describe("mobile request keyboard path", () => {
  test.use({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });

  test("prepares and copies the generated brief with the keyboard only", async ({ page }) => {
    const mutationRequests: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) mutationRequests.push(`${request.method()} ${request.url()}`);
    });
    await page.goto("/request-access");
    const before = await storageSnapshot(page);

    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await tabTo(page, "#request-organization");
    await page.keyboard.type("Keyboard Organization");
    await page.keyboard.press("Tab");
    await page.keyboard.type("keyboard@example.com");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Screen one decision");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Dubai sample AOI");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await expect(page.getByText(unsentStatement, { exact: true })).toBeVisible();
    await tabTo(page, 'button:has-text("Copy request brief")', 8);
    await page.keyboard.press("Enter");
    await expect(page.getByText("Request brief copied. No information has been sent.", { exact: true })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("Keyboard Organization");
    expect(await storageSnapshot(page)).toEqual(before);
    expect(mutationRequests).toEqual([]);
  });
});
