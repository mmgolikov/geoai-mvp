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

if (!source.includes("return getSupabaseAnonKey()")) {
  console.error("Server credential boundary failed: request-scoped client is not pinned to the publishable/anon key.");
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

const runtimeForbidden = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL", "getSupabaseServiceRoleKey", "sb_publishable_"];
const runtimeFiles = (await Promise.all(["src", "app", "components"].map(collectRuntimeFiles))).flat();
const runtimeFindings = [];
for (const path of runtimeFiles) {
  const value = await readFile(path, "utf8");
  for (const token of runtimeForbidden) {
    if (value.includes(token)) runtimeFindings.push(`${path}: ${token}`);
  }
}
if (runtimeFindings.length > 0) {
  console.error("Application credential boundary failed: privileged/operator credentials or embedded publishable keys appear in runtime source.");
  runtimeFindings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

const configSource = await readFile(new URL("../src/lib/supabase/config.ts", import.meta.url), "utf8");
const authProviderSource = await readFile(new URL("../components/auth/auth-provider.tsx", import.meta.url), "utf8");
if (!configSource.includes("requestScopedSupabaseRepositoriesEnabled = false")) {
  console.error("Application credential boundary failed: global application Supabase repositories are not pinned off before AUTH-01.");
  process.exit(1);
}
if (authProviderSource.includes("supabase_placeholder") || authProviderSource.includes('import("@supabase/supabase-js")')) {
  console.error("Application credential boundary failed: browser Auth still creates placeholder authorization or contacts Supabase before AUTH-01.");
  process.exit(1);
}

console.log(`Server credential boundary passed: ${runtimeFiles.length} runtime files contain no privileged/operator credential references; pre-AUTH repositories and browser Auth remain fail-closed.`);
