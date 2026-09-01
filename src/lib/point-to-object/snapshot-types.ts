import type {
  GeoJsonGeometry,
  LivePointContextCategory,
  LivePointEntityType
} from "./contracts";
import type { CalculationCrs } from "./geometry";

export interface LivePointSnapshot {
  schemaVersion: "point-to-object-snapshot-v1";
  manifestId: "point-to-object-open-context-manifest-v1" | "point-to-object-synthetic-manifest-v1";
  generatedAt: string;
  caveat: string;
  sourcePolicy: {
    runtimeSourceFamily: "openstreetmap_snapshot" | "synthetic_fixture";
    rightsStatus: "cleared_for_experiment";
    licenseId: "ODbL-1.0" | "Synthetic-Non-Runtime-1.0";
    licenseUrl: string;
    attribution: string;
    attributionUrl: string;
    officialLiveStatus: "open_snapshot_not_official" | "synthetic_non_runtime";
  };
  casePacks: LivePointCasePack[];
  bundleHash: string;
}

export interface LivePointCasePack {
  id: string;
  name: string;
  locale: string;
  crs: "EPSG:4326";
  calculationCrs: CalculationCrs;
  coverage: {
    id: string;
    center: { longitude: number; latitude: number };
    radiusM: number;
    bbox: [number, number, number, number];
    geometry: Extract<GeoJsonGeometry, { type: "Polygon" }>;
    geometryHash: string;
    completeness: {
      completeRadiusM: number;
      completeBbox: [number, number, number, number];
      completeGeometry: Extract<GeoJsonGeometry, { type: "Polygon" }>;
      completeGeometryHash: string;
      outerBand: {
        fromExclusiveM: number;
        toInclusiveM: number;
        status: "coverage_unknown";
      };
      proofLimit: string;
    };
  };
  snapshot: {
    id: string;
    sourceId: "openstreetmap" | "synthetic_fixture";
    sourceAsOf: string;
    retrievedAt: string;
    acquisitionReceiptId: string;
    rightsStatus: "cleared_for_experiment";
    coverageStatus: "measured_partial";
    completeCoverageRadiusM: number;
    outerEvaluationRadiusM: number;
    outerBandStatus: "coverage_unknown";
    contextGeometryBasis: "osm_node_or_source_receipt_center" | "synthetic_point";
    limitations: string[];
  };
  objects: LivePointSnapshotObject[];
  contextFeatures: LivePointSnapshotContextFeature[];
  categorySummaries: Array<{
    category: LivePointContextCategory;
    observedCount: number;
    status: "observed_in_source_snapshot" | "not_observed_in_source_snapshot";
    proofLimit: string;
  }>;
  objectCount: number;
  contextFeatureCount: number;
  tagMinimization: {
    allowlist: string[];
    rawTagValueCount: number;
    retainedTagValueCount: number;
    excludedTagValueCount: number;
    excludedTagKeyCount: number;
    excludedTagKeysHash: string;
  };
}

export interface LivePointSnapshotObject {
  id: string;
  geometryId: string;
  sourceId: string;
  sourceNamespace: "OpenStreetMap" | "SyntheticFixture";
  caseIds: string[];
  roles: string[];
  entityType: LivePointEntityType;
  displayName: string | null;
  sourceTags: Record<string, string>;
  geometry: GeoJsonGeometry;
  geometryHash: string;
  retrievedAt: string;
  sourceAsOf: string;
  authorityStatus: "open_context_not_official";
  limitations: string[];
}

export interface LivePointSnapshotContextFeature {
  id: string;
  sourceId: string;
  elementType: "node" | "way" | "relation" | "synthetic";
  category: LivePointContextCategory;
  displayName: string | null;
  geometry: Extract<GeoJsonGeometry, { type: "Point" }>;
  geometryBasis: "osm_node" | "source_receipt_center" | "synthetic_point";
  sourceTags: Record<string, string>;
  sourceAsOf: string;
  retrievedAt: string;
  distanceFromCenterM: number;
  sourceCoverageBand: "inner_measured" | "outer_partial";
  featureHash: string;
  authorityStatus: "open_context_not_official";
  rightsStatus: "cleared_for_experiment";
  limitations: string[];
}

export interface LivePointManifest {
  schemaVersion: "point-to-object-manifest-v1";
  manifestId: "point-to-object-open-context-manifest-v1" | "point-to-object-synthetic-manifest-v1";
  generatedAt: string;
  status: "data_package_verified" | "synthetic_non_runtime_fixture";
  routeGates: {
    checks: { aoi: boolean; hash: boolean; gold: boolean; rights: boolean };
    evidenceChecks: {
      aoiFrozen: boolean;
      bundleHashVerified: boolean;
      goldFixtureArtifactVerified: boolean;
      goldObjectIdsVerified: boolean;
      pointOnlyNegativeFixtureVerified: boolean;
      rightsCleared: boolean;
    };
    allDataGatesVerified: boolean;
    productionAllowed: false;
  };
  rightsGate: {
    status: "cleared_for_experiment";
    allowedOperations: string[];
    prohibitedClaims: string[];
  };
  bundle: {
    path: string;
    sha256: string;
    semanticHash: string;
    byteSize: number;
    casePackCount: number;
    objectCount: number;
    contextFeatureCount: number;
  };
  sourceReceipts: LivePointManifestSourceReceipt[];
  termsReceipt: {
    id: string;
    sourceId: "openstreetmap" | "synthetic_fixture";
    licenseId: "ODbL-1.0" | "Synthetic-Non-Runtime-1.0";
    licenseUrl: string;
    rightsStatus: "cleared_for_experiment";
    attribution: string;
    attributionUrl: string;
    allowedOperations: string[];
    prohibitedClaims: string[];
    reviewedAt?: string;
    scope?: string;
  };
  geometryReceipt: Record<string, unknown>;
  absenceSemanticsReceipt: {
    nonObservationStatus: "not_observed_in_source_snapshot";
    sourceCoverageStatus: "measured_partial";
    realWorldAbsenceProven: false;
    proofLimit: string;
  };
  warningVocabulary: string[];
  errorVocabulary: string[];
  replay: {
    command: string;
    scriptPath: string;
    scriptSha256: string;
    sourcePaths: string[];
    sourceSha256: string[];
    deterministic: true;
  };
  qualityGates: {
    aoi: LivePointQualityGate;
    hash: LivePointQualityGate;
    gold: LivePointQualityGate & {
      exactExpectedCases?: number;
      matchedCases?: number;
      falseConfidentIdentityCount?: number;
    };
    rights: LivePointQualityGate;
  };
  manifestHash: string;
}

export interface LivePointManifestSourceReceipt {
  id: string;
  kind: "acquisition";
  path: string;
  sha256: string;
  sourceAsOf: string;
  retrievedAt: string;
  sourceId: "openstreetmap" | "synthetic_fixture";
  queryRadiusM: number;
  normalizedRadiusM: number;
  httpStatus: number;
  elementCount: number;
}

export interface LivePointQualityGate {
  status: "pass" | "fail";
  [key: string]: unknown;
}
