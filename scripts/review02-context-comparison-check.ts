import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import type { LivePointObjectEvidencePack } from "../src/lib/prototype/point-to-object-live-evidence";
import type { PointObjectAnalysisRequest } from "../src/lib/prototype/point-to-object-ai-core";

const root = new URL("../",import.meta.url);
registerHooks({ resolve(specifier, context, next) {
  if(specifier==="server-only") return {url:"data:text/javascript,export%20{}",shortCircuit:true};
  if(specifier.endsWith("/openai-upstream-gate")) return {url:"data:text/javascript,export%20const%20getPointObjectUpstreamStatus%3D()%3D%3E(%7Benabled%3Atrue%7D)%3B",shortCircuit:true};
  if(specifier.startsWith("@/")) return next(new URL(`${specifier.slice(2)}.ts`,root).href,context);
  if((specifier.startsWith("./")||specifier.startsWith("../"))&&!/\.[cm]?[jt]sx?$/.test(specifier)) return next(`${specifier}.ts`,context);
  return next(specifier,context);
},load(url,context,next) { if(url.startsWith("file:")&&url.endsWith(".ts")) return {format:"module",shortCircuit:true,source:stripTypeScriptTypes(readFileSync(fileURLToPath(url),"utf8"),{mode:"transform",sourceUrl:url})}; return next(url,context); }});
const normalized = await import(new URL("src/lib/prototype/point-to-object-normalized-context.ts",root).href);
const comparison = await import(new URL("src/lib/prototype/point-to-object-comparison-core.ts",root).href);
const service = await import(new URL("src/lib/prototype/point-to-object-ai.ts",root).href);
const session = await import(new URL("src/lib/prototype/point-to-object-find-session.ts",root).href);
const comparisonState = await import(new URL("src/lib/prototype/point-to-object-comparison-state.ts",root).href);
const projects = await import(new URL("src/lib/prototype/point-object-projects.ts",root).href);
const CAVEAT="Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
let checks=0;
function check(value:unknown,message:string){assert.ok(value,message);checks++;}
const stamp="2026-10-02T12:00:00.000Z";
function pack(id:string,education=2):LivePointObjectEvidencePack {
  return {evidencePackHash:id.endsWith("1")?"a".repeat(64):"b".repeat(64), coordinates:{longitude:55.27,latitude:25.2,crs:"EPSG:4326"},resolution:{coordinateAssociation:"trusted_open_map_identity"},selectedObject:{sourceFeatureId:id,name:"Source candidate",featureClass:"building:yes",metrics:null},displayGeometry:null,
    source:{acquiredAt:stamp,fabricAcquiredAt:stamp,fabricResponseHash:"c".repeat(64),fabricObservedAt:stamp},nearbyContext:[{sourceFeatureId:"node/77",name:"Mapped school",featureClass:"amenity:school",categories:["education"],distanceM:100,coordinates:[55.271,25.2],evidenceId:"EVD-CONTEXT-1"}],
    geoContext:{radiusM:400,coverage:"available",sampleSize:education+3,capReached:false,groups:[{group:"education",count:education,sharePct:Number((education/(education+3)*100).toFixed(1)),nearestDistanceM:100},{group:"transport",count:3,sharePct:Number((3/(education+3)*100).toFixed(1)),nearestDistanceM:120}],mappedBuildingCount:0,mappedLevelsKnownCount:0,medianMappedLevels:null,nearestTransitM:120,nearestMajorRoadM:null,districtCharacter:{code:"mixed_use_urban",confidence:"low",ruleVersion:"POINT_OBJECT_DISTRICT_RULE_V1",driverGroups:["education","transport"]}}
  } as unknown as LivePointObjectEvidencePack;
}
const a=pack("way/101"),b=pack("way/102",1);
const context=normalized.normalizePointObjectContext(a);
check(normalized.parseNormalizedPointObjectContext(context),"validated shared context");
check(context.programmeChecks.every((c: {capacity:string;adequacy:string})=>c.capacity==="unknown"&&c.adequacy==="not_assessed"),"school presence cannot prove capacity/adequacy");
const missing=structuredClone(a);missing.geoContext.coverage="unavailable";missing.geoContext.groups=[];missing.geoContext.sampleSize=0;
const unavailable=normalized.normalizePointObjectContext(missing);
check(unavailable.metrics.every((m:{value:unknown;status:string})=>m.value===null&&m.status==="source_unavailable"),"unavailable is not zero");
check(normalized.parseNormalizedPointObjectContext(unavailable),"unavailable parses without fabricated zeros");
const empty=structuredClone(a);empty.geoContext.groups=[];empty.geoContext.sampleSize=0;empty.nearbyContext=[];
check(normalized.normalizePointObjectContext(empty).metrics.filter((m:{unit:string})=>m.unit==="count").every((m:{value:unknown})=>m.value===0),"valid empty sample keeps observed zeros");
const cap=structuredClone(a);cap.geoContext.capReached=true;
check(normalized.normalizePointObjectContext(cap).coverage==="partial","cap yields partial coverage");
for(const mutate of [(c:typeof context)=>{c.metrics[0].method="straight_line_to_returned_center";},(c:typeof context)=>{c.capReached=true;},(c:typeof context)=>{c.metrics.find((m:{id:string})=>m.id==="education.share")!.value=99;},(c:typeof context)=>{c.metrics.find((m:{id:string})=>m.id==="education.count")!.value=1.5;},(c:typeof context)=>{c.programmeChecks[0].capacity="sufficient";}]) {
  const bad=structuredClone(context);mutate(bad);check(normalized.parseNormalizedPointObjectContext(bad)===null,"malformed semantics rejected");
}
const unknownPlace=structuredClone(a);unknownPlace.nearbyContext[0].categories=[];unknownPlace.nearbyContext[0].featureClass="unclassified";
check(normalized.normalizePointObjectContext(unknownPlace).places[0].group==="other_built","unknown does not become civic");
const interior=normalized.normalizePointObjectAreaContext({area:{centroid:{longitude:55.27,latitude:25.2}},summary:{sampleSize:1,groups:[{group:"education",count:1,sharePct:100}]},coverage:{capReached:false},source:{sourceResponseHash:"d".repeat(64),acquiredAt:stamp,observedAt:stamp},features:[{sourceFeatureId:"node/77",label:"School",group:"education",longitude:55.27,latitude:25.2}]} as never);
check(interior.scope.kind==="aoi_interior"&&interior.scope.radiusM===null&&interior.places[0].distanceM===null,"AOI interior never becomes surrounding catchment");
check(normalized.parseNormalizedPointObjectContext(interior),"AOI shares common model");
const request:PointObjectAnalysisRequest={locale:"en",role:"developer",scenario:"b2b_redevelopment_selected_aoi",depth:"standard",goal:"redevelopment",perspective:"developer",horizon:"current",question:null};
const input=comparison.buildPointObjectComparisonInput([a,b],request);
check(input.allowedEvidenceRefs.includes("way/101:education.count"),"metric references bound to candidate");
for(const packs of [[a,a],[a,missing],[a,empty],[a,cap],[a,{...b,resolution:{...b.resolution,coordinateAssociation:"reverse_nearest_indexed_object_not_point_in_polygon"}}],[a,{...b,source:{...b.source,fabricAcquiredAt:"2026-10-02T13:00:00.000Z"}}],[a,{...b,source:{...b.source,fabricAcquiredAt:null}}]]) {assert.throws(()=>comparison.buildPointObjectComparisonInput(packs as LivePointObjectEvidencePack[],request));checks++;}
const refs=["way/101:education.count","way/102:education.count"];
const content={summary:{statement:"Mapped context differs between candidates; verify service access.",evidenceRefs:refs},differences:[{statement:"The education sample differs; confirm operating facilities.",evidenceRefs:refs},{statement:"Transit records provide a common spatial reference for site visits.",evidenceRefs:["way/101:transport.count","way/102:transport.count"]}],checks:[{candidateId:"way/101",action:"Confirm school capacity and admission with the operator.",evidenceRefs:["way/101:education.count"]},{candidateId:"way/102",action:"Check actual access to the mapped education facility.",evidenceRefs:["way/102:education.count"]}]};
check(comparison.parsePointObjectComparisonContent(content,input),"grounded comparison content");
const namedInput=structuredClone(input);namedInput.candidates[0].label="25h Heimat";
const namedContent=structuredClone(content);namedContent.summary.statement="25h Heimat and the other candidate have mapped context to verify.";
check(comparison.parsePointObjectComparisonContent(namedContent,namedInput),"digits in exact source label are not numeric model claims");
namedContent.summary.statement="The site has 25h Heimat capacity for 2000 residents.";
check(!comparison.parsePointObjectComparisonContent(namedContent,namedInput),"source label cannot authorize unrelated model numbers");
namedInput.candidates[0].label="25";namedContent.summary.statement="The candidate contains 25 education facilities.";
check(!comparison.parsePointObjectComparisonContent(namedContent,namedInput),"numeric-only label cannot mask an unquoted quantitative claim");
for(const mutate of [(c:typeof content)=>{c.summary.evidenceRefs=["way/101:invented"]},(c:typeof content)=>{c.summary.statement="This site has capacity for 2000 residents."},(c:typeof content)=>{c.differences[0].evidenceRefs=["way/101:education.count"]},(c:typeof content)=>{c.checks[0].evidenceRefs=["way/102:education.count"]},(c:typeof content)=>{c.summary.statement="This is the best candidate and winner."}]) {const bad=structuredClone(content);mutate(bad);check(!comparison.parsePointObjectComparisonContent(bad,input),"unsupported interpretation rejected");}

const previousFetch=globalThis.fetch,previousKey=process.env.OPENAI_API_KEY;
let injectedProviderCalls=0;let responseContent:unknown=content;
process.env.OPENAI_API_KEY="offline-test-placeholder-not-a-key";
globalThis.fetch=async(url,init)=>{assert.equal(url,"https://api.openai.com/v1/responses");const body=JSON.parse(String(init?.body));check(body.store===false&&!body.tools,"comparison stores nothing and uses no tools");check(body.text.format.strict===true&&body.max_output_tokens<=3500,"bounded structured response");injectedProviderCalls++;return Response.json({status:"completed",output_text:JSON.stringify(responseContent),usage:{input_tokens:100,output_tokens:50,total_tokens:150}},{headers:{"x-request-id":"offline_review02"}});};
let insight;
try {
  insight=await service.generatePointObjectAiComparison([a,b],request);
  check(injectedProviderCalls===1&&insight.telemetry.attempts===1,"one explicit injected provider call");
  check(insight.snapshots[0].evidencePackHash===a.evidencePackHash&&comparison.parsePointObjectComparisonInsight(insight),"response frozen hashes validated");
  const conditions={locale:request.locale,role:request.role!,scenario:request.scenario!};
  const expected=[a,b].map(p=>({sourceFeatureId:p.selectedObject.sourceFeatureId,evidencePackHash:p.evidencePackHash,label:p.selectedObject.name}));
  check(comparison.comparisonInsightMatchesSubmission(insight,conditions,expected),"ordered response binds exact IDs, hashes, labels and intent");
  for(const mutate of [(r:typeof insight)=>r.snapshots.reverse(),(r:typeof insight)=>{r.snapshots[0].evidencePackHash="f".repeat(64);},(r:typeof insight)=>{r.snapshots[0].sourceFeatureId="way/999";},(r:typeof insight)=>{r.snapshots[0].label="Changed label";},(r:typeof insight)=>{r.locale="ru";},(r:typeof insight)=>{r.role="other";},(r:typeof insight)=>{r.scenario="other";}]){const r=structuredClone(insight);mutate(r);check(!comparison.comparisonInsightMatchesSubmission(r,conditions,expected),"wrong order/ID/hash/label/locale/role/scenario rejected");}
  check(!comparison.comparisonInsightMatchesSubmission(null,conditions,expected),"missing response is not a comparison");
  check(!comparison.comparisonInsightMatchesSubmission(insight,conditions,[expected[0],expected[0]]),"duplicate expected subject rejected");
  await assert.rejects(()=>service.generatePointObjectAiComparison([a,cap],request));checks++;
  check(injectedProviderCalls===1,"insufficient snapshot never dispatches provider");
  responseContent={...content,summary:{statement:"Unsupported claim with 9999 metres.",evidenceRefs:refs}};
  await assert.rejects(()=>service.generatePointObjectAiComparison([a,b],request));checks++;
  check(injectedProviderCalls===2,"invalid output does not trigger repair/retry");
} finally {globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;}

const candidates=[a,b].map((p,index)=>({sourceFeatureId:p.selectedObject.sourceFeatureId,sourceElementType:"way",sourceElementId:p.selectedObject.sourceFeatureId.split("/")[1],label:`Candidate ${index}`,name:null,longitude:55.27,latitude:25.2,group:"construction",matchedTag:{key:"building",value:"yes"},mappedBuildingLevels:null,observedTags:{building:"yes"},evidenceClass:"observed_in_open_map_source"}));
const contexts=Object.fromEntries([a,b].map(p=>[p.selectedObject.sourceFeatureId,{name:p.selectedObject.name,address:null,featureClass:p.selectedObject.featureClass,sourceFeatureId:p.selectedObject.sourceFeatureId,geometryType:null,coordinateAssociation:"trusted_open_map_identity",resultCentroidDistanceM:0,addressParts:{},tags:{},metrics:null,geoContext:p.geoContext,linkedEntity:null,normalizedContext:normalized.normalizePointObjectContext(p),evidenceReceipt:{version:"PUBLIC_EVIDENCE_LEASE_V1",evidencePackHash:p.evidencePackHash,sourceResponseHash:"e".repeat(64),acquiredAt:stamp,createdAt:stamp,expiresAt:"2026-10-02T12:15:00.000Z",cacheWindow:Math.floor(Date.parse(stamp)/(15*60_000)),sourceLocale:"en",lookupSourceFeatureId:p.selectedObject.sourceFeatureId}}]));
const result={protocol:"POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1",mode:"results",criteria:{marketKey:"dubai",locale:"en",bounds:[55.26,25.19,55.28,25.21],group:"construction",mappedMinimumLevels:null,mappedMaximumLevels:null,limit:3},candidates,ordering:"source_identity_ascending_not_ranked",coverage:{kind:"bounded_open_map_sample",approximateAreaSqKm:1,upstreamElementCount:2,normalizedCandidateCount:2,returnedCandidateCount:2,upstreamQueryLimit:81,capReached:false,completeInventory:false,mappedLevelsPolicy:"not_requested"},source:{name:"OpenStreetMap",service:"Overpass API",sourceResponseHash:"f".repeat(64),observedAt:stamp,acquiredAt:stamp,freshness:"runtime_response_feature_time_unavailable",licenceId:"ODbL-1.0",attribution:"© OpenStreetMap contributors",licenceUrl:"https://www.openstreetmap.org/copyright",usagePolicyUrl:"https://dev.overpass-api.de/overpass-doc/en/preface/commons.html",officialStatus:"open_context_not_official",runtimeNetworkUsed:true,persistenceUsed:false},limitations:[],caveat:CAVEAT};
const saved={version:1,marketKey:"dubai",locale:"en",audience:"b2b",role:request.role,scenario:request.scenario,group:"construction",mappedMinimumLevels:"",mappedMaximumLevels:"",result,shortlist:candidates,comparisonOpen:true,comparisonView:"dashboard",analysisTargetSourceFeatureId:null,comparisonContexts:contexts,comparisonInsight:insight,updatedAt:stamp};
check(session.parsePointObjectFindSessionState(saved),"saved comparison retains exact contexts and insight");
for(const mutate of [(s:typeof saved)=>{s.comparisonInsight={...insight,scenario:"b2b_hotel_development"};},(s:typeof saved)=>{s.comparisonContexts["way/101"].evidenceReceipt.evidencePackHash="0".repeat(64);},(s:typeof saved)=>{s.comparisonContexts["way/101"].sourceFeatureId="way/999";},(s:typeof saved)=>{s.comparisonContexts["way/101"].normalizedContext.scope.anchor=[55.28,25.2];},(s:typeof saved)=>{s.comparisonContexts["way/101"].evidenceReceipt.sourceLocale="ru";},(s:typeof saved)=>{s.comparisonInsight.snapshots[0].label="An invented source label";},(s:typeof saved)=>{s.comparisonInsight.differences[0].evidenceRefs=["way/101:healthcare.nearest","way/102:healthcare.nearest"];},(s:typeof saved)=>{s.comparisonContexts["way/101"].geoContext.groups[0].nearestDistanceM=101;},(s:typeof saved)=>{s.comparisonInsight.telemetry.latencyMs=-1;}]) {const bad=structuredClone(saved);mutate(bad);check(!session.parsePointObjectFindSessionState(bad),"restored mismatch fails closed");}
check(injectedProviderCalls===2,"saved reopen parser dispatches no provider");

// In-memory browser-local storage only: exercise the real artifact writer and
// reopen parser, not cloud persistence or the founder's browser/account state.
class MemoryStorage {
  values=new Map<string,string>();
  get length(){return this.values.size;}
  key(index:number){return [...this.values.keys()][index]??null;}
  getItem(key:string){return this.values.get(key)??null;}
  setItem(key:string,value:string){this.values.set(key,value);}
  removeItem(key:string){this.values.delete(key);}
}
class ProjectEvent<T=unknown> extends Event { detail:T; constructor(type:string,init:{detail:T}){super(type);this.detail=init.detail;} }
const previousWindow=globalThis.window, previousEvent=globalThis.CustomEvent;
let reopenNetworkCalls=0;
Object.assign(globalThis,{window:{localStorage:new MemoryStorage(),sessionStorage:new MemoryStorage(),dispatchEvent:()=>true},CustomEvent:ProjectEvent});
globalThis.fetch=async()=>{reopenNetworkCalls++;throw new Error("Network forbidden during local restore");};
try {
  const committed=session.parsePointObjectFindSessionState(saved)!;
  const identity=projects.pointObjectProjectIdentity({id:"offline-compare-recovery",isDemoUser:true})!;
  projects.reconcilePointObjectBrowserIdentity(identity);
  await projects.createPointObjectProject(identity,"en","Offline comparison recovery");
  const stored=await projects.savePointObjectOperation(identity,{kind:"find",locale:"en",marketKey:"dubai",label:"Frozen comparison",payload:{session:committed}},"offline-compare-recovery");
  check(stored.status==="saved","valid frozen comparison saved through actual local writer");
  if(stored.status!=="saved")throw new Error("Expected a saved fixture");
  const committedIntent={locale:committed.result!.criteria.locale,role:committed.role,scenario:committed.scenario};
  for(const draft of [{...committedIntent,locale:"ru"},{...committedIntent,scenario:"b2b_hotel_development"},{...committedIntent,role:"real_estate_fund"}]) {
    check(comparisonState.boundPointObjectComparisonInsight(committed.comparisonInsight!,draft,committed.shortlist,committed.comparisonContexts!)===null,"draft language/role/scenario hides the mismatched insight");
    const retained=comparisonState.boundPointObjectComparisonInsight(committed.comparisonInsight!,committedIntent,committed.shortlist,committed.comparisonContexts!);
    check(retained===committed.comparisonInsight,"persistence independently uses committed Find conditions");
    const updated=await projects.updatePointObjectFindViewState(identity,stored.artifact.artifactId,{shortlist:committed.shortlist,comparisonOpen:true,comparisonView:"dashboard",analysisTargetSourceFeatureId:null,comparisonContexts:committed.comparisonContexts,comparisonInsight:retained});
    check((updated.status==="saved"||updated.status==="replayed")&&updated.artifact.payload.session.comparisonInsight?.snapshots[0].evidencePackHash===a.evidencePackHash,"draft view update preserves the saved insight/hash");
    const reopened=projects.inspectPointObjectProjects(identity).store!.projects.flatMap((project:{artifacts:unknown[]})=>project.artifacts).find((artifact:{artifactId:string})=>artifact.artifactId===stored.artifact.artifactId);
    check(await projects.verifySavedPointObjectArtifact(reopened),"reopened comparison retains valid artifact integrity");
    check(JSON.stringify(reopened.payload.session.comparisonInsight)===JSON.stringify(insight),"reopen restores exact old synthesis, not a relabelled result");
  }
  check(comparisonState.boundPointObjectComparisonInsight(committed.comparisonInsight!,committedIntent,committed.shortlist,committed.comparisonContexts!)===committed.comparisonInsight,"changing back displays the matching old snapshot without regeneration");
  const changedContexts=structuredClone(committed.comparisonContexts!);changedContexts["way/101"].evidenceReceipt!.evidencePackHash="0".repeat(64);
  check(comparisonState.boundPointObjectComparisonInsight(committed.comparisonInsight!,committedIntent,committed.shortlist,changedContexts)===null,"changed source hash cannot reuse the old result");
  check(comparisonState.boundPointObjectComparisonInsight(committed.comparisonInsight!,committedIntent,committed.shortlist.slice(0,1),committed.comparisonContexts!)===null,"changed candidate cohort cannot reuse the old result");
  const clientSource=readFileSync(new URL("components/point-to-object/prototype-client-v5.tsx",root),"utf8");
  const saveEffect=clientSource.slice(clientSource.indexOf("const binding = findSavedBindingRef.current;\n    if (!binding || !findResult || !findResultIntent"),clientSource.indexOf("function queueCreateViewUpdate"));
  check(saveEffect.includes("locale: findResult.criteria.locale, role: findResultIntent.role, scenario: findResultIntent.scenario")&&!saveEffect.includes("findRole")&&!saveEffect.includes("findScenario"),"actual artifact effect is bound to committed intent, not draft controls");
  check(reopenNetworkCalls===0&&injectedProviderCalls===2,"draft edit/change-back/reopen makes zero source or provider calls");
} finally {
  Object.assign(globalThis,{window:previousWindow,CustomEvent:previousEvent});globalThis.fetch=previousFetch;
}
console.log(JSON.stringify({status:"PASS",checks,injectedProviderCalls,networkCalls:0,coverage:"normalized context, one-attempt comparison, frozen receipt bindings and committed-vs-draft local saved recovery"}));
