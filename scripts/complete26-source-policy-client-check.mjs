// Synthetic compatibility checks; no provider calls or operational state.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
let calls = 0;
globalThis.fetch = async () => { calls++; throw Error('Network forbidden'); };
registerHooks({
  resolve(s, c, next) {
    if (s.startsWith('@/')) return next(new URL(`../${s.slice(2)}.ts`, import.meta.url).href, c);
    if (/^\.\.?\//.test(s) && !/\.[cm]?[jt]s(?:\?|$)/.test(s)) return next(`${s}.ts`, c);
    return next(s, c);
  },
  load(url, c, next) {
    if (url.startsWith('file:') && new URL(url).pathname.endsWith('.ts')) {
      let source = readFileSync(fileURLToPath(url), 'utf8');
      if (new URL(url).search === '?before') {
        // Reconstruct the old parser's exact accepted-version set without
        // modifying other validation or writing a source file.
        source = source.replaceAll('POINT_OBJECT_ANALYSIS_PRE_SOURCE_POLICY_PROMPT_VERSION', 'POINT_OBJECT_ANALYSIS_PROMPT_VERSION');
        source = source.replace(/import \{\n  POINT_OBJECT_ANALYSIS_LEGACY_PROMPT_VERSION,[\s\S]*?\} from "@\/components\/point-to-object\/live-types";/,
          readFileSync(new URL('../components/point-to-object/live-types.ts', import.meta.url), 'utf8')
            .split('\n').filter(line => /^export const POINT_OBJECT_ANALYSIS_/.test(line) && !line.includes('PRE_SOURCE_POLICY')).join('\n')
            .replaceAll('export const', 'const').replaceAll('POINT_OBJECT_AI_PROMPT_V14_2026_09_26', 'POINT_OBJECT_AI_PROMPT_V13_2026_09_26'));
      }
      return { format: 'module', shortCircuit: true, source: stripTypeScriptTypes(source, { mode: 'transform' }) };
    }
    return next(url, c);
  }
});
const current = await import('../components/point-to-object/live-session.ts');
const before = await import('../components/point-to-object/live-session.ts?before');
const { parseSavedPointObjectArtifact } = await import('../src/lib/prototype/point-object-projects-contract.ts');
const f = await import('../tests/e2e/helpers/sprint10-analysis-fixture.ts');
const types = await import('../components/point-to-object/live-types.ts');
const versions = ['POINT_OBJECT_AI_PROMPT_V14_2026_09_26', 'POINT_OBJECT_AI_PROMPT_V13_2026_09_26',
  'POINT_OBJECT_AI_PROMPT_V12_2026_09_21', 'POINT_OBJECT_AI_PROMPT_V11_2026_09_20',
  'POINT_OBJECT_AI_PROMPT_V10_2026_09_18', 'POINT_OBJECT_AI_PROMPT_V9_2026_09_12'];
assert.equal(types.POINT_OBJECT_ANALYSIS_PROMPT_VERSION, versions[0]);
assert.equal(types.POINT_OBJECT_ANALYSIS_PRE_SOURCE_POLICY_PROMPT_VERSION, versions[1]);
let checks = 2, beforeFailures = 0;
for (const locale of ['en', 'ru']) for (const depth of ['quick', 'standard', 'deep']) {
  const request = { role: 'developer', scenario: 'unspecified', depth, goal: 'custom',
    perspective: 'developer', horizon: 'current', question: 'Which mapped facts are available?', locale };
  for (const version of versions) for (const kind of [null, 'model_validated', 'deterministic_recovery']) {
    const response = f.sprint10AnalysisResponse(request, 1, f.SPRINT10_FIXTURE_EVIDENCE_PACK_HASH, version);
    if (kind) response.answerProvenance = { kind, rejectionCode: kind === 'model_validated' ? null : 'focused_answer_novel_number' };
    const bytes = JSON.stringify(response), parsed = current.parsePointObjectAiResponse(response);
    assert(parsed, `${locale}/${depth}/${version}/${kind}`);
    assert.equal(parsed.telemetry.promptVersion, version);
    assert.deepEqual(parsed.content, response.content);
    assert.deepEqual(parsed.answerProvenance, response.answerProvenance);
    assert.equal(JSON.stringify(response), bytes);
    const old = before.parsePointObjectAiResponse(response);
    if (version === versions[0]) { assert.equal(old, null); beforeFailures++; }
    else assert.deepEqual(old, parsed);
    const selected = f.sprint10SelectionWithReceipt(f.sprint10Selection, locale);
    const artifact = parseSavedPointObjectArtifact({ schemaVersion: 1, artifactId: 'artifact_offline',
      idempotencyKey: 'operation_offline', payloadHash: 'a'.repeat(64), completedAt: response.generatedAt,
      updatedAt: response.generatedAt, viewRevision: 0, kind: 'analyse', locale, marketKey: 'dubai',
      label: 'Offline retained-version check', payload: { selection: selected, analysis: response } });
    assert(artifact, 'Saved/cloud contract preserves the version');
    assert.equal(artifact.payload.analysis.telemetry.promptVersion, version);
    for (const mutate of [r => r.telemetry.promptVersion = 'POINT_OBJECT_AI_PROMPT_V999',
      r => r.request.depth = depth === 'deep' ? 'quick' : 'deep',
      r => r.answerProvenance = { kind: 'deterministic_recovery', rejectionCode: 'invented' }]) {
      const invalid = structuredClone(response); mutate(invalid);
      assert.equal(current.parsePointObjectAiResponse(invalid), null);
    }
    checks += 11;
  }
}
assert.equal(calls, 0);
assert.equal(beforeFailures, 18);
console.log(JSON.stringify({ status: 'PASS', checks, beforeV14Rejected: beforeFailures, networkCalls: calls,
  scope: 'EN/RU QSD V9-V14 legacy/current content/provenance and saved-artifact parsing; not hosted persistence' }));
