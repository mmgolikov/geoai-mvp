import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const migrationsDirectory = path.join(root, "supabase", "migrations");
const manifestPath = path.join(root, "supabase", "migration-ledger-baseline.json");
const filenamePattern = /^(\d{14})_([a-z0-9_]+)\.sql$/;
const failures = [];

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const files = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const parsed = [];
const seenVersions = new Set();

for (const file of files) {
  const match = file.match(filenamePattern);
  if (!match) {
    failures.push(`Non-canonical migration filename: ${file}`);
    continue;
  }

  const [, version, name] = match;
  if (seenVersions.has(version)) failures.push(`Duplicate migration version: ${version}`);
  seenVersions.add(version);
  parsed.push({ file, version, name });
}

const live = manifest.liveAppliedMigrations ?? [];
const preLedger = manifest.preLedgerReconciliations ?? [];
if (live.length !== manifest.canonicalBaselineCount) {
  failures.push("Ledger manifest count does not match liveAppliedMigrations length");
}

const parsedByVersion = new Map(parsed.map((migration) => [migration.version, migration]));
const liveVersions = new Set(live.map((migration) => migration.version));
const preLedgerVersions = new Set(preLedger.map((migration) => migration.version));
if (new Set(live.map((migration) => migration.version)).size !== live.length) {
  failures.push("Applied ledger manifest contains duplicate versions");
}
if (live.some((migration, index) => index > 0 && migration.version <= live[index - 1].version)) {
  failures.push("Applied ledger manifest entries are not strictly version-ordered");
}

for (let index = 0; index < preLedger.length; index += 1) {
  const expected = preLedger[index];
  const actual = parsed[index];
  const expectedFile = `${expected.version}_${expected.name}.sql`;
  if (!actual || actual.file !== expectedFile) {
    failures.push(`Pre-ledger replay position ${index + 1} must be ${expectedFile}; found ${actual?.file ?? "nothing"}`);
    continue;
  }
  const fileText = await readFile(path.join(migrationsDirectory, actual.file), "utf8");
  const statement = fileText.endsWith("\n") ? fileText.slice(0, -1) : fileText;
  const bytes = Buffer.byteLength(statement, "utf8");
  const md5 = createHash("md5").update(statement, "utf8").digest("hex");
  if (bytes !== expected.fileBytes || md5 !== expected.fileMd5) {
    failures.push(`${actual.file} drifted from the declared pre-ledger reconciliation artifact`);
  }
}

for (let index = 0; index < live.length; index += 1) {
  const expected = live[index];
  const actual = parsedByVersion.get(expected.version);
  const expectedFile = `${expected.version}_${expected.name}.sql`;

  if (!actual || actual.file !== expectedFile) {
    failures.push(`Applied ledger entry ${expected.version} must be ${expectedFile}; found ${actual?.file ?? "nothing"}`);
    continue;
  }

  const fileText = await readFile(path.join(migrationsDirectory, actual.file), "utf8");
  const ledgerStatement = fileText.endsWith("\n") ? fileText.slice(0, -1) : fileText;
  const bytes = Buffer.byteLength(ledgerStatement, "utf8");
  const md5 = createHash("md5").update(ledgerStatement, "utf8").digest("hex");

  if (bytes !== expected.statementBytes) {
    failures.push(`${actual.file} byte length drifted: expected ${expected.statementBytes}, found ${bytes}`);
  }
  if (md5 !== expected.statementMd5) {
    failures.push(`${actual.file} checksum drifted: expected ${expected.statementMd5}, found ${md5}`);
  }
}

const lastAppliedVersion = live.at(-1)?.version;
if (!lastAppliedVersion) failures.push("Ledger manifest has no applied baseline");

const pendingMigrations = manifest.pendingMigrations ?? [];
const pendingFiles = new Set(pendingMigrations.map((pending) => `${pending.version}_${pending.name}.sql`));
const pendingVersions = new Set(pendingMigrations.map((pending) => pending.version));
if (pendingVersions.size !== pendingMigrations.length) failures.push("Pending manifest contains duplicate versions");
for (const pending of pendingMigrations) {
  const expectedFile = `${pending.version}_${pending.name}.sql`;
  if (!files.includes(expectedFile)) failures.push(`Manifest pending migration is missing: ${expectedFile}`);
  if (liveVersions.has(pending.version) || preLedgerVersions.has(pending.version)) {
    failures.push(`Migration version is declared in more than one ledger state: ${pending.version}`);
  }
}

for (const migration of parsed) {
  if (!preLedgerVersions.has(migration.version) && !liveVersions.has(migration.version) && !pendingFiles.has(migration.file)) {
    failures.push(`Migration is not tracked in the ledger manifest: ${migration.file}`);
  }
}

const pendingInsideAppliedRange = pendingMigrations
  .filter((pending) => lastAppliedVersion && pending.version < lastAppliedVersion)
  .map((pending) => pending.version)
  .sort();
const declaredTopology = manifest.ledgerTopology ?? {};
const declaredPendingInside = Array.isArray(declaredTopology.pendingVersionsInsideAppliedRange)
  ? [...declaredTopology.pendingVersionsInsideAppliedRange].sort()
  : [];
if (declaredTopology.kind !== "noncontiguous_applied_version_set") {
  failures.push("Ledger topology must explicitly declare the noncontiguous hosted applied version set");
}
if (JSON.stringify(declaredPendingInside) !== JSON.stringify(pendingInsideAppliedRange)) {
  failures.push("Declared pending versions inside the applied range do not match the manifest-derived ledger holes");
}
if (pendingInsideAppliedRange.length !== 7 || pendingInsideAppliedRange.some((version) => !version.startsWith("20260716"))) {
  failures.push("Expected exactly the seven 20260716 migrations to remain pending inside the hosted applied range");
}

const seedSql = await readFile(path.join(root, "supabase", "seed.sql"), "utf8");
if (/legacy_migrations|\\i\s+[^\n]*\.sql/i.test(seedSql.replace(/^\s*--.*$/gm, ""))) {
  failures.push("supabase/seed.sql executes SQL outside the canonical migration chain");
}

if (failures.length > 0) {
  console.error("Canonical migration-chain contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Canonical migration-chain contract passed: ${preLedger.length} pre-ledger reconciliation and ${live.length} immutable hosted-ledger migrations verified as a noncontiguous applied set; ${pendingMigrations.length} migration(s) remain pending, including ${pendingInsideAppliedRange.length} version holes inside the applied range.`
);
