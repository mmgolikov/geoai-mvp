import assert from 'node:assert/strict';
import {mkdtempSync,realpathSync,readFileSync,writeFileSync,statSync,existsSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {
 COMPLETE25_OPENING_CHECKPOINT as checkpoint, COMPLETE25_RECOVERY_APPROVAL as approval,
 COMPLETE26_STANDING_AUTHORITY as authority, SPRINT10_ANALYSIS_PROMPT_VERSION as prompt,
 SPRINT10_V12_ANALYSIS_PROMPT_VERSION as oldPrompt,
 createComplete25RecoveryLedger,reserveSprint10Spend,markSprint10SpendUnknown,
 accountSprint10UnknownUnderStandingAuthority as apply,accountSprint10UnknownUnderStandingAuthorityFile as applyFile,
 accountSprint10UnknownAtFullReserve,parseSprint10SpendLedger,readSprint10SpendLedgerFile,
 sprint10ReceiptHash,hasSprint10UnresolvedCharge,sprint10LedgerLockPath
} from '../tests/e2e/helpers/sprint10-live-budget.ts';
// Synthetic private temp file only; never initializes or reads the operational ledger.
globalThis.fetch=()=>{throw Error('offline only');};let checks=0;
const candidate={candidateCommit:'a'.repeat(40),candidateHost:'geoai-offline.vercel.app'};
const identity={requestKey:'S4.STANDING.OFFLINE',phase:'S4',...candidate,route:'ai',depth:'standard',promptVersion:prompt,schemaVersion:6};
const at='2026-09-26T01:00:00.000Z',ended='2026-09-26T01:01:00.000Z';
const start=createComplete25RecoveryLedger(checkpoint,'2026-09-25T21:00:00.000Z',candidate,approval);
const reservation=reserveSprint10Spend(start,identity,at);assert.ok(reservation.ok);
const unknown=markSprint10SpendUnknown(reservation.ledger,91,identity,ended,'request_failed_after_dispatch');
// Standing action must also reconcile a historical V12 receipt after V13 is pinned.
unknown.receipts[0].identity.promptVersion=oldPrompt;const storedIdentity=unknown.receipts[0].identity;
const application={receiptHash:sprint10ReceiptHash(unknown.receipts[0]),authority:{...authority},appliedBy:'root',appliedAt:'2026-09-26T02:00:00.000Z',causeReviewReference:'root:complete26_offline_cause_review',causeReviewed:true,noKnownCostAboveReserve:true};
const before=JSON.stringify(unknown),next=apply(unknown,91,storedIdentity,application);
assert.equal(JSON.stringify(unknown),before);assert.deepEqual(next.receipts,unknown.receipts);assert.deepEqual(next.openingCheckpoint,checkpoint);
assert.deepEqual(next.acceptanceEpoch,unknown.acceptanceEpoch);assert.equal(next.generation,unknown.generation+1);
assert.equal(next.estimatedOrReservedUsd,unknown.estimatedOrReservedUsd);assert.equal(next.estimatedOrReservedUsd,8.5097465);
assert.equal(next.conservativeCharges[0].authority.recordedAt,'2026-09-25T20:42:44Z');assert.equal(next.conservativeCharges[0].actualCostKnown,false);
assert.equal(hasSprint10UnresolvedCharge(next,true),false);assert.ok(parseSprint10SpendLedger(next));checks+=11;
assert.throws(()=>apply(next,91,storedIdentity,application));checks++;
assert.throws(()=>apply(unknown,92,storedIdentity,application));checks++;
assert.throws(()=>apply(unknown,91,{...storedIdentity,candidateCommit:'c'.repeat(40)},application));checks++;
for(const change of [
 a=>a.receiptHash='f'.repeat(64),a=>a.authority.recordedAt='2026-09-26T01:00:00Z',
 a=>a.authority.reference='founder:invented_approval',a=>a.authority.ceilingUsd=16,
 a=>a.authority.scope='all-retries',a=>a.authority.source='other',a=>a.authority.ledgerId='b'.repeat(36),
 a=>a.authority.extra=true,a=>a.appliedBy='worker',a=>a.appliedAt='2026-09-26T00:59:59.000Z',
 a=>a.appliedAt='2026-09-25T20:42:43.000Z',a=>a.appliedAt='invalid',
 a=>a.causeReviewReference='raw error and secret',a=>a.causeReviewed=false,a=>a.noKnownCostAboveReserve=false,
 a=>a.approvedAt=ended,a=>a.extra=true
]) {const bad=structuredClone(application);change(bad);assert.throws(()=>apply(unknown,91,storedIdentity,bad));checks++;}
for(const change of [
 c=>c.receiptId=92,c=>c.receiptIdentity.depth='deep',c=>c.receiptIdentity.extra=true,
 c=>c.chargedUsd=0,c=>c.chargedUsd=1.21,c=>c.actualCostKnown=true
]){const bad=structuredClone(next);change(bad.conservativeCharges[0]);assert.equal(parseSprint10SpendLedger(bad),null);checks++;}
const altered=structuredClone(next);altered.receipts[0].status=502;assert.equal(parseSprint10SpendLedger(altered),null);checks++;
const doubled=structuredClone(next);doubled.conservativeCharges.push(doubled.conservativeCharges[0]);doubled.generation++;assert.equal(parseSprint10SpendLedger(doubled),null);checks++;
const early=structuredClone(unknown);early.receipts[0].createdAt='2026-09-25T20:00:00.000Z';
assert.throws(()=>apply(early,91,storedIdentity,{...application,receiptHash:sprint10ReceiptHash(early.receipts[0])}));checks++;
// Legacy post-event approval shape stays strict and readable, not relabelled standing.
const legacy=accountSprint10UnknownAtFullReserve(unknown,91,storedIdentity,{receiptHash:application.receiptHash,approvedAt:ended,approvalReference:'founder:OFFLINE_post_event_approval'});
assert.ok(parseSprint10SpendLedger(legacy));assert.throws(()=>accountSprint10UnknownAtFullReserve(unknown,91,storedIdentity,{receiptHash:application.receiptHash,approvedAt:'2026-09-25T20:42:44.000Z',approvalReference:'founder:OFFLINE_post_event_approval'}));checks+=2;
const root=realpathSync(mkdtempSync(join(tmpdir(),'geoai-complete26-standing-'))),path=join(root,'synthetic-ledger.json');
try{
 writeFileSync(path,JSON.stringify(unknown),{flag:'wx',mode:0o600});const original=readFileSync(path);
 assert.throws(()=>applyFile(root,path,91,storedIdentity,{...application,receiptHash:'0'.repeat(64)}));
 assert.deepEqual(readFileSync(path),original);assert.equal(existsSync(sprint10LedgerLockPath(path)),false);checks+=3;
 const saved=applyFile(root,path,91,storedIdentity,application);assert.deepEqual(saved,next);assert.deepEqual(readSprint10SpendLedgerFile(root,path),next);
 assert.equal(statSync(path).mode&0o777,0o600);assert.equal(existsSync(sprint10LedgerLockPath(path)),false);
 assert.deepEqual(readdirSync(root),['synthetic-ledger.json']);checks+=5;
 const committed=readFileSync(path);assert.throws(()=>applyFile(root,path,91,storedIdentity,application));assert.deepEqual(readFileSync(path),committed);checks+=2;
 const concurrentPath=join(root,'concurrent-synthetic.json');writeFileSync(concurrentPath,JSON.stringify(unknown),{flag:'wx',mode:0o600});
 const moduleUrl=new URL('../tests/e2e/helpers/sprint10-live-budget.ts',import.meta.url).href;
 const childCode=`import {readSprint10SpendLedgerFile,accountSprint10UnknownUnderStandingAuthorityFile as apply} from ${JSON.stringify(moduleUrl)};
 const root=process.argv[1],path=process.argv[2],application=JSON.parse(process.argv[3]);
 try { const ledger=readSprint10SpendLedgerFile(root,path);apply(root,path,91,ledger.receipts[0].identity,application);process.exitCode=0; }
 catch {process.exitCode=7;}`;
 const run=()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--experimental-transform-types','--input-type=module','-e',childCode,root,concurrentPath,JSON.stringify(application)],{stdio:'ignore',env:{PATH:process.env.PATH}});child.on('error',reject);child.on('exit',resolve);});
 assert.deepEqual((await Promise.all([run(),run()])).sort(),[0,7]);
 assert.deepEqual(readSprint10SpendLedgerFile(root,concurrentPath),next);
 assert.equal(existsSync(sprint10LedgerLockPath(concurrentPath)),false);checks+=3;
 // No future error is automatically covered: every receipt requires its own root action.
 const later=reserveSprint10Spend(next,{...identity,requestKey:'S4.NEXT.OFFLINE'},'2026-09-26T02:01:00.000Z');assert.ok(later.ok);
 const laterUnknown=markSprint10SpendUnknown(later.ledger,92,later.receipt.identity,'2026-09-26T02:02:00.000Z','response_unreadable');
 assert.equal(hasSprint10UnresolvedCharge(laterUnknown,true),true);checks++;
}finally{rmSync(root,{recursive:true,force:true});}
console.log(JSON.stringify({status:'PASS',checks,networkCalls:0,operationalLedgerReads:0,operationalLedgerWrites:0}));
