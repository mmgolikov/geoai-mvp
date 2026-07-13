import type {
  SpatialDatasetVersionV1,
  SpatialFeatureEnvelopeV1,
  SpatialGeometryV1,
  SpatialJsonScalarV1,
  SpatialMetricObservationV1
} from "@/src/types/spatial-data-v1";

export type SpatialAdapterBuildContextV1 = {
  dataset: SpatialDatasetVersionV1;
  countryCode: string;
  regionCode: string;
  processingBbox: [number, number, number, number];
  observedAt: string | null;
  scenarioRelevance: string[];
};

export type ProviderGeoJsonFeatureV1 = {
  type: "Feature";
  id?: string | number | null;
  geometry: SpatialGeometryV1;
  properties?: Record<string, unknown> | null;
};

export type SpatialAdapterOutputV1 = {
  features: SpatialFeatureEnvelopeV1[];
  metrics: SpatialMetricObservationV1[];
  rejected: Array<{
    sourceFeatureId: string | null;
    reason: string;
    metadata: Record<string, SpatialJsonScalarV1>;
  }>;
};

export interface SpatialSourceAdapterV1<TRawFeature extends ProviderGeoJsonFeatureV1 = ProviderGeoJsonFeatureV1> {
  readonly adapterId: string;
  readonly sourceId: string;
  normalizeFeature(rawFeature: TRawFeature, context: SpatialAdapterBuildContextV1): SpatialFeatureEnvelopeV1 | null;
  normalizeFeatures(rawFeatures: TRawFeature[], context: SpatialAdapterBuildContextV1): SpatialAdapterOutputV1;
}
