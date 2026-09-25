import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, realpathSync, chmodSync, writeFileSync, readFileSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadQuality20Acquisition, validateComplete25AcquisitionPlan } from "../tests/e2e/helpers/quality20-acquisition.ts";
import { complete25FindRequest, complete25ObservedFindPlan, complete25AcquiredCandidates, buildComplete25FindAcquisition, buildComplete25CreateAcquisition,
  writeComplete25Acquisition, validateComplete25AcquisitionReceipt } from "../tests/e2e/helpers/quality20-cohort-acquisition.ts";
import { QUALITY20_CASES, QUALITY20_AMENDMENT, validateQuality20Manifest } from "../tests/e2e/helpers/quality20-frozen-case.ts";
import { sprint10PaidPostDecision } from "../tests/e2e/helpers/sprint10-live-journey-gate.ts";

// Entirely synthetic offline evidence. No browser, credentials, API or operational ledger.
let passed = 0;
const check = (label, fn) => { fn(); passed++; console.log(`PASS ${label}`); };
const hashBytes = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = value => hashBytes(JSON.stringify(value));
const root = realpathSync(mkdtempSync(join(tmpdir(), "complete25-acquisition-offline-")));
chmodSync(root, 0o700);
try {
  const execution = { commit: "a".repeat(40), origin: "https://geoai-offline.vercel.app", deploymentId: "dpl_OFFLINE" };
  const raw = { schemaVersion: "geoai.complete25.nonpaid-acquisition.v2", kind: "find", execution, caseId: "F01", marketKey: "dubai",
    locale: "en", role: "consultant_broker", scenario: "b2b_hotel_development",
    find: { bounds: [55.27, 25.20, 55.28, 25.21], boundedEnvelope: [55.26,25.19,55.29,25.22], group: "hospitality", mappedMinimumLevels: null, mappedMaximumLevels: null } };
  const bytes = JSON.stringify(raw), path = join(root, "plan.json");
  writeFileSync(path, bytes, { mode: 0o600 });
  const plan = loadQuality20Acquisition({ GEOAI_QUALITY20_ACQUISITION_PLAN_PATH: path,
    GEOAI_QUALITY20_ACQUISITION_PLAN_SHA256: hashBytes(bytes), GEOAI_QUALITY20_ACQUISITION_OUTPUT_PATH: join(root, "find.json") }, execution);
  check("v2 hashed private Find loader", () => assert.equal(plan.kind, "find"));
  check("observed viewport expansion inside explicit envelope",()=>assert.deepEqual(complete25ObservedFindPlan(plan,[55.265,25.20,55.285,25.21]).find.bounds,[55.265,25.20,55.285,25.21]));
  check("viewport expansion outside envelope fails",()=>assert.throws(()=>complete25ObservedFindPlan(plan,[55.25,25.20,55.285,25.21])));
  check("viewport region hopping fails",()=>assert.throws(()=>complete25ObservedFindPlan(plan,[55.26,25.19,55.265,25.195])));
  check("viewport NaN fails",()=>assert.throws(()=>complete25ObservedFindPlan(plan,[NaN,25.2,55.28,25.21])));
  for (const [label, mutate] of [
    ["extra field", p => p.command = "forbidden"], ["case mismatch", p => p.caseId = "FA01"],
    ["market mismatch", p => p.marketKey = "singapore"], ["reversed bounds", p => p.find.bounds.reverse()],
    ["invalid levels", p => p.find.mappedMinimumLevels = -1], ["unsupported group", p => p.find.group = "unknown"],
    ["different execution", p => p.execution.commit = "b".repeat(40)]
  ]) check(`reject ${label}`, () => { const p = structuredClone(raw); mutate(p); assert.throws(() => validateComplete25AcquisitionPlan(p, execution)); });
  const ring = [[55.271,25.201],[55.272,25.201],[55.272,25.202],[55.271,25.201]];
  const polygon = { type: "Polygon", coordinates: [ring] };
  const geometries = [polygon, { type: "MultiPolygon", coordinates: [[ring], [ring.map(([x,y]) => [x + 0.003,y])]] }, null];
  const now = Date.now(), receivedAt = new Date(now).toISOString();
  const source = { name: "OpenStreetMap", service: "Overpass API", licenceId: "ODbL-1.0", officialStatus: "open_context_not_official",
    acquiredAt: new Date(now - 2000).toISOString(), sourceResponseHash: "b".repeat(64) };
  const payload = { protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1", mode: "results", criteria: complete25FindRequest(plan), source,
    ordering: "source_identity_ascending_not_ranked",
    caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
    candidates: geometries.map((geometry,i) => ({ sourceFeatureId: `${i === 2 ? "node" : "way"}/${1001+i}`, longitude:55.271+i*0.001, latitude:25.201, geometry })) };
  const captures = payload.candidates.map(c => ({ receivedAt, payload: { mode: "resolved", schemaVersion:2,
    subject: { sourceFeatureId:c.sourceFeatureId, displayGeometry:c.geometry }, evidenceReceipt: {
      version:"PUBLIC_EVIDENCE_LEASE_V1", evidencePackHash:"c".repeat(64), sourceResponseHash:source.sourceResponseHash,
      acquiredAt:source.acquiredAt, createdAt:receivedAt, expiresAt:new Date(now+900000).toISOString(), cacheWindow:Math.floor(now/900000),
      sourceLocale:"en", lookupSourceFeatureId:c.sourceFeatureId } } }));
  let receipt;
  check("Find three exact Polygon/MultiPolygon/point contexts", () => {
    receipt = buildComplete25FindAcquisition(plan,payload,captures,receivedAt,0);
    assert.deepEqual(receipt.subjects.map(s=>s.caseId),["FA01","FA02","FA03"]);
    assert.deepEqual(receipt.subjects.map(s=>s.geometry),geometries);
    assert.equal(receipt.find.geometryHashes[2],hash(null));
  });
  for (const [label, mutate] of [
    ["fewer candidates", p=>p.candidates.pop()], ["duplicate IDs", p=>p.candidates[1].sourceFeatureId=p.candidates[0].sourceFeatureId],
    ["wrong query", p=>p.criteria.group="residential"], ["missing source hash",p=>delete p.source.sourceResponseHash],
    ["invalid geometry",p=>p.candidates[0].geometry.coordinates=[]], ["out of bounds",p=>p.candidates[0].longitude=0]
  ]) check(`reject ${label}`,()=>{ const p=structuredClone(payload); mutate(p); assert.throws(()=>complete25AcquiredCandidates(plan,p)); });
  for (const [label, mutate] of [
    ["context identity drift",c=>c[0].payload.subject.sourceFeatureId="way/9000"],
    ["geometry drift",c=>c[0].payload.subject.displayGeometry=null],
    ["missing lease",c=>delete c[0].payload.evidenceReceipt],
    ["expired lease",c=>{c[0].payload.evidenceReceipt.createdAt=new Date(now-1800000).toISOString();c[0].payload.evidenceReceipt.expiresAt=new Date(now-900000).toISOString();}],
    ["wrong lease source",c=>c[0].payload.evidenceReceipt.lookupSourceFeatureId="way/9000"]
  ]) check(`reject ${label}`,()=>{ const c=structuredClone(captures); mutate(c); assert.throws(()=>buildComplete25FindAcquisition(plan,payload,c,receivedAt,0)); });
  check("zero paid fail closed",()=>assert.throws(()=>buildComplete25FindAcquisition(plan,payload,captures,receivedAt,1)));
  check("private immutable receipt and coordinator read-back",()=>{
    writeComplete25Acquisition(plan,receipt);
    assert.equal(statSync(plan.outputPath).mode&0o077,0);
    const read=JSON.parse(readFileSync(plan.outputPath,"utf8"));
    assert.deepEqual(validateComplete25AcquisitionReceipt(plan,read),read);
    assert.throws(()=>writeComplete25Acquisition(plan,receipt),/EEXIST/);
    read.subjects[0].subject.geometryHash="0".repeat(64);
    assert.throws(()=>validateComplete25AcquisitionReceipt(plan,read));
  });
  const createRaw={schemaVersion:raw.schemaVersion,kind:"create",execution,caseId:"C-RM-01",marketKey:"dubai",coordinates:ring.slice(0,-1)};
  check("Create plan valid open vertices",()=>validateComplete25AcquisitionPlan(createRaw,execution));
  check("closed vertices rejected",()=>assert.throws(()=>validateComplete25AcquisitionPlan({...createRaw,coordinates:ring},execution)));
  const createPlan={...createRaw,planSha256:hash(createRaw),outputPath:join(root,"create.json")};
  const area={request:{marketKey:"dubai",locale:"en",aoiCoordinates:[ring]},source};
  const aoi={id:"create-aoi-1750000000000",coordinates:[ring]};
  let createReceipt;
  check("Create exact geometry and entire stable context hash",()=>{
    createReceipt=buildComplete25CreateAcquisition(createPlan,area,aoi,receivedAt,0);
    assert.equal(createReceipt.create.contextHash,hash(area));
    assert.equal(createReceipt.create.geometryHash,hash(ring.slice(0,-1)));
    writeComplete25Acquisition(createPlan,createReceipt);
    const read=JSON.parse(readFileSync(createPlan.outputPath,"utf8"));
    assert.deepEqual(validateComplete25AcquisitionReceipt(createPlan,read),read);
  });
  check("Create geometry mismatch rejected",()=>assert.throws(()=>buildComplete25CreateAcquisition(createPlan,area,{...aoi,coordinates:[]},receivedAt,0)));
  check("Create wrong market rejected",()=>assert.throws(()=>buildComplete25CreateAcquisition(createPlan,{...area,request:{...area.request,marketKey:"singapore"}},aoi,receivedAt,0)));
  check("Create paid rejected",()=>assert.throws(()=>buildComplete25CreateAcquisition(createPlan,area,aoi,receivedAt,1)));
  check("58 row binding exact F/FA + Create compatibility",()=>{
    const common={query:"OFFLINE fixture",locale:"en",question:"OFFLINE question",role:plan.role,scenario:plan.scenario,goal:"custom",subject:null,find:null,create:null};
    const cases=QUALITY20_CASES.map(d=>({id:d.id,binding:d.id==="F01"?{...common,find:receipt.find}:null}));
    for(const s of receipt.subjects) cases.find(c=>c.id===s.caseId).binding={...common,find:receipt.find,subject:s.subject};
    cases.find(c=>c.id===createPlan.caseId).binding={...common,create:{...createReceipt.create,prompt:"OFFLINE concept"}};
    const manifest={schemaVersion:"geoai.quality20.frozen-cases.v1",amendment:QUALITY20_AMENDMENT,frozenAt:receivedAt,execution,cases};
    const bytes=JSON.stringify(manifest);
    for(const id of ["F01","FA01","FA02","FA03",createPlan.caseId]) {
      const def=QUALITY20_CASES.find(c=>c.id===id);
      assert.equal(validateQuality20Manifest(bytes,hashBytes(bytes),id,def.scope,execution).definition.id,id);
    }
    assert.equal(cases.length,58);
  });
  check("existing paid scope denial unchanged",()=>{
    for(const route of ["ai","create"]) assert.equal(sprint10PaidPostDecision("quality20-acquire",route,1).ok,false);
  });
  const spec=readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts",import.meta.url),"utf8");
  check("runtime exact UI acquisition dispatch + guards present",()=>{
    assert.match(spec,/runComplete25FindAcquisition\(page, plan, budget, progress\)/);
    assert.match(spec,/runComplete25CreateAcquisition\(page, plan, budget, progress\)/);
    assert.match(spec,/contextDispatches === 3/);
    assert.match(spec,/dispatched === 1/);
    assert.match(spec,/validatePointObjectCreateAoiVertices\(plan.coordinates/);
    assert.match(spec,/parsePointObjectFindRequest\(expected\).ok/);
    const lanes=spec.slice(spec.indexOf("async function runComplete25FindAcquisition"),spec.indexOf('test("root-authorized'));
    assert.doesNotMatch(lanes,/armFrozenCase|armFindAnalysisSources|suppressOneInitialNonpaidChallenge/);
    assert.match(lanes,/Open object analysis/);
    assert.match(lanes,/Upload GeoJSON/);
  });
  console.log(`${passed} offline acquisition checks PASS; runtime/auth/API/paid NOT RUN.`);
} finally { rmSync(root,{recursive:true,force:true}); }
