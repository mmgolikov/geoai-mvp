import type { AnalysisScenarioId, SelectedPoint } from "@/src/types/geo";
import type { DataSource } from "@/src/types/data-source";

export type SpatialLayerCategory =
  | "development_zone"
  | "premium_real_estate"
  | "infrastructure_node"
  | "construction_site"
  | "coastal_flood_risk"
  | "heat_risk"
  | "transport_corridor"
  | "asset_boundary"
  | "future_official_gis"
  | "future_customer_upload";

export type SpatialIngestionMode =
  | "seed_geojson"
  | "uploaded_geojson_planned"
  | "api_ready"
  | "database_ready";

export type GeometryQualityIssue = {
  featureId?: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type SpatialGeometry =
  | {
      type: "Polygon";
      coordinates: number[][][];
    }
  | {
      type: "Point";
      coordinates: number[];
    }
  | {
      type: "LineString";
      coordinates: number[][];
    };

export type SpatialFeatureProperties = {
  id: string;
  name: string;
  category: SpatialLayerCategory;
  subtype: string;
  sourceId: string;
  confidenceLevel: "demo" | "low" | "medium" | "high";
  geometryStatus: "seed_demo" | "validated" | "needs_review" | "planned";
  areaSqm?: number;
  centroid: SelectedPoint;
  scenarioRelevance: AnalysisScenarioId[];
  limitations: string[];
  metadata: Record<string, string | number | boolean>;
};

export type SpatialFeature = {
  type: "Feature";
  id: string;
  properties: SpatialFeatureProperties;
  geometry: SpatialGeometry;
};

export type SpatialDataSource = {
  id: string;
  name: string;
  registrySourceId: DataSource["id"];
  sourceStatus: DataSource["status"];
  ingestionMode: SpatialIngestionMode;
  confidenceLevel: SpatialFeatureProperties["confidenceLevel"];
  limitationNote: string;
};

export type SpatialDataset = {
  id: string;
  name: string;
  category: SpatialLayerCategory;
  layerId: string;
  layerName: string;
  mapType: "polygon" | "point" | "line";
  color: string;
  source: SpatialDataSource;
  features: SpatialFeature[];
};

export type SpatialValidationResult = {
  isValid: boolean;
  issues: GeometryQualityIssue[];
};

export type SpatialSelectionContext = {
  featureId: string;
  featureName: string;
  datasetId: string;
  datasetName: string;
  category: SpatialLayerCategory;
  subtype: string;
  geometryType: SpatialGeometry["type"];
  centroid: SelectedPoint;
  areaSqm?: number;
  sourceId: string;
  sourceStatus: DataSource["status"];
  geometryStatus: SpatialFeatureProperties["geometryStatus"];
  confidenceLevel: SpatialFeatureProperties["confidenceLevel"];
  limitations: string[];
  scenarioRelevance: AnalysisScenarioId[];
  canonicalFeatureKey?: string;
  layerKey?: string;
  sourceMode?: "synthetic_fallback" | "open_context_preview" | "licensed_provider" | "client_validated" | "official_validated";
  datasetVersion?: string;
  bundleChecksum?: string;
  providerId?: string;
  sourceAliases?: Array<{ sourceId: string; sourceFeatureId: string }>;
  sourceUpdatedAt?: string | null;
  freshnessStatus?: "current" | "aging" | "stale" | "unknown";
  reviewStatus?: "pending_independent_review" | "reviewed_with_conditions" | "reviewed";
  geometryOrigin?: "source" | "derived" | "user" | "synthetic";
  geometryAccuracy?: "source_exact" | "source_repaired" | "source_generalized" | "derived" | "approximate";
  qualitySummary?: string;
  attributionIds?: string[];
  sourceAttributions?: string[];
  caveat?: string;
  fallbackLayerKey?: string;
  fallbackState?: "source_active" | "synthetic_fallback_active";
};
