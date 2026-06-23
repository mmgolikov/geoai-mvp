import { decisionScoreCaveat, type DecisionScoreResult } from "@/src/lib/ai/decision-scoring-schema";

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

export function applyDecisionScoreGuardrails(result: DecisionScoreResult): DecisionScoreResult {
  const unsupported = findUnsupportedDecisionClaims(result);
  const unsupportedClaims = Array.from(new Set([...result.unsupportedClaims, ...unsupported]));

  return {
    ...result,
    caveat: decisionScoreCaveat,
    confidence: unsupportedClaims.length > 0 ? "low" : result.confidence,
    forbiddenClaimsAvoided: unsupportedClaims.length === 0 && result.forbiddenClaimsAvoided,
    unsupportedClaims
  };
}
