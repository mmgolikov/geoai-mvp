import type { AnalysisScenarioId } from "@/src/types/geo";

export type DataSourceCategory =
  | "demo"
  | "real_estate"
  | "planning_gis"
  | "infrastructure"
  | "remote_sensing"
  | "documents";

export type DataSourceStatus = "connected" | "planned" | "mock" | "unavailable";

export type DataSourceCoverage = {
  geography: string;
  spatialResolution: string;
  temporalCoverage: string;
};

export type DataSourceLicense = {
  type: "synthetic" | "open" | "official" | "commercial" | "customer";
  note: string;
};

export type DataFreshness = {
  updateFrequency: string;
  lastUpdated: string;
};

export type DataSource = {
  id: string;
  name: string;
  category: DataSourceCategory;
  geography: string;
  description: string;
  provider: string;
  sourceType: "mock" | "open_data" | "official" | "commercial" | "customer";
  status: DataSourceStatus;
  updateFrequency: string;
  coverage: DataSourceCoverage;
  licenseNote: DataSourceLicense;
  reliabilityLevel: "demo" | "low" | "medium" | "high";
  lastUpdated: string;
  usedInScenarios: AnalysisScenarioId[];
};

export type EvidenceItem = {
  id: string;
  label: string;
  description: string;
  sourceId: string;
  sourceStatus: DataSourceStatus;
  sourceType: DataSource["sourceType"];
  confidence: "demo" | "low" | "medium" | "high";
};
