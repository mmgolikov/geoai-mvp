export type SelectedPoint = {
  latitude: number;
  longitude: number;
};

export type ScoreKey =
  | "developmentPotential"
  | "investmentAttractiveness"
  | "accessibility"
  | "infrastructureReadiness"
  | "climateHeatRisk"
  | "overallRisk";

export type ExpressAnalysis = {
  id: string;
  point: SelectedPoint;
  summary: string;
  scores: Record<ScoreKey, number>;
  keyFactors: string[];
  opportunities: string[];
  risks: string[];
  nextActions: string[];
  evidence: string[];
};
