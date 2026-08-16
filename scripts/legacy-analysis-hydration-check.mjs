import { readFile } from "node:fs/promises";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const paths = {
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

const [normalizer, workspace, projectHub] = await Promise.all([
  read(paths.normalizer),
  read(paths.workspace),
  read(paths.projectHub)
]);

for (const [path, source] of [
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
  normalizer.includes("isMarketMetricsDecisionUseAllowed"),
  "Restore normalization must derive trusted source use from the release gate"
);
assert(
  normalizer.includes("scores: baseline.scores"),
  "Legacy source-adjusted scores must be replaced with the current deterministic baseline"
);
assert(
  normalizer.includes("hasBlockedSourceMatch(value)") && normalizer.includes("rebuildBlockedSourceScores(value)"),
  "Blocked source-linked restores must recompute scores even when a persisted importedMetricsUsed flag says false"
);
assert(
  normalizer.includes("aiDecisionScore: undefined"),
  "Derived legacy decision scores must be discarded"
);
assert(
  normalizer.includes("importedMetricsUsed: false") &&
    normalizer.includes("releaseGate: requiresReanalysis ? legacyRestoreReleaseGate : existingGate"),
  "Restored legacy source metadata must fail closed"
);
assert(
  normalizer.includes("requiresReanalysis: true") && normalizer.includes("legacyAnalysisReanalysisNotice"),
  "Legacy source-adjusted results must carry an explicit re-analysis requirement"
);
assert(
  normalizer.includes("containsLegacyReanalysisMarker(analysis)"),
  "The re-analysis requirement must survive Project Hub handoff normalization"
);

assert(
  /function readAnalysisHistory\([\s\S]*?normalizeRestoredAnalysisHistoryItem/.test(workspace),
  "Workspace localStorage history must normalize every restored analysis"
);
assert(
  /function readOpenAnalysisRequest\([\s\S]*?normalizeRestoredExpressAnalysis/.test(workspace),
  "Workspace Project Hub handoff must normalize its embedded analysis"
);
assert(
  /function historyItemFromPersistedRun\([\s\S]*?normalizeRestoredExpressAnalysis/.test(workspace),
  "Workspace Supabase analysis rows must be normalized before entering history"
);
assert(
  /function restoreAnalysisDashboard\([\s\S]*?normalizeRestoredExpressAnalysis/.test(workspace),
  "Workspace final restore boundary must normalize again before rendering"
);
assert(
  workspace.includes("setAnalysis(normalized.requiresReanalysis ? null : restoredAnalysis)"),
  "Workspace must not render a legacy decision result before re-analysis"
);
assert(
  /setLastAnalyzedState\(normalized\.requiresReanalysis\s*\? null/.test(workspace),
  "Workspace must not mark a legacy decision result as current"
);

assert(
  /function readLocalHistory\([\s\S]*?normalizeRestoredAnalysisHistoryItem/.test(projectHub),
  "Project Hub localStorage history must normalize every restored analysis"
);
assert(
  /function persistedRowsToRecent\([\s\S]*?normalizeRestoredExpressAnalysis/.test(projectHub),
  "Project Hub persisted analysis rows must be normalized before display or handoff"
);
assert(
  /function writeOpenAnalysisRequest\([\s\S]*?normalizeRestoredExpressAnalysis/.test(projectHub),
  "Project Hub must normalize the analysis again before writing the Workspace handoff"
);
assert(
  projectHub.includes("legacyAnalysisReanalysisPosture") && projectHub.includes("legacyAnalysisReanalysisNotice"),
  "Project Hub must label legacy rows as requiring re-analysis"
);

console.log("Legacy analysis hydration checks passed.");
console.log("- localStorage history: normalized");
console.log("- Supabase analysis rows: normalized");
console.log("- Project Hub handoff: normalized");
console.log("- legacy source-adjusted scores: withheld until re-analysis");
