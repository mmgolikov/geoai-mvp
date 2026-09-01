import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  loadPointToObjectContract,
  validateCasePackPhysicalBindings,
  validateCasePackManifest,
  validateRightsDecision
} from "./point-to-object-001-contract-gates.mjs";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fileRecord(baseDirectory, relativePath) {
  const bytes = await readFile(path.resolve(baseDirectory, relativePath));
  return { path: relativePath, bytes: bytes.byteLength, sha256: sha256(bytes) };
}

function compareCodeUnits(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

async function finalize(directory) {
  const repositoryRoot = process.cwd();
  const { contract } = await loadPointToObjectContract(repositoryRoot);
  const [configBytes, normalizedBytes, receiptBytes, indexBytes, acquisitionBytes] = await Promise.all([
    readFile(path.join(directory, "case-config.json")),
    readFile(path.join(directory, "normalized-features.geojson")),
    readFile(path.join(directory, "normalization-receipt.json")),
    readFile(path.join(directory, "spatial-grid-index.json")),
    readFile(path.join(directory, "acquisition-minimization-receipt.json"))
  ]);
  const config = JSON.parse(configBytes.toString("utf8"));
  const normalized = JSON.parse(normalizedBytes.toString("utf8"));
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  const index = JSON.parse(indexBytes.toString("utf8"));
  const acquisition = JSON.parse(acquisitionBytes.toString("utf8"));
  const noticePath = "data/point-to-object-001/NOTICE.md";
  const postgisReceiptPath = "docs/point-to-object-001/POINT_TO_OBJECT_001_POSTGIS_TEMP_VALIDATION_RECEIPT.json";
  const [rightsBytes, noticeBytes, postgisReceiptBytes] = await Promise.all([
    readFile(path.resolve(repositoryRoot, config.rightsDecisionPath)),
    readFile(path.resolve(repositoryRoot, noticePath)),
    readFile(path.resolve(repositoryRoot, postgisReceiptPath))
  ]);
  const rights = JSON.parse(rightsBytes.toString("utf8"));
  validateRightsDecision(rights, contract, `${config.caseId}.rightsDecision`);
  const postgisReceipt = JSON.parse(postgisReceiptBytes.toString("utf8"));
  const postgisCase = postgisReceipt.cases.find((item) => item.caseId === config.caseId);
  if (!postgisCase || postgisCase.normalizedSnapshot.sha256 !== sha256(normalizedBytes)) {
    throw new Error(`${config.caseId}: PostGIS validation receipt does not bind the normalized snapshot`);
  }
  const extent = normalized.features.reduce((bbox, feature) => [
    Math.min(bbox[0], feature.bbox[0]), Math.min(bbox[1], feature.bbox[1]),
    Math.max(bbox[2], feature.bbox[2]), Math.max(bbox[3], feature.bbox[3])
  ], [Infinity, Infinity, -Infinity, -Infinity]);
  const records = await Promise.all([
    fileRecord(directory, "case-config.json"),
    fileRecord(directory, "case-config-at-minimization.json"),
    fileRecord(directory, "acquisition-query.overpassql"),
    fileRecord(directory, "acquisition-response-headers.txt"),
    fileRecord(directory, "acquisition-minimization-receipt.json"),
    fileRecord(directory, "raw-overpass-response.json"),
    fileRecord(directory, "normalized-features.geojson"),
    fileRecord(directory, "spatial-grid-index.json"),
    fileRecord(directory, "normalization-receipt.json")
  ]);
  const manifest = {
    protocol: "POINT_TO_OBJECT_001_CASE_PACK_MANIFEST_V1",
    manifestVersion: "1.0.1",
    pathBases: {
      files: "case_pack_directory",
      rightsDecision: "repository_root",
      sourceOffer: "repository_root",
      tools: "repository_root",
      postgisTempValidation: "repository_root"
    },
    casePackId: config.casePackId,
    caseId: config.caseId,
    caseRole: config.caseRole,
    sourceId: config.sourceId,
    sourceNamespace: config.sourceNamespace,
    sourceSnapshotId: config.sourceSnapshotId,
    sourceReleaseId: config.sourceReleaseId,
    sourceDatabaseObservedAtUtc: config.sourceSnapshotObservedAtUtc,
    sourceFeatureMetadataAvailability: config.sourceFeatureMetadataAvailability,
    officialStatus: config.officialStatus,
    acquisition: {
      operatorRecordedRequest: {
        endpoint: config.acquisitionService,
        method: config.acquisitionMethod,
        evidenceState: "OPERATOR_RECORDED_NOT_CONTEMPORANEOUS_MACHINE_PROOF"
      },
      completedAtUtc: config.acquisitionCompletedAtUtc,
      startTimeRetained: false,
      exactClientVersionRetained: false,
      acquiredBytesRetained: false,
      acquiredBytes: acquisition.acquisitionSource.bytes,
      acquiredSha256: acquisition.acquisitionSource.sha256,
      minimizedSnapshot: records.find((record) => record.path === "raw-overpass-response.json"),
      finalizationState: acquisition.operatorRecordedFinalization.state
    },
    query: records.find((record) => record.path === "acquisition-query.overpassql"),
    acquisitionReceipt: records.find((record) => record.path === "acquisition-minimization-receipt.json"),
    normalizedSnapshot: records.find((record) => record.path === "normalized-features.geojson"),
    spatialIndex: { ...records.find((record) => record.path === "spatial-grid-index.json"), version: index.indexVersion, semantics: index.semantics },
    normalizationReceipt: records.find((record) => record.path === "normalization-receipt.json"),
    coverageGeometry: normalized.coverageGeometryWgs84,
    coverageGeometryHashSha256: normalized.coverageGeometryHashSha256,
    coverageBboxWgs84: config.bboxWgs84,
    retainedGeometryExtentWgs84: extent,
    retainedFeatureGeometryMayExtendOutsideCoverage: true,
    maxRadiusContainedWithinQueryBboxAtAnchorM: config.maxRadiusContainedWithinQueryBboxAtAnchorM,
    contextCompletenessAtContainedRadius: "UNKNOWN",
    defaultRequestedContextRadiusM: config.defaultRequestedContextRadiusM,
    defaultContextCoverageState: config.defaultContextCoverageState,
    absenceClaimAtDefaultRadiusAllowed: false,
    calculationCrs: config.calculationCrs,
    taxonomyVersions: {
      normalizedFeatureSchema: normalized.schemaVersion,
      normalization: normalized.normalizationVersion,
      index: index.indexVersion,
      contextCategoryMap: normalized.contextCategoryMapVersion,
      resolver: "resolver-policy-p2o-v1.0.1",
      hashContract: receipt.hashContract
    },
    normalizationTool: receipt.normalizationTool,
    minimizationTool: acquisition.minimizationTool,
    geometryQuality: {
      state: "PASS_FOR_IDENTITY_ELIGIBLE_POLYGON_FEATURES",
      localScreen: receipt.geometryQuality,
      postgisTempValidation: {
        path: postgisReceiptPath,
        bytes: postgisReceiptBytes.byteLength,
        sha256: sha256(postgisReceiptBytes),
        identityEligiblePolygonFeatureCount: postgisCase.results.identityEligiblePolygonFeatureCount,
        validGeometryCount: postgisCase.results.validGeometryCount,
        invalidGeometryCount: postgisCase.results.invalidGeometryCount,
        temporaryOnly: true,
        persistentP2oTableCountAfterTests: postgisReceipt.checks.persistentP2oTableCountAfterTests
      },
      contextGeometryValidation: "PARTIAL_NOT_ALL_POINT_LINE_CONTEXT_FEATURES",
      routeActivationAllowed: false
    },
    rightsDecision: {
      path: config.rightsDecisionPath,
      bytes: rightsBytes.byteLength,
      sha256: sha256(rightsBytes),
      decisionId: rights.decisionId,
      decisionVersion: rights.decisionVersion,
      rightsState: rights.rightsState,
      permissionPhase: rights.permissionPhase
    },
    attribution: rights.requiredAttribution,
    sourceOffer: {
      ...rights.sourceOffer,
      notice: { path: noticePath, bytes: noticeBytes.byteLength, sha256: sha256(noticeBytes) }
    },
    counts: receipt.counts,
    anchor: receipt.anchor,
    knownAnchorInterpretation: config.caseId === "P2O-SG-MARINA-BAY-001"
      ? "AMBIGUOUS_TWO_EQUAL_PRIORITY_BUILDING_CANDIDATES"
      : "RESOLVED_SINGLE_BUILDING_PART_WITH_SOURCE_CLASSIFICATION_CONFLICT",
    activationState: {
      immutableFileBackedTooling: "CANDIDATE",
      routeIntegration: "BLOCKED_PENDING_MAIN_ACCEPTED_DEV_INTEGRATION_AND_CONTEXT_SCOPE",
      default800mCompleteContext: "FAIL_PARTIAL",
      externalPreview: "BLOCKED_PENDING_VISIBLE_ATTRIBUTION_AND_MAIN_GATE",
      production: "PROHIBITED"
    },
    files: records.sort((a, b) => compareCodeUnits(a.path, b.path)),
    nonCircularManifestHash: null,
    mandatoryCaveat: config.mandatoryCaveat
  };
  validateCasePackManifest(manifest, contract, `${config.caseId}.casePackManifest`);
  await validateCasePackPhysicalBindings(manifest, repositoryRoot, directory, `${config.caseId}.casePackManifest`);
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(path.join(directory, "case-pack-manifest.json"), text, "utf8");
  return { caseId: config.caseId, bytes: Buffer.byteLength(text), sha256: sha256(text) };
}

const directories = process.argv.slice(2);
if (!directories.length) throw new Error("Usage: node point-to-object-001-finalize-case-manifests.mjs <case-dir> [...]");
const results = [];
for (const directory of directories) results.push(await finalize(path.resolve(directory)));
console.log(JSON.stringify(results, null, 2));
