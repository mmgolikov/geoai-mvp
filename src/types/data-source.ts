import type { AnalysisScenarioId } from "@/src/types/geo";

export type DataSourceCategory =
  | "demo"
  | "real_estate"
  | "planning_gis"
  | "infrastructure"
  | "remote_sensing"
  | "documents";

export type DataSourceStatus = "connected" | "planned" | "mock" | "unavailable";

export type DataSourceIntegrationStatus =
  | "active_demo"
  | "official_ready"
  | "planned"
  | "requires_access"
  | "requires_license"
  | "future";

export type DataSourceMaturityLevel =
  | "demo_normalized"
  | "open_ready"
  | "official_ready"
  | "licensed_commercial_ready"
  | "customer_provided"
  | "pilot_validated"
  | "production_grade";

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
  sourceType: "mock" | "demo" | "open_data" | "open_geospatial" | "official" | "commercial" | "customer";
  status: DataSourceStatus;
  integrationStatus?: DataSourceIntegrationStatus;
  updateFrequency: string;
  coverage: DataSourceCoverage;
  licenseNote: DataSourceLicense;
  accessNote?: string;
  usageInGeoAI?: string;
  limitations?: string;
  recommendedNextStep?: string;
  maturityLevel?: DataSourceMaturityLevel;
  usedInCurrentPrototype?: boolean;
  plannedForPilot?: boolean;
  decisionGrade?: boolean;
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
