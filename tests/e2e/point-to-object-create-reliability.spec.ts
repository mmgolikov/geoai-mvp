import { expect, test, type Page, type Route } from "@playwright/test";

const createPosts: Array<Record<string, unknown>> = [];
let challengeGets = 0;
const fixedControlKeys = ["blockCount", "levelsMin", "levelsMax", "targetSiteCoveragePct", "openSpacePct", "setbackM"];

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function massing(variantId: "A" | "B", generation: number, controls: Record<string, number>, templateId: string) {
  const count = controls.blockCount;
  const features = Array.from({ length: count }, (_, index) => {
    const orderedIndex = variantId === "A" ? index : count - index - 1;
    const longitude = 55.27019 + (orderedIndex % 3) * 0.00012 + generation * 0.000002;
    const latitude = 25.20519 + Math.floor(orderedIndex / 3) * 0.00012 + (variantId === "B" ? 0.000035 : 0);
    const levels = controls.levelsMin + index % Math.max(1, controls.levelsMax - controls.levelsMin + 1);
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
    aoiAreaSqM: 2_500,
    generatedFootprintAreaSqM: controls.targetSiteCoveragePct * 25,
    achievedSiteCoveragePct: controls.targetSiteCoveragePct,
    estimatedFloorAreaSqM: generation * 1_000 + (variantId === "B" ? 500 : 0),
    minGeneratedLevels: controls.levelsMin,
    maxGeneratedLevels: controls.levelsMax,
    seed: `offline-${generation}-${variantId}`
  };
}

function conceptResponse(request: Record<string, unknown>, generation: number) {
  const controls = request.controls as Record<string, number>;
  const templateId = String(request.templateId);
  const a = massing("A", generation, controls, templateId);
  const b = massing("B", generation, controls, templateId);
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
  await page.route(/^https:\/\//, async (route) => {
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
      await new Promise((resolve) => setTimeout(resolve, 350));
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
    const harness: Harness = { map, originalFilter, setFilterCalls: 0, styleDataEvents: 0 };
    const originalSetFilter = map.setFilter.bind(map);
    map.setFilter = (layerId, filter) => {
      if (layerId === "late-building") harness.setFilterCalls += 1;
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
      styleDataEvents: number;
    };
    const harness = (window as typeof window & { __geoAiLateBuildingHarness?: Harness }).__geoAiLateBuildingHarness;
    if (!harness) throw new Error("Late-building harness is not installed.");
    const filter = harness.map.getFilter("late-building");
    const serializedFilter = JSON.stringify(filter);
    return {
      filter,
      originalFilter: harness.originalFilter,
      setFilterCalls: harness.setFilterCalls,
      styleDataEvents: harness.styleDataEvents,
      suppressed: serializedFilter.includes('"distance"'),
      distanceChecks: (serializedFilter.match(/"distance"/g) ?? []).length,
      hasLowZoomGuard: serializedFilter.includes('["<",["zoom"],13]')
    };
  });
}

async function installSpatialReplacementFixture(page: Page) {
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
    if (!map.isStyleLoaded()) {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("MapLibre style did not become ready.")), 5_000);
        map?.once("style.load", () => {
          window.clearTimeout(timeout);
          resolve();
        });
      });
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
      getLayoutProperty: (layerId: string, property: string) => unknown;
      getZoom: () => number;
      project: (coordinate: [number, number]) => { x: number; y: number };
      queryRenderedFeatures: (point: { x: number; y: number }, options: { layers: string[] }) => Array<{ properties?: Record<string, unknown> }>;
    };
    const map = (window as typeof window & { __geoAiSpatialReplacementMap?: FixtureMap }).__geoAiSpatialReplacementMap;
    if (!map) throw new Error("Spatial replacement fixture is not installed.");
    const visible = (coordinate: [number, number], fixture: string) =>
      map.queryRenderedFeatures(map.project(coordinate), { layers: ["geoai-buildings-3d"] })
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
        [55.27015, 25.20515],
        [55.27065, 25.20515],
        [55.27065, 25.20565],
        [55.27015, 25.20565],
        [55.27015, 25.20515]
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
  expect([...(createPosts[0].lockedControlKeys as string[])].sort()).toEqual([...fixedControlKeys].sort());

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
  expect([...(createPosts[1].lockedControlKeys as string[])].sort()).toEqual([...fixedControlKeys].sort());

  const prompt = page.getByLabel("Custom direction");
  await prompt.fill("force failure");
  await generate.click();
  await expect(page.getByTestId("create-generation-error")).toContainText("previous valid result remains available");
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 2 committed result.");
  expect(createPosts).toHaveLength(3);

  await prompt.fill("late response");
  await generate.click();
  await expect.poll(() => createPosts.length).toBe(4);
  await prompt.fill("newer draft");
  await page.waitForTimeout(450);
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 2 committed result.");
  await expect(generate).toHaveText("Update concept");
  expect(createPosts).toHaveLength(4);

  await test.step("a late same-style building layer is suppressed once and restores its source filter", async () => {
    await addLateBuildingLayer(page);
    await expect.poll(async () => {
      const state = await readLateBuildingLayerState(page);
      return {
        suppressed: state.suppressed,
        distanceChecks: state.distanceChecks,
        hasLowZoomGuard: state.hasLowZoomGuard,
        setFilterCalls: state.setFilterCalls
      };
    }).toEqual({ suppressed: true, distanceChecks: 2, hasLowZoomGuard: true, setFilterCalls: 1 });

    const styleDataEventsBeforeUnrelatedChange = (await readLateBuildingLayerState(page)).styleDataEvents;
    await page.evaluate(() => {
      type Harness = { map: { setPaintProperty: (layerId: string, property: string, value: unknown) => unknown } };
      const harness = (window as typeof window & { __geoAiLateBuildingHarness?: Harness }).__geoAiLateBuildingHarness;
      if (!harness) throw new Error("Late-building harness is not installed.");
      harness.map.setPaintProperty("background", "background-color", "#e7ecef");
    });
    await expect.poll(async () => (await readLateBuildingLayerState(page)).styleDataEvents)
      .toBeGreaterThan(styleDataEventsBeforeUnrelatedChange);
    await expect.poll(async () => (await readLateBuildingLayerState(page)).setFilterCalls).toBe(1);

    await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
    await expect.poll(async () => (await readLateBuildingLayerState(page)).distanceChecks).toBe(2);
    await page.getByRole("button", { name: "3d", exact: true }).press("Enter");
    await expect.poll(async () => (await readLateBuildingLayerState(page)).distanceChecks).toBe(2);

    for (let cycle = 0; cycle < 5; cycle += 1) {
      await page.getByTestId("create-map-presentation-toggle").click();
      await expect.poll(async () => (await readLateBuildingLayerState(page)).filter)
        .toEqual(["==", ["get", "kind"], "main"]);
      await page.getByTestId("create-map-presentation-toggle").click();
      await expect.poll(async () => (await readLateBuildingLayerState(page)).distanceChecks).toBe(2);
    }
    await expect.poll(async () => (await readLateBuildingLayerState(page)).setFilterCalls).toBe(13);

    await page.getByLabel("Map style").selectOption("light");
    await expect.poll(async () => page.evaluate(() => {
      type Harness = { map: { isStyleLoaded: () => boolean } };
      const harness = (window as typeof window & { __geoAiLateBuildingHarness?: Harness }).__geoAiLateBuildingHarness;
      return harness?.map.isStyleLoaded() ?? false;
    })).toBe(true);
    await addLateBuildingLayer(page);
    await expect.poll(async () => {
      const state = await readLateBuildingLayerState(page);
      return { distanceChecks: state.distanceChecks, setFilterCalls: state.setFilterCalls };
    }).toEqual({ distanceChecks: 2, setFilterCalls: 1 });
    await page.getByTestId("create-map-presentation-toggle").click();
    await expect.poll(async () => (await readLateBuildingLayerState(page)).filter)
      .toEqual(["==", ["get", "kind"], "main"]);
  });

  await page.screenshot({ path: testInfo.outputPath("draft-generated-separation.png") });
  await page.getByTestId("create-clear-generated").click();
  await expect(page.getByTestId("generated-concept-summary")).toHaveCount(0);
  await expect(generate).toHaveText("Generate concept");
});

test("actual MapLibre rendering hides only the internal target and retains outside geometry", async ({ page }, testInfo) => {
  createPosts.length = 0;
  challengeGets = 0;
  await installRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object");
  await page.getByRole("tab", { name: "Create" }).click();
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: "spatial-replacement-browser-fixture.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [55.27015, 25.20515],
        [55.27065, 25.20515],
        [55.27065, 25.20565],
        [55.27015, 25.20565],
        [55.27015, 25.20515]
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
      filterApplied: JSON.stringify(state.filter).includes('["<",["zoom"],13]'),
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
    multipartInside: true,
    multipartOutside: true,
    boundaryOutside: true
  });

  await focusSpatialReplacementFixture(page, 12);
  await expect(page.getByText("Zoom in to view the concept.")).toBeVisible();
  await expect(page.getByText("Safe replacement could not be applied: source buildings were restored and the concept is hidden.")).toHaveCount(0);
  await expect.poll(async () => {
    const state = await readSpatialReplacementFixture(page);
    return { filterRestored: state.filter == null, zoom: state.zoom, conceptVisibility: state.conceptVisibility };
  }).toEqual({ filterRestored: true, zoom: 12, conceptVisibility: "none" });
  await focusSpatialReplacementFixture(page, 16);
  await expect(page.getByText("Zoom in to view the concept.")).toHaveCount(0);
  await expect(page.getByText("Safe replacement could not be applied: source buildings were restored and the concept is hidden.")).toHaveCount(0);
  await expect.poll(async () => (await readSpatialReplacementFixture(page)).insideTarget).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("spatial-replacement-outside-retained.png") });

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
      [55.27015, 25.20515], [55.27065, 25.20515], [55.27065, 25.20565],
      [55.27015, 25.20565], [55.27015, 25.20515]
    ]] }))
  });
  await page.getByRole("button", { name: "Public campus" }).click();
  const generate = page.getByTestId("create-generate-action");
  await generate.click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
  expect([...(createPosts[0].lockedControlKeys as string[])].sort()).toEqual([...fixedControlKeys].sort());

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
  expect([...(createPosts[2].lockedControlKeys as string[])].sort()).toEqual([...fixedControlKeys].sort());
  await expect(generate).toHaveText("Already generated");
  await expect(generate).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("coverage-proposal-applied.png") });
});
