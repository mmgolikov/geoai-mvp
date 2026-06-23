import { createEvidenceItem } from "@/src/data/data-source-registry";
import { createComparisonCustomQueryAnswer } from "@/src/lib/custom-query/query-answer";
import { normalizeCustomQueryText } from "@/src/lib/custom-query/query-intent";
import {
  adjustScoresWithMarketMetrics,
  findBestMarketMetricMatch
} from "@/src/lib/market-metrics";
import { userDrawnAoiSourceLabel } from "@/src/lib/aoi-library";
import { analysisScenarios, createMockExpressAnalysis } from "@/src/lib/mock-express-analysis";
import type {
  AnalysisScenario,
  AnalysisScenarioId,
  ComparisonItem,
  ComparisonResult,
  ComparisonScorecard,
  ScoreKey,
  SelectedDemoObject,
  SelectedPoint,
  UserDrawnAoi
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
  if (item.selectedAoi) return `${userDrawnAoiSourceLabel(item.selectedAoi)} screening and official validation workflow`;
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
  if (item.selectedAoi) {
    const areaSqKm = item.selectedAoi.measurements.areaSqKm;
    return {
      developmentPotential: areaSqKm > 2 ? 4 : 2,
      infrastructureReadiness: -1,
      overallRisk: 4
    };
  }

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
  const analysis = createMockExpressAnalysis(item.point, item.scenarioId, "", item.selectedObject, item.selectedAoi);
  const marketMetricsMatch = findBestMarketMetricMatch({
    point: item.point,
    selectedObject: item.selectedObject ?? null
  });
  const adjustments = objectScoreAdjustments(item);
  const marketAdjustedScores = adjustScoresWithMarketMetrics(analysis, marketMetricsMatch);
  const scores = scoreOrder.reduce<Record<ScoreKey, number>>((nextScores, scoreKey) => {
    nextScores[scoreKey] = clampScore(marketAdjustedScores[scoreKey] + (adjustments[scoreKey] ?? 0));
    return nextScores;
  }, {} as Record<ScoreKey, number>);
  const itemOverallScore = overallScore(scores);

  return {
    item,
    scores,
    overallScore: itemOverallScore,
    riskLevel: riskLevel(scores.overallRisk, scores.climateHeatRisk),
    recommendedUse: recommendedUseForItem(item),
    keyConcern: keyConcernForItem(item, scores),
    marketMetricsMatch
  };
}

export function createComparisonItem(
  point: SelectedPoint,
  selectedObject: SelectedDemoObject | null,
  scenarioId: AnalysisScenarioId,
  selectedAoi?: UserDrawnAoi | null
): ComparisonItem {
  const scenario = analysisScenarios.find((item) => item.id === scenarioId) as AnalysisScenario;
  const itemType = selectedAoi ? "aoi" : selectedObject ? "object" : "point";
  const locationLabel = selectedAoi
    ? `${userDrawnAoiSourceLabel(selectedAoi)} / ${selectedAoi.measurements.areaSqKm.toFixed(2)} sq km / ${formatCoordinate(selectedAoi.centroid)}`
    : selectedObject
    ? `${selectedObject.layerName} / ${formatCoordinate(selectedObject.center)}`
    : `Map point / ${formatCoordinate(point)}`;

  return {
    id: selectedAoi
      ? `aoi-${selectedAoi.id}-${scenarioId}`
      : selectedObject
        ? `object-${selectedObject.id}-${scenarioId}`
        : `point-${stablePointId(point)}-${scenarioId}`,
    name: selectedAoi ? selectedAoi.name : selectedObject ? selectedObject.name : `Map point ${formatCoordinate(point)}`,
    itemType,
    scenarioId,
    scenarioLabel: scenario.label,
    point,
    selectedObject: selectedObject ?? undefined,
    selectedAoi: selectedAoi ?? undefined,
    locationLabel
  };
}

export function createMockComparison(items: ComparisonItem[], customQuery = ""): ComparisonResult {
  const scorecards = items.map(createScorecard).sort((a, b) => b.overallScore - a.overallScore);
  const winner = scorecards[0];
  const runnerUp = scorecards[1];
  const riskierItems = scorecards.filter((item) => item.riskLevel !== "Low");
  const importedSupportItems = scorecards.filter((item) => item.marketMetricsMatch?.importedMetricsUsed);
  const normalizedCustomQuery = normalizeCustomQueryText(customQuery);
  const queryContext = normalizedCustomQuery
    ? ` The comparison rationale also reflects the user's custom query: "${normalizedCustomQuery.slice(0, 180)}".`
    : "";
  const baseComparison: Omit<ComparisonResult, "customQuery" | "customQueryIntent" | "customQueryAnswer"> = {
    id: `comparison-${scorecards.map((item) => item.item.id).join("-")}${normalizedCustomQuery ? `-q-${stableQuerySlug(normalizedCustomQuery)}` : ""}`,
    items: scorecards,
    winner,
    whyPreferred:
      `${winner.item.name} has the strongest demo risk-adjusted profile, with an overall score of ${winner.overallScore}. ` +
      `It combines ${winner.scores.investmentAttractiveness}/100 investment attractiveness, ${winner.scores.accessibility}/100 accessibility, and ${winner.scores.infrastructureReadiness}/100 infrastructure readiness while keeping key concerns manageable for early diligence. ` +
      `${winner.marketMetricsMatch?.importedMetricsUsed ? `Imported sample market metrics matched ${winner.marketMetricsMatch.matchedAreaName} and support liquidity/demand proxy interpretation.` : "This option relies on seed/demo market fallback and requires imported market validation."}${queryContext}`,
    whenAnotherMayBeBetter: runnerUp
      ? `${runnerUp.item.name} may be preferable if the priority shifts toward ${runnerUp.recommendedUse.toLowerCase()} or if its open diligence items clear faster than the current best option.`
      : "Another option may be better if official land-use, title, infrastructure, or risk checks materially change the assumptions.",
    sharedOpportunities: [
      importedSupportItems.length > 0
        ? `${importedSupportItems.length} option(s) have imported sample market metrics available for liquidity, rental demand and pipeline validation.`
        : "Imported market metrics were not matched to the selected options; use seed_static context until official datasets are connected.",
      "Use the selected locations as a short-list for structured investor or planning review.",
      "Compare land-use, access, infrastructure, and climate assumptions before deeper spend.",
      "Create a consistent scoring memo that can be reused for additional candidate sites.",
      "Prioritize data gaps that materially affect ranking and delivery confidence."
    ],
    differentiatedRisks: [
      ...scorecards.map((item) =>
        `${item.item.name}: market data basis ${item.marketMetricsMatch?.sourceMode ?? "seed_static"} / ${item.marketMetricsMatch?.confidence ?? "low"} confidence.`
      ).slice(0, 3),
      `${winner.item.name}: ${winner.keyConcern}.`,
      ...riskierItems.slice(0, 2).map((item) => `${item.item.name}: ${item.keyConcern}.`),
      "All options require official title, planning, utility, transport, and risk-layer validation."
    ],
    nextActions: [
      "Request land-use confirmation for each shortlisted location.",
      "Run a detailed regulatory and constraints check.",
      "Validate transport accessibility and infrastructure capacity.",
      "Prepare an investment memo with assumptions and ranking rationale.",
      "Compare financial assumptions under conservative, base, and upside cases.",
      ...(normalizedCustomQuery ? ["Review the custom query context against each shortlisted option before exporting the memo."] : [])
    ],
    evidence: [
      createEvidenceItem(
        "comparison-map-selections",
        "synthetic-demo-layers",
        "Comparison map selections",
        "Selected points and demo objects used as the comparison set."
      ),
      createEvidenceItem(
        "comparison-scenarios",
        "synthetic-demo-layers",
        "Selected scenario context",
        "Scenario metadata used to frame comparison scoring."
      ),
      createEvidenceItem(
        "comparison-planning-source",
        "dubai-municipality-gis-planning",
        "Planned planning validation",
        "Future official GIS/planning source for regulatory and land-use confirmation.",
        "medium"
      ),
      createEvidenceItem(
        "comparison-osm-source",
        "osm-geofabrik",
        "Planned infrastructure validation",
        "Future open-data source for transport and access context.",
        "medium"
      ),
      createEvidenceItem(
        "comparison-mock-model",
        "synthetic-demo-layers",
        "Mock comparison scoring model",
        "Deterministic local comparison model used for MVP demonstration."
      ),
      createEvidenceItem(
        "comparison-imported-market-metrics",
        "dubai-pulse-dld-apis",
        "Imported market metrics readiness",
        importedSupportItems.length > 0
          ? "Local DLD / Dubai Pulse-style ingestion metrics used for matched comparison market context. Sample/manual import; official validation required."
          : "Imported market metrics are available but did not match all selected comparison items.",
        "medium"
      )
    ]
  };
  const queryAnswer = normalizedCustomQuery
    ? createComparisonCustomQueryAnswer({
        query: normalizedCustomQuery,
        comparison: baseComparison
      })
    : null;

  return {
    ...baseComparison,
    sharedOpportunities: queryAnswer
      ? [queryAnswer.recommendation, ...baseComparison.sharedOpportunities]
      : baseComparison.sharedOpportunities,
    differentiatedRisks: queryAnswer
      ? [...queryAnswer.keyRisks, ...baseComparison.differentiatedRisks]
      : baseComparison.differentiatedRisks,
    nextActions: queryAnswer
      ? [...queryAnswer.nextActions, ...baseComparison.nextActions]
      : baseComparison.nextActions,
    evidence: queryAnswer
      ? [
          ...baseComparison.evidence,
          createEvidenceItem(
            "comparison-custom-query",
            "customer-uploaded-documents",
            "Custom comparison query",
            `User query "${normalizedCustomQuery}" applied as a ${queryAnswer.intent} comparison lens. Screening-only; official validation required.`,
            "low"
          )
        ]
      : baseComparison.evidence,
    customQuery: normalizedCustomQuery || undefined,
    customQueryIntent: queryAnswer?.intent,
    customQueryAnswer: queryAnswer ?? undefined
  };
}

function stableQuerySlug(query: string) {
  let hash = 0;
  const normalized = query.toLowerCase();

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36).slice(0, 6) || "query";
}
