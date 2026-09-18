import { readdir, readFile } from "node:fs/promises";

const operatorUrl = new URL("../supabase/operator/20260716_data_api_api_only_owner_path.sql", import.meta.url);
const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);

const expectedRoles = new Map([
  ["healthcheck()", ["anon", "authenticated"]],
  ["current_profile()", ["authenticated"]],
  ["current_organization_memberships()", ["authenticated"]],
  ["current_project_access(text)", ["authenticated"]],
  ["current_source_releases(text,integer,timestampwithtimezone,uuid)", ["authenticated"]],
  ["create_organization(text,text,uuid)", ["authenticated"]],
  ["create_client(uuid,text,text,text,uuid)", ["authenticated"]],
  ["create_project(uuid,uuid,text,text,text,uuid)", ["authenticated"]],
  ["create_invitation(uuid,uuid,text,text,text,text,timestampwithtimezone,uuid)", ["authenticated"]],
  ["accept_invitation(text,uuid)", ["authenticated"]],
  ["revoke_invitation(uuid,bigint,uuid)", ["authenticated"]],
  ["set_organization_member(uuid,uuid,text,text,bigint,uuid)", ["authenticated"]],
  ["set_project_member(uuid,uuid,text,text,bigint,uuid)", ["authenticated"]],
  ["organization_admin_snapshot(uuid,integer,timestampwithtimezone,uuid)", ["authenticated"]],
  ["upsert_point_object_analysis_run(text,text,text,text,jsonb,text,jsonb,jsonb,jsonb,text,text,text,text,text)", ["authenticated"]],
  ["list_point_object_analysis_runs(text,integer)", ["authenticated"]]
]);

function normalizeSignature(value) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("timestamptz", "timestamp with time zone")
    .replace(/\s+/g, "");
}

function inventoryFailures(signatures) {
  const normalized = signatures.map(normalizeSignature);
  const expected = [...expectedRoles.keys()];
  const failures = [];
  const duplicates = normalized.filter((signature, index) => normalized.indexOf(signature) !== index);
  const missing = expected.filter((signature) => !normalized.includes(signature));
  const extra = normalized.filter((signature) => !expected.includes(signature));

  if (normalized.length !== expected.length) failures.push(`expected ${expected.length} signatures, found ${normalized.length}`);
  if (duplicates.length) failures.push(`duplicate signatures: ${[...new Set(duplicates)].join(", ")}`);
  if (missing.length) failures.push(`missing signatures: ${missing.join(", ")}`);
  if (extra.length) failures.push(`unexpected or incorrect signatures: ${extra.join(", ")}`);
  return failures;
}

function parseAllowlist(sql) {
  return [...sql.matchAll(/to_regprocedure\('api[.]([^']+)'\)/gi)].map((match) => match[1]);
}

function parseApiGrants(sql) {
  const grants = new Map();
  for (const match of sql.matchAll(/grant\s+execute\s+on\s+function\s+api[.]([\s\S]*?)\s+to\s+([^;]+);/gi)) {
    const signature = normalizeSignature(match[1]);
    const roles = match[2].split(",").map((role) => role.trim().toLowerCase()).sort();
    grants.set(signature, roles);
  }
  return grants;
}

function runNegativeInventorySelfTests() {
  const expected = [...expectedRoles.keys()];
  const scenarios = [
    ["missing", expected.slice(1)],
    ["extra", [...expected, "unexpected_rpc(text)"]],
    ["incorrect signature", expected.map((signature) => signature === "list_point_object_analysis_runs(text,integer)"
      ? "list_point_object_analysis_runs(text,bigint)"
      : signature)]
  ];
  return scenarios
    .filter(([, signatures]) => inventoryFailures(signatures).length === 0)
    .map(([name]) => `negative ${name} inventory fixture was not rejected`);
}

const sql = await readFile(operatorUrl, "utf8");
const failures = [
  ...inventoryFailures(parseAllowlist(sql)),
  ...runNegativeInventorySelfTests()
];

const grants = parseApiGrants(sql);
for (const [signature, roles] of expectedRoles) {
  const actualRoles = grants.get(signature);
  if (!actualRoles || JSON.stringify(actualRoles) !== JSON.stringify([...roles].sort())) {
    failures.push(`incorrect EXECUTE roles for api.${signature}: expected ${roles.join(",")}, found ${actualRoles?.join(",") ?? "none"}`);
  }
}
for (const signature of grants.keys()) {
  if (!expectedRoles.has(signature)) failures.push(`unexpected API EXECUTE grant: api.${signature}`);
}

const migrationFiles = (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql")).sort();
const migrationApiNames = new Set();
for (const migrationFile of migrationFiles) {
  const migrationSql = await readFile(new URL(migrationFile, migrationsUrl), "utf8");
  for (const match of migrationSql.matchAll(/create\s+or\s+replace\s+function\s+api[.]([a-z0-9_]+)\s*\(/gi)) {
    migrationApiNames.add(match[1].toLowerCase());
  }
}
const expectedApiNames = new Set([...expectedRoles.keys()].map((signature) => signature.slice(0, signature.indexOf("("))));
for (const name of expectedApiNames) {
  if (!migrationApiNames.has(name)) failures.push(`allowlisted API function has no canonical migration definition: api.${name}`);
}
for (const name of migrationApiNames) {
  if (!expectedApiNames.has(name)) failures.push(`canonical migration API function is absent from the owner allowlist: api.${name}`);
}

for (const [pattern, message] of [
  [/current_user\s*<>\s*'postgres'/i, "Operator is not postgres-owner only"],
  [/existing_override[\s\S]*?pgrst[.]db_schemas=api/i, "Unexpected existing override is not rejected"],
  [/api must remain RPC-only/i, "RPC-only relation preflight is missing"],
  [/revoke\s+all\s+privileges\s+on\s+all\s+functions\s+in\s+schema\s+api/i, "API routine grants are not reset"],
  [/alter\s+role\s+authenticator\s+set\s+pgrst[.]db_schemas\s*=\s*'api'/i, "authenticator is not pinned to api"],
  [/pg_notify\('pgrst'\s*,\s*'reload config'\)/i, "PostgREST config reload is missing"],
  [/pg_notify\('pgrst'\s*,\s*'reload schema'\)/i, "PostgREST schema reload is missing"],
  [/alter\s+role\s+authenticator\s+reset\s+pgrst[.]db_schemas/i, "Rollback template is missing"]
]) {
  if (!pattern.test(sql)) failures.push(message);
}

if (failures.length) {
  console.error("Data API operator contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(
  "Data API operator contract passed: exact 16-RPC canonical allowlist, point-object authenticated-only grants, negative inventory fixtures, api-only authenticator override, reload and rollback warning are present."
);
