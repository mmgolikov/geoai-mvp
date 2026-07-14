import type { SpatialLayerCatalogueEntry } from "@/src/lib/spatial-b2/layer-catalogue";
import type { SpatialProductSourceMode } from "@/src/lib/spatial-b2/source-mode";
import type { SpatialDatasetVersionV1, SpatialFeatureEnvelopeV1 } from "@/src/types/spatial-data-v1";

export type SpatialSelectionLineage = {
  canonicalFeatureKey: string;
  layerKey: string;
  sourceMode: SpatialProductSourceMode;
  datasetId: string;
  datasetVersion: string;
  bundleChecksum: string;
  sourceId: string;
  providerFeatureId: string | null;
  sourceRecordId: string | null;
  sourceAliases: SpatialFeatureEnvelopeV1["sourceAliases"];
  sourceUpdatedAt: string | null;
  freshnessStatus: SpatialFeatureEnvelopeV1["freshnessStatus"];
  reviewStatus: SpatialFeatureEnvelopeV1["quality"]["sourceAlignmentStatus"];
  geometryOrigin: SpatialFeatureEnvelopeV1["geometryOrigin"];
  geometryAccuracy: SpatialFeatureEnvelopeV1["geometryAccuracy"];
  qualitySummary: string;
  attributionIds: string[];
  sourceAttributions: string[];
  limitations: string[];
  caveat: string;
  fallbackLayerKey: string;
  fallbackState: "source_active" | "synthetic_fallback_active";
};

export function createSpatialSelectionLineage(input: {
  feature: SpatialFeatureEnvelopeV1;
  dataset: SpatialDatasetVersionV1;
  catalogueEntry: SpatialLayerCatalogueEntry;
  fallbackState?: SpatialSelectionLineage["fallbackState"];
}): SpatialSelectionLineage {
  const { feature, dataset, catalogueEntry } = input;
  const issueCount = feature.quality.issues.filter((issue) => issue.severity !== "info").length;

  return {
    canonicalFeatureKey: feature.featureKey,
    layerKey: catalogueEntry.layerKey,
    sourceMode: catalogueEntry.sourceMode,
    datasetId: feature.datasetId,
    datasetVersion: feature.datasetVersion,
    bundleChecksum: catalogueEntry.bundleChecksum,
    sourceId: feature.sourceAliases[0]?.sourceId ?? dataset.sourceId,
    providerFeatureId: feature.sourceAliases[0]?.sourceFeatureId ?? feature.sourceFeatureId,
    sourceRecordId: feature.sourceProvenance[0]?.sourceRecordId ?? null,
    sourceAliases: feature.sourceAliases,
    sourceUpdatedAt: feature.sourceUpdatedAt,
    freshnessStatus: feature.freshnessStatus,
    reviewStatus: feature.quality.sourceAlignmentStatus,
    geometryOrigin: feature.geometryOrigin,
    geometryAccuracy: feature.geometryAccuracy,
    qualitySummary: feature.quality.valid
      ? `Geometry contract valid; ${issueCount} review issue${issueCount === 1 ? "" : "s"}.`
      : `Geometry contract failed; ${issueCount} review issue${issueCount === 1 ? "" : "s"}.`,
    attributionIds: [...catalogueEntry.attributionIds],
    sourceAttributions: feature.sourceProvenance.map((item) => item.sourceAttribution),
    limitations: [...feature.limitations],
    caveat: dataset.caveat,
    fallbackLayerKey: catalogueEntry.fallbackLayerKey,
    fallbackState: input.fallbackState ?? "source_active"
  };
}

export function canonicalFeatureKeySurvivesVersionChange(
  previous: Pick<SpatialSelectionLineage, "canonicalFeatureKey" | "datasetVersion">,
  next: Pick<SpatialSelectionLineage, "canonicalFeatureKey" | "datasetVersion">
) {
  return previous.datasetVersion !== next.datasetVersion && previous.canonicalFeatureKey === next.canonicalFeatureKey;
}
