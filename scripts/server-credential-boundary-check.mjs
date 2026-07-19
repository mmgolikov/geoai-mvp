import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const serverClientPath = new URL("../src/lib/supabase/server.ts", import.meta.url);
const source = await readFile(serverClientPath, "utf8");
const forbidden = [
  "getSupabaseServiceRoleKey",
  "SUPABASE_SERVICE_ROLE_KEY",
  'role !== "service_role"',
  "anonKey ?? serviceRoleKey"
];
const findings = forbidden.filter((value) => source.includes(value));

if (findings.length > 0) {
  console.error("Server credential boundary failed: request-scoped Supabase client references privileged credentials.");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

if (!source.includes("return getSupabasePublishableKey()")) {
  console.error("Server credential boundary failed: request-scoped client is not pinned to the publishable key.");
  process.exit(1);
}

async function collectRuntimeFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectRuntimeFiles(path);
    return entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  }))).flat();
}

const runtimeForbidden = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
  "GEOAI_OPERATOR_SUPABASE_",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "getSupabaseServiceRoleKey"
];
const runtimeFiles = (await Promise.all(["src", "app", "components"].map(collectRuntimeFiles))).flat();
const runtimeFindings = [];
for (const path of runtimeFiles) {
  const value = await readFile(path, "utf8");
  for (const token of runtimeForbidden) {
    if (value.includes(token)) runtimeFindings.push(`${path}: ${token}`);
  }
  if (/sb_publishable_[A-Za-z0-9_-]{16,}/.test(value)) {
    runtimeFindings.push(`${path}: embedded publishable-key-shaped value`);
  }
}
if (runtimeFindings.length > 0) {
  console.error("Application credential boundary failed: privileged/operator credentials or embedded publishable keys appear in runtime source.");
  runtimeFindings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

const configSource = await readFile(new URL("../src/lib/supabase/config.ts", import.meta.url), "utf8");
const authProviderSource = await readFile(new URL("../components/auth/auth-provider.tsx", import.meta.url), "utf8");
const sourceSyncSource = await readFile(new URL("./sync-source-readiness-snapshots.mjs", import.meta.url), "utf8");
const sampleIngestSource = await readFile(new URL("./ingest-dld-sample.mjs", import.meta.url), "utf8");
if (!/requestScopedSupabaseRepositoriesEnabled(?:\s*:\s*boolean)?\s*=\s*false/.test(configSource)) {
  console.error("Application credential boundary failed: global application Supabase repositories are not pinned off before AUTH-01.");
  process.exit(1);
}
if (authProviderSource.includes("supabase_placeholder") || authProviderSource.includes('import("@supabase/supabase-js")')) {
  console.error("Application credential boundary failed: browser Auth still creates placeholder authorization or contacts Supabase before AUTH-01.");
  process.exit(1);
}
if (!configSource.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || configSource.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
  console.error("Application credential boundary failed: runtime config is not publishable-key-only.");
  process.exit(1);
}
if (!configSource.includes("/^sb_publishable_") || !configSource.includes("{16,}")) {
  console.error("Application credential boundary failed: runtime config accepts legacy or malformed values as publishable keys.");
  process.exit(1);
}
if (!sourceSyncSource.includes("legacyDatabaseWriterQuarantined = true")) {
  console.error("Application credential boundary failed: legacy mutable source snapshot writer is not pinned to quarantine.");
  process.exit(1);
}
if (!sampleIngestSource.includes('supabaseMode = "database_write_quarantined"') || sampleIngestSource.includes("SUPABASE_SERVICE_ROLE_KEY")) {
  console.error("Application credential boundary failed: legacy sample ingestion can still inherit application Supabase credentials.");
  process.exit(1);
}

console.log(`Server credential boundary passed: ${runtimeFiles.length} runtime files contain no privileged/operator credential references; pre-AUTH repositories and browser Auth remain fail-closed.`);
