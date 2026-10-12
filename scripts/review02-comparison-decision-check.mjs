import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { isBuiltin, registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

// Pure local complement checks. Synthetic saved fixtures are not provider
// results. Optional real export is read-only; no journal, UI, fetch or stubs.
const root = new URL("../", import.meta.url), graph = new Set();
registerHooks({
  resolve(specifier, context, next) {
    if (isBuiltin(specifier) || specifier.startsWith("node:") || specifier === "server-only") throw new Error(`Server runtime in comparison decision graph: ${specifier}`);
    const resolved = specifier.startsWith("@/") ? next(new URL(`${specifier.slice(2)}.ts`, root).href, context) :
      (specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier) ? next(`${specifier}.ts`, context) : next(specifier, context);
    if (resolved.url.startsWith(root.href)) graph.add(resolved.url.slice(root.href.length));
    return resolved;
  },
  load(url, context, next) {
    if (url.startsWith("file:") && url.endsWith(".ts")) return { format: "module", shortCircuit: true, source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url }) };
    return next(url, context);
  }
});
let checks = 0, networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { networkCalls++; throw new Error("No requests permitted in comparison decision checks"); };
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const ok = (condition, label) => { assert.ok(condition, label); checks++; };
const copy = value => structuredClone(value);
function freeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

try {
  const { buildComparisonDecision: decide } = await import(new URL("src/lib/prototype/point-to-object-comparison-decision.ts", root).href);
  const { CONTEXT_GROUPS, normalizedResolvedContext } = await import(new URL("src/lib/prototype/point-to-object-normalized-context.ts", root).href);
  const { LIVE_POINT_CAVEAT } = await import(new URL("src/lib/point-to-object/contracts.ts", root).href);
  ok(![...graph].some(path => /(?:hash|live-evidence|ai-server)\.ts$/.test(path)), "real client helper graph imports no server evidence or hash runtime");
  const stamp = Date.parse("2026-10-12T14:39:00.000Z"), iso = milliseconds => new Date(milliseconds).toISOString();
  function fixture(locale = "en") {
    const candidates = [0, 1].map(index => ({ sourceFeatureId: `way/${index + 1}`, label: index ? "Candidate B" : "Candidate A", longitude: 55.28 + index / 1000, latitude: 25.22 }));
    const contexts = {};
    const counts = [[12,5,4,16,0,3,1,10,14,5,0,0,56], [2,13,5,18,0,1,2,10,25,23,0,1,76]];
    for (let index = 0; index < 2; index++) {
      const candidate = candidates[index], created = stamp + index * 4_000;
      const nearest = { retail_daily_needs: index ? 57 : 13, transport: index ? 223 : 94, commercial: index ? 0 : 166 };
      const geoContext = { coverage: "available", radiusM: 400, sampleSize: counts[index].reduce((sum, value) => sum + value, 0), capReached: false,
        groups: CONTEXT_GROUPS.map((group, item) => ({ group, count: counts[index][item], sharePct: Math.round(counts[index][item] / (index ? 176 : 126) * 1000) / 10, nearestDistanceM: counts[index][item] ? nearest[group] ?? 100 : null })),
        mappedBuildingCount: 0, mappedLevelsKnownCount: 0, medianMappedLevels: null, nearestTransitM: nearest.transport, nearestMajorRoadM: 100, districtCharacter: null };
      const context = { sourceFeatureId: candidate.sourceFeatureId, name: candidate.label, coordinateAssociation: "trusted_open_map_identity", geoContext,
        evidenceReceipt: { version: "PUBLIC_EVIDENCE_LEASE_V1", evidencePackHash: (index ? "b" : "a").repeat(64), sourceResponseHash: (index ? "d" : "c").repeat(64), acquiredAt: iso(created), createdAt: iso(created), expiresAt: iso(created + 900_000), cacheWindow: Math.floor(created / 900_000), sourceLocale: locale === "ru" ? "ru,en" : "en", lookupSourceFeatureId: candidate.sourceFeatureId } };
      const normalized = normalizedResolvedContext(context, [candidate.longitude, candidate.latitude]);
      normalized.source = { ...normalized.source, responseHash: (index ? "f" : "e").repeat(64), acquiredAt: iso(created + 1_000), observedAt: iso(stamp - 1_000) };
      context.normalizedContext = normalized; contexts[candidate.sourceFeatureId] = context;
    }
    const intent = { locale, role: "developer", scenario: "redevelopment" };
    const insight = { mode: "openai_comparison", version: "POINT_OBJECT_COMPARISON_V1", generatedAt: iso(stamp + 30_000), ...intent,
      snapshots: candidates.map(candidate => ({ sourceFeatureId: candidate.sourceFeatureId, label: candidate.label, evidencePackHash: contexts[candidate.sourceFeatureId].evidenceReceipt.evidencePackHash })),
      summary: { statement: "Synthetic fixture comparison of held context observations.", evidenceRefs: ["way/1:identity", "way/2:identity"] },
      differences: ["retail_daily_needs.count", "transport.nearest"].map(metric => ({ statement: "Synthetic fixture contrast; verify actual functions before any decision.", evidenceRefs: [`way/1:${metric}`, `way/2:${metric}`] })),
      checks: candidates.map(candidate => ({ candidateId: candidate.sourceFeatureId, action: "Synthetic fixture check of actual entrances and operating functions.", evidenceRefs: [`${candidate.sourceFeatureId}:identity`] })),
      telemetry: { provider: "openai", model: "gpt-5.6-sol", requestId: null, latencyMs: 1, attempts: 1, inputTokens: null, outputTokens: null, totalTokens: null, stored: false, toolCalls: 0 }, caveat: LIVE_POINT_CAVEAT };
    return { intent, candidates, contexts, insight };
  }
  const run = fixture => decide(fixture.insight, fixture.intent, fixture.candidates, fixture.contexts, fixture.stale);
  const f = fixture(), positive = run(f);
  ok(positive, "exact ordered held synthetic comparison binds");
  equal(positive.method, "held_sample_decision_checks_not_ai", "complement never claims to be a new AI result");
  equal(positive.candidates.map(candidate => candidate.daily), [{ count: 16, denominator: 126, sharePct: 12.7, nearestM: 13 }, { count: 18, denominator: 176, sharePct: 10.2, nearestM: 57 }], "count/share/denominator/proximity stay separate");
  equal(positive.candidates.map(candidate => candidate.business.sharePct), [4, 7.4], "business shares derive from explicit returned-record denominators");
  ok(positive.countShareContrast.includes("opposite directions") && positive.countShareContrast.includes("Candidate B") && positive.countShareContrast.includes("Candidate A"), "opposite count/share direction is explicit");
  ok(positive.visitCondition.includes("Candidate A") && positive.visitCondition.includes("only if") && positive.visitCondition.includes("barrier changes"), "conditional first entrance check is not unconditional ranking");
  ok(positive.candidates[0].accessCheck.includes("13 m") && positive.candidates[0].accessCheck.includes("94 m"), "A next check is candidate-specific and quantified");
  ok(positive.candidates[1].accessCheck.includes("57 m") && positive.candidates[1].accessCheck.includes("223 m"), "B next check is candidate-specific and quantified");
  ok(positive.candidates[1].businessCheck.includes("13 OSM") && positive.candidates[1].businessCheck.includes("broader than offices"), "business definition is not silently reduced to offices/demand");
  const ru = run(fixture("ru")); ok(ru && ru.visitCondition.includes("только если") && ru.countShareContrast.includes("противоположно"), "RU calculated complement preserves conditions and opposing directions");
  for (const edit of [
    x => { x.stale = true; }, x => { x.insight = null; }, x => { x.intent.locale = "ru"; }, x => { x.intent.role = "investor"; }, x => { x.intent.scenario = "other"; },
    x => { x.candidates.reverse(); }, x => { x.insight.snapshots.reverse(); }, x => { x.candidates[1] = copy(x.candidates[0]); },
    x => { delete x.contexts["way/1"]; }, x => { x.contexts["way/1"].sourceFeatureId = "way/2"; }, x => { x.contexts["way/1"].name = "Changed held label"; },
    x => { x.contexts["way/1"].coordinateAssociation = "nearest_poi"; }, x => { x.contexts["way/1"].evidenceReceipt.evidencePackHash = "9".repeat(64); },
    x => { x.contexts["way/1"].evidenceReceipt.lookupSourceFeatureId = "way/2"; }, x => { x.contexts["way/1"].evidenceReceipt.sourceLocale = "ru,en"; },
    x => { delete x.contexts["way/1"].normalizedContext; }, x => { x.contexts["way/1"].normalizedContext.source.responseHash = null; },
    x => { x.contexts["way/1"].normalizedContext.scope.anchor[0] += 0.001; }, x => { x.contexts["way/1"].normalizedContext.subjectId = "way/2"; },
    x => { x.contexts["way/1"].normalizedContext.source.acquiredAt = iso(stamp + 60_000); },
    x => { x.contexts["way/1"].normalizedContext.metrics.find(metric => metric.id === "retail_daily_needs.count").method = "share_of_returned_features"; },
    x => { x.contexts["way/1"].geoContext.groups.find(group => group.group === "retail_daily_needs").count++; },
    x => { x.contexts["way/1"].normalizedContext.sampleSize = null; }, x => { x.contexts["way/1"].normalizedContext.scope.radiusM = 500; },
    x => { x.contexts["way/1"].geoContext.capReached = true; x.contexts["way/1"].normalizedContext.capReached = true; x.contexts["way/1"].normalizedContext.coverage = "partial"; },
    x => { x.contexts["way/1"].geoContext.sampleSize++; },
    x => { x.contexts["way/1"].normalizedContext.source.acquiredAt = iso(stamp - 901_000); },
    x => { x.contexts["way/1"].normalizedContext.source.observedAt = iso(stamp - 902_000); }
  ]) { const bad = copy(f); edit(bad); equal(run(bad), null, "missing/stale/mismatched/capped/unknown/unequal-method sample emits no complement facts/actions or ranking"); }
  const bothFutureObservations = copy(f);
  for (const context of Object.values(bothFutureObservations.contexts)) context.normalizedContext.source.observedAt = iso(stamp + 60_000);
  equal(run(bothFutureObservations), null, "aligned future observations after acquisition and AI generation emit no facts/actions");
  const oneFutureObservation = copy(f); oneFutureObservation.contexts["way/1"].normalizedContext.source.observedAt = iso(stamp + 60_000);
  equal(run(oneFutureObservation), null, "one future observation after its own acquisition emits no facts/actions");
  const beforeAiButAfterAcquisition = copy(f); beforeAiButAfterAcquisition.contexts["way/1"].normalizedContext.source.observedAt = iso(stamp + 10_000);
  equal(run(beforeAiButAfterAcquisition), null, "observation before AI generation but after own acquisition still fails closed");
  const equalObservationAndAcquisition = copy(f);
  for (const context of Object.values(equalObservationAndAcquisition.contexts)) context.normalizedContext.source.observedAt = context.normalizedContext.source.acquiredAt;
  ok(run(equalObservationAndAcquisition), "observation equal to own acquisition is valid");
  const unknownObservations = copy(f);
  for (const context of Object.values(unknownObservations.contexts)) context.normalizedContext.source.observedAt = null;
  ok(run(unknownObservations), "unknown observation timestamps remain allowed historical evidence, not current-data proof");
  const oneUnknownObservation = copy(f); oneUnknownObservation.contexts["way/1"].normalizedContext.source.observedAt = null;
  ok(run(oneUnknownObservation), "one unknown observation timestamp remains allowed without inventing a date");
  const unknown = copy(f);
  unknown.contexts["way/1"].normalizedContext.metrics.find(metric => metric.id === "transport.nearest").value = null;
  unknown.contexts["way/1"].normalizedContext.metrics.find(metric => metric.id === "transport.nearest").status = "unknown";
  unknown.contexts["way/1"].geoContext.groups.find(group => group.group === "transport").nearestDistanceM = null;
  unknown.contexts["way/1"].geoContext.nearestTransitM = null;
  const noDistancePriority = run(unknown); ok(noDistancePriority, "bound sample counts remain observable when one distance is unknown");
  equal(noDistancePriority.candidates[0].transit.nearestM, null, "unknown nearest distance stays null, never zero");
  ok(noDistancePriority.candidates[0].accessCheck.includes("unknown") && noDistancePriority.visitCondition.includes("not determine it unambiguously"), "unknown proximity cannot select first site visit");
  const tie = copy(f);
  for (const group of ["transport", "retail_daily_needs"]) {
    const value = tie.contexts["way/1"].normalizedContext.metrics.find(metric => metric.id === `${group}.nearest`).value;
    tie.contexts["way/2"].normalizedContext.metrics.find(metric => metric.id === `${group}.nearest`).value = value;
    tie.contexts["way/2"].geoContext.groups.find(item => item.group === group).nearestDistanceM = value;
  }
  ok(run(tie).visitCondition.includes("not determine it unambiguously"), "distance ties cannot invent a first candidate");
  const immutable = copy(f), before = JSON.stringify(immutable); freeze(immutable); run(immutable); equal(JSON.stringify(immutable), before, "saved AI prose/telemetry and sources remain byte-equivalent under pure call");
  const dashboard = readFileSync(new URL("components/point-to-object/find-comparison-dashboard.tsx", root), "utf8");
  ok(dashboard.includes("{matchedInsight.summary.statement}") && dashboard.includes("{difference.statement}") && dashboard.includes("{matchedInsight.telemetry.model}"), "existing immutable AI rendering is retained");
  ok(dashboard.includes('data-testid="comparison-decision-complement"') && dashboard.includes('data-method={decision.method}') && dashboard.includes("the saved AI response above is unchanged"), "visible complement is explicitly separate from saved AI prose");
  ok(dashboard.includes("metric.count}/{metric.denominator}") && dashboard.includes("not density or capacity") && dashboard.includes("not a route or walking time"), "visible numeric definitions and limits are explicit");
  const exportFlag = process.argv.indexOf("--saved-export"); let real = null;
  if (exportFlag !== -1) {
    const path = process.argv[exportFlag + 1]; assert.ok(path && /REVIEW02_COMPARE_PAID_RESULT_20261012\.json$/.test(path), "only named public Compare result export is permitted"); assert.ok(statSync(path).size <= 8 * 1024 * 1024, "bounded public export read");
    const saved = JSON.parse(readFileSync(path, "utf8")), record = saved.records.find(item => item.operation === "compare"), before = JSON.stringify(saved); freeze(saved);
    const candidates = record.response.snapshots.map(snapshot => record.sourceSnapshot.cohort.candidates.find(candidate => candidate.sourceFeatureId === snapshot.sourceFeatureId));
    const contexts = Object.fromEntries(record.sourceSnapshot.contexts.map(context => [context.sourceFeatureId, context]));
    const result = decide(record.response, record.originalSubmissionIntent, candidates, contexts);
    ok(result, "actual historical paid Compare binds to exact held ordered contexts without a new call");
    equal(result.candidates.map(candidate => candidate.daily), positive.candidates.map(candidate => candidate.daily), "actual historical daily counts/shares/denominators/metres match independent QA");
    equal(result.candidates.map(candidate => candidate.transit.nearestM), [94, 223], "actual historical transit metres preserved");
    equal(result.candidates.map(candidate => candidate.business), [{ count: 5, denominator: 126, sharePct: 4, nearestM: 166 }, { count: 13, denominator: 176, sharePct: 7.4, nearestM: 0 }], "actual historical business-group definitions and denominators preserved");
    equal(JSON.stringify(saved), before, "real saved AI response/export remains unchanged");
    real = result;
  }
  equal(networkCalls, 0, "no provider/source/network calls");
  console.log(JSON.stringify({ protocol: "REVIEW02_COMPARISON_DECISION_CHECK_V1", checks, networkCalls, realHeldComplement: real }, null, 2));
} finally { globalThis.fetch = originalFetch; }
