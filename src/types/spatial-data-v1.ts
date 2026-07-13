export type SpatialPositionV1 = [number, number] | [number, number, number];

export type SpatialGeometryV1 =
  | { type: "Point"; coordinates: SpatialPositionV1 }
  | { type: "MultiPoint"; coordinates: SpatialPositionV1[] }
  | { type: "LineString"; coordinates: SpatialPositionV1[] }
  | { type: "MultiLineString"; coordinates: SpatialPositionV1[][] }
  | { type: "Polygon"; coordinates: SpatialPositionV1[][] }
  | { type: "MultiPolygon"; coordinates: SpatialPositionV1[][][] };

export type SpatialSourceModeV1 =
  | "open_snapshot"
  | "derived_open_context"
  | "user_provided"
  | "licensed"
  | "official_validated"
  | "synthetic_fallback";

export type SpatialValidationStatusV1 =
  | "open_context"
  | "derived_screening"
  | "user_unvalidated"
  | "client_validated"
  | "official_validated";

export type SpatialGeometryOriginV1 = "source" | "derived" | "user" | "synthetic";

export type SpatialGeometryRoleV1 =
  | "context_boundary"
  | "screening_zone"
  | "asset_footprint"
  | "aoi"
  | "corridor"
  | "anchor"
  | "observation_footprint";

export type SpatialGeometryAccuracyV1 =
  | "source_exact"
  | "source_generalized"
  | "derived"
  | "approximate";

export type SpatialFreshnessStatusV1 = "current" | "aging" | "stale" | "unknown";
export type SpatialConfidenceV1 = "demo" | "low" | "medium" | "high";
export type SpatialJsonScalarV1 = string | number | boolean | null;

export type SpatialSourceAliasV1 = {
  sourceId: string;
  sourceFeatureId: string;
};

export type SpatialQualityIssueV1 = {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
};

export type SpatialGeometryQualityV1 = {
  valid: boolean;
  ringClosed: boolean | null;
  selfIntersectionCount: number;
  emptyPartCount: number;
  centroidInside: boolean | null;
  coordinateRangeValid: boolean;
  areaPlausible: boolean | null;
  overlapPolicyPassed: boolean | null;
  sourceAlignmentReviewed: boolean;
  issues: SpatialQualityIssueV1[];
};

export type SpatialLineageStepV1 = {
  sequence: number;
  operation: string;
  tool: string;
  toolVersion: string | null;
  inputDatasetIds: string[];
  parameters: Record<string, SpatialJsonScalarV1>;
  outputChecksum: string | null;
};

export type SpatialDatasetVersionV1 = {
  datasetId: string;
  datasetVersion: string;
  layerId: string;
  layerName: string;
  geography: string;
  snapshotDate: string | null;
  accessedAt: string;
  validFrom: string | null;
  validTo: string | null;
  sourceId: string;
  sourceReleaseId: string | null;
  sourceMode: SpatialSourceModeV1;
  licenseId: string;
  attribution: string;
  buildMethod: string;
  buildVersion: string;
  checksum: string;
  caveat: string;
};

export type SpatialFeatureEnvelopeV1 = {
  type: "Feature";
  featureKey: string;
  datasetId: string;
  datasetVersion: string;
  sourceFeatureId: string | null;
  sourceAliases: SpatialSourceAliasV1[];
  name: string;
  category: string;
  subtype: string;
  geometry: SpatialGeometryV1;
  centroid: { longitude: number; latitude: number };
  areaSqm: number | null;
  geometryOrigin: SpatialGeometryOriginV1;
  geometryRole: SpatialGeometryRoleV1;
  geometryAccuracy: SpatialGeometryAccuracyV1;
  observedAt: string | null;
  validFrom: string | null;
  validTo: string | null;
  freshnessStatus: SpatialFreshnessStatusV1;
  validationStatus: SpatialValidationStatusV1;
  confidenceLevel: SpatialConfidenceV1;
  scenarioRelevance: string[];
  limitations: string[];
  lineage: SpatialLineageStepV1[];
  quality: SpatialGeometryQualityV1;
  metadata: Record<string, SpatialJsonScalarV1>;
};

export type SpatialMetricObservationV1 = {
  metricObservationId: string;
  featureKey: string;
  metricId: string;
  value: number | string | null;
  unit: string | null;
  observedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  sourceId: string;
  datasetVersion: string;
  method: "source_value" | "aggregation" | "model" | "manual";
  confidenceLevel: SpatialConfidenceV1;
  validationStatus: SpatialValidationStatusV1;
  caveat: string;
};

export type SpatialSnapshotBundleV1 = {
  bundleId: string;
  bundleVersion: string;
  generatedAt: string;
  defaultSourceMode: "synthetic_fallback";
  datasets: SpatialDatasetVersionV1[];
  features: SpatialFeatureEnvelopeV1[];
  metrics: SpatialMetricObservationV1[];
};

export const spatialValidationStatusLabelsV1: Record<SpatialValidationStatusV1, string> = {
  open_context: "Open-context geometry",
  derived_screening: "Derived screening zone",
  user_unvalidated: "User-provided; validation required",
  client_validated: "Client-validated evidence",
  official_validated: "Officially validated for the stated source and scope"
};

export const spatialDataRequiredCaveatV1 =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
