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
const visualMismatches: string[] = [];

const expectedSha256ByFile: Record<string, string> = {
  "landing-desktop-1440.png": "95f8bc525f38d515429251f2ffc98c49396e559ea7be5c403df5181889b44b7b",
  "login-desktop-1440.png": "fd0647336406c1d4c476f4c59a01b32267256005c71255a459689b7871f6ea1a",
  "profile-desktop-1440.png": "7fbc2389c44e2c47555918cc1b3a73d3705bfd6556b224f9eef06ad04d2e7445",
  "landing-tablet-768.png": "f5983ef52825a963a06ddc0d57d9e01b6f6677b7dfb083c976788ff4dd323f74",
  "login-tablet-768.png": "8daece9bdb7d236eb2c8097d160b08d98f9f9518f544c00467e60f3655e9c491",
  "profile-tablet-768.png": "ce117e93972a4b86a0fd0e8c9345055b2f15700b7dd539140d8593d732d18ae5",
  "landing-mobile-390.png": "9007908e7d00eaedc5449474ecf56c900e4436f0a9b0a4efe22b0f94742f8051",
  "login-mobile-390.png": "6c351b23e6fdc773fdfa1a7ff31842621a773d7126aa079fa14695d1e1316ddc",
  "profile-mobile-390.png": "74fc1cd7e86bb06e0660ed49e5f5c5d3448b876bc2d2cae5fed88802c8577c1b"
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
  if (sha256 !== expectedSha256ByFile[fileName]) {
    visualMismatches.push(`${label}: expected ${expectedSha256ByFile[fileName]}, received ${sha256}`);
  }
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

test.describe("commercial Landing and Account visual acceptance", () => {
  test.beforeAll(async () => {
    visualEvidence.length = 0;
    visualMismatches.length = 0;
    await fs.rm(visualDirectory, { recursive: true, force: true });
  });

  test("captures Landing, Login and Profile at all declared viewports", async ({ browser }) => {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      await page.clock.setFixedTime(new Date("2026-07-19T09:00:00.000Z"));

      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1, name: "Ask the map. Move with evidence." })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureCommercialVisual(page, `${viewport.name} Landing`, `landing-${viewport.name}.png`);

      await page.goto("/login?next=/workspace&intent=demo");
      await expect(page.getByRole("heading", { level: 1, name: "Sign in to GeoAI" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureCommercialVisual(page, `${viewport.name} Login`, `login-${viewport.name}.png`);

      await openDemoProfile(page);
      await expectNoHorizontalOverflow(page);
      await captureCommercialVisual(page, `${viewport.name} Profile`, `profile-${viewport.name}.png`);

      await context.close();
    }

    expect(visualMismatches, "Every commercial visual must match its accepted SHA-256").toEqual([]);
  });
});
