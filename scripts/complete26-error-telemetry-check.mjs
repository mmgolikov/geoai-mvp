import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SPRINT10_ANALYSIS_PROMPT_VERSION as prompt, SPRINT10_V12_ANALYSIS_PROMPT_VERSION as oldPrompt,
  COMPLETE25_OPENING_CHECKPOINT as checkpoint, COMPLETE25_RECOVERY_APPROVAL as approval,
  createComplete25RecoveryLedger, reserveSprint10Spend, settleSprint10Spend,
  parseSprint10ProviderTelemetry, parseSprint10SpendLedger, sprint10ReceiptHash
} from '../tests/e2e/helpers/sprint10-live-budget.ts';

// Synthetic complete route usage only; no network, credentials or operational files.
globalThis.fetch = () => { throw Error('offline only'); };
let checks = 0;
const candidate = {candidateCommit:'a'.repeat(40),candidateHost:'geoai-offline.vercel.app'};
const identity = {requestKey:'S4.ERROR.TELEMETRY',phase:'S4',...candidate,route:'ai',depth:'standard',promptVersion:prompt,schemaVersion:6};
const source = model => model === 'gpt-5.6-terra'
  ? 'OpenAI gpt-5.6-terra Standard API rate accessed 2026-09-04: USD 2/M ordinary input, USD 0.2/M cached input, USD 2.5/M cache writes, USD 12/M output'
  : 'OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output';
const trace = [
  {attempt:1,purpose:'initial',model:'gpt-5.6-terra',reasoningEffort:'medium',requestId:'resp_offline_initial',inputTokens:100,cachedInputTokens:20,cacheWriteTokens:10,outputTokens:20,totalTokens:120,estimatedCostUsd:0.000409},
  {attempt:2,purpose:'repair',model:'gpt-5.6-sol',reasoningEffort:'medium',requestId:'resp_offline_repair',inputTokens:100,cachedInputTokens:20,cacheWriteTokens:10,outputTokens:20,totalTokens:120,estimatedCostUsd:0.000738}
];
const telemetry = {provider:'openai',depth:'standard',schemaVersion:6,promptVersion:prompt,
  model:'gpt-5.6-sol',reasoningEffort:'medium',requestId:'resp_offline_repair',latencyMs:100,
  attempts:2,attemptTrace:trace,inputTokens:200,cachedInputTokens:40,cacheWriteTokens:20,
  outputTokens:40,totalTokens:240,estimatedCostUsd:0.001147,costRateSource:source('gpt-5.6-terra')+' | '+source('gpt-5.6-sol'),stored:false,toolCalls:0};
const success = {mode:'openai',schemaVersion:6,telemetry};
const failure = {mode:'unavailable',code:'AI_OUTPUT_INVALID',error:'AI analysis returned an invalid response.',retryable:true,telemetry};
const parsed = parseSprint10ProviderTelemetry(identity,success);
assert.ok(parsed); checks++;
assert.deepEqual(parseSprint10ProviderTelemetry(identity,failure,502),parsed); checks++;
for (const status of [undefined,200,400,429,500,503]) {
  assert.equal(parseSprint10ProviderTelemetry(identity,failure,status),null); checks++;
}
for (const mutate of [
  p=>p.mode='openai_concept',p=>p.code='AI_OUTPUT_INCOMPLETE',p=>p.code='AI_INTERNAL_ERROR',
  p=>p.retryable=false,p=>p.error='',p=>p.error='x'.repeat(1025),p=>p.schemaVersion=6,
  p=>delete p.telemetry,p=>p.telemetry=null,p=>p.telemetry.provider='other',
  p=>p.telemetry.depth='deep',p=>p.telemetry.promptVersion=oldPrompt,p=>p.telemetry.schemaVersion=7,
  p=>p.telemetry.attemptTrace.pop(),p=>p.telemetry.attempts=3,
  p=>p.telemetry.attemptTrace[1].requestId=p.telemetry.attemptTrace[0].requestId,
  p=>p.telemetry.attemptTrace[1].purpose='focused',p=>p.telemetry.attemptTrace[1].outputTokens=6501,
  p=>delete p.telemetry.attemptTrace[1].cacheWriteTokens,p=>p.telemetry.inputTokens=199,
  p=>p.telemetry.estimatedCostUsd=0,p=>p.telemetry.requestId='resp_different',
  p=>p.telemetry.stored=true,p=>p.telemetry.toolCalls=1,p=>p.telemetry.costRateSource='unverified',
  p=>p.telemetry.attemptTrace[0].estimatedCostUsd=0,p=>p.telemetry.attemptTrace[0].inputTokens=81001
]) { const bad=structuredClone(failure);mutate(bad);assert.equal(parseSprint10ProviderTelemetry(identity,bad,502),null);checks++; }
assert.equal(parseSprint10ProviderTelemetry({...identity,route:'create',schemaVersion:null,promptVersion:'POINT_OBJECT_CREATE_PROGRAM_V1_2026_09_04'},failure,502),null);checks++;
let ledger=createComplete25RecoveryLedger(checkpoint,'2026-09-25T21:00:00.000Z',candidate,approval);
for(let n=1;n<=3;n++) {
  const id={...identity,requestKey:`S4.OFFLINE.${n}`};
  const reserved=reserveSprint10Spend(ledger,id,'2026-09-26T01:00:00.000Z');assert.ok(reserved.ok);
  ledger=settleSprint10Spend(reserved.ledger,reserved.receipt.id,id,{settledAt:'2026-09-26T01:01:00.000Z',status:n===3?502:200,resultHash:'b'.repeat(64),telemetry:n===3?null:parsed});
}
// Reproduce the immutable 91/92 settled + 93 unknown V12 shape without copying real data.
for(const receipt of ledger.receipts) {
  receipt.identity.promptVersion=oldPrompt;
  if(receipt.telemetry)receipt.telemetry.promptVersion=oldPrompt;
}
const original=JSON.stringify(ledger),hashes=ledger.receipts.map(sprint10ReceiptHash);
assert.ok(parseSprint10SpendLedger(ledger));assert.equal(ledger.generation,191);
assert.deepEqual(ledger.receipts.map(r=>r.id),[91,92,93]);assert.equal(JSON.stringify(ledger),original);
assert.deepEqual(ledger.receipts.map(sprint10ReceiptHash),hashes);checks+=5;
assert.equal(parseSprint10ProviderTelemetry({...identity,promptVersion:oldPrompt},{...success,telemetry:{...telemetry,promptVersion:oldPrompt}}),null);checks++;
assert.equal(reserveSprint10Spend(createComplete25RecoveryLedger(checkpoint,'2026-09-25T21:00:00.000Z',candidate,approval),{...identity,promptVersion:oldPrompt},'2026-09-26T01:00:00.000Z').ok,false);checks++;
const initial=createComplete25RecoveryLedger(checkpoint,'2026-09-25T21:00:00.000Z',candidate,approval);
const reserved=reserveSprint10Spend(initial,identity,'2026-09-26T01:00:00.000Z');assert.ok(reserved.ok);
const costOnly=settleSprint10Spend(reserved.ledger,91,identity,{settledAt:'2026-09-26T01:01:00.000Z',status:502,resultHash:'b'.repeat(64),telemetry:parseSprint10ProviderTelemetry(identity,failure,502)});
assert.equal(costOnly.receipts[0].state,'settled');assert.equal(costOnly.receipts[0].status,502);
assert.equal(costOnly.receipts[0].estimatedUsd,0.001147);assert.ok(parseSprint10SpendLedger(costOnly));checks+=4;
// Product/body assertions remain independent; accounting cannot invent a PASS.
const spec=readFileSync(new URL('../tests/e2e/sprint10-live-journey.spec.ts',import.meta.url),'utf8');
assert.ok(spec.includes('guard(response.status() === 200, "Analysis HTTP response was not successful.");'));checks++;
console.log(JSON.stringify({status:'PASS',checks,networkCalls:0,operationalLedgerReads:0,operationalLedgerWrites:0}));
