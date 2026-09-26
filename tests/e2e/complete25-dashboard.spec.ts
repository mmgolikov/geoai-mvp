import { test, expect, type Page } from "@playwright/test";
import { sprint10Selection, sprint10SelectionWithReceipt, sprint10AnalysisResponse } from "./helpers/sprint10-analysis-fixture";
import { dashboardCategoryRows, dashboardHeroMetrics, dashboardLayout } from "../../src/lib/prototype/point-to-object-dashboard-registry";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

// Explicit synthetic rendering fixtures: no provider or paid AI acceptance.
const context = { ...sprint10Selection.resolvedObject.geoContext, sampleSize: 20, mappedBuildingCount: 12, mappedLevelsKnownCount: 5,
  groups: [
    { group: "commercial", count: 8, sharePct: 40, nearestDistanceM: 25 },
    { group: "residential", count: 4, sharePct: 20, nearestDistanceM: 60 },
    { group: "education", count: 3, sharePct: 15, nearestDistanceM: 130 },
    { group: "healthcare", count: 2, sharePct: 10, nearestDistanceM: null },
    { group: "open_space", count: 2, sharePct: 10, nearestDistanceM: 90 },
    { group: "retail_daily_needs", count: 1, sharePct: 5, nearestDistanceM: 0 }
  ] };
const goals = ["object_profile", "development_screening", "redevelopment", "due_diligence", "custom"] as const;
const names = { object_profile: "Object profile", development_screening: "Development screening", redevelopment: "Redevelopment", due_diligence: "Due diligence" };

async function prepare(page: Page) {
  let posts = 0;
  await page.addInitScript(selection => sessionStorage.setItem("geoai:point-to-object:selection:v3", JSON.stringify(selection)), sprint10SelectionWithReceipt(sprint10Selection));
  await page.route("**/api/auth/session", route => route.fulfill({ json: { isAuthenticated: false, user: null } }));
  await page.route("**/api/prototype/point-to-object/ai", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { mode: "ready", challenge: "A".repeat(43) } });
    posts++;
    const { role, scenario, depth, goal, perspective, horizon, question, locale, evidenceReceipt } = route.request().postDataJSON();
    const response = sprint10AnalysisResponse({ role, scenario, depth, goal, perspective, horizon, question, locale }, posts,
      evidenceReceipt?.evidencePackHash, "POINT_OBJECT_AI_PROMPT_V13_2026_09_26");
    return route.fulfill({ json: { ...response, content: { ...response.content, geoContext: context }, subject: { ...response.subject, geoContext: context } } });
  });
  return () => posts;
}

test.beforeEach(async ({ page }, info) => installLoopbackBrowserHarness(page, info.project.use.browserName, info.project.use.baseURL));

test("COMPLETE25 scenario measures preserve source grain, nulls and total reconciliation", () => {
  const original = JSON.stringify(context);
  const keys = goals.map(goal => dashboardHeroMetrics({ goal, scenario: "b2b_development_site_screening" } as never, context as never).map(metric => metric.id).join());
  expect(new Set(keys).size).toBe(5);
  expect(dashboardHeroMetrics({ goal: "redevelopment", scenario: "unspecified" }, context as never).find(metric => metric.id === "levelCoverage")?.value).toBe("5/12");
  expect(dashboardHeroMetrics({ goal: "due_diligence", scenario: "unspecified" }, { ...context, coverage: "unavailable" } as never).every(metric => metric.value === null)).toBe(true);
  expect(dashboardHeroMetrics({ goal: "development_screening", scenario: "unspecified" }, { ...context, nearestTransitM: 0 } as never).find(metric => metric.id === "transit")?.value).toBe(0);
  expect(dashboardHeroMetrics({ goal: "redevelopment", scenario: "unspecified" }, { ...context, mappedLevelsKnownCount: 99 } as never).find(metric => metric.id === "levelCoverage")?.value).toBeNull();
  const living = dashboardCategoryRows(context as never, "b2c_residential_context");
  expect(living[0].group).toBe("education");
  expect(living[0].sharePct).toBe(15);
  const overlapping = dashboardCategoryRows({ ...context, sampleSize: 10, groups: [{ group: "commercial", count: 8, sharePct: 80, nearestDistanceM: 10 }, { group: "education", count: 8, sharePct: 80, nearestDistanceM: 20 }] } as never);
  expect(overlapping.every(row => row.sharePct === null)).toBe(true);
  expect(JSON.stringify(context)).toBe(original);
  for (const goal of goals) {
    expect(dashboardLayout({ goal, depth: "quick" }).modules).toHaveLength(1);
    expect(dashboardLayout({ goal, depth: "deep" }).modules).toContain("challenge");
    for (const depth of ["quick", "standard", "deep"] as const) {
      const layout = dashboardLayout({ goal, depth });
      let halfRow = false;
      for (const module of layout.modules) {
        if (layout.wideModules.includes(module)) expect(halfRow).toBe(false);
        else halfRow = !halfRow;
      }
      expect(halfRow).toBe(false);
    }
  }
});

test("COMPLETE25 completed goals/depth and local evidence drilldowns remain bound to saved result", async ({ page }, info) => {
  const posts = await prepare(page);
  await page.goto("/prototype/point-to-object/analysis");
  const dashboard = page.getByTestId("role-decision-cards");
  await expect(dashboard).toHaveAttribute("data-depth", "standard");
  await dashboard.getByTestId("dashboard-evidence-inspection").locator("summary").first().click();
  const filter = dashboard.locator('[data-evidence-filter="derived"]');
  await filter.focus();
  await page.keyboard.press("Enter");
  await expect(filter).toBeFocused();
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await expect(dashboard.locator('[data-evidence-class="observed"]')).toHaveCount(0);
  await expect(dashboard.locator('[data-evidence-class="derived"]')).toHaveCount(2);
  expect(posts()).toBe(1);
  for (const goal of goals) for (const depth of ["Quick", "Standard", "Deep"]) {
    const previousGoal = await dashboard.getAttribute("data-goal");
    if (goal === "custom") await page.locator("#analysis-follow-up").fill("Which mapped features support the retained-use hypothesis?");
    else await page.getByRole("button", { name: names[goal], exact: true }).click();
    await page.getByRole("button", { name: depth, exact: true }).click();
    await expect(dashboard).toHaveAttribute("data-goal", previousGoal!);
    const before = posts();
    await page.getByRole("button", { name: /^(Run focused analysis|Refresh analysis)$/ }).click();
    await expect.poll(posts).toBe(before + 1);
    await expect(dashboard).toHaveAttribute("data-goal", goal);
    await expect(dashboard).toHaveAttribute("data-depth", depth.toLowerCase());
    const expected = dashboardHeroMetrics({ goal, scenario: "unspecified" }, context as never).map(metric => metric.id);
    expect(await dashboard.locator("[data-metric]").evaluateAll(elements => elements.map(element => element.getAttribute("data-metric")))).toEqual(expected);
    if (goal === "custom") await expect(dashboard.getByTestId("dashboard-question-result")).toContainText("Partial answer");
    if (depth === "Standard") await dashboard.screenshot({ path: info.outputPath(`complete25-${goal}-standard.png`) });
  }
  const completedCalls = posts();
  await page.reload();
  await expect(dashboard).toHaveAttribute("data-goal", "custom");
  await expect(dashboard).toHaveAttribute("data-depth", "deep");
  expect(posts()).toBe(completedCalls);
});

for (const locale of ["en", "ru"] as const) for (const width of [390, 834, 1440]) {
  test(`COMPLETE25 dashboard visual fixture ${locale} ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const posts = await prepare(page);
    await page.goto("/prototype/point-to-object/analysis");
    const dashboard = page.getByTestId("role-decision-cards");
    await expect(dashboard).toBeVisible();
    if (locale === "ru") await page.getByRole("button", { name: "ru", exact: true }).click();
    await dashboard.screenshot({ path: info.outputPath(`complete25-dashboard-${locale}-${width}.png`) });
    const bounds = await dashboard.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth, page: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
    expect(bounds.page).toBeLessThanOrEqual(bounds.viewport + 1);
    await dashboard.getByTestId("dashboard-evidence-inspection").locator("summary").first().click();
    for (const button of await dashboard.locator('[data-evidence-filter]').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(posts()).toBe(1);
    await info.attach("fixture-layout", { body: JSON.stringify(bounds), contentType: "application/json" });
  });
}
