import type { GeoJsonGeometry } from "@/src/lib/point-to-object/contracts";

export type LiveMapLocationKey = "dubai" | "singapore";
export type LiveMapMarket = LiveMapLocationKey;
export type LiveMapBasemapId = "street" | "light" | "contrast";

export type Wgs84Position = [longitude: number, latitude: number];

export type LiveMapNearbyLabel = {
  name: string;
  featureClass: string;
  coordinates: Wgs84Position | null;
};

export type LiveResolvedObjectContext = {
  name: string | null;
  address: string | null;
  featureClass: string;
  sourceFeatureId: string;
  geometryType: "Point" | "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon" | null;
  coordinateAssociation:
    | "open_map_geometry_contains_point"
    | "reverse_nearest_indexed_object_not_point_in_polygon";
  resultCentroidDistanceM: number;
  addressParts: Record<string, string>;
  tags: Record<string, string>;
};

export type LiveMapSelection = {
  locationKey: LiveMapLocationKey;
  longitude: number;
  latitude: number;
  clickedAt: string;
  object: {
    name: string | null;
    featureClass: string;
    sourceFeatureId: string | null;
    geometry: GeoJsonGeometry | null;
    renderHeightM: number | null;
    renderMinHeightM: number | null;
  };
  resolvedObject: LiveResolvedObjectContext | null;
  viewport: {
    center: Wgs84Position;
    zoom: number;
    pitch: number;
    bearing: number;
    viewMode: "2d" | "3d";
    basemapId: LiveMapBasemapId;
  };
  provider: "OpenFreeMap / OpenStreetMap";
  nearbyLabels: LiveMapNearbyLabel[];
};

export type LiveObjectSelection = LiveMapSelection;

export type GroundedClaim = {
  statement: string;
  evidenceRefs: string[];
};

export type PointObjectAnalysisDepth = "quick" | "standard" | "deep";
export type PointObjectAnalysisGoal =
  | "object_profile"
  | "development_screening"
  | "redevelopment"
  | "due_diligence"
  | "custom";
export type PointObjectAnalysisPerspective = "developer" | "investor" | "asset_owner";
export type PointObjectAnalysisHorizon = "current" | "one_to_three_years" | "long_term";
export type PointObjectReasoningEffort = "low" | "medium" | "high" | "xhigh";
export type PointObjectEvidenceClass = "observed" | "derived" | "hypothesis";
export type PointObjectConfidence = "low" | "medium";

export const POINT_OBJECT_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V6_2026_09_04" as const;
export const POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION = 4 as const;

export type PointObjectAiAttemptTrace = {
  attempt: number;
  purpose: "initial" | "focused" | "repair";
  model: string;
  reasoningEffort: PointObjectReasoningEffort;
  requestId: string | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
};

export type PointObjectAnalysisRequestReceipt = {
  depth: PointObjectAnalysisDepth;
  goal: PointObjectAnalysisGoal;
  perspective: PointObjectAnalysisPerspective;
  horizon: PointObjectAnalysisHorizon;
  question: string | null;
  focused: boolean;
};

export type PointObjectDecisionBrief = {
  headline: string;
  disposition: "continue_screening" | "hold" | "insufficient_evidence";
  summary: string;
  reasons: GroundedClaim[];
  confidence: PointObjectConfidence;
};

export type PointObjectDecisionSignal = {
  title: string;
  observation: string;
  implication: string;
  evidenceClass: PointObjectEvidenceClass;
  evidenceRefs: string[];
  confidence: PointObjectConfidence;
};

export type PointObjectOpportunity = {
  title: string;
  hypothesis: string;
  rationale: string;
  potentialValue: string;
  evidenceRefs: string[];
  evidenceNeeded: string[];
  confidence: PointObjectConfidence;
};

export type PointObjectRisk = {
  title: string;
  statement: string;
  decisionImpact: string;
  severity: "low" | "medium" | "high";
  evidenceRefs: string[];
  confidence: PointObjectConfidence;
};

export type PointObjectValidationAction = {
  title: string;
  action: string;
  source: string;
  decisionImpact: string;
  priority: "critical" | "high" | "medium";
  evidenceRefs: string[];
};

export type PointObjectFocusedAnswer = GroundedClaim & {
  status: "answered" | "partial" | "unsupported";
  scope:
    | "object_identity"
    | "mapped_use"
    | "mapped_form"
    | "mapped_lifecycle"
    | "address_context"
    | "nearby_context"
    | "screening_implication"
    | "development_hypothesis"
    | "source_limitation";
  confidence: PointObjectConfidence;
  perspective: PointObjectAnalysisPerspective;
  horizon: PointObjectAnalysisHorizon;
  missingEvidence: string[];
};

export type PointObjectAiContent = {
  decisionBrief: PointObjectDecisionBrief;
  signals: PointObjectDecisionSignal[];
  opportunities: PointObjectOpportunity[];
  risks: PointObjectRisk[];
  sourceFacts: GroundedClaim[];
  locationContext: GroundedClaim[];
  nextValidation: PointObjectValidationAction[];
  answerToQuestion: PointObjectFocusedAnswer | null;
  caveat: string;
};

export type PointObjectAiTelemetry = {
  provider: "openai";
  schemaVersion: typeof POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION;
  model: string;
  reasoningEffort: PointObjectReasoningEffort;
  depth: PointObjectAnalysisDepth;
  promptVersion: typeof POINT_OBJECT_ANALYSIS_PROMPT_VERSION;
  requestId: string | null;
  latencyMs: number;
  attempts: number;
  attemptTrace: PointObjectAiAttemptTrace[];
  inputTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  costRateSource: string | null;
  stored: false;
  toolCalls: 0;
};

export type PointObjectAiSubject = {
  name: string | null;
  address: string | null;
  featureClass: string;
  sourceFeatureId: string;
  resolutionMethod: "nominatim_reverse";
  coordinateAssociation:
    | "open_map_geometry_contains_point"
    | "reverse_nearest_indexed_object_not_point_in_polygon";
  sourceLabel: string;
  geometryType: LiveResolvedObjectContext["geometryType"];
  resultCentroidDistanceM: number;
  addressParts: Record<string, string>;
  tags: Record<string, string>;
};

export type PointObjectLiveContextResponse =
  | {
      mode: "resolved";
      subject: LiveResolvedObjectContext;
    }
  | {
      mode: "unavailable";
      error?: string;
      retryable?: boolean;
    };

export type PointObjectAiResponse =
  | {
      mode: "openai";
      schemaVersion: typeof POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION;
      generatedAt: string;
      evidencePackId: string;
      evidencePackHash: string;
      request: PointObjectAnalysisRequestReceipt;
      content: PointObjectAiContent;
      subject: PointObjectAiSubject;
      telemetry: PointObjectAiTelemetry;
    }
  | {
      mode: "unavailable";
      code?: string;
      error?: string;
      retryable?: boolean;
    };
