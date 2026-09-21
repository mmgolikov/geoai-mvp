import { test, expect, type Page } from "@playwright/test";
import { sprint10Selection, sprint10SelectionWithReceipt, sprint10AnalysisResponse } from "./helpers/sprint10-analysis-fixture";
import { dashboardCategoryRows, dashboardLayout } from "../../src/lib/prototype/point-to-object-dashboard-registry";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

const groups = [
  { group: "commercial", count: 8, sharePct: 40, nearestDistanceM: 25 },
  { group: "residential", count: 4, sharePct: 20, nearestDistanceM: 60 },
  { group: "education", count: 3, sharePct: 15, nearestDistanceM: 130 },
  { group: "healthcare", count: 2, sharePct: 10, nearestDistanceM: null },
  { group: "open_space", count: 2, sharePct: 10, nearestDistanceM: 90 },
  { group: "retail_daily_needs", count: 1, sharePct: 5, nearestDistanceM: 0 }
] as const;
const context = { ...sprint10Selection.resolvedObject.geoContext, sampleSize:20, groups:[...groups], mappedBuildingCount:12, mappedLevelsKnownCount:5 };

async function prepare(page: Page, variant: "available" | "unavailable" | "partial" = "available") {
  let posts = 0;
  await page.addInitScript(selection => sessionStorage.setItem("geoai:point-to-object:selection:v3", JSON.stringify(selection)), sprint10SelectionWithReceipt(sprint10Selection));
  await page.route("**/api/auth/session", route => route.fulfill({ json:{ isAuthenticated:false, user:null } }));
  await page.route("**/api/prototype/point-to-object/ai", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json:{mode:"ready", challenge:"A".repeat(43)} });
    posts++;
    const { role, scenario, depth, goal, perspective, horizon, question, locale, evidenceReceipt } = route.request().postDataJSON();
    const response = sprint10AnalysisResponse({ role, scenario, depth, goal, perspective, horizon, question, locale }, posts, evidenceReceipt?.evidencePackHash);
    const evidence = variant === "unavailable" ? { ...context, coverage:"unavailable", sampleSize:0, groups:[], mappedBuildingCount:0, mappedLevelsKnownCount:0, medianMappedLevels:null, nearestTransitM:null, nearestMajorRoadM:null } : { ...context, capReached:variant === "partial" };
    // The response parser, not a new product source, owns runtime validation.
    return route.fulfill({ json:{...response, content:{...response.content, geoContext:evidence}, subject:{...response.subject, geoContext:evidence}} });
  });
  return () => posts;
}

test.beforeEach(async ({page}, info) => installLoopbackBrowserHarness(page, info.project.use.browserName, info.project.use.baseURL));

test("QH05 registry reconciles exact counts/shares and never normalizes the subset", () => {
  const snapshot = JSON.stringify(context);
  const rows = dashboardCategoryRows(context as never);
  expect(rows.reduce((sum,row)=>sum+(row.count ?? 0),0)).toBe(20);
  expect(rows.reduce((sum,row)=>sum+(row.sharePct ?? 0),0)).toBe(100);
  expect(rows.find(row=>row.group === "retail_daily_needs")?.nearestDistanceM).toBe(0);
  expect(rows.find(row=>row.group === "healthcare")?.nearestDistanceM).toBeNull();
  expect(dashboardCategoryRows({...context, coverage:"unavailable"} as never)).toEqual([]);
  const inconsistent = dashboardCategoryRows({...context, groups:[{...groups[0],sharePct:99}]} as never);
  expect(inconsistent[0].sharePct).toBeNull();
  expect(inconsistent[0].count).toBe(8);
  expect(JSON.stringify(context)).toBe(snapshot);
  for (const goal of ["object_profile","development_screening","redevelopment","due_diligence"] as const) {
    expect(dashboardLayout({goal,depth:"quick"}).modules).toHaveLength(1);
    expect(dashboardLayout({goal,depth:"standard"}).modules).toHaveLength(6);
    expect(dashboardLayout({goal,depth:"deep"}).modules).toContain("challenge");
  }
  expect(new Set(["object_profile","development_screening","redevelopment","due_diligence"].map(goal=>dashboardLayout({goal:goal as "object_profile",depth:"standard"}).modules.join())).size).toBe(4);
});

test("QH05 submitted goal/depth change structure; local interactions never post AI", async ({page}) => {
  const posts = await prepare(page);
  await page.goto("/prototype/point-to-object/analysis");
  const dashboard = page.getByTestId("role-decision-cards");
  await expect(dashboard).toHaveAttribute("data-depth","standard");
  await dashboard.locator('[data-category="education"]').focus();
  await page.keyboard.press("Enter");
  await expect(dashboard.locator('[data-category="education"]')).toBeFocused();
  await expect(dashboard.locator('[data-category="education"]')).toHaveAttribute("aria-pressed","true");
  await expect(dashboard.locator('#dashboard-category-detail')).toContainText("130 m");
  await dashboard.getByText("Data table & method",{exact:true}).click();
  await expect(dashboard.getByRole("table")).toContainText("Education");
  expect(posts()).toBe(1);
  for (const goal of ["Object profile","Development screening","Redevelopment","Due diligence"]) {
    for (const depth of ["Quick","Standard","Deep"]) {
      const before = await dashboard.getAttribute("data-goal");
      await page.getByRole("button", {name:goal,exact:true}).click();
      await page.getByRole("button", {name:depth,exact:true}).click();
      await expect(dashboard).toHaveAttribute("data-goal",before!);
      const beforePosts = posts();
      await page.getByRole("button",{name:/^(Run focused analysis|Refresh analysis)$/}).click();
      await expect.poll(posts).toBe(beforePosts+1);
      await expect(dashboard).toHaveAttribute("data-depth",depth.toLowerCase());
      await expect(dashboard).toHaveAttribute("data-goal",goal.toLowerCase().replaceAll(" ","_"));
      await expect(dashboard.locator('[data-module]')).toHaveCount(depth === "Quick" ? 1 : depth === "Standard" ? 6 : goal === "Redevelopment" ? 7 : 8);
    }
  }
});

for (const locale of ["en","ru"] as const) for (const width of [390,834,1440]) {
  test(`QH05 visual ${locale} ${width}`, async ({page}, info) => {
    await page.setViewportSize({width,height:900});
    const posts = await prepare(page);
    await page.goto("/prototype/point-to-object/analysis");
    if (locale === "ru") await page.getByRole("button",{name:"ru",exact:true}).click();
    const dashboard = page.getByTestId("role-decision-cards");
    await expect(dashboard).toBeVisible();
    await dashboard.locator('[data-category="education"]').click();
    await dashboard.locator('[data-module="surroundings"]').screenshot({path:info.outputPath(`surroundings-${locale}-${width}.png`)});
    await dashboard.screenshot({path:info.outputPath(`dashboard-${locale}-${width}.png`)});
    const bounds = await dashboard.evaluate(element => ({width:element.getBoundingClientRect().width, scroll:element.scrollWidth, client:element.clientWidth, page:document.documentElement.scrollWidth, viewport:innerWidth, font:getComputedStyle(element).fontFamily}));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client+1);
    expect(bounds.page).toBeLessThanOrEqual(bounds.viewport+1);
    expect(bounds.font).toContain("Geist");
    for (const button of await dashboard.locator('[data-category]').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(posts()).toBe(1);
    await info.attach("layout",{body:JSON.stringify(bounds),contentType:"application/json"});
  });
}

for (const variant of ["unavailable","partial"] as const) test(`QH05 ${variant} remains explicit`, async ({page}, info) => {
  await prepare(page,variant);
  await page.goto("/prototype/point-to-object/analysis");
  const dashboard = page.getByTestId("role-decision-cards");
  await expect(dashboard).toBeVisible();
  if (variant === "unavailable") {
    await expect(dashboard.locator('[data-category]')).toHaveCount(0);
    await expect(dashboard.locator('dl').first()).toContainText("—");
  } else await expect(dashboard).toContainText("Sample cap reached");
  await dashboard.screenshot({path:info.outputPath(`dashboard-${variant}.png`)});
});
