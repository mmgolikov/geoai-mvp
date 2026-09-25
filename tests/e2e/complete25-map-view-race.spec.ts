import { test, expect } from "@playwright/test";
import type { FeatureCollection, Polygon, Position } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { calculatePolygonMeasurements } from "../../src/lib/polygon-aoi";
import { conceptTemplate, generateConceptMassingAlternatives, validateRedevelopmentProgram, type ConceptMassingResult, type PointObjectCreateAoi } from "../../src/lib/prototype/point-to-object-create";
import { buildConceptEnvironment } from "../../src/lib/prototype/point-to-object-create-environment";
import { POINT_OBJECT_CREATE_RESULT_CAVEAT } from "../../src/lib/prototype/point-to-object-create-result";
import { installLoopbackBrowserHarness, externalHttpUrlPattern } from "./helpers/local-webkit-csp";

type Point = [number, number];
type TransitionSamples = { total: number; pending: number; violations: Array<{ phase: string; native: number; massing: number; environment: number }> };
type HarnessWindow = Window & { __complete25RaceMap?: MapLibreMap; __complete25RacePhase?: "plaza" | "massing"; __complete25RaceSamples?: TransitionSamples };
type Hook = { memoizedState: unknown; next: Hook | null };
type Fiber = { memoizedState: Hook | null; return: Fiber | null };
const p = ([x, y]: number[]): Point => [55 + x / 100000, 25 + y / 110000];
const ring = (points: number[][]): Point[] => [...points, points[0]].map(p);
const outer = ring([[0, 0], [100, 0], [100, 100], [0, 100]]);
const hole = ring([[40, 40], [60, 40], [60, 60], [40, 60]]);
const building = ring([[10, 10], [25, 10], [25, 25], [10, 25]]);
const outerMeasurements = calculatePolygonMeasurements(outer);
const holeMeasurements = calculatePolygonMeasurements(hole);
const buildingMeasurements = calculatePolygonMeasurements(building);
const syntheticAoi: PointObjectCreateAoi = {
  id: "renderer-only-hole", coordinates: [outer, hole], vertexCount: 8,
  areaSqM: outerMeasurements.areaSqM - holeMeasurements.areaSqM,
  perimeterM: outerMeasurements.perimeterM + holeMeasurements.perimeterM
};
const syntheticMassing: ConceptMassingResult = {
  variantId: "A", massingStyle: "campus", requestedBlockCount: 1, generatedBlockCount: 1, generatedFeatureCount: 1,
  aoiAreaSqM: syntheticAoi.areaSqM, generatedFootprintAreaSqM: buildingMeasurements.areaSqM,
  achievedSiteCoveragePct: buildingMeasurements.areaSqM / syntheticAoi.areaSqM * 100,
  estimatedFloorAreaSqM: buildingMeasurements.areaSqM * 5, minGeneratedLevels: 5, maxGeneratedLevels: 5, seed: "renderer-only",
  featureCollection: { type: "FeatureCollection", features: [{ type: "Feature", properties: {
    id: "one", kind: "concept_massing", templateId: "residential_mixed_use", variantId: "A", massingStyle: "campus",
    volumeRole: "campus_block", primaryBlock: true, use: "residential", levels: 5, heightM: 15, baseM: 0,
    footprintForm: "rectangle", label: "Synthetic renderer-only volume"
  }, geometry: { type: "Polygon", coordinates: [building] } }] }
};

// The public import/generator/saved parser deliberately rejects AOI holes.
// This runtime-injected fixture tests renderer safety, NOT public Create hole
// generation, KPI feasibility, persistence, or reopen support.
const environment = buildConceptEnvironment(syntheticAoi, syntheticMassing);
const plaza = environment.featureCollection.features[0]?.geometry.coordinates[0];
if (!plaza) throw new Error("The renderer fixture requires a real derived plaza.");

// >1,000 vertices exceed the conservative complete-footprint contract, so this
// actual native polygon is retained. Do not force status, visibility, collision
// results, readiness, or queryRenderedFeatures to manufacture partial coverage.
function detailed(geometry: Position[]): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < geometry.length - 1; i++) for (let j = 0; j < 260; j++) {
    const a = geometry[i], b = geometry[i + 1], t = j / 260;
    points.push([a[0] + (b[0] - a[0]) * t + (j % 2 ? 1e-7 : 0), a[1] + (b[1] - a[1]) * t + (j % 2 ? 1e-7 : 0)]);
  }
  return [...points, points[0]];
}
function nativeData(coordinates: Point[]): FeatureCollection<Polygon> {
  return { type: "FeatureCollection", features: [{ type: "Feature", id: 9001,
    properties: { fixture: "retained-detailed-native" }, geometry: { type: "Polygon", coordinates: [coordinates] } }] };
}

test("COMPLETE25 native visibility survives 2D→3D during real source loading; renderer-only hole and collision safety", async ({ page, browserName }, info) => {
  test.setTimeout(90000);
  const errors: string[] = [], unexpectedExternal: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route(externalHttpUrlPattern(info.project.use.baseURL), route => {
    const url = new URL(route.request().url());
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) return route.fulfill({ json: {
      version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#f3f8fa" } }]
    } });
    unexpectedExternal.push(url.href);
    return route.abort("blockedbyclient");
  });
  await page.route("**/api/prototype/point-to-object/area-context", route => route.fulfill({ status: 503, json: { mode: "unavailable", error: "Offline source fixture" } }));
  let posts = 0;
  await page.route("**/api/prototype/point-to-object/create", route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { mode: "ready", challenge: "P".repeat(43) } });
    posts++;
    const body = route.request().postDataJSON();
    const program = validateRedevelopmentProgram({ ...conceptTemplate(body.templateId, "en"), ...body.controls });
    if (!program.ok) throw new Error(program.errors.join(";"));
    const alternatives = generateConceptMassingAlternatives(body.aoiCoordinates, program.value, "renderer-fixture", "en");
    return route.fulfill({ json: { mode: "openai_concept", generatedAt: "2026-09-25T12:00:00.000Z",
      promptVersion: "POINT_OBJECT_CREATE_RENDERER_ONLY_FIXTURE", program: program.value, massing: alternatives[0].massing, alternatives,
      telemetry: { model: "offline", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 }, caveat: POINT_OBJECT_CREATE_RESULT_CAVEAT } });
  });
  await page.goto("/prototype/point-to-object?mode=create");
  await expect(page.locator("main[data-project-restoration]")).toHaveAttribute("data-project-restoration", "ready");
  await page.getByLabel("Upload GeoJSON").setInputFiles({ name: "outer-only.geojson", mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: [outer] })) });
  await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "ready");
  await page.getByTestId("create-generate-action").click();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  const canvas = page.getByTestId("live-map-canvas");
  // Initial 100m outer-only generation need not have room for decoration.
  await expect(canvas).toHaveAttribute("data-concept-environment-key", /./);
  const retainedPlaza = nativeData(detailed(plaza));
  await canvas.evaluate((element, fixture) => {
    const key = Object.getOwnPropertyNames(element).find(name => name.startsWith("__reactFiber$"));
    if (!key) throw new Error("Map component fiber missing.");
    let fiber: Fiber | null = (element as unknown as Record<string, Fiber>)[key];
    let map: MapLibreMap | null = null;
    let updatedAoi = false, updatedMassing = false;
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const current = (hook.memoizedState as { current?: Partial<PointObjectCreateAoi & ConceptMassingResult & MapLibreMap> } | null)?.current;
        if (current && typeof current.getSource === "function") map = current as unknown as MapLibreMap;
        if (current?.coordinates && typeof current.id === "string") { current.coordinates = fixture.aoi.coordinates; updatedAoi = true; }
        if (current?.featureCollection && current.variantId) { current.featureCollection = fixture.massing.featureCollection; current.variantId = "A"; updatedMassing = true; }
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    if (!map || !updatedAoi || !updatedMassing) throw new Error("Renderer runtime refs unavailable.");
    (window as HarnessWindow).__complete25RaceMap = map;
    map.jumpTo({ center: [55.0005, 25.000454545454545], zoom: 18.7, pitch: 0 });
    map.addSource("retained-detailed-native", { type: "geojson", tolerance: 0, maxzoom: 22, data: fixture.native });
    map.addLayer({ id: "geoai-buildings-3d", type: "fill-extrusion", source: "retained-detailed-native",
      paint: { "fill-extrusion-color": "#626b70", "fill-extrusion-height": 12 } });
  }, { aoi: syntheticAoi, massing: syntheticMassing, native: retainedPlaza });

  const state = () => page.evaluate(async () => {
    const map = (window as HarnessWindow).__complete25RaceMap;
    if (!map) throw new Error("Renderer map missing.");
    const aoi = await (map.getSource("geoai-create-aoi") as GeoJSONSource).getData() as FeatureCollection<Polygon>;
    return {
      rings: aoi.features.find(feature => feature.properties?.kind === "aoi")?.geometry.coordinates,
      environment: map.getLayoutProperty("geoai-concept-environment-fill", "visibility"),
      massing2d: map.getLayoutProperty("geoai-concept-fill", "visibility"), massing3d: map.getLayoutProperty("geoai-concept-volume", "visibility"),
      environmentCount: map.queryRenderedFeatures({ layers: ["geoai-concept-environment-fill"] }).length,
      massingCount: map.queryRenderedFeatures({ layers: ["geoai-concept-volume", "geoai-concept-fill"] }).length,
      holeFillCount: map.queryRenderedFeatures(map.project([55.0005, 25.000454545454545]), { layers: ["geoai-create-aoi-fill"] }).length,
      nativeCount: map.queryRenderedFeatures({ layers: ["geoai-buildings-3d"] }).length,
      nativeVisibility: map.getLayoutProperty("geoai-buildings-3d", "visibility"), styleLoaded: map.isStyleLoaded(), pitch: map.getPitch()
    };
  });
  await expect.poll(async () => (await state()).styleLoaded).toBe(true);
  await page.getByRole("button", { name: "2d", exact: true }).click();
  const threeD = page.getByRole("button", { name: "3d", exact: true });
  await expect(threeD).toBeVisible();
  await page.evaluate(() => {
    const target = window as HarnessWindow, map = target.__complete25RaceMap!;
    target.__complete25RacePhase = "plaza";
    target.__complete25RaceSamples = { total: 0, pending: 0, violations: [] };
    map.on("render", () => {
      const samples = target.__complete25RaceSamples!;
      samples.total++;
      if (!map.isStyleLoaded()) samples.pending++;
      const native = map.queryRenderedFeatures({ layers: ["geoai-buildings-3d"] }).length;
      const massing = map.queryRenderedFeatures({ layers: ["geoai-concept-volume", "geoai-concept-fill"] }).length;
      const environment = map.queryRenderedFeatures({ layers: ["geoai-concept-environment-fill"] }).length;
      if (native > 0 && (environment > 0 || (target.__complete25RacePhase === "massing" && massing > 0)) && samples.violations.length < 20) {
        samples.violations.push({ phase: target.__complete25RacePhase!, native, massing, environment });
      }
    });
  });
  // Atomically start a REAL GeoJSON worker update and activate the observed UI
  // control before it completes. No readiness/query/visibility replacement or
  // synthetic style.load event: deterministic regardless of browser speed.
  const transition = await threeD.evaluate((button, data) => {
    const map = (window as HarnessWindow).__complete25RaceMap!;
    (map.getSource("retained-detailed-native") as GeoJSONSource).setData(data);
    const loading = !map.isStyleLoaded();
    (button as HTMLButtonElement).click();
    return { loading, native: map.getLayoutProperty("geoai-buildings-3d", "visibility"),
      massing2d: map.getLayoutProperty("geoai-concept-fill", "visibility"), massing3d: map.getLayoutProperty("geoai-concept-volume", "visibility"),
      environment: map.getLayoutProperty("geoai-concept-environment-fill", "visibility") };
  }, retainedPlaza);
  expect(transition).toEqual({ loading: true, native: "visible", massing2d: "none", massing3d: "none", environment: "none" });
  await expect(threeD).toHaveAttribute("aria-pressed", "true");
  try {
    await expect.poll(async () => (await state()).nativeCount).toBeGreaterThan(0);
  } catch (error) {
    await info.attach("failed-native-state", { body: JSON.stringify(await state(), null, 2), contentType: "application/json" });
    throw error;
  }
  await expect.poll(async () => (await state()).rings).toEqual([outer, hole]);
  await expect.poll(async () => { const s = await state(); return [s.nativeVisibility, s.massing3d, s.environment, s.environmentCount]; }).toEqual(["visible", "visible", "none", 0]);
  await expect.poll(async () => (await state()).massingCount).toBeGreaterThan(0);
  expect((await state()).holeFillCount).toBe(0);
  await canvas.screenshot({ path: info.outputPath("retained-native-hides-environment-1440.png") });
  await info.attach("retained-state", { body: JSON.stringify(await state(), null, 2), contentType: "application/json" });

  const setNative = (data: FeatureCollection<Polygon>) => page.evaluate(next => {
    const map = (window as HarnessWindow).__complete25RaceMap!;
    (map.getSource("retained-detailed-native") as GeoJSONSource).setData(next);
  }, data);
  await setNative({ type: "FeatureCollection", features: [] });
  await expect.poll(async () => (await state()).environmentCount).toBeGreaterThan(0);
  await canvas.screenshot({ path: info.outputPath("environment-restored-with-hole-1440.png") });
  await page.getByRole("button", { name: "2d", exact: true }).click();
  await expect.poll(async () => (await state()).massing2d).toBe("visible");
  expect((await state()).holeFillCount).toBe(0);
  await threeD.click();
  await page.evaluate(() => { (window as HarnessWindow).__complete25RacePhase = "massing"; });
  await setNative(nativeData(detailed(building)));
  await expect.poll(async () => { const s = await state(); return [s.nativeCount > 0, s.massing3d, s.environment, s.massingCount, s.environmentCount]; }).toEqual([true, "none", "none", 0, 0]);
  await setNative({ type: "FeatureCollection", features: [] });
  await expect.poll(async () => (await state()).environmentCount).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Show map", exact: true }).click();
  await page.evaluate(async () => {
    const map = (window as HarnessWindow).__complete25RaceMap!;
    await new Promise<void>(resolve => {
      map.once("idle", () => resolve());
      map.fitBounds([[55, 25], [55.001, 25.00090909090909]], { padding: { top: 90, right: 30, bottom: 180, left: 30 }, duration: 0 });
    });
  });
  await expect.poll(async () => (await state()).massingCount).toBeGreaterThan(0);
  await expect.poll(async () => (await state()).environmentCount).toBeGreaterThan(0);
  await canvas.screenshot({ path: info.outputPath("environment-restored-with-hole-390.png") });
  const samples = await page.evaluate(() => (window as HarnessWindow).__complete25RaceSamples!);
  await info.attach("transition-render-samples", { body: JSON.stringify(samples, null, 2), contentType: "application/json" });
  expect(samples.total).toBeGreaterThan(0);
  expect(samples.violations).toEqual([]);
  expect(posts).toBe(1);
  expect(unexpectedExternal).toEqual([]);
  expect(errors).toEqual([]);
});
