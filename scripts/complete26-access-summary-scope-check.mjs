// Synthetic source-bound regression only; no private artifacts or live calls.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
let networkCalls=0;
globalThis.fetch=async()=>{networkCalls++;throw Error('Network forbidden');};
registerHooks({
  resolve(s,c,next){
    if(s.startsWith('@/'))return next(new URL(`../${s.slice(2)}.ts`,import.meta.url).href,c);
    if((s.startsWith('./')||s.startsWith('../'))&&!/\.[cm]?[jt]s$/.test(s))return next(`${s}.ts`,c);
    return next(s,c);
  },
  load(url,c,next){
    if(url.startsWith('file:')&&url.endsWith('.ts')){
      let source=readFileSync(fileURLToPath(url),'utf8');
      if(url.endsWith('/point-to-object-ai-core.ts'))source+='\nexport { evidenceSupport, novelNumberInStatement };';
      return {format:'module',shortCircuit:true,source:stripTypeScriptTypes(source,{mode:'transform'})};
    }
    return next(url,c);
  }
});
const core=await import('../src/lib/prototype/point-to-object-ai-core.ts');
const {evidencePack}=await import('./point-to-object-semantic-v6-check.ts');
const {semanticHash}=await import('../src/lib/point-to-object/hash.ts');
let checks=0;
const eq=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
function pack(kind='unavailable',withNearby=true){
  const p=evidencePack(true);
  if(kind!=='unavailable'){
    p.geoContext.coverage='available';
    p.geoContext.nearestTransitM=['both','transit'].includes(kind)?191:null;
    p.geoContext.nearestMajorRoadM=['both','road'].includes(kind)?142:null;
    p.geoContext.groups=[
      ...(p.geoContext.nearestTransitM===null?[]:[{group:'transport',count:1,sharePct:100,nearestDistanceM:191}]),
      ...(p.geoContext.nearestMajorRoadM===null?[]:[{group:'access',count:1,sharePct:100,nearestDistanceM:142}])
    ];
    p.geoContext.sampleSize=p.geoContext.groups.length;
    for(const group of p.geoContext.groups)group.sharePct=100/p.geoContext.sampleSize;
  }
  const {districtCharacter,...summary}=p.geoContext;
  p.evidence.find(e=>e.id==='EVD-CONTEXT-SUMMARY').value=JSON.stringify(summary);
  p.evidence.find(e=>e.id==='EVD-DISTRICT-PROFILE').value=JSON.stringify({summaryHash:semanticHash(summary),districtCharacter});
  p.nearbyContext=withNearby?[
    {evidenceId:'EVD-CONTEXT-1',sourceFeatureId:'node/202',name:'Synthetic Platform',categories:['public_transport:platform'],featureClass:'public_transport:platform',distanceM:191,method:'overpass_around_query_element_center_haversine',proofLimit:'bounded'},
    {evidenceId:'EVD-CONTEXT-2',sourceFeatureId:'way/203',name:'Synthetic Secondary Road',categories:['highway:secondary'],featureClass:'highway:secondary',distanceM:142,method:'overpass_around_query_element_center_haversine',proofLimit:'bounded'}
  ]:[];
  p.evidence.push(...p.nearbyContext.map(({evidenceId,proofLimit,...item})=>({id:evidenceId,label:item.name,sourceId:item.sourceFeatureId,value:JSON.stringify(item)})));
  return p;
}
const request=(locale,depth)=>({locale,depth,goal:'object_profile',perspective:'developer',horizon:'current',question:null});
const absent={
  en:'Access: in the 400 m area-context sample, no usable transit or major-road distance was returned; verify access with route and capacity evidence.',
  ru:'Доступ: в выборке окружения радиусом 400 м расстояния до общественного транспорта и магистральных дорог не получены; нужны данные о маршрутах и пропускной способности.'
};
for(const locale of ['en','ru'])for(const depth of ['quick','standard','deep'])for(const kind of ['unavailable','none','both','transit','road'])for(const withNearby of [true,false]){
  const p=pack(kind,withNearby),before=JSON.stringify(p),support=core.evidenceSupport(p);
  eq(support.projection.nearbyContext.length,withNearby?2:0,'Exact nearby receipts remain independent of fabric coverage');
  const brief=core.renderInitialSemanticBrief(support,request(locale,depth));
  eq(JSON.stringify(p),before,'Rendering never mutates frozen evidence');
  eq(brief.access.evidenceRefs,['EVD-CONTEXT-SUMMARY']);
  if(['unavailable','none'].includes(kind)){
    eq(brief.access.statement,absent[locale],'Missing distances must be scoped to the 400 m fabric sample, not all evidence');
    eq(brief.codes.access,'mapped_access_unavailable');
    eq(/191|142|nearest|ближайш/u.test(brief.access.statement),false,'Do not merge samples or invent nearest access');
  }else{
    const en=[kind!=='road'?'public transport point about 191 m':null,kind!=='transit'?'major road about 142 m':null].filter(Boolean).join('; ');
    const ru=[kind!=='road'?'точка общественного транспорта около 191 м':null,kind!=='transit'?'магистральная дорога около 142 м':null].filter(Boolean).join('; ');
    eq(brief.access.statement,locale==='en'?`Access: ${en} by straight-line distance; routes, travel time and capacity are not measured.`:`Доступ: ${ru} по прямой; маршруты, время в пути и пропускная способность не измерены.`,'Available and single-channel wording stays exact');
    eq(brief.codes.access,{both:'mapped_transit_and_road',transit:'mapped_transit_only',road:'mapped_road_only'}[kind]);
  }
}
const p=pack(),support=core.evidenceSupport(p);
eq(core.novelNumberInStatement('191 m; 142 m',support),false,'Bound nearby numbers remain allowed');
eq(core.novelNumberInStatement('99999 m',support),true,'Novel number remains rejected');
for(const mutation of [
  p=>p.nearbyContext[0].distanceM=192,
  p=>p.evidence.find(e=>e.id==='EVD-CONTEXT-1').sourceId='node/999',
  p=>p.evidence=p.evidence.filter(e=>e.id!=='EVD-CONTEXT-1')
]){
  const changed=pack();mutation(changed);const bound=core.evidenceSupport(changed);
  eq(bound.projection.nearbyContext.some(i=>i.evidenceId==='EVD-CONTEXT-1'),false,'Mismatched nearby receipt never lends a distance');
  eq(core.novelNumberInStatement('191 m',bound),true);
}
const unbound=pack();unbound.evidence=unbound.evidence.filter(e=>e.id!=='EVD-CONTEXT-SUMMARY');
const unboundSupport=core.evidenceSupport(unbound);
eq(unboundSupport.projection.geoContext,null);
for(const locale of ['en','ru'])eq(/400|191|142/.test(core.renderInitialSemanticBrief(unboundSupport,request(locale,'standard')).access.statement),false,'Absent summary cannot lend a radius or nearby values');
eq(networkCalls,0);
console.log(JSON.stringify({status:'PASS',checks,networkCalls,scope:'area-context access wording only; no nearby/fabric merging'}));
