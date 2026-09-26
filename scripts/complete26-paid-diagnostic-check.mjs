import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analysePaidFailureStage, parseLiveJourneyDiagnostic, LIVE_JOURNEY_DIAGNOSTIC_SCHEMA } from './sprint10-live-journey-diagnostics.mjs';

const cases = [
  [502, {code:'AI_OUTPUT_INVALID',error:'private-sentinel'}, 'analyse_paid_output_invalid'],
  [429, {code:'AI_RATE_LIMITED'}, 'analyse_paid_rate_limited'],
  [409, {code:'AI_EVIDENCE_REFRESH_REQUIRED'}, 'analyse_paid_evidence_expired'],
  [400, {code:'AI_OUTPUT_INVALID'}, 'analyse_paid_http'],
  [502, {code:'AI_RATE_LIMITED'}, 'analyse_paid_http'],
  [502, {code:'__proto__'}, 'analyse_paid_http'],
  [502, {code:'constructor'}, 'analyse_paid_http'],
  [502, {code:'private-sentinel'}, 'analyse_paid_http'],
  [502, null, 'analyse_paid_http'],
  [200, {code:'AI_OUTPUT_INVALID'}, null],
  [200, null, null]
];
for (const [status,payload,stage] of cases) {
  assert.equal(analysePaidFailureStage(status,payload),stage);
  if (stage) {
    const diagnostic={schemaVersion:LIVE_JOURNEY_DIAGNOSTIC_SCHEMA,primaryStatus:'failed',primaryStage:stage,cleanupStage:null,completedSteps:[]};
    assert.deepEqual(parseLiveJourneyDiagnostic(diagnostic),diagnostic);
    assert.doesNotMatch(JSON.stringify(diagnostic),/private-sentinel|__proto__|constructor/);
  }
}
const source=readFileSync(new URL('../tests/e2e/sprint10-live-journey.spec.ts',import.meta.url),'utf8');
const journey=source.split('async function runQuality20Analysis(')[1].split('async function runQuality20Acquisition(')[0];
assert.match(source,/parseSprint10ProviderTelemetry\(item.identity, payload, response.status\(\)\)/);
for (const stage of ['analyse_paid_body','analyse_paid_terminal','analyse_result_contract','analyse_evidence_capture','analyse_rendered_result']) assert(journey.includes(stage));
assert(journey.indexOf('analysePaidFailureStage(response.status(), payload)')<journey.indexOf('await budget.waitForTerminalReceipts()'));
assert(journey.indexOf('guard(response.status() === 200')<journey.indexOf('validateQuality20AnalysisResult'));
assert(journey.indexOf('validateQuality20AnalysisResult')<journey.indexOf('writeQuality20AnalysisEvidence'));
assert.match(journey,/expect\(budget.paidDispatchCount\(\)\).toBe\(before\)/);
console.log('complete26-paid-diagnostic-check: PASS (HTTP rejection distinct from transport/accounting, strict safe stages, result guards retained)');
