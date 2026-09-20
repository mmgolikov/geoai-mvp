import assert from "node:assert/strict";
// @ts-expect-error -- Node's strip-types runner requires the explicit extension.
import { core, evidencePack } from "./point-to-object-semantic-v6-check.ts";

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
function plan() {
  return {
    decision: { path: "existing_asset_screen", disposition: "continue_screening", confidence: "medium", reasonCodes: ["object_identity_available", "use_classification_available", "nearby_context_available"] },
    signalCodes: ["object_identity", "use_classification", "building_form", "address_context"],
    opportunityCodes: ["existing_asset_repositioning", "redevelopment_envelope_test"],
    risks: ["non_official_source", "identity_uncertainty", "geometry_not_parcel"].map(code => ({ code, severity: "high", confidence: "low" })),
    answerCode: null, focusedAnswer: null, caveat
  };
}
function genericBuilding() {
  const pack = evidencePack();
  pack.selectedObject.featureClass = "building:yes";
  pack.selectedObject.tags["tag.building"] = "yes";
  pack.evidence.find((item: any) => item.id === "EVD-CLASSIFICATION").value = JSON.stringify({ sourceFeatureId: "way/101", featureClass: "building:yes" });
  syncTags(pack);
  return pack;
}
function syncTags(pack: any) {
  pack.evidence.find((item: any) => item.id === "EVD-ALLOWED-FIELDS").value = JSON.stringify({ sourceFeatureId: "way/101", tags: pack.selectedObject.tags });
}
function request(locale: string, goal = "development_screening", question: string | null = null) {
  return { depth: "standard", goal, perspective: "developer", horizon: "current", question, locale };
}
const questions = {
  en: {
    development_screening: "Screen this object from the selected perspective. Identify what the available evidence implies, the strongest preliminary opportunities and risks, and what must be validated before further commitment.",
    redevelopment: "Assess whether redevelopment or repositioning is a useful hypothesis to investigate for this object. Do not assume development rights, condition, demand or financial feasibility.",
    due_diligence: "Turn the available evidence into a prioritized due-diligence plan. Explain which unknowns could change the decision most and which sources should be checked first."
  },
  ru: {
    development_screening: "Проведи предварительную оценку объекта с выбранной точки зрения. Покажи, что следует из доступных данных, основные возможности и риски, а также что нужно проверить до дальнейших обязательств.",
    redevelopment: "Оцени, стоит ли проверять гипотезу редевелопмента или репозиционирования этого объекта. Не предполагай наличие прав на строительство, состояние, спрос или финансовую реализуемость.",
    due_diligence: "Преобразуй доступные данные в приоритетный план due diligence. Объясни, какие неизвестные сильнее всего могут изменить решение и какие источники проверить первыми."
  }
};
let checks = 0;
for (const locale of ["en", "ru"] as const) {
  const pack = genericBuilding();
  const rendered = core.validatePointObjectAiContentDetailed(plan(), pack, request(locale));
  assert.equal(rendered.ok, true, rendered.detail);
  assert.match(rendered.content.initialSemanticBrief.subject.statement, locale === "en" ? /hotel/ : /отель/);
  assert.ok(rendered.content.initialSemanticBrief.subject.evidenceRefs.includes("EVD-ALLOWED-FIELDS"));
  const classificationFact = rendered.content.sourceFacts.find((fact: any) => fact.evidenceRefs.includes("EVD-CLASSIFICATION"));
  assert.ok(classificationFact.evidenceRefs.includes("EVD-ALLOWED-FIELDS"));
  assert.equal(core.buildModelEvidenceProjection(pack).selectedObject.featureClass, "building:yes", "Display must not change physical classification");
  assert.equal(core.buildModelEvidenceProjection(pack).selectedObject.metrics.footprintAreaSqM, 4100);
  checks += 1;

  for (const mutation of ["absent", "unbound", "unrelated"] as const) {
    const candidate = genericBuilding();
    delete candidate.selectedObject.tags["tag.tourism"];
    syncTags(candidate);
    if (mutation === "unbound") candidate.selectedObject.tags["tag.tourism"] = "hotel";
    if (mutation === "unrelated") {
      candidate.evidence.find((item: any) => item.id === "EVD-ALLOWED-FIELDS").sourceId = "way/999";
      candidate.selectedObject.tags["tag.tourism"] = "hotel";
    }
    const result = core.validatePointObjectAiContentDetailed(plan(), candidate, request(locale));
    assert.equal(result.ok, true, result.detail);
    assert.match(result.content.initialSemanticBrief.subject.statement, locale === "en" ? /— building;/ : /— здание;/);
    assert.doesNotMatch(result.content.initialSemanticBrief.subject.statement, /— yes/);
    checks += 1;
  }

  for (const [goal, question] of Object.entries(questions[locale])) {
    const req = request(locale, goal, question);
    const result = core.recoverPointObjectAiFocusedContentDetailed(plan(), pack, req);
    assert.equal(result.ok, true, result.detail);
    assert.equal(result.content.answerToQuestion.status, "partial");
    assert.ok(result.content.answerToQuestion.missingEvidence.length >= 7);
    const overclaim = core.validatePointObjectAiContentDetailed({ ...plan(), answerCode: "source_evidence_only", focusedAnswer: {
      status: "answered", scope: "screening_implication", perspective: "developer", horizon: "current", confidence: "low",
      statement: "The mapped object supports a preliminary screen and a subsequent evidence review.", evidenceRefs: ["EVD-OSM-OBJECT"], missingEvidenceCodes: [], unsupportedReasonCode: null
    } }, pack, req);
    assert.equal(overclaim.ok, false, "The normal validator must also reject a broad complete-answer claim without gates");
    // A narrow mapped field appended to a broad review must not erase its gates.
    const mixed = core.recoverPointObjectAiFocusedContentDetailed(plan(), pack, { ...req, question: `${question} ${locale === "en" ? "What is the height?" : "Какова высота?"}` });
    assert.equal(mixed.ok, true, mixed.detail);
    assert.equal(mixed.content.answerToQuestion.status, "partial");
    checks += 3;
  }

  const name = core.recoverPointObjectAiFocusedContentDetailed(plan(), pack, request(locale, "development_screening", locale === "en" ? "What is the mapped object name?" : "Как называется объект на карте?"));
  assert.equal(name.ok, true, name.detail);
  assert.equal(name.content.answerToQuestion.status, "answered");
  assert.equal(name.content.answerToQuestion.missingEvidence.length, 0);

  const heightRequest = request(locale, "development_screening", locale === "en" ? "What is the height?" : "Какова высота?");
  const height = core.validatePointObjectAiContentDetailed({ ...plan(), answerCode: "source_evidence_only", focusedAnswer: {
    status: "answered", scope: "mapped_form", perspective: "developer", horizon: "current", confidence: "low",
    statement: "Mapped OpenStreetMap height tag value: 200; the mapped value is not independently verified.", evidenceRefs: ["EVD-ALLOWED-FIELDS"], missingEvidenceCodes: [], unsupportedReasonCode: null
  } }, pack, heightRequest);
  assert.equal(height.ok, true, height.detail);
  assert.equal(height.content.answerToQuestion.status, "answered");
  assert.equal(height.content.answerToQuestion.missingEvidence.length, 0);
  checks += 2;
}
// A goal-less/custom question retains the existing question-specific semantics.
const custom = core.recoverPointObjectAiFocusedContentDetailed(plan(), genericBuilding(), request("en", "custom", "Screen this object."));
assert.equal(custom.ok, true, custom.detail);
assert.equal(custom.content.answerToQuestion.missingEvidence.length, 0);
checks += 1;
console.log(`quality20-analysis-content-check: PASS (${checks} synthetic cases; no API calls)`);
