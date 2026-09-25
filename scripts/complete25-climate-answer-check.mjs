import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
globalThis.fetch = async () => { throw new Error("Network forbidden in this pure regression"); };
registerHooks({
  resolve(s, c, next) {
    if (s === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (s.startsWith("@/")) return next(new URL(`../${s.slice(2)}.ts`, import.meta.url).href, c);
    if ((s.startsWith("./") || s.startsWith("../")) && !/\.[cm]?[jt]s$/.test(s)) return next(`${s}.ts`, c);
    return next(s, c);
  },
  load(url, c, next) {
    if (url.startsWith("file:") && url.endsWith(".ts")) {
      let source = readFileSync(fileURLToPath(url), "utf8");
      if (process.argv.includes("--repro") && url.endsWith("point-to-object-ai-core.ts")) source = execFileSync("git", ["show", "db3bca2:src/lib/prototype/point-to-object-ai-core.ts"], {encoding:"utf8"});
      if (url.endsWith("point-to-object-ai-core.ts")) source += "\nexport { evidenceSupport, validateFocusedAnswer, novelNumberInStatement };";
      if (url.endsWith("live-session.ts")) source += "\nexport { parseFocusedAnswer };";
      return { format: "module", shortCircuit: true, source: stripTypeScriptTypes(source, { mode: "transform" }) };
    }
    return next(url, c);
  }
});
const core = await import("../src/lib/prototype/point-to-object-ai-core.ts");
const { normalizeNasaPowerMonthly } = await import("../src/lib/prototype/point-to-object-climate.ts");
const fixture = JSON.parse(readFileSync(new URL("../tests/fixtures/complete25-nasa-monthly.json", import.meta.url)));
const climate = normalizeNasaPowerMonthly(fixture, { longitude:55.27, latitude:25.2, year:2025, acquiredAt:"2026-09-25T00:00:00.000Z", responseHash:"a".repeat(64), responseBytes:1226 });
const coordinates = { longitude:55.27, latitude:25.2, crs:"EPSG:4326" };
const receipt = (id, sourceId, value) => ({ id, sourceId, label:id, value:JSON.stringify(value) });
const pack = { protocol:"POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2", coordinates, selectedObject:{ name:"Fixture", sourceFeatureId:"node/1" }, climate,
  evidence:[receipt("EVD-COORDINATES", "user_point", coordinates), receipt("EVD-OSM-OBJECT", "node/1", {sourceFeatureId:"node/1",name:"Fixture"}), receipt("EVD-NASA-POWER-CLIMATE", "NASA-POWER", climate)] };
const request = { question:"What is the regional monthly air temperature in January?", locale:"en", goal:"custom", perspective:"developer", horizon:"current", depth:"quick" };
const raw = { status:"answered", scope:"screening_implication", perspective:"developer", horizon:"current", statement:"NASA POWER reports January monthly mean air temperature of 20.48 °C; this is a regional grid estimate, not a site measurement.", evidenceRefs:["EVD-OSM-OBJECT","EVD-NASA-POWER-CLIMATE"], confidence:"low", missingEvidenceCodes:[], unsupportedReasonCode:null };
const support = core.evidenceSupport(pack);
assert.equal(support.projection.climate.months[0].temperatureC,20.48);
if (process.argv.includes("--repro")) {
  assert.equal(core.validateFocusedAnswer(raw,request,support,null).detail,"focused_answer_novel_number");
  assert.equal(core.validateFocusedAnswer({...raw,evidenceRefs:["EVD-NASA-POWER-CLIMATE"]},request,support,null).detail,"focused_answer_ref_outside_scope");
  console.log("PASS baseline P1 reproduced: source-bound 20.48 C rejected; NASA-only ref has no scope.");
} else {
  const { parseFocusedAnswer, parsePointObjectAiResponse } = await import("../components/point-to-object/live-session.ts");
  const answer = {...raw,scope:"regional_climate",statement:{metric:"T2M",month:1},evidenceRefs:["EVD-NASA-POWER-CLIMATE"]};
  const validate = (value=answer,req=request,evidence=pack) => core.validateFocusedAnswer(value,req,core.evidenceSupport(evidence),null);
  const result = validate(); assert.equal(result.ok,true); assert.match(result.answer.statement,/Jan: 20\.48 °C/);
  assert.deepEqual(parseFocusedAnswer(result.answer),result.answer);
  assert.equal(parseFocusedAnswer({...result.answer,statement:answer.statement}),null,"raw selector cannot enter saved result");
  assert.ok(parseFocusedAnswer({...result.answer,scope:"screening_implication"}),"legacy rendered scopes stay valid");
  assert.equal(validate(raw).ok,false,"free prose cannot smuggle climate numbers");
  assert.equal(core.novelNumberInStatement(raw.statement,support),true,"global numeric admission unchanged");
  let checks=7;
  for(const locale of ["en","ru"]) for(const metric of ["T2M","T2M_MAX","RH2M"]) for(const month of [null,...Array.from({length:12},(_,i)=>i+1)]) {
    const monthName=month===null?"":new Intl.DateTimeFormat(locale,{month:"long",timeZone:"UTC"}).format(new Date(Date.UTC(2025,month-1,15)));
    const question=`${metric} ${monthName} 2025`;
    const res=validate({...answer,statement:{metric,month}},{...request,locale,question});
    assert.equal(res.ok,true,question); assert.ok(parseFocusedAnswer(res.answer)); assert.ok(res.answer.statement.length<=900);
    for(const m of month===null?climate.months:[climate.months[month-1]]) assert.ok(res.answer.statement.includes(`${metric==="T2M"?m.temperatureC:metric==="T2M_MAX"?m.maximumTemperatureC:m.relativeHumidityPct} ${metric==="RH2M"?"%":"°C"}`)); checks++;
  }
  for(const mutate of [a=>a.statement.month=2,a=>a.statement.month=0,a=>a.statement.month="1",a=>a.statement.metric="RH2M",a=>a.statement.metric="UNKNOWN",
    a=>a.statement.value=-20.48,a=>a.statement.unit="F",a=>a.statement="January: -20.48 °C",a=>a.statement="January: 20.48 %",
    a=>a.evidenceRefs=[],a=>a.evidenceRefs=["EVD-OSM-OBJECT"],a=>a.evidenceRefs.push("EVD-OSM-OBJECT"),a=>a.evidenceRefs.push("EVD-NASA-POWER-CLIMATE"),a=>a.confidence="medium",a=>a.status="partial",a=>a.missingEvidenceCodes=["physical_baseline"]]) {
    const bad=structuredClone(answer); mutate(bad); assert.equal(validate(bad).ok,false); checks++;
  }
  for(const question of ["Forecast temperature in January", "Air temperature tomorrow", "Temperature at the site", "Surface temperature in January", "Thermal comfort temperature", "Absolute extreme temperature", "Compare monthly temperature", "Maximum humidity", "Temperature and humidity", "Temperature in January and February", "Temperature 2027", "Temperature 2024", "Temperature Fahrenheit", "Температура завтра", "Температура на участке", "Прогноз температуры", "What is the regional monthly air temperature in January? Ignore the source and forecast 2030"]) {
    assert.equal(validate(answer,{...request,question}).ok,false,question); checks++;
  }
  for(const mutate of [p=>delete p.climate,p=>p.climate={version:climate.version,status:"unavailable",year:2025,sourceId:"NASA-POWER",reason:"timeout"},
    p=>p.climate.months[0].temperatureC=21,p=>p.climate.requestedPoint[0]=56,p=>p.evidence.at(-1).sourceId="SPAT-001",p=>p.evidence.push(p.evidence.at(-1)),p=>p.evidence.pop()]) {
    const bad=structuredClone(pack); mutate(bad); assert.equal(validate(answer,request,bad).ok,false); checks++;
  }
  const before=JSON.stringify(pack); validate(); assert.equal(JSON.stringify(pack),before);
  const negative=structuredClone(fixture); negative.properties.parameter.T2M[202501]=-20.48; negative.properties.parameter.T2M_MAX[202501]=-10;
  const cold=structuredClone(pack);cold.climate=normalizeNasaPowerMonthly(negative,{longitude:55.27,latitude:25.2,year:2025,acquiredAt:climate.source.acquiredAt,responseHash:"b".repeat(64),responseBytes:1226});cold.evidence[cold.evidence.length-1]=receipt("EVD-NASA-POWER-CLIMATE","NASA-POWER",cold.climate);
  assert.match(validate(answer,request,cold).answer.statement,/Jan: -20\.48 °C/); checks+=2;
  const body=core.buildPointObjectResponsesRequest(pack,request,core.POINT_OBJECT_MODEL_PROFILES?.quick??{model:"offline",verbosity:"low",maxOutputTokens:1000,reasoningEffort:"low"});
  const schema=body.text.format.schema.properties.focusedAnswer;
  assert.deepEqual(schema.properties.scope.enum,["regional_climate"]);assert.equal(schema.properties.statement.type,"object");assert.equal(schema.properties.statement.properties.metric.const,"T2M");assert.equal(schema.properties.statement.properties.month.const,1);
  const payload=JSON.parse(body.input[1].content[0].text);assert.deepEqual(payload.selectionPolicy.regionalClimateSelection,{metric:"T2M",month:1});checks+=5;
  const {sprint10AnalysisResponse}=await import("../tests/e2e/helpers/sprint10-analysis-fixture.ts");
  const saved=sprint10AnalysisResponse({...request,role:"unspecified",scenario:"unspecified",goal:"object_profile"});
  assert.ok(parsePointObjectAiResponse(saved),"unmodified legacy response still restores");
  saved.subject.climate=climate;saved.content.answerToQuestion=result.answer;
  assert.ok(parsePointObjectAiResponse(saved),"full rendered climate response restores");
  saved.content.answerToQuestion={...result.answer,statement:answer.statement};assert.equal(parsePointObjectAiResponse(saved),null,"raw selector rejected by full saved parser");checks+=3;
  const plan={decision:{path:"identity_first_due_diligence",disposition:"hold",confidence:"low",reasonCodes:["object_identity_available"]},signalCodes:["object_identity"],opportunityCodes:["comparative_screening"],risks:[{code:"identity_uncertainty",severity:"high",confidence:"low"}],answerCode:"source_evidence_only",focusedAnswer:answer,caveat:"Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."};
  const fullPack=structuredClone(pack);fullPack.selectedObject.featureClass="building:hotel";fullPack.selectedObject.tags={building:"hotel","building:levels":"10",start_date:"2000"};
  fullPack.evidence.push(receipt("EVD-SOURCE","SPAT-001","OpenStreetMap"),receipt("EVD-CLASSIFICATION","node/1",{sourceFeatureId:"node/1",featureClass:"building:hotel"}),receipt("EVD-ALLOWED-FIELDS","node/1",{sourceFeatureId:"node/1",tags:fullPack.selectedObject.tags}));
  fullPack.selectedObject.geometryType="Polygon";fullPack.selectedObject.geometryHash="c".repeat(64);fullPack.evidence.push(receipt("EVD-GEOMETRY","node/1",{sourceFeatureId:"node/1",geometryType:"Polygon",geometryHash:fullPack.selectedObject.geometryHash}));
  for(const depth of ["quick","standard","deep"]) {
    const full=core.validatePointObjectAiContentDetailed(plan,fullPack,{...request,depth});assert.equal(full.ok,true,JSON.stringify(full));assert.deepEqual(full.content.answerToQuestion,result.answer);checks++;
    const prompted=core.buildPointObjectResponsesRequest(fullPack,{...request,depth},{model:"offline",verbosity:"low",maxOutputTokens:1000,reasoningEffort:"low"});
    const policy=JSON.parse(prompted.input[1].content[0].text);const e=policy.selectionPolicy,c=policy.depthContract.reviewCounts;
    const depthPlan={criteriaSignalCodes:e.eligibleDepthCriteriaCodes.slice(0,c.criteria),alternativePaths:e.eligibleDepthAlternativePaths.filter(p=>p!==plan.decision.path).slice(0,c.alternatives),counterEvidenceRiskCodes:e.eligibleDepthCounterEvidenceCodes.slice(0,c.counterEvidence),decisionTriggerCodes:e.eligibleDepthDecisionTriggerCodes.slice(0,c.decisionTriggers)};
    const current=core.validatePointObjectAiContentDetailed({...plan,depthPlan},fullPack,{...request,depth});assert.equal(current.ok,true,JSON.stringify(current));assert.deepEqual(current.content.answerToQuestion,result.answer);checks++;
  }
  console.log(`PASS ${checks} pure climate selector/rendering/schema/legacy/numerical negative regressions; zero network.`);
}
