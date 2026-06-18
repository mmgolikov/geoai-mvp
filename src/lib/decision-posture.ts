import { deriveDataConfidenceLevel } from "@/src/data/data-maturity";
import type { ExpressAnalysis } from "@/src/types/geo";

export type DecisionPosture =
  | "Proceed to due diligence"
  | "Proceed with conditions"
  | "Compare alternatives first"
  | "Requires official validation"
  | "High uncertainty"
  | "Monitor only"
  | "Do not proceed yet";

const officialValidationTerms = [
  "official",
  "zoning",
  "land-use",
  "land use",
  "authority",
  "authorities",
  "validate",
  "validation",
  "permitted",
  "regulatory"
];

const comparisonTerms = [
  "alternative",
  "compare",
  "benchmark",
  "shortlist"
];

const monitoringTerms = [
  "monitor",
  "cadence",
  "construction",
  "progress"
];

function includesAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function hasOnlyDemoOrPlannedEvidence(analysis: ExpressAnalysis) {
  return analysis.evidence.every((item) => {
    return (
      item.confidence === "demo" ||
      item.sourceStatus === "mock" ||
      item.sourceStatus === "planned" ||
      item.sourceType === "mock" ||
      item.sourceType === "demo"
    );
  });
}

export function deriveDecisionPosture(analysis: ExpressAnalysis): DecisionPosture {
  const recommendationText = analysis.nextActions.join(" ");
  const overallRisk = analysis.scores.overallRisk;
  const investmentScore = analysis.scores.investmentAttractiveness;
  const developmentScore = analysis.scores.developmentPotential;
  const climateRisk = analysis.scores.climateHeatRisk;
  const confidence = analysis.confidenceLevel ?? "medium";
  const dataConfidence = deriveDataConfidenceLevel(analysis.evidence);
  const demoOnlyEvidence = hasOnlyDemoOrPlannedEvidence(analysis);
  const requiresOfficialValidation =
    demoOnlyEvidence ||
    dataConfidence.toLowerCase().includes("demo") ||
    includesAny(recommendationText, officialValidationTerms);

  if (confidence === "low" && (overallRisk >= 75 || investmentScore < 45)) {
    return "High uncertainty";
  }

  if (investmentScore < 40 || developmentScore < 40) {
    return overallRisk >= 70 ? "Do not proceed yet" : "Monitor only";
  }

  if (analysis.scenarioId === "constructionMonitoring" && includesAny(recommendationText, monitoringTerms)) {
    return overallRisk >= 70 ? "Proceed with conditions" : "Monitor only";
  }

  if (analysis.scenarioId === "climateRisk" && (climateRisk >= 65 || overallRisk >= 65)) {
    return confidence === "high" ? "Proceed with conditions" : "Requires official validation";
  }

  if (includesAny(recommendationText, comparisonTerms) || (investmentScore < 65 && overallRisk >= 60)) {
    return "Compare alternatives first";
  }

  if (requiresOfficialValidation) {
    return investmentScore >= 72 && developmentScore >= 70 ? "Proceed with conditions" : "Requires official validation";
  }

  if (investmentScore >= 75 && developmentScore >= 72 && overallRisk < 60 && confidence !== "low") {
    return "Proceed to due diligence";
  }

  if (investmentScore >= 65 && overallRisk < 70) {
    return "Proceed with conditions";
  }

  return "Requires official validation";
}

export function deriveDecisionRationale(analysis: ExpressAnalysis) {
  const posture = deriveDecisionPosture(analysis);
  const dataConfidence = deriveDataConfidenceLevel(analysis.evidence);

  if (posture === "Proceed to due diligence") {
    return "The site has a strong demo-normalized screening profile and manageable modeled risk, but pilot deployment should still validate conclusions against official sources before underwriting.";
  }

  if (posture === "Proceed with conditions") {
    return "The site shows useful screening potential, but current evidence remains demo-normalized or partially unvalidated, so next steps should be conditional on official planning, market and infrastructure checks.";
  }

  if (posture === "Compare alternatives first") {
    return "The selected location has mixed screening signals. A side-by-side comparison with alternative sites should precede a deeper diligence commitment.";
  }

  if (posture === "High uncertainty") {
    return "The current signal has elevated uncertainty because confidence, risk or evidence maturity is not sufficient for a decision-grade recommendation.";
  }

  if (posture === "Monitor only") {
    return "The site is better suited for continued monitoring until market, construction, infrastructure or risk signals improve.";
  }

  if (posture === "Do not proceed yet") {
    return "The current screening profile is not strong enough to justify progression before material constraints are resolved.";
  }

  return `Official validation is required because the current workflow uses ${dataConfidence.toLowerCase()} evidence and does not yet connect decision-grade zoning, land-use, transaction or customer source data.`;
}
