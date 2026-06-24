import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const migrationPath = "supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql";
const requiredTables = [
  "organizations",
  "profiles",
  "project_memberships",
  "projects",
  "aois",
  "analysis_runs",
  "reports",
  "comparison_sets",
  "uploaded_datasets",
  "data_room_assets",
  "validation_checklist_items",
  "pilot_workflows",
  "pilot_client_inputs",
  "pilot_deliverables",
  "source_registry_snapshots",
  "external_data_snapshots",
  "ai_decision_scores",
  "audit_events"
];

function commandExists(command) {
  return spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" }).status === 0;
}

async function probeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return {
      configured: false,
      reachable: false,
      missingTables: requiredTables,
      blocker: "Supabase URL/key env is missing."
    };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const checks = await Promise.all(requiredTables.map(async (table) => {
    try {
      const { error } = await client.from(table).select("id", { head: true, count: "exact" });
      return { table, ready: !error };
    } catch {
      return { table, ready: false };
    }
  }));
  const missingTables = checks.filter((item) => !item.ready).map((item) => item.table);

  return {
    configured: true,
    reachable: missingTables.length < requiredTables.length,
    missingTables,
    blocker: missingTables.length ? `${missingTables.length} required table(s) are missing or unreachable.` : null
  };
}

const supabaseCliAvailable = commandExists("supabase");
const psqlAvailable = commandExists("psql");
const migrationFileExists = existsSync(migrationPath);
const canApplyMigration = Boolean(process.env.SUPABASE_DB_URL?.trim()) &&
  process.env.GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY?.trim().toLowerCase() === "true";
const probe = await probeSupabase();
const schemaApplied = probe.configured && probe.missingTables.length === 0;

const output = {
  ok: true,
  migrationFileExists,
  migrationPath,
  supabaseCliAvailable,
  psqlAvailable,
  canApplyMigration,
  schemaApplied,
  configured: probe.configured,
  missingTables: probe.missingTables,
  blockers: [
    ...(!migrationFileExists ? ["Migration SQL file is missing."] : []),
    ...(probe.blocker ? [probe.blocker] : []),
    ...(!canApplyMigration && !schemaApplied ? ["Migration apply is disabled until SUPABASE_DB_URL and GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true are set."] : [])
  ],
  nextActions: schemaApplied
    ? ["Run npm run supabase:verify:persistence to verify durable writes."]
    : [
        "Apply supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql from a trusted environment.",
        "Use npm run supabase:migrate:apply only after setting SUPABASE_DB_URL and GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true.",
        "Alternatively paste the migration SQL into the Supabase SQL editor and re-run this check."
      ],
  caveat: "Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass."
};

console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 1);
