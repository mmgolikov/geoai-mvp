import { analysisScenarios, createMockExpressAnalysis } from "@/src/lib/mock-express-analysis";
import type {
  AnalysisScenario,
  AnalysisScenarioId,
  ComparisonItem,
  ComparisonResult,
  ComparisonScorecard,
  ScoreKey,
  SelectedDemoObject,
  SelectedPoint
} from "@/src/types/geo";

const scoreOrder: ScoreKey[] = [
  "developmentPotential",
  "investmentAttractiveness",
  "accessibility",
  "infrastructureReadiness",
  "climateHeatRisk",
  "overallRisk"
];

function formatCoordinate(point: SelectedPoint) {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stablePointId(point: SelectedPoint) {
  return `${point.latitude.toFixed(5)}-${point.longitude.toFixed(5)}`;
}

function recommendedUseForItem(item: ComparisonItem) {
  if (item.selectedObject?.layerId === "premiumRealEstateAreas") return "Premium mixed-use or residential investment";
  if (item.selectedObject?.layerId === "developmentZones") return "Master-planned development or land banking";
  if (item.selectedObject?.layerId === "infrastructureNodes") return "Logistics, access-led commercial, or public infrastructure support";
  if (item.selectedObject?.layerId === "constructionSites") return "Construction monitoring and lender reporting";
  if (item.selectedObject?.layerId === "coastalFloodRiskZones") return "Risk-screened coastal redevelopment with resilience controls";
  if (item.selectedObject?.layerId === "heatRiskZones") return "Climate-resilient development with heat mitigation";
  if (item.selectedObject?.layerId === "transportCorridors") return "Transit-oriented or corridor-access strategy";

  if (item.scenarioId === "investmentSiteSelection") return "Investment screening and site ranking";
  if (item.scenarioId === "constructionMonitoring") return "Monitoring target setup";
  if (item.scenarioId === "climateRisk") return "Climate and resilience due diligence";
  return "Early-stage development screening";
}

function keyConcernForItem(item: ComparisonItem, scores: Record<ScoreKey, number>) {
  if (scores.overallRisk >= 68) return "High uncertainty requires deeper regulatory and risk checks";
  if (scores.climateHeatRisk >= 68) return "Climate, heat, or coastal exposure requires mitigation planning";
  if (scores.infrastructureReadiness < 58) return "Infrastructure capacity and timing need confirmation";
  if (scores.accessibility < 58) return "Access quality may limit near-term demand";
  if (item.selectedObject?.layerId === "constructionSites") return "Progress evidence requires baseline schedule and imagery cadence";
  return "Market, title, and land-use assumptions require validation";
}

function riskLevel(overallRisk: number, climateHeatRisk: number): ComparisonScorecard["riskLevel"] {
  const risk = Math.max(overallRisk, climateHeatRisk);

  if (risk >= 70) return "Elevated";
  if (risk >= 52) return "Moderate";
  return "Low";
}

function overallScore(scores: Record<ScoreKey, number>) {
  return clampScore(
    scores.developmentPotential * 0.24 +
      scores.investmentAttractiveness * 0.26 +
      scores.accessibility * 0.18 +
      scores.infrastructureReadiness * 0.18 +
      (100 - scores.climateHeatRisk) * 0.07 +
      (100 - scores.overallRisk) * 0.07
  );
}

function objectScoreAdjustments(item: ComparisonItem): Partial<Record<ScoreKey, number>> {
  switch (item.selectedObject?.layerId) {
    case "premiumRealEstateAreas":
      return { investmentAttractiveness: 8, developmentPotential: 5, overallRisk: 3 };
    case "developmentZones":
      return { developmentPotential: 8, infrastructureReadiness: 4, investmentAttractiveness: 3 };
    case "infrastructureNodes":
      return { accessibility: 9, infrastructureReadiness: 7, developmentPotential: 1 };
    case "constructionSites":
      return { infrastructureReadiness: 8, developmentPotential: -2, overallRisk: -3 };
    case "coastalFloodRiskZones":
      return { climateHeatRisk: 10, overallRisk: 7, investmentAttractiveness: -2 };
    case "heatRiskZones":
      return { climateHeatRisk: 12, overallRisk: 5, infrastructureReadiness: -2 };
    case "transportCorridors":
      return { accessibility: 10, developmentPotential: 4, investmentAttractiveness: 3 };
    default:
      return {};
  }
}

function createScorecard(item: ComparisonItem): ComparisonScorecard {
  const analysis = createMockExpressAnalysis(item.point, item.scenarioId, "", item.selectedObject);
  const adjustments = objectScoreAdjustments(item);
  const scores = scoreOrder.reduce<Record<ScoreKey, number>>((nextScores, scoreKey) => {
    nextScores[scoreKey] = clampScore(analysis.scores[scoreKey] + (adjustments[scoreKey] ?? 0));
    return nextScores;
  }, {} as Record<ScoreKey, number>);
  const itemOverallScore = overallScore(scores);

  return {
    item,
    scores,
    overallScore: itemOverallScore,
    riskLevel: riskLevel(scores.overallRisk, scores.climateHeatRisk),
    recommendedUse: recommendedUseForItem(item),
    keyConcern: keyConcernForItem(item, scores)
  };
}

export function createComparisonItem(
  point: SelectedPoint,
  selectedObject: SelectedDemoObject | null,
  scenarioId: AnalysisScenarioId
): ComparisonItem {
  const scenario = analysisScenarios.find((item) => item.id === scenarioId) as AnalysisScenario;
  const itemType = selectedObject ? "object" : "point";
  const locationLabel = selectedObject
    ? `${selectedObject.layerName} / ${formatCoordinate(selectedObject.center)}`
    : `Map point / ${formatCoordinate(point)}`;

  return {
    id: selectedObject ? `object-${selectedObject.id}-${scenarioId}` : `point-${stablePointId(point)}-${scenarioId}`,
    name: selectedObject ? selectedObject.name : `Map point ${formatCoordinate(point)}`,
    itemType,
    scenarioId,
    scenarioLabel: scenario.label,
    point,
    selectedObject: selectedObject ?? undefined,
    locationLabel
  };
}

export function createMockComparison(items: ComparisonItem[]): ComparisonResult {
  const scorecards = items.map(createScorecard).sort((a, b) => b.overallScore - a.overallScore);
  const winner = scorecards[0];
  const runnerUp = scorecards[1];
  const riskierItems = scorecards.filter((item) => item.riskLevel !== "Low");

  return {
    id: `comparison-${scorecards.map((item) => item.item.id).join("-")}`,
    items: scorecards,
    winner,
    whyPreferred:
      `${winner.item.name} has the strongest demo risk-adjusted profile, with an overall score of ${winner.overallScore}. ` +
      `It combines ${winner.scores.investmentAttractiveness}/100 investment attractiveness, ${winner.scores.accessibility}/100 accessibility, and ${winner.scores.infrastructureReadiness}/100 infrastructure readiness while keeping key concerns manageable for early diligence.`,
    whenAnotherMayBeBetter: runnerUp
      ? `${runnerUp.item.name} may be preferable if the priority shifts toward ${runnerUp.recommendedUse.toLowerCase()} or if its open diligence items clear faster than the current best option.`
      : "Another option may be better if official land-use, title, infrastructure, or risk checks materially change the assumptions.",
    sharedOpportunities: [
      "Use the selected locations as a short-list for structured investor or planning review.",
      "Compare land-use, access, infrastructure, and climate assumptions before deeper spend.",
      "Create a consistent scoring memo that can be reused for additional candidate sites.",
      "Prioritize data gaps that materially affect ranking and delivery confidence."
    ],
    differentiatedRisks: [
      `${winner.item.name}: ${winner.keyConcern}.`,
      ...riskierItems.slice(0, 2).map((item) => `${item.item.name}: ${item.keyConcern}.`),
      "All options require official title, planning, utility, transport, and risk-layer validation."
    ],
    nextActions: [
      "Request land-use confirmation for each shortlisted location.",
      "Run a detailed regulatory and constraints check.",
      "Validate transport accessibility and infrastructure capacity.",
      "Prepare an investment memo with assumptions and ranking rationale.",
      "Compare financial assumptions under conservative, base, and upside cases."
    ]
  };
}
