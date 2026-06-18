import { createEvidenceItem } from "@/src/data/data-source-registry";
import type { ExpressAnalysis, ScoreKey } from "@/src/types/geo";
import type { MarketMetricScoreSignals, MarketMetricsMatch } from "@/src/lib/market-metrics/types";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreSignalsFromMarketMetrics(match: MarketMetricsMatch): MarketMetricScoreSignals | null {
  if (!match.metrics) {
    return null;
  }

  const transactionCount = match.metrics.transactionCount;
  const rentalRecordCount = match.metrics.rentalRecordCount;
  const tinySample = transactionCount < 5;
  const liquidityCap = tinySample ? 55 : 100;
  const demandCap = rentalRecordCount < 5 ? 58 : 100;
  const liquidityIndex = Math.min(match.metrics.liquidityIndex ?? 0, liquidityCap);
  const rentalDemandProxy = Math.min(match.metrics.rentalDemandProxy ?? 0, demandCap);
  const pipelinePressure = clampScore(match.metrics.pipelineProxy ?? match.metrics.projectCount * 12);
  const marketSupport = clampScore(liquidityIndex * 0.45 + rentalDemandProxy * 0.45 + (100 - Math.min(pipelinePressure, 80)) * 0.1);

  return {
    liquidityIndex,
    rentalDemandProxy,
    pipelinePressure,
    marketSupport,
    dataConfidence: tinySample ? "low" : match.metrics.dataConfidence,
    sampleSizeNote: tinySample
      ? "Transaction sample is below 5 records, so liquidity and demand proxies are capped for conservative scoring."
      : "Imported metrics provide broader sample support for market scoring."
  };
}

export function adjustScoresWithMarketMetrics(analysis: ExpressAnalysis, match: MarketMetricsMatch): Record<ScoreKey, number> {
  const signals = scoreSignalsFromMarketMetrics(match);
  if (!signals) {
    return analysis.scores;
  }

  const scores = { ...analysis.scores };
  const marketSupportDelta = (signals.marketSupport - 50) * 0.12;
  const pipelineRiskDelta = Math.max(0, signals.pipelinePressure - 55) * 0.08;

  if (analysis.scenarioId === "investmentSiteSelection") {
    scores.investmentAttractiveness = clampScore(scores.investmentAttractiveness + marketSupportDelta);
    scores.accessibility = clampScore(scores.accessibility + (signals.liquidityIndex - 50) * 0.04);
    scores.overallRisk = clampScore(scores.overallRisk + pipelineRiskDelta - (signals.liquidityIndex - 50) * 0.04);
  } else if (analysis.scenarioId === "realEstateDevelopment") {
    scores.developmentPotential = clampScore(scores.developmentPotential + (signals.rentalDemandProxy - 50) * 0.1);
    scores.investmentAttractiveness = clampScore(scores.investmentAttractiveness + marketSupportDelta * 0.8);
    scores.overallRisk = clampScore(scores.overallRisk + pipelineRiskDelta);
  } else if (analysis.scenarioId === "climateRisk") {
    scores.investmentAttractiveness = clampScore(scores.investmentAttractiveness + marketSupportDelta * 0.4);
  } else {
    scores.investmentAttractiveness = clampScore(scores.investmentAttractiveness + marketSupportDelta * 0.6);
    scores.developmentPotential = clampScore(scores.developmentPotential + (signals.rentalDemandProxy - 50) * 0.05);
  }

  return scores;
}

export function enrichAnalysisWithMarketMetrics(analysis: ExpressAnalysis, match: MarketMetricsMatch): ExpressAnalysis {
  const importedEvidence = match.importedMetricsUsed
    ? createEvidenceItem(
        `imported-market-metrics-${match.matchedAreaName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        "dubai-pulse-dld-apis",
        "Imported DLD / Dubai Pulse-style market metrics",
        `Local ingestion pipeline source: data/normalized/market_area_metrics.json. Used for market context and scenario scoring for ${match.matchedAreaName}. Sample/manual import; validate against official DLD / Dubai Pulse datasets before underwriting or development decisions.`,
        match.confidence
      )
    : null;
  const signals = scoreSignalsFromMarketMetrics(match);
  const summarySuffix = match.importedMetricsUsed && match.metrics
    ? ` Imported market metrics for ${match.matchedAreaName} were available from the local DLD/Dubai Pulse-style ingestion prototype and used to support liquidity and demand proxy scoring. These metrics remain sample/manual-import derived and require official validation before underwriting.`
    : ` No imported market metrics were matched to this selection; the memo uses seed_static demo context and should be validated against official DLD/Dubai Pulse datasets.`;

  return {
    ...analysis,
    summary: `${analysis.summary}${summarySuffix}`,
    scores: adjustScoresWithMarketMetrics(analysis, match),
    keyFactors: match.importedMetricsUsed && match.metrics
      ? [
          `Imported market support for ${match.matchedAreaName}: liquidity ${signals?.liquidityIndex ?? "-"}, rental demand ${signals?.rentalDemandProxy ?? "-"}, pipeline pressure ${signals?.pipelinePressure ?? "-"}.`,
          ...analysis.keyFactors
        ].slice(0, 7)
      : analysis.keyFactors,
    risks: match.importedMetricsUsed
      ? [
          "Imported market metrics are sample/manual-import derived and require official DLD / Dubai Pulse validation before investment decisions.",
          ...analysis.risks
        ].slice(0, 5)
      : analysis.risks,
    nextActions: match.importedMetricsUsed
      ? [
          "Validate imported market metrics against official DLD / Dubai Pulse exports before underwriting.",
          ...analysis.nextActions
        ].slice(0, 6)
      : analysis.nextActions,
    evidence: importedEvidence
      ? [
          importedEvidence,
          ...analysis.evidence.filter((item) => item.id !== importedEvidence.id)
        ]
      : analysis.evidence,
    marketMetricsMatch: match
  };
}
