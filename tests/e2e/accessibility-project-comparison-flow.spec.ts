import fs from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createComparisonItem, createMockComparison } from "@/src/lib/mock-comparison";
import { createSourceLineageSnapshot } from "@/src/lib/source-lineage-snapshot";

type AccessibilityViolation = {
  help: string;
  helpUrl: string;
  id: string;
  impact: string | null;
  nodes: Array<{
    failureSummary: string | null;
    html: string;
    target: string[];
  }>;
};

type AccessibilityResult = {
  checkedAt: string;
  label: string;
  path: string;
  seriousOrCriticalCount: number;
  violations: AccessibilityViolation[];
};

type LayoutBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const accessibilityArtifact = path.join(process.cwd(), "artifacts", "axe-project-comparison-results.json");
const requiredDataCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const accessibilityEvidence: AccessibilityResult[] = [];
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function requireLayoutBox(locator: Locator, label: string): Promise<LayoutBox> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`${label} must have a rendered bounding box.`);
  }
  return box;
}

function boxesOverlap(first: LayoutBox, second: LayoutBox, clearance = 0) {
  return first.x < second.x + second.width + clearance &&
    first.x + first.width + clearance > second.x &&
    first.y < second.y + second.height + clearance &&
    first.y + first.height + clearance > second.y;
}

function expectBoxInside(parent: LayoutBox, child: LayoutBox, label: string) {
  expect(child.x, `${label} left edge must stay inside the map`).toBeGreaterThanOrEqual(parent.x - 0.5);
  expect(child.y, `${label} top edge must stay inside the map`).toBeGreaterThanOrEqual(parent.y - 0.5);
  expect(child.x + child.width, `${label} right edge must stay inside the map`).toBeLessThanOrEqual(parent.x + parent.width + 0.5);
  expect(child.y + child.height, `${label} bottom edge must stay inside the map`).toBeLessThanOrEqual(parent.y + parent.height + 0.5);
}

async function recordAccessibilityResult(page: Page, label: string) {
  const analysis = await new AxeBuilder({ page })
    .withTags(wcagTags)
    .analyze();
  const violations = analysis.violations
    .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map((node) => ({
        target: node.target.map(String),
        html: node.html,
        failureSummary: node.failureSummary ?? null
      }))
    }));

  accessibilityEvidence.push({
    label,
    path: `${new URL(page.url()).pathname}${new URL(page.url()).search}`,
    checkedAt: new Date().toISOString(),
    seriousOrCriticalCount: violations.length,
    violations
  });
  await fs.mkdir(path.dirname(accessibilityArtifact), { recursive: true });
  await fs.writeFile(accessibilityArtifact, `${JSON.stringify(accessibilityEvidence, null, 2)}\n`, "utf8");

  console.log(`[axe] ${label}: ${violations.length} serious/critical violation(s)`);
  expect(violations, `${label} must have no serious or critical Axe findings`).toEqual([]);
}

async function tabUntilLocator(
  page: Page,
  target: Locator,
  options: { maximumTabs?: number } = {}
) {
  const { maximumTabs = 280 } = options;

  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => document.activeElement === element).catch(() => false)) {
      return;
    }
  }

  const label = await target.getAttribute("aria-label") ?? await target.innerText().catch(() => "unknown target");
  throw new Error(`Keyboard focus did not reach '${label}' after ${maximumTabs} Tab presses.`);
}

async function signInDemoWithKeyboard(page: Page, nextPath: "/projects" | "/workspace") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}&intent=demo`);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in to GeoAI" })).toBeVisible();

  const demoCredentials = page.getByRole("button", { name: "Use demo credentials" });
  await tabUntilLocator(page, demoCredentials, { maximumTabs: 40 });
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Email or phone")).toHaveValue("demo@geoai.space");
  await expect(page.getByLabel("Password")).toHaveValue("111111");

  const openDemo = page.getByRole("button", { name: "Open demo" });
  await tabUntilLocator(page, openDemo, { maximumTabs: 20 });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL((url) => url.pathname === nextPath);
  await expect(page.getByRole("link", { name: "Open demo profile" })).toHaveAttribute("data-authenticated", "true");
}

test.describe.configure({ mode: "serial" });

test.describe("accessible browser-local project and comparison journeys", () => {
  test.beforeAll(async () => {
    accessibilityEvidence.length = 0;
    await fs.rm(accessibilityArtifact, { force: true });
  });

  test("classifies imported sample market metrics as used demo lineage", () => {
    const importedComparison = createMockComparison([
      createComparisonItem(
        { latitude: 25.0800, longitude: 55.1400 },
        null,
        "investmentSiteSelection"
      )
    ]);
    expect(importedComparison.items[0].marketMetricsMatch?.importedMetricsUsed).toBe(true);

    const lineage = createSourceLineageSnapshot({ evidence: importedComparison.evidence });
    expect(lineage.demoSources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "comparison-imported-market-metrics",
        name: "Imported sample market metrics",
        note: expect.stringContaining("data/normalized/market_area_metrics.json")
      })
    ]));
    expect(lineage.externalSources.some((source) => source.id === "demo-market-context-seed")).toBe(false);
  });

  test("creates, restores and opens a browser-local project without a pointer", async ({ page }) => {
    const projectName = "Keyboard accessibility pilot";

    await signInDemoWithKeyboard(page, "/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Project Hub" })).toBeVisible();
    await recordAccessibilityResult(page, "Projects hub");

    const createProject = page.getByRole("button", { name: "Create project" });
    await tabUntilLocator(page, createProject, { maximumTabs: 80 });
    await page.keyboard.press("Enter");

    const projectNameInput = page.getByRole("textbox", { name: "Project name" });
    await tabUntilLocator(page, projectNameInput, { maximumTabs: 20 });
    await page.keyboard.type(projectName);

    const marketInput = page.getByRole("textbox", { name: "Location / market" });
    await tabUntilLocator(page, marketInput, { maximumTabs: 20 });
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Abu Dhabi / UAE");

    const submitProject = page.getByRole("button", { name: "Create", exact: true });
    await tabUntilLocator(page, submitProject, { maximumTabs: 10 });
    await page.keyboard.press("Enter");

    const projectSelector = page.locator("#project-dashboard-selector");
    await expect(projectSelector.locator("option:checked")).toHaveText(projectName);
    await expect.poll(async () => page.evaluate((name) => {
      const key = Object.keys(window.localStorage).find((item) => item.includes("local-projects-v1"));
      return key ? window.localStorage.getItem(key)?.includes(name) ?? false : false;
    }, projectName)).toBe(true);

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Project Hub" })).toBeVisible();
    await expect(projectSelector.locator("option:checked")).toHaveText(projectName);

    const openWorkspace = page.getByRole("link", { name: "Open workspace", exact: true }).first();
    await tabUntilLocator(page, openWorkspace, { maximumTabs: 80 });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL((url) => url.pathname === "/workspace" && url.searchParams.has("projectId"));
    await expect(page.locator("#active-project option:checked")).toHaveText(projectName);
  });

  test("compares criteria-first candidates and opens a printable report without a pointer", async ({ page }) => {
    await signInDemoWithKeyboard(page, "/workspace");
    await expect(page.getByRole("button", { name: "Criteria-first" })).toBeVisible();
    await recordAccessibilityResult(page, "Workspace criteria-first setup");

    const criteriaFirst = page.getByRole("button", { name: "Criteria-first" });
    await tabUntilLocator(page, criteriaFirst, { maximumTabs: 100 });
    await page.keyboard.press("Enter");
    await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");

    const findCandidates = page.getByRole("button", { name: "Find redevelopment zones" });
    await tabUntilLocator(page, findCandidates);
    await page.keyboard.press("Enter");

    const compareCandidates = page.getByRole("button", { name: "Compare Candidates" });
    await expect(compareCandidates).toBeEnabled();
    await tabUntilLocator(page, compareCandidates);
    await page.keyboard.press("Enter");

    const comparisonDashboard = page.locator("section[data-dashboard-comparison-id]");
    await expect(comparisonDashboard).toBeVisible();
    await expect(comparisonDashboard.getByRole("heading", { level: 1, name: "Candidate Comparison" })).toBeVisible();
    await expect(comparisonDashboard.getByText(requiredDataCaveat, { exact: true })).toBeVisible();
    await recordAccessibilityResult(page, "Candidate comparison dashboard");

    const exportButton = comparisonDashboard.getByRole("button", { name: "Export", exact: true });
    await tabUntilLocator(page, exportButton, { maximumTabs: 360 });
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL((url) => /^\/reports\/[^/]+\/print$/.test(url.pathname));
    await expect(page.getByRole("heading", { level: 1, name: "GeoAI Comparison Report" })).toBeVisible();
    const lineageSection = page.locator('[data-report-section="Data Used / Source Lineage"]');
    await expect(lineageSection).toBeVisible();

    const sampleGroup = lineageSection.locator(".geoai-print-source-group").filter({ hasText: /Sample\/open fallback/i });
    const plannedGroup = lineageSection.locator(".geoai-print-source-group").filter({ hasText: /Planned validation sources/i });
    await expect(sampleGroup.locator(".geoai-print-source-card").first()).toBeVisible();
    await expect(sampleGroup.getByText("sample/open", { exact: true }).first()).toBeVisible();
    await expect(plannedGroup.locator(".geoai-print-source-card").first()).toBeVisible();

    const savedLineage = await page.evaluate(() => {
      const reportId = decodeURIComponent(window.location.pathname.split("/")[2] ?? "");
      const storageKey = Object.keys(window.localStorage).find((key) => key.includes(`print-report:${reportId}`));
      if (!storageKey) return null;
      const rawRecord = window.localStorage.getItem(storageKey);
      if (!rawRecord) return null;
      const record = JSON.parse(rawRecord) as { reportPayload?: { comparedItems?: Array<{ marketMetrics?: { importedMetricsUsed?: boolean } }> }; sourceLineage?: unknown };
      if (!record.sourceLineage) return null;
      return {
        importedMetricsUsed: record.reportPayload?.comparedItems?.some((item) => item.marketMetrics?.importedMetricsUsed === true) ?? false,
        sourceLineage: record.sourceLineage
      };
    });
    expect(savedLineage, "saved browser-local report must contain top-level source lineage").not.toBeNull();
    expect((savedLineage as { importedMetricsUsed: boolean }).importedMetricsUsed, "this comparison fixture must remain explicit that imported sample metrics were not matched").toBe(false);
    const savedSourceLineage = (savedLineage as {
      sourceLineage: {
        demoSources?: Array<{ id?: string; name?: string; note?: string }>;
        plannedValidationSources?: unknown[];
      };
    }).sourceLineage;
    expect(Array.isArray(savedSourceLineage.demoSources)).toBe(true);
    expect(savedSourceLineage.demoSources?.length).toBeGreaterThan(0);
    expect(savedSourceLineage.demoSources?.some((source) => source.id === "comparison-imported-market-metrics")).toBe(false);
    expect(Array.isArray(savedSourceLineage.plannedValidationSources)).toBe(true);
    expect(savedSourceLineage.plannedValidationSources?.length).toBeGreaterThan(0);
    await expect(sampleGroup.getByText("Imported sample market metrics", { exact: true })).toHaveCount(0);

    const lineageCaveats = await lineageSection.locator(".geoai-print-disclaimer p").allTextContents();
    expect(
      lineageCaveats.filter((item) => item.trim().toLocaleLowerCase() === requiredDataCaveat.toLocaleLowerCase()),
      "source-lineage caveat must appear exactly once and with canonical casing"
    ).toEqual([requiredDataCaveat]);

    const map = page.locator(".geoai-print-map").first();
    const mapStatus = map.locator(".geoai-print-map-status");
    const mapNorth = map.locator(".geoai-print-map-north");
    const mapScale = map.locator(".geoai-print-map-scale");
    const mapCaption = map.locator(".geoai-print-map-caption");
    const markerLocator = map.locator(".geoai-print-marker");

    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 834, height: 1112 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const pageWidth = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth
      }));
      expect(pageWidth.scroll, `print report must not overflow horizontally at ${viewport.width}px`).toBeLessThanOrEqual(pageWidth.client + 1);
      await expect(map).toBeVisible();
      await expect(markerLocator).toHaveCount(3);

      const mapBox = await requireLayoutBox(map, `comparison map at ${viewport.width}px`);
      const annotationBoxes = [
        { label: "status", box: await requireLayoutBox(mapStatus, "map status") },
        { label: "north", box: await requireLayoutBox(mapNorth, "map north") },
        { label: "scale", box: await requireLayoutBox(mapScale, "map scale") }
      ];
      const captionBox = await requireLayoutBox(mapCaption, "map caption");
      const markerBoxes = await Promise.all(
        (await markerLocator.all()).map((marker, index) => requireLayoutBox(marker, `map marker ${index + 1}`))
      );

      for (const annotation of annotationBoxes) {
        expectBoxInside(mapBox, annotation.box, `${annotation.label} annotation at ${viewport.width}px`);
      }
      expectBoxInside(mapBox, captionBox, `caption at ${viewport.width}px`);
      for (const [index, markerBox] of markerBoxes.entries()) {
        expectBoxInside(mapBox, markerBox, `marker ${index + 1} at ${viewport.width}px`);
        expect(boxesOverlap(markerBox, captionBox, 2), `marker ${index + 1} must not collide with the caption at ${viewport.width}px`).toBe(false);
        for (const annotation of annotationBoxes) {
          expect(boxesOverlap(markerBox, annotation.box, 2), `marker ${index + 1} must not collide with ${annotation.label} at ${viewport.width}px`).toBe(false);
        }
      }

      for (let first = 0; first < markerBoxes.length; first += 1) {
        for (let second = first + 1; second < markerBoxes.length; second += 1) {
          expect(boxesOverlap(markerBoxes[first], markerBoxes[second], 2), `markers ${first + 1} and ${second + 1} must not collide at ${viewport.width}px`).toBe(false);
        }
      }
      for (let first = 0; first < annotationBoxes.length; first += 1) {
        for (let second = first + 1; second < annotationBoxes.length; second += 1) {
          expect(
            boxesOverlap(annotationBoxes[first].box, annotationBoxes[second].box, 2),
            `${annotationBoxes[first].label} and ${annotationBoxes[second].label} must not collide at ${viewport.width}px`
          ).toBe(false);
        }
      }
    }

    const printButton = page.getByRole("button", { name: "Print / Save as PDF" });
    await expect(printButton).toBeVisible();
    await recordAccessibilityResult(page, "Printable comparison report");

    await tabUntilLocator(page, printButton, { maximumTabs: 40 });
    await expect(printButton).toBeFocused();
  });
});
