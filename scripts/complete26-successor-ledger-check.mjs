import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,realpathSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {
 COMPLETE25_OPENING_CHECKPOINT as checkpoint,COMPLETE25_RECOVERY_APPROVAL as approval,COMPLETE26_STANDING_AUTHORITY as authority,
 SPRINT10_ANALYSIS_PROMPT_VERSION as prompt,SPRINT10_V12_ANALYSIS_PROMPT_VERSION as oldPrompt,
 createComplete25RecoveryLedger,recordComplete25CaseAttempt,reserveSprint10Spend,settleSprint10Spend,
 accountSprint10UnknownUnderStandingAuthority,parseSprint10SpendLedger,sprint10ReceiptHash,sprint10LedgerReceiptCount,
 complete26LedgerCanonicalHash,complete26SuccessorOpening,startComplete26SuccessorEpoch as advance,
 startComplete26SuccessorEpochFile as advanceFile,readSprint10SpendLedgerFile,sprint10LedgerLockPath,
 parseSprint10ProviderTelemetry
} from '../tests/e2e/helpers/sprint10-live-budget.ts';
globalThis.fetch=()=>{throw Error('offline only');};let checks=0;
const hash=x=>createHash('sha256').update(x).digest('hex');
const old={candidateCommit:'fceccdb9e885b005d66771d4d6be711ff7faf28e',candidateHost:'geoai-qllzf2haw-geoaidev.vercel.app'};
const current={candidateCommit:'b'.repeat(40),candidateHost:'geoai-successor-offline.vercel.app'};
let ledger=createComplete25RecoveryLedger(checkpoint,'2026-09-25T21:00:00.000Z',old,approval);
const traceFor=depth=>depth==='quick'
 ?{attempt:1,purpose:'initial',model:'gpt-5.6-terra',reasoningEffort:'low',requestId:'resp_synthetic_quick',inputTokens:560,cachedInputTokens:10,cacheWriteTokens:50,outputTokens:1800,totalTokens:2360,estimatedCostUsd:0.022727}
 :{attempt:1,purpose:'initial',model:'gpt-5.6-sol',reasoningEffort:'high',requestId:'resp_synthetic_deep',inputTokens:940,cachedInputTokens:5,cacheWriteTokens:35,outputTokens:4000,totalTokens:4940,estimatedCostUsd:0.083777};
for(const [i,caseId] of ['A01-Q','A01-D','A01-S'].entries()) {
 const at=`2026-09-26T01:0${i}:00.000Z`,end=`2026-09-26T01:0${i}:30.000Z`;
 ledger=recordComplete25CaseAttempt(ledger,caseId,'c'.repeat(64),at,old).ledger;
 const identity={requestKey:`Q20:${caseId}:AI:${'C'.repeat(64)}`,phase:'S4',...old,route:'ai',depth:i===0?'quick':i===1?'deep':'standard',promptVersion:prompt,schemaVersion:6};
 const reserved=reserveSprint10Spend(ledger,identity,at);assert.ok(reserved.ok,reserved.reason);
 let telemetry=null;
 if(i<2){const trace=traceFor(identity.depth);const{attempt,purpose,...totals}=trace;
  telemetry=parseSprint10ProviderTelemetry(identity,{mode:'openai',schemaVersion:6,telemetry:{...totals,provider:'openai',depth:identity.depth,schemaVersion:6,promptVersion:prompt,
   attempts:1,attemptTrace:[trace],latencyMs:100,stored:false,toolCalls:0,costRateSource:i===0
   ?'OpenAI gpt-5.6-terra Standard API rate accessed 2026-09-04: USD 2/M ordinary input, USD 0.2/M cached input, USD 2.5/M cache writes, USD 12/M output'
   :'OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output'}});assert.ok(telemetry);}
 ledger=settleSprint10Spend(reserved.ledger,reserved.receipt.id,identity,{settledAt:end,status:i<2?200:502,resultHash:hash(caseId),telemetry});
}
for(const r of ledger.receipts){r.identity.promptVersion=oldPrompt;if(r.telemetry)r.telemetry.promptVersion=oldPrompt;}
assert.ok(parseSprint10SpendLedger(ledger));assert.equal(ledger.generation,191);checks+=2;
ledger=accountSprint10UnknownUnderStandingAuthority(ledger,93,ledger.receipts[2].identity,{receiptHash:sprint10ReceiptHash(ledger.receipts[2]),authority,appliedBy:'root',appliedAt:'2026-09-26T02:00:00.000Z',causeReviewReference:'root:offline_cause_review_complete',causeReviewed:true,noKnownCostAboveReserve:true});
assert.equal(ledger.generation,192);assert.equal(ledger.estimatedOrReservedUsd,8.6162505);checks+=2;
const bytes=JSON.stringify(ledger,null,2)+'\n';
const contract={schemaVersion:'geoai.complete26.successor-transition.v1',rootReference:'root:offline_reviewed_candidate_successor',appliedAt:'2026-09-26T03:00:00.000Z',
 previousLedgerSha256:hash(bytes),previousLedgerCanonicalSha256:complete26LedgerCanonicalHash(ledger),previousGeneration:192,openingReceiptCount:93,openingAccountedUsd:8.6162505,
 previousCandidateCommit:old.candidateCommit,previousCandidateHost:old.candidateHost,currentCandidateCommit:current.candidateCommit,currentCandidateHost:current.candidateHost,currentEpochId:'COMPLETE26_2026_09_26',
 evidence:Object.fromEntries(['failedBatchPlanSha256','failedBatchResultSha256','retiredHostedReceiptSha256','retiredPersonaCheckpointSha256','newBatchPlanSha256','newPreviewReceiptSha256','newCiReceiptSha256'].map(key=>[key,hash(key)]))};
const before=JSON.stringify(ledger),next=advance(ledger,contract),opening=complete26SuccessorOpening(next);
assert.equal(JSON.stringify(ledger),before);assert.deepEqual(next.receipts,ledger.receipts);assert.deepEqual(next.conservativeCharges,ledger.conservativeCharges);
assert.deepEqual(next.openingCheckpoint,ledger.openingCheckpoint);assert.deepEqual(next.archivedAcceptanceEpoch.epoch,ledger.acceptanceEpoch);
assert.equal(next.generation,193);assert.equal(next.estimatedOrReservedUsd,8.6162505);assert.equal(sprint10LedgerReceiptCount(next),93);
assert.equal(next.acceptanceEpoch.attempts.length,0);assert.equal(next.acceptanceEpoch.id,'COMPLETE26_2026_09_26');
assert.equal(opening.transitionSha256,hash(JSON.stringify(contract)));assert.equal(complete26SuccessorOpening(ledger),null);checks+=12;
assert.throws(()=>advance(next,contract));checks++;
for(const mutate of [
 c=>c.currentCandidateCommit=c.previousCandidateCommit,c=>c.currentCandidateHost=c.previousCandidateHost,c=>c.currentEpochId='COMPLETE27',
 c=>c.previousGeneration=191,c=>c.openingReceiptCount=90,c=>c.openingAccountedUsd=7.3097465,
 c=>c.previousLedgerCanonicalSha256='d'.repeat(64),c=>c.previousLedgerSha256='bad',c=>c.previousCandidateHost='geoai-other.vercel.app',
 c=>c.appliedAt='2026-09-26T01:59:59.000Z',c=>c.rootReference='founder:new_fake_approval',
 c=>delete c.evidence.newCiReceiptSha256,c=>c.evidence.newBatchPlanSha256=c.evidence.failedBatchPlanSha256,c=>c.evidence.other='d'.repeat(64),c=>c.extra=true
]){const bad=structuredClone(contract);mutate(bad);assert.throws(()=>advance(ledger,bad));checks++;}
for(const mutate of [
 l=>l.receipts[0].status=201,l=>l.receipts[2].unknownReason='response_unreadable',
 l=>l.conservativeCharges[0].causeReviewReference='root:changed_historical_cause',
 l=>l.archivedAcceptanceEpoch.epoch.attempts[0].attemptId='11111111-1111-4111-8111-111111111111',
 l=>l.archivedAcceptanceEpoch.transition.evidence.newCiReceiptSha256='e'.repeat(64),
 l=>l.acceptanceEpoch.candidateCommit=old.candidateCommit,l=>l.generation--,
 l=>delete l.archivedAcceptanceEpoch,l=>l.archivedAcceptanceEpoch.extra=true
]){const bad=structuredClone(next);mutate(bad);assert.equal(parseSprint10SpendLedger(bad),null);assert.equal(complete26SuccessorOpening(bad),null);checks+=2;}
let attempted=recordComplete25CaseAttempt(next,'A01-Q','e'.repeat(64),'2026-09-26T03:01:00.000Z',current).ledger;
assert.throws(()=>recordComplete25CaseAttempt(attempted,'A01-Q','f'.repeat(64),'2026-09-26T03:02:00.000Z',current));
assert.throws(()=>recordComplete25CaseAttempt(next,'A01-Q','e'.repeat(64),'2026-09-26T02:59:59.000Z',current));
const id={requestKey:`Q20:A01-Q:AI:${'E'.repeat(64)}`,phase:'S4',...current,route:'ai',depth:'quick',promptVersion:prompt,schemaVersion:6};
const fresh=reserveSprint10Spend(attempted,id,'2026-09-26T03:01:00.000Z');assert.ok(fresh.ok,fresh.reason);assert.equal(fresh.receipt.id,94);
assert.deepEqual(fresh.ledger.receipts.slice(0,3),ledger.receipts);assert.ok(parseSprint10SpendLedger(fresh.ledger));
assert.equal(reserveSprint10Spend(attempted,{...id,...old},'2026-09-26T03:01:00.000Z').ok,false);checks+=7;
// File transition compares raw bytes under lock and requires a durable exclusive claim.
const root=realpathSync(mkdtempSync(join(tmpdir(),'geoai-complete26-successor-'))),path=join(root,'synthetic-ledger.json'),claimPath=join(root,'.complete26-successor-epoch-claim.json');
try{
 writeFileSync(path,bytes,{flag:'wx',mode:0o600});
 assert.throws(()=>advanceFile(root,path,contract,hash(bytes),claimPath));assert.equal(readFileSync(path,'utf8'),bytes);checks+=2;
 writeFileSync(claimPath,JSON.stringify({schemaVersion:'geoai.complete26.successor-epoch-claim.v1',transitionSha256:opening.transitionSha256,ledgerPath:path,expectedLedgerSha256:hash(bytes)}),{flag:'wx',mode:0o600});
 assert.throws(()=>advanceFile(root,path,contract,'f'.repeat(64),claimPath));checks++;
 const lease=join(root,'.synthetic-ledger.json.sprint10-live-journey.lock');writeFileSync(lease,'offline',{flag:'wx',mode:0o600});
 assert.throws(()=>advanceFile(root,path,contract,hash(bytes),claimPath),/runner lease/);rmSync(lease);checks++;
 writeFileSync(path,bytes+' ',{mode:0o600});assert.throws(()=>advanceFile(root,path,contract,hash(bytes),claimPath),/bytes changed/);checks++;
 writeFileSync(path,bytes,{mode:0o600});assert.deepEqual(advanceFile(root,path,contract,hash(bytes),claimPath),next);assert.deepEqual(readSprint10SpendLedgerFile(root,path),next);
 const after=readFileSync(path);assert.throws(()=>advanceFile(root,path,contract,hash(bytes),claimPath));assert.deepEqual(readFileSync(path),after);
 assert.equal(existsSync(sprint10LedgerLockPath(path)),false);assert.equal(existsSync(claimPath),true);checks+=6;
}finally{rmSync(root,{recursive:true,force:true});}
console.log(JSON.stringify({status:'PASS',checks,networkCalls:0,operationalLedgerReads:0,operationalLedgerWrites:0}));
export {ledger as syntheticPredecessor,next as syntheticSuccessor,contract as syntheticTransition};
