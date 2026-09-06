import type { GeoJsonGeometry } from "@/src/lib/point-to-object/contracts";
import type {
  PointObjectLocale,
  PointObjectMarketKey
} from "@/src/lib/prototype/point-to-object-markets";
import type { PointObjectWikidataLinkedEntity } from "@/src/lib/prototype/point-to-object-wikidata-contract";

export type LiveMapLocationKey = PointObjectMarketKey;
export type LiveMapMarket = LiveMapLocationKey;
export type LiveMapLocale = PointObjectLocale;
export type LiveMapBasemapId = "street" | "light" | "contrast";

export type Wgs84Position = [longitude: number, latitude: number];

export type PointObjectContextGroup =
  | "residential"
  | "commercial"
  | "hospitality"
  | "retail_daily_needs"
  | "education"
  | "healthcare"
  | "civic_culture"
  | "transport"
  | "access"
  | "open_space"
  | "industrial"
  | "construction"
  | "other_built";

export type PointObjectDistrictCharacter =
  | "hospitality_tourism"
  | "commercial_business"
  | "residential"
  | "mixed_use_urban"
  | "civic_institutional"
  | "industrial_logistics"
  | "open_space_recreation"
  | "low_signal";

export type PointObjectGeometryMetrics = {
  footprintAreaSqM: number;
  footprintPerimeterM: number;
  method: "local_equirectangular_wgs84_approximation";
  geometryGeneralized: true;
};

export type PointObjectGeoContext = {
  radiusM: 400;
  coverage: "available" | "unavailable";
  sampleSize: number;
  capReached: boolean;
  groups: Array<{
    group: PointObjectContextGroup;
    count: number;
    sharePct: number;
    nearestDistanceM: number | null;
  }>;
  mappedBuildingCount: number;
  mappedLevelsKnownCount: number;
  medianMappedLevels: number | null;
  nearestTransitM: number | null;
  nearestMajorRoadM: number | null;
  districtCharacter: {
    code: PointObjectDistrictCharacter;
    confidence: "low" | "medium";
    ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1";
    driverGroups: PointObjectContextGroup[];
  };
};

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
    | "reverse_nearest_indexed_object_not_point_in_polygon"
    | "trusted_open_map_identity";
  resultCentroidDistanceM: number;
  addressParts: Record<string, string>;
  tags: Record<string, string>;
  metrics: PointObjectGeometryMetrics | null;
  geoContext: PointObjectGeoContext;
  linkedEntity: PointObjectWikidataLinkedEntity | null;
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

export const POINT_OBJECT_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V8_2026_09_06" as const;
export const POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION = 6 as const;
export const POINT_OBJECT_ANALYSIS_LEGACY_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V7_2026_09_04" as const;
export const POINT_OBJECT_ANALYSIS_LEGACY_RESULT_SCHEMA_VERSION = 5 as const;

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
  locale: LiveMapLocale;
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

export type PointObjectInitialSemanticBrief = {
  codes: {
    subject: "linked_named_entity" | "named_open_map_object" | "classified_open_map_object" | "coordinate_only";
    context: "hospitality_tourism_mapped" | "commercial_business_mapped" | "residential_mapped" |
      "mixed_use_urban_mapped" | "civic_institutional_mapped" | "industrial_logistics_mapped" |
      "open_space_recreation_mapped" | "sparse_open_context";
    access: "mapped_transit_and_road" | "mapped_transit_only" | "mapped_road_only" | "mapped_access_unavailable";
    implication: "developer_profile_validation" | "investor_profile_downside" | "asset_owner_profile_baseline" |
      "developer_development_sequence" | "investor_development_downside" | "asset_owner_development_constraints" |
      "developer_redevelopment_envelope" | "investor_redevelopment_downside" | "asset_owner_redevelopment_capital" |
      "developer_due_diligence_sequence" | "investor_due_diligence_gates" | "asset_owner_due_diligence_baseline" |
      "developer_custom_validation" | "investor_custom_downside" | "asset_owner_custom_baseline";
  };
  subject: GroundedClaim;
  context: GroundedClaim;
  access: GroundedClaim;
  implication: GroundedClaim;
  confidence: PointObjectConfidence;
};

export type PointObjectAiContent = {
  initialSemanticBrief: PointObjectInitialSemanticBrief;
  decisionBrief: PointObjectDecisionBrief;
  signals: PointObjectDecisionSignal[];
  opportunities: PointObjectOpportunity[];
  risks: PointObjectRisk[];
  sourceFacts: GroundedClaim[];
  locationContext: GroundedClaim[];
  nextValidation: PointObjectValidationAction[];
  answerToQuestion: PointObjectFocusedAnswer | null;
  geoContext: PointObjectGeoContext;
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
  resolutionMethod: "nominatim_reverse" | "nominatim_lookup";
  coordinateAssociation:
    | "open_map_geometry_contains_point"
    | "reverse_nearest_indexed_object_not_point_in_polygon"
    | "trusted_open_map_identity";
  sourceLabel: string;
  geometryType: LiveResolvedObjectContext["geometryType"];
  resultCentroidDistanceM: number;
  addressParts: Record<string, string>;
  tags: Record<string, string>;
  metrics: PointObjectGeometryMetrics | null;
  geoContext: PointObjectGeoContext;
  linkedEntity: PointObjectWikidataLinkedEntity | null;
};

export type PointObjectLiveContextResponse =
  | {
      mode: "resolved";
      schemaVersion: 2;
      subject: LiveResolvedObjectContext;
    }
  | {
      mode: "unavailable";
      error?: string;
      retryable?: boolean;
    };

export type LiveMapSearchResult = {
  id: string;
  label: string;
  secondaryLabel: string | null;
  longitude: number;
  latitude: number;
  category: string | null;
  featureType: string | null;
  boundingBox: [south: number, north: number, west: number, east: number] | null;
};

export type PointObjectSearchResponse =
  | { mode: "results"; results: LiveMapSearchResult[] }
  | { mode: "unavailable"; error?: string; retryable?: boolean };

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
      mode: "openai";
      schemaVersion: typeof POINT_OBJECT_ANALYSIS_LEGACY_RESULT_SCHEMA_VERSION;
      generatedAt: string;
      evidencePackId: string;
      evidencePackHash: string;
      request: PointObjectAnalysisRequestReceipt;
      content: Omit<PointObjectAiContent, "initialSemanticBrief">;
      subject: Omit<PointObjectAiSubject, "linkedEntity">;
      telemetry: Omit<PointObjectAiTelemetry, "schemaVersion" | "promptVersion"> & {
        schemaVersion: typeof POINT_OBJECT_ANALYSIS_LEGACY_RESULT_SCHEMA_VERSION;
        promptVersion: typeof POINT_OBJECT_ANALYSIS_LEGACY_PROMPT_VERSION;
      };
    }
  | {
      mode: "unavailable";
      code?: string;
      error?: string;
      retryable?: boolean;
    };
