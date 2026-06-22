import type { EvidenceItem } from "@/src/types/data-source";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { MarketMetricsMatch } from "@/src/lib/market-metrics/types";
import type { CustomQueryAnswer } from "@/src/lib/custom-query/query-answer";
import type { MarketContext } from "@/src/types/market-context";
import type { SpatialSelectionContext } from "@/src/types/spatial-data";
import type { UploadedDataContext } from "@/src/types/uploaded-data";

export type SelectedPoint = {
  latitude: number;
  longitude: number;
};

export type DemoLayerType = "polygon" | "point" | "line";

export type AnalysisTarget = {
  id: string;
  type: "point" | "uploaded-feature" | "demo-feature";
  label: string;
  coordinates?: SelectedPoint;
  geometry?: GeoJSON.Geometry;
  properties?: Record<string, unknown>;
  datasetId?: string;
  datasetName?: string;
  sourceMode?: "user-uploaded" | "sample-fixture" | "manual-offline" | "demo";
  officialStatus?: "official-validation-required" | "not-official";
};

export type DemoLayerId =
  | "developmentZones"
  | "premiumRealEstateAreas"
  | "infrastructureNodes"
  | "constructionSites"
  | "coastalFloodRiskZones"
  | "heatRiskZones"
  | "transportCorridors"
  | "assetParcelObjects"
  | "futureMunicipalityGis"
  | "futureCustomerAssets";

export type SelectedDemoObject = {
  id: string;
  name: string;
  type: string;
  layerId: DemoLayerId;
  layerName: string;
  geometryType: DemoLayerType;
  center: SelectedPoint;
  spatialContext?: SpatialSelectionContext;
  analysisTarget?: AnalysisTarget;
};

export type ScoreKey =
  | "developmentPotential"
  | "investmentAttractiveness"
  | "accessibility"
  | "infrastructureReadiness"
  | "climateHeatRisk"
  | "overallRisk";

export type AnalysisScenarioId =
  | "realEstateDevelopment"
  | "investmentSiteSelection"
  | "constructionMonitoring"
  | "infrastructureUrbanPlanning"
  | "climateRisk"
  | "customQuery";

export type AnalysisScenario = {
  id: AnalysisScenarioId;
  label: string;
  description: string;
};

export type ExpressAnalysis = {
  id: string;
  scenarioId: AnalysisScenarioId;
  title: string;
  subtitle: string;
  point: SelectedPoint;
  selectedObject?: SelectedDemoObject;
  analysisTarget?: AnalysisTarget;
  summary: string;
  scoreLabels: Record<ScoreKey, string>;
  scores: Record<ScoreKey, number>;
  keyFactors: string[];
  opportunities: string[];
  risks: string[];
  nextActions: string[];
  evidence: EvidenceItem[];
  marketContext?: MarketContext;
  analysisMode?: "openai" | "mock_fallback";
  confidenceLevel?: "low" | "medium" | "high";
  limitations?: string[];
  analysisNotice?: string;
  generatedAt?: string;
  project?: GeoAIProject;
  marketMetricsMatch?: MarketMetricsMatch;
  uploadedDataContext?: UploadedDataContext;
  customQuery?: string;
  customQueryIntent?: string;
  customQuerySummary?: string;
  customQueryAnswer?: CustomQueryAnswer;
};

export type ComparisonItem = {
  id: string;
  name: string;
  itemType: "point" | "object";
  scenarioId: AnalysisScenarioId;
  scenarioLabel: string;
  point: SelectedPoint;
  selectedObject?: SelectedDemoObject;
  locationLabel: string;
};

export type ComparisonScorecard = {
  item: ComparisonItem;
  scores: Record<ScoreKey, number>;
  overallScore: number;
  riskLevel: "Low" | "Moderate" | "Elevated";
  recommendedUse: string;
  keyConcern: string;
  marketMetricsMatch?: MarketMetricsMatch;
};

export type ComparisonResult = {
  id: string;
  items: ComparisonScorecard[];
  winner: ComparisonScorecard;
  whyPreferred: string;
  whenAnotherMayBeBetter: string;
  sharedOpportunities: string[];
  differentiatedRisks: string[];
  nextActions: string[];
  evidence: EvidenceItem[];
  project?: GeoAIProject;
  customQuery?: string;
  customQueryIntent?: string;
  customQueryAnswer?: CustomQueryAnswer;
};

export type AnalysisHistoryItem = {
  id: string;
  title: string;
  scenarioId: AnalysisScenarioId;
  scenarioLabel: string;
  timestamp: string;
  locationLabel: string;
  analysisMode?: ExpressAnalysis["analysisMode"];
  confidenceLevel?: ExpressAnalysis["confidenceLevel"];
  dataConfidenceLevel?: string;
  source?: "DB" | "local";
  project?: GeoAIProject;
  projectKey?: string;
  recommendation: string;
  analysis: ExpressAnalysis;
};
