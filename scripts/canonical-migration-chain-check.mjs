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
  const actual = parsed[preLedger.length + index];
  const expectedFile = `${expected.version}_${expected.name}.sql`;

  if (!actual || actual.file !== expectedFile) {
    failures.push(`Applied ledger position ${index + 1} must be ${expectedFile}; found ${actual?.file ?? "nothing"}`);
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

const pendingStart = preLedger.length + live.length;
for (const migration of parsed.slice(pendingStart)) {
  if (lastAppliedVersion && migration.version <= lastAppliedVersion) {
    failures.push(`Untracked migration ${migration.file} sorts inside the immutable applied ledger`);
  }
}

const pendingMigrations = manifest.pendingMigrations ?? [];
const pendingFiles = new Set(pendingMigrations.map((pending) => `${pending.version}_${pending.name}.sql`));
for (const pending of pendingMigrations) {
  const expectedFile = `${pending.version}_${pending.name}.sql`;
  if (!files.includes(expectedFile)) failures.push(`Manifest pending migration is missing: ${expectedFile}`);
  if (lastAppliedVersion && pending.version <= lastAppliedVersion) {
    failures.push(`Pending migration does not sort after the applied ledger: ${expectedFile}`);
  }
}

for (const migration of parsed.slice(pendingStart)) {
  if (!pendingFiles.has(migration.file)) {
    failures.push(`Pending migration is not tracked in the ledger manifest: ${migration.file}`);
  }
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
  `Canonical migration-chain contract passed: ${preLedger.length} pre-ledger reconciliation and ${live.length} immutable live-ledger migrations verified; ${parsed.length - pendingStart} pending migration(s) sort after the baseline.`
);
