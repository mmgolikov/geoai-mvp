import { expect, test, type Page, type Route } from "@playwright/test";
import { fromGeojsonVt } from "@maplibre/vt-pbf";
import type { FeatureCollection, Position } from "geojson";
import { installLocalWebKitHttpCsp } from "./helpers/local-webkit-csp";

const rectangle = (w: number, s: number, e: number, n: number): Position[][] => [[[w,s],[e,s],[e,n],[w,n],[w,s]]];
const aoi = { type: "Polygon", coordinates: rectangle(55.320,25.224,55.326,25.229) };
const inside = rectangle(55.321,25.225,55.3215,25.2255);
const outside = rectangle(55.327,25.225,55.3275,25.2255);
const crossing = rectangle(55.3258,25.226,55.3262,25.2264);
const secondInside = rectangle(55.324,25.227,55.3244,25.2274);
const features: FeatureCollection = { type: "FeatureCollection", features: [
  { type: "Feature", id: 901, properties: { render_height: 5, render_min_height: 0 }, geometry: { type: "MultiPolygon", coordinates: [inside, outside, crossing, secondInside, rectangle(55.311,25.225,55.3115,25.2255)] } },
  { type: "Feature", id: 901, properties: { render_height: 5, render_min_height: 0 }, geometry: { type: "Polygon", coordinates: rectangle(55.318,25.226,55.3185,25.2265) } },
  { type: "Feature", id: 902, properties: { render_height: 90, render_min_height: 0, hide_3d: true }, geometry: { type: "Polygon", coordinates: rectangle(55.322,25.225,55.323,25.226) } },
  { type: "Feature", id: 903, properties: { render_height: 20, render_min_height: 0 }, geometry: { type: "Polygon", coordinates: rectangle(55.322,25.225,55.3224,25.226) } },
  { type: "Feature", id: 904, properties: { render_height: 60, render_min_height: 0 }, geometry: { type: "Polygon", coordinates: rectangle(55.3224,25.225,55.323,25.226) } }
] };

async function fixture(page: Page) {
  const { GeoJSONVT } = await import("@maplibre/geojson-vt");
  const index = new GeoJSONVT(features, { maxZoom: 14, tolerance: 0, extent: 8192, buffer: 64 });
  await page.route(/^https:\/\//, async route => {
    const url = new URL(route.request().url());
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
      await route.fulfill({ json: { version: 8, sources: { openmaptiles: { type: "vector", tiles: ["https://tiles.openfreemap.org/sprint07/{z}/{x}/{y}.pbf"], maxzoom: 14, attribution: "Offline representative fixture · © OpenStreetMap contributors" } }, layers: [
        { id: "background", type: "background", paint: { "background-color": "#f5f5ef" } },
        { id: "building-fill", type: "fill", source: "openmaptiles", "source-layer": "building", paint: { "fill-color": "#d6dcdf" } },
        { id: "building-line", type: "line", source: "openmaptiles", "source-layer": "building", paint: { "line-color": "#adb8bc", "line-width": 1 } }
      ] } });
      return;
    }
    const match = url.pathname.match(/^\/sprint07\/(\d+)\/(\d+)\/(\d+)\.pbf$/);
    if (match) {
      const tile = index.getTile(Number(match[1]), Number(match[2]), Number(match[3]));
      await route.fulfill({ contentType: "application/x-protobuf", body: tile ? Buffer.from(fromGeojsonVt({ building: tile }, { extent: 8192, version: 2 })) : Buffer.alloc(0) });
      return;
    }
    await route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session", route => route.fulfill({ json: { isAuthenticated: false, user: null } }));
  await page.route("**/api/prototype/point-to-object/**", route => route.fulfill({ status: 503, json: { mode: "unavailable", error: "Offline map-only fixture, zero provider execution." } }));
}

async function exposeMap(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector("[data-testid='live-map-canvas']");
    if (!canvas) return false;
    type Fiber = { memoizedState?: { memoizedState?: { current?: import("maplibre-gl").Map }; next?: unknown }; return?: Fiber };
    const key = Object.getOwnPropertyNames(canvas).find(key => key.startsWith("__reactFiber$"));
    let fiber = key ? (canvas as unknown as Record<string, Fiber>)[key] : undefined;
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const map = hook.memoizedState?.current;
        if (map && typeof map.jumpTo === "function" && map.isStyleLoaded()) {
          (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map = map;
          return true;
        }
        hook = hook.next as typeof hook;
      }
      fiber = fiber.return;
    }
    return false;
  })).toBe(true);
}

async function pointCovered(page: Page, coordinate: [number, number]) {
  return page.evaluate(coordinate => {
    const map = (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map;
    if (!map.getStyle() || !map.isStyleLoaded()) return null;
    const point = map.project(coordinate);
    const layers = (map.getStyle().layers ?? []).filter(layer => layer.type === "fill" && (layer.id === "building-fill" || layer.id.startsWith("geoai-existing-partition-layer:building-fill"))).map(layer => layer.id);
    return map.queryRenderedFeatures(point, { layers }).length > 0;
  }, coordinate);
}

test("Sprint07 partitions complete native members and restores exterior buildings through source, style, mode and clear cycles", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installLocalWebKitHttpCsp(page, testInfo.project.use.browserName, testInfo.project.use.baseURL);
  await fixture(page);
  await page.goto("/prototype/point-to-object?mode=create");
  await exposeMap(page);
  await page.getByLabel("Upload GeoJSON").setInputFiles({ name: "representative-sprint07.geojson", mimeType: "application/geo+json", buffer: Buffer.from(JSON.stringify(aoi)) });
  await expect(page.getByTestId("create-map-presentation-toggle")).toBeVisible();
  // Next's local dev indicator sits over the first dimension button. Keyboard
  // activation exercises the actual control without hiding development UI.
  await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
  await page.evaluate(() => (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map.jumpTo({ center: [55.323,25.2265], zoom: 16.3, pitch: 0, bearing: 0 }));
  await expect.poll(() => pointCovered(page, [55.3212,25.2252])).toBe(true);
  await page.getByTestId("create-map-presentation-toggle").click();
  await expect.poll(() => pointCovered(page, [55.3212,25.2252])).toBe(false);
  await expect.poll(() => pointCovered(page, [55.3242,25.2272])).toBe(false);
  await expect.poll(() => pointCovered(page, [55.3272,25.2252])).toBe(true);
  // Sprint09's explicit visual policy hides a whole footprint member with
  // positive AOI overlap, including its outside portion; unrelated siblings stay.
  await expect.poll(() => pointCovered(page, [55.3261,25.2262])).toBe(false);
  await expect.poll(() => pointCovered(page, [55.3182,25.2262])).toBe(true);
  const preserved = await page.evaluate(async () => {
    const map = (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map;
    const nativeParts = new Set(map.querySourceFeatures("openmaptiles", { sourceLayer: "building" }).flatMap(feature => feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates.map(part => JSON.stringify(part)) : []));
    const source = map.getSource("geoai-existing-partition-source:openmaptiles") as import("maplibre-gl").GeoJSONSource;
    const data = await source.getData() as FeatureCollection;
    return data.features.every(feature => feature.geometry.type === "MultiPolygon" && feature.geometry.coordinates.every(part => nativeParts.has(JSON.stringify(part)))) && data.features.length > 0;
  });
  expect(preserved).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("partition-inside-hidden-outside-preserved.png") });
  await page.getByRole("button", { name: "3d", exact: true }).press("Enter");
  await expect.poll(() => page.evaluate(() => {
    const map = (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map;
    return map.getLayoutProperty("geoai-existing-partition-layer:geoai-buildings-3d", "visibility");
  })).toBe("visible");
  await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
  await page.getByLabel("Map style", { exact: true }).selectOption("light");
  await expect.poll(() => pointCovered(page, [55.3212,25.2252])).toBe(false);
  await expect.poll(() => pointCovered(page, [55.3272,25.2252])).toBe(true);
  await page.evaluate(() => (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map.jumpTo({ zoom: 12 }));
  await expect.poll(() => page.evaluate(() => {
    const map = (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map;
    return map.getFilter("building-fill") ?? null;
  })).toBe(null);
  await expect.poll(() => pointCovered(page, [55.3212,25.2252])).toBe(true);
  await page.evaluate(() => (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map.jumpTo({ zoom: 16.3 }));
  await expect.poll(() => page.evaluate(() => {
    const map = (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map;
    return map.isStyleLoaded() && map.isSourceLoaded("openmaptiles");
  })).toBe(true);
  await expect.poll(() => pointCovered(page, [55.3212,25.2252])).toBe(false);
  await expect.poll(() => pointCovered(page, [55.3272,25.2252])).toBe(true);
  await page.getByTestId("create-map-presentation-toggle").click();
  await expect.poll(() => pointCovered(page, [55.3212,25.2252])).toBe(true);
  await expect.poll(() => pointCovered(page, [55.3272,25.2252])).toBe(true);
  await expect.poll(() => pointCovered(page, [55.3261,25.2262])).toBe(true);
  await page.getByTestId("create-delete-area").click();
  await expect.poll(() => page.evaluate(() => {
    const map = (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map;
    return map.getFilter("building-fill") ?? null;
  })).toBe(null);
});

test("Sprint07 selects a complete tile member without colouring the aggregate and preserves it across style and reload", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installLocalWebKitHttpCsp(page, testInfo.project.use.browserName, testInfo.project.use.baseURL);
  await fixture(page);
  await page.goto("/prototype/point-to-object?mode=analyse");
  await exposeMap(page);
  await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
  await page.evaluate(() => (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map.jumpTo({ center: [55.3212,25.2252], zoom: 17, pitch: 0, bearing: 0 }));
  await expect.poll(() => pointCovered(page, [55.3212,25.2252])).toBe(true);
  let pendingSourceRoute: Route | null = null;
  await page.route("https://tiles.openfreemap.org/sprint07/pending-source.geojson", route => { pendingSourceRoute = route; });
  await page.evaluate(() => (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map.addSource("sprint07-unrelated-pending", { type: "geojson", data: "https://tiles.openfreemap.org/sprint07/pending-source.geojson" }));
  await expect.poll(() => pendingSourceRoute !== null).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map.isStyleLoaded())).toBe(false);
  const clickCoordinate = async (coordinate: [number, number]) => {
    const pixel = await page.evaluate(coordinate => {
      const map = (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map;
      const point = map.project(coordinate); const rect = map.getCanvas().getBoundingClientRect();
      return { x: rect.x + point.x, y: rect.y + point.y };
    }, coordinate);
    await page.mouse.click(pixel.x, pixel.y);
  };
  const selectedMember = () => page.evaluate(() => {
    const map = (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map;
    if (!map.getLayer("geoai-live-selection-fill")) return false;
    return map.queryRenderedFeatures({ layers: ["geoai-live-selection-fill"] }).some(feature => feature.geometry.type === "Polygon" && feature.properties?.geometryProvenance === "rendered_tile_polygon_member");
  });
  await clickCoordinate([55.3212,25.2252]);
  await expect.poll(selectedMember).toBe(true);
  await (pendingSourceRoute as unknown as Route).fulfill({ json: { type: "FeatureCollection", features: [] } });
  await page.unroute("https://tiles.openfreemap.org/sprint07/pending-source.geojson");
  await page.evaluate(() => (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map.removeSource("sprint07-unrelated-pending"));
  await page.screenshot({ path: testInfo.outputPath("exact-tile-member-flat-selection.png") });
  expect(await page.evaluate(async () => {
    const map = (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map;
    const nativeParts = map.querySourceFeatures("openmaptiles", { sourceLayer: "building" }).flatMap(feature => feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : []);
    const data = await (map.getSource("geoai-live-selection") as import("maplibre-gl").GeoJSONSource).getData() as import("geojson").Feature<import("geojson").Polygon>;
    return nativeParts.some(part => JSON.stringify(part) === JSON.stringify(data.geometry.coordinates));
  })).toBe(true);
  await page.getByRole("button", { name: "3d", exact: true }).press("Enter");
  await expect.poll(() => page.evaluate(() => (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map.getPaintProperty("geoai-buildings-3d", "fill-extrusion-color"))).toBe("#d6dcdf");
  await page.getByLabel("Map style", { exact: true }).selectOption("light");
  await expect.poll(selectedMember).toBe(true);
  await page.reload();
  await exposeMap(page);
  await expect.poll(selectedMember).toBe(true);
  await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
  await page.evaluate(() => (window as unknown as { sprint07map: import("maplibre-gl").Map }).sprint07map.jumpTo({ center: [55.3212,25.2252], zoom: 17, pitch: 0, bearing: 0 }));
  await clickCoordinate([55.3205,25.2252]);
  await expect.poll(selectedMember).toBe(false);
});
