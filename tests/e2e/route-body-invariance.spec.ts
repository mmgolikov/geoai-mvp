import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

type BodyEvidenceRecord = {
  baselineFile: string;
  baselineImageHash: string;
  baselineSha: string;
  bodyBoundary: string;
  candidateFile: string;
  candidateImageHash: string;
  candidateSha: string;
  equality: boolean;
  reproducibleCaptureCommand: string;
  route: string;
  viewport: { height: number; name: string; width: number };
};

const baselineSha = process.env.ROUTE_BODY_BASELINE_SHA ?? "d788ea4ddeecc719b5ffcecdd6aab8539cc9b755";
const updateBaselines = process.env.UPDATE_ROUTE_BODY_BASELINES === "1";
const baselineDirectory = path.join(process.cwd(), "tests", "e2e", "__screenshots__", "route-body-invariance");
const evidenceDirectory = path.join(process.cwd(), "artifacts", "design-foundation-body-invariance");
const routes = ["/workspace", "/projects", "/explore", "/request-access", "/profile"] as const;
const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1024", width: 1024, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 }
] as const;
const fixedTime = "2026-07-21T12:00:00.000Z";

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function fileName(route: string, viewport: string) {
  return `${viewport}-${route.slice(1).replaceAll("/", "-")}.png`;
}

async function stabilize(page: Page) {
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;backdrop-filter:none!important;border-radius:0!important;box-shadow:none!important;caret-color:transparent!important;filter:none!important;scroll-behavior:auto!important;transition:none!important}nextjs-portal{display:none!important}.mapboxgl-canvas{visibility:hidden!important}[data-spatial-runtime-environment]>.absolute.inset-0{background-color:#eef3f6!important;background-image:none!important}[data-product-shell],body header:first-of-type{visibility:hidden!important;position:static!important}"
  });
  await page.evaluate(async () => document.fonts.ready);
  await page.waitForTimeout(150);
}

async function signInDemo(page: Page) {
  await page.goto("/login?next=/workspace&intent=demo");
  const redirected = await page.waitForURL((url) => url.pathname === "/workspace", { timeout: 3000 }).then(() => true, () => false);
  if (!redirected) {
    await page.getByRole("button", { name: "Use demo credentials" }).click();
    await page.getByRole("button", { name: "Open demo" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/workspace");
  }
}

async function bodyBelowSharedShell(page: Page) {
  const shell = page.locator("[data-product-shell], header").first();
  await expect(shell).toBeAttached();
  const body = shell.locator("xpath=following-sibling::*[1]");
  await expect(body, "Route body must be the first element sibling below the shared shell").toBeVisible();
  return body;
}

test("proves all 20 Product route bodies are pixel-identical to the authorized pre-shell baseline", async ({ browser }) => {
  await fs.mkdir(baselineDirectory, { recursive: true });
  await fs.rm(evidenceDirectory, { force: true, recursive: true });
  await fs.mkdir(path.join(evidenceDirectory, "baseline"), { recursive: true });
  await fs.mkdir(path.join(evidenceDirectory, "candidate"), { recursive: true });

  const candidateSha = process.env.GITHUB_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const records: BodyEvidenceRecord[] = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({ colorScheme: "light", reducedMotion: "reduce", viewport });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date(fixedTime));
    await signInDemo(page);

    for (const route of routes) {
      await page.goto(route);
      await stabilize(page);
      const body = await bodyBelowSharedShell(page);
      const screenshot = await body.screenshot({ animations: "disabled", caret: "hide" });
      const name = fileName(route, viewport.name);
      const baselinePath = path.join(baselineDirectory, name);

      if (updateBaselines) {
        await fs.writeFile(baselinePath, screenshot);
        records.push({
          baselineFile: path.relative(process.cwd(), baselinePath),
          baselineImageHash: sha256(screenshot),
          baselineSha,
          bodyBoundary: "first element sibling after the canonical top-level Product header",
          candidateFile: "not-applicable-during-baseline-capture",
          candidateImageHash: sha256(screenshot),
          candidateSha: baselineSha,
          equality: true,
          reproducibleCaptureCommand: `UPDATE_ROUTE_BODY_BASELINES=1 ROUTE_BODY_BASELINE_SHA=${baselineSha} GEOAI_E2E_BASE_URL=http://127.0.0.1:3101 npx playwright test tests/e2e/route-body-invariance.spec.ts --retries=0`,
          route,
          viewport
        });
        continue;
      }

      const baseline = await fs.readFile(baselinePath);
      const baselineHash = sha256(baseline);
      const candidateHash = sha256(screenshot);
      const equality = baselineHash === candidateHash;
      const baselineEvidencePath = path.join(evidenceDirectory, "baseline", name);
      const candidateEvidencePath = path.join(evidenceDirectory, "candidate", name);
      await Promise.all([fs.writeFile(baselineEvidencePath, baseline), fs.writeFile(candidateEvidencePath, screenshot)]);
      records.push({
        baselineFile: path.relative(process.cwd(), baselineEvidencePath),
        baselineImageHash: baselineHash,
        baselineSha,
        bodyBoundary: "first element sibling after the canonical top-level Product header",
        candidateFile: path.relative(process.cwd(), candidateEvidencePath),
        candidateImageHash: candidateHash,
        candidateSha,
        equality,
        reproducibleCaptureCommand: "GEOAI_E2E_BASE_URL=http://127.0.0.1:3100 npx playwright test tests/e2e/route-body-invariance.spec.ts --retries=0",
        route,
        viewport
      });
      expect(candidateHash, `${route} at ${viewport.width}x${viewport.height} must match baseline ${baselineSha}`).toBe(baselineHash);
    }
    await context.close();
  }

  const manifest = {
    baselineSha,
    candidateSha: updateBaselines ? baselineSha : candidateSha,
    captureNormalization: "Animations, transitions, caret, Next.js portal, dynamic Mapbox pixels, fallback-grid rasterization and browser-dependent corner/shadow antialiasing are suppressed; route layout, controls, text and all other body pixels remain compared.",
    caseCount: records.length,
    equalityCount: records.filter((record) => record.equality).length,
    generatedAt: fixedTime,
    mode: updateBaselines ? "baseline-capture" : "candidate-comparison",
    records
  };
  const manifestPath = updateBaselines ? path.join(baselineDirectory, "manifest.json") : path.join(evidenceDirectory, "manifest.json");
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  expect(records).toHaveLength(20);
  expect(records.every((record) => record.equality)).toBe(true);
});
