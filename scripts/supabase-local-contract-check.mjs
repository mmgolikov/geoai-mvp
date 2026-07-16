import { readFile } from "node:fs/promises";

const config = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const workflow = await readFile(new URL("../.github/workflows/geoai-quality-gate.yml", import.meta.url), "utf8");
const syntheticUpgradeReplay = await readFile(
  new URL("./synthetic-upgrade-replay-check.mjs", import.meta.url),
  "utf8"
);
const failures = [];

if (!/^schemas\s*=\s*\["api"\]$/m.test(config)) {
  failures.push("Local Data API must expose only the api allowlist schema");
}
if (!/^major_version\s*=\s*17$/m.test(config)) {
  failures.push("Local Postgres major version must match the hosted project");
}
if (!/^enable_anonymous_sign_ins\s*=\s*false$/m.test(config)) {
  failures.push("Local Auth must keep anonymous sign-ins disabled");
}
if (packageJson.devDependencies?.supabase !== "2.109.1") {
  failures.push("Supabase CLI must be pinned exactly to 2.109.1");
}
for (const command of [
  "supabase:local:start",
  "supabase:local:reset",
  "supabase:test:db",
  "supabase:local:stop",
  "test:synthetic-upgrade-replay",
  "supabase:test:synthetic-upgrade-replay"
]) {
  if (!packageJson.scripts?.[command]) failures.push(`Missing package script: ${command}`);
}
for (const evidence of [
  "database-replay:",
  "npm run supabase:local:reset",
  "npm run supabase:test:db",
  "npm run test:synthetic-upgrade-replay | tee artifacts/synthetic-upgrade-replay-static-check.txt",
  "npm run supabase:test:synthetic-upgrade-replay",
  "Synthetic ledger-prefix upgrade rehearsal (not live-clone certification)",
  "geoai-database-evidence-${{ github.run_id }}"
]) {
  if (!workflow.includes(evidence)) failures.push(`CI database replay evidence is missing: ${evidence}`);
}
for (const localOnlyControl of [
  '["db", "reset", "--local", "--version", lastLiveEntry.version, "--no-seed"]',
  '["migration", "repair", preLedgerEntry.version, "--status", "reverted", "--local"]',
  '["migration", "repair", preLedgerEntry.version, "--status", "applied", "--local"]',
  '["migration", "up", "--local"]',
  "not a current-development clone",
  "does not certify DB-01"
]) {
  if (!syntheticUpgradeReplay.includes(localOnlyControl)) {
    failures.push(`Synthetic replay local-only/caveat control is missing: ${localOnlyControl}`);
  }
}

if (failures.length > 0) {
  console.error("Supabase local replay contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Supabase local replay contract passed: api-only config, Postgres 17, pinned CLI, clean replay/pgTAP, and an explicitly non-certifying synthetic ledger-prefix upgrade rehearsal are present.");
