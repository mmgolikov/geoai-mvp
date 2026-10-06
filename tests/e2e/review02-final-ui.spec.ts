import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { conceptTemplate, generateConceptMassingAlternatives, validatePointObjectCreateAoiVertices, validateRedevelopmentProgram } from "../../src/lib/prototype/point-to-object-create";
import { hashPointObjectOperation, type PointObjectProjectOperationInput } from "../../src/lib/prototype/point-object-projects";
import { parsePointObjectProjectOperationInput, parsePointObjectProjectStore } from "../../src/lib/prototype/point-object-projects-contract";
import { SPRINT10_CAVEAT } from "./helpers/sprint10-analysis-fixture";
import { sessionMissingFixture } from "./helpers/auth-persona";
import { installLoopbackBrowserHarness, externalHttpUrlPattern, requireLoopbackTestOrigin } from "./helpers/local-webkit-csp";

// Independent native-browser presentation QA. The initial synthetic geometry is
// made once with the existing demo fixture constructors, then frozen before UI.
// No solver re-run is used as the expected value after a view/color transition.
// No mocked MapLibre/WebGL, browser callbacks, live source or provider dispatch.
type Locale = "en" | "ru";
type CreateOperation = Extract<PointObjectProjectOperationInput, { kind: "create" }>;
type SavedCreate = { artifactId: string; payload: CreateOperation["payload"] };
type PixelReport = { width: number; height: number; facePixels: number; adjacentEdgePixels: number; medianBlendedOpacity: number | null };
type CameraReport = { phase: string; scene: string; attributionExpanded: boolean; before: { width: number; height: number }; zoomedIn: { width: number; height: number }; zoomedOut: { width: number; height: number }; restored: { width: number; height: number }; };
type Signals = { calls: string[]; errors: string[]; publicPosts: unknown[]; allowGeneration: boolean; frames: Array<PixelReport & { name: string; path: string; sha256: string }>; cameras: CameraReport[]; nativePickerObserved: boolean; nativeArrowOptionSelection: "NATIVE_ARROW_OPTION_SELECTION_RUNTIME_UNVERIFIED" };
declare global { interface Window { __review02FinalCity: { clicks: number; changes: number }; } }
const identity = "demo:demo-user-geoai";
const storeKey = `geoai:point-to-object:projects:v1:${encodeURIComponent(identity)}`;
const stamp = "2026-10-02T20:50:00.000Z";
const word = (locale: Locale, en: string, ru: string) => locale === "ru" ? ru : en;
const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const labels = { blockCount: ["Blocks", "Корпуса"], targetSiteCoveragePct: ["Site coverage", "Плотность застройки"], levelsMin: ["Minimum levels", "Минимум этажей"], levelsMax: ["Maximum levels", "Максимум этажей"], openSpacePct: ["Open space", "Открытые пространства"], setbackM: ["Setback", "Отступ"] } as const;
const controls = { blockCount: 4, targetSiteCoveragePct: 24, levelsMin: 4, levelsMax: 8, openSpacePct: 40, setbackM: 6 };
const prompt = "Independent final UI offline concept; official validation required.";

function fixture(locale: Locale): CreateOperation {
  // The same synthetic Dubai rectangle used by sprint10-create-preview.spec.ts.
  const vertices: [number, number][] = [[55.2700,25.2050],[55.2720,25.2050],[55.2720,25.2065],[55.2700,25.2065]];
  const valid = validatePointObjectCreateAoiVertices(vertices); if (!valid.ok) throw new Error(valid.message);
  const aoi = { id: "create-aoi-review02-final-ui", coordinates: [[...vertices, vertices[0]]], areaSqM: valid.measurements.areaSqM, perimeterM: valid.measurements.perimeterM, vertexCount: 4 };
  const program = validateRedevelopmentProgram({ ...conceptTemplate("residential_quarter", locale), ...controls }); if (!program.ok) throw new Error(program.errors.join("; "));
  const alternatives = generateConceptMassingAlternatives(aoi.coordinates, program.value, "review02-final-ui-offline", locale);
  if (alternatives.map(item => item.id).join(",") !== "A,B") throw new Error("Independent fixture requires both A/B alternatives");
  const areaContext = {
    protocol: "POINT_TO_OBJECT_001_AREA_CONTEXT_V1", mode: "results", request: { marketKey: "dubai", locale, aoiCoordinates: aoi.coordinates },
    area: { areaSqM: Math.round(valid.measurements.areaSqM), perimeterM: Math.round(valid.measurements.perimeterM), centroid: { longitude: 55.271, latitude: 25.20575 } },
    features: [{ sourceFeatureId: "node/77", longitude: 55.271, latitude: 25.20575, label: "Mapped residence", group: "residential", mappedBuildingLevels: null, observedTags: { building: "residential", name: "Mapped residence" }, inclusionMethod: "returned_center_inside_aoi" }],
    summary: { sampleSize: 1, namedFeatureCount: 1, mappedBuildingCount: 1, mappedLevelsKnownCount: 0, medianMappedLevels: null, nearestTransitM: null, nearestMajorRoadM: null, groups: [{ group: "residential", count: 1, sharePct: 100 }] },
    coverage: { kind: "bounded_open_map_polygon_sample", inclusionMethod: "returned_center_inside_aoi", geometryCoverage: "centroid_proxy_not_complete_intersection", upstreamElementCount: 1, normalizedInsideCount: 1, returnedFeatureCount: 1, upstreamQueryLimit: 300, featureReturnLimit: 80, capReached: false, completeInventory: false },
    // Existing saved-source contract requires this acquisition marker true.
    // It is synthetic fixture metadata, not evidence of this test using a network.
    source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: "7".repeat(64), observedAt: null, acquiredAt: stamp, licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
    limitations: ["Synthetic offline QA fixture, not a live source snapshot or complete inventory."], caveat: SPRINT10_CAVEAT
  };
  const input = parsePointObjectProjectOperationInput({ kind: "create", locale, marketKey: "dubai", label: "Independent final UI saved fixture", payload: { aoi, editorSnapshot: null, generatedLocale: locale, activeAlternativeId: "A", areaContext,
    generated: { mode: "openai_concept", generatedAt: stamp, promptVersion: "POINT_OBJECT_CREATE_REVIEW02_FINAL_UI_SAVED_OFFLINE", program: program.value, massing: alternatives[0].massing, alternatives,
      areaContextUsed: { sourceResponseHash: areaContext.source.sourceResponseHash, sampleSize: 1, mappedBuildingCount: 1, capReached: false, inclusionMethod: "returned_center_inside_aoi", completeInventory: false },
      telemetry: { model: "offline-fixture", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0, stored: false, toolCalls: 0 }, caveat: SPRINT10_CAVEAT } } });
  if (!input || input.kind !== "create") throw new Error("Invalid independent saved Create fixture");
  return input;
}

function singleAndLegacyFixtures(initial: CreateOperation): [CreateOperation, CreateOperation] {
  const singleInput = structuredClone(initial);
  const a = singleInput.payload.generated.alternatives?.find(alternative => alternative.id === "A");
  if (!a) throw new Error("Initial validated fixture must contain A");
  singleInput.label = "Independent UI QA single A";
  singleInput.payload.generated.alternatives = [a];
  singleInput.payload.generated.massing = a.massing;
  singleInput.payload.activeAlternativeId = "A";
  const single = parsePointObjectProjectOperationInput(singleInput);
  if (!single || single.kind !== "create") throw new Error("Invalid saved A-only fixture");
  const legacyInput = structuredClone(single);
  legacyInput.label = "Independent UI QA legacy A";
  delete legacyInput.payload.generated.alternatives;
  delete legacyInput.payload.generated.areaContextUsed;
  const legacy = parsePointObjectProjectOperationInput(legacyInput);
  if (!legacy || legacy.kind !== "create") throw new Error("Invalid legacy single-massing fixture");
  return [single, legacy];
}

function offlineReferenceStyle(pathname: string) {
  // Empty real GeoJSON layer supplies attribution without tiles or fake GPU output.
  return { version: 8, sources: { "qa-attribution": { type: "geojson", data: { type: "FeatureCollection", features: [] }, attribution: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" } }, layers: [
    { id: "background", type: "background", paint: { "background-color": pathname.endsWith("/bright") ? "#e4e9ec" : "#edf2f0" } },
    { id: "qa-attribution", type: "fill", source: "qa-attribution" }
  ] };
}

// PNG decoding uses Node built-ins and reads real Playwright canvas screenshots.
// This never draws, edits or substitutes image data in the application.
function decodePng(bytes: Buffer) {
  if (!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error("Expected native PNG screenshot");
  let width = 0, height = 0, channels = 0; const chunks: Buffer[] = [];
  for (let offset = 8; offset < bytes.length;) { const length = bytes.readUInt32BE(offset), type = bytes.toString("ascii",offset+4,offset+8), body = bytes.subarray(offset+8,offset+8+length);
    if (type === "IHDR") { width=body.readUInt32BE(0); height=body.readUInt32BE(4); if (body[8]!==8 || ![2,6].includes(body[9]) || body[12]!==0) throw new Error("Unsupported native PNG format"); channels=body[9]===6?4:3; }
    if (type === "IDAT") chunks.push(body); offset += length+12;
  }
  if (!width || !height || !channels) throw new Error("Missing PNG image header");
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,pixels=Buffer.alloc(height*stride); let at=0;
  const paeth=(a:number,b:number,c:number)=>{const p=a+b-c,aa=Math.abs(p-a),bb=Math.abs(p-b),cc=Math.abs(p-c);return aa<=bb&&aa<=cc?a:bb<=cc?b:c;};
  for(let y=0;y<height;y++){const filter=raw[at++];if(filter>4)throw new Error("Invalid native PNG filter");for(let x=0;x<stride;x++){const left=x>=channels?pixels[y*stride+x-channels]:0,up=y?pixels[(y-1)*stride+x]:0,corner=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;pixels[y*stride+x]=(raw[at++]+(filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth(left,up,corner)))&255;}}
  return {width,height,channels,pixels};
}
function pixelReport(bytes: Buffer, background: string): PixelReport {
  const {width,height,channels,pixels}=decodePng(bytes),faces=new Set<number>(),dark: [number,number][]=[],alphas:number[]=[],bg=parseInt(background.slice(1,3),16);
  // Exclude top badges and lower camera buttons: inspect volume-face ROI only.
  for(let y=Math.floor(height*.22);y<height*.77;y++)for(let x=Math.floor(width*.12);x<width*.88;x++){const at=(y*width+x)*channels,r=pixels[at],g=pixels[at+1],b=pixels[at+2];if(g-r>18&&b-r>18&&Math.abs(g-b)<55){if(r>=60&&r<=200){faces.add(y*width+x);alphas.push((bg-r)/(bg-8));}else if(r<60)dark.push([x,y]);}}
  let adjacentEdgePixels=0;for(const [x,y]of dark){let close=false;for(let dy=-4;dy<=4&&!close;dy++)for(let dx=-4;dx<=4;dx++)if(faces.has((y+dy)*width+x+dx)){close=true;break;}if(close)adjacentEdgePixels++;}alphas.sort((a,b)=>a-b);
  return {width,height,facePixels:faces.size,adjacentEdgePixels,medianBlendedOpacity:alphas.length?alphas[Math.floor(alphas.length/2)]:null};
}
async function frame(canvas: Locator, name: string, background: string, signals: Signals, info: TestInfo) {
  let bytes:Buffer=Buffer.alloc(0),report:PixelReport={width:0,height:0,facePixels:0,adjacentEdgePixels:0,medianBlendedOpacity:null};await expect(canvas).toBeVisible();
  await expect.poll(async()=>{bytes=await canvas.screenshot({type:"png"});report=pixelReport(bytes,background);return report.facePixels>=120&&report.adjacentEdgePixels>=8&&report.medianBlendedOpacity!==null&&report.medianBlendedOpacity>=.35&&report.medianBlendedOpacity<=.65;},{message:"Actual native translucent teal volume faces and adjacent edges must render"}).toBe(true);
  const file=info.outputPath(name+".png");writeFileSync(file,bytes);signals.frames.push({name,path:file,sha256:sha(bytes),...report});
}
async function saved(page: Page) { return page.evaluate(key=>{const store=JSON.parse(localStorage.getItem(key)!);return store.projects.flatMap((p:{artifacts:SavedCreate[]})=>p.artifacts).filter((a:SavedCreate&{kind?:string})=>a.kind==="create") as SavedCreate[];},storeKey); }
async function openTask(page: Page, locale: Locale) {
  if((page.viewportSize()?.width??1440)<1024){const task=page.locator("#workspace-task"),toggle=task.locator('button[aria-controls="workspace-task-content"]');await expect(toggle).toBeVisible();if(await toggle.getAttribute("aria-expanded")==="false")await task.getByRole("button",{name:word(locale,"Open task","Открыть задачу"),exact:true}).click();await expect(toggle).toHaveAttribute("aria-expanded","true");}
}
async function toParameters(page: Page, locale: Locale) { await page.getByTestId("create-full-result-dashboard").getByRole("button",{name:word(locale,"Back to parameters","К параметрам"),exact:true}).click();await openTask(page,locale);await expect(page.locator("#point-object-create-prompt")).toBeVisible(); }
async function showResult(page: Page) { await page.getByTestId("create-open-result-dashboard").click();await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible(); }

function renderedTealSpan(bytes: Buffer) {
  const { width, height, channels, pixels } = decodePng(bytes);
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = (y * width + x) * channels, r = pixels[at], g = pixels[at + 1], b = pixels[at + 2];
    if (g - r > 18 && b - r > 18 && Math.abs(g - b) < 55 && r < 200) {
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error("Native camera assertion requires rendered teal geometry");
  return { width: right - left + 1, height: bottom - top + 1 };
}

async function nativeRenderedSpan(canvas: Locator) {
  // Centre the viewport below the sticky header before reading actual pixels.
  await canvas.evaluate(el => el.scrollIntoView({ block: "center", inline: "nearest" }));
  return renderedTealSpan(await canvas.screenshot({ type: "png" }));
}

async function stableRenderedSpan(canvas: Locator) {
  let last = await nativeRenderedSpan(canvas), stable = 0;
  await expect.poll(async () => {
    const next = await nativeRenderedSpan(canvas);
    stable = Math.abs(next.width - last.width) <= 1 && Math.abs(next.height - last.height) <= 1 ? stable + 1 : 0;
    last = next; return stable;
  }, { message: "Read camera baseline only after native rendered scale settles", intervals: [100, 150, 250] }).toBeGreaterThanOrEqual(2);
  return last;
}

async function cameraControls(preview: Locator, locale: Locale, phase: string, scene: string, signals: Signals, info: TestInfo) {
  const beforeCalls = [...signals.calls], key = await preview.getAttribute("data-preview-geometry-key");
  const canvas = preview.locator("canvas.maplibregl-canvas"), camera = preview.getByTestId("create-preview-camera-controls");
  const attribution = preview.locator(".maplibregl-ctrl-attrib");
  let attributionExpanded = false;
  if (scene === "map") {
    await expect(attribution).toHaveCount(1);
    await expect(attribution).toBeVisible();
    expect(await attribution.evaluate(el => el.tagName)).toBe("DETAILS");
    if (!await attribution.evaluate(el => el.classList.contains("maplibregl-compact-show"))) await attribution.locator(".maplibregl-ctrl-attrib-button").click();
    await expect(attribution).toHaveClass(/maplibregl-compact-show/);
    await expect(attribution).toHaveJSProperty("open", true);
    await expect(attribution.locator(".maplibregl-ctrl-attrib-inner")).toBeVisible();
    await expect(attribution).toContainText("OpenStreetMap");
    attributionExpanded = true;
  }
  const buttons = [camera.getByRole("button", { name: word(locale, "Zoom in", "Приблизить"), exact: true }), camera.getByRole("button", { name: word(locale, "Zoom out", "Отдалить"), exact: true }), camera.getByRole("button", { name: word(locale, "Reset view", "Сбросить вид"), exact: true })];
  for (const button of buttons) {
    await expect(button).toBeEnabled(); await button.evaluate(el => el.scrollIntoView({ block: "center", inline: "nearest" })); await expect(button).toBeVisible();
    const box = await button.boundingBox(), viewport = await preview.getByTestId("create-result-preview-3d-canvas").boundingBox();
    if (!box || !viewport) throw new Error("Camera and native viewport must have measurable rectangles");
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y).toBeGreaterThanOrEqual(viewport.y + viewport.height);
    if (attributionExpanded) {
      const attr = await attribution.boundingBox(); if (!attr) throw new Error("Expanded attribution rectangle missing");
      expect(Math.max(0, Math.min(box.x + box.width, attr.x + attr.width) - Math.max(box.x, attr.x)) * Math.max(0, Math.min(box.y + box.height, attr.y + attr.height) - Math.max(box.y, attr.y))).toBe(0);
    }
    expect(await button.evaluate(el => {
      const box = el.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return hit === el || (hit !== null && el.contains(hit));
    })).toBe(true);
  }
  await camera.screenshot({ path: info.outputPath(`${phase}-${scene}-camera-controls.png`) });
  // Retain the prior zoom-in/reset path, then independently observe zoom-out.
  const before = await stableRenderedSpan(canvas);
  const viewportPixels = decodePng(await canvas.screenshot({ type: "png" }));
  await buttons[0].click();
  let zoomedIn = before;
  await expect.poll(async () => {
    zoomedIn = await nativeRenderedSpan(canvas);
    return (zoomedIn.width >= Math.min(before.width * 1.1, viewportPixels.width) && zoomedIn.width - before.width >= 4) ||
      (zoomedIn.height >= Math.min(before.height * 1.1, viewportPixels.height) && zoomedIn.height - before.height >= 4);
  }, { message: "Zoom in must visibly increase native rendered span on at least one axis, allowing viewport clipping" }).toBe(true);
  await buttons[2].click();
  await expect.poll(async () => {
    const span = await nativeRenderedSpan(canvas);
    return Math.abs(span.width - before.width) <= Math.max(3, before.width * .08) && Math.abs(span.height - before.height) <= Math.max(3, before.height * .08);
  }, { message: "Initial zoom-in/reset retains the native camera baseline" }).toBe(true);
  await stableRenderedSpan(canvas);
  await buttons[1].click();
  let zoomedOut = before;
  await expect.poll(async () => {
    zoomedOut = await nativeRenderedSpan(canvas);
    return zoomedOut.width < before.width * .8 && zoomedOut.height < before.height * .8;
  }, { message: "Zoom out must reduce actual native rendered geometry, not merely invoke a callback" }).toBe(true);
  await buttons[2].click();
  let restored = zoomedOut;
  await expect.poll(async () => {
    restored = await nativeRenderedSpan(canvas);
    return Math.abs(restored.width - before.width) <= Math.max(3, before.width * .08) && Math.abs(restored.height - before.height) <= Math.max(3, before.height * .08);
  }, { message: "Reset must restore the prior rendered scale" }).toBe(true);
  await expect(preview).toHaveAttribute("data-preview-geometry-key", key!);
  expect(signals.calls, "Camera/attribution interaction must not acquire context or dispatch AI").toEqual(beforeCalls);
  signals.cameras.push({ phase, scene, attributionExpanded, before, zoomedIn, zoomedOut, restored });
}

async function savedOptionsCopy(panel: Locator, locale: Locale, ids: Array<"A" | "B">) {
  const copy = panel.getByTestId("create-saved-options-copy");
  await expect(copy).toHaveAttribute("data-saved-option-count", String(ids.length));
  await expect(copy).toContainText(ids.length === 1 ? word(locale, `One option is saved — ${ids[0]}.`, `Сохранён один вариант — ${ids[0]}.`) : `${ids.join("/")} ${word(locale, "are saved options", "— сохранённые варианты")}`);
  if (ids.length === 1) {
    await expect(panel.getByRole("tablist", { name: word(locale, "Concept options", "Варианты концепции"), exact: true })).toHaveCount(0);
    await expect(panel.getByTestId("create-programme-option-delta")).toHaveCount(0);
    expect(await copy.innerText()).not.toMatch(/A\/B|B\/A/);
  }
}

async function volumeViews(page: Page, locale: Locale, generated: CreateOperation["payload"]["generated"], phase: string, signals: Signals, info: TestInfo) {
  for(const alternative of generated.alternatives??[]){
    const panel=page.getByTestId("create-full-result-dashboard");await panel.getByTestId("create-dashboard-alternative-"+alternative.id.toLowerCase()).click();
    await savedOptionsCopy(panel,locale,generated.alternatives!.map(item=>item.id));
    const kpi=panel.getByTestId("create-result-kpis");await expect(kpi).toHaveAttribute("data-active-variant",alternative.id);await expect(kpi).toHaveAttribute("data-estimated-floor-area-sqm",String(alternative.massing.estimatedFloorAreaSqM));const kpiText=await kpi.innerText();
    await expect(panel.getByTestId("create-source-binding")).toHaveAttribute("data-source-binding","matched");
    await panel.getByTestId("create-preview-mode-3d").click();
    for(const scene of ["map","model"]){await panel.getByTestId("create-scene-"+scene).click();const preview=panel.getByTestId("create-result-preview-3d");await expect(preview).toHaveAttribute("data-preview-status","ready");await expect(preview).toHaveAttribute("data-preview-variant",alternative.id);await expect(preview).toHaveAttribute("data-preview-feature-count",String(alternative.massing.generatedFeatureCount));const key=await preview.getAttribute("data-preview-geometry-key");expect(key).toBeTruthy();if(!key)throw new Error("Native 3D preview geometry key is missing");const canvas=preview.locator("canvas.maplibregl-canvas");
      await frame(canvas,`${phase}-${alternative.id}-${scene}-3d`,scene==="model"?"#f4fbfb":"#edf2f0",signals,info);await cameraControls(preview,locale,`${phase}-${alternative.id}`,scene,signals,info);await expect(preview).toHaveAttribute("data-preview-geometry-key",key);
      await frame(canvas,`${phase}-${alternative.id}-${scene}-zoom-reset`,scene==="model"?"#f4fbfb":"#edf2f0",signals,info);
    }
    await panel.getByTestId("create-preview-mode-2d").click();await expect(panel.getByTestId("create-preview-mode-2d")).toHaveAttribute("aria-pressed","true");await panel.getByTestId("create-preview-mode-3d").click();await expect(kpi).toHaveText(kpiText);
    await panel.getByRole("button",{name:word(locale,"Show on map","Показать на карте"),exact:true}).click();await expect(panel).toHaveCount(0);const canvas=page.getByTestId("live-map-canvas").locator("canvas.maplibregl-canvas"),dimension=page.getByTestId("map-dimension-control");
    await dimension.getByRole("button",{name:"3d",exact:true}).click();await frame(canvas,`${phase}-${alternative.id}-workspace`,"#edf2f0",signals,info);await dimension.getByRole("button",{name:"2d",exact:true}).click();await dimension.getByRole("button",{name:"3d",exact:true}).click();
    const style=page.getByRole("combobox",{name:word(locale,"Map style","Стиль карты"),exact:true});await style.selectOption("contrast");await frame(canvas,`${phase}-${alternative.id}-workspace-contrast`,"#e4e9ec",signals,info);await style.selectOption("street");await frame(canvas,`${phase}-${alternative.id}-workspace-restored`,"#edf2f0",signals,info);await openTask(page,locale);await showResult(page);
    await expect(page.getByTestId("create-result-kpis")).toHaveText(kpiText);await expect(page.getByTestId("create-source-binding")).toHaveAttribute("data-source-binding","matched");
  }
}

async function cityHitbox(page: Page, locale: Locale, signals: Signals, info: TestInfo) {
  const before=[...signals.calls];await page.goto("/prototype/point-to-object?mode=find");await page.getByRole("button",{name:locale,exact:true}).click();const select=page.getByTestId("point-object-city-select"),pill=page.locator("label").filter({has:select});await expect(select).toBeVisible();await expect(pill).toHaveCount(1);expect(await select.evaluate(el=>el.tagName)).toBe("SELECT");
  const observable=await select.evaluate(()=>CSS.supports("selector(select:open)"));if(!observable)throw new Error("QA_RUNTIME_NATIVE_POPUP_OBSERVATION_UNAVAILABLE: native popup coverage requires explicit browser/Root evidence; no inferred PASS");
  for(const [index,where]of ["left","center","right"].entries()){
    const box=await pill.boundingBox();expect(box).not.toBeNull();expect(box!.height).toBeGreaterThanOrEqual(44);const position={x:where==="left"?4:where==="right"?box!.width-4:box!.width/2,y:box!.height/2};
    expect(await pill.evaluate((el,pos)=>{const b=el.getBoundingClientRect();return document.elementFromPoint(b.x+pos.x,b.y+pos.y)?.getAttribute("data-testid");},position)).toBe("point-object-city-select");const baseline=await page.evaluate(()=>({...window.__review02FinalCity}));
    await pill.click({position});await expect(select).toBeFocused();await expect.poll(()=>select.evaluate(el=>el.matches(":open"))).toBe(true);signals.nativePickerObserved=true;await page.screenshot({path:info.outputPath(`city-native-${where}.png`)});expect((await page.evaluate(()=>window.__review02FinalCity)).clicks).toBe(baseline.clicks+1);
    // A real outside click closes the native popup. Headless Mac Arrow/Enter
    // handling is unverified, so it is never substituted with an inferred pass.
    await page.locator('input[type="search"][aria-autocomplete="list"]').click();await expect.poll(()=>select.evaluate(el=>el.matches(":open"))).toBe(false);expect((await page.evaluate(()=>window.__review02FinalCity)).changes).toBe(baseline.changes);
    // Separate native SELECT change-handler test; not a native menu-item click.
    await select.selectOption(["abu_dhabi","doha","riyadh"][index]);await expect(select).toHaveValue(["abu_dhabi","doha","riyadh"][index]);await expect.poll(()=>page.evaluate(()=>window.__review02FinalCity.changes)).toBe(baseline.changes+1);expect((await page.evaluate(()=>window.__review02FinalCity)).clicks).toBe(baseline.clicks+1);
  }
  const baseline=await page.evaluate(()=>window.__review02FinalCity.changes);await select.press("Tab");await page.keyboard.press("Shift+Tab");await expect(select).toBeFocused();expect(await select.evaluate(el=>el.matches(":focus-visible"))).toBe(true);await pill.screenshot({path:info.outputPath("city-rounded-keyboard-focus.png")});await page.keyboard.press("Space");await expect.poll(()=>select.evaluate(el=>el.matches(":open"))).toBe(true);await page.locator('input[type="search"][aria-autocomplete="list"]').click();await expect.poll(()=>select.evaluate(el=>el.matches(":open"))).toBe(false);expect(await page.evaluate(()=>window.__review02FinalCity.changes)).toBe(baseline);
  await page.waitForTimeout(800);expect(signals.calls,"City/view changes must never duplicate Context/source or dispatch hidden AI").toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
}

for(const locale of ["en","ru"] as const)for(const width of [1440,390])test(`REVIEW02 final native teal new saved A/B and City ${locale} ${width}`,async({page,browserName},info)=>{
  test.setTimeout(300000);const baseURL=info.project.use.baseURL!,origin=requireLoopbackTestOrigin(baseURL).origin;await installLoopbackBrowserHarness(page,browserName,baseURL);await page.setViewportSize({width,height:width===390?844:900});
  const operation=fixture(locale),newGenerated=structuredClone(operation.payload.generated);newGenerated.promptVersion="POINT_OBJECT_CREATE_REVIEW02_FINAL_UI_NEW_OFFLINE";
  const signals:Signals={calls:[],errors:[],publicPosts:[],allowGeneration:false,frames:[],cameras:[],nativePickerObserved:false,nativeArrowOptionSelection:"NATIVE_ARROW_OPTION_SELECTION_RUNTIME_UNVERIFIED"};page.on("pageerror",e=>signals.errors.push(e.message));
  await page.route(externalHttpUrlPattern(baseURL),route=>{const u=new URL(route.request().url());if(u.hostname==="tiles.openfreemap.org"&&u.pathname.startsWith("/styles/"))return route.fulfill({json:offlineReferenceStyle(u.pathname)});return route.abort("blockedbyclient");});
  await page.route("**/api/auth/session",route=>route.fulfill({json:sessionMissingFixture}));
  await page.route("**/api/prototype/**",async route=>{const request=route.request(),u=new URL(request.url());expect(u.origin).toBe(origin);signals.calls.push(`${request.method()} ${u.pathname}`);if(signals.allowGeneration&&u.pathname==="/api/prototype/point-to-object/create"){if(request.method()==="GET")return route.fulfill({json:{mode:"ready",challenge:"P".repeat(43)}});if(request.method()==="POST"){const publicBody=Object.fromEntries(Object.entries(request.postDataJSON()).filter(([k])=>k!=="challenge"));expect(publicBody).toEqual({marketKey:"dubai",locale,depth:"standard",templateId:"residential_quarter",customPrompt:prompt,controls,lockedControlKeys:expect.arrayContaining(Object.keys(controls)),aoiCoordinates:operation.payload.aoi.coordinates});expect((publicBody.lockedControlKeys as string[]).length).toBe(6);signals.publicPosts.push(publicBody);return route.fulfill({json:newGenerated});}}return route.fulfill({status:503,json:{mode:"unavailable",error:"Unexpected offline source/provider request is recorded and fails QA"}});});
  const artifact={...operation,schemaVersion:1,artifactId:"review02-final-ui-saved",idempotencyKey:"review02-final-ui-offline",payloadHash:await hashPointObjectOperation(operation),completedAt:stamp,updatedAt:stamp,viewRevision:0};
  const store=parsePointObjectProjectStore({schemaVersion:1,identityKey:identity,activeProjectId:"review02-final-ui-project",projects:[{schemaVersion:1,projectId:"review02-final-ui-project",name:"Independent UI QA",storageMode:"browser_local_on_this_device",createdAt:stamp,updatedAt:stamp,artifacts:[artifact]}]},identity,20,30);if(!store)throw new Error("Invalid saved UI fixture store");
  await page.context().addCookies([{name:"geoai_locale",value:locale,url:baseURL}]);await page.addInitScript(({store,key,identity})=>{if(!sessionStorage.getItem("__review02_final_ci_seed")){localStorage.setItem(key,JSON.stringify(store));localStorage.setItem("geoai-mock-demo-session-v1","active");localStorage.setItem("geoai:point-to-object:browser-identity:v1",identity);sessionStorage.setItem("geoai:point-to-object:project-restore:v1",JSON.stringify({schemaVersion:1,identityKey:identity,artifactId:"review02-final-ui-saved"}));sessionStorage.setItem("__review02_final_ci_seed","1");}window.__review02FinalCity={clicks:0,changes:0};document.addEventListener("click",e=>{if((e.target as Element)?.getAttribute?.("data-testid")==="point-object-city-select")window.__review02FinalCity.clicks++;},true);document.addEventListener("change",e=>{if((e.target as Element)?.getAttribute?.("data-testid")==="point-object-city-select")window.__review02FinalCity.changes++;},true);},{store,key:storeKey,identity});
  const immutableOriginal=async()=>{const current=(await saved(page)).find(x=>x.artifactId===artifact.artifactId);expect(current).toBeTruthy();const {activeAlternativeId:_view,...payload}=current!.payload,{activeAlternativeId:_baseline,...baseline}=operation.payload;expect(payload).toEqual(baseline);};
  let completed=false;
  try{
    await page.goto("/prototype/point-to-object?mode=create");await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();await volumeViews(page,locale,operation.payload.generated,"saved",signals,info);await immutableOriginal();expect(signals.calls).toEqual([]);
    await toParameters(page,locale);await page.locator("#point-object-create-prompt").fill(prompt);await page.getByTestId("create-programme-residential_quarter").click();await page.locator("#point-object-create-prompt").fill(prompt);const details=page.getByTestId("create-workspace").locator("details").filter({has:page.locator("summary").filter({hasText:word(locale,"Concept parameters","Параметры концепции")})});if(!await details.evaluate(el=>(el as HTMLDetailsElement).open))await details.locator("summary").click();
    for(const key of ["blockCount","targetSiteCoveragePct","levelsMax","levelsMin","openSpacePct","setbackM"] as const){const slider=page.getByRole("slider",{name:labels[key][locale==="ru"?1:0],exact:true}),current=Number(await slider.inputValue()),value=controls[key];if(current===value){await slider.press("ArrowRight");await slider.press("ArrowLeft");}else for(let n=0;n<Math.abs(current-value);n++)await slider.press(value>current?"ArrowRight":"ArrowLeft");await expect(slider).toHaveValue(String(value));}
    signals.allowGeneration=true;await page.getByTestId("create-generate-action").click();await expect(page.getByTestId("generated-concept-summary")).toBeVisible();signals.allowGeneration=false;expect(signals.calls).toEqual(["GET /api/prototype/point-to-object/create","POST /api/prototype/point-to-object/create"]);expect(signals.publicPosts).toHaveLength(1);await expect.poll(async()=>(await saved(page)).some(x=>x.payload.generated.promptVersion===newGenerated.promptVersion)).toBe(true);await immutableOriginal();await showResult(page);await volumeViews(page,locale,newGenerated,"new",signals,info);
    const baseline=[...signals.calls];await page.goto("/projects?view=spatial");const card=page.getByTestId("saved-result-card").filter({hasText:word(locale,"Generated concept","Созданная концепция")});await expect(card).toHaveCount(1);await card.getByRole("button",{name:word(locale,"Show on map","Показать на карте"),exact:true}).click();await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();const savedNew=(await saved(page)).find(x=>x.payload.generated.promptVersion===newGenerated.promptVersion);expect(savedNew?.payload.generated).toEqual(newGenerated);await expect(page.getByTestId("create-source-binding")).toHaveAttribute("data-source-binding","matched");await immutableOriginal();expect(signals.calls).toEqual(baseline);
    const beforeCity=await saved(page);await cityHitbox(page,locale,signals,info);expect(await saved(page)).toEqual(beforeCity);await immutableOriginal();expect(signals.errors).toEqual([]);completed=true;
  } finally {
    const receipt={scope:"Synthetic loopback CI/native MapLibre QA; no hosted source/paid/Production acceptance",assertionsCompleted:completed,authoritativeStatus:"Playwright final test report",locale,width,browserName,material:{color:"#087f8c",opacity:0.5},pixelLimit:"Pixel blend interval is not an exact shader-opacity measurement; exact owner contract and independent PNG visual review remain required",sourceFixtureLimit:"Synthetic acquisition marker runtimeNetworkUsed=true satisfies the existing saved-source schema; no real source acquisition was exercised",originalGeometryHash:sha(JSON.stringify(operation.payload.generated)),calls:signals.calls,publicPosts:signals.publicPosts,pageErrors:signals.errors,frames:signals.frames,cameras:signals.cameras,nativePickerObserved:signals.nativePickerObserved,nativeArrowOptionSelection:signals.nativeArrowOptionSelection,cityChangeMethod:"selectOption validates native SELECT change handler only; actual menu-item/Arrow selection remains unverified"};writeFileSync(info.outputPath("review02-final-ui-receipt.json"),JSON.stringify(receipt,null,2)+"\n");await page.screenshot({path:info.outputPath("review02-final-ui-terminal.png"),fullPage:false});
  }
});

// Two definitions, each used by Chromium and WebKit: four additional cases.
// No new generation and no broad repetition of the City/full-volume suite.
for (const locale of ["en", "ru"] as const) test(`REVIEW02 final saved A-only legacy camera ${locale} 390`, async ({ page, browserName }, info) => {
  test.setTimeout(180000);
  const baseURL = info.project.use.baseURL!, origin = requireLoopbackTestOrigin(baseURL).origin;
  await installLoopbackBrowserHarness(page, browserName, baseURL); await page.setViewportSize({ width: 390, height: 844 });
  const initial = fixture(locale), [single, legacy] = singleAndLegacyFixtures(initial);
  expect(single.payload.generated.massing).toEqual(initial.payload.generated.massing);
  expect(legacy.payload.generated.massing).toEqual(single.payload.generated.massing);
  expect(legacy.payload.generated.alternatives).toBeUndefined();
  expect(Object.hasOwn(legacy.payload.generated, "areaContextUsed")).toBe(false);
  const variants = [{ operation: single, id: "review02-single-saved", binding: "matched" }, { operation: legacy, id: "review02-legacy-saved", binding: "legacy_unknown" }] as const;
  const artifacts = await Promise.all(variants.map(async ({ operation, id }) => ({ ...operation, schemaVersion: 1, artifactId: id, idempotencyKey: id, payloadHash: await hashPointObjectOperation(operation), completedAt: stamp, updatedAt: stamp, viewRevision: 0 })));
  const store = parsePointObjectProjectStore({ schemaVersion: 1, identityKey: identity, activeProjectId: "review02-single-legacy-project", projects: [{ schemaVersion: 1, projectId: "review02-single-legacy-project", name: "Independent single/legacy UI QA", storageMode: "browser_local_on_this_device", createdAt: stamp, updatedAt: stamp, artifacts }] }, identity, 20, 30);
  if (!store) throw new Error("Invalid independently validated single/legacy store");
  const signals: Signals = { calls: [], errors: [], publicPosts: [], allowGeneration: false, frames: [], cameras: [], nativePickerObserved: false, nativeArrowOptionSelection: "NATIVE_ARROW_OPTION_SELECTION_RUNTIME_UNVERIFIED" };
  page.on("pageerror", error => signals.errors.push(error.message));
  await page.route(externalHttpUrlPattern(baseURL), route => {
    const url = new URL(route.request().url());
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) return route.fulfill({ json: offlineReferenceStyle(url.pathname) });
    return route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session", route => route.fulfill({ json: sessionMissingFixture }));
  await page.route("**/api/prototype/**", route => {
    const request = route.request(), url = new URL(request.url()); expect(url.origin).toBe(origin);
    signals.calls.push(`${request.method()} ${url.pathname}`);
    return route.fulfill({ status: 503, json: { mode: "unavailable", error: "Saved single/legacy navigation must never reacquire source or dispatch AI" } });
  });
  await page.context().addCookies([{ name: "geoai_locale", value: locale, url: baseURL }]);
  await page.addInitScript(({ store, key, identity }) => {
    if (!sessionStorage.getItem("__review02_single_legacy_seed")) {
      localStorage.setItem(key, JSON.stringify(store)); localStorage.setItem("geoai-mock-demo-session-v1", "active"); localStorage.setItem("geoai:point-to-object:browser-identity:v1", identity);
      sessionStorage.setItem("__review02_single_legacy_seed", "1");
    }
  }, { store, key: storeKey, identity });
  const preserved = async () => {
    const current = await saved(page);
    expect(current).toHaveLength(2);
    for (const { operation, id } of variants) expect(current.find(item => item.artifactId === id)?.payload).toEqual(operation.payload);
    expect(signals.calls).toEqual([]);
  };
  let completed = false;
  const phases: Array<{ id: string; binding: string; geometryKey: string; kpis: string }> = [];
  try {
    let originalKey: string | null = null, originalKpis: string | null = null;
    for (const { operation, id, binding } of variants) {
      await page.goto("/projects?view=spatial");
      const card = page.getByTestId("saved-result-card").filter({ hasText: operation.label }); await expect(card).toHaveCount(1);
      await card.getByRole("button", { name: word(locale, "Show on map", "Показать на карте"), exact: true }).click();
      const panel = page.getByTestId("create-full-result-dashboard"); await expect(panel).toBeVisible();
      await savedOptionsCopy(panel, locale, ["A"]);
      await expect(panel.getByTestId("create-dashboard-alternative-b")).toHaveCount(0);
      const source = panel.getByTestId("create-source-binding"); await expect(source).toHaveAttribute("data-source-binding", binding);
      if (binding === "legacy_unknown") await expect(source).toContainText(word(locale, "This legacy result has no source-use receipt", "В старом результате нет source-use receipt"));
      expect(await panel.innerText()).not.toMatch(/A\/B are saved|A\/B — сохранённые|Geometry and A\/B|Геометрия и A\/B/);
      const kpi = panel.getByTestId("create-result-kpis"), expected = operation.payload.generated.massing;
      await expect(kpi).toHaveAttribute("data-active-variant", "A"); await expect(kpi).toHaveAttribute("data-estimated-floor-area-sqm", String(expected.estimatedFloorAreaSqM));
      const kpis = await kpi.innerText(); if (originalKpis !== null) expect(kpis).toBe(originalKpis); else originalKpis = kpis;
      await panel.getByTestId("create-preview-mode-3d").click();
      const preview = panel.getByTestId("create-result-preview-3d"); await expect(preview).toHaveAttribute("data-preview-status", "ready");
      await expect(preview).toHaveAttribute("data-preview-variant", "A"); await expect(preview).toHaveAttribute("data-preview-feature-count", String(expected.generatedFeatureCount));
      const key = await preview.getAttribute("data-preview-geometry-key"); if (!key) throw new Error("Saved single/legacy native geometry key missing");
      if (originalKey !== null) expect(key).toBe(originalKey); else originalKey = key;
      await frame(preview.locator("canvas.maplibregl-canvas"), `${id}-map-3d`, "#edf2f0", signals, info);
      await cameraControls(preview, locale, id, "map", signals, info);
      await panel.getByTestId("create-preview-mode-2d").click(); await panel.getByTestId("create-preview-mode-3d").click();
      await expect(panel.getByTestId("create-result-preview-3d")).toHaveAttribute("data-preview-geometry-key", key);
      await expect(kpi).toHaveText(kpis); await expect(source).toHaveAttribute("data-source-binding", binding);
      await preserved(); phases.push({ id, binding, geometryKey: key, kpis });
    }
    await preserved(); expect(signals.errors).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); completed = true;
  } finally {
    writeFileSync(info.outputPath("review02-single-legacy-ui-receipt.json"), JSON.stringify({ scope: "Synthetic loopback native saved single/legacy UI only; not hosted paid acceptance", assertionsCompleted: completed, authoritativeStatus: "Playwright terminal report", locale, width: 390, browserName, phases, cameras: signals.cameras, frames: signals.frames, calls: signals.calls, pageErrors: signals.errors, originalMassingHash: sha(JSON.stringify(initial.payload.generated.massing)), limits: "No actual paid A/B, provider execution, native City coverage or exact shader-alpha measurement in these additional cases" }, null, 2) + "\n");
    await page.screenshot({ path: info.outputPath("review02-single-legacy-terminal.png"), fullPage: false });
  }
});
