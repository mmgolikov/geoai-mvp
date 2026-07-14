import type { SpatialBundleDescriptor } from "@/src/lib/spatial-b2/bundle-loader";
import {
  spatialLayerCatalogue,
  syntheticSpatialLayerCatalogue,
  type SpatialLayerCatalogueEntry
} from "@/src/lib/spatial-b2/layer-catalogue";
import type { SpatialProductSourceMode, SpatialSourceRequest } from "@/src/lib/spatial-b2/source-mode";

export type SpatialLayerActivationResult = {
  requestedLayerKey: string;
  effectiveLayerKey: string;
  effectiveSourceMode: SpatialProductSourceMode;
  activated: boolean;
  usedFallback: boolean;
  reason: string | null;
};

export type SpatialActivationResult = {
  runtimeEnvironment: SpatialSourceRequest["runtimeEnvironment"];
  requestedSourceMode: SpatialProductSourceMode;
  approvedSourceMode: SpatialProductSourceMode;
  effectiveSourceMode: SpatialProductSourceMode;
  requestAllowed: boolean;
  fallbackReason: string | null;
  activeLayers: SpatialLayerCatalogueEntry[];
  layerResults: SpatialLayerActivationResult[];
  syntheticLayerCount: number;
  defaultVisibleSyntheticLayerCount: number;
  openFixtureFeatureCount: number;
  openRealGeometryFeatureCount: number;
  activeAttributionIds: string[];
  bundleChecksum: string | null;
  rollbackResult: "synthetic_default" | "synthetic_fallback" | "controlled_fixture_active";
};

export type SpatialActivationInput = SpatialSourceRequest & {
  bundle: SpatialBundleDescriptor;
  layerFlags?: Record<string, boolean | undefined>;
  catalogue?: SpatialLayerCatalogueEntry[];
};

export type SpatialDeliveryPolicyInput = Pick<
  SpatialBundleDescriptor,
  "deliveryMethod" | "releaseReady" | "deliveryApproved" | "distributionApproved" | "publicRepositoryGeometryApproved"
>;

export type SpatialDeliveryPolicyResult = {
  allowed: boolean;
  repositoryApprovalRequired: boolean;
  reason: string | null;
};

export function evaluateSpatialDeliveryPolicy(input: SpatialDeliveryPolicyInput): SpatialDeliveryPolicyResult {
  const repositoryApprovalRequired = input.deliveryMethod === "repository_fixture";

  if (!input.releaseReady) {
    return { allowed: false, repositoryApprovalRequired, reason: "Bundle is not release-ready." };
  }
  if (!input.deliveryApproved) {
    return { allowed: false, repositoryApprovalRequired, reason: "Bundle delivery is not approved." };
  }
  if (!input.distributionApproved) {
    return { allowed: false, repositoryApprovalRequired, reason: "Bundle distribution is not approved." };
  }
  if (repositoryApprovalRequired && !input.publicRepositoryGeometryApproved) {
    return { allowed: false, repositoryApprovalRequired, reason: "Public repository geometry publication is not approved." };
  }

  return { allowed: true, repositoryApprovalRequired, reason: null };
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function syntheticResult(
  input: SpatialActivationInput,
  reason: string | null,
  layerResults: SpatialLayerActivationResult[] = []
): SpatialActivationResult {
  const catalogue = input.catalogue ?? spatialLayerCatalogue;
  const syntheticLayers = catalogue.filter(
    (entry) => entry.sourceMode === "synthetic_fallback" && input.layerFlags?.[entry.layerKey] !== false
  );

  return {
    runtimeEnvironment: input.runtimeEnvironment,
    requestedSourceMode: input.requestedSourceMode,
    approvedSourceMode: input.approvedSourceMode,
    effectiveSourceMode: "synthetic_fallback",
    requestAllowed: input.requestedSourceMode === "synthetic_fallback" && reason === null,
    fallbackReason: reason,
    activeLayers: syntheticLayers,
    layerResults: [
      ...syntheticLayers.map((entry) => ({
        requestedLayerKey: entry.layerKey,
        effectiveLayerKey: entry.layerKey,
        effectiveSourceMode: "synthetic_fallback" as const,
        activated: true,
        usedFallback: reason !== null,
        reason
      })),
      ...layerResults
    ],
    syntheticLayerCount: syntheticLayers.length,
    defaultVisibleSyntheticLayerCount: syntheticLayers.filter((entry) => entry.defaultVisibility).length,
    openFixtureFeatureCount: 0,
    openRealGeometryFeatureCount: 0,
    activeAttributionIds: unique(syntheticLayers.flatMap((entry) => entry.attributionIds)).sort(),
    bundleChecksum: input.bundle.bundleChecksum,
    rollbackResult: reason ? "synthetic_fallback" : "synthetic_default"
  };
}

export function resolveSpatialActivation(input: SpatialActivationInput): SpatialActivationResult {
  const catalogue = input.catalogue ?? spatialLayerCatalogue;

  if (input.requestedSourceMode === "synthetic_fallback") {
    return syntheticResult(input, null);
  }

  if (input.runtimeEnvironment === "production") {
    return syntheticResult(input, "Production permits synthetic_fallback only; the requested source mode was rejected.");
  }

  if (
    input.requestedSourceMode !== "open_context_preview" ||
    input.approvedSourceMode !== "open_context_preview"
  ) {
    return syntheticResult(input, "The requested source mode is not approved for this B2A runtime.");
  }

  if (!input.bundle.available || !input.bundle.bundle) {
    return syntheticResult(input, input.bundle.reason ?? "The requested bundle is unavailable.");
  }

  if (
    !input.bundle.bundleChecksum ||
    !input.bundle.expectedChecksum ||
    input.bundle.bundleChecksum !== input.bundle.expectedChecksum
  ) {
    return syntheticResult(input, "Bundle checksum mismatch; activation failed closed.");
  }

  if (input.bundle.containsRealGeometry) {
    const deliveryPolicy = evaluateSpatialDeliveryPolicy(input.bundle);
    if (!deliveryPolicy.allowed) {
      return syntheticResult(input, `${deliveryPolicy.reason} Activation failed closed.`);
    }
  }

  if (!input.bundle.controlledFixture && !input.bundle.containsRealGeometry) {
    return syntheticResult(input, "Only the controlled non-real fixture is implemented in B2A.");
  }

  const syntheticLayers = catalogue.filter(
    (entry) => entry.sourceMode === "synthetic_fallback" && input.layerFlags?.[entry.layerKey] !== false
  );
  const fixtureEntries = catalogue.filter(
    (entry) => entry.sourceMode === "open_context_preview" && input.layerFlags?.[entry.layerKey] !== false
  );
  const activatedFixtureLayers: SpatialLayerCatalogueEntry[] = [];
  const layerResults: SpatialLayerActivationResult[] = [];

  for (const entry of fixtureEntries) {
    const isAvailable = input.bundle.availableLayerKeys.includes(entry.layerKey);
    const isReviewed = entry.reviewState === "controlled_fixture" || entry.reviewState === "reviewed_with_conditions";
    const fallback = catalogue.find((candidate) => candidate.layerKey === entry.fallbackLayerKey);

    if (isAvailable && isReviewed && entry.bundleChecksum === input.bundle.bundleChecksum) {
      activatedFixtureLayers.push(entry);
      layerResults.push({
        requestedLayerKey: entry.layerKey,
        effectiveLayerKey: entry.layerKey,
        effectiveSourceMode: "open_context_preview",
        activated: true,
        usedFallback: false,
        reason: null
      });
      continue;
    }

    layerResults.push({
      requestedLayerKey: entry.layerKey,
      effectiveLayerKey: fallback?.layerKey ?? entry.fallbackLayerKey,
      effectiveSourceMode: "synthetic_fallback",
      activated: Boolean(fallback),
      usedFallback: true,
      reason: !isAvailable
        ? "Layer is unavailable; synthetic layer fallback retained."
        : !isReviewed
          ? "Layer review state is not eligible; synthetic layer fallback retained."
          : "Layer checksum mismatch; synthetic layer fallback retained."
    });
  }

  if (activatedFixtureLayers.length === 0) {
    return syntheticResult(input, "No controlled fixture layer passed activation checks.", layerResults);
  }

  const activeLayers = [...syntheticLayers, ...activatedFixtureLayers];
  const fixtureFeatureCount = input.bundle.bundle.features.filter((feature) =>
    activatedFixtureLayers.some((entry) => entry.datasetId === feature.datasetId)
  ).length;

  return {
    runtimeEnvironment: input.runtimeEnvironment,
    requestedSourceMode: input.requestedSourceMode,
    approvedSourceMode: input.approvedSourceMode,
    effectiveSourceMode: "open_context_preview",
    requestAllowed: true,
    fallbackReason: null,
    activeLayers,
    layerResults: [
      ...syntheticLayers.map((entry) => ({
        requestedLayerKey: entry.layerKey,
        effectiveLayerKey: entry.layerKey,
        effectiveSourceMode: "synthetic_fallback" as const,
        activated: true,
        usedFallback: false,
        reason: null
      })),
      ...layerResults
    ],
    syntheticLayerCount: syntheticLayers.length,
    defaultVisibleSyntheticLayerCount: syntheticLayers.filter((entry) => entry.defaultVisibility).length,
    openFixtureFeatureCount: fixtureFeatureCount,
    openRealGeometryFeatureCount: input.bundle.containsRealGeometry ? fixtureFeatureCount : 0,
    activeAttributionIds: unique(activeLayers.flatMap((entry) => entry.attributionIds)).sort(),
    bundleChecksum: input.bundle.bundleChecksum,
    rollbackResult: "controlled_fixture_active"
  };
}

export function createDefaultSpatialActivation(input: SpatialSourceRequest) {
  return resolveSpatialActivation({
    ...input,
    bundle: {
      deliveryMethod: "static_test_fixture",
      bundle: null,
      bundleChecksum: null,
      expectedChecksum: null,
      availableLayerKeys: [],
      available: false,
      controlledFixture: false,
      containsRealGeometry: false,
      releaseReady: false,
      deliveryApproved: false,
      distributionApproved: false,
      publicRepositoryGeometryApproved: false,
      reason: "No bundle requested for synthetic mode."
    },
    catalogue: syntheticSpatialLayerCatalogue
  });
}
