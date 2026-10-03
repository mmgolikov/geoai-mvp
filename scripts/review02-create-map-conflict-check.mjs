import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";
import ts from "typescript";

registerHooks({ resolve(s, c, next) {
  if (s.startsWith(".") && !/\.[cm]?[jt]s$/.test(s)) {
    try { return next(`${s}.ts`, c); } catch { /* Canonical resolution below. */ }
  }
  return next(s, c);
} });
let networkCalls = 0;
globalThis.fetch = () => { networkCalls++; throw new Error("Network forbidden in this pure contract"); };
const { reviewPointObjectCreateMapConflict: review } = await import("../src/lib/prototype/point-to-object-create-map-conflict.ts");
const { pointObjectCompleteFootprintOverlap: oldOverlap } = await import("../src/lib/prototype/point-to-object-map-partition.ts");
const { setPointObjectLayerVisibilityIfChanged } = await import("../src/lib/prototype/point-to-object-map-replacement.ts");
const rectangle = (w, s, e, n) => ({ type: "Polygon", coordinates: [[[w,s],[e,s],[e,n],[w,n],[w,s]]] });
const concept = rectangle(55.2700,25.2000,55.2704,25.2004);
const outside = rectangle(55.28,25.21,55.2804,25.2104);
const bowtie = (x, y) => ({ type: "Polygon", coordinates: [[[x,y],[x+0.0004,y+0.0004],[x,y+0.0004],[x+0.0004,y],[x,y]]] });
const courtyard = rectangle(55.2699,25.1999,55.2705,25.2005);
courtyard.coordinates.push(rectangle(55.26995,25.19995,55.27045,25.20045).coordinates[0]);
const distantInvalid = bowtie(55.28,25.21);
const mixed = { type: "MultiPolygon", coordinates: [courtyard.coordinates,distantInvalid.coordinates] };
const mapFor = (geometries, extra = {}) => ({
  project: ([longitude,latitude]) => ({ x: longitude*10000, y: latitude*10000 }),
  queryRenderedFeatures: () => geometries.map(geometry => ({ geometry })), ...extra
});
let cases = 0;
function expectReview(map, geometry, status, reason) {
  const result = review(map, ["native"], [{ geometry }]);
  assert.equal(result.status,status); assert.equal(result.reason,reason); cases++;
  return result;
}
expectReview(mapFor([]), concept, "clear", "footprints-clear");
expectReview(mapFor([outside]), concept, "clear", "footprints-clear");
expectReview(mapFor([concept]), concept, "overlap", "measured-overlap");
expectReview(mapFor([bowtie(55.27,25.2)]), concept, "uncertain", "native-geometry-unmeasurable");
expectReview(mapFor([{ type:"Point", coordinates:[55.27,25.2] }]), concept, "uncertain", "native-geometry-unmeasurable");
expectReview(mapFor([],{ queryRenderedFeatures:()=>{ throw new Error("Synthetic query failure"); } }), concept,"uncertain","query-failed");
expectReview(mapFor([],{ project:()=>{ throw new Error("Synthetic projection failure"); } }),concept,"uncertain","projection-failed");
expectReview(mapFor([],{ project:()=>({x:NaN,y:0}) }),concept,"uncertain","projection-failed");
expectReview(mapFor([]),{type:"Polygon",coordinates:[]},"uncertain","saved-geometry-invalid");
assert.equal(oldOverlap(mixed,concept),null,"Reproduced old failure: a disjoint invalid sibling poisons the complete aggregate test");
const corrected = expectReview(mapFor([mixed]),concept,"clear","footprints-clear");
assert.equal(corrected.disjointMembers,1); assert.equal(corrected.comparedPairs,1);
expectReview(mapFor([{type:"MultiPolygon",coordinates:[concept.coordinates,distantInvalid.coordinates]}]),concept,"overlap","measured-overlap");
expectReview(mapFor([bowtie(55.27,25.2),concept]),concept,"overlap","measured-overlap");
expectReview(mapFor([rectangle(55.2704,25.2,55.2708,25.2004)]),concept,"clear","footprints-clear");
expectReview(mapFor([rectangle(55.2704,25.2004,55.2708,25.2008)]),concept,"clear","footprints-clear");
expectReview(mapFor(Array(2001).fill(concept)),concept,"uncertain","native-geometry-unmeasurable");
const overBudget = {type:"Polygon",coordinates:[Array(5001).fill([55.27,25.2])]};
expectReview(mapFor([overBudget]),concept,"uncertain","native-geometry-unmeasurable");
const invalidPosition = structuredClone(outside); invalidPosition.coordinates[0][0][0] = NaN;
expectReview(mapFor([invalidPosition]),concept,"uncertain","native-geometry-unmeasurable");
const unclosed = structuredClone(concept); unclosed.coordinates[0].pop();
const zeroArea = {type:"Polygon",coordinates:[[[55.27,25.2],[55.2701,25.2],[55.2702,25.2],[55.27,25.2]]]};
const selfIntersecting = {type:"Polygon",coordinates:[[[55.27,25.2],[55.2705,25.2004],[55.27,25.2004],[55.2704,25.2],[55.27,25.2]]]};
for (const invalid of [unclosed,zeroArea,selfIntersecting]) {
  // The saved model is checked BEFORE no-source/no-results/disjoint shortcuts.
  const noLayers = review(mapFor([]),[],[{geometry:invalid}]);
  assert.equal(noLayers.status,"uncertain"); assert.equal(noLayers.reason,"saved-geometry-invalid"); cases++;
  expectReview(mapFor([]),invalid,"uncertain","saved-geometry-invalid");
  expectReview(mapFor([outside]),invalid,"uncertain","saved-geometry-invalid");
}
const mutableSaved = structuredClone(concept);
expectReview(mapFor([]),mutableSaved,"clear","footprints-clear");
mutableSaved.coordinates[0].pop();
expectReview(mapFor([]),mutableSaved,"uncertain","saved-geometry-invalid");
const originalBytes = JSON.stringify({mixed,concept});
for (let i=0;i<3;i++) review(mapFor([mixed]),["native"],[{geometry:concept}]);
assert.equal(JSON.stringify({mixed,concept}),originalBytes,"The review never repairs or changes saved/native geometry"); cases++;
const {conceptTemplate,conceptSiteDefaults,generateConceptMassingAlternatives} = await import("../src/lib/prototype/point-to-object-create.ts");
const generatedSite = rectangle(55.269,25.199,55.272,25.202).coordinates;
for (const templateId of ["residential_mixed_use","commercial_hub","civic_green","residential_quarter","hospitality_recreation"]) {
  const program = conceptSiteDefaults(conceptTemplate(templateId,"en"),generatedSite);
  for (const {massing} of generateConceptMassingAlternatives(generatedSite,program,`review02:strict-saved:${templateId}`)) {
    const bytes = JSON.stringify(massing);
    assert.equal(review(mapFor([]),[],massing.featureCollection.features).status,"clear","Existing generated A/B models pass strict saved topology without a native-source shortcut");
    assert.equal(JSON.stringify(massing),bytes); cases++;
  }
}

// Exercise the actual component functions without importing React, CSS,
// browser, network or a map engine. This is not a hosted/browser receipt.
const path = "components/point-to-object/live-object-map.tsx";
const source = readFileSync(path,"utf8");
function functions(text, file = path) {
  const parsed = ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const result = new Map();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) result.set(node.name.text,node.getText(parsed));
    ts.forEachChild(node,visit);
  }
  visit(parsed); return result;
}
const helperPath = "src/lib/prototype/point-to-object-create-map-conflict.ts";
const helperFunctions = functions(readFileSync(helperPath,"utf8"),helperPath);
const validation = (await import("../src/lib/prototype/point-to-object-map-replacement.ts")).validatePointObjectReplacementAoi;
let topologyCalls = 0;
const cacheCode = ["boundedPolygons","validatedSavedPolygons"].map(name=>helperFunctions.get(name)).join("\n");
const cachedValidation = new Function("MAX_POSITIONS","SAVED_TOPOLOGY","validatePointObjectReplacementAoi",
  `${ts.transpileModule(cacheCode,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText}\nreturn validatedSavedPolygons;`)(5000,new WeakMap(),polygon=>{topologyCalls++;return validation(polygon);});
const repeatedSaved = structuredClone(concept);
for (let i=0;i<50;i++) assert.ok(cachedValidation(repeatedSaved));
assert.equal(topologyCalls,1,"Unchanged geometry does not repeat expensive topology per camera movement"); cases++;
repeatedSaved.coordinates[0].pop(); assert.equal(cachedValidation(repeatedSaved),null);
assert.equal(topologyCalls,2,"Mutation invalidates cached trust before a no-native shortcut"); cases++;
const current = functions(source);
const baseline = functions(execFileSync("git",["show",`666c570b4f1e54b8468c02fdaa715af7cb753c03:${path}`],{encoding:"utf8"}));
for (const name of ["visibleNativeConceptConflict","applyBuildingReplacement","restoreBuildingFilters","setHighlight","sanitizeGeometry","buildingLayerIds"]) {
  assert.ok(current.has(name)); assert.equal(current.get(name),baseline.get(name),`${name}: existing native/Analyse protection is byte-identical`); cases++;
}
const observers = new WeakMap();
const empty = {type:"FeatureCollection",features:[]};
const layers = new Map(["geoai-buildings-3d","geoai-create-aoi-fill","geoai-create-aoi-low-zoom-mask","geoai-concept-fill","geoai-concept-volume"].map(id=>[id,{id}]));
const visibility = new Map([ ["geoai-buildings-3d","visible"], ["geoai-concept-fill","none"], ["geoai-concept-volume","none"] ]);
let sourceData = empty, native = [mixed], zoom = 16, restorations = 0, diagnostic;
const sources = new Map([
  ["geoai-create-aoi",{setData:()=>{}}],
  ["geoai-concept-massing",{setData:data=>{sourceData=data;}}]
]);
const map = {
  getSource:id=>sources.get(id), getLayer:id=>layers.get(id),
  getLayoutProperty:id=>visibility.get(id) ?? "visible",
  setLayoutProperty:(id,_,value)=>visibility.set(id,value), getZoom:()=>zoom,
  project:mapFor([]).project,
  queryRenderedFeatures:(_box,options)=>{
    const selected = options?.layers ?? _box.layers;
    if (selected[0] === "geoai-concept-volume" || selected[0] === "geoai-concept-fill") {
      return visibility.get(selected[0]) === "visible" ? sourceData.features : [];
    }
    if (native instanceof Error) throw native;
    return native.map(geometry=>({geometry}));
  }
};
observers.set(map,state=>{diagnostic=state;});
const scope = {
  CREATE_AOI_SOURCE_ID:"geoai-create-aoi",CONCEPT_SOURCE_ID:"geoai-concept-massing",BUILDINGS_3D_LAYER_ID:"geoai-buildings-3d",
  CREATE_AOI_MASK_LAYER_ID:"geoai-create-aoi-low-zoom-mask",CONCEPT_FILL_LAYER_ID:"geoai-concept-fill",CONCEPT_VOLUME_LAYER_ID:"geoai-concept-volume",
  NATIVE_VOLUME_MIN_ZOOM:14,pointObjectReplacementMinimumReliableZoom:13,
  SELECTED_NATIVE_FILTER_ACTIVE:new WeakSet(),CREATE_MAP_PRESENTATION_OBSERVERS:observers,
  createAoiData:()=>empty, restoreBuildingFilters:()=>{restorations++;},applyBuildingReplacement:()=>"partial",
  buildingLayerIds:()=>["geoai-buildings-3d"], reviewPointObjectCreateMapConflict:review,
  setPointObjectLayerVisibilityIfChanged,buildConceptEnvironment:()=>null,updateConceptEnvironment:()=>{},visibleNativeConceptConflict:()=>false
};
const code = ["publishCreateMapPresentation","reviewVisibleCreateConcept","setCreateLayers"].map(name=>current.get(name)).join("\n");
const compiled = ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const setCreate = new Function(...Object.keys(scope),`${compiled}\nreturn setCreateLayers;`)(...Object.values(scope));
const saved = {featureCollection:{type:"FeatureCollection",features:Array.from({length:5},(_,index)=>({id:`saved-${index}`,geometry:concept,properties:{heightM:24+index*3,baseM:0}}))}};
const savedBytes = JSON.stringify(saved);
const aoi = {coordinates:rectangle(55.269,25.199,55.272,25.202).coordinates};
assert.equal(setCreate(map,[],aoi,true,saved,"3d"),"partial");
assert.equal(visibility.get("geoai-concept-volume"),"visible");
assert.deepEqual(sourceData,saved.featureCollection); assert.equal(diagnostic.savedObjects,5);
assert.equal(diagnostic.reason,"footprints-clear"); assert.equal(diagnostic.renderedParts,5); cases++;
native = [concept]; setCreate(map,[],aoi,true,saved,"3d");
assert.equal(visibility.get("geoai-concept-volume"),"none"); assert.equal(diagnostic.reason,"measured-overlap"); cases++;
native = new Error("Synthetic worker query failure"); setCreate(map,[],aoi,true,saved,"3d");
assert.equal(visibility.get("geoai-concept-volume"),"none"); assert.equal(diagnostic.reason,"query-failed"); cases++;
native = [bowtie(55.27,25.2)]; setCreate(map,[],aoi,true,saved,"3d");
assert.equal(visibility.get("geoai-concept-volume"),"none"); assert.equal(diagnostic.check,"uncertain"); cases++;
native = [mixed]; setCreate(map,[],aoi,false,saved,"3d");
assert.equal(visibility.get("geoai-concept-volume"),"none"); assert.equal(diagnostic,null); assert.ok(restorations>0); cases++;
setCreate(map,[],aoi,true,saved,"3d"); assert.equal(visibility.get("geoai-concept-volume"),"visible"); cases++;
setCreate(map,[],aoi,true,saved,"2d"); assert.equal(visibility.get("geoai-concept-fill"),"visible");
assert.equal(visibility.get("geoai-concept-volume"),"none"); cases++;
zoom=13.5; setCreate(map,[],aoi,true,saved,"3d"); assert.equal(visibility.get("geoai-create-aoi-low-zoom-mask"),"visible");
assert.equal(diagnostic.reason,"low-zoom-mask"); cases++;
const invalidSaved = {featureCollection:{type:"FeatureCollection",features:[{geometry:unclosed}]}};
for (const badZoom of [13.5,16]) {
  zoom=badZoom; setCreate(map,[],aoi,true,invalidSaved,"3d");
  assert.equal(visibility.get("geoai-concept-volume"),"none");
  assert.equal(diagnostic.reason,"saved-geometry-invalid","Invalid saved topology cannot bypass the guard through low zoom"); cases++;
}
zoom=16; sourceData=empty; setCreate(map,[],aoi,true,saved,"3d");
assert.equal(sourceData.features.length,5,"Style recreation restores the unchanged legacy massing, without an alternative-generation dependency");
assert.equal(JSON.stringify(saved),savedBytes,"All transitions preserve original saved coordinates, IDs and heights"); cases++;
assert.deepEqual(Object.keys(diagnostic).sort(),["savedObjects","zoom","sourceInstalled","layerInstalled","layerVisible","renderedParts","check","reason","comparedPairs","disjointMembers"].sort(),"Public diagnostic is an exact no-identity/no-payload allowlist"); cases++;
assert.ok(source.includes('className={`${containerClassName} isolate`}'),"Map controls stay in their local stacking context"); cases++;
assert.equal(networkCalls,0);
console.log(JSON.stringify({status:"PASS",cases,networkCalls,scope:"pure overlap classification + actual component presentation functions; hosted founder acceptance pending"}));
