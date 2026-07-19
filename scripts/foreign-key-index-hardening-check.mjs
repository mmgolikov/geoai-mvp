import { readFile } from "node:fs/promises";

const sql = await readFile(
  new URL("../supabase/migrations/20260716172000_geoai_foreign_key_index_hardening_v1.sql", import.meta.url),
  "utf8"
);
const indexStatements = sql.match(/create\s+index\s+if\s+not\s+exists[\s\S]*?;/gi) ?? [];
const failures = [];

if (indexStatements.length !== 39) failures.push(`Expected 39 FK-covering indexes; found ${indexStatements.length}`);
if (!/begin;[\s\S]*set\s+local\s+lock_timeout[\s\S]*set\s+local\s+statement_timeout[\s\S]*commit;/i.test(sql)) {
  failures.push("FK index migration lacks an atomic bounded transaction");
}
if (indexStatements.some((statement) => !/on\s+public[.][a-z0-9_]+\s*\(/i.test(statement))) {
  failures.push("An FK index escapes the public domain schema");
}
if (new Set(indexStatements.map((statement) => statement.match(/exists\s+([a-z0-9_]+)/i)?.[1])).size !== 39) {
  failures.push("FK index names are not unique");
}

if (failures.length) {
  console.error("Foreign-key index hardening contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Foreign-key index hardening contract passed: 39 unique public-domain covering indexes are declared in a bounded transaction.");
