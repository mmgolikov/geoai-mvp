import type { AnalysisScenarioId, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";

export type MarketContextConfidence = "demo" | "low" | "medium" | "high";

export type MarketContextSource =
  | "seed_demo"
  | "planned_official"
  | "planned_open_data"
  | "planned_commercial"
  | "customer";

export type MarketMetric = {
  label: string;
  level: "low" | "medium" | "high";
  index: number;
  trend: "rising" | "stable" | "cooling";
  confidence: MarketContextConfidence;
  note: string;
};

export type MarketArea = {
  id: string;
  name: string;
  emirate: "Dubai";
  centroid: SelectedPoint;
  source: MarketContextSource;
  marketActivityLevel: MarketMetric;
  transactionContext: MarketMetric;
  rentContext: MarketMetric;
  developmentPipelineContext: MarketMetric;
  accessibilityContext: MarketMetric;
  planningContext: MarketMetric;
  riskContext: MarketMetric;
  sourceIds: string[];
  limitations: string[];
};

export type MarketContext = {
  areaName: string;
  emirate: "Dubai";
  centroid: SelectedPoint;
  matchDistanceKm: number | null;
  isGeneralContext: boolean;
  marketActivityLevel: MarketMetric;
  transactionContext: MarketMetric;
  rentContext: MarketMetric;
  developmentPipelineContext: MarketMetric;
  accessibilityContext: MarketMetric;
  planningContext: MarketMetric;
  riskContext: MarketMetric;
  confidenceLevel: MarketContextConfidence;
  sourceIds: string[];
  limitations: string[];
};

export type AreaMatchResult = {
  area: MarketArea | null;
  distanceKm: number | null;
  confidenceLevel: MarketContextConfidence;
  limitation?: string;
};

export type MarketContextAdapterRequest = {
  point: SelectedPoint;
  selectedObject?: SelectedDemoObject | null;
  scenarioId?: AnalysisScenarioId;
};

export type MarketContextAdapter = {
  id: string;
  name: string;
  source: MarketContextSource;
  getContext: (request: MarketContextAdapterRequest) => MarketContext;
};
