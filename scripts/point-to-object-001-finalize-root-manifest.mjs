import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  loadPointToObjectContract,
  validateCasePackPhysicalBindings,
  validateCasePackManifest,
  validateLinkedRightsDecision
} from "./point-to-object-001-contract-gates.mjs";

const OUTPUT = "data/point-to-object-001/POINT_TO_OBJECT_001_PACK_MANIFEST.json";
const FINALIZED_AT_UTC = "2026-08-31T22:36:09Z";

const compareCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function record(path) {
  const bytes = await readFile(path);
  return { path, pathBase: "repository_root", bytes: bytes.byteLength, sha256: sha256(bytes) };
}

const caseManifests = [
  "data/point-to-object-001/case-packs/uae-dubai-museum-future-v1/case-pack-manifest.json",
  "data/point-to-object-001/case-packs/singapore-marina-bay-v1/case-pack-manifest.json"
];
const rightsArtifacts = [
  "data/point-to-object-001/NOTICE.md",
  "data/point-to-object-001/rights/osm-20260831/OSM_RIGHTS_DECISION_V1.json",
  "data/point-to-object-001/rights/osm-20260831/osm-copyright.html",
  "data/point-to-object-001/rights/osm-20260831/osm-copyright-headers.txt",
  "data/point-to-object-001/rights/osm-20260831/odbl-1.0-legal-code.html",
  "data/point-to-object-001/rights/osm-20260831/odbl-1.0-legal-code-headers.txt",
  "data/point-to-object-001/rights/osm-20260831/osmf-attribution-guidelines.html",
  "data/point-to-object-001/rights/osm-20260831/osmf-attribution-guidelines-headers.txt",
  "data/point-to-object-001/rights/osm-20260831/osmf-licence-faq.html",
  "data/point-to-object-001/rights/osm-20260831/osmf-licence-faq-headers.txt",
  "data/point-to-object-001/rights/osm-20260831/overpass-commons.html",
  "data/point-to-object-001/rights/osm-20260831/overpass-commons-headers.txt",
  "data/point-to-object-001/rights/osm-20260831/osm-api-policy.html",
  "data/point-to-object-001/rights/osm-20260831/osm-api-policy-headers.txt"
];
const contractAndEvidenceArtifacts = [
  "data/point-to-object-001/.gitattributes",
  "data/point-to-object-001/POINT_TO_OBJECT_001_GOLD_FIXTURES.json",
  "docs/point-to-object-001/POINT_TO_OBJECT_001_DATA_CONTRACT.json",
  "docs/point-to-object-001/POINT_TO_OBJECT_001_RESOLVER_CONTEXT_SPEC.md",
  "docs/point-to-object-001/POINT_TO_OBJECT_001_DATA_DECISION.md",
  "docs/point-to-object-001/POINT_TO_OBJECT_001_VALIDATION_RECEIPT.json",
  "docs/point-to-object-001/POINT_TO_OBJECT_001_POSTGIS_TEMP_VALIDATION_RECEIPT.json",
  "docs/point-to-object-001/POINT_TO_OBJECT_001_DB_SOURCE_AUDIT_RECEIPT.json"
];
const tools = [
  "scripts/point-to-object-001-sanitize-osm-snapshot-v1_0_0.mjs",
  "scripts/point-to-object-001-sanitize-osm-snapshot.mjs",
  "scripts/point-to-object-001-build-case-pack.mjs",
  "scripts/point-to-object-001-contract-gates.mjs",
  "scripts/point-to-object-001-finalize-case-manifests.mjs",
  "scripts/point-to-object-001-generate-postgis-temp-validation.mjs",
  "scripts/point-to-object-001-postgis-uae-temp-validation.sql",
  "scripts/point-to-object-001-postgis-sg-temp-validation.sql",
  "scripts/point-to-object-001-validate.mjs",
  "scripts/point-to-object-001-finalize-root-manifest.mjs"
];

const [caseRecords, rightsRecords, evidenceRecords, toolRecords] = await Promise.all([
  Promise.all(caseManifests.map(record)),
  Promise.all(rightsArtifacts.map(record)),
  Promise.all(contractAndEvidenceArtifacts.map(record)),
  Promise.all(tools.map(record))
]);

const parsedCases = await Promise.all(caseManifests.map(async (manifestPath) => JSON.parse(await readFile(manifestPath, "utf8"))));
const { contract } = await loadPointToObjectContract();
for (const [index, item] of parsedCases.entries()) {
  validateCasePackManifest(item, contract, `${item.caseId}.casePackManifest`);
  await validateCasePackPhysicalBindings(item, process.cwd(), path.dirname(caseManifests[index]), `${item.caseId}.casePackManifest`);
  await validateLinkedRightsDecision(item, contract, process.cwd(), `${item.caseId}.casePackManifest`);
}
for (const item of parsedCases) {
  if (item.sourceOffer.notice?.sha256 !== rightsRecords.find((entry) => entry.path.endsWith("NOTICE.md"))?.sha256) {
    throw new Error(`${item.caseId}: source-offer NOTICE hash mismatch`);
  }
  if (item.geometryQuality.state !== "PASS_FOR_IDENTITY_ELIGIBLE_POLYGON_FEATURES") {
    throw new Error(`${item.caseId}: identity geometry gate is not passed`);
  }
  if (item.contextCompletenessAtContainedRadius !== "UNKNOWN" || item.absenceClaimAtDefaultRadiusAllowed !== false) {
    throw new Error(`${item.caseId}: context completeness/absence boundary violated`);
  }
}

const manifest = {
  protocol: "POINT_TO_OBJECT_001_ROOT_PACK_MANIFEST_V1",
  manifestVersion: "1.0.0",
  finalizedAtUtc: FINALIZED_AT_UTC,
  status: "CANDIDATE_NOT_MAIN_ACCEPTED",
  pathBase: "repository_root",
  authority: {
    releasedMainSha: "7f323c4227f2409f3fe2d4d68be48a30176f4e2a",
    productionStage: "public_demo_prototype",
    productionChanged: false
  },
  runtimeLoadGate: {
    rootManifestRequired: true,
    caseManifestRequired: true,
    rightsDecisionRequired: true,
    noticeHashRequired: true,
    exactHashAndByteMatchRequired: true,
    rightsStateMustBeClearedForOperation: true,
    sourceSnapshotAndIndexHashRequired: true,
    failureMode: "typed_error_no_identity_success",
    routeActivationAllowedByThisManifest: false
  },
  casePacks: parsedCases.map((item, index) => ({
    casePackId: item.casePackId,
    caseId: item.caseId,
    role: item.caseRole,
    sourceSnapshotId: item.sourceSnapshotId,
    manifest: caseRecords[index],
    rightsState: item.rightsDecision.rightsState,
    officialStatus: item.officialStatus,
    identityGeometryState: item.geometryQuality.state,
    identityEligiblePolygonFeatureCount: item.geometryQuality.postgisTempValidation.identityEligiblePolygonFeatureCount,
    contextCompleteness: item.contextCompletenessAtContainedRadius,
    default800mComplete: false,
    absenceClaimAllowed: false
  })),
  rightsArtifacts: rightsRecords.sort((a, b) => compareCodeUnits(a.path, b.path)),
  contractAndEvidenceArtifacts: evidenceRecords.sort((a, b) => compareCodeUnits(a.path, b.path)),
  tools: toolRecords.sort((a, b) => compareCodeUnits(a.path, b.path)),
  acceptanceSummary: {
    uaeCaseCount: 1,
    benchmarkCaseCount: 1,
    deterministicFixtureCount: 10,
    deterministicFixturePassCount: 10,
    identityEligiblePolygonFeatureCount: 433,
    fullPostgisValidGeometryCount: 433,
    quarantinedUnsupportedBuildingRelationCount: 2,
    nonPolygonBuildingTaggedIdentityIneligibleCount: 1,
    persistentP2oTableCount: 0,
    statisticalAccuracyCohort: "NOT_EVALUATED",
    contextCompleteness: "UNKNOWN_PARTIAL",
    externalPreview: "BLOCKED",
    production: "PROHIBITED"
  },
  sourceOffer: {
    notice: rightsRecords.find((entry) => entry.path.endsWith("NOTICE.md")),
    casePackDirectory: "data/point-to-object-001/case-packs/",
    currentTransformationTool: toolRecords.find((entry) => entry.path.endsWith("point-to-object-001-build-case-pack.mjs")),
    licence: "ODbL-1.0",
    attribution: "© OpenStreetMap contributors"
  },
  nonCircularManifestHash: null,
  mandatoryCaveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
};

await writeFile(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
const bytes = await readFile(OUTPUT);
console.log(JSON.stringify({ output: OUTPUT, bytes: bytes.byteLength, sha256: sha256(bytes) }, null, 2));
