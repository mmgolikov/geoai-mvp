import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const registry = JSON.parse(readFileSync(new URL("./impact-map.json", import.meta.url), "utf8"));
const entries = Object.entries(registry.components);
const broadPolicy = /(^|\/)(AGENTS\.md|package(?:-lock)?\.json|(?:pnpm|yarn|bun)\.lock(?:b)?|tsconfig[^/]*|[^/]*\.config\.[^/]*|schema[^/]*|[^/]*schema[^/]*|[^/]*migration[^/]*|\.env[^/]*|impact-map\.json|select-tests[^/]*)$|^(\.github|supabase\/migrations|config)\//i;
const proseDoc = /^(?:docs\/|deliverables\/).+\.(?:md|txt)$|^[^/]+\.(?:md|txt)$/i;
const liveComponents = new Set(["IDENTITY", "CONTEXT", "ANALYSE", "FIND", "CREATE", "STORAGE", "AUTH", "LIMITS"]);

function flattenPaths(items) {
  const result = [];
  for (const item of items) {
    if (typeof item === "string") result.push(item);
    else if (item && typeof item === "object") {
      for (const key of ["oldPath", "newPath"]) if (typeof item[key] === "string") result.push(item[key]);
    }
  }
  return [...new Set(result.map(path => path.replaceAll("\\", "/").replace(/^\.\//, "")))];
}

export function selectPlan(changed) {
  if (!Array.isArray(changed)) throw new TypeError("Expected changed paths array");
  const paths = flattenPaths(changed);
  if (paths.length === 0) return {
    status: "no_changes", changedPaths: [], components: [], baseline: [], npmScripts: [], e2eFiles: [],
    fullCiRequired: false, liveReviewRequired: false, reasons: ["No changed paths supplied; no pass is claimed."]
  };
  const reasons = [];
  const direct = new Set();
  let full = false;
  let docs = 0;
  for (const path of paths) {
    if (!path || path.startsWith("/") || path.split("/").includes("..")) {
      full = true; reasons.push(`Untrusted path: ${path || "(empty)"}`); continue;
    }
    if (broadPolicy.test(path)) {
      full = true; reasons.push(`Policy, dependency, schema, auth, or config change: ${path}`);
      continue;
    }
    if (proseDoc.test(path)) { docs++; continue; }
    const matches = entries.filter(([, spec]) => spec.patterns.some(pattern => new RegExp(pattern).test(path))).map(([id]) => id);
    if (matches.length === 0) { full = true; reasons.push(`Unmapped code or artifact: ${path}`); }
    else { matches.forEach(id => direct.add(id)); reasons.push(`${path} -> ${matches.join(", ")}`); }
  }
  if (!full && docs === paths.length) return {
    status: "docs_only", changedPaths: paths, components: [], baseline: [], npmScripts: [], e2eFiles: [],
    fullCiRequired: false, liveReviewRequired: false, reasons: ["Ordinary prose documentation only; validate links and claims manually."]
  };
  if (direct.has("AUTH")) { full = true; reasons.push("Authentication boundary requires broad coverage."); }
  const selected = full ? new Set(entries.map(([id]) => id)) : new Set(direct);
  const queue = [...selected];
  for (let index = 0; index < queue.length; index++) {
    for (const child of registry.components[queue[index]].dependents) {
      if (!selected.has(child)) { selected.add(child); queue.push(child); }
    }
  }
  const ordered = entries.map(([id]) => id).filter(id => selected.has(id));
  const npmScripts = [...new Set(ordered.flatMap(id => registry.components[id].scripts))];
  const e2eFiles = [...new Set(ordered.flatMap(id => registry.components[id].e2e))];
  if (full) reasons.push("Broad offline plan required; review the normal CI gate separately.");
  else if (ordered.length > direct.size) reasons.push(`Included downstream consumers: ${ordered.filter(id => !direct.has(id)).join(", ")}`);
  const liveReviewRequired = ordered.some(id => liveComponents.has(id));
  if (liveReviewRequired) reasons.push("Review protected Preview live coverage separately; this plan makes no live calls.");
  return {
    status: full ? "broad_review" : "targeted_review", changedPaths: paths, components: ordered,
    baseline: ["lint", "build"], npmScripts, e2eFiles, fullCiRequired: full, liveReviewRequired, reasons
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const inputs = [];
  for (let index = 2; index < process.argv.length; index++) {
    const value = process.argv[index];
    if (value === "--old" || value === "--new") {
      if (!process.argv[index + 1]) throw new Error(`${value} needs a path`);
      inputs.push(process.argv[++index]);
    } else inputs.push(value);
  }
  process.stdout.write(`${JSON.stringify(selectPlan(inputs), null, 2)}\n`);
}
