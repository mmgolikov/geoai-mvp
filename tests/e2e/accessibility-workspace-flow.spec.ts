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

const accessibilityArtifact = path.join(process.cwd(), "artifacts", "axe-accessibility-results.json");
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function recordAccessibilityResult(
  page: Page,
  label: string,
  evidence: AccessibilityResult[]
) {
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

  evidence.push({
    label,
    path: `${new URL(page.url()).pathname}${new URL(page.url()).search}`,
    checkedAt: new Date().toISOString(),
    seriousOrCriticalCount: violations.length,
    violations
  });
  await fs.mkdir(path.dirname(accessibilityArtifact), { recursive: true });
  await fs.writeFile(accessibilityArtifact, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  console.log(`[axe] ${label}: ${violations.length} serious/critical violation(s)`);
  expect(violations, `${label} must have no serious or critical Axe findings`).toEqual([]);
}

async function tabUntilLocator(
  page: Page,
  target: Locator,
  options: { direction?: "forward" | "backward"; maximumTabs?: number } = {}
) {
  const { direction = "forward", maximumTabs = 240 } = options;
  const key = direction === "forward" ? "Tab" : "Shift+Tab";

  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press(key);
    if (await target.evaluate((element) => document.activeElement === element).catch(() => false)) {
      return;
    }
  }

  const label = await target.getAttribute("aria-label") ?? await target.innerText().catch(() => "unknown target");
  throw new Error(`Keyboard focus did not reach '${label}' after ${maximumTabs} ${key} presses.`);
}

async function useDemoCredentialsWithKeyboard(page: Page) {
  const demoCredentials = page.getByRole("button", { name: "Use demo credentials" });
  await tabUntilLocator(page, demoCredentials, { maximumTabs: 40 });
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Email or phone")).toHaveValue("demo@geoai.space");
  await expect(page.getByLabel("Password")).toHaveValue("111111");

  const openDemo = page.getByRole("button", { name: "Open demo" });
  await tabUntilLocator(page, openDemo, { maximumTabs: 20 });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL((url) => url.pathname === "/workspace");
}

test.describe("accessible critical screens and keyboard-only workspace journey", () => {
  test("opens a printable analysis without a pointer and reports serious Axe findings", async ({ page }) => {
    const evidence: AccessibilityResult[] = [];

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "GeoAI spatial decision intelligence" })).toBeVisible();
    await recordAccessibilityResult(page, "Landing hub", evidence);

    const demoLink = page.getByRole("link", { name: "View demo" }).last();
    await tabUntilLocator(page, demoLink, { maximumTabs: 40 });
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in or create account" })).toBeVisible();
    await recordAccessibilityResult(page, "Unified login", evidence);

    await useDemoCredentialsWithKeyboard(page);
    await expect(page.getByRole("link", { name: "Open demo profile" })).toHaveAttribute("data-authenticated", "true");
    await recordAccessibilityResult(page, "Workspace setup", evidence);

    const criteriaFirst = page.getByRole("button", { name: "Criteria-first" });
    await tabUntilLocator(page, criteriaFirst, { maximumTabs: 80 });
    await page.keyboard.press("Enter");
    await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");

    const findCandidates = page.getByRole("button", { name: "Find redevelopment zones" });
    await tabUntilLocator(page, findCandidates);
    await page.keyboard.press("Enter");

    const candidateSearchCard = page.getByText("Candidate Search", { exact: true }).locator("..").locator("..");
    const firstCandidate = candidateSearchCard.locator("button").first();
    await expect(firstCandidate).toBeVisible();
    await tabUntilLocator(page, firstCandidate, { direction: "backward", maximumTabs: 160 });
    await page.keyboard.press("Enter");

    const analyzeSelected = page.getByRole("button", { name: "Analyze Selected" });
    await expect(analyzeSelected).toBeEnabled();
    await tabUntilLocator(page, analyzeSelected);
    await page.keyboard.press("Enter");

    const dashboard = page.locator("section[data-dashboard-analysis-id]");
    await expect(dashboard).toBeVisible();
    await expect(dashboard.getByRole("heading", { level: 1 })).toBeVisible();
    await recordAccessibilityResult(page, "Analysis dashboard", evidence);

    const exportButton = dashboard.getByRole("button", { name: "Export", exact: true });
    await tabUntilLocator(page, exportButton);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL((url) => /^\/reports\/[^/]+\/print$/.test(url.pathname));
    const printButton = page.getByRole("button", { name: "Print / Save as PDF" });
    await expect(printButton).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "GeoAI Analysis Report" })).toBeVisible();
    await recordAccessibilityResult(page, "Printable analysis report", evidence);

    await tabUntilLocator(page, printButton, { maximumTabs: 40 });
    await expect(printButton).toBeFocused();
  });
});
