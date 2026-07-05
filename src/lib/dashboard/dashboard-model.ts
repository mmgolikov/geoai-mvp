import { deriveDecisionPosture, deriveDecisionRationale } from "@/src/lib/decision-posture";
import type { AnalysisScenarioId, ExpressAnalysis, ScoreKey } from "@/src/types/geo";

export type DashboardTone = "positive" | "neutral" | "warning" | "critical";

export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  numericValue?: number;
  unit?: string;
  tone: DashboardTone;
  explanation?: string;
};

export type DashboardDriver = {
  id: string;
  label: string;
  score?: number;
  type: "driver" | "risk" | "validation" | "action";
  detail: string;
};

export type DashboardMatrixItem = {
  id: string;
  label: string;
  x: number;
  y: number;
  tone: DashboardTone;
};

export type DashboardInsightModule = {
  id: string;
  title: string;
  subtitle: string;
  type:
    | "score_bars"
    | "risk_matrix"
    | "ranked_drivers"
    | "validation_gaps"
    | "next_actions"
    | "scenario_hypothesis"
    | "evidence_summary";
  priority: number;
  summary: string;
  items: DashboardDriver[];
  defaultOpen?: boolean;
};

export type DashboardModel = {
  title: string;
  scenarioLabel: string;
  targetLabel: string;
  decisionPosture: string;
  decisionSummary: string;
  decisionDetail: string;
  primaryScore: number;
  confidenceLabel: string;
  riskLabel: string;
  recommendedNextAction: string;
  recommendedNextActionDetail: string;
  kpis: DashboardKpi[];
  drivers: DashboardDriver[];
  risks: DashboardDriver[];
  validationGaps: DashboardDriver[];
  actions: DashboardDriver[];
  matrix: DashboardMatrixItem[];
  modules: DashboardInsightModule[];
};

const scoreLabels: Record<ScoreKey, string> = {
  developmentPotential: "Development",
  investmentAttractiveness: "Investment",
  accessibility: "Access",
  infrastructureReadiness: "Infrastructure",
  climateHeatRisk: "Climate risk",
  overallRisk: "Overall risk"
};

const scenarioLabels: Record<AnalysisScenarioId, string> = {
  realEstateDevelopment: "Redevelopment screening",
  investmentSiteSelection: "Investment site selection",
  constructionMonitoring: "Construction monitoring",
  infrastructureUrbanPlanning: "Infrastructure planning",
  climateRisk: "Climate risk screening",
  customQuery: "Custom screening"
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toneForPositiveScore(value: number): DashboardTone {
  if (value >= 75) return "positive";
  if (value >= 55) return "neutral";
  return "warning";
}

function toneForRiskScore(value: number): DashboardTone {
  if (value >= 70) return "critical";
  if (value >= 50) return "warning";
  return "positive";
}

function shortLabel(value: string, fallback: string, maxLength = 52) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.length <= maxLength) return trimmed;

  const boundary = trimmed.slice(0, maxLength).lastIndexOf(" ");
  return trimmed.slice(0, boundary > 24 ? boundary : maxLength).trim();
}

function sentenceSummary(value: string, fallback: string) {
  const trimmed = value.trim();
  const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0]?.trim();

  if (firstSentence && firstSentence.length <= 140) {
    return firstSentence;
  }

  return fallback;
}

export function detailText(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function shortDecisionPosture(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("compare")) return "Compare before advancing";
  if (normalized.includes("hold") || normalized.includes("reject") || normalized.includes("not proceed")) {
    return "Hold for validation";
  }
  if (normalized.includes("proceed") && normalized.includes("valid")) return "Proceed with validation";
  if (normalized.includes("proceed") || normalized.includes("advance")) return "Proceed conditionally";
  if (normalized.includes("valid")) return "Validate first";

  return shortLabel(value, "Review required", 36);
}

export function shortRiskLabel(score: number) {
  if (score >= 70) return "Elevated";
  if (score >= 50) return "Moderate";
  return "Managed";
}

export function shortConfidenceLabel(value?: string) {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "high") return "High";
  if (normalized === "low") return "Low";
  return "Medium";
}

export function shortValidationLabel(count: number) {
  if (count === 0) return "No open gaps";
  if (count === 1) return "1 gap";
  return `${count} gaps`;
}

export function shortNextAction(actions: DashboardDriver[]) {
  const action = actions[0]?.detail ?? actions[0]?.label ?? "";
  const normalized = action.toLowerCase();

  if (normalized.includes("compare")) return "Compare shortlist";
  if (normalized.includes("memo") || normalized.includes("report")) return "Prepare memo";
  if (normalized.includes("site visit") || normalized.includes("field")) return "Plan site visit";
  if (normalized.includes("land-use") || normalized.includes("land use") || normalized.includes("zoning")) return "Check zoning";
  if (normalized.includes("planning")) return "Check planning";
  if (normalized.includes("market")) return "Validate market";
  if (normalized.includes("source") || normalized.includes("official") || normalized.includes("valid")) return "Validate sources";
  if (normalized.includes("due diligence") || normalized.includes("diligence")) return "Run diligence";

  return shortLabel(action, "Validate sources", 34);
}

function evidenceKpi(analysis: ExpressAnalysis): DashboardKpi {
  const appliedUploadMetrics = analysis.uploadedDataContext?.appliedMetrics.length ?? 0;
  const uploadedDatasets = analysis.uploadedDataContext?.uploadedDatasets.length ?? 0;
  const userProvidedGeometry =
    analysis.selectedAoi?.sourceType === "uploaded_geojson" ||
    analysis.selectedAoi?.source === "uploaded_geojson_polygon" ||
    analysis.analysisTarget?.type === "uploaded-feature" ||
    analysis.analysisTarget?.sourceMode === "user-uploaded";
  const userDrawnGeometry = Boolean(
    analysis.selectedAoi?.sourceType === "user_drawn" ||
      analysis.selectedAoi?.source === "user_drawn_polygon" ||
      analysis.analysisTarget?.type === "user-drawn-aoi" ||
      analysis.analysisTarget?.sourceMode === "user-drawn"
  );
  const importedMetrics =
    appliedUploadMetrics > 0 ||
    Boolean(analysis.marketMetricsMatch?.importedMetricsUsed) ||
    Boolean(analysis.marketContext?.importedMarketMetrics?.importedMetricsUsed);
  const hasOpenContext = analysis.evidence.some((item) =>
    item.sourceType === "open_data" || item.sourceType === "open_geospatial"
  );

  if (userProvidedGeometry) {
    return {
      id: "evidence",
      label: "Evidence",
      value: "User data",
      tone: "neutral",
      explanation: "User-provided geometry or data; official/client validation required."
    };
  }

  if (userDrawnGeometry) {
    return {
      id: "evidence",
      label: "Evidence",
      value: "User AOI",
      tone: "neutral",
      explanation: "User-defined screening geometry; official/client validation required."
    };
  }

  if (importedMetrics) {
    return {
      id: "evidence",
      label: "Evidence",
      value: "Imported",
      tone: "neutral",
      explanation: "Manual/sample metrics support screening only; official validation required."
    };
  }

  if (uploadedDatasets > 0) {
    return {
      id: "evidence",
      label: "Evidence",
      value: "User files",
      tone: "neutral",
      explanation: "Uploaded files are available for screening; official/client validation required."
    };
  }

  return {
    id: "evidence",
    label: "Evidence",
    value: hasOpenContext ? "Sample/open" : "Sample",
    tone: "neutral",
    explanation: "Source lineage is available; official/client validation required."
  };
}

function shortSignalLabel(value: string, type: DashboardDriver["type"], index: number, prefix: string) {
  const normalized = value.toLowerCase();

  if (type === "action") {
    if (normalized.includes("compare")) return "Compare alternatives";
    if (normalized.includes("attach") || normalized.includes("evidence") || normalized.includes("official")) return "Attach evidence";
    if (normalized.includes("checklist") || normalized.includes("valid")) return "Prepare validation";
    if (normalized.includes("memo") || normalized.includes("report")) return "Prepare memo";
    if (normalized.includes("market")) return "Validate market";
    return shortLabel(value, `Action ${index + 1}`, 34);
  }

  if (type === "risk") {
    if (normalized.includes("risk score")) return "Risk level";
    if (normalized.includes("parcel") || normalized.includes("zoning") || normalized.includes("ownership")) return "Official planning gap";
    if (normalized.includes("openai") || normalized.includes("fallback")) return "AI fallback";
    if (normalized.includes("climate") || normalized.includes("heat")) return "Climate exposure";
    if (normalized.includes("source") || normalized.includes("official") || normalized.includes("valid")) return "Source validation";
    return shortLabel(value, `Risk ${index + 1}`, 34);
  }

  if (type === "validation") {
    if (normalized.includes("parcel") || normalized.includes("zoning") || normalized.includes("ownership")) return "Official planning check";
    if (normalized.includes("openai") || normalized.includes("fallback")) return "AI scoring check";
    if (normalized.includes("market")) return "Market validation";
    if (normalized.includes("source") || normalized.includes("official")) return "Source validation";
    return shortLabel(value, `Validation ${index + 1}`, 34);
  }

  if (normalized.includes("real estate") || normalized.includes("development")) return "Development fit";
  if (normalized.includes("suitability")) return "Suitability mix";
  if (normalized.includes("snapshot") || normalized.includes("evidence")) return "Evidence quality";
  if (normalized.includes("access")) return "Access signal";
  if (normalized.includes("infrastructure")) return "Infrastructure readiness";
  if (normalized.includes("market")) return "Market context";
  if (normalized.includes("climate") || normalized.includes("heat")) return "Climate context";

  return shortLabel(value, `${prefix} ${index + 1}`, 34);
}

function uniqueText(items: string[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (seen.has(key)) return false;
    seen.add(key);
    return item.trim().length > 0;
  });
}

function driverItems(items: string[], type: DashboardDriver["type"], baseScore: number, prefix: string) {
  return uniqueText(items).slice(0, 3).map((item, index) => ({
    id: `${prefix}-${index}`,
    label: shortSignalLabel(item, type, index, prefix),
    detail: item,
    score: clampScore(baseScore - index * 6),
    type
  }));
}

function validationItems(analysis: ExpressAnalysis) {
  const items = [
    ...(analysis.aiDecisionScore?.validationRequired ?? []),
    ...(analysis.customQueryAnswer?.validationNeeded ?? []),
    ...(analysis.limitations ?? [])
  ];

  return driverItems(items, "validation", 72, "validation");
}

function actionItems(analysis: ExpressAnalysis) {
  const actions = [
    ...(analysis.aiDecisionScore?.nextActions ?? []),
    ...(analysis.customQueryAnswer?.nextActions ?? []),
    ...analysis.nextActions
  ];

  return driverItems(actions, "action", 78, "action");
}

function scenarioHypothesis(analysis: ExpressAnalysis, decisionPosture: string) {
  const target = analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? "selected site";
  const recommendedUse = analysis.aiDecisionScore?.recommendedUse
    ? analysis.aiDecisionScore.recommendedUse.replace(/_/g, " ")
    : decisionPosture;

  const summaries: Record<AnalysisScenarioId, string> = {
    realEstateDevelopment: `${target}: redevelopment or reuse hypothesis with planning and infrastructure validation required.`,
    investmentSiteSelection: `${target}: investment shortlist hypothesis with market, access and risk checks still required.`,
    constructionMonitoring: `${target}: monitoring setup hypothesis with imagery, schedule and site-status validation required.`,
    infrastructureUrbanPlanning: `${target}: infrastructure planning hypothesis with corridor, utility and public-realm checks required.`,
    climateRisk: `${target}: resilience screening hypothesis with heat, flood and mitigation layers to validate.`,
    customQuery: `${target}: custom screening answer with evidence gaps to validate.`
  };

  return {
    title: scenarioLabels[analysis.scenarioId],
    summary: summaries[analysis.scenarioId],
    recommendedUse
  };
}

function scoreDrivers(analysis: ExpressAnalysis): DashboardDriver[] {
  const relevantScores: ScoreKey[] =
    analysis.scenarioId === "climateRisk"
      ? ["climateHeatRisk", "overallRisk", "infrastructureReadiness", "accessibility"]
      : analysis.scenarioId === "constructionMonitoring"
        ? ["infrastructureReadiness", "accessibility", "overallRisk", "developmentPotential"]
        : ["developmentPotential", "investmentAttractiveness", "accessibility", "infrastructureReadiness"];

  return relevantScores.map((scoreKey) => ({
    id: `score-${scoreKey}`,
    label: scoreLabels[scoreKey],
    score: analysis.scores[scoreKey],
    type: scoreKey === "climateHeatRisk" || scoreKey === "overallRisk" ? "risk" : "driver",
    detail: `${scoreLabels[scoreKey]} screening score: ${analysis.scores[scoreKey]}/100.`
  }));
}

function matrixItems(drivers: DashboardDriver[], risks: DashboardDriver[], validationGaps: DashboardDriver[]) {
  const driverPoints = drivers.slice(0, 3).map((item, index) => ({
    id: `matrix-driver-${index}`,
    label: item.label,
    x: clampScore(item.score ?? 66),
    y: clampScore(32 + index * 10),
    tone: "positive" as DashboardTone
  }));
  const riskPoints = risks.slice(0, 2).map((item, index) => ({
    id: `matrix-risk-${index}`,
    label: item.label,
    x: clampScore(62 - index * 10),
    y: clampScore(item.score ?? 68),
    tone: "warning" as DashboardTone
  }));
  const validationPoint = validationGaps[0]
    ? [{
        id: "matrix-validation-0",
        label: validationGaps[0].label,
        x: 46,
        y: 76,
        tone: "critical" as DashboardTone
      }]
    : [];

  return [...driverPoints, ...riskPoints, ...validationPoint].slice(0, 6);
}

export function buildDashboardModel(analysis: ExpressAnalysis): DashboardModel {
  const rawDecisionPosture = deriveDecisionPosture(analysis);
  const decisionPosture = shortDecisionPosture(rawDecisionPosture);
  const decisionRationale = deriveDecisionRationale(analysis);
  const primaryScore = analysis.aiDecisionScore?.suitabilityScore ??
    clampScore((analysis.scores.developmentPotential + analysis.scores.investmentAttractiveness + analysis.scores.accessibility) / 3);
  const riskScore = analysis.aiDecisionScore?.riskScore ??
    Math.max(analysis.scores.overallRisk, analysis.scores.climateHeatRisk);
  const riskLabel = shortRiskLabel(riskScore);
  const drivers = driverItems(
    analysis.aiDecisionScore?.keyDrivers.length ? analysis.aiDecisionScore.keyDrivers : analysis.keyFactors,
    "driver",
    primaryScore,
    "driver"
  );
  const risks = driverItems(
    analysis.aiDecisionScore?.keyRisks.length ? analysis.aiDecisionScore.keyRisks : analysis.risks,
    "risk",
    riskScore,
    "risk"
  );
  const validationGaps = validationItems(analysis);
  const actions = actionItems(analysis);
  const hypothesis = scenarioHypothesis(analysis, decisionPosture);
  const scoreBreakdown = scoreDrivers(analysis);
  const confidenceLabel = shortConfidenceLabel(analysis.confidenceLevel);
  const recommendedNextAction = shortNextAction(actions);
  const recommendedNextActionDetail = detailText(actions[0]?.detail ?? actions[0]?.label, "Validate official sources before decision-grade use.");
  const decisionSummary = sentenceSummary(
    decisionRationale,
    "Screening signals are mixed; validate official sources before advancing."
  );
  const decisionDetail = detailText(decisionRationale, "Screening result requires validation.");
  const targetLabel = analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? "Map selection";

  return {
    title: analysis.title,
    scenarioLabel: scenarioLabels[analysis.scenarioId],
    targetLabel,
    decisionPosture,
    decisionSummary,
    decisionDetail,
    primaryScore,
    confidenceLabel,
    riskLabel,
    recommendedNextAction,
    recommendedNextActionDetail,
    kpis: [
      {
        id: "suitability",
        label: "Suitability",
        value: `${primaryScore}`,
        numericValue: primaryScore,
        unit: "/100",
        tone: toneForPositiveScore(primaryScore),
        explanation: "Composite screening score."
      },
      {
        id: "risk",
        label: "Risk",
        value: riskLabel,
        numericValue: riskScore,
        tone: toneForRiskScore(riskScore),
        explanation: `${riskScore}/100 risk signal.`
      },
      {
        id: "confidence",
        label: "Confidence",
        value: confidenceLabel,
        tone: analysis.confidenceLevel === "high" ? "positive" : "neutral",
        explanation: "Screening confidence only."
      },
      {
        id: "validation",
        label: "Validation",
        value: shortValidationLabel(validationGaps.length),
        numericValue: validationGaps.length,
        tone: validationGaps.length > 2 ? "warning" : "neutral",
        explanation: "Open evidence checks."
      },
      {
        id: "next-action",
        label: "Next action",
        value: recommendedNextAction,
        tone: "neutral",
        explanation: recommendedNextActionDetail
      },
      evidenceKpi(analysis)
    ],
    drivers,
    risks,
    validationGaps,
    actions,
    matrix: matrixItems(drivers, risks, validationGaps),
    modules: [
      {
        id: "scenario-hypothesis",
        title: hypothesis.title,
        subtitle: "Scenario hypothesis",
        type: "scenario_hypothesis",
        priority: 1,
        summary: hypothesis.summary,
        items: [
          {
            id: "hypothesis-recommended-use",
            label: shortLabel(hypothesis.recommendedUse, "Recommended use", 42),
            detail: hypothesis.recommendedUse,
            type: "driver",
            score: primaryScore
          },
          ...drivers.slice(0, 2)
        ],
        defaultOpen: true
      },
      {
        id: "score-breakdown",
        title: "Score breakdown",
        subtitle: "Relevant scenario scores",
        type: "score_bars",
        priority: 2,
        summary: "Scores are sample/open screening indicators, not validated underwriting metrics.",
        items: scoreBreakdown
      },
      {
        id: "risk-opportunity-matrix",
        title: "Risk / opportunity matrix",
        subtitle: "Upside versus urgency",
        type: "risk_matrix",
        priority: 3,
        summary: "Prioritizes the few signals that most affect the screening decision.",
        items: [...drivers.slice(0, 2), ...risks.slice(0, 2), ...validationGaps.slice(0, 1)]
      },
      {
        id: "validation-gaps",
        title: "Validation gaps",
        subtitle: "Official/client checks required",
        type: "validation_gaps",
        priority: 4,
        summary: "Resolve these before treating the result as decision-grade.",
        items: validationGaps
      },
      {
        id: "next-actions",
        title: "Next actions",
        subtitle: "Recommended follow-up",
        type: "next_actions",
        priority: 5,
        summary: "Near-term actions to move from screening to review.",
        items: actions
      },
      {
        id: "evidence-summary",
        title: "Evidence / source appendix",
        subtitle: "Collapsed source details",
        type: "evidence_summary",
        priority: 6,
        summary: "Source lineage and caveats remain available for review.",
        items: analysis.evidence.slice(0, 4).map((item, index) => ({
          id: `evidence-${index}`,
          label: shortLabel(item.label, "Evidence source", 42),
          detail: item.description,
          type: "validation",
          score: item.sourceStatus === "connected" ? 76 : 54
        }))
      }
    ]
  };
}
