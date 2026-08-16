import { createMockExpressAnalysis } from "@/src/lib/mock-express-analysis";
import { isMarketMetricsDecisionUseAllowed } from "@/src/lib/market-metrics/release-gate";
import type { MarketMetricsMatch, MarketMetricsReleaseGate } from "@/src/lib/market-metrics/types";
import type { AnalysisHistoryItem, AnalysisScenarioId, ExpressAnalysis, ScoreKey } from "@/src/types/geo";

const scenarioIds = new Set<AnalysisScenarioId>([
  "realEstateDevelopment",
  "investmentSiteSelection",
  "constructionMonitoring",
  "infrastructureUrbanPlanning",
  "climateRisk",
  "customQuery"
]);

const scoreKeys: ScoreKey[] = [
  "developmentPotential",
  "investmentAttractiveness",
  "accessibility",
  "infrastructureReadiness",
  "climateHeatRisk",
  "overallRisk"
];

export const legacyAnalysisReanalysisPosture = "Re-analysis required";
export const legacyAnalysisReanalysisNotice =
  "This saved analysis used legacy source-adjusted scoring. Its previous scores were withheld; run the analysis again under the current source release gate.";
export const legacyAnalysisReanalysisLimitation =
  "Legacy source-adjusted scores and derived decision values were discarded during restore. Re-analysis is required before this result can be reviewed or exported.";

const legacyRestoreReleaseGate: MarketMetricsReleaseGate = Object.freeze({
  structurallyValid: false,
  screeningContextAvailable: true,
  decisionUse: "blocked",
  blockers: Object.freeze([
    "The saved result predates the current source release gate and must be re-analysed before source metrics may affect a decision score."
  ])
});

type NormalizedRestoredAnalysis = {
  analysis: ExpressAnalysis;
  requiresReanalysis: boolean;
};

type NormalizedAnalysisHistoryItem = {
  item: AnalysisHistoryItem;
  requiresReanalysis: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasValidPoint(value: unknown) {
  if (!isRecord(value)) return false;
  return isFiniteNumber(value.latitude) && isFiniteNumber(value.longitude);
}

function hasValidScoreRecord(value: unknown) {
  if (!isRecord(value)) return false;
  return scoreKeys.every((key) => isFiniteNumber(value[key]));
}

function hasValidStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRestorableExpressAnalysis(value: unknown): value is ExpressAnalysis {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.scenarioId === "string" &&
    scenarioIds.has(value.scenarioId as AnalysisScenarioId) &&
    typeof value.title === "string" &&
    typeof value.subtitle === "string" &&
    typeof value.summary === "string" &&
    hasValidPoint(value.point) &&
    hasValidScoreRecord(value.scores) &&
    isRecord(value.scoreLabels) &&
    hasValidStringArray(value.keyFactors) &&
    hasValidStringArray(value.opportunities) &&
    hasValidStringArray(value.risks) &&
    hasValidStringArray(value.nextActions) &&
    Array.isArray(value.evidence)
  );
}

function isReleaseGate(value: unknown): value is MarketMetricsReleaseGate {
  if (!isRecord(value)) return false;
  return (
    typeof value.structurallyValid === "boolean" &&
    typeof value.screeningContextAvailable === "boolean" &&
    (value.decisionUse === "allowed" || value.decisionUse === "blocked") &&
    Array.isArray(value.blockers) &&
    value.blockers.every((item) => typeof item === "string")
  );
}

function readMatch(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function hasAllowedDecisionGate(match: Record<string, unknown> | null) {
  const gate = match?.releaseGate;
  return isReleaseGate(gate) && isMarketMetricsDecisionUseAllowed(gate);
}

function hasLegacyImportedEvidence(analysis: ExpressAnalysis) {
  return analysis.evidence.some((item) =>
    item.id.startsWith("imported-market-metrics-") ||
    item.label === "Imported DLD / Dubai Pulse-style market metrics"
  );
}

function withoutLegacyImportedEvidence(analysis: ExpressAnalysis) {
  return analysis.evidence.filter((item) =>
    !item.id.startsWith("imported-market-metrics-") &&
    item.label !== "Imported DLD / Dubai Pulse-style market metrics"
  );
}

function normalizedBlockedMatch(
  match: Record<string, unknown> | null,
  requiresReanalysis: boolean
): MarketMetricsMatch | undefined {
  if (!match) return undefined;
  const existingGate = isReleaseGate(match.releaseGate) && !isMarketMetricsDecisionUseAllowed(match.releaseGate)
    ? match.releaseGate
    : legacyRestoreReleaseGate;
  const existingNote = typeof match.note === "string" ? match.note : "A saved market-metrics match was found.";

  return {
    ...(match as MarketMetricsMatch),
    importedMetricsUsed: false,
    releaseGate: requiresReanalysis ? legacyRestoreReleaseGate : existingGate,
    note: requiresReanalysis
      ? `${existingNote} Available only as screening context; re-analysis is required.`
      : existingNote
  };
}

function containsLegacyReanalysisMarker(analysis: ExpressAnalysis) {
  return analysis.analysisNotice === legacyAnalysisReanalysisNotice ||
    analysis.limitations?.includes(legacyAnalysisReanalysisLimitation) === true;
}

function wasLegacySourceAdjusted(analysis: ExpressAnalysis) {
  if (containsLegacyReanalysisMarker(analysis)) return true;

  const directMatch = readMatch(analysis.marketMetricsMatch);
  const contextMatch = readMatch(analysis.marketContext?.importedMarketMetrics);
  const effectiveMatch = directMatch ?? contextMatch;
  const gateAllowsDecisionUse = hasAllowedDecisionGate(effectiveMatch);
  const claimsImportedDecisionUse = effectiveMatch?.importedMetricsUsed === true;
  const predatesReleaseGate = Boolean(effectiveMatch?.metrics) && !isReleaseGate(effectiveMatch?.releaseGate);

  return !gateAllowsDecisionUse && (
    claimsImportedDecisionUse ||
    predatesReleaseGate ||
    hasLegacyImportedEvidence(analysis)
  );
}

function hasBlockedSourceMatch(analysis: ExpressAnalysis) {
  const directMatch = readMatch(analysis.marketMetricsMatch);
  const contextMatch = readMatch(analysis.marketContext?.importedMarketMetrics);
  const effectiveMatch = directMatch ?? contextMatch;
  return Boolean(effectiveMatch) && !hasAllowedDecisionGate(effectiveMatch);
}

function rebuildBlockedSourceScores(analysis: ExpressAnalysis): ExpressAnalysis | null {
  try {
    const baseline = createMockExpressAnalysis(
      analysis.point,
      analysis.scenarioId,
      analysis.customQuery ?? "",
      analysis.selectedObject ?? null,
      analysis.selectedAoi ?? null
    );
    const directMatch = readMatch(analysis.marketMetricsMatch);
    const contextMatch = readMatch(analysis.marketContext?.importedMarketMetrics);
    const blockedMatch = normalizedBlockedMatch(directMatch ?? contextMatch, false);

    return {
      ...analysis,
      scores: baseline.scores,
      aiDecisionScore: undefined,
      marketMetricsMatch: blockedMatch,
      marketContext: analysis.marketContext
        ? {
            ...analysis.marketContext,
            importedMarketMetrics: blockedMatch
          }
        : undefined
    };
  } catch {
    return null;
  }
}

function rebuildLegacyAnalysis(analysis: ExpressAnalysis): ExpressAnalysis | null {
  try {
    const baseline = createMockExpressAnalysis(
      analysis.point,
      analysis.scenarioId,
      analysis.customQuery ?? "",
      analysis.selectedObject ?? null,
      analysis.selectedAoi ?? null
    );
    const directMatch = readMatch(analysis.marketMetricsMatch);
    const contextMatch = readMatch(analysis.marketContext?.importedMarketMetrics);
    const blockedMatch = normalizedBlockedMatch(directMatch ?? contextMatch, true);
    const preservedEvidence = withoutLegacyImportedEvidence(analysis);
    const evidenceById = new Map(
      [...baseline.evidence, ...preservedEvidence].map((item) => [item.id, item])
    );
    const normalizedMarketContext = analysis.marketContext
      ? {
          ...analysis.marketContext,
          importedMarketMetrics: blockedMatch,
          dataQualityNotes: Array.from(new Set([
            legacyAnalysisReanalysisLimitation,
            ...(analysis.marketContext.dataQualityNotes ?? [])
          ])),
          limitations: Array.from(new Set([
            legacyAnalysisReanalysisLimitation,
            ...analysis.marketContext.limitations
          ]))
        }
      : undefined;

    return {
      ...analysis,
      scoreLabels: baseline.scoreLabels,
      scores: baseline.scores,
      summary: `${baseline.summary} ${legacyAnalysisReanalysisNotice}`,
      keyFactors: baseline.keyFactors,
      opportunities: baseline.opportunities,
      risks: baseline.risks,
      nextActions: Array.from(new Set([
        "Run this analysis again before reviewing or exporting a decision result.",
        ...baseline.nextActions
      ])),
      evidence: Array.from(evidenceById.values()),
      marketContext: normalizedMarketContext,
      marketMetricsMatch: blockedMatch,
      customQueryIntent: baseline.customQueryIntent,
      customQuerySummary: baseline.customQuerySummary,
      customQueryAnswer: baseline.customQueryAnswer,
      aiDecisionScore: undefined,
      confidenceLevel: "low",
      analysisNotice: legacyAnalysisReanalysisNotice,
      limitations: Array.from(new Set([
        legacyAnalysisReanalysisLimitation,
        ...(baseline.limitations ?? []),
        ...(analysis.limitations ?? [])
      ]))
    };
  } catch {
    return null;
  }
}

export function restoredAnalysisRequiresReanalysis(analysis: ExpressAnalysis) {
  return containsLegacyReanalysisMarker(analysis) || wasLegacySourceAdjusted(analysis);
}

export function normalizeRestoredExpressAnalysis(value: unknown): NormalizedRestoredAnalysis | null {
  if (!isRestorableExpressAnalysis(value)) return null;

  const requiresReanalysis = wasLegacySourceAdjusted(value);
  if (!requiresReanalysis && hasBlockedSourceMatch(value)) {
    const rebuilt = rebuildBlockedSourceScores(value);
    return rebuilt
      ? {
          analysis: rebuilt,
          requiresReanalysis: false
        }
      : null;
  }

  if (!requiresReanalysis) {
    return {
      analysis: value,
      requiresReanalysis: false
    };
  }

  const rebuilt = rebuildLegacyAnalysis(value);
  return rebuilt
    ? {
        analysis: rebuilt,
        requiresReanalysis: true
      }
    : null;
}

export function normalizeRestoredAnalysisHistoryItem(value: unknown): NormalizedAnalysisHistoryItem | null {
  if (!isRecord(value)) return null;

  const normalized = normalizeRestoredExpressAnalysis(value.analysis);
  if (!normalized) return null;

  const candidate = value as unknown as AnalysisHistoryItem;
  return {
    requiresReanalysis: normalized.requiresReanalysis,
    item: {
      ...candidate,
      id: typeof value.id === "string" ? value.id : normalized.analysis.id,
      title: typeof value.title === "string" ? value.title : normalized.analysis.title,
      scenarioId: normalized.analysis.scenarioId,
      scenarioLabel: typeof value.scenarioLabel === "string" ? value.scenarioLabel : normalized.analysis.title,
      timestamp: typeof value.timestamp === "string" ? value.timestamp : normalized.analysis.generatedAt ?? "",
      locationLabel: typeof value.locationLabel === "string" ? value.locationLabel : normalized.analysis.subtitle,
      recommendation: normalized.requiresReanalysis
        ? legacyAnalysisReanalysisPosture
        : typeof value.recommendation === "string"
          ? value.recommendation
          : "Official validation required",
      confidenceLevel: normalized.requiresReanalysis ? "low" : candidate.confidenceLevel,
      analysis: normalized.analysis
    }
  };
}
