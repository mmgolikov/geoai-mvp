import { createMockExpressAnalysis } from "@/src/lib/mock-express-analysis";
import type { CustomQueryAnswer } from "@/src/lib/custom-query/query-answer";
import type {
  AnalysisImpact,
  AnalysisPriority,
  AnalysisSeverity,
  AnalyzeRequest,
  ConfidenceLevel,
  StructuredAnalysisResult
} from "@/src/types/analysis";

const impacts: AnalysisImpact[] = ["positive", "neutral", "negative"];
const severities: AnalysisSeverity[] = ["low", "medium", "high"];
const priorities: AnalysisPriority[] = ["low", "medium", "high"];
const confidenceLevels: ConfidenceLevel[] = ["low", "medium", "high"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, 6);

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeCustomQueryAnswer(value: unknown): CustomQueryAnswer | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const question = asString(value.question);
  const shortAnswer = asString(value.shortAnswer);
  const recommendation = asString(value.recommendation);

  if (!question || !shortAnswer || !recommendation) {
    return undefined;
  }

  return {
    question,
    intent: asString(value.intent, "custom") as CustomQueryAnswer["intent"],
    shortAnswer,
    recommendation,
    reasoning: normalizeStringArray(value.reasoning, []),
    keyRisks: normalizeStringArray(value.keyRisks, []),
    validationNeeded: normalizeStringArray(value.validationNeeded, []),
    nextActions: normalizeStringArray(value.nextActions, []),
    sourceBasis: normalizeStringArray(value.sourceBasis, []),
    confidenceNote: asString(
      value.confidenceNote,
      "Screening-only response based on available context; official validation required."
    )
  };
}

export function createFallbackStructuredAnalysis(
  request: AnalyzeRequest,
  notice = "OpenAI is not configured. Using deterministic sample/open fallback."
): StructuredAnalysisResult {
  const mock = createMockExpressAnalysis(
    request.point,
    request.scenarioId,
    request.customQuery ?? "",
    request.selectedObject,
    request.selectedAoi
  );

  return {
    mode: "mock_fallback",
    executive_summary: mock.summary,
    key_factors: mock.keyFactors.slice(0, 6).map((factor, index) => ({
      title: `Factor ${index + 1}`,
      description: factor,
      impact: "neutral"
    })),
    opportunities: mock.opportunities.slice(0, 4).map((opportunity, index) => ({
      title: `Opportunity ${index + 1}`,
      description: opportunity
    })),
    risks: mock.risks.slice(0, 4).map((risk, index) => ({
      title: `Risk ${index + 1}`,
      description: risk,
      severity: "medium"
    })),
    recommended_actions: mock.nextActions.slice(0, 5).map((action, index) => ({
      title: `Action ${index + 1}`,
      description: action,
      priority: index < 2 ? "high" : "medium"
    })),
    evidence_notes: mock.evidence.slice(0, 5).map((item) => ({
      sourceId: item.sourceId,
      note: item.description
    })),
    confidence_level: "medium",
    limitations: [
      "Narrative content is generated from deterministic sample/open screening context.",
      "Official parcel, planning, transaction, imagery, and risk data are not connected yet."
    ],
    custom_query_answer: mock.customQueryAnswer,
    notice
  };
}

export function validateStructuredAnalysis(value: unknown): Omit<StructuredAnalysisResult, "mode"> | null {
  if (!isRecord(value)) {
    return null;
  }

  const executiveSummary = asString(value.executive_summary);
  if (!executiveSummary) {
    return null;
  }

  const keyFactors = Array.isArray(value.key_factors)
    ? value.key_factors
        .filter(isRecord)
        .map((item, index) => ({
          title: asString(item.title, `Factor ${index + 1}`),
          description: asString(item.description),
          impact: normalizeEnum(item.impact, impacts, "neutral")
        }))
        .filter((item) => item.description)
        .slice(0, 6)
    : [];

  const opportunities = Array.isArray(value.opportunities)
    ? value.opportunities
        .filter(isRecord)
        .map((item, index) => ({
          title: asString(item.title, `Opportunity ${index + 1}`),
          description: asString(item.description)
        }))
        .filter((item) => item.description)
        .slice(0, 4)
    : [];

  const risks = Array.isArray(value.risks)
    ? value.risks
        .filter(isRecord)
        .map((item, index) => ({
          title: asString(item.title, `Risk ${index + 1}`),
          description: asString(item.description),
          severity: normalizeEnum(item.severity, severities, "medium")
        }))
        .filter((item) => item.description)
        .slice(0, 4)
    : [];

  const recommendedActions = Array.isArray(value.recommended_actions)
    ? value.recommended_actions
        .filter(isRecord)
        .map((item, index) => ({
          title: asString(item.title, `Action ${index + 1}`),
          description: asString(item.description),
          priority: normalizeEnum(item.priority, priorities, "medium")
        }))
        .filter((item) => item.description)
        .slice(0, 5)
    : [];

  const evidenceNotes = Array.isArray(value.evidence_notes)
    ? value.evidence_notes
        .filter(isRecord)
        .map((item) => ({
          sourceId: asString(item.sourceId),
          note: asString(item.note)
        }))
        .filter((item) => item.sourceId && item.note)
        .slice(0, 5)
    : [];

  if (
    keyFactors.length === 0 ||
    opportunities.length === 0 ||
    risks.length === 0 ||
    recommendedActions.length === 0
  ) {
    return null;
  }

  return {
    executive_summary: executiveSummary,
    key_factors: keyFactors,
    opportunities,
    risks,
    recommended_actions: recommendedActions,
    evidence_notes: evidenceNotes,
    confidence_level: normalizeEnum(value.confidence_level, confidenceLevels, "medium"),
    limitations: normalizeStringArray(value.limitations, [
      "Analysis is limited by the currently connected demo and planned data sources."
    ]),
    custom_query_answer: normalizeCustomQueryAnswer(value.custom_query_answer),
    notice: asString(value.notice) || undefined
  };
}
