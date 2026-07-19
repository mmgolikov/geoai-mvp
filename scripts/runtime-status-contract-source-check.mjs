import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadPureTypeScriptModule(file) {
  const source = read(file);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: file
  }).outputText;
  const module = { exports: {} };
  const unavailableRequire = (request) => {
    throw new Error(`Pure contract unexpectedly required ${request}`);
  };
  new Function("exports", "module", "require", output)(module.exports, module, unavailableRequire);
  return module.exports;
}

function row(status, label) {
  return status.rows.find((item) => item.label === label);
}

const contractSource = read("src/lib/platform/runtime-status-contract.ts");
const routeSource = read("app/api/pilot-backend/status/route.ts");
const dashboardSource = read("components/project-dashboard/project-dashboard.tsx");
const reportNormalizationSource = read("src/lib/report-display-normalization.ts");
const queryAnswerSource = read("src/lib/custom-query/query-answer.ts");
const runtime = loadPureTypeScriptModule("src/lib/platform/runtime-status-contract.ts");
const reports = loadPureTypeScriptModule("src/lib/report-display-normalization.ts");

assert(contractSource.includes("Public demo workflow"), "Contract must expose public demo workflow separately");
assert(contractSource.includes("Confidential pilot"), "Contract must expose confidential pilot separately");
assert(contractSource.includes("Public demo access"), "Contract must use public demo access label");
assert(contractSource.includes("Not connected in this runtime"), "Contract must distinguish runtime reachability");
assert(contractSource.includes("manual import path available; no verified snapshot attached"), "Contract must clarify manual import readiness");
assert(routeSource.includes("buildRuntimeExecutiveStatus"), "Pilot backend route must derive the executive contract");
assert(routeSource.includes("executiveStatus"), "Pilot backend route must expose executiveStatus");
assert(routeSource.includes('sourceMode: "operator_only_disabled_for_public"'), "Pilot backend route must expose a static public source mode");
assert(!routeSource.includes("getRuntimeSourcePackActivationMode"), "Public pilot status must not leak operator source-pack configuration");
assert(!routeSource.includes("getSupabaseRuntimeReadiness") && !routeSource.includes("getPilotBackendActivationSummary"), "Public pilot status must not invoke privileged infrastructure readiness probes");
assert(dashboardSource.includes("pilotBackendStatus?.executiveStatus?.rows ?? initialRuntimeStatusRows"), "Project Hub must consume executive rows with neutral initial state");
assert(dashboardSource.includes("Review-ready screening memo previews remain connected to the workspace result and report flow."), "Project Hub must use review-ready memo wording");
assert(dashboardSource.includes("connectorRuntimeStatusLabel"), "Project Hub must use conservative connector wording");
assert(dashboardSource.includes("storageRuntimeSummary"), "Project Hub must use the three-state Storage summary");
assert(dashboardSource.includes("normalizeCompactReportMetadata"), "Project Hub must normalize report metadata");
assert(reportNormalizationSource.includes("comparableMetadataValue"), "Report metadata comparison must normalize whitespace and punctuation");

for (const prohibited of [
  "Sample pilot",
  "Pilot access",
  "Public sample access is disabled",
  "Client-ready memo generation",
  "manual snapshot ready"
]) {
  assert(!dashboardSource.includes(prohibited), `Project Hub contains prohibited stale label: ${prohibited}`);
}
assert(!queryAnswerSource.includes("Define measurable criteria for"), "Custom Query contains the superseded action wording");

const productionDemoInput = {
  vercelEnvironment: "production",
  authMode: "demo_public",
  repositoryMode: "local_fallback",
  accessEnforcementMode: "soft",
  canRunDemoWorkflow: true,
  canRunConfidentialPilot: false,
  supabaseConfigured: false,
  supabaseReachable: false,
  schemaReady: false,
  storageConfigured: false,
  storageReady: false,
  auditFoundationPresent: false,
  authSessionVerified: false,
  projectMembershipsVerified: false,
  rlsPoliciesVerified: false,
  hardAccessEnabled: false,
  hardAccessVerified: false
};
const productionDemo = runtime.buildRuntimeExecutiveStatus(productionDemoInput);
assert(productionDemo.environment === "vercel_production_demo", "Production demo environment was not derived");
assert(productionDemo.demoWorkflow === "demo_workflow_degraded", "Local fallback demo workflow must remain available but degraded");
assert(productionDemo.confidentialPilot === "confidential_pilot_blocked", "Production demo must keep confidential pilot blocked");
assert(row(productionDemo, "Public demo workflow")?.value === "Available", "Production public demo row must be Available");
assert(row(productionDemo, "Confidential pilot")?.value === "Blocked", "Confidential pilot row must be Blocked");
assert(row(productionDemo, "Auth")?.value === "Public demo access", "Production demo Auth row is incorrect");
assert(row(productionDemo, "Repository")?.value === "Local/demo fallback", "Production repository row is incorrect");
assert(row(productionDemo, "Supabase schema")?.value === "Not connected in this runtime", "Production Supabase row is incorrect");
assert(row(productionDemo, "Storage")?.value === "Not connected in this runtime", "Production Storage row is incorrect");

const browserLocalDemo = runtime.buildRuntimeExecutiveStatus({
  ...productionDemoInput,
  repositoryMode: "browser_local",
  infrastructureDiagnosticsWithheld: true
});
assert(browserLocalDemo.demoWorkflow === "demo_workflow_available", "Browser-local public demo must not be labelled as server fallback degradation");
assert(row(browserLocalDemo, "Repository")?.value === "Browser-local demo", "Browser-local repository row is incorrect");
assert(row(browserLocalDemo, "Supabase schema")?.value === "Not attested on public endpoint", "Public status must not fabricate a negative Supabase diagnostic");
assert(row(browserLocalDemo, "Storage")?.value === "Not attested on public endpoint", "Public status must not fabricate a negative Storage diagnostic");

const configuredUnverifiedAuth = runtime.buildRuntimeExecutiveStatus({
  ...productionDemoInput,
  vercelEnvironment: "preview",
  authMode: "supabase_auth",
  repositoryMode: "browser_local",
  accessEnforcementMode: "soft",
  canRunDemoWorkflow: true,
  canRunConfidentialPilot: false,
  supabaseConfigured: true,
  supabaseReachable: false,
  schemaReady: false,
  authSessionVerified: false,
  projectMembershipsVerified: false,
  infrastructureDiagnosticsWithheld: true
});
assert(configuredUnverifiedAuth.accessMode === "supabase_auth_configured_unverified", "Configured Auth without verified caller/membership must remain explicitly unverified");
assert(configuredUnverifiedAuth.demoWorkflow === "demo_workflow_available", "Configured but unverified Auth must not hide the controlled browser-local demo");
assert(configuredUnverifiedAuth.confidentialPilot === "confidential_pilot_blocked", "Configured but unverified Auth must keep confidential access blocked");
assert(row(configuredUnverifiedAuth, "Auth")?.value === "Supabase Auth configured; caller unverified", "Configured/unverified Auth row is incorrect");

const previewEvidence = runtime.buildRuntimeExecutiveStatus({
  vercelEnvironment: "preview",
  authMode: "supabase_auth",
  repositoryMode: "supabase",
  accessEnforcementMode: "soft",
  canRunDemoWorkflow: true,
  canRunConfidentialPilot: false,
  supabaseConfigured: true,
  supabaseReachable: true,
  schemaReady: true,
  storageConfigured: true,
  storageReady: true,
  auditFoundationPresent: true,
  authSessionVerified: true,
  projectMembershipsVerified: true,
  rlsPoliciesVerified: false,
  hardAccessEnabled: false,
  hardAccessVerified: false
});
assert(previewEvidence.environment === "vercel_preview", "Preview environment was not derived");
assert(previewEvidence.accessMode === "supabase_authenticated_preview", "Preview Auth mode is incorrect");
assert(previewEvidence.confidentialPilot === "confidential_pilot_blocked", "Preview evidence must not promote confidential pilot");
assert(row(previewEvidence, "Supabase schema")?.note.includes("Preview read-only evidence"), "Preview Supabase note must remain environment-scoped");
assert(row(previewEvidence, "RLS")?.value !== "Verified in this runtime", "Preview RLS must not be promoted without live tests");
assert(!JSON.stringify(previewEvidence).includes("production-ready"), "Preview contract contains a Production readiness claim");

assert(runtime.initialRuntimeStatusRows.length === 3, "Initial executive state must contain exactly three neutral rows");
assert(row({ rows: runtime.initialRuntimeStatusRows }, "Public demo workflow")?.value === "Checking", "Initial demo workflow must be neutral");
assert(row({ rows: runtime.initialRuntimeStatusRows }, "Confidential pilot")?.value === "Checking", "Initial confidential pilot must be neutral");
assert(row({ rows: runtime.initialRuntimeStatusRows }, "Auth")?.value === "Checking runtime status", "Initial Auth must be neutral");

const unverifiedHardAccess = runtime.buildRuntimeExecutiveStatus({
  ...productionDemoInput,
  vercelEnvironment: "preview",
  authMode: "supabase_auth",
  repositoryMode: "supabase",
  accessEnforcementMode: "hard",
  canRunDemoWorkflow: true,
  canRunConfidentialPilot: false,
  supabaseConfigured: true,
  supabaseReachable: true,
  schemaReady: true,
  storageConfigured: true,
  storageReady: true,
  auditFoundationPresent: true,
  hardAccessEnabled: true,
  hardAccessVerified: false
});
assert(unverifiedHardAccess.accessMode === "hard_access_unverified", "Incomplete hard access evidence must remain unverified");
assert(unverifiedHardAccess.confidentialPilot === "confidential_pilot_blocked", "Hard mode alone must not promote confidential pilot");

assert(
  runtime.connectorRuntimeStatusLabel("manual_snapshot_ready") === "manual import path available; no verified snapshot attached",
  "Manual connector path must not imply an attached snapshot"
);
assert(
  runtime.storageRuntimeSummary({ configured: false, storageReady: false, evidenceFileCount: 0, metadataOnlyCount: 0 }).includes("not connected in this runtime"),
  "Storage summary must identify a disconnected runtime"
);
assert(
  runtime.storageRuntimeSummary({ configured: true, storageReady: false, evidenceFileCount: 0, metadataOnlyCount: 0 }).includes("configured but not verified"),
  "Storage summary must identify unverified configuration"
);
assert(
  runtime.storageRuntimeSummary({ configured: true, storageReady: true, evidenceFileCount: 1, metadataOnlyCount: 0 }).includes("reachable in this runtime"),
  "Storage summary must identify runtime reachability"
);

const analysisMetadata = reports.normalizeCompactReportMetadata({
  scenario: "Dubai Marina / JBR Market Signal",
  targetLabel: "Dubai Marina / JBR Market Signal",
  reportType: "analysis",
  projectKey: "dubai-investment-screening-demo"
});
assert(
  JSON.stringify(analysisMetadata) === JSON.stringify(["Investment Site Selection", "Dubai Marina / JBR Market Signal"]),
  "Seeded Marina metadata was not repaired to a meaningful scenario/target pair"
);
const comparisonMetadata = reports.normalizeCompactReportMetadata({
  scenario: "Comparison",
  targetLabel: "Dubai Marina, Business Bay, Dubai South",
  reportType: "comparison"
});
assert(
  JSON.stringify(comparisonMetadata) === JSON.stringify(["Screening Comparison", "Dubai Marina, Business Bay, Dubai South"]),
  "Comparison metadata must preserve scenario and compared-item summary"
);
const punctuationDuplicate = reports.normalizeCompactReportMetadata({
  scenario: "Dubai Marina - JBR Market Signal",
  targetLabel: " dubai marina / jbr market signal ",
  reportType: "analysis"
});
assert(new Set(punctuationDuplicate.map((value) => value.toLowerCase())).size === punctuationDuplicate.length, "Punctuation-normalized metadata must not duplicate values");

console.log(JSON.stringify({
  ok: true,
  matrices: [
    "production public demo",
    "configured but unverified Supabase Auth",
    "preview Supabase read-only evidence",
    "neutral client initial state",
    "hard access without complete evidence",
    "connector and Storage display states",
    "analysis/comparison metadata normalization"
  ],
  caveat: runtime.runtimeStatusCaveat
}, null, 2));
