import {
  decisionScoreCaveat,
  type DecisionPosture,
  type DecisionScoreRequest,
  type DecisionScoreResult,
  type RecommendedUse
} from "@/src/lib/ai/decision-scoring-schema";

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreValue(scores: Record<string, number> | undefined, key: string, fallback: number) {
  const value = scores?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function recommendedUseForScenario(request: DecisionScoreRequest): RecommendedUse {
  const query = request.customQuery?.toLowerCase() ?? "";
  if (query.includes("hotel") || query.includes("hospitality")) return "hotel";
  if (query.includes("logistics") || query.includes("industrial")) return "logistics_light_industrial";
  if (query.includes("office")) return "office";
  if (query.includes("retail")) return "retail";
  if (query.includes("что") || query.includes("build") || query.includes("построить")) return "mixed_use";

  switch (request.scenarioId) {
    case "investmentSiteSelection":
      return "compare_first";
    case "climateRisk":
      return "hold_validate";
    case "infrastructureUrbanPlanning":
      return "mixed_use";
    case "constructionMonitoring":
      return "hold_validate";
    default:
      return "mixed_use";
  }
}

function decisionPostureForScores(suitability: number, risk: number): DecisionPosture {
  if (risk >= 75) return "validate_first";
  if (suitability >= 72 && risk <= 62) return "proceed_with_conditions";
  if (suitability >= 58) return "compare_alternatives";
  if (risk >= 68) return "monitor";
  return "validate_first";
}

export function createDeterministicDecisionScore(request: DecisionScoreRequest, notice?: string): DecisionScoreResult {
  const development = scoreValue(request.deterministicScores, "developmentPotential", 62);
  const investment = scoreValue(request.deterministicScores, "investmentAttractiveness", 60);
  const access = scoreValue(request.deterministicScores, "accessibility", 58);
  const infrastructure = scoreValue(request.deterministicScores, "infrastructureReadiness", 56);
  const heatRisk = scoreValue(request.deterministicScores, "climateHeatRisk", 55);
  const overallRisk = scoreValue(request.deterministicScores, "overallRisk", 52);
  const suitabilityScore = clamp(development * 0.28 + investment * 0.28 + access * 0.22 + infrastructure * 0.22);
  const riskScore = clamp(overallRisk * 0.65 + heatRisk * 0.35);
  const posture = decisionPostureForScores(suitabilityScore, riskScore);
  const evidenceUsed = (request.evidence ?? [])
    .map((item) => item.sourceId ?? item.id)
    .filter((item): item is string => Boolean(item))
    .slice(0, 6);

  return {
    mode: "deterministic_fallback",
    decisionPosture: posture,
    recommendedUse: recommendedUseForScenario(request),
    suitabilityScore,
    riskScore,
    confidence: evidenceUsed.length >= 4 ? "medium" : "low",
    evidenceUsed,
    keyDrivers: [
      `${request.scenarioLabel ?? "Selected scenario"} interpreted through deterministic score context.`,
      `Suitability combines development, investment, access and infrastructure indicators (${suitabilityScore}/100).`,
      "Snapshot/open-data evidence is treated as screening context only."
    ].slice(0, 5),
    keyRisks: [
      `Risk score remains ${riskScore}/100 and requires source validation.`,
      "No official parcel, zoning, ownership or valuation validation is connected.",
      notice ?? "OpenAI decision scoring is unavailable or not configured, so deterministic fallback is active."
    ].slice(0, 5),
    validationRequired: [
      "Validate DLD / Dubai Pulse market evidence against official/customer-approved exports.",
      "Validate planning, zoning and parcel assumptions with official sources.",
      "Confirm ownership/title and valuation outside GeoAI."
    ],
    nextActions: [
      "Prepare a validation checklist for this selected target.",
      "Compare at least one alternative site before underwriting.",
      "Attach customer-approved or official evidence before decision-grade use."
    ],
    caveat: decisionScoreCaveat,
    forbiddenClaimsAvoided: true,
    unsupportedClaims: []
  };
}
