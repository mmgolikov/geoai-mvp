import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
    object_profile: "Build a concise decision-oriented profile of this object. Separate observed map evidence, derived implications and hypotheses, and identify the most material evidence gaps.",
    development_screening: "Screen this object from the selected perspective. Identify what the available evidence implies, the strongest preliminary opportunities and risks, and what must be validated before further commitment.",
    redevelopment: "Assess whether redevelopment or repositioning is a useful hypothesis to investigate for this object. Do not assume development rights, condition, demand or financial feasibility.",
    due_diligence: "Turn the available evidence into a prioritized due-diligence plan. Explain which unknowns could change the decision most and which sources should be checked first."
  },
  ru: {
    object_profile: "Составь краткий профиль объекта для принятия решения. Раздели наблюдаемые данные, производные выводы и гипотезы; укажи наиболее существенные пробелы в данных.",
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
    if (goal === "object_profile" || goal === "development_screening") {
      const answer = result.content.answerToQuestion;
      assert.match(answer.statement, /Harbour Hotel/);
      assert.match(answer.statement, /30/);
      assert.match(answer.statement, /200/);
      assert.match(answer.statement, /400/);
      assert.match(answer.statement, locale === "en" ? /Implication:.*Hypothesis:/ : /Вывод:.*Гипотеза:/);
      assert.match(answer.statement, locale === "en" ? /metres by OSM convention/ : /метры по правилу OSM/);
      assert.ok(answer.evidenceRefs.includes("EVD-CONTEXT-SUMMARY"));
      assert.ok(answer.statement.length <= 900);
    }
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
  const profileHeight = core.validatePointObjectAiContentDetailed({ ...plan(), answerCode: "source_evidence_only", focusedAnswer: {
    status: "answered", scope: "mapped_form", perspective: "developer", horizon: "current", confidence: "low",
    statement: "Mapped OpenStreetMap height tag value: 200; the mapped value is not independently verified.", evidenceRefs: ["EVD-ALLOWED-FIELDS"], missingEvidenceCodes: [], unsupportedReasonCode: null
  } }, pack, { ...heightRequest, goal: "object_profile" });
  assert.equal(profileHeight.ok, true, profileHeight.detail);
  assert.equal(profileHeight.content.answerToQuestion.status, "answered");
  checks += 1;
  checks += 2;

  const sparse = core.recoverPointObjectAiFocusedContentDetailed(plan(), evidencePack(true), request(locale, "object_profile", questions[locale].object_profile));
  assert.equal(sparse.ok, true, sparse.detail);
  assert.equal(sparse.content.answerToQuestion.status, "partial");
  assert.match(sparse.content.answerToQuestion.statement, locale === "en" ? /context is insufficient/ : /Контекст территории недостаточен/);
  assert.doesNotMatch(sparse.content.answerToQuestion.statement, /400|Metro Gate/);
  const narrowProfile = core.recoverPointObjectAiFocusedContentDetailed(plan(), pack, request(locale, "object_profile", locale === "en" ? "What is the mapped object name?" : "Как называется объект на карте?"));
  assert.equal(narrowProfile.ok, true, narrowProfile.detail);
  assert.equal(narrowProfile.content.answerToQuestion.status, "answered");
  const unboundForm = genericBuilding();
  unboundForm.evidence.find((item: any) => item.id === "EVD-ALLOWED-FIELDS").sourceId = "way/999";
  const noForm = core.recoverPointObjectAiFocusedContentDetailed(plan(), unboundForm, request(locale, "object_profile", questions[locale].object_profile));
  assert.equal(noForm.ok, true, noForm.detail);
  assert.match(noForm.content.answerToQuestion.statement, locale === "en" ? /Physical attributes were not returned/ : /Физические характеристики не получены/);
  assert.doesNotMatch(noForm.content.answerToQuestion.statement, /30|200/);
  checks += 1;
  checks += 2;
}
// Reproduce residential/daily-needs dominance around an explicitly mapped hotel.
function canonicalize(value: any): any {
  if (Array.isArray(value)) return value.map(canonicalize);
  return value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)])) : value;
}
const hotel = genericBuilding();
hotel.geoContext.groups = [
  { group: "retail_daily_needs", count: 12, sharePct: 75, nearestDistanceM: 40 },
  { group: "residential", count: 4, sharePct: 25, nearestDistanceM: 70 }
];
const { districtCharacter, ...summary } = hotel.geoContext;
hotel.evidence.find((item: any) => item.id === "EVD-CONTEXT-SUMMARY").value = JSON.stringify(summary);
hotel.evidence.find((item: any) => item.id === "EVD-DISTRICT-PROFILE").value = JSON.stringify({ summaryHash: createHash("sha256").update(JSON.stringify(canonicalize(summary))).digest("hex"), districtCharacter });
for (const locale of ["en", "ru"]) {
  const result = core.validatePointObjectAiContentDetailed(plan(), hotel, request(locale));
  assert.equal(result.ok, true, result.detail);
  assert.match(result.content.initialSemanticBrief.implication.statement, locale === "en" ? /hotel reuse or repositioning/ : /репозиционирования отеля/);
  assert.doesNotMatch(result.content.initialSemanticBrief.implication.statement, /residential\/daily-needs programme|жилой сценарий/);
  checks += 1;
}
// A goal-less/custom question retains the existing question-specific semantics.
const custom = core.recoverPointObjectAiFocusedContentDetailed(plan(), genericBuilding(), request("en", "custom", "Screen this object."));
assert.equal(custom.ok, true, custom.detail);
assert.equal(custom.content.answerToQuestion.missingEvidence.length, 0);
checks += 1;
// Regression for Find's public capture 1. Reconstructed receipts/coordinates are
// synthetic: only the listed public identity, attributes and aggregate values
// reproduce the capture; this is not a replay of its withheld raw source pack.
const findPack = JSON.parse(JSON.stringify(genericBuilding())
  .replaceAll("way/101", "relation/14604314").replaceAll("Harbour Hotel", "25hours Hotel Dubai One Central"));
findPack.selectedObject.tags["tag.building:levels"] = "9";
findPack.selectedObject.tags["tag.start_date"] = "2021";
delete findPack.selectedObject.tags["tag.height"];
findPack.evidence.find((item: any) => item.id === "EVD-ALLOWED-FIELDS").value = JSON.stringify({ sourceFeatureId: "relation/14604314", tags: findPack.selectedObject.tags });
findPack.geoContext = {
  radiusM: 400, coverage: "available", sampleSize: 118, capReached: false,
  groups: [
    { group: "access", count: 26, sharePct: 22, nearestDistanceM: 78 },
    { group: "open_space", count: 15, sharePct: 12.7, nearestDistanceM: 108 },
    { group: "retail_daily_needs", count: 13, sharePct: 11, nearestDistanceM: 242 },
    { group: "commercial", count: 9, sharePct: 7.6, nearestDistanceM: 89 },
    { group: "hospitality", count: 6, sharePct: 5.1, nearestDistanceM: 0 },
    { group: "civic_culture", count: 1, sharePct: 0.8, nearestDistanceM: 270 },
    { group: "construction", count: 2, sharePct: 1.7, nearestDistanceM: 199 },
    { group: "other_built", count: 46, sharePct: 39, nearestDistanceM: 166 }
  ], mappedBuildingCount: 59, mappedLevelsKnownCount: 14, medianMappedLevels: 10.5,
  nearestTransitM: null, nearestMajorRoadM: 78,
  districtCharacter: { code: "mixed_use_urban", confidence: "medium", ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1", driverGroups: ["open_space", "retail_daily_needs", "commercial"] }
};
const { districtCharacter: findDistrict, ...findSummary } = findPack.geoContext;
findPack.evidence.find((item: any) => item.id === "EVD-CONTEXT-SUMMARY").value = JSON.stringify(findSummary);
findPack.evidence.find((item: any) => item.id === "EVD-DISTRICT-PROFILE").value = JSON.stringify({ summaryHash: createHash("sha256").update(JSON.stringify(canonicalize(findSummary))).digest("hex"), districtCharacter: findDistrict });
const findQuestion = "What evidence supports this screening result, and what must be validated before a redevelopment decision?";
const missingCodes = ["official_identity", "parcel_boundary", "title_rights", "planning_controls", "physical_baseline", "current_market", "cost_financials"];
function focused(statement: string, status = "answered", missingEvidenceCodes: string[] = []) {
  return { status, scope: "screening_implication", perspective: "developer", horizon: "one_to_three_years", statement,
    evidenceRefs: ["EVD-OSM-OBJECT", "EVD-CLASSIFICATION", "EVD-ALLOWED-FIELDS", "EVD-GEOMETRY", "EVD-CONTEXT-SUMMARY", "EVD-SOURCE"],
    confidence: "low", missingEvidenceCodes, unsupportedReasonCode: null };
}
for (const locale of ["en", "ru"] as const) {
  const req = { ...request(locale, "custom", locale === "en" ? findQuestion : "Какие данные подтверждают результат скрининга и что необходимо проверить перед решением о редевелопменте?"), horizon: "one_to_three_years" };
  const rejectedCapture = { ...plan(), answerCode: "identity_rights_planning_first", focusedAnswer: focused("25hours Hotel Dubai One Central is mapped as building:yes. First confirm object and official parcel identity, then obtain title, permitted-use, planning-control and approval evidence before advancing.") };
  assert.equal(core.validatePointObjectAiContentDetailed(rejectedCapture, findPack, req).detail, "focused_answer_missing_source_gate");
  const recovered = core.recoverPointObjectAiFocusedContentDetailed(rejectedCapture, findPack, req);
  assert.equal(recovered.ok, true, recovered.detail);
  const answer = recovered.content.answerToQuestion;
  assert.equal(answer.status, "partial");
  assert.equal(answer.missingEvidence.length, 7);
  assert.match(answer.statement, /25hours Hotel Dubai One Central/);
  assert.match(answer.statement, /9.*2021.*400.*15.*13/);
  assert.match(answer.statement, locale === "en" ? /Implication:.*Hypothesis:/ : /Вывод:.*Гипотеза:/);
  assert.doesNotMatch(answer.statement, /building:yes|355|987654321/);
  assert.ok(answer.evidenceRefs.includes("EVD-CONTEXT-SUMMARY"));
  const unbound = structuredClone(findPack);
  unbound.evidence.find((item: any) => item.id === "EVD-ALLOWED-FIELDS").sourceId = "way/999";
  const noAttributes = core.recoverPointObjectAiFocusedContentDetailed(rejectedCapture, unbound, req);
  assert.equal(noAttributes.ok, true, noAttributes.detail);
  assert.doesNotMatch(noAttributes.content.answerToQuestion.statement, /2021|9 mapped levels|этажность по карте: 9/);
  const narrow = { ...req, question: locale === "en" ? "What is the mapped name for this redevelopment screening object?" : "Как называется объект этого скрининга редевелопмента?" };
  assert.equal(core.recoverPointObjectAiFocusedContentDetailed(plan(), findPack, narrow).content.answerToQuestion.status, "answered");
  checks += 4;
}
const findRequest = { ...request("en", "custom", findQuestion), horizon: "one_to_three_years" };
const novel = core.validatePointObjectAiContentDetailed({ ...plan(), answerCode: "identity_rights_planning_first", focusedAnswer: focused("The mapped hotel has 987654321 levels, supporting an initial existing-asset screen subject to validation.", "partial", missingCodes) }, findPack, findRequest);
assert.equal(novel.detail, "focused_answer_novel_number");
for (const statement of ["The hotel is owned by Example Holdings, which supports redevelopment after the remaining checks.", "The hotel is valued at AED 9000000, which supports redevelopment after the remaining checks."]) {
  const unsafe = core.validatePointObjectAiContentDetailed({ ...plan(), answerCode: "identity_rights_planning_first", focusedAnswer: focused(statement, "partial", missingCodes) }, findPack, findRequest);
  assert.equal(unsafe.detail, "focused_answer_forbidden_claim");
  checks += 1;
}
const narrowCustom = core.validatePointObjectAiContentDetailed({ ...plan(), answerCode: "source_evidence_only", focusedAnswer: {
  ...focused("The mapped building records 9 levels in the available OpenStreetMap evidence."), scope: "mapped_form", evidenceRefs: ["EVD-ALLOWED-FIELDS"]
} }, findPack, { ...findRequest, question: "How many levels are mapped for this redevelopment candidate?" });
assert.equal(narrowCustom.ok, true, narrowCustom.detail);
assert.equal(narrowCustom.content.answerToQuestion.status, "answered");
checks += 1;
const courty = JSON.parse(JSON.stringify(findPack).replaceAll("relation/14604314", "way/1083733024").replaceAll("25hours Hotel Dubai One Central", "Courtyard by Marriott World Trade Centre"));
courty.selectedObject.tags["tag.building:levels"] = "10";
courty.evidence.find((item: any) => item.id === "EVD-ALLOWED-FIELDS").value = JSON.stringify({ sourceFeatureId: "way/1083733024", tags: courty.selectedObject.tags });
const goodCapture = "The open-map identity, hotel classification, mapped 10-level building form, 2021 lifecycle marker and bounded surrounding context support continuing an existing-hotel redevelopment screen, but not making a redevelopment decision; official asset and parcel identity, title and rights, planning controls, physical and operational baselines, and current market, cost and financial evidence must be validated first.";
const good = core.validatePointObjectAiContentDetailed({ ...plan(), answerCode: "identity_rights_planning_first", focusedAnswer: focused(goodCapture, "partial", [...missingCodes, "transaction_comparables"]) }, courty, findRequest);
assert.equal(good.ok, true, good.detail);
assert.equal(good.content.answerToQuestion.statement, goodCapture, "Preserve grounded provider synthesis");
checks += 2;

// Broad preset Development recovery must synthesize evidence at every depth,
// while valid provider prose and narrow mapped questions keep their paths.
for (const locale of ["en", "ru"] as const) {
  for (const depth of ["quick", "standard", "deep"]) {
    const req = { ...request(locale, "development_screening", questions[locale].development_screening), depth };
    const pack = genericBuilding();
    const recovered = core.recoverPointObjectAiFocusedContentDetailed(plan(), pack, req);
    assert.equal(recovered.ok, true, recovered.detail);
    const answer = recovered.content.answerToQuestion;
    assert.equal(answer.status, "partial");
    assert.equal(answer.missingEvidence.length, 7);
    assert.match(answer.statement, /Harbour Hotel/);
    assert.match(answer.statement, /30.*200.*400/);
    assert.match(answer.statement, locale === "en" ? /hotel.*Implication:.*Hypothesis:/ : /отель.*Вывод:.*Гипотеза:/);
    assert.ok(answer.statement.length <= 900);
    const absent = genericBuilding();
    absent.selectedObject.tags = {};
    syncTags(absent);
    const noAttributes = core.recoverPointObjectAiFocusedContentDetailed(plan(), absent, req);
    assert.equal(noAttributes.ok, true, noAttributes.detail);
    assert.match(noAttributes.content.answerToQuestion.statement, locale === "en" ? /Physical attributes were not returned/ : /Физические характеристики не получены/);
    assert.doesNotMatch(noAttributes.content.answerToQuestion.statement, /30|200|— hotel\.|— отель\./);
    const narrowReq = { ...req, question: locale === "en" ? "What is the mapped object name?" : "Как называется объект на карте?" };
    const narrowName = core.recoverPointObjectAiFocusedContentDetailed(plan(), pack, narrowReq);
    assert.equal(narrowName.ok, true, narrowName.detail);
    assert.equal(narrowName.content.answerToQuestion.status, "answered");
    assert.doesNotMatch(narrowName.content.answerToQuestion.statement, /Implication:|Вывод:/);
    const narrowHeight = core.validatePointObjectAiContentDetailed({ ...plan(), answerCode: "source_evidence_only", focusedAnswer: {
      ...focused("Mapped height: 200; the open-map value is not independently verified."), horizon: "current", scope: "mapped_form", evidenceRefs: ["EVD-ALLOWED-FIELDS"]
    } }, pack, { ...req, question: locale === "en" ? "What is the height?" : "Какова высота?" });
    assert.equal(narrowHeight.ok, true, narrowHeight.detail);
    assert.equal(narrowHeight.content.answerToQuestion.status, "answered");
    assert.equal(narrowHeight.content.answerToQuestion.missingEvidence.length, 0);
    for (const severity of ["low", "medium", "high"]) {
      const riskPlan = { ...plan(), risks: ["non_official_source", "identity_uncertainty", "geometry_not_parcel"].map(code => ({ code, severity, confidence: "low" })) };
      const result = core.validatePointObjectAiContentDetailed(riskPlan, pack, { ...req, question: null });
      assert.equal(result.ok, true, result.detail);
      const sourceRisk = result.content.risks.find((risk: any) => risk.evidenceRefs.includes("EVD-SOURCE") && !risk.evidenceRefs.includes("EVD-GEOMETRY"));
      assert.equal(sourceRisk.severity, "medium");
      for (const risk of result.content.risks.filter((risk: any) => risk !== sourceRisk)) assert.equal(risk.severity, "high");
      const rights = core.validatePointObjectAiContentDetailed({ ...plan(), risks: [{ code: "rights_and_planning_unknown", severity, confidence: "low" }] }, pack, { ...req, question: null });
      assert.equal(rights.ok, true, rights.detail);
      assert.equal(rights.content.risks[0].severity, "high");
      checks += 1;
    }
    const statement = locale === "en"
      ? "The mapped hotel supports an existing-asset repositioning hypothesis, not a feasibility conclusion; verify identity, rights, planning, condition, market and cost evidence before commitment."
      : "Картографические данные отеля дают основу для гипотезы репозиционирования, но не подтверждают реализуемость; до решения проверьте идентичность, права, регламенты, состояние, рынок и затраты.";
    const validPlan = { ...plan(), answerCode: "identity_rights_planning_first", focusedAnswer: { ...focused(statement, "partial", missingCodes), horizon: "current", evidenceRefs: ["EVD-OSM-OBJECT", "EVD-CLASSIFICATION", "EVD-ALLOWED-FIELDS", "EVD-SOURCE"] } };
    const valid = core.validatePointObjectAiContentDetailed(validPlan, pack, req);
    assert.equal(valid.ok, true, valid.detail);
    assert.equal(valid.content.answerToQuestion.statement, statement);
    const novelPlan = structuredClone(validPlan);
    novelPlan.focusedAnswer.statement += " 987654321.";
    assert.equal(core.validatePointObjectAiContentDetailed(novelPlan, pack, req).detail, "focused_answer_novel_number");
    checks += 6;
  }
}
console.log(`quality20-analysis-content-check: PASS (${checks} synthetic cases; no API calls)`);
