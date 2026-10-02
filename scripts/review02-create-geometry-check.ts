import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { writeFileSync } from "node:fs";
registerHooks({ resolve(s, c, next) { if (s.startsWith(".") && !/\.[cm]?[jt]s$/.test(s)) { try { return next(`${s}.ts`, c); } catch {} } return next(s, c); } });
const { conceptTemplate, conceptSiteDefaults, validateRedevelopmentProgram, generateConceptMassingAlternatives, validateConceptMassingGeometry } = await import("../src/lib/prototype/point-to-object-create");
const { calculatePolygonMeasurements } = await import("../src/lib/polygon-aoi");
type Point = [number, number];
const before = process.argv.includes("--before");
const reports: unknown[] = [];
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error("REVIEW02 geometry is offline only"); };
function site(shape: Point[], areaSqM: number, angle = 0): Point[][] {
  const geo = (scale: number) => shape.map(([x,y]) => {
    const rx = x*Math.cos(angle)-y*Math.sin(angle), ry=x*Math.sin(angle)+y*Math.cos(angle);
    return [55.28+rx*scale/(111320*Math.cos(25.2*Math.PI/180)),25.2+ry*scale/110540] as Point;
  });
  const scale = Math.sqrt(areaSqM/calculatePolygonMeasurements(geo(1)).areaSqM);
  const ring=geo(scale); return [[...ring,ring[0]]];
}
// Synthetic analogues. The founder's exact 6.63 ha AOI has not been exported.
const cases = {
  convex6_63ha: site([[0,0],[500,0],[500,280],[0,280]],66300),
  concave6_63ha: site([[0,0],[500,0],[500,160],[230,160],[230,450],[0,450]],66300),
  rotated6_63ha: site([[0,0],[500,0],[500,280],[0,280]],66300,0.61),
  largeConcave: site([[0,0],[1000,0],[1000,400],[400,400],[400,1000],[0,1000]],749860)
};
let checkedCount=0;
if (!before) {
  for (const templateId of ["residential_mixed_use","commercial_hub","civic_green","residential_quarter","hospitality_recreation"] as const) {
    const template = conceptTemplate(templateId,"en");
    const frozen = structuredClone(template);
    const small = conceptSiteDefaults(template,site([[0,0],[100,0],[100,80],[0,80]],2_000));
    const regular = conceptSiteDefaults(template,cases.convex6_63ha);
    const large = conceptSiteDefaults(template,cases.largeConcave);
    assert.ok(small.blockCount <= regular.blockCount && regular.blockCount <= large.blockCount);
    assert.ok(small.setbackM <= regular.setbackM);
    assert.ok([small,regular,large].every(p => validateRedevelopmentProgram(p).ok));
    assert.deepEqual(template,frozen,"Defaults do not mutate template or saved controls");
    assert.deepEqual(regular.useMix,template.useMix,"No inferred school capacity or programme demand");
  }
}
for(const [name,aoi] of Object.entries(cases)) for(const templateId of ["residential_mixed_use","civic_green"] as const) {
  const validation=validateRedevelopmentProgram({...conceptTemplate(templateId,"en"),blockCount:5,levelsMin:6,levelsMax:9,targetSiteCoveragePct:38,openSpacePct:35,setbackM:8});
  if(!validation.ok) throw new Error(validation.errors.join(";"));
  const start=performance.now();
  let alternatives;
  try { alternatives=generateConceptMassingAlternatives(aoi,validation.value,`review02:${name}:${templateId}`); }
  catch (error) {
    reports.push({name,templateId,error:error instanceof Error ? error.message : String(error)});
    if (!before) throw error;
    continue;
  }
  assert.equal(alternatives.length,2);
  for(const {id,massing} of alternatives) {
    assert.deepEqual(validateConceptMassingGeometry(aoi,validation.value,massing),[]);
    assert.equal(massing.generatedBlockCount,5);
    const primary=massing.featureCollection.features.filter(f=>f.properties.primaryBlock);
    const centres=primary.map(f=>f.geometry.coordinates[0].slice(0,-1)).map(r=>[0,1].map(axis=>r.reduce((sum,p)=>sum+p[axis],0)/r.length));
    const span=(points: number[][],axis:number)=>Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]));
    const spans=[0,1].map(axis=>span(centres,axis)/span(aoi[0],axis));
    reports.push({name,templateId,id,spans,coverage:massing.achievedSiteCoveragePct});
    if(!before) assert.ok(Math.min(...spans)>0.35,`${name}/${templateId}/${id}: primary blocks must span usable site, not one end`);
    checkedCount++;
  }
  assert.ok(performance.now()-start<2500,"Two alternatives stay inside existing 2500 ms budget");
}
assert.equal(networkCalls,0);
let largeDefaultAlternatives=0;
if(!before) for(const templateId of ["residential_mixed_use","commercial_hub","civic_green","residential_quarter","hospitality_recreation"] as const) {
  const defaults=conceptSiteDefaults(conceptTemplate(templateId,"en"),cases.largeConcave);
  assert.equal(defaults.blockCount,12,"Large-site defaults respect the existing 12-block cap");
  const validated=validateRedevelopmentProgram(defaults);
  if(!validated.ok)throw new Error(validated.errors.join(";"));
  for(const {massing} of generateConceptMassingAlternatives(cases.largeConcave,validated.value,`review02:large-default:${templateId}`)) {
    assert.deepEqual(validateConceptMassingGeometry(cases.largeConcave,validated.value,massing),[]);
    const primary=massing.featureCollection.features.filter(f=>f.properties.primaryBlock);
    assert.equal(primary.length,12);
    const centres=primary.map(f=>f.geometry.coordinates[0].slice(0,-1)).map(r=>[0,1].map(axis=>r.reduce((sum,p)=>sum+p[axis],0)/r.length));
    const spans=[0,1].map(axis=>(Math.max(...centres.map(p=>p[axis]))-Math.min(...centres.map(p=>p[axis])))/(Math.max(...cases.largeConcave[0].map(p=>p[axis]))-Math.min(...cases.largeConcave[0].map(p=>p[axis]))));
    assert.ok(Math.min(...spans)>0.35,`${templateId}: capped defaults must still use both large-site arms`);
    largeDefaultAlternatives++;
  }
}
const out=process.argv.indexOf("--output");
if(out>=0) writeFileSync(process.argv[out+1],JSON.stringify({scope:"synthetic offline analogues",reports},null,2),{flag:"wx"});
console.log(JSON.stringify({status:"PASS",before,checkedCount,largeDefaultAlternatives,networkCalls,reports}));
