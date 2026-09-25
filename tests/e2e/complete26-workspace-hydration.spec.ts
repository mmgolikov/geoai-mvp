import { expect, test, type Page } from "@playwright/test";
import { demoProjects } from "../../src/data/demo-projects";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

test.beforeEach(async ({ page, browserName }, info) => {
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
});

async function openWorkspace(page: Page, next = "/workspace") {
  await page.goto(`/login?next=${encodeURIComponent(next)}&intent=demo`);
  if (!(await page.waitForURL((url) => url.pathname === "/workspace", { timeout: 20000 }).then(() => true, () => false))) {
    await page.getByRole("button", { name: "Open demo access" }).click();
    await page.getByRole("button", { name: "Open demo", exact: true }).click();
  }
  await expect(page.locator("#active-project")).toBeVisible();
  if (next === "/workspace") {
    await expect(page.getByRole("button", { name: "Map-first", exact: true })).toHaveAttribute("aria-pressed", "true");
  }
}

for (const responseKind of ["success", "invalid-json"] as const) {
  test(`late project ${responseKind} preserves the chosen mode and completed dashboard`, async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let requested = false;
    let delivered = false;
    await page.route("**/api/projects", async (route) => {
      requested = true;
      await gate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: responseKind === "success"
          ? JSON.stringify({ items: demoProjects.map((project) => ({ ...project, name: `${project.name} refreshed` })), mode: "demo_seed" })
          : "{invalid-json"
      });
      delivered = true;
    });
    await openWorkspace(page);
    await expect.poll(() => requested).toBe(true);
    const criteriaFirst = page.getByRole("button", { name: "Criteria-first", exact: true });
    await criteriaFirst.click();
    await page.getByRole("button", { name: "Find redevelopment zones", exact: true }).click();
    const candidates = page.getByText("Candidate Search", { exact: true }).locator("..").locator("..");
    await candidates.locator("button").first().click();
    await page.getByRole("button", { name: "Analyze Selected", exact: true }).click();
    const dashboard = page.locator("section[data-dashboard-analysis-id]");
    await expect(dashboard).toBeVisible();
    const analysisId = await dashboard.getAttribute("data-dashboard-analysis-id");
    release();
    await expect.poll(() => delivered).toBe(true);
    if (responseKind === "success") {
      await expect(page.locator("#active-project option:checked")).toHaveText("Dubai Investment Screening refreshed");
    } else {
      // Let the response's rejected JSON promise and React render finish, not a timed sleep.
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }
    await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Map-first", exact: true })).toHaveAttribute("aria-pressed", "false");
    await page.mouse.move(1, 1);
    await expect(criteriaFirst).toHaveCSS("background-color", "rgb(8, 127, 140)");
    await expect(dashboard).toHaveAttribute("data-dashboard-analysis-id", analysisId!);
    await page.screenshot({ path: test.info().outputPath(`late-project-${responseKind}.png`), fullPage: true });
  });
}

test("late project metadata refresh cannot switch back from a user-selected project", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/projects", async (route) => {
    await gate;
    await route.fulfill({ json: { items: demoProjects.map((project) => ({ ...project, name: `${project.name} refreshed` })), mode: "demo_seed" } });
  });
  await openWorkspace(page);
  await page.locator("#active-project").selectOption("developer-land-pipeline-demo");
  const criteriaFirst = page.getByRole("button", { name: "Criteria-first", exact: true });
  await criteriaFirst.click();
  release();
  await expect(page.locator("#active-project option:checked")).toHaveText("Developer Land Pipeline refreshed");
  await expect(page.locator("#active-project")).toHaveValue("developer-land-pipeline-demo");
  await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");
});

for (const changeProject of [false, true]) {
  test(`remote projectId deep link resolves once; explicit project choice=${changeProject}`, async ({ page }) => {
    const remote = { ...demoProjects[1], id: "00000000-0000-4000-8000-000000000026", projectKey: "remote-hydration-fixture", name: "Remote metadata fixture" };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/projects", async (route) => {
      await gate;
      await route.fulfill({ json: { items: [...demoProjects, remote], mode: "demo_seed" } });
    });
    await openWorkspace(page, `/workspace?projectId=${remote.id}`);
    if (changeProject) {
      await page.locator("#active-project").selectOption("developer-land-pipeline-demo");
      await page.getByRole("button", { name: "Criteria-first", exact: true }).click();
    }
    release();
    await expect(page.locator(`#active-project option[value="${remote.projectKey}"]`)).toHaveCount(1);
    await expect(page.locator("#active-project")).toHaveValue(changeProject ? "developer-land-pipeline-demo" : remote.projectKey);
    if (changeProject) await expect(page.getByRole("button", { name: "Criteria-first", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
}
