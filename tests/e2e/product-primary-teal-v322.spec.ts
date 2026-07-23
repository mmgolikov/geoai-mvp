import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const productPrimary = "rgb(8, 127, 140)";
const brandBlue = "rgb(6, 79, 207)";
const evidenceDirectory = path.join(process.cwd(), "artifacts", "product-system-v322");

async function signInDemo(page: Page, next = "/workspace") {
  await page.goto(`/login?next=${encodeURIComponent(next)}&intent=demo`);
  const redirected = await page.waitForURL((url) => url.pathname === next, { timeout: 3000 }).then(() => true, () => false);
  if (redirected) return;
  await page.getByRole("button", { name: "Use demo credentials" }).click();
  await page.getByRole("button", { name: "Open demo" }).click();
  await expect(page).toHaveURL((url) => url.pathname === next);
}

async function expectProductPrimary(locator: Locator, label: string) {
  await expect(locator, `${label} must be visible`).toBeVisible();
  const background = await locator.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(background, `${label} must use Product-primary teal`).toBe(productPrimary);
  expect(background, `${label} must not revert to brand blue`).not.toBe(brandBlue);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  expect(overflow.body).toBeLessThanOrEqual(1);
  expect(overflow.document).toBeLessThanOrEqual(1);
}

test.beforeAll(async () => {
  await fs.mkdir(evidenceDirectory, { recursive: true });
});

test("commercial cockpit correction keeps label lines separated and selected state teal", async ({ page }) => {
  const css = await fs.readFile(path.join(process.cwd(), "app", "product-system-v322-correction.css"), "utf8");
  const encodedSvgs = [...css.matchAll(/base64,([^"\)]+)/g)].map((match) => match[1]);
  expect(encodedSvgs.length).toBeGreaterThanOrEqual(2);

  const desktopSvg = Buffer.from(encodedSvgs[0], "base64").toString("utf8");
  const responsiveSvg = Buffer.from(encodedSvgs[1], "base64").toString("utf8");
  expect(desktopSvg).toContain("ILLUSTRATIVE 01");
  expect(desktopSvg).toContain("Business Bay North");
  expect(desktopSvg).toContain("78 · Highest current score");
  expect(desktopSvg).not.toContain("ILLUSTRATIVE CANDIDATE 01");
  expect(desktopSvg).toContain('fill="#087f8c"');
  expect(responsiveSvg).toContain("B2B · Development director");
  expect(responsiveSvg).toContain('fill="#e5fafa"');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(async () => document.fonts.ready);
  const cockpit = page.locator('[data-landing-cockpit-authority="commercial-v1.8"]');
  await expect(cockpit).toBeVisible();
  const overlay = await cockpit.evaluate((element) => ({
    backgroundImage: getComputedStyle(element, "::after").backgroundImage,
    pointerEvents: getComputedStyle(element, "::after").pointerEvents,
    zIndex: getComputedStyle(element, "::after").zIndex
  }));
  expect(overlay.backgroundImage).toContain("data:image/svg+xml;base64");
  expect(overlay.pointerEvents).toBe("none");
  expect(Number(overlay.zIndex)).toBeGreaterThanOrEqual(2);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: path.join(evidenceDirectory, "landing-cockpit-desktop.png"),
    fullPage: true,
    animations: "disabled",
    caret: "hide"
  });
});

test("Product primary and selected controls remain teal from Workspace through analysis", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInDemo(page);

  const selectedAudience = page.getByRole("button", { name: "B2B", exact: true }).first();
  const mapFirst = page.getByRole("button", { name: "Map-first", exact: true });
  await expectProductPrimary(selectedAudience, "Workspace selected B2B");
  await expectProductPrimary(mapFirst, "Workspace selected Map-first");

  const criteriaFirst = page.getByRole("button", { name: "Criteria-first", exact: true });
  await criteriaFirst.click();
  await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");
  await expectProductPrimary(criteriaFirst, "Workspace selected Criteria-first");

  const findZones = page.getByRole("button", { name: "Find redevelopment zones", exact: true });
  await expectProductPrimary(findZones, "Workspace candidate-search action");
  await findZones.click();

  const candidateSearchCard = page.getByText("Candidate Search", { exact: true }).locator("..").locator("..");
  const firstCandidate = candidateSearchCard.locator("button").first();
  await expect(firstCandidate).toBeVisible();
  await firstCandidate.click();

  const analyzeSelected = page.getByRole("button", { name: "Analyze Selected", exact: true });
  await expectProductPrimary(analyzeSelected, "Analyze Selected action");
  await analyzeSelected.click();

  const dashboard = page.locator("section[data-dashboard-analysis-id]");
  await expect(dashboard).toBeVisible();
  await expectProductPrimary(page.getByRole("button", { name: "B2B", exact: true }).first(), "Analysis selected B2B");
  await expectProductPrimary(page.getByRole("button", { name: "Criteria-first", exact: true }), "Analysis selected mode");
  await expectProductPrimary(dashboard.getByRole("button", { name: "Export", exact: true }), "Analysis Export action");
  await expectProductPrimary(page.getByRole("button", { name: "Export Report", exact: true }), "Analysis Export Report action");
  await expectNoHorizontalOverflow(page);

  await page.screenshot({
    path: path.join(evidenceDirectory, "workspace-analysis-product-primary.png"),
    fullPage: true,
    animations: "disabled",
    caret: "hide"
  });
});

test("Projects, Profile and report actions use the same Product-primary teal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInDemo(page, "/projects");

  await expectProductPrimary(page.getByRole("button", { name: "B2B", exact: true }).first(), "Projects selected B2B");
  await expectProductPrimary(page.getByRole("link", { name: "Open workspace", exact: true }).first(), "Projects Open workspace action");
  await expectProductPrimary(page.getByRole("button", { name: "Create project", exact: true }), "Projects Create project action");

  await page.goto("/profile");
  const profileAudience = page.getByRole("group", { name: "Default audience" });
  const b2b = profileAudience.getByRole("button", { name: "B2B", exact: true });
  const b2c = profileAudience.getByRole("button", { name: "B2C", exact: true });
  await expectProductPrimary(b2b, "Profile selected B2B");
  await b2c.click();
  await expect(b2c).toHaveAttribute("aria-pressed", "true");
  await expectProductPrimary(b2c, "Profile selected B2C");
  await expectProductPrimary(page.getByRole("link", { name: "Open workspace", exact: true }), "Profile Open workspace action");
  await expectProductPrimary(page.getByRole("button", { name: "Save profile", exact: true }), "Profile Save profile action");

  await page.goto("/reports/seeded-analysis-dubai-marina-report/print");
  await expectProductPrimary(page.getByRole("button", { name: "Print / Save as PDF", exact: true }), "Report Print / Save as PDF action");
  await expectNoHorizontalOverflow(page);

  await page.screenshot({
    path: path.join(evidenceDirectory, "profile-product-primary.png"),
    fullPage: true,
    animations: "disabled",
    caret: "hide"
  });
});
