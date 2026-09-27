// Offline: recorded public A02 wording in synthetic bound evidence, never raw provider output.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
let networkCalls=0,mockReplies=null,requests=[];
globalThis.fetch=async(_url,options)=>{if(!mockReplies){networkCalls++;throw Error('Network forbidden');}requests.push(JSON.parse(options.body));assert(mockReplies.length,'No third provider attempt');return new Response(JSON.stringify({status:'completed',output_text:JSON.stringify(mockReplies.shift()),usage:{input_tokens:100,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens:20,total_tokens:120}}),{status:200});};
registerHooks({resolve(s,c,n){if(s==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};if(s.startsWith('@/'))return n(new URL('../'+s.slice(2)+'.ts',import.meta.url).href,c);if(/^\.\.?\//.test(s)&&!/\.[cm]?[jt]s(?:\?|$)/.test(s))return n(s+'.ts',c);return n(s,c);},load(url,c,n){if(url.startsWith('file:')&&new URL(url).pathname.endsWith('.ts')){let source=readFileSync(fileURLToPath(url),'utf8');
 if(new URL(url).pathname.endsWith('point-to-object-ai-core.ts')){
  if(new URL(url).search==='?baseline'){
   const guard=/    \/\/ Near the prose ceiling,[\s\S]*?    }\n(?=  }\n  if \(!Array\.isArray\(value\.evidenceRefs\))/;
   assert(guard.test(source));source=source.replace(guard,'');
  }
  source+='\nexport {evidenceSupport,validateFocusedAnswer};';
 }
 if(url.endsWith('point-to-object-semantic-v6-check.ts'))source=source.slice(0,source.indexOf('\nconst requests ='));
 if(url.endsWith('/point-to-object-ai.ts'))source=source.replace('import { getPointObjectUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";','const getPointObjectUpstreamStatus=()=>({enabled:true});').replace('process.env.OPENAI_API_KEY?.trim()','"offline-no-credential"');
 return{format:'module',shortCircuit:true,source:stripTypeScriptTypes(source,{mode:'transform'})};}return n(url,c);}});
const core=await import('../src/lib/prototype/point-to-object-ai-core.ts');
const fixture=await import('./point-to-object-semantic-v6-check.ts');
const pack=fixture.evidencePack();
pack.selectedObject.name='Emirates Tower Seaside Metro Bus Stop';pack.selectedObject.featureClass='building:yes';pack.selectedObject.tags={'tag.building':'yes'};pack.selectedObject.metrics.footprintAreaSqM=66;
for(const e of pack.evidence){if(e.id==='EVD-OSM-OBJECT')e.value=JSON.stringify({sourceFeatureId:pack.selectedObject.sourceFeatureId,name:pack.selectedObject.name});if(e.id==='EVD-CLASSIFICATION')e.value=JSON.stringify({sourceFeatureId:pack.selectedObject.sourceFeatureId,featureClass:'building:yes'});if(e.id==='EVD-ALLOWED-FIELDS')e.value=JSON.stringify({sourceFeatureId:pack.selectedObject.sourceFeatureId,tags:pack.selectedObject.tags});if(e.id==='EVD-OBJECT-METRICS')e.value=JSON.stringify({sourceFeatureId:pack.selectedObject.sourceFeatureId,geometryHash:pack.selectedObject.geometryHash,metrics:pack.selectedObject.metrics});}
const actual='Observed map evidence: OpenStreetMap identifies a polygon named “Emirates Tower Seaside Metro Bus Stop,” tagged building=yes, with an approximately 66 m2 generalized footprint; the bounded map context is transport-adjacent and includes commercial, daily-needs, healthcare and hospitality features. Derived implication and hypothesis: screen it as a small existing transport-support structure in a mixed commercial context, retaining the mapped structure as the base case while testing reuse or replacement only conditionally; a subject-identity mismatch would invalidate this profile, whereas a parcel-association mismatch would block site-level conclusions but not the mapped object metrics. Material gaps are official identity, parcel boundary, title/rights, planning controls, physical baseline, current market evidence, and cost/financial inputs; hold redevelopment selection until identity, land';
assert.equal(actual.length,900);
const profile={model:'synthetic-no-call',reasoningEffort:'medium',verbosity:'medium',maxOutputTokens:5500};
const question={en:'Build a concise decision-oriented profile of this object. Separate observed map evidence, derived implications and hypotheses, and identify the most material evidence gaps.',ru:'Составь краткий профиль объекта. Раздели данные карты, выводы и гипотезы, укажи пробелы в доказательствах.'};
const req=(locale='en',depth='deep')=>({role:'developer',scenario:'unspecified',locale,depth,goal:'object_profile',perspective:'developer',horizon:'current',question:question[locale]});
const answer=statement=>({status:'partial',scope:'screening_implication',perspective:'developer',horizon:'current',statement,evidenceRefs:['EVD-OSM-OBJECT','EVD-CLASSIFICATION','EVD-GEOMETRY','EVD-OBJECT-METRICS','EVD-CONTEXT-SUMMARY','EVD-SOURCE'],confidence:'low',missingEvidenceCodes:['official_identity','parcel_boundary','title_rights','planning_controls','physical_baseline','current_market','cost_financials'],unsupportedReasonCode:null});
function plan(statement,r){const body=core.buildPointObjectResponsesRequest(pack,r,profile),u=JSON.parse(body.input[1].content[0].text),p=u.selectionPolicy,n=u.depthContract.reviewCounts;return{decision:{path:'existing_asset_screen',disposition:'continue_screening',confidence:'low',reasonCodes:p.eligibleReasonCodes},signalCodes:p.eligibleSignalCodes,opportunityCodes:p.eligibleOpportunityCodes,risks:p.eligibleRiskCodes.map(code=>({code,severity:'high',confidence:'low'})),depthPlan:{criteriaSignalCodes:p.eligibleDepthCriteriaCodes.slice(0,n.criteria),alternativePaths:p.eligibleDepthAlternativePaths.filter(x=>x!=='existing_asset_screen').slice(0,n.alternatives),counterEvidenceRiskCodes:p.eligibleDepthCounterEvidenceCodes.slice(0,n.counterEvidence),decisionTriggerCodes:p.eligibleDepthDecisionTriggerCodes.slice(0,n.decisionTriggers)},answerCode:'source_evidence_only',focusedAnswer:answer(statement),caveat:'Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.'};}
let checks=0;
const baseline=await import('../src/lib/prototype/point-to-object-ai-core.ts?baseline');
assert.equal(baseline.validateFocusedAnswer(answer(actual),req(),baseline.evidenceSupport(pack),'source_evidence_only').ok,true);
assert.equal(baseline.validatePointObjectAiContentDetailed(plan(actual,req()),pack,req()).ok,true);checks+=2;
function verify(text,r,expected){const a=answer(text);if(text!==actual)a.evidenceRefs=a.evidenceRefs.filter(x=>x!=='EVD-CONTEXT-SUMMARY');const p=plan(text,r);p.focusedAnswer=a;for(const result of [core.validateFocusedAnswer(a,r,core.evidenceSupport(pack),'source_evidence_only'),core.validatePointObjectAiContentDetailed(p,pack,r)]){assert.equal(result.ok,expected,JSON.stringify({length:text.length,expected,detail:result.detail}));if(!expected)assert.equal(result.detail,'focused_answer_statement_incomplete');else assert.equal((result.answer??result.content.answerToQuestion).statement,text.normalize('NFKC'));checks++;}}
// This assertion fails on untouched 8918: both validators accepted the real cutoff.
verify(actual,req(),false);
for(const locale of ['en','ru'])for(const depth of ['quick','standard','deep']){
 const r=req(locale,depth),base=locale==='en'?'Verify object identity before selecting a strategy':'Проверьте идентичность объекта до выбора стратегии';
 assert.deepEqual(core.buildPointObjectResponsesRequest(pack,r,profile),baseline.buildPointObjectResponsesRequest(pack,r,profile));checks++;
 verify(base,r,true);verify(base+'.',r,true);
 const filler=locale==='en'?'Evidence remains provisional. ':'Данные требуют подтверждения. ';
 const sized=(length,end)=>{let start=filler.repeat(40);return start.slice(0,length-end.length)+end;};
 for(const ending of ['.', '!', '?', '.»', '."', '.)', '.`'])verify(sized(900,ending),r,true);
 for(const ending of [', land',', права',' and',' и',';'])verify(sized(900,ending),r,false);
 verify(sized(879,' review'),r,true);verify(sized(880,' review'),r,false);
 // A decimal inside the text is not mistaken for final punctuation; no new number allowance.
 const decimal=sized(900,' 66.0');verify(decimal,r,false);
 verify(sized(900,' etc.'),r,true); // abbreviation punctuation is compatible, not a grammar guarantee
}
const service=await import('../src/lib/prototype/point-to-object-ai.ts');
const provenance=await import('../src/lib/prototype/point-to-object-answer-provenance.ts');
assert.equal(provenance.isPointObjectFocusedRecoveryCode('focused_answer_statement_incomplete'),false);checks++;
const r=req(),valid='Verify mapped object and official parcel identity before choosing an asset strategy.';
const originalWarn=console.warn;console.warn=()=>{};
try{
 const validPlan=plan(valid,r);validPlan.focusedAnswer.evidenceRefs=validPlan.focusedAnswer.evidenceRefs.filter(x=>x!=='EVD-CONTEXT-SUMMARY');
 mockReplies=[plan(actual,r),validPlan];requests=[];
 const repaired=await service.generatePointObjectAiAnalysis(pack,r);assert.equal(requests.length,2);assert.match(requests[1].input[1].content[0].text,/focused_answer_statement_incomplete/);assert.deepEqual(repaired.answerProvenance,{kind:'model_validated',rejectionCode:null});assert.equal(repaired.content.answerToQuestion.statement,valid);checks+=4;
 mockReplies=[plan(actual,r),plan(actual,r)];requests=[];
 await assert.rejects(()=>service.generatePointObjectAiAnalysis(pack,r),e=>e.code==='AI_OUTPUT_INVALID'&&e.httpStatus===502&&e.telemetry.attempts===2);assert.equal(requests.length,2);checks+=2;
 // Existing evidence-recovery reason still discloses deterministic origin; this guard adds none.
 const novel=plan('The mapped building has 987654321 levels and needs verification.',r);mockReplies=[novel];requests=[];
 const recovered=await service.generatePointObjectAiAnalysis(pack,r);assert.deepEqual(recovered.answerProvenance,{kind:'deterministic_recovery',rejectionCode:'focused_answer_novel_number'});assert.equal(requests.length,1);checks+=2;
}finally{console.warn=originalWarn;mockReplies=null;}
assert.equal(networkCalls,0);checks++;
// Previously saved responses are parsed, not regenerated or reclassified by the
// new generation-only rule. Preserve the historical text and provenance exactly.
const stored=await import('../components/point-to-object/live-session.ts');
const savedContract=await import('../src/lib/prototype/point-object-projects-contract.ts');
const f=await import('../tests/e2e/helpers/sprint10-analysis-fixture.ts');
for(const locale of ['en','ru'])for(const depth of ['quick','standard','deep']){
 const request={role:'developer',scenario:'unspecified',depth,goal:'custom',perspective:'developer',horizon:'current',question:'Which mapped facts are available?',locale};
 const response=f.sprint10AnalysisResponse(request,1,f.SPRINT10_FIXTURE_EVIDENCE_PACK_HASH);
 response.content.answerToQuestion.statement=actual;response.answerProvenance={kind:'model_validated',rejectionCode:null};
 assert.equal(stored.parsePointObjectAiResponse(response).content.answerToQuestion.statement,actual);
 const artifact=savedContract.parseSavedPointObjectArtifact({schemaVersion:1,artifactId:'artifact_offline',idempotencyKey:'operation_offline',payloadHash:'a'.repeat(64),completedAt:response.generatedAt,updatedAt:response.generatedAt,viewRevision:0,kind:'analyse',locale,marketKey:'dubai',label:'Offline historical completion compatibility',payload:{selection:f.sprint10SelectionWithReceipt(f.sprint10Selection,locale),analysis:response}});
 assert.equal(artifact.payload.analysis.content.answerToQuestion.statement,actual);assert.deepEqual(artifact.payload.analysis.answerProvenance,response.answerProvenance);checks+=3;
}
console.log(JSON.stringify({status:'PASS',checks,networkCalls,scope:'near-limit completeness only; synthetic source, recorded public wording; no full grammar proof'}));
