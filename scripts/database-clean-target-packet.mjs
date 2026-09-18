import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

const targetProjectRef = "pphdqkurxneyagvnnjdt";
const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);
const historicalManifestUrl = new URL("../supabase/migration-ledger-baseline.json", import.meta.url);
const canonicalFilename = /^(\d{14})_([a-z0-9_]+)[.]sql$/;
const requiredAbsentSchemas = ["api", "geoai_private", "geoai_dld_private", "geoai_dld_feature"];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArguments(values) {
  const parsed = { readbackPath: null, expectedReadbackSha256: null, maxAgeMinutes: 30, selfTest: false };
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (argument === "--self-test") {
      parsed.selfTest = true;
    } else if (argument === "--readback") {
      parsed.readbackPath = values[++index] ?? null;
    } else if (argument === "--expected-readback-sha256") {
      parsed.expectedReadbackSha256 = values[++index]?.toLowerCase() ?? null;
    } else if (argument === "--max-age-minutes") {
      parsed.maxAgeMinutes = Number(values[++index]);
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!Number.isFinite(parsed.maxAgeMinutes) || parsed.maxAgeMinutes <= 0 || parsed.maxAgeMinutes > 60) {
    throw new Error("--max-age-minutes must be greater than 0 and no more than 60");
  }
  if (parsed.readbackPath && !parsed.expectedReadbackSha256) {
    throw new Error("--expected-readback-sha256 is required with --readback");
  }
  if (parsed.expectedReadbackSha256 && !parsed.readbackPath) {
    throw new Error("--readback is required with --expected-readback-sha256");
  }
  if (parsed.expectedReadbackSha256 && !/^[0-9a-f]{64}$/.test(parsed.expectedReadbackSha256)) {
    throw new Error("--expected-readback-sha256 must be a lowercase SHA-256 digest");
  }
  return parsed;
}

function forbiddenReadbackFields(value, path = "") {
  if (!value || typeof value !== "object") return [];
  const failures = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (/(password|secret|service.?role|access.?token|refresh.?token|auth.?users?|user.?rows?)/i.test(key)) {
      failures.push(childPath);
    }
    failures.push(...forbiddenReadbackFields(child, childPath));
  }
  return failures;
}

function validateReadback(receipt, { nowMs, maxAgeMinutes }) {
  const failures = [];
  if (receipt?.schemaVersion !== "geoai-empty-target-readback-v1") failures.push("readback schemaVersion is not geoai-empty-target-readback-v1");
  if (receipt?.projectRef !== targetProjectRef) failures.push("readback projectRef does not match the exact restored development target");
  if (receipt?.environment !== "development" || receipt?.productionProject !== false) failures.push("readback is not explicitly non-Production development");

  const observedMs = Date.parse(receipt?.observedAt ?? "");
  if (!Number.isFinite(observedMs)) {
    failures.push("readback observedAt is not a valid timestamp");
  } else {
    const ageMs = nowMs - observedMs;
    if (ageMs < -5 * 60_000) failures.push("readback observedAt is more than five minutes in the future");
    if (ageMs > maxAgeMinutes * 60_000) failures.push(`readback is older than ${maxAgeMinutes} minutes`);
  }

  if (receipt?.publicTableCount !== 0) failures.push("readback publicTableCount is not zero");
  if (!Array.isArray(receipt?.migrationVersions) || receipt.migrationVersions.length !== 0) failures.push("readback migrationVersions is not an empty array");
  if (!Array.isArray(receipt?.advisors) || receipt.advisors.length !== 0) failures.push("readback advisors is not an empty array");
  if (receipt?.authInspection !== "managed_catalog_only_no_user_data") failures.push("readback does not attest that Auth user data was not inspected");
  for (const schema of requiredAbsentSchemas) {
    if (receipt?.applicationSchemas?.[schema] !== false) failures.push(`readback does not prove schema ${schema} absent`);
  }
  const forbidden = forbiddenReadbackFields(receipt);
  if (forbidden.length) failures.push(`readback contains forbidden secret/Auth-user-data fields: ${forbidden.join(", ")}`);
  return failures;
}

function runSelfTest() {
  const nowMs = Date.now();
  const valid = {
    schemaVersion: "geoai-empty-target-readback-v1",
    observedAt: new Date(nowMs).toISOString(),
    projectRef: targetProjectRef,
    environment: "development",
    productionProject: false,
    publicTableCount: 0,
    migrationVersions: [],
    applicationSchemas: Object.fromEntries(requiredAbsentSchemas.map((schema) => [schema, false])),
    advisors: [],
    authInspection: "managed_catalog_only_no_user_data"
  };
  const scenarios = [
    ["valid", valid, true],
    ["wrong ref", { ...valid, projectRef: "wrong" }, false],
    ["stale", { ...valid, observedAt: new Date(nowMs - 31 * 60_000).toISOString() }, false],
    ["nonempty table catalog", { ...valid, publicTableCount: 1 }, false],
    ["nonempty ledger", { ...valid, migrationVersions: ["20260705100000"] }, false],
    ["present api schema", { ...valid, applicationSchemas: { ...valid.applicationSchemas, api: true } }, false],
    ["Auth user data field", { ...valid, authUsers: [] }, false]
  ];
  const failures = scenarios
    .filter(([, receipt, expectedValid]) => (validateReadback(receipt, { nowMs, maxAgeMinutes: 30 }).length === 0) !== expectedValid)
    .map(([name]) => `self-test scenario failed: ${name}`);
  if (failures.length) throw new Error(failures.join("; "));
}

const args = parseArguments(process.argv.slice(2));
if (args.selfTest) runSelfTest();

const migrationFiles = (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql")).sort();
const inventory = [];
const versions = new Set();
const treeHash = createHash("sha256");
for (const filename of migrationFiles) {
  const match = filename.match(canonicalFilename);
  if (!match) throw new Error(`Non-canonical migration filename: ${filename}`);
  const [, version, name] = match;
  if (versions.has(version)) throw new Error(`Duplicate migration version: ${version}`);
  versions.add(version);
  const content = await readFile(new URL(filename, migrationsUrl));
  const digest = sha256(content);
  inventory.push({ position: inventory.length + 1, version, name, filename, bytes: content.byteLength, sha256: digest });
  treeHash.update(filename);
  treeHash.update("\0");
  treeHash.update(content);
  treeHash.update("\0");
}
if (inventory.length !== 23) throw new Error(`Expected exactly 23 canonical migrations, found ${inventory.length}`);

const historicalManifest = JSON.parse(await readFile(historicalManifestUrl, "utf8"));
let readbackEvidence = null;
let readbackFailures = ["fresh project-bound empty-target readback was not supplied"];
if (args.readbackPath) {
  const rawReadback = await readFile(args.readbackPath);
  const actualReadbackSha256 = sha256(rawReadback);
  const receipt = JSON.parse(rawReadback.toString("utf8"));
  readbackFailures = validateReadback(receipt, { nowMs: Date.now(), maxAgeMinutes: args.maxAgeMinutes });
  if (actualReadbackSha256 !== args.expectedReadbackSha256) readbackFailures.push("readback SHA-256 does not match the separately supplied approval binding");
  readbackEvidence = {
    path: args.readbackPath,
    sha256: actualReadbackSha256,
    observedAt: receipt.observedAt,
    projectRef: receipt.projectRef
  };
}

const output = {
  ok: !args.readbackPath || readbackFailures.length === 0,
  status: readbackFailures.length === 0 ? "offline_empty_target_contract_verified" : "offline_inventory_only_not_apply_ready",
  emptyTargetReadbackVerified: Boolean(args.readbackPath) && readbackFailures.length === 0,
  hostedApplyReady: false,
  remoteStateVerified: false,
  networkOrDatabaseAccessPerformed: false,
  mutationPerformed: false,
  target: {
    projectRef: targetProjectRef,
    environment: "development",
    productionProject: false,
    requiredState: {
      publicTableCount: 0,
      migrationVersions: [],
      absentApplicationSchemas: requiredAbsentSchemas,
      advisors: [],
      authInspection: "managed_catalog_only_no_user_data"
    }
  },
  freshness: {
    maximumAgeMinutes: args.maxAgeMinutes,
    readbackSha256MustBeBoundSeparately: true
  },
  historicalManifest: {
    observedAt: historicalManifest.observedAt,
    contentSourceSha: historicalManifest.contentSourceSha,
    treatment: "provenance_only_not_current_target_state"
  },
  canonicalMigrationCount: inventory.length,
  canonicalMigrationTreeSha256: treeHash.digest("hex"),
  canonicalMigrations: inventory,
  readbackEvidence,
  blockers: readbackFailures,
  operatorRules: [
    "Do not run migration repair for the explicitly empty target.",
    "Do not use scripts/apply-supabase-migration.mjs for this empty-target replay.",
    "This helper does not execute supabase, psql, HTTP, SQL, migration repair or database writes.",
    "A later exact-target remote dry-run must enumerate exactly these 23 versions only for an independently verified empty target."
  ]
};

console.log(JSON.stringify(output, null, 2));
if (args.readbackPath && readbackFailures.length > 0) process.exit(1);
