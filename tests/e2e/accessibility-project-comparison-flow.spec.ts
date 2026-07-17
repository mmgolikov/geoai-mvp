import fs from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

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

const accessibilityArtifact = path.join(process.cwd(), "artifacts", "axe-project-comparison-results.json");
const accessibilityEvidence: AccessibilityResult[] = [];
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

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

async function signInDemoWithKeyboard(page: Page, nextPath: "/projects" | "/explore") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}&intent=demo`);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in or create account" })).toBeVisible();

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
    await signInDemoWithKeyboard(page, "/explore");
    await expect(page.getByRole("button", { name: "Criteria-first" })).toBeVisible();
    await recordAccessibilityResult(page, "Explore setup");

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
    await recordAccessibilityResult(page, "Candidate comparison dashboard");

    const exportButton = comparisonDashboard.getByRole("button", { name: "Export", exact: true });
    await tabUntilLocator(page, exportButton, { maximumTabs: 360 });
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL((url) => /^\/reports\/[^/]+\/print$/.test(url.pathname));
    await expect(page.getByRole("heading", { level: 1, name: "GeoAI Comparison Report" })).toBeVisible();
    const printButton = page.getByRole("button", { name: "Print / Save as PDF" });
    await expect(printButton).toBeVisible();
    await recordAccessibilityResult(page, "Printable comparison report");

    await tabUntilLocator(page, printButton, { maximumTabs: 40 });
    await expect(printButton).toBeFocused();
  });
});
