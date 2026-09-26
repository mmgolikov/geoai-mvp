// Synthetic source-bound fixtures only. No provider, private evidence or credentials.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw Error('Network forbidden'); };
const oldAction = '      : localized(locale, "Match the community-map object and rendered footprint to an official or client-supplied asset and parcel identifier.", "Сопоставить объект и отображаемый контур открытой карты с официальным или предоставленным клиентом идентификатором объекта и участка."),';
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
        const pattern = /      : geometryRef && \(geometryType === "Polygon" \|\| geometryType === "MultiPolygon"\)[\s\S]*?(?=\n    source: localized\(locale, "Relevant land\/municipality authority)/g;
        const matches = [...source.matchAll(pattern)];
        assert(matches.length <= 1, 'One narrowly scoped copy block only');
        assert(matches.length === 1 || source.includes(oldAction), 'Recognized current or original copy block');
        source = source.replace(pattern, oldAction);
      }
      return { format: 'module', shortCircuit: true, source: stripTypeScriptTypes(source, { mode: 'transform' }) };
    }
    return next(url, c);
  }
});
const core = await import('../src/lib/prototype/point-to-object-ai-core.ts');
const baseline = await import('../src/lib/prototype/point-to-object-ai-core.ts?baseline');
const caveat = 'Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.';
const plan = { decision: { path: 'existing_asset_screen', disposition: 'continue_screening', confidence: 'low', reasonCodes: ['object_identity_available', 'use_classification_available', 'source_is_non_official'] }, signalCodes: ['object_identity', 'use_classification', 'building_form', 'source_limit'], opportunityCodes: ['existing_asset_repositioning', 'technical_reuse_test'], risks: ['non_official_source', 'identity_uncertainty', 'geometry_not_parcel'].map(code => ({ code, severity: 'high', confidence: 'low' })), answerCode: 'source_evidence_only', focusedAnswer: null, caveat };
function pack(kind, reverse = false) {
  const sourceFeatureId = 'node/9001', name = 'Synthetic ticket point', featureClass = 'shop:ticket';
  const geometryType = kind === 'null' ? null : kind === 'unbound' ? 'Polygon' : kind;
  const geometryHash = geometryType ? 'a'.repeat(64) : null;
  const tags = { 'tag.shop': 'ticket' };
  const summary = { radiusM: 400, coverage: 'unavailable', sampleSize: 0, capReached: false, groups: [], mappedBuildingCount: 0, mappedLevelsKnownCount: 0, medianMappedLevels: null, nearestTransitM: null, nearestMajorRoadM: null };
  const receipt = (id, value) => ({ id, label: id, sourceId: sourceFeatureId, value: JSON.stringify(value) });
  return {
    protocol: 'POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2',
    coordinates: { longitude: 103.86, latitude: 1.28, crs: 'EPSG:4326' },
    resolution: { matchMethod: reverse ? 'nominatim_reverse' : 'nominatim_lookup', coordinateAssociation: reverse ? 'reverse_nearest_indexed_object_not_point_in_polygon' : 'trusted_open_map_identity', resultCentroidDistanceM: 0 },
    selectedObject: { sourceFeatureId, name, featureClass, geometryType, geometryHash, tags, metrics: null },
    geoContext: { ...summary, districtCharacter: { code: 'low_signal', confidence: 'low', ruleVersion: 'POINT_OBJECT_DISTRICT_RULE_V1', driverGroups: [] } },
    nearbyContext: [],
    evidence: [{ id: 'EVD-COORDINATES', label: 'point', sourceId: 'user_point', value: JSON.stringify({ longitude: 103.86, latitude: 1.28, crs: 'EPSG:4326' }) }, receipt('EVD-OSM-OBJECT', { sourceFeatureId, name }), receipt('EVD-CLASSIFICATION', { sourceFeatureId, featureClass }),
      receipt('EVD-ALLOWED-FIELDS', { sourceFeatureId, tags }),
      ...(geometryType ? [receipt('EVD-GEOMETRY', { sourceFeatureId, geometryType, geometryHash: kind === 'unbound' ? 'b'.repeat(64) : geometryHash })] : []),
      { id: 'EVD-CONTEXT-SUMMARY', label: 'context', sourceId: 'SPAT-001', value: JSON.stringify(summary) },
      { id: 'EVD-SOURCE', label: 'source', sourceId: 'SPAT-001', value: 'OpenStreetMap ODbL' }]
  };
}
const expected = {
  en: {
    polygon: 'Match the community-map object and mapped footprint to an official or client-supplied asset and parcel identifier.',
    point: 'Match the mapped point or location and object identity to an official or client-supplied asset and parcel identifier. Obtain a verified boundary if area or parcel analysis is needed.',
    reverse: 'Match the selected location and nearest indexed record to the intended real-world asset and an authority- or client-validated parcel record.'
  },
  ru: {
    polygon: 'Сопоставить объект и картированный контур открытой карты с официальным или предоставленным клиентом идентификатором объекта и участка.',
    point: 'Сопоставить точку или местоположение на карте и идентичность объекта с официальным или предоставленным клиентом идентификатором объекта и участка. Если нужен анализ площади или участка, получить подтверждённые границы.',
    reverse: 'Сопоставить выбранную локацию и ближайшую индексированную запись с реальным объектом и участком, подтверждённым органом власти или клиентом.'
  }
};
const question = { en: 'Turn the available evidence into a prioritized due-diligence plan. Explain which unknowns could change the decision most and which sources should be checked first.', ru: 'Составь приоритетный план проверки объекта: какие неизвестные могут изменить решение и какие источники проверить первыми?' };
let checks = 0, baselineFailures = 0;
const failures = [];
for (const locale of ['en', 'ru']) for (const depth of ['quick', 'standard', 'deep'])
  for (const kind of ['Point', 'null', 'LineString', 'unbound', 'Polygon', 'MultiPolygon']) for (const reverse of [false, true]) {
    const p = pack(kind, reverse), before = JSON.stringify(p);
    const request = { locale, depth, goal: 'due_diligence', perspective: 'developer', horizon: 'current', question: question[locale] };
    const prompt = JSON.parse(core.buildPointObjectResponsesRequest(p, request, { model: 'synthetic', maxOutputTokens: 100, reasoningEffort: 'low' }).input[1].content[0].text);
    const policy = prompt.selectionPolicy, counts = prompt.depthContract.reviewCounts;
    const currentPlan = { ...plan, depthPlan: {
      criteriaSignalCodes: policy.eligibleDepthCriteriaCodes.slice(0, counts.criteria),
      alternativePaths: policy.eligibleDepthAlternativePaths.filter(x => x !== plan.decision.path).slice(0, counts.alternatives),
      counterEvidenceRiskCodes: policy.eligibleDepthCounterEvidenceCodes.slice(0, counts.counterEvidence),
      decisionTriggerCodes: policy.eligibleDepthDecisionTriggerCodes.slice(0, counts.decisionTriggers)
    } };
    const got = core.recoverPointObjectAiFocusedContentDetailed(currentPlan, p, request);
    const old = baseline.recoverPointObjectAiFocusedContentDetailed(currentPlan, p, request);
    assert.equal(got.ok, true, `${locale}/${depth}/${kind}/${reverse}: ${got.detail}`);
    assert.equal(old.ok, true, old.detail);
    const branch = reverse ? 'reverse' : ['Polygon', 'MultiPolygon'].includes(kind) ? 'polygon' : 'point';
    const actual = got.content.nextValidation[0].action;
    const initialRequest = { ...request, question: null };
    const initialPlan = { ...currentPlan, answerCode: null, focusedAnswer: null };
    const initial = core.validatePointObjectAiContentDetailed(initialPlan, p, initialRequest);
    const oldInitial = baseline.validatePointObjectAiContentDetailed(initialPlan, p, initialRequest);
    assert.equal(initial.ok, true, initial.detail);
    assert.equal(oldInitial.ok, true, oldInitial.detail);
    assert.equal(initial.content.nextValidation[0].action, actual);
    const normalizedInitial = structuredClone(initial);
    normalizedInitial.content.nextValidation[0].action = oldInitial.content.nextValidation[0].action;
    assert.deepEqual(normalizedInitial, oldInitial, 'Initial full validator differs only in this deterministic action'); checks++;
    assert.deepEqual(core.buildPointObjectResponsesRequest(p, request, {}), baseline.buildPointObjectResponsesRequest(p, request, {}), 'Provider prompt and selection policy unchanged'); checks++;
    if (old.content.nextValidation[0].action !== expected[locale][branch]) baselineFailures++;
    if (actual !== expected[locale][branch]) failures.push(`${locale}/${depth}/${kind}/${reverse}`);
    const normalized = structuredClone(got);
    normalized.content.nextValidation[0].action = old.content.nextValidation[0].action;
    assert.deepEqual(normalized, old, 'Every other output field/validation result remains unchanged'); checks++;
    assert.equal(JSON.stringify(p), before, 'No evidence mutation'); checks++;
    assert.deepEqual(core.buildModelEvidenceProjection(p), baseline.buildModelEvidenceProjection(p), 'Projection/join guards unchanged'); checks++;
    if (kind === 'unbound') { assert.equal(core.buildModelEvidenceProjection(p).selectedObject.geometryType, null); checks++; }
    if (reverse) { assert.deepEqual(got, old, 'Nearest-record branch is byte-identical'); checks++; }
    checks++;
  }
assert.equal(networkCalls, 0); checks++;
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', checks, baselineFailures, desiredCopyFailures: failures, networkCalls }));
assert.equal(failures.length, 0, 'Desired EN/RU Q/S/D next-action copy');
assert.equal(baselineFailures, 36, 'Before-fix reproduction across point/null/line/unbound/polygon/multipolygon × locales/depths');
