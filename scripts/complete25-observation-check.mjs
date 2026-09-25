import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { quality20CaseObservations } from "./sprint10-live-journey-run.mjs";
globalThis.fetch = async () => { throw new Error("Network forbidden"); };
const current = {caseId:"A01-Q",entryCoverage:"follow_up_recovery_initial_NONPAID_challenge_aborted",sourceLatencyMs:123,responseMs:450,renderedMs:510,evidencePackHash:"a".repeat(64),paidPostCount:1,reopenPaidPostCount:0,responseHash:"b".repeat(64),resultHash:"c".repeat(64),analysisEvidenceCaptured:true};
const report = item => ({suites:[{specs:[{tests:[{results:[{annotations:[{type:"quality20-case",description:JSON.stringify(item)}]}]}]}]}]});
const parse = item => quality20CaseObservations(report(item),item.caseId);
assert.deepEqual(parse(current),[current]);
assert.deepEqual(parse({...current,analysisEvidenceCaptured:false}),[{...current,analysisEvidenceCaptured:false}]);
const legacy={...current};delete legacy.responseHash;delete legacy.resultHash;delete legacy.analysisEvidenceCaptured;
assert.deepEqual(parse(legacy),[legacy]);
let checks=3;
for(const caseId of ["A08-D","A09","A12","FA01","FA15"]) {assert.equal(parse({...current,caseId}).length,1);checks++;}
for(const field of ["responseHash","resultHash"]) for(const value of [null,true,123,{},[],"", "x".repeat(64),"A".repeat(64),"a".repeat(63),"a".repeat(65),"Bearer planted-not-a-real-secret"]) {
  assert.throws(()=>parse({...current,[field]:value}),/bounded case evidence/);checks++;
}
for(const value of [null,0,1,"true","false",{},[]]) {assert.throws(()=>parse({...current,analysisEvidenceCaptured:value}),/bounded case evidence/);checks++;}
for(const field of ["responseHash","resultHash","analysisEvidenceCaptured"]) {const bad={...current};delete bad[field];assert.throws(()=>parse(bad),/bounded case evidence/);checks++;}
for(const extra of [{response:{content:"not allowed"}},{result:"not allowed"},{authorization:"planted-not-a-real-secret"},{password:"planted-not-a-real-secret"},{evidence:{anything:true}},{unknown:true}]) {
  assert.throws(()=>parse({...current,...extra}),/bounded case evidence/);checks++;
}
for(const caseId of ["F01","C-RM-01","A00-Q","A09-Q","FA16"]) {assert.throws(()=>parse({...current,caseId}),/bounded case evidence/);checks++;}
for(const [caseId,entryCoverage] of [["F01","find_three_candidate_compare"],["C-RQ-01","create_ui"]]) {
  const item={...legacy,caseId,entryCoverage};assert.deepEqual(parse(item),[item]);checks++;
}
assert.throws(()=>quality20CaseObservations(report(current),"A02-Q"),/bounded case evidence/);checks++;
assert.throws(()=>quality20CaseObservations({type:"quality20-case",description:"{"},"A01-Q"),/Invalid quality20/);checks++;
assert.equal(quality20CaseObservations([report(current),report(current)],"A01-Q").length,1);checks++;
assert.throws(()=>quality20CaseObservations([report(current),report({...current,resultHash:"d".repeat(64)})],"A01-Q"),/ambiguous/);checks++;
const spec=readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts",import.meta.url),"utf8");
assert.match(spec,/responseHash: captured\.responseHash, resultHash: captured\.resultHash/);
assert.match(spec,/analysisEvidenceCaptured: configuration\.quality20AnalysisEvidencePath !== null/);checks+=2;
console.log(`PASS ${checks} bounded observation regressions; three typed metadata fields only, no network/ledger/auth.`);
