// Real Context route/parser/Next lease cache; source/Auth ports are offline fixtures.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {createRequire,registerHooks,stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
globalThis.AsyncLocalStorage=AsyncLocalStorage;
globalThis.__fabricNextResponse=require('next/server').NextResponse;
globalThis.__fabricCache=require('next/dist/server/web/spec-extension/unstable-cache.js').unstable_cache;
const entries=new Map();
globalThis.__incrementalCache={generateSimpleCacheKey:async value=>createHash('sha256').update(value).digest('hex'),get:async key=>entries.has(key)?{value:structuredClone(entries.get(key)),isStale:false}:null,set:async(key,value)=>{entries.set(key,structuredClone(value));}};
let networkCalls=0,sourceCalls=0,authCalls=0,sequence=0;
globalThis.fetch=async()=>{networkCalls++;throw Error('Network forbidden');};
globalThis.__fabricAuth=()=>{authCalls++;return {allowed:true};};
const data=source=>({url:`data:text/javascript,${encodeURIComponent(source)}`,shortCircuit:true});
registerHooks({
  resolve(s,c,next){
    if(s==='server-only')return data('export{}');
    if(s==='next/server')return data('export const NextResponse=globalThis.__fabricNextResponse;');
    if(s==='next/cache')return data('export const unstable_cache=globalThis.__fabricCache;');
    if(s.endsWith('/require-pilot-identity'))return data('export const requirePilotIdentity=async()=>globalThis.__fabricAuth();export const requirePilotMutationOrigin=()=>null;');
    if(s.endsWith('/openai-upstream-gate'))return data('export const getPointObjectSurfaceStatus=()=>({enabled:true});');
    if(s.endsWith('/point-to-object-live-evidence'))return data('export const buildLivePointObjectEvidencePack=input=>globalThis.__fabricBuild(input);export class LivePointEvidenceError extends Error {}');
    if(s.startsWith('@/'))return next(new URL(`../${s.slice(2)}.ts`,import.meta.url).href,c);
    if((s.startsWith('./')||s.startsWith('../'))&&!/\.[cm]?[jt]s$/.test(s))return next(`${s}.ts`,c);
    return next(s,c);
  },
  load(url,c,next){
    if(url.startsWith('file:')&&url.endsWith('.ts'))return {format:'module',shortCircuit:true,source:stripTypeScriptTypes(readFileSync(fileURLToPath(url),'utf8'),{mode:'transform'})};
    return next(url,c);
  }
});
const {semanticHash}=await import('../src/lib/point-to-object/hash.ts');
const {acquirePublicEvidenceLease:acquire,reusePublicEvidenceLease:reuse}=await import('../src/lib/prototype/point-to-object-evidence-lease.ts');
const {POST}=await import('../app/api/prototype/point-to-object/context/route.ts');
const {parseLiveResolvedObject}=await import('../components/point-to-object/live-session.ts');
const oldNow=Date.now,now=Date.parse('2026-09-26T08:03:00.000Z');Date.now=()=>now;
const input={longitude:55.27,latitude:25.2,locale:'en',osmFeatureId:'way/123',expectedCountryCode:'ae'};
let coverage='unavailable',diagnostic={failureCode:'timeout'},sourceStatus='unavailable';
globalThis.__fabricBuild=async lookup=>{
  sourceCalls++;
  const core={protocol:'POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2',caseKey:'live',caseId:'live_way_123',coordinates:{longitude:lookup.longitude,latitude:lookup.latitude,crs:'EPSG:4326'},resolution:{coordinateAssociation:'trusted_open_map_identity',resultCentroidDistanceM:0},selectedObject:{sourceFeatureId:'way/123',name:'Synthetic object',displayAddress:null,featureClass:'building:yes',geometryType:null,addressParts:{},tags:{'tag.building':'yes'},metrics:null},linkedEntity:null,
    source:{sourceResponseHash:'a'.repeat(64),acquiredAt:new Date(now).toISOString(),fabricStatus:sourceStatus,...(diagnostic===undefined?{}:{fabricDiagnostic:diagnostic}),endpoint:'not-public-adapter-metadata'},
    nearbyContext:[],geoContext:{radiusM:400,coverage,sampleSize:0,capReached:false,groups:[],mappedBuildingCount:0,mappedLevelsKnownCount:0,medianMappedLevels:null,nearestTransitM:null,nearestMajorRoadM:null,districtCharacter:{code:'low_signal',confidence:'low',ruleVersion:'POINT_OBJECT_DISTRICT_RULE_V1',driverGroups:[]}},evidence:[],conflicts:[],missingInformation:[],limitations:[],caveat:'Synthetic fixture'};
  const hash=semanticHash(core);return {...core,evidencePackHash:hash,evidencePackId:`p2o_live_evidence_${hash.slice(0,24)}`,displayGeometry:null};
};
let checks=0;
const eq=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
async function context(){
  const response=await POST(new Request('https://offline.invalid/api/prototype/point-to-object/context',{method:'POST',headers:{origin:'https://offline.invalid','content-type':'application/json','x-forwarded-for':`192.0.2.${++sequence}`},body:JSON.stringify({caseKey:'dubai',longitude:input.longitude,latitude:input.latitude,locale:'en',expectedSourceFeatureId:'way/123'})}));
  eq(response.status,200);eq(response.headers.get('cache-control'),'private, no-store, max-age=0');return response.json();
}
try{
  // Fails on the unchanged route: the already-hashed diagnostic is omitted.
  const first=await context();
  eq(first.subject.fabricDiagnostic,{failureCode:'timeout'},'Context must preserve the same frozen fabric failure enum');
  const {parsePointObjectFabricDiagnostic:parse,projectPointObjectFabricDiagnostic:project}=await import('../src/lib/prototype/point-to-object-fabric-diagnostic.ts');
  const codes=['timeout','rate_limited','invalid_response','response_too_large','unavailable'];
  for(const code of [...codes,null]){
    coverage=code===null?'available':'unavailable';sourceStatus=coverage;diagnostic={failureCode:code};entries.clear();
    const before=sourceCalls,body=await context(),parsed=parseLiveResolvedObject(body.subject);
    eq(parsed?.fabricDiagnostic,diagnostic);eq(parsed?.geoContext.coverage,coverage);
    eq(Object.keys(body.subject.fabricDiagnostic),['failureCode']);
    const lease=await acquire(input),again=await reuse(input,body.evidenceReceipt);
    eq(lease.receipt,body.evidenceReceipt);eq(again.receipt,body.evidenceReceipt);
    eq(again.pack.evidencePackHash,body.evidenceReceipt.evidencePackHash);
    eq(again.pack.source.fabricDiagnostic,diagnostic);eq(sourceCalls,before+1,'Same partial lease must not reacquire optional sources');
    eq(JSON.stringify(body).includes('not-public-adapter-metadata'),false);
    eq(parse(diagnostic,coverage),diagnostic);
    eq(project({...lease.pack.source,rawError:'PRIVATE_SENTINEL',coordinates:[1,2]},coverage),{fabricDiagnostic:diagnostic},'Only the enum crosses the source boundary');
    eq(parse(diagnostic,coverage==='available'?'unavailable':'available'),null,'Status/code contradiction rejects');
  }
  coverage='unavailable';sourceStatus=coverage;diagnostic=undefined;entries.clear();
  const legacy=await context();eq(Object.hasOwn(legacy.subject,'fabricDiagnostic'),false);
  eq(Object.hasOwn(parseLiveResolvedObject(legacy.subject),'fabricDiagnostic'),false,'Historical absence remains unclaimed');
  for(const bad of [null,{},[],{failureCode:undefined},{failureCode:'unknown'}, {failureCode:0},{failureCode:'timeout',rawError:'PRIVATE_SENTINEL'},{failureCode:null}]){
    eq(parse(bad,'unavailable'),null);
    eq(parseLiveResolvedObject({...legacy.subject,fabricDiagnostic:bad}),null,'Malformed optional metadata rejects response; never substitutes empty context');
    eq(project({fabricStatus:'unavailable',fabricDiagnostic:bad},'unavailable'),{});
  }
  for(const state of ['available','invalid',undefined])eq(project({fabricStatus:state,fabricDiagnostic:{failureCode:'timeout'}},'unavailable'),{});
  diagnostic={failureCode:'timeout',rawError:'PRIVATE_SENTINEL'};entries.clear();
  const stripped=await context();eq(Object.hasOwn(stripped.subject,'fabricDiagnostic'),false);eq(stripped.subject.geoContext,legacy.subject.geoContext);
  eq(JSON.stringify(stripped).includes('PRIVATE_SENTINEL'),false);eq(parseLiveResolvedObject(stripped.subject)?.geoContext,legacy.subject.geoContext);
  sourceStatus='available';diagnostic={failureCode:'timeout'};entries.clear();eq(Object.hasOwn((await context()).subject,'fabricDiagnostic'),false);
  eq(networkCalls,0);eq(authCalls,sequence,'Existing route still traverses identity gate for every request');
}finally{Date.now=oldNow;}
console.log(JSON.stringify({status:'PASS',checks,networkCalls,sourceCalls,scope:'synthetic enum projection/parser and real installed Next cache; not live availability'}));
