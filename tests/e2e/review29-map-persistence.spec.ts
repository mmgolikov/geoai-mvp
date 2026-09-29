import { expect, test, type Page, type Route } from "@playwright/test";
import { fromGeojsonVt } from "@maplibre/vt-pbf";
import type { FeatureCollection, Polygon } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap, VectorTileSource } from "maplibre-gl";
import { externalHttpUrlPattern, installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

type BrowserMap = Window & { review29Map?: MapLibreMap; review29HighZoomSamples?: { total: number; hidden: number } };
type Hook = { memoizedState: unknown; next: Hook | null };
type Fiber = { memoizedState: Hook | null; return: Fiber | null };
type Position = [number, number];

const box = (west: number, south: number, east: number, north: number): Polygon => ({ type: "Polygon", coordinates: [[
  [west, south], [east, south], [east, north], [west, north], [west, south]
]] });
const single = box(55.2828, 25.2137, 55.2835, 25.2144);
const relationSouth = box(55.2840, 25.2137, 55.2844, 25.2141);
const relationNorth = box(55.2840, 25.2145, 55.2844, 25.2149);
const createSite = box(55.2690, 25.2040, 55.2712, 25.2060); // approximately 4.9 ha, not the founder's unexported AOI
const restoredCreateSite = box(55.2833, 25.2132, 55.2855, 25.2152);
const native: FeatureCollection = { type: "FeatureCollection", features: [
  { type: "Feature", id: 901, properties: { name: "Mapped tower", render_height: 42, render_min_height: 4 }, geometry: single },
  { type: "Feature", id: 902, properties: { name: "Mapped hotel relation", render_height: 36, render_min_height: 0 }, geometry: {
    type: "MultiPolygon", coordinates: [relationSouth.coordinates, relationNorth.coordinates]
  } },
  { type: "Feature", id: 903, properties: { name: "Neighbour", render_height: 18, render_min_height: 0 }, geometry: box(55.28355, 25.2137, 55.2838, 25.2141) },
  { type: "Feature", id: 904, properties: { name: "Existing on Create site", render_height: 12, render_min_height: 0 }, geometry: box(55.2695, 25.2045, 55.2698, 25.2048) }
] };

function massing(variantId: "A" | "B", controls: Record<string, number>, templateId: string) {
  const count = controls.blockCount;
  const features = Array.from({ length: count }, (_, index) => {
    const id = `${variantId}-${index + 1}`;
    const longitude = 55.26935 + (index % 3) * 0.00048 + (variantId === "B" ? 0.00006 : 0);
    const latitude = 25.2044 + Math.floor(index / 3) * 0.00055;
    const levels = controls.levelsMin + index % Math.max(1, controls.levelsMax - controls.levelsMin + 1);
    return { type: "Feature" as const, id, properties: {
      id, kind: "concept_massing", templateId, variantId, massingStyle: "campus", volumeRole: "campus_block",
      primaryBlock: true, use: "civic", levels, heightM: levels * 3.4, baseM: 0,
      label: `Offline ${variantId} block ${index + 1}`
    }, geometry: box(longitude, latitude, longitude + 0.00025, latitude + 0.00023) };
  });
  return { variantId, massingStyle: "campus", requestedBlockCount: count, generatedBlockCount: count,
    generatedFeatureCount: count, aoiAreaSqM: 49_000, generatedFootprintAreaSqM: 18_620,
    achievedSiteCoveragePct: 38, estimatedFloorAreaSqM: 80_000, minGeneratedLevels: controls.levelsMin,
    maxGeneratedLevels: controls.levelsMax, seed: `review29-${variantId}`,
    featureCollection: { type: "FeatureCollection", features } };
}

async function installOfflineMap(page: Page, createPosts: string[]) {
  const { GeoJSONVT } = await import("@maplibre/geojson-vt");
  const index = new GeoJSONVT(native, { maxZoom: 14, tolerance: 0, extent: 8192, buffer: 64 });
  let releaseDelayedTiles: (() => void) | undefined;
  const delayedTiles = new Promise<void>(resolve => { releaseDelayedTiles = resolve; });
  await page.route(externalHttpUrlPattern(test.info().project.use.baseURL), async route => {
    const url = new URL(route.request().url());
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) return route.fulfill({ json: {
      version: 8, sources: { openmaptiles: { type: "vector", tiles: ["https://tiles.openfreemap.org/review29/{z}/{x}/{y}.pbf"], maxzoom: 14,
        attribution: "Offline map fixture · © OpenStreetMap contributors" } }, layers: [
        { id: "background", type: "background", paint: { "background-color": "#f4f8f7" } },
        { id: "building-fill", type: "fill", source: "openmaptiles", "source-layer": "building", paint: { "fill-color": "#d6dcdf" } }
      ]
    } });
    const tile = url.pathname.match(/^\/review29(-delayed)?\/(\d+)\/(\d+)\/(\d+)\.pbf$/);
    if (tile) {
      if (tile[1]) await delayedTiles;
      const data = index.getTile(Number(tile[2]), Number(tile[3]), Number(tile[4]));
      return route.fulfill({ contentType: "application/x-protobuf", body: data ? Buffer.from(fromGeojsonVt({ building: data }, { extent: 8192, version: 2 })) : Buffer.alloc(0) });
    }
    return route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session", route => route.fulfill({ json: { isAuthenticated: false, user: null } }));
  await page.route("**/api/prototype/point-to-object/**", route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/create")) {
      if (route.request().method() === "GET") return route.fulfill({ json: { mode: "ready", challenge: "P".repeat(43) } });
      createPosts.push(route.request().postData() ?? "");
      const request = route.request().postDataJSON() as { controls: Record<string, number>; templateId: string };
      const a = massing("A", request.controls, request.templateId), b = massing("B", request.controls, request.templateId);
      return route.fulfill({ json: { mode: "openai_concept", generatedAt: "2026-09-29T11:42:00.000Z", promptVersion: "POINT_OBJECT_CREATE_REVIEW29_OFFLINE",
        program: { schemaVersion: 1, templateId: request.templateId, title: "Offline proposal", summary: "Offline proposal",
          massingStyle: "campus", ...request.controls, useMix: [{ use: "civic", sharePct: 100 - request.controls.openSpacePct },
            { use: "open_space", sharePct: request.controls.openSpacePct }], rationale: ["Offline map-only fixture."] },
        massing: a, alternatives: [{ id: "A", label: "Alternative A", massing: a }, { id: "B", label: "Alternative B", massing: b }],
        telemetry: { model: "offline", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 },
        caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
      } });
    }
    return route.fulfill({ status: 503, json: { mode: "unavailable", error: "Offline source fixture." } });
  });
  return { releaseDelayedTiles: () => releaseDelayedTiles?.() };
}

async function exposeMap(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector("[data-testid='live-map-canvas']");
    const key = canvas && Object.getOwnPropertyNames(canvas).find(value => value.startsWith("__reactFiber$"));
    let fiber = key ? (canvas as unknown as Record<string, Fiber>)[key] : null;
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const map = (hook.memoizedState as { current?: MapLibreMap } | null)?.current;
        if (map && typeof map.jumpTo === "function" && map.isStyleLoaded()) {
          (window as BrowserMap).review29Map = map;
          return true;
        }
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    return false;
  })).toBe(true);
}

async function clickMapCoordinate(page: Page, coordinate: Position) {
  const pixel = await page.evaluate(value => {
    const map = (window as BrowserMap).review29Map!;
    const point = map.project(value), rect = map.getCanvas().getBoundingClientRect();
    return { x: rect.left + point.x, y: rect.top + point.y };
  }, coordinate);
  await page.mouse.click(pixel.x, pixel.y);
}

test("Review29 selected source volume is translucent; relation member keeps siblings through style and mode changes", async ({ page, browserName }, info) => {
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
  const offline = await installOfflineMap(page, []);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/prototype/point-to-object?mode=analyse");
  await exposeMap(page);
  await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
  await page.evaluate(() => (window as BrowserMap).review29Map!.jumpTo({ center: [55.2836, 25.2142], zoom: 17, pitch: 0, bearing: 0 }));
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles"))).toBe(true);
  await clickMapCoordinate(page, [55.2831, 25.2140]);
  await expect(page.getByTestId("selected-object")).toContainText("Mapped tower");
  await page.getByRole("button", { name: "3d", exact: true }).press("Enter");
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty("geoai-live-selection-volume", "visibility"))).toBe("visible");
  const tower = await page.evaluate(async () => {
    const map = (window as BrowserMap).review29Map!;
    const data = await (map.getSource("geoai-live-selection") as GeoJSONSource).getData();
    return { opacity: map.getPaintProperty("geoai-live-selection-volume", "fill-extrusion-opacity"),
      nativeOpacity: map.getPaintProperty("geoai-buildings-3d", "fill-extrusion-opacity"),
      nativeFilter: JSON.stringify(map.getFilter("geoai-buildings-3d")),
      height: data.type === "Feature" ? data.properties?.renderHeightM : null };
  });
  expect(tower).toMatchObject({ opacity: 0.5, nativeOpacity: 1, height: 42 });
  expect(tower.nativeFilter).toContain("901");
  await page.screenshot({ path: info.outputPath("selected-tower-3d.png") });

  await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
  await clickMapCoordinate(page, [55.2842, 25.2139]);
  await expect(page.getByTestId("selected-object")).toContainText("Mapped hotel relation");
  await page.getByRole("button", { name: "3d", exact: true }).press("Enter");
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty("geoai-live-selection-volume", "visibility"))).toBe("visible");
  const siblings = await page.evaluate(async () => {
    const map = (window as BrowserMap).review29Map!;
    const source = map.getSource("geoai-existing-partition-source:openmaptiles") as GeoJSONSource | undefined;
    const retained = source ? await source.getData() as FeatureCollection : null;
    return { retained: retained?.features.some(feature => feature.id === 902 && JSON.stringify(feature.geometry).includes("25.214")),
      selected: await (map.getSource("geoai-live-selection") as GeoJSONSource).getData(),
      nativeOpacity: map.getPaintProperty("geoai-buildings-3d", "fill-extrusion-opacity") };
  });
  expect(siblings.retained).toBe(true);
  expect(siblings.nativeOpacity).toBe(1);
  await expect.poll(() => page.evaluate(() => {
    const map = (window as BrowserMap).review29Map!;
    const id = "geoai-existing-partition-layer:geoai-buildings-3d";
    return map.getLayer(id) ? map.queryRenderedFeatures(undefined, { layers: [id] })
      .some(feature => feature.properties.name === "Mapped hotel relation") : false;
  })).toBe(true);
  expect(await page.evaluate(() => (window as BrowserMap).review29Map!.getPaintProperty(
    "geoai-existing-partition-layer:geoai-buildings-3d", "fill-extrusion-opacity"))).toBe(1);
  await page.screenshot({ path: info.outputPath("selected-relation-3d.png") });
  const retainedFilter = await page.evaluate(() => JSON.stringify((window as BrowserMap).review29Map!.getFilter("geoai-buildings-3d")));
  await page.evaluate(() => {
    const map = (window as BrowserMap).review29Map!;
    (map.getSource("openmaptiles") as VectorTileSource).setTiles(["https://tiles.openfreemap.org/review29-delayed/{z}/{x}/{y}.pbf"]);
    map.fire("idle");
  });
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles"))).toBe(false);
  // moveend updates the parent selection and runs the actual selection effect
  // while tiles are still held, rather than merely inspecting old visibility.
  await page.evaluate(() => (window as BrowserMap).review29Map!.jumpTo({ bearing: 12 }));
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3")!).viewport.bearing)).toBe(12);
  expect(await page.evaluate(() => {
    const map = (window as BrowserMap).review29Map!;
    return { selected: map.getLayoutProperty("geoai-live-selection-volume", "visibility"),
      retained: map.getLayoutProperty("geoai-existing-partition-layer:geoai-buildings-3d", "visibility"),
      filter: JSON.stringify(map.getFilter("geoai-buildings-3d")) };
  })).toEqual({ selected: "visible", retained: "visible", filter: retainedFilter });
  offline.releaseDelayedTiles();
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles"))).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty("geoai-live-selection-volume", "visibility"))).toBe("visible");
  await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty(
    "geoai-existing-partition-layer:geoai-buildings-3d", "visibility"))).toBe("none");
  await page.getByRole("button", { name: "3d", exact: true }).press("Enter");
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty(
    "geoai-existing-partition-layer:geoai-buildings-3d", "visibility"))).toBe("visible");
  await page.getByLabel("Map style", { exact: true }).selectOption("light");
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty("geoai-live-selection-volume", "visibility"))).toBe("visible");
  await page.getByRole("tab", { name: "Find" }).click();
  await expect.poll(() => page.evaluate(async () => {
    const map = (window as BrowserMap).review29Map!;
    const data = await (map.getSource("geoai-live-selection") as GeoJSONSource).getData() as FeatureCollection;
    return data.type === "FeatureCollection" && data.features.length === 0 && map.getLayoutProperty("geoai-live-selection-volume", "visibility") === "none";
  })).toBe(true);
});

test("Review29 selected member publishes 3D while an unrelated source prevents global idle", async ({ page, browserName }, info) => {
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
  await installOfflineMap(page, []);
  let releaseUnrelated: (() => void) | undefined;
  const unrelated = new Promise<void>(resolve => { releaseUnrelated = resolve; });
  await page.route("https://tiles.openfreemap.org/review29-unrelated.geojson", async route => {
    await unrelated;
    return route.fulfill({ json: { type: "FeatureCollection", features: [] } });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/prototype/point-to-object?mode=analyse");
  await exposeMap(page);
  await page.evaluate(() => (window as BrowserMap).review29Map!.jumpTo({ center: [55.2842, 25.2142], zoom: 17, pitch: 55, bearing: 0 }));
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles"))).toBe(true);
  await page.evaluate(() => (window as BrowserMap).review29Map!.addSource("review29-unrelated-pending", {
    type: "geojson", data: "https://tiles.openfreemap.org/review29-unrelated.geojson"
  }));
  await clickMapCoordinate(page, [55.2842, 25.2139]);
  await expect(page.getByTestId("selected-object")).toContainText("Mapped hotel relation");
  try {
    await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded(
      "geoai-existing-partition-source:openmaptiles"))).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty(
      "geoai-live-selection-volume", "visibility"))).toBe("visible");
    const held = await page.evaluate(async () => {
      const map = (window as BrowserMap).review29Map!;
      const retained = await (map.getSource("geoai-existing-partition-source:openmaptiles") as GeoJSONSource).getData() as FeatureCollection;
      return { unrelatedLoaded: map.isSourceLoaded("review29-unrelated-pending"), styleLoaded: map.isStyleLoaded(),
        volume: map.getLayoutProperty("geoai-live-selection-volume", "visibility"),
        fill: map.getLayoutProperty("geoai-live-selection-fill", "visibility"),
        retainedSibling: retained.features.some(feature => feature.id === 902 &&
          feature.geometry.type === "MultiPolygon" && feature.geometry.coordinates.length === 1),
        nativeFilter: JSON.stringify(map.getFilter("geoai-buildings-3d")) };
    });
    expect(held).toMatchObject({ unrelatedLoaded: false, styleLoaded: false, volume: "visible", fill: "none", retainedSibling: true });
    expect(held.nativeFilter).toContain("902");
    await page.screenshot({ path: info.outputPath("selected-relation-unrelated-pending.png") });
    await page.getByRole("button", { name: /3d volume/i }).press("Enter");
    await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty(
      "geoai-live-selection-volume", "visibility"))).toBe("none");
    await page.getByRole("button", { name: /3d volume/i }).press("Enter");
    await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty(
      "geoai-live-selection-volume", "visibility"))).toBe("visible");
    await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
    await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty(
      "geoai-live-selection-volume", "visibility"))).toBe("none");
    await page.getByRole("button", { name: "3d", exact: true }).press("Enter");
    await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty(
      "geoai-live-selection-volume", "visibility"))).toBe("visible");
    await page.getByRole("tab", { name: "Create" }).click();
    await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty(
      "geoai-live-selection-volume", "visibility"))).toBe("none");
    await page.getByRole("tab", { name: "Analyse" }).click();
    await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty(
      "geoai-live-selection-volume", "visibility"))).toBe("visible");
    expect(await page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("review29-unrelated-pending"))).toBe(false);
  } finally {
    releaseUnrelated?.();
  }
});

test("Review29 restores a saved member after Create without a manual 3D-volume toggle", async ({ page, browserName }, info) => {
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
  await installOfflineMap(page, []);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/prototype/point-to-object?mode=analyse");
  await exposeMap(page);
  await page.evaluate(() => (window as BrowserMap).review29Map!.jumpTo({ center: [55.2842, 25.2142], zoom: 17, pitch: 55 }));
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles"))).toBe(true);
  await clickMapCoordinate(page, [55.2842, 25.2139]);
  await expect(page.getByTestId("selected-object")).toContainText("Mapped hotel relation");
  await expect.poll(() => page.evaluate(() => Boolean(sessionStorage.getItem("geoai:point-to-object:selection:v3")))).toBe(true);
  await page.goto("/prototype/point-to-object?mode=create");
  await exposeMap(page);
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles"))).toBe(true);
  await page.getByLabel("Upload GeoJSON").setInputFiles({ name: "review29-restored-area.geojson", mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify(restoredCreateSite)) });
  await page.getByTestId("create-map-presentation-toggle").click();
  await expect.poll(() => page.evaluate(() => JSON.stringify((window as BrowserMap).review29Map!.getFilter(
    "geoai-buildings-3d")).includes("distance"))).toBe(true);
  await page.getByRole("button", { name: "Public campus" }).click();
  await page.getByTestId("create-generate-action").click();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await page.getByTestId("create-open-result-dashboard").click();
  await page.getByRole("dialog").getByRole("button", { name: "Show on map" }).click();
  await page.getByRole("tab", { name: "Analyse" }).click();
  await expect(page.getByTestId("selected-object")).toContainText("Mapped hotel relation");
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty(
    "geoai-live-selection-volume", "visibility"))).toBe("visible");
  await page.screenshot({ path: info.outputPath("restored-member-after-create.png") });
});

test("Review29 committed Create massing survives zoom 18→10→18, pan, style, 2D/3D and A/B without another request", async ({ page, browserName }, info) => {
  const createPosts: string[] = [];
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
  const offline = await installOfflineMap(page, createPosts);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/prototype/point-to-object?mode=create");
  await exposeMap(page);
  await page.getByLabel("Upload GeoJSON").setInputFiles({ name: "review29-area.geojson", mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify(createSite)) });
  await page.getByTestId("create-map-presentation-toggle").click();
  await page.getByRole("button", { name: "Public campus" }).click();
  await page.getByTestId("create-generate-action").click();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty("geoai-concept-volume", "visibility"))).toBe("visible");
  const state = () => page.evaluate(async () => {
    const map = (window as BrowserMap).review29Map!;
    const source = map.getSource("geoai-concept-massing") as GeoJSONSource;
    const data = await source.getData() as FeatureCollection;
    return { ids: data.features.map(feature => feature.id), volume: map.getLayoutProperty("geoai-concept-volume", "visibility"),
      fill: map.getLayoutProperty("geoai-concept-fill", "visibility"), mask: map.getLayoutProperty("geoai-create-aoi-low-zoom-mask", "visibility"),
      volumePattern: map.getPaintProperty("geoai-concept-volume", "fill-extrusion-pattern"),
      volumeCount: map.queryRenderedFeatures({ layers: ["geoai-concept-volume"] }).length,
      maskCount: map.queryRenderedFeatures({ layers: ["geoai-create-aoi-low-zoom-mask"] }).length };
  });
  const initial = await state();
  expect(initial.ids.length).toBeGreaterThan(0);
  expect(initial.volumePattern).toBeUndefined();
  await page.screenshot({ path: info.outputPath("create-3d-zoom18.png") });
  await page.evaluate(() => {
    const target = window as BrowserMap, map = target.review29Map!;
    target.review29HighZoomSamples = { total: 0, hidden: 0 };
    map.on("render", () => {
      if (map.getZoom() < 14 || !map.getLayer("geoai-concept-volume")) return;
      const samples = target.review29HighZoomSamples!;
      samples.total += 1;
      if (map.getLayoutProperty("geoai-concept-volume", "visibility") !== "visible") samples.hidden += 1;
    });
    map.easeTo({ center: [55.2702, 25.2051], zoom: 16.5, bearing: 25, pitch: 52, duration: 500 });
  });
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isMoving())).toBe(false);
  const highZoomSamples = await page.evaluate(() => (window as BrowserMap).review29HighZoomSamples!);
  expect(highZoomSamples.total).toBeGreaterThan(0);
  expect(highZoomSamples.hidden).toBe(0);
  const nativeFilterBeforeDelay = await page.evaluate(() => {
    const map = (window as BrowserMap).review29Map!;
    return JSON.stringify(map.getFilter("geoai-buildings-3d"));
  });
  await page.evaluate(() => {
    const map = (window as BrowserMap).review29Map!;
    (map.getSource("openmaptiles") as VectorTileSource).setTiles(["https://tiles.openfreemap.org/review29-delayed/{z}/{x}/{y}.pbf"]);
    // Exercise the app's replacement reconciler while the next source tiles
    // are genuinely held back by the fixture, not just after settled idle.
    map.fire("idle");
  });
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles"))).toBe(false);
  await page.waitForTimeout(300);
  const duringDelay = await page.evaluate(() => {
    const map = (window as BrowserMap).review29Map!;
    return { volume: map.getLayoutProperty("geoai-concept-volume", "visibility"),
      nativeFilter: JSON.stringify(map.getFilter("geoai-buildings-3d")),
      samples: (window as BrowserMap).review29HighZoomSamples! };
  });
  expect(duringDelay.volume).toBe("visible");
  expect(duringDelay.nativeFilter).toBe(nativeFilterBeforeDelay);
  expect(duringDelay.samples.hidden).toBe(0);
  offline.releaseDelayedTiles();
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles"))).toBe(true);
  await expect.poll(async () => (await state()).volumeCount).toBeGreaterThan(0);
  expect((await page.evaluate(() => (window as BrowserMap).review29HighZoomSamples!)).hidden).toBe(0);
  await page.evaluate(() => (window as BrowserMap).review29Map!.jumpTo({ center: [55.2701, 25.205], zoom: 10, pitch: 55, bearing: 30 }));
  await expect.poll(async () => (await state()).mask).toBe("visible");
  await expect.poll(async () => (await state()).volume).toBe("visible");
  // At zoom 10 the individual blocks are subpixel; the exact uploaded site
  // surface is the visible representation while the committed source stays.
  await expect.poll(async () => (await state()).maskCount).toBeGreaterThan(0);
  expect((await state()).ids).toEqual(initial.ids);
  await page.screenshot({ path: info.outputPath("create-3d-zoom10.png") });
  await page.evaluate(() => (window as BrowserMap).review29Map!.jumpTo({ center: [55.2703, 25.2052], zoom: 18, pitch: 50, bearing: -40 }));
  await expect.poll(async () => (await state()).volume).toBe("visible");
  await expect.poll(async () => (await state()).volumeCount).toBeGreaterThan(0);
  await page.getByLabel("Map style", { exact: true }).selectOption("light");
  await expect.poll(async () => (await state()).volume).toBe("visible");
  await expect.poll(async () => (await state()).volumeCount).toBeGreaterThan(0);
  await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
  await expect.poll(async () => (await state()).fill).toBe("visible");
  await page.getByRole("button", { name: "3d", exact: true }).press("Enter");
  await expect.poll(async () => (await state()).volume).toBe("visible");
  await page.getByTestId("create-alternative-b").click();
  await expect.poll(async () => (await state()).ids[0]).toBe("B-1");
  await page.getByTestId("create-alternative-a").click();
  await expect.poll(async () => (await state()).ids).toEqual(initial.ids);
  expect(createPosts).toHaveLength(1);
});

test("Review29 a late native building layer is re-partitioned after source tiles return", async ({ page, browserName }, info) => {
  const createPosts: string[] = [];
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
  const offline = await installOfflineMap(page, createPosts);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/prototype/point-to-object?mode=create");
  await exposeMap(page);
  await page.getByLabel("Upload GeoJSON").setInputFiles({ name: "review29-area.geojson", mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify(createSite)) });
  await page.getByTestId("create-map-presentation-toggle").click();
  await page.getByRole("button", { name: "Public campus" }).click();
  await page.getByTestId("create-generate-action").click();
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty("geoai-concept-volume", "visibility"))).toBe("visible");
  await expect.poll(() => page.evaluate(() => {
    const map = (window as BrowserMap).review29Map!;
    const retainedId = "geoai-existing-partition-source:openmaptiles";
    return map.loaded() && Boolean(map.getSource(retainedId)) && map.isSourceLoaded(retainedId) &&
      JSON.stringify(map.getFilter("geoai-buildings-3d")).includes("distance");
  })).toBe(true);
  const priorFilter = await page.evaluate(() => JSON.stringify((window as BrowserMap).review29Map!.getFilter("geoai-buildings-3d")));
  expect(priorFilter).toContain("distance");
  await page.evaluate(() => {
    const map = (window as BrowserMap).review29Map!;
    (map.getSource("openmaptiles") as VectorTileSource).setTiles(["https://tiles.openfreemap.org/review29-delayed/{z}/{x}/{y}.pbf"]);
  });
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles"))).toBe(false);
  await page.evaluate(() => {
    const map = (window as BrowserMap).review29Map!;
    map.addLayer({ id: "review29-late-building-fill", type: "fill", source: "openmaptiles", "source-layer": "building",
      paint: { "fill-color": "#d6dcdf", "fill-opacity": 1 } }, "geoai-concept-volume");
    map.fire("idle");
  });
  // MapLibre can cancel the delayed request and reuse loaded tiles on
  // addLayer, so the browser test verifies rendered safety and final
  // re-partitioning. The exact pending-topology branch is exercised in the
  // deterministic renderer contract.
  await expect.poll(() => page.evaluate(() => {
    const map = (window as BrowserMap).review29Map!;
    return map.queryRenderedFeatures(map.project([55.26965, 25.20465]), { layers: ["review29-late-building-fill"] }).length;
  })).toBe(0);
  offline.releaseDelayedTiles();
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles"))).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const map = (window as BrowserMap).review29Map!;
    return JSON.stringify(map.getFilter("review29-late-building-fill") ?? null).includes("distance") &&
      map.getLayoutProperty("geoai-concept-volume", "visibility") === "visible" &&
      map.queryRenderedFeatures(map.project([55.26965, 25.20465]), { layers: ["review29-late-building-fill"] }).length === 0;
  })).toBe(true);
  expect(createPosts).toHaveLength(1);
});
