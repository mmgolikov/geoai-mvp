import { readFile } from "node:fs/promises";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const paths = {
  authority: "src/lib/analysis-restore-authority.ts",
  normalizer: "src/lib/analysis-restore-normalization.ts",
  workspace: "components/workspace-shell.tsx",
  projectHub: "components/project-dashboard/project-dashboard.tsx"
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

const [authority, normalizer, workspace, projectHub] = await Promise.all([
  read(paths.authority),
  read(paths.normalizer),
  read(paths.workspace),
  read(paths.projectHub)
]);

for (const [path, source] of [
  [paths.authority, authority],
  [paths.normalizer, normalizer],
  [paths.workspace, workspace],
  [paths.projectHub, projectHub]
]) {
  const transpiled = ts.transpileModule(source, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });
  const transpileErrors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  assert(
    transpileErrors.length === 0,
    `${path} must transpile: ${transpileErrors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join("; ")}`
  );
}

assert(
  normalizer.includes("currentAppReleaseGate") &&
    normalizer.includes("MARKET_METRICS_SAMPLE_RELEASE_GATE") &&
    normalizer.includes("MARKET_METRICS_FALLBACK_RELEASE_GATE"),
  "Restore normalization must derive source authority from current app-owned release policy"
);
assert(
  normalizer.includes("findBestMarketMetricMatch") &&
    normalizer.includes("findBestMarketMetricMatch") &&
    normalizer.includes("dubaiMarketAreas") &&
    !normalizer.includes("market-context-adapter") &&
    normalizer.includes("rebuildCurrentMarketScreening"),
  "Persisted market matches must be replaced by current app-owned local matching"
);
assert(
  !normalizer.includes("...(match as MarketMetricsMatch)") &&
    normalizer.includes("matchedAreaName: match.matchedAreaName") &&
    normalizer.includes("metrics: match.metrics"),
  "The restored match must be rebuilt field-by-field from the current matcher, not spread from persistence"
);
assert(
  normalizer.includes("summary: baseline.summary") &&
    normalizer.includes("scores: baseline.scores") &&
    normalizer.includes("evidence: baseline.evidence") &&
    normalizer.includes("aiDecisionScore: undefined"),
  "Persisted decision fields must be rebuilt from the canonical deterministic builder"
);
assert(
  normalizer.includes("hasValidEvidenceArray") &&
    normalizer.includes("hasValidOptionalStringArray") &&
    normalizer.includes("catch") &&
    normalizer.includes("return null"),
  "Malformed evidence and limitations must fail closed without throwing through the collection boundary"
);
assert(
  normalizer.includes("canonicalizeRestoredAnalysisInputs(value, context)") &&
    authority.includes("projectRestoreBoundaryMatches") &&
    authority.includes("expectedProject"),
  "Restore must be anchored to an explicit canonical project"
);
assert(
  authority.includes("latitude < -90") &&
    authority.includes("longitude > 180") &&
    authority.includes("safePointTarget") &&
    authority.includes("safeObjectTarget") &&
    authority.includes("safeAoiTarget"),
  "Spatial inputs and analysis targets must be bounded and rebuilt from canonical context"
);
assert(
  authority.includes("getDemoFeatureById") &&
    authority.includes("guidedDemoPresets") &&
    authority.includes("seededDemoRecentAnalyses") &&
    authority.includes("findAppOwnedExploreSelection"),
  "App-owned demo, guided, seeded and Explore selections must resolve from current registries"
);
assert(
  authority.includes("candidate.projectKey === context.expectedProject.projectKey") &&
    authority.includes("currentRestoreDatasets") &&
    authority.includes("readCanonicalAoi"),
  "Uploaded objects and AOIs must be resolved only from the current project scope"
);
assert(
  normalizer.includes("Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.") &&
    authority.includes("Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."),
  "Canonical restore must preserve the exact data-honesty caveat"
);

assert(
  /function readAnalysisHistory\([\s\S]*?normalizeRestoredAnalysisHistoryItem\([\s\S]*?createBrowserAnalysisRestoreContext\(canonicalProject\)/.test(workspace),
  "Workspace localStorage history must normalize against a canonical project"
);
assert(
  /function readOpenAnalysisRequest\(expectedProject[\s\S]*?normalizeRestoredExpressAnalysis[\s\S]*?createBrowserAnalysisRestoreContext\(expectedProject/.test(workspace),
  "Workspace Project Hub handoff must normalize against the URL-resolved canonical project"
);
assert(
  /function historyItemFromPersistedRun\(value: unknown, expectedProject[\s\S]*?normalizeRestoredExpressAnalysis/.test(workspace),
  "Workspace Supabase rows must normalize against the active canonical project"
);
assert(
  /function restoreAnalysisDashboard\(item: AnalysisHistoryItem, expectedProject[\s\S]*?normalizeRestoredAnalysisHistoryItem/.test(workspace),
  "Workspace final restore boundary must normalize again before rendering"
);
assert(
  workspace.includes("setAnalysis(normalized.requiresReanalysis ? null : restoredAnalysis)") &&
    /setLastAnalyzedState\(normalized\.requiresReanalysis\s*\? null/.test(workspace),
  "Workspace must not render or mark a legacy result current before re-analysis"
);

assert(
  /function readLocalHistory\(projects[\s\S]*?normalizeRestoredAnalysisHistoryItem\([\s\S]*?createBrowserAnalysisRestoreContext\(expectedProject\)/.test(projectHub),
  "Project Hub localStorage history must normalize each item against a canonical project"
);
assert(
  /function persistedRowsToRecent\(items: PersistedAnalysisRun\[\], expectedProject[\s\S]*?normalizeRestoredExpressAnalysis/.test(projectHub),
  "Project Hub persisted rows must normalize against the active canonical project"
);
assert(
  /function writeOpenAnalysisRequest\(row: RecentAnalysisRow, expectedProject[\s\S]*?normalizeRestoredExpressAnalysis/.test(projectHub),
  "Project Hub handoff must normalize against the active canonical project"
);

console.log("Legacy analysis hydration checks passed.");
console.log("- persisted metrics: re-derived from current local matcher");
console.log("- project, segment and spatial target boundaries: canonicalized");
console.log("- malformed history members: isolated per item");
console.log("- legacy source-adjusted scores: withheld until re-analysis");

await import("./analysis-restore-adversarial-check.mjs");
