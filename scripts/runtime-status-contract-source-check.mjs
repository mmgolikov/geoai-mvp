import fs from "node:fs";
import path from "node:path";

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const helper = read("src/lib/platform/runtime-status-contract.ts");
const route = read("app/api/pilot-backend/status/route.ts");
const dashboard = read("components/project-dashboard/project-dashboard.tsx");

assert(helper.includes("Public demo workflow"), "Contract must expose public demo workflow separately");
assert(helper.includes("Confidential pilot"), "Contract must expose confidential pilot separately");
assert(helper.includes("Public demo access"), "Contract must use public demo access label");
assert(helper.includes("Not connected in this runtime"), "Contract must distinguish runtime reachability");
assert(helper.includes("manual import path available; no verified snapshot attached"), "Contract must clarify manual source readiness");
assert(helper.includes("demo_workflow_available"), "Contract must define demo workflow states");
assert(helper.includes("confidential_pilot_blocked"), "Contract must define confidential pilot states");

assert(route.includes("buildRuntimeExecutiveStatus"), "Pilot backend route must build canonical executive status");
assert(route.includes("executiveStatus"), "Pilot backend route must return executive status");

assert(dashboard.includes("pilotBackendStatus?.executiveStatus?.rows"), "Project Hub must consume canonical status rows");
assert(dashboard.includes("connectorRuntimeStatusLabel"), "Project Hub must use connector status normalization");
assert(dashboard.includes("storageRuntimeSummary"), "Project Hub must use runtime storage wording");
assert(dashboard.includes("Review-ready screening memo previews"), "Project Hub must use review-ready report wording");
assert(!dashboard.includes('label: "Sample pilot"'), "Project Hub must not conflate demo workflow with pilot readiness");
assert(!dashboard.includes('value: platformStatus?.authMode === "supabase_auth" ? "Supabase Auth" : "Pilot access"'), "Project Hub must not label demo mode as pilot access");
assert(!dashboard.includes("Public sample access is disabled"), "Project Hub must not contradict available demo access");
assert(!dashboard.includes("Client-ready memo generation"), "Project Hub must not claim client-ready reports");

console.log(JSON.stringify({
  ok: true,
  checked: [
    "canonical runtime states",
    "pilot backend executive status",
    "Project Hub status rows",
    "runtime storage wording",
    "connector readiness wording",
    "review-ready report wording",
    "legacy contradictory labels removed"
  ],
  caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
}, null, 2));
