import { readFile } from "node:fs/promises";

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

console.log("Server credential boundary passed: request-scoped repositories cannot select the service-role key.");
