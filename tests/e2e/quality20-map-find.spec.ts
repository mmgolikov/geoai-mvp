import { test, expect, type Page } from "@playwright/test";
import { installLoopbackBrowserHarness, externalHttpUrlPattern } from "./helpers/local-webkit-csp";
import { POINT_OBJECT_FIND_CAVEAT, type PointObjectFindCandidate } from "../../src/lib/prototype/point-to-object-find-contract";

const footprint = {type:"Polygon" as const,coordinates:[[[55.2798,25.2098],[55.2802,25.2098],[55.2802,25.2102],[55.2798,25.2102],[55.2798,25.2098]]]};
const candidates:PointObjectFindCandidate[] = [0,1,2].map(index=>({
  sourceFeatureId:`${index===2?"node":"way"}/${82001+index}` as PointObjectFindCandidate["sourceFeatureId"],sourceElementType:index===2?"node":"way",sourceElementId:String(82001+index),
  label:`Quality site ${index+1}`,name:`Quality site ${index+1}`,longitude:55.28+(index===1?.001:0),latitude:25.21,
  group:"construction",matchedTag:{key:index===2?"office":"building",value:index===2?"company":"construction"},mappedBuildingLevels:null,
  observedTags:(index===2?{office:"company"}:{building:"construction",height:"42"}) as Record<string,string>,evidenceClass:"observed_in_open_map_source",
  geometry:index===2?null:{...footprint,coordinates:footprint.coordinates.map(ring=>ring.map(([x,y])=>[x+(index===1?.001:0),y]))},
  geometryStatus:index===2?"point_only":"available",geometryProvenance:index===2?null:"confirmed_complete_footprint",renderHeightM:index===2?null:42,renderMinHeightM:index===2?null:3
}));

async function mapState(page:Page,scope="[data-testid='live-map-canvas']") {
  return page.locator(scope).evaluate(element=>{
    type Fiber={memoizedState:{memoizedState:unknown;next:unknown}|null;return:Fiber|null};
    const key=Object.getOwnPropertyNames(element).find(key=>key.startsWith("__reactFiber$"))!;
    let fiber=(element as unknown as Record<string,Fiber>)[key];
    while(fiber){let hook=fiber.memoizedState;while(hook){const value=(hook.memoizedState as {current?:import("maplibre-gl").Map}|null)?.current;
      if(value&&typeof value.getSource==="function"){
        const source=value.getSource("geoai-find-footprints") as (import("maplibre-gl").GeoJSONSource&{_data:unknown})|undefined;
        return {loaded:value.isStyleLoaded(),features:source?._data,roadCount:value.queryRenderedFeatures(undefined,{layers:["test-road"]}).length,bounds:value.getBounds().toArray()};
      }hook=hook.next as typeof hook;}fiber=fiber.return!;}throw Error("map instance missing");
  });
}

test("Q01–Q05 source footprints, three-way basemap comparison and exact Find → Analyse survive unavailable enrichment",async({page},info)=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width:1440,height:1000});
  await installLoopbackBrowserHarness(page,info.project.use.browserName,info.project.use.baseURL);
  await page.route(externalHttpUrlPattern(info.project.use.baseURL),async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==="tiles.openfreemap.org"&&url.pathname.startsWith("/styles/"))return route.fulfill({json:{version:8,
      sources:{streets:{type:"geojson",data:{type:"FeatureCollection",features:[{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:[[55.25,25.21],[55.31,25.21]]}},{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:[[55.28,25.18],[55.28,25.24]]}}]}}},
      layers:[{id:"background",type:"background",paint:{"background-color":"#e5ebdd"}},{id:"test-road",type:"line",source:"streets",paint:{"line-color":"#ffffff","line-width":7}}]}});
    return route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session",route=>route.fulfill({json:{isAuthenticated:false,user:null}}));
  await page.route("**/api/prototype/point-to-object/context",route=>route.fulfill({status:503,json:{mode:"unavailable",error:"Controlled optional-source outage",retryable:true}}));
  await page.route("**/api/prototype/point-to-object/find",route=>route.fulfill({json:{
    protocol:"POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1",mode:"results",criteria:route.request().postDataJSON(),candidates,ordering:"source_identity_ascending_not_ranked",
    coverage:{kind:"bounded_open_map_sample",approximateAreaSqKm:1,upstreamElementCount:3,normalizedCandidateCount:3,returnedCandidateCount:3,upstreamQueryLimit:80,capReached:false,completeInventory:false,mappedLevelsPolicy:"not_requested"},
    source:{name:"OpenStreetMap",service:"Overpass API",sourceResponseHash:"a".repeat(64),observedAt:null,acquiredAt:"2026-09-20T12:00:00Z",freshness:"runtime_response_feature_time_unavailable",licenceId:"ODbL-1.0",attribution:"© OpenStreetMap contributors",licenceUrl:"https://www.openstreetmap.org/copyright",usagePolicyUrl:"https://dev.overpass-api.de/overpass-doc/en/preface/commons.html",officialStatus:"open_context_not_official",runtimeNetworkUsed:true,persistenceUsed:false},limitations:["Synthetic offline regression fixture"],caveat:POINT_OBJECT_FIND_CAVEAT
  }}));
  await page.goto("/login?next=%2Fworkspace&intent=demo");
  const access=page.getByRole("button",{name:"Open demo access"});
  if(await access.isVisible().catch(()=>false)){await access.click();await page.getByRole("button",{name:"Open demo",exact:true}).click();}
  await expect(page).toHaveURL(url=>url.pathname==="/workspace");
  await page.goto("/prototype/point-to-object");
  await page.getByRole("tab",{name:"Find",exact:true}).click();
  await page.getByTestId("find-search-cta").click();
  await expect(page.getByText("Showing 3",{exact:true})).toBeVisible();
  await page.getByTestId("find-fit-results").click();
  await expect.poll(async()=>JSON.stringify((await mapState(page)).features)).toContain('"Polygon"');
  for(const candidate of candidates)await page.locator('li').filter({has:page.locator(`[id="find-result-${candidate.sourceFeatureId}"]`)}).getByRole("button",{name:"Compare",exact:true}).click();
  await page.getByRole("button",{name:/Compare selected|Compare 3|Compare objects/}).click();
  await page.getByRole("button",{name:/Full comparison|Open full comparison/}).click();
  const dashboard=page.getByTestId("find-full-comparison-dashboard");
  await expect(dashboard).toBeVisible();
  const scope="[data-testid='find-comparison-map-context'] [data-testid='live-map-canvas']";
  await expect.poll(async()=>(await mapState(page,scope)).roadCount).toBeGreaterThan(0);
  const allInFrame=async()=>{const {bounds}=await mapState(page,scope);return candidates.every(candidate=>candidate.longitude>bounds[0][0]&&candidate.longitude<bounds[1][0]&&candidate.latitude>bounds[0][1]&&candidate.latitude<bounds[1][1]);};
  await expect.poll(allInFrame).toBe(true);
  const markers=dashboard.locator('[data-find-result-marker]');await expect(markers).toHaveCount(3);
  for(const candidate of candidates){await dashboard.locator(`[data-find-result-marker="${candidate.sourceFeatureId}"]`).click();await expect(dashboard.locator("thead button").filter({hasText:candidate.label})).toHaveAttribute("aria-pressed","true");}
  await dashboard.getByTestId("find-fit-results").click();
  await expect.poll(allInFrame).toBe(true);
  await dashboard.getByTestId("find-comparison-map-context").screenshot({path:info.outputPath("comparison-1440.png")});
  await page.setViewportSize({width:390,height:844});
  await dashboard.getByTestId("find-fit-results").click();
  await expect.poll(allInFrame).toBe(true);
  await expect.poll(async()=>{const boxes=await markers.evaluateAll(items=>items.map(item=>{const b=item.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};}));return boxes.every((a,i)=>boxes.every((b,j)=>i===j||a.x+a.w<=b.x+1||b.x+b.w<=a.x+1||a.y+a.h<=b.y+1||b.y+b.h<=a.y+1));}).toBe(true);
  await dashboard.getByTestId("find-comparison-map-context").screenshot({path:info.outputPath("comparison-390.png")});
  await dashboard.getByRole("button",{name:"Open object analysis"}).first().click();
  await expect(dashboard).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>{const key=Object.keys(sessionStorage).find(key=>key.includes("selection"));return key?sessionStorage.getItem(key):null;})).toContain('way/82001');
  const saved=await page.evaluate(()=>{const key=Object.keys(sessionStorage).find(key=>key.includes("selection"))!;return JSON.parse(sessionStorage.getItem(key)!);});
  expect(saved.object.geometry).toEqual(candidates[0].geometry);expect(saved.object.renderHeightM).toBe(42);
  await page.screenshot({path:info.outputPath("analysis-source-outage-390.png"),fullPage:true});
  expect(errors).toEqual([]);
});
