import assert from "node:assert/strict";
// @ts-expect-error -- the pinned Node strip-types runner requires explicit TypeScript extensions.
import { POINT_OBJECT_ANALYSIS_DEPTH_CONTRACT_VERSION, pointObjectAnalysisDepthContract, type PointObjectAnalysisDepth } from "../src/lib/prototype/point-to-object-analysis-depth-contract.ts";
// @ts-expect-error -- the pinned Node strip-types runner requires explicit TypeScript extensions.
import { core, evidencePack } from "./point-to-object-semantic-v6-check.ts";

type JsonObject = Record<string, any>;

const buildRequest = core.buildPointObjectResponsesRequest as Function;
const validate = core.validatePointObjectAiContentDetailed as Function;
const profile = { model: "gpt-5.6-sol", reasoningEffort: "high", verbosity: "medium", maxOutputTokens: 5_200 };

function requestFor(depth: PointObjectAnalysisDepth) {
  return {
    depth,
    goal: "redevelopment",
    perspective: "asset_owner",
    horizon: "one_to_three_years",
    question: null,
    locale: "en"
  };
}

function rawPlanFor(pack: JsonObject, depth: PointObjectAnalysisDepth): JsonObject {
  const request = requestFor(depth);
  const providerRequest = buildRequest(pack, request, profile);
  const userPayload = JSON.parse(providerRequest.input[1].content[0].text);
  const policy = userPayload.selectionPolicy;
  const contract = pointObjectAnalysisDepthContract(depth);
  const primaryPath = policy.eligiblePaths.includes("existing_asset_screen")
    ? "existing_asset_screen"
    : policy.eligiblePaths[0];
  return {
    decision: {
      path: primaryPath,
      disposition: primaryPath === "insufficient_open_context" ? "insufficient_evidence" : "continue_screening",
      confidence: "low",
      reasonCodes: policy.eligibleReasonCodes
    },
    signalCodes: policy.eligibleSignalCodes,
    opportunityCodes: policy.eligibleOpportunityCodes,
    risks: policy.eligibleRiskCodes.map((code: string) => ({ code, severity: "high", confidence: "low" })),
    depthPlan: {
      criteriaSignalCodes: policy.eligibleDepthCriteriaCodes.slice(0, contract.reviewCounts.criteria),
      alternativePaths: policy.eligibleDepthAlternativePaths.filter((path: string) => path !== primaryPath).slice(0, contract.reviewCounts.alternatives),
      counterEvidenceRiskCodes: policy.eligibleDepthCounterEvidenceCodes.slice(0, contract.reviewCounts.counterEvidence),
      decisionTriggerCodes: policy.eligibleDepthDecisionTriggerCodes.slice(0, contract.reviewCounts.decisionTriggers)
    },
    answerCode: null,
    focusedAnswer: null,
    caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
  };
}

function collectEvidenceRefs(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectEvidenceRefs);
  if (!value || typeof value !== "object") return [];
  const record = value as JsonObject;
  return [
    ...(Array.isArray(record.evidenceRefs) ? record.evidenceRefs : []),
    ...Object.entries(record).filter(([key]) => key !== "evidenceRefs").flatMap(([, child]) => collectEvidenceRefs(child))
  ];
}

assert.equal(POINT_OBJECT_ANALYSIS_DEPTH_CONTRACT_VERSION, "POINT_OBJECT_DEPTH_CONTRACT_V1_2026_09_12");
assert.deepEqual(pointObjectAnalysisDepthContract("quick").selectionCounts, { decisionReasons: 2, signals: 3, opportunities: 1, risks: 2 });
assert.deepEqual(pointObjectAnalysisDepthContract("standard").reviewCounts, { criteria: 3, alternatives: 1, counterEvidence: 2, decisionTriggers: 2 });
assert.deepEqual(pointObjectAnalysisDepthContract("deep").reviewCounts, { criteria: 4, alternatives: 2, counterEvidence: 3, decisionTriggers: 3 });

const pack = evidencePack();
const allowedRefs = new Set(core.buildModelEvidenceProjection(pack).evidenceIndex.map((item: JsonObject) => item.id));
const quickPayload = JSON.parse(buildRequest(pack, requestFor("quick"), profile).input[1].content[0].text);
assert.deepEqual(quickPayload.selectionPolicy.eligibleDepthCriteriaCodes.slice(0, 2), ["object_identity", "source_limit"],
  "Quick must prioritise the supported identity and source-sufficiency checks.");
const results = new Map<PointObjectAnalysisDepth, JsonObject>();
for (const depth of ["quick", "standard", "deep"] as const) {
  const plan = rawPlanFor(pack, depth);
  const result = validate(plan, pack, requestFor(depth));
  assert.equal(result.ok, true, `${depth}: ${result.detail ?? "validation failed"}`);
  assert.equal(result.content.depthReview.depth, depth);
  assert.equal(result.content.depthReview.basis, "structured_review_of_existing_evidence");
  assert.equal(collectEvidenceRefs(result.content.depthReview).every((ref) => allowedRefs.has(ref)), true,
    `${depth} review may cite only receipts bound into the evidence projection.`);
  results.set(depth, result.content);
}

assert.equal(results.get("quick")?.depthReview.purpose, "identity_evidence");
assert.equal(results.get("quick")?.depthReview.alternatives.length, 0);
assert.equal(results.get("standard")?.depthReview.purpose, "decision_criteria");
assert.equal(results.get("standard")?.depthReview.alternatives.length, 1);
assert.equal(results.get("deep")?.depthReview.purpose, "decision_challenge");
assert.equal(results.get("deep")?.depthReview.alternatives.length, 2);
assert.equal(results.get("deep")?.depthReview.uncertainties.length > results.get("quick")?.depthReview.uncertainties.length, true);
assert.equal(results.get("deep")?.depthReview.decisionTriggers.length > results.get("standard")?.depthReview.decisionTriggers.length, true);
assert.equal(new Set(results.get("deep")?.depthReview.alternatives.map((item: JsonObject) => item.title)).size, 2,
  "Deep must challenge the primary path with two distinct provider-selected alternatives.");

const duplicateAlternative = rawPlanFor(pack, "deep");
duplicateAlternative.depthPlan.alternativePaths = [
  duplicateAlternative.depthPlan.alternativePaths[0],
  duplicateAlternative.depthPlan.alternativePaths[0]
];
assert.deepEqual(validate(duplicateAlternative, pack, requestFor("deep")), {
  ok: false,
  code: "EVIDENCE_INSUFFICIENT",
  detail: "depth_review_selection"
}, "Repeated alternatives must not pass as a Deep challenge.");

const sparsePack = evidencePack(true, "dubai", false);
const sparsePlan = rawPlanFor(sparsePack, "deep");
const sparseResult = validate(sparsePlan, sparsePack, requestFor("deep"));
assert.equal(sparseResult.ok, true, sparseResult.detail);
assert.equal(sparseResult.content.depthReview.depth, "deep");
assert.equal(collectEvidenceRefs(sparseResult.content.depthReview).every((ref) =>
  new Set(core.buildModelEvidenceProjection(sparsePack).evidenceIndex.map((item: JsonObject) => item.id)).has(ref)
), true, "Sparse context must degrade to the supported receipt set without inventing evidence.");

const legacyPlan = rawPlanFor(pack, "standard");
delete legacyPlan.depthPlan;
const legacyBytes = JSON.stringify(legacyPlan);
const legacyResult = validate(legacyPlan, pack, requestFor("standard"));
assert.equal(legacyResult.ok, true);
assert.equal("depthReview" in legacyResult.content, false, "Legacy V8 plans must not receive a fabricated depth review on read/validation.");
assert.equal(JSON.stringify(legacyPlan), legacyBytes, "Legacy input bytes must not be mutated by current validation.");

console.log("point-to-object-analysis-depth-contract-check: PASS (Q/S/D structure, evidence refs, deep alternatives, sparse and legacy compatibility)");
