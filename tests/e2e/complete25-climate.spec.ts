import { test, expect } from "@playwright/test";
import { sprint10Selection, sprint10SelectionWithReceipt, sprint10AnalysisResponse } from "./helpers/sprint10-analysis-fixture";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";
import { CLIMATE_ATTRIBUTION, CLIMATE_ENDPOINT, CLIMATE_LIMIT, CLIMATE_REFERENCE, CLIMATE_VERSION } from "../../src/lib/prototype/point-to-object-climate-contract";
import fixture from "../fixtures/complete25-nasa-monthly.json";

// Explicit rendering fixture: provider-shaped historical values, not real product acceptance.
const climate = {version:CLIMATE_VERSION,status:"available" as const,year:2025,requestedPoint:[55.27,25.2],
  months:Array.from({length:12},(_,i)=>{const key=`2025${String(i+1).padStart(2,"0")}`;return {month:i+1,temperatureC:(fixture.properties.parameter.T2M as Record<string,number>)[key],maximumTemperatureC:(fixture.properties.parameter.T2M_MAX as Record<string,number>)[key],relativeHumidityPct:(fixture.properties.parameter.RH2M as Record<string,number>)[key]};}),
  source:{sourceId:"NASA-POWER",endpoint:CLIMATE_ENDPOINT,referenceUrl:CLIMATE_REFERENCE,attribution:CLIMATE_ATTRIBUTION,dataset:"MERRA2",apiVersion:"v2.10.0",timeStandard:"LST",observedStart:"2025-01-01",observedEnd:"2025-12-31",acquiredAt:"2026-09-25T17:20:00.227Z",responseHash:"a".repeat(64),responseBytes:1226},proofLimit:CLIMATE_LIMIT};

test.beforeEach(async ({page},info)=>installLoopbackBrowserHarness(page,info.project.use.browserName,info.project.use.baseURL));
for(const locale of ["en","ru"] as const) for(const width of [390,834,1440]) test(`NASA climate saved fixture ${locale} ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900}); let posts=0,sourceCalls=0;
  await page.addInitScript(selection=>sessionStorage.setItem("geoai:point-to-object:selection:v3",JSON.stringify(selection)),sprint10SelectionWithReceipt({...sprint10Selection,resolvedObject:{...sprint10Selection.resolvedObject,climate}}));
  await page.route("**/api/auth/session",route=>route.fulfill({json:{isAuthenticated:false,user:null}}));
  await page.route("**/api/prototype/point-to-object/context",route=>{sourceCalls++;return route.abort();});
  await page.route("**/api/prototype/point-to-object/ai",route=>{
    if(route.request().method()==="GET")return route.fulfill({json:{mode:"ready",challenge:"A".repeat(43)}});
    posts++; const {role,scenario,depth,goal,perspective,horizon,question,locale,evidenceReceipt}=route.request().postDataJSON(); const response=sprint10AnalysisResponse({role,scenario,depth,goal,perspective,horizon,question,locale},posts,evidenceReceipt?.evidencePackHash,"POINT_OBJECT_AI_PROMPT_V13_2026_09_26");
    return route.fulfill({json:{...response,subject:{...response.subject,climate}}});
  });
  await page.goto("/prototype/point-to-object/analysis"); const card=page.getByTestId("climate-context"); await expect(card).toBeVisible();
  if(locale==="ru")await page.getByRole("button",{name:"ru",exact:true}).click();
  await expect(card).toHaveAttribute("data-year","2025"); await expect(card.locator("svg polyline")).toHaveCount(2);
  await expect(card.locator('button[aria-pressed="true"]')).toHaveCSS("background-color", "rgb(229, 250, 250)");
  await expect(card.locator('button[aria-pressed="true"]')).toHaveCSS("color", "rgb(52, 64, 84)");
  for (const button of await card.getByRole("button").all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await card.screenshot({path:info.outputPath(`climate-${locale}-${width}.png`)});
  const bounds=await card.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,page:document.documentElement.scrollWidth,viewport:innerWidth})); expect(bounds.scroll).toBeLessThanOrEqual(bounds.client+1);expect(bounds.page).toBeLessThanOrEqual(bounds.viewport+1);
  const humidity=card.getByRole("button",{name:locale==="ru"?"Влажность":"Humidity",exact:true}); await humidity.focus();await page.keyboard.press("Enter");await expect(humidity).toHaveAttribute("aria-pressed","true");await expect(card.locator("svg polyline")).toHaveCount(1);
  await card.locator("summary").click();await expect(card.locator("tbody tr")).toHaveCount(12);await expect(card.getByRole("link")).toHaveAttribute("href",CLIMATE_REFERENCE);
  await page.reload();await expect(card).toBeVisible();expect(posts).toBe(1);expect(sourceCalls).toBe(0);
});
