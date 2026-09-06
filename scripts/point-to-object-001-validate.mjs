import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  loadPointToObjectContract,
  validateCasePackPhysicalBindings,
  validateCasePackManifest,
  validateLinkedRightsDecision,
  validateRightsDecision
} from "./point-to-object-001-contract-gates.mjs";

const ROOT = process.cwd();
const FIXTURE_PATH = "data/point-to-object-001/POINT_TO_OBJECT_001_GOLD_FIXTURES.json";
const OUTPUT_PATH = "docs/point-to-object-001/POINT_TO_OBJECT_001_VALIDATION_RECEIPT.json";
const POSTGIS_RECEIPT_PATH = "docs/point-to-object-001/POINT_TO_OBJECT_001_POSTGIS_TEMP_VALIDATION_RECEIPT.json";
const CASE_DIRS = {
  "P2O-UAE-DXB-MUSEUM-FUTURE-001": "data/point-to-object-001/case-packs/uae-dubai-museum-future-v1",
  "P2O-SG-MARINA-BAY-001": "data/point-to-object-001/case-packs/singapore-marina-bay-v1"
};
const { contract: DATA_CONTRACT } = await loadPointToObjectContract(ROOT);

function compareCodeUnits(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function stableHash(value) {
  const canonical = (item) => {
    if (item === null || typeof item === "boolean" || typeof item === "string" || typeof item === "number") return JSON.stringify(item);
    if (Array.isArray(item)) return `[${item.map(canonical).join(",")}]`;
    return `{${Object.keys(item).sort(compareCodeUnits).map((key) => `${JSON.stringify(key)}:${canonical(item[key])}`).join(",")}}`;
  };
  return sha256(canonical(value));
}

function onSegment(point, start, end, tolerance = 1e-10) {
  const cross = (point[1] - start[1]) * (end[0] - start[0]) - (point[0] - start[0]) * (end[1] - start[1]);
  if (Math.abs(cross) > tolerance) return false;
  const dot = (point[0] - start[0]) * (end[0] - start[0]) + (point[1] - start[1]) * (end[1] - start[1]);
  if (dot < -tolerance) return false;
  const squaredLength = (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2;
  return dot <= squaredLength + tolerance;
}

function inRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > point[1]) !== (yj > point[1])
      && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygonRelation(point, polygon) {
  for (const ring of polygon) {
    for (let index = 0; index < ring.length - 1; index += 1) {
      if (onSegment(point, ring[index], ring[index + 1])) return "boundary";
    }
  }
  if (!inRing(point, polygon[0])) return "outside";
  if (polygon.slice(1).some((hole) => inRing(point, hole))) return "outside";
  return "interior";
}

function geometryRelation(point, geometry) {
  if (geometry.type === "Polygon") return polygonRelation(point, geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    let boundary = false;
    for (const polygon of geometry.coordinates) {
      const relation = polygonRelation(point, polygon);
      if (relation === "interior") return relation;
      if (relation === "boundary") boundary = true;
    }
    return boundary ? "boundary" : "outside";
  }
  return "ineligible_geometry";
}

async function loadCase(caseId) {
  const directory = CASE_DIRS[caseId];
  const paths = {
    manifest: path.join(directory, "case-pack-manifest.json"),
    normalized: path.join(directory, "normalized-features.geojson"),
    index: path.join(directory, "spatial-grid-index.json"),
    config: path.join(directory, "case-config.json")
  };
  const [manifestBytes, normalizedBytes, indexBytes, configBytes] = await Promise.all(Object.values(paths).map((filePath) => readFile(filePath)));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const normalized = JSON.parse(normalizedBytes.toString("utf8"));
  const index = JSON.parse(indexBytes.toString("utf8"));
  const config = JSON.parse(configBytes.toString("utf8"));
  validateCasePackManifest(manifest, DATA_CONTRACT, `${caseId}.casePackManifest`);
  await validateCasePackPhysicalBindings(manifest, ROOT, directory, `${caseId}.casePackManifest`);
  await validateLinkedRightsDecision(manifest, DATA_CONTRACT, ROOT, `${caseId}.casePackManifest`);
  if (manifest.normalizedSnapshot.sha256 !== sha256(normalizedBytes)) throw new Error(`${caseId}: normalized hash mismatch`);
  if (manifest.spatialIndex.sha256 !== sha256(indexBytes)) throw new Error(`${caseId}: index hash mismatch`);
  if (manifest.coverageGeometryHashSha256 !== stableHash(normalized.coverageGeometryWgs84)) throw new Error(`${caseId}: coverage hash mismatch`);
  for (const record of manifest.files) {
    const bytes = await readFile(path.join(directory, record.path));
    if (bytes.byteLength !== record.bytes || sha256(bytes) !== record.sha256) throw new Error(`${caseId}: manifest record mismatch ${record.path}`);
  }
  return {
    directory, manifestBytes, manifest, normalized, index, config,
    featuresById: new Map(normalized.features.map((feature) => [feature.id, feature]))
  };
}

function indexIdsForPoint(caseData, point) {
  const [west, south, east, north] = caseData.index.coverageBboxWgs84;
  if (point[0] < west || point[0] > east || point[1] < south || point[1] > north) return [];
  const column = Math.min(caseData.index.columnCount - 1, Math.max(0, Math.floor((point[0] - west) / caseData.index.cellSizeDegrees)));
  const row = Math.min(caseData.index.rowCount - 1, Math.max(0, Math.floor((point[1] - south) / caseData.index.cellSizeDegrees)));
  return caseData.index.cells[`${column}:${row}`] || [];
}

function eligiblePriority(intent, feature) {
  if (!["Polygon", "MultiPolygon"].includes(feature.geometry.type)) return null;
  if (feature.properties.identityEligibility?.eligible !== true) return null;
  const featureClass = feature.properties.featureClass;
  const policies = {
    building: ["building", "building_part"],
    general_object: ["building", "building_part", "land_use"],
    land_use: ["land_use"],
    road: ["road_segment"],
    poi: ["poi_place"]
  };
  const index = policies[intent].indexOf(featureClass);
  return index === -1 ? null : index;
}

function exactCandidates(caseData, point, intent, sourceFeatures) {
  const matches = [];
  for (const feature of sourceFeatures) {
    const priority = eligiblePriority(intent, feature);
    if (priority === null) continue;
    const relationship = geometryRelation(point, feature.geometry);
    if (["interior", "boundary"].includes(relationship)) matches.push({ feature, priority, relationship });
  }
  const interior = matches.filter((candidate) => candidate.relationship === "interior");
  const candidatePool = interior.length ? interior : matches.filter((candidate) => candidate.relationship === "boundary");
  if (!candidatePool.length) return [];
  const minimumPriority = Math.min(...candidatePool.map((candidate) => candidate.priority));
  return candidatePool.filter((candidate) => candidate.priority === minimumPriority)
    .sort((a, b) => compareCodeUnits(a.feature.id, b.feature.id));
}

function observeFixture(fixture, caseData) {
  if (fixture.injectedFault?.snapshotHashMismatch) {
    return { identityStatus: null, selectedId: null, candidateIds: [], warnings: [], error: { status: "source_unavailable", code: "SNAPSHOT_HASH_MISMATCH" }, indexFalseNegative: false };
  }
  if (fixture.injectedFault?.rightsState && fixture.injectedFault.rightsState !== "cleared") {
    return { identityStatus: null, selectedId: null, candidateIds: [], warnings: [], error: { status: "blocked", code: fixture.injectedFault.rightsState === "unknown" ? "RIGHTS_UNKNOWN" : "RIGHTS_BLOCKED" }, indexFalseNegative: false };
  }
  if (fixture.injectedFault?.eligibleCandidateCount > 20) {
    return { identityStatus: null, selectedId: null, candidateIds: [], warnings: [], error: { status: "blocked", code: "CANDIDATE_SET_OVERFLOW" }, indexFalseNegative: false };
  }
  const point = [fixture.pointWgs84.longitude, fixture.pointWgs84.latitude];
  const coverageRelation = geometryRelation(point, caseData.normalized.coverageGeometryWgs84);
  if (coverageRelation === "outside") return { identityStatus: "outside_coverage", selectedId: null, candidateIds: [], warnings: [], error: null, indexFalseNegative: false };
  const bruteForce = exactCandidates(caseData, point, fixture.selectionIntent, caseData.normalized.features);
  const indexFeatures = indexIdsForPoint(caseData, point).map((id) => caseData.featuresById.get(id)).filter(Boolean);
  const indexed = exactCandidates(caseData, point, fixture.selectionIntent, indexFeatures);
  const bruteIds = bruteForce.map((candidate) => candidate.feature.id);
  const indexedIds = indexed.map((candidate) => candidate.feature.id);
  const indexFalseNegative = JSON.stringify(bruteIds) !== JSON.stringify(indexedIds);
  if (indexFalseNegative) throw new Error(`${fixture.fixtureId}: bbox-grid index false negative`);
  const warnings = new Set(["SOURCE_FRESHNESS_UNKNOWN"]);
  let identityStatus;
  let selectedId = null;
  if (!bruteForce.length) {
    identityStatus = fixture.operation === "get_evidence_bundle" ? "coordinate_context_only" : "no_result";
    warnings.add("MISSING_IS_NOT_ABSENCE");
    if (identityStatus === "coordinate_context_only") {
      warnings.add("COORDINATE_CONTEXT_ONLY");
      warnings.add("PARTIAL_CONTEXT_SOURCE");
    }
  } else if (bruteForce.length > 1) {
    identityStatus = "ambiguous";
  } else {
    identityStatus = "resolved";
    selectedId = bruteForce[0].feature.id;
  }
  if (bruteForce.some((candidate) => candidate.relationship === "boundary")) warnings.add("BOUNDARY_CONTACT");
  if (bruteForce.some((candidate) => candidate.feature.properties.classificationWarnings?.length)) warnings.add("SOURCE_CONFLICT");
  return {
    identityStatus,
    selectedId,
    candidateIds: bruteIds,
    candidateSetHashSha256: stableHash(bruteIds),
    warnings: [...warnings].sort(compareCodeUnits),
    error: null,
    indexFalseNegative
  };
}

const fixtureBytes = await readFile(FIXTURE_PATH);
const fixtureSet = JSON.parse(fixtureBytes.toString("utf8"));
const postgisReceiptBytes = await readFile(POSTGIS_RECEIPT_PATH);
const postgisReceipt = JSON.parse(postgisReceiptBytes.toString("utf8"));
const cases = {};
for (const caseId of Object.keys(CASE_DIRS)) cases[caseId] = await loadCase(caseId);
for (const [caseId, caseData] of Object.entries(cases)) {
  const postgisCase = postgisReceipt.cases.find((item) => item.caseId === caseId);
  if (!postgisCase || postgisCase.normalizedSnapshot.sha256 !== caseData.manifest.normalizedSnapshot.sha256) {
    throw new Error(`${caseId}: PostGIS receipt does not bind normalized snapshot`);
  }
  if (postgisCase.results.invalidGeometryCount !== 0
    || postgisCase.results.identityEligiblePolygonFeatureCount !== postgisCase.results.validGeometryCount) {
    throw new Error(`${caseId}: PostGIS geometry gate not passed`);
  }
}
const syntheticLandUseFeature = {
  id: "negative/land-use-only",
  geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
  properties: { featureClass: "land_use", identityEligibility: { eligible: true } }
};
const buildingIntentLandUseOnlyCandidateCount = exactCandidates(
  null,
  [0.5, 0.5],
  "building",
  [syntheticLandUseFeature]
).length;
if (buildingIntentLandUseOnlyCandidateCount !== 0) throw new Error("building intent promoted land_use to building identity");
const results = [];
for (const fixture of fixtureSet.fixtures) {
  const caseData = cases[fixture.caseId] || null;
  if (caseData && fixture.snapshotManifestSha256 !== sha256(caseData.manifestBytes)) throw new Error(`${fixture.fixtureId}: fixture manifest hash mismatch`);
  const observed = observeFixture(fixture, caseData);
  const pass = observed.identityStatus === fixture.expectedIdentityStatus
    && observed.selectedId === fixture.expectedSelectedId
    && JSON.stringify(observed.candidateIds) === JSON.stringify(fixture.expectedSortedCandidateIds)
    && JSON.stringify(observed.warnings) === JSON.stringify(fixture.expectedWarnings)
    && JSON.stringify(observed.error) === JSON.stringify(fixture.expectedError);
  results.push({ fixtureId: fixture.fixtureId, pass, expected: { identityStatus: fixture.expectedIdentityStatus, selectedId: fixture.expectedSelectedId, candidateIds: fixture.expectedSortedCandidateIds, warnings: fixture.expectedWarnings, error: fixture.expectedError }, observed });
}
const nonPolygonIdentityClassCount = Object.values(cases).reduce((count, caseData) => count + caseData.normalized.features.filter((feature) => ["building", "building_part", "land_use"].includes(feature.properties.featureClass) && !["Polygon", "MultiPolygon"].includes(feature.geometry.type)).length, 0);
const nonPolygonBuildingTagMisclassifiedCount = Object.values(cases).reduce((count, caseData) => count + caseData.normalized.features.filter((feature) =>
  (feature.properties.tags.building || feature.properties.tags["building:part"])
    && !["Polygon", "MultiPolygon"].includes(feature.geometry.type)
    && feature.properties.identityEligibility?.eligible !== false).length, 0);
const unsupportedBuildingRelationAcceptedCount = Object.values(cases).reduce((count, caseData) => count + caseData.normalized.features.filter((feature) =>
  feature.properties.sourceFeatureId.startsWith("relation/")
    && feature.properties.tags.type === "building").length, 0);
if (nonPolygonBuildingTagMisclassifiedCount !== 0) throw new Error("non-polygon building tag entered identity eligibility");
if (unsupportedBuildingRelationAcceptedCount !== 0) throw new Error("unsupported type=building relation entered normalized candidates");
const contractGateNegativeControls = [];
function expectContractRejection(controlId, callback) {
  let rejected = false;
  let observedError = null;
  try {
    callback();
  } catch (error) {
    rejected = true;
    observedError = error instanceof Error ? error.message : String(error);
  }
  contractGateNegativeControls.push({ controlId, expected: "REJECTED", observed: rejected ? "REJECTED" : "ACCEPTED", observedError });
  if (!rejected) throw new Error(`${controlId}: contract gate accepted invalid mutation`);
}
async function expectAsyncContractRejection(controlId, callback) {
  let rejected = false;
  let observedError = null;
  try {
    await callback();
  } catch (error) {
    rejected = true;
    observedError = error instanceof Error ? error.message : String(error);
  }
  contractGateNegativeControls.push({ controlId, expected: "REJECTED", observed: rejected ? "REJECTED" : "ACCEPTED", observedError });
  if (!rejected) throw new Error(`${controlId}: contract gate accepted invalid mutation`);
}
const uaeManifest = cases["P2O-UAE-DXB-MUSEUM-FUTURE-001"].manifest;
const missingExecutableField = structuredClone(uaeManifest);
delete missingExecutableField.caseRole;
expectContractRejection("P2O-NC-MANIFEST-MISSING-CASE-ROLE", () => validateCasePackManifest(missingExecutableField, DATA_CONTRACT));
const unexpectedTopLevelField = structuredClone(uaeManifest);
unexpectedTopLevelField.uncontractedAuthority = true;
expectContractRejection("P2O-NC-MANIFEST-UNEXPECTED-TOP-LEVEL-FIELD", () => validateCasePackManifest(unexpectedTopLevelField, DATA_CONTRACT));
const missingPathBase = structuredClone(uaeManifest);
delete missingPathBase.pathBases.postgisTempValidation;
expectContractRejection("P2O-NC-MANIFEST-MISSING-POSTGIS-PATH-BASE", () => validateCasePackManifest(missingPathBase, DATA_CONTRACT));
const rightsForNegativeControl = JSON.parse(await readFile(path.resolve(ROOT, uaeManifest.rightsDecision.path), "utf8"));
delete rightsForNegativeControl.obligations;
expectContractRejection("P2O-NC-CLEARED-RIGHTS-MISSING-OBLIGATIONS", () => validateRightsDecision(rightsForNegativeControl, DATA_CONTRACT));
const physicalHashMismatch = structuredClone(uaeManifest);
physicalHashMismatch.geometryQuality.postgisTempValidation.sha256 = "0".repeat(64);
await expectAsyncContractRejection("P2O-NC-PHYSICAL-POSTGIS-HASH-MISMATCH", () => validateCasePackPhysicalBindings(
  physicalHashMismatch,
  ROOT,
  cases["P2O-UAE-DXB-MUSEUM-FUTURE-001"].directory
));
const unboundTransformationPath = structuredClone(uaeManifest);
unboundTransformationPath.sourceOffer.transformationPath = "scripts/point-to-object-001-sanitize-osm-snapshot.mjs";
await expectAsyncContractRejection("P2O-NC-UNBOUND-TRANSFORMATION-PATH", () => validateCasePackPhysicalBindings(
  unboundTransformationPath,
  ROOT,
  cases["P2O-UAE-DXB-MUSEUM-FUTURE-001"].directory
));
const failures = results.filter((result) => !result.pass);
const receipt = {
  protocol: "POINT_TO_OBJECT_001_DETERMINISTIC_VALIDATION_RECEIPT_V1",
  validatorVersion: "1.0.1",
  validationEvidenceCutoffUtc: postgisReceipt.validatedAtUtc,
  serializationDeterministic: true,
  nodeRuntime: process.version,
  fixtureSet: { path: FIXTURE_PATH, bytes: fixtureBytes.byteLength, sha256: sha256(fixtureBytes), fixtureCount: fixtureSet.fixtures.length },
  postgisTempValidation: { path: POSTGIS_RECEIPT_PATH, bytes: postgisReceiptBytes.byteLength, sha256: sha256(postgisReceiptBytes), all433IdentityEligiblePolygonFeaturesValid: postgisReceipt.checks.all433IdentityEligiblePolygonFeaturesValid },
  cases: Object.fromEntries(Object.entries(cases).map(([caseId, caseData]) => [caseId, { directory: caseData.directory, manifestBytes: caseData.manifestBytes.byteLength, manifestSha256: sha256(caseData.manifestBytes), sourceSnapshotId: caseData.manifest.sourceSnapshotId, normalizedSha256: caseData.manifest.normalizedSnapshot.sha256, indexSha256: caseData.manifest.spatialIndex.sha256 }])),
  checks: {
    exactFixtureOracle: failures.length ? "FAIL" : "PASS",
    scoreableFixtureCount: results.length,
    exactPassCount: results.length - failures.length,
    failureCount: failures.length,
    falseConfidentIdentityCount: failures.filter((failure) => failure.observed.identityStatus === "resolved" && failure.expected.identityStatus !== "resolved").length,
    indexFalseNegativeCount: results.filter((result) => result.observed.indexFalseNegative).length,
    identityIneligibleNonPolygonFeatureCount: nonPolygonIdentityClassCount,
    nonPolygonIdentityFeaturesExcluded: true,
    nonPolygonBuildingTagMisclassifiedCount,
    unsupportedBuildingRelationAcceptedCount,
    buildingIdentityRequiresPolygonOrMultiPolygon: true,
    osmTypeBuildingRelationsRejectedPendingExplicitUnionSemantics: true,
    buildingIntentLandUseOnlyCandidateCount,
    buildingIntentDoesNotPromoteLandUse: buildingIntentLandUseOnlyCandidateCount === 0,
    candidateOverflowBlocksWithoutTruncation: results.find((result) => result.fixtureId === "P2O-FX-CANDIDATE-OVERFLOW-001")?.pass === true,
    rightsUnknownReturnsTypedError: results.find((result) => result.fixtureId === "P2O-FX-RIGHTS-UNKNOWN-001")?.pass === true,
    snapshotHashFailureIsNotNoResult: results.find((result) => result.fixtureId === "P2O-FX-SNAPSHOT-HASH-001")?.pass === true
  },
  contractGateNegativeControls,
  results,
  statisticalTargets: { top1PrecisionGte98Percent: "NOT_EVALUATED", resolvableShareGte80Percent: "NOT_EVALUATED", reason: "No independently adjudicated statistical cohort exists." },
  geometryGate: "PASS_FOR_ALL_433_IDENTITY_ELIGIBLE_POLYGON_FEATURES",
  context800mGate: "FAIL_PARTIAL_COVERAGE",
  routeActivationAllowed: false,
  externalPreviewAllowed: false,
  productionChanged: false,
  mandatoryCaveat: fixtureSet.mandatoryCaveat
};
await writeFile(OUTPUT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: OUTPUT_PATH, fixtureCount: results.length, passCount: results.length - failures.length, failures: failures.map((failure) => failure.fixtureId) }, null, 2));
if (failures.length) process.exitCode = 1;
