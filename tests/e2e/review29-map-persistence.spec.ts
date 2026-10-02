import { expect, test, type Page, type Route } from "@playwright/test";
import { fromGeojsonVt } from "@maplibre/vt-pbf";
import type { FeatureCollection, Polygon } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap, VectorTileSource } from "maplibre-gl";
import { externalHttpUrlPattern, installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";
import { conceptTemplate, generateConceptMassingAlternatives, validateRedevelopmentProgram, type ConceptTemplateId } from "../../src/lib/prototype/point-to-object-create";

type BrowserMap = Window & { review29Map?: MapLibreMap; review29HighZoomSamples?: { total: number; hidden: number }; review02RoofPoint?: { x:number;y:number } };
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
    // Adapt fixture extrema to the requested count, just like the real producer.
    // A smaller site-aware default must not create a malformed saved response.
    const levels = Math.round(controls.levelsMin + (count > 1 ? index / (count - 1) : 0) * (controls.levelsMax - controls.levelsMin));
    return { type: "Feature" as const, id, properties: {
      id, kind: "concept_massing", templateId, variantId, massingStyle: "campus", volumeRole: "campus_block",
      primaryBlock: true, use: "civic", levels, heightM: levels * 3.4, baseM: 0,
      label: `Offline ${variantId} block ${index + 1}`
    }, geometry: box(longitude, latitude, longitude + 0.00025, latitude + 0.00023) };
  });
  return { variantId, massingStyle: "campus", requestedBlockCount: count, generatedBlockCount: count,
    generatedFeatureCount: count, aoiAreaSqM: 49_000, generatedFootprintAreaSqM: 18_620,
    achievedSiteCoveragePct: 38, estimatedFloorAreaSqM: 80_000, minGeneratedLevels: Math.min(...features.map(f => f.properties.levels)),
    maxGeneratedLevels: Math.max(...features.map(f => f.properties.levels)), seed: `review29-${variantId}`,
    featureCollection: { type: "FeatureCollection", features } };
}

async function installOfflineMap(page: Page, createPosts: string[], validatedCreate = false) {
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
      const request = route.request().postDataJSON() as { controls: Record<string, number>; templateId: ConceptTemplateId; aoiCoordinates: Position[][]; locale: "en" | "ru" };
      if (validatedCreate) {
        const v=validateRedevelopmentProgram({...conceptTemplate(request.templateId,request.locale),...request.controls});
        if(!v.ok)throw new Error(v.errors.join(";"));
        const alternatives=generateConceptMassingAlternatives(request.aoiCoordinates,v.value,"review02-offline",request.locale);
        return route.fulfill({json:{mode:"openai_concept",generatedAt:"2026-10-02T19:00:00.000Z",promptVersion:"POINT_OBJECT_CREATE_REVIEW02_OFFLINE",program:v.value,
          massing:alternatives[0].massing,alternatives,telemetry:{model:"offline",reasoningEffort:"none",latencyMs:1,attempts:1,estimatedCostUsd:0},
          caveat:"Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."}});
      }
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

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  const state = await page.evaluate(async () => {
    const map = (window as BrowserMap).review29Map;
    if (!map) return { map: "unavailable" };
    const sources = ["geoai-live-selection", "geoai-existing-partition-source:openmaptiles"];
    const data = await Promise.all(sources.map(async id => {
      const source = map.getSource(id) as GeoJSONSource | undefined;
      return { id, loaded: source ? map.isSourceLoaded(id) : false, data: source && map.isSourceLoaded(id) ? await source.getData() : null };
    }));
    return { zoom: map.getZoom(), pitch: map.getPitch(), data,
      selection: sessionStorage.getItem("geoai:point-to-object:selection:v3"),
      layers: map.getStyle().layers?.filter(l => /building|selection|partition/.test(l.id)),
      visible: map.queryRenderedFeatures().filter(f => f.source === "openmaptiles").map(f => ({id:f.id,layer:f.layer.id,geometry:f.geometry})) };
  });
  await info.attach("review02-map-diagnostic", { body: JSON.stringify(state,null,2), contentType: "application/json" });
});

test("REVIEW02 pitched roof click selects exact tile member; transparent volume and siblings remain", async ({ page, browserName }, info) => {
  const errors: string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await installLoopbackBrowserHarness(page,browserName,info.project.use.baseURL);
  await installOfflineMap(page,[]);
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/prototype/point-to-object?mode=analyse");
  await exposeMap(page);
  await page.evaluate(() => {
    const map=(window as BrowserMap).review29Map!;
    map.jumpTo({center:[55.2842,25.2144],zoom:18,pitch:55,bearing:0});
    // Independent oracle uses MapLibre's public custom-layer render matrix.
    map.addLayer({id:"review02-pick-oracle",type:"custom",renderingMode:"3d",render(_gl,options){
      const lng=55.2842,lat=25.2147,height=36;
      const p=[(lng+180)/360,(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2,height/(40075016.68557849*Math.cos(lat*Math.PI/180)),1];
      const m=options.defaultProjectionData.mainMatrix;
      const c=[0,1,2,3].map(row=>p.reduce((sum,v,col)=>sum+v*m[col*4+row],0));
      (window as BrowserMap).review02RoofPoint={x:(c[0]/c[3]+1)*map.getCanvas().clientWidth/2,y:(1-c[1]/c[3])*map.getCanvas().clientHeight/2};
    }});
  });
  await expect.poll(()=>page.evaluate(()=>Boolean((window as BrowserMap).review02RoofPoint))).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as BrowserMap).review29Map!.isSourceLoaded("openmaptiles"))).toBe(true);
  const pixel=await page.evaluate(()=>{const m=(window as BrowserMap).review29Map!,p=(window as BrowserMap).review02RoofPoint!,r=m.getCanvas().getBoundingClientRect();return{x:r.left+p.x,y:r.top+p.y};});
  await page.mouse.click(pixel.x,pixel.y);
  await expect(page.getByTestId("selected-object")).toContainText("Mapped hotel relation");
  await expect.poll(()=>page.evaluate(()=>(window as BrowserMap).review29Map!.getLayoutProperty("geoai-live-selection-volume","visibility"))).toBe("visible");
  const selected=await page.evaluate(async()=>{const map=(window as BrowserMap).review29Map!,data=await(map.getSource("geoai-live-selection") as GeoJSONSource).getData();return{data,line:map.getPaintProperty("geoai-live-selection-line","line-width"),opacity:map.getPaintProperty("geoai-live-selection-volume","fill-extrusion-opacity"),edges:Boolean(map.getLayer("geoai-live-selection-edges")),stored:JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3")!)};});
  expect(selected.line).toBe(1.3); expect(selected.opacity).toBe(0.5);expect(selected.edges).toBe(true);
  expect(selected.data.type).toBe("Feature");
  if(selected.data.type!=="Feature"||selected.data.geometry.type!=="Polygon")throw new Error("Exact member required");
  expect(selected.data.geometry.coordinates[0].every(p=>p[1]>25.2143)).toBe(true);
  expect(selected.stored.object.geometryProvenance).toBe("rendered_tile_polygon_member");
  expect(errors).toEqual([]);
  await page.screenshot({path:info.outputPath("review02-pitched-roof-selected.png")});
});

async function savedCreateGeometry(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const identity = localStorage.getItem("geoai:point-to-object:browser-identity:v1");
    const raw = identity && localStorage.getItem(`geoai:point-to-object:projects:v1:${encodeURIComponent(identity)}`);
    if (!raw) return null;
    const store = JSON.parse(raw) as { projects: { artifacts: { kind: string; payload: { generated: unknown } }[] }[] };
    const artifact = store.projects.flatMap(project => project.artifacts).find(item => item.kind === "create");
    return artifact ? JSON.stringify(artifact.payload.generated) : null;
  });
}

for (const locale of ["en","ru"] as const) test(`REVIEW02 ${locale} invalid controls block generation immediately and preserve committed result`,async({page,browserName},info)=>{
  const posts:string[]=[];
  await installLoopbackBrowserHarness(page,browserName,info.project.use.baseURL);await installOfflineMap(page,posts,true);
  await page.setViewportSize({width:locale==="ru"?390:1440,height:900});
  await page.goto("/prototype/point-to-object?mode=create");await exposeMap(page);
  if(locale==="ru")await page.getByRole("button",{name:"ru",exact:true}).click();
  await page.getByLabel(locale==="ru"?"Загрузить GeoJSON":"Upload GeoJSON").setInputFiles({name:"review02-area.geojson",mimeType:"application/geo+json",buffer:Buffer.from(JSON.stringify(createSite))});
  await page.getByTestId("create-programme-civic_green").click();
  await expect(page.getByTestId("create-local-apply-preset")).toHaveCount(0);
  await page.getByTestId("create-generate-action").click();await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await expect.poll(()=>savedCreateGeometry(page)).not.toBeNull();
  const saved=await savedCreateGeometry(page);
  await page.getByText(locale==="ru"?"Параметры концепции":"Concept parameters",{exact:true}).click();
  const slider=page.getByLabel(locale==="ru"?"Открытые пространства":"Open space",{exact:false});
  await slider.fill("75");
  await expect(page.getByTestId("create-parameter-error")).toContainText("≤100%");
  await expect(slider).toHaveAttribute("aria-invalid","true");
  await expect(slider).toHaveAttribute("aria-describedby",/.+/);
  const coverage=page.getByRole("slider",{name:locale==="ru"?/^Плотность застройки/:/^Site coverage/});
  await expect(coverage).toHaveAttribute("aria-invalid","true");
  expect(await slider.evaluate(el=>getComputedStyle(el.parentElement!).borderColor)).toBe("rgb(240, 68, 56)");
  await expect(slider).toHaveValue("75");
  await expect(page.getByTestId("create-generate-action")).toBeDisabled();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();expect(posts).toHaveLength(1);
  expect(await savedCreateGeometry(page)).toBe(saved);
  await page.screenshot({path:info.outputPath(`review02-${locale}-invalid-controls.png`)});
  // Reopen the persisted artifact through the same two Show-on-map actions as
  // the founder. This is a synthetic restore-path receipt, not their exact AOI.
  await page.goto("/projects?view=spatial");
  await page.getByRole("button",{name:/^(Show on map|Показать на карте)$/}).first().click();
  const dashboard=page.getByTestId("create-full-result-dashboard");
  await expect(dashboard).toBeVisible();
  await dashboard.getByRole("button",{name:/^(Show on map|Показать на карте)$/}).click();
  await exposeMap(page);
  const expectedGeometry=JSON.parse(saved!).massing.featureCollection;
  for(const zoom of [13.25,14.25,16,17]) {
    await page.evaluate(zoom=>(window as BrowserMap).review29Map!.jumpTo({center:[55.2701,25.205],zoom,pitch:55,bearing:30}),zoom);
    await expect.poll(()=>page.evaluate(()=>(window as BrowserMap).review29Map!.queryRenderedFeatures({layers:["geoai-concept-volume"]}).length)).toBeGreaterThan(0);
    expect(await page.evaluate(async()=>(await((window as BrowserMap).review29Map!.getSource("geoai-concept-massing") as GeoJSONSource).getData()))).toEqual(expectedGeometry);
  }
  expect(await savedCreateGeometry(page)).toBe(saved);expect(posts).toHaveLength(1);
  await page.screenshot({path:info.outputPath(`review02-${locale}-saved-show-on-map.png`)});
  if(locale==="ru")await page.getByRole("button",{name:"Open task",exact:true}).or(page.getByRole("button",{name:"Открыть задачу",exact:true})).click();
  await page.getByTestId("create-programme-residential_mixed_use").click();
  await page.getByText(locale==="ru"?"Параметры концепции":"Concept parameters",{exact:true}).click();
  const blocks=page.getByRole("slider",{name:locale==="ru"?/^Корпуса/:/^Blocks/});
  await blocks.fill("3");await expect(blocks).toHaveAttribute("aria-invalid","true");await expect(blocks).toHaveValue("3");
  await expect(page.getByTestId("create-generate-action")).toBeDisabled();
  await page.getByTestId("create-programme-commercial_hub").click();
  const levels=page.getByRole("slider",{name:locale==="ru"?/^Минимум этажей/:/^Minimum levels/});
  await levels.fill("1");await expect(levels).toHaveAttribute("aria-invalid","true");await expect(levels).toHaveValue("1");
  await expect(page.getByTestId("create-generate-action")).toBeDisabled();
  expect(await savedCreateGeometry(page)).toBe(saved);expect(posts).toHaveLength(1);
});

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
  // REVIEW02: the previous 18 → 10 → 18 receipt skipped the 13–14
  // generalized/native transition. That omission is not proof of the exact
  // founder defect; their unchanged saved artifact remains a hosted gate.
  for (const zoom of [13.25, 13.75, 14, 12.75]) {
    await page.evaluate(zoom => (window as BrowserMap).review29Map!.jumpTo({ center: [55.2701, 25.205], zoom, pitch: 55, bearing: 30 }), zoom);
    await expect.poll(async () => (await state()).volume).toBe("visible");
    await expect.poll(async () => (await state()).volumeCount).toBeGreaterThan(0);
    expect((await state()).ids).toEqual(initial.ids);
    await page.screenshot({ path: info.outputPath(`review02-create-zoom${zoom}.png`) });
  }
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
