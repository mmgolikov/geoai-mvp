import { readFile } from "node:fs/promises";

const sql = await readFile(
  new URL("../supabase/operator/20260716_data_api_api_only_owner_path.sql", import.meta.url),
  "utf8"
);
const failures = [];
const allowlist = [...sql.matchAll(/to_regprocedure\('api[.]([^']+)'\)/gi)].map((match) => match[1]);

if (allowlist.length !== 14 || new Set(allowlist).size !== 14) failures.push("Data API operator allowlist is not exactly 14 unique RPC signatures");
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
console.log("Data API operator contract passed: exact 14-RPC allowlist, api-only authenticator override, config/schema reload and rollback are present.");
