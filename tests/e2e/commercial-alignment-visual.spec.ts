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
  "landing-desktop-1440.png": "1b5a09d474955caa4c7b65d74cf81aa09463ba2d18d63caf52c40287e75a93f3",
  "login-desktop-1440.png": "dacc2ed2694193c655855fee9913c8f984d62f3368660f5e4c843706a2998a8f",
  "profile-desktop-1440.png": "7fbc2389c44e2c47555918cc1b3a73d3705bfd6556b224f9eef06ad04d2e7445",
  "landing-tablet-768.png": "4fcf21e22a0f62809172bfeb73b28ed52c1e9e66d78fe2e0be0072e607eb9937",
  "login-tablet-768.png": "2f16049447cad5093967e2464527144e29407d6c5397abdb0647cc799d005a92",
  "profile-tablet-768.png": "ce117e93972a4b86a0fd0e8c9345055b2f15700b7dd539140d8593d732d18ae5",
  "landing-mobile-390.png": "d15a35babd5905ad8c2d117b371801a10aa356053ddfba830893d9eea9ce3d3c",
  "login-mobile-390.png": "fe84d32cbd2a22e8f188f9e1ba8f8c6011880bf30ea33494b5ce221aceb05189",
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
