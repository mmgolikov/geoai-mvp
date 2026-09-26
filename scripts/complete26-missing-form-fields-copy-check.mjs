// Synthetic A02-equivalent geometry/tags; no provider or private evidence reads.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
let networkCalls=0;
globalThis.fetch=async()=>{networkCalls++;throw Error('Network forbidden');};
const copy={
  en:['Mapped height, floor-count and start-date fields were not returned.','Physical attributes were not returned.'],
  ru:['Не получены поля карты: высота, этажность и дата начала.','Физические характеристики не получены.']
};
registerHooks({
  resolve(s,c,next){
    if(s.startsWith('@/'))return next(new URL(`../${s.slice(2)}.ts`,import.meta.url).href,c);
    if((s.startsWith('./')||s.startsWith('../'))&&!/\.[cm]?[jt]s(?:\?|$)/.test(s))return next(`${s}.ts`,c);
    return next(s,c);
  },
  load(url,c,next){
    if(url.startsWith('file:')&&new URL(url).pathname.endsWith('.ts')){
      let source=readFileSync(fileURLToPath(url),'utf8');
      if(new URL(url).pathname.endsWith('/point-to-object-ai-core.ts')&&new URL(url).search==='?old-copy'){
        for(const [current,previous] of Object.values(copy))source=source.replace(JSON.stringify(current),JSON.stringify(previous));
      }
      return {format:'module',shortCircuit:true,source:stripTypeScriptTypes(source,{mode:'transform'})};
    }
    return next(url,c);
  }
});
const core=await import('../src/lib/prototype/point-to-object-ai-core.ts');
const old=await import('../src/lib/prototype/point-to-object-ai-core.ts?old-copy');
const {evidencePack}=await import('./point-to-object-semantic-v6-check.ts');
const plan={decision:{path:'existing_asset_screen',disposition:'continue_screening',confidence:'low',reasonCodes:['object_identity_available','use_classification_available','source_is_non_official']},signalCodes:['object_identity','use_classification','building_form','source_limit'],opportunityCodes:['existing_asset_repositioning','technical_reuse_test'],risks:['non_official_source','identity_uncertainty','geometry_not_parcel'].map(code=>({code,severity:'high',confidence:'low'})),answerCode:'source_evidence_only',focusedAnswer:null,caveat:'Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.'};
const questions={
  en:{object_profile:'Build a concise decision-oriented profile of this object.',custom:'Assess whether repositioning is useful and what evidence must be validated.',development_screening:'Screen this object from the selected perspective. Identify opportunities and risks.'},
  ru:{object_profile:'Составь краткий профиль объекта для принятия решения.',custom:'Оцени возможность репозиционирования: какие данные нужно проверить?',development_screening:'Проведи предварительную оценку объекта: возможности и риски.'}
};
function pack(mask){
  const p=evidencePack(true),s=p.selectedObject;
  s.featureClass='building:yes';s.tags={'tag.building':'yes'};
  for(const [index,key,value] of [[0,'tag.height','12'],[1,'tag.building:levels','3'],[2,'tag.start_date','2003']])if(mask&(1<<index))s.tags[key]=value;
  s.metrics={...s.metrics,footprintAreaSqM:66,footprintPerimeterM:40};
  p.evidence.find(e=>e.id==='EVD-CLASSIFICATION').value=JSON.stringify({sourceFeatureId:s.sourceFeatureId,featureClass:s.featureClass});
  p.evidence.find(e=>e.id==='EVD-ALLOWED-FIELDS').value=JSON.stringify({sourceFeatureId:s.sourceFeatureId,tags:s.tags});
  p.evidence.find(e=>e.id==='EVD-OBJECT-METRICS').value=JSON.stringify({sourceFeatureId:s.sourceFeatureId,geometryHash:s.geometryHash,metrics:s.metrics});
  return p;
}
let checks=0;
const eq=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
for(const locale of ['en','ru'])for(const depth of ['quick','standard','deep'])for(const goal of Object.keys(questions[locale]))for(let mask=0;mask<8;mask++){
  const p=pack(mask),before=JSON.stringify(p),request={locale,depth,goal,perspective:'developer',horizon:'current',question:questions[locale][goal]};
  const result=core.recoverPointObjectAiFocusedContentDetailed(plan,p,request),previous=old.recoverPointObjectAiFocusedContentDetailed(plan,p,request);
  eq(result.ok,true,result.detail);eq(previous.ok,true,previous.detail);
  const answer=result.content.answerToQuestion;
  if(mask===0){
    eq(answer.statement.includes(copy[locale][0]),true,'Missing three scalar fields must not negate existing Polygon, area, perimeter or building tag');
    eq(answer.statement.includes(copy[locale][1]),false);
    const normalized=structuredClone(result);normalized.content.answerToQuestion.statement=answer.statement.replace(copy[locale][0],copy[locale][1]);
    eq(normalized,previous,'Only the bounded EN/RU absence phrase changes');
  }else eq(result,previous,'Some/all known physical fields retain byte-identical recovery output');
  const projection=core.buildModelEvidenceProjection(p);
  eq(projection.selectedObject.geometryType,'Polygon');eq(projection.selectedObject.metrics.footprintAreaSqM,66);eq(projection.selectedObject.metrics.footprintPerimeterM,40);
  eq(projection.selectedObject.structuredAttributes['tag.building'],'yes');
  eq(result.content.sourceFacts.some(f=>f.evidenceRefs.includes('EVD-OBJECT-METRICS')&&f.statement.includes('66')&&f.statement.includes('40')),true,'Source facts retain the already known geometry measurements');
  eq(JSON.stringify(p),before,'Never mutate source evidence');
}
eq(networkCalls,0);
console.log(JSON.stringify({status:'PASS',checks,networkCalls,scope:'missing height/levels/start-date copy only; geometry and validation unchanged'}));
