import { controlledSpatialFixtureChecksum } from "@/src/lib/spatial-b2/layer-catalogue";
import { spatialDataRequiredCaveatV1 } from "@/src/types/spatial-data-v1";
import type {
  SpatialDatasetVersionV1,
  SpatialFeatureEnvelopeV1,
  SpatialSnapshotBundleV1
} from "@/src/types/spatial-data-v1";

export type SpatialBundleDeliveryMethod =
  | "static_test_fixture"
  | "release_asset"
  | "object_storage"
  | "vector_tiles";

export type SpatialBundleDescriptor = {
  deliveryMethod: SpatialBundleDeliveryMethod;
  bundle: SpatialSnapshotBundleV1 | null;
  bundleChecksum: string | null;
  expectedChecksum: string | null;
  availableLayerKeys: string[];
  available: boolean;
  controlledFixture: boolean;
  containsRealGeometry: boolean;
  releaseReady: boolean;
  distributionApproved: boolean;
  publicRepositoryGeometryApproved: boolean;
  reason: string | null;
};

const accessedAt = "2026-07-14T00:00:00.000Z";

const controlledDatasets: SpatialDatasetVersionV1[] = [
  {
    datasetId: "geoai-controlled-osm-contract-fixture",
    datasetVersion: "fixture-v1",
    layerId: "controlled-osm-anchor",
    layerName: "Controlled OSM attribution fixture",
    geography: "Invented Dubai-like contract-test extent",
    snapshotDate: null,
    datasetReleaseDate: null,
    datasetSnapshotDate: null,
    accessedAt,
    validFrom: null,
    validTo: null,
    sourceId: "controlled-osm-attribution-fixture",
    sourceReleaseId: "fixture-v1",
    sourceMode: "derived_open_context",
    licenseId: "ODbL-1.0-attribution-contract-test",
    licenseUrl: "https://www.openstreetmap.org/copyright",
    attributionUrl: "https://www.openstreetmap.org/copyright",
    attribution: "© OpenStreetMap contributors (attribution contract test only)",
    buildMethod: "static non-real contract fixture",
    buildVersion: "spatial-b2a-v1",
    checksum: "sha256:controlled-osm-feature-v1",
    freshnessPolicyId: "controlled-fixture-no-freshness-claim",
    caveat: spatialDataRequiredCaveatV1
  },
  {
    datasetId: "geoai-controlled-overture-contract-fixture",
    datasetVersion: "fixture-v1",
    layerId: "controlled-overture-area",
    layerName: "Controlled Overture attribution fixture",
    geography: "Invented Dubai-like contract-test extent",
    snapshotDate: null,
    datasetReleaseDate: null,
    datasetSnapshotDate: null,
    accessedAt,
    validFrom: null,
    validTo: null,
    sourceId: "controlled-overture-attribution-fixture",
    sourceReleaseId: "fixture-v1",
    sourceMode: "derived_open_context",
    licenseId: "Overture-attribution-contract-test",
    licenseUrl: "https://docs.overturemaps.org/attribution/",
    attributionUrl: "https://docs.overturemaps.org/attribution/",
    attribution: "Overture Maps Foundation (attribution contract test only)",
    sourceProviders: [
      {
        sourceDataset: "controlled-provider-record",
        sourceRecordLicenseId: "fixture-only",
        sourceRecordLicenseUrl: null,
        sourceAttribution: "Controlled source-provider attribution fixture",
        attributionUrl: null
      }
    ],
    buildMethod: "static non-real contract fixture",
    buildVersion: "spatial-b2a-v1",
    checksum: "sha256:controlled-overture-feature-v1",
    freshnessPolicyId: "controlled-fixture-no-freshness-claim",
    caveat: spatialDataRequiredCaveatV1
  }
];

const baseQuality = {
  valid: true,
  ringClosed: null,
  selfIntersectionCount: 0,
  emptyPartCount: 0,
  centroidInside: null,
  pointOnSurfaceInside: null,
  coordinateRangeValid: true,
  areaPlausible: null,
  lengthPlausible: null,
  overlapPolicyPassed: null,
  sourceAlignmentReviewed: false,
  sourceAlignmentStatus: "pending_independent_review" as const,
  issues: [
    {
      severity: "info" as const,
      code: "controlled_non_real_fixture",
      message: "Invented geometry for B2A contract testing; not provider geometry."
    }
  ]
};

function feature(input: {
  featureKey: string;
  datasetId: string;
  sourceId: string;
  sourceFeatureId: string;
  name: string;
  category: string;
  subtype: string;
  geometry: SpatialFeatureEnvelopeV1["geometry"];
  centroid: SpatialFeatureEnvelopeV1["centroid"];
  geometryRole: SpatialFeatureEnvelopeV1["geometryRole"];
  sourceAttribution: string;
  attributionUrl: string;
}): SpatialFeatureEnvelopeV1 {
  return {
    type: "Feature",
    featureKey: input.featureKey,
    datasetId: input.datasetId,
    datasetVersion: "fixture-v1",
    sourceFeatureId: input.sourceFeatureId,
    sourceAliases: [{ sourceId: input.sourceId, sourceFeatureId: input.sourceFeatureId }],
    sourceCrosswalks: [],
    sourceProvenance: [
      {
        datasetReleaseDate: null,
        datasetSnapshotDate: null,
        sourceDataset: input.datasetId,
        sourceRecordId: input.sourceFeatureId,
        sourceRecordVersion: "fixture-v1",
        themeLicenseId: "attribution-contract-test",
        themeLicenseUrl: input.attributionUrl,
        sourceRecordLicenseId: "fixture-only",
        sourceRecordLicenseUrl: input.attributionUrl,
        sourceLicenseId: "fixture-only",
        sourceAttribution: input.sourceAttribution,
        attributionUrl: input.attributionUrl,
        sourceUpdatedAtRaw: null,
        sourceUpdatedAtEpoch: null,
        sourceUpdatedAt: null,
        sourceObservedAt: null,
        accessedAt,
        freshnessStatus: "unknown",
        freshnessPolicyId: "controlled-fixture-no-freshness-claim"
      }
    ],
    name: input.name,
    displayName: input.name,
    canonicalName: input.name,
    sourceObjectName: null,
    localName: null,
    englishName: input.name,
    alternateNames: [],
    identityScope: "derived",
    identityCrosswalkPolicy: null,
    contextArea: "Controlled B2A contract-test extent",
    businessNarrative: "Verifies Product source-mode, attribution and lineage behavior without real geometry.",
    category: input.category,
    subtype: input.subtype,
    geometry: input.geometry,
    centroid: input.centroid,
    areaSqm: null,
    geometryChecksum: `sha256:${input.sourceFeatureId}`,
    geometryOrigin: "synthetic",
    geometryRole: input.geometryRole,
    geometryAccuracy: "approximate",
    observedAt: null,
    validFrom: null,
    validTo: null,
    freshnessStatus: "unknown",
    freshnessPolicyId: "controlled-fixture-no-freshness-claim",
    sourceUpdatedAtRaw: null,
    sourceUpdatedAtEpoch: null,
    sourceUpdatedAt: null,
    validationStatus: "open_context",
    confidenceLevel: "demo",
    scenarioRelevance: ["integration_contract_test"],
    limitations: [
      "Controlled non-real geometry; no OSM or Overture feature geometry is included.",
      spatialDataRequiredCaveatV1
    ],
    lineage: [],
    quality: baseQuality,
    metadata: {
      controlledFixture: true,
      realGeometry: false
    }
  };
}

const controlledFeatures: SpatialFeatureEnvelopeV1[] = [
  feature({
    featureKey: "geoai:controlled-fixture:osm-anchor-v1",
    datasetId: "geoai-controlled-osm-contract-fixture",
    sourceId: "controlled-osm-attribution-fixture",
    sourceFeatureId: "invented-point-01",
    name: "Controlled OSM attribution point",
    category: "controlled_anchor",
    subtype: "Non-real point fixture",
    geometry: { type: "Point", coordinates: [55.235, 25.12] },
    centroid: { longitude: 55.235, latitude: 25.12 },
    geometryRole: "anchor",
    sourceAttribution: "© OpenStreetMap contributors (attribution contract test only)",
    attributionUrl: "https://www.openstreetmap.org/copyright"
  }),
  feature({
    featureKey: "geoai:controlled-fixture:overture-area-v1",
    datasetId: "geoai-controlled-overture-contract-fixture",
    sourceId: "controlled-overture-attribution-fixture",
    sourceFeatureId: "invented-polygon-01",
    name: "Controlled Overture attribution area",
    category: "controlled_context",
    subtype: "Non-real polygon fixture",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [55.214, 25.108],
        [55.224, 25.108],
        [55.224, 25.116],
        [55.214, 25.116],
        [55.214, 25.108]
      ]]
    },
    centroid: { longitude: 55.219, latitude: 25.112 },
    geometryRole: "context_boundary",
    sourceAttribution: "Overture Maps Foundation (attribution contract test only)",
    attributionUrl: "https://docs.overturemaps.org/attribution/"
  })
];

export const controlledSpatialContractFixture: SpatialSnapshotBundleV1 = {
  bundleId: "geoai-spatial-b2a-controlled-contract-fixture",
  bundleVersion: "fixture-v1",
  generatedAt: accessedAt,
  defaultSourceMode: "synthetic_fallback",
  datasets: controlledDatasets,
  features: controlledFeatures,
  metrics: []
};

export function loadSpatialBundle(deliveryMethod: SpatialBundleDeliveryMethod): SpatialBundleDescriptor {
  if (deliveryMethod !== "static_test_fixture") {
    return {
      deliveryMethod,
      bundle: null,
      bundleChecksum: null,
      expectedChecksum: null,
      availableLayerKeys: [],
      available: false,
      controlledFixture: false,
      containsRealGeometry: false,
      releaseReady: false,
      distributionApproved: false,
      publicRepositoryGeometryApproved: false,
      reason: `${deliveryMethod} is declared for future delivery but is not implemented in B2A.`
    };
  }

  return {
    deliveryMethod,
    bundle: controlledSpatialContractFixture,
    bundleChecksum: controlledSpatialFixtureChecksum,
    expectedChecksum: controlledSpatialFixtureChecksum,
    availableLayerKeys: ["fixture:controlled-osm-anchor", "fixture:controlled-overture-area"],
    available: true,
    controlledFixture: true,
    containsRealGeometry: false,
    releaseReady: true,
    distributionApproved: false,
    publicRepositoryGeometryApproved: false,
    reason: null
  };
}
