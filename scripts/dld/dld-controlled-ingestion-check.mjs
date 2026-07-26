import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const catalogPath = resolve(root, "data/external/catalog/dld_dubai_pulse_dataset_catalog.v1.json");
const catalogCheck = resolve(root, "scripts/dld/dld-catalog-check.mjs");
const prepareScript = resolve(root, "scripts/dld/prepare-dld-snapshot.mjs");

function run(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  if (result.status !== expectedStatus) {
    throw new Error([
      `Unexpected exit status ${result.status}; expected ${expectedStatus}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join("\n"));
  }
  return result;
}

for (const path of [catalogPath, catalogCheck, prepareScript]) {
  if (!existsSync(path)) throw new Error(`Required DLD control file is missing: ${path}`);
}

run([catalogCheck, `--catalog=${catalogPath}`]);

const temp = mkdtempSync(join(tmpdir(), "geoai-dld-control-"));
try {
  const sampleCsv = join(temp, "transactions.csv");
  const blockedReceipt = join(temp, "rights-blocked.json");
  const approvedReceipt = join(temp, "rights-approved.json");
  const testCatalogPath = join(temp, "catalog-approved.json");
  const outputDir = join(temp, "output");

  writeFileSync(sampleCsv, [
    "area_name_en,transaction_date,actual_worth,procedure_area,notes",
    "Dubai Marina,14-02-2026,1000000,100,first",
    "Dubai Marina,15-02-2026,1200000,120,second",
    "Business Bay,2026-03-01,800000,80,third",
    "Business Bay,02/03/2026,900000,90,fourth"
  ].join("\n"), "utf8");

  writeFileSync(blockedReceipt, JSON.stringify({
    datasetId: "dld_transactions-open",
    status: "pending",
    approvedAt: null,
    approvedBy: null,
    termsReference: null,
    permittedUses: []
  }, null, 2));

  const blocked = run([
    prepareScript,
    "--dataset=dld_transactions-open",
    `--file=${sampleCsv}`,
    `--rights-receipt=${blockedReceipt}`,
    `--catalog=${catalogPath}`,
    `--out-dir=${outputDir}`
  ], 2);
  if (!/approved rights receipt/i.test(blocked.stderr)) {
    throw new Error("Fail-closed rights gate did not report the expected block reason");
  }

  const testCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const transactionDataset = testCatalog.datasets.find((item) => item.datasetId === "dld_transactions-open");
  if (!transactionDataset) throw new Error("dld_transactions-open is missing from catalog");
  transactionDataset.rightsStatus = "permitted";
  transactionDataset.accessStatus = "granted_or_public_download_verified";
  transactionDataset.custodyStatus = "approved_private";
  transactionDataset.qualityStatus = "not_acquired";
  transactionDataset.scoringStatus = "blocked";
  writeFileSync(testCatalogPath, JSON.stringify(testCatalog, null, 2));

  writeFileSync(approvedReceipt, JSON.stringify({
    datasetId: "dld_transactions-open",
    status: "approved",
    approvedAt: "2026-07-26T00:00:00Z",
    approvedBy: "automated-test-only",
    termsReference: "TEST-ONLY-NOT-A-REAL-RIGHTS-RECEIPT",
    permittedUses: ["persist_private_raw", "transform", "internal_scoring_aggregate"],
    expiryAt: null
  }, null, 2));

  const prepared = run([
    prepareScript,
    "--dataset=dld_transactions-open",
    `--file=${sampleCsv}`,
    `--rights-receipt=${approvedReceipt}`,
    `--catalog=${testCatalogPath}`,
    `--out-dir=${outputDir}`
  ]);

  const result = JSON.parse(prepared.stdout);
  if (result.rowCount !== 4 || result.aggregateRowCount !== 2 || result.scoringAllowed !== false) {
    throw new Error(`Unexpected preparation result: ${prepared.stdout}`);
  }

  const quality = JSON.parse(readFileSync(join(outputDir, "quality.json"), "utf8"));
  const release = JSON.parse(readFileSync(join(outputDir, "release_manifest.json"), "utf8"));
  const aggregate = readFileSync(join(outputDir, "aggregate_feature_input.csv"), "utf8");

  if (quality.status !== "quarantined_pending_acceptance") throw new Error("Prepared snapshot must remain quarantined");
  if (quality.scoringAllowed !== false || release.scoringAllowed !== false) throw new Error("Preparation must never activate scoring");
  if (release.rawRowsPersistedByThisScript !== false) throw new Error("Preparation script unexpectedly persisted raw rows");
  if (!aggregate.includes("Dubai Marina,2026-02,2") || !aggregate.includes("Business Bay,2026-03,2")) {
    throw new Error("Aggregate output is missing expected area/month groups");
  }

  console.log(JSON.stringify({
    status: "ok",
    checks: [
      "catalog is internally consistent",
      "pending rights receipt is rejected",
      "approved test-only receipt permits quarantine preparation",
      "CSV is processed as a stream, including date normalization",
      "aggregate output is created without raw-row persistence",
      "scoring remains disabled after preparation"
    ]
  }, null, 2));
} finally {
  rmSync(temp, { recursive: true, force: true });
}
