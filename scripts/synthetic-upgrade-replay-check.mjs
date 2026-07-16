import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("supabase/migration-ledger-baseline.json", root), "utf8")
);
const runLocal = process.argv.includes("--run-local");
const unexpectedArguments = process.argv.slice(2).filter((argument) => argument !== "--run-local");

if (unexpectedArguments.length > 0) {
  console.error(`Unsupported argument(s): ${unexpectedArguments.join(", ")}`);
  process.exit(2);
}

const preLedger = manifest.preLedgerReconciliations ?? [];
const liveLedger = manifest.liveAppliedMigrations ?? [];
const pending = manifest.pendingMigrations ?? [];
const failures = [];

if (manifest.status !== "read_only_live_ledger_baseline") {
  failures.push("Migration ledger manifest is not a read-only live baseline");
}
if (manifest.productionProject !== false) {
  failures.push("Synthetic replay is permitted only for a manifest explicitly marked non-production");
}
if (preLedger.length !== 1) {
  failures.push(`Expected one pre-ledger reconciliation; found ${preLedger.length}`);
}
if (liveLedger.length !== manifest.canonicalBaselineCount || liveLedger.length !== 10) {
  failures.push(`Expected the exact 10-entry live ledger; found ${liveLedger.length}`);
}
if (pending.length !== 6) {
  failures.push(`Expected exactly six review-only pending migrations; found ${pending.length}`);
}

const allEntries = [...preLedger, ...liveLedger, ...pending];
const versions = allEntries.map((entry) => entry.version);
if (new Set(versions).size !== versions.length) failures.push("Migration versions are not unique");
if (versions.some((version, index) => index > 0 && version <= versions[index - 1])) {
  failures.push("Migration versions are not strictly increasing");
}

if (failures.length > 0) {
  console.error("Synthetic upgrade-replay contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const caveat =
  "REVIEW-ONLY: this synthetic local ledger-prefix rehearsal is not a current-development clone, does not measure live schema/constraint/policy/function-grant drift, and does not certify DB-01 or authorize any live/Production action.";

if (!runLocal) {
  console.log(
    `Synthetic upgrade-replay static contract passed: exact ${liveLedger.length}-entry ledger prefix, ${preLedger.length} pre-ledger reconciliation, and ${pending.length} pending migration(s) are declared. ${caveat}`
  );
  process.exit(0);
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlTextArray(valuesToQuote) {
  return `array[${valuesToQuote.map(sqlLiteral).join(", ")}]::text[]`;
}

function runSupabase(arguments_, label) {
  if (arguments_.includes("--linked") || arguments_.includes("--db-url")) {
    throw new Error(`${label} attempted a non-local Supabase target`);
  }
  if (!arguments_.includes("--local")) {
    throw new Error(`${label} omitted the mandatory --local target`);
  }

  console.log(`\n== ${label} ==`);
  const result = spawnSync("npx", ["supabase", ...arguments_], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_TELEMETRY_DISABLED: "true"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function queryLocal(sql, label) {
  runSupabase(["db", "query", "--local", sql], label);
}

function assertLedger(entries, label, compareNames) {
  const expectedVersions = sqlTextArray(entries.map((entry) => entry.version));
  const expectedNames = sqlTextArray(entries.map((entry) => entry.name));
  queryLocal(
    `
do $geoai$
declare
  actual_versions text[];
  actual_names text[];
begin
  select
    coalesce(array_agg(version::text order by version), array[]::text[]),
    coalesce(array_agg(name::text order by version), array[]::text[])
  into actual_versions, actual_names
  from supabase_migrations.schema_migrations;

  if actual_versions is distinct from ${expectedVersions} then
    raise exception 'migration ledger version drift: expected %, found %', ${expectedVersions}, actual_versions;
  end if;
  ${
    compareNames
      ? `if actual_names is distinct from ${expectedNames} then
    raise exception 'migration ledger name drift: expected %, found %', ${expectedNames}, actual_names;
  end if;`
      : ""
  }
end
$geoai$;
`,
    label
  );
}

function assertDeclaredPreLedgerFingerprint() {
  queryLocal(
    `
do $geoai$
declare
  table_owner text;
  rls_enabled boolean;
  force_rls boolean;
  primary_key_columns text[];
begin
  select pg_get_userbyid(class.relowner), class.relrowsecurity, class.relforcerowsecurity
  into table_owner, rls_enabled, force_rls
  from pg_class class
  where class.oid = to_regclass('public.geoai_healthcheck');

  if table_owner is distinct from 'postgres' or rls_enabled is distinct from true or force_rls is distinct from false then
    raise exception 'geoai_healthcheck owner/RLS fingerprint drift: owner=%, rls=%, force_rls=%', table_owner, rls_enabled, force_rls;
  end if;

  if obj_description(to_regclass('public.geoai_healthcheck'), 'pg_class') is not null then
    raise exception 'geoai_healthcheck comment must be null at the declared ledger prefix';
  end if;

  if not exists (
    select 1
    from pg_attribute attribute
    where attribute.attrelid = to_regclass('public.geoai_healthcheck')
      and attribute.attname = 'id'
      and format_type(attribute.atttypid, attribute.atttypmod) = 'bigint'
      and attribute.attnotnull
      and not attribute.attisdropped
  ) or not exists (
    select 1
    from pg_attribute attribute
    where attribute.attrelid = to_regclass('public.geoai_healthcheck')
      and attribute.attname = 'name'
      and format_type(attribute.atttypid, attribute.atttypmod) = 'text'
      and attribute.attnotnull
      and not attribute.attisdropped
  ) or not exists (
    select 1
    from pg_attribute attribute
    left join pg_attrdef default_value
      on default_value.adrelid = attribute.attrelid
     and default_value.adnum = attribute.attnum
    where attribute.attrelid = to_regclass('public.geoai_healthcheck')
      and attribute.attname = 'created_at'
      and format_type(attribute.atttypid, attribute.atttypmod) = 'timestamp with time zone'
      and not attribute.attnotnull
      and pg_get_expr(default_value.adbin, default_value.adrelid) = 'now()'
      and not attribute.attisdropped
  ) then
    raise exception 'geoai_healthcheck column fingerprint drift';
  end if;

  if (
    select count(*)
    from pg_attribute attribute
    where attribute.attrelid = to_regclass('public.geoai_healthcheck')
      and attribute.attnum > 0
      and not attribute.attisdropped
  ) <> 3 then
    raise exception 'geoai_healthcheck must have exactly three user columns';
  end if;

  select array_agg(attribute.attname order by key_column.ordinality)
  into primary_key_columns
  from pg_index index_definition
  cross join lateral unnest(index_definition.indkey) with ordinality as key_column(attnum, ordinality)
  join pg_attribute attribute
    on attribute.attrelid = index_definition.indrelid
   and attribute.attnum = key_column.attnum
  where index_definition.indrelid = to_regclass('public.geoai_healthcheck')
    and index_definition.indisprimary;

  if primary_key_columns is distinct from array['id']::text[] then
    raise exception 'geoai_healthcheck primary-key fingerprint drift: %', primary_key_columns;
  end if;

  if not exists (
    select 1
    from public.geoai_healthcheck
    where id = 1 and name = 'GeoAI Supabase connected'
  ) then
    raise exception 'geoai_healthcheck seed fingerprint is missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'geoai_healthcheck'
      and policyname = 'public can read geoai healthcheck'
      and cmd = 'SELECT'
      and roles @> array['anon', 'authenticated']::name[]
      and cardinality(roles) = 2
      and qual = 'true'
  ) then
    raise exception 'geoai_healthcheck declared read-policy fingerprint drift';
  end if;
end
$geoai$;
`,
    "Verify the declared structural pre-ledger fingerprint"
  );
}

function assertPostUpgradeSurface() {
  queryLocal(
    `
do $geoai$
declare
  uncontained_tables text[];
begin
  select coalesce(array_agg(class.relname order by class.relname), array[]::text[])
  into uncontained_tables
  from pg_class class
  join pg_namespace namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'public'
    and class.relkind in ('r', 'p')
    and class.relname <> 'spatial_ref_sys'
    and not class.relrowsecurity;

  if cardinality(uncontained_tables) > 0 then
    raise exception 'public tables without RLS after synthetic upgrade: %', uncontained_tables;
  end if;

  if has_table_privilege('anon', 'public.geoai_healthcheck', 'select')
     or has_table_privilege('authenticated', 'public.geoai_healthcheck', 'select')
     or has_table_privilege('service_role', 'public.geoai_healthcheck', 'select') then
    raise exception 'geoai_healthcheck base-table SELECT was not contained';
  end if;

  if not has_function_privilege('anon', 'api.healthcheck()', 'execute')
     or not has_function_privilege('authenticated', 'api.healthcheck()', 'execute') then
    raise exception 'api.healthcheck allowlist grants are incomplete';
  end if;

  if has_function_privilege('anon', 'api.current_profile()', 'execute')
     or has_function_privilege('anon', 'api.current_organization_memberships()', 'execute')
     or has_function_privilege('anon', 'api.current_project_access(text)', 'execute')
     or has_function_privilege('anon', 'api.current_source_releases(text,integer,timestamptz,uuid)', 'execute') then
    raise exception 'authenticated-only API RPC is executable by anon';
  end if;

  if not has_function_privilege('authenticated', 'api.current_profile()', 'execute')
     or not has_function_privilege('authenticated', 'api.current_organization_memberships()', 'execute')
     or not has_function_privilege('authenticated', 'api.current_project_access(text)', 'execute')
     or not has_function_privilege('authenticated', 'api.current_source_releases(text,integer,timestamptz,uuid)', 'execute') then
    raise exception 'authenticated API RPC allowlist grants are incomplete';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'project_memberships_project_scope_fkey'
  ) or not exists (
    select 1 from pg_constraint
    where conname = 'source_releases_project_scope_fkey'
  ) or not exists (
    select 1 from pg_constraint
    where conname = 'source_ingestion_receipts_project_scope_fkey'
  ) then
    raise exception 'required tenant-scope constraint is missing after synthetic upgrade';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'source_releases_immutable' and not tgisinternal
  ) or not exists (
    select 1 from pg_trigger
    where tgname = 'source_artifacts_immutable' and not tgisinternal
  ) or not exists (
    select 1 from pg_trigger
    where tgname = 'source_release_status_events_immutable' and not tgisinternal
  ) or not exists (
    select 1 from pg_trigger
    where tgname = 'source_ingestion_receipts_immutable' and not tgisinternal
  ) then
    raise exception 'required append-only custody trigger is missing after synthetic upgrade';
  end if;
end
$geoai$;
`,
    "Verify the synthetic post-upgrade security surface"
  );

  queryLocal(
    `
select jsonb_pretty(jsonb_build_object(
  'replayKind', 'synthetic_local_ledger_prefix_not_live_clone',
  'migrationVersions', (
    select jsonb_agg(version order by version)
    from supabase_migrations.schema_migrations
  ),
  'publicTables', (
    select count(*)
    from pg_class class
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public' and class.relkind in ('r', 'p')
  ),
  'publicTablesWithRls', (
    select count(*)
    from pg_class class
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public' and class.relkind in ('r', 'p') and class.relrowsecurity
  ),
  'rlsPolicies', (
    select count(*) from pg_policies where schemaname = 'public'
  ),
  'apiFunctions', (
    select coalesce(jsonb_agg(routine.routine_name order by routine.routine_name), '[]'::jsonb)
    from information_schema.routines routine
    where routine.routine_schema = 'api'
  ),
  'caveat', ${sqlLiteral(caveat)}
));
`,
    "Emit the synthetic replay inventory"
  );
}

const preLedgerEntry = preLedger[0];
const lastLiveEntry = liveLedger.at(-1);

console.log(caveat);
runSupabase(
  ["db", "reset", "--local", "--version", lastLiveEntry.version, "--no-seed"],
  `Build the canonical prefix through ${lastLiveEntry.version}`
);
runSupabase(
  ["migration", "repair", preLedgerEntry.version, "--status", "reverted", "--local"],
  "Simulate the observed live ledger omission without changing schema objects"
);
assertLedger(liveLedger, "Verify the exact observed 10-entry ledger shape", true);
assertDeclaredPreLedgerFingerprint();
runSupabase(
  ["migration", "repair", preLedgerEntry.version, "--status", "applied", "--local"],
  "Rehearse the required pre-ledger repair locally"
);
assertLedger([...preLedger, ...liveLedger], "Verify the reconciled ledger prefix", false);
runSupabase(["migration", "up", "--local"], "Apply the six review-only pending migrations locally");
assertLedger(allEntries, "Verify the complete synthetic upgrade ledger", false);
assertPostUpgradeSurface();

console.log(`Synthetic ledger-prefix upgrade rehearsal passed. ${caveat}`);
