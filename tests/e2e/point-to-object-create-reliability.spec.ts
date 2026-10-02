import { expect, test, type Page, type Route } from "@playwright/test";
import packageManifest from "../../package.json";
import { externalHttpUrlPattern, installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";
import { demoUser } from "../../src/lib/auth/demo-session";
import { conceptTemplate, generateConceptMassingAlternatives, validatePointObjectCreateAoiVertices, validateRedevelopmentProgram } from "../../src/lib/prototype/point-to-object-create";
import { hashPointObjectOperation } from "../../src/lib/prototype/point-object-projects";
import { parsePointObjectProjectOperationInput, parsePointObjectProjectStore } from "../../src/lib/prototype/point-object-projects-contract";

test.beforeEach(async ({ page, browserName }, testInfo) => {
  await installLoopbackBrowserHarness(page, browserName, testInfo.project.use.baseURL);
});

const createPosts: Array<Record<string, unknown>> = [];
let challengeGets = 0;
let lateResponseGate: Promise<void> | null = null;
let resolveLateResponseGate: (() => void) | null = null;
const fixedControlKeys = ["blockCount", "levelsMin", "levelsMax", "targetSiteCoveragePct", "openSpacePct", "setbackM"];

function armLateResponseGate() {
  if (lateResponseGate) throw new Error("Late response gate is already armed.");
  lateResponseGate = new Promise<void>((resolve) => {
    resolveLateResponseGate = resolve;
  });
}

function releaseLateResponseGate() {
  if (!resolveLateResponseGate) throw new Error("Late response gate is not armed.");
  const resolve = resolveLateResponseGate;
  lateResponseGate = null;
  resolveLateResponseGate = null;
  resolve();
}

test.afterEach(() => {
  resolveLateResponseGate?.();
  lateResponseGate = null;
  resolveLateResponseGate = null;
});

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function fixtureAoiAreaSqM(value: unknown): number {
  const ring = (value as Array<Array<[number, number]>>)[0];
  const latitude = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
  const longitudeScale = 111_320 * Math.cos(latitude * Math.PI / 180);
  const latitudeScale = 110_540;
  let doubleArea = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    doubleArea += ring[index][0] * longitudeScale * ring[index + 1][1] * latitudeScale -
      ring[index + 1][0] * longitudeScale * ring[index][1] * latitudeScale;
  }
  return Math.abs(doubleArea) / 2;
}

function massing(variantId: "A" | "B", generation: number, controls: Record<string, number>, templateId: string, aoiAreaSqM: number) {
  const count = controls.blockCount;
  const features = Array.from({ length: count }, (_, index) => {
    const orderedIndex = variantId === "A" ? index : count - index - 1;
    const longitude = 55.27019 + (orderedIndex % 3) * 0.00012 + generation * 0.000002;
    const latitude = 25.20519 + Math.floor(orderedIndex / 3) * 0.00012 + (variantId === "B" ? 0.000035 : 0);
    // A site-aware count can be shorter than the level range. The offline
    // producer must report real feature extrema, not a nonexistent top floor.
    const levels = Math.round(controls.levelsMin + (count > 1 ? index / (count - 1) : 0) * (controls.levelsMax - controls.levelsMin));
    const id = `concept-${variantId.toLowerCase()}-${generation}-${index + 1}`;
    return {
      type: "Feature" as const,
      id,
      properties: {
        id,
        kind: "concept_massing",
        templateId,
        massingStyle: "campus",
        variantId,
        volumeRole: "campus_block",
        primaryBlock: true,
        use: "civic",
        levels,
        heightM: levels * 3.4,
        baseM: 0,
        label: `Generation ${generation} ${variantId} block ${index + 1}`
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [longitude, latitude],
          [longitude + 0.00005, latitude],
          [longitude + 0.00005, latitude + 0.00005],
          [longitude, latitude + 0.00005],
          [longitude, latitude]
        ]]
      }
    };
  });
  return {
    featureCollection: { type: "FeatureCollection" as const, features },
    variantId,
    massingStyle: "campus",
    requestedBlockCount: controls.blockCount,
    generatedBlockCount: controls.blockCount,
    generatedFeatureCount: features.length,
    aoiAreaSqM,
    generatedFootprintAreaSqM: controls.targetSiteCoveragePct * aoiAreaSqM / 100,
    achievedSiteCoveragePct: controls.targetSiteCoveragePct,
    estimatedFloorAreaSqM: generation * 1_000 + (variantId === "B" ? 500 : 0),
    minGeneratedLevels: Math.min(...features.map(feature => feature.properties.levels)),
    maxGeneratedLevels: Math.max(...features.map(feature => feature.properties.levels)),
    seed: `offline-${generation}-${variantId}`
  };
}

function conceptResponse(request: Record<string, unknown>, generation: number) {
  const controls = request.controls as Record<string, number>;
  const templateId = String(request.templateId);
  const aoiAreaSqM = fixtureAoiAreaSqM(request.aoiCoordinates);
  const a = massing("A", generation, controls, templateId, aoiAreaSqM);
  const b = massing("B", generation, controls, templateId, aoiAreaSqM);
  return {
    mode: "openai_concept",
    generatedAt: "2026-09-05T12:00:00.000Z",
    promptVersion: "POINT_OBJECT_CREATE_PROMPT_V1",
    program: {
      schemaVersion: 1,
      templateId,
      title: `Generation ${generation}`,
      summary: `Generation ${generation} committed result.`,
      massingStyle: "campus",
      ...controls,
      useMix: [
        { use: "civic", sharePct: 100 - controls.openSpacePct },
        { use: "open_space", sharePct: controls.openSpacePct }
      ],
      rationale: ["Bounded offline reliability fixture."]
    },
    massing: a,
    alternatives: [
      { id: "A", label: "Alternative A", massing: a },
      { id: "B", label: "Alternative B", massing: b }
    ],
    telemetry: { model: "offline", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 },
    caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
  };
}

async function installRoutes(page: Page) {
  await page.route(externalHttpUrlPattern(test.info().project.use.baseURL), async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
      await json(route, {
        version: 8,
        name: "Create reliability offline map",
        sources: { openmaptiles: { type: "vector", tiles: ["https://tiles.openfreemap.org/create-e2e/{z}/{x}/{y}.pbf"] } },
        layers: [
          { id: "background", type: "background", paint: { "background-color": "#e8edf0" } },
          { id: "building-fill", type: "fill", source: "openmaptiles", "source-layer": "building", paint: { "fill-color": "#d6dcdf" } }
        ]
      });
      return;
    }
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/create-e2e/")) {
      await route.fulfill({ status: 200, contentType: "application/x-protobuf", body: Buffer.alloc(0) });
      return;
    }
    await route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session", (route) => json(route, { isAuthenticated: false, user: null }));
  await page.route("**/api/prototype/point-to-object/area-context", (route) =>
    json(route, { mode: "unavailable", error: "Offline context failure." }, 503));
  await page.route("**/api/prototype/point-to-object/create", async (route) => {
    if (route.request().method() === "GET") {
      challengeGets += 1;
      await json(route, { mode: "ready", challenge: "A".repeat(43) });
      return;
    }
    const request = route.request().postDataJSON() as Record<string, unknown>;
    createPosts.push(request);
    const requestControls = request.controls as Record<string, number>;
    if (!request.customPrompt && requestControls.targetSiteCoveragePct > 28) {
      await json(route, {
        mode: "programme_adjustment_required",
        error: "A validated lower-coverage candidate is available.",
        suggestion: {
          control: "targetSiteCoveragePct",
          requestedValue: requestControls.targetSiteCoveragePct,
          suggestedValue: 20,
          validatedAchievedValue: 20,
          searchAttempts: 2,
          basis: "bounded_validated_geometry_candidate"
        },
        telemetry: { attempts: 0, providerCalls: 0, estimatedCostUsd: 0 }
      }, 422);
      return;
    }
    if (request.customPrompt === "force failure") {
      await json(route, { mode: "unavailable", error: "Intentional offline failure." }, 503);
      return;
    }
    if (request.customPrompt === "late response") {
      const gate = lateResponseGate;
      if (!gate) throw new Error("Late response gate must be armed before dispatch.");
      await gate;
    }
    await json(route, conceptResponse(request, createPosts.length)).catch(() => undefined);
  });
}

async function addLateBuildingLayer(page: Page) {
  await page.evaluate(() => {
    type HookNode = { memoizedState: unknown; next: HookNode | null };
    type FiberNode = { memoizedState: HookNode | null; return: FiberNode | null };
    type TestMap = {
      addLayer: (layer: Record<string, unknown>) => unknown;
      getFilter: (layerId: string) => unknown;
      on: (event: "styledata", handler: () => void) => unknown;
      setFilter: (layerId: string, filter: unknown) => unknown;
      setPaintProperty: (layerId: string, property: string, value: unknown) => unknown;
    };
    type Harness = {
      map: TestMap;
      originalFilter: unknown;
      setFilterCalls: number;
      effectiveSetFilterChanges: number;
      styleDataEvents: number;
    };
    const canvas = document.querySelector<HTMLElement>("[data-testid='live-map-canvas']");
    if (!canvas) throw new Error("Map canvas not found.");
    const fiberKey = Object.getOwnPropertyNames(canvas).find((key) => key.startsWith("__reactFiber$"));
    if (!fiberKey) throw new Error("React fiber not found on map canvas.");
    let fiber: FiberNode | null = (canvas as unknown as Record<string, FiberNode>)[fiberKey];
    let map: TestMap | null = null;
    while (fiber && !map) {
      let hook = fiber.memoizedState;
      while (hook) {
        const value = hook.memoizedState as { current?: unknown } | null;
        const candidate = value?.current as Partial<TestMap> | null | undefined;
        if (candidate && typeof candidate.addLayer === "function" && typeof candidate.getFilter === "function" && typeof candidate.setFilter === "function") {
          map = candidate as TestMap;
          break;
        }
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    if (!map) throw new Error("MapLibre instance not found in LiveObjectMap hooks.");

    const originalFilter = ["==", ["get", "kind"], "main"];
    const harness: Harness = { map, originalFilter, setFilterCalls: 0, effectiveSetFilterChanges: 0, styleDataEvents: 0 };
    const originalSetFilter = map.setFilter.bind(map);
    map.setFilter = (layerId, filter) => {
      if (layerId === "late-building") {
        harness.setFilterCalls += 1;
        if (JSON.stringify(map.getFilter(layerId)) !== JSON.stringify(filter)) {
          harness.effectiveSetFilterChanges += 1;
        }
      }
      return originalSetFilter(layerId, filter);
    };
    map.on("styledata", () => {
      harness.styleDataEvents += 1;
    });
    (window as typeof window & { __geoAiLateBuildingHarness?: Harness }).__geoAiLateBuildingHarness = harness;
    map.addLayer({
      id: "late-building",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      filter: originalFilter,
      paint: { "fill-color": "#cbd5da" }
    });
  });
}

async function readLateBuildingLayerState(page: Page) {
  return page.evaluate(() => {
    type Harness = {
      map: { getFilter: (layerId: string) => unknown };
      originalFilter: unknown;
      setFilterCalls: number;
      effectiveSetFilterChanges: number;
      styleDataEvents: number;
    };
    const harness = (window as typeof window & { __geoAiLateBuildingHarness?: Harness }).__geoAiLateBuildingHarness;
    if (!harness) throw new Error("Late-building harness is not installed.");
    const filter = harness.map.getFilter("late-building");
    return {
      filter,
      originalFilter: harness.originalFilter,
      setFilterCalls: harness.setFilterCalls,
      effectiveSetFilterChanges: harness.effectiveSetFilterChanges,
      styleDataEvents: harness.styleDataEvents
    };
  });
}

async function installSpatialReplacementFixture(page: Page) {
  // Canvas DOM can be visible before the async MapLibre import populates the
  // React map ref. Read readiness without mutating the fixture or sleeping.
  await expect.poll(() => page.evaluate(() => {
    type Hook = { memoizedState: unknown; next: Hook | null };
    type Fiber = { memoizedState: Hook | null; return: Fiber | null };
    const canvas = document.querySelector("[data-testid='live-map-canvas']");
    if (!canvas) return false;
    const key = Object.getOwnPropertyNames(canvas).find(key => key.startsWith("__reactFiber$"));
    if (!key) return false;
    let fiber: Fiber | null = (canvas as unknown as Record<string, Fiber>)[key];
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const candidate = (hook.memoizedState as { current?: { addSource?: unknown; jumpTo?: unknown; isStyleLoaded?: () => boolean } } | null)?.current;
        if (typeof candidate?.addSource === "function" && typeof candidate.jumpTo === "function" && candidate.isStyleLoaded?.()) return true;
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    return false;
  }), { message: "MapLibre map ref and style must be ready before installing the spatial fixture" }).toBe(true);
  await page.evaluate(async () => {
    type HookNode = { memoizedState: unknown; next: HookNode | null };
    type FiberNode = { memoizedState: HookNode | null; return: FiberNode | null };
    type FixtureMap = {
      addLayer: (layer: Record<string, unknown>) => unknown;
      addSource: (sourceId: string, source: Record<string, unknown>) => unknown;
      fire: (event: string, data: Record<string, unknown>) => unknown;
      getFilter: (layerId: string) => unknown;
      getLayer: (layerId: string) => unknown;
      getSource: (sourceId: string) => unknown;
      isStyleLoaded: () => boolean;
      jumpTo: (options: Record<string, unknown>) => unknown;
      once: (event: "idle" | "style.load", handler: () => void) => unknown;
      remove: () => unknown;
      removeLayer: (layerId: string) => unknown;
      removeSource: (sourceId: string) => unknown;
    };
    const canvas = document.querySelector<HTMLElement>("[data-testid='live-map-canvas']");
    if (!canvas) throw new Error("Map canvas not found.");
    const fiberKey = Object.getOwnPropertyNames(canvas).find((key) => key.startsWith("__reactFiber$"));
    if (!fiberKey) throw new Error("React fiber not found on map canvas.");
    let fiber: FiberNode | null = (canvas as unknown as Record<string, FiberNode>)[fiberKey];
    let map: FixtureMap | null = null;
    while (fiber && !map) {
      let hook = fiber.memoizedState;
      while (hook) {
        const value = hook.memoizedState as { current?: unknown } | null;
        const candidate = value?.current as Partial<FixtureMap> | null | undefined;
        if (candidate && typeof candidate.addSource === "function" && typeof candidate.jumpTo === "function") {
          map = candidate as FixtureMap;
          break;
        }
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    if (!map) throw new Error("MapLibre instance not found.");
    // AOI setData can transiently unset readiness after style.load has already
    // fired. Observe current readiness instead of waiting for that one-shot event.
    const styleDeadline = performance.now() + 5_000;
    while (!map.isStyleLoaded()) {
      if (performance.now() >= styleDeadline) throw new Error("MapLibre style did not become ready.");
      await new Promise<void>((resolve) => window.setTimeout(resolve, 25));
    }

    const sourceId = "geoai-spatial-replacement-fixture";
    const layerId = "geoai-buildings-3d";
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: 501,
            properties: { fixture: "inside-target" },
            geometry: { type: "Polygon", coordinates: [[[55.27020, 25.20520], [55.27030, 25.20520], [55.27030, 25.20530], [55.27020, 25.20530], [55.27020, 25.20520]]] }
          },
          {
            type: "Feature",
            id: 501,
            properties: { fixture: "outside-landmark" },
            geometry: { type: "Polygon", coordinates: [[[55.27160, 25.20520], [55.27170, 25.20520], [55.27170, 25.20530], [55.27160, 25.20530], [55.27160, 25.20520]]] }
          },
          {
            type: "Feature",
            id: 502,
            properties: { fixture: "multipart-landmark" },
            geometry: {
              type: "MultiPolygon",
              coordinates: [
                [[[55.27045, 25.20520], [55.27055, 25.20520], [55.27055, 25.20530], [55.27045, 25.20530], [55.27045, 25.20520]]],
                [[[55.27130, 25.20520], [55.27140, 25.20520], [55.27140, 25.20530], [55.27130, 25.20530], [55.27130, 25.20520]]]
              ]
            }
          },
          {
            type: "Feature",
            properties: { fixture: "boundary-crossing" },
            geometry: { type: "Polygon", coordinates: [[[55.27060, 25.20540], [55.27075, 25.20540], [55.27075, 25.20550], [55.27060, 25.20550], [55.27060, 25.20540]]] }
          }
        ]
      }
    });
    map.addLayer({
      id: layerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": ["match", ["get", "fixture"], "inside-target", "#d94841", "outside-landmark", "#146c43", "multipart-landmark", "#2458a6", "#8a5a12"],
        "fill-opacity": 1,
        "fill-outline-color": "#111827"
      }
    });
    const mapAtInstall = map;
    const originalRemove = mapAtInstall.remove.bind(mapAtInstall);
    mapAtInstall.remove = () => {
      const filterAtRemove = mapAtInstall.getLayer(layerId) ? mapAtInstall.getFilter(layerId) : null;
      window.sessionStorage.setItem("geoai-spatial-filter-at-remove", JSON.stringify(filterAtRemove ?? null));
      return originalRemove();
    };
    map.jumpTo({ center: [55.27095, 25.20535], zoom: 16, pitch: 0, bearing: 0 });
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      map.once("idle", finish);
      window.setTimeout(finish, 1_500);
    });
    (window as typeof window & { __geoAiSpatialReplacementMap?: FixtureMap }).__geoAiSpatialReplacementMap = map;
  });
}

async function focusSpatialReplacementFixture(page: Page, zoom = 16) {
  await page.evaluate(async (nextZoom) => {
    type FixtureMap = {
      jumpTo: (options: Record<string, unknown>) => unknown;
      once: (event: "idle", handler: () => void) => unknown;
    };
    const map = (window as typeof window & { __geoAiSpatialReplacementMap?: FixtureMap }).__geoAiSpatialReplacementMap;
    if (!map) throw new Error("Spatial replacement fixture is not installed.");
    map.jumpTo({ center: [55.27095, 25.20535], zoom: nextZoom, pitch: 0, bearing: 0 });
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      map.once("idle", finish);
      window.setTimeout(finish, 1_500);
    });
  }, zoom);
}

async function readSpatialReplacementFixture(page: Page) {
  return page.evaluate(() => {
    type FixtureMap = {
      getFilter: (layerId: string) => unknown;
      getLayer: (layerId: string) => unknown;
      getLayoutProperty: (layerId: string, property: string) => unknown;
      getZoom: () => number;
      project: (coordinate: [number, number]) => { x: number; y: number };
      queryRenderedFeatures: (point: { x: number; y: number }, options: { layers: string[] }) => Array<{ properties?: Record<string, unknown> }>;
    };
    const map = (window as typeof window & { __geoAiSpatialReplacementMap?: FixtureMap }).__geoAiSpatialReplacementMap;
    if (!map) throw new Error("Spatial replacement fixture is not installed.");
    const retainedLayer = "geoai-existing-partition-layer:geoai-buildings-3d";
    const layers = ["geoai-buildings-3d", ...(map.getLayer(retainedLayer) ? [retainedLayer] : [])];
    const visible = (coordinate: [number, number], fixture: string) =>
      map.queryRenderedFeatures(map.project(coordinate), { layers })
        .some((feature) => feature.properties?.fixture === fixture);
    const filter = map.getFilter("geoai-buildings-3d");
    return {
      filter,
      zoom: map.getZoom(),
      conceptVisibility: map.getLayoutProperty("geoai-concept-volume", "visibility"),
      insideTarget: visible([55.27025, 25.20525], "inside-target"),
      outsideLandmark: visible([55.27165, 25.20525], "outside-landmark"),
      multipartInside: visible([55.27050, 25.20525], "multipart-landmark"),
      multipartOutside: visible([55.27135, 25.20525], "multipart-landmark"),
      boundaryOutside: visible([55.27070, 25.20545], "boundary-crossing")
    };
  });
}

test.describe("Sprint06 touch input", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("drawing keeps vertices across mode switches and explicit cancel discards only the draft", async ({ page }, testInfo) => {
    await installRoutes(page);
    await page.goto("/prototype/point-to-object");
    await expect(page.getByText("Live map ready for object selection.")).toBeAttached();
    await page.getByRole("tab", { name: "Create", exact: true }).tap();
    await page.getByRole("button", { name: "Draw area", exact: true }).tap();
    const tools = page.getByTestId("create-map-drawing-tools");
    await expect(tools).toContainText("(0/25)");
    await page.touchscreen.tap(140, 260);
    await expect(tools).toContainText("(1/25)");
    await page.touchscreen.tap(240, 260);
    await expect(tools).toContainText("(2/25)");
    await page.mouse.move(170, 340);
    await page.mouse.down();
    await page.mouse.move(210, 380, { steps: 8 });
    await page.mouse.up();
    await expect(tools).toContainText("(2/25)");
    await page.getByRole("tab", { name: "Find", exact: true }).tap();
    await page.getByRole("tab", { name: "Create", exact: true }).tap();
    await page.getByRole("button", { name: "Edit drawing", exact: true }).tap();
    await expect(tools).toContainText("(2/25)");
    await page.touchscreen.tap(200, 350);
    await expect(tools).toContainText("(3/25)");
    await page.screenshot({ path: testInfo.outputPath("mobile-touch-drawing.png") });
    await tools.getByRole("button", { name: "Finish area", exact: true }).tap();
    await expect(page.getByTestId("create-edit-area")).toBeVisible();
    await page.getByTestId("create-edit-area").tap();
    await tools.getByRole("button", { name: "Undo", exact: true }).tap();
    await tools.getByRole("button", { name: "Cancel", exact: true }).tap();
    await expect(page.getByTestId("create-edit-area")).toBeVisible();
    await page.getByTestId("create-delete-area").tap();
    await page.getByRole("button", { name: "Draw area", exact: true }).tap();
    await expect(tools).toContainText("(0/25)");
    await tools.getByRole("button", { name: "Cancel", exact: true }).tap();
    await expect(tools).toHaveCount(0);
  });
});

for (const width of [390, 430]) {
  test(`Sprint06 mobile ${width}: mounted map, recoverable Create and request-free navigation`, async ({ page }, testInfo) => {
    createPosts.length = 0;
    challengeGets = 0;
    let areaRequests = 0;
    page.on("request", (request) => { if (request.url().endsWith("/area-context")) areaRequests += 1; });
    await installRoutes(page);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 932 });
    await page.goto("/prototype/point-to-object");
    const shell = page.getByTestId("mobile-workspace-shell");
    const canvas = page.getByTestId("live-map-canvas");
    await expect(shell).toHaveAttribute("data-sheet", "peek");
    await expect(canvas).toBeVisible();
    const mapHeight = (await canvas.boundingBox())!.height;
    expect(mapHeight).toBe((width === 390 ? 844 : 932) - 64);
    await canvas.evaluate((element) => element.setAttribute("data-mount-proof", "retained"));
    await page.screenshot({ path: testInfo.outputPath("mobile-peek-en.png") });
    await page.getByRole("button", { name: "Open task", exact: true }).click();
    await expect(shell).toHaveAttribute("data-sheet", "full");
    await expect(canvas.locator("xpath=ancestor::section")).toHaveAttribute("inert", "");
    await page.getByRole("button", { name: "Reduce task to half height", exact: true }).click();
    await expect(shell).toHaveAttribute("data-sheet", "half");
    await page.getByRole("tab", { name: "Create", exact: true }).click();
    await page.getByLabel("Upload GeoJSON").setInputFiles({
      name: "sprint06-public-fixture.geojson", mimeType: "application/geo+json",
      buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: [[
        [55.26955, 25.20455], [55.27065, 25.20455], [55.27065, 25.20565],
        [55.26955, 25.20565], [55.26955, 25.20455]
      ]] }))
    });
    await expect(page.getByText("Area context is temporarily unavailable.")).toBeVisible();
    await page.getByRole("button", { name: "Public campus" }).click();
    await page.getByTestId("create-generate-action").click();
    await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
    await page.getByTestId("create-open-result-dashboard").click();
    await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
    await expect(page.getByTestId("create-preview-mode-2d")).toHaveAttribute("aria-pressed", "true");
    const resultPreview = page.getByTestId("create-result-preview-3d");
    await expect(resultPreview).toBeVisible();
    await expect(resultPreview).toHaveAttribute("data-preview-status", "ready");
    await expect(resultPreview).toHaveAttribute("data-preview-variant", "A");
    await expect(resultPreview).toHaveAttribute("data-preview-feature-count", String((createPosts[0].controls as Record<string, number>).blockCount));
    await expect(resultPreview).toHaveAttribute("data-preview-max-height-m", "27.2");
    const previewCanvas = page.getByTestId("create-result-preview-3d-canvas");
    await expect(previewCanvas).toBeVisible();
    const previewCanvasBox = await previewCanvas.boundingBox();
    expect(previewCanvasBox?.width).toBeGreaterThan(0);
    expect(previewCanvasBox?.height).toBeGreaterThan(0);
    await expect(page.getByRole("heading", { name: "Geometric KPIs" })).toBeVisible();
    await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "A");
    await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-estimated-floor-area-sqm", "1000");
    await expect(page.getByText("Saved concept · 2D", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("create-full-result-dashboard-en.png"), fullPage: true });
    await expect(page.getByRole("button", { name: "Back to parameters", exact: true })).toBeFocused();
    const dashboardAlternativeB = page.getByTestId("create-dashboard-alternative-b");
    await dashboardAlternativeB.press("Enter");
    await expect(dashboardAlternativeB).toHaveAttribute("aria-selected", "true");
    await expect(dashboardAlternativeB).toBeFocused();
    await expect(resultPreview).toHaveAttribute("data-preview-variant", "B");
    await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
    await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-estimated-floor-area-sqm", "1500");
    expect(createPosts).toHaveLength(1);
    expect(challengeGets).toBe(1);
    await page.getByRole("button", { name: "Back to parameters", exact: true }).click();
    await expect(page.getByTestId("create-alternative-b")).toHaveAttribute("aria-selected", "true");
    await page.getByTestId("create-delete-area").click();
    await page.getByTestId("create-undo-remove").click();
    await expect(page.getByTestId("generated-concept-metrics")).toContainText("1,500");
    await page.getByTestId("create-edit-area").click();
    await expect(shell).toHaveAttribute("data-sheet", "peek");
    await page.getByTestId("create-map-drawing-tools").getByRole("button", { name: "Undo", exact: true }).click();
    await page.getByTestId("create-map-drawing-tools").getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByTestId("generated-concept-metrics")).toContainText("1,500");
    await page.getByRole("button", { name: "Show map", exact: true }).click();
    await page.getByRole("button", { name: "Camera", exact: true }).click();
    await page.getByRole("button", { name: "Rotate left", exact: true }).click();
    await page.getByRole("button", { name: "Reset north", exact: true }).click();
    await page.getByRole("button", { name: "3d", exact: true }).click();
    await page.getByRole("button", { name: "Camera", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-mount-proof", "retained");
    expect((await canvas.boundingBox())!.height).toBe(mapHeight);
    await page.getByRole("tab", { name: "Find", exact: true }).click();
    await expect(page.getByTestId("find-search-cta")).toBeDisabled();
    await expect(page.getByTestId("find-search-cta")).toBeEnabled();
    await expect(page.getByTestId("find-search-cta")).toBeVisible();
    await expect(page.getByTestId("find-drawer").getByText("B2B", { exact: true })).toHaveCount(0);
    await page.getByRole("tab", { name: "Analyse", exact: true }).click();
    await page.getByRole("tab", { name: "Create", exact: true }).click();
    await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
    await expect(page.getByTestId("generated-concept-metrics")).toContainText("1,500");
    await page.getByTestId("create-open-result-dashboard").click();
    await expect(page.getByTestId("create-dashboard-alternative-b")).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "Show on map", exact: true }).click();
    await expect(shell).toHaveAttribute("data-sheet", "peek");
    expect(areaRequests).toBe(1);
    expect(createPosts).toHaveLength(1);
    expect(challengeGets).toBe(1);
    await page.getByRole("button", { name: "ru", exact: true }).click();
    await expect(page.getByRole("button", { name: "Открыть задачу", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("mobile-peek-ru.png") });
    await page.getByRole("button", { name: "Открыть задачу", exact: true }).click();
    await page.setViewportSize({ width: 640, height: 450 });
    await expect(page.getByTestId("mobile-sheet-resize")).toBeHidden();
    await expect(page.getByTestId("create-generate-action")).toBeAttached();
    await page.getByRole("button", { name: "На карту", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-mount-proof", "retained");
    await page.setViewportSize({ width: 1280, height: 900 });
    expect((await page.locator("#workspace-task").boundingBox())!.width).toBe(430);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(createPosts).toHaveLength(1);
    expect(challengeGets).toBe(1);
    await page.screenshot({ path: testInfo.outputPath("desktop-create-ru.png") });
  });
}

test("Create separates draft from committed geometry and never spends on local-only actions", async ({ page }, testInfo) => {
  createPosts.length = 0;
  challengeGets = 0;
  await installRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object");
  await page.getByRole("tab", { name: "Create" }).click();
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: "create-reliability.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [55.26955, 25.20455],
        [55.27065, 25.20455],
        [55.27065, 25.20565],
        [55.26955, 25.20565],
        [55.26955, 25.20455]
      ]]
    }))
  });
  await expect(page.getByText("Area context is temporarily unavailable.")).toBeVisible();
  await page.getByRole("button", { name: "Public campus" }).click();
  await page.getByText("Concept parameters", { exact: true }).click();
  await page.getByRole("slider", { name: "Blocks" }).press("ArrowRight");
  expect(createPosts).toHaveLength(0);
  expect(challengeGets).toBe(0);

  const generate = page.getByTestId("create-generate-action");
  await expect(generate).toHaveText("Generate concept");
  await generate.click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
  await expect(generate).toHaveText("Already generated");
  await expect(generate).toBeDisabled();
  expect(createPosts).toHaveLength(1);
  expect(challengeGets).toBe(1);
  expect(createPosts[0].lockedControlKeys).toEqual(["blockCount"]);

  await page.getByTestId("create-alternative-b").click();
  await expect(page.getByTestId("generated-concept-metrics")).toContainText("1,500");
  await page.getByTestId("create-alternative-a").click();
  await expect(page.getByTestId("generated-concept-metrics")).toContainText("1,000");
  expect(createPosts).toHaveLength(1);
  expect(challengeGets).toBe(1);

  await page.getByTestId("reset-edited-create-controls").click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
  await expect(page.getByTestId("create-draft-status")).toBeVisible();
  await expect(generate).toHaveText("Update concept");
  await generate.click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 2 committed result.");
  expect(createPosts).toHaveLength(2);
  expect(challengeGets).toBe(2);
  expect(createPosts[1].lockedControlKeys).toEqual([]);

  const prompt = page.getByLabel("Custom direction");
  await prompt.fill("force failure");
  await generate.click();
  await expect(page.getByTestId("create-generation-error")).toContainText("previous valid result remains available");
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 2 committed result.");
  expect(createPosts).toHaveLength(3);

  armLateResponseGate();
  await prompt.fill("late response");
  await generate.click();
  await expect.poll(() => createPosts.length).toBe(4);
  await prompt.fill("newer draft");
  releaseLateResponseGate();
  await expect(generate).toHaveText("Update concept");
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 2 committed result.");
  expect(createPosts).toHaveLength(4);

  await test.step("a late empty building layer remains unmodified and does not trigger a reconciliation loop", async () => {
    await addLateBuildingLayer(page);
    await expect.poll(async () => {
      const state = await readLateBuildingLayerState(page);
      return {
        filter: state.filter,
        setFilterCalls: state.setFilterCalls
      };
    }).toEqual({ filter: ["==", ["get", "kind"], "main"], setFilterCalls: 0 });

    const styleDataEventsBeforeUnrelatedChange = (await readLateBuildingLayerState(page)).styleDataEvents;
    const setFilterCallsBeforeUnrelatedChange = (await readLateBuildingLayerState(page)).setFilterCalls;
    await page.evaluate(() => {
      type Harness = { map: { setPaintProperty: (layerId: string, property: string, value: unknown) => unknown } };
      const harness = (window as typeof window & { __geoAiLateBuildingHarness?: Harness }).__geoAiLateBuildingHarness;
      if (!harness) throw new Error("Late-building harness is not installed.");
      harness.map.setPaintProperty("background", "background-color", "#e7ecef");
    });
    await expect.poll(async () => (await readLateBuildingLayerState(page)).styleDataEvents)
      .toBeGreaterThan(styleDataEventsBeforeUnrelatedChange);
    await expect.poll(async () => (await readLateBuildingLayerState(page)).setFilterCalls)
      .toBe(setFilterCallsBeforeUnrelatedChange);

    await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
    await expect.poll(async () => (await readLateBuildingLayerState(page)).filter)
      .toEqual(["==", ["get", "kind"], "main"]);
    await page.getByRole("button", { name: "3d", exact: true }).press("Enter");
    await expect.poll(async () => (await readLateBuildingLayerState(page)).filter)
      .toEqual(["==", ["get", "kind"], "main"]);

    const effectiveChangesBeforeCycles = (await readLateBuildingLayerState(page)).effectiveSetFilterChanges;
    for (let cycle = 0; cycle < 5; cycle += 1) {
      await page.getByTestId("create-map-presentation-toggle").click();
      await expect.poll(async () => (await readLateBuildingLayerState(page)).filter)
        .toEqual(["==", ["get", "kind"], "main"]);
      await page.getByTestId("create-map-presentation-toggle").click();
      await expect.poll(async () => (await readLateBuildingLayerState(page)).filter)
        .toEqual(["==", ["get", "kind"], "main"]);
    }
    // With no returned source footprint, replacement must fail safe: the
    // original filter remains byte-equivalent through every local toggle.
    await expect.poll(async () => (await readLateBuildingLayerState(page)).effectiveSetFilterChanges)
      .toBe(effectiveChangesBeforeCycles);

    // Keep the raw-call no-loop check: an unrelated style event must not cause
    // any replacement reapplication, including a same-value no-op.
    const settledState = await readLateBuildingLayerState(page);
    await page.evaluate(() => {
      type Harness = { map: { setPaintProperty: (layerId: string, property: string, value: unknown) => unknown } };
      const harness = (window as typeof window & { __geoAiLateBuildingHarness?: Harness }).__geoAiLateBuildingHarness;
      if (!harness) throw new Error("Late-building harness is not installed.");
      harness.map.setPaintProperty("background", "background-color", "#edf1f4");
    });
    await expect.poll(async () => (await readLateBuildingLayerState(page)).styleDataEvents)
      .toBeGreaterThan(settledState.styleDataEvents);
    expect((await readLateBuildingLayerState(page)).setFilterCalls).toBe(settledState.setFilterCalls);

    await page.getByLabel("Map style").selectOption("light");
    await expect.poll(async () => page.evaluate(() => {
      type Harness = { map: { isStyleLoaded: () => boolean } };
      const harness = (window as typeof window & { __geoAiLateBuildingHarness?: Harness }).__geoAiLateBuildingHarness;
      return harness?.map.isStyleLoaded() ?? false;
    })).toBe(true);
    await addLateBuildingLayer(page);
    await expect.poll(async () => {
      const state = await readLateBuildingLayerState(page);
      return { filter: state.filter, setFilterCalls: state.setFilterCalls };
    }).toEqual({ filter: ["==", ["get", "kind"], "main"], setFilterCalls: 0 });
    await page.getByTestId("create-map-presentation-toggle").click();
    await expect.poll(async () => (await readLateBuildingLayerState(page)).filter)
      .toEqual(["==", ["get", "kind"], "main"]);
  });

  await page.screenshot({ path: testInfo.outputPath("draft-generated-separation.png") });
  await page.getByTestId("create-clear-generated").click();
  await expect(page.getByTestId("generated-concept-summary")).toHaveCount(0);
  await expect(generate).toHaveText("Generate concept");
});

test("Security06 reapplies the latest Create alternative after pending source work becomes idle", async ({ page }) => {
  createPosts.length = 0;
  await installRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object");
  await page.getByRole("tab", { name: "Create" }).click();
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: "pending-source.geojson", mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: [[[55.26955, 25.20455], [55.27065, 25.20455], [55.27065, 25.20565], [55.26955, 25.20565], [55.26955, 25.20455]]] }))
  });
  await expect(page.getByText("Area context is temporarily unavailable.")).toBeVisible();
  await installSpatialReplacementFixture(page);
  await page.getByRole("button", { name: "Public campus" }).click();
  await page.getByTestId("create-generate-action").click();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await focusSpatialReplacementFixture(page);
  await expect.poll(async () => (await readSpatialReplacementFixture(page)).insideTarget).toBe(false);
  await page.evaluate(() => {
    const fixture = window as typeof window & { __geoAiSpatialReplacementMap?: { isStyleLoaded: () => boolean; triggerRepaint: () => void }; __releaseSourceReadiness?: () => void };
    const map = fixture.__geoAiSpatialReplacementMap!;
    const original = map.isStyleLoaded.bind(map);
    map.isStyleLoaded = () => false;
    fixture.__releaseSourceReadiness = () => { map.isStyleLoaded = original; map.triggerRepaint(); };
  });
  await page.getByTestId("create-alternative-b").click();
  await page.getByTestId("create-alternative-a").click();
  await expect(page.getByRole("status").filter({ hasText: "Preparing building replacement" })).toBeVisible();
  await page.evaluate(() => (window as typeof window & { __releaseSourceReadiness?: () => void }).__releaseSourceReadiness?.());
  await expect(page.getByRole("status").filter({ hasText: "Preparing building replacement" })).toHaveCount(0);
  await expect(page.getByTestId("create-alternative-a")).toHaveAttribute("aria-selected", "true");
  await expect.poll(async () => (await readSpatialReplacementFixture(page)).insideTarget).toBe(false);
  expect((await readSpatialReplacementFixture(page)).outsideLandmark).toBe(true);
  expect(createPosts).toHaveLength(1);
});

test("actual MapLibre rendering hides only the internal target and retains outside geometry", async ({ page }, testInfo) => {
  createPosts.length = 0;
  challengeGets = 0;
  await installRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object");
  // The ESM worker must load its sibling module from this deployment, not a CDN.
  for (const asset of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
    const response = await page.request.get(`/_next/static/maplibre/${packageManifest.dependencies["maplibre-gl"]}/${asset}`);
    expect(response.status(), asset).toBe(200);
    expect(response.headers()["content-type"], asset).toMatch(/(?:application|text)\/javascript/);
  }
  await page.getByRole("tab", { name: "Create" }).click();
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: "spatial-replacement-browser-fixture.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [55.26955, 25.20455],
        [55.27065, 25.20455],
        [55.27065, 25.20565],
        [55.26955, 25.20565],
        [55.26955, 25.20455]
      ]]
    }))
  });
  await expect(page.getByText("Area context is temporarily unavailable.")).toBeVisible();
  await installSpatialReplacementFixture(page);
  await expect.poll(async () => {
    const state = await readSpatialReplacementFixture(page);
    return {
      filterRestored: state.filter == null,
      insideTarget: state.insideTarget,
      outsideLandmark: state.outsideLandmark,
      multipartInside: state.multipartInside,
      multipartOutside: state.multipartOutside,
      boundaryOutside: state.boundaryOutside
    };
  }).toEqual({ filterRestored: true, insideTarget: true, outsideLandmark: true, multipartInside: true, multipartOutside: true, boundaryOutside: true });

  await page.getByRole("button", { name: "Public campus" }).click();
  await page.getByTestId("create-generate-action").click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
  await focusSpatialReplacementFixture(page);
  await expect.poll(async () => {
    const state = await readSpatialReplacementFixture(page);
    return {
      filterApplied: JSON.stringify(state.filter).includes('"distance"') &&
        JSON.stringify(state.filter).includes('"inside-target"') &&
        JSON.stringify(state.filter).includes('"multipart-landmark"'),
      insideTarget: state.insideTarget,
      outsideLandmark: state.outsideLandmark,
      multipartInside: state.multipartInside,
      multipartOutside: state.multipartOutside,
      boundaryOutside: state.boundaryOutside
    };
  }).toEqual({
    filterApplied: true,
    insideTarget: false,
    outsideLandmark: true,
    multipartInside: false,
    multipartOutside: true,
    boundaryOutside: true
  });
  // Complete exterior members move to a retained layer. Compare exact source
  // tile coordinates, not the pre-tiling GeoJSON (which MapLibre quantizes).
  expect(await page.evaluate(async () => {
    const map = (window as unknown as { __geoAiSpatialReplacementMap: import("maplibre-gl").Map }).__geoAiSpatialReplacementMap;
    const sourceId = "geoai-spatial-replacement-fixture";
    const nativeParts = map.querySourceFeatures(sourceId).filter(feature => feature.properties.fixture === "multipart-landmark")
      .flatMap(feature => feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [])
      .filter(part => part[0].every(position => position[0] > 55.271));
    const data = await (map.getSource(`geoai-existing-partition-source:${sourceId}`) as import("maplibre-gl").GeoJSONSource).getData() as import("geojson").FeatureCollection;
    const retained = data.features.filter(feature => feature.properties?.fixture === "multipart-landmark");
    const retainedParts = retained.flatMap(feature => feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : []);
    const bytes = (parts: unknown[]) => [...new Set(parts.map(part => JSON.stringify(part)))].sort();
    const outside = map.project([55.27135, 25.20525]);
    const at = (layer: string) => map.queryRenderedFeatures(outside, { layers: [layer] }).some(feature => feature.properties.fixture === "multipart-landmark");
    return {
      exactExteriorBytes: nativeParts.length > 0 && JSON.stringify(bytes(retainedParts)) === JSON.stringify(bytes(nativeParts)),
      exactProperties: retained.length > 0 && retained.every(feature => JSON.stringify(feature.properties) === JSON.stringify({ fixture: "multipart-landmark" })),
      retainedOutside: at("geoai-existing-partition-layer:geoai-buildings-3d"),
      nativeOutside: at("geoai-buildings-3d")
    };
  })).toEqual({ exactExteriorBytes: true, exactProperties: true, retainedOutside: true, nativeOutside: false });

  await focusSpatialReplacementFixture(page, 12);
  await expect(page.getByText("Zoom in to view the concept.")).toBeVisible();
  await expect(page.getByText("Safe replacement could not be applied: source buildings were restored and the concept is hidden.")).toHaveCount(0);
  await expect.poll(async () => {
    const state = await readSpatialReplacementFixture(page);
    const mask = await page.evaluate(async () => {
      const map = (window as unknown as { __geoAiSpatialReplacementMap: import("maplibre-gl").Map }).__geoAiSpatialReplacementMap;
      const layer = map.getLayer("geoai-create-aoi-low-zoom-mask");
      const data = await (map.getSource("geoai-create-aoi") as import("maplibre-gl").GeoJSONSource).getData() as import("geojson").FeatureCollection;
      const aoi = data.features.find(feature => feature.properties?.kind === "aoi");
      return {
        visibility: map.getLayoutProperty("geoai-create-aoi-low-zoom-mask", "visibility"),
        source: layer && "source" in layer ? layer.source : null,
        opacity: map.getPaintProperty("geoai-create-aoi-low-zoom-mask", "fill-opacity"),
        filter: map.getFilter("geoai-create-aoi-low-zoom-mask"),
        geometry: aoi?.geometry
      };
    });
    return { filterRestored: state.filter == null, zoom: state.zoom, conceptVisibility: state.conceptVisibility, mask };
  }).toEqual({
    filterRestored: true, zoom: 12, conceptVisibility: "visible",
    mask: {
      visibility: "visible", source: "geoai-create-aoi", opacity: 1,
      filter: ["==", ["get", "kind"], "aoi"],
      geometry: { type: "Polygon", coordinates: [[
        [55.26955, 25.20455], [55.27065, 25.20455], [55.27065, 25.20565],
        [55.26955, 25.20565], [55.26955, 25.20455]
      ]] }
    }
  });
  await focusSpatialReplacementFixture(page, 16);
  await expect(page.getByText("Zoom in to view the concept.")).toHaveCount(0);
  await expect(page.getByText("Safe replacement could not be applied: source buildings were restored and the concept is hidden.")).toHaveCount(0);
  await expect.poll(async () => (await readSpatialReplacementFixture(page)).insideTarget).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("spatial-replacement-outside-retained.png") });

  await expect.poll(async () => page.evaluate(() => {
    const map = (window as unknown as { __geoAiSpatialReplacementMap: import("maplibre-gl").Map }).__geoAiSpatialReplacementMap;
    return map.loaded();
  }), { timeout: 10_000 }).toBe(true);
  await page.evaluate(() => {
    type MutableMap = {
      getStyle: () => { sources?: Record<string, unknown> };
      getSource: (sourceId: string) => unknown;
      setFilter: (...args: unknown[]) => unknown;
      setLayoutProperty: (...args: unknown[]) => unknown;
    };
    type MutableSource = { setData?: (...args: unknown[]) => unknown };
    type Probe = {
      counts: { conceptLayoutWrites: number; filterWrites: number; dataWrites: number };
      restore: () => void;
    };
    const map = (window as unknown as { __geoAiSpatialReplacementMap: MutableMap }).__geoAiSpatialReplacementMap;
    const counts = { conceptLayoutWrites: 0, filterWrites: 0, dataWrites: 0 };
    const restorers: Array<() => void> = [];
    const originalSetLayoutProperty = map.setLayoutProperty;
    map.setLayoutProperty = function (...args: unknown[]) {
      if (args[0] === "geoai-concept-fill" || args[0] === "geoai-concept-volume") counts.conceptLayoutWrites += 1;
      return originalSetLayoutProperty.apply(this, args);
    };
    restorers.push(() => { map.setLayoutProperty = originalSetLayoutProperty; });
    const originalSetFilter = map.setFilter;
    map.setFilter = function (...args: unknown[]) {
      counts.filterWrites += 1;
      return originalSetFilter.apply(this, args);
    };
    restorers.push(() => { map.setFilter = originalSetFilter; });
    for (const sourceId of Object.keys(map.getStyle().sources ?? {})) {
      const source = map.getSource(sourceId) as MutableSource | undefined;
      if (!source?.setData) continue;
      const originalSetData = source.setData;
      source.setData = function (...args: unknown[]) {
        counts.dataWrites += 1;
        return originalSetData.apply(this, args);
      };
      restorers.push(() => { source.setData = originalSetData; });
    }
    (window as typeof window & { __geoAiNoopLifecycleProbe?: Probe }).__geoAiNoopLifecycleProbe = {
      counts,
      restore: () => restorers.reverse().forEach((restore) => restore())
    };
  });
  await page.waitForTimeout(2_500);
  const stableLifecycle = await page.evaluate(() => {
    type Probe = { counts: { conceptLayoutWrites: number; filterWrites: number; dataWrites: number }; restore: () => void };
    const fixture = window as typeof window & {
      __geoAiSpatialReplacementMap?: import("maplibre-gl").Map;
      __geoAiNoopLifecycleProbe?: Probe;
    };
    const map = fixture.__geoAiSpatialReplacementMap;
    const probe = fixture.__geoAiNoopLifecycleProbe;
    if (!map || !probe) throw new Error("No-op lifecycle probe is not installed.");
    const result = {
      ...probe.counts,
      loaded: map.loaded(),
      styleLoaded: map.isStyleLoaded(),
      tilesLoaded: map.areTilesLoaded()
    };
    probe.restore();
    delete fixture.__geoAiNoopLifecycleProbe;
    return result;
  });
  expect(stableLifecycle).toEqual({
    conceptLayoutWrites: 0,
    filterWrites: 0,
    dataWrites: 0,
    loaded: true,
    styleLoaded: true,
    tilesLoaded: true
  });

  await page.getByTestId("create-map-presentation-toggle").click();
  await focusSpatialReplacementFixture(page);
  await expect.poll(async () => {
    const state = await readSpatialReplacementFixture(page);
    return {
      filterRestored: state.filter == null,
      insideTarget: state.insideTarget,
      outsideLandmark: state.outsideLandmark,
      multipartInside: state.multipartInside,
      multipartOutside: state.multipartOutside,
      boundaryOutside: state.boundaryOutside
    };
  }).toEqual({ filterRestored: true, insideTarget: true, outsideLandmark: true, multipartInside: true, multipartOutside: true, boundaryOutside: true });

  await page.getByTestId("create-map-presentation-toggle").click();
  await focusSpatialReplacementFixture(page);
  await expect.poll(async () => (await readSpatialReplacementFixture(page)).insideTarget).toBe(false);
  await page.evaluate(() => {
    type FixtureMap = { fire: (event: string, data: Record<string, unknown>) => unknown };
    const map = (window as typeof window & { __geoAiSpatialReplacementMap?: FixtureMap }).__geoAiSpatialReplacementMap;
    if (!map) throw new Error("Spatial replacement fixture is not installed.");
    map.fire("error", { error: new Error("Forced map remount for cleanup verification.") });
  });
  await page.getByRole("button", { name: "Reload map" }).click();
  await expect.poll(async () => page.evaluate(() => window.sessionStorage.getItem("geoai-spatial-filter-at-remove")))
    .toBe("null");
});

test("Create coverage proposal is explicit and applying it preserves the committed result without a request", async ({ page }, testInfo) => {
  createPosts.length = 0;
  challengeGets = 0;
  await installRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object");
  await page.getByRole("tab", { name: "Create" }).click();
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: "coverage-proposal-ui-fixture.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: [[
      [55.26955, 25.20455], [55.27065, 25.20455], [55.27065, 25.20565],
      [55.26955, 25.20565], [55.26955, 25.20455]
    ]] }))
  });
  await page.getByRole("button", { name: "Public campus" }).click();
  const generate = page.getByTestId("create-generate-action");
  await generate.click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
  expect(createPosts[0].lockedControlKeys).toEqual([]);

  await page.getByText("Concept parameters", { exact: true }).click();
  await page.getByRole("slider", { name: "Site coverage" }).press("ArrowRight");
  await expect(page.getByLabel("Custom direction")).toHaveValue("");
  await generate.click();
  await expect(page.getByTestId("create-coverage-suggestion")).toContainText("29% → 20%");
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
  expect(createPosts).toHaveLength(2);
  expect(challengeGets).toBe(2);
  await page.getByTestId("create-coverage-suggestion").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("coverage-proposal-before-apply.png") });
  await page.getByTestId("create-apply-suggested-coverage").click();
  await expect(page.getByTestId("create-coverage-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
  await expect(generate).toHaveText("Update concept");
  expect(createPosts).toHaveLength(2);
  expect(challengeGets).toBe(2);
  await generate.click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 3 committed result.");
  expect((createPosts[2].controls as Record<string, number>).targetSiteCoveragePct).toBe(20);
  expect(createPosts[2].lockedControlKeys).toEqual(["targetSiteCoveragePct"]);
  await expect(generate).toHaveText("Already generated");
  await expect(generate).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("coverage-proposal-applied.png") });
});

test("Create preserves the draft and last result when the local preflight worker is unavailable", async ({ page }) => {
  createPosts.length = 0;
  challengeGets = 0;
  await installRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object");
  await page.getByRole("tab", { name: "Create" }).click();
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: "worker-retry-fixture.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: [[
      [55.26955, 25.20455], [55.27065, 25.20455], [55.27065, 25.20565],
      [55.26955, 25.20565], [55.26955, 25.20455]
    ]] }))
  });
  await page.getByRole("button", { name: "Public campus" }).click();
  await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "not_applicable");
  await page.getByTestId("create-generate-action").click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");

  await page.evaluate(() => {
    window.Worker = class UnavailableWorker {
      constructor() {
        throw new DOMException("Synthetic worker startup failure.", "NotSupportedError");
      }
    } as unknown as typeof Worker;
  });

  await page.getByText("Concept parameters", { exact: true }).click();
  const coverage = page.getByRole("slider", { name: "Site coverage" });
  await coverage.press("ArrowRight");
  await expect(page.getByTestId("create-local-preflight")).toContainText("placement check is unavailable");
  await expect(coverage).toHaveValue("29");
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
  await page.getByTestId("create-local-preflight-retry").click();
  await expect(page.getByTestId("create-local-preflight")).toContainText("placement check is unavailable");
  await expect(coverage).toHaveValue("29");
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
  expect(createPosts).toHaveLength(1);
  expect(challengeGets).toBe(1);
});

test("REVIEW02 C2 legacy saved result without original editor fields requires an explicit draft choice", async ({ page }) => {
  createPosts.length = 0; challengeGets = 0;
  await installRoutes(page);
  const vertices: Array<[number, number]> = [[55.26955,25.20455],[55.27065,25.20455],[55.27065,25.20565],[55.26955,25.20565]];
  const site = validatePointObjectCreateAoiVertices(vertices);
  const programme = validateRedevelopmentProgram(conceptTemplate("civic_green", "en"));
  if (!site.ok || !programme.ok) throw new Error("Invalid synthetic legacy fixture.");
  const aoi = { id: "create-aoi-review02-legacy", coordinates: [[...vertices, vertices[0]]], vertexCount: vertices.length,
    areaSqM: site.measurements.areaSqM, perimeterM: site.measurements.perimeterM };
  const alternatives = generateConceptMassingAlternatives(aoi.coordinates, programme.value, "review02-legacy-offline", "en");
  const stamp = "2026-09-05T12:00:00.000Z";
  const operation = parsePointObjectProjectOperationInput({ kind: "create", locale: "en", marketKey: "dubai", label: "Legacy offline Create",
    payload: { aoi, editorSnapshot: null, generatedLocale: "en", activeAlternativeId: "A", areaContext: null,
      generated: { mode: "openai_concept", generatedAt: stamp, promptVersion: "POINT_OBJECT_CREATE_LEGACY_OFFLINE_FIXTURE",
        program: programme.value, massing: alternatives[0].massing, alternatives,
        telemetry: { model: "offline", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 },
        caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion." } } });
  if (!operation) throw new Error("Invalid legacy saved operation.");
  const identity = `demo:${demoUser.id}` as const;
  const key = `geoai:point-to-object:projects:v1:${encodeURIComponent(identity)}`;
  const artifact = { ...operation, schemaVersion: 1, artifactId: "review02-legacy", idempotencyKey: "review02-legacy-offline",
    payloadHash: await hashPointObjectOperation(operation), completedAt: stamp, updatedAt: stamp, viewRevision: 0 };
  const store = parsePointObjectProjectStore({ schemaVersion: 1, identityKey: identity, activeProjectId: "review02-legacy-project",
    projects: [{ schemaVersion: 1, projectId: "review02-legacy-project", name: "Synthetic legacy project", storageMode: "browser_local_on_this_device",
      createdAt: stamp, updatedAt: stamp, artifacts: [artifact] }] }, identity, 20, 30);
  if (!store) throw new Error("Invalid legacy saved store.");
  // A schema/hash-validated historical artifact is the compatibility input.
  // No editor fields, locks, UI hook or restoration intent are invented.
  await page.addInitScript(({ key, store }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(store)); }, { key, store });
  const core = () => page.evaluate(key => {
    const payload = JSON.parse(localStorage.getItem(key)!).projects[0].artifacts[0].payload;
    return { aoi: payload.aoi, generated: payload.generated, editorSnapshot: payload.editorSnapshot };
  }, key);
  const calls: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/prototype/")) calls.push(request.url()); });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/projects");
  const before = await core();
  await page.getByTestId("saved-result-card").getByRole("button", { name: "Show on map", exact: true }).click();
  await page.getByTestId("create-full-result-dashboard").getByRole("button", { name: "Back to parameters" }).click();
  const generate = page.getByTestId("create-generate-action");
  await expect(page.getByTestId("create-legacy-draft-status")).toContainText("Original draft parameters were not saved.");
  await expect(generate).toBeDisabled();
  await expect(page.getByTestId("create-draft-status")).toHaveCount(0);
  await page.getByTestId("create-alternative-b").click();
  await page.getByTestId("create-alternative-a").click();
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.getByTestId("create-legacy-draft-status")).toContainText("Исходные параметры черновика не сохранены.");
  await expect(generate).toBeDisabled();
  await page.getByRole("button", { name: "en", exact: true }).click();
  await page.waitForTimeout(800);
  expect(await core()).toEqual(before);
  expect(calls).toEqual([]);
  await page.locator("summary").filter({ hasText: "Concept parameters" }).click();
  await page.getByTestId("create-auto-controls").press("Enter");
  await expect(page.getByTestId("create-legacy-draft-status")).toHaveCount(0);
  await expect(generate).toBeEnabled();
  await expect(page.getByText("Auto", { exact: true })).toHaveCount(6);
  await page.waitForTimeout(800);
  expect(await core()).toEqual(before);
  expect(calls).toEqual([]); expect(createPosts).toHaveLength(0); expect(challengeGets).toBe(0);
});

for (const locale of ["en", "ru"] as const) for (const width of [390, 1440]) {
  test(`REVIEW02 C2 ${locale} ${width}: Auto seeds, explicit locks and saved intent use real UI without implicit generation`, async ({ page }, info) => {
    createPosts.length = 0;
    challengeGets = 0;
    await installRoutes(page);
    // Only this persistence journey uses the real geometry producer. The
    // display-only legacy fixture intentionally reports illustrative metrics.
    await page.route("**/api/prototype/point-to-object/create", async route => {
      if (route.request().method() === "GET") {
        challengeGets++;
        return json(route, { mode: "ready", challenge: "A".repeat(43) });
      }
      const request = route.request().postDataJSON();
      createPosts.push(request);
      const generation = createPosts.length;
      const valid = validateRedevelopmentProgram({
        ...conceptTemplate(request.templateId, request.locale), ...request.controls,
        title: `Generation ${generation}`, summary: `Generation ${generation} committed result.`
      });
      if (!valid.ok) throw new Error(valid.errors.join(";"));
      const alternatives = generateConceptMassingAlternatives(request.aoiCoordinates, valid.value, `review02-auto-${generation}`, request.locale);
      return json(route, {
        ...conceptResponse(request, generation), program: { ...valid.value, schemaVersion: 1 },
        massing: alternatives[0].massing, alternatives
      });
    });
    const requests: string[] = [];
    page.on("request", request => {
      if (new URL(request.url()).pathname.startsWith("/api/prototype/")) requests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    await page.context().addCookies([{ name: "geoai_locale", value: locale, url: info.project.use.baseURL! }]);
    await page.setViewportSize({ width, height: 900 });
    const openTask = async () => {
      const open = page.getByRole("button", { name: locale === "ru" ? "Открыть задачу" : "Open task", exact: true });
      if (await open.isVisible()) await open.click();
    };
    const openParameters = () => page.locator("summary").filter({ hasText: locale === "ru" ? "Параметры концепции" : "Concept parameters" }).click();
    const auto = () => page.getByText(locale === "ru" ? "Авто" : "Auto", { exact: true });
    const fixed = () => page.getByText(locale === "ru" ? "Задано" : "Fixed", { exact: true });
    const labels = locale === "ru"
      ? ["Корпуса", "Минимум этажей", "Максимум этажей", "Плотность застройки", "Открытые пространства", "Отступ"]
      : ["Blocks", "Minimum levels", "Maximum levels", "Site coverage", "Open space", "Setback"];
    // The demo-public application has an owner-scoped local demo identity,
    // not an anonymous guest. Observe its real UI-written project artifacts;
    // do not inject a session, locks or a project-restoration intent.
    const storeKey = `geoai:point-to-object:projects:v1:${encodeURIComponent(`demo:${demoUser.id}`)}`;
    const held = (generation: number) => page.evaluate(({ key, generation }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const store = JSON.parse(raw);
      return store.projects.flatMap((project: { artifacts: Array<{ kind: string; payload: { generated?: { program: { summary: string } } } }> }) => project.artifacts)
        .find((artifact: { kind: string; payload: { generated?: { program: { summary: string } } } }) =>
          artifact.kind === "create" && artifact.payload.generated?.program.summary === `Generation ${generation} committed result.`)?.payload ?? null;
    }, { key: storeKey, generation });
    const quiet = async (before: string[]) => {
      await page.waitForTimeout(800);
      expect(requests).toEqual(before);
    };
    await page.goto("/prototype/point-to-object?mode=create");
    await openTask();
    await page.getByLabel(locale === "ru" ? "Загрузить GeoJSON" : "Upload GeoJSON").setInputFiles({
      name: "review02-auto-only.geojson", mimeType: "application/geo+json",
      buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: [[
        [55.26955,25.20455],[55.27065,25.20455],[55.27065,25.20565],[55.26955,25.20565],[55.26955,25.20455]
      ]] }))
    });
    await openParameters();
    await expect(auto()).toHaveCount(6);
    await page.getByTestId("create-programme-civic_green").click();
    await expect(auto()).toHaveCount(6);
    await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "not_applicable");
    const generate = page.getByTestId("create-generate-action");
    await expect(generate).toBeEnabled();
    expect(createPosts).toHaveLength(0); expect(challengeGets).toBe(0);
    await generate.click();
    await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
    expect(createPosts[0].lockedControlKeys).toEqual([]);

    await page.getByRole("slider", { name: labels[0], exact: true }).press("ArrowRight");
    await page.getByRole("slider", { name: labels[1], exact: true }).press("End");
    await expect(fixed()).toHaveCount(3);
    const localBefore = [...requests];
    await quiet(localBefore);
    await generate.click();
    await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 2 committed result.");
    expect([...(createPosts[1].lockedControlKeys as string[])].sort()).toEqual(["blockCount", "levelsMax", "levelsMin"]);
    await expect.poll(() => held(2)).not.toBeNull();
    const result2 = await held(2);
    const beforeAuto = [...requests];
    await page.getByTestId("create-auto-controls").press("Enter");
    await expect(auto()).toHaveCount(6);
    expect(await held(2)).toEqual(result2);
    await quiet(beforeAuto);

    // Explicit full-lock intent is created through sliders, not injected state.
    for (const label of labels) {
      const slider = page.getByRole("slider", { name: label, exact: true });
      await slider.press("ArrowRight"); await slider.press("ArrowLeft");
    }
    await expect(fixed()).toHaveCount(6);
    await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "ready");
    await generate.click();
    await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 3 committed result.");
    expect([...(createPosts[2].lockedControlKeys as string[])].sort()).toEqual([...fixedControlKeys].sort());
    await expect.poll(() => held(3)).not.toBeNull();
    const result3 = await held(3);
    const beforeReopen = [...requests];
    await page.goto("/projects");
    await expect(page.getByTestId("hub-count-create").getByTestId("hub-count-value")).toHaveText("3");
    // Newest-first is the actual Hub order, and each explicit Generate added
    // one distinct saved result. Reopen through the user's visible action.
    await page.getByTestId("saved-result-card").first().getByRole("button", { name: locale === "ru" ? "Показать на карте" : "Show on map", exact: true }).click();
    await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 3 committed result.");
    await page.getByTestId("create-full-result-dashboard").getByRole("button", { name: locale === "ru" ? "К параметрам" : "Back to parameters" }).click();
    await openTask(); await openParameters();
    await expect(fixed()).toHaveCount(6);
    expect(await held(3)).toEqual(result3);
    await quiet(beforeReopen);
    const beforeLocal = [...requests];
    await page.getByTestId("create-auto-controls").click();
    await expect(auto()).toHaveCount(6);
    await page.getByRole("slider", { name: labels[3], exact: true }).press("End");
    await page.getByRole("slider", { name: labels[4], exact: true }).press("End");
    await expect(page.getByTestId("create-parameter-error")).toBeVisible();
    await expect(generate).toBeDisabled();
    await page.getByTestId("create-auto-controls").click();
    await expect(generate).toBeDisabled(); // Auto is not permission to bypass invalid inputs.
    await page.getByTestId("reset-edited-create-controls").click();
    await expect(auto()).toHaveCount(6);
    await page.getByTestId("create-programme-residential_mixed_use").click();
    await expect(auto()).toHaveCount(6);
    await page.getByTestId("create-alternative-b").click();
    await page.getByTestId("create-alternative-a").click();
    await page.getByRole("button", { name: locale === "ru" ? "en" : "ru", exact: true }).click();
    await page.getByRole("button", { name: locale, exact: true }).click();
    await quiet(beforeLocal);
    expect(await held(3)).toEqual(result3);
    expect(createPosts).toHaveLength(3); expect(challengeGets).toBe(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath("auto-fixed-local-intent.png"), fullPage: true });
  });
}
