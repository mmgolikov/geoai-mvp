export type ProjectWorkspaceStatus = "demo" | "active" | "archived";

export type SourceLineageSnapshot = {
  capturedAt: string;
  demoSources: Array<{ id: string; name: string; note: string }>;
  uploadedSources: Array<{ id: string; name: string; type: string; note: string }>;
  externalSources: Array<{
    id: string;
    name: string;
    status: string;
    dataMode?: string;
    confidence?: string;
    validationStatus?: string;
    nextValidationStep?: string;
    queriedAt?: string | null;
    sourceObservedAt?: string | null;
    queryFingerprint?: string;
    fallbackReason?: string | null;
    disclaimer: string;
  }>;
  plannedValidationSources: Array<{
    id: string;
    name: string;
    status?: string;
    dataMode?: string;
    confidence?: string;
    validationStatus?: string;
    nextValidationStep?: string;
    disclaimer: string;
  }>;
  disclaimers: string[];
};

export type ProjectWorkspaceProject = {
  id: string;
  name: string;
  clientType: string;
  description: string;
  status: ProjectWorkspaceStatus;
  createdAt: string;
  updatedAt: string;
  dataReadiness: string;
  notes: string;
};

export type WorkspaceAnalysisRun = {
  id: string;
  projectId: string | null;
  projectKey?: string | null;
  title: string;
  scenario: string;
  targetLabel: string;
  targetType: "point" | "polygon" | "uploaded-feature" | "demo-feature";
  targetGeometry: unknown;
  targetCoordinates: unknown;
  decisionPosture: string;
  scoreSummary: unknown;
  sourceLineage: SourceLineageSnapshot;
  payload: unknown;
  createdAt: string;
};

export type WorkspaceReport = {
  id: string;
  projectId: string | null;
  projectKey?: string | null;
  analysisRunId?: string | null;
  title: string;
  scenario: string;
  targetLabel: string;
  reportType: "analysis" | "comparison";
  reportPayload: unknown;
  sourceLineage: SourceLineageSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceComparisonSet = {
  id: string;
  projectId: string | null;
  projectKey?: string | null;
  title: string;
  itemCount: number;
  items: unknown[];
  recommendation: string;
  sourceLineage: SourceLineageSnapshot;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

export type UploadedDatasetRecord = {
  id: string;
  projectId: string | null;
  projectKey?: string | null;
  name: string;
  type: "csv" | "geojson";
  status: string;
  rowCount?: number | null;
  featureCount?: number | null;
  columns?: string[];
  sourceMode?: string;
  officialStatus?: string;
  uploadedAt: string;
  metadata: Record<string, unknown>;
  parsedContent?: unknown;
};
