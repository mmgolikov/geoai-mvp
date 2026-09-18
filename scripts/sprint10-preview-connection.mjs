// Root-only operator for the founder-approved non-Production test contour.
// No private key is printed or written. OpenAI stays in existing Vercel settings.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const projectRef = "pphdqkurxneyagvnnjdt";
const projectId = "prj_LE41wkaiRUgZgOynkkeixGbesJvp";
const branch = "codex/sprint10-control-20260918";
const scope = "geoaidev";
const apply = process.argv.slice(2).join(" ") === "--apply-approved-preview";
if (process.argv.length > 2 && !apply) throw new Error("Unsupported operator arguments");
const run = (command, args, input) => {
  const result = spawnSync(command, args, { input, encoding: "utf8", timeout: 90_000, maxBuffer: 1_000_000 });
  if (result.status !== 0) throw new Error("Scoped command failed; output suppressed for credential safety");
  return result.stdout;
};
const check = (condition, label) => { if (!condition) throw new Error(label); };
try {
  check(readFileSync("supabase/.temp/project-ref", "utf8").trim() === projectRef, "Wrong linked database");
  check(run("git", ["branch", "--show-current"]).trim() === branch, "Wrong branch");
  const keys = JSON.parse(run("node_modules/.bin/supabase", ["projects", "api-keys", "--project-ref", projectRef, "--output", "json"]));
  check(Array.isArray(keys), "Unexpected key metadata");
  const candidates = keys.filter((entry) => entry.type === "publishable" && entry.disabled !== true && typeof entry.api_key === "string" && /^sb_publishable_[A-Za-z0-9_-]+$/.test(entry.api_key));
  check(candidates.length === 1, "Require one existing enabled publishable key");
  const key = candidates[0].api_key;
  const call = async (endpoint, schema, method = "GET", body) => {
    const response = await fetch(`https://${projectRef}.supabase.co/rest/v1/${endpoint}`, {
      method, redirect: "error", signal: AbortSignal.timeout(20_000),
      headers: { apikey: key, "Accept-Profile": schema, "Content-Profile": schema, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    let code = null;
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload.code === "string" && /^[A-Z0-9_]{2,24}$/.test(payload.code)) code = payload.code;
    return { status: response.status, code };
  };
  const health = await call("rpc/healthcheck", "api", "POST", {});
  const publicSchema = await call("spatial_ref_sys?select=srid&limit=0", "public");
  const privateSchema = await call("profiles?select=id&limit=0", "geoai_private");
  check(health.status === 200, "Anonymous health RPC failed");
  check(publicSchema.status === 406 && publicSchema.code === "PGRST106", "Public schema still reachable");
  check(privateSchema.status === 406 && privateSchema.code === "PGRST106", "Private schema unexpectedly reachable");
  const configuration = new Map([
    ["NEXT_PUBLIC_AUTH_MODE", "supabase_auth"],
    ["GEOAI_ACCESS_ENFORCEMENT_MODE", "hard"],
    ["GEOAI_ALLOW_DEMO_PUBLIC", "false"],
    ["NEXT_PUBLIC_SUPABASE_URL", `https://${projectRef}.supabase.co`],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key],
    ["GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI", "true"],
    ["GEOAI_ALLOW_POINT_OBJECT_PREVIEW_PERSISTENCE", "true"]
  ]);
  const changed = [];
  if (apply) {
    for (const [name, value] of configuration) {
      // Add only: no --force, so a collision cannot overwrite an existing branch variable.
      run("npm", ["exec", "--yes", "--package=vercel@59.23.2", "--", "vercel", "env", "add", name, "preview", "--git-branch", branch, "--project", projectId, "--scope", scope, "--type", "config", "--yes"], `${value}\n`);
      changed.push(name);
      console.log(JSON.stringify({ event: "preview_branch_variable_added", name, branch }));
    }
  }
  console.log(JSON.stringify({ schemaVersion: "geoai.sprint10.preview-connection.v1", projectRef, projectId, branch, observedAt: new Date().toISOString(), health, publicSchema, privateSchema, applied: apply, changed, secretValuesEmitted: false, productionChanged: false, openAiKeyChanged: false }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: "STOP", reason: error instanceof Error ? error.message : "Operator failed", secretValuesEmitted: false }));
  process.exitCode = 1;
}
