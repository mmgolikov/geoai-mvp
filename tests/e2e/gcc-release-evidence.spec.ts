import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { expect, test, type Locator, type Page } from "@playwright/test";

type SurfaceName = "landing" | "workspace" | "dashboard" | "project-hub" | "analysis-report";

type ViewportDefinition = {
  height: number;
  name: string;
  width: number;
};

type ViewportMetric = {
  bodyClientWidth: number;
  bodyScrollWidth: number;
  documentClientWidth: number;
  documentScrollWidth: number;
  horizontalOverflowPx: number;
  route: string;
  screenshot: string;
  surface: SurfaceName;
  viewport: ViewportDefinition;
};

type BrowserInventoryRecord = {
  kind: "console" | "pageerror";
  sequence: number;
  surface: SurfaceName | "bootstrap";
  text: string;
  type: string;
  unexpected: boolean;
  viewport: string;
};

type ScreenshotRecord = {
  path: string;
  route: string;
  sha256: string;
  surface: SurfaceName;
  viewport: ViewportDefinition;
};

const execFileAsync = promisify(execFile);
const evidenceDirectory = path.join(process.cwd(), "artifacts", "gcc-release-evidence");
const fixedTime = "2026-08-16T09:00:00.000Z";
const baseUrl = process.env.GEOAI_E2E_BASE_URL ?? "http://127.0.0.1:3100";
const viewports: readonly ViewportDefinition[] = [
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "mobile-430x932", width: 430, height: 932 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "desktop-1440x900", width: 1440, height: 900 }
] as const;
const surfaceOrder: readonly SurfaceName[] = ["landing", "workspace", "dashboard", "project-hub", "analysis-report"];
const metrics: ViewportMetric[] = [];
const browserInventory: BrowserInventoryRecord[] = [];
const screenshots: ScreenshotRecord[] = [];
let inventorySequence = 0;
let testedCommitSha = "unknown";
let testedWorktreeClean = false;

function redactBrowserText(value: string) {
  return value
    .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, "[redacted-supabase-key]")
    .replace(/(Bearer\s+)[^\s]+/gi, "$1[redacted]")
    .replace(/([?&](?:access_token|api_key|key|secret|token)=)[^&\s]+/gi, "$1[redacted]")
    .slice(0, 1200);
}

function routeFor(page: Page) {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
}

function registerBrowserInventory(page: Page, viewportName: string) {
  let activeSurface: SurfaceName | "bootstrap" = "bootstrap";

  page.on("console", (message) => {
    const type = message.type();
    browserInventory.push({
      kind: "console",
      sequence: inventorySequence++,
      surface: activeSurface,
      text: redactBrowserText(message.text()),
      type,
      unexpected: type === "error" || type === "assert",
      viewport: viewportName
    });
  });
  page.on("pageerror", (error) => {
    browserInventory.push({
      kind: "pageerror",
      sequence: inventorySequence++,
      surface: activeSurface,
      text: redactBrowserText(error.message),
      type: error.name || "Error",
      unexpected: true,
      viewport: viewportName
    });
  });

  return (surface: SurfaceName) => {
    activeSurface = surface;
  };
}

async function stabilizePage(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
      html, body {
        color-scheme: light !important;
        scrollbar-width: none !important;
      }
      ::-webkit-scrollbar {
        display: none !important;
        height: 0 !important;
        width: 0 !important;
      }
    `
  });
  await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());
  await page.evaluate(async () => document.fonts.ready);
  await page.waitForTimeout(250);
}

async function readViewportMetrics(page: Page) {
  return page.evaluate(() => {
    const bodyClientWidth = document.body.clientWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const documentClientWidth = document.documentElement.clientWidth;
    const documentScrollWidth = document.documentElement.scrollWidth;
    return {
      bodyClientWidth,
      bodyScrollWidth,
      documentClientWidth,
      documentScrollWidth,
      horizontalOverflowPx: Math.max(
        0,
        bodyScrollWidth - bodyClientWidth,
        documentScrollWidth - documentClientWidth
      )
    };
  });
}

async function captureSurface(
  page: Page,
  viewport: ViewportDefinition,
  surface: SurfaceName,
  coreSurface: Locator
) {
  await stabilizePage(page);
  await expect(coreSurface, `${viewport.name} ${surface} core surface must be visible`).toBeVisible();
  await coreSurface.scrollIntoViewIfNeeded();
  const viewportMetrics = await readViewportMetrics(page);
  expect(viewportMetrics.horizontalOverflowPx, `${viewport.name} ${surface} horizontal overflow`).toBe(0);

  const unexpected = browserInventory.filter(
    (record) => record.viewport === viewport.name && record.surface === surface && record.unexpected
  );
  expect(unexpected, `${viewport.name} ${surface} must not emit console errors or page errors`).toEqual([]);

  const screenshotPath = path.join(evidenceDirectory, `${viewport.name}-${surface}.png`);
  const image = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    path: screenshotPath
  });
  const screenshotRecord: ScreenshotRecord = {
    path: path.relative(process.cwd(), screenshotPath),
    route: routeFor(page),
    sha256: createHash("sha256").update(image).digest("hex"),
    surface,
    viewport
  };
  screenshots.push(screenshotRecord);
  metrics.push({
    ...viewportMetrics,
    route: screenshotRecord.route,
    screenshot: screenshotRecord.path,
    surface,
    viewport
  });
  await writeEvidenceFiles();
}

async function signInGuidedDemo(page: Page, nextPath: "/workspace") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}&intent=demo`, { waitUntil: "domcontentloaded" });
  const redirected = await page.waitForURL((url) => url.pathname === nextPath, { timeout: 3000 }).then(
    () => true,
    () => false
  );
  if (redirected) return;

  await page.getByRole("button", { name: "Use guided access" }).click();
  await page.getByRole("button", { name: "Open guided workspace" }).click();
  await expect(page).toHaveURL((url) => url.pathname === nextPath);
}

async function openDashboard(page: Page) {
  const b2b = page.getByRole("button", { name: "B2B", exact: true }).first();
  if (await b2b.getAttribute("aria-pressed") !== "true") await b2b.click();

  const criteriaFirst = page.getByRole("button", { name: "Criteria-first", exact: true });
  if (await criteriaFirst.getAttribute("aria-pressed") !== "true") await criteriaFirst.click();

  const findZones = page.getByRole("button", { name: "Find redevelopment zones", exact: true });
  await expect(findZones).toBeEnabled();
  await findZones.click();

  const candidateSearch = page.getByText("Candidate Search", { exact: true }).locator("..").locator("..");
  const firstCandidate = candidateSearch.locator("button").first();
  await expect(firstCandidate).toBeVisible();
  await firstCandidate.click();

  const analyzeSelected = page.getByRole("button", { name: "Analyze Selected", exact: true });
  await expect(analyzeSelected).toBeEnabled();
  await analyzeSelected.click();
  const dashboard = page.locator("section[data-dashboard-analysis-id]");
  await expect(dashboard).toBeVisible();
  return dashboard;
}

async function writeEvidenceFiles() {
  await fs.mkdir(evidenceDirectory, { recursive: true });
  const orderedMetrics = [...metrics].sort((left, right) => {
    const viewportDifference = viewports.findIndex((item) => item.name === left.viewport.name)
      - viewports.findIndex((item) => item.name === right.viewport.name);
    return viewportDifference || surfaceOrder.indexOf(left.surface) - surfaceOrder.indexOf(right.surface);
  });
  const orderedScreenshots = [...screenshots].sort((left, right) => {
    const viewportDifference = viewports.findIndex((item) => item.name === left.viewport.name)
      - viewports.findIndex((item) => item.name === right.viewport.name);
    return viewportDifference || surfaceOrder.indexOf(left.surface) - surfaceOrder.indexOf(right.surface);
  });
  const unexpected = browserInventory.filter((record) => record.unexpected);

  await fs.writeFile(
    path.join(evidenceDirectory, "viewport-overflow-metrics.json"),
    `${JSON.stringify({
      schemaVersion: "geoai-gcc-release-evidence-v1",
      testedCommitSha,
      testedWorktreeClean,
      fixedTime,
      expectedViewportCount: viewports.length,
      expectedScreenshotCount: viewports.length * surfaceOrder.length,
      records: orderedMetrics
    }, null, 2)}\n`
  );
  await fs.writeFile(
    path.join(evidenceDirectory, "console-pageerror-inventory.json"),
    `${JSON.stringify({
      schemaVersion: "geoai-gcc-release-evidence-v1",
      testedCommitSha,
      testedWorktreeClean,
      unexpectedCount: unexpected.length,
      records: browserInventory
    }, null, 2)}\n`
  );

  const rows = orderedScreenshots.map((record) => {
    const metric = orderedMetrics.find(
      (item) => item.viewport.name === record.viewport.name && item.surface === record.surface
    );
    return `| ${record.viewport.name} | ${record.surface} | \`${record.route}\` | ${metric?.horizontalOverflowPx ?? "missing"} px | \`${record.path}\` | \`${record.sha256}\` |`;
  });
  const manifest = [
    "# GeoAI GCC responsive release evidence",
    "",
    `- Tested commit: \`${testedCommitSha}\``,
    `- Tested worktree clean: \`${testedWorktreeClean}\``,
    `- Local evidence base URL: \`${baseUrl}\``,
    `- Fixed browser time: \`${fixedTime}\``,
    `- Viewports: ${viewports.map((viewport) => `${viewport.width}x${viewport.height}`).join(", ")}`,
    `- Expected screenshots: ${viewports.length * surfaceOrder.length}`,
    `- Captured screenshots: ${orderedScreenshots.length}`,
    `- Unexpected console/page errors: ${unexpected.length}`,
    "",
    "| Viewport | Surface | Route | Horizontal overflow | PNG | SHA-256 |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...rows,
    ""
  ].join("\n");
  await fs.writeFile(path.join(evidenceDirectory, "manifest.md"), manifest);
}

test.describe("GCC responsive release evidence", () => {
  test.beforeAll(async () => {
    metrics.length = 0;
    browserInventory.length = 0;
    screenshots.length = 0;
    inventorySequence = 0;
    await fs.rm(evidenceDirectory, { recursive: true, force: true });
    await fs.mkdir(evidenceDirectory, { recursive: true });
    const gitResult = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: process.cwd() });
    testedCommitSha = gitResult.stdout.trim();
    const statusResult = await execFileAsync("git", ["status", "--porcelain"], { cwd: process.cwd() });
    testedWorktreeClean = statusResult.stdout.trim().length === 0;
  });

  test.afterAll(async () => {
    await writeEvidenceFiles();
    expect(screenshots, "Every declared viewport and surface must have a successful PNG").toHaveLength(
      viewports.length * surfaceOrder.length
    );
    expect(metrics, "Every successful PNG must have overflow metrics").toHaveLength(screenshots.length);
    expect(browserInventory.filter((record) => record.unexpected), "Browser inventory must be clean").toEqual([]);
  });

  for (const viewport of viewports) {
    test(`${viewport.name} core product surfaces`, async ({ browser }) => {
      test.setTimeout(120_000);
      const context = await browser.newContext({
        colorScheme: "light",
        reducedMotion: "reduce",
        viewport: { width: viewport.width, height: viewport.height }
      });
      const page = await context.newPage();
      await page.clock.setFixedTime(new Date(fixedTime));
      const setSurface = registerBrowserInventory(page, viewport.name);

      try {
        setSurface("landing");
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await captureSurface(
          page,
          viewport,
          "landing",
          page.getByRole("heading", { level: 1, name: "GeoAI Real Estate Decision Intelligence" })
        );

        setSurface("workspace");
        await signInGuidedDemo(page, "/workspace");
        const workspace = page.locator("[data-workspace-screening-setup]").first();
        await captureSurface(page, viewport, "workspace", workspace);

        setSurface("dashboard");
        const dashboard = await openDashboard(page);
        await captureSurface(page, viewport, "dashboard", dashboard);

        setSurface("project-hub");
        await page.goto("/projects", { waitUntil: "domcontentloaded" });
        await captureSurface(
          page,
          viewport,
          "project-hub",
          page.getByRole("heading", { level: 1, name: "Project Hub" })
        );

        setSurface("analysis-report");
        await page.goto("/reports/seeded-analysis-dubai-marina-report/print", { waitUntil: "domcontentloaded" });
        await captureSurface(
          page,
          viewport,
          "analysis-report",
          page.getByRole("heading", { level: 1, name: "GeoAI Analysis Report" })
        );
      } finally {
        await writeEvidenceFiles();
        await context.close();
      }
    });
  }
});
