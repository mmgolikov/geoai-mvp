import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,realpathSync,writeFileSync,readFileSync,existsSync,symlinkSync,rmSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import * as b from '../tests/e2e/helpers/sprint10-live-budget.ts';
import {COMPLETE25_BATCH_GROUPS,validateComplete26BatchOpening} from './complete25-batch.mjs';
import {validateQuality20Ledger} from '../tests/e2e/helpers/quality20-frozen-case.ts';
import {syntheticPredecessor,syntheticTransition} from './complete26-successor-ledger-check.mjs';

// Synthetic money/receipts/proofs only. No operational ledger or source reads.
globalThis.fetch=()=>{throw Error('Offline only');};
const sha=x=>createHash('sha256').update(x).digest('hex'),copy=structuredClone;
let checks=0;
const eq=(a,c,m)=>{assert.deepEqual(a,c,m);checks++;};
const ok=x=>{assert.ok(x);checks++;};
const deny=fn=>{assert.throws(fn);checks++;};
const ids=COMPLETE25_BATCH_GROUPS.flatMap(g=>g.caseIds);
const previous={candidateCommit:'1723d95fe80541f6d8b03381683b13c895e3751f',candidateHost:'geoai-3v5es0af0-geoaidev.vercel.app'};
const candidate={candidateCommit:'b'.repeat(40),candidateHost:'geoai-continuation-offline.vercel.app'};
function paid(ledger,key,route='ai',depth='standard',at='2026-09-26T09:00:00.000Z'){
 const identity={requestKey:key,phase:'S4',candidateCommit:ledger.acceptanceEpoch.candidateCommit,candidateHost:ledger.acceptanceEpoch.candidateHost,
  route,depth,promptVersion:route==='ai'?b.SPRINT10_ANALYSIS_PROMPT_VERSION:b.SPRINT10_CREATE_PROMPT_VERSION,schemaVersion:route==='ai'?6:null};
 const r=b.reserveSprint10Spend(ledger,identity,at);assert.ok(r.ok,r.reason);
 const trace={attempt:1,purpose:'initial',model:'gpt-5.6-sol',reasoningEffort:depth==='quick'?'low':depth==='deep'?'high':'medium',requestId:'resp_synthetic_continuation',
  inputTokens:1,cachedInputTokens:0,cacheWriteTokens:0,outputTokens:1,totalTokens:2,estimatedCostUsd:0.000024};
 const {attempt,purpose,...totals}=trace;
 const telemetry={...totals,latencyMs:1,attempts:1,attemptTrace:[trace],stored:false,toolCalls:0,
  costRateSource:'OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output'};
 const payload=route==='ai'?{mode:'openai',schemaVersion:6,telemetry:{...telemetry,provider:'openai',schemaVersion:6,depth,promptVersion:identity.promptVersion}}
  :{mode:'openai_concept',promptVersion:identity.promptVersion,telemetry};
 const parsed=b.parseSprint10ProviderTelemetry(identity,payload);assert.ok(parsed);
 return b.settleSprint10Spend(r.ledger,r.receipt.id,identity,{settledAt:at,status:200,resultHash:sha(key),telemetry:parsed});
}
function matrix(ledger,count,at,manifest){
 for(const id of ids.slice(0,count)){
  ledger=b.recordComplete25CaseAttempt(ledger,id,manifest,at,ledger.acceptanceEpoch).ledger;
  if(/^F0/.test(id))continue;
  const route=id.startsWith('C-')?'create':'ai',depth=id.endsWith('-Q')?'quick':id.endsWith('-D')?'deep':'standard';
  ledger=paid(ledger,`Q20:${id}:${route.toUpperCase()}:${manifest.toUpperCase()}`,route,depth,at);
 }
 return ledger;
}
const proofs=()=>Object.fromEntries(['terminalBatchPlanSha256','terminalBatchResultSha256','retiredHostedReceiptSha256','retiredPersonaCheckpointSha256','newBatchPlanSha256','newPreviewReceiptSha256','newCiReceiptSha256'].map(k=>[k,sha(k)]));
const intermediate=matrix(b.startComplete26SuccessorEpoch(syntheticPredecessor,{...syntheticTransition,
 currentCandidateCommit:'c039fab32cfed370761a2849c89725f614f03e63',currentCandidateHost:'geoai-1476jrp2s-geoaidev.vercel.app'}),25,'2026-09-26T04:00:00.000Z','e'.repeat(64));
const finalContract={schemaVersion:'geoai.complete26.final-successor-transition.v1',rootReference:'root:synthetic_final_review',appliedAt:'2026-09-26T05:00:00.000Z',
 previousLedgerSha256:sha(JSON.stringify(intermediate)),previousLedgerCanonicalSha256:b.complete26LedgerCanonicalHash(intermediate),previousGeneration:intermediate.generation,
 openingReceiptCount:118,openingAccountedUsd:intermediate.estimatedOrReservedUsd,previousCandidateCommit:intermediate.acceptanceEpoch.candidateCommit,previousCandidateHost:intermediate.acceptanceEpoch.candidateHost,
 currentCandidateCommit:previous.candidateCommit,currentCandidateHost:previous.candidateHost,currentEpochId:b.COMPLETE26_FINAL_EPOCH_ID,receiptCeiling:201,
 terminal:{status:'FAIL',completedCaseIds:ids.slice(0,25),attemptedCaseIds:ids.slice(0,25),causeReviewSha256:sha('synthetic earlier failure')},evidence:proofs()};
const predecessor=matrix(b.startComplete26FinalSuccessorEpoch(intermediate,finalContract),12,'2026-09-26T07:00:00.000Z','f'.repeat(64));
eq(predecessor.generation,268);eq(b.sprint10LedgerReceiptCount(predecessor),130);
const bytes=JSON.stringify(predecessor,null,2)+'\n';
const contract={schemaVersion:'geoai.complete26.reviewed-continuation.v1',rootReference:'root:synthetic_reviewed_continuation',appliedAt:'2026-09-26T08:30:00.000Z',
 previousLedgerSha256:sha(bytes),previousLedgerCanonicalSha256:b.complete26LedgerCanonicalHash(predecessor),previousGeneration:268,openingReceiptCount:130,
 openingAccountedUsd:predecessor.estimatedOrReservedUsd,previousCandidateCommit:previous.candidateCommit,previousCandidateHost:previous.candidateHost,
 currentCandidateCommit:candidate.candidateCommit,currentCandidateHost:candidate.candidateHost,currentEpochId:b.COMPLETE26_CONTINUATION_EPOCH_ID,receiptCeiling:201,
 terminal:{status:'FAIL',completedCaseIds:ids.slice(0,12),attemptedCaseIds:ids.slice(0,12),stoppedCaseId:'A05-Q',failureStage:'acquisition_pre_ai',paidDispatchStarted:false,fullyRetired:true,causeReviewSha256:sha('synthetic cause review')},evidence:proofs()};
const advance=b.startComplete26ContinuationEpoch,next=advance(predecessor,contract);
eq(JSON.stringify(predecessor,null,2)+'\n',bytes);
for(const field of ['openingCheckpoint','openingCheckpointSha256','archivedAcceptanceEpoch','finalTransitionArchive','receipts','conservativeCharges','estimatedOrReservedUsd','ceilingUsd'])eq(next[field],predecessor[field]);
eq(next.generation,269);eq(next.continuationTransitionArchive.epoch,predecessor.acceptanceEpoch);eq(next.acceptanceEpoch.attempts,[]);
eq(b.sprint10LedgerReceiptCapacity(next),201);deny(()=>advance(next,contract));
const opening=b.complete26SuccessorOpening(next);eq(opening.currentEpochId,b.COMPLETE26_CONTINUATION_EPOCH_ID);eq(opening.openingReceiptCount,130);
const config={plan:{execution:{commit:candidate.candidateCommit}},previewHost:candidate.candidateHost,successorTransitionSha256:opening.transitionSha256};
assert.doesNotThrow(()=>validateComplete26BatchOpening(config,next,opening));checks++;
deny(()=>validateComplete26BatchOpening({...config,successorTransitionSha256:sha('wrong')},next,opening));
const selection={definition:{id:'A01-Q',scope:'quality20-analyse'},manifestSha256:'a'.repeat(64),manifest:{execution:{commit:candidate.candidateCommit,origin:`https://${candidate.candidateHost}`}}};
assert.doesNotThrow(()=>validateQuality20Ledger(selection,next,null));checks++;
deny(()=>validateQuality20Ledger(selection,predecessor,null));
for(const mutation of [
 c=>c.previousGeneration--,c=>c.openingReceiptCount--,c=>c.openingAccountedUsd-=0.1,c=>c.receiptCeiling=202,c=>c.currentEpochId=b.COMPLETE26_FINAL_EPOCH_ID,
 c=>c.previousCandidateCommit='a'.repeat(40),c=>c.previousCandidateHost='geoai-other.vercel.app',c=>c.currentCandidateCommit=c.previousCandidateCommit,
 c=>c.currentCandidateHost=c.previousCandidateHost,c=>c.currentCandidateCommit=syntheticPredecessor.acceptanceEpoch.candidateCommit,
 c=>c.currentCandidateHost=intermediate.acceptanceEpoch.candidateHost,c=>c.currentCandidateCommit='0'.repeat(40),
 c=>c.previousLedgerCanonicalSha256=sha('tampered'),c=>c.previousLedgerSha256='invalid',c=>c.appliedAt='2026-09-26T06:59:59.000Z',
 c=>c.rootReference='founder:invented',c=>c.terminal.fullyRetired=false,c=>c.terminal.paidDispatchStarted=true,c=>c.terminal.failureStage='provider',
 c=>c.terminal.stoppedCaseId='A05-S',c=>c.terminal.status='PASS',c=>c.terminal.causeReviewSha256=null,
 c=>c.terminal.attemptedCaseIds.push('A05-Q'),c=>c.terminal.completedCaseIds.pop(),c=>c.terminal.completedCaseIds.reverse(),
 c=>delete c.evidence.newCiReceiptSha256,c=>c.evidence.retiredPersonaCheckpointSha256='0'.repeat(64),
 c=>c.evidence.newBatchPlanSha256=c.evidence.terminalBatchPlanSha256,c=>c.extra=true
]){const bad=copy(contract);mutation(bad);deny(()=>advance(predecessor,bad));}
for(const mutation of [
 l=>l.receipts[0].status=201,l=>l.receipts[2].unknownReason='response_unreadable',l=>l.conservativeCharges[0].chargedUsd=0,
 l=>l.openingCheckpoint.receiptCount=0,l=>l.generation++,l=>l.ceilingUsd=16,l=>l.estimatedOrReservedUsd-=0.1,
 l=>l.continuationTransitionArchive.transitionSha256=sha('wrong'),l=>l.continuationTransitionArchive.epoch.attempts.pop(),
 l=>l.continuationTransitionArchive.transition.previousLedgerCanonicalSha256=sha('changed'),l=>l.continuationTransitionArchive.extra=true,
 l=>delete l.archivedAcceptanceEpoch,l=>delete l.finalTransitionArchive,l=>delete l.continuationTransitionArchive,
 l=>l.finalTransitionArchive.transition.evidence.newCiReceiptSha256=sha('changed'),l=>l.acceptanceEpoch.candidateCommit=previous.candidateCommit
]){const bad=copy(next);mutation(bad);eq(b.parseSprint10SpendLedger(bad),null);}
const pendingIdentity={...predecessor.receipts.at(-1).identity,requestKey:'PRE-AI.FORBIDDEN'};
const pending=b.reserveSprint10Spend(predecessor,pendingIdentity,'2026-09-26T08:00:00.000Z');ok(pending.ok);
deny(()=>advance(pending.ledger,contract));
const unknown=b.settleSprint10Spend(pending.ledger,pending.receipt.id,pendingIdentity,{settledAt:'2026-09-26T08:01:00.000Z',status:502,resultHash:sha('failed'),telemetry:null});
deny(()=>advance(unknown,contract));
deny(()=>b.recordComplete25CaseAttempt(next,'A01-Q','a'.repeat(64),'2026-09-26T08:29:59.000Z',candidate));
let full=matrix(next,58,'2026-09-26T09:00:00.000Z','a'.repeat(64));eq(b.sprint10LedgerReceiptCount(full),183);eq(full.acceptanceEpoch.attempts.length,58);
full=paid(full,'CONTINUATION.SG','create');full=paid(full,'CONTINUATION.INITIAL');eq(b.sprint10LedgerReceiptCount(full),185);ok(b.parseSprint10SpendLedger(full));
eq(full.receipts.slice(0,predecessor.receipts.length),predecessor.receipts);eq(full.continuationTransitionArchive,next.continuationTransitionArchive);
deny(()=>b.recordComplete25CaseAttempt(full,'A01-Q','a'.repeat(64),'2026-09-26T09:00:01.000Z',candidate));
for(const mutation of [
 l=>l.acceptanceEpoch.attempts[0].attemptId=l.continuationTransitionArchive.epoch.attempts[0].attemptId,
 l=>l.receipts.at(-1).identity.requestKey=l.receipts.at(-2).identity.requestKey,
 l=>l.receipts.at(-1).identity.candidateCommit=previous.candidateCommit,
 l=>l.receipts.at(-1).createdAt='2026-09-26T08:00:00.000Z'
]){const bad=copy(full);mutation(bad);eq(b.parseSprint10SpendLedger(bad),null);}
let capacity=full;for(let i=0;i<16;i++)capacity=paid(capacity,`SYNTHETIC.CAPACITY.${i}`);
eq(b.sprint10LedgerReceiptCount(capacity),201);ok(b.parseSprint10SpendLedger(capacity));
eq(b.reserveSprint10Spend(capacity,{...capacity.receipts.at(-1).identity,requestKey:'SYNTHETIC.202'},'2026-09-26T09:00:00.000Z').ok,false);
// Cash ceiling independent of capacity; immutable historical93 stays reconciled.
let costly=next;for(let i=0;i<5;i++){
 const r=b.reserveSprint10Spend(costly,{...full.receipts.at(-1).identity,requestKey:`SYNTHETIC.UNKNOWN.${i}`},'2026-09-26T09:00:00.000Z');ok(r.ok);
 const u=b.settleSprint10Spend(r.ledger,r.receipt.id,r.receipt.identity,{settledAt:'2026-09-26T09:01:00.000Z',status:502,resultHash:sha('unknown'),telemetry:null});
 eq(b.reserveSprint10Spend(u,{...r.receipt.identity,requestKey:`NEXT.${i}`},'2026-09-26T09:02:00.000Z').ok,false);
 costly=b.accountSprint10UnknownUnderStandingAuthority(u,r.receipt.id,r.receipt.identity,{receiptHash:b.sprint10ReceiptHash(u.receipts.at(-1)),authority:b.COMPLETE26_STANDING_AUTHORITY,appliedBy:'root',appliedAt:'2026-09-26T09:02:00.000Z',causeReviewReference:'root:synthetic_cause_review',causeReviewed:true,noKnownCostAboveReserve:true});
}
eq(b.reserveSprint10Spend(costly,{...full.receipts.at(-1).identity,requestKey:'CASH.EXHAUSTED'},'2026-09-26T09:03:00.000Z').ok,false);
const root=realpathSync(mkdtempSync(join(tmpdir(),'geoai-continuation-synthetic-'))),path=join(root,'cycle-ledger.json'),claim=join(root,'.complete26-continuation-epoch-claim.json');
try{
 writeFileSync(path,bytes,{flag:'wx',mode:0o600});
 const apply=()=>b.startComplete26ContinuationEpochFile(root,path,contract,sha(bytes),claim);
 deny(apply);eq(readFileSync(path,'utf8'),bytes);
 const marker={schemaVersion:'geoai.complete26.reviewed-continuation-epoch-claim.v1',transitionSha256:opening.transitionSha256,ledgerPath:path,expectedLedgerSha256:sha(bytes)};
 writeFileSync(claim,JSON.stringify(marker),{flag:'wx',mode:0o600});deny(()=>writeFileSync(claim,'again',{flag:'wx'}));
 deny(()=>b.startComplete26ContinuationEpochFile(root,join(root,'other.json'),contract,sha(bytes),claim));
 deny(()=>b.startComplete26ContinuationEpochFile(root,path,contract,sha('wrong'),claim));
 const lease=join(root,'.cycle-ledger.json.sprint10-live-journey.lock');writeFileSync(lease,'synthetic',{flag:'wx',mode:0o600});deny(apply);rmSync(lease);
 symlinkSync(join(root,'missing-synthetic'),lease);deny(apply);eq(readFileSync(path,'utf8'),bytes);rmSync(lease);
 chmodSync(claim,0o644);deny(apply);chmodSync(claim,0o600);
 writeFileSync(claim,JSON.stringify({...marker,transitionSha256:sha('wrong')}));deny(apply);writeFileSync(claim,JSON.stringify(marker));
 writeFileSync(path,bytes+' ');deny(apply);writeFileSync(path,bytes);
 eq(apply(),next);const after=readFileSync(path,'utf8');deny(apply);eq(readFileSync(path,'utf8'),after);ok(existsSync(claim));eq(existsSync(b.sprint10LedgerLockPath(path)),false);
}finally{rmSync(root,{recursive:true,force:true});}
console.log(JSON.stringify({status:'PASS',checks,networkCalls:0,operationalLedgerReads:0,operationalWrites:0,openingReceipts:130,openingGeneration:268,fullPlusExtras:185,capacity:201,ceilingUsd:15}));
export {predecessor as syntheticContinuationPredecessor,contract as syntheticContinuationTransition,next as syntheticContinuationOpening};
