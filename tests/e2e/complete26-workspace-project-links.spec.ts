import { expect, test, type Page } from "@playwright/test";
import { demoProjects } from "../../src/data/demo-projects";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

test.use({ ignoreHTTPSErrors: true, serviceWorkers: "block" });

test.beforeEach(async ({ page, browserName }, info) => {
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
});

async function openDemoWorkspace(page: Page) {
  await page.goto("/login?next=%2Fworkspace&intent=demo");
  if (!(await page.waitForURL((url) => url.pathname === "/workspace", { timeout: 20_000 }).then(() => true, () => false))) {
    await page.getByRole("button", { name: "Open demo access" }).click();
    await page.getByRole("button", { name: "Open demo", exact: true }).click();
  }
  await expect(page.locator("#active-project")).toBeVisible();
}

test("local projectId deep link takes precedence over another stored active project", async ({ page }) => {
  await page.route("**/api/projects", (route) => route.fulfill({ json: { items: demoProjects, mode: "demo_seed" } }));
  await openDemoWorkspace(page);
  const localProject = {
    ...demoProjects[1],
    id: null,
    projectKey: "local-project-link-fixture",
    name: "Local project link fixture",
    metadata: { ...demoProjects[1].metadata, createdLocally: true }
  };
  await page.evaluate(({ project, otherKey }) => {
    localStorage.setItem("geoai-public-demo-v2:local-projects-v1", JSON.stringify([project]));
    localStorage.setItem("geoai-public-demo-v2:active-project-key-v1", otherKey);
  }, { project: localProject, otherKey: demoProjects[0].projectKey });

  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/projects", async (route) => {
    await gate;
    await route.fulfill({ json: {
      items: demoProjects.map((project) => ({ ...project, name: `${project.name} refreshed` })),
      mode: "demo_seed"
    } });
  });
  await page.goto(`/workspace?projectId=${encodeURIComponent(localProject.projectKey)}`);
  const selector = page.locator("#active-project");
  await expect(selector.locator(`option[value="${localProject.projectKey}"]`)).toHaveCount(1);
  // Local identity must resolve before remote metadata is released.
  await expect.soft(selector).toHaveValue(localProject.projectKey);
  release();
  await expect(selector.locator(`option[value="${demoProjects[0].projectKey}"]`)).toHaveText(`${demoProjects[0].name} refreshed`);
  await expect(selector).toHaveValue(localProject.projectKey);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("geoai-public-demo-v2:active-project-key-v1"))).toBe(localProject.projectKey);
});

test("pending remote projectId cannot override an explicit criteria-first choice", async ({ page }) => {
  await page.route("**/api/projects", (route) => route.fulfill({ json: { items: demoProjects, mode: "demo_seed" } }));
  await openDemoWorkspace(page);
  const remote = {
    ...demoProjects[1], id: "00000000-0000-4000-8000-000000000027",
    projectKey: "remote-project-link-fixture", name: "Remote project link fixture"
  };
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/projects", async (route) => {
    await gate;
    await route.fulfill({ json: { items: [...demoProjects, remote], mode: "demo_seed" } });
  });
  await page.goto(`/workspace?projectId=${remote.id}`);
  const selector = page.locator("#active-project");
  await expect(selector).toHaveValue(demoProjects[0].projectKey);
  const criteriaFirst = page.getByRole("button", { name: "Criteria-first", exact: true });
  await criteriaFirst.click();
  await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");
  release();
  // The option proves server metadata was consumed before preservation checks.
  await expect(selector.locator(`option[value="${remote.projectKey}"]`)).toHaveCount(1);
  await expect(selector).toHaveValue(demoProjects[0].projectKey);
  await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");
});

test("pending remote projectId cannot override a completed search without changing defaults", async ({ page }) => {
  await page.route("**/api/projects", (route) => route.fulfill({ json: { items: demoProjects, mode: "demo_seed" } }));
  await openDemoWorkspace(page);
  const remote = {
    ...demoProjects[1], id: "00000000-0000-4000-8000-000000000028",
    projectKey: "remote-default-search-fixture", name: "Remote default search fixture"
  };
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/projects", async (route) => {
    await gate;
    await route.fulfill({ json: { items: [...demoProjects, remote], mode: "demo_seed" } });
  });
  await page.goto(`/workspace?projectId=${remote.id}`);
  const selector = page.locator("#active-project");
  const criteriaFirst = page.getByRole("button", { name: "Criteria-first", exact: true });
  await expect(selector).toHaveValue(demoProjects[0].projectKey);
  // The fallback project's existing defaults already permit this action. Do not
  // click a mode, filter, project, query or candidate: those increment revision
  // independently and would hide the missing search-action protection.
  await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Find redevelopment zones", exact: true }).click();
  const candidates = page.getByText("Candidate Search", { exact: true }).locator("..").locator("..");
  await expect(candidates.locator("button").first()).toBeVisible();
  const candidateLabels = await candidates.locator("button").allTextContents();
  expect(candidateLabels.length).toBeGreaterThan(0);
  release();
  // Prove the late metadata was consumed, not skipped or blocked by the test.
  await expect(selector.locator(`option[value="${remote.projectKey}"]`)).toHaveCount(1);
  await expect.soft(selector).toHaveValue(demoProjects[0].projectKey);
  await expect.soft(criteriaFirst).toHaveAttribute("aria-pressed", "true");
  await expect(candidates.locator("button")).toHaveText(candidateLabels);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("geoai-public-demo-v2:active-project-key-v1"))).toBe(demoProjects[0].projectKey);
});
