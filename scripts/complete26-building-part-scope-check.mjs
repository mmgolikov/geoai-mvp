// Synthetic source-bound part-scope regression; no hosted evidence or provider calls.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
      if(url.endsWith('/point-to-object-ai-core.ts'))source+='\nexport { deterministicEvidenceContent, evidenceSupport };';
      if(url.endsWith('/point-to-object-semantic-v6-check.ts'))source+='\nexport { linkedEntityForPack, wikidataEvidence };';
      return {format:'module',shortCircuit:true,source:stripTypeScriptTypes(source,{mode:'transform'})};
    }
    return next(url,c);
  }
});
const core=await import('../src/lib/prototype/point-to-object-ai-core.ts');
const fixture=await import('./point-to-object-semantic-v6-check.ts');
function pack(part,linked=false){
  const p=fixture.evidencePack();
  Object.assign(p.selectedObject.tags,{'tag.start_date':'2000','tag.amenity':'museum','tag.shop':'gift','tag.office':'yes'});
  if(part!==undefined)p.selectedObject.tags['tag.building:part']=part;
  p.evidence.find(e=>e.id==='EVD-ALLOWED-FIELDS').value=JSON.stringify({sourceFeatureId:p.selectedObject.sourceFeatureId,tags:p.selectedObject.tags});
  if(linked){p.linkedEntity=fixture.linkedEntityForPack();p.evidence.push(...fixture.wikidataEvidence(p.linkedEntity));}
  return p;
}
const plan={decision:{path:'existing_asset_screen',disposition:'continue_screening',confidence:'low',reasonCodes:['object_identity_available','use_classification_available','source_is_non_official']},signalCodes:['object_identity','use_classification','building_form','source_limit'],opportunityCodes:['existing_asset_repositioning','technical_reuse_test'],risks:['non_official_source','identity_uncertainty','geometry_not_parcel'].map(code=>({code,severity:'high',confidence:'low'})),answerCode:'source_evidence_only',focusedAnswer:null,caveat:'Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.'};
const request=(locale,depth,goal='object_profile')=>({locale,depth,goal,perspective:'developer',horizon:'current',question:({
  object_profile:['Build a concise decision-oriented profile of this object.','Составь краткий профиль объекта для принятия решения.'],
  custom:['Assess whether repositioning is useful and what evidence must be validated.','Оцени возможность репозиционирования: какие данные нужно проверить?'],
  development_screening:['Screen this object from the selected perspective. Identify opportunities and risks.','Проведи предварительную оценку объекта: возможности и риски.'],
  redevelopment:['Assess whether redevelopment is useful for this object.','Стоит ли проверять гипотезу редевелопмента этого объекта?'],
  due_diligence:['Build a due diligence plan for this object.','Составь план due diligence для этого объекта.']
})[goal][locale==='ru'?1:0]});
function output(p,locale,depth,goal='object_profile'){
  const support=core.evidenceSupport(p),r=request(locale,depth,goal);
  const recovery=core.recoverPointObjectAiFocusedContentDetailed(plan,p,r);
  assert.equal(recovery.ok,true,recovery.detail);
  return {source:core.deterministicEvidenceContent(p,support.allowed,locale),brief:core.renderInitialSemanticBrief(support,r),answer:recovery.content.answerToQuestion};
}
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const ordinary=[];
for(const part of [undefined,'no'])for(const locale of ['en','ru'])for(const depth of ['quick','standard','deep'])ordinary.push(output(pack(part),locale,depth));
assert.equal(hash(ordinary),'347f4a76224f077d3587d06a21ab8a318e46404b56ae75c28abcb4794fbb3825','Absent/no tag must keep the complete prior EN/RU Q/S/D output');
let checks=0;
for(const part of ['yes','roof'])for(const linked of [false,true])for(const locale of ['en','ru'])for(const depth of ['quick','standard','deep'])for(const goal of ['object_profile','custom','development_screening','redevelopment','due_diligence']){
  const p=pack(part,linked), before=JSON.stringify(p), projection=core.buildModelEvidenceProjection(p), out=output(p,locale,depth,goal);
  assert.equal(projection.selectedObject.structuredAttributes['tag.building:part'],part,'Model already receives the source-bound part tag');
  assert.deepEqual(projection.selectedObject.metrics,p.selectedObject.metrics,'No metric correction or recalculation');
  const facts=out.source.sourceFacts, scoped=locale==='en'?/building part/:/част[ьи] здания/;
  assert.match(facts[0].statement,scoped,'Source identity must retain part scope');
  const attributes=facts.find(f=>f.evidenceRefs.length===1&&f.evidenceRefs[0]==='EVD-ALLOWED-FIELDS');
  assert.match(attributes.statement,scoped,'Part tag must survive the six-attribute display cap');
  assert.equal(attributes.statement.replace(/\([^)]*\)/g,'').split('; ').length,6,'Retain the six-attribute cap (height has an internal unit disclaimer)');
  const metrics=facts.find(f=>f.evidenceRefs.includes('EVD-OBJECT-METRICS'));
  assert.match(metrics.statement,scoped);assert.ok(metrics.evidenceRefs.includes('EVD-ALLOWED-FIELDS'));
  for(const value of Object.values(projection.selectedObject.metrics).filter(v=>typeof v==='number'))assert.ok(metrics.statement.includes(value.toLocaleString(locale==='ru'?'ru-RU':'en-US')),'Displayed measurements remain unchanged');
  assert.match(metrics.statement,locale==='en'?/not the whole building or complex/:/не вс[её]го здания или комплекса/);
  assert.match(out.answer.statement,scoped);assert.match(JSON.stringify(out.brief),scoped);
  if(linked){assert.ok(projection.linkedEntity);assert.match(facts.find(f=>f.evidenceRefs.includes('EVD-WIKIDATA-ENTITY')).statement,/linked complex|связанный комплекс/);}
  assert.equal(JSON.stringify(p),before,'Rendering must not mutate the frozen pack');checks++;
}
for(const locale of ['en','ru'])for(const depth of ['quick','standard','deep']){
  const p=pack('yes');delete p.selectedObject.tags['tag.building'];
  p.selectedObject.featureClass='tourism:museum';p.selectedObject.tags['tag.tourism']='museum';
  p.evidence.find(e=>e.id==='EVD-CLASSIFICATION').value=JSON.stringify({sourceFeatureId:p.selectedObject.sourceFeatureId,featureClass:p.selectedObject.featureClass});
  p.evidence.find(e=>e.id==='EVD-ALLOWED-FIELDS').value=JSON.stringify({sourceFeatureId:p.selectedObject.sourceFeatureId,tags:p.selectedObject.tags});
  const out=output(p,locale,depth);
  assert.match(out.source.sourceFacts[1].statement,locale==='en'?/museum \(building part\)/:/музей \(часть здания\)/);
  assert.match(out.answer.statement,locale==='en'?/building part/:/часть здания/);checks++;
}
for(const mutate of [p=>p.evidence.find(e=>e.id==='EVD-ALLOWED-FIELDS').sourceId='way/999',p=>p.evidence=p.evidence.filter(e=>e.id!=='EVD-ALLOWED-FIELDS')]){
  const p=pack('yes');mutate(p);assert.equal(core.buildModelEvidenceProjection(p).selectedObject.structuredAttributes['tag.building:part'],undefined);
  assert.doesNotMatch(JSON.stringify(output(p,'en','quick')),/building part/);checks++;
}
const p=pack('yes'),r=request('en','standard');
for(const locale of ['en','ru']){
  const generic=core.recoverPointObjectAiFocusedContentDetailed(plan,p,{...request(locale,'quick'),goal:'custom',question:locale==='en'?'Summarize the mapped object.':'Опиши объект карты.'});
  assert.equal(generic.ok,true,generic.detail);assert.match(generic.content.answerToQuestion.statement,locale==='en'?/building part/:/часть здания/);checks++;
}
const validStatement='The mapped hotel is only an open-map identity lead; verify the selected geometry and official asset records before drawing a feasibility conclusion.';
const valid=core.validatePointObjectAiContentDetailed({...plan,focusedAnswer:{status:'partial',scope:'screening_implication',perspective:r.perspective,horizon:r.horizon,statement:validStatement,evidenceRefs:['EVD-OSM-OBJECT'],confidence:'low',missingEvidenceCodes:['official_identity','parcel_boundary','title_rights','planning_controls','physical_baseline','current_market','cost_financials'],unsupportedReasonCode:null}},p,r);
assert.equal(valid.ok,true,valid.detail);assert.equal(valid.content.answerToQuestion.statement,validStatement);checks++;
assert.equal(networkCalls,0);
console.log(JSON.stringify({status:'PASS',checks,networkCalls}));
