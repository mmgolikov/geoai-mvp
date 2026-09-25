import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, realpathSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { COMPLETE25_BATCH_GROUPS, COMPLETE25_BATCH_SCHEMA, validateComplete25BatchPlan, complete25BatchWaitMs,
  runComplete25Batch, claimComplete25Batch, readComplete25PrivateJson, writeComplete25PrivateJson,
  bindComplete25Acquisition, COMPLETE25_BATCH_OPT_IN } from "./complete25-batch.mjs";
import { validateRuntimeConfig } from "./sprint10-hosted-auth-probe.mjs";
import { QUALITY20_CASES, quality20Hash, quality20RequestKey } from "../tests/e2e/helpers/quality20-frozen-case.ts";
import { COMPLETE25_OPENING_CHECKPOINT, COMPLETE25_RECOVERY_APPROVAL, createComplete25RecoveryLedger,
  recordComplete25CaseAttempt, reserveSprint10Spend, settleSprint10Spend, parseSprint10SpendLedger,
  hasSprint10UnresolvedCharge, SPRINT10_ANALYSIS_PROMPT_VERSION, SPRINT10_CREATE_PROMPT_VERSION } from "../tests/e2e/helpers/sprint10-live-budget.ts";
import { validateLiveLedgerScopeHeadroom } from "./sprint10-live-journey-run.mjs";

// Entirely synthetic input, frozen time, in-memory ledger, fake children and fake Auth transport.
// Never read actual runtime settings, credentials, the operational ledger or a hosted service.
const execution={commit:"a".repeat(40),origin:"https://geoai-offline-batch.vercel.app",deploymentId:"dpl_OFFLINE"};
const candidate={candidateCommit:execution.commit,candidateHost:new URL(execution.origin).hostname};
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const initialTime=Date.parse("2026-09-25T09:00:00.000Z");
const rectangle=[[55.1,25.1],[55.11,25.1],[55.11,25.11],[55.1,25.11]];
const plan={schemaVersion:COMPLETE25_BATCH_SCHEMA,execution,ledgerId:COMPLETE25_OPENING_CHECKPOINT.ledgerId,
  groups:COMPLETE25_BATCH_GROUPS.map((group,index)=>{
    const def=QUALITY20_CASES.find(c=>c.id===group.caseIds[0]);
    const requests=group.caseIds.map(caseId=>({caseId,query:"Offline public object",locale:"en",question:"Offline screening only",
      role:"investor",scenario:"compare",goal:QUALITY20_CASES.find(c=>c.id===caseId).goal??"custom"}));
    const base={execution,caseId:group.caseIds[0],marketKey:def.marketKey};
    const acquisition=index<12?{schemaVersion:"geoai.quality20.nonpaid-acquisition.v1",...base,query:requests[0].query,expectedSourceIdentity:`way/${index+1}`}:
      index<17?{schemaVersion:"geoai.complete25.nonpaid-acquisition.v2",kind:"find",...base,locale:"en",role:"investor",scenario:"compare",
        find:{bounds:[55.1,25.1,55.11,25.11],boundedEnvelope:[55.09,25.09,55.12,25.12],group:"residential",mappedMinimumLevels:null,mappedMaximumLevels:null}}:
      {schemaVersion:"geoai.complete25.nonpaid-acquisition.v2",kind:"create",...base,coordinates:rectangle};
    return {id:group.id,acquisition,requests};
  })};
assert.equal(COMPLETE25_BATCH_GROUPS.length,27);
assert.deepEqual([...COMPLETE25_BATCH_GROUPS.flatMap(g=>g.caseIds)].sort(),QUALITY20_CASES.map(c=>c.id).sort());
validateComplete25BatchPlan(plan,execution);
let negatives=0;
for(const mutate of [p=>p.groups.pop(),p=>p.groups.reverse(),p=>p.groups[0].requests.pop(),p=>p.groups[0].requests[0].command="anything",
  p=>p.groups[0].requests[0].question="sb_secret_abcdefghijklmno",p=>p.groups[1].acquisition.expectedSourceIdentity="way/1",
  p=>p.groups[0].requests[1].question="changed",p=>p.execution.commit="b".repeat(40),p=>p.ledgerId="other",
  p=>p.groups[12].acquisition.find.boundedEnvelope=null,p=>p.groups[17].acquisition.coordinates=[[0,999],[1,0],[0,0]]]) {
  const wrong=structuredClone(plan);mutate(wrong);assert.throws(()=>validateComplete25BatchPlan(wrong,execution));negatives++;
}
assert.equal(complete25BatchWaitMs(initialTime,[],3,initialTime+601000),901000);
assert.equal(complete25BatchWaitMs(initialTime+60000,[initialTime,initialTime+1],3,0),841000);
assert.equal(complete25BatchWaitMs(initialTime+1000,[],3,0),0);

const root=realpathSync(mkdtempSync(join(tmpdir(),"geoai-batch-OFFLINE-")));chmodSync(root,0o700);
let sequence=0;
const configFor=dir=>({plan,planSha256:quality20Hash(plan),outputDir:dir,ledgerRoot:dir,ledgerPath:join(dir,"unused.json"),
  ledgerId:plan.ledgerId,previewHost:candidate.candidateHost,previewUrl:execution.origin,scope:"complete25-batch"});
function fixtureBinding(group,time){
  const acquiredAt=new Date(time).toISOString();const source=group.acquisition.expectedSourceIdentity;
  const subject=id=>({sourceIdentity:id,geometryHash:"b".repeat(64),sourceResponseHash:"c".repeat(64),evidencePackHash:"d".repeat(64),acquiredAt});
  const find=group.acquisition.kind==="find"?{caseId:group.id,bounds:group.acquisition.find.bounds,group:"residential",mappedMinimumLevels:null,mappedMaximumLevels:null,
    candidateIds:[101,102,103].map(n=>`way/${n}`),geometryHashes:Array(3).fill("b".repeat(64)),sourceResponseHash:"c".repeat(64),acquiredAt}:null;
  return {deadlineAtMs:(Math.floor(time/900000)+1)*900000,bindings:group.requests.map(({caseId,...request},i)=>({caseId,binding:{...request,find,
    subject:source?subject(source):find&&i>0?subject(find.candidateIds[i-1]):null,
    create:group.acquisition.kind==="create"?{coordinates:rectangle,geometryHash:quality20Hash(rectangle),contextHash:"e".repeat(64),aoiId:"create-aoi-1790326800000",prompt:request.question}:null}}))};
}
async function simulation(fault=null){
  const dir=realpathSync(mkdtempSync(join(root,"run-")));const config=configFor(dir);let clock=initialTime;
  let ledger=createComplete25RecoveryLedger(COMPLETE25_OPENING_CHECKPOINT,new Date(clock).toISOString(),candidate,COMPLETE25_RECOVERY_APPROVAL);
  const dispatches=[];const manifests=[];let acquired=0;let calls=0;
  const result=await runComplete25Batch(config,async descriptor=>{
    calls++;clock+=1000;
    if(descriptor.scope==="quality20-acquire"){
      assert.equal(descriptor.complete25ArtifactCaptureEnvironment,undefined,"Acquisition must never export a saved AI artifact");
      assert.equal(descriptor.visualEvidenceEnvironment,undefined,"Acquisition has no visual export scope");
      if(fault==="external_error")throw new Error("untrusted exception sk-OFFLINE_SECRET_SENTINEL_123456");
      if(fault==="lookalike_error")throw new Error("COMPLETE25_BATCH_SECRET_SENTINEL");
      acquired++;if(fault==="acquisition")return {status:"FAIL",stage:"429",receipts:[]};
      if(fault==="source")clock+=900000;
      return {status:"ACQUIRED_NOT_ANALYSED",receipts:[]};
    }
    const selection=descriptor.quality20,caseId=selection.definition.id;manifests.push(structuredClone(selection.manifest));
    assert.deepEqual(descriptor.visualEvidenceEnvironment,{
      GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE:"write-public-map-png-evidence-v1",
      GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR:join(dir,`${caseId}-visual`)});
    assert.deepEqual(readdirSync(descriptor.visualEvidenceEnvironment.GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR),[],"Every visual case starts with a new empty directory");
    assert.deepEqual(descriptor.complete25ArtifactCaptureEnvironment,caseId==="A09"?{
      GEOAI_COMPLETE25_A09_ARTIFACT_CAPTURE:"export-one-frozen-a09-browser-artifact-v1",
      GEOAI_COMPLETE25_A09_ARTIFACT_PATH:join(dir,"A09-browser-artifact.json")}: {},"Only frozen A09 exports one exact artifact to the batch directory");
    ledger=recordComplete25CaseAttempt(ledger,caseId,selection.manifestSha256,new Date(clock).toISOString(),candidate).ledger;
    if(fault==="case")return {status:"FAIL",receipts:[]};
    if(descriptor.scope==="quality20-find")return {status:"PASS",receipts:[]};
    const route=descriptor.scope==="quality20-create"?"create":"ai",depth=selection.definition.depth;
    dispatches.push({route,at:clock,caseId});
    const promptVersion=route==="ai"?SPRINT10_ANALYSIS_PROMPT_VERSION:SPRINT10_CREATE_PROMPT_VERSION;
    const identity={requestKey:quality20RequestKey(selection,route),phase:"S4",...candidate,route,depth,promptVersion,schemaVersion:route==="ai"?6:null};
    const reserved=reserveSprint10Spend(ledger,identity,new Date(clock).toISOString());assert.equal(reserved.ok,true,reserved.reason);ledger=reserved.ledger;
    if(fault==="unknown")return {status:"FAIL",receipts:[{id:reserved.receipt.id,state:"unknown",estimatedUsd:null}]};
    const attempt={attempt:1,purpose:"initial",model:"gpt-5.6-sol",reasoningEffort:depth==="quick"?"low":depth==="deep"?"high":"medium",
      requestId:`resp_OFFLINE_${++sequence}`,inputTokens:100,cachedInputTokens:0,cacheWriteTokens:0,outputTokens:10,totalTokens:110,estimatedCostUsd:0.0006};
    const {attempt:_,purpose:__,...totals}=attempt;
    const telemetry={...totals,provider:"openai",route,depth,promptVersion,schemaVersion:identity.schemaVersion,latencyMs:1,attempts:1,attemptTrace:[attempt],stored:false,toolCalls:0,
      costRateSource:"OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output"};
    ledger=settleSprint10Spend(ledger,reserved.receipt.id,identity,{settledAt:new Date(clock).toISOString(),status:200,resultHash:"f".repeat(64),telemetry});
    if(fault==="drift")ledger.acceptanceEpoch.attempts.at(-1).manifestSha256="f".repeat(64);
    return {status:"PASS",receipts:[{id:reserved.receipt.id,route,depth,state:"settled",estimatedUsd:0.0006}]};
  },{now:()=>clock,sleep:async ms=>{assert(ms<=60000);clock+=ms;},ledgerPreflight:(_r,_p,scope)=>{
    assert(parseSprint10SpendLedger(ledger));assert.equal(hasSprint10UnresolvedCharge(ledger,true),false);validateLiveLedgerScopeHeadroom(ledger,scope);return structuredClone(ledger);
  },readJson:()=>({value:{}}),bindAcquisition:(group)=>{
    const bound=fixtureBinding(group,clock);if(fault==="source")bound.deadlineAtMs=clock;return bound;
  }});
  if(fault){assert.equal(result.status,"FAIL",fault);assert.equal(result.stage,"batch_stopped");assert.equal(result.completedCaseIds.length,0,fault);assert(calls<=2,fault);
    const expected={acquisition:"ACQUISITION_FAILED",source:"SOURCE_WINDOW_EXPIRED",case:"CASE_FAILED",unknown:"CASE_FAILED",drift:"UNCLASSIFIED_FAILURE",
      external_error:"UNCLASSIFIED_FAILURE",lookalike_error:"UNCLASSIFIED_FAILURE"};
    assert.equal(result.reason,`COMPLETE25_BATCH_${expected[fault]}`);
    assert.deepEqual(readComplete25PrivateJson(join(dir,"batch-result.json")).value,result);
    if(fault==="acquisition"){
      const output=join(dir,"01-acquisition-child-receipt.json");
      assert.deepEqual(readComplete25PrivateJson(output).value,{status:"FAIL",stage:"429",receipts:[]});
      assert.throws(()=>writeComplete25PrivateJson(output,{status:"PASS"}));
    }
    if(["external_error","lookalike_error"].includes(fault)){
      for(const file of readdirSync(dir))assert(!readFileSync(join(dir,file),"utf8").includes("SENTINEL"),"Raw exception text must never persist");
      assert(!JSON.stringify(result).includes("SENTINEL"));
    }
  }
  else{
    assert.equal(result.status,"PASS",JSON.stringify(result));assert.equal(acquired,27);assert.equal(calls,85);assert.equal(dispatches.length,53);assert.equal(result.completedCaseIds.length,58);
    assert.equal(ledger.receipts.length,53);assert.equal(ledger.receipts[0].id,91);assert.equal(ledger.receipts.at(-1).id,143);
    assert.equal(ledger.openingCheckpoint.accountedUsd,7.3097465);
    for(const d of dispatches)assert(dispatches.filter(x=>x.route===d.route&&x.at<=d.at&&d.at-x.at<600000).length<=4);
    for(let i=1;i<manifests.length;i++)for(const previous of manifests[i-1].cases.filter(c=>c.binding))assert.deepEqual(manifests[i].cases.find(c=>c.id===previous.id),previous);
    assert(manifests.every(m=>m.cases.length===58));
  }
  return {result,config};
}
try{
  const {config}=await simulation();for(const fault of ["acquisition","source","case","unknown","drift","external_error","lookalike_error"])await simulation(fault);
  const planPath=join(root,"approved-plan.json"),planSha=writeComplete25PrivateJson(planPath,plan);
  const env={GEOAI_HOSTED_AUTH_PROBE_EXPLICIT_RUN:"create-two-synthetic-password-personas",GEOAI_HOSTED_AUTH_PROBE_PROJECT_REF:"pphdqkurxneyagvnnjdt",
    GEOAI_HOSTED_AUTH_PROBE_SUPABASE_URL:"https://pphdqkurxneyagvnnjdt.supabase.co",GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY:"sb_publishable_OFFLINE_"+"x".repeat(32),
    GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY:"sb_secret_OFFLINE_"+"y".repeat(32),GEOAI_HOSTED_AUTH_PROBE_EXPECTED_COMMIT_SHA:execution.commit,
    GEOAI_HOSTED_AUTH_PROBE_RUN_APPROVAL:`hosted-auth-probe:pphdqkurxneyagvnnjdt:${execution.commit}`,GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM:"run-existing-real-password-preview-harness",
    GEOAI_E2E_BASE_URL:execution.origin,GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL:execution.origin,GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET:"OFFLINE_BYPASS_VALUE",
    GEOAI_REAL_PASSWORD_AUTH_DEPLOYMENT_RECEIPT_PATH:"unused",GEOAI_REAL_PASSWORD_AUTH_RUN_APPROVAL:"OFFLINE",
    GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_ROOT:root,GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_PATH:join(root,"unused-ledger.json"),
    GEOAI_HOSTED_AUTH_PROBE_LIVE_EXPECTED_LEDGER_ID:plan.ledgerId,GEOAI_HOSTED_AUTH_PROBE_ACTIVE_PERSONA_RECEIPT_PATH:join(root,"unused-personas.json"),
    GEOAI_COMPLETE25_BATCH_MODE:COMPLETE25_BATCH_OPT_IN,GEOAI_COMPLETE25_BATCH_PLAN_PATH:planPath,GEOAI_COMPLETE25_BATCH_PLAN_SHA256:planSha,
    GEOAI_COMPLETE25_BATCH_APPROVAL:`complete25-batch:${plan.ledgerId}:${candidate.candidateHost}:${execution.commit}:${planSha}`,GEOAI_COMPLETE25_BATCH_OUTPUT_DIR:root};
  const preflight=()=>createComplete25RecoveryLedger(COMPLETE25_OPENING_CHECKPOINT,new Date(initialTime).toISOString(),candidate,COMPLETE25_RECOVERY_APPROVAL);
  const validate=e=>validateRuntimeConfig(e,["node","offline"],execution.commit,24,{ledgerPreflight:preflight});
  assert.equal(validate(env).batch.planSha256,planSha);
  for(const mutate of [e=>delete e.GEOAI_COMPLETE25_BATCH_MODE,e=>e.GEOAI_COMPLETE25_BATCH_MODE="yes",e=>e.GEOAI_COMPLETE25_BATCH_PLAN_SHA256="0".repeat(64),
    e=>e.GEOAI_COMPLETE25_BATCH_APPROVAL="wrong",e=>e.GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM="disabled",e=>e.GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SEAM="run-reviewed-sprint10-live-journey-before-retirement",
    e=>e.GEOAI_QUALITY20_CASE_ID="A01-Q",e=>e.GEOAI_COMPLETE25_CASE_ATTEMPT_ID="injected",e=>e.GEOAI_SPRINT10_LIVE_SCOPE="journey",
    e=>e.GEOAI_E2E_BASE_URL="https://geoai-mvp.vercel.app",e=>e.GEOAI_HOSTED_AUTH_PROBE_LIVE_EXPECTED_LEDGER_ID="different"]){
    const bad={...env};mutate(bad);assert.throws(()=>validate(bad));negatives++;
  }
  claimComplete25Batch(config);assert.throws(()=>claimComplete25Batch(config));
  const p=join(root,"private.json");writeComplete25PrivateJson(p,{safe:true});assert.deepEqual(readComplete25PrivateJson(p).value,{safe:true});assert.throws(()=>writeComplete25PrivateJson(p,{}));
  chmodSync(p,0o644);assert.throws(()=>readComplete25PrivateJson(p));
  const group=plan.groups[0];const now=initialTime+1000,iso=new Date(initialTime).toISOString();
  const evidence={mode:"resolved",schemaVersion:2,subject:{sourceFeatureId:"way/1",displayGeometry:null},evidenceReceipt:{version:"PUBLIC_EVIDENCE_LEASE_V1",evidencePackHash:"d".repeat(64),sourceResponseHash:"c".repeat(64),acquiredAt:iso,createdAt:iso,expiresAt:new Date(initialTime+900000).toISOString(),cacheWindow:Math.floor(initialTime/900000),sourceLocale:"en",lookupSourceFeatureId:"way/1"}};
  const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(",")}]`:value&&typeof value==="object"?`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`:JSON.stringify(value);
  const receipt={schemaVersion:"geoai.quality20.nonpaid-acquisition-receipt.v1",status:"ACQUIRED_NOT_ANALYSED",caseId:group.acquisition.caseId,execution,planSha256:"a".repeat(64),sourceIdentity:"way/1",geometry:null,geometryHash:hash("null"),canonicalReceivedEvidenceHash:hash(canonical(evidence)),receivedAt:iso,receivedAtMeaning:"local_browser_response_receipt_time_NOT_source_freshness",sourceAcquiredAt:iso,serverEvidencePackHash:"d".repeat(64),sourceResponseHash:"c".repeat(64),receivedEvidence:evidence,paidPostCount:0,comparisonAcceptance:"NOT_EVALUATED_ACQUISITION_ONLY"};
  assert.equal(bindComplete25Acquisition(group,receipt,receipt.planSha256,now).bindings.length,3);
  for(const mutate of [r=>r.sourceIdentity="way/2",r=>r.geometryHash="a".repeat(64),r=>r.receivedEvidence.subject.sourceFeatureId="way/2",r=>r.paidPostCount=1,r=>r.extra=true,r=>r.sourceAcquiredAt=new Date(now).toISOString()]){
    const bad=structuredClone(receipt);mutate(bad);assert.throws(()=>bindComplete25Acquisition(group,bad,receipt.planSha256,now));negatives++;
  }
  assert.throws(()=>bindComplete25Acquisition(group,receipt,receipt.planSha256,initialTime+900000));
  console.log(JSON.stringify({status:"PASS",scope:"offline batch coordinator",fullCases:58,nonpaidAcquisitions:27,simulatedPaidReceipts:53,firstNewId:91,lastNewId:143,stopFaults:7,shapeNegatives:negatives,rawExceptionDisclosure:false}));
}finally{rmSync(root,{recursive:true,force:true});}
