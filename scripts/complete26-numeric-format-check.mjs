// Public A01 numbers reproduced in a synthetic bound pack; no private/live input.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error('Network forbidden'); };
registerHooks({
  resolve(s, c, next) {
    if (s.startsWith('@/')) return next(new URL(`../${s.slice(2)}.ts`, import.meta.url).href, c);
    if ((s.startsWith('./') || s.startsWith('../')) && !/\.[cm]?[jt]s$/.test(s)) return next(`${s}.ts`, c);
    return next(s, c);
  },
  load(url, c, next) {
    if (url.startsWith('file:') && url.endsWith('.ts')) {
      let source = readFileSync(fileURLToPath(url), 'utf8');
      if (process.argv.includes('--before') && url.endsWith('/point-to-object-ai-core.ts')) source = execFileSync('git', ['show', '61d333ed210e3b6ffb8ed5448a67ebe78bfab0f9:src/lib/prototype/point-to-object-ai-core.ts'], { encoding: 'utf8' });
      if (url.endsWith('/point-to-object-ai-core.ts')) source += '\nexport { evidenceSupport, validateFocusedAnswer };';
      // Only reuse the existing fixture factory, not its unrelated top-level suite.
      if (url.endsWith('/point-to-object-semantic-v6-check.ts')) source = source.slice(0, source.indexOf('\nconst requests ='));
      return { format: 'module', shortCircuit: true, source: stripTypeScriptTypes(source, { mode: 'transform' }) };
    }
    return next(url, c);
  }
});
const core = await import('../src/lib/prototype/point-to-object-ai-core.ts');
const fixture = await import('./point-to-object-semantic-v6-check.ts');
function pack(area = 2029, nearby = false) {
  const p = fixture.evidencePack(!nearby);
  p.selectedObject.name = 'Synthetic A01 Hotel';
  p.selectedObject.metrics.footprintAreaSqM = area;
  p.selectedObject.metrics.footprintPerimeterM = 223;
  p.selectedObject.tags = { 'tag.building': 'hotel', 'tag.height': '200', 'tag.building:levels': '43', 'tag.start_date': '2003' };
  for (const e of p.evidence) {
    if (e.id === 'EVD-OSM-OBJECT') e.value = JSON.stringify({ sourceFeatureId: p.selectedObject.sourceFeatureId, name: p.selectedObject.name });
    if (e.id === 'EVD-ALLOWED-FIELDS') e.value = JSON.stringify({ sourceFeatureId: p.selectedObject.sourceFeatureId, tags: p.selectedObject.tags });
    if (e.id === 'EVD-OBJECT-METRICS') e.value = JSON.stringify({ sourceFeatureId: p.selectedObject.sourceFeatureId, geometryHash: p.selectedObject.geometryHash, metrics: p.selectedObject.metrics });
  }
  return p;
}
const question = {
  en: 'Build a concise decision-oriented profile of this object. Separate observed map evidence, derived implications and hypotheses, and identify the most material evidence gaps.',
  ru: 'Составь краткий профиль объекта для принятия решения. Раздели наблюдаемые данные, производные выводы и гипотезы; укажи наиболее существенные пробелы в данных.'
};
const request = (locale, depth) => ({ role: 'developer', scenario: 'unspecified', locale, depth, goal: 'object_profile', perspective: 'developer', horizon: 'current', question: question[locale] });
const answer = statement => ({ status: 'partial', scope: 'screening_implication', perspective: 'developer', horizon: 'current', confidence: 'low', statement,
  evidenceRefs: ['EVD-OSM-OBJECT', 'EVD-OBJECT-METRICS', 'EVD-ALLOWED-FIELDS'], missingEvidenceCodes: ['official_identity', 'parcel_boundary', 'title_rights', 'planning_controls', 'physical_baseline', 'current_market', 'cost_financials'], unsupportedReasonCode: null });
const plan = focusedAnswer => ({ decision: { path: 'existing_asset_screen', disposition: 'continue_screening', confidence: 'medium', reasonCodes: ['object_identity_available', 'use_classification_available', 'nearby_context_available'] },
  signalCodes: ['object_identity', 'use_classification', 'building_form', 'address_context'], opportunityCodes: ['existing_asset_repositioning', 'redevelopment_envelope_test'],
  risks: ['non_official_source', 'identity_uncertainty', 'geometry_not_parcel'].map(code => ({ code, severity: 'high', confidence: 'low' })), answerCode: 'source_evidence_only', focusedAnswer,
  caveat: 'Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.' });
const text = (n, locale, unit) => locale === 'en'
  ? `The mapped footprint is ${n} ${unit ?? 'square metres'}, not a parcel area. Verify identity, rights and condition before choosing an asset strategy.`
  : `Площадь контура по карте — ${n} ${unit ?? 'м²'}, это не площадь участка. До выбора стратегии проверьте идентичность, права и состояние.`;
let checks = 0;
function check(statement, locale, depth, expected, p = pack(), detail = 'focused_answer_novel_number', refs = null) {
  const r = request(locale, depth), a = answer(statement), before = JSON.stringify(p);
  if (refs) a.evidenceRefs = refs;
  const payload = JSON.parse(core.buildPointObjectResponsesRequest(p, r, { model: 'synthetic-no-call', reasoningEffort: 'low', verbosity: 'low', maxOutputTokens: 1000 }).input[1].content[0].text);
  const counts = payload.depthContract.reviewCounts, policy = payload.selectionPolicy;
  const currentPlan = { ...plan(a), depthPlan: {
    criteriaSignalCodes: policy.eligibleDepthCriteriaCodes.slice(0, counts.criteria),
    alternativePaths: policy.eligibleDepthAlternativePaths.filter(path => path !== 'existing_asset_screen').slice(0, counts.alternatives),
    counterEvidenceRiskCodes: policy.eligibleDepthCounterEvidenceCodes.slice(0, counts.counterEvidence),
    decisionTriggerCodes: policy.eligibleDepthDecisionTriggerCodes.slice(0, counts.decisionTriggers)
  } };
  for (const result of [core.validateFocusedAnswer(a, r, core.evidenceSupport(p), 'source_evidence_only'), core.validatePointObjectAiContentDetailed(currentPlan, p, r)]) {
    assert.equal(result.ok, expected, `${locale}/${depth}: ${statement}: ${result.detail}`);
    if (!expected) assert.equal(result.detail, detail);
    else {
      assert.equal((result.answer ?? result.content.answerToQuestion).statement, statement.normalize('NFKC').replace(/\s+/g, ' ').trim());
      if (result.content) assert.equal(result.content.depthReview.depth, depth);
    }
    checks++;
  }
  assert.equal(JSON.stringify(p), before);
}
if (process.argv.includes('--metro-repro')) {
  check(text('2029', 'ru', 'квадратных метров'), 'ru', 'quick', true);
  console.log(JSON.stringify({ status: 'PASS', checks, networkCalls, scope: 'RU metre/metro collision only' }));
  process.exit(0);
}
for (const locale of ['en', 'ru']) for (const depth of ['quick', 'standard', 'deep']) {
  for (const n of ['2029', '2 029', '2\u00a0029', '2\u202f029', '2029.0', '+2029', ...(locale === 'en' ? ['2,029', '2,029.00'] : ['2029,0', '2 029,00'])]) check(text(n, locale), locale, depth, true);
  for (const unit of ['m²', 'm2', 'm^2', 'м²']) check(text('2029', locale, unit), locale, depth, true);
  check(text('2029', locale, 'm²').replace('2029 m²', '2029m²'), locale, depth, true);
  for (const n of ['2030', '202.9', '-2029', '−2029', '- 2029', '− 2029', '20,29', '2,02,9', '2 02 9', '2.029.0', '2029e0', '2e3', '2029–2030', '2029-2030', '200–223', '200-223', '2029/2030', '2', '101', ...(locale === 'ru' ? ['2,029'] : ['2029,0'])]) check(text(n, locale), locale, depth, false);
  check(text('2029.01', locale), locale, depth, false);
  check(text('2029', locale), locale, depth, false, pack(20291)); // no substring acceptance
  check(locale === 'en' ? 'Use a 1–3 years planning horizon. Verify identity, rights and condition before choosing an asset strategy.' : 'Горизонт планирования — 1–3 года. До выбора стратегии проверьте идентичность, права и состояние.', locale, depth, true);
}
for (const depth of ['quick', 'standard', 'deep']) {
  for (const unit of ['квадратных метров', 'квадратными метрами', 'квадратным метром']) check(text('2029', 'ru', unit), 'ru', depth, true);
  for (const transit of ['метро', 'метрополитен', 'метростанция']) check(`Объект имеет доступ к ${transit}; перед выбором стратегии проверьте права, идентичность и состояние.`, 'ru', depth, false, pack(), 'focused_answer_context_without_context_receipt');
  check('Metro Gate — точка метро в ограниченной выборке; перед выбором стратегии проверьте права, идентичность и состояние.', 'ru', depth, true, pack(2029, true), undefined, ['EVD-OSM-OBJECT', 'EVD-CONTEXT-1']);
}
for (const name of ['25hours Hotel', 'Tower 1', 'Level 33', 'Высота 33']) {
  const p = pack(); p.selectedObject.name = name;
  p.evidence.find(e => e.id === 'EVD-OSM-OBJECT').value = JSON.stringify({ sourceFeatureId: p.selectedObject.sourceFeatureId, name });
  check(`${name} is the mapped object. Verify identity, rights and condition before choosing an asset strategy.`, 'en', 'standard', true, p);
  if (name === '25hours Hotel') check('125hours Hotel is the mapped object. Verify identity, rights and condition before choosing an asset strategy.', 'en', 'standard', false, p);
}
for (const locale of ['en', 'ru']) for (const n of ['200', '200.0', ...(locale === 'ru' ? ['200,0'] : [])]) {
  const p = pack(), r = { ...request(locale, 'standard'), goal: 'custom', question: locale === 'en' ? 'What is the mapped height?' : 'Какая высота по карте?' };
  const a = { ...answer(`Mapped height: ${n} m. This is an unverified open-map value.`), status: 'answered', scope: 'mapped_form', evidenceRefs: ['EVD-ALLOWED-FIELDS'], missingEvidenceCodes: [] };
  for (const result of [core.validateFocusedAnswer(a, r, core.evidenceSupport(p), 'source_evidence_only'), core.validatePointObjectAiContentDetailed(plan(a), p, r)]) {
    assert.equal(result.ok, true, result.detail); assert.match((result.answer ?? result.content.answerToQuestion).statement, /200/); checks++;
  }
}
for (const locale of ['en', 'ru']) {
  const p = pack();
  const heightText = n => locale === 'en' ? `Mapped height: ${n} m. Verify identity, rights and condition before choosing an asset strategy.` : `Высота по карте: ${n} м. До выбора стратегии проверьте идентичность, права и состояние.`;
  const setHeight = value => {
    p.selectedObject.tags['tag.height'] = value;
    p.evidence.find(e => e.id === 'EVD-ALLOWED-FIELDS').value = JSON.stringify({ sourceFeatureId: p.selectedObject.sourceFeatureId, tags: p.selectedObject.tags });
  };
  setHeight('200.5');
  for (const n of ['200.5', ...(locale === 'ru' ? ['200,5'] : []), '200.500']) check(heightText(n), locale, 'standard', true, p);
  for (const n of ['200', '201', '200.50000000000000001', '-200.5']) check(heightText(n), locale, 'standard', false, p);
  setHeight('-200.5');
  check(heightText('-200.50'), locale, 'standard', true, p);
  check(heightText('200.5'), locale, 'standard', false, p);
  p.selectedObject.tags['tag.start_date'] = '2003-09-04';
  setHeight('200');
  check('The mapped start date is 2003-09-04. Verify identity, rights and condition before choosing an asset strategy.', locale, 'standard', true, p);
  check('The mapped start date is 2003-09-05. Verify identity, rights and condition before choosing an asset strategy.', locale, 'standard', false, p);
}
assert.equal(networkCalls, 0);
console.log(JSON.stringify({ status: 'PASS', checks, networkCalls, scope: 'synthetic source-bound numeric formatting; focused and full validators; not live acceptance' }));
