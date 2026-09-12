import { expect, test, type Page } from "@playwright/test";
import { installLocalWebKitHttpCsp } from "./helpers/local-webkit-csp";
import { fromGeojsonVt } from "@maplibre/vt-pbf";
import type { FeatureCollection, Polygon, Position } from "geojson";
import difcFixture from "../fixtures/difc-native-building-sept10.json";
import { featureFilter } from "@maplibre/maplibre-gl-style-spec";

const origin = [55.2828, 25.2137];
const ring = (points: number[][]): Position[] => points.map(([x, y]) => [origin[0] + x, origin[1] + y]);
const geometry: FeatureCollection = { type: "FeatureCollection", features: [
  { type: "Feature", id: 901, properties: { name: "Complex courtyard", render_height: 42, render_min_height: 4 }, geometry: { type: "Polygon", coordinates: [
    ring([[0, 0], [.001, 0], [.001, .00015], [.0008, .00015], [.0008, .0003], [.001, .0003], [.001, .0007], [0, .0007], [0, 0]]),
    ring([[.0002, .0002], [.0002, .0005], [.0006, .0005], [.0006, .0002], [.0002, .0002]])
  ] } },
  { type: "Feature", id: 902, properties: { name: "Multipart neighbour", render_height: 18, render_min_height: 0 }, geometry: { type: "MultiPolygon", coordinates: [
    [ring([[.0013, 0], [.0015, 0], [.0015, .0002], [.0013, .0002], [.0013, 0]])],
    [ring([[.0013, .0004], [.0015, .0004], [.0015, .0006], [.0013, .0006], [.0013, .0004]])]
  ] } },
  { type: "Feature", id: 901, properties: { name: "Distant reused ID", render_height: 65, render_min_height: 0 }, geometry: { type: "Polygon", coordinates: [ring([[-.001, 0], [-.0007, 0], [-.0007, .0003], [-.001, .0003], [-.001, 0]])] } },
  { type: "Feature", id: 901, properties: { name: "Touching reused ID", render_height: 22, render_min_height: 0 }, geometry: { type: "Polygon", coordinates: [ring([[0, .0007], [.0004, .0007], [.0004, .001], [0, .001], [0, .0007]])] } },
  { type: "Feature", id: 901, properties: { name: "Mixed reused ID", render_height: 12, render_min_height: 0 }, geometry: { type: "MultiPolygon", coordinates: [
    [ring([[.00065, .00005], [.00075, .00005], [.00075, .0001], [.00065, .0001], [.00065, .00005]])],
    [ring([[.00065, .0007], [.00075, .0007], [.00075, .001], [.00065, .001], [.00065, .0007]])]
  ] } },
  { type: "Feature", id: Number(difcFixture.selection.object.sourceFeatureId), properties: { name: "Captured DIFC L-shape", render_height: 235, render_min_height: 0 }, geometry: difcFixture.selection.object.geometry as Polygon },
  { type: "Feature", id: Number(difcFixture.selection.object.sourceFeatureId), properties: { name: "Outside reused-ID neighbour", render_height: 30, render_min_height: 0 }, geometry: { type: "Polygon", coordinates: difcFixture.selection.object.geometry.coordinates.map(ring => ring.map(([x, y]) => [x + .002, y])) } }
] };

async function installMapFixture(page: Page) {
  const { GeoJSONVT } = await import("@maplibre/geojson-vt");
  const index = new GeoJSONVT(geometry, { maxZoom: 18, tolerance: 0, extent: 8192, buffer: 64 });
  await page.route(/^https:\/\//, async route => {
    const url = new URL(route.request().url());
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
      await route.fulfill({ json: { version: 8, sources: { openmaptiles: { type: "vector", tiles: ["https://tiles.openfreemap.org/map10/{z}/{x}/{y}.pbf"], maxzoom: 18 } }, layers: [
        { id: "background", type: "background", paint: { "background-color": "#f4f3ed" } },
        { id: "building", type: "fill", source: "openmaptiles", "source-layer": "building", paint: { "fill-color": "#d6dcdf" } }
      ] } });
      return;
    }
    const match = url.pathname.match(/^\/map10\/(\d+)\/(\d+)\/(\d+)\.pbf$/);
    if (match) {
      const tile = index.getTile(Number(match[1]), Number(match[2]), Number(match[3]));
      await route.fulfill({ contentType: "application/x-protobuf", body: tile ? Buffer.from(fromGeojsonVt({ building: tile }, { extent: 8192, version: 2 })) : Buffer.alloc(0) });
      return;
    }
    await route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session", route => route.fulfill({ json: { isAuthenticated: false, user: null } }));
  await page.route("**/api/prototype/point-to-object/**", route => route.fulfill({ status: 503, json: { mode: "unavailable", error: "MAP10 offline fixture; no provider request." } }));
  return index;
}

async function exposeFixtureMap(page: Page) {
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.evaluate(() => {
    type Hook = { memoizedState: unknown; next: Hook | null };
    type Fiber = { memoizedState: Hook | null; return: Fiber | null };
    const canvas = document.querySelector("[data-testid='live-map-canvas']")!;
    const fiberKey = Object.getOwnPropertyNames(canvas).find(key => key.startsWith("__reactFiber$"))!;
    let fiber = (canvas as unknown as Record<string, Fiber>)[fiberKey];
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const value = (hook.memoizedState as { current?: { jumpTo?: unknown } } | null)?.current;
        if (typeof value?.jumpTo === "function") {
          (window as unknown as { map10: unknown }).map10 = value;
          return;
        }
        hook = hook.next;
      }
      fiber = fiber.return!;
    }
    throw new Error("MAP10 map instance unavailable");
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.isStyleLoaded())).toBe(true);
}

test("MAP10 native complex/multipart highlight preserves geometry without duplicate extrusion and remains selectable at close zoom", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await installLocalWebKitHttpCsp(page, testInfo.project.use.browserName, testInfo.project.use.baseURL);
  const index = await installMapFixture(page);
  await page.goto("/prototype/point-to-object");
  await exposeFixtureMap(page);
  await page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.jumpTo({ center: [55.2831, 25.214], zoom: 20, pitch: 0, bearing: 0 }));
  await expect.poll(() => page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.isStyleLoaded())).toBe(true);
  const coordinate: [number, number] = [55.2829, 25.214];
  const point = await page.evaluate(value => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    const p = map.project(value); const rect = map.getContainer().getBoundingClientRect();
    return { x: p.x + rect.left, y: p.y + rect.top };
  }, coordinate);
  await page.mouse.click(point.x, point.y);
  await expect(page.getByTestId("selected-object")).toHaveText("Complex courtyard");
  const selected = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3")!));
  expect(selected.object.geometry.type).toBe("Polygon");
  expect(selected.object.geometry.coordinates).toHaveLength(2);
  await page.getByRole("button", { name: "3d", exact: true }).click();
  await expect(page.getByRole("button", { name: "3D volume", exact: true })).toBeVisible();
  const render = await page.evaluate(() => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    return { duplicate: !!map.getLayer("geoai-live-selection-volume"), color: map.getPaintProperty("geoai-buildings-3d", "fill-extrusion-color"), height: map.getPaintProperty("geoai-buildings-3d", "fill-extrusion-height"), base: map.getPaintProperty("geoai-buildings-3d", "fill-extrusion-base") };
  });
  expect(render.duplicate).toBe(false);
  expect(JSON.stringify(render.color)).toContain("901");
  expect(render.height).toEqual(["coalesce", ["to-number", ["get", "render_height"]], 0]);
  expect(render.base).toEqual(["coalesce", ["to-number", ["get", "render_min_height"]], 0]);
  const z = 18; const scale = 2 ** z;
  const x = Math.floor((coordinate[0] + 180) / 360 * scale);
  const y = Math.floor((1 - Math.asinh(Math.tan(coordinate[1] * Math.PI / 180)) / Math.PI) / 2 * scale);
  const predicate = featureFilter((render.color as unknown[])[1] as Parameters<typeof featureFilter>[0], "layers.selection.filter");
  const outcomes = new Map<string, boolean[]>();
  for (let tx = x - 1; tx <= x + 1; tx++) for (let ty = y - 1; ty <= y + 1; ty++) {
    for (const feature of index.getTile(z, tx, ty)?.features ?? []) {
      const name = String(feature.tags?.name);
      const canonical = { z, x: tx, y: ty } as Parameters<typeof predicate.filter>[2];
      const selected = predicate.filter({ zoom: 20 }, { type: 3, id: feature.id, properties: feature.tags ?? {}, geometry: (feature.geometry as number[][][]).map(ring => ring.map(([x, y]) => ({ x, y }))) }, canonical);
      outcomes.set(name, [...(outcomes.get(name) ?? []), selected]);
    }
  }
  expect(outcomes.get("Complex courtyard")).toContain(true);
  expect(outcomes.get("Touching reused ID")).toBeDefined();
  expect(outcomes.get("Touching reused ID")).not.toContain(true);
  expect(outcomes.get("Mixed reused ID")).toBeDefined();
  expect(outcomes.get("Mixed reused ID")).not.toContain(true);
  await page.evaluate(() => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    map.stop();
    map.jumpTo({ center: [55.28315, 25.21405], zoom: 17.5, pitch: 55, bearing: -25 });
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.isStyleLoaded())).toBe(true);
  const highlightedNames = () => page.evaluate(() => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    const color = map.getPaintProperty("geoai-buildings-3d", "fill-extrusion-color") as unknown[];
    if (!Array.isArray(color) || color[0] !== "case") return [];
    return map.queryRenderedFeatures(undefined, { layers: ["geoai-buildings-3d"], filter: color[1] as import("maplibre-gl").FilterSpecification }).map(feature => feature.properties.name);
  });
  await expect.poll(highlightedNames).toContain("Complex courtyard");
  expect(await highlightedNames()).not.toContain("Touching reused ID");
  expect(await highlightedNames()).not.toContain("Mixed reused ID");
  await page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.jumpTo({ zoom: 18 }));
  await expect.poll(highlightedNames).toContain("Complex courtyard");
  await page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.jumpTo({ zoom: 17 }));
  await expect.poll(highlightedNames).toContain("Complex courtyard");
  await expect.poll(() => page.evaluate(() => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    const color = map.getPaintProperty("geoai-buildings-3d", "fill-extrusion-color") as unknown[];
    const targetCount = map.queryRenderedFeatures(undefined, { layers: ["geoai-buildings-3d"] }).filter(feature => feature.properties.name === "Complex courtyard").length;
    const coloredCount = map.queryRenderedFeatures(undefined, { layers: ["geoai-buildings-3d"], filter: color[1] as import("maplibre-gl").FilterSpecification }).filter(feature => feature.properties.name === "Complex courtyard").length;
    return targetCount > 0 && targetCount === coloredCount;
  })).toBe(true).catch(async error => {
    await testInfo.attach("native-fragment-diagnostic", { contentType: "application/json", body: JSON.stringify(await page.evaluate(() => {
      const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
      return { selection: sessionStorage.getItem("geoai:point-to-object:selection:v3"), source: map.querySourceFeatures("openmaptiles", { sourceLayer: "building" }).filter(feature => feature.properties.name === "Complex courtyard").map(feature => feature.geometry), color: map.getPaintProperty("geoai-buildings-3d", "fill-extrusion-color") };
    })) });
    throw error;
  });
  // Query filters update before asynchronous native paint/tile transitions.
  // Capture only after MapLibre reports the rendered map fully settled.
  await expect.poll(() => page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.loaded())).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("complex-native-highlight-desktop.png") });
  // The complete courtyard Polygon supports native 3D emphasis. Preserve the
  // founder's mobile control-size/alignment coverage on this eligible object.
  await page.setViewportSize({ width: 430, height: 932 });
  await expect(page.getByRole("button", { name: "Open task", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Camera", exact: true }).click();
  const volumeButton = page.getByRole("button", { name: "3D volume", exact: true });
  await expect(volumeButton).toBeVisible();
  if (await volumeButton.getAttribute("aria-pressed") === "false") await volumeButton.click();
  expect(await volumeButton.evaluate(element => ({ align: getComputedStyle(element).alignItems, justify: getComputedStyle(element).justifyContent, height: element.getBoundingClientRect().height }))).toMatchObject({ align: "center", justify: "center", height: 44 });
  await page.getByRole("button", { name: "Camera", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "3D volume", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.getPaintProperty("geoai-buildings-3d", "fill-extrusion-color"))).toBe("#d6dcdf");
  await page.getByRole("button", { name: "2d", exact: true }).press("Enter");
  await page.evaluate(() => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    map.stop(); map.jumpTo({ center: [55.2842, 25.214], zoom: 18, pitch: 0, bearing: 0 });
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.isStyleLoaded())).toBe(true);
  const multipartPoint = await page.evaluate(() => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    const p = map.project([55.2842, 25.2138]); const rect = map.getContainer().getBoundingClientRect();
    const native = map.queryRenderedFeatures(p, { layers: ["building"] }).find(feature => feature.properties.name === "Multipart neighbour");
    if (native?.geometry.type !== "MultiPolygon") throw new Error("Expected the native multipart fixture at the tapped point.");
    const clickedParts = native.geometry.coordinates.filter(part => part[0].every(position => position[1] < 25.214));
    if (clickedParts.length !== 1) throw new Error("Expected exactly one complete southern member.");
    return { x: p.x + rect.left, y: p.y + rect.top, clickedMember: clickedParts[0], sourceFeatureId: String(native.id), heightM: native.properties.render_height, minHeightM: native.properties.render_min_height };
  });
  await page.mouse.click(multipartPoint.x, multipartPoint.y);
  await expect(page.getByTestId("selected-object")).toHaveText("Multipart neighbour");
  const multipart = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3")!));
  expect(multipart.object.geometry).toEqual({ type: "Polygon", coordinates: multipartPoint.clickedMember });
  expect(multipart.object.geometryProvenance).toBe("rendered_tile_polygon_member");
  expect(multipart.object.sourceFeatureId).toBe(multipartPoint.sourceFeatureId);
  expect(multipart.object.renderHeightM).toBe(multipartPoint.heightM);
  expect(multipart.object.renderMinHeightM).toBe(multipartPoint.minHeightM);
  const otherMultipartMemberVisible = () => page.evaluate(() => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    return map.queryRenderedFeatures(map.project([55.2842, 25.2142]), { layers: ["building"] })
      .some(feature => feature.properties.name === "Multipart neighbour");
  });
  await expect.poll(otherMultipartMemberVisible).toBe(true);
  await page.setViewportSize({ width: 430, height: 932 });
  await expect(page.getByRole("button", { name: "Open task", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Camera", exact: true }).click();
  await page.getByRole("button", { name: "3d", exact: true }).press("Enter");
  // A tile Polygon member remains a flat, provenance-labelled selection even
  // when the surrounding native map switches to 3D.
  await expect(volumeButton).toHaveCount(0);
  await page.evaluate(() => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    map.stop(); map.jumpTo({ center: [55.2842, 25.214], zoom: 16.5, pitch: 55, bearing: -25 });
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.isStyleLoaded())).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    return map.queryRenderedFeatures(undefined, { layers: ["geoai-live-selection-fill"] })
      .some(feature => feature.geometry.type === "Polygon" && feature.properties.geometryProvenance === "rendered_tile_polygon_member");
  })).toBe(true);
  expect(await page.evaluate(() => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    return { color: map.getPaintProperty("geoai-buildings-3d", "fill-extrusion-color"), duplicate: !!map.getLayer("geoai-live-selection-volume") };
  })).toEqual({ color: "#d6dcdf", duplicate: false });
  await expect.poll(otherMultipartMemberVisible).toBe(true);
  await page.getByRole("button", { name: "Camera", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("multipart-native-highlight-mobile-430.png") });
  expect(pageErrors).toEqual([]);
});

test("MAP10 exact captured DIFC footprint hides all native tile fragments and restores outside-safe on toggle/style/zoom/delete", async ({ page }, testInfo) => {
  await installLocalWebKitHttpCsp(page, testInfo.project.use.browserName, testInfo.project.use.baseURL);
  await page.setViewportSize({ width: 1440, height: 900 });
  await installMapFixture(page);
  await page.goto("/prototype/point-to-object");
  await exposeFixtureMap(page);
  const focus = async (zoom = 17) => {
    await page.evaluate(z => {
      const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
      map.stop(); map.jumpTo({ center: [55.2829, 25.21125], zoom: z, pitch: 0, bearing: 0 });
    }, zoom);
    await expect.poll(() => page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.isStyleLoaded())).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as unknown as { map10: import("maplibre-gl").Map }).map10.isSourceLoaded("openmaptiles"))).toBe(true);
  };
  const visible = () => page.evaluate(() => {
    const map = (window as unknown as { map10: import("maplibre-gl").Map }).map10;
    const features = map.queryRenderedFeatures(undefined, { layers: ["building"] });
    return { target: features.some(feature => feature.properties.name === "Captured DIFC L-shape"), outside: features.some(feature => feature.properties.name === "Outside reused-ID neighbour") };
  });
  await focus();
  await expect.poll(visible).toEqual({ target: true, outside: true });
  await page.getByRole("tab", { name: "Create", exact: true }).click();
  await page.getByLabel("Upload GeoJSON").setInputFiles({ name: "captured-difc.geojson", mimeType: "application/geo+json", buffer: Buffer.from(JSON.stringify(difcFixture.selection.object.geometry)) });
  await page.getByTestId("create-map-presentation-toggle").click();
  await focus();
  await expect.poll(visible).toEqual({ target: false, outside: true });
  await page.screenshot({ path: testInfo.outputPath("difc-exact-footprint-source-hidden.png") });
  await page.getByTestId("create-map-presentation-toggle").click();
  await expect.poll(visible).toEqual({ target: true, outside: true });
  await page.getByTestId("create-map-presentation-toggle").click();
  await expect.poll(visible).toEqual({ target: false, outside: true });
  await page.getByRole("combobox", { name: "Map style", exact: true }).selectOption("light");
  await focus();
  await expect.poll(visible).toEqual({ target: false, outside: true });
  await focus(12);
  await expect.poll(visible).toEqual({ target: true, outside: true });
  await focus();
  await expect.poll(visible).toEqual({ target: false, outside: true });
  await page.getByTestId("create-delete-area").click();
  await expect.poll(visible).toEqual({ target: true, outside: true });
});
