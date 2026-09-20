import { expect, test, type Page, type Route, type TestInfo } from "@playwright/test";

import {
  conceptTemplate,
  generateConceptMassingAlternatives,
  validatePointObjectCreateAoiVertices,
  validateRedevelopmentProgram,
  type ConceptLocale
} from "../../src/lib/prototype/point-to-object-create";
import { POINT_OBJECT_CREATE_RESULT_CAVEAT } from "../../src/lib/prototype/point-to-object-create-result";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

test.beforeEach(async ({ page, browserName }, testInfo) => {
  await installLoopbackBrowserHarness(page, browserName, testInfo.project.use.baseURL);
});

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function exactCreateFixture(locale: ConceptLocale, options: { invalidAlternativeB?: boolean } = {}) {
  const vertices: Array<[number, number]> = [
    [55.2700, 25.2050],
    [55.2720, 25.2050],
    [55.2720, 25.2065],
    [55.2700, 25.2065]
  ];
  const aoiValidation = validatePointObjectCreateAoiVertices(vertices);
  if (!aoiValidation.ok) throw new Error(aoiValidation.message);
  const aoi = {
    id: "create-aoi-sprint10-preview",
    coordinates: [[...vertices, vertices[0]]],
    areaSqM: aoiValidation.measurements.areaSqM,
    perimeterM: aoiValidation.measurements.perimeterM,
    vertexCount: vertices.length
  };
  const programValidation = validateRedevelopmentProgram(conceptTemplate("commercial_hub", locale));
  if (!programValidation.ok) throw new Error(programValidation.errors.join("; "));
  const alternatives = structuredClone(generateConceptMassingAlternatives(aoi.coordinates, programValidation.value, "sprint10-saved-preview-fixture", locale));
  if (alternatives.length !== 2) throw new Error("The saved Create fixture requires exact A/B alternatives.");
  if (options.invalidAlternativeB) {
    const invalidFeature = alternatives[1].massing.featureCollection.features[0];
    invalidFeature.properties.baseM = invalidFeature.properties.heightM;
  }
  const generated = {
    mode: "openai_concept" as const,
    generatedAt: "2026-09-18T16:30:00.000Z",
    promptVersion: "POINT_OBJECT_CREATE_PREVIEW_FIXTURE",
    program: programValidation.value,
    massing: alternatives[0].massing,
    alternatives,
    telemetry: { model: "offline-fixture", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0, stored: false as const, toolCalls: 0 as const },
    caveat: POINT_OBJECT_CREATE_RESULT_CAVEAT
  };
  return { aoi, generated, alternatives };
}

async function prepareExactSavedResult(page: Page, locale: ConceptLocale, options: { disableWebGl?: boolean; invalidAlternativeB?: boolean } = {}) {
  const fixture = exactCreateFixture(locale, options);
  const createMethods: string[] = [];
  let contextCalls = 0;
  if (options.disableWebGl) {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
        if (contextId === "webgl" || contextId === "webgl2" || contextId === "experimental-webgl") return null;
        return original.call(this, contextId as never, ...(args as []));
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
  }
  await page.route("**/api/auth/session", (route) => json(route, { isAuthenticated: false, sessionStatus: "session_missing", user: null }));
  await page.route("**/api/auth/logout", (route) => json(route, { ok: true }));
  await page.route("**/api/prototype/point-to-object/create", (route) => {
    createMethods.push(route.request().method());
    if (route.request().method() === "GET") return json(route, { mode: "ready", challenge: "P".repeat(43) });
    return json(route, fixture.generated);
  });
  await page.route("**/api/prototype/point-to-object/area-context", (route) => {
    contextCalls += 1;
    return json(route, { mode: "unavailable", error: "Deliberately unavailable in the offline preview fixture." }, 503);
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object?mode=create");
  if (locale === "ru") await page.getByRole("button", { name: "ru", exact: true }).click();
  // setInputFiles bypasses the inert Create panel's interaction guard. Wait for
  // real restoration readiness so the upload is not correctly discarded as stale.
  await expect(page.locator("main[data-project-restoration]")).toHaveAttribute("data-project-restoration", "ready");
  await page.getByLabel(locale === "ru" ? "Загрузить GeoJSON" : "Upload GeoJSON").setInputFiles({
    name: "sprint10-preview-area.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: fixture.aoi.coordinates }))
  });
  await page.getByRole("button", { name: new RegExp(locale === "ru" ? "^Деловой комплекс" : "^Business towers") }).click();
  await page.getByTestId("create-generate-action").click();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.flatMap((project: { artifacts?: Array<{ kind?: string }> }) => project.artifacts ?? [])
      .some((artifact: { kind?: string }) => artifact.kind === "create") ?? false;
  })).toBe(true);

  const baseline = { createMethods: [...createMethods], contextCalls };
  await page.goto("/projects?view=spatial");
  await page.getByRole("button", { name: locale === "ru" ? "Показать на карте" : "Show on map", exact: true }).first().click();
  await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
  // This suite stays entirely offline. Map acceptance lives in sprint20-create-map.spec.ts.
  if (!options.disableWebGl) await page.getByTestId("create-scene-model").click();
  return { fixture, createMethods, contextCalls: () => contextCalls, baseline };
}

async function expectNoNewSourceCalls(prepared: Awaited<ReturnType<typeof prepareExactSavedResult>>) {
  expect(prepared.createMethods).toEqual(prepared.baseline.createMethods);
  expect(prepared.contextCalls()).toBe(prepared.baseline.contextCalls);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function expectRenderable3DCanvas(page: Page) {
  const host = page.getByTestId("create-result-preview-3d-canvas");
  await expect(host).toBeVisible();
  await expect.poll(async () => host.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  })).toBe(true);
  const hostBounds = await host.boundingBox();
  expect(hostBounds).not.toBeNull();
  expect(hostBounds!.width).toBeGreaterThan(0);
  expect(hostBounds!.height).toBeGreaterThan(0);

  const canvas = host.locator("canvas.maplibregl-canvas");
  await expect(canvas).toBeVisible();
  await expect.poll(async () => canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  })).toBe(true);
  const canvasBounds = await canvas.boundingBox();
  expect(canvasBounds).not.toBeNull();
  expect(canvasBounds!.width).toBeGreaterThan(0);
  expect(canvasBounds!.height).toBeGreaterThan(0);
}

test("saved Create A/B uses the same exact KPI and geometry in local 2D/3D with zero preview-time source calls", async ({ page }, testInfo: TestInfo) => {
  const prepared = await prepareExactSavedResult(page, "en");
  const [alternativeA, alternativeB] = prepared.fixture.alternatives;
  await page.setViewportSize({ width: 1440, height: 1000 });

  await expect(page.getByTestId("create-preview-mode-2d")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "A");
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-estimated-floor-area-sqm", String(alternativeA.massing.estimatedFloorAreaSqM));
  await expect(page.getByTestId("create-result-preview-3d")).toHaveAttribute("data-preview-feature-count", String(alternativeA.massing.generatedFeatureCount));
  await expect(page.getByTestId("create-result-preview-3d")).toHaveAttribute("data-preview-basemap", "none");
  await expectNoNewSourceCalls(prepared);

  await page.getByTestId("create-preview-mode-3d").focus();
  await page.getByTestId("create-preview-mode-3d").press("Enter");
  const preview3d = page.getByTestId("create-result-preview-3d");
  await expect(preview3d).toHaveAttribute("data-preview-status", "ready");
  await expect(preview3d).toHaveAttribute("data-preview-variant", "A");
  await expectRenderable3DCanvas(page);
  await expect(preview3d).toHaveAttribute("data-preview-feature-count", String(alternativeA.massing.generatedFeatureCount));
  await expect(preview3d).toHaveAttribute("data-preview-max-height-m", String(Math.max(...alternativeA.massing.featureCollection.features.map((feature) => feature.properties.heightM))));
  const alternativeAGeometryKey = await preview3d.getAttribute("data-preview-geometry-key");
  expect(alternativeAGeometryKey).toBeTruthy();
  await preview3d.getByRole("button", { name: "Zoom in" }).press("Enter");
  await preview3d.getByRole("button", { name: "Reset view" }).press("Enter");

  await page.getByTestId("create-dashboard-alternative-b").focus();
  await page.getByTestId("create-dashboard-alternative-b").press("Enter");
  await expect(preview3d).toHaveAttribute("data-preview-variant", "B");
  await expect(preview3d).toHaveAttribute("data-preview-feature-count", String(alternativeB.massing.generatedFeatureCount));
  await expect(preview3d).toHaveAttribute("data-preview-max-height-m", String(Math.max(...alternativeB.massing.featureCollection.features.map((feature) => feature.properties.heightM))));
  await expect(preview3d).not.toHaveAttribute("data-preview-geometry-key", alternativeAGeometryKey!);
  await expectRenderable3DCanvas(page);
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-estimated-floor-area-sqm", String(alternativeB.massing.estimatedFloorAreaSqM));
  await page.screenshot({ path: testInfo.outputPath("saved-create-dashboard-desktop-option-b-3d.png"), fullPage: true });

  await page.getByTestId("create-preview-mode-2d").press("Enter");
  await expect(preview3d).toHaveAttribute("data-preview-feature-count", String(alternativeB.massing.generatedFeatureCount));
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("saved-create-dashboard-desktop-option-b-2d.png"), fullPage: true });
  await expectNoNewSourceCalls(prepared);

  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.flatMap((project: { artifacts?: Array<{ kind?: string; payload?: { activeAlternativeId?: string } }> }) => project.artifacts ?? [])
      .find((artifact: { kind?: string }) => artifact.kind === "create")?.payload?.activeAlternativeId ?? null;
  })).toBe("B");
  const storedGenerated = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.flatMap((project: { artifacts?: Array<{ kind?: string; payload?: { generated?: unknown } }> }) => project.artifacts ?? [])
      .find((artifact: { kind?: string }) => artifact.kind === "create")?.payload?.generated ?? null;
  });
  expect(storedGenerated).toEqual(prepared.fixture.generated);
  await page.reload();
  await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
  await page.getByTestId("create-scene-model").click();
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
  await expect(page.getByTestId("create-preview-mode-2d")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("create-preview-mode-3d").press("Enter");
  await expect(page.getByTestId("create-result-preview-3d")).toHaveAttribute("data-preview-variant", "B");
  await expect(page.getByTestId("create-result-preview-3d")).toHaveAttribute("data-preview-status", "ready");
  await expectNoNewSourceCalls(prepared);
});

test("Russian mobile saved result falls back to its original 2D plan when WebGL is unavailable", async ({ page }, testInfo: TestInfo) => {
  const prepared = await prepareExactSavedResult(page, "ru", { disableWebGl: true });
  await page.setViewportSize({ width: 390, height: 844 });

  await expect(page.getByRole("heading", { name: prepared.fixture.generated.program.title })).toBeVisible();
  await page.getByTestId("create-preview-mode-3d").focus();
  await page.getByTestId("create-preview-mode-3d").press("Enter");
  await expect(page.getByTestId("create-result-preview-3d-fallback")).toHaveAttribute("data-preview-status", "unsupported");
  await expect(page.getByText("3D-просмотр недоступен.")).toBeVisible();
  await expect(page.getByTestId("create-result-preview")).toBeVisible();
  await expect(page.getByTestId("create-preview-building")).toHaveCount(prepared.fixture.alternatives[0].massing.generatedFeatureCount);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("saved-create-dashboard-mobile-ru-webgl-fallback.png"), fullPage: true });
  await expectNoNewSourceCalls(prepared);
});

test("mobile 3D fails closed for an invalid saved option and recovers without a stale scene", async ({ page }, testInfo: TestInfo) => {
  const prepared = await prepareExactSavedResult(page, "en", { invalidAlternativeB: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("create-preview-mode-3d").click();

  const preview3d = page.getByTestId("create-result-preview-3d");
  await expect(preview3d).toHaveAttribute("data-preview-status", "ready");
  await expect(preview3d).toHaveAttribute("data-preview-variant", "A");
  await expectRenderable3DCanvas(page);
  await page.screenshot({ path: testInfo.outputPath("saved-create-dashboard-mobile-option-a-3d-framed.png"), fullPage: true });

  await page.getByTestId("create-dashboard-alternative-b").click();
  await expect(page.getByTestId("create-result-preview-3d-fallback")).toHaveAttribute("data-preview-status", "invalid");
  await expect(page.getByTestId("create-result-preview-3d-canvas")).toHaveCount(0);
  await expect(page.getByTestId("create-result-preview")).toBeVisible();
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
  await page.screenshot({ path: testInfo.outputPath("saved-create-dashboard-mobile-option-b-invalid-fallback.png"), fullPage: true });

  await page.getByTestId("create-dashboard-alternative-a").click();
  await expect(preview3d).toHaveAttribute("data-preview-status", "ready");
  await expect(preview3d).toHaveAttribute("data-preview-variant", "A");
  await expectRenderable3DCanvas(page);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("saved-create-dashboard-mobile-option-a-3d-recovered.png"), fullPage: true });
  await expectNoNewSourceCalls(prepared);
});
