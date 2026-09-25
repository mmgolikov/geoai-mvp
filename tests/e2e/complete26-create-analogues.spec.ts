import { expect, test, type Page } from "@playwright/test";
import { calculatePolygonMeasurements } from "../../src/lib/polygon-aoi";
import { conceptTemplate, generateConceptMassingAlternatives, validateRedevelopmentProgram, type ConceptPosition, type ConceptAlternativeId } from "../../src/lib/prototype/point-to-object-create";
import { POINT_OBJECT_CREATE_RESULT_CAVEAT } from "../../src/lib/prototype/point-to-object-create-result";
import { createProgramSeed } from "../../src/lib/prototype/point-to-object-create-ai-core";
import { buildPointObjectCreatePreviewModel } from "../../src/lib/prototype/point-to-object-create-preview";
import type { PointObjectCreateProjectPayload } from "../../src/lib/prototype/point-object-projects-contract";
import { externalHttpUrlPattern, installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";
import { sessionMissingFixture } from "./helpers/auth-persona";
import { inspectSavedConceptCamera } from "./helpers/complete25-create-camera";
import { assertIndependentQuality20CreateMassing } from "./helpers/quality20-create-geometry";
import { quality20Hash } from "./helpers/quality20-frozen-case";

// Exact analogues from COMPLETE26's independent offline matrix. Not the
// unavailable founder polygon, provider evidence, or live Create acceptance.
const shapes = {
  oblique: [[0,0],[1020,45],[1100,540],[850,780],[650,690],[640,420],[370,440],[300,1060],[40,970],[-90,570]],
  twin: [[0,0],[1120,0],[1120,930],[820,1000],[780,640],[620,610],[570,950],[310,1040],[280,700],[100,680],[0,1000]]
};
const controls = { blockCount: 9, levelsMin: 6, levelsMax: 53, targetSiteCoveragePct: 38, openSpacePct: 35, setbackM: 8 };
const families = [
  { shape: "oblique", programme: "residential_mixed_use", variants: ["B"] },
  { shape: "oblique", programme: "civic_green", variants: ["B"] },
  { shape: "oblique", programme: "commercial_hub", variants: ["A", "B"] },
  { shape: "twin", programme: "commercial_hub", variants: ["A", "B"] }
] as const;

function coordinates(shape: keyof typeof shapes): ConceptPosition[][] {
  const toGeo = (scale: number) => shapes[shape].map(([x, y]) =>
    [55.28 + x * scale / (111320 * Math.cos(25.2 * Math.PI / 180)), 25.2 + y * scale / 110540] as ConceptPosition);
  let scale = 1;
  for (let i = 0; i < 6; i++) scale *= Math.sqrt(749860 / calculatePolygonMeasurements(toGeo(scale)).areaSqM);
  const ring = toGeo(scale);
  return [[...ring, ring[0]]];
}

async function savedCreate(page: Page): Promise<PointObjectCreateProjectPayload | null> {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find(item => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.flatMap((project: { artifacts?: Array<{ kind: string; payload: unknown }> }) =>
      project.artifacts ?? []).find((artifact: { kind: string }) => artifact.kind === "create")?.payload ?? null;
  });
}

for (const { locale, width } of [{ locale: "en", width: 1440 }, { locale: "ru", width: 390 }] as const) {
  for (const family of families) {
    test(`COMPLETE26 ${family.shape}/${family.programme} rendered A/B and reopen ${locale}/${width}`, async ({ page, browserName }, info) => {
      await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [], unexpected: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await page.route(externalHttpUrlPattern(info.project.use.baseURL), async route => {
        const url = new URL(route.request().url());
        if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
          return route.fulfill({ json: { version: 8, sources: {}, layers: [
            { id: "background", type: "background", paint: { "background-color": "#e8edf0" } }
          ] } });
        }
        unexpected.push(url.href);
        return route.abort("blockedbyclient");
      });
      // Deny unmocked local APIs too: a loopback proxy must never reach a provider.
      await page.route("**/api/**", route => {
        unexpected.push(route.request().url());
        return route.abort("blockedbyclient");
      });
      await page.route("**/api/auth/session", route => route.fulfill({ json: sessionMissingFixture }));
      await page.route("**/api/prototype/point-to-object/area-context", route => route.fulfill({
        json: { mode: "unavailable", error: "Synthetic offline source fixture; no acquired context" }
      }));
      const aoiCoordinates = coordinates(family.shape);
      let posts = 0;
      let expectedAlternatives: ReturnType<typeof generateConceptMassingAlternatives> = [];
      await page.route("**/api/prototype/point-to-object/create", async route => {
        if (route.request().method() === "GET") return route.fulfill({ json: { mode: "ready", challenge: "P".repeat(43) } });
        expect(route.request().method()).toBe("POST");
        posts++;
        const body = route.request().postDataJSON();
        expect(body.templateId).toBe(family.programme);
        expect(body.locale).toBe(locale);
        expect(body.aoiCoordinates).toEqual(aoiCoordinates);
        expect(body.controls).toEqual(controls);
        const parsed = validateRedevelopmentProgram({ ...conceptTemplate(body.templateId, locale), ...body.controls });
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) throw new Error(parsed.errors.join(";"));
        // Current source-free engine, not hardcoded invented success geometry.
        expectedAlternatives = generateConceptMassingAlternatives(aoiCoordinates, parsed.value,
          createProgramSeed(parsed.value, quality20Hash(aoiCoordinates)), locale);
        expect(expectedAlternatives.map(item => item.id)).toEqual(["A", "B"]);
        for (const alternative of expectedAlternatives) {
          // The oracle parameter type contains older fixture literals; runtime
          // numeric controls are passed unchanged, including nine blocks/53 levels.
          assertIndependentQuality20CreateMassing(aoiCoordinates,
            controls as unknown as Parameters<typeof assertIndependentQuality20CreateMassing>[1], alternative.massing);
        }
        return route.fulfill({ json: { mode: "openai_concept", generatedAt: "2026-09-26T12:00:00.000Z",
          promptVersion: "POINT_OBJECT_CREATE_COMPLETE26_OFFLINE", program: parsed.value,
          massing: expectedAlternatives[0].massing, alternatives: expectedAlternatives,
          telemetry: { model: "offline-fixture", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 },
          caveat: POINT_OBJECT_CREATE_RESULT_CAVEAT } });
      });
      await page.addInitScript(() => localStorage.setItem("geoai-mock-demo-session-v1", "active"));
      await page.goto("/prototype/point-to-object?mode=create");
      await expect(page.locator("main[data-project-restoration]")).toHaveAttribute("data-project-restoration", "ready");
      if (locale === "ru") await page.getByRole("button", { name: "ru", exact: true }).click();
      await page.getByLabel(locale === "ru" ? "Загрузить GeoJSON" : "Upload GeoJSON").setInputFiles({
        name: `complete26-${family.shape}.geojson`, mimeType: "application/geo+json",
        buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: aoiCoordinates }))
      });
      await page.getByTestId(`create-programme-${family.programme}`).click();
      await page.getByText(locale === "ru" ? "Параметры концепции" : "Concept parameters", { exact: true }).click();
      const labels = locale === "ru"
        ? ["Корпуса", "Минимум этажей", "Максимум этажей", "Плотность застройки", "Открытые пространства", "Отступ"]
        : ["Blocks", "Minimum levels", "Maximum levels", "Site coverage", "Open space", "Setback"];
      for (const [index, value] of [9, 6, 53, 38, 35, 8].entries()) {
        await page.getByRole("slider", { name: new RegExp(`^${labels[index]}`) }).fill(String(value));
      }
      await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "ready");
      expect(posts).toBe(0);
      await page.getByTestId("create-generate-action").click();
      await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
      await expect(page.getByTestId("create-generate-action")).toBeDisabled();
      await page.getByTestId("create-alternative-b").click();
      await expect(page.getByTestId("create-alternative-b")).toHaveAttribute("aria-selected", "true");
      await page.getByTestId("create-open-result-dashboard").click();
      await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
      await expect.poll(async () => (await savedCreate(page))?.activeAlternativeId).toBe("B");
      const savedAoi = (await savedCreate(page))!.aoi;
      const preview = page.getByTestId("create-result-preview-3d");
      const geometryKeys: Partial<Record<ConceptAlternativeId, string>> = {};
      for (const variant of family.variants) {
        const expectedMassing = expectedAlternatives.find(item => item.id === variant)!.massing;
        geometryKeys[variant] = buildPointObjectCreatePreviewModel(savedAoi, expectedMassing)!.geometryKey;
        await page.getByTestId(`create-dashboard-alternative-${variant.toLowerCase()}`).click();
        await expect(preview).toHaveAttribute("data-preview-variant", variant);
        await expect(preview).toHaveAttribute("data-preview-feature-count",
          String(expectedAlternatives.find(item => item.id === variant)!.massing.generatedFeatureCount));
        for (const [scene, dimension] of [["map", "2d"], ["map", "3d"], ["model", "3d"]] as const) {
          await page.getByTestId(`create-scene-${scene}`).click();
          await page.getByTestId(`create-preview-mode-${dimension}`).click();
          await expect(preview).toHaveAttribute("data-preview-status", "ready");
          await expect(preview).toHaveAttribute("data-preview-rendered-scene", scene);
          await expect.poll(async () => Number(await preview.getAttribute("data-preview-rendered-massing-count"))).toBeGreaterThan(0);
          if (dimension === "2d") await expect(preview).toHaveAttribute("data-preview-camera-pitch", "0");
          else await expect.poll(async () => Number(await preview.getAttribute("data-preview-camera-pitch"))).toBeGreaterThan(0);
          await expect.poll(async () => (await inspectSavedConceptCamera(page))?.occupancy ?? 0).toBeGreaterThan(0.5);
          await expect(preview).toHaveAttribute("data-preview-geometry-key", geometryKeys[variant]!);
          await preview.screenshot({ path: info.outputPath(`${family.shape}-${family.programme}-${variant}-${scene}-${dimension}-${locale}-${width}.png`) });
          expect(posts).toBe(1);
        }
      }
      // Public Projects reopen, not an injected session or direct React write.
      await expect.poll(async () => (await savedCreate(page))?.activeAlternativeId).toBe("B");
      const before = await savedCreate(page);
      expect(before?.generated.alternatives).toEqual(expectedAlternatives);
      expect(before?.aoi.coordinates).toEqual(aoiCoordinates);
      const savedHash = quality20Hash(before);
      await page.goto("/projects?view=spatial");
      await page.getByRole("button", { name: locale === "ru" ? "Показать на карте" : "Show on map", exact: true }).first().click();
      await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
      await expect(page.getByTestId("create-dashboard-alternative-b")).toHaveAttribute("aria-selected", "true");
      await expect(preview).toHaveAttribute("data-preview-geometry-key", geometryKeys.B!);
      await expect(preview).toHaveAttribute("data-preview-status", "ready");
      await expect.poll(async () => Number(await preview.getAttribute("data-preview-rendered-massing-count"))).toBeGreaterThan(0);
      expect(quality20Hash(await savedCreate(page))).toBe(savedHash);
      expect(posts).toBe(1);
      expect(unexpected).toEqual([]);
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await preview.screenshot({ path: info.outputPath(`${family.shape}-${family.programme}-B-reopened-${locale}-${width}.png`) });
    });
  }
}
