import type { SourceLineageSnapshot } from "@/src/lib/project-workspace-types";
import type { CustomQueryAnswer } from "@/src/lib/custom-query/query-answer";
import type { AnalysisTarget, ComparisonResult, ExpressAnalysis, ScoreKey, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";

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
  generatedBy: "GeoAI Demo/MVP";
  decisionPosture: string;
  scoreSummary: unknown;
  keyFindings: string[];
  risks: string[];
  nextActions: string[];
  validationChecklist: string[];
  sourceLineage: SourceLineageSnapshot;
  dataHonestyNote: string;
  reportPayload: unknown;
};

export type AnalysisReportDeliverable = ReportDeliverable & {
  reportType: "analysis";
  coordinates: SelectedPoint | null;
  analysis: ExpressAnalysis | null;
  selectedObject: SelectedDemoObject | null;
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
  sourceLineage?: SourceLineageSnapshot;
  source_lineage?: SourceLineageSnapshot;
  createdAt?: string;
  created_at?: string;
  generated_at?: string;
  decisionPosture?: string;
  decision_posture?: string;
};

const fallbackLineage: SourceLineageSnapshot = {
  capturedAt: new Date(0).toISOString(),
  demoSources: [
    {
      id: "demo-normalized-workspace",
      name: "GeoAI demo-normalized workspace context",
      note: "Sample/offline demo context used for screening narrative and report layout."
    }
  ],
  uploadedSources: [],
  externalSources: [],
  plannedValidationSources: [
    {
      id: "planned-official-validation",
      name: "Planned official/customer validation sources",
      disclaimer: "Official validation sources are planned and not implied as connected by this report."
    }
  ],
  disclaimers: [
    "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
    "Saved report uses demo/sample/local/uploaded source lineage unless explicitly validated.",
    "Live official parcel, planning, cadastral, title, ownership and zoning validation is not provided by this MVP.",
    "GeoAI supports screening and decision preparation, not final legal, cadastral or valuation approval."
  ]
};

const releaseCaveat = "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

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

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function asArrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asPoint(value: unknown): SelectedPoint | null {
  if (!isObject(value)) return null;
  const latitude = value.latitude;
  const longitude = value.longitude;
  return typeof latitude === "number" && typeof longitude === "number" ? { latitude, longitude } : null;
}

function asCustomQueryAnswer(value: unknown): CustomQueryAnswer | null {
  if (!isObject(value)) return null;
  const question = asString(value.question, "");
  const shortAnswer = asString(value.shortAnswer, "");
  const recommendation = asString(value.recommendation, "");

  if (!question || !shortAnswer || !recommendation) return null;

  return {
    question,
    intent: asString(value.intent, "custom") as CustomQueryAnswer["intent"],
    shortAnswer,
    recommendation,
    reasoning: asArrayOfStrings(value.reasoning),
    keyRisks: asArrayOfStrings(value.keyRisks),
    validationNeeded: asArrayOfStrings(value.validationNeeded),
    nextActions: asArrayOfStrings(value.nextActions),
    sourceBasis: asArrayOfStrings(value.sourceBasis),
    confidenceNote: asString(value.confidenceNote, "Screening-only response; official validation required.")
  };
}

function readPayload(record: ReportRecord) {
  return record.reportPayload ?? record.report_json ?? {};
}

function readReportId(record: ReportRecord) {
  return record.id ?? record.report_key ?? "unsaved-report";
}

function readReportType(record: ReportRecord, payload: unknown): ReportType {
  const explicitType = record.reportType ?? record.report_type;
  if (explicitType === "comparison" || explicitType === "analysis") return explicitType;
  return isObject(payload) && payload.comparisonJson ? "comparison" : "analysis";
}

function readCreatedAt(record: ReportRecord, payload: unknown) {
  if (isObject(payload) && typeof payload.generatedAt === "string") return payload.generatedAt;
  return record.createdAt ?? record.created_at ?? record.generated_at ?? new Date().toISOString();
}

function readSourceLineage(record: ReportRecord) {
  const sourceLineage = record.sourceLineage ?? record.source_lineage ?? fallbackLineage;
  const disclaimers = Array.isArray(sourceLineage.disclaimers) ? sourceLineage.disclaimers : [];

  return {
    ...sourceLineage,
    disclaimers: disclaimers.includes(releaseCaveat)
      ? disclaimers
      : [releaseCaveat, ...disclaimers]
  };
}

function readAnalysisPayload(payload: unknown): ExpressAnalysis | null {
  if (!isObject(payload)) return null;
  const candidate = payload.memoJson;
  return isObject(candidate) && isObject(candidate.scores) && isObject(candidate.point) ? candidate as ExpressAnalysis : null;
}

function readComparisonPayload(payload: unknown): ComparisonResult | null {
  if (!isObject(payload)) return null;
  const candidate = payload.comparisonJson;
  return isObject(candidate) && Array.isArray(candidate.items) ? candidate as ComparisonResult : null;
}

function normalizeComparedItems(payload: unknown, comparison: ComparisonResult | null): ComparisonReportDeliverable["comparedItems"] {
  if (comparison) {
    return comparison.items.map((item) => ({
      name: item.item.name,
      type: item.item.itemType,
      coordinates: item.item.point,
      overallScore: item.overallScore,
      riskLevel: item.riskLevel,
      recommendedUse: item.recommendedUse,
      keyConcern: item.keyConcern
    }));
  }

  if (!isObject(payload) || !Array.isArray(payload.comparedItems)) return [];

  return payload.comparedItems.map((item) => {
    if (!isObject(item)) {
      return {
        name: "Compared item",
        type: "site",
        coordinates: null,
        overallScore: null,
        riskLevel: "Validation required",
        recommendedUse: "Screening candidate",
        keyConcern: "Official validation required"
      };
    }

    return {
      name: asString(item.name, "Compared item"),
      type: asString(item.type, "site"),
      coordinates: asPoint(item.coordinates),
      overallScore: typeof item.overallScore === "number" ? item.overallScore : null,
      riskLevel: asString(item.riskLevel, "Validation required"),
      recommendedUse: asString(item.recommendedUse, "Screening candidate"),
      keyConcern: asString(item.keyConcern, "Official validation required")
    };
  });
}

export function normalizeReportDeliverable(record: unknown): AnalysisReportDeliverable | ComparisonReportDeliverable | null {
  if (!isObject(record)) return null;

  const typedRecord = record as ReportRecord;
  const payload = readPayload(typedRecord);
  const reportType = readReportType(typedRecord, payload);
  const id = readReportId(typedRecord);
  const sourceLineage = readSourceLineage(typedRecord);
  const createdAt = readCreatedAt(typedRecord, payload);
  const projectId = typedRecord.projectId ?? typedRecord.project_id ?? null;
  const projectKey = typedRecord.projectKey ?? typedRecord.project_key ?? null;
  const title = asString(typedRecord.title, isObject(payload) ? asString(payload.title, "GeoAI report") : "GeoAI report");
  const scenario = isObject(payload) ? asString(payload.scenario, typedRecord.scenario ?? reportType) : typedRecord.scenario ?? reportType;
  const decisionPosture = isObject(payload)
    ? asString(payload.decisionPosture, typedRecord.decisionPosture ?? typedRecord.decision_posture ?? "Requires official validation")
    : typedRecord.decisionPosture ?? typedRecord.decision_posture ?? "Requires official validation";
  const dataHonestyNote = "Browser print/save as PDF deliverable based on MVP/demo context. Official validation is required before legal, underwriting, cadastral, zoning, title or investment decisions.";

  if (reportType === "comparison") {
    const comparison = readComparisonPayload(payload);
    const comparedItems = normalizeComparedItems(payload, comparison);
    const winnerLabel = comparison?.winner.item.name ?? decisionPosture.replace(/^Best option:\s*/i, "") ?? comparedItems[0]?.name ?? "Validation required";
    const sharedOpportunities = comparison?.sharedOpportunities ?? (isObject(payload) ? asArrayOfStrings(payload.keyValueDrivers) : []);
    const differentiatedRisks = comparison?.differentiatedRisks ?? (isObject(payload) ? asArrayOfStrings(payload.criticalConstraints) : []);
    const nextActions = comparison?.nextActions ?? (isObject(payload) ? asArrayOfStrings(payload.dueDiligenceChecklist) : []);
    const customQueryAnswer = comparison?.customQueryAnswer ?? (isObject(payload) ? asCustomQueryAnswer(payload.customQueryAnswer) : null);

    return {
      id,
      projectId,
      projectKey,
      reportType: "comparison",
      title,
      subtitle: `Comparing ${comparedItems.length || 2} selected sites / assets`,
      scenario,
      targetLabel: comparedItems.map((item) => item.name).join(", ") || "Compared sites",
      targetGeometry: null,
      createdAt,
      generatedBy: "GeoAI Demo/MVP",
      decisionPosture,
      scoreSummary: isObject(payload) ? payload.scoreOverview ?? comparison?.items ?? null : comparison?.items ?? null,
      keyFindings: sharedOpportunities,
      risks: differentiatedRisks,
      nextActions: nextActions.length > 0 ? nextActions : getScenarioNextActions(scenario),
      validationChecklist: defaultValidationChecklist,
      sourceLineage,
      dataHonestyNote,
      reportPayload: payload,
      comparison,
      comparedItems,
      winnerLabel,
      alternativeInterpretation: comparison?.whenAnotherMayBeBetter ?? "Another option may be preferred if official validation, capital plan, ownership, or customer-specific constraints change the decision basis.",
      sharedOpportunities,
      differentiatedRisks,
      customQueryAnswer
    };
  }

  const analysis = readAnalysisPayload(payload);
  const coordinates = analysis?.point ?? (isObject(payload) ? asPoint(payload.coordinates) : null);
  const selectedObject = analysis?.selectedObject ?? (isObject(payload) && isObject(payload.selectedObject) ? payload.selectedObject as SelectedDemoObject : null);
  const targetLabel = analysis?.selectedObject?.name ?? (isObject(payload) ? asString(payload.selectedSite, typedRecord.targetLabel ?? typedRecord.target_label ?? "Selected site") : typedRecord.targetLabel ?? typedRecord.target_label ?? "Selected site");
  const scoreSummary = analysis?.scores ?? (isObject(payload) ? payload.scoreOverview ?? null : null);
  const keyFindings = analysis?.keyFactors ?? (isObject(payload) ? asArrayOfStrings(payload.keyValueDrivers) : []);
  const risks = analysis?.risks ?? (isObject(payload) ? asArrayOfStrings(payload.criticalConstraints) : []);
  const nextActions = analysis?.nextActions ?? (isObject(payload) ? asArrayOfStrings(payload.dueDiligenceChecklist) : []);
  const customQueryAnswer = analysis?.customQueryAnswer ?? (isObject(payload) ? asCustomQueryAnswer(payload.customQueryAnswer) : null);

  return {
    id,
    projectId,
    projectKey,
    reportType: "analysis",
    title,
    subtitle: analysis?.title ?? scenario,
    scenario,
    targetLabel,
    targetGeometry: analysis?.analysisTarget?.geometry ?? selectedObject?.analysisTarget?.geometry ?? null,
    createdAt,
    generatedBy: "GeoAI Demo/MVP",
    decisionPosture,
    scoreSummary,
    keyFindings,
    risks,
    nextActions: nextActions.length > 0 ? nextActions : getScenarioNextActions(scenario),
    validationChecklist: defaultValidationChecklist,
    sourceLineage,
    dataHonestyNote,
    reportPayload: payload,
    coordinates,
    analysis,
    selectedObject,
    analysisTarget: analysis?.analysisTarget ?? selectedObject?.analysisTarget ?? null,
    executiveMemo: analysis?.summary ?? "This saved report contains a GeoAI MVP screening memo. Generate a fresh analysis for richer narrative detail and source-specific scoring context.",
    opportunities: analysis?.opportunities ?? [],
    limitations: analysis?.limitations ?? (isObject(payload) ? asArrayOfStrings(payload.limitations) : []),
    customQueryAnswer
  };
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
