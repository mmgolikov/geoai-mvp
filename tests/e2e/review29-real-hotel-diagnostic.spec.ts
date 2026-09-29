import { expect, test } from "@playwright/test";
import type { Map as MapLibreMap } from "maplibre-gl";
import { externalHttpUrlPattern, installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";
import { sprint10Selection } from "./helpers/sprint10-analysis-fixture";

type BrowserMap = Window & { review29Map?: MapLibreMap };
type Hook = { memoizedState: unknown; next: Hook | null };
type Fiber = { memoizedState: Hook | null; return: Fiber | null };

test.use({ deviceScaleFactor: 2 });

test("real OpenFreeMap hotel member becomes translucent before unrelated source reaches idle", async ({ page, browserName }, info) => {
  test.skip(process.env.GEOAI_REAL_TILE_DIAGNOSTIC !== "1", "Opt-in public basemap diagnostic; offline CI never calls external tiles.");
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
  let releaseHeld: (() => void) | undefined;
  const held = new Promise<void>(resolve => { releaseHeld = resolve; });
  await page.route(externalHttpUrlPattern(info.project.use.baseURL), route => {
    const url = new URL(route.request().url());
    return url.protocol === "https:" && url.hostname === "tiles.openfreemap.org"
      ? route.continue() : route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session", route => route.fulfill({ json: { isAuthenticated: false, user: null } }));
  await page.route("**/api/prototype/point-to-object/**", route => route.fulfill({ status: 503, json: { mode: "unavailable" } }));
  await page.route("**/api/prototype/point-to-object/context", route => route.fulfill({ json: {
    mode: "resolved", subject: { ...sprint10Selection.resolvedObject, name: "Ernst Biergarten", sourceFeatureId: "node/90001",
      coordinateAssociation: "reverse_nearest_indexed_object_not_point_in_polygon", resultCentroidDistanceM: 30 }
  } }));
  await page.route("https://tiles.openfreemap.org/review29-held.geojson", async route => {
    await held;
    return route.fulfill({ json: { type: "FeatureCollection", features: [] } });
  });
  await page.setViewportSize({ width: 3416, height: 2000 });
  await page.goto("/prototype/point-to-object?mode=analyse");
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
  const coordinate: [number, number] = [55.284040, 25.219799];
  await page.evaluate(value => (window as BrowserMap).review29Map!.jumpTo({ center: value, zoom: 17.5, pitch: 55, bearing: 0 }), coordinate);
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles")), { timeout: 30_000 }).toBe(true);
  await page.evaluate(() => (window as BrowserMap).review29Map!.addSource("review29-held-unrelated", {
    type: "geojson", data: "https://tiles.openfreemap.org/review29-held.geojson"
  }));
  const before = await page.evaluate(value => {
    const map = (window as BrowserMap).review29Map!;
    const pt = map.project(value);
    return map.queryRenderedFeatures([pt.x, pt.y]).filter(f => f.source === "openmaptiles" && f.sourceLayer === "building").map(f => ({
      id: f.id, layer: f.layer.id, type: f.geometry.type, parts: f.geometry.type === "MultiPolygon" ? f.geometry.coordinates.length : 1,
      rings: f.geometry.type === "Polygon" ? f.geometry.coordinates.length : null,
      name: f.properties.name, render_height: f.properties.render_height, render_min_height: f.properties.render_min_height,
      height: f.properties.height, hide_3d: f.properties.hide_3d
    }));
  }, coordinate);
  expect(before).toContainEqual(expect.objectContaining({ id: 146043140, type: "MultiPolygon", parts: 4, render_height: 33 }));
  const pixel = await page.evaluate(value => {
    const map = (window as BrowserMap).review29Map!;
    const point = map.project(value), rect = map.getCanvas().getBoundingClientRect();
    return { x: rect.left + point.x, y: rect.top + point.y };
  }, coordinate);
  await page.mouse.click(pixel.x, pixel.y);
  await page.getByRole("button", { name: "3d", exact: true }).press("Enter");
  await expect(page.getByText(/Nearest mapped context/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("geoai-existing-partition-source:openmaptiles")), { timeout: 30_000 }).toBe(true);
  let heldState: { unrelatedLoaded: boolean; styleLoaded: boolean; mapLoaded: boolean; partitionLoaded: boolean; volume: unknown } | null = null;
  try {
    await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty("geoai-live-selection-volume", "visibility")), { timeout: 10_000 }).toBe("visible");
    heldState = await page.evaluate(() => {
      const map = (window as BrowserMap).review29Map!;
      return { unrelatedLoaded: map.isSourceLoaded("review29-held-unrelated"), styleLoaded: map.isStyleLoaded() === true, mapLoaded: map.loaded(),
        partitionLoaded: map.isSourceLoaded("geoai-existing-partition-source:openmaptiles"), volume: map.getLayoutProperty("geoai-live-selection-volume", "visibility") };
    });
    await page.screenshot({ path: info.outputPath("real-hotel-while-unrelated-source-pending.png") });
  } finally {
    releaseHeld?.();
  }
  expect(heldState).toEqual({ unrelatedLoaded: false, styleLoaded: false, mapLoaded: false, partitionLoaded: true, volume: "visible" });
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.isSourceLoaded("review29-held-unrelated")), { timeout: 30_000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as BrowserMap).review29Map!.getLayoutProperty("geoai-live-selection-volume", "visibility")), { timeout: 30_000 }).toBe("visible");
  const after = await page.evaluate(async () => {
    const map = (window as BrowserMap).review29Map!;
    const source = map.getSource("geoai-live-selection") as { getData(): Promise<unknown> } | undefined;
    const partition = map.getSource("geoai-existing-partition-source:openmaptiles") as { getData(): Promise<unknown> } | undefined;
    const pt = map.project([55.284839,25.219501]);
    const partitionData = partition ? await partition.getData() as { features?: Array<{ id?: string | number; geometry?: { type: string; coordinates: unknown[] } }> } : null;
    return { selection: source ? await source.getData() : null,
      pitch: map.getPitch(), zoom: map.getZoom(),
      volume: map.getLayoutProperty("geoai-live-selection-volume", "visibility"),
      fill: map.getLayoutProperty("geoai-live-selection-fill", "visibility"),
      volumeAtClick: map.queryRenderedFeatures([pt.x,pt.y], { layers: ["geoai-live-selection-volume"] }).length,
      volumeOpacity: map.getPaintProperty("geoai-live-selection-volume", "fill-extrusion-opacity"),
      nativeFilter: map.getFilter("geoai-buildings-3d"),
      partition: partitionData?.features?.map(f => ({ id: f.id, type: f.geometry?.type, parts: f.geometry?.coordinates?.length })) ?? null,
      partitionLayer: map.getLayer("geoai-existing-partition-layer:geoai-buildings-3d")
        ? map.getLayoutProperty("geoai-existing-partition-layer:geoai-buildings-3d", "visibility") : null,
      buildingsAtClick: map.queryRenderedFeatures([pt.x,pt.y]).filter(f => f.sourceLayer === "building").map(f => ({id:f.id,layer:f.layer.id,name:f.properties.name,type:f.geometry.type})),
      sourceLoaded: map.isSourceLoaded("openmaptiles") };
  });
  expect(after.pitch).toBeCloseTo(55);
  expect(after).toMatchObject({ zoom: 17.5, volume: "visible", fill: "none", volumeAtClick: 1,
    volumeOpacity: 0.5, partition: [{ id: 146043140, type: "MultiPolygon", parts: 3 }], sourceLoaded: true });
  expect(JSON.stringify(after.nativeFilter)).toContain("146043140");
  await page.screenshot({ path: info.outputPath("real-hotel.png") });
});
