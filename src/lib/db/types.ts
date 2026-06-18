export type DbSource = {
  id: string;
  source_key: string;
  name: string;
  provider: string;
  geography: string;
  category: string;
  source_type: string;
  integration_status: string;
  reliability_level: string;
  used_in_current_prototype: boolean;
  planned_for_pilot: boolean;
  decision_grade: boolean;
  license_note: string | null;
  access_note: string | null;
  usage_in_geoai: string | null;
  limitations: string | null;
  recommended_next_step: string | null;
  created_at: string;
  updated_at: string;
};

export type DbSpatialLayer = {
  id: string;
  source_id: string | null;
  layer_key: string;
  name: string;
  geometry_type: string;
  status: string;
  metadata: Record<string, unknown>;
};

export type DbSpatialFeature = {
  id: string;
  layer_id: string;
  feature_key: string;
  name: string;
  category: string | null;
  subtype: string | null;
  confidence_level: string | null;
  geometry: unknown;
  properties: Record<string, unknown>;
};

export type DbAnalysisRunInput = {
  runKey: string;
  projectId?: string | null;
  projectKey?: string | null;
  projectName?: string | null;
  scenarioId: string;
  selectedName: string;
  selectedType: string;
  selectedPoint: unknown;
  selectedFeatureKey?: string | null;
  inputContext?: unknown;
  selectedObject?: unknown;
  resultJson: unknown;
  decisionPosture?: string | null;
  confidenceLevel?: string | null;
  dataConfidenceLevel?: string | null;
  analysisMode?: string | null;
  createdAt?: string | null;
};

export type DbReportInput = {
  reportKey: string;
  analysisRunId?: string | null;
  projectId?: string | null;
  projectKey?: string | null;
  projectName?: string | null;
  runKey?: string | null;
  reportType: "analysis" | "comparison";
  title: string;
  reportJson: unknown;
  decisionPosture?: string | null;
  generatedAt?: string | null;
};

export type DbRepositoryResult<T> = {
  ok: boolean;
  mode: "db" | "local_only" | "local_demo";
  data: T | null;
  error: string | null;
};

export type ProjectClientType =
  | "developer"
  | "fund"
  | "family_office"
  | "bank"
  | "government"
  | "demo";

export type GeoAIProject = {
  id: string | null;
  projectKey: string;
  name: string;
  description: string;
  geography: string;
  clientType: ProjectClientType;
  primaryScenario: string;
  status: "active" | "archived" | "demo";
  dataMode: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectInput = {
  projectKey?: string;
  name: string;
  description?: string;
  geography?: string;
  clientType?: ProjectClientType;
  primaryScenario?: string;
  status?: GeoAIProject["status"];
  dataMode?: string;
  metadata?: Record<string, unknown>;
};
