import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

type VisualEvidence = {
  height: number;
  label: string;
  path: string;
  route: string;
  sha256: string;
  width: number;
};

const visualDirectory = path.join(process.cwd(), "artifacts", "mobile-visual-evidence");
const visualManifest = path.join(visualDirectory, "manifest.json");
const visualEvidence: VisualEvidence[] = [];

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

async function expectNoElementOverflow(locator: Locator, label: string) {
  const metrics = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth
  }));

  expect(metrics.scrollWidth, `${label} must not overflow horizontally`).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

async function expectMinimumTargetSize(label: string, locator: Locator, minimum = 40) {
  await expect(locator, `${label} must be visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} must have a rendered box`).not.toBeNull();
  expect(box?.width ?? 0, `${label} width must be at least ${minimum}px`).toBeGreaterThanOrEqual(minimum);
  expect(box?.height ?? 0, `${label} height must be at least ${minimum}px`).toBeGreaterThanOrEqual(minimum);
}

async function captureVisualEvidence(page: Page, label: string, fileName: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await fs.mkdir(visualDirectory, { recursive: true });
  const filePath = path.join(visualDirectory, fileName);
  const image = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    path: filePath
  });
  const viewport = page.viewportSize();
  visualEvidence.push({
    label,
    path: path.relative(process.cwd(), filePath),
    route: `${new URL(page.url()).pathname}${new URL(page.url()).search}`,
    sha256: createHash("sha256").update(image).digest("hex"),
    width: viewport?.width ?? 0,
    height: viewport?.height ?? 0
  });
  await fs.writeFile(visualManifest, `${JSON.stringify(visualEvidence, null, 2)}\n`, "utf8");
  console.log(`[visual] ${label}: ${fileName}`);
}

async function signInDemo(page: Page, nextPath: "/projects" | "/explore") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}&intent=demo`);
  await page.getByRole("button", { name: "Use demo credentials" }).click();
  await expect(page.getByLabel("Email or phone")).toHaveValue("demo@geoai.space");
  await expect(page.getByLabel("Password")).toHaveValue("111111");
  await page.getByRole("button", { name: "Open demo" }).click();
  await expect(page).toHaveURL((url) => url.pathname === nextPath);
  await expect(page.getByRole("link", { name: "Open demo profile" })).toHaveAttribute("data-authenticated", "true");
}

test.describe.configure({ mode: "serial" });

test.describe("mobile product navigation, targets and visual evidence", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeAll(async () => {
    visualEvidence.length = 0;
    await fs.rm(visualDirectory, { force: true, recursive: true });
  });

  test("creates, restores and opens a project on mobile", async ({ page }) => {
    const projectName = "Mobile product pilot";
    await signInDemo(page, "/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Project Hub" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const controls: Array<[string, Locator]> = [
      ["GeoAI home", page.locator('header a[href="/"]').first()],
      ["Authenticated profile", page.getByRole("link", { name: "Open demo profile" })],
      ["B2B segment", page.getByRole("button", { name: "B2B", exact: true })],
      ["B2C segment", page.getByRole("button", { name: "B2C", exact: true })],
      ["Project selector", page.locator("#project-dashboard-selector")],
      ["Open workspace", page.getByRole("link", { name: "Open workspace", exact: true }).first()],
      ["Create project", page.getByRole("button", { name: "Create project" })]
    ];
    for (const [label, locator] of controls) await expectMinimumTargetSize(label, locator);

    await page.getByRole("button", { name: "Create project" }).click();
    const projectNameInput = page.getByRole("textbox", { name: "Project name" });
    const marketInput = page.getByRole("textbox", { name: "Location / market" });
    const audienceSelect = page.getByRole("combobox", { name: "Audience" });
    const roleSelect = page.getByRole("combobox", { name: "Role" });
    const createButton = page.getByRole("button", { name: "Create", exact: true });
    for (const [label, locator] of [
      ["Project name", projectNameInput],
      ["Audience", audienceSelect],
      ["Role", roleSelect],
      ["Location / market", marketInput],
      ["Create", createButton]
    ] as Array<[string, Locator]>) await expectMinimumTargetSize(label, locator);

    await projectNameInput.fill(projectName);
    await marketInput.fill("Sharjah / UAE");
    await createButton.click();
    await expect(page.locator("#project-dashboard-selector option:checked")).toHaveText(projectName);

    await page.reload();
    await expect(page.locator("#project-dashboard-selector option:checked")).toHaveText(projectName);
    await expectNoHorizontalOverflow(page);
    await captureVisualEvidence(page, "Mobile project hub", "mobile-project-hub.png");

    await page.getByRole("link", { name: "Open workspace", exact: true }).first().click();
    await expect(page).toHaveURL((url) => url.pathname === "/workspace" && url.searchParams.has("projectId"));
    await expect(page.locator("#active-project option:checked")).toHaveText(projectName);
    await expectNoHorizontalOverflow(page);
    await captureVisualEvidence(page, "Mobile project workspace", "mobile-project-workspace.png");
  });

  test("compares and exports a criteria-first shortlist on mobile", async ({ page }) => {
    await signInDemo(page, "/explore");
    await expectNoHorizontalOverflow(page);

    const criteriaFirst = page.getByRole("button", { name: "Criteria-first" });
    for (const [label, locator] of [
      ["Authenticated profile", page.getByRole("link", { name: "Open demo profile" })],
      ["B2B audience", page.getByRole("button", { name: "B2B", exact: true })],
      ["B2C audience", page.getByRole("button", { name: "B2C", exact: true })],
      ["Active project", page.locator("#active-project")],
      ["Role", page.getByLabel("Role")],
      ["Scenario", page.getByLabel("Scenario")],
      ["Open map", page.getByRole("button", { name: "Open map" })],
      ["Criteria-first", criteriaFirst]
    ] as Array<[string, Locator]>) await expectMinimumTargetSize(label, locator);
    await captureVisualEvidence(page, "Mobile explore setup", "mobile-explore-setup.png");

    await criteriaFirst.click();
    await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");
    const findCandidates = page.getByRole("button", { name: "Find redevelopment zones" });
    await expectMinimumTargetSize("Find redevelopment zones", findCandidates);
    await findCandidates.click();

    const compareCandidates = page.getByRole("button", { name: "Compare Candidates" });
    await expect(compareCandidates).toBeEnabled();
    await expectMinimumTargetSize("Compare Candidates", compareCandidates);
    await compareCandidates.click();

    const comparisonDashboard = page.locator("section[data-dashboard-comparison-id]");
    await expect(comparisonDashboard.getByRole("heading", { level: 1, name: "Candidate Comparison" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoElementOverflow(comparisonDashboard, "Candidate comparison dashboard");
    const comparisonTable = comparisonDashboard.getByRole("region", { name: "Comparison table" });
    await expect(comparisonTable).toBeVisible();
    const comparisonTableMetrics = await comparisonTable.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    }));
    expect(comparisonTableMetrics.scrollWidth).toBeGreaterThan(comparisonTableMetrics.clientWidth);
    const exportButton = comparisonDashboard.getByRole("button", { name: "Export", exact: true });
    const backToMap = comparisonDashboard.getByRole("button", { name: "Back to map" });
    await expectMinimumTargetSize("Export", exportButton);
    await expectMinimumTargetSize("Back to map", backToMap);
    await captureVisualEvidence(page, "Mobile comparison dashboard", "mobile-comparison-dashboard.png");

    await exportButton.click();
    await expect(page).toHaveURL((url) => /^\/reports\/[^/]+\/print$/.test(url.pathname));
    const printButton = page.getByRole("button", { name: "Print / Save as PDF" });
    await expectMinimumTargetSize("Print / Save as PDF", printButton);
    await expectNoHorizontalOverflow(page);
    await captureVisualEvidence(page, "Mobile printable comparison", "mobile-comparison-report.png");
  });
});
