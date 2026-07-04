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
  primaryScore: number;
  confidenceLabel: string;
  riskLabel: string;
  recommendedNextAction: string;
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
  return `${trimmed.slice(0, boundary > 24 ? boundary : maxLength).trim()}...`;
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
    label: shortLabel(item, `${prefix} ${index + 1}`, 42),
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
  const decisionPosture = deriveDecisionPosture(analysis);
  const decisionRationale = deriveDecisionRationale(analysis);
  const primaryScore = analysis.aiDecisionScore?.suitabilityScore ??
    clampScore((analysis.scores.developmentPotential + analysis.scores.investmentAttractiveness + analysis.scores.accessibility) / 3);
  const riskScore = analysis.aiDecisionScore?.riskScore ??
    Math.max(analysis.scores.overallRisk, analysis.scores.climateHeatRisk);
  const riskLabel = riskScore >= 70 ? "Elevated" : riskScore >= 50 ? "Moderate" : "Managed";
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
  const confidenceLabel = `${analysis.confidenceLevel ?? "medium"} confidence`;
  const recommendedNextAction = actions[0]?.label ?? "Validate sources";
  const decisionSummary = shortLabel(decisionRationale, "Screening result requires validation.", 120);
  const targetLabel = analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? "Map selection";

  return {
    title: analysis.title,
    scenarioLabel: scenarioLabels[analysis.scenarioId],
    targetLabel,
    decisionPosture,
    decisionSummary,
    primaryScore,
    confidenceLabel,
    riskLabel,
    recommendedNextAction,
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
        value: analysis.confidenceLevel ?? "medium",
        tone: analysis.confidenceLevel === "high" ? "positive" : "neutral",
        explanation: "Screening confidence only."
      },
      {
        id: "validation",
        label: "Validation",
        value: `${validationGaps.length}`,
        unit: "gaps",
        numericValue: validationGaps.length,
        tone: validationGaps.length > 2 ? "warning" : "neutral",
        explanation: "Open evidence checks."
      },
      {
        id: "next-action",
        label: "Next action",
        value: recommendedNextAction,
        tone: "neutral",
        explanation: actions[0]?.detail
      }
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
        items: scoreBreakdown,
        defaultOpen: true
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
