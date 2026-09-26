// Pure synthetic full-validator regression. No provider, hosted or private data.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
const baseline=process.argv.includes('--baseline');
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
      if(baseline && url.endsWith('point-to-object-ai-core.ts')){
        const previous=spawnSync('git',['show','7da5b006c20d0762fe858280d557882609e3890d:src/lib/prototype/point-to-object-ai-core.ts'],{encoding:'utf8',timeout:10_000,maxBuffer:2_000_000});
        assert.equal(previous.status,0,'Exact frozen baseline must be available locally');source=previous.stdout;
      }
      if(url.endsWith('point-to-object-ai-core.ts'))source+='\nexport { evidenceSupport, contextEvidenceTerms };';
      return {format:'module',shortCircuit:true,source:stripTypeScriptTypes(source,{mode:'transform'})};
    }
    return next(url,c);
  }
});
const core=await import('../src/lib/prototype/point-to-object-ai-core.ts');
const {evidencePack}=await import('./point-to-object-semantic-v6-check.ts');
const {semanticHash}=await import('../src/lib/point-to-object/hash.ts');
const caveat='Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.';
const plan=(answer)=>({decision:{path:'existing_asset_screen',disposition:'continue_screening',confidence:'low',reasonCodes:['object_identity_available','use_classification_available','source_is_non_official']},signalCodes:['object_identity','use_classification','building_form','source_limit'],opportunityCodes:['existing_asset_repositioning','technical_reuse_test'],risks:['non_official_source','identity_uncertainty','geometry_not_parcel'].map(code=>({code,severity:'high',confidence:'low'})),answerCode:'source_evidence_only',focusedAnswer:answer,caveat});
const request=(locale)=>({role:'developer',scenario:'unspecified',locale,depth:'standard',goal:'custom',perspective:'developer',horizon:'current',question:locale==='en'?'Describe the mapped nearby context for screening.':'Опиши картографическое окружение для предварительной оценки.'});
const answer=(statement,evidenceRefs,status='answered')=>({status,scope:'nearby_context',perspective:'developer',horizon:'current',confidence:'low',statement,evidenceRefs,missingEvidenceCodes:status==='partial'?['complete_nearby_inventory']:[],unsupportedReasonCode:null});
const summary=(p)=>{const {districtCharacter,...value}=p.geoContext;return value;};
function syncContext(p){const s=summary(p);p.evidence.find(e=>e.id==='EVD-CONTEXT-SUMMARY').value=JSON.stringify(s);p.evidence.find(e=>e.id==='EVD-DISTRICT-PROFILE').value=JSON.stringify({summaryHash:semanticHash(s),districtCharacter:p.geoContext.districtCharacter});return p;}
function transportOnly(){const p=evidencePack();p.geoContext.groups=[{group:'transport',count:4,sharePct:100,nearestDistanceM:120}];p.geoContext.sampleSize=4;p.geoContext.districtCharacter={code:'low_signal',confidence:'low',ruleVersion:'POINT_OBJECT_DISTRICT_RULE_V1',driverGroups:[]};p.nearbyContext=[];p.evidence=p.evidence.filter(e=>!/^EVD-CONTEXT-\d+$/.test(e.id));return syncContext(p);}
const validate=(a,p=evidencePack(),r=request('en'))=>core.validatePointObjectAiContentDetailed(plan(a),p,r);
let checks=0;
const accepted=(a,p,r,priorAccepted=false)=>{const bytes=JSON.stringify(p),v=validate(a,p,r);if(baseline){if(priorAccepted)assert.equal(v.ok,true,JSON.stringify(v));else assert.equal(v.detail,'focused_answer_context_value_mismatch');checks++;return;}assert.equal(v.ok,true,JSON.stringify({v,terms:[...core.contextEvidenceTerms(a.evidenceRefs,core.evidenceSupport(p))]}));assert.equal(v.content.answerToQuestion.statement,a.statement);assert.equal(JSON.stringify(p),bytes);checks++;};
const rejected=(a,p,r,detail)=>{const v=validate(a,p,r);assert.equal(v.ok,false,'Unexpected acceptance');assert.equal(v.detail,detail);checks++;};
for(const [locale,transit,district] of [
  ['en','Transit services appear in the bounded sample; route suitability remains unverified.','The rule-based district profile is commercial and business-led in this bounded mapped sample.'],
  ['ru','Транспорт присутствует в ограниченной выборке; пригодность маршрутов не подтверждена.','По картографической выборке район имеет деловой и коммерческий профиль; вывод требует проверки.']
]){
  const r=request(locale),p=transportOnly();
  accepted(answer(transit,['EVD-CONTEXT-SUMMARY']),p,r,locale==='ru');
  accepted(answer(district,['EVD-DISTRICT-PROFILE']),evidencePack(),r);
  if(baseline)continue;
  rejected(answer(transit,['EVD-OSM-OBJECT']),p,r,'focused_answer_nearby_scope_without_context_receipt');
  const unbound=evidencePack();unbound.evidence=unbound.evidence.filter(e=>e.id!=='EVD-CONTEXT-SUMMARY');
  rejected(answer(transit,['EVD-CONTEXT-SUMMARY']),unbound,r,'focused_answer_ref_unbound');
  rejected(answer(`${transit} 987654321 nearby features.`,['EVD-CONTEXT-SUMMARY']),p,r,'focused_answer_novel_number');
  rejected(answer(`${transit} Guaranteed best use.`,['EVD-CONTEXT-SUMMARY']),p,r,'focused_answer_forbidden_claim');
}
if(baseline){assert.equal(networkCalls,0);console.log(JSON.stringify({status:'BASELINE_REPRODUCED',checks,networkCalls,detail:'focused_answer_context_value_mismatch'}));process.exit(0);}
const noTransport=evidencePack();noTransport.geoContext.groups.find(g=>g.group==='transport').count=0;noTransport.geoContext.nearestTransitM=null;syncContext(noTransport);
rejected(answer('Transit services appear in the bounded mapped sample; route suitability remains unverified.',['EVD-CONTEXT-SUMMARY']),noTransport,request('en'),'focused_answer_context_value_mismatch');
const metricOnly=evidencePack();metricOnly.geoContext.groups.find(g=>g.group==='transport').count=0;syncContext(metricOnly);
accepted(answer('Transit services appear in the bounded sample; route suitability remains unverified.',['EVD-CONTEXT-SUMMARY']),metricOnly,request('en'));
const districtOnly=evidencePack();districtOnly.geoContext.districtCharacter={code:'hospitality_tourism',confidence:'medium',ruleVersion:'POINT_OBJECT_DISTRICT_RULE_V1',driverGroups:['hospitality']};syncContext(districtOnly);
const tourism=answer('The rule-based district profile is tourism-led in this bounded sample; verify it before a development decision.',['EVD-DISTRICT-PROFILE']);
accepted(tourism,districtOnly,request('en'));
rejected({...tourism,evidenceRefs:['EVD-CONTEXT-SUMMARY']},districtOnly,request('en'),'focused_answer_context_value_mismatch');
const noDistrictDriver=evidencePack();noDistrictDriver.geoContext.groups.find(g=>g.group==='commercial').count=0;syncContext(noDistrictDriver);
rejected(answer('The rule-based district profile is commercial and business-led in this bounded mapped sample.',['EVD-DISTRICT-PROFILE']),noDistrictDriver,request('en'),'focused_answer_context_value_mismatch');
const unknown=evidencePack(true);
rejected(answer('The district is not reliably classifiable from the returned map sample; validation is needed.',['EVD-DISTRICT-PROFILE']),unknown,request('en'),'focused_answer_context_value_mismatch');
rejected(answer('Transit services appear in the bounded sample; route suitability remains unverified.',['EVD-CONTEXT-SUMMARY']),unknown,request('en'),'focused_answer_context_value_mismatch');
rejected(answer('Public amenities make the mapped area valuable for development decisions.',['EVD-CONTEXT-SUMMARY']),evidencePack(),request('en'),'focused_answer_context_value_mismatch');
rejected({...answer('Transit services appear in the bounded sample; route suitability remains unverified.',['EVD-CONTEXT-SUMMARY']),scope:'object_identity'},transportOnly(),request('en'),'focused_answer_ref_outside_scope');
const deep={...request('en'),depth:'deep',goal:'due_diligence',question:'Build a due diligence plan for nearby transport.'};
const shallowDeep=answer('Transit services appear in the bounded sample; route suitability remains unverified.',['EVD-CONTEXT-SUMMARY'],'partial');
shallowDeep.missingEvidenceCodes=['official_identity','parcel_boundary','title_rights','planning_controls','physical_baseline','current_market','cost_financials','complete_nearby_inventory'];
rejected(shallowDeep,transportOnly(),deep,'focused_answer_scenario_depth');
assert.equal(networkCalls,0);
console.log(JSON.stringify({status:'PASS',checks,networkCalls,scope:'synthetic full validator only'}));
