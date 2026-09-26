// Offline synthetic regression: no credentials, hosted data or provider calls.
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
      if (url.endsWith('/point-to-object-ai.ts')) {
        source=source.replace('import { getPointObjectUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";', 'const getPointObjectUpstreamStatus = () => ({enabled:true});')
          .replace('const apiKey = process.env.OPENAI_API_KEY?.trim();', 'const apiKey = "offline-fixture-only";').replaceAll('process.env','({})');
        const start=source.indexOf('async function requestOpenAi('), end=source.indexOf('function assertCompleteResponse',start);
        assert.ok(start>0&&end>start);
        source=source.slice(0,start)+'async function requestOpenAi() { globalThis.__screeningFixtureCalls++; return {requestId:null,payload:globalThis.__screeningFixturePayload}; }\n'+source.slice(end);
      }
      return { format:'module', shortCircuit:true, source:stripTypeScriptTypes(source, { mode:'transform' }) };
    }
    return next(url, c);
  }
});
const core = await import('../src/lib/prototype/point-to-object-ai-core.ts');
const caveat = 'Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.';
const questions = {
  en: {object_profile:'Build a concise decision-oriented profile of this object.', custom:'Assess whether repositioning is useful and what evidence must be validated.', development_screening:'Screen this object from the selected perspective. Identify opportunities and risks.'},
  ru: {object_profile:'Составь краткий профиль объекта для принятия решения.', custom:'Оцени возможность репозиционирования: какие данные нужно проверить?', development_screening:'Проведи предварительную оценку объекта: возможности и риски.'}
};
function pack(building = true, sparse = false) {
  const sourceFeatureId='way/101', name=building?'Synthetic Towers Hotel':'Synthetic land-use area';
  const featureClass=building?'building:hotel':'landuse:commercial';
  const tags=building?{'tag.building':'hotel','tag.building:levels':'54','tag.height':'355','tag.start_date':'2000'}:{'tag.landuse':'commercial'};
  const coordinates={longitude:55.27,latitude:25.2,crs:'EPSG:4326'};
  const geometryHash='a'.repeat(64);
  const geoContext={radiusM:400,coverage:sparse?'unavailable':'available',sampleSize:sparse?0:33,capReached:false,groups:sparse?[]:[{group:'open_space',count:22,sharePct:66.7,nearestDistanceM:20},{group:'commercial',count:11,sharePct:33.3,nearestDistanceM:30}],mappedBuildingCount:0,mappedLevelsKnownCount:0,medianMappedLevels:null,nearestTransitM:null,nearestMajorRoadM:null};
  const receipt=(id,value)=>({id,sourceId:sourceFeatureId,label:id,value:JSON.stringify(value)});
  return {protocol:'POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2',coordinates,
    selectedObject:{sourceFeatureId,name,featureClass,tags,geometryType:'Polygon',geometryHash},geoContext:{...geoContext,districtCharacter:{code:'low_signal',confidence:'low',ruleVersion:'POINT_OBJECT_DISTRICT_RULE_V1',driverGroups:[]}},nearbyContext:[],
    evidence:[{...receipt('EVD-COORDINATES',coordinates),sourceId:'user_point'},receipt('EVD-OSM-OBJECT',{sourceFeatureId,name}),receipt('EVD-CLASSIFICATION',{sourceFeatureId,featureClass}),receipt('EVD-GEOMETRY',{sourceFeatureId,geometryType:'Polygon',geometryHash}),receipt('EVD-ALLOWED-FIELDS',{sourceFeatureId,tags}),{...receipt('EVD-CONTEXT-SUMMARY',geoContext),sourceId:'SPAT-001'},receipt('EVD-SOURCE','OpenStreetMap ODbL')]};
}
function plan() {
  return {decision:{path:'existing_asset_screen',disposition:'continue_screening',confidence:'low',reasonCodes:['object_identity_available','use_classification_available','source_is_non_official']},signalCodes:['object_identity','use_classification','building_form','source_limit'],opportunityCodes:['existing_asset_repositioning','technical_reuse_test'],risks:['non_official_source','identity_uncertainty','geometry_not_parcel'].map(code=>({code,severity:'high',confidence:'low'})),answerCode:'source_evidence_only',focusedAnswer:null,caveat};
}
function request(locale, goal, depth) { return {role:'developer',scenario:'unspecified',locale,goal,depth,perspective:'developer',horizon:'current',question:questions[locale][goal]}; }
function recover(p,r) {const result=core.recoverPointObjectAiFocusedContentDetailed(plan(),p,r);assert.equal(result.ok,true,result.detail);return result.content.answerToQuestion;}
let checks=0;
for(const locale of ['en','ru'])for(const goal of Object.keys(questions[locale]))for(const building of [true,false]) {
  const p=pack(building), answers=['quick','standard','deep'].map(depth=>recover(p,request(locale,goal,depth)));
  assert.equal(new Set(answers.map(a=>a.statement)).size,3,`A03 parity regression: ${locale}/${goal}/${building} must not erase depth`);
  for(const answer of answers) {assert.equal(answer.status,'partial');assert.ok(answer.missingEvidence.length>=7);assert.ok(answer.statement.length<=900);assert.equal(answer.confidence,'low');}
  const [q,s,d]=answers.map(a=>a.statement);
  assert.match(q,locale==='en'?/identity|parcel/:/идентичност|участ/);
  assert.match(s,locale==='en'?/compar/i:/сравн/i);
  assert.match(d,locale==='en'?/if .*stop|if .*hold/i:/если .*останов|если .*приостанов/i);
  if(building)assert.match(d,locale==='en'?/adaptation.*replacement|replacement.*adaptation/i:/адаптац.*замен|замен.*адаптац/i);
  else {assert.match(d,locale==='en'?/building inventory.*not|no building inventory/i:/состав зданий.*не|нет.*состав/i);assert.doesNotMatch(d,/54|355|2000/);}
  checks++;
}
for(const locale of ['en','ru'])for(const depth of ['quick','standard','deep']) {
  const p=pack(), r=request(locale,'development_screening',depth), answer=recover(p,r);
  const raw={status:answer.status,scope:answer.scope,perspective:r.perspective,horizon:r.horizon,confidence:'low',
    statement:locale==='en'?'The mapped building supports an identity-led review. Test technical suitability only after confirming rights and parcel association.':'Здание по карте даёт основу для проверки идентичности. Оценивайте техническую пригодность после подтверждения прав и привязки участка.',
    evidenceRefs:['EVD-OSM-OBJECT','EVD-GEOMETRY'],missingEvidenceCodes:['official_identity','parcel_boundary','title_rights','planning_controls','physical_baseline','current_market','cost_financials'],unsupportedReasonCode:null};
  const valid=core.validatePointObjectAiContentDetailed({...plan(),focusedAnswer:raw},p,r);
  assert.equal(valid.ok,true,valid.detail);assert.equal(valid.content.answerToQuestion.statement,raw.statement,'valid provider synthesis must remain untouched');
  for(const mutate of [v=>v.evidenceRefs=['EVD-NOT-PRESENT'],v=>v.statement+=' 987654321 floors.',v=>v.status='answered',v=>v.missingEvidenceCodes=[],v=>v.perspective='investor',v=>v.horizon='long_term']) {
    const bad=structuredClone(raw);mutate(bad);assert.equal(core.validatePointObjectAiContentDetailed({...plan(),focusedAnswer:bad},p,r).ok,false);
  }
  const missing=recover(pack(false,true),r);assert.match(missing.statement,locale==='en'?/context is insufficient/:/Контекст территории недостаточен/);assert.doesNotMatch(missing.statement,/400|54|355/);
  const foreign=pack();foreign.evidence.find(x=>x.id==='EVD-ALLOWED-FIELDS').sourceId='way/999';
  const bound=recover(foreign,r);assert.doesNotMatch(bound.statement,/54|355|2000/);
  checks++;
}
assert.equal(networkCalls,0);
const provenance=await import('../src/lib/prototype/point-to-object-answer-provenance.ts');
for(const locale of ['en','ru'])for(const building of [true,false]) {
  const p=pack(building);p.selectedObject.name='N'.repeat(180);p.evidence.find(x=>x.id==='EVD-OSM-OBJECT').value=JSON.stringify({sourceFeatureId:'way/101',name:p.selectedObject.name});
  for(const depth of ['quick','standard','deep'])assert.ok(recover(p,request(locale,'development_screening',depth)).statement.length<=900);
  checks++;
}
const session=await import('../components/point-to-object/live-session.ts');
const {sprint10AnalysisResponse}=await import('../tests/e2e/helpers/sprint10-analysis-fixture.ts');
const capture=await import('../tests/e2e/helpers/sprint10-analysis-result-evidence.ts');
const submitted={...request('en','development_screening','standard'),question:capture.SPRINT10_PUBLIC_ANALYSIS_QUESTION,expectedSourceFeatureId:'way/91010',longitude:55.27,latitude:25.2,consent:true,challenge:'offline-synthetic'};
function responseFixture() {
  const {expectedSourceFeatureId,longitude,latitude,consent,challenge,...requestFields}=submitted;
  const response=sprint10AnalysisResponse(requestFields,1,'a'.repeat(64),core.POINT_OBJECT_AI_PROMPT_VERSION);
  response.evidencePackId=`p2o_live_evidence_${response.evidencePackHash.slice(0,24)}`;
  const tokens={inputTokens:100,cachedInputTokens:20,cacheWriteTokens:0,outputTokens:50,totalTokens:150,estimatedCostUsd:0.001328};
  const model='gpt-5.6-sol',reasoningEffort='medium';
  response.telemetry={...response.telemetry,...tokens,model,reasoningEffort,requestId:'resp_offline_screening',costRateSource:'OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output',attemptTrace:[{attempt:1,purpose:'focused',model,reasoningEffort,requestId:'resp_offline_screening',...tokens}]};
  return response;
}
function captureInput(response) {return {response,submittedRequest:submitted,expectedSourceFeatureId:'way/91010',telemetryIdentity:{requestKey:'S4.SCREENING.PROVENANCE',phase:'S4',candidateHost:'geoai-offline.vercel.app',candidateCommit:'a'.repeat(40),route:'ai',depth:'standard',promptVersion:core.POINT_OBJECT_AI_PROMPT_VERSION,schemaVersion:6}};}
const legacy=responseFixture();
assert.ok(session.parsePointObjectAiResponse(legacy));
assert.equal(Object.hasOwn(session.parsePointObjectAiResponse(legacy),'answerProvenance'),false);
assert.equal(Object.hasOwn(capture.buildSprint10AnalysisResultEvidence(captureInput(legacy)),'answerProvenance'),false);
const accepted=[{kind:'model_validated',rejectionCode:null},...provenance.POINT_OBJECT_FOCUSED_RECOVERY_CODES.map(rejectionCode=>({kind:'deterministic_recovery',rejectionCode}))];
for(const diagnostic of accepted){const response={...responseFixture(),answerProvenance:diagnostic};assert.deepEqual(session.parsePointObjectAiResponse(response)?.answerProvenance,diagnostic);assert.deepEqual(capture.buildSprint10AnalysisResultEvidence(captureInput(response)).answerProvenance,diagnostic);checks++;}
for(const diagnostic of [null,undefined,[],{},'PRIVATE_REJECTED_TEXT',{kind:'model_validated',rejectionCode:'focused_answer_novel_number'},{kind:'deterministic_recovery',rejectionCode:null},{kind:'deterministic_recovery',rejectionCode:'PRIVATE_REJECTED_TEXT'},{...accepted[0],extra:'PRIVATE_REJECTED_TEXT'}]) {
  assert.equal(provenance.parsePointObjectAnswerProvenance(diagnostic),null);
  const response={...responseFixture(),answerProvenance:diagnostic};assert.equal(session.parsePointObjectAiResponse(response),null);assert.throws(()=>capture.buildSprint10AnalysisResultEvidence(captureInput(response)));checks++;
}
const initial=responseFixture();initial.request.question=null;initial.request.focused=false;initial.content.answerToQuestion=null;initial.telemetry.attemptTrace[0].purpose='initial';
assert.ok(session.parsePointObjectAiResponse(initial));assert.equal(session.parsePointObjectAiResponse({...initial,answerProvenance:accepted[0]}),null);checks++;
// Actual service control flow, only upstream/status/env access substituted.
const service=await import('../src/lib/prototype/point-to-object-ai.ts');
async function generate(raw,r) {globalThis.__screeningFixtureCalls=0;globalThis.__screeningFixturePayload={status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(raw)}]}],usage:{input_tokens:100,output_tokens:50,total_tokens:150}};const result=await service.generatePointObjectAiAnalysis(pack(),r);assert.equal(globalThis.__screeningFixtureCalls,1,'no additional paid retry');return result;}
const baseRequest=request('en','development_screening','standard');
const rawAnswer={status:'partial',scope:'screening_implication',perspective:'developer',horizon:'current',confidence:'low',statement:'The mapped building supports a preliminary identity-led review before committing to any asset strategy.',evidenceRefs:['EVD-OSM-OBJECT'],missingEvidenceCodes:['official_identity','parcel_boundary','title_rights','planning_controls','physical_baseline','current_market','cost_financials'],unsupportedReasonCode:null};
const model=await generate({...plan(),focusedAnswer:rawAnswer},baseRequest);assert.deepEqual(model.answerProvenance,accepted[0]);assert.equal(model.content.answerToQuestion.statement,rawAnswer.statement);
for(const [rejectionCode,mutate,r]of[
  ['focused_answer_novel_number',v=>v.statement+=' 987654321 levels.',baseRequest],
  ['focused_answer_context_without_context_receipt',v=>v.statement+=' Nearby retail supports a screening question.',baseRequest],
  ['focused_answer_context_value_mismatch',v=>v.evidenceRefs.push('EVD-CONTEXT-SUMMARY'),baseRequest],
  ['focused_answer_scenario_depth',()=>{},{...baseRequest,depth:'deep',goal:'due_diligence',question:'Build a due diligence plan.'}]
]) {const answer=structuredClone(rawAnswer);mutate(answer);const result=await generate({...plan(),focusedAnswer:answer},r);assert.deepEqual(result.answerProvenance,{kind:'deterministic_recovery',rejectionCode});assert.notEqual(result.content.answerToQuestion.statement,answer.statement);checks++;}
const first=await generate({...plan(),answerCode:null,focusedAnswer:null},{...baseRequest,question:null});assert.equal(Object.hasOwn(first,'answerProvenance'),false);checks++;
assert.equal(networkCalls,0);
console.log(JSON.stringify({status:'PASS',checks,networkCalls}));
