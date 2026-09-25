import { expect, test } from "@playwright/test";
import { conceptTemplate, CONCEPT_TEMPLATE_IDS, generateConceptMassingAlternatives, validateRedevelopmentProgram, type ConceptTemplateId } from "../../src/lib/prototype/point-to-object-create";
import { POINT_OBJECT_CREATE_RESULT_CAVEAT } from "../../src/lib/prototype/point-to-object-create-result";
import { externalHttpUrlPattern, installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";
import { sessionMissingFixture } from "./helpers/auth-persona";
import { inspectSavedConceptCamera } from "./helpers/complete25-create-camera";

const coordinates: [number, number][][] = [[[55.278, 25.216], [55.281, 25.216], [55.281, 25.219], [55.278, 25.219], [55.278, 25.216]]];

for (const { locale, width } of [{ locale: "en", width: 1440 }, { locale: "ru", width: 390 }] as const) {
  test(`COMPLETE25 five Create programmes, preserved result and saved B: ${locale}/${width}`, async ({ page, browserName }, testInfo) => {
    await installLoopbackBrowserHarness(page, browserName, testInfo.project.use.baseURL);
    await page.setViewportSize({ width, height: 1000 });
    const unexpected: string[] = [];
    await page.route(externalHttpUrlPattern(testInfo.project.use.baseURL), async route => {
      const url = new URL(route.request().url());
      if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
        await route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e8edf0" } }] } });
        return;
      }
      unexpected.push(url.href);
      await route.abort("blockedbyclient");
    });
    await page.route("**/api/auth/session", route => route.fulfill({ json: sessionMissingFixture }));
    await page.route("**/api/prototype/point-to-object/area-context", route => route.fulfill({ status: 503, json: { mode: "unavailable", error: "Offline source fixture" } }));
    const requests: Array<{ templateId: ConceptTemplateId; locale: "en" | "ru" }> = [];
    await page.route("**/api/prototype/point-to-object/create", async route => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { mode: "ready", challenge: "P".repeat(43) } });
        return;
      }
      const body = route.request().postDataJSON();
      requests.push({ templateId: body.templateId, locale: body.locale });
      const parsed = validateRedevelopmentProgram({ ...conceptTemplate(body.templateId, body.locale), ...body.controls });
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) throw new Error(parsed.errors.join(";"));
      const alternatives = generateConceptMassingAlternatives(body.aoiCoordinates, parsed.value, "complete25-offline-browser", body.locale);
      await route.fulfill({ json: { mode: "openai_concept", generatedAt: "2026-09-25T12:00:00.000Z",
        promptVersion: "POINT_OBJECT_CREATE_COMPLETE25_BROWSER", program: parsed.value, massing: alternatives[0].massing, alternatives,
        telemetry: { model: "offline-fixture", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 },
        caveat: POINT_OBJECT_CREATE_RESULT_CAVEAT } });
    });
    await page.addInitScript(() => localStorage.setItem("geoai-mock-demo-session-v1", "active"));
    await page.goto("/prototype/point-to-object?mode=create");
    await expect(page.locator("main[data-project-restoration]")).toHaveAttribute("data-project-restoration", "ready");
    if (locale === "ru") await page.getByRole("button", { name: "ru", exact: true }).click();
    await page.getByLabel(locale === "ru" ? "Загрузить GeoJSON" : "Upload GeoJSON").setInputFiles({ name: "complete25.geojson", mimeType: "application/geo+json", buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates })) });
    const programme = (id: ConceptTemplateId) => page.getByTestId(`create-programme-${id}`);
    for (const id of CONCEPT_TEMPLATE_IDS) {
      await programme(id).click();
      await expect(programme(id)).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "ready");
    }
    expect(requests).toHaveLength(0);
    await programme("residential_quarter").click();
    await expect(programme("residential_quarter")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "ready");
    await page.getByTestId("create-generate-action").click();
    const summary = page.getByTestId("generated-concept-summary");
    await expect(summary).toContainText(conceptTemplate("residential_quarter", locale).summary);
    const mainMap = page.getByTestId("live-map-canvas");
    const mainEnvironmentState = (installNativeFixture = false) => mainMap.evaluate((canvas, install) => {
      type Hook = { memoizedState: unknown; next: Hook | null };
      type Fiber = { memoizedState: Hook | null; return: Fiber | null };
      const key = Object.getOwnPropertyNames(canvas).find(key => key.startsWith("__reactFiber$"));
      if (!key) return null;
      let fiber: Fiber | null = (canvas as unknown as Record<string, Fiber>)[key];
      while (fiber) {
        let hook = fiber.memoizedState;
        while (hook) {
          const map = (hook.memoizedState as { current?: import("maplibre-gl").Map } | null)?.current;
          if (typeof map?.getLayer === "function" && map.getLayer("geoai-concept-environment-fill")) {
            if (install && !map.getSource("complete25-native-fixture")) {
              // An empty style cannot establish safe replacement. Supply a real
              // synthetic source/layer, never force concept visibility or status.
              map.addSource("complete25-native-fixture", { type: "geojson", data: { type: "FeatureCollection", features: [{
                type: "Feature", id: 251, properties: { fixture: "inside-native-building" },
                geometry: { type: "Polygon", coordinates: [[[55.2785, 25.2165], [55.2786, 25.2165], [55.2786, 25.2166], [55.2785, 25.2166], [55.2785, 25.2165]]] }
              }] } });
              map.addLayer({ id: "geoai-buildings-3d", type: "fill-extrusion", source: "complete25-native-fixture", paint: { "fill-extrusion-color": "#999999", "fill-extrusion-height": 10 } });
            }
            return { visibility: map.getLayoutProperty("geoai-concept-environment-fill", "visibility"),
              count: map.queryRenderedFeatures({ layers: ["geoai-concept-environment-fill"] }).filter(feature =>
                feature.properties.provenance === "conceptual" && feature.properties.programme === "hospitality_recreation" && feature.properties.variant === "B").length };
          }
          hook = hook.next;
        }
        fiber = fiber.return;
      }
      return null;
    }, installNativeFixture);
    await expect(mainMap).toHaveAttribute("data-concept-environment-status", "ready");
    const residentialKey = await mainMap.getAttribute("data-concept-environment-key");
    expect(residentialKey).toMatch(/^[a-f0-9]{8}$/);
    await expect.poll(mainEnvironmentState).toEqual({ visibility: "none", count: 0 });
    await mainEnvironmentState(true);
    expect(requests).toEqual([{ templateId: "residential_quarter", locale }]);
    await programme("hospitality_recreation").click();
    await expect(page.getByTestId("create-draft-status")).toBeVisible();
    await expect(summary).toContainText(conceptTemplate("residential_quarter", locale).summary);
    await expect(mainMap).toHaveAttribute("data-concept-environment-key", residentialKey!);
    expect(requests).toHaveLength(1);
    await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "ready");
    await page.getByTestId("create-generate-action").click();
    await expect(summary).toContainText(conceptTemplate("hospitality_recreation", locale).summary);
    await expect(page.getByTestId("create-generate-action")).toBeDisabled();
    await expect(mainMap).not.toHaveAttribute("data-concept-environment-key", residentialKey!);
    const hospitalityAKey = await mainMap.getAttribute("data-concept-environment-key");
    await page.getByTestId("create-alternative-b").click();
    await expect(page.getByTestId("create-alternative-b")).toHaveAttribute("aria-selected", "true");
    await expect(mainMap).not.toHaveAttribute("data-concept-environment-key", hospitalityAKey!);
    const hospitalityBKey = await mainMap.getAttribute("data-concept-environment-key");
    await expect.poll(async () => (await mainEnvironmentState())?.count ?? 0,
      { message: "The main map really renders the selected environment after safe native replacement" }).toBeGreaterThan(0);
    await mainMap.screenshot({ path: testInfo.outputPath(`hospitality-main-map-${locale}-${width}.png`) });
    expect(requests).toEqual([{ templateId: "residential_quarter", locale }, { templateId: "hospitality_recreation", locale }]);
    await expect.poll(() => page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => key.startsWith("geoai:point-to-object:projects:v1:"));
      return key ? localStorage.getItem(key) : "";
    })).toContain('"activeAlternativeId":"B"');
    await page.getByTestId("create-open-result-dashboard").click();
    await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
    const preview = page.getByTestId("create-result-preview-3d");
    await expect(preview).toHaveAttribute("data-preview-status", "ready");
    await expect(preview).toHaveAttribute("data-preview-feature-count", "7");
    await expect(preview).toHaveAttribute("data-environment-key", hospitalityBKey!);
    await expect(preview).toHaveAttribute("data-environment-status", "ready");
    const resultMap = page.getByTestId("create-result-preview-3d-canvas");
    await expect.poll(async () => Number(await resultMap.getAttribute("data-concept-environment-rendered-count"))).toBeGreaterThan(0);
    await expect(page.getByTestId("create-environment-caption")).toBeVisible();
    await page.getByTestId("create-preview-mode-3d").click();
    await expect(preview).toHaveAttribute("data-preview-status", "ready");
    await expect.poll(async () => Number(await resultMap.getAttribute("data-concept-environment-rendered-count"))).toBeGreaterThan(0);
    await page.getByTestId("create-scene-model").click();
    await expect(preview).toHaveAttribute("data-preview-rendered-scene", "model");
    await expect(preview).toHaveAttribute("data-environment-key", hospitalityBKey!);
    await expect.poll(async () => Number(await resultMap.getAttribute("data-concept-environment-rendered-count"))).toBeGreaterThan(0);
    await page.getByTestId("create-dashboard-alternative-a").click();
    await expect(preview).toHaveAttribute("data-environment-key", hospitalityAKey!);
    await page.getByTestId("create-dashboard-alternative-b").click();
    await expect(preview).toHaveAttribute("data-environment-key", hospitalityBKey!);
    await expect.poll(async () => Number(await resultMap.getAttribute("data-concept-environment-rendered-count"))).toBeGreaterThan(0);
    await expect.poll(async () => (await inspectSavedConceptCamera(page))?.occupancy ?? 0).toBeGreaterThan(0.65);
    const fittedCamera = await inspectSavedConceptCamera(page);
    expect(fittedCamera).not.toBeNull();
    expect(fittedCamera!.occupancy).toBeLessThan(0.76);
    expect(fittedCamera!.top).toBeGreaterThan(10);
    expect(fittedCamera!.bottom).toBeLessThan(fittedCamera!.height - 65);
    // Real pointer rotation remains possible; local view changes preserve it.
    await resultMap.scrollIntoViewIfNeeded();
    const canvasBox = await resultMap.boundingBox();
    expect(canvasBox).not.toBeNull();
    const dragX = canvasBox!.x + canvasBox!.width * 0.5, dragY = canvasBox!.y + canvasBox!.height * 0.45;
    await page.mouse.move(dragX, dragY);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(dragX + 45, dragY, { steps: 8 });
    await page.mouse.up({ button: "right" });
    await expect.poll(async () => Math.abs(((await inspectSavedConceptCamera(page))?.bearing ?? -24) + 24)).toBeGreaterThan(5);
    const rotatedCamera = await inspectSavedConceptCamera(page);
    await page.getByTestId("create-preview-mode-2d").click();
    await expect.poll(async () => (await inspectSavedConceptCamera(page))?.pitch).toBe(0);
    await page.getByTestId("create-preview-mode-3d").click();
    await expect.poll(async () => (await inspectSavedConceptCamera(page))?.pitch).toBeGreaterThan(0);
    expect((await inspectSavedConceptCamera(page))!.bearing).toBeCloseTo(rotatedCamera!.bearing, 1);
    await preview.getByRole("button", { name: locale === "ru" ? "Сбросить вид" : "Reset view", exact: true }).click();
    await expect.poll(async () => (await inspectSavedConceptCamera(page))?.bearing).toBe(-24);
    await expect.poll(async () => (await inspectSavedConceptCamera(page))?.occupancy ?? 0).toBeGreaterThan(0.65);
    await page.screenshot({ path: testInfo.outputPath(`hospitality-${locale}-${width}.png`) });
    await preview.screenshot({ path: testInfo.outputPath(`hospitality-scene-${locale}-${width}.png`) });
    await page.goto("/projects?view=spatial");
    await page.getByRole("button", { name: locale === "ru" ? "Показать на карте" : "Show on map", exact: true }).first().click();
    await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
    await expect(page.getByTestId("create-dashboard-alternative-b")).toHaveAttribute("aria-selected", "true");
    await expect(preview).toHaveAttribute("data-preview-status", "ready");
    await expect(preview).toHaveAttribute("data-environment-key", hospitalityBKey!);
    await expect.poll(async () => Number(await resultMap.getAttribute("data-concept-environment-rendered-count"))).toBeGreaterThan(0);
    expect(requests).toHaveLength(2);
    expect(unexpected).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
