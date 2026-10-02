import { expect, test, type Page } from "@playwright/test";
import { conceptTemplate, generateConceptMassingAlternatives, validatePointObjectCreateAoiVertices, validateRedevelopmentProgram } from "../../src/lib/prototype/point-to-object-create";
import { createPointObjectCreateDraftKey, createPointObjectCreateEditorScopeKey, POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS, type PointObjectCreateEditorControls } from "../../src/lib/prototype/point-to-object-create-editor";

const controlLabels = {
  blockCount: {en:"Blocks",ru:"Корпуса"},
  levelsMin: {en:"Minimum levels",ru:"Минимум этажей"},
  levelsMax: {en:"Maximum levels",ru:"Максимум этажей"},
  targetSiteCoveragePct: {en:"Site coverage",ru:"Плотность застройки"},
  openSpacePct: {en:"Open space",ru:"Открытые пространства"},
  setbackM: {en:"Setback",ru:"Отступ"},
} satisfies Record<keyof PointObjectCreateEditorControls,{en:string;ru:string}>;
import { hashPointObjectOperation, type PointObjectProjectOperationInput } from "../../src/lib/prototype/point-object-projects";
import { parsePointObjectProjectOperationInput, parsePointObjectProjectStore } from "../../src/lib/prototype/point-object-projects-contract";
import { parsePointObjectFindSessionState } from "../../src/lib/prototype/point-to-object-find-session";
import { parsePointObjectComparisonInsight } from "../../src/lib/prototype/point-to-object-comparison-core";
import { sprint10Selection, sprint10PublicEvidenceReceipt, SPRINT10_CAVEAT } from "./helpers/sprint10-analysis-fixture";
import { installLoopbackBrowserHarness, externalHttpUrlPattern } from "./helpers/local-webkit-csp";
import { sessionMissingFixture } from "./helpers/auth-persona";

const identity = "demo:demo-user-geoai" as const;
const storeKey = `geoai:point-to-object:projects:v1:${encodeURIComponent(identity)}`;
const stamp = "2026-10-02T20:50:00.000Z";

function createOperation(locale: "en" | "ru"): PointObjectProjectOperationInput {
  const vertices: [number, number][] = [[55.2700,25.2050],[55.2720,25.2050],[55.2720,25.2065],[55.2700,25.2065]];
  const valid = validatePointObjectCreateAoiVertices(vertices);
  if (!valid.ok) throw new Error(valid.message);
  const aoi = { id: "create-aoi-review02-held", coordinates: [[...vertices,vertices[0]]], areaSqM: valid.measurements.areaSqM, perimeterM: valid.measurements.perimeterM, vertexCount: 4 };
  const programme = validateRedevelopmentProgram(conceptTemplate("commercial_hub",locale));
  if (!programme.ok) throw new Error(programme.errors.join(";"));
  const alternatives = generateConceptMassingAlternatives(aoi.coordinates,programme.value,"review02-return-offline",locale);
  const controls = Object.fromEntries(POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS.map(key=>[key,programme.value[key]])) as PointObjectCreateEditorControls;
  const scopeKey = createPointObjectCreateEditorScopeKey({aoiId:aoi.id,marketKey:"dubai"});
  const customPrompt = locale === "ru" ? "Сохранённый локальный черновик без новой генерации." : "Held local draft without another generation.";
  const editorSnapshot = { version:1,scopeKey,templateId:programme.value.templateId,controls,lockedControlKeys:[...POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS],customPrompt,
    committedDraftKey:createPointObjectCreateDraftKey({scopeKey,locale,depth:"standard",templateId:programme.value.templateId,controls,lockedControlKeys:POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS,customPrompt}) };
  const input = parsePointObjectProjectOperationInput({kind:"create",locale,marketKey:"dubai",label:"Offline saved Create",payload:{aoi,editorSnapshot,generatedLocale:locale,activeAlternativeId:"A",areaContext:null,
    generated:{mode:"openai_concept",generatedAt:stamp,promptVersion:"POINT_OBJECT_CREATE_REVIEW02_OFFLINE_RETURN_FIXTURE",program:programme.value,massing:alternatives[0].massing,alternatives,
      telemetry:{model:"offline-fixture",reasoningEffort:"none",latencyMs:1,attempts:1,estimatedCostUsd:0,stored:false,toolCalls:0},caveat:SPRINT10_CAVEAT}}});
  if (!input) throw new Error("Invalid saved Create fixture");
  return input;
}

function findOperation(): PointObjectProjectOperationInput {
  const candidates = ["way/101","way/102"].map((sourceFeatureId,index)=>({sourceFeatureId,sourceElementType:"way",sourceElementId:sourceFeatureId.split("/")[1],label:index ? "Held south site" : "Held north site",name:null,longitude:55.2702+index*.0005,latitude:25.2052,group:"construction",matchedTag:{key:"building",value:"yes"},mappedBuildingLevels:null,observedTags:{building:"yes"},evidenceClass:"observed_in_open_map_source"}));
  const contexts = Object.fromEntries(candidates.map(candidate=>[candidate.sourceFeatureId,{...sprint10Selection.resolvedObject,name:candidate.label,sourceFeatureId:candidate.sourceFeatureId,evidenceReceipt:sprint10PublicEvidenceReceipt(candidate.sourceFeatureId)}]));
  const refs = candidates.map(candidate=>`${candidate.sourceFeatureId}:commercial.count`);
  const insight = parsePointObjectComparisonInsight({mode:"openai_comparison",version:"POINT_OBJECT_COMPARISON_V1",generatedAt:stamp,locale:"en",role:"developer",scenario:"b2b_redevelopment_selected_aoi",
    snapshots:candidates.map(candidate=>({sourceFeatureId:candidate.sourceFeatureId,label:candidate.label,evidencePackHash:contexts[candidate.sourceFeatureId].evidenceReceipt.evidencePackHash})),
    summary:{statement:"Held mapped samples support bounded site checks.",evidenceRefs:refs},
    differences:[{statement:"Compare the held commercial samples before a site visit.",evidenceRefs:refs},{statement:"Both sites need independent official validation.",evidenceRefs:refs}],
    checks:candidates.map(candidate=>({candidateId:candidate.sourceFeatureId,action:"Verify actual access and operating use on site.",evidenceRefs:[`${candidate.sourceFeatureId}:commercial.count`]})),
    telemetry:{provider:"openai",model:"offline-fixture",requestId:null,latencyMs:1,attempts:1,stored:false,toolCalls:0,inputTokens:null,outputTokens:null,totalTokens:null},caveat:SPRINT10_CAVEAT});
  if (!insight) throw new Error("Invalid held comparison fixture");
  const session = parsePointObjectFindSessionState({version:1,marketKey:"dubai",locale:"en",audience:"b2b",role:"developer",scenario:"b2b_redevelopment_selected_aoi",group:"construction",mappedMinimumLevels:"",mappedMaximumLevels:"",
    result:{protocol:"POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1",mode:"results",criteria:{marketKey:"dubai",locale:"en",bounds:[55.26,25.20,55.28,25.21],group:"construction",mappedMinimumLevels:null,mappedMaximumLevels:null,limit:12},candidates,ordering:"source_identity_ascending_not_ranked",
      coverage:{kind:"bounded_open_map_sample",approximateAreaSqKm:2,upstreamElementCount:2,normalizedCandidateCount:2,returnedCandidateCount:2,upstreamQueryLimit:80,capReached:false,completeInventory:false,mappedLevelsPolicy:"not_requested"},
      source:{name:"OpenStreetMap",service:"Overpass API",sourceResponseHash:"c".repeat(64),observedAt:null,acquiredAt:stamp,freshness:"runtime_response_feature_time_unavailable",licenceId:"ODbL-1.0",attribution:"© OpenStreetMap contributors",licenceUrl:"https://www.openstreetmap.org/copyright",usagePolicyUrl:"https://dev.overpass-api.de/overpass-doc/en/preface/commons.html",officialStatus:"open_context_not_official",runtimeNetworkUsed:true,persistenceUsed:false},limitations:["Offline fixture; no live source acquisition."],caveat:SPRINT10_CAVEAT},
    shortlist:candidates,comparisonOpen:true,comparisonView:"dashboard",comparisonContexts:contexts,comparisonInsight:insight,analysisTargetSourceFeatureId:null,updatedAt:stamp});
  const input = parsePointObjectProjectOperationInput({kind:"find",locale:"en",marketKey:"dubai",label:"Offline held comparison",payload:{session}});
  if (!input) throw new Error("Invalid saved Find fixture");
  return input;
}

async function install(page:Page,browserName:string,baseURL:string|undefined,operation:PointObjectProjectOperationInput) {
  await installLoopbackBrowserHarness(page,browserName,baseURL);
  const calls:string[]=[];
  const errors:string[]=[];
  page.on("request",request=>{if(new URL(request.url()).pathname.startsWith("/api/prototype/"))calls.push(`${request.method()} ${new URL(request.url()).pathname}`);});
  page.on("pageerror",error=>errors.push(error.message));
  await page.route(externalHttpUrlPattern(baseURL),route=>{
    const url=new URL(route.request().url());
    if(url.hostname==="tiles.openfreemap.org"&&url.pathname.startsWith("/styles/"))return route.fulfill({json:{version:8,sources:{},layers:[{id:"background",type:"background",paint:{"background-color":"#edf2f0"}}]}});
    return route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session",route=>route.fulfill({json:sessionMissingFixture}));
  await page.route("**/api/prototype/**",route=>route.fulfill({status:503,json:{mode:"unavailable",error:"Offline negative network oracle"}}));
  const artifact={...operation,schemaVersion:1,artifactId:"review02-held-artifact",idempotencyKey:"review02-offline",payloadHash:await hashPointObjectOperation(operation),completedAt:stamp,updatedAt:stamp,viewRevision:0};
  const store=parsePointObjectProjectStore({schemaVersion:1,identityKey:identity,activeProjectId:"review02-project",projects:[{schemaVersion:1,projectId:"review02-project",name:"Offline regression project",storageMode:"browser_local_on_this_device",createdAt:stamp,updatedAt:stamp,artifacts:[artifact]}]},identity,20,30);
  if(!store)throw new Error("Invalid offline saved project store");
  const selection={...sprint10Selection,clickedAt:stamp,object:{...sprint10Selection.object,sourceFeatureId:"way/101"},resolvedObject:{...sprint10Selection.resolvedObject,sourceFeatureId:"way/101",evidenceReceipt:sprint10PublicEvidenceReceipt("way/101")}};
  await page.addInitScript(({store,key,identity,selection})=>{
    if(!sessionStorage.getItem("__review02_return_seed")) {
      localStorage.setItem(key,JSON.stringify(store));localStorage.setItem("geoai-mock-demo-session-v1","active");
      localStorage.setItem("geoai:point-to-object:browser-identity:v1",identity);
      sessionStorage.setItem("geoai:point-to-object:selection:v3",JSON.stringify(selection));sessionStorage.setItem("__review02_return_seed","1");
      sessionStorage.setItem("geoai:point-to-object:project-restore:v1",JSON.stringify({schemaVersion:1,identityKey:identity,artifactId:"review02-held-artifact"}));
    }
  },{store,key:storeKey,identity,selection});
  await page.context().addCookies([{name:"geoai_locale",value:operation.locale,url:baseURL!}]);
  return {calls,errors};
}

async function saved(page:Page) {
  return page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).projects[0].artifacts[0],storeKey);
}

async function observeNoRequests(page:Page,calls:string[]) {
  // Negative oracle must outlive the 250ms context and 600ms autocomplete
  // debounce; an immediate zero-count assertion would miss hidden work.
  await page.waitForTimeout(800);
  expect(calls,"local view/draft transitions never acquire sources or dispatch AI").toEqual([]);
}

test.describe("REVIEW02 workspace return",()=>{
  for(const locale of ["en","ru"] as const) for(const width of [390,1440]) test(`${locale} ${width}: saved Create Back opens parameters and retains A/B, draft and exact geometry`,async({page,browserName},info)=>{
    const operation=createOperation(locale);
    if(operation.kind!=="create")throw new Error("Expected Create fixture");
    await page.setViewportSize({width,height:900});
    const observed=await install(page,browserName,info.project.use.baseURL,operation);
    await page.goto("/prototype/point-to-object?mode=create");
    const dashboard=page.getByTestId("create-full-result-dashboard");
    await expect(dashboard).toBeVisible();
    await page.getByTestId("create-dashboard-alternative-b").click();
    await expect.poll(async()=>(await saved(page)).payload.activeAlternativeId).toBe("B");
    const before=await saved(page);
    await dashboard.getByRole("button",{name:locale==="ru"?"К параметрам":"Back to parameters",exact:true}).press("Enter");
    await expect(dashboard).toBeHidden();
    await expect(page.getByTestId("mobile-workspace-shell")).toHaveAttribute("data-sheet","full");
    const workspace=page.getByTestId("create-workspace");
    await expect(workspace).toBeVisible();
    await expect(workspace).not.toHaveAttribute("inert","");
    await expect(page.getByTestId("create-alternative-b")).toHaveAttribute("aria-selected","true");
    const prompt=page.locator("#point-object-create-prompt");
    await expect(prompt).toHaveValue(operation.payload.editorSnapshot!.customPrompt);
    // Parameters are an intentional disclosure: open it before querying the
    // accessible sliders, rather than treating hidden controls as missing.
    await workspace.locator("summary").filter({hasText:locale==="ru"?"Параметры концепции":"Concept parameters"}).click();
    await expect(workspace.getByRole("slider")).toHaveCount(POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS.length);
    // Bind each value to its accessible parameter label; DOM order differs
    // intentionally from the persistence contract's serialization order.
    for(const key of POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS) {
      const slider=workspace.getByRole("slider",{name:controlLabels[key][locale],exact:true});
      await expect(slider).toBeVisible();
      await expect(slider).toHaveValue(String(operation.payload.editorSnapshot!.controls[key]));
    }
    await prompt.fill(`${operation.payload.editorSnapshot!.customPrompt} edited`);
    await page.getByTestId("create-open-result-dashboard").click();
    await expect(dashboard).toBeVisible();
    await expect(page.getByTestId("create-dashboard-alternative-b")).toHaveAttribute("aria-selected","true");
    await page.keyboard.press("Escape");
    await expect(workspace).toBeVisible();
    await expect(prompt).toHaveValue(`${operation.payload.editorSnapshot!.customPrompt} edited`);
    const after=await saved(page);
    expect(after.payload.aoi).toEqual(before.payload.aoi);
    expect(after.payload.generated).toEqual(before.payload.generated);
    expect(after.payload.editorSnapshot).toEqual(before.payload.editorSnapshot);
    expect(after.payload.activeAlternativeId).toBe("B");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:info.outputPath("back-to-parameters.png"),fullPage:true});
    await observeNoRequests(page,observed.calls);expect(observed.errors).toEqual([]);
  });

  test("390: held saved Compare locale/scenario/reset transitions preserve insight without source or AI",async({page,browserName},info)=>{
    await page.setViewportSize({width:390,height:900});
    const observed=await install(page,browserName,info.project.use.baseURL,findOperation());
    await page.goto("/prototype/point-to-object?mode=find");
    await expect(page.getByTestId("comparison-ai-insight")).toBeVisible();
    const before=await saved(page);
    await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Open task",exact:true}).click();
    await page.getByRole("button",{name:"ru",exact:true}).click();
    await expect(page.getByTestId("find-result-stale")).toBeVisible();
    await page.getByRole("button",{name:"en",exact:true}).click();
    await page.getByTestId("point-object-find-scenario-select").selectOption("b2b_lowrise_luxury_residential");
    await expect(page.getByTestId("find-result-stale")).toBeVisible();
    expect((await saved(page)).payload.session.comparisonInsight).toEqual(before.payload.session.comparisonInsight);
    await page.evaluate(identity=>sessionStorage.setItem("geoai:point-to-object:project-restore:v1",JSON.stringify({schemaVersion:1,identityKey:identity,artifactId:"review02-held-artifact"})),identity);
    await page.goto("/prototype/point-to-object?mode=find");
    await page.getByRole("button",{name:"Open task",exact:true}).click();
    await expect(page.getByTestId("find-search-cta")).toHaveText("Open full comparison dashboard");
    await page.getByTestId("find-search-cta").click();
    await expect(page.getByTestId("comparison-ai-insight")).toBeVisible();
    expect((await saved(page)).payload.session.comparisonInsight).toEqual(before.payload.session.comparisonInsight);
    await observeNoRequests(page,observed.calls);expect(observed.errors).toEqual([]);
  });

  test("1440: Analyse locale/view changes are request-free but explicit Retry and a new map selection remain admitted",async({page,browserName},info)=>{
    await page.setViewportSize({width:1440,height:900});
    const observed=await install(page,browserName,info.project.use.baseURL,createOperation("en"));
    await page.addInitScript(selection=>{
      sessionStorage.removeItem("geoai:point-to-object:project-restore:v1");
      sessionStorage.setItem("geoai:point-to-object:selection:v3",JSON.stringify({...selection,resolvedObject:null}));
    },sprint10Selection);
    await page.goto("/prototype/point-to-object?mode=analyse");
    await expect(page.getByRole("button",{name:"Retry",exact:true})).toBeVisible();
    expect(observed.calls).toEqual(["POST /api/prototype/point-to-object/context"]);
    await page.getByRole("button",{name:"ru",exact:true}).click();
    await page.getByRole("button",{name:"en",exact:true}).click();
    await page.getByRole("tab",{name:"Find",exact:true}).click();
    await page.getByRole("tab",{name:"Analyse",exact:true}).click();
    await page.waitForTimeout(800);
    expect(observed.calls).toEqual(["POST /api/prototype/point-to-object/context"]);
    await page.getByRole("button",{name:"Retry",exact:true}).click();
    await expect.poll(()=>observed.calls.length).toBe(2);
    await page.getByTestId("live-map-canvas").click({position:{x:100,y:250}});
    await expect.poll(()=>observed.calls.length).toBe(3);
    expect(observed.calls.every(call=>call==="POST /api/prototype/point-to-object/context")).toBe(true);
    expect(observed.errors).toEqual([]);
  });
});
