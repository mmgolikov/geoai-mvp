import { LIVE_POINT_CAPS, LIVE_POINT_CAVEAT, type SnapshotAnchor } from "./contracts";
import { LivePointCoreError } from "./errors";
import type {
  LivePointCasePack,
  LivePointManifest,
  LivePointManifestSourceReceipt,
  LivePointSnapshot,
  LivePointSnapshotObject
} from "./snapshot-types";
import { semanticHash } from "./hash";

/** Pure injected repository shape. It performs no I/O and carries no runtime activation authority. */
export interface LivePointSnapshotRepository {
  coverageRegistryGeneratedAt: string;
  fixtureAuthority: "synthetic_non_runtime" | "quarantined_non_runtime";
  rightsDecision: {
    state: "cleared" | "unknown" | "blocked";
    sourceStatus: "cleared_for_experiment" | "unknown" | "blocked";
  };
  snapshot: LivePointSnapshot;
  manifest: LivePointManifest;
  snapshotByteHash: string;
  snapshotSemanticHash: string;
  manifestSemanticHash: string;
  casePacksById: ReadonlyMap<string, LivePointCasePack>;
  objectsById: ReadonlyMap<string, LivePointSnapshotObject>;
  objectsByGeometryId: ReadonlyMap<string, LivePointSnapshotObject>;
  sourceReceiptsById: ReadonlyMap<string, LivePointManifestSourceReceipt>;
}

export type SyntheticRepository = LivePointSnapshotRepository & {
  fixtureAuthority: "synthetic_non_runtime";
};

export type AuthorizedSyntheticRepository = SyntheticRepository & {
  rightsDecision: { state: "cleared"; sourceStatus: "cleared_for_experiment" };
};

export function assertE1CoverageRegistryAuthority(
  repository: LivePointSnapshotRepository
): asserts repository is SyntheticRepository {
  if (repository.fixtureAuthority !== "synthetic_non_runtime") {
    throw new LivePointCoreError(
      "PREVIEW_DISABLED",
      "The current Main gate accepts only explicitly injected synthetic non-runtime fixtures."
    );
  }

  const isSyntheticRegistry =
    repository.snapshot.manifestId === "point-to-object-synthetic-manifest-v1" &&
    repository.manifest.manifestId === "point-to-object-synthetic-manifest-v1" &&
    repository.manifest.status === "synthetic_non_runtime_fixture";
  if (!isSyntheticRegistry) {
    throw new LivePointCoreError(
      "PREVIEW_DISABLED",
      "The injected coverage registry is not an explicitly synthetic non-runtime fixture."
    );
  }

  if (repository.snapshot.casePacks.length === 0 || repository.casePacksById.size === 0) {
    throw new LivePointCoreError("SNAPSHOT_MISSING", "The synthetic fixture has no controlled coverage case pack.");
  }

  for (const casePack of repository.snapshot.casePacks) {
    if (repository.casePacksById.get(casePack.id) !== casePack ||
        semanticHash(casePack.coverage.geometry) !== casePack.coverage.geometryHash ||
        semanticHash(casePack.coverage.completeness.completeGeometry) !==
          casePack.coverage.completeness.completeGeometryHash) {
      throw new LivePointCoreError("SNAPSHOT_HASH_MISMATCH", "Synthetic fixture coverage receipts are inconsistent.");
    }
  }
}

export function assertE1FixtureAuthority(
  repository: LivePointSnapshotRepository
): asserts repository is SyntheticRepository {
  assertE1CoverageRegistryAuthority(repository);

  const { bundleHash, ...snapshotCore } = repository.snapshot;
  const { manifestHash, ...manifestCore } = repository.manifest;
  const snapshotHash = semanticHash(repository.snapshot);
  const manifestHashWithReceipt = semanticHash(repository.manifest);
  const snapshotCasePackCount = repository.snapshot.casePacks.length;
  const snapshotObjectCount = repository.snapshot.casePacks.reduce(
    (total, casePack) => total + casePack.objects.length,
    0
  );
  const snapshotContextCount = repository.snapshot.casePacks.reduce(
    (total, casePack) => total + casePack.contextFeatures.length,
    0
  );
  if (bundleHash !== semanticHash(snapshotCore) ||
      repository.snapshotByteHash !== snapshotHash ||
      repository.snapshotSemanticHash !== snapshotHash ||
      manifestHash !== semanticHash(manifestCore) ||
      repository.manifestSemanticHash !== manifestHashWithReceipt ||
      repository.snapshot.generatedAt !== repository.manifest.generatedAt ||
      repository.snapshot.manifestId !== repository.manifest.manifestId ||
      repository.snapshot.caveat !== LIVE_POINT_CAVEAT ||
      repository.manifest.bundle.sha256 !== repository.snapshotByteHash ||
      repository.manifest.bundle.semanticHash !== repository.snapshotSemanticHash ||
      repository.manifest.bundle.byteSize !== Buffer.byteLength(JSON.stringify(repository.snapshot), "utf8") ||
      repository.manifest.bundle.casePackCount !== snapshotCasePackCount ||
      repository.manifest.bundle.objectCount !== snapshotObjectCount ||
      repository.manifest.bundle.contextFeatureCount !== snapshotContextCount) {
    throw new LivePointCoreError("SNAPSHOT_HASH_MISMATCH", "Synthetic fixture snapshot or manifest receipts are inconsistent.");
  }

  if (repository.casePacksById.size !== snapshotCasePackCount ||
      repository.objectsById.size !== snapshotObjectCount ||
      repository.objectsByGeometryId.size !== snapshotObjectCount ||
      repository.sourceReceiptsById.size !== repository.manifest.sourceReceipts.length) {
    throw new LivePointCoreError("SNAPSHOT_CORRUPT", "Synthetic fixture indexes or aggregate counts are inconsistent.");
  }

  const sourceReceiptIds = new Set<string>();
  for (const receipt of repository.manifest.sourceReceipts) {
    if (sourceReceiptIds.has(receipt.id) || repository.sourceReceiptsById.get(receipt.id) !== receipt) {
      throw new LivePointCoreError("SNAPSHOT_CORRUPT", "Synthetic source receipt bindings are inconsistent.");
    }
    sourceReceiptIds.add(receipt.id);
  }

  const isSyntheticSource =
    repository.snapshot.sourcePolicy.runtimeSourceFamily === "synthetic_fixture" &&
    repository.snapshot.sourcePolicy.licenseId === "Synthetic-Non-Runtime-1.0" &&
    repository.snapshot.sourcePolicy.officialLiveStatus === "synthetic_non_runtime" &&
    repository.manifest.termsReceipt.sourceId === "synthetic_fixture" &&
    repository.manifest.termsReceipt.licenseId === "Synthetic-Non-Runtime-1.0" &&
    repository.manifest.sourceReceipts.every((receipt) => receipt.sourceId === "synthetic_fixture") &&
    repository.snapshot.casePacks.every((casePack) =>
      casePack.snapshot.sourceId === "synthetic_fixture" &&
      casePack.snapshot.contextGeometryBasis === "synthetic_point" &&
      casePack.objects.every((object) => object.sourceNamespace === "SyntheticFixture") &&
      casePack.contextFeatures.every((feature) =>
        feature.elementType === "synthetic" && feature.geometryBasis === "synthetic_point"
      )
    );
  if (!isSyntheticSource) {
    throw new LivePointCoreError(
      "PREVIEW_DISABLED",
      "The injected repository source records are not explicitly synthetic non-runtime fixtures."
    );
  }

  const casePackIds = new Set<string>();
  const objectIds = new Set<string>();
  const geometryIds = new Set<string>();
  const contextFeatureIds = new Set<string>();
  for (const casePack of repository.snapshot.casePacks) {
    if (casePackIds.has(casePack.id) || repository.casePacksById.get(casePack.id) !== casePack ||
        !repository.sourceReceiptsById.has(casePack.snapshot.acquisitionReceiptId) ||
        casePack.objectCount !== casePack.objects.length ||
        casePack.contextFeatureCount !== casePack.contextFeatures.length) {
      throw new LivePointCoreError("SNAPSHOT_CORRUPT", "Synthetic fixture count receipts are inconsistent.");
    }
    casePackIds.add(casePack.id);
    let cumulativeGeometryBytes = 0;
    for (const object of casePack.objects) {
      const geometryBytes = Buffer.byteLength(JSON.stringify(object.geometry), "utf8");
      cumulativeGeometryBytes += geometryBytes;
      if (geometryBytes > LIVE_POINT_CAPS.inlineGeometryBytes) {
        throw new LivePointCoreError("INPUT_LIMIT_EXCEEDED", "Synthetic fixture geometry exceeds the per-object byte cap.");
      }
      if (objectIds.has(object.id) || geometryIds.has(object.geometryId) ||
          semanticHash(object.geometry) !== object.geometryHash ||
          repository.objectsById.get(object.id) !== object ||
          repository.objectsByGeometryId.get(object.geometryId) !== object) {
        throw new LivePointCoreError("GEOMETRY_HASH_MISMATCH", "Synthetic fixture object geometry receipts are inconsistent.");
      }
      objectIds.add(object.id);
      geometryIds.add(object.geometryId);
    }
    if (cumulativeGeometryBytes > LIVE_POINT_CAPS.allInlineGeometryBytes) {
      throw new LivePointCoreError("INPUT_LIMIT_EXCEEDED", "Synthetic fixture geometry exceeds the cumulative byte cap.");
    }
    for (const feature of casePack.contextFeatures) {
      const featureCore = {
        sourceId: feature.sourceId,
        geometry: feature.geometry,
        geometryBasis: feature.geometryBasis,
        sourceTags: feature.sourceTags,
        sourceAsOf: feature.sourceAsOf
      };
      if (contextFeatureIds.has(feature.id) || semanticHash(featureCore) !== feature.featureHash) {
        throw new LivePointCoreError("SNAPSHOT_HASH_MISMATCH", "Synthetic context feature receipts are inconsistent.");
      }
      contextFeatureIds.add(feature.id);
    }
  }
}

export function assertE1SourceRights(
  repository: SyntheticRepository
): asserts repository is AuthorizedSyntheticRepository {
  if (repository.rightsDecision.state !== "cleared" ||
      repository.rightsDecision.sourceStatus !== "cleared_for_experiment" ||
      repository.snapshot.sourcePolicy.rightsStatus !== "cleared_for_experiment" ||
      repository.manifest.rightsGate.status !== "cleared_for_experiment" ||
      repository.manifest.termsReceipt.rightsStatus !== "cleared_for_experiment" ||
      repository.snapshot.casePacks.some((casePack) =>
        casePack.snapshot.rightsStatus !== "cleared_for_experiment" ||
        casePack.contextFeatures.some((feature) => feature.rightsStatus !== "cleared_for_experiment")
      )) {
    throw new LivePointCoreError(
      repository.rightsDecision.state === "blocked" ? "RIGHTS_BLOCKED" : "RIGHTS_UNKNOWN",
      "Fixture rights are not cleared for deterministic core evaluation."
    );
  }
}

export function assertE1CoreRepositoryAuthority(
  repository: LivePointSnapshotRepository
): asserts repository is AuthorizedSyntheticRepository {
  assertE1FixtureAuthority(repository);
  assertE1SourceRights(repository);
}

export function createSnapshotAnchor(
  repository: LivePointSnapshotRepository,
  casePack: LivePointCasePack
): SnapshotAnchor {
  assertE1CoreRepositoryAuthority(repository);
  return {
    manifest_id: repository.manifest.manifestId,
    snapshot_id: casePack.snapshot.id,
    snapshot_hash: repository.snapshotByteHash,
    snapshot_semantic_hash: repository.snapshotSemanticHash,
    source_as_of: casePack.snapshot.sourceAsOf,
    retrieved_at: casePack.snapshot.retrievedAt,
    acquisition_receipt_id: casePack.snapshot.acquisitionReceiptId,
    rights_status: repository.rightsDecision.sourceStatus
  };
}
