import type { DataSource, EvidenceItem } from "@/src/types/data-source";
import type { CustomQueryAnswer } from "@/src/lib/custom-query/query-answer";
import type { MarketContext } from "@/src/types/market-context";
import type {
  AnalysisScenarioId,
  AnalysisTarget,
  ScoreKey,
  SelectedDemoObject,
  SelectedPoint,
  UserDrawnAoi
} from "@/src/types/geo";

export type AnalysisMode = "openai" | "mock_fallback";
export type AnalysisImpact = "positive" | "neutral" | "negative";
export type AnalysisSeverity = "low" | "medium" | "high";
export type AnalysisPriority = "low" | "medium" | "high";
export type ConfidenceLevel = "low" | "medium" | "high";

export type StructuredKeyFactor = {
  title: string;
  description: string;
  impact: AnalysisImpact;
};

export type StructuredOpportunity = {
  title: string;
  description: string;
};

export type StructuredRisk = {
  title: string;
  description: string;
  severity: AnalysisSeverity;
};

export type StructuredRecommendedAction = {
  title: string;
  description: string;
  priority: AnalysisPriority;
};

export type StructuredEvidenceNote = {
  sourceId: string;
  note: string;
};

export type StructuredAnalysisResult = {
  mode: AnalysisMode;
  executive_summary: string;
  key_factors: StructuredKeyFactor[];
  opportunities: StructuredOpportunity[];
  risks: StructuredRisk[];
  recommended_actions: StructuredRecommendedAction[];
  evidence_notes: StructuredEvidenceNote[];
  confidence_level: ConfidenceLevel;
  limitations: string[];
  custom_query_answer?: CustomQueryAnswer;
  notice?: string;
};

export type AnalyzeRequest = {
  projectKey?: string | null;
  point: SelectedPoint;
  selectedObject?: SelectedDemoObject | null;
  selectedAoi?: UserDrawnAoi | null;
  analysisTarget?: AnalysisTarget | null;
  scenarioId: AnalysisScenarioId;
  scenarioLabel: string;
  customQuery?: string;
  customQueryIntent?: string;
  customQueryAnswer?: CustomQueryAnswer;
  deterministicScores: Record<ScoreKey, number>;
  evidence: EvidenceItem[];
  dataSources: DataSource[];
  marketContext?: MarketContext | null;
  climateContext?: unknown;
};
