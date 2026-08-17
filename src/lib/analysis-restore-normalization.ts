import { createMockExpressAnalysis } from "@/src/lib/mock-express-analysis";
import { deriveDecisionPosture } from "@/src/lib/decision-posture";
import { dubaiMarketAreas } from "@/src/data/dubai-market-areas";
import { findBestMarketMetricMatch } from "@/src/lib/market-metrics/matcher";
import { normalizeAreaName } from "@/src/lib/market-metrics/loader";
import {
  MARKET_METRICS_FALLBACK_RELEASE_GATE,
  MARKET_METRICS_SAMPLE_RELEASE_GATE,
  isMarketMetricsDecisionUseAllowed
} from "@/src/lib/market-metrics/release-gate";
import {
  canonicalizeRestoredAnalysisInputs,
  projectRestoreBoundaryMatches,
  type AnalysisRestoreContext,
  type CanonicalAnalysisRestoreInputs
} from "@/src/lib/analysis-restore-authority";
import type { MarketMetricsMatch, MarketMetricsReleaseGate } from "@/src/lib/market-metrics/types";
import type { AnalysisHistoryItem, AnalysisScenarioId, ExpressAnalysis, ScoreKey } from "@/src/types/geo";
import type { MarketContext, MarketMetric } from "@/src/types/market-context";

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
export const restoredAnalysisCanonicalNotice =
  "Saved structural inputs were restored and decision fields were rebuilt with the current deterministic screening model.";

const requiredDataCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

const legacyRestoreReleaseGate: MarketMetricsReleaseGate = Object.freeze({
  structurallyValid: false,
  screeningContextAvailable: true,
  decisionUse: "blocked",
  blockers: Object.freeze([
    "The saved result predates the current source release gate and must be re-analysed before source metrics may affect a decision score."
  ])
});

const persistedPayloadAuthorityBlocker =
  "Persisted analysis payloads cannot carry app-owned source release authority; the current source release must be re-evaluated by trusted application code.";

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
  return isFiniteNumber(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    isFiniteNumber(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180;
}

function hasValidScoreRecord(value: unknown) {
  if (!isRecord(value)) return false;
  return scoreKeys.every((key) => isFiniteNumber(value[key]));
}

function hasValidScoreLabels(value: unknown) {
  if (!isRecord(value)) return false;
  return scoreKeys.every((key) => typeof value[key] === "string");
}

function hasValidStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasValidEvidenceItem(value: unknown) {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.description === "string" &&
    typeof value.sourceId === "string" &&
    typeof value.sourceStatus === "string" &&
    typeof value.sourceType === "string" &&
    typeof value.confidence === "string";
}

function hasValidEvidenceArray(value: unknown) {
  return Array.isArray(value) && value.every(hasValidEvidenceItem);
}

function hasValidOptionalStringArray(value: unknown) {
  return value === undefined || hasValidStringArray(value);
}

function isRestorableExpressAnalysis(value: unknown): value is ExpressAnalysis {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 2_048 &&
    typeof value.scenarioId === "string" &&
    scenarioIds.has(value.scenarioId as AnalysisScenarioId) &&
    typeof value.title === "string" &&
    typeof value.subtitle === "string" &&
    typeof value.summary === "string" &&
    hasValidPoint(value.point) &&
    hasValidScoreRecord(value.scores) &&
    hasValidScoreLabels(value.scoreLabels) &&
    hasValidStringArray(value.keyFactors) &&
    hasValidStringArray(value.opportunities) &&
    hasValidStringArray(value.risks) &&
    hasValidStringArray(value.nextActions) &&
    hasValidEvidenceArray(value.evidence) &&
    hasValidOptionalStringArray(value.limitations) &&
    (value.marketContext === undefined || isRecord(value.marketContext)) &&
    (value.marketMetricsMatch === undefined || isRecord(value.marketMetricsMatch)) &&
    (value.customQuery === undefined || (typeof value.customQuery === "string" && value.customQuery.length <= 4_000)) &&
    (value.generatedAt === undefined || typeof value.generatedAt === "string")
  );
}

function readMatch(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function currentAppReleaseGate(match: Pick<MarketMetricsMatch, "metrics" | "sourceMode"> | Record<string, unknown> | null): MarketMetricsReleaseGate {
  const sourceMode = match?.sourceMode;
  const hasImportedSourceContext = Boolean(match?.metrics) ||
    sourceMode === "imported_sample" ||
    sourceMode === "imported_csv";
  const configuredGate = hasImportedSourceContext
    ? MARKET_METRICS_SAMPLE_RELEASE_GATE
    : MARKET_METRICS_FALLBACK_RELEASE_GATE;

  if (!isMarketMetricsDecisionUseAllowed(configuredGate)) {
    return configuredGate;
  }

  return Object.freeze({
    structurallyValid: false,
    screeningContextAvailable: configuredGate.screeningContextAvailable,
    decisionUse: "blocked",
    blockers: Object.freeze([
      ...configuredGate.blockers,
      persistedPayloadAuthorityBlocker
    ])
  });
}

function hasLegacyImportedEvidence(analysis: ExpressAnalysis) {
  return analysis.evidence.some((item) =>
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    (item.id.startsWith("imported-market-metrics-") ||
      item.label === "Imported DLD / Dubai Pulse-style market metrics")
  );
}

function releaseGateMatches(left: unknown, right: MarketMetricsReleaseGate) {
  if (!isRecord(left) || !Array.isArray(left.blockers)) return false;
  return left.structurallyValid === right.structurallyValid &&
    left.screeningContextAvailable === right.screeningContextAvailable &&
    left.decisionUse === right.decisionUse &&
    left.blockers.length === right.blockers.length &&
    left.blockers.every((item, index) => item === right.blockers[index]);
}

function isCurrentScreeningOnlyMatch(match: Record<string, unknown> | null) {
  if (!isRecord(match?.metrics) || match.importedMetricsUsed !== false) return false;
  const currentGate = currentAppReleaseGate(match);
  return currentGate.decisionUse === "blocked" && releaseGateMatches(match.releaseGate, currentGate);
}

function containsLegacyReanalysisMarker(analysis: ExpressAnalysis) {
  const limitations = Array.isArray(analysis.limitations) ? analysis.limitations : [];
  return analysis.analysisNotice === legacyAnalysisReanalysisNotice ||
    limitations.includes(legacyAnalysisReanalysisLimitation);
}

function wasLegacySourceAdjusted(analysis: ExpressAnalysis) {
  if (containsLegacyReanalysisMarker(analysis)) return true;

  const directMatch = readMatch(analysis.marketMetricsMatch);
  const contextMatch = readMatch(analysis.marketContext?.importedMarketMetrics);
  const effectiveMatch = directMatch ?? contextMatch;
  const claimsImportedDecisionUse = effectiveMatch?.importedMetricsUsed === true;
  const hasPersistedSourceMetrics = isRecord(effectiveMatch?.metrics);
  const currentScreeningOnlyMatch = isCurrentScreeningOnlyMatch(effectiveMatch);

  return claimsImportedDecisionUse ||
    (hasPersistedSourceMetrics && !currentScreeningOnlyMatch) ||
    hasLegacyImportedEvidence(analysis);
}

function normalizedBlockedMatch(
  match: MarketMetricsMatch,
  requiresReanalysis: boolean
): MarketMetricsMatch {
  const currentGate = currentAppReleaseGate(match);
  return {
    matchedAreaName: match.matchedAreaName,
    matchType: match.matchType,
    confidence: match.confidence,
    sourceMode: match.sourceMode,
    importedMetricsUsed: false,
    releaseGate: requiresReanalysis ? legacyRestoreReleaseGate : currentGate,
    metrics: match.metrics,
    note: requiresReanalysis
      ? "Current app-owned screening metrics were re-derived after restore; the saved source-adjusted result still requires re-analysis."
      : "Current app-owned screening metrics were re-derived and remain excluded from decision scoring by the current release policy."
  };
}

function genericMarketMetric(
  label: string,
  index: number,
  note: string
): MarketMetric {
  return {
    label,
    level: "medium",
    index,
    trend: "stable",
    confidence: "low",
    note
  };
}

function findCurrentStaticArea(areaName: string) {
  const normalized = normalizeAreaName(areaName);
  const alias = normalized === "jvc" ? "jumeirah village circle" : normalized;
  return dubaiMarketAreas.find((area) => {
    const candidate = normalizeAreaName(area.name);
    return candidate === alias || candidate.includes(alias) || alias.includes(candidate);
  }) ?? null;
}

function buildBrowserSafeMarketContext(
  match: MarketMetricsMatch,
  canonical: CanonicalAnalysisRestoreInputs,
  requiresReanalysis: boolean
): MarketContext {
  const area = findCurrentStaticArea(match.matchedAreaName);
  const limitations = Array.from(new Set([
    ...(area?.limitations ?? [
      "Precise district matching is not validated for this coordinate.",
      "General Dubai context is public/open screening context and not official market evidence."
    ]),
    ...(requiresReanalysis ? [legacyAnalysisReanalysisLimitation] : []),
    requiredDataCaveat
  ]));

  if (area) {
    return {
      areaName: area.name,
      emirate: area.emirate,
      centroid: area.centroid,
      matchDistanceKm: null,
      isGeneralContext: false,
      marketActivityLevel: area.marketActivityLevel,
      transactionContext: area.transactionContext,
      rentContext: area.rentContext,
      developmentPipelineContext: area.developmentPipelineContext,
      accessibilityContext: area.accessibilityContext,
      planningContext: area.planningContext,
      riskContext: area.riskContext,
      sourceMode: "seed_static",
      dataQualityNotes: [match.note, requiredDataCaveat],
      confidenceLevel: "low",
      sourceIds: area.sourceIds,
      limitations
    };
  }

  const generalNote = "Current browser-safe Dubai screening context; official source validation is required.";
  return {
    areaName: "Dubai general context",
    emirate: "Dubai",
    centroid: canonical.point,
    matchDistanceKm: null,
    isGeneralContext: true,
    marketActivityLevel: genericMarketMetric("Market activity", 58, generalNote),
    transactionContext: genericMarketMetric("Transaction context", 54, generalNote),
    rentContext: genericMarketMetric("Rent context", 53, generalNote),
    developmentPipelineContext: genericMarketMetric("Development pipeline", 60, generalNote),
    accessibilityContext: genericMarketMetric("Accessibility", 56, generalNote),
    planningContext: genericMarketMetric("Planning context", 52, generalNote),
    riskContext: genericMarketMetric("Risk context", 59, generalNote),
    sourceMode: "seed_static",
    dataQualityNotes: [match.note, requiredDataCaveat],
    confidenceLevel: "low",
    sourceIds: ["dubai-market-context", "osm-geofabrik"],
    limitations
  };
}

function rebuildCurrentMarketScreening(
  analysis: ExpressAnalysis,
  canonical: CanonicalAnalysisRestoreInputs,
  requiresReanalysis: boolean
) {
  const hasPersistedScreeningContext = Boolean(
    readMatch(analysis.marketMetricsMatch) ||
    readMatch(analysis.marketContext?.importedMarketMetrics) ||
    isRecord(analysis.marketContext)
  );
  if (!hasPersistedScreeningContext) {
    return { marketContext: undefined, marketMetricsMatch: undefined };
  }

  try {
    const currentMatch = findBestMarketMetricMatch({
      point: canonical.point,
      selectedObject: canonical.selectedObject ?? null
    });
    const blockedMatch = normalizedBlockedMatch(currentMatch, requiresReanalysis);
    const currentMarketContext = buildBrowserSafeMarketContext(
      blockedMatch,
      canonical,
      requiresReanalysis
    );

    return {
      marketMetricsMatch: blockedMatch,
      marketContext: {
        ...currentMarketContext,
        importedMarketMetrics: blockedMatch,
        confidenceLevel: "low" as const
      }
    };
  } catch {
    return { marketContext: undefined, marketMetricsMatch: undefined };
  }
}

function rebuildCanonicalAnalysis(
  analysis: ExpressAnalysis,
  canonical: CanonicalAnalysisRestoreInputs,
  requiresReanalysis: boolean
): ExpressAnalysis | null {
  try {
    const baseline = createMockExpressAnalysis(
      canonical.point,
      analysis.scenarioId,
      canonical.customQuery,
      canonical.selectedObject ?? null,
      canonical.selectedAoi ?? null
    );
    const currentMarket = rebuildCurrentMarketScreening(analysis, canonical, requiresReanalysis);

    return {
      id: analysis.id,
      scenarioId: analysis.scenarioId,
      title: baseline.title,
      subtitle: baseline.subtitle,
      point: canonical.point,
      selectedObject: canonical.selectedObject,
      selectedAoi: canonical.selectedAoi,
      analysisTarget: canonical.analysisTarget,
      summary: baseline.summary,
      scoreLabels: baseline.scoreLabels,
      scores: baseline.scores,
      keyFactors: baseline.keyFactors,
      opportunities: baseline.opportunities,
      risks: baseline.risks,
      nextActions: requiresReanalysis
        ? Array.from(new Set([
            "Run this analysis again before reviewing or exporting a decision result.",
            ...baseline.nextActions
          ]))
        : baseline.nextActions,
      evidence: baseline.evidence,
      marketContext: currentMarket.marketContext,
      marketMetricsMatch: currentMarket.marketMetricsMatch,
      uploadedDataContext: canonical.uploadedDataContext,
      customQuery: canonical.customQuery || undefined,
      customQueryIntent: baseline.customQueryIntent,
      customQuerySummary: baseline.customQuerySummary,
      customQueryAnswer: baseline.customQueryAnswer,
      aiDecisionScore: undefined,
      project: canonical.project,
      generatedAt: analysis.generatedAt,
      analysisMode: "mock_fallback",
      confidenceLevel: requiresReanalysis ? "low" : "medium",
      analysisNotice: requiresReanalysis
        ? legacyAnalysisReanalysisNotice
        : restoredAnalysisCanonicalNotice,
      limitations: Array.from(new Set([
        ...(baseline.limitations ?? []),
        ...(requiresReanalysis ? [legacyAnalysisReanalysisLimitation] : []),
        requiredDataCaveat
      ]))
    };
  } catch {
    return null;
  }
}

function canonicalLocationLabel(analysis: ExpressAnalysis) {
  return analysis.selectedAoi?.name ??
    analysis.selectedObject?.name ??
    `${analysis.point.latitude.toFixed(5)}, ${analysis.point.longitude.toFixed(5)}`;
}

export function restoredAnalysisRequiresReanalysis(analysis: ExpressAnalysis) {
  try {
    return containsLegacyReanalysisMarker(analysis) || wasLegacySourceAdjusted(analysis);
  } catch {
    return true;
  }
}

export function normalizeRestoredExpressAnalysis(
  value: unknown,
  context: AnalysisRestoreContext
): NormalizedRestoredAnalysis | null {
  try {
    if (!isRestorableExpressAnalysis(value)) return null;
    const canonical = canonicalizeRestoredAnalysisInputs(value, context);
    if (!canonical) return null;

    const requiresReanalysis = wasLegacySourceAdjusted(value);
    const rebuilt = rebuildCanonicalAnalysis(value, canonical, requiresReanalysis);
    return rebuilt
      ? {
          analysis: rebuilt,
          requiresReanalysis
        }
      : null;
  } catch {
    return null;
  }
}

export function normalizeRestoredAnalysisHistoryItem(
  value: unknown,
  context: AnalysisRestoreContext
): NormalizedAnalysisHistoryItem | null {
  try {
    if (!isRecord(value)) return null;
    const itemProject = isRecord(value.project) ? value.project : undefined;
    const sourceProjectKey = typeof value.projectKey === "string"
      ? value.projectKey
      : typeof itemProject?.projectKey === "string"
        ? itemProject.projectKey
        : context.sourceProjectKey;
    const sourceProjectId = value.projectId === null || typeof value.projectId === "string"
      ? value.projectId
      : itemProject?.id === null || typeof itemProject?.id === "string"
        ? itemProject.id
        : context.sourceProjectId;
    const itemContext: AnalysisRestoreContext = {
      ...context,
      sourceProjectKey,
      sourceProjectId
    };
    if (!projectRestoreBoundaryMatches(value.project, itemContext, true)) return null;

    const normalized = normalizeRestoredExpressAnalysis(value.analysis, itemContext);
    if (!normalized) return null;

    return {
      requiresReanalysis: normalized.requiresReanalysis,
      item: {
        id: typeof value.id === "string" ? value.id : normalized.analysis.id,
        title: normalized.analysis.selectedAoi?.name ?? normalized.analysis.selectedObject?.name ?? normalized.analysis.title,
        scenarioId: normalized.analysis.scenarioId,
        scenarioLabel: normalized.analysis.title,
        timestamp: typeof value.timestamp === "string" ? value.timestamp : normalized.analysis.generatedAt ?? "",
        locationLabel: canonicalLocationLabel(normalized.analysis),
        recommendation: normalized.requiresReanalysis
          ? legacyAnalysisReanalysisPosture
          : deriveDecisionPosture(normalized.analysis),
        analysisMode: normalized.analysis.analysisMode,
        confidenceLevel: normalized.analysis.confidenceLevel,
        dataConfidenceLevel: normalized.analysis.marketContext?.confidenceLevel ?? "Canonical deterministic screening",
        source: value.source === "DB" ? "DB" : "local",
        project: context.expectedProject,
        projectKey: context.expectedProject.projectKey,
        analysis: normalized.analysis
      }
    };
  } catch {
    return null;
  }
}
