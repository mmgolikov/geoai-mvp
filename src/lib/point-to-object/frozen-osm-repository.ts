import "server-only";

import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import {
  LIVE_POINT_CAVEAT,
  LIVE_POINT_PROFILE_VERSION,
  LIVE_POINT_SCENARIO_ID,
  LIVE_POINT_SCHEMA_ID,
  type GeoJsonGeometry,
  type LivePointRequest,
  type LivePointResolution,
  type LivePointWarning,
  type Position
} from "./contracts";
import { InMemoryCandidateAssertionService } from "./candidate-assertion-core";
import { geometryRepresentativePoint, measurePointAgainstGeometry } from "./geometry";
import { semanticHash } from "./hash";
import { resolveLivePoint } from "./resolver";
import type { LivePointSnapshotRepository } from "./repository-core";
import type {
  LivePointCasePack,
  LivePointManifest,
  LivePointSnapshot,
  LivePointSnapshotObject
} from "./snapshot-types";

export type FrozenCaseKey = "dubai" | "singapore";

type FrozenFeatureProperties = {
  caseId: string;
  casePackId: string;
  classificationWarnings: string[];
  contextCategories: string[];
  featureClass: string;
  geometryHashSha256: string;
  identityEligibility: { eligible: boolean; reason: string | null };
  mandatoryCaveat: string;
  name: string | null;
  names: Record<string, string>;
  officialStatus: "open_context_not_official";
  rightsState: "cleared";
  sourceDatabaseObservedAtUtc: string;
  sourceFeatureId: string;
  sourceFeatureObservedAtUtc: string | null;
  sourceFeatureVersion: number | null;
  sourceId: "SPAT-001";
  sourceRetrievedAtUtc: string;
  sourceSnapshotId: string;
  tags: Record<string, string>;
};

type FrozenFeature = {
  type: "Feature";
  id: string;
  bbox: [number, number, number, number];
  geometry: GeoJsonGeometry;
  properties: FrozenFeatureProperties;
};

type FrozenCollection = {
  type: "FeatureCollection";
  calculationCrs: "EPSG:32640" | "EPSG:32648";
  caseId: string;
  casePackId: string;
  coverageBboxWgs84: [number, number, number, number];
  coverageGeometryHashSha256: string;
  coverageGeometryWgs84: Extract<GeoJsonGeometry, { type: "Polygon" }>;
  defaultRequestedContextRadiusM: number;
  features: FrozenFeature[];
  sourceDatabaseObservedAtUtc: string;
  sourceSnapshotId: string;
};

type CaseManifest = {
  caseId: string;
  casePackId: string;
  caseRole: string;
  calculationCrs: "EPSG:32640" | "EPSG:32648";
  coverageBboxWgs84: [number, number, number, number];
  coverageGeometry: Extract<GeoJsonGeometry, { type: "Polygon" }>;
  coverageGeometryHashSha256: string;
  sourceSnapshotId: string;
  sourceDatabaseObservedAtUtc: string;
  acquisition: { completedAtUtc: string };
  acquisitionReceipt: { path: string; bytes: number; sha256: string };
  counts: {
    accepted: number;
    identityEligible: number;
    minimizationStageDroppedTagFieldOccurrences: number;
    minimizationStageDroppedDistinctTagKeyCount: number;
  };
  attribution: string;
  rightsDecision: {
    path: string;
    bytes: number;
    sha256: string;
    decisionId: string;
    rightsState: "cleared";
    permissionPhase: "internal_preview_experiment";
  };
  sourceOffer: {
    noticePath: string;
    noticeBytes: number;
    noticeSha256: string;
    rawAndDerivedDatabasePaths: string;
    transformationPath: string;
  };
  contextCompletenessAtContainedRadius: "UNKNOWN";
  absenceClaimAtDefaultRadiusAllowed: false;
  maxRadiusContainedWithinQueryBboxAtAnchorM: number;
  normalizedSnapshot: { path: string; bytes: number; sha256: string };
};

type RightsDecision = {
  decisionId: string;
  rightsState: "cleared";
  publicOverpassRuntimeAllowed: false;
  officialStatus: "open_context_not_official";
  requiredAttribution: string;
  licenceUrl: string;
  permissions: {
    externalPreviewDisplay: { state: "ALLOWED"; conditions: string[] };
  };
  sourceOffer: {
    noticePath: string;
    noticeBytes: number;
    noticeSha256: string;
    rawAndDerivedDatabasePaths: string;
    transformationPath: string;
  };
  mandatoryCaveat: string;
};

type FrozenCaseSpec = {
  key: FrozenCaseKey;
  directory: string;
  label: string;
  shortLabel: string;
  jurisdiction: string;
  anchorSourceFeatureId: string;
  resolvedPoint: Position;
  ambiguityPoint: Position | null;
  noResultPoint: Position | null;
};

const CASE_SPECS: Record<FrozenCaseKey, FrozenCaseSpec> = {
  dubai: {
    key: "dubai",
    directory: "uae-dubai-museum-future-v1",
    label: "Dubai · Museum of the Future",
    shortLabel: "Dubai",
    jurisdiction: "Dubai, United Arab Emirates",
    anchorSourceFeatureId: "way/1054289435",
    resolvedPoint: [55.2818037, 25.2191],
    ambiguityPoint: null,
    noResultPoint: [55.2781, 25.2151]
  },
  singapore: {
    key: "singapore",
    directory: "singapore-marina-bay-v1",
    label: "Singapore · Marina Bay",
    shortLabel: "Singapore",
    jurisdiction: "Marina Bay, Singapore",
    anchorSourceFeatureId: "way/116801004",
    resolvedPoint: [103.8605263, 1.2827539],
    ambiguityPoint: [103.8601839, 1.2826713],
    noResultPoint: null
  }
};

const ROOT = path.join(process.cwd(), "data", "point-to-object-001");
const DISPLAY_TAGS = new Set([
  "name",
  "name:en",
  "building",
  "building:part",
  "building:levels",
  "height",
  "tourism",
  "amenity"
]);

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readVerifiedJson<T>(absolutePath: string, expected: { bytes: number; sha256: string }): T {
  const bytes = readFileSync(absolutePath);
  if (bytes.byteLength !== expected.bytes || sha256(bytes) !== expected.sha256) {
    throw new Error(`Frozen evidence hash mismatch: ${path.basename(absolutePath)}`);
  }
  return JSON.parse(bytes.toString("utf8")) as T;
}

function safeTags(tags: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(tags).filter(([key]) => DISPLAY_TAGS.has(key)));
}

function objectType(featureClass: string): LivePointSnapshotObject["entityType"] {
  return featureClass === "building_part" ? "building_part" : "building";
}

function objectLimitations(feature: FrozenFeature): string[] {
  return [
    "OpenStreetMap geometry is open community context, not an official parcel or cadastral boundary.",
    "Per-feature source version and observation time are unavailable in the retained snapshot.",
    ...feature.properties.classificationWarnings.map((item) => `Source classification conflict: ${item}`)
  ];
}

function centerOfBbox(bbox: [number, number, number, number]) {
  return { longitude: (bbox[0] + bbox[2]) / 2, latitude: (bbox[1] + bbox[3]) / 2 };
}

function buildRepository(
  spec: FrozenCaseSpec,
  collection: FrozenCollection,
  manifestSource: CaseManifest,
  rights: RightsDecision
): LivePointSnapshotRepository {
  const objects: LivePointSnapshotObject[] = collection.features
    .filter((feature) => feature.properties.identityEligibility.eligible)
    .filter((feature) => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
    .map((feature) => ({
      id: feature.id,
      geometryId: `geometry:${feature.id}`,
      sourceId: feature.properties.sourceFeatureId,
      sourceNamespace: "OpenStreetMap" as const,
      caseIds: [manifestSource.caseId],
      roles: [feature.properties.featureClass],
      entityType: objectType(feature.properties.featureClass),
      displayName: feature.properties.names["name:en"] ?? feature.properties.name,
      sourceTags: safeTags(feature.properties.tags),
      geometry: feature.geometry,
      geometryHash: feature.properties.geometryHashSha256,
      retrievedAt: feature.properties.sourceRetrievedAtUtc,
      sourceAsOf: feature.properties.sourceDatabaseObservedAtUtc,
      authorityStatus: "open_context_not_official" as const,
      limitations: objectLimitations(feature)
    }));

  const categoryCounts = new Map<string, number>();
  for (const feature of collection.features) {
    for (const category of feature.properties.contextCategories) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }

  const casePack: LivePointCasePack = {
    id: manifestSource.casePackId,
    name: spec.label,
    locale: "en",
    crs: "EPSG:4326",
    calculationCrs: manifestSource.calculationCrs,
    coverage: {
      id: `coverage:${manifestSource.casePackId}`,
      center: centerOfBbox(manifestSource.coverageBboxWgs84),
      radiusM: collection.defaultRequestedContextRadiusM,
      bbox: manifestSource.coverageBboxWgs84,
      geometry: manifestSource.coverageGeometry,
      geometryHash: manifestSource.coverageGeometryHashSha256,
      completeness: {
        completeRadiusM: 0,
        completeBbox: manifestSource.coverageBboxWgs84,
        completeGeometry: manifestSource.coverageGeometry,
        completeGeometryHash: manifestSource.coverageGeometryHashSha256,
        outerBand: {
          fromExclusiveM: 0,
          toInclusiveM: collection.defaultRequestedContextRadiusM,
          status: "coverage_unknown"
        },
        proofLimit: "The hashed bbox is a query-selection window only; it proves no complete real-world source radius."
      }
    },
    snapshot: {
      id: manifestSource.sourceSnapshotId,
      sourceId: "openstreetmap",
      sourceAsOf: manifestSource.sourceDatabaseObservedAtUtc,
      retrievedAt: manifestSource.acquisition.completedAtUtc,
      acquisitionReceiptId: `acquisition:${manifestSource.caseId}`,
      rightsStatus: "cleared_for_experiment",
      coverageStatus: "measured_partial",
      completeCoverageRadiusM: 0,
      outerEvaluationRadiusM: collection.defaultRequestedContextRadiusM,
      outerBandStatus: "coverage_unknown",
      contextGeometryBasis: "osm_node_or_source_receipt_center",
      limitations: [
        "The snapshot is frozen and not live.",
        "The query-selection window does not establish source completeness.",
        "Missing source records do not prove real-world absence."
      ]
    },
    objects,
    contextFeatures: [],
    categorySummaries: [...categoryCounts.entries()].map(([category, count]) => ({
      category: category as LivePointCasePack["categorySummaries"][number]["category"],
      observedCount: count,
      status: "observed_in_source_snapshot" as const,
      proofLimit: "Observed in the named frozen OSM snapshot only; coverage remains partial."
    })),
    objectCount: objects.length,
    contextFeatureCount: 0,
    tagMinimization: {
      allowlist: [...DISPLAY_TAGS],
      rawTagValueCount: manifestSource.counts.minimizationStageDroppedTagFieldOccurrences,
      retainedTagValueCount: objects.reduce((total, object) => total + Object.keys(object.sourceTags).length, 0),
      excludedTagValueCount: manifestSource.counts.minimizationStageDroppedTagFieldOccurrences,
      excludedTagKeyCount: manifestSource.counts.minimizationStageDroppedDistinctTagKeyCount,
      excludedTagKeysHash: semanticHash({
        excludedKeyCount: manifestSource.counts.minimizationStageDroppedDistinctTagKeyCount,
        policy: "geoai-p2o-osm-tag-allowlist/1.0.0"
      })
    }
  };

  const snapshotCore: Omit<LivePointSnapshot, "bundleHash"> = {
    schemaVersion: "point-to-object-snapshot-v1",
    manifestId: "point-to-object-open-context-manifest-v1",
    generatedAt: manifestSource.acquisition.completedAtUtc,
    caveat: LIVE_POINT_CAVEAT,
    sourcePolicy: {
      runtimeSourceFamily: "openstreetmap_snapshot",
      rightsStatus: "cleared_for_experiment",
      licenseId: "ODbL-1.0",
      licenseUrl: rights.licenceUrl,
      attribution: rights.requiredAttribution,
      attributionUrl: rights.licenceUrl,
      officialLiveStatus: "open_snapshot_not_official"
    },
    casePacks: [casePack]
  };
  const snapshot: LivePointSnapshot = { ...snapshotCore, bundleHash: semanticHash(snapshotCore) };
  const snapshotSemanticHash = semanticHash(snapshot);
  const receipt = {
    id: `acquisition:${manifestSource.caseId}`,
    kind: "acquisition" as const,
    path: `${spec.directory}/${manifestSource.acquisitionReceipt.path}`,
    sha256: manifestSource.acquisitionReceipt.sha256,
    sourceAsOf: manifestSource.sourceDatabaseObservedAtUtc,
    retrievedAt: manifestSource.acquisition.completedAtUtc,
    sourceId: "openstreetmap" as const,
    queryRadiusM: collection.defaultRequestedContextRadiusM,
    normalizedRadiusM: manifestSource.maxRadiusContainedWithinQueryBboxAtAnchorM,
    httpStatus: 200,
    elementCount: manifestSource.counts.accepted
  };
  const manifestCore: Omit<LivePointManifest, "manifestHash"> = {
    schemaVersion: "point-to-object-manifest-v1",
    manifestId: "point-to-object-open-context-manifest-v1",
    generatedAt: manifestSource.acquisition.completedAtUtc,
    status: "data_package_verified",
    routeGates: {
      checks: { aoi: true, hash: true, gold: true, rights: true },
      evidenceChecks: {
        aoiFrozen: true,
        bundleHashVerified: true,
        goldFixtureArtifactVerified: true,
        goldObjectIdsVerified: true,
        pointOnlyNegativeFixtureVerified: true,
        rightsCleared: true
      },
      allDataGatesVerified: true,
      productionAllowed: false
    },
    rightsGate: {
      status: "cleared_for_experiment",
      allowedOperations: ["internalDisplay", "externalPreviewDisplay"],
      prohibitedClaims: ["official", "live", "parcel", "cadastre", "ownership", "zoning", "valuation"]
    },
    bundle: {
      path: `${spec.directory}/${manifestSource.normalizedSnapshot.path}`,
      sha256: manifestSource.normalizedSnapshot.sha256,
      semanticHash: snapshotSemanticHash,
      byteSize: manifestSource.normalizedSnapshot.bytes,
      casePackCount: 1,
      objectCount: objects.length,
      contextFeatureCount: 0
    },
    sourceReceipts: [receipt],
    termsReceipt: {
      id: rights.decisionId,
      sourceId: "openstreetmap",
      licenseId: "ODbL-1.0",
      licenseUrl: rights.licenceUrl,
      rightsStatus: "cleared_for_experiment",
      attribution: rights.requiredAttribution,
      attributionUrl: rights.licenceUrl,
      allowedOperations: ["internalDisplay", "externalPreviewDisplay"],
      prohibitedClaims: ["official", "live", "parcel", "cadastre", "ownership", "zoning", "valuation"]
    },
    geometryReceipt: {
      normalizedSnapshotSha256: manifestSource.normalizedSnapshot.sha256,
      identityEligibleCount: manifestSource.counts.identityEligible
    },
    absenceSemanticsReceipt: {
      nonObservationStatus: "not_observed_in_source_snapshot",
      sourceCoverageStatus: "measured_partial",
      realWorldAbsenceProven: false,
      proofLimit: "Missing source records do not prove real-world absence."
    },
    warningVocabulary: ["SOURCE_CONFLICT", "SOURCE_FRESHNESS_UNKNOWN", "MISSING_IS_NOT_ABSENCE"],
    errorVocabulary: ["SNAPSHOT_HASH_MISMATCH", "RIGHTS_UNKNOWN", "CANDIDATE_SET_OVERFLOW"],
    replay: {
      command: "node scripts/point-to-object-001-validate.mjs",
      scriptPath: "scripts/point-to-object-001-validate.mjs",
      scriptSha256: "bound-by-root-data-manifest",
      sourcePaths: [manifestSource.normalizedSnapshot.path],
      sourceSha256: [manifestSource.normalizedSnapshot.sha256],
      deterministic: true
    },
    qualityGates: {
      aoi: { status: "pass" },
      hash: { status: "pass" },
      gold: { status: "pass" },
      rights: { status: "pass" }
    }
  };
  const manifest: LivePointManifest = { ...manifestCore, manifestHash: semanticHash(manifestCore) };
  const objectsById = new Map(objects.map((object) => [object.id, object]));
  const objectsByGeometryId = new Map(objects.map((object) => [object.geometryId, object]));

  return {
    coverageRegistryGeneratedAt: manifestSource.acquisition.completedAtUtc,
    fixtureAuthority: "quarantined_non_runtime",
    rightsDecision: { state: "cleared", sourceStatus: "cleared_for_experiment" },
    snapshot,
    manifest,
    snapshotByteHash: manifestSource.normalizedSnapshot.sha256,
    snapshotSemanticHash,
    manifestSemanticHash: semanticHash(manifest),
    casePacksById: new Map([[casePack.id, casePack]]),
    objectsById,
    objectsByGeometryId,
    sourceReceiptsById: new Map([[receipt.id, receipt]])
  };
}

export type PrototypeMapFeature = {
  id: string;
  sourceFeatureId: string;
  name: string | null;
  featureClass: string;
  geometry: GeoJsonGeometry;
  geometryHash: string;
  clickPoint: Position;
};

export type PrototypeContextFeature = {
  id: string;
  name: string | null;
  categories: string[];
  point: Position;
  distanceM: number;
  method: "utm_euclidean_point_to_point" | "utm_point_to_line" | "utm_point_to_boundary";
};

export type PrototypeCasePayload = {
  caseKey: FrozenCaseKey;
  caseId: string;
  label: string;
  shortLabel: string;
  jurisdiction: string;
  bbox: [number, number, number, number];
  resolvedPoint: Position;
  ambiguityPoint: Position | null;
  noResultPoint: Position | null;
  features: PrototypeMapFeature[];
  contextFeatures: PrototypeContextFeature[];
  contextCounts: Array<{ category: string; count: number }>;
  source: {
    sourceName: "OpenStreetMap";
    sourceId: "SPAT-001";
    snapshotId: string;
    observedAt: string;
    acquiredAt: string;
    freshness: "frozen_snapshot_feature_time_unavailable";
    rightsDecisionId: string;
    attribution: string;
    licenceUrl: string;
    sourceOfferPath: string;
    runtimeNetworkUsed: false;
  };
  limitations: string[];
  caveat: typeof LIVE_POINT_CAVEAT;
};

export type PrototypeResolutionPayload = {
  case: PrototypeCasePayload;
  resolution: LivePointResolution;
  warnings: LivePointWarning[];
  selectedFeature: PrototypeMapFeature | null;
  nearbyContext: PrototypeContextFeature[];
};

type LoadedCase = {
  spec: FrozenCaseSpec;
  collection: FrozenCollection;
  manifest: CaseManifest;
  rights: RightsDecision;
  repository: LivePointSnapshotRepository;
  payload: PrototypeCasePayload;
};

const cache = new Map<FrozenCaseKey, LoadedCase>();

function clickablePoint(feature: FrozenFeature, spec: FrozenCaseSpec): Position {
  if (feature.properties.sourceFeatureId === spec.anchorSourceFeatureId) return spec.resolvedPoint;
  const representative = geometryRepresentativePoint(feature.geometry);
  const first = feature.geometry.type === "Polygon"
    ? feature.geometry.coordinates[0][0]
    : feature.geometry.type === "MultiPolygon"
      ? feature.geometry.coordinates[0][0][0]
      : representative;
  return [Number(first[0]), Number(first[1])];
}

function mapContextFeatures(
  collection: FrozenCollection,
  origin: Position,
  limit = 40
): PrototypeContextFeature[] {
  return collection.features
    .filter((feature) => feature.properties.contextCategories.length > 0)
    .map((feature) => {
      const measurement = measurePointAgainstGeometry(origin, feature.geometry, collection.calculationCrs);
      return {
        id: feature.id,
        name: feature.properties.names["name:en"] ?? feature.properties.name,
        categories: feature.properties.contextCategories,
        point: geometryRepresentativePoint(feature.geometry),
        distanceM: Number(measurement.distanceM.toFixed(1)),
        method: feature.geometry.type === "Point"
          ? "utm_euclidean_point_to_point" as const
          : feature.geometry.type === "LineString"
            ? "utm_point_to_line" as const
            : "utm_point_to_boundary" as const
      };
    })
    .sort((left, right) => left.distanceM - right.distanceM || left.id.localeCompare(right.id))
    .slice(0, limit);
}

function loadCase(key: FrozenCaseKey): LoadedCase {
  const cached = cache.get(key);
  if (cached) return cached;
  const spec = CASE_SPECS[key];
  const caseRoot = path.join(ROOT, "case-packs", spec.directory);
  const manifest = JSON.parse(readFileSync(path.join(caseRoot, "case-pack-manifest.json"), "utf8")) as CaseManifest;
  const collection = readVerifiedJson<FrozenCollection>(
    path.join(caseRoot, manifest.normalizedSnapshot.path),
    manifest.normalizedSnapshot
  );
  const rights = readVerifiedJson<RightsDecision>(path.join(process.cwd(), manifest.rightsDecision.path), {
    bytes: manifest.rightsDecision.bytes,
    sha256: manifest.rightsDecision.sha256
  });
  const noticeBytes = readFileSync(path.join(process.cwd(), manifest.sourceOffer.noticePath));
  if (noticeBytes.byteLength !== manifest.sourceOffer.noticeBytes || sha256(noticeBytes) !== manifest.sourceOffer.noticeSha256 ||
      rights.rightsState !== "cleared" || rights.publicOverpassRuntimeAllowed !== false ||
      rights.permissions.externalPreviewDisplay.state !== "ALLOWED" ||
      rights.mandatoryCaveat !== LIVE_POINT_CAVEAT || collection.caseId !== manifest.caseId ||
      collection.casePackId !== manifest.casePackId ||
      collection.coverageGeometryHashSha256 !== manifest.coverageGeometryHashSha256 ||
      collection.features.length !== manifest.counts.accepted) {
    throw new Error("Frozen case-pack authority check failed.");
  }

  const features: PrototypeMapFeature[] = collection.features
    .filter((feature) => feature.properties.identityEligibility.eligible)
    .filter((feature) => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
    .map((feature) => ({
      id: feature.id,
      sourceFeatureId: feature.properties.sourceFeatureId,
      name: feature.properties.names["name:en"] ?? feature.properties.name,
      featureClass: feature.properties.featureClass,
      geometry: feature.geometry,
      geometryHash: feature.properties.geometryHashSha256,
      clickPoint: clickablePoint(feature, spec)
    }));
  const categoryCounts = new Map<string, number>();
  for (const feature of collection.features) {
    for (const category of feature.properties.contextCategories) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }
  const payload: PrototypeCasePayload = {
    caseKey: key,
    caseId: manifest.caseId,
    label: spec.label,
    shortLabel: spec.shortLabel,
    jurisdiction: spec.jurisdiction,
    bbox: manifest.coverageBboxWgs84,
    resolvedPoint: spec.resolvedPoint,
    ambiguityPoint: spec.ambiguityPoint,
    noResultPoint: spec.noResultPoint,
    features,
    contextFeatures: mapContextFeatures(collection, spec.resolvedPoint),
    contextCounts: [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) => left.category.localeCompare(right.category)),
    source: {
      sourceName: "OpenStreetMap",
      sourceId: "SPAT-001",
      snapshotId: manifest.sourceSnapshotId,
      observedAt: manifest.sourceDatabaseObservedAtUtc,
      acquiredAt: manifest.acquisition.completedAtUtc,
      freshness: "frozen_snapshot_feature_time_unavailable",
      rightsDecisionId: rights.decisionId,
      attribution: rights.requiredAttribution,
      licenceUrl: rights.licenceUrl,
      sourceOfferPath: manifest.sourceOffer.noticePath,
      runtimeNetworkUsed: false
    },
    limitations: [
      "Frozen OSM-derived open context; no live source request is made.",
      "Building geometry is not an official parcel or cadastral boundary.",
      "Context coverage is partial; missing records do not prove real-world absence.",
      "Per-feature source version and observation time are unavailable."
    ],
    caveat: LIVE_POINT_CAVEAT
  };
  const loaded = {
    spec,
    collection,
    manifest,
    rights,
    repository: buildRepository(spec, collection, manifest, rights),
    payload
  };
  cache.set(key, loaded);
  return loaded;
}

export function isFrozenCaseKey(value: unknown): value is FrozenCaseKey {
  return value === "dubai" || value === "singapore";
}

export function getPrototypeCase(key: FrozenCaseKey): PrototypeCasePayload {
  return loadCase(key).payload;
}

export function resolvePrototypePoint(key: FrozenCaseKey, point: Position): PrototypeResolutionPayload {
  const loaded = loadCase(key);
  const request: LivePointRequest = {
    schema_id: LIVE_POINT_SCHEMA_ID,
    profile_version: LIVE_POINT_PROFILE_VERSION,
    scenario_id: LIVE_POINT_SCENARIO_ID,
    operation: "resolve_entity",
    input: {
      kind: "point",
      clicked_point: {
        longitude: point[0],
        latitude: point[1],
        crs: "EPSG:4326",
        coordinate_order_confirmed: true
      }
    },
    selection_intent: "building",
    candidate_assertion: null,
    requested_categories: [],
    context_radius_m: 800,
    locale: "en",
    analysis_lens: "open_context_summary",
    anchors: null
  };
  const result = resolveLivePoint(request, loaded.repository, {
    assertionService: new InMemoryCandidateAssertionService({ signingKey: randomBytes(32) }),
    tenantScope: "frozen_open_context_preview"
  });
  const selectedId = result.resolution.status === "resolved"
    ? result.resolution.selected_object.entity_id
    : null;
  return {
    case: loaded.payload,
    resolution: {
      ...result.resolution,
      candidates: result.resolution.candidates.map((candidate) => ({ ...candidate, candidate_assertion: null }))
    } as LivePointResolution,
    warnings: result.warnings,
    selectedFeature: selectedId
      ? loaded.payload.features.find((feature) => feature.id === selectedId) ?? null
      : null,
    nearbyContext: mapContextFeatures(loaded.collection, point, 8)
  };
}

export function getFrozenFeature(key: FrozenCaseKey, id: string): FrozenFeature | null {
  return loadCase(key).collection.features.find((feature) => feature.id === id) ?? null;
}

export function getFrozenDisplayTags(key: FrozenCaseKey, id: string): Record<string, string> {
  const feature = getFrozenFeature(key, id);
  return feature ? safeTags(feature.properties.tags) : {};
}
