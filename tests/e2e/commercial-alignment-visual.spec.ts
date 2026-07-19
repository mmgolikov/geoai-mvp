import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

type CommercialVisualEvidence = {
  height: number;
  label: string;
  path: string;
  route: string;
  sha256: string;
  width: number;
};

const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 }
] as const;

const visualDirectory = path.join(process.cwd(), "artifacts", "commercial-visual-evidence");
const visualManifest = path.join(visualDirectory, "manifest.json");
const visualEvidence: CommercialVisualEvidence[] = [];

const expectedSha256ByFile: Record<string, string> = {
  "landing-desktop-1440.png": "0000000000000000000000000000000000000000000000000000000000000000",
  "login-desktop-1440.png": "0000000000000000000000000000000000000000000000000000000000000000",
  "profile-desktop-1440.png": "0000000000000000000000000000000000000000000000000000000000000000",
  "landing-tablet-768.png": "0000000000000000000000000000000000000000000000000000000000000000",
  "login-tablet-768.png": "0000000000000000000000000000000000000000000000000000000000000000",
  "profile-tablet-768.png": "0000000000000000000000000000000000000000000000000000000000000000",
  "landing-mobile-390.png": "0000000000000000000000000000000000000000000000000000000000000000",
  "login-mobile-390.png": "0000000000000000000000000000000000000000000000000000000000000000",
  "profile-mobile-390.png": "0000000000000000000000000000000000000000000000000000000000000000"
};

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => {
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    return {
      clientWidth: scrollingElement.clientWidth,
      scrollWidth: scrollingElement.scrollWidth
    };
  });
  expect(metrics.scrollWidth, `Page ${page.url()} must not overflow horizontally`).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

async function captureCommercialVisual(page: Page, label: string, fileName: string) {
  await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());
  await page.evaluate(async () => document.fonts.ready);
  await fs.mkdir(visualDirectory, { recursive: true });
  const filePath = path.join(visualDirectory, fileName);
  const image = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    path: filePath
  });
  const sha256 = createHash("sha256").update(image).digest("hex");
  const viewport = page.viewportSize();
  visualEvidence.push({
    label,
    path: path.relative(process.cwd(), filePath),
    route: `${new URL(page.url()).pathname}${new URL(page.url()).search}`,
    sha256,
    width: viewport?.width ?? 0,
    height: viewport?.height ?? 0
  });
  await fs.writeFile(visualManifest, `${JSON.stringify(visualEvidence, null, 2)}\n`, "utf8");
  expect.soft(sha256, `${label} must match the accepted commercial alignment evidence`).toBe(expectedSha256ByFile[fileName]);
  console.log(`[commercial-visual] ${label}: ${fileName} sha256:${sha256}`);
}

async function openDemoProfile(page: Page) {
  await page.goto("/login?next=/workspace&intent=demo");
  await page.getByRole("button", { name: "Use demo credentials" }).click();
  await page.getByRole("button", { name: "Open demo" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/workspace");
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1, name: "Your profile" })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.describe("commercial Landing and Account visual acceptance", () => {
  test.beforeAll(async () => {
    visualEvidence.length = 0;
    await fs.rm(visualDirectory, { recursive: true, force: true });
  });

  for (const viewport of viewports) {
    test(`${viewport.name} captures Landing, Login and Profile`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.clock.setFixedTime(new Date("2026-07-19T09:00:00.000Z"));

      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1, name: "Ask the map. Move with evidence." })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureCommercialVisual(page, `${viewport.name} Landing`, `landing-${viewport.name}.png`);

      await page.goto("/login?next=/workspace&intent=demo");
      await expect(page.getByRole("heading", { level: 1, name: "Sign in or create account" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureCommercialVisual(page, `${viewport.name} Login`, `login-${viewport.name}.png`);

      await openDemoProfile(page);
      await expectNoHorizontalOverflow(page);
      await captureCommercialVisual(page, `${viewport.name} Profile`, `profile-${viewport.name}.png`);
    });
  }
});
