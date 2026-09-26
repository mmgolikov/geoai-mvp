// Pure synthetic regression. The real rejected A09 provider prose was not saved.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
let networkCalls=0;
globalThis.fetch=async()=>{networkCalls++;throw new Error('Network forbidden');};
registerHooks({
  resolve(s,c,next){
    if(s.startsWith('@/'))return next(new URL(`../${s.slice(2)}.ts`,import.meta.url).href,c);
    if((s.startsWith('./')||s.startsWith('../'))&&!/\.[cm]?[jt]s$/.test(s))return next(`${s}.ts`,c);
    return next(s,c);
  },
  load(url,c,next){
    if(url.startsWith('file:')&&url.endsWith('.ts')){
      let source=readFileSync(fileURLToPath(url),'utf8');
      if(url.endsWith('/point-to-object-ai-core.ts'))source+='\nexport { evidenceSupport, validateFocusedAnswer };';
      return {format:'module',shortCircuit:true,source:stripTypeScriptTypes(source,{mode:'transform'})};
    }
    return next(url,c);
  }
});
const core=await import('../src/lib/prototype/point-to-object-ai-core.ts');
const fixture=await import('./point-to-object-semantic-v6-check.ts');
const question={
  en:'What does the mapped evidence establish about Dubai Hills Mall and its immediate access and neighbouring uses? Distinguish the mapped footprint from unverified floor area, report missing height or levels as unknown, and prioritize evidence needed before any redevelopment investigation.',
  ru:'Что устанавливают картографические данные об объекте Dubai Hills Mall и его окружении? Отдели контур по карте от непроверенной площади помещений, укажи отсутствующие высоту или этажность как неизвестные и расставь приоритеты проверки данных перед редевелопментом.'
};
function pack(height,levels){
  const p=fixture.evidencePack();
  p.selectedObject.tags={'tag.building':'yes','tag.shop':'mall','tag.start_date':'2022-02-17'};
  if(height!==undefined)p.selectedObject.tags['tag.height']=height;
  if(levels!==undefined)p.selectedObject.tags['tag.building:levels']=levels;
  p.evidence.find(e=>e.id==='EVD-ALLOWED-FIELDS').value=JSON.stringify({sourceFeatureId:p.selectedObject.sourceFeatureId,tags:p.selectedObject.tags});
  return p;
}
const missing=['official_identity','parcel_boundary','title_rights','planning_controls','physical_baseline','current_market','cost_financials'];
const request=(locale='en',depth='standard')=>({locale,depth,goal:'custom',perspective:'developer',horizon:'current',question:question[locale]});
const text={en:'The mapped object is an identity lead; Metro Gate is in the bounded context. Height and levels are unknown. Verify official identity and physical records before investigating redevelopment.',ru:'Объект карты — ориентир для идентификации; Metro Gate присутствует в ограниченной выборке окружения. Высота и этажность неизвестны. Подтвердите идентичность и технические данные до исследования редевелопмента.'};
const answer=(locale='en')=>({status:'partial',scope:'screening_implication',perspective:'developer',horizon:'current',statement:text[locale],evidenceRefs:['EVD-OSM-OBJECT','EVD-ALLOWED-FIELDS','EVD-CONTEXT-1'],confidence:'low',missingEvidenceCodes:missing,unsupportedReasonCode:null});
const validate=(a=answer(),p=pack(),r=request())=>core.validateFocusedAnswer(a,r,core.evidenceSupport(p),'source_evidence_only');
let checks=0;
for(const locale of ['en','ru'])for(const depth of ['quick','standard','deep']){
  const a=answer(locale),result=validate(a,pack(),request(locale,depth));
  assert.equal(result.ok,true,`${locale}/${depth}: ${result.detail}`);
  assert.equal(result.answer.statement,a.statement,'Valid generated synthesis stays untouched');checks++;
}
function accepted(a,p=pack(),r=request()){
  const before=JSON.stringify(p),result=validate(a,p,r);
  assert.equal(result.ok,true,result.detail);assert.equal(result.answer.statement,a.statement);
  assert.equal(JSON.stringify(p),before,'Never mutate frozen evidence');checks++;
}
function rejected(a,p=pack(),r=request(),detail){
  const result=validate(a,p,r);assert.equal(result.ok,false,`Unexpected acceptance: ${a.statement}`);
  if(detail)assert.equal(result.detail,detail);checks++;
}
for(const locale of ['en','ru']){
  const unknown=locale==='en'?'Height and levels are unknown.':'Высота и этажность неизвестны.';
  for(const [h,l,replacement] of locale==='en'?[
    ['200',undefined,'Mapped height: 200. Levels are unknown.'],
    [undefined,'30','Height is unknown. Mapped building levels: 30.'],
    ['200','30','Mapped height: 200. Mapped building levels: 30.'],
    ['200.5','30','Mapped height: 200.5. Mapped building levels: 30.'],
    [undefined,undefined,'Height is not recorded in the mapped evidence. Levels are not mapped.']
  ]:[
    ['200',undefined,'Высота по карте: 200. Этажность неизвестна.'],
    [undefined,'30','Высота неизвестна. Этажность по карте: 30.'],
    ['200','30','Высота по карте: 200. Этажность по карте: 30.'],
    [undefined,undefined,'Высота не указана в источнике. Этажность не установлена.']
  ])accepted({...answer(locale),statement:text[locale].replace(unknown,replacement)},pack(h,l),request(locale));
  for(const replacement of locale==='en'?[
    'Height is 4100. Levels are unknown.', // borrowed from footprint area, so old global numeric guard alone admits it
    'Height is 280 m. Levels are unknown.', // borrowed perimeter
    'Height is 120 m. Levels are unknown.', // borrowed nearby distance
    'Height is thirty metres. Levels are unknown.',
    'Height is not unknown. Levels are unknown.',
    'Height is unknown but approximately 280 m. Levels are unknown.',
    'Height is unknown. Levels are unknown. It is 280 metres tall.',
    'Height and levels are unknown. Height is 280.',
    'Height is unknown.', 'Levels are unknown.',
    'Height and levels are unknown. The roof is metal.',
    'Height and levels are unknown. Market ROI is guaranteed.'
  ]:[
    'Высота 4100 м. Этажность неизвестна.', 'Высота 280 м. Этажность неизвестна.',
    'Высота неизвестна, но примерно 120 м. Этажность неизвестна.',
    'Высота не неизвестна. Этажность неизвестна.',
    'Высота и этажность неизвестны. Высота 280 м.',
    'Высота неизвестна.', 'Этажность неизвестна.',
    'Высота и этажность неизвестны. Фасад металлический.'
  ])rejected({...answer(locale),statement:text[locale].replace(unknown,replacement)},pack(),request(locale));
  rejected(answer(locale),pack('200'),request(locale));
  rejected(answer(locale),pack(undefined,'30'),request(locale));
  rejected({...answer(locale),missingEvidenceCodes:missing.filter(c=>c!=='physical_baseline')},pack(),request(locale));
  rejected({...answer(locale),status:'answered'},pack(),request(locale));
  for(const ref of ['EVD-OSM-OBJECT','EVD-ALLOWED-FIELDS'])rejected({...answer(locale),evidenceRefs:answer(locale).evidenceRefs.filter(r=>r!==ref)},pack(),request(locale));
  for(const mutation of [
    p=>p.evidence=p.evidence.filter(e=>e.id!=='EVD-ALLOWED-FIELDS'),
    p=>p.evidence.find(e=>e.id==='EVD-ALLOWED-FIELDS').sourceId='way/999',
    p=>p.evidence.find(e=>e.id==='EVD-ALLOWED-FIELDS').value=JSON.stringify({sourceFeatureId:'way/999',tags:p.selectedObject.tags}),
    p=>p.evidence.find(e=>e.id==='EVD-ALLOWED-FIELDS').value='{',
    p=>p.evidence.find(e=>e.id==='EVD-ALLOWED-FIELDS').value=JSON.stringify({sourceFeatureId:p.selectedObject.sourceFeatureId,tags:{...p.selectedObject.tags,'tag.height':'200'}}),
    p=>p.evidence=p.evidence.filter(e=>e.id==='EVD-ALLOWED-FIELDS'),
    p=>p.evidence.find(e=>e.id==='EVD-OSM-OBJECT').sourceId='way/999'
  ]){const p=pack();mutation(p);rejected(answer(locale),p,request(locale));}
  for(const suffix of locale==='en'?[' Report the construction year.',' Report the architectural style.',' Report roof colour.',' Report missing width as unknown.']:
    [' Укажи год постройки.',' Укажи архитектурный стиль.',' Укажи цвет крыши.',' Укажи отсутствующую ширину как неизвестную.']){
    rejected(answer(locale),pack(),{...request(locale),question:question[locale]+suffix});
    rejected(answer(locale),pack('200'),{...request(locale),question:question[locale]+suffix});
  }
  // A narrow unavailable scalar still requires unsupported, regardless of honest wording.
  for(const q of locale==='en'?['What is the height?','How many levels?','What is the construction year?','What is the roof colour?']:
    ['Какова высота?','Сколько этажей?','Каков год постройки?','Какой цвет крыши?']){
    const p=pack();delete p.selectedObject.tags['tag.start_date'];
    p.evidence.find(e=>e.id==='EVD-ALLOWED-FIELDS').value=JSON.stringify({sourceFeatureId:p.selectedObject.sourceFeatureId,tags:p.selectedObject.tags});
    rejected(answer(locale),p,{...request(locale),question:q});
  }
  for(const [key,q,sourceValue] of [['tag.height',locale==='en'?'What is the height?':'Какова высота?','200'],['tag.building:levels',locale==='en'?'How many levels?':'Сколько этажей?','30']]){
    const a={...answer(locale),status:'answered',scope:'mapped_form',statement:sourceValue,evidenceRefs:['EVD-ALLOWED-FIELDS'],missingEvidenceCodes:[]};
    const result=validate(a,pack('200','30'),{...request(locale),question:q});
    assert.equal(result.ok,true,result.detail);
    if(key==='tag.building:levels')assert.equal(result.answer.statement,locale==='en'?'Mapped OpenStreetMap building levels attribute: 30. This open-map value has not been independently verified.':'Атрибут OpenStreetMap «этажность»: 30. Значение из открытой карты не проверено независимо.');
    else assert.equal(result.answer.statement,locale==='en'?'OpenStreetMap height tag value: 200 (metres by OSM convention; accuracy not independently verified).':'Значение тега высоты OpenStreetMap: 200 (метры по правилу OSM; точность не проверена независимо).');checks++;
  }
}
// Both fields are independent, including when only one is requested.
for(const [label,replacement,p] of [['height','Height is unknown.',pack(undefined,'30')],['levels','Levels are unknown.',pack('200')]]){
  const r={...request(),question:`What evidence supports redevelopment? Report missing ${label} as unknown.`};
  accepted({...answer(),statement:text.en.replace('Height and levels are unknown.',replacement)},p,r);
}
for(const term of ['depth','thickness','unit count','construction year','roof material']){
  rejected(answer(),pack(),{...request(),question:`What evidence supports redevelopment? Report missing height and ${term} as unknown.`});
  rejected(answer(),pack(),{...request(),question:`What evidence supports redevelopment? Report missing height as unknown. Report missing ${term} as unknown.`});
}
// Existing context, fact and numerical guards continue AFTER the missing-value gate.
rejected({...answer(),statement:text.en+' The object contains 987654 rooms.'},pack(),request(),'focused_answer_novel_number');
rejected({...answer(),evidenceRefs:['EVD-OSM-OBJECT','EVD-ALLOWED-FIELDS','EVD-CONTEXT-999']});
rejected({...answer(),evidenceRefs:['EVD-OSM-OBJECT','EVD-ALLOWED-FIELDS']},pack(),request(),'focused_answer_context_without_context_receipt');
rejected({...answer(),statement:text.en.replace('Metro Gate','Unbound University')},pack(),request(),'focused_answer_context_value_mismatch');
rejected({...answer(),statement:text.en+' Planning approval exists.'},pack(),request(),'focused_answer_forbidden_claim');
const unsupported=validate({...answer(),status:'unsupported',statement:null,unsupportedReasonCode:'requires_client_asset_source'});
assert.equal(unsupported.ok,true);assert.equal(unsupported.answer.status,'unsupported');checks++;
const plan={decision:{path:'existing_asset_screen',disposition:'continue_screening',confidence:'low',reasonCodes:['object_identity_available','use_classification_available','source_is_non_official']},signalCodes:['object_identity','use_classification','building_form','source_limit'],opportunityCodes:['existing_asset_repositioning','technical_reuse_test'],risks:['non_official_source','identity_uncertainty','geometry_not_parcel'].map(code=>({code,severity:'high',confidence:'low'})),answerCode:'source_evidence_only',caveat:'Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.'};
for(const locale of ['en','ru'])for(const depth of ['quick','standard','deep']){
  const r=request(locale,depth),p=pack(),raw={...plan,focusedAnswer:answer(locale)};
  const result=core.validatePointObjectAiContentDetailed(raw,p,r);
  assert.equal(result.ok,true,result.detail);assert.equal(result.content.answerToQuestion.statement,text[locale]);checks++;
  const rejectedFull=core.validatePointObjectAiContentDetailed({...raw,focusedAnswer:{...answer(locale),statement:text[locale]+(locale==='en'?' Height is 280.':' Высота 280 м.')}},p,r);
  assert.equal(rejectedFull.ok,false);assert.equal(rejectedFull.detail,'focused_answer_mixed_physical_value_unbound');checks++;
}
const profile={model:'offline',verbosity:'low',maxOutputTokens:1000,reasoningEffort:'low'};
for(const locale of ['en','ru']){
  const body=core.buildPointObjectResponsesRequest(pack(),request(locale),profile),payload=JSON.parse(body.input[1].content[0].text);
  assert.equal(payload.promptVersion,'POINT_OBJECT_AI_PROMPT_V13_2026_09_26');
  assert.equal(payload.analysisRequest.focusedQuestion,question[locale],'Do not replace the approved question');
  assert.equal(payload.validationPolicy.mixedPhysicalEvidenceReview.revision,'MIXED_PHYSICAL_REVIEW_V1_2026_09_26');
  assert.deepEqual(payload.validationPolicy.mixedPhysicalEvidenceReview.keys,['tag.height','tag.building:levels']);
  assert.equal(payload.validationPolicy.canonicalDirectAttribute,false);checks++;
}
for(const q of [null,'What is the height?','What is the roof colour?','What evidence is needed for redevelopment?']){
  const payload=JSON.parse(core.buildPointObjectResponsesRequest(pack('200','30'),{...request(),question:q},profile).input[1].content[0].text);
  assert.equal(Object.hasOwn(payload.validationPolicy,'mixedPhysicalEvidenceReview'),false,'Policy is conditional, not a global scalar exception');checks++;
}
// New rejection codes must not become a deterministic recovery or retry allowlist.
const service=readFileSync(new URL('../src/lib/prototype/point-to-object-ai.ts',import.meta.url),'utf8');
assert.doesNotMatch(service,/focused_answer_mixed_physical_/);checks++;
assert.equal(networkCalls,0);
console.log(JSON.stringify({status:'PASS',checks,networkCalls}));
