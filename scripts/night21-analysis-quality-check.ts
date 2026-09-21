import assert from "node:assert/strict";
// @ts-expect-error -- Node strip-types requires an explicit TypeScript extension.
import { core, evidencePack } from "./point-to-object-semantic-v6-check.ts";

// Synthetic capture-inspired fixtures only; not a replay of withheld live packs.
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const profile = { model: "gpt-5.6-sol", reasoningEffort: "high", verbosity: "medium", maxOutputTokens: 5200 };
const questions = {
  en: { redevelopment: "Assess whether redevelopment or repositioning is a useful hypothesis to investigate for this object.", due_diligence: "Turn the available evidence into a prioritized due-diligence plan." },
  ru: { redevelopment: "Оцени, стоит ли проверять гипотезу редевелопмента этого объекта.", due_diligence: "Преобразуй данные в приоритетный план due diligence." }
};
function request(depth = "standard", goal = "redevelopment", locale = "en", question: string | null = null) {
  return { depth, goal, locale, question, perspective: "developer", horizon: "current" };
}
function plan(disposition = "continue_screening") {
  return {
    decision: { path: "existing_asset_screen", disposition, confidence: "medium", reasonCodes: ["object_identity_available", "use_classification_available", "building_form_available"] },
    signalCodes: ["object_identity", "use_classification", "building_form", "address_context"],
    opportunityCodes: ["technical_reuse_test", "redevelopment_envelope_test", "existing_asset_repositioning"],
    risks: ["non_official_source", "identity_uncertainty", "geometry_not_parcel"].map(code => ({ code, severity: "high", confidence: "low" })),
    answerCode: null, focusedAnswer: null, caveat
  };
}
function fixture(featureClass = "landuse:residential", tags: Record<string, string> = {}, sparse = false) {
  const pack = evidencePack(sparse);
  pack.selectedObject.featureClass = featureClass;
  pack.selectedObject.tags = tags;
  pack.evidence.find((item: any) => item.id === "EVD-CLASSIFICATION").value = JSON.stringify({ sourceFeatureId: "way/101", featureClass });
  pack.evidence.find((item: any) => item.id === "EVD-ALLOWED-FIELDS").value = JSON.stringify({ sourceFeatureId: "way/101", tags });
  return pack;
}
function policy(pack: any, req = request()) {
  return JSON.parse(core.buildPointObjectResponsesRequest(pack, req, profile).input[1].content[0].text).selectionPolicy;
}
let checks = 0;
for (const pack of [fixture(), fixture("landuse:forest"), fixture("natural:water"), fixture("building:yes", { "tag.building": "no" }), fixture("building:no"), fixture("landuse:residential", { "tag.height": "200", "tag.building:levels": "30" })]) {
  const eligible = policy(pack);
  assert.ok(!eligible.eligibleSignalCodes.includes("building_form"));
  assert.ok(!eligible.eligiblePaths.includes("technical_baseline_first"));
  assert.ok(!eligible.eligibleAnswerCodes.includes("technical_baseline_first"));
  assert.ok(!eligible.eligibleOpportunityCodes.includes("technical_reuse_test"));
  assert.ok(eligible.eligibleOpportunityCodes.includes("redevelopment_envelope_test"));
  assert.equal(core.buildModelEvidenceProjection(pack).selectedObject.metrics.footprintAreaSqM, 4100);
  const result = core.validatePointObjectAiContentDetailed(plan(), pack, request());
  assert.equal(result.ok, true, result.detail);
  assert.match(result.content.initialSemanticBrief.implication.statement, /structure inventory/);
  assert.doesNotMatch(result.content.initialSemanticBrief.implication.statement, /verify existing-building condition/);
  checks++;
}
for (const pack of [fixture("building:yes"), fixture("landuse:residential", { "tag.building": "apartments" }), fixture("tourism:hotel", { "tag.building": "hotel" })]) {
  assert.ok(policy(pack).eligibleSignalCodes.includes("building_form"));
  assert.ok(policy(pack).eligiblePaths.includes("technical_baseline_first"));
  checks++;
}
for (const kind of ["mismatched", "unbound"] as const) {
  const pack = fixture("landuse:residential", { "tag.building": "yes" });
  const receipt = pack.evidence.find((item: any) => item.id === "EVD-ALLOWED-FIELDS");
  if (kind === "mismatched") receipt.sourceId = "way/999";
  else receipt.value = JSON.stringify({ sourceFeatureId: "way/101", tags: {} });
  assert.ok(!policy(pack).eligiblePaths.includes("technical_baseline_first"));
  checks++;
}
const noGeometry = fixture("building:yes", { "tag.height": "200" });
noGeometry.evidence = noGeometry.evidence.filter((item: any) => !["EVD-GEOMETRY", "EVD-OBJECT-METRICS"].includes(item.id));
assert.ok(policy(noGeometry).eligibleSignalCodes.includes("building_form"));
assert.ok(!policy(noGeometry).eligibleOpportunityCodes.includes("redevelopment_envelope_test"));
checks++;

for (const locale of ["en", "ru"] as const) for (const goal of ["redevelopment", "due_diligence"] as const) {
  const statements: string[] = [];
  for (const depth of ["quick", "standard", "deep"]) for (const disposition of ["hold", "continue_screening"]) {
    const req = request(depth, goal, locale, questions[locale][goal]);
    const pack = fixture();
    const result = core.recoverPointObjectAiFocusedContentDetailed(plan(disposition), pack, req);
    assert.equal(result.ok, true, `${locale}/${goal}/${depth}: ${result.detail}`);
    assert.equal(result.content.decisionBrief.disposition, "hold");
    assert.equal(result.content.decisionBrief.confidence, "low");
    assert.match(result.content.decisionBrief.summary, locale === "en" ? /Evidence gathering may continue/ : /Сбор данных можно продолжать/);
    const answer = result.content.answerToQuestion;
    assert.equal(answer.status, "partial");
    assert.ok(answer.statement.length <= 900);
    assert.ok(answer.missingEvidence.length >= 7);
    const allowed = new Set(core.buildModelEvidenceProjection(pack).evidenceIndex.map((item: any) => item.id));
    assert.ok(answer.evidenceRefs.every((ref: string) => allowed.has(ref)));
    if (disposition === "hold") statements.push(answer.statement);
    if (depth === "deep") {
      assert.match(answer.statement, locale === "en" ? /If|if/ : /Если|если/);
      assert.match(answer.statement, locale === "en" ? /compare|Compare/ : /сравните|Сравните/);
      assert.match(answer.statement, locale === "en" ? /hold|redirect/ : /приостановки|пересмотра/);
      if (goal === "due_diligence") assert.match(answer.statement, locale === "en" ? /retaining valid object metrics/ : /сохранив корректные метрики объекта/);
    }
    checks++;
  }
  assert.equal(new Set(statements).size, 3, "Depth must change decision content in the focused answer");
}

const req = request("deep", "due_diligence", "en", questions.en.due_diligence);
const pack = fixture();
const focused = {
  status: "partial", scope: "screening_implication", perspective: req.perspective, horizon: req.horizon, confidence: "low",
  statement: "The mapped object is a useful starting point; confirm identity, rights and planning before proceeding.",
  evidenceRefs: ["EVD-OSM-OBJECT"], missingEvidenceCodes: ["official_identity", "parcel_boundary", "title_rights", "planning_controls", "physical_baseline", "current_market", "cost_financials"], unsupportedReasonCode: null
};
const raw = { ...plan(), answerCode: "identity_rights_planning_first", focusedAnswer: focused };
const shallow = core.validatePointObjectAiContentDetailed(raw, pack, req);
assert.equal(shallow.ok, false);
assert.equal(shallow.detail, "focused_answer_scenario_depth");
const prose = "Compare identity-first review against technical investigation. If verified identity contradicts the selected subject, stop its downstream findings; if only the parcel association differs, retain valid object metrics and redirect site conclusions. Corroboration advances only to the next unresolved gate.";
const valid = core.validatePointObjectAiContentDetailed({ ...raw, focusedAnswer: { ...focused, statement: prose } }, pack, req);
assert.equal(valid.ok, true, valid.detail);
assert.equal(valid.content.answerToQuestion.statement, prose, "Valid model prose must survive");
const insufficient = core.validatePointObjectAiContentDetailed(plan("insufficient_evidence"), pack, request());
assert.equal(insufficient.ok, true, insufficient.detail);
assert.equal(insufficient.content.decisionBrief.disposition, "hold", "Model uncertainty cannot change the server-grounded commitment gate.");
// Same server pack/goal must retain its commitment gate even when different
// models choose a different path or conflate missing authority with no subject.
let commitmentParityCases = 0;
for (const locale of ["en", "ru"]) for (const goal of ["development_screening", "redevelopment", "due_diligence"]) {
  for (const anchoredPack of [fixture("building:yes", { "tag.building": "yes", "tag.tourism": "hotel" }), fixture()]) {
    let expectedSummary: string | undefined;
    for (const depth of ["quick", "standard", "deep"]) for (const disposition of ["hold", "continue_screening", "insufficient_evidence"]) {
      for (const path of ["existing_asset_screen", "technical_baseline_first", "identity_first_due_diligence", "planning_first_due_diligence", "insufficient_open_context"]) {
        const candidate = plan(disposition); candidate.decision.path = path;
        const result = core.validatePointObjectAiContentDetailed(candidate, anchoredPack, request(depth, goal, locale));
        assert.equal(result.ok, true, result.detail);
        assert.equal(result.content.decisionBrief.disposition, "hold");
        assert.equal(result.content.decisionBrief.confidence, "low");
        assert.match(result.content.decisionBrief.summary, locale === "en" ? /Evidence gathering may continue/ : /Сбор данных можно продолжать/);
        expectedSummary ??= result.content.decisionBrief.summary;
        assert.equal(result.content.decisionBrief.summary, expectedSummary, "The commitment meaning must be stable, not only its label.");
        commitmentParityCases++;
      }
    }
  }
}
const unanchored = fixture("building:yes", { "tag.building": "yes" });
unanchored.evidence = unanchored.evidence.filter((item: any) => item.id !== "EVD-OSM-OBJECT");
for (const depth of ["quick", "standard", "deep"]) for (const disposition of ["hold", "continue_screening", "insufficient_evidence"]) {
  const result = core.validatePointObjectAiContentDetailed(plan(disposition), unanchored, request(depth));
  assert.equal(result.ok, true, result.detail);
  assert.equal(result.content.decisionBrief.disposition, "insufficient_evidence", "A missing grounded subject must not be upgraded to a screened asset.");
  commitmentParityCases++;
}
const narrowInsufficient = core.validatePointObjectAiContentDetailed(plan("insufficient_evidence"), pack,
  request("standard", "object_profile"));
assert.equal(narrowInsufficient.ok, true, narrowInsufficient.detail);
assert.equal(narrowInsufficient.content.decisionBrief.disposition, "insufficient_evidence", "Non-commitment requests retain their uncertainty semantics.");
for (const depth of ["quick", "standard", "deep"]) for (const disposition of ["hold", "continue_screening", "insufficient_evidence"]) {
  const captureInspired = fixture("building:yes", { "tag.building": "yes", "tag.tourism": "hotel", "tag.building:levels": "43" });
  const req = request(depth, "development_screening", "en",
    "Screen this object from the selected perspective. Identify what the available evidence implies, the strongest preliminary opportunities and risks, and what must be validated before further commitment.");
  const counts = depth === "quick" ? [2, 0, 1, 1] : depth === "standard" ? [3, 1, 2, 2] : [4, 2, 3, 3];
  const raw = { ...plan(disposition), depthPlan: {
    criteriaSignalCodes: ["object_identity", "use_classification", "building_form", "source_limit"].slice(0, counts[0]),
    alternativePaths: ["planning_first_due_diligence", "technical_baseline_first"].slice(0, counts[1]),
    counterEvidenceRiskCodes: ["non_official_source", "identity_uncertainty", "geometry_not_parcel"].slice(0, counts[2]),
    decisionTriggerCodes: ["identity_rights_planning_first", "technical_baseline_first", "market_financial_after_gates"].slice(0, counts[3])
  } };
  const result = core.recoverPointObjectAiFocusedContentDetailed(raw, captureInspired, req);
  assert.equal(result.ok, true, result.detail);
  assert.equal(result.content.decisionBrief.disposition, "hold");
  assert.equal(result.content.answerToQuestion.status, "partial");
  assert.ok(result.content.answerToQuestion.missingEvidence.length >= 7);
  assert.equal(result.content.depthReview.depth, depth);
  commitmentParityCases++;
}
for (const question of ["What is the mapped object name?", "What is the height?", "What nearby schools are mapped?", "What is the roof material?"]) {
  const narrowRequest = request("deep", "redevelopment", "en", question);
  const narrow = /height/.test(question)
    ? core.validatePointObjectAiContentDetailed({ ...plan(), answerCode: "source_evidence_only", focusedAnswer: { ...focused, status: "answered", scope: "mapped_form", statement: "Mapped OpenStreetMap height tag value: 200; it is not independently verified.", evidenceRefs: ["EVD-ALLOWED-FIELDS"], missingEvidenceCodes: [] } }, evidencePack(), narrowRequest)
    : /roof/.test(question)
      ? core.validatePointObjectAiContentDetailed({ ...plan(), answerCode: "insufficient_for_requested_conclusion", focusedAnswer: { ...focused, status: "unsupported", scope: "source_limitation", statement: null, evidenceRefs: [], missingEvidenceCodes: ["physical_baseline"], unsupportedReasonCode: "outside_available_open_context" } }, evidencePack(), narrowRequest)
      : core.recoverPointObjectAiFocusedContentDetailed(plan(), evidencePack(), narrowRequest);
  assert.equal(narrow.ok, true, narrow.detail);
  assert.equal(narrow.content.decisionBrief.disposition, "continue_screening");
  if (/school|roof/.test(question)) assert.equal(narrow.content.answerToQuestion.status, "unsupported");
  else assert.equal(narrow.content.answerToQuestion.status, "answered");
  checks++;
}
for (const goal of ["redevelopment", "due_diligence"] as const) {
  const sparse = core.recoverPointObjectAiFocusedContentDetailed(plan(), fixture("landuse:forest", {}, true), request("deep", goal, "en", questions.en[goal]));
  assert.equal(sparse.ok, true, sparse.detail);
  assert.doesNotMatch(sparse.content.answerToQuestion.statement, /Metro Gate|400|there are no buildings/);
  checks++;
}
console.log(`night21-analysis-quality-check: PASS (${checks + 4} synthetic cases + ${commitmentParityCases} same-evidence commitment cases; building type, commitment gate, focused depth and narrow-query guards; zero API calls)`);
