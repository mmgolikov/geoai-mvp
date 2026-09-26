import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { QUALITY20_AMENDMENT, QUALITY20_CASES, quality20Hash, validateQuality20Manifest, validateQuality20Ledger } from "../tests/e2e/helpers/quality20-frozen-case.ts";
import { loadQuality20Acquisition, canonicalReceivedJson, validateComplete25AcquisitionPlan } from "../tests/e2e/helpers/quality20-acquisition.ts";
import { validateComplete25AcquisitionReceipt } from "../tests/e2e/helpers/quality20-cohort-acquisition.ts";
import { validateSprint10PublicEvidenceReceipt } from "../tests/e2e/helpers/sprint10-live-journey-gate.ts";
import { validateLiveLedgerPreflight } from "./sprint10-live-journey-run.mjs";
import { sprint10LedgerReceiptCount } from "../tests/e2e/helpers/sprint10-live-budget.ts";
import * as liveBudget from "../tests/e2e/helpers/sprint10-live-budget.ts";

export const COMPLETE25_BATCH_OPT_IN = "run-reviewed-complete25-58-case-two-persona-batch";
export const COMPLETE25_BATCH_SCHEMA = "geoai.complete25.batch-plan.v1";
const LEDGER_ID = "5aa405b3-bbda-48aa-aeea-ca3357be4042";
const WINDOW_MS = 15 * 60_000;
const RATE_MS = 10 * 60_000 + 1000;
const START_WINDOW_MS = 11 * 60_000;
const MAX_BATCH_MS = 6 * 60 * 60_000;
const HASH = /^[a-f0-9]{64}$/;
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => record(value) && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
// Only locally constructed fixed guard failures can become persisted reasons.
// External exception text, even a lookalike prefix, is never copied to evidence.
class Complete25BatchGuard extends Error {}
const guard = (condition, code) => { if (!condition) throw new Complete25BatchGuard(`COMPLETE25_BATCH_${code}`); };
const safeFailureReason = error => error instanceof Complete25BatchGuard && error.message.length <= 96 &&
  /^COMPLETE25_BATCH_[A-Z_]+$/.test(error.message) ? error.message : "COMPLETE25_BATCH_UNCLASSIFIED_FAILURE";
const publicText = (value, max=2000) => typeof value === "string" && value.length > 0 && value.length <= max &&
  !/[\u0000-\u001f]/.test(value) && !/\b(?:Bearer\s|sk-[A-Za-z0-9_-]{12,}|sb_secret_|eyJ[A-Za-z0-9_-]{10,}\.)/.test(value);
const hashBytes = value => createHash("sha256").update(value).digest("hex");

export const COMPLETE25_BATCH_GROUPS = Object.freeze([
  ...Array.from({length:8},(_,i)=>({id:`A${String(i+1).padStart(2,"0")}`,caseIds:["Q","D","S"].map(d=>`A${String(i+1).padStart(2,"0")}-${d}`)})),
  ...Array.from({length:4},(_,i)=>({id:`A${String(i+9).padStart(2,"0")}`,caseIds:[`A${String(i+9).padStart(2,"0")}`]})),
  ...Array.from({length:5},(_,i)=>({id:`F0${i+1}`,caseIds:[`F0${i+1}`,...[1,2,3].map(n=>`FA${String(i*3+n).padStart(2,"0")}`)]})),
  ...QUALITY20_CASES.filter(c=>c.scope==="quality20-create").map(c=>({id:c.id,caseIds:[c.id]}))
].map(group=>Object.freeze({...group,caseIds:Object.freeze(group.caseIds)})));

function privateDirectory(path) {
  guard(typeof path === "string" && isAbsolute(path) && realpathSync(path) === path,"PRIVATE_DIRECTORY");
  const stat=lstatSync(path);guard(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0,"PRIVATE_DIRECTORY");return path;
}
export function readComplete25PrivateJson(path, maximum=512_000) {
  guard(typeof path==="string"&&isAbsolute(path)&&realpathSync(path)===path,"PRIVATE_FILE");
  privateDirectory(dirname(path));const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try {const stat=fstatSync(fd);guard(stat.isFile()&&stat.nlink===1&&(stat.mode&0o077)===0&&stat.size<=maximum,"PRIVATE_FILE");
    const bytes=readFileSync(fd,"utf8");return {value:JSON.parse(bytes),hash:hashBytes(bytes)};
  } finally {closeSync(fd);}
}
export function writeComplete25PrivateJson(path,value) {
  privateDirectory(dirname(path));const bytes=JSON.stringify(value,null,2)+"\n";guard(Buffer.byteLength(bytes)<=512_000,"OUTPUT_SIZE");
  const fd=openSync(path,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);
  try {writeFileSync(fd,bytes);fsyncSync(fd);} finally {closeSync(fd);}
  const readback=readComplete25PrivateJson(path);guard(readback.hash===hashBytes(bytes),"OUTPUT_READBACK");return readback.hash;
}

/** No unknown commands, case subsets, arbitrary paths or source values in approved intent. */
export function validateComplete25BatchPlan(plan, execution) {
  guard(exact(plan,["schemaVersion","execution","ledgerId","groups"])&&plan.schemaVersion===COMPLETE25_BATCH_SCHEMA&&plan.ledgerId===LEDGER_ID,"PLAN_SHAPE");
  guard(exact(plan.execution,["commit","origin","deploymentId"])&&/^[a-f0-9]{40}$/.test(plan.execution.commit)&&
    plan.execution.commit===execution.commit&&plan.execution.origin===execution.origin&&/^dpl_[A-Za-z0-9]+$/.test(plan.execution.deploymentId),"EXECUTION");
  guard(Array.isArray(plan.groups)&&plan.groups.length===COMPLETE25_BATCH_GROUPS.length,"GROUP_DENOMINATOR");
  const sourceIds=new Set();const shapes=new Map();
  plan.groups.forEach((group,index)=>{
    const expected=COMPLETE25_BATCH_GROUPS[index];
    guard(exact(group,["id","acquisition","requests"])&&group.id===expected.id&&Array.isArray(group.requests)&&group.requests.length===expected.caseIds.length,"GROUP_SHAPE");
    group.requests.forEach((request,i)=>{
      const definition=QUALITY20_CASES.find(c=>c.id===expected.caseIds[i]);
      guard(exact(request,["caseId","query","locale","question","role","scenario","goal"])&&request.caseId===definition.id&&request.locale==="en"&&
        publicText(request.query,200)&&publicText(request.question)&&publicText(request.role,80)&&publicText(request.scenario,120)&&
        ["object_profile","development_screening","redevelopment","due_diligence","custom"].includes(request.goal)&&(!definition.goal||request.goal===definition.goal),"REQUEST_SHAPE");
    });
    const a=group.acquisition;guard(record(a)&&quality20Hash(a.execution)===quality20Hash(plan.execution)&&a.caseId===expected.caseIds[0],"ACQUISITION_EXECUTION");
    const def=QUALITY20_CASES.find(c=>c.id===a.caseId);guard(a.marketKey===def.marketKey,"ACQUISITION_MARKET");
    if(index<12){
      guard(exact(a,["schemaVersion","execution","caseId","marketKey","query","expectedSourceIdentity"])&&a.schemaVersion==="geoai.quality20.nonpaid-acquisition.v1"&&
        a.query===group.requests[0].query&&a.query.length>=2&&/^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(a.expectedSourceIdentity),"ANALYSE_ACQUISITION");
      if(index<8){guard(!sourceIds.has(a.expectedSourceIdentity),"DISTINCT_CORE_IDENTITIES");sourceIds.add(a.expectedSourceIdentity);
        const {caseId:_,...first}=group.requests[0];guard(group.requests.every(({caseId,...r})=>quality20Hash(r)===quality20Hash(first)),"TRIPLET_INPUTS");}
    }else if(index<17){
      validateComplete25AcquisitionPlan(a,execution);
      guard(exact(a,["schemaVersion","kind","execution","caseId","marketKey","locale","role","scenario","find"])&&a.schemaVersion==="geoai.complete25.nonpaid-acquisition.v2"&&a.kind==="find"&&a.locale==="en"&&
        a.role===group.requests[0].role&&a.scenario===group.requests[0].scenario&&exact(a.find,["bounds","boundedEnvelope","group","mappedMinimumLevels","mappedMaximumLevels"]),"FIND_ACQUISITION");
      const f=a.find;guard(Array.isArray(f.bounds)&&f.bounds.length===4&&f.bounds.every(Number.isFinite)&&f.bounds[0]<f.bounds[2]&&f.bounds[1]<f.bounds[3]&&
        Math.abs(f.bounds[0])<=180&&Math.abs(f.bounds[2])<=180&&Math.abs(f.bounds[1])<=90&&Math.abs(f.bounds[3])<=90&&publicText(f.group,80)&&
        [f.mappedMinimumLevels,f.mappedMaximumLevels].every(n=>n===null||(Number.isInteger(n)&&n>=0&&n<=200)),"FIND_INPUTS");
      guard(Array.isArray(f.boundedEnvelope)&&f.boundedEnvelope.length===4&&f.boundedEnvelope.every(Number.isFinite)&&
        f.boundedEnvelope[0]<=f.bounds[0]&&f.boundedEnvelope[1]<=f.bounds[1]&&f.boundedEnvelope[2]>=f.bounds[2]&&f.boundedEnvelope[3]>=f.bounds[3],"FIND_ENVELOPE");
    }else{
      validateComplete25AcquisitionPlan(a,execution);
      guard(exact(a,["schemaVersion","kind","execution","caseId","marketKey","coordinates"])&&a.schemaVersion==="geoai.complete25.nonpaid-acquisition.v2"&&a.kind==="create"&&
        Array.isArray(a.coordinates)&&a.coordinates.length>=3&&a.coordinates.length<=24&&a.coordinates.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90),"CREATE_ACQUISITION");
      const hash=quality20Hash(a.coordinates);guard(!shapes.has(def.aoiSlot)||shapes.get(def.aoiSlot)===hash,"CREATE_SHAPE_PARITY");shapes.set(def.aoiSlot,hash);
    }
  });
  return plan;
}

export function loadComplete25Batch(env,execution,ledgerPreflight=validateLiveLedgerPreflight) {
  const enabled=env.GEOAI_COMPLETE25_BATCH_MODE;
  const names=["GEOAI_COMPLETE25_BATCH_PLAN_PATH","GEOAI_COMPLETE25_BATCH_PLAN_SHA256","GEOAI_COMPLETE25_BATCH_APPROVAL","GEOAI_COMPLETE25_BATCH_OUTPUT_DIR"];
  const successorTransitionSha256=env.GEOAI_COMPLETE26_SUCCESSOR_TRANSITION_SHA256??null;
  if(enabled===undefined){guard(names.every(n=>env[n]===undefined)&&successorTransitionSha256===null,"UNSCOPED_SETTINGS");return null;}
  guard(successorTransitionSha256===null||HASH.test(successorTransitionSha256),"SUCCESSOR_OPT_IN");
  guard(enabled===COMPLETE25_BATCH_OPT_IN&&names.every(n=>typeof env[n]==="string"&&env[n].length),"OPT_IN");
  guard(env.GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SEAM===undefined||env.GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SEAM==="disabled","MUTUALLY_EXCLUSIVE");
  guard(Object.keys(env).every(n=>!env[n]||(!n.startsWith("GEOAI_QUALITY20_")&&!n.startsWith("GEOAI_SPRINT10_")&&!["GEOAI_COMPLETE25_CASE_ATTEMPT_ID","GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SCOPE","GEOAI_HOSTED_AUTH_PROBE_LIVE_RUN_APPROVAL"].includes(n))),"UNSCOPED_CASE_SETTINGS");
  const file=readComplete25PrivateJson(env.GEOAI_COMPLETE25_BATCH_PLAN_PATH);guard(HASH.test(env.GEOAI_COMPLETE25_BATCH_PLAN_SHA256)&&file.hash===env.GEOAI_COMPLETE25_BATCH_PLAN_SHA256,"PLAN_HASH");
  const plan=validateComplete25BatchPlan(file.value,execution);const outputDir=privateDirectory(env.GEOAI_COMPLETE25_BATCH_OUTPUT_DIR);
  const host=new URL(execution.origin).hostname;
  guard(env.GEOAI_HOSTED_AUTH_PROBE_LIVE_EXPECTED_LEDGER_ID===LEDGER_ID&&env.GEOAI_COMPLETE25_BATCH_APPROVAL===`complete25-batch:${LEDGER_ID}:${host}:${execution.commit}:${file.hash}`,"APPROVAL");
  const config={plan,planSha256:file.hash,outputDir,ledgerRoot:env.GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_ROOT,ledgerPath:env.GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_PATH,
    ledgerId:LEDGER_ID,previewHost:host,previewUrl:execution.origin,scope:"complete25-batch",successorTransitionSha256};
  const ledger=ledgerPreflight(config.ledgerRoot,config.ledgerPath,"quality20-acquire");assertBatchLedger(config,ledger,[],true);
  return config;
}
function assertBatchLedger(config,ledger,completed,fresh=false) {
  guard(ledger.schemaVersion===2&&ledger.ledgerId===LEDGER_ID&&ledger.ceilingUsd===15&&ledger.acceptanceEpoch.candidateCommit===config.plan.execution.commit&&
    ledger.acceptanceEpoch.candidateHost===config.previewHost,"LEDGER_BINDING");
  guard(ledger.acceptanceEpoch.attempts.length===completed.length&&ledger.acceptanceEpoch.attempts.every((a,i)=>a.caseId===completed[i]),"ATTEMPT_DRIFT");
  const opening=typeof liveBudget.complete26SuccessorOpening==="function"?liveBudget.complete26SuccessorOpening(ledger):null;
  validateComplete26BatchOpening(config,ledger,opening,fresh);
}

/** The ledger module alone authenticates the archived epoch and opening proof.
 * This adapter cannot invent an opening or replace normal ledger preflight. */
export function validateComplete26BatchOpening(config,ledger,opening,fresh=true) {
  if(config.successorTransitionSha256!=null){
    guard(opening&&opening.transitionSha256===config.successorTransitionSha256&&
      opening.currentCandidateCommit===config.plan.execution.commit&&opening.currentCandidateHost===config.previewHost&&
      opening.previousCandidateCommit!==opening.currentCandidateCommit,"SUCCESSOR_BINDING");
    guard(Number.isInteger(opening.openingReceiptCount)&&opening.openingReceiptCount>90&&
      opening.openingReceiptCount+53<=liveBudget.sprint10LedgerReceiptCapacity(ledger)&&Number.isFinite(opening.openingAccountedUsd)&&opening.openingAccountedUsd>0&&
      ledger.estimatedOrReservedUsd>=opening.openingAccountedUsd,"SUCCESSOR_OPENING");
    if(fresh)guard(sprint10LedgerReceiptCount(ledger)===opening.openingReceiptCount&&
      ledger.estimatedOrReservedUsd===opening.openingAccountedUsd&&ledger.ceilingUsd-ledger.estimatedOrReservedUsd>=1.2,"INITIAL_HEADROOM");
  }else{
    guard(opening===null,"SUCCESSOR_OPT_IN_REQUIRED");
    if(fresh)guard(ledger.receipts.length===0&&sprint10LedgerReceiptCount(ledger)===90&&
      sprint10LedgerReceiptCount(ledger)+53<=160&&ledger.ceilingUsd-ledger.estimatedOrReservedUsd>=1.2,"INITIAL_HEADROOM");
  }
}
export function claimComplete25Batch(config) {
  return writeComplete25PrivateJson(join(config.outputDir,"batch-intent.json"),{schemaVersion:"geoai.complete25.batch-intent.v1",planSha256:config.planSha256,execution:config.plan.execution,ledgerId:LEDGER_ID,caseCount:58});
}

/** Wait BEFORE obtaining expiring sources; at most four route dispatches per rolling ten minutes. */
export function complete25BatchWaitMs(now,routeTimes,needed,quietUntil) {
  const recent=routeTimes.filter(t=>now-t<RATE_MS);let target=Math.max(now,quietUntil);
  if(recent.length+needed>4) target=Math.max(target,recent[recent.length+needed-5]+RATE_MS);
  const remaining=WINDOW_MS-(target%WINDOW_MS);
  if(remaining<START_WINDOW_MS) target+=remaining+1000;
  return Math.max(0,target-now);
}

export async function runComplete25Batch(config,runChild,{now=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),ledgerPreflight=validateLiveLedgerPreflight,readJson=readComplete25PrivateJson,writeJson=writeComplete25PrivateJson,bindAcquisition=bindComplete25Acquisition}={}) {
  const completed=[];const routeTimes={ai:[],create:[]};const started=now();const quietUntil=started+RATE_MS;let activeCase=null;
  const summary=(status,stage)=>({schemaVersion:"geoai.complete25.batch-result.v1",status,stage,planSha256:config.planSha256,caseCount:58,completedCaseIds:[...completed],stoppedCaseId:status==="PASS"?null:activeCase,cloudPersistenceAccepted:false});
  try {
    let expectedLedger=ledgerPreflight(config.ledgerRoot,config.ledgerPath,"quality20-acquire");
    assertBatchLedger(config,expectedLedger,[],true);
    const unchanged=ledger=>guard(quality20Hash(ledger)===quality20Hash(expectedLedger),"LEDGER_DRIFT");
    const manifest={schemaVersion:"geoai.quality20.frozen-cases.v1",amendment:QUALITY20_AMENDMENT,frozenAt:new Date(now()).toISOString(),execution:config.plan.execution,cases:QUALITY20_CASES.map(c=>({id:c.id,binding:null}))};
    for(const [index,group] of config.plan.groups.entries()) {
      const groupIds=COMPLETE25_BATCH_GROUPS[index].caseIds;activeCase=groupIds[0];
      const route=index>=17?"create":"ai";const needed=index<8||index>=12&&index<17?3:1;
      let wait=complete25BatchWaitMs(now(),routeTimes[route],needed,quietUntil);
      while(wait>0){guard(now()-started+wait<MAX_BATCH_MS,"DEADLINE");await sleep(Math.min(wait,60_000));wait=complete25BatchWaitMs(now(),routeTimes[route],needed,quietUntil);}
      guard(now()-started<MAX_BATCH_MS,"DEADLINE");
      unchanged(ledgerPreflight(config.ledgerRoot,config.ledgerPath,"quality20-acquire"));
      const prefix=String(index+1).padStart(2,"0");const planPath=join(config.outputDir,`${prefix}-acquisition-plan.json`),outputPath=join(config.outputDir,`${prefix}-acquisition.json`);
      const planHash=writeJson(planPath,group.acquisition);
      const acquisitionEnvironment={GEOAI_QUALITY20_ACQUISITION_PLAN_PATH:planPath,GEOAI_QUALITY20_ACQUISITION_PLAN_SHA256:planHash,GEOAI_QUALITY20_ACQUISITION_OUTPUT_PATH:outputPath};
      const acquisition=loadQuality20Acquisition(acquisitionEnvironment,config.plan.execution);
      const acquired=await runChild({scope:"quality20-acquire",quality20:null,acquisition,quality20Environment:acquisitionEnvironment});
      // runChild has already applied the existing strict child-receipt parser.
      // Preserve a parsed FAIL before the guard stops all subsequent work.
      writeJson(join(config.outputDir,`${prefix}-acquisition-child-receipt.json`),acquired);
      guard(acquired.status==="ACQUIRED_NOT_ANALYSED"&&Array.isArray(acquired.receipts)&&acquired.receipts.length===0,"ACQUISITION_FAILED");
      unchanged(ledgerPreflight(config.ledgerRoot,config.ledgerPath,"quality20-acquire"));
      const source=readJson(outputPath,2_048_000);const bound=bindAcquisition(group,source.value,planHash,now());
      guard(bound.bindings.length===groupIds.length,"BINDING_COUNT");
      for(const {caseId,binding} of bound.bindings){guard(groupIds.includes(caseId)&&manifest.cases.find(c=>c.id===caseId).binding===null,"REBIND_ATTEMPT");manifest.cases.find(c=>c.id===caseId).binding=binding;}
      manifest.frozenAt=new Date(now()).toISOString();const manifestPath=join(config.outputDir,`${prefix}-manifest.json`);const manifestHash=writeJson(manifestPath,manifest);
      for(const caseId of groupIds) {
        activeCase=caseId;const definition=QUALITY20_CASES.find(c=>c.id===caseId);const paid=definition.scope!=="quality20-find";
        guard(now()+ (paid?180_000:30_000)<bound.deadlineAtMs&&now()-started<MAX_BATCH_MS,"SOURCE_WINDOW_EXPIRED");
        const selection=validateQuality20Manifest(JSON.stringify(manifest,null,2)+"\n",manifestHash,caseId,definition.scope,config.plan.execution,now());
        const ledger=ledgerPreflight(config.ledgerRoot,config.ledgerPath,definition.scope);unchanged(ledger);assertBatchLedger(config,ledger,completed);validateQuality20Ledger(selection,ledger,null);
        if(paid){guard(routeTimes[route].filter(t=>now()-t<RATE_MS).length<4,"RATE_CHANGED");routeTimes[route].push(now());}
        const quality20Environment={GEOAI_QUALITY20_MANIFEST_PATH:manifestPath,GEOAI_QUALITY20_MANIFEST_SHA256:manifestHash,GEOAI_QUALITY20_CASE_ID:caseId};
        const visualDirectory=join(config.outputDir,`${caseId}-visual`);
        mkdirSync(visualDirectory,{mode:0o700});
        privateDirectory(visualDirectory);
        const result=await runChild({scope:definition.scope,quality20:selection,acquisition:null,quality20Environment,
          visualEvidenceEnvironment:{GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE:"write-public-map-png-evidence-v1",GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR:visualDirectory},
          complete25ArtifactCaptureEnvironment:caseId==="A09"?{
            GEOAI_COMPLETE25_A09_ARTIFACT_CAPTURE:"export-one-frozen-a09-browser-artifact-v1",
            GEOAI_COMPLETE25_A09_ARTIFACT_PATH:join(config.outputDir,"A09-browser-artifact.json")}: {},
          quality20AnalysisEvidenceEnvironment:definition.scope==="quality20-analyse"?{GEOAI_QUALITY20_ANALYSIS_EVIDENCE_CAPTURE:"write-one-synthetic-public-analysis-response",GEOAI_QUALITY20_ANALYSIS_EVIDENCE_PATH:join(config.outputDir,`${caseId}-analysis.json`)}:{}});
        writeJson(join(config.outputDir,`${caseId}-receipt.json`),result);
        guard(result.status==="PASS"&&Array.isArray(result.receipts)&&result.receipts.length===(paid?1:0)&&result.receipts.every(r=>r.state==="settled"),"CASE_FAILED");
        const after=ledgerPreflight(config.ledgerRoot,config.ledgerPath,"quality20-acquire");assertBatchLedger(config,after,[...completed,caseId]);
        guard(sprint10LedgerReceiptCount(after)===sprint10LedgerReceiptCount(ledger)+Number(paid),"RECEIPT_COUNT_DRIFT");
        guard(after.generation===ledger.generation+Number(paid)*2&&quality20Hash(after.receipts.slice(0,ledger.receipts.length))===quality20Hash(ledger.receipts)&&
          quality20Hash(after.acceptanceEpoch.attempts.slice(0,completed.length))===quality20Hash(ledger.acceptanceEpoch.attempts)&&
          after.acceptanceEpoch.attempts.at(-1).manifestSha256===manifestHash,"LEDGER_HISTORY_DRIFT");
        if(paid) guard(result.receipts[0].id===after.receipts.at(-1).id&&result.receipts[0].estimatedUsd===after.receipts.at(-1).estimatedUsd,"CHILD_RECEIPT_DRIFT");
        expectedLedger=after;
        completed.push(caseId);
      }
    }
    guard(completed.length===58,"DENOMINATOR");const result=summary("PASS","complete");writeJson(join(config.outputDir,"batch-result.json"),result);return result;
  }catch(error) {const result={...summary("FAIL","batch_stopped"),reason:safeFailureReason(error)};try{writeJson(join(config.outputDir,"batch-result.json"),result);}catch{/* Outer retirement must not depend on reporting. */}return result;}
}

// Filled only from validated nonpaid acquisition receipts; never synthesize source hashes.
export function bindComplete25Acquisition(group,receipt,planHash,now) {
  guard(record(receipt)&&receipt.planSha256===planHash&&receipt.caseId===group.acquisition.caseId&&quality20Hash(receipt.execution)===quality20Hash(group.acquisition.execution),"ACQUISITION_RECEIPT");
  const deadlineAtMs=(Math.floor(now/WINDOW_MS)+1)*WINDOW_MS;
  if(group.acquisition.schemaVersion==="geoai.quality20.nonpaid-acquisition.v1") {
    guard(exact(receipt,["schemaVersion","status","caseId","execution","planSha256","sourceIdentity","geometry","geometryHash","canonicalReceivedEvidenceHash","receivedAt","receivedAtMeaning","sourceAcquiredAt","serverEvidencePackHash","sourceResponseHash","receivedEvidence","paidPostCount","comparisonAcceptance"])&&receipt.status==="ACQUIRED_NOT_ANALYSED"&&receipt.schemaVersion==="geoai.quality20.nonpaid-acquisition-receipt.v1"&&receipt.sourceIdentity===group.acquisition.expectedSourceIdentity&&receipt.paidPostCount===0&&
      record(receipt.receivedEvidence)&&record(receipt.receivedEvidence.evidenceReceipt),"ANALYSE_RECEIPT");
    const lease=receipt.receivedEvidence.evidenceReceipt;
    validateSprint10PublicEvidenceReceipt(lease,receipt.sourceIdentity,false);
    guard(Date.parse(lease.acquiredAt)<=now&&Date.parse(lease.createdAt)<=now&&now<Date.parse(lease.expiresAt)&&lease.cacheWindow===Math.floor(now/WINDOW_MS)&&
      receipt.receivedEvidence.mode==="resolved"&&receipt.receivedEvidence.schemaVersion===2&&receipt.receivedEvidence.subject?.sourceFeatureId===receipt.sourceIdentity&&
      receipt.geometryHash===hashBytes(JSON.stringify(receipt.receivedEvidence.subject.displayGeometry??null))&&
      hashBytes(JSON.stringify(receipt.geometry))===receipt.geometryHash&&receipt.canonicalReceivedEvidenceHash===hashBytes(canonicalReceivedJson(receipt.receivedEvidence))&&
      receipt.serverEvidencePackHash===lease.evidencePackHash&&receipt.sourceResponseHash===lease.sourceResponseHash&&receipt.sourceAcquiredAt===lease.acquiredAt,"ANALYSE_RECEIPT_BINDING");
    const subject={sourceIdentity:receipt.sourceIdentity,geometryHash:receipt.geometryHash,sourceResponseHash:receipt.sourceResponseHash,evidencePackHash:receipt.serverEvidencePackHash,acquiredAt:receipt.sourceAcquiredAt};
    return {deadlineAtMs:Math.min(deadlineAtMs,Date.parse(lease.expiresAt)),bindings:group.requests.map(({caseId,...request})=>({caseId,binding:{...request,subject,find:null,create:null}}))};
  }
  const verified=validateComplete25AcquisitionReceipt({...group.acquisition,planSha256:planHash,outputPath:"unused"},receipt);
  if(verified.kind==="find") {
    guard(Date.parse(verified.find.acquiredAt)<=now,"SOURCE_TIME");
    const deadlines=verified.subjects.map(s=>{
      const lease=s.receivedEvidence.evidenceReceipt;
      guard(Date.parse(lease.acquiredAt)<=now&&lease.cacheWindow===Math.floor(now/WINDOW_MS),"SOURCE_WINDOW_EXPIRED");return Date.parse(lease.expiresAt);
    });
    return {deadlineAtMs:Math.min(deadlineAtMs,Date.parse(verified.find.acquiredAt)+WINDOW_MS,...deadlines),
      bindings:group.requests.map(({caseId,...request})=>({caseId,binding:{...request,find:verified.find,create:null,
        subject:caseId===group.id?null:verified.subjects.find(s=>s.caseId===caseId)?.subject}}))};
  }
  guard(Date.parse(verified.sourceAcquiredAt)<=now,"SOURCE_TIME");
  return {deadlineAtMs:Math.min(deadlineAtMs,Date.parse(verified.sourceAcquiredAt)+WINDOW_MS),
    bindings:group.requests.map(({caseId,...request})=>({caseId,binding:{...request,subject:null,find:null,
      create:{...verified.create,prompt:request.question}}}))};
}
