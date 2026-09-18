// Offline evidence contract only. No child processes, credential reads or network calls.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
export const targetRef = "pphdqkurxneyagvnnjdt";
const manifestRaw = readFileSync(path.join(root, "supabase/migration-ledger-baseline.json"));
export const manifest = JSON.parse(manifestRaw);
export const digest = (value) => createHash("sha256").update(value).digest("hex");
const migrationDirectory = path.join(root, "supabase/migrations");
const filenames = readdirSync(migrationDirectory).filter((file) => file.endsWith(".sql")).sort();
const hash = createHash("sha256");
for (const file of filenames) hash.update(file).update("\0").update(readFileSync(path.join(migrationDirectory, file))).update("\0");
export const binding = { sqlTreeSha256: hash.digest("hex"), manifestSha256: digest(manifestRaw) };
export const pendingVersions = manifest.pendingMigrations.map(({ version }) => version).sort();
const preledgerVersion = manifest.preLedgerReconciliations[0].version;
const expectedFiles = [...manifest.preLedgerReconciliations, ...manifest.liveAppliedMigrations, ...manifest.pendingMigrations]
  .map(({ version, name }) => `${version}_${name}.sql`).sort();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const localErrors = [];
if (!same(filenames, expectedFiles) || filenames.length !== 21) localErrors.push("Canonical file inventory drift.");
for (const entry of [...manifest.preLedgerReconciliations, ...manifest.liveAppliedMigrations]) {
  const filename = `${entry.version}_${entry.name}.sql`;
  if (!filenames.includes(filename)) continue;
  const text = readFileSync(path.join(migrationDirectory, filename), "utf8").replace(/\n$/, "");
  if (Buffer.byteLength(text) !== (entry.statementBytes ?? entry.fileBytes) || createHash("md5").update(text).digest("hex") !== (entry.statementMd5 ?? entry.fileMd5)) localErrors.push(`Immutable migration drift: ${entry.version}.`);
}

export const expectedFingerprint = {
  table_owner: "postgres", rls: true, force_rls: false, comment: null,
  columns: [
    { name: "id", type: "bigint", default: null, not_null: true },
    { name: "name", type: "text", default: null, not_null: true },
    { name: "created_at", type: "timestamp with time zone", default: "now()", not_null: false }
  ],
  primary_key: ["id"],
  policies: [{ name: "public can read geoai healthcheck", roles: ["anon", "authenticated"], cmd: "SELECT", permissive: "PERMISSIVE", using: "true", check: null }],
  known_seed_matches: true,
  caller_privileges: { anon: ["REFERENCES", "SELECT", "TRIGGER", "TRUNCATE"], authenticated: ["REFERENCES", "SELECT", "TRIGGER", "TRUNCATE"] }
};

function fresh(timestamp, nowMs) {
  const observed = Date.parse(timestamp);
  return Number.isFinite(observed) && observed <= nowMs && nowMs - observed <= 30 * 60_000;
}

export function validateReadback(receipt, nowMs = Date.now()) {
  const errors = [...localErrors];
  if (receipt?.schemaVersion !== "geoai-populated-target-readback-v1") errors.push("Wrong readback schema.");
  if (receipt?.projectRef !== targetRef || receipt?.environment !== "development" || receipt?.productionProject !== false) errors.push("Wrong target/environment.");
  if (!fresh(receipt?.observedAt, nowMs)) errors.push("Readback is missing, future-dated or older than 30 minutes.");
  for (const key of Object.keys(binding)) if (receipt?.[key] !== binding[key]) errors.push(`Wrong ${key} binding.`);
  if (receipt?.collection !== "read_only_catalog_and_known_health_seed_predicate_no_customer_or_auth_rows") errors.push("Unexpected collection scope.");
  const fingerprint = receipt?.healthcheck;
  for (const [key, value] of Object.entries(expectedFingerprint)) {
    // Policy/column object key order is immaterial; array order is part of the contract.
    if (!structuralEqual(fingerprint?.[key], value)) errors.push(`Healthcheck fingerprint mismatch: ${key}.`);
  }
  const rows = receipt?.ledger;
  if (!Array.isArray(rows)) return [...errors, "Missing ledger."];
  const versions = rows.map((row) => row?.version);
  const baseline = manifest.liveAppliedMigrations.map((row) => row.version);
  const repaired = [...baseline, preledgerVersion].sort();
  if (!same(versions, baseline) && !same(versions, repaired)) errors.push("Ledger must be exactly the ordered historical 12 or separately repaired 13 versions.");
  for (const expected of manifest.liveAppliedMigrations) {
    const actual = rows.find((row) => row?.version === expected.version);
    if (!actual || actual.name !== expected.name || actual.statementCount !== 1 || actual.statementBytes !== expected.statementBytes || actual.statementMd5 !== expected.statementMd5) errors.push(`Stored statement metadata differs for ${expected.version}.`);
  }
  return errors;
}

function structuralEqual(actual, expected) {
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every((entry, index) => structuralEqual(actual[index], entry));
  if (expected && typeof expected === "object") return actual && typeof actual === "object" && same(Object.keys(actual).sort(), Object.keys(expected).sort()) && Object.entries(expected).every(([key, value]) => structuralEqual(actual[key], value));
  return actual === expected;
}

export function validatePlan(plan, receipt, readbackSha256, nowMs = Date.now()) {
  const errors = validateReadback(receipt, nowMs);
  if (receipt?.ledger?.length !== 13) errors.push("A fresh post-repair 13-entry readback is required before dry-run evidence.");
  if (plan?.schemaVersion !== "geoai-supplied-dryrun-plan-v1" || plan?.resolvedProjectRef !== targetRef) errors.push("Wrong dry-run target/schema.");
  if (!fresh(plan?.observedAt, nowMs) || Date.parse(plan?.observedAt) < Date.parse(receipt?.observedAt)) errors.push("Dry-run evidence is stale, future-dated or precedes readback.");
  if (plan?.readbackSha256 !== readbackSha256) errors.push("Dry-run evidence is not bound to this readback.");
  for (const key of Object.keys(binding)) if (plan?.[key] !== binding[key]) errors.push(`Dry-run ${key} mismatch.`);
  if (!same(plan?.argv, ["db", "push", "--linked", "--dry-run", "--include-all"])) errors.push("Dry-run argv must include include-all and exclude apply/seed/roles flags.");
  if (plan?.exitCode !== 0 || !same(plan?.versions, pendingVersions)) errors.push("Dry-run must report exactly the eight pending versions in order and exit zero.");
  if (!/^[a-f0-9]{64}$/.test(plan?.rawOutputSha256 ?? "")) errors.push("Missing raw-output digest; operator must retain output separately.");
  return errors;
}

export function evaluate(receipt, receiptSha256, plan, nowMs = Date.now()) {
  const errors = receipt ? (plan ? validatePlan(plan, receipt, receiptSha256, nowMs) : validateReadback(receipt, nowMs)) : [...localErrors];
  return {
    ok: errors.length === 0, targetRef, ...binding, pendingVersions,
    stage: !receipt ? "inventory_only" : errors.length ? "rejected" : plan ? "supplied_dryrun_contract_valid_separate_apply_approval_required" : receipt.ledger.length === 12 ? "supplied_pre_repair_contract_valid_separate_repair_approval_required" : "supplied_post_repair_contract_valid_dryrun_not_performed",
    suppliedEvidenceOnly: true, remoteStateVerified: false, networkOrDatabaseAccessPerformed: false,
    hostedApplyReady: false, mutationPerformed: false, errors,
    remainingGates: ["Independent live readback and clean exact commit binding", "Backup plus tested restore; Data API exposure decision", "Separate owner approval for each repair/dry-run/apply stage", "Fresh exact-candidate upgrade replay and drift/advisors", "Post-apply 21-entry ledger, 16-RPC containment and real JWT tenant/persona tests"],
    warning: "This checks supplied JSON attestations, not live state, execution authority or raw CLI output. Never invoke the existing auto-apply wrapper for this restored target."
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {};
    for (let i = 2; i < process.argv.length; i += 2) {
      const key = process.argv[i];
      if (!["--readback", "--expected-readback-sha256", "--plan", "--expected-plan-sha256"].includes(key) || options[key] || !process.argv[i + 1]) throw new Error("Invalid or duplicate argument.");
      options[key] = process.argv[i + 1];
    }
    let receipt; let plan; let receiptSha256;
    for (const key of ["readback", "plan"]) {
      const file = options[`--${key}`]; const expected = options[`--expected-${key}-sha256`];
      if (Boolean(file) !== Boolean(expected) || (expected && !/^[a-f0-9]{64}$/.test(expected))) throw new Error(`A ${key} file and separate SHA-256 binding are both required.`);
      if (file) {
        const raw = readFileSync(file);
        if (digest(raw) !== expected) throw new Error(`${key} digest mismatch.`);
        if (key === "readback") { receipt = JSON.parse(raw); receiptSha256 = expected; } else plan = JSON.parse(raw);
      }
    }
    if (plan && !receipt) throw new Error("Dry-run evidence requires readback.");
    const result = evaluate(receipt, receiptSha256, plan);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    // Do not echo untrusted file contents/paths or parse errors that might include secrets.
    console.error("Offline preflight rejected: invalid arguments, file, JSON or digest binding. No remote action performed.");
    process.exitCode = 1;
  }
}
