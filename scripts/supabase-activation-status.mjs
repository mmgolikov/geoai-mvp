import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const project = {
  ref: "pphdqkurxneyagvnnjdt",
  name: "geoai-dev",
  region: "eu-west-1",
  status: "ACTIVE_HEALTHY",
  postgresVersion: "17.6",
  currentPublicTable: "geoai_healthcheck"
};

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
const requiredBuckets = [
  "geoai-data-room-assets",
  "geoai-validation-evidence",
  "geoai-report-exports",
  "geoai-aoi-imports"
];

function commandExists(command) {
  return spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" }).status === 0;
}

function present(name) {
  return Boolean(process.env[name]?.trim());
}

function boolEnv(name) {
  return process.env[name]?.trim().toLowerCase() === "true";
}

function envSnapshot() {
  const target = process.env.GEOAI_ALLOW_SUPABASE_TARGET?.trim().toLowerCase() || null;

  return {
    NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: present("SUPABASE_SERVICE_ROLE_KEY"),
    SUPABASE_DB_URL: present("SUPABASE_DB_URL"),
    GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY: boolEnv("GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY"),
    GEOAI_ALLOW_SUPABASE_TARGET: target,
    migrationTargetAllowed: target === "preview" || target === "pilot"
  };
}

function restUrl(table) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!baseUrl) return null;

  const url = new URL(`/rest/v1/${table}`, baseUrl);
  url.searchParams.set("select", table === project.currentPublicTable ? "*" : "id");
  url.searchParams.set("limit", "1");
  return url;
}

async function probeRestTable(table) {
  const url = restUrl(table);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return { table, ready: false, status: "not_configured" };
  }

  try {
    const response = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact"
      }
    });

    return { table, ready: response.ok, status: response.status };
  } catch (error) {
    return { table, ready: false, status: "request_failed", message: error instanceof Error ? error.message : "request failed" };
  }
}

const env = envSnapshot();
const migrationFileExists = existsSync(migrationPath);
const supabaseCliAvailable = commandExists("supabase");
const psqlAvailable = commandExists("psql");
const canApplyGuardedMigration = env.SUPABASE_DB_URL &&
  env.GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY &&
  env.migrationTargetAllowed;
const [healthcheck, ...tableChecks] = await Promise.all([
  probeRestTable(project.currentPublicTable),
  ...requiredTables.map((table) => probeRestTable(table))
]);
const missingTables = tableChecks.filter((item) => !item.ready).map((item) => item.table);
const schemaReady = missingTables.length === 0;
const blockers = [
  ...(!env.NEXT_PUBLIC_SUPABASE_URL ? ["NEXT_PUBLIC_SUPABASE_URL is not configured."] : []),
  ...(!env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? ["NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured."] : []),
  ...(!env.SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY is not configured in this runtime."] : []),
  ...(!migrationFileExists ? ["Pilot persistence migration file is missing."] : []),
  ...(!healthcheck.ready ? [`${project.currentPublicTable} is not reachable through REST from this runtime.`] : []),
  ...(missingTables.length ? [`${missingTables.length} required persistence table(s) are missing, RLS-blocked, or unreachable.`] : []),
  ...(!canApplyGuardedMigration && !schemaReady ? ["Guarded migration apply is disabled until SUPABASE_DB_URL, GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true and GEOAI_ALLOW_SUPABASE_TARGET=preview or pilot are set in a trusted terminal."] : [])
];

const output = {
  ok: true,
  project,
  env,
  localTools: {
    supabaseCliAvailable,
    psqlAvailable
  },
  migration: {
    migrationFileExists,
    migrationPath,
    canApplyGuardedMigration,
    caveat: "This script reports readiness only and never applies migrations."
  },
  healthcheck,
  schema: {
    schemaReady,
    requiredTables,
    missingTables
  },
  storage: {
    requiredBuckets,
    caveat: "Bucket existence and signed URL policy verification are checked by app/server storage readiness APIs when Supabase server env is configured."
  },
  blockers,
  nextActions: schemaReady
    ? ["Run npm run supabase:verify:persistence and verify /api/db/health in the target runtime."]
    : [
        "Review docs/SUPABASE_PILOT_ACTIVATION.md.",
        "Run npm run supabase:migrate:check.",
        "Apply migrations only from a trusted terminal with SUPABASE_DB_URL, GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true and GEOAI_ALLOW_SUPABASE_TARGET=preview or pilot.",
        "Re-run npm run supabase:activation-status and /api/db/health after applying."
      ],
  caveat: "No Supabase keys, database URLs, or service-role secrets are printed."
};

console.log(JSON.stringify(output, null, 2));
