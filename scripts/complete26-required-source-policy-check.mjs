// Offline synthetic contract checks: no credentials, private evidence or provider calls.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw Error('Network forbidden'); };
registerHooks({
  resolve(s, c, next) {
    if (s.startsWith('@/')) return next(new URL(`../${s.slice(2)}.ts`, import.meta.url).href, c);
    if (/^\.\.?\//.test(s) && !/\.[cm]?[jt]s(?:\?|$)/.test(s)) return next(`${s}.ts`, c);
    return next(s, c);
  },
  load(url, c, next) {
    if (url.startsWith('file:') && new URL(url).pathname.endsWith('.ts')) {
      let source = readFileSync(fileURLToPath(url), 'utf8');
      if (new URL(url).search === '?baseline') {
        source = source.replace('POINT_OBJECT_AI_PROMPT_V14_2026_09_26', 'POINT_OBJECT_AI_PROMPT_V13_2026_09_26')
          .replace(/^          requiredMissingEvidenceCodes: .*\n/m, '')
          .replace(/^          requiredMissingEvidenceRule: .*\n/m, '');
      }
      return { format: 'module', shortCircuit: true, source: stripTypeScriptTypes(source, { mode: 'transform' }) };
    }
    return next(url, c);
  }
});
const core = await import('../src/lib/prototype/point-to-object-ai-core.ts');
const baseline = await import('../src/lib/prototype/point-to-object-ai-core.ts?baseline');
const caveat = 'Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.';
const sourceFeatureId = 'way/9001', name = 'Synthetic residences', featureClass = 'building:residential';
const tags = { 'tag.building': 'residential', 'tag.height': '245', 'tag.building:levels': '54' };
const geometryHash = 'a'.repeat(64), coordinates = { longitude: 103.85, latitude: 1.28, crs: 'EPSG:4326' };
const receipt = (id, value) => ({ id, label: id, sourceId: sourceFeatureId, value: JSON.stringify(value) });
const nearby = { evidenceId: 'EVD-CONTEXT-1', sourceFeatureId: 'node/9002', name: 'Synthetic Park', categories: ['leisure:park'], featureClass: 'leisure:park', distanceM: 87, method: 'overpass_around_query_element_center_haversine', proofLimit: 'bounded' };
const pack = { protocol: 'POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2', coordinates,
  selectedObject: { sourceFeatureId, name, featureClass, geometryType: 'Polygon', geometryHash, tags },
  nearbyContext: [nearby],
  evidence: [{ ...receipt('EVD-COORDINATES', coordinates), sourceId: 'user_point' },
    receipt('EVD-OSM-OBJECT', { sourceFeatureId, name }), receipt('EVD-CLASSIFICATION', { sourceFeatureId, featureClass }),
    receipt('EVD-ALLOWED-FIELDS', { sourceFeatureId, tags }), receipt('EVD-GEOMETRY', { sourceFeatureId, geometryType: 'Polygon', geometryHash }),
    receipt('EVD-SOURCE', 'OpenStreetMap ODbL'),
    { ...receipt(nearby.evidenceId, { sourceFeatureId: nearby.sourceFeatureId, name: nearby.name, categories: nearby.categories, featureClass: nearby.featureClass, distanceM: nearby.distanceM, method: nearby.method }), sourceId: nearby.sourceFeatureId, label: nearby.name }] };
const questions = {
  // Exact recorded English A10 question; Russian is a synthetic translation, not a hosted request.
  en: 'What does the mapped evidence establish about Marina Bay Residences as a residential asset and its surrounding services and access? Separate source-reported height and levels from derived implications. Do not infer unit prices, ownership, vacancy, demand or investment returns.',
  ru: 'Что устанавливают картографические данные о Marina Bay Residences как жилом объекте, услугах окружения и доступе? Отдели высоту и этажность из источника от выводов. Не делай выводов о ценах квартир, собственности, вакантности, спросе или доходности инвестиций.'
};
const missing = ['title_rights', 'official_identity', 'current_market', 'cost_financials'];
const profile = { model: 'synthetic-only', maxOutputTokens: 5500, reasoningEffort: 'medium', verbosity: 'medium' };
const user = body => JSON.parse(body.input[1].content[0].text);
function plan(request, answer) {
  const prompt = user(core.buildPointObjectResponsesRequest(pack, request, profile));
  const p = prompt.selectionPolicy, n = prompt.depthContract.reviewCounts;
  return { decision: { path: 'existing_asset_screen', disposition: 'continue_screening', confidence: 'low', reasonCodes: p.eligibleReasonCodes },
    signalCodes: p.eligibleSignalCodes, opportunityCodes: p.eligibleOpportunityCodes,
    risks: p.eligibleRiskCodes.map(code => ({ code, severity: 'high', confidence: 'low' })),
    depthPlan: { criteriaSignalCodes: p.eligibleDepthCriteriaCodes.slice(0, n.criteria),
      alternativePaths: p.eligibleDepthAlternativePaths.filter(x => x !== 'existing_asset_screen').slice(0, n.alternatives),
      counterEvidenceRiskCodes: p.eligibleDepthCounterEvidenceCodes.slice(0, n.counterEvidence),
      decisionTriggerCodes: p.eligibleDepthDecisionTriggerCodes.slice(0, n.decisionTriggers) },
    answerCode: request.question ? 'source_evidence_only' : null, focusedAnswer: answer, caveat };
}
let checks = 0, baselineMissingPolicies = 0;
const failures = [];
for (const locale of ['en', 'ru']) for (const depth of ['quick', 'standard', 'deep']) {
  const request = { locale, depth, goal: 'custom', perspective: 'developer', horizon: 'current', question: questions[locale] };
  for (const [question, expected] of [[questions[locale], missing], [locale === 'en' ? 'What is the height?' : 'Какая высота?', []], [null, []]]) {
    const r = { ...request, question };
    for (const repair of [null, 'focused_answer_missing_source_gate']) {
      const args = [pack, r, profile, repair ? 'EVIDENCE_INSUFFICIENT' : null, repair];
      const body = core.buildPointObjectResponsesRequest(...args), before = baseline.buildPointObjectResponsesRequest(...args);
      const data = user(body), previous = user(before);
      assert.equal(previous.validationPolicy.requiredMissingEvidenceCodes, undefined); baselineMissingPolicies++;
      if (JSON.stringify(data.validationPolicy.requiredMissingEvidenceCodes) !== JSON.stringify(expected)) failures.push(`${locale}/${depth}/${question === null ? 'initial' : expected.length ? 'A10' : 'height'}/${repair ?? 'first'}`);
      if (typeof data.validationPolicy.requiredMissingEvidenceRule === 'string') {
        assert.match(data.validationPolicy.requiredMissingEvidenceRule, /include every code/);
        assert.match(data.validationPolicy.requiredMissingEvidenceRule, /nonempty.*do not use answered/);
      } else failures.push(`${locale}/${depth}/missing-explicit-rule`);
      delete data.validationPolicy.requiredMissingEvidenceCodes;
      delete data.validationPolicy.requiredMissingEvidenceRule;
      data.promptVersion = previous.promptVersion;
      const normalized = structuredClone(body); normalized.input[1].content[0].text = JSON.stringify(data);
      assert.deepEqual(normalized, before, 'Only version and the two declared policy fields may change the full provider request'); checks++;
      assert.equal(user(body).validationPolicy.canonicalDirectAttribute, question !== null && expected.length === 0); checks++;
    }
  }
  const answer = { status: 'partial', scope: 'mapped_form', perspective: 'developer', horizon: 'current', confidence: 'low',
    statement: locale === 'en' ? 'The mapped residential record reports a height of 245 and 54 building levels; these open-map attributes are not independently verified. The bounded nearby sample includes Synthetic Park.' : 'Картированная жилая запись содержит высоту 245 и этажность 54; эти атрибуты открытой карты не проверены независимо. Ограниченная выборка окружения включает Synthetic Park.',
    evidenceRefs: ['EVD-ALLOWED-FIELDS', nearby.evidenceId], missingEvidenceCodes: missing, unsupportedReasonCode: null };
  const validate = a => core.validatePointObjectAiContentDetailed(plan(request, a), pack, request);
  const valid = validate(answer); assert.equal(valid.ok, true, valid.detail);
  assert.equal(valid.content.answerToQuestion.statement, answer.statement, 'Honest authored custom answer remains intact'); checks++;
  assert.deepEqual(valid, baseline.validatePointObjectAiContentDetailed(plan(request, answer), pack, request)); checks++;
  for (const code of missing) {
    const bad = { ...answer, missingEvidenceCodes: missing.filter(x => x !== code) };
    assert.equal(validate(bad).detail, 'focused_answer_missing_source_gate'); checks++;
  }
  for (const [bad, detail] of [
    [{ ...answer, status: 'answered' }, 'focused_answer_overclaims_available_sources'],
    [{ ...answer, statement: answer.statement.replace('245', '987654321') }, 'focused_answer_novel_number'],
    [{ ...answer, evidenceRefs: ['EVD-NOT-PRESENT'] }, 'focused_answer_ref_unbound']
  ]) { const result = validate(bad); assert.equal(result.ok, false); assert.equal(result.detail, detail); assert.deepEqual(result, baseline.validatePointObjectAiContentDetailed(plan(request, bad), pack, request)); checks++; }
  const narrowRequest = { ...request, question: locale === 'en' ? 'What is the height?' : 'Какая высота?' };
  const narrow = { ...answer, status: 'answered', statement: '245', missingEvidenceCodes: [] };
  const value = plan(narrowRequest, narrow);
  const actual = core.validatePointObjectAiContentDetailed(value, pack, narrowRequest);
  assert.equal(actual.ok, true, actual.detail);
  assert.deepEqual(actual, baseline.validatePointObjectAiContentDetailed(value, pack, narrowRequest)); checks++;
  const initialRequest = { ...request, question: null }, initial = plan(initialRequest, null);
  assert.deepEqual(core.validatePointObjectAiContentDetailed(initial, pack, initialRequest), baseline.validatePointObjectAiContentDetailed(initial, pack, initialRequest)); checks++;
}
assert.equal(networkCalls, 0); checks++;
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', checks, baselineMissingPolicies, desiredPolicyFailures: failures, networkCalls }));
assert.equal(failures.length, 0, 'Explicit required-source policy must exist in first/repair requests, including empty initial/narrow policy');
assert.equal(core.POINT_OBJECT_AI_PROMPT_VERSION, 'POINT_OBJECT_AI_PROMPT_V14_2026_09_26');
