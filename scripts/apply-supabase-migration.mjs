import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const migrationPath = "supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql";

function commandExists(command) {
  return spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" }).status === 0;
}

const allowApply = process.env.GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY?.trim().toLowerCase() === "true";
const dbUrl = process.env.SUPABASE_DB_URL?.trim();
const migrationFileExists = existsSync(migrationPath);
const psqlAvailable = commandExists("psql");
const supabaseCliAvailable = commandExists("supabase");

if (!migrationFileExists || !allowApply || !dbUrl) {
  console.log(JSON.stringify({
    ok: true,
    applied: false,
    status: "blocked_safe_guard",
    migrationPath,
    blockers: [
      ...(!migrationFileExists ? ["Migration SQL file is missing."] : []),
      ...(!dbUrl ? ["SUPABASE_DB_URL is not set."] : []),
      ...(!allowApply ? ["GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true is required before applying migration."] : [])
    ],
    nextActions: [
      "Review the migration SQL locally.",
      "Set SUPABASE_DB_URL and GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true only in a trusted terminal.",
      "Run npm run supabase:migrate:apply, or paste the migration SQL into Supabase SQL editor.",
      ...(supabaseCliAvailable ? ["If the Supabase project is linked, `supabase db push` is also available as an operator path."] : ["Install/link Supabase CLI if you prefer CLI-managed migrations."])
    ],
    caveat: "This script never prints database passwords or service keys."
  }, null, 2));
  process.exit(0);
}

if (!psqlAvailable) {
  console.log(JSON.stringify({
    ok: true,
    applied: false,
    status: "blocked_missing_psql",
    blockers: ["psql is not installed or not available on PATH."],
    nextActions: [
      "Install PostgreSQL client tools, then re-run this script from a trusted terminal.",
      "Or apply the migration SQL through the Supabase SQL editor."
    ],
    caveat: "Migration was not applied."
  }, null, 2));
  process.exit(0);
}

const result = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", migrationPath], {
  stdio: ["ignore", "pipe", "pipe"],
  encoding: "utf8"
});

if (result.status !== 0) {
  console.log(JSON.stringify({
    ok: false,
    applied: false,
    status: "apply_failed",
    blockers: ["psql returned a non-zero exit code."],
    stderr: result.stderr.split("\n").slice(-8).join("\n"),
    caveat: "Review the database state before retrying."
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  applied: true,
  status: "migration_applied",
  migrationPath,
  nextActions: ["Run npm run supabase:migrate:check and npm run supabase:verify:persistence."]
}, null, 2));
