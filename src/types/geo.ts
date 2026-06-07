export type SelectedPoint = {
  latitude: number;
  longitude: number;
};

export type DemoLayerType = "polygon" | "point" | "line";

export type DemoLayerId =
  | "developmentZones"
  | "premiumRealEstateAreas"
  | "infrastructureNodes"
  | "constructionSites"
  | "coastalFloodRiskZones"
  | "heatRiskZones"
  | "transportCorridors";

export type SelectedDemoObject = {
  id: string;
  name: string;
  type: string;
  layerId: DemoLayerId;
  layerName: string;
  geometryType: DemoLayerType;
  center: SelectedPoint;
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
  summary: string;
  scoreLabels: Record<ScoreKey, string>;
  scores: Record<ScoreKey, number>;
  keyFactors: string[];
  opportunities: string[];
  risks: string[];
  nextActions: string[];
  evidence: string[];
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
};
