import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

const evidenceDirectory = path.join(process.cwd(), "artifacts", "runtime-design-recovery");
const fixedTime = "2026-07-22T20:30:00.000Z";
const workspacePrimaryColor = "rgb(8, 127, 140)";
const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-834", width: 834, height: 1112 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-390", width: 390, height: 844 }
] as const;

async function prepareEvidenceDirectory() {
  await fs.mkdir(evidenceDirectory, { recursive: true });
}

async function signInDemo(page: Page, next = "/workspace") {
  await page.goto(`/login?next=${encodeURIComponent(next)}&intent=demo`);
  const redirected = await page.waitForURL((url) => url.pathname === next, { timeout: 3000 }).then(() => true, () => false);
  if (redirected) return;
  await page.getByRole("button", { name: "Use demo credentials" }).click();
  await page.getByRole("button", { name: "Open demo" }).click();
  await expect(page).toHaveURL((url) => url.pathname === next);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  expect(overflow.body, "Body must not overflow horizontally").toBeLessThanOrEqual(1);
  expect(overflow.document, "Document must not overflow horizontally").toBeLessThanOrEqual(1);
}

async function expectElementUnobstructed(locator: Locator, label: string) {
  await expect(locator, `${label} must be visible`).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  const result = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
    const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
    const stack = document.elementsFromPoint(x, y);
    const topInteractive = stack.find((candidate) => {
      const style = getComputedStyle(candidate);
      return style.display !== "none" && style.visibility !== "hidden" && style.pointerEvents !== "none";
    });
    return {
      height: rect.height,
      topTag: topInteractive?.tagName ?? null,
      topText: topInteractive?.textContent?.trim().slice(0, 80) ?? null,
      unobstructed: Boolean(topInteractive && (topInteractive === element || element.contains(topInteractive))),
      width: rect.width,
      x,
      y
    };
  });
  expect(result.width, `${label} must have a measurable width`).toBeGreaterThan(0);
  expect(result.height, `${label} must have a measurable height`).toBeGreaterThan(0);
  expect(
    result.unobstructed,
    `${label} is covered at (${result.x}, ${result.y}) by ${result.topTag ?? "unknown"}: ${result.topText ?? "no text"}`
  ).toBe(true);
}

function expectedCockpitAsset(width: number) {
  if (width <= 639) return "/design/landing-geoai-cockpit-mobile-v18.png";
  if (width <= 1023) return "/design/landing-geoai-cockpit-tablet-v18.png";
  return "/design/landing-geoai-cockpit-desktop-v18.png";
}

async function newPage(browser: Browser, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ colorScheme: "light", reducedMotion: "reduce", viewport });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(fixedTime));
  return { context, page };
}

test.beforeAll(async () => {
  await fs.rm(evidenceDirectory, { force: true, recursive: true });
  await prepareEvidenceDirectory();
});

test("records the founder-authorized runtime body migration boundary", async () => {
  const program = JSON.parse(await fs.readFile(
    path.join(process.cwd(), "docs", "RUNTIME_DESIGN_RECOVERY_PROGRAM_2026_07_22.json"),
    "utf8"
  )) as {
    authority?: {
      runtimeBodyMigrationAuthorization?: {
        approvedBy?: string;
        scope?: string;
        mergeAuthorized?: boolean;
        productionAuthorized?: boolean;
        figmaWritesAuthorized?: boolean;
        supabaseMutationAuthorized?: boolean;
      };
    };
    changeRequests?: Array<{ id?: string }>;
  };
  const authorization = program.authority?.runtimeBodyMigrationAuthorization;
  expect(authorization?.approvedBy).toBe("GeoAI Founder");
  expect(authorization?.scope).toBe("Draft branch and Vercel Preview only");
  expect(authorization?.mergeAuthorized).toBe(false);
  expect(authorization?.productionAuthorized).toBe(false);
  expect(authorization?.figmaWritesAuthorized).toBe(false);
  expect(authorization?.supabaseMutationAuthorized).toBe(false);
  expect(program.changeRequests?.map((item) => item.id)).toEqual([
    "CR-10.03",
    "CR-10.04",
    "CR-10.05",
    "CR-10.06",
    "CR-10.07",
    "CR-10.08",
    "CR-10.09"
  ]);
});

test("commercial landing uses the responsive Figma cockpit and keeps primary actions unobstructed", async ({ browser }) => {
  const records = [];
  for (const viewport of viewports) {
    const { context, page } = await newPage(browser, viewport);
    await page.goto("/");
    await page.evaluate(async () => document.fonts.ready);

    const internalValidationOverlay = page.getByText("Validation gap · official confirmation required", { exact: true });
    await expect(internalValidationOverlay).toHaveCount(0);

    const cockpitImage = page.locator('[data-landing-cockpit-authority="commercial-v1.8"] img').first();
    await expect(cockpitImage).toBeVisible();
    const cockpitMetrics = await cockpitImage.evaluate((element) => {
      const image = element as HTMLImageElement;
      return {
        complete: image.complete,
        currentPath: new URL(image.currentSrc || image.src, window.location.href).pathname,
        naturalHeight: image.naturalHeight,
        naturalWidth: image.naturalWidth
      };
    });
    expect(cockpitMetrics.complete, `${viewport.name} cockpit image must finish loading`).toBe(true);
    expect(cockpitMetrics.naturalWidth, `${viewport.name} cockpit image must have intrinsic width`).toBeGreaterThan(0);
    expect(cockpitMetrics.naturalHeight, `${viewport.name} cockpit image must have intrinsic height`).toBeGreaterThan(0);
    expect(cockpitMetrics.currentPath).toBe(expectedCockpitAsset(viewport.width));
    const cockpitBox = await cockpitImage.boundingBox();
    expect(cockpitBox).not.toBeNull();
    expect(cockpitBox?.width ?? 0, `${viewport.name} cockpit must remain legible`).toBeGreaterThanOrEqual(300);
    expect(cockpitBox?.width ?? 0, `${viewport.name} cockpit must fit the viewport`).toBeLessThanOrEqual(viewport.width);

    const hero = page.locator("main > section").first();
    const viewDemo = hero.getByRole("link", { name: "View demo", exact: true });
    await expectElementUnobstructed(viewDemo, `${viewport.name} View demo`);

    const heading = page.getByRole("heading", { name: "Make the reasoning visible" });
    await expect(heading).toBeVisible();
    const card = heading.locator("xpath=ancestor::article[1]");
    const cardBox = await card.boundingBox();
    const copyBox = await card.locator("p").first().boundingBox();
    expect(cardBox).not.toBeNull();
    expect(copyBox).not.toBeNull();
    expect((copyBox?.y ?? 0) + (copyBox?.height ?? 0)).toBeLessThanOrEqual((cardBox?.y ?? 0) + (cardBox?.height ?? 0) - 12);

    await expectNoHorizontalOverflow(page);
    const screenshot = path.join(evidenceDirectory, `landing-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled", caret: "hide" });
    records.push({
      cockpitAsset: cockpitMetrics.currentPath,
      route: "/",
      viewport,
      screenshot: path.relative(process.cwd(), screenshot)
    });
    await context.close();
  }
  await fs.writeFile(path.join(evidenceDirectory, "landing-manifest.json"), `${JSON.stringify({ fixedTime, records }, null, 2)}\n`);
});

test("workspace scenario, primary color and overlay safety hold at every declared viewport", async ({ browser }) => {
  const records = [];
  for (const viewport of viewports) {
    const { context, page } = await newPage(browser, viewport);
    await signInDemo(page);
    await page.goto("/workspace");

    const scenarioSection = page.locator("[data-workspace-screening-setup]").first();
    await expect(scenarioSection).toBeVisible();
    const scenarioSelect = scenarioSection.getByLabel("Scenario");
    await expect(scenarioSelect).toBeVisible();
    const scenarioBox = await scenarioSelect.boundingBox();
    expect(scenarioBox).not.toBeNull();
    expect(scenarioBox?.width ?? 0, `${viewport.name} Scenario must remain readable`).toBeGreaterThanOrEqual(300);

    const primaryCopy = scenarioSection.locator("[data-scenario-primary-copy]").first();
    const summaryCopy = scenarioSection.locator("[data-scenario-summary-copy]").first();
    await expect(primaryCopy).toBeVisible();
    await expect(summaryCopy).toBeVisible();
    const copyMetrics = await summaryCopy.evaluate((element) => ({
      clientHeight: element.clientHeight,
      lineClamp: getComputedStyle(element).webkitLineClamp,
      scrollHeight: element.scrollHeight,
      textOverflow: getComputedStyle(element).textOverflow,
      whiteSpace: getComputedStyle(element).whiteSpace
    }));
    expect(["none", "unset", "0", ""], `Scenario subtitle must not be one-line clamped; received '${copyMetrics.lineClamp}'`).toContain(copyMetrics.lineClamp);
    expect(copyMetrics.scrollHeight).toBeLessThanOrEqual(copyMetrics.clientHeight + 1);
    expect(copyMetrics.textOverflow).not.toBe("ellipsis");
    expect(copyMetrics.whiteSpace).not.toBe("nowrap");
    await expect(page.getByText("Validation caveat", { exact: true })).toHaveCount(0);

    const selectedAudience = page.getByRole("button", { name: "B2B", exact: true }).first();
    await selectedAudience.click();
    await expect(selectedAudience).toHaveAttribute("aria-pressed", "true");
    const criteriaFirst = page.getByRole("button", { name: "Criteria-first", exact: true });
    await criteriaFirst.click();
    await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");
    const primaryCta = page.getByRole("button", { name: "Find redevelopment zones", exact: true });
    await expect(primaryCta).toBeEnabled();

    const primaryControls = [selectedAudience, criteriaFirst, primaryCta];
    const primaryColors = [];
    for (const control of primaryControls) {
      const color = await control.evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(color).toBe(workspacePrimaryColor);
      primaryColors.push(color);
    }

    await expectElementUnobstructed(page.getByRole("button", { name: "Add to compare", exact: true }), `${viewport.name} Add to compare`);
    await expectElementUnobstructed(primaryCta, `${viewport.name} primary candidate-search action`);
    await expectNoHorizontalOverflow(page);

    await scenarioSection.scrollIntoViewIfNeeded();
    const screenshot = path.join(evidenceDirectory, `workspace-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled", caret: "hide" });
    records.push({
      primaryColors,
      route: "/workspace",
      viewport,
      screenshot: path.relative(process.cwd(), screenshot)
    });
    await context.close();
  }
  await fs.writeFile(path.join(evidenceDirectory, "workspace-manifest.json"), `${JSON.stringify({ fixedTime, records }, null, 2)}\n`);
});

test("analysis report restores the A4 grid and deliberate site-context hierarchy", async ({ page }) => {
  await page.clock.setFixedTime(new Date(fixedTime));
  await signInDemo(page);
  await page.goto("/workspace");

  const criteriaFirst = page.getByRole("button", { name: "Criteria-first" });
  await criteriaFirst.click();
  await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Find redevelopment zones" }).click();
  const candidateSearchCard = page.getByText("Candidate Search", { exact: true }).locator("..").locator("..");
  const firstCandidate = candidateSearchCard.locator("button").first();
  await expect(firstCandidate).toBeVisible();
  await firstCandidate.click();

  const analyzeSelected = page.getByRole("button", { name: "Analyze Selected" });
  await expect(analyzeSelected).toBeEnabled();
  await analyzeSelected.click();

  const dashboard = page.locator("section[data-dashboard-analysis-id]");
  await expect(dashboard).toBeVisible();
  const decisionPosture = dashboard.locator('[data-dashboard-card="decision-posture"]');
  const nextAction = dashboard.locator('[data-dashboard-value="next-action"]');
  const exportButton = dashboard.getByRole("button", { name: "Export", exact: true });
  await expect(decisionPosture).toBeInViewport();
  await expect(nextAction).toBeInViewport();
  const exportBackground = await exportButton.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(exportBackground).toBe(workspacePrimaryColor);

  await exportButton.click();
  await expect(page).toHaveURL((url) => /^\/reports\/[^/]+\/print$/.test(url.pathname));
  const reportPath = new URL(page.url()).pathname;

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("heading", { name: "GeoAI Analysis Report" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Site Context Map" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Executive Decision" })).toBeVisible();
  await expect(page.getByText("Map Context Fallback", { exact: true })).toHaveCount(0);

  const metaColumns = await page.locator(".geoai-print-meta-grid").first().evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length
  );
  const topColumns = await page.locator(".geoai-print-top-grid").first().evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length
  );
  expect(metaColumns).toBeGreaterThanOrEqual(3);
  expect(topColumns).toBeGreaterThanOrEqual(2);

  await expect(page.locator(".geoai-print-map, [data-report-map-snapshot]").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const screenshot = path.join(evidenceDirectory, "analysis-report-print.png");
  await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled", caret: "hide" });
  await fs.writeFile(path.join(evidenceDirectory, "report-manifest.json"), `${JSON.stringify({
    fixedTime,
    route: reportPath,
    exportBackground,
    metaColumns,
    topColumns,
    screenshot: path.relative(process.cwd(), screenshot)
  }, null, 2)}\n`);
});
