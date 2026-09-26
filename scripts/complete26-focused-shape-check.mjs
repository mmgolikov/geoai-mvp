// Pure contract regression. Synthetic evidence only; no provider/raw live response.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error('Network forbidden'); };
registerHooks({
  resolve(s, c, next) {
    if (s === 'server-only') return { url:'data:text/javascript,export{}', shortCircuit:true };
    if (s.startsWith('@/')) return next(new URL(`../${s.slice(2)}.ts`, import.meta.url).href, c);
    if ((s.startsWith('./') || s.startsWith('../')) && !/\.[cm]?[jt]s$/.test(s)) return next(`${s}.ts`, c);
    return next(s, c);
  },
  load(url, c, next) {
    if (url.startsWith('file:') && url.endsWith('.ts')) {
      let source = readFileSync(fileURLToPath(url), 'utf8');
      if (url.endsWith('point-to-object-ai-core.ts')) source += '\nexport { evidenceSupport, validateFocusedAnswer };';
      return { format:'module', shortCircuit:true, source:stripTypeScriptTypes(source, { mode:'transform' }) };
    }
    return next(url, c);
  }
});
const core = await import('../src/lib/prototype/point-to-object-ai-core.ts');
const { normalizeNasaPowerMonthly } = await import('../src/lib/prototype/point-to-object-climate.ts');
const coordinates = { longitude:55.27, latitude:25.2, crs:'EPSG:4326' };
const receipt = (id, value) => ({ id, sourceId:'node/1', label:id, value:JSON.stringify(value) });
const tags = { 'tag.building':'hotel', 'tag.height':'200', 'tag.building:levels':'30' };
const pack = { protocol:'POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2', coordinates,
  selectedObject:{ sourceFeatureId:'node/1', name:'Synthetic hotel', featureClass:'tourism:hotel', tags },
  evidence:[{...receipt('EVD-COORDINATES', coordinates),sourceId:'user_point'}, receipt('EVD-OSM-OBJECT', {sourceFeatureId:'node/1',name:'Synthetic hotel'}),
    receipt('EVD-CLASSIFICATION',{sourceFeatureId:'node/1',featureClass:'tourism:hotel'}),
    receipt('EVD-ALLOWED-FIELDS',{sourceFeatureId:'node/1',tags}), receipt('EVD-SOURCE','OpenStreetMap ODbL')] };
const request = { question:'Build a concise decision-oriented profile of this object.', goal:'object_profile', locale:'en', depth:'standard', perspective:'developer', horizon:'current' };
const profile = { model:'gpt-5.6-sol', reasoningEffort:'medium', verbosity:'medium', maxOutputTokens:5500 };
const missing = ['official_identity','parcel_boundary','title_rights','planning_controls','physical_baseline','current_market','cost_financials'];
const answer = { status:'partial', scope:'mapped_form', perspective:'developer', horizon:'current', statement:'Mapped building form supports preliminary screening only; authoritative identity and asset evidence are still required.',
  evidenceRefs:['EVD-ALLOWED-FIELDS'], confidence:'low', missingEvidenceCodes:missing, unsupportedReasonCode:null };
const validate = (v, r=request, p=pack) => core.validateFocusedAnswer(v, r, core.evidenceSupport(p), 'source_evidence_only');
const schema = (r=request, p=pack) => core.buildPointObjectResponsesRequest(p,r,profile).text.format.schema.properties.focusedAnswer;
let checks=0;
const pass = (label, operation) => { operation(); checks++; console.log(`PASS ${label}`); };
const reject = (mutate, detail) => { const v=structuredClone(answer);mutate(v);assert.deepEqual(validate(v),{ok:false,detail}); };
pass('V13 request, explicit bounds/uniqueness/status prompt and supported pattern (no unsupported uniqueItems)',()=>{
  const body=core.buildPointObjectResponsesRequest(pack,request,profile);
  assert.equal(core.POINT_OBJECT_AI_PROMPT_VERSION,'POINT_OBJECT_AI_PROMPT_V13_2026_09_26');
  assert.match(body.input[0].content[0].text,/40-900 UTF-16/);assert.match(body.input[0].content[0].text,/must each be unique/);
  assert.equal(schema().properties.statement.anyOf[0].pattern,'^[\\s\\S]{40,900}$');
  assert.doesNotMatch(JSON.stringify(body.text.format.schema),/uniqueItems/);
  assert.equal(validate(answer).ok,true);
});
pass('safe exact codes isolate all former shape predicate families',()=>{
  for(const [key,value,detail] of [
    ['status','PRIVATE_PROVIDER_TEXT','status_enum'],['scope','PRIVATE_PROVIDER_TEXT','scope_enum'],['confidence','high','confidence_enum'],
    ['perspective','investor','perspective_mismatch'],['horizon','long_term','horizon_mismatch'],['statement',{},'statement_type'],
    ['statement',' \n\t\u200b ','statement_empty'],['statement','a'.repeat(39),'statement_too_short'],['statement','a'.repeat(901),'statement_too_long'],
    ['evidenceRefs',null,'refs_type'],['evidenceRefs',['PRIVATE_PROVIDER_TEXT'],'refs_value'],['evidenceRefs',Array(7).fill('EVD-ALLOWED-FIELDS'),'refs_count'],
    ['evidenceRefs',['EVD-ALLOWED-FIELDS','EVD-ALLOWED-FIELDS'],'refs_duplicate'],['missingEvidenceCodes',null,'missing_codes_type'],
    ['missingEvidenceCodes',['PRIVATE_PROVIDER_TEXT'],'missing_codes_enum'],['missingEvidenceCodes',Array(12).fill('official_identity'),'missing_codes_count'],
    ['missingEvidenceCodes',[...missing,'official_identity'],'missing_codes_duplicate'],['unsupportedReasonCode','PRIVATE_PROVIDER_TEXT','unsupported_reason_enum']
  ])reject(v=>{v[key]=value;},`focused_answer_${detail}`);
});
pass('40/900 boundaries and ordinary schema reject 39/901 in EN/RU',()=>{
  for(const locale of ['en','ru'])for(const n of [39,40,900,901]){
    const r={...request,locale}, text=(locale==='en'?'a':'я').repeat(n), result=validate({...answer,statement:text},r);
    const fits=n>=40&&n<=900;assert.equal(result.ok,fits);assert.equal(new RegExp(schema(r).properties.statement.anyOf[0].pattern,'u').test(text),fits);
  }
});
pass('multiline/control/trim normalization and NFKC remain authoritative (not truncation)',()=>{
  const text='  '+('a'.repeat(20))+'\n\t'+('я'.repeat(19))+'  ';
  const result=validate({...answer,statement:text});assert.equal(result.ok,true);assert.equal(result.answer.statement,'a'.repeat(20)+' '+'я'.repeat(19));
  assert.equal(validate({...answer,statement:'a'.repeat(38)+'\n'}).detail,'focused_answer_statement_too_short');
  assert.equal(validate({...answer,statement:'ﬃ'.repeat(300)}).ok,true);
  assert.equal(validate({...answer,statement:'ﬃ'.repeat(301)}).detail,'focused_answer_statement_too_long');
  assert.equal(validate({...answer,statement:'e\u0301'.repeat(20)}).detail,'focused_answer_statement_too_short');
  assert.equal(validate({...answer,statement:'Ａ'.repeat(40)}).answer.statement,'A'.repeat(40));
});
pass('surrogate pairs preserve existing JS UTF-16 limit; provider pattern is not normalization proof',()=>{
  for(const count of [20,450,451]){
    const text='😀'.repeat(count), result=validate({...answer,statement:text});
    assert.equal(text.length,count*2);assert.equal(result.ok,count<=450);
  }
  // Unicode-aware schema regex counts codepoints, server counts UTF-16 after NFKC.
  assert.equal(new RegExp(schema().properties.statement.anyOf[0].pattern,'u').test('😀'.repeat(451)),true);
  assert.equal(validate({...answer,statement:'😀'.repeat(451)}).detail,'focused_answer_statement_too_long');
});
pass('available direct attribute keeps short exact bound value; no broad short-answer relaxation',()=>{
  for(const [locale,question] of [['en','What is the height?'],['ru','Какая высота?']]){
    const r={...request,locale,goal:'custom',question}, v={...answer,status:'answered',statement:'200',missingEvidenceCodes:[]};
    assert.equal(schema(r).properties.statement.anyOf[0].pattern,'^[\\s\\S]{1,900}$');
    assert.equal(validate(v,r).ok,true);assert.equal(validate({...v,statement:'201'},r).detail,'focused_answer_attribute_value_unbound_tag.height');
  }
  const noField=structuredClone(pack);noField.selectedObject.tags={};noField.evidence=noField.evidence.filter(x=>x.id!=='EVD-ALLOWED-FIELDS');
  assert.equal(schema({...request,question:'What is the height?',goal:'custom'},noField).properties.statement.anyOf[0].pattern,'^[\\s\\S]{40,900}$');
});
pass('climate typed selector unaffected by prose bounds; duplicate refs or wrong month still fail',()=>{
  const fixture=JSON.parse(readFileSync(new URL('../tests/fixtures/complete25-nasa-monthly.json',import.meta.url)));
  const climate=normalizeNasaPowerMonthly(fixture,{longitude:55.27,latitude:25.2,year:2025,acquiredAt:'2026-09-25T00:00:00.000Z',responseHash:'a'.repeat(64),responseBytes:1226});
  const p={...pack,climate,evidence:[...pack.evidence,{...receipt('EVD-NASA-POWER-CLIMATE',climate),sourceId:'NASA-POWER'}]};
  for(const [locale,question]of[['en','What is the regional monthly air temperature in January?'],['ru','Какая среднемесячная температура воздуха в январе?']]){
    const r={...request,locale,question,goal:'custom'},v={...answer,status:'answered',scope:'regional_climate',statement:{metric:'T2M',month:1},evidenceRefs:['EVD-NASA-POWER-CLIMATE'],missingEvidenceCodes:[]};
    assert.equal(schema(r,p).properties.statement.type,'object');assert.equal(validate(v,r,p).ok,true);
    assert.equal(validate({...v,statement:{metric:'T2M',month:2}},r,p).detail,'focused_climate_selector_mismatch');
    assert.equal(validate({...v,evidenceRefs:['EVD-NASA-POWER-CLIMATE','EVD-NASA-POWER-CLIMATE']},r,p).detail,'focused_climate_shape');
  }
});
pass('existing status/cardinality/source/claim gates remain fail-closed',()=>{
  reject(v=>v.statement=null,'focused_answer_statement_missing');reject(v=>v.evidenceRefs=[],'focused_answer_refs_missing');
  reject(v=>v.status='answered','focused_answer_overclaims_available_sources');
  reject(v=>v.missingEvidenceCodes=[],'focused_answer_missing_source_gate');
  reject(v=>v.evidenceRefs=['EVD-NOT-PRESENT'],'focused_answer_ref_unbound');
  reject(v=>v.statement='The mapped building has 987654321 levels and is ready for screening.','focused_answer_novel_number');
  const unsupported={...answer,status:'unsupported',statement:null,evidenceRefs:[],unsupportedReasonCode:'requires_authoritative_source'};
  assert.equal(validate(unsupported).ok,true);
  assert.equal(validate({...unsupported,missingEvidenceCodes:[]}).ok,false);
  assert.equal(validate({...unsupported,unsupportedReasonCode:null}).detail,'focused_answer_unsupported_cardinality');
});
pass('repair prompt receives safe field code, not rejected prose; no new repair or recovery dispatch',()=>{
  const body=core.buildPointObjectResponsesRequest(pack,request,profile,'EVIDENCE_INSUFFICIENT','focused_answer_statement_too_long');
  assert.match(body.input[1].content[0].text,/focused_answer_statement_too_long/);
  const service=readFileSync(new URL('../src/lib/prototype/point-to-object-ai.ts',import.meta.url),'utf8');
  const recovery=service.split('function isDeterministicFocusedRecovery')[1].split('export async function')[0];
  assert.doesNotMatch(recovery,/statement_too_long|statement_too_short|refs_duplicate|missing_codes_duplicate/);
});
assert.equal(networkCalls,0);
console.log(JSON.stringify({status:'PASS',groups:checks,networkCalls,scope:'synthetic focused-answer contract; old A01-S exact predicate unknown'}));
