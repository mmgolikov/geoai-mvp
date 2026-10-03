import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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
const { reviewPointObjectCreateMapConflict: review, pointObjectCreateMapNativeLimits: limits } = await import("../src/lib/prototype/point-to-object-create-map-conflict.ts");
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
const differentialFixtures = [];
function expectReview(map, geometry, status, reason) {
  const result = review(map, ["native"], [{ geometry }]);
  differentialFixtures.push({map,geometry:structuredClone(geometry),result});
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
const scanOverBudget = {type:"Polygon",coordinates:[Array(120001).fill([55.27,25.2])]};
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
// Frozen exact 45982 helper (SHA pinned below): differential verdict oracle,
const previousClassifierSource = String.raw`import type { Polygon, Position } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import { pointObjectCompleteFootprintOverlap } from "./point-to-object-map-partition";
import { validatePointObjectReplacementAoi } from "./point-to-object-map-replacement";

export type CreateMapConflictReason = "footprints-clear" | "measured-overlap" | "native-geometry-unmeasurable" | "saved-geometry-invalid" | "query-failed" | "projection-failed";
export type CreateMapConflictReview = {
  status: "clear" | "overlap" | "uncertain";
  reason: CreateMapConflictReason;
  comparedPairs: number;
  disjointMembers: number;
};
type Bounds = readonly [number, number, number, number];
type BoundedPolygon = { polygon: Polygon; bounds: Bounds };
const MAX_POSITIONS = 5_000;
const MAX_NATIVE_FEATURES = 2_000;
const SAVED_TOPOLOGY = new WeakMap<object, { signature: string; valid: boolean }>();

function boundedPolygons(value: unknown): BoundedPolygon[] | null {
  if (!value || typeof value !== "object" || !("type" in value) || !("coordinates" in value)) return null;
  const coordinates = value.coordinates;
  const polygons = value.type === "Polygon" ? [coordinates] : value.type === "MultiPolygon" ? coordinates : null;
  if (!Array.isArray(polygons) || !polygons.length) return null;
  let positions = 0;
  const result: BoundedPolygon[] = [];
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) return null;
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    const rings: Position[][] = [];
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) return null;
      const safeRing: Position[] = [];
      for (const position of ring) {
        if (++positions > MAX_POSITIONS || !Array.isArray(position) || position.length < 2) return null;
        const [longitude, latitude] = position;
        if (typeof longitude !== "number" || typeof latitude !== "number" || !Number.isFinite(longitude) || !Number.isFinite(latitude) ||
          Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return null;
        west = Math.min(west, longitude); south = Math.min(south, latitude);
        east = Math.max(east, longitude); north = Math.max(north, latitude);
        safeRing.push([longitude, latitude]);
      }
      rings.push(safeRing);
    }
    result.push({ polygon: { type: "Polygon", coordinates: rings }, bounds: [west, south, east, north] });
  }
  return result;
}

function disjoint(left: Bounds, right: Bounds): boolean {
  // Strict inequality preserves touching boundaries for the exact overlap test.
  return left[2] < right[0] || right[2] < left[0] || left[3] < right[1] || right[3] < left[1];
}

function validatedSavedPolygons(value: unknown): BoundedPolygon[] | null {
  const polygons = boundedPolygons(value);
  if (!polygons || !value || typeof value !== "object") return null;
  // Cache expensive topology, not a mutable object's presumed trust. The
  // bounded canonical coordinates are compared every time, including restores.
  const signature = JSON.stringify(polygons.map(member => member.polygon.coordinates));
  let cached = SAVED_TOPOLOGY.get(value);
  if (!cached || cached.signature !== signature) {
    cached = { signature, valid: polygons.every(member => validatePointObjectReplacementAoi(member.polygon).valid) };
    SAVED_TOPOLOGY.set(value, cached);
  }
  return cached.valid ? polygons : null;
}

/** Read-only render review. No source acquisition, geometry repair or masking. */
export function reviewPointObjectCreateMapConflict(
  map: Pick<MapLibreMap, "project" | "queryRenderedFeatures">,
  layers: string[],
  features: readonly { geometry: unknown }[]
): CreateMapConflictReview {
  const review: CreateMapConflictReview = { status: "clear", reason: "footprints-clear", comparedPairs: 0, disjointMembers: 0 };
  const uncertain = (reason: CreateMapConflictReason): CreateMapConflictReview => ({ ...review, status: "uncertain", reason });
  const saved = features.map(feature => validatedSavedPolygons(feature.geometry));
  if (!features.length || saved.some(member => !member)) return uncertain("saved-geometry-invalid");
  const concepts = saved.flatMap(member => member ?? []);
  // The previous no-visible-native-layer policy is retained; no network probe.
  if (!layers.length) return review;
  let box: [[number, number], [number, number]];
  try {
    const projected = concepts.flatMap(({ polygon }) => polygon.coordinates.flat().map(position => map.project([position[0], position[1]])));
    if (projected.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return uncertain("projection-failed");
    box = [[Math.min(...projected.map(point => point.x)), Math.min(...projected.map(point => point.y))],
      [Math.max(...projected.map(point => point.x)), Math.max(...projected.map(point => point.y))]];
  } catch { return uncertain("projection-failed"); }
  let native: ReturnType<MapLibreMap["queryRenderedFeatures"]>;
  try { native = map.queryRenderedFeatures(box, { layers }); }
  catch { return uncertain("query-failed"); }
  if (native.length > MAX_NATIVE_FEATURES) return uncertain("native-geometry-unmeasurable");
  let hasUnknown = false;
  for (const feature of native) {
    const members = boundedPolygons(feature.geometry);
    if (!members) { hasUnknown = true; continue; }
    for (const member of members) {
      const relevant = concepts.filter(concept => !disjoint(member.bounds, concept.bounds));
      if (!relevant.length) { review.disjointMembers += 1; continue; }
      for (const concept of relevant) {
        review.comparedPairs += 1;
        // A distant invalid sibling must not poison a measurable local member.
        // Overlap/unknown near the proposal still blocks the entire concept.
        const overlap = pointObjectCompleteFootprintOverlap(member.polygon, concept.polygon);
        if (!overlap) hasUnknown = true;
        else if (overlap.overlapSqM > 0.05) return { ...review, status: "overlap", reason: "measured-overlap" };
      }
    }
  }
  return hasUnknown ? uncertain("native-geometry-unmeasurable") : review;
}
`;
assert.equal(createHash("sha256").update(previousClassifierSource,"utf8").digest("hex"),
  "9aab51e39b2bf86ef386b4bd46af166c91e21374fdbb2fac37f9396bf427098f");
const previousFunctions = functions(previousClassifierSource,helperPath);
const previousCode = ["boundedPolygons","disjoint","validatedSavedPolygons","reviewPointObjectCreateMapConflict"].map(name=>previousFunctions.get(name)).join("\n");
const previousReview = new Function("MAX_POSITIONS","MAX_NATIVE_FEATURES","SAVED_TOPOLOGY","validatePointObjectReplacementAoi","pointObjectCompleteFootprintOverlap",
  `${ts.transpileModule(previousCode,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^export /gm,"")}\nreturn reviewPointObjectCreateMapConflict;`)
  (5000,2000,new WeakMap(),validation,oldOverlap);
const verdict = ({status,reason,comparedPairs,disjointMembers}) => ({status,reason,comparedPairs,disjointMembers});
let diagnosticCases = 0;
for (const {map,geometry,result} of differentialFixtures) {
  assert.deepEqual(verdict(result),previousReview(map,["native"],[{geometry}]),"Exact frozen prior verdict is unchanged");
  assert.equal(networkCalls,0); diagnosticCases++;
}
const failureKeys = ["unsupported-type","empty-coordinates","short-ring","invalid-position","point-budget","native-feature-budget","metric-overlap-null","native-member-budget","native-structure-budget","exact-vertex-budget","exact-pair-budget","exact-work-budget"];
const geometryKeys = ["Polygon","MultiPolygon","Point","MultiPoint","LineString","MultiLineString","GeometryCollection","unknown"];
const zeros = keys => Object.fromEntries(keys.map(key=>[key,0]));
function expectDiagnostic(geometry, code, type) {
  const input = mapFor([geometry]);
  const result = review(input,["native"],[{geometry:concept}]);
  assert.deepEqual(verdict(result),previousReview(input,["native"],[{geometry:concept}]));
  assert.equal(result.status,"uncertain");
  assert.deepEqual(result.nativeFailureCounts,{...zeros(failureKeys),[code]:1});
  assert.deepEqual(result.nativeGeometryCounts,{...zeros(geometryKeys),[type]:1});
  assert.equal(networkCalls,0); diagnosticCases++;
}
for (const [geometry,code,type] of [
  [null,"unsupported-type","unknown"],
  [{coordinates:[]},"unsupported-type","unknown"],
  [{type:"synthetic-private-provider-session-id",coordinates:[]},"unsupported-type","unknown"],
  [{type:"__proto__",coordinates:[]},"unsupported-type","unknown"],
  [{type:"Point",coordinates:[55.27,25.2]},"unsupported-type","Point"],
  [{type:"MultiPoint",coordinates:[[55.27,25.2]]},"unsupported-type","MultiPoint"],
  [{type:"LineString",coordinates:[[55.27,25.2],[55.28,25.21]]},"unsupported-type","LineString"],
  [{type:"MultiLineString",coordinates:[[[55.27,25.2],[55.28,25.21]]]},"unsupported-type","MultiLineString"],
  [{type:"GeometryCollection",geometries:[]},"empty-coordinates","GeometryCollection"],
  [{type:"Polygon"},"empty-coordinates","Polygon"],
  [{type:"Polygon",coordinates:[]},"empty-coordinates","Polygon"],
  [{type:"Polygon",coordinates:null},"empty-coordinates","Polygon"],
  [{type:"MultiPolygon",coordinates:[]},"empty-coordinates","MultiPolygon"],
  [{type:"MultiPolygon",coordinates:null},"empty-coordinates","MultiPolygon"],
  [{type:"MultiPolygon",coordinates:[[]]},"empty-coordinates","MultiPolygon"],
  [{type:"Polygon",coordinates:[null]},"short-ring","Polygon"],
  [{type:"Polygon",coordinates:[[]]},"short-ring","Polygon"],
  [{type:"Polygon",coordinates:[[[55.27,25.2],[55.28,25.21],[55.27,25.2]]]},"short-ring","Polygon"],
  [overBudget,"exact-vertex-budget","Polygon"],
  [scanOverBudget,"point-budget","Polygon"],
  [bowtie(55.27,25.2),"metric-overlap-null","Polygon"]
]) expectDiagnostic(geometry,code,type);
for (const position of [null,[55.27],["55.27",25.2],[NaN,25.2],[55.27,Infinity],[181,25.2],[55.27,91]]) {
  const geometry = structuredClone(concept); geometry.coordinates[0][0] = position;
  expectDiagnostic(geometry,"invalid-position","Polygon");
}
const exhausted = mapFor(Array(2001).fill(concept));
const exhaustedResult = review(exhausted,["native"],[{geometry:concept}]);
assert.deepEqual(verdict(exhaustedResult),previousReview(exhausted,["native"],[{geometry:concept}]));
assert.deepEqual(exhaustedResult.nativeFailureCounts,{...zeros(failureKeys),"native-feature-budget":1});
assert.deepEqual(exhaustedResult.nativeGeometryCounts,zeros(geometryKeys),"Over-budget query is not traversed just for diagnostics");
assert.equal(networkCalls,0); diagnosticCases++;
const rejectedWithDisjoint = mapFor([...Array(19).fill(outside),{type:"LineString",coordinates:[[55.27,25.2],[55.28,25.21]]}]);
const observedShape = review(rejectedWithDisjoint,["native"],[{geometry:concept}]);
assert.deepEqual(verdict(observedShape),previousReview(rejectedWithDisjoint,["native"],[{geometry:concept}]));
assert.equal(observedShape.disjointMembers,19); assert.equal(observedShape.comparedPairs,0);
assert.equal(observedShape.nativeFailureCounts["unsupported-type"],1);
assert.deepEqual(observedShape.nativeGeometryCounts,{...zeros(geometryKeys),Polygon:19,LineString:1});
assert.equal(networkCalls,0); diagnosticCases++;
// A synthetic shape is not identification of the actual founder geometry.
for (const geometry of [unclosed,zeroArea,selfIntersecting]) {
  const denied = review(mapFor([],{queryRenderedFeatures:()=>{throw new Error("Saved invalid must short-circuit query");}}),[],[{geometry}]);
  assert.deepEqual(verdict(denied),previousReview(mapFor([]),[],[{geometry}]));
  assert.deepEqual(denied.nativeFailureCounts,zeros(failureKeys));
  assert.deepEqual(denied.nativeGeometryCounts,zeros(geometryKeys));
  assert.equal(networkCalls,0); diagnosticCases++;
}
let nativeCases = 0;
assert.deepEqual(limits,{scanPositions:120000,members:4096,structuralSteps:140000,exactPairs:128,exactWork:2000000});
assert.ok(Object.isFrozen(limits)); nativeCases++;
for (const [name,expected] of Object.entries({
  boundedPolygons:"bb1346784947158574b0ea5d3c73ea740b72d6c6ea03a0802fc8ce850f59f532",
  validatedSavedPolygons:"d25b5fdb800bfa7c7766f92eff007b7eee69b709124ebfef1347ab138c94c7cc",
  disjoint:"75b829ce0494fcbbcd5d89cd0fa7c38a09512415dac49589ba9fef0993de7bd1"
})) {
  assert.equal(createHash("sha256").update(helperFunctions.get(name)).digest("hex"),expected,"Exact 74e2 saved validation/cache/bbox function is unchanged");
  assert.notEqual(createHash("sha256").update(`${helperFunctions.get(name)}\n`).digest("hex"),expected);
  nativeCases++;
}
assert.ok(readFileSync(helperPath,"utf8").includes("const MAX_POSITIONS = 5_000;")); nativeCases++;
const completeCode = ["nativeGeometryType","boundedPolygons","disjoint","validatedSavedPolygons","nativeStructureStep","completeNativeEnvelopes","exactPolygonWork","reviewPointObjectCreateMapConflict"].map(name=>helperFunctions.get(name)).join("\n");
let exactCalls = 0;
const countedReview = new Function("MAX_POSITIONS","MAX_NATIVE_FEATURES","SAVED_TOPOLOGY","pointObjectCreateMapNativeLimits","pointObjectReplacementMaxVertices","validatePointObjectReplacementAoi","pointObjectCompleteFootprintOverlap",
  `${ts.transpileModule(completeCode,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^export /gm,"")}\nreturn reviewPointObjectCreateMapConflict;`)
  (5000,2000,new WeakMap(),limits,1000,validation,(...args)=>{exactCalls++;return oldOverlap(...args);});
function nativeFixture(geometries,status,code,expectedCalls = null) {
  const bytes = JSON.stringify(geometries), input = mapFor(geometries);
  exactCalls = 0;
  const result = countedReview(input,["native"],[{geometry:concept}]);
  assert.equal(result.status,status);
  if (code) assert.equal(result.nativeFailureCounts[code],1);
  if (expectedCalls !== null) assert.equal(exactCalls,expectedCalls,"No exact work before full scan and plan admission");
  assert.equal(result.comparedPairs,exactCalls);
  assert.equal(JSON.stringify(geometries),bytes);
  assert.equal(networkCalls,0); nativeCases++;
  return result;
}
function circle(vertices, longitude = 55.28, latitude = 25.21, radius = 0.0002) {
  const ring = Array.from({length:vertices},(_,i)=>[longitude+radius*Math.cos(i*2*Math.PI/vertices),latitude+radius*Math.sin(i*2*Math.PI/vertices)]);
  ring.push([...ring[0]]); return {type:"Polygon",coordinates:[ring]};
}
const farMembers = Array.from({length:1200},(_,i)=>rectangle(55.28+i*0.0000001,25.21,55.28004+i*0.0000001,25.21004).coordinates);
const farAggregate = {type:"MultiPolygon",coordinates:farMembers};
const courtyardAggregate = {type:"MultiPolygon",coordinates:[...farMembers,courtyard.coordinates]};
const overlapAggregate = {type:"MultiPolygon",coordinates:[...farMembers,concept.coordinates]};
// Intentional differences: valid finite aggregates above old whole-feature
// 5000 limit. Explicit new clear/overlap oracles, never a blanket parity bypass.
for (const [geometry,status,pairs] of [[farAggregate,"clear",0],[courtyardAggregate,"clear",1],[overlapAggregate,"overlap",1],[circle(6000),"clear",0]]) {
  const old = previousReview(mapFor([geometry]),["native"],[{geometry:concept}]);
  assert.equal(old.status,"uncertain"); assert.equal(old.reason,"native-geometry-unmeasurable");
  nativeFixture([geometry],status,null,pairs);
}
assert.equal(nativeFixture([farAggregate],"clear",null,0).disjointMembers,1200);
for (const members of [overlapAggregate.coordinates,[...overlapAggregate.coordinates].reverse(),[concept.coordinates,...farMembers.slice(400),...farMembers.slice(0,400)]]) {
  nativeFixture([{type:"MultiPolygon",coordinates:members}],"overlap",null,1);
}
for (const members of [courtyardAggregate.coordinates,[...courtyardAggregate.coordinates].reverse()]) {
  nativeFixture([{type:"MultiPolygon",coordinates:members}],"clear",null,1);
}
const lateInvalid = structuredClone(farAggregate);
lateInvalid.coordinates.at(-1)[0].at(-1)[0] = NaN;
nativeFixture([lateInvalid],"uncertain","invalid-position",0);
const lastCoordinateNear = circle(6000);
lastCoordinateNear.coordinates[0][5999] = [55.2702,25.2002];
nativeFixture([lastCoordinateNear],"uncertain","exact-vertex-budget",0);
const lateHoleInvalid = structuredClone(farAggregate);
lateHoleInvalid.coordinates.at(-1).push([[55.27,25.2],[55.2701,25.2],[55.2701,25.2001],[Infinity,25.2]]);
nativeFixture([lateHoleInvalid],"uncertain","invalid-position",0);
const shortHole = structuredClone(farAggregate); shortHole.coordinates.at(-1).push([]);
nativeFixture([shortHole],"uncertain","short-ring",0);
for (const coordinates of [lateInvalid.coordinates,[...lateInvalid.coordinates].reverse()]) {
  nativeFixture([{type:"MultiPolygon",coordinates}],"uncertain","invalid-position",0);
}
for (const geometries of [[farAggregate,{type:"LineString",coordinates:[[55.27,25.2],[55.28,25.21]]}], [{type:"LineString",coordinates:[[55.27,25.2],[55.28,25.21]]},farAggregate]]) {
  nativeFixture(geometries,"uncertain","unsupported-type",0);
}
// A hole outside a distant exterior can reach the concept. Full-ring bounds
// must select it; strict topology then rejects it instead of a false clear.
const remoteExteriorLocalHole = structuredClone(outside); remoteExteriorLocalHole.coordinates.push(concept.coordinates[0]);
nativeFixture([remoteExteriorLocalHole],"uncertain","metric-overlap-null",1);
nativeFixture([circle(6000,55.2702,25.2002,0.001)],"uncertain","exact-vertex-budget",0);
nativeFixture([circle(1001,55.2702,25.2002,0.001)],"uncertain","exact-vertex-budget",0);
nativeFixture([circle(130,55.2702,25.2002,0.001)],"uncertain","exact-work-budget",0);
const withinWork = circle(100,55.2702,25.2002,0.001); withinWork.coordinates.push(courtyard.coordinates[1]);
nativeFixture([withinWork],"clear",null,1);
assert.equal(previousReview(mapFor([withinWork,withinWork]),["native"],[{geometry:concept}]).status,"clear","New review-wide work exhaustion is an explicit stricter safety verdict"); nativeCases++;
nativeFixture([withinWork,withinWork],"uncertain","exact-work-budget",0);
nativeFixture(Array(limits.exactPairs).fill(courtyard),"clear",null,limits.exactPairs);
assert.equal(previousReview(mapFor(Array(limits.exactPairs+1).fill(courtyard)),["native"],[{geometry:concept}]).status,"clear","New exact-pair exhaustion is explicit, never silently omitted from parity"); nativeCases++;
nativeFixture(Array(limits.exactPairs+1).fill(courtyard),"uncertain","exact-pair-budget",0);
const atScan = circle(limits.scanPositions-1);
nativeFixture([atScan],"clear",null,0);
nativeFixture([circle(limits.scanPositions)],"uncertain","point-budget",0);
// Budgets are review-wide, not reset for feature, member, ring or exact pair.
const sixtyThousand = circle(59999);
nativeFixture([sixtyThousand,sixtyThousand],"clear",null,0);
nativeFixture([sixtyThousand,circle(60000)],"uncertain","point-budget",0);
const perMemberCap = {type:"MultiPolygon",coordinates:Array(limits.members+1).fill(outside.coordinates)};
nativeFixture([perMemberCap],"uncertain","native-member-budget",0);
const fourPositionRing = [[55.28,25.21],[55.2801,25.21],[55.28,25.2101],[55.28,25.21]];
nativeFixture([{type:"Polygon",coordinates:Array(30000).fill(fourPositionRing)}],"uncertain","native-structure-budget",0);
for (const geometries of [[concept,circle(limits.scanPositions)],[circle(limits.scanPositions),concept]]) {
  const denied = nativeFixture(geometries,"uncertain","point-budget",0);
  assert.equal(denied.disjointMembers,0,"Unread suffix/prefix cannot establish clearance");
}
assert.equal(previousReview(mapFor([concept,circle(limits.scanPositions)]),["native"],[{geometry:concept}]).status,"overlap","New whole-scan admission precedes an old early measured-overlap return"); nativeCases++;
// Repeat the exact same bounded synthetic fixtures only. Construction/assertion
// cost excluded; durations are local classifier observations, not hosted FPS.
const benchmarks = [];
const benchmarkSaved = Array.from({length:5},()=>({geometry:concept}));
for (const [name,geometries,status] of [["1200-far-members",[farAggregate],"clear"],["6000-positions-local-courtyard",[courtyardAggregate],"clear"],["120000-position-complete-far-ring",[atScan],"clear"],["120001-position-unread-suffix",[circle(limits.scanPositions)],"uncertain"],["125-admitted-courtyard-pairs",Array(25).fill(courtyard),"clear"]]) {
  const input = mapFor(geometries); const samples = [];
  for (let i=0;i<5;i++) {
    const start = performance.now(); const result = review(input,["native"],benchmarkSaved);
    samples.push(performance.now()-start); assert.equal(result.status,status); assert.equal(networkCalls,0);
  }
  samples.sort((a,b)=>a-b);
  benchmarks.push({fixture:name,syntheticSavedObjects:5,runs:5,minMs:Number(samples[0].toFixed(3)),medianMs:Number(samples[2].toFixed(3)),maxMs:Number(samples[4].toFixed(3))});
  nativeCases++;
}
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
// Exact UTF-8 FunctionDeclaration.getText() digests independently read from
// original 666c570b4f1e54b8468c02fdaa715af7cb753c03. This provenance label is
// historical, not a runtime Git dependency: owner commits can be cherry-picked
// into a clean/shallow CI clone or tested in an archive with no .git directory.
const protectedFunctionSHA256 = Object.freeze({
  visibleNativeConceptConflict: "638d7ecd91542fb00f60fa880842df721b901d1e2f75acbc7c5ec96043664c33",
  applyBuildingReplacement: "9a76c919416af04d12bd53f100d728ba0ea3dc2be4ad64840185a393098afe2d",
  restoreBuildingFilters: "4d729abe375b5ee19f7679621a936021e7791d60f2019de2edbd49f80e225e4d",
  setHighlight: "c7ee68318f85ef23d58c531f410c22108e57aa0b86336665a7d94d4632a50a68",
  sanitizeGeometry: "c00e928f4b15e5c96c6e63f3c33d8c3f48b9e8c01b9aaf4cba83d01360ecea3e",
  buildingLayerIds: "6d19ed7da84f0fc456daa8fb882f2157d69be79263d98936e06dddd93783c951"
});
for (const [name, expected] of Object.entries(protectedFunctionSHA256)) {
  assert.ok(current.has(name));
  const text = current.get(name);
  assert.equal(createHash("sha256").update(text,"utf8").digest("hex"),expected,`${name}: existing native/Analyse protection is byte-identical to original 666c570b`);
  assert.notEqual(createHash("sha256").update(`${text}\n`,"utf8").digest("hex"),expected,`${name}: a one-byte text change cannot satisfy the pinned protection oracle`);
  cases++;
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
assert.deepEqual(Object.keys(diagnostic).sort(),["savedObjects","zoom","sourceInstalled","layerInstalled","layerVisible","renderedParts","check","reason","comparedPairs","disjointMembers","nativeFailureCounts","nativeGeometryCounts"].sort(),"Public diagnostic is an exact no-identity/no-payload allowlist"); cases++;
native = [{type:"synthetic-private-provider-session-id",coordinates:[],id:"do-not-publish",properties:{provider:"do-not-publish"}}];
setCreate(map,[],aoi,true,saved,"3d");
assert.equal(visibility.get("geoai-concept-volume"),"none");
assert.deepEqual(Object.keys(diagnostic.nativeFailureCounts),failureKeys);
assert.deepEqual(Object.keys(diagnostic.nativeGeometryCounts),geometryKeys);
assert.equal(diagnostic.nativeFailureCounts["unsupported-type"],1);
assert.equal(diagnostic.nativeGeometryCounts.unknown,1);
assert.ok(!JSON.stringify(diagnostic).includes("synthetic-private-provider-session-id"));
assert.ok(!JSON.stringify(diagnostic).includes("do-not-publish"));
assert.equal(networkCalls,0); diagnosticCases++;
for (const [geometries,code,count] of [
  [[{type:"LineString",coordinates:[[55.27,25.2],[55.28,25.21]]}],"unsupported-type",1],
  [[{type:"Polygon",coordinates:[]}],"empty-coordinates",1],
  [[{type:"Polygon",coordinates:[[]]}],"short-ring",1],
  [[invalidPosition],"invalid-position",1],
  [[overBudget],"exact-vertex-budget",1],
  [[scanOverBudget],"point-budget",1],
  [Array(2001).fill(concept),"native-feature-budget",1],
  [[bowtie(55.27,25.2)],"metric-overlap-null",5]
]) {
  native = geometries; setCreate(map,[],aoi,true,saved,"3d");
  const before = previousReview(mapFor(geometries),["geoai-buildings-3d"],saved.featureCollection.features);
  assert.deepEqual({status:diagnostic.check,reason:diagnostic.reason,comparedPairs:diagnostic.comparedPairs,disjointMembers:diagnostic.disjointMembers},before);
  assert.equal(visibility.get("geoai-concept-volume"),"none","Every diagnosed uncertainty retains suppression");
  assert.equal(diagnostic.nativeFailureCounts[code],count);
  assert.deepEqual(Object.keys(diagnostic.nativeFailureCounts),failureKeys);
  assert.deepEqual(Object.keys(diagnostic.nativeGeometryCounts),geometryKeys);
  assert.ok(!JSON.stringify(diagnostic).includes("55.27"));
  assert.ok(!JSON.stringify(diagnostic).includes("25.2"));
  assert.equal(JSON.stringify(saved),savedBytes);
  assert.equal(networkCalls,0); diagnosticCases++;
}
assert.ok(source.includes('className={`${containerClassName} isolate`}'),"Map controls stay in their local stacking context"); cases++;
assert.equal(networkCalls,0);
console.log(JSON.stringify({status:"PASS",cases,diagnosticCases,nativeCases,networkCalls,limits,benchmarks,scope:"existing negatives + bounded complete native envelopes and intentional aggregate-budget repair; hosted founder acceptance pending"}));
