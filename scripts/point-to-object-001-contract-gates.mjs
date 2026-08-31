import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

export const CONTRACT_PATH = "docs/point-to-object-001/POINT_TO_OBJECT_001_DATA_CONTRACT.json";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: expected object`);
  }
}

function assertExactKeys(value, requiredKeys, label) {
  assertObject(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...requiredKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: exact keys mismatch; expected=${expected.join(",")} actual=${actual.join(",")}`);
  }
}

function assertRequiredKeys(value, requiredKeys, label) {
  assertObject(value, label);
  const missing = requiredKeys.filter((key) => !(key in value));
  if (missing.length) throw new Error(`${label}: missing keys ${missing.join(",")}`);
}

function assertHashRecord(value, label, exact = true) {
  const required = ["path", "bytes", "sha256"];
  if (exact) assertExactKeys(value, required, label);
  else assertRequiredKeys(value, required, label);
  if (typeof value.path !== "string" || !value.path.length || path.isAbsolute(value.path)) {
    throw new Error(`${label}.path: expected non-empty relative path`);
  }
  const normalizedPath = path.posix.normalize(value.path);
  if (value.path.includes("\\") || normalizedPath !== value.path || normalizedPath === ".." || normalizedPath.startsWith("../")) {
    throw new Error(`${label}.path: traversal or non-canonical path is prohibited`);
  }
  if (!Number.isSafeInteger(value.bytes) || value.bytes < 0) throw new Error(`${label}.bytes: expected non-negative safe integer`);
  if (typeof value.sha256 !== "string" || !SHA256_PATTERN.test(value.sha256)) throw new Error(`${label}.sha256: expected lowercase SHA-256`);
}

export async function loadPointToObjectContract(repositoryRoot = process.cwd()) {
  const bytes = await readFile(path.resolve(repositoryRoot, CONTRACT_PATH));
  return { bytes, contract: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes) };
}

export function validateRightsDecision(rights, contract, label = "rightsDecision") {
  assertObject(rights, label);
  const schema = contract.rightsDecisionSchema;
  assertObject(schema, "contract.rightsDecisionSchema");
  assertRequiredKeys(rights, schema.requiredTopLevelFields, label);
  if (rights.rightsState === "cleared") {
    if (!Array.isArray(rights.obligations) || rights.obligations.length === 0) {
      throw new Error(`${label}.obligations: cleared rights require at least one explicit obligation`);
    }
    rights.obligations.forEach((obligation, index) => {
      assertExactKeys(obligation, schema.obligationItemExactFields, `${label}.obligations[${index}]`);
      if (typeof obligation.obligationId !== "string" || !obligation.obligationId.length) throw new Error(`${label}.obligations[${index}].obligationId: required`);
      if (!Array.isArray(obligation.appliesTo) || obligation.appliesTo.length === 0 || obligation.appliesTo.some((item) => typeof item !== "string" || !item.length)) {
        throw new Error(`${label}.obligations[${index}].appliesTo: non-empty string array required`);
      }
      if (typeof obligation.requirement !== "string" || !obligation.requirement.length) throw new Error(`${label}.obligations[${index}].requirement: required`);
      if (typeof obligation.evidenceLocator !== "string" || !obligation.evidenceLocator.startsWith("/")) throw new Error(`${label}.obligations[${index}].evidenceLocator: JSON pointer required`);
    });
  }
  if (rights.permissionPhase !== contract.rightsAndActivation.currentPhase) throw new Error(`${label}: permission phase mismatch`);
  if (rights.rightsState !== "cleared") throw new Error(`${label}: active case-pack rights must be cleared`);
  if (rights.publicOverpassRuntimeAllowed !== false) throw new Error(`${label}: public Overpass runtime must remain disabled`);
}

export function validateCasePackManifest(manifest, contract, label = "casePackManifest") {
  assertObject(manifest, label);
  const schema = contract.snapshotManifestSchema;
  assertObject(schema, "contract.snapshotManifestSchema");
  if (schema.additionalTopLevelPropertiesAllowed !== false) throw new Error("contract.snapshotManifestSchema must fail closed on top-level additions");
  assertExactKeys(manifest, schema.requiredTopLevelFields, label);

  assertExactKeys(manifest.pathBases, Object.keys(schema.pathBases), `${label}.pathBases`);
  for (const [key, expected] of Object.entries(schema.pathBases)) {
    if (manifest.pathBases[key] !== expected) throw new Error(`${label}.pathBases.${key}: expected ${expected}`);
  }

  for (const key of schema.exactHashRecordFields) assertHashRecord(manifest[key], `${label}.${key}`);
  for (const key of schema.extendedHashRecordFields) assertHashRecord(manifest[key], `${label}.${key}`, false);
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) throw new Error(`${label}.files: non-empty array required`);
  manifest.files.forEach((record, index) => assertHashRecord(record, `${label}.files[${index}]`));

  assertExactKeys(manifest.rightsDecision, schema.rightsDecisionExactFields, `${label}.rightsDecision`);
  assertHashRecord(manifest.rightsDecision, `${label}.rightsDecision`, false);
  assertExactKeys(manifest.sourceOffer, schema.sourceOfferExactFields, `${label}.sourceOffer`);
  assertHashRecord(manifest.sourceOffer.notice, `${label}.sourceOffer.notice`);
  assertExactKeys(manifest.geometryQuality.postgisTempValidation, schema.postgisTempValidationExactFields, `${label}.geometryQuality.postgisTempValidation`);
  assertHashRecord(manifest.geometryQuality.postgisTempValidation, `${label}.geometryQuality.postgisTempValidation`, false);
  assertExactKeys(manifest.normalizationTool, schema.toolRecordExactFields, `${label}.normalizationTool`);
  assertHashRecord(manifest.normalizationTool, `${label}.normalizationTool`, false);
  assertExactKeys(manifest.minimizationTool, schema.toolRecordExactFields, `${label}.minimizationTool`);
  assertHashRecord(manifest.minimizationTool, `${label}.minimizationTool`, false);

  if (manifest.pathBases.postgisTempValidation !== "repository_root") throw new Error(`${label}: PostGIS receipt path base must be repository_root`);
  if (manifest.rightsDecision.rightsState !== "cleared") throw new Error(`${label}: rights state is not cleared`);
  if (manifest.absenceClaimAtDefaultRadiusAllowed !== false) throw new Error(`${label}: absence claim must remain disabled`);
  if (manifest.officialStatus !== "open_context_not_official") throw new Error(`${label}: official status boundary violated`);
}

export async function validateLinkedRightsDecision(manifest, contract, repositoryRoot = process.cwd(), label = "casePackManifest") {
  const rightsPath = path.resolve(repositoryRoot, manifest.rightsDecision.path);
  const rightsBytes = await readFile(rightsPath);
  if (rightsBytes.byteLength !== manifest.rightsDecision.bytes || sha256(rightsBytes) !== manifest.rightsDecision.sha256) {
    throw new Error(`${label}: linked rights decision hash/bytes mismatch`);
  }
  const rights = JSON.parse(rightsBytes.toString("utf8"));
  validateRightsDecision(rights, contract, `${label}.linkedRightsDecision`);
  if (rights.decisionId !== manifest.rightsDecision.decisionId
    || rights.decisionVersion !== manifest.rightsDecision.decisionVersion
    || rights.rightsState !== manifest.rightsDecision.rightsState
    || rights.permissionPhase !== manifest.rightsDecision.permissionPhase) {
    throw new Error(`${label}: linked rights decision identity/state mismatch`);
  }
  return rights;
}

function assertRecordEquality(left, right, label) {
  if (left.path !== right.path || left.bytes !== right.bytes || left.sha256 !== right.sha256) {
    throw new Error(`${label}: path/bytes/SHA-256 records differ`);
  }
}

async function verifyPhysicalRecord(record, baseDirectory, label) {
  assertHashRecord(record, label, false);
  const [baseRealPath, targetRealPath] = await Promise.all([
    realpath(baseDirectory),
    realpath(path.resolve(baseDirectory, record.path))
  ]);
  if (targetRealPath !== baseRealPath && !targetRealPath.startsWith(`${baseRealPath}${path.sep}`)) {
    throw new Error(`${label}: resolved path escapes its declared base`);
  }
  const targetLstat = await lstat(path.resolve(baseDirectory, record.path));
  if (targetLstat.isSymbolicLink()) throw new Error(`${label}: symlink evidence records are prohibited`);
  const bytes = await readFile(targetRealPath);
  if (bytes.byteLength !== record.bytes || sha256(bytes) !== record.sha256) {
    throw new Error(`${label}: physical bytes/hash mismatch`);
  }
}

export async function validateCasePackPhysicalBindings(manifest, repositoryRoot, caseDirectory, label = "casePackManifest") {
  const caseFileByPath = new Map();
  for (const [index, record] of manifest.files.entries()) {
    if (caseFileByPath.has(record.path)) throw new Error(`${label}.files: duplicate path ${record.path}`);
    caseFileByPath.set(record.path, record);
    await verifyPhysicalRecord(record, caseDirectory, `${label}.files[${index}]`);
  }

  const casePackAliases = [
    ["query", manifest.query],
    ["acquisitionReceipt", manifest.acquisitionReceipt],
    ["normalizedSnapshot", manifest.normalizedSnapshot],
    ["spatialIndex", manifest.spatialIndex],
    ["normalizationReceipt", manifest.normalizationReceipt],
    ["acquisition.minimizedSnapshot", manifest.acquisition.minimizedSnapshot]
  ];
  for (const [alias, record] of casePackAliases) {
    const fileRecord = caseFileByPath.get(record.path);
    if (!fileRecord) throw new Error(`${label}.${alias}: no matching files[] record`);
    assertRecordEquality(record, fileRecord, `${label}.${alias}`);
    await verifyPhysicalRecord(record, caseDirectory, `${label}.${alias}`);
  }

  await verifyPhysicalRecord(manifest.rightsDecision, repositoryRoot, `${label}.rightsDecision`);
  await verifyPhysicalRecord(manifest.normalizationTool, repositoryRoot, `${label}.normalizationTool`);
  await verifyPhysicalRecord(manifest.minimizationTool, repositoryRoot, `${label}.minimizationTool`);
  await verifyPhysicalRecord(manifest.geometryQuality.postgisTempValidation, repositoryRoot, `${label}.geometryQuality.postgisTempValidation`);
  await verifyPhysicalRecord(manifest.sourceOffer.notice, repositoryRoot, `${label}.sourceOffer.notice`);

  if (manifest.sourceOffer.noticePath !== manifest.sourceOffer.notice.path
    || manifest.sourceOffer.noticeBytes !== manifest.sourceOffer.notice.bytes
    || manifest.sourceOffer.noticeSha256 !== manifest.sourceOffer.notice.sha256) {
    throw new Error(`${label}.sourceOffer: flattened and nested NOTICE records differ`);
  }
  if (manifest.sourceOffer.transformationPath !== manifest.normalizationTool.path) {
    throw new Error(`${label}.sourceOffer: transformationPath is not bound by normalizationTool`);
  }
}
