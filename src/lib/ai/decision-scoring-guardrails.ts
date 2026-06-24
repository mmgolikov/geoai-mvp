import {
  decisionScoreCaveat,
  type DecisionScoreRequest,
  type DecisionScoreResult
} from "@/src/lib/ai/decision-scoring-schema";
import { buildClaimPolicy, findForbiddenClaimText } from "@/src/lib/validation/claim-policy";
import { validationRequiredCaveat, type ClaimPolicy, type ValidationSummary } from "@/src/types/validation";
import type { EvidenceReviewSummary } from "@/src/types/evidence-review";

const forbiddenClaimPatterns = [
  /official parcel boundary/i,
  /zoning approval/i,
  /cadastral validation/i,
  /ownership verification/i,
  /certified valuation/i,
  /approved site/i,
  /guaranteed best use/i,
  /official suitability/i,
  /legal conclusion/i
];

function resultText(result: DecisionScoreResult) {
  return [
    result.decisionPosture,
    result.recommendedUse,
    ...result.keyDrivers,
    ...result.keyRisks,
    ...result.validationRequired,
    ...result.nextActions,
    result.caveat,
    ...result.unsupportedClaims
  ].join(" ");
}

export function findUnsupportedDecisionClaims(result: DecisionScoreResult) {
  const text = resultText(result);
  return forbiddenClaimPatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source.replace(/\\/g, ""));
}

function isClaimPolicy(value: unknown): value is ClaimPolicy {
  return Boolean(
    typeof value === "object" &&
      value !== null &&
      "allowedClaimLevel" in value &&
      "forbiddenPhrases" in value &&
      "confidenceCap" in value
  );
}

function isValidationSummary(value: unknown): value is ValidationSummary {
  return Boolean(
    typeof value === "object" &&
      value !== null &&
      "highestAllowedClaimLevel" in value &&
      "requiredValidationGaps" in value
  );
}

function isEvidenceReviewSummary(value: unknown): value is EvidenceReviewSummary {
  return Boolean(
    typeof value === "object" &&
      value !== null &&
      "validationEvidenceId" in value &&
      "latestStatus" in value &&
      "allowedClaimLevel" in value
  );
}

function reviewSummaries(value: unknown): EvidenceReviewSummary[] {
  return Array.isArray(value) ? value.filter(isEvidenceReviewSummary) : [];
}

function confidenceRank(value: DecisionScoreResult["confidence"]) {
  return value === "high" ? 3 : value === "medium" ? 2 : 1;
}

function capConfidence(
  confidence: DecisionScoreResult["confidence"],
  cap: ClaimPolicy["confidenceCap"]
): DecisionScoreResult["confidence"] {
  const normalizedCap: DecisionScoreResult["confidence"] =
    cap === "high" || cap === "medium" || cap === "low" ? cap : "low";

  return confidenceRank(confidence) > confidenceRank(normalizedCap) ? normalizedCap : confidence;
}

function createPolicy(request?: DecisionScoreRequest): ClaimPolicy {
  if (isClaimPolicy(request?.claimPolicy)) return request.claimPolicy;
  return buildClaimPolicy({
    summary: isValidationSummary(request?.validationSummary) ? request.validationSummary : null
  });
}

export function applyDecisionScoreGuardrails(
  result: DecisionScoreResult,
  request?: DecisionScoreRequest
): DecisionScoreResult {
  const policy = createPolicy(request);
  const reviews = reviewSummaries(request?.evidenceReviewSummaries);
  const blockedReviewCount = reviews.filter((item) =>
    item.latestStatus === "uploaded_unreviewed" ||
    item.latestStatus === "needs_more_evidence" ||
    item.latestStatus === "rejected" ||
    item.latestStatus === "expired" ||
    item.isExpired
  ).length;
  const inReviewCount = reviews.filter((item) => item.latestStatus === "in_review").length;
  const unsupported = [
    ...findUnsupportedDecisionClaims(result),
    ...findForbiddenClaimText(resultText(result), policy)
  ];
  const unsupportedClaims = Array.from(new Set([...result.unsupportedClaims, ...unsupported]));
  const validationRequired = Array.from(new Set([
    ...result.validationRequired,
    ...(Array.isArray(request?.validationGaps) ? request.validationGaps : []),
    blockedReviewCount > 0
      ? `${blockedReviewCount} evidence review item(s) are unreviewed, rejected, expired or need more evidence.`
      : null,
    inReviewCount > 0 ? "Evidence is under review and must not be described as validated." : null,
    policy.allowedClaimLevel === "screening_only"
      ? "Official/client validation evidence is required before decision-grade claims."
      : null
  ].filter((item): item is string => Boolean(item))));

  return {
    ...result,
    caveat: policy.requiredCaveats[0] ?? validationRequiredCaveat ?? decisionScoreCaveat,
    confidence: unsupportedClaims.length > 0 || blockedReviewCount > 0 ? "low" : capConfidence(result.confidence, policy.confidenceCap),
    validationRequired: validationRequired.slice(0, 5),
    forbiddenClaimsAvoided: unsupportedClaims.length === 0 && result.forbiddenClaimsAvoided,
    unsupportedClaims
  };
}
