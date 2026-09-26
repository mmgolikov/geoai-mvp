// Copy-only regression. Synthetic evidence; no API, credentials or browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error('Network forbidden'); };
const titles = {
  existing_asset_screen: ['Existing-asset review', 'Проверка существующего актива', 'Alternative: existing-asset screen', 'Альтернатива: скрининг существующего актива'],
  identity_first_due_diligence: ['Identity-first review', 'Проверка идентичности', 'Alternative: identity-first review', 'Альтернатива: сначала идентичность'],
  planning_first_due_diligence: ['Planning-first review', 'Проверка градостроительных условий', 'Alternative: planning-first review', 'Альтернатива: сначала планирование'],
  technical_baseline_first: ['Technical-baseline review', 'Проверка технического базиса', 'Alternative: technical-baseline review', 'Альтернатива: сначала технический базис'],
  insufficient_open_context: ['Hold for evidence', 'Ожидание подтверждающих данных', 'Alternative: hold for evidence', 'Альтернатива: пауза до получения данных']
};
registerHooks({
  resolve(s, c, next) {
    if (s.startsWith('@/')) return next(new URL(`../${s.slice(2)}.ts`, import.meta.url).href, c);
    if ((s.startsWith('./') || s.startsWith('../')) && !/\.[cm]?[jt]s(?:\?|$)/.test(s)) return next(`${s}.ts`, c);
    return next(s, c);
  },
  load(url, c, next) {
    if (url.startsWith('file:') && new URL(url).pathname.endsWith('.ts')) {
      let source = readFileSync(fileURLToPath(url), 'utf8');
      if (new URL(url).pathname.endsWith('/point-to-object-ai-core.ts')) {
        if (new URL(url).search === '?old-copy') for (const labels of Object.values(titles)) {
          for (let i = 0; i < 2; i++) source = source.replace(`title: ${JSON.stringify(labels[i])}`, `title: ${JSON.stringify(labels[i + 2])}`);
        }
        source += '\nexport { renderDepthAlternative };';
      }
      return { format:'module', shortCircuit:true, source:stripTypeScriptTypes(source, { mode:'transform' }) };
    }
    return next(url, c);
  }
});
const core = await import('../src/lib/prototype/point-to-object-ai-core.ts');
const oldCopy = await import('../src/lib/prototype/point-to-object-ai-core.ts?old-copy');
const ui = readFileSync(new URL('../components/point-to-object/decision-cards.tsx', import.meta.url), 'utf8');
assert.equal(/alternatives: ru \? "Направления проверки" : "Validation paths"/.test(ui), true, 'EN/RU heading must identify validation paths');
assert.doesNotMatch(ui, /Alternatives to validate|Альтернативы для проверки/);
const support = {classificationRef:'EVD-CLASSIFICATION',attributesRef:'EVD-ALLOWED-FIELDS',geometryRef:'EVD-GEOMETRY',objectRef:'EVD-OSM-OBJECT',sourceStatusRef:'EVD-SOURCE',coordinateRef:'EVD-COORDINATES',hasBuildingAttributes:true,hasBuildingGeometry:true};
let checks = 1;
for (const [path, labels] of Object.entries(titles)) for (const locale of ['en','ru']) for (const depth of ['quick','standard','deep']) {
  const request = {locale,depth};
  const current = core.renderDepthAlternative(path, support, request);
  const previous = oldCopy.renderDepthAlternative(path, support, request);
  assert.equal(current.title, labels[locale === 'ru' ? 1 : 0]);
  assert.equal(previous.title, labels[locale === 'ru' ? 3 : 2]);
  const {title: ignoredCurrent, ...currentEvidence} = current;
  const {title: ignoredPrevious, ...previousEvidence} = previous;
  assert.deepEqual(currentEvidence, previousEvidence, 'Rationale, conditions, evidence class and refs must be unchanged');
  assert.equal(current.evidenceClass, 'hypothesis');
  assert.ok(current.evidenceRefs.length > 0);
  assert.doesNotMatch(current.title, /Alternative|Альтернатив|retain|adapt|replace/i);
  checks++;
}
const { pointObjectAnalysisDepthContract } = await import('../src/lib/prototype/point-to-object-analysis-depth-contract.ts');
assert.deepEqual(['quick','standard','deep'].map(d=>pointObjectAnalysisDepthContract(d).reviewCounts.alternatives), [0,1,2]);
checks++;
const { sprint10AnalysisResponse } = await import('../tests/e2e/helpers/sprint10-analysis-fixture.ts');
const { parsePointObjectAiResponse } = await import('../components/point-to-object/live-session.ts');
for (const locale of ['en','ru']) {
  const response = sprint10AnalysisResponse({depth:'deep',goal:'object_profile',perspective:'developer',horizon:'current',locale,question:null}, 1, 'a'.repeat(64), core.POINT_OBJECT_AI_PROMPT_VERSION);
  assert.ok(parsePointObjectAiResponse(response));
  for (const implementation of [oldCopy,core]) {
    response.content.depthReview.alternatives = ['identity_first_due_diligence','technical_baseline_first'].map(path=>implementation.renderDepthAlternative(path,support,{locale,depth:'deep'}));
    const parsed = parsePointObjectAiResponse(response);
    assert.ok(parsed, 'Historical and current saved titles must remain accepted');
    assert.deepEqual(parsed.content.depthReview.alternatives, response.content.depthReview.alternatives);
    checks++;
  }
}
assert.equal(networkCalls, 0);
console.log(JSON.stringify({status:'PASS',checks,networkCalls,scope:'validation-path labels only; not asset-strategy comparison'}));
