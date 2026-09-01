import {
  LIVE_POINT_PROFILE_VERSION,
  LIVE_POINT_SCHEMA_ID,
  LIVE_POINT_SCENARIO_ID,
  type GeoJsonGeometry,
  type LivePointRequest
} from "./contracts";
import { semanticHash } from "./hash";
import type { LivePointSnapshotRepository } from "./repository-core";
import type {
  LivePointCasePack,
  LivePointManifest,
  LivePointManifestSourceReceipt,
  LivePointSnapshot,
  LivePointSnapshotContextFeature,
  LivePointSnapshotObject
} from "./snapshot-types";

const FIXED_AT = "2026-08-31T17:41:47.000Z";
const POINT = { longitude: 55.274376, latitude: 25.197197 } as const;

export interface SyntheticLivePointRepositoryOptions {
  objectCount?: number;
  includeContext?: boolean;
  rightsDecision?: "cleared" | "unknown" | "blocked";
}

function square(longitude: number, latitude: number, delta: number): Extract<GeoJsonGeometry, { type: "Polygon" }> {
  return {
    type: "Polygon",
    coordinates: [[
      [longitude - delta, latitude - delta],
      [longitude + delta, latitude - delta],
      [longitude + delta, latitude + delta],
      [longitude - delta, latitude + delta],
      [longitude - delta, latitude - delta]
    ]]
  };
}

function syntheticObjects(count: number): LivePointSnapshotObject[] {
  return Array.from({ length: count }, (_, index) => {
    const suffix = String(index + 1).padStart(3, "0");
    const geometry = square(POINT.longitude, POINT.latitude, 0.00025 + index * 0.000001);
    return {
      id: `synthetic-object-${suffix}`,
      geometryId: `synthetic-geometry-${suffix}`,
      sourceId: `synthetic/object-${suffix}`,
      sourceNamespace: "SyntheticFixture",
      caseIds: ["synthetic-case-pack"],
      roles: ["contract_fixture"],
      entityType: "building",
      displayName: `Synthetic object ${suffix}`,
      sourceTags: { building: "yes", name: `Synthetic object ${suffix}` },
      geometry,
      geometryHash: semanticHash(geometry),
      retrievedAt: FIXED_AT,
      sourceAsOf: FIXED_AT,
      authorityStatus: "open_context_not_official",
      limitations: ["Synthetic non-runtime contract fixture only."]
    };
  });
}

function syntheticContextFeatures(includeContext: boolean): LivePointSnapshotContextFeature[] {
  if (!includeContext) return [];
  const geometry = {
    type: "Point" as const,
    coordinates: [POINT.longitude + 0.001, POINT.latitude + 0.001] as [number, number]
  };
  const core = {
    sourceId: "synthetic/context-school-001",
    geometry,
    geometryBasis: "synthetic_point" as const,
    sourceTags: { fixture: "synthetic", category: "school" },
    sourceAsOf: FIXED_AT
  };
  return [{
    id: "synthetic-context-school-001",
    sourceId: core.sourceId,
    elementType: "synthetic",
    category: "school",
    displayName: "Synthetic school context",
    geometry,
    geometryBasis: core.geometryBasis,
    sourceTags: core.sourceTags,
    sourceAsOf: FIXED_AT,
    retrievedAt: FIXED_AT,
    distanceFromCenterM: 150,
    sourceCoverageBand: "inner_measured",
    featureHash: semanticHash(core),
    authorityStatus: "open_context_not_official",
    rightsStatus: "cleared_for_experiment",
    limitations: ["Synthetic non-runtime context fixture only."]
  }];
}

/** Pure dependency-injected fixture. It performs no file, network or provider I/O. */
export function createSyntheticLivePointRepository(
  options: SyntheticLivePointRepositoryOptions = {}
): LivePointSnapshotRepository {
  const objectCount = options.objectCount ?? 1;
  if (!Number.isInteger(objectCount) || objectCount < 0 || objectCount > 64) {
    throw new Error("Synthetic fixture objectCount must be an integer from 0 to 64.");
  }
  const objects = syntheticObjects(objectCount);
  const contextFeatures = syntheticContextFeatures(options.includeContext ?? true);
  const coverageGeometry = square(POINT.longitude, POINT.latitude, 0.02);
  const completeGeometry = square(POINT.longitude, POINT.latitude, 0.01);
  const casePack: LivePointCasePack = {
    id: "synthetic-case-pack",
    name: "Synthetic non-runtime contract case",
    locale: "en-AE",
    crs: "EPSG:4326",
    calculationCrs: "EPSG:32640",
    coverage: {
      id: "synthetic-coverage-v1",
      center: { ...POINT },
      radiusM: 1_500,
      bbox: [55.254376, 25.177197, 55.294376, 25.217197],
      geometry: coverageGeometry,
      geometryHash: semanticHash(coverageGeometry),
      completeness: {
        completeRadiusM: 1_000,
        completeBbox: [55.264376, 25.187197, 55.284376, 25.207197],
        completeGeometry,
        completeGeometryHash: semanticHash(completeGeometry),
        outerBand: { fromExclusiveM: 1_000, toInclusiveM: 1_500, status: "coverage_unknown" },
        proofLimit: "Synthetic fixture coverage is bounded and is not evidence of real-world completeness."
      }
    },
    snapshot: {
      id: "synthetic-snapshot-v1",
      sourceId: "synthetic_fixture",
      sourceAsOf: FIXED_AT,
      retrievedAt: FIXED_AT,
      acquisitionReceiptId: "synthetic-acquisition-v1",
      rightsStatus: "cleared_for_experiment",
      coverageStatus: "measured_partial",
      completeCoverageRadiusM: 1_000,
      outerEvaluationRadiusM: 1_500,
      outerBandStatus: "coverage_unknown",
      contextGeometryBasis: "synthetic_point",
      limitations: ["Synthetic non-runtime contract fixture only."]
    },
    objects,
    contextFeatures,
    categorySummaries: [{
      category: "school",
      observedCount: contextFeatures.length,
      status: contextFeatures.length > 0 ? "observed_in_source_snapshot" : "not_observed_in_source_snapshot",
      proofLimit: "Synthetic source records do not establish real-world presence or absence."
    }],
    objectCount: objects.length,
    contextFeatureCount: contextFeatures.length,
    tagMinimization: {
      allowlist: ["building", "name", "category"],
      rawTagValueCount: objects.length * 2 + contextFeatures.length * 2,
      retainedTagValueCount: objects.length * 2 + contextFeatures.length * 2,
      excludedTagValueCount: 0,
      excludedTagKeyCount: 0,
      excludedTagKeysHash: semanticHash([])
    }
  };
  const snapshotCore = {
    schemaVersion: "point-to-object-snapshot-v1" as const,
    manifestId: "point-to-object-synthetic-manifest-v1" as const,
    generatedAt: FIXED_AT,
    caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
    sourcePolicy: {
      runtimeSourceFamily: "synthetic_fixture" as const,
      rightsStatus: "cleared_for_experiment" as const,
      licenseId: "Synthetic-Non-Runtime-1.0" as const,
      licenseUrl: "urn:geoai:synthetic-non-runtime-fixture",
      attribution: "GeoAI synthetic non-runtime fixture",
      attributionUrl: "urn:geoai:synthetic-non-runtime-fixture",
      officialLiveStatus: "synthetic_non_runtime" as const
    },
    casePacks: [casePack]
  };
  const snapshot: LivePointSnapshot = {
    ...snapshotCore,
    bundleHash: semanticHash(snapshotCore)
  };
  const snapshotByteHash = semanticHash(snapshot);
  const sourceReceipt: LivePointManifestSourceReceipt = {
    id: "synthetic-acquisition-v1",
    kind: "acquisition",
    path: "injected://synthetic-non-runtime-fixture",
    sha256: semanticHash({ source: "synthetic_fixture", at: FIXED_AT }),
    sourceAsOf: FIXED_AT,
    retrievedAt: FIXED_AT,
    sourceId: "synthetic_fixture",
    queryRadiusM: 1_500,
    normalizedRadiusM: 1_500,
    httpStatus: 0,
    elementCount: objects.length + contextFeatures.length
  };
  const manifestCore = {
    schemaVersion: "point-to-object-manifest-v1" as const,
    manifestId: "point-to-object-synthetic-manifest-v1" as const,
    generatedAt: FIXED_AT,
    status: "synthetic_non_runtime_fixture" as const,
    routeGates: {
      checks: { aoi: false, hash: true, gold: false, rights: true },
      evidenceChecks: {
        aoiFrozen: false,
        bundleHashVerified: true,
        goldFixtureArtifactVerified: false,
        goldObjectIdsVerified: false,
        pointOnlyNegativeFixtureVerified: true,
        rightsCleared: true
      },
      allDataGatesVerified: false,
      productionAllowed: false as const
    },
    rightsGate: {
      status: "cleared_for_experiment" as const,
      allowedOperations: ["resolve_entity", "get_context", "get_evidence_bundle"],
      prohibitedClaims: ["official_identity", "cadastral", "zoning", "planning", "valuation"]
    },
    bundle: {
      path: "injected://synthetic-non-runtime-fixture",
      sha256: snapshotByteHash,
      semanticHash: semanticHash(snapshot),
      byteSize: Buffer.byteLength(JSON.stringify(snapshot), "utf8"),
      casePackCount: 1,
      objectCount: objects.length,
      contextFeatureCount: contextFeatures.length
    },
    sourceReceipts: [sourceReceipt],
    termsReceipt: {
      id: "synthetic-terms-v1",
      sourceId: "synthetic_fixture" as const,
      licenseId: "Synthetic-Non-Runtime-1.0" as const,
      licenseUrl: "urn:geoai:synthetic-non-runtime-fixture",
      rightsStatus: "cleared_for_experiment" as const,
      attribution: "GeoAI synthetic non-runtime fixture",
      attributionUrl: "urn:geoai:synthetic-non-runtime-fixture",
      allowedOperations: ["resolve_entity", "get_context", "get_evidence_bundle"],
      prohibitedClaims: ["official_identity", "cadastral", "zoning", "planning", "valuation"]
    },
    geometryReceipt: { geometryVersion: "geojson-wgs84-v1", synthetic: true },
    absenceSemanticsReceipt: {
      nonObservationStatus: "not_observed_in_source_snapshot" as const,
      sourceCoverageStatus: "measured_partial" as const,
      realWorldAbsenceProven: false as const,
      proofLimit: "Synthetic source non-observation is never proof of real-world absence."
    },
    warningVocabulary: [],
    errorVocabulary: [],
    replay: {
      command: "not_applicable_injected_fixture",
      scriptPath: "src/lib/point-to-object/synthetic-repository.ts",
      scriptSha256: semanticHash("synthetic-repository-v1"),
      sourcePaths: [],
      sourceSha256: [],
      deterministic: true as const
    },
    qualityGates: {
      aoi: { status: "fail" as const, reason: "synthetic_non_runtime" },
      hash: { status: "pass" as const },
      gold: { status: "fail" as const, reason: "not_real_data" },
      rights: { status: "pass" as const, scope: "synthetic_fixture_only" }
    }
  };
  const manifest: LivePointManifest = {
    ...manifestCore,
    manifestHash: semanticHash(manifestCore)
  };
  const rightsDecision = options.rightsDecision ?? "cleared";
  return {
    coverageRegistryGeneratedAt: FIXED_AT,
    fixtureAuthority: "synthetic_non_runtime",
    rightsDecision: {
      state: rightsDecision,
      sourceStatus: rightsDecision === "cleared" ? "cleared_for_experiment" : rightsDecision
    },
    snapshot,
    manifest,
    snapshotByteHash,
    snapshotSemanticHash: semanticHash(snapshot),
    manifestSemanticHash: semanticHash(manifest),
    casePacksById: new Map([[casePack.id, casePack]]),
    objectsById: new Map(objects.map((object) => [object.id, object])),
    objectsByGeometryId: new Map(objects.map((object) => [object.geometryId, object])),
    sourceReceiptsById: new Map([[sourceReceipt.id, sourceReceipt]])
  };
}

export function createSyntheticLivePointRequest(
  overrides: Partial<LivePointRequest> = {}
): LivePointRequest {
  return {
    schema_id: LIVE_POINT_SCHEMA_ID,
    profile_version: LIVE_POINT_PROFILE_VERSION,
    scenario_id: LIVE_POINT_SCENARIO_ID,
    operation: "get_evidence_bundle",
    input: {
      kind: "point",
      clicked_point: {
        ...POINT,
        crs: "EPSG:4326",
        coordinate_order_confirmed: true
      }
    },
    selection_intent: "general_object",
    candidate_assertion: null,
    requested_categories: ["school", "hospital"],
    context_radius_m: 450,
    locale: "en-AE",
    analysis_lens: "open_context_summary",
    anchors: null,
    ...overrides
  };
}
