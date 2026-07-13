import type { SpatialGeometryRoleV1, SpatialSourceModeV1 } from "@/src/types/spatial-data-v1";

export const spatialCanonicalRegistryVersionV1 = "geoai-spatial-b1-canonical-registry-v1";

export function normalizeSpatialCanonicalRegistryTokenV1(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "unnamed"
  );
}

export function buildSpatialCanonicalRegistryKeyV1(
  roleToken: string,
  slug: string,
  countryCode = "ae",
  regionCode = "du"
) {
  return `geoai:${normalizeSpatialCanonicalRegistryTokenV1(roleToken)}:${normalizeSpatialCanonicalRegistryTokenV1(
    countryCode
  )}-${normalizeSpatialCanonicalRegistryTokenV1(regionCode)}:${normalizeSpatialCanonicalRegistryTokenV1(slug)}`;
}

export type SpatialSelectionProfileV1 = {
  profileId: string;
  minimumAreaSqm: number;
  preferredAreaMinimumSqm: number;
  preferredAreaMaximumSqm: number;
  maximumAreaSqm: number;
  maximumAnchorDistanceMetres: number;
  preferredCategories: string[];
  preferredSourceNames: string[];
  distanceWeight: number;
  nameBonus: number;
  preferredNameBonus: number;
  preferredAreaBonus: number;
  preferredCategoryBonus: number;
  freshnessScores: Record<"current" | "aging" | "stale" | "unknown", number>;
};

export type SpatialSelectedAoiRegistryEntryV1 = {
  registryId: string;
  targetId: string;
  featureKey: string;
  canonicalName: string;
  contextFeatureKey: string;
  contextArea: string;
  businessNarrative: string;
  geometryRole: "aoi";
  allowedGeometrySources: SpatialSourceModeV1[];
  selectionProfile: SpatialSelectionProfileV1;
};

export const spatialSelectedAoiRegistryV1: Record<string, SpatialSelectedAoiRegistryEntryV1> = {
  "dubai-marina-jbr-palm-v1": {
    registryId: "marina-waterfront-sample-01",
    targetId: "dubai-marina-jbr-palm-v1",
    featureKey: "geoai:aoi:ae-du:marina-waterfront-sample-01",
    canonicalName: "Marina Waterfront Sample 01",
    contextFeatureKey: "geoai:area:ae-du:dubai-marina-jbr-context",
    contextArea: "Dubai Marina / JBR / Palm",
    businessNarrative: "Named open-context building footprint near the seeded Marina screening anchor.",
    geometryRole: "aoi",
    allowedGeometrySources: ["synthetic_fallback", "open_snapshot", "user_provided", "official_validated"],
    selectionProfile: {
      profileId: "marina-named-anchor-v1",
      minimumAreaSqm: 200,
      preferredAreaMinimumSqm: 300,
      preferredAreaMaximumSqm: 5000,
      maximumAreaSqm: 20000,
      maximumAnchorDistanceMetres: 750,
      preferredCategories: ["named_building", "building"],
      preferredSourceNames: ["Bonaire Tower"],
      distanceWeight: 50,
      nameBonus: 20,
      preferredNameBonus: 30,
      preferredAreaBonus: 15,
      preferredCategoryBonus: 8,
      freshnessScores: { current: 8, aging: 0, stale: -10, unknown: -5 }
    }
  },
  "downtown-business-bay-meydan-v1": {
    registryId: "business-bay-sample-01",
    targetId: "downtown-business-bay-meydan-v1",
    featureKey: "geoai:aoi:ae-du:business-bay-sample-01",
    canonicalName: "Business Bay Sample 01",
    contextFeatureKey: "geoai:area:ae-du:downtown-business-bay-context",
    contextArea: "Business Bay / Downtown / Meydan",
    businessNarrative: "Named open-context building footprint near the seeded Business Bay screening anchor.",
    geometryRole: "aoi",
    allowedGeometrySources: ["synthetic_fallback", "open_snapshot", "user_provided", "official_validated"],
    selectionProfile: {
      profileId: "business-bay-named-building-v1",
      minimumAreaSqm: 500,
      preferredAreaMinimumSqm: 1000,
      preferredAreaMaximumSqm: 10000,
      maximumAreaSqm: 50000,
      maximumAnchorDistanceMetres: 750,
      preferredCategories: ["named_building", "building"],
      preferredSourceNames: [],
      distanceWeight: 35,
      nameBonus: 30,
      preferredNameBonus: 0,
      preferredAreaBonus: 25,
      preferredCategoryBonus: 10,
      freshnessScores: { current: 10, aging: 2, stale: -10, unknown: -5 }
    }
  },
  "dubai-south-jebel-ali-v1": {
    registryId: "dubai-south-industrial-sample-01",
    targetId: "dubai-south-jebel-ali-v1",
    featureKey: "geoai:aoi:ae-du:dubai-south-industrial-sample-01",
    canonicalName: "Dubai South Industrial Sample 01",
    contextFeatureKey: "geoai:area:ae-du:dubai-south-development-context",
    contextArea: "Dubai South / Jebel Ali",
    businessNarrative: "Named operational open-context building footprint near the seeded Dubai South screening anchor.",
    geometryRole: "aoi",
    allowedGeometrySources: ["synthetic_fallback", "open_snapshot", "user_provided", "official_validated"],
    selectionProfile: {
      profileId: "dubai-south-operational-footprint-v1",
      minimumAreaSqm: 500,
      preferredAreaMinimumSqm: 1000,
      preferredAreaMaximumSqm: 20000,
      maximumAreaSqm: 100000,
      maximumAnchorDistanceMetres: 750,
      preferredCategories: [
        "industrial_building",
        "logistics_building",
        "construction_footprint",
        "named_operational_building",
        "derived_industrial_block",
        "building"
      ],
      preferredSourceNames: [],
      distanceWeight: 25,
      nameBonus: 30,
      preferredNameBonus: 0,
      preferredAreaBonus: 35,
      preferredCategoryBonus: 20,
      freshnessScores: { current: 10, aging: 0, stale: -10, unknown: -5 }
    }
  }
};

export const spatialContextRegistryV1: Array<{
  registryId: string;
  featureKey: string;
  canonicalName: string;
  geometryRole: SpatialGeometryRoleV1;
}> = [
  {
    registryId: "dubai-marina-jbr-context",
    featureKey: "geoai:area:ae-du:dubai-marina-jbr-context",
    canonicalName: "Dubai Marina / JBR Open Context",
    geometryRole: "context_boundary"
  },
  {
    registryId: "downtown-business-bay-context",
    featureKey: "geoai:area:ae-du:downtown-business-bay-context",
    canonicalName: "Downtown / Business Bay Open Context",
    geometryRole: "context_boundary"
  },
  {
    registryId: "dubai-south-development-context",
    featureKey: "geoai:area:ae-du:dubai-south-development-context",
    canonicalName: "Dubai South Development Open Context",
    geometryRole: "context_boundary"
  }
];

export function spatialCanonicalRegistryDocumentV1() {
  return {
    registryVersion: spatialCanonicalRegistryVersionV1,
    normalizationExamples: [
      {
        roleToken: "aoi",
        slug: "Marina Waterfront Sample 01",
        featureKey: buildSpatialCanonicalRegistryKeyV1("aoi", "Marina Waterfront Sample 01")
      },
      {
        roleToken: "area",
        slug: "Downtown & Business Bay Context",
        featureKey: buildSpatialCanonicalRegistryKeyV1("area", "Downtown & Business Bay Context")
      }
    ],
    contexts: [...spatialContextRegistryV1].sort((left, right) => left.featureKey.localeCompare(right.featureKey)),
    selectedAois: Object.keys(spatialSelectedAoiRegistryV1)
      .sort()
      .map((targetId) => spatialSelectedAoiRegistryV1[targetId])
  };
}
