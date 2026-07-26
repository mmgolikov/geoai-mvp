import { readFileSync } from "node:fs";

const DEFAULT_CATALOG = "data/external/catalog/dld_dubai_pulse_dataset_catalog.v1.json";
const allowedAccess = new Set([
  "permission_required",
  "catalog_reconciliation_required",
  "granted_or_public_download_verified"
]);
const allowedCustody = new Set(["none", "approved_private"]);
const allowedQuality = new Set(["not_acquired", "quarantined", "accepted", "rejected"]);

function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function fail(message) {
  console.error(`DLD catalog check failed: ${message}`);
  process.exitCode = 1;
}

function requireField(value, path) {
  if (value === null || value === undefined || value === "") {
    fail(`${path} is required`);
    return false;
  }
  return true;
}

const catalogPath = argValue("catalog", DEFAULT_CATALOG);
let catalog;
try {
  catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
} catch (error) {
  console.error(`DLD catalog check failed: cannot read ${catalogPath}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

requireField(catalog.catalogVersion, "catalogVersion");
requireField(catalog.provider, "provider");
requireField(catalog.requiredCaveat, "requiredCaveat");
requireField(catalog.changeRequestUrl, "changeRequestUrl");

if (!Array.isArray(catalog.datasets) || catalog.datasets.length === 0) {
  fail("datasets must be a non-empty array");
}

const ids = new Set();
let unresolvedRights = 0;
let permissionGated = 0;
let piiHigh = 0;
let rehearsalCandidates = 0;
let activeScoringDatasets = 0;

for (const [index, dataset] of (catalog.datasets ?? []).entries()) {
  const path = `datasets[${index}]`;
  for (const field of [
    "datasetId",
    "family",
    "displayName",
    "format",
    "licenseStatus",
    "rightsStatus",
    "accessStatus",
    "custodyStatus",
    "qualityStatus",
    "scoringStatus",
    "piiRisk",
    "approvedProjectionTarget"
  ]) {
    requireField(dataset[field], `${path}.${field}`);
  }

  if (ids.has(dataset.datasetId)) fail(`${path}.datasetId duplicates ${dataset.datasetId}`);
  ids.add(dataset.datasetId);

  if (!allowedAccess.has(dataset.accessStatus)) fail(`${path}.accessStatus has unsupported value ${dataset.accessStatus}`);
  if (!allowedCustody.has(dataset.custodyStatus)) fail(`${path}.custodyStatus has unsupported value ${dataset.custodyStatus}`);
  if (!allowedQuality.has(dataset.qualityStatus)) fail(`${path}.qualityStatus has unsupported value ${dataset.qualityStatus}`);
  if (!Array.isArray(dataset.intendedFeatures)) fail(`${path}.intendedFeatures must be an array`);

  const rightsPermitted = dataset.rightsStatus === "permitted";
  const accessGranted = dataset.accessStatus === "granted_or_public_download_verified";
  const custodyApproved = dataset.custodyStatus === "approved_private";
  const qualityAccepted = dataset.qualityStatus === "accepted";
  const aggregateApproved = dataset.scoringStatus === "approved_aggregate_only";

  if (!rightsPermitted) unresolvedRights += 1;
  if (dataset.accessStatus === "permission_required") permissionGated += 1;
  if (dataset.piiRisk === "high") piiHigh += 1;
  if (dataset.firstRehearsalCandidate === true) rehearsalCandidates += 1;

  if (aggregateApproved) {
    activeScoringDatasets += 1;
    if (!(rightsPermitted && accessGranted && custodyApproved && qualityAccepted)) {
      fail(`${path} is scoring-active without all rights/access/custody/quality gates`);
    }
  }

  if (dataset.piiRisk === "high" && !/aggregate|none/i.test(dataset.approvedProjectionTarget)) {
    fail(`${path}.approvedProjectionTarget must be aggregate-only or none for high-PII datasets`);
  }

  if (dataset.downloadPath && !String(dataset.downloadPath).startsWith("/dataset/")) {
    fail(`${path}.downloadPath must be a relative official portal path`);
  }
}

if (unresolvedRights > 0) {
  if (catalog.scoringAllowed !== false) fail("root scoringAllowed must be false while dataset rights remain unresolved");
  if (catalog.evidenceUsedAllowed !== false) fail("root evidenceUsedAllowed must be false while dataset rights remain unresolved");
  if (catalog.bulkAcquisitionAllowed !== false) fail("root bulkAcquisitionAllowed must be false while dataset rights remain unresolved");
}

if (!Array.isArray(catalog.rightsPolicy?.requiredBeforeAcquisition) || catalog.rightsPolicy.requiredBeforeAcquisition.length < 4) {
  fail("rightsPolicy.requiredBeforeAcquisition is incomplete");
}

if (!Array.isArray(catalog.rightsPolicy?.blockedMethods) || !catalog.rightsPolicy.blockedMethods.some((item) => /captcha/i.test(item))) {
  fail("rightsPolicy.blockedMethods must explicitly forbid CAPTCHA bypass");
}

if (process.exitCode) process.exit(process.exitCode);

console.log(JSON.stringify({
  status: "ok",
  catalogPath,
  catalogVersion: catalog.catalogVersion,
  datasets: catalog.datasets.length,
  unresolvedRights,
  permissionGated,
  highPiiDatasets: piiHigh,
  rehearsalCandidates,
  activeScoringDatasets,
  scoringAllowed: catalog.scoringAllowed
}, null, 2));
