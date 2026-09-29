import { expect, test, type Page } from "@playwright/test";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";
import { sessionMissingFixture } from "./helpers/auth-persona";
import { sprint10AnalysisResponse, sprint10Selection } from "./helpers/sprint10-analysis-fixture";
import { CLIMATE_ATTRIBUTION, CLIMATE_ENDPOINT, CLIMATE_LIMIT, CLIMATE_REFERENCE, CLIMATE_VERSION } from "../../src/lib/prototype/point-to-object-climate-contract";

test.beforeEach(async ({ page, browserName }, testInfo) => {
  await installLoopbackBrowserHarness(page, browserName, testInfo.project.use.baseURL);
});

const selectedPolygon = {
  type: "Polygon" as const,
  coordinates: [[[55.27, 25.2], [55.2704, 25.2], [55.2704, 25.2003], [55.27, 25.2003], [55.27, 25.2]]]
};
const completePolygon = {
  type: "Polygon" as const,
  coordinates: [[[55.27, 25.2], [55.2705, 25.2], [55.2705, 25.20043], [55.27, 25.20043], [55.27, 25.2]]]
};

const exactSelection = {
  ...sprint10Selection,
  object: { ...sprint10Selection.object, name: "Selected building", geometry: selectedPolygon,
    geometryProvenance: "rendered_tile_polygon_member" as const, renderHeightM: 250 },
  resolvedObject: { ...sprint10Selection.resolvedObject, name: "Selected building",
    tags: { "tag.building": "yes", "tag.building:levels": "9", "tag.height": "200" },
    metrics: { ...sprint10Selection.resolvedObject.metrics, footprintAreaSqM: 2_400 },
    displayGeometry: completePolygon, geometryProvenance: "confirmed_complete_footprint" as const }
};

const nearestSelection = {
  ...exactSelection,
  object: { ...exactSelection.object, sourceFeatureId: "18290731", renderHeightM: 250 },
  resolvedObject: { ...sprint10Selection.resolvedObject, name: "Ernst Biergarten", address: "Ernst Biergarten, Dubai", sourceFeatureId: "node/90001",
    coordinateAssociation: "reverse_nearest_indexed_object_not_point_in_polygon" as const,
    resultCentroidDistanceM: 60,
    tags: { "tag.building": "bar", "tag.height": "44" },
    metrics: { ...sprint10Selection.resolvedObject.metrics, footprintAreaSqM: 9_000 } }
};

const containingSelection = {
  ...exactSelection,
  object: { ...exactSelection.object, name: null, featureClass: "building", sourceFeatureId: "18290731", renderHeightM: 355 },
  resolvedObject: { ...sprint10Selection.resolvedObject, name: "Jumeirah Emirates Towers Hotel",
    address: "Sheikh Zayed Road, Dubai", featureClass: "tourism:hotel", sourceFeatureId: "way/91011",
    coordinateAssociation: "open_map_geometry_contains_point" as const, resultCentroidDistanceM: 20,
    tags: { "tag.building": "hotel", "tag.tourism": "hotel", "tag.height": "355", "tag.start_date": "2000" },
    metrics: { ...sprint10Selection.resolvedObject.metrics, footprintAreaSqM: 8_000 } }
};

async function openDemoAnalysis(page: Page, selection: unknown) {
  const calls: string[] = [];
  await page.addInitScript((value) => sessionStorage.setItem("geoai:point-to-object:selection:v3", JSON.stringify(value)), selection);
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/prototype/point-to-object/ai" || path === "/api/prototype/point-to-object/context") {
      calls.push(`${request.method()} ${path}`);
    }
  });
  await page.route("**/api/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionMissingFixture) }));
  await page.route("**/api/auth/logout", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  // Fail closed: these routes must never reach a provider during the overview check.
  await page.route("**/api/prototype/point-to-object/ai", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"mode":"unavailable"}' }));
  await page.route("**/api/prototype/point-to-object/context", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"mode":"unavailable"}' }));

  await page.goto("/login?next=%2Fworkspace&intent=demo");
  const demoAccess = page.getByRole("button", { name: "Open demo access" });
  await expect.poll(async () => new URL(page.url()).pathname === "/workspace" || await demoAccess.isVisible().catch(() => false)).toBe(true);
  if (new URL(page.url()).pathname !== "/workspace") {
    await demoAccess.click();
    await page.getByRole("button", { name: "Open demo", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/workspace");
  }
  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("express-overview")).toBeVisible();
  await expect(page.getByTestId("analysis-setup")).toBeVisible();
  return calls;
}

for (const variant of [
  { name: "exact EN desktop", locale: "en", width: 1440 },
  { name: "exact RU mobile", locale: "ru", width: 390 }
] as const) {
  test(`initial overview stays useful and unpaid: ${variant.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: variant.width, height: 900 });
    const calls = await openDemoAnalysis(page, exactSelection);
    if (variant.locale === "ru") await page.getByRole("button", { name: "ru", exact: true }).click();
    const overview = page.getByTestId("express-overview");
    await expect(overview).toContainText(variant.locale === "ru" ? "Что известно о выбранном объекте" : "What we know about this selection");
    await expect(page.getByTestId("express-form")).toContainText(variant.locale === "ru" ? "2 400 м²" : "2,400 m²");
    await expect(page.getByTestId("express-height")).toContainText(variant.locale === "ru" ? "200 м" : "200 m");
    await expect(page.getByTestId("express-context")).toContainText(variant.locale === "ru" ? "4 объектов" : "4 features");
    await expect(page.getByTestId("express-context")).toContainText(variant.locale === "ru" ? "4 деловых" : "4 commercial");
    await expect(page.getByTestId("express-context")).toContainText(variant.locale === "ru" ? "магистраль" : "major road");
    await expect(page.getByTestId("express-unavailable")).toContainText(variant.locale === "ru" ? "спрос, стоимость" : "demand, costs");
    await expect(page.getByRole("button", { name: variant.locale === "ru" ? "Запустить целевой анализ" : "Run focused analysis", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`express-exact-${variant.locale}-${variant.width}.png`), fullPage: true });
    await page.reload();
    await expect(overview).toBeVisible();
    await page.waitForTimeout(200);
    expect(calls).toEqual([]);
  });
}

for (const variant of [
  { name: "nearest EN mobile", locale: "en", width: 390 },
  { name: "nearest RU desktop", locale: "ru", width: 1440 }
] as const) {
  test(`nearby POI cannot lend the selected building attributes: ${variant.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: variant.width, height: 900 });
    const calls = await openDemoAnalysis(page, nearestSelection);
    if (variant.locale === "ru") await page.getByRole("button", { name: "ru", exact: true }).click();
    const overview = page.getByTestId("express-overview");
    await expect(page.getByTestId("express-object")).toContainText("Selected building");
    await expect(page.getByTestId("express-summary")).toContainText(variant.locale === "ru" ? "Ближайшие заведения" : "Nearby venues");
    await expect(page.getByTestId("express-height")).toHaveText(variant.locale === "ru" ? "Высота неизвестна" : "Height unknown");
    await expect(page.getByTestId("express-object")).not.toContainText("Ernst Biergarten");
    await expect(page.getByTestId("express-associated-record")).toContainText("Ernst Biergarten");
    await expect(page.getByTestId("express-associated-record")).toContainText(variant.locale === "ru" ? "Ближайшая запись карты" : "Nearby map record");
    await expect(page.getByTestId("express-associated-record")).toContainText(variant.locale === "ru" ? "Высота · тег OSM: 44" : "Height · OSM tag: 44");
    await expect(overview).not.toContainText("9,000");
    await expect(overview).not.toContainText("44 m");
    await expect(overview).not.toContainText("250 m");
    await expect(page.getByTestId("express-form")).toContainText(variant.locale === "ru" ? "Только выбранный контур" : "Selected map shape only");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`express-nearest-${variant.locale}-${variant.width}.png`), fullPage: true });
    await page.reload();
    await expect(overview).toBeVisible();
    await page.waitForTimeout(200);
    expect(calls).toEqual([]);
  });
}

for (const variant of [
  { locale: "en", width: 390 },
  { locale: "ru", width: 1440 }
] as const) {
  test(`containing hotel record is useful context, not selected-footprint evidence: ${variant.locale}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: variant.width, height: 900 });
    const calls = await openDemoAnalysis(page, containingSelection);
    if (variant.locale === "ru") await page.getByRole("button", { name: "ru", exact: true }).click();
    const selected = page.getByTestId("express-object");
    const associated = page.getByTestId("express-associated-record");
    await expect(page.getByTestId("express-summary")).toContainText(variant.locale === "ru"
      ? "Запись карты охватывает точку, но её имя и теги не приписываются выбранному контуру"
      : "A mapped record contains the point, but its name and tags are not attributed to the selected shape");
    await expect(selected).not.toContainText("Jumeirah Emirates Towers Hotel");
    await expect(selected).toContainText(variant.locale === "ru" ? "Выбранный контур" : "Selected map shape");
    await expect(page.getByTestId("express-height")).toHaveText(variant.locale === "ru" ? "Высота неизвестна" : "Height unknown");
    await expect(associated).toContainText(variant.locale === "ru" ? "Здание на карте, охватывающее точку" : "Mapped building containing the point");
    await expect(associated).toContainText("Jumeirah Emirates Towers Hotel");
    await expect(associated).toContainText("Sheikh Zayed Road, Dubai");
    await expect(associated).toContainText(variant.locale === "ru" ? "Высота · тег OSM: 355" : "Height · OSM tag: 355");
    await expect(associated).toContainText(variant.locale === "ru" ? "Дата (start_date) · тег OSM: 2000" : "start_date · OSM: 2000");
    await expect(page.getByTestId("express-form")).not.toContainText("8,000");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`express-containing-${variant.locale}-${variant.width}.png`), fullPage: true });
    await page.reload();
    await expect(associated).toBeVisible();
    await page.waitForTimeout(200);
    expect(calls).toEqual([]);
  });
}

test("a containing record tagged building=no is not labelled as a building", async ({ page }) => {
  const selection = { ...containingSelection, resolvedObject: { ...containingSelection.resolvedObject,
    tags: { ...containingSelection.resolvedObject.tags, "tag.building": "no" } } };
  const calls = await openDemoAnalysis(page, selection);
  await expect(page.getByTestId("express-associated-record")).toContainText("Mapped record containing the point");
  await expect(page.getByTestId("express-associated-record")).not.toContainText("Mapped building containing the point");
  await expect(page.getByTestId("express-height")).toHaveText("Height unknown");
  expect(calls).toEqual([]);
});

test("unavailable context is unknown, not zero or a paid fallback", async ({ page }) => {
  const calls = await openDemoAnalysis(page, { ...nearestSelection, resolvedObject: null });
  await expect(page.getByTestId("express-context")).toContainText("Surroundings data is unavailable");
  await expect(page.getByTestId("express-height")).toHaveText("Height unknown");
  await expect(page.getByTestId("express-object")).toContainText("Selected object ID unconfirmed");
  expect(calls).toEqual([]);
});

test("a non-metric height tag remains raw, without an invented metre value", async ({ page }) => {
  const selection = { ...exactSelection, resolvedObject: { ...exactSelection.resolvedObject,
    tags: { ...exactSelection.resolvedObject.tags, "tag.height": "about 200" } } };
  const calls = await openDemoAnalysis(page, selection);
  await expect(page.getByTestId("express-height")).toContainText("OSM tag “about 200”; height in metres not established");
  expect(calls).toEqual([]);
});

test("a source height in feet is converted with its original unit shown", async ({ page }) => {
  const selection = { ...exactSelection, resolvedObject: { ...exactSelection.resolvedObject,
    tags: { ...exactSelection.resolvedObject.tags, "tag.height": "200 ft" } } };
  const calls = await openDemoAnalysis(page, selection);
  await expect(page.getByTestId("express-height")).toContainText("60.96 m converted from OSM tag “200 ft”; not surveyed");
  await expect(page.getByTestId("express-summary")).toContainText("“200 ft” height tag equivalent to 60.96 m");
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.getByTestId("express-height")).toContainText("60,96 м после пересчёта тега OSM «200 ft»; не обмер");
  expect(calls).toEqual([]);
});

test("an exact ID does not upgrade a rendered polygon fragment into a complete footprint", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const selection = { ...exactSelection, resolvedObject: { ...sprint10Selection.resolvedObject,
    name: "Selected building", tags: exactSelection.resolvedObject.tags,
    metrics: { ...sprint10Selection.resolvedObject.metrics, footprintAreaSqM: 2_400 } } };
  const calls = await openDemoAnalysis(page, selection);
  await expect(page.getByTestId("express-summary")).toContainText("selected map shape, possibly a fragment");
  await expect(page.getByTestId("express-form")).toContainText("selected map shape");
  await expect(page.getByTestId("express-form")).not.toContainText("2,400");
  await page.screenshot({ path: testInfo.outputPath("express-exact-fragment-en-390.png"), fullPage: true });
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.getByTestId("express-summary")).toContainText("выбранный контур карты, возможно фрагмент");
  await expect(page.getByTestId("express-form")).toContainText("выбранного контура карты");
  expect(calls).toEqual([]);
});

test("a saved nearest-place report does not place neighbour name or tags under the selected heading", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const calls = await openDemoAnalysis(page, nearestSelection);
  const report = sprint10AnalysisResponse({ depth: "standard", goal: "development_screening", perspective: "developer",
    horizon: "current", question: null, locale: "en" });
  const reportWithNeighbour = { ...report, subject: { ...report.subject, name: "Ernst Biergarten", address: "Ernst Biergarten, Dubai",
    sourceFeatureId: "node/90001", coordinateAssociation: "reverse_nearest_indexed_object_not_point_in_polygon",
    resultCentroidDistanceM: 60, tags: { "tag.building": "bar", "tag.height": "44" } } };
  const fingerprint = `${nearestSelection.locationKey}:${nearestSelection.longitude.toFixed(6)}:${nearestSelection.latitude.toFixed(6)}:${nearestSelection.clickedAt}`;
  const stored = JSON.stringify({ selectionFingerprint: fingerprint, analysis: reportWithNeighbour });
  await page.evaluate((value) => sessionStorage.setItem("geoai:point-to-object:analysis:v8", value), stored);
  await page.reload();
  await expect(page.getByTestId("ai-success")).toBeVisible();
  const header = page.getByTestId("analysis-selected-header");
  await expect(header.getByRole("heading", { level: 1 })).toHaveText("Selected building");
  await expect(header.getByText("Ernst Biergarten", { exact: true })).toHaveCount(0);
  await expect(header.getByTestId("analysis-selected-tags")).toHaveCount(0);
  await header.getByText("Address & source record", { exact: true }).click();
  await expect(header.getByText("Context address: Ernst Biergarten, Dubai", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("saved-nearest-header-en-1440.png"), fullPage: true });
  expect(await page.evaluate(() => sessionStorage.getItem("geoai:point-to-object:analysis:v8"))).toBe(stored);
  expect(calls).toEqual([]);
});

test("an already stored regional climate snapshot adds context without a new source call", async ({ page }) => {
  const climate = {
    version: CLIMATE_VERSION, status: "available", year: 2025, requestedPoint: [55.27, 25.2],
    months: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, temperatureC: 20 + index,
      maximumTemperatureC: 25 + index, relativeHumidityPct: 50 })),
    source: { sourceId: "NASA-POWER", endpoint: CLIMATE_ENDPOINT, referenceUrl: CLIMATE_REFERENCE,
      attribution: CLIMATE_ATTRIBUTION, dataset: "MERRA2", apiVersion: "v2.8.0", timeStandard: "LST",
      observedStart: "2025-01-01", observedEnd: "2025-12-31", acquiredAt: "2026-09-01T00:00:00.000Z",
      responseHash: "a".repeat(64), responseBytes: 1_000 }, proofLimit: CLIMATE_LIMIT
  };
  const calls = await openDemoAnalysis(page, { ...exactSelection,
    resolvedObject: { ...exactSelection.resolvedObject, climate } });
  await expect(page.getByTestId("express-climate")).toContainText("NASA POWER regional grid, 2025: monthly mean air temperature 20–31 °C; not a site measurement.");
  expect(calls).toEqual([]);
});
