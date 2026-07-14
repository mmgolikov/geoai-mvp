import { demoLayers } from "@/src/data/demo-layers";
import type { DemoLayer } from "@/src/data/demo-layers";
import type { DemoLayerId } from "@/src/types/geo";
import type { SpatialGeometryRoleV1 } from "@/src/types/spatial-data-v1";
import type { SpatialProductSourceMode } from "@/src/lib/spatial-b2/source-mode";

export const controlledSpatialFixtureChecksum = "sha256:geoai-spatial-b2a-controlled-contract-fixture-v1";

export type SpatialLayerActivationScope = "all_environments" | "preview_fixture_only" | "future_approved_delivery";
export type SpatialLayerReviewState = "sample_demo" | "controlled_fixture" | "reviewed_with_conditions" | "unavailable";

export type SpatialLayerCatalogueEntry = {
  layerKey: string;
  displayName: string;
  description: string;
  sourceMode: SpatialProductSourceMode;
  datasetId: string;
  datasetVersion: string;
  bundleChecksum: string;
  activationScope: SpatialLayerActivationScope;
  geometryRole: SpatialGeometryRoleV1;
  styleReference: string;
  defaultVisibility: boolean;
  minimumZoom: number;
  maximumZoom: number;
  featureBudget: number;
  attributionIds: string[];
  fallbackLayerKey: string;
  reviewState: SpatialLayerReviewState;
  freshnessSummary: string;
  dataHonestyLabel: string;
  killSwitchPolicy: "synthetic_fallback" | "disable_layer";
  demoLayerId?: DemoLayerId;
  fixtureLayerId?: "controlled-osm-anchor" | "controlled-overture-area";
};

const geometryRolesByLayer: Record<DemoLayerId, SpatialGeometryRoleV1> = {
  coastalFloodRiskZones: "screening_zone",
  heatRiskZones: "screening_zone",
  developmentZones: "screening_zone",
  premiumRealEstateAreas: "screening_zone",
  assetParcelObjects: "aoi",
  transportCorridors: "corridor",
  infrastructureNodes: "anchor",
  constructionSites: "observation_footprint",
  futureMunicipalityGis: "context_boundary",
  futureCustomerAssets: "asset_footprint"
};

function syntheticCatalogueEntry(layer: DemoLayer): SpatialLayerCatalogueEntry {
  const layerKey = `synthetic:${layer.id}`;
  return {
    layerKey,
    displayName: layer.legendLabel,
    description: layer.description,
    sourceMode: "synthetic_fallback",
    datasetId: `geoai-demo-${layer.id}`,
    datasetVersion: "spatial-demo-v1",
    bundleChecksum: "sha256:geoai-current-synthetic-dubai-seed",
    activationScope: "all_environments",
    geometryRole: geometryRolesByLayer[layer.id],
    styleReference: `demo-layer:${layer.id}`,
    defaultVisibility: layer.visibleByDefault,
    minimumZoom: layer.minZoom,
    maximumZoom: layer.maxZoom,
    featureBudget: layer.features.length,
    attributionIds: ["geoai-sample-layers"],
    fallbackLayerKey: layerKey,
    reviewState: "sample_demo",
    freshnessSummary: "Static GeoAI sample seed; no live source refresh.",
    dataHonestyLabel: "Sample/demo",
    killSwitchPolicy: "synthetic_fallback",
    demoLayerId: layer.id
  };
}

const controlledFixtureEntries: SpatialLayerCatalogueEntry[] = [
  {
    layerKey: "fixture:controlled-osm-anchor",
    displayName: "Controlled OSM attribution fixture",
    description: "Non-real point geometry used only to verify source-mode, attribution and lineage contracts.",
    sourceMode: "open_context_preview",
    datasetId: "geoai-controlled-osm-contract-fixture",
    datasetVersion: "fixture-v1",
    bundleChecksum: controlledSpatialFixtureChecksum,
    activationScope: "preview_fixture_only",
    geometryRole: "anchor",
    styleReference: "controlled-fixture:point",
    defaultVisibility: true,
    minimumZoom: 9,
    maximumZoom: 20,
    featureBudget: 1,
    attributionIds: ["openstreetmap"],
    fallbackLayerKey: "synthetic:infrastructureNodes",
    reviewState: "controlled_fixture",
    freshnessSummary: "Controlled non-real fixture; no source freshness claim.",
    dataHonestyLabel: "Open-context test fixture",
    killSwitchPolicy: "synthetic_fallback",
    fixtureLayerId: "controlled-osm-anchor"
  },
  {
    layerKey: "fixture:controlled-overture-area",
    displayName: "Controlled Overture attribution fixture",
    description: "Non-real polygon geometry used only to verify provider attribution and lineage contracts.",
    sourceMode: "open_context_preview",
    datasetId: "geoai-controlled-overture-contract-fixture",
    datasetVersion: "fixture-v1",
    bundleChecksum: controlledSpatialFixtureChecksum,
    activationScope: "preview_fixture_only",
    geometryRole: "context_boundary",
    styleReference: "controlled-fixture:polygon",
    defaultVisibility: true,
    minimumZoom: 9,
    maximumZoom: 20,
    featureBudget: 1,
    attributionIds: ["overture-maps-foundation", "controlled-overture-source-provider"],
    fallbackLayerKey: "synthetic:assetParcelObjects",
    reviewState: "controlled_fixture",
    freshnessSummary: "Controlled non-real fixture; no source freshness claim.",
    dataHonestyLabel: "Open-context test fixture",
    killSwitchPolicy: "synthetic_fallback",
    fixtureLayerId: "controlled-overture-area"
  }
];

export const spatialLayerCatalogue: SpatialLayerCatalogueEntry[] = [
  ...demoLayers.map(syntheticCatalogueEntry),
  ...controlledFixtureEntries
];

export const syntheticSpatialLayerCatalogue = spatialLayerCatalogue.filter(
  (entry) => entry.sourceMode === "synthetic_fallback"
);

export function getSpatialLayerCatalogueEntry(layerKey: string) {
  return spatialLayerCatalogue.find((entry) => entry.layerKey === layerKey) ?? null;
}

export function getCatalogueEntryForDemoLayer(layerId: DemoLayerId) {
  return spatialLayerCatalogue.find((entry) => entry.demoLayerId === layerId) ?? null;
}
