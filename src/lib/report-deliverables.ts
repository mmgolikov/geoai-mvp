import { demoProjects } from "@/src/data/demo-projects";
import { createBrowserAnalysisRestoreContext, type AnalysisRestoreContext } from "@/src/lib/analysis-restore-authority";
import { normalizeRestoredExpressAnalysis } from "@/src/lib/analysis-restore-normalization";
import { normalizeRestoredComparison } from "@/src/lib/comparison-restore";
import { deriveDecisionPosture } from "@/src/lib/decision-posture";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { SourceLineageSnapshot } from "@/src/lib/project-workspace-types";
import { normalizeReportMapSnapshot, type ReportMapSnapshot } from "@/src/lib/report-map-snapshot";
import { isCanonicalReportId } from "@/src/lib/report-id";
import { createSourceLineageSnapshot } from "@/src/lib/source-lineage-snapshot";
import type { CustomQueryAnswer } from "@/src/lib/custom-query/query-answer";
import type { AnalysisTarget, ComparisonResult, ExpressAnalysis, ScoreKey, SelectedDemoObject, SelectedPoint, UserDrawnAoi } from "@/src/types/geo";

export type ReportType = "analysis" | "comparison";

export type ReportDeliverable = {
  id: string;
  projectId: string | null;
  projectKey: string | null;
  reportType: ReportType;
  title: string;
  subtitle: string;
  scenario: string;
  targetLabel: string;
  targetGeometry: unknown;
  createdAt: string;
  generatedBy: "GeoAI Decision Intelligence";
  decisionPosture: string;
  scoreSummary: unknown;
  keyFindings: string[];
  risks: string[];
  nextActions: string[];
  validationChecklist: string[];
  sourceLineage: SourceLineageSnapshot;
  dataHonestyNote: string;
  reportPayload: unknown;
  mapSnapshot: ReportMapSnapshot | null;
};

export type AnalysisReportDeliverable = ReportDeliverable & {
  reportType: "analysis";
  coordinates: SelectedPoint | null;
  analysis: ExpressAnalysis | null;
  selectedObject: SelectedDemoObject | null;
  selectedAoi: UserDrawnAoi | null;
  analysisTarget: AnalysisTarget | null;
  executiveMemo: string;
  opportunities: string[];
  limitations: string[];
  customQueryAnswer: CustomQueryAnswer | null;
};

export type ComparisonReportDeliverable = ReportDeliverable & {
  reportType: "comparison";
  comparison: ComparisonResult | null;
  comparedItems: Array<{
    name: string;
    type: string;
    coordinates: SelectedPoint | null;
    overallScore: number | null;
    riskLevel: string;
    recommendedUse: string;
    keyConcern: string;
  }>;
  winnerLabel: string;
  alternativeInterpretation: string;
  sharedOpportunities: string[];
  differentiatedRisks: string[];
  customQueryAnswer: CustomQueryAnswer | null;
};

type ReportRecord = {
  id?: string;
  report_key?: string;
  projectId?: string | null;
  project_id?: string | null;
  projectKey?: string | null;
  project_key?: string | null;
  reportType?: ReportType;
  report_type?: ReportType;
  title?: string;
  scenario?: string;
  targetLabel?: string;
  target_label?: string;
  reportPayload?: unknown;
  report_json?: unknown;
  payload?: unknown;
  sourceLineage?: SourceLineageSnapshot;
  source_lineage?: SourceLineageSnapshot;
  mapSnapshot?: unknown;
  map_snapshot?: unknown;
  createdAt?: string;
  created_at?: string;
  generated_at?: string;
  decisionPosture?: string;
  decision_posture?: string;
};

const releaseCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export type ReportDeliverableNormalizationOptions = {
  expectedReportId: string;
  expectedProject?: GeoAIProject | null;
  canonicalProjects?: readonly GeoAIProject[];
};

const maximumPresentationCharacters = 320;
const maximumMapDataUrlCharacters = 8_000_000;
const forbiddenPersistedClaimPatterns = [
  /\bcertified\s+valuation\b/i,
  /\bofficial\s+parcel\b/i,
  /\bownership\s+verified\b/i,
  /\bownership\s+verification\b/i,
  /\bcadastral\s+validation\b/i,
  /\bofficial\s+zoning\b/i,
  /\bzoning\s+allows\b/i,
  /\btitle\s+clear\b/i,
  /\bapproved\s+site\b/i,
  /\bguaranteed\s+best\s+use\b/i,
  /\binvestment\s+guaranteed\b/i,
  /\blive\s+official\s+dld\b/i,
  /\blive\s+geodubai\b/i,
  /\bproduction[- ]ready\b/i,
  /\bpilot[- ]ready\b/i,
  /\bofficial[_ -]?validated\b/i
];

const scoreKeys: ScoreKey[] = [
  "developmentPotential",
  "investmentAttractiveness",
  "accessibility",
  "infrastructureReadiness",
  "climateHeatRisk",
  "overallRisk"
];

export const defaultValidationChecklist = [
  "Confirm parcel / plot boundary through an authorized municipal or customer-approved source.",
  "Validate zoning / planning constraints with the relevant authority or approved customer dataset.",
  "Validate market metrics against an agreed DLD / Dubai Pulse snapshot or customer-approved data.",
  "Review legal, ownership and title information outside GeoAI before transaction decisions.",
  "Confirm climate, flood and heat exposure through engineering or insurance-grade assessment if required.",
  "Confirm construction or progress evidence with agreed imagery and inspection workflow."
];

export function getScenarioNextActions(scenario: string) {
  const normalized = scenario.toLowerCase();

  if (normalized.includes("investment")) {
    return [
      "Shortlist the site for due diligence.",
      "Request official validation data.",
      "Compare against 2-3 alternatives.",
      "Prepare an investment committee memo."
    ];
  }

  if (normalized.includes("development") || normalized.includes("real estate")) {
    return [
      "Validate plot constraints.",
      "Check access and infrastructure assumptions.",
      "Prepare a development feasibility pack.",
      "Monitor planning and market signals."
    ];
  }

  if (normalized.includes("climate") || normalized.includes("risk")) {
    return [
      "Request engineering validation.",
      "Review heat, coastal and flood exposure.",
      "Compare risk-adjusted alternatives.",
      "Define mitigation and insurance review requirements."
    ];
  }

  if (normalized.includes("bank") || normalized.includes("asset")) {
    return [
      "Validate collateral attributes.",
      "Check market confidence and liquidity assumptions.",
      "Request missing ownership and legal data.",
      "Prepare a credit / collateral memo."
    ];
  }

  return [
    "Request official validation data.",
    "Compare against alternative sites or assets.",
    "Run a detailed regulatory and constraints check.",
    "Prepare a decision memo for stakeholder review."
  ];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPayload(record: ReportRecord) {
  const payload = record.reportPayload ?? record.report_json ?? record.payload;
  return isObject(payload) ? payload : null;
}

function boundedString(value: unknown, maximum = maximumPresentationCharacters) {
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return normalized.length > 0 && normalized.length <= maximum ? normalized : null;
}

function hasForbiddenDecisionClaim(value: string) {
  return forbiddenPersistedClaimPatterns.some((pattern) => pattern.test(value));
}

function readSafeDecisionLabel(value: unknown, fallback: string) {
  const normalized = boundedString(value);
  if (!normalized || hasForbiddenDecisionClaim(normalized)) return fallback;
  return normalized;
}

function readTimestamp(...values: unknown[]) {
  for (const value of values) {
    const candidate = boundedString(value, 64);
    if (!candidate) continue;
    const parsed = new Date(candidate);
    const year = parsed.getUTCFullYear();
    if (!Number.isNaN(parsed.getTime()) && year >= 2000 && year <= 2100) {
      return parsed.toISOString();
    }
  }
  return new Date(0).toISOString();
}

function projectIdsMatch(value: unknown, expectedProject: GeoAIProject) {
  if (expectedProject.id === null) return value === null || value === undefined;
  return value === expectedProject.id;
}

function readProjectIdentity(record: ReportRecord) {
  const camelKey = boundedString(record.projectKey, 240);
  const snakeKey = boundedString(record.project_key, 240);
  if (camelKey && snakeKey && camelKey !== snakeKey) return null;

  const hasCamelId = record.projectId !== undefined;
  const hasSnakeId = record.project_id !== undefined;
  if (hasCamelId && hasSnakeId && record.projectId !== record.project_id) return null;

  const projectKey = camelKey ?? snakeKey;
  if (!projectKey) return null;
  return {
    projectKey,
    projectId: hasCamelId ? record.projectId : record.project_id
  };
}

function resolveExpectedProject(
  record: ReportRecord,
  options: ReportDeliverableNormalizationOptions
) {
  const identity = readProjectIdentity(record);
  if (!identity) return null;

  const explicitProject = options.expectedProject ?? null;
  if (explicitProject) {
    return explicitProject.projectKey === identity.projectKey && projectIdsMatch(identity.projectId, explicitProject)
      ? explicitProject
      : null;
  }

  const candidates = options.canonicalProjects ?? demoProjects;
  return candidates.find((project) =>
    project.projectKey === identity.projectKey && projectIdsMatch(identity.projectId, project)
  ) ?? null;
}

function reportIdentityMatches(record: ReportRecord, expectedReportId: string) {
  if (!isCanonicalReportId(expectedReportId)) return false;
  const recordIds = [
    boundedString(record.id, 240),
    boundedString(record.report_key, 240)
  ].filter((value): value is string => Boolean(value));
  return recordIds.includes(expectedReportId);
}

function readReportType(record: ReportRecord, payload: Record<string, unknown>) {
  const hasAnalysis = isObject(payload.memoJson);
  const hasComparison = isObject(payload.comparisonJson);
  if (hasAnalysis === hasComparison) return null;

  const inferredType: ReportType = hasComparison ? "comparison" : "analysis";
  if (record.reportType && record.report_type && record.reportType !== record.report_type) return null;
  const explicitType = record.reportType ?? record.report_type;
  if (explicitType !== undefined && explicitType !== inferredType) return null;
  return inferredType;
}

function createCanonicalSourceLineage(
  evidence: ExpressAnalysis["evidence"] | ComparisonResult["evidence"],
  context: AnalysisRestoreContext,
  createdAt: string,
  additionalDatasetIds: ReadonlySet<string> = new Set()
) {
  const referencedDatasetIds = new Set(additionalDatasetIds);
  for (const dataset of context.uploadedDatasets ?? []) {
    const isReferenced = evidence.some((item) =>
      item.sourceId === `uploaded-local:${dataset.id}` ||
      item.id === `uploaded-${dataset.id}` ||
      item.id.startsWith(`uploaded-${dataset.id}-`)
    );
    if (isReferenced) referencedDatasetIds.add(dataset.id);
  }
  const uploadedDatasets = (context.uploadedDatasets ?? []).filter((dataset) =>
    dataset.projectKey === context.expectedProject.projectKey &&
    referencedDatasetIds.has(dataset.id)
  );
  return {
    ...createSourceLineageSnapshot({ evidence, uploadedDatasets }),
    capturedAt: createdAt
  };
}

function analysisDatasetIds(analysis: ExpressAnalysis) {
  const datasetIds = new Set<string>();
  for (const match of analysis.uploadedDataContext?.appliedMetrics ?? []) {
    datasetIds.add(match.datasetId);
  }
  for (const dataset of analysis.uploadedDataContext?.visibleGeojsonLayers ?? []) {
    datasetIds.add(dataset.id);
  }
  const selectedDatasetId = analysis.selectedObject?.analysisTarget?.datasetId;
  if (analysis.selectedObject?.analysisTarget?.sourceMode === "user-uploaded" && selectedDatasetId) {
    datasetIds.add(selectedDatasetId);
  }
  return datasetIds;
}

function comparisonDatasetIds(comparison: ComparisonResult) {
  const datasetIds = new Set<string>();
  for (const scorecard of comparison.items) {
    const target = scorecard.item.selectedObject?.analysisTarget;
    if (target?.sourceMode === "user-uploaded" && target.datasetId) {
      datasetIds.add(target.datasetId);
    }
  }
  return datasetIds;
}

function readCanonicalMapSnapshot(
  record: ReportRecord,
  payload: Record<string, unknown>,
  targetLabel: string,
  createdAt: string
) {
  const snapshot = normalizeReportMapSnapshot(payload.mapSnapshot ?? record.mapSnapshot ?? record.map_snapshot);
  if (
    !snapshot ||
    snapshot.src.length > maximumMapDataUrlCharacters ||
    !Number.isInteger(snapshot.width) ||
    !Number.isInteger(snapshot.height) ||
    snapshot.width > 8_192 ||
    snapshot.height > 8_192
  ) {
    return null;
  }
  return {
    ...snapshot,
    capturedAt: readTimestamp(snapshot.capturedAt, createdAt),
    targetLabel
  };
}

function createSelectedAoiTarget(selectedAoi: UserDrawnAoi | null): AnalysisTarget | null {
  if (!selectedAoi) return null;
  return {
    id: selectedAoi.id,
    type: "user-drawn-aoi",
    label: selectedAoi.name,
    coordinates: selectedAoi.centroid,
    geometry: selectedAoi.geometry,
    bbox: selectedAoi.bbox,
    measurements: selectedAoi.measurements,
    datasetId: "user-drawn-aoi",
    datasetName: "User-drawn AOI",
    sourceMode: "user-drawn",
    officialStatus: "official-validation-required"
  };
}

function normalizeAnalysisReport(
  record: ReportRecord,
  payload: Record<string, unknown>,
  expectedProject: GeoAIProject,
  expectedReportId: string
): AnalysisReportDeliverable | null {
  const projectIdentity = readProjectIdentity(record);
  if (!projectIdentity) return null;
  const context = createBrowserAnalysisRestoreContext(expectedProject, {
    sourceProjectKey: projectIdentity.projectKey,
    sourceProjectId: projectIdentity.projectId ?? null
  });
  const normalized = normalizeRestoredExpressAnalysis(payload.memoJson, context);
  if (!normalized) return null;

  const analysis = normalized.analysis;
  const selectedObject = analysis.selectedObject ?? null;
  const selectedAoi = analysis.selectedAoi ?? null;
  const rawTargetLabel = selectedAoi?.name ?? selectedObject?.name ?? "Custom map selection";
  const targetLabel = readSafeDecisionLabel(rawTargetLabel, "Selected screening target");
  if (targetLabel !== rawTargetLabel || readSafeDecisionLabel(expectedProject.name, "Project") !== expectedProject.name) {
    return null;
  }

  const scenario = readSafeDecisionLabel(analysis.title, "Screening Analysis");
  const createdAt = readTimestamp(
    record.createdAt,
    record.created_at,
    record.generated_at,
    payload.generatedAt,
    analysis.generatedAt
  );
  const sourceLineage = createCanonicalSourceLineage(
    analysis.evidence,
    context,
    createdAt,
    analysisDatasetIds(analysis)
  );
  const mapSnapshot = readCanonicalMapSnapshot(record, payload, targetLabel, createdAt);
  const selectedAoiTarget = createSelectedAoiTarget(selectedAoi);
  const analysisTarget = analysis.analysisTarget ?? selectedObject?.analysisTarget ?? selectedAoiTarget;
  const decisionPosture = deriveDecisionPosture(analysis);

  return {
    id: expectedReportId,
    projectId: expectedProject.id,
    projectKey: expectedProject.projectKey,
    reportType: "analysis",
    title: "Express Analysis / Investment Memo",
    subtitle: readSafeDecisionLabel(analysis.subtitle, scenario),
    scenario,
    targetLabel,
    targetGeometry: analysisTarget?.geometry ?? null,
    createdAt,
    generatedBy: "GeoAI Decision Intelligence",
    decisionPosture,
    scoreSummary: analysis.scores,
    keyFindings: analysis.keyFactors,
    risks: analysis.risks,
    nextActions: analysis.nextActions.length > 0 ? analysis.nextActions : getScenarioNextActions(scenario),
    validationChecklist: defaultValidationChecklist,
    sourceLineage,
    dataHonestyNote: releaseCaveat,
    reportPayload: {
      project: expectedProject,
      memoJson: analysis,
      mapSnapshot,
      generatedAt: createdAt
    },
    mapSnapshot,
    coordinates: analysis.point,
    analysis,
    selectedObject,
    selectedAoi,
    analysisTarget,
    executiveMemo: analysis.summary,
    opportunities: analysis.opportunities,
    limitations: analysis.limitations ?? [],
    customQueryAnswer: analysis.customQueryAnswer ?? null
  };
}

function normalizeComparisonReport(
  record: ReportRecord,
  payload: Record<string, unknown>,
  expectedProject: GeoAIProject,
  expectedReportId: string
): ComparisonReportDeliverable | null {
  const candidate = payload.comparisonJson;
  if (!isObject(candidate)) return null;
  const comparisonId = boundedString(candidate.id, 2_048);
  if (!comparisonId) return null;
  const comparison = normalizeRestoredComparison(
    candidate,
    expectedProject.projectKey,
    comparisonId,
    expectedProject
  );
  if (!comparison) return null;

  const itemNames = comparison.items.map((item) => item.item.name);
  if (
    itemNames.some((name) => readSafeDecisionLabel(name, "Compared screening target") !== name) ||
    readSafeDecisionLabel(expectedProject.name, "Project") !== expectedProject.name
  ) {
    return null;
  }

  const comparedItems = comparison.items.map((item) => ({
    name: item.item.name,
    type: item.item.itemType,
    coordinates: item.item.point,
    overallScore: item.overallScore,
    riskLevel: item.riskLevel,
    recommendedUse: item.recommendedUse,
    keyConcern: item.keyConcern
  }));
  const targetLabel = itemNames.join(", ");
  if (!boundedString(targetLabel, 1_024)) return null;
  const scenario = readSafeDecisionLabel(
    comparison.items[0]?.item.scenarioLabel,
    "Screening Comparison"
  );
  const createdAt = readTimestamp(
    record.createdAt,
    record.created_at,
    record.generated_at,
    payload.generatedAt
  );
  const projectIdentity = readProjectIdentity(record);
  if (!projectIdentity) return null;
  const context = createBrowserAnalysisRestoreContext(expectedProject, {
    sourceProjectKey: projectIdentity.projectKey,
    sourceProjectId: projectIdentity.projectId ?? null
  });
  const sourceLineage = createCanonicalSourceLineage(
    comparison.evidence,
    context,
    createdAt,
    comparisonDatasetIds(comparison)
  );
  const mapSnapshot = readCanonicalMapSnapshot(record, payload, targetLabel, createdAt);
  const winnerLabel = comparison.winner.item.name;

  return {
    id: expectedReportId,
    projectId: expectedProject.id,
    projectKey: expectedProject.projectKey,
    reportType: "comparison",
    title: "Site Comparison Investment Memo",
    subtitle: `Comparing ${comparedItems.length} selected sites / assets`,
    scenario,
    targetLabel,
    targetGeometry: null,
    createdAt,
    generatedBy: "GeoAI Decision Intelligence",
    decisionPosture: `Best option: ${winnerLabel}`,
    scoreSummary: comparison.items,
    keyFindings: comparison.sharedOpportunities,
    risks: comparison.differentiatedRisks,
    nextActions: comparison.nextActions.length > 0 ? comparison.nextActions : getScenarioNextActions(scenario),
    validationChecklist: defaultValidationChecklist,
    sourceLineage,
    dataHonestyNote: releaseCaveat,
    reportPayload: {
      project: expectedProject,
      comparisonJson: comparison,
      mapSnapshot,
      generatedAt: createdAt
    },
    mapSnapshot,
    comparison,
    comparedItems,
    winnerLabel,
    alternativeInterpretation: comparison.whenAnotherMayBeBetter,
    sharedOpportunities: comparison.sharedOpportunities,
    differentiatedRisks: comparison.differentiatedRisks,
    customQueryAnswer: comparison.customQueryAnswer ?? null
  };
}

export function normalizeReportDeliverable(
  record: unknown,
  options: ReportDeliverableNormalizationOptions
): AnalysisReportDeliverable | ComparisonReportDeliverable | null {
  try {
    if (!isObject(record) || !options || !reportIdentityMatches(record, options.expectedReportId)) {
      return null;
    }

    const typedRecord = record as ReportRecord;
    const payload = readPayload(typedRecord);
    const expectedProject = resolveExpectedProject(typedRecord, options);
    if (!payload || !expectedProject) return null;

    const reportType = readReportType(typedRecord, payload);
    if (reportType === "analysis") {
      return normalizeAnalysisReport(typedRecord, payload, expectedProject, options.expectedReportId);
    }
    if (reportType === "comparison") {
      return normalizeComparisonReport(typedRecord, payload, expectedProject, options.expectedReportId);
    }
    return null;
  } catch {
    return null;
  }
}

export function scoreSummaryRows(scoreSummary: unknown): Array<{ label: string; value: number | string }> {
  if (!isObject(scoreSummary)) return [];

  return scoreKeys
    .filter((key) => key in scoreSummary)
    .map((key) => ({
      label: key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (letter) => letter.toUpperCase()),
      value: typeof scoreSummary[key] === "number" || typeof scoreSummary[key] === "string" ? scoreSummary[key] : "-"
    }));
}
