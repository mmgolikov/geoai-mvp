import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,realpathSync,writeFileSync,readFileSync,existsSync,symlinkSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import * as budget from '../tests/e2e/helpers/sprint10-live-budget.ts';
import {validateQuality20Ledger} from '../tests/e2e/helpers/quality20-frozen-case.ts';
import {COMPLETE25_BATCH_GROUPS,validateComplete26BatchOpening} from './complete25-batch.mjs';
import {validateLiveLedgerScopeHeadroom} from './sprint10-live-journey-run.mjs';
import {syntheticPredecessor,syntheticTransition} from './complete26-successor-ledger-check.mjs';

// Every receipt/proof below is synthetic. Never read an operational ledger.
globalThis.fetch=()=>{throw Error('offline only');};
const sha=x=>createHash('sha256').update(x).digest('hex');
const clone=structuredClone;
let checks=0;
const ok=(x,message)=>{assert.ok(x,message);checks++;};
const equal=(a,b)=>{assert.deepEqual(a,b);checks++;};
const denied=fn=>{assert.throws(fn);checks++;};
const ids=COMPLETE25_BATCH_GROUPS.flatMap(g=>g.caseIds);
const current={candidateCommit:'c039fab32cfed370761a2849c89725f614f03e63',candidateHost:'geoai-1476jrp2s-geoaidev.vercel.app'};
const nextCandidate={candidateCommit:'d'.repeat(40),candidateHost:'geoai-final-offline.vercel.app'};
const oldTransition={...syntheticTransition,currentCandidateCommit:current.candidateCommit,currentCandidateHost:current.candidateHost};
const opening=budget.startComplete26SuccessorEpoch(syntheticPredecessor,oldTransition);
let serial=0;
function paid(ledger,key,depth='quick',route='ai',at='2026-09-26T04:00:00.000Z') {
 const identity={requestKey:key,phase:'S4',candidateCommit:ledger.acceptanceEpoch.candidateCommit,candidateHost:ledger.acceptanceEpoch.candidateHost,
  route,depth,promptVersion:route==='ai'?budget.SPRINT10_ANALYSIS_PROMPT_VERSION:budget.SPRINT10_CREATE_PROMPT_VERSION,schemaVersion:route==='ai'?6:null};
 const r=budget.reserveSprint10Spend(ledger,identity,at);assert.ok(r.ok,r.reason);
 const trace={attempt:1,purpose:'initial',model:'gpt-5.6-sol',reasoningEffort:depth==='quick'?'low':depth==='deep'?'high':'medium',requestId:`resp_offline_${++serial}`,
  inputTokens:1,cachedInputTokens:0,cacheWriteTokens:0,outputTokens:1,totalTokens:2,estimatedCostUsd:0.000024};
 const {attempt,purpose,...totals}=trace;
 const telemetry={...totals,latencyMs:1,attempts:1,attemptTrace:[trace],stored:false,toolCalls:0,
  costRateSource:'OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output'};
 const payload=route==='ai'?{mode:'openai',schemaVersion:6,telemetry:{...telemetry,provider:'openai',schemaVersion:6,depth,promptVersion:identity.promptVersion}}
  :{mode:'openai_concept',promptVersion:identity.promptVersion,telemetry};
 const parsed=budget.parseSprint10ProviderTelemetry(identity,payload);assert.ok(parsed);
 return budget.settleSprint10Spend(r.ledger,r.receipt.id,identity,{settledAt:at,status:200,resultHash:sha(key),telemetry:parsed});
}
function matrix(ledger,at,manifestSha) {
 for(const id of ids){
  ledger=budget.recordComplete25CaseAttempt(ledger,id,manifestSha,at,ledger.acceptanceEpoch).ledger;
  if(/^F0/.test(id))continue;
  const route=id.startsWith('C-')?'create':'ai',depth=id.endsWith('-Q')?'quick':id.endsWith('-D')?'deep':'standard';
  ledger=paid(ledger,`Q20:${id}:${route.toUpperCase()}:${manifestSha.toUpperCase()}`,depth,route,at);
 }
 return ledger;
}
const predecessor=matrix(opening,'2026-09-26T04:00:00.000Z','e'.repeat(64));
equal(budget.sprint10LedgerReceiptCount(predecessor),146);
equal(budget.sprint10LedgerReceiptCapacity(predecessor),160);
const bytes=JSON.stringify(predecessor,null,2)+'\n';
const contract={schemaVersion:'geoai.complete26.final-successor-transition.v1',rootReference:'root:offline_reviewed_final_revalidation',appliedAt:'2026-09-26T05:00:00.000Z',
 previousLedgerSha256:sha(bytes),previousLedgerCanonicalSha256:budget.complete26LedgerCanonicalHash(predecessor),previousGeneration:predecessor.generation,
 openingReceiptCount:146,openingAccountedUsd:predecessor.estimatedOrReservedUsd,...Object.fromEntries(Object.entries(current).map(([k,v])=>[`previous${k[0].toUpperCase()+k.slice(1)}`,v])),
 currentCandidateCommit:nextCandidate.candidateCommit,currentCandidateHost:nextCandidate.candidateHost,currentEpochId:budget.COMPLETE26_FINAL_EPOCH_ID,receiptCeiling:201,
 terminal:{status:'PASS',completedCaseIds:ids,attemptedCaseIds:ids,causeReviewSha256:null},
 evidence:Object.fromEntries(['terminalBatchPlanSha256','terminalBatchResultSha256','retiredHostedReceiptSha256','retiredPersonaCheckpointSha256','newBatchPlanSha256','newPreviewReceiptSha256','newCiReceiptSha256'].map(k=>[k,sha(k)]))};
const advance=budget.startComplete26FinalSuccessorEpoch;
const next=advance(predecessor,contract);
equal(JSON.stringify(predecessor,null,2)+'\n',bytes);
equal(next.archivedAcceptanceEpoch,predecessor.archivedAcceptanceEpoch);
equal(next.receipts,predecessor.receipts);equal(next.conservativeCharges,predecessor.conservativeCharges);equal(next.openingCheckpoint,predecessor.openingCheckpoint);
equal(next.finalTransitionArchive.epoch,predecessor.acceptanceEpoch);
equal(next.acceptanceEpoch.attempts,[]);equal(next.generation,predecessor.generation+1);equal(next.estimatedOrReservedUsd,predecessor.estimatedOrReservedUsd);
equal(budget.sprint10LedgerReceiptCapacity(next),201);denied(()=>advance(next,contract));
const successorOpening=budget.complete26SuccessorOpening(next);
const config={plan:{execution:{commit:nextCandidate.candidateCommit}},previewHost:nextCandidate.candidateHost,successorTransitionSha256:successorOpening.transitionSha256};
assert.doesNotThrow(()=>validateComplete26BatchOpening(config,next,successorOpening));checks++;
denied(()=>validateComplete26BatchOpening({...config,successorTransitionSha256:null},next,successorOpening));
denied(()=>validateComplete26BatchOpening({...config,successorTransitionSha256:sha('wrong')},next,successorOpening));
const selection={definition:{id:'A01-Q',scope:'quality20-analyse'},manifestSha256:'f'.repeat(64),manifest:{execution:{commit:nextCandidate.candidateCommit,origin:`https://${nextCandidate.candidateHost}`}}};
assert.doesNotThrow(()=>validateQuality20Ledger(selection,next,null));checks++;
denied(()=>validateQuality20Ledger(selection,predecessor,null));
denied(()=>budget.recordComplete25CaseAttempt(next,'A01-Q',selection.manifestSha256,'2026-09-26T04:59:59.000Z',nextCandidate));
const registered=budget.recordComplete25CaseAttempt(next,'A01-Q',selection.manifestSha256,'2026-09-26T06:00:00.000Z',nextCandidate);
denied(()=>budget.recordComplete25CaseAttempt(registered.ledger,'A01-Q',selection.manifestSha256,'2026-09-26T06:00:01.000Z',nextCandidate));
assert.doesNotThrow(()=>validateQuality20Ledger(selection,registered.ledger,registered.attempt.attemptId));checks++;
for(const mutate of [
 c=>c.receiptCeiling=202,c=>c.previousGeneration--,c=>c.openingReceiptCount=147,c=>c.openingAccountedUsd-=0.1,
 c=>c.previousLedgerCanonicalSha256=sha('changed'),c=>c.previousLedgerSha256='bad',c=>c.previousCandidateCommit='a'.repeat(40),
 c=>c.currentCandidateCommit=c.previousCandidateCommit,c=>c.currentCandidateHost=c.previousCandidateHost,c=>c.currentEpochId='other',
 c=>c.appliedAt='2026-09-26T03:59:59.000Z',c=>c.rootReference='founder:invented_approval',
 c=>delete c.evidence.newCiReceiptSha256,c=>c.evidence.newBatchPlanSha256=c.evidence.terminalBatchPlanSha256,
 c=>c.terminal.completedCaseIds=c.terminal.completedCaseIds.slice(1),c=>c.terminal.causeReviewSha256=sha('not_pass'),c=>c.extra=true
]){const bad=clone(contract);mutate(bad);denied(()=>advance(predecessor,bad));}
for(const mutate of [
 l=>l.receipts[0].status=201,l=>l.conservativeCharges[0].chargedUsd=0,l=>l.openingCheckpoint.receiptCount=0,l=>l.generation++,
 l=>l.archivedAcceptanceEpoch.transitionSha256=sha('other'),l=>l.finalTransitionArchive.transitionSha256=sha('other'),
 l=>l.finalTransitionArchive.epoch.attempts[0].manifestSha256=sha('changed'),l=>l.finalTransitionArchive.transition.previousLedgerCanonicalSha256=sha('changed'),
 l=>delete l.archivedAcceptanceEpoch,l=>delete l.finalTransitionArchive,l=>l.finalTransitionArchive.extra=true,l=>l.acceptanceEpoch.candidateCommit=current.candidateCommit
]){const bad=clone(next);mutate(bad);equal(budget.parseSprint10SpendLedger(bad),null);}
// FAIL is terminal evidence, never accepted coverage; hashes do not prove their contents.
const failed=clone(opening),failContract={...clone(contract),previousLedgerSha256:sha(JSON.stringify(failed)),previousLedgerCanonicalSha256:budget.complete26LedgerCanonicalHash(failed),
 previousGeneration:failed.generation,openingReceiptCount:93,openingAccountedUsd:failed.estimatedOrReservedUsd,
 terminal:{status:'FAIL',completedCaseIds:[],attemptedCaseIds:[],causeReviewSha256:sha('reviewed nonpaid failure')}};
ok(advance(failed,failContract));denied(()=>advance(failed,{...failContract,terminal:{...failContract.terminal,causeReviewSha256:null}}));
const contractFor=(ledger,terminal)=>({...clone(contract),previousLedgerSha256:sha(JSON.stringify(ledger)),previousLedgerCanonicalSha256:budget.complete26LedgerCanonicalHash(ledger),
 previousGeneration:ledger.generation,openingReceiptCount:budget.sprint10LedgerReceiptCount(ledger),openingAccountedUsd:ledger.estimatedOrReservedUsd,terminal});
const failedTerminal={status:'FAIL',completedCaseIds:[],attemptedCaseIds:['A01-Q'],causeReviewSha256:sha('exact failed attempted case review')};
const failedAttempt=budget.recordComplete25CaseAttempt(opening,'A01-Q','e'.repeat(64),'2026-09-26T04:00:00.000Z',current).ledger;
const failedIdentity={requestKey:`Q20:A01-Q:AI:${'E'.repeat(64)}`,phase:'S4',...current,route:'ai',depth:'quick',promptVersion:budget.SPRINT10_ANALYSIS_PROMPT_VERSION,schemaVersion:6};
const pending=budget.reserveSprint10Spend(failedAttempt,failedIdentity,'2026-09-26T04:00:00.000Z');ok(pending.ok);
denied(()=>advance(pending.ledger,contractFor(pending.ledger,failedTerminal)));
const unresolved=budget.settleSprint10Spend(pending.ledger,pending.receipt.id,failedIdentity,{settledAt:'2026-09-26T04:01:00.000Z',status:502,resultHash:sha('failed'),telemetry:null});
denied(()=>advance(unresolved,contractFor(unresolved,failedTerminal)));
const reviewedFailure=budget.accountSprint10UnknownUnderStandingAuthority(unresolved,pending.receipt.id,failedIdentity,{receiptHash:budget.sprint10ReceiptHash(unresolved.receipts.at(-1)),authority:budget.COMPLETE26_STANDING_AUTHORITY,appliedBy:'root',appliedAt:'2026-09-26T04:02:00.000Z',causeReviewReference:'root:offline_failed_case_review',causeReviewed:true,noKnownCostAboveReserve:true});
const failedNext=advance(reviewedFailure,contractFor(reviewedFailure,failedTerminal));ok(failedNext);equal(failedNext.receipts,reviewedFailure.receipts);
denied(()=>advance(reviewedFailure,contractFor(reviewedFailure,{...failedTerminal,completedCaseIds:['A01-Q']})));
denied(()=>advance(reviewedFailure,contractFor(reviewedFailure,{...failedTerminal,attemptedCaseIds:[]})));
const extraBeforeFinal=paid(opening,'OLD.EXTRA.FORBIDDEN');denied(()=>advance(extraBeforeFinal,contractFor(extraBeforeFinal,failContract.terminal)));
// Complete final 53 + two extras: old case IDs may recur only in the new epoch.
let full=matrix(next,'2026-09-26T06:00:00.000Z','f'.repeat(64));
equal(budget.sprint10LedgerReceiptCount(full),199);
full=paid(full,'FINAL.SG.EXTRA','standard','create','2026-09-26T06:00:00.000Z');
full=paid(full,'FINAL.INITIAL.EXTRA','standard','ai','2026-09-26T06:00:00.000Z');
equal(budget.sprint10LedgerReceiptCount(full),201);ok(budget.parseSprint10SpendLedger(full));
equal(full.receipts.slice(0,predecessor.receipts.length),predecessor.receipts);
const identity={...full.receipts.at(-1).identity,requestKey:'FINAL.EXTRA.202'};
equal(budget.reserveSprint10Spend(full,identity,'2026-09-26T06:00:00.000Z').ok,false);
denied(()=>validateLiveLedgerScopeHeadroom(full,'quality20-analyse'));
const oversized=clone(full);oversized.receipts.push({...clone(full.receipts.at(-1)),id:202,identity});oversized.generation+=2;oversized.estimatedOrReservedUsd=budget.sprint10LedgerCharge(oversized);
equal(budget.parseSprint10SpendLedger(oversized),null);
const duplicate=clone(full);duplicate.receipts.at(-1).identity.requestKey=duplicate.receipts.at(-2).identity.requestKey;equal(budget.parseSprint10SpendLedger(duplicate),null);
const reusedAttempt=clone(full);reusedAttempt.acceptanceEpoch.attempts[0].attemptId=reusedAttempt.finalTransitionArchive.epoch.attempts[0].attemptId;equal(budget.parseSprint10SpendLedger(reusedAttempt),null);
const duplicateCase=clone(full);duplicateCase.receipts.at(-1).identity={...clone(duplicateCase.receipts.find(r=>r.id===147).identity),requestKey:`Q20:A01-Q:AI:${'E'.repeat(64)}`};equal(budget.parseSprint10SpendLedger(duplicateCase),null);
denied(()=>validateQuality20Ledger(selection,full,full.acceptanceEpoch.attempts[0].attemptId));
// Legacy remains at160, even with ample cash and valid cheap receipts.
let legacy=clone(predecessor);while(budget.sprint10LedgerReceiptCount(legacy)<160)legacy=paid(legacy,`OLD.EXTRA.${budget.sprint10LedgerReceiptCount(legacy)}`);
equal(budget.sprint10LedgerReceiptCapacity(legacy),160);equal(budget.reserveSprint10Spend(legacy,{...identity,...current},'2026-09-26T06:00:00.000Z').ok,false);
const legacy161=clone(legacy);legacy161.receipts.push({...clone(legacy.receipts.at(-1)),id:161,identity:{...identity,...current}});legacy161.generation+=2;legacy161.estimatedOrReservedUsd=budget.sprint10LedgerCharge(legacy161);
equal(budget.parseSprint10SpendLedger(legacy161),null);
// Global active reservations / unknown charges still stop every later call.
const r=budget.reserveSprint10Spend(next,identity,'2026-09-26T06:00:00.000Z');ok(r.ok);
equal(budget.reserveSprint10Spend(r.ledger,{...identity,requestKey:'FINAL.ANOTHER'},'2026-09-26T06:00:00.000Z').ok,false);
const unknown=budget.settleSprint10Spend(r.ledger,r.receipt.id,identity,{settledAt:'2026-09-26T06:01:00.000Z',status:502,resultHash:sha('unknown'),telemetry:null});
equal(budget.reserveSprint10Spend(unknown,{...identity,requestKey:'FINAL.ANOTHER'},'2026-09-26T06:02:00.000Z').ok,false);
const overMoney=clone(next);overMoney.ceilingUsd=16;equal(budget.parseSprint10SpendLedger(overMoney),null);
// A real calculated high-cost synthetic tail tests USD15 independent of capacity.
let costly=clone(next);for(let i=0;i<5;i++){
 const reserve=budget.reserveSprint10Spend(costly,{...identity,requestKey:`FINAL.COST.${i}`},'2026-09-26T06:00:00.000Z');ok(reserve.ok);
 const missing=budget.settleSprint10Spend(reserve.ledger,reserve.receipt.id,reserve.receipt.identity,{settledAt:'2026-09-26T06:01:00.000Z',status:502,resultHash:sha(`cost${i}`),telemetry:null});
 costly=budget.accountSprint10UnknownUnderStandingAuthority(missing,reserve.receipt.id,reserve.receipt.identity,{receiptHash:budget.sprint10ReceiptHash(missing.receipts.at(-1)),authority:budget.COMPLETE26_STANDING_AUTHORITY,appliedBy:'root',appliedAt:'2026-09-26T06:02:00.000Z',causeReviewReference:'root:offline_cost_review_only',causeReviewed:true,noKnownCostAboveReserve:true});
}
ok(costly.estimatedOrReservedUsd<15);equal(budget.reserveSprint10Spend(costly,{...identity,requestKey:'FINAL.COST.LIMIT'},'2026-09-26T06:03:00.000Z').ok,false);
// Locked CAS, private fixed claim, retained originals and refusal of stale/foreign leases.
const root=realpathSync(mkdtempSync(join(tmpdir(),'geoai-final-successor-offline-'))),path=join(root,'synthetic-ledger.json'),claim=join(root,'.complete26-final-successor-epoch-claim.json');
try{
 writeFileSync(path,bytes,{flag:'wx',mode:0o600});
 const apply=()=>budget.startComplete26FinalSuccessorEpochFile(root,path,contract,sha(bytes),claim);
 denied(apply);equal(readFileSync(path,'utf8'),bytes);
 writeFileSync(claim,JSON.stringify({schemaVersion:'geoai.complete26.final-successor-epoch-claim.v1',transitionSha256:successorOpening.transitionSha256,ledgerPath:path,expectedLedgerSha256:sha(bytes)}),{flag:'wx',mode:0o600});
 denied(()=>writeFileSync(claim,'again',{flag:'wx',mode:0o600}));
 const lease=join(root,'.synthetic-ledger.json.sprint10-live-journey.lock');writeFileSync(lease,'offline',{flag:'wx',mode:0o600});denied(apply);rmSync(lease);
 symlinkSync(join(root,'missing'),lease);denied(apply);equal(readFileSync(path,'utf8'),bytes);rmSync(lease);
 writeFileSync(path,bytes+' ',{mode:0o600});denied(apply);writeFileSync(path,bytes,{mode:0o600});
 equal(apply(),next);const after=readFileSync(path,'utf8');denied(apply);equal(readFileSync(path,'utf8'),after);ok(existsSync(claim));
 equal(existsSync(budget.sprint10LedgerLockPath(path)),false);
}finally{rmSync(root,{recursive:true,force:true});}
console.log(JSON.stringify({status:'PASS',checks,scope:'synthetic final successor only',networkCalls:0,operationalLedgerReads:0,operationalWrites:0,legacyCapacity:160,validatedFinalCapacity:201,ceilingUsd:15}));
