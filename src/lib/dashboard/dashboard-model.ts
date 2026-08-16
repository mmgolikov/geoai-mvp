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

export const DECISION_RESULT_CONTRACT_VERSION = "1.0" as const;
export const DECISION_RESULT_CAVEAT =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion." as const;

const ILLUSTRATIVE_LOCAL_CONTEXT = "Illustrative local screening context";

export type DecisionResultCoordinates = Readonly<{
  latitude: number;
  longitude: number;
  label: string;
}>;

export type DecisionResultSourceBasis = Readonly<{
  mode: "ai_assisted" | "user_provided" | "public_open" | "local_screening" | "mixed_screening";
  label: string;
  items: readonly string[];
}>;

export type DecisionResultContract = Readonly<{
  contractVersion: typeof DECISION_RESULT_CONTRACT_VERSION;
  resultId: string;
  decisionQuestion: string;
  target: Readonly<{
    id: string;
    label: string;
    type: string;
  }>;
  coordinates: DecisionResultCoordinates | null;
  scenario: Readonly<{
    id: string;
    label: string;
  }>;
  decision: Readonly<{
    posture: string;
    rationale: string;
    detail: string;
  }>;
  primaryScore: number | null;
  confidence: Readonly<{
    label: string;
    basis: string;
  }>;
  validation: Readonly<{
    status: "Validation required";
    gaps: readonly DashboardDriver[];
  }>;
  drivers: readonly DashboardDriver[];
  risks: readonly DashboardDriver[];
  nextAction: Readonly<{
    label: string;
    detail: string;
  }>;
  sourceBasis: DecisionResultSourceBasis;
  generatedAt: string;
  caveat: typeof DECISION_RESULT_CAVEAT;
}>;

export type DashboardModel = {
  decisionResult: DecisionResultContract;
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

function customerFacingText(value: string, fallback = "Screening context") {
  const normalized = value
    .replace(/best option/gi, "leading screening option")
    .replace(/imported[_\s-]+sample/gi, ILLUSTRATIVE_LOCAL_CONTEXT)
    .replace(/seed[_\s-]+static/gi, ILLUSTRATIVE_LOCAL_CONTEXT)
    .replace(/sample\s*\/\s*open(?:\s+context)?/gi, "Illustrative public/open screening context")
    .replace(/sample[-\s]?offline/gi, ILLUSTRATIVE_LOCAL_CONTEXT)
    .replace(/demo[-\s]?normalized/gi, ILLUSTRATIVE_LOCAL_CONTEXT)
    .replace(/synthetic[-_\s]?fallback/gi, ILLUSTRATIVE_LOCAL_CONTEXT)
    .replace(/mock[-_\s]?fallback/gi, ILLUSTRATIVE_LOCAL_CONTEXT)
    .replace(/(?:sample|demo|mock)[_-](?:feature|fixture|data|record)s?/gi, ILLUSTRATIVE_LOCAL_CONTEXT)
    .replace(/\bfixtures?\b/gi, ILLUSTRATIVE_LOCAL_CONTEXT)
    .replace(/\bsamples?\b/gi, ILLUSTRATIVE_LOCAL_CONTEXT)
    .replace(/\bdemos?\b/gi, ILLUSTRATIVE_LOCAL_CONTEXT)
    .replace(/\bmocks?\b/gi, ILLUSTRATIVE_LOCAL_CONTEXT)
    .replace(/\bMVP\b/g, "screening workflow")
    .replace(/\bpilot\b/gi, "validation phase")
    .replace(/\breadiness\b/gi, "status")
    .replace(/\s{2,}/g, " ")
    .trim();

  return normalized || fallback;
}

function identityText(value: string | null | undefined, fallback: string, maxLength = 160) {
  const normalized = (value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function freezeDrivers(items: DashboardDriver[]) {
  return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}

function freezeDecisionResult(input: Omit<DecisionResultContract, "contractVersion" | "caveat">): DecisionResultContract {
  const coordinates = input.coordinates ? Object.freeze({ ...input.coordinates }) : null;
  const validationGaps = freezeDrivers([...input.validation.gaps]);
  const drivers = freezeDrivers([...input.drivers]);
  const risks = freezeDrivers([...input.risks]);
  const sourceItems = Object.freeze([...input.sourceBasis.items]);

  return Object.freeze({
    contractVersion: DECISION_RESULT_CONTRACT_VERSION,
    resultId: input.resultId,
    decisionQuestion: input.decisionQuestion,
    target: Object.freeze({ ...input.target }),
    coordinates,
    scenario: Object.freeze({ ...input.scenario }),
    decision: Object.freeze({ ...input.decision }),
    primaryScore: input.primaryScore,
    confidence: Object.freeze({ ...input.confidence }),
    validation: Object.freeze({ status: "Validation required" as const, gaps: validationGaps }),
    drivers,
    risks,
    nextAction: Object.freeze({ ...input.nextAction }),
    sourceBasis: Object.freeze({ ...input.sourceBasis, items: sourceItems }),
    generatedAt: input.generatedAt,
    caveat: DECISION_RESULT_CAVEAT
  });
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
  if (normalized === "medium") return "Medium";
  return "Not assessed";
}

export function shortValidationLabel(count: number) {
  if (count === 0) return "No open gaps";
  if (count === 1) return "1 gap";
  return `${count} gaps`;
}

export function shortNextAction(actions: DashboardDriver[]) {
  const action = actions[0]?.detail ?? actions[0]?.label ?? "";
  const normalized = action.toLowerCase();

  if (normalized.includes("define measurable criteria")) return "Define screening criteria";
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
  const availableEvidence = analysis.evidence.filter(evidenceSupportsSourceBasis);
  const hasOpenContext = availableEvidence.some((item) =>
    item.sourceType === "open_data" || item.sourceType === "open_geospatial"
  );
  const hasIllustrativeContext = availableEvidence.some(evidenceIsIllustrative);

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
      value: "Imported metrics",
      tone: "neutral",
      explanation: "Imported local metrics support screening only; official validation required."
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
    value: hasOpenContext && hasIllustrativeContext
      ? "Open + illustrative"
      : hasOpenContext
        ? "Public/open"
        : hasIllustrativeContext
          ? "Illustrative"
          : "Not recorded",
    tone: "neutral",
    explanation: hasIllustrativeContext
      ? "Illustrative local screening context is present; official/client validation required."
      : "Source lineage is available; official/client validation required."
  };
}

function shortSignalLabel(value: string, type: DashboardDriver["type"], index: number, prefix: string) {
  const normalized = value.toLowerCase();

  if (type === "action") {
    if (normalized.includes("compare")) return "Compare alternatives";
    if (normalized.includes("ownership") || normalized.includes("title") || normalized.includes("encumbrance")) {
      return "Request title evidence";
    }
    if (normalized.includes("attach") || normalized.includes("evidence") || normalized.includes("official")) return "Attach evidence";
    if (normalized.includes("checklist") || normalized.includes("valid")) return "Prepare validation";
    if (normalized.includes("memo") || normalized.includes("report")) return "Prepare memo";
    if (normalized.includes("market")) return "Validate market";
    return shortLabel(value, `Action ${index + 1}`, 34);
  }

  if (type === "risk") {
    if (normalized.includes("risk score")) return "Risk level";
    if (normalized.includes("exit") || normalized.includes("liquidity")) return "Test exit liquidity";
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
  return uniqueText(items.map((item) => customerFacingText(item))).slice(0, 3).map((item, index) => ({
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

function sourceBasisFromNames(
  names: string[],
  mode: DecisionResultSourceBasis["mode"],
  label: string
): DecisionResultSourceBasis {
  const items = uniqueText(names.map((name) => identityText(name, ""))).slice(0, 6);

  return {
    mode,
    label,
    items: items.length > 0 ? items : [`${label}; source validation remains open.`]
  };
}

function evidenceSupportsSourceBasis(item: ExpressAnalysis["evidence"][number]) {
  if (item.sourceStatus === "planned" || item.sourceStatus === "unavailable") return false;
  if (item.sourceType === "official" || item.sourceType === "commercial") return false;
  return true;
}

function evidenceIsIllustrative(item: ExpressAnalysis["evidence"][number]) {
  return item.sourceType === "mock" || item.sourceType === "demo" || item.sourceStatus === "mock";
}

function sourceBasisEvidenceLabel(item: ExpressAnalysis["evidence"][number]) {
  if (item.sourceType === "customer") {
    return `User-provided context: ${identityText(item.label, "User-provided source")}`;
  }
  if (item.sourceType === "open_data" || item.sourceType === "open_geospatial") {
    return identityText(item.label, "Public/open context");
  }
  if (evidenceIsIllustrative(item)) {
    const normalized = item.label.toLowerCase();
    if (normalized.includes("market")) return "Illustrative local market screening context";
    if (normalized.includes("map") || normalized.includes("spatial") || normalized.includes("geometry")) {
      return "Illustrative local spatial screening context";
    }
    if (normalized.includes("scenario")) return "Illustrative selected-scenario context";
    return ILLUSTRATIVE_LOCAL_CONTEXT;
  }
  return identityText(item.label, "Screening source");
}

function sourceBasisForAnalysis(analysis: ExpressAnalysis): DecisionResultSourceBasis {
  const hasUserContext = Boolean(
    analysis.uploadedDataContext?.uploadedDatasets.length ||
      analysis.selectedAoi?.sourceType === "uploaded_geojson" ||
      analysis.analysisTarget?.sourceMode === "user-uploaded"
  );
  const availableEvidence = analysis.evidence.filter(evidenceSupportsSourceBasis);
  const hasOpenContext = availableEvidence.some((item) =>
    item.sourceType === "open_data" || item.sourceType === "open_geospatial"
  );
  const hasIllustrativeContext = availableEvidence.some(evidenceIsIllustrative);
  const names = availableEvidence.map(sourceBasisEvidenceLabel);

  if (hasUserContext && hasOpenContext && hasIllustrativeContext) {
    return sourceBasisFromNames(names, "mixed_screening", "User-provided, public/open and illustrative local screening context");
  }
  if (hasUserContext && hasOpenContext) {
    return sourceBasisFromNames(names, "mixed_screening", "User-provided and public/open screening context");
  }
  if (hasUserContext && hasIllustrativeContext) {
    return sourceBasisFromNames(names, "mixed_screening", "User-provided and illustrative local screening context");
  }
  if (hasUserContext) {
    return sourceBasisFromNames(names, "user_provided", "User-provided screening context");
  }
  if (hasOpenContext && hasIllustrativeContext) {
    return sourceBasisFromNames(names, "mixed_screening", "Public/open and illustrative local screening context");
  }
  if (hasOpenContext) {
    return sourceBasisFromNames(names, "public_open", "Public/open screening context");
  }
  if (analysis.analysisMode === "openai") {
    return sourceBasisFromNames(
      names,
      "ai_assisted",
      hasIllustrativeContext
        ? "AI-assisted interpretation of illustrative local screening context"
        : "AI-assisted interpretation of screening context"
    );
  }
  return sourceBasisFromNames(
    names,
    "local_screening",
    hasIllustrativeContext ? ILLUSTRATIVE_LOCAL_CONTEXT : "Screening source basis not recorded"
  );
}

function targetTypeForAnalysis(analysis: ExpressAnalysis) {
  if (analysis.selectedAoi) return "Area of interest";
  if (analysis.selectedObject) return customerFacingText(analysis.selectedObject.type, "Selected asset");
  if (analysis.analysisTarget?.type === "uploaded-feature") return "User-provided feature";
  if (analysis.analysisTarget?.type === "user-drawn-aoi") return "Area of interest";
  return "Selected point";
}

function decisionQuestionForAnalysis(analysis: ExpressAnalysis, targetLabel: string, scenarioLabel: string) {
  const query = analysis.customQuery?.trim() ?? "";
  const looksLikeDecisionPrompt = /^(which|what|where|how|should|is|are|does|do|compare|assess|review|identify)\b/i.test(query);
  return query && (query.endsWith("?") || looksLikeDecisionPrompt)
    ? identityText(query, "What screening question should be assessed?", 320)
    : `What is the screening posture for ${targetLabel} under ${scenarioLabel.toLowerCase()}?`;
}

export function buildDecisionResult(analysis: ExpressAnalysis): DecisionResultContract {
  const rawDecisionPosture = deriveDecisionPosture(analysis);
  const decisionPosture = shortDecisionPosture(rawDecisionPosture);
  const decisionRationale = customerFacingText(deriveDecisionRationale(analysis));
  const primaryScore = analysis.aiDecisionScore?.suitabilityScore ??
    clampScore((analysis.scores.developmentPotential + analysis.scores.investmentAttractiveness + analysis.scores.accessibility) / 3);
  const drivers = driverItems(
    analysis.aiDecisionScore?.keyDrivers.length ? analysis.aiDecisionScore.keyDrivers : analysis.keyFactors,
    "driver",
    primaryScore,
    "driver"
  );
  const riskScore = analysis.aiDecisionScore?.riskScore ??
    Math.max(analysis.scores.overallRisk, analysis.scores.climateHeatRisk);
  const risks = driverItems(
    analysis.aiDecisionScore?.keyRisks.length ? analysis.aiDecisionScore.keyRisks : analysis.risks,
    "risk",
    riskScore,
    "risk"
  );
  const openValidationGaps = validationItems(analysis).filter(
    (item) => item.detail.trim().toLowerCase() !== DECISION_RESULT_CAVEAT.toLowerCase()
  );
  const validationGaps = openValidationGaps.length > 0
    ? openValidationGaps
    : driverItems(
        ["Validate source, planning, legal and valuation assumptions before decision use."],
        "validation",
        72,
        "validation"
      );
  const actions = actionItems(analysis);
  const recommendedNextAction = shortNextAction(actions);
  const recommendedNextActionDetail = customerFacingText(
    detailText(actions[0]?.detail ?? actions[0]?.label, "Validate sources before decision use.")
  );
  const targetLabel = identityText(
    analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? analysis.analysisTarget?.label,
    "Map selection"
  );
  const targetId = analysis.selectedAoi?.id ?? analysis.selectedObject?.id ?? analysis.analysisTarget?.id ?? analysis.id;
  const point = analysis.selectedAoi?.centroid ?? analysis.selectedObject?.center ?? analysis.point;
  const scenarioLabel = scenarioLabels[analysis.scenarioId];
  const confidenceLabel = shortConfidenceLabel(analysis.confidenceLevel);
  const decisionSummary = sentenceSummary(
    decisionRationale,
    "Screening signals require source validation before advancing."
  );

  return freezeDecisionResult({
    resultId: analysis.id,
    decisionQuestion: decisionQuestionForAnalysis(analysis, targetLabel, scenarioLabel),
    target: {
      id: targetId,
      label: targetLabel,
      type: targetTypeForAnalysis(analysis)
    },
    coordinates: {
      latitude: point.latitude,
      longitude: point.longitude,
      label: formatCoordinates(point.latitude, point.longitude)
    },
    scenario: {
      id: analysis.scenarioId,
      label: scenarioLabel
    },
    decision: {
      posture: decisionPosture,
      rationale: decisionSummary,
      detail: decisionRationale
    },
    primaryScore,
    confidence: {
      label: confidenceLabel,
      basis: analysis.confidenceLevel
        ? "Recorded screening confidence; not a validation or assurance grade."
        : "No explicit confidence assessment was recorded."
    },
    validation: {
      status: "Validation required",
      gaps: validationGaps
    },
    drivers,
    risks,
    nextAction: {
      label: recommendedNextAction,
      detail: recommendedNextActionDetail
    },
    sourceBasis: sourceBasisForAnalysis(analysis),
    generatedAt: analysis.generatedAt ?? "Not recorded"
  });
}

type SourceLineageLike = {
  demoSources?: readonly { name?: string }[];
  uploadedSources?: readonly { name?: string }[];
  externalSources?: readonly { name?: string }[];
};

function sourceBasisFromLineage(lineage?: SourceLineageLike | null): DecisionResultSourceBasis {
  const uploadedNames = lineage?.uploadedSources?.map((item) => item.name ?? "User-provided source") ?? [];
  const externalNames = lineage?.externalSources?.map((item) => item.name ?? "Public/open source") ?? [];
  const localNames = lineage?.demoSources?.map((item) => {
    const label = customerFacingText(item.name ?? "", "");
    return label && !label.toLowerCase().includes("illustrative")
      ? `${ILLUSTRATIVE_LOCAL_CONTEXT}: ${label}`
      : label || ILLUSTRATIVE_LOCAL_CONTEXT;
  }) ?? [];
  const hasIllustrativeContext = localNames.length > 0;

  if (uploadedNames.length > 0 && externalNames.length > 0) {
    const label = hasIllustrativeContext
      ? "User-provided, public/open and illustrative local screening context"
      : "User-provided and public/open screening context";
    return sourceBasisFromNames([...uploadedNames, ...externalNames, ...localNames], "mixed_screening", label);
  }
  if (uploadedNames.length > 0) {
    const label = hasIllustrativeContext
      ? "User-provided and illustrative local screening context"
      : "User-provided screening context";
    return sourceBasisFromNames(
      [...uploadedNames, ...localNames],
      hasIllustrativeContext ? "mixed_screening" : "user_provided",
      label
    );
  }
  if (externalNames.length > 0) {
    const label = hasIllustrativeContext
      ? "Public/open and illustrative local screening context"
      : "Public/open screening context";
    return sourceBasisFromNames(
      [...externalNames, ...localNames],
      hasIllustrativeContext ? "mixed_screening" : "public_open",
      label
    );
  }
  return sourceBasisFromNames(
    localNames,
    "local_screening",
    hasIllustrativeContext ? ILLUSTRATIVE_LOCAL_CONTEXT : "Screening source basis not recorded"
  );
}

function primaryScoreFromSummary(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const scores = value as Record<string, unknown>;
  if (typeof scores.suitabilityScore === "number") return clampScore(scores.suitabilityScore);

  const components = [scores.developmentPotential, scores.investmentAttractiveness, scores.accessibility]
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));
  return components.length > 0
    ? clampScore(components.reduce((total, score) => total + score, 0) / components.length)
    : null;
}

export type AnalysisReportDecisionInput = {
  id: string;
  targetLabel: string;
  coordinates: { latitude: number; longitude: number } | null;
  scenario: string;
  decisionPosture: string;
  scoreSummary: unknown;
  executiveMemo: string;
  keyFindings: string[];
  risks: string[];
  nextActions: string[];
  validationChecklist: string[];
  limitations: string[];
  createdAt: string;
  sourceLineage: SourceLineageLike;
  analysis: ExpressAnalysis | null;
};

export function buildAnalysisReportDecisionResult(report: AnalysisReportDecisionInput): DecisionResultContract {
  if (report.analysis) return buildDecisionResult(report.analysis);

  const primaryScore = primaryScoreFromSummary(report.scoreSummary);
  const drivers = driverItems(report.keyFindings, "driver", primaryScore ?? 60, "driver");
  const risks = driverItems(report.risks, "risk", 64, "risk");
  const validationGaps = driverItems(
    report.limitations.length > 0 ? report.limitations : report.validationChecklist,
    "validation",
    72,
    "validation"
  );
  const actions = driverItems(report.nextActions, "action", 78, "action");
  const nextAction = shortNextAction(actions);
  const targetLabel = identityText(report.targetLabel, "Selected site");
  const scenarioLabel = customerFacingText(report.scenario, "Saved screening");
  const rationale = customerFacingText(report.executiveMemo, "Saved screening result requires validation.");
  const posture = shortDecisionPosture(customerFacingText(report.decisionPosture, "Review required"));

  return freezeDecisionResult({
    resultId: report.id,
    decisionQuestion: `Assess ${targetLabel} for ${scenarioLabel.toLowerCase()}.`,
    target: { id: report.id, label: targetLabel, type: "Saved site / AOI" },
    coordinates: report.coordinates
      ? {
          latitude: report.coordinates.latitude,
          longitude: report.coordinates.longitude,
          label: formatCoordinates(report.coordinates.latitude, report.coordinates.longitude)
        }
      : null,
    scenario: { id: "saved-analysis", label: scenarioLabel },
    decision: {
      posture,
      rationale: sentenceSummary(rationale, "Saved screening result requires validation."),
      detail: rationale
    },
    primaryScore,
    confidence: {
      label: "Not assessed",
      basis: "No explicit confidence assessment was recorded with this saved result."
    },
    validation: {
      status: "Validation required",
      gaps: validationGaps.length > 0
        ? validationGaps
        : driverItems(["Validate source and decision assumptions."], "validation", 72, "validation")
    },
    drivers,
    risks,
    nextAction: {
      label: nextAction,
      detail: customerFacingText(actions[0]?.detail ?? "Validate sources before decision use.")
    },
    sourceBasis: sourceBasisFromLineage(report.sourceLineage),
    generatedAt: report.createdAt
  });
}

type ComparisonReportDecisionInput = {
  id: string;
  scenario: string;
  targetLabel: string;
  createdAt: string;
  decisionPosture: string;
  winnerLabel: string;
  alternativeInterpretation: string;
  sharedOpportunities: string[];
  differentiatedRisks: string[];
  nextActions: string[];
  validationChecklist: string[];
  sourceLineage: SourceLineageLike;
  comparedItems: Array<{
    name: string;
    coordinates: { latitude: number; longitude: number } | null;
    overallScore: number | null;
  }>;
  comparison: {
    whyPreferred: string;
    evidence: ExpressAnalysis["evidence"];
    winner: { item: { id: string; name: string; point: { latitude: number; longitude: number } }; overallScore: number };
  } | null;
};

export function buildComparisonDecisionResult(report: ComparisonReportDecisionInput): DecisionResultContract {
  const winnerLabel = identityText(report.winnerLabel, "Leading screening option");
  const winner = report.comparison?.winner;
  const winnerItem = report.comparedItems.find((item) => item.name === report.winnerLabel) ?? report.comparedItems[0];
  const point = winner?.item.point ?? winnerItem?.coordinates ?? null;
  const primaryScore = winner?.overallScore ?? winnerItem?.overallScore ?? null;
  const drivers = driverItems(report.sharedOpportunities, "driver", primaryScore ?? 60, "driver");
  const risks = driverItems(
    report.differentiatedRisks.map((item) =>
      item.replace(/\s*\/\s*(low|medium|high)\s+confidence/gi, " / validation required")
    ),
    "risk",
    64,
    "risk"
  );
  const validationGaps = driverItems(report.validationChecklist, "validation", 72, "validation");
  const actions = driverItems(report.nextActions, "action", 78, "action");
  const rationale = customerFacingText(
    report.comparison?.whyPreferred ?? report.decisionPosture,
    "The leading screening option requires comparison and source validation."
  );
  const evidence = (report.comparison?.evidence ?? []).filter(evidenceSupportsSourceBasis);
  const hasOpenContext = evidence.some((item) => item.sourceType === "open_data" || item.sourceType === "open_geospatial");
  const hasIllustrativeContext = evidence.some(evidenceIsIllustrative);
  const lineageBasis = sourceBasisFromLineage(report.sourceLineage);
  const sourceBasis = evidence.length > 0
    ? sourceBasisFromNames(
        evidence.map(sourceBasisEvidenceLabel),
        hasOpenContext && hasIllustrativeContext
          ? "mixed_screening"
          : hasOpenContext
            ? "public_open"
            : "local_screening",
        hasOpenContext && hasIllustrativeContext
          ? "Public/open and illustrative local screening context"
          : hasOpenContext
            ? "Public/open screening context"
            : hasIllustrativeContext
              ? ILLUSTRATIVE_LOCAL_CONTEXT
              : "Screening source basis not recorded"
      )
    : lineageBasis;

  return freezeDecisionResult({
    resultId: report.id,
    decisionQuestion: `Compare ${identityText(report.targetLabel, "selected alternatives")} for ${customerFacingText(report.scenario, "the selected scenario").toLowerCase()}.`,
    target: {
      id: winner?.item.id ?? report.id,
      label: winnerLabel,
      type: "Leading screening option"
    },
    coordinates: point
      ? { latitude: point.latitude, longitude: point.longitude, label: formatCoordinates(point.latitude, point.longitude) }
      : null,
    scenario: { id: "comparison", label: customerFacingText(report.scenario, "Comparison screening") },
    decision: {
      posture: "Compare before advancing",
      rationale: sentenceSummary(rationale, "The leading screening option requires comparison and source validation."),
      detail: `${rationale} ${customerFacingText(report.alternativeInterpretation)}`.trim()
    },
    primaryScore: typeof primaryScore === "number" ? clampScore(primaryScore) : null,
    confidence: {
      label: "Not assessed",
      basis: "Comparison rank is a screening signal, not a confidence or assurance grade."
    },
    validation: {
      status: "Validation required",
      gaps: validationGaps.length > 0
        ? validationGaps
        : driverItems(["Validate source and comparison assumptions."], "validation", 72, "validation")
    },
    drivers,
    risks,
    nextAction: {
      label: shortNextAction(actions),
      detail: customerFacingText(actions[0]?.detail ?? "Validate sources before advancing the shortlist.")
    },
    sourceBasis,
    generatedAt: report.createdAt
  });
}

export function buildDashboardModel(analysis: ExpressAnalysis): DashboardModel {
  const decisionResult = buildDecisionResult(analysis);
  const decisionPosture = decisionResult.decision.posture;
  const primaryScore = decisionResult.primaryScore ?? 0;
  const riskScore = analysis.aiDecisionScore?.riskScore ??
    Math.max(analysis.scores.overallRisk, analysis.scores.climateHeatRisk);
  const riskLabel = shortRiskLabel(riskScore);
  const drivers = [...decisionResult.drivers];
  const risks = [...decisionResult.risks];
  const validationGaps = [...decisionResult.validation.gaps];
  const actions = actionItems(analysis);
  if (actions.length === 0) {
    actions.push({
      id: "action-0",
      label: decisionResult.nextAction.label,
      detail: decisionResult.nextAction.detail,
      score: 78,
      type: "action"
    });
  }
  const hypothesis = scenarioHypothesis(analysis, decisionPosture);
  const scoreBreakdown = scoreDrivers(analysis);
  const confidenceLabel = decisionResult.confidence.label;
  const recommendedNextAction = decisionResult.nextAction.label;
  const recommendedNextActionDetail = decisionResult.nextAction.detail;
  const decisionSummary = decisionResult.decision.rationale;
  const decisionDetail = decisionResult.decision.detail;
  const targetLabel = decisionResult.target.label;

  return {
    decisionResult,
    title: customerFacingText(analysis.title),
    scenarioLabel: decisionResult.scenario.label,
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
        value: decisionResult.validation.status,
        numericValue: validationGaps.length,
        tone: "warning",
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
        summary: customerFacingText(hypothesis.summary),
        items: [
          {
            id: "hypothesis-recommended-use",
            label: shortLabel(customerFacingText(hypothesis.recommendedUse), "Recommended use", 42),
            detail: customerFacingText(hypothesis.recommendedUse),
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
        summary: "Scores are screening indicators, not validated underwriting metrics.",
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
        title: "Evidence / source basis",
        subtitle: decisionResult.sourceBasis.label,
        type: "evidence_summary",
        priority: 6,
        summary: DECISION_RESULT_CAVEAT,
        items: decisionResult.sourceBasis.items.slice(0, 4).map((item, index) => ({
          id: `evidence-${index}`,
          label: shortLabel(item, "Evidence source", 42),
          detail: item,
          type: "validation",
          score: 54
        }))
      }
    ]
  };
}
