import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const filename = path.join(process.cwd(), "src/lib/supabase/config.ts");
const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    verbatimModuleSyntax: false
  }
}).outputText;

function load(env) {
  const module = { exports: {} };
  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    process: { env },
    URL,
    Object,
    Boolean
  }, { filename });
  return module.exports;
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

let contract = load({});
assert(contract.resolveSupabaseTarget().status === "missing", "Missing URL must remain unconfigured");
assert(contract.getSupabaseUrl() === null, "Missing URL must not produce a client target");

contract = load({ NEXT_PUBLIC_SUPABASE_URL: "https://pphdqkurxneyagvnnjdt.supabase.co" });
assert(contract.resolveSupabaseTarget().target === "development", "Exact development ref must resolve");

contract = load({ NEXT_PUBLIC_SUPABASE_URL: "https://bkmfcjzalcvdsdvyxpgi.supabase.co/" });
assert(contract.resolveSupabaseTarget().target === "auth_rehearsal", "Exact rehearsal ref must resolve");

for (const url of [
  "https://arbitrary-ref.supabase.co",
  "https://bkmfcjzalcvdsdvyxpgi.supabase.co.attacker.invalid",
  "https://bkmfcjzalcvdsdvyxpgi.supabase.co/rest/v1",
  "https://user@bkmfcjzalcvdsdvyxpgi.supabase.co",
  "http://bkmfcjzalcvdsdvyxpgi.supabase.co",
  "not-a-url"
]) {
  contract = load({ NEXT_PUBLIC_SUPABASE_URL: url });
  assert(contract.resolveSupabaseTarget().status === "target_mismatch", `Unapproved target must fail closed: ${url}`);
  assert(contract.getSupabaseUrl() === null, `Unapproved target must not reach Supabase clients: ${url}`);
}

contract = load({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" });
assert(contract.resolveSupabaseTarget().status === "target_mismatch", "Local target must require an explicit public development flag");
contract = load({
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_GEOAI_ALLOW_LOCAL_SUPABASE: "true"
});
assert(contract.resolveSupabaseTarget().target === "local", "Exact loopback target may resolve only with the explicit flag");

contract = load({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "legacy-anon-jwt" });
assert(contract.getSupabasePublishableKey() === null, "Legacy/invalid public keys must be rejected");
const publishableFixture = ["sb", "publishable", "abcdefghijklmnop"].join("_");
contract = load({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableFixture });
assert(contract.getSupabasePublishableKey() !== null, "Publishable-key-shaped values should pass shape validation");

for (const scriptPath of [
  "scripts/supabase-activation-status.mjs",
  "scripts/supabase-runtime-readiness.mjs"
]) {
  const script = fs.readFileSync(path.join(process.cwd(), scriptPath), "utf8");
  assert(script.includes("Object.hasOwn(approvedProjects, projectRef)"), `${scriptPath} must reject inherited property names`);
  assert(script.includes('target.pathname !== "/"') && script.includes("target.origin !== exactHostedOrigin"), `${scriptPath} must require one exact hosted origin with no path`);
}

if (failures.length > 0) {
  console.error("Supabase exact-target contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Supabase exact-target contract passed: only development, auth rehearsal and explicitly flagged loopback resolve; arbitrary hosted targets fail closed.");
