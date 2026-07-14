import type {
  SpatialDatasetVersionV1,
  SpatialFeatureEnvelopeV1,
  SpatialMetricObservationV1,
  SpatialSnapshotBundleV1,
  SpatialSourceModeV1,
  SpatialValidationStatusV1
} from "@/src/types/spatial-data-v1";

const sourceModePrecedence: Record<SpatialSourceModeV1, number> = {
  synthetic_fallback: 10,
  derived_open_context: 20,
  open_snapshot: 30,
  licensed: 40,
  user_provided: 50,
  official_validated: 60
};

const validationPrecedence: Record<SpatialValidationStatusV1, number> = {
  derived_screening: 10,
  open_context: 20,
  user_unvalidated: 30,
  client_validated: 40,
  official_validated: 50
};

function datasetKey(datasetId: string, datasetVersion: string) {
  return `${datasetId}@${datasetVersion}`;
}

function assertBundleIntegrity(bundle: SpatialSnapshotBundleV1) {
  if (bundle.defaultSourceMode !== "synthetic_fallback") {
    throw new Error("B1 bundles must preserve synthetic_fallback as the default Product source mode.");
  }

  const datasetKeys = new Set<string>();
  for (const dataset of bundle.datasets) {
    const key = datasetKey(dataset.datasetId, dataset.datasetVersion);
    if (datasetKeys.has(key)) throw new Error(`Duplicate spatial dataset version: ${key}`);
    datasetKeys.add(key);
  }

  const featureVersionKeys = new Set<string>();
  for (const feature of bundle.features) {
    const sourceDatasetKey = datasetKey(feature.datasetId, feature.datasetVersion);
    if (!datasetKeys.has(sourceDatasetKey)) {
      throw new Error(`Feature ${feature.featureKey} references missing dataset ${sourceDatasetKey}`);
    }
    const featureVersionKey = `${feature.featureKey}@${sourceDatasetKey}`;
    if (featureVersionKeys.has(featureVersionKey)) {
      throw new Error(`Duplicate feature/version record: ${featureVersionKey}`);
    }
    featureVersionKeys.add(featureVersionKey);
  }
}

function datasetTimestamp(dataset: SpatialDatasetVersionV1) {
  const value = dataset.validFrom ?? dataset.snapshotDate ?? dataset.accessedAt;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function createSpatialBundleRepositoryV1(bundle: SpatialSnapshotBundleV1) {
  assertBundleIntegrity(bundle);
  const datasetsByVersion = new Map(
    bundle.datasets.map((dataset) => [datasetKey(dataset.datasetId, dataset.datasetVersion), dataset] as const)
  );

  return {
    bundleId: bundle.bundleId,
    bundleVersion: bundle.bundleVersion,
    defaultSourceMode: bundle.defaultSourceMode,
    listDatasets(): SpatialDatasetVersionV1[] {
      return [...bundle.datasets];
    },
    getDataset(datasetId: string, datasetVersion: string) {
      return datasetsByVersion.get(datasetKey(datasetId, datasetVersion)) ?? null;
    },
    listFeatures(datasetId?: string): SpatialFeatureEnvelopeV1[] {
      return bundle.features.filter((feature) => !datasetId || feature.datasetId === datasetId);
    },
    listMetrics(featureKey?: string): SpatialMetricObservationV1[] {
      return bundle.metrics.filter((metric) => !featureKey || metric.featureKey === featureKey);
    },
    getFeature(featureKey: string, datasetVersion?: string) {
      return (
        bundle.features.find(
          (feature) => feature.featureKey === featureKey && (!datasetVersion || feature.datasetVersion === datasetVersion)
        ) ?? null
      );
    },
    resolveFeature(featureKey: string) {
      const candidates = bundle.features.filter((feature) => feature.featureKey === featureKey && feature.quality.valid);
      return (
        candidates
          .map((feature) => ({
            feature,
            dataset: datasetsByVersion.get(datasetKey(feature.datasetId, feature.datasetVersion))
          }))
          .filter(
            (candidate): candidate is { feature: SpatialFeatureEnvelopeV1; dataset: SpatialDatasetVersionV1 } =>
              Boolean(candidate.dataset)
          )
          .sort((left, right) => {
            const sourceDifference =
              sourceModePrecedence[right.dataset.sourceMode] - sourceModePrecedence[left.dataset.sourceMode];
            if (sourceDifference !== 0) return sourceDifference;
            const validationDifference =
              validationPrecedence[right.feature.validationStatus] -
              validationPrecedence[left.feature.validationStatus];
            if (validationDifference !== 0) return validationDifference;
            return datasetTimestamp(right.dataset) - datasetTimestamp(left.dataset);
          })[0]?.feature ?? null
      );
    }
  };
}

export type SpatialBundleRepositoryV1 = ReturnType<typeof createSpatialBundleRepositoryV1>;
