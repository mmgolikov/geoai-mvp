import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const workspace = fs.readFileSync(path.join(root, "components/workspace-shell.tsx"), "utf8");
const panel = fs.readFileSync(path.join(root, "components/analysis-panel.tsx"), "utf8");
const mapWorkspace = fs.readFileSync(path.join(root, "components/map-workspace-client.tsx"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "components/express-dashboard.tsx"), "utf8");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function functionBody(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

const backToSetupFlow = functionBody(workspace, "backToMap", "openMapFromPanel");
const audienceFlow = functionBody(workspace, "changeExploreAudience", "changeExploreRole");
const projectFlow = functionBody(workspace, "changeActiveProject", "createProject");
const clearFlow = functionBody(workspace, "clearWorkspaceResultState", "loadGuidedDemo");
const setupStart = panel.indexOf("data-workspace-screening-setup");
const customQuery = panel.indexOf('htmlFor="custom-query"', setupStart);
const candidateSearch = panel.indexOf("Candidate Search", setupStart);
const setupEnd = panel.indexOf("</section>", customQuery);

assert(
  workspace.includes('data-workspace-surface={hasResultSurface ? "result" : "setup"}'),
  "Workspace must expose an explicit setup/result surface state."
);
assert(
  workspace.includes('? "order-1 lg:col-span-2 lg:h-full"'),
  "A result must span the complete desktop workspace instead of sharing space with setup."
);
assert(
  workspace.includes("{!hasResultSurface ? (") && workspace.includes("data-workspace-setup-surface"),
  "Setup must unmount while an analysis, comparison, or report result is active."
);
assert(
  workspace.includes("const hasResultSurface = Boolean(reportPreview || comparison || analysis)"),
  "Analysis, comparison, and report preview must all activate the result surface."
);
for (const marker of ["setAnalysis(null)", "setComparison(null)", "setComparisonReturn(null)", "setReportPreview(null)"]) {
  assert(backToSetupFlow.includes(marker), `Back to setup must clear ${marker}.`);
}

assert(!panel.includes("Active workflow"), "The duplicate Active workflow block must remain absent.");
assert(!panel.includes("lg:overflow-y-auto"), "The main setup flow must not use an internal vertical scroll container.");
assert(!panel.includes("[scrollbar-width:thin]"), "The setup panel must rely on page flow rather than a nested scrollbar.");
assert(
  customQuery > candidateSearch && customQuery < setupEnd,
  "Custom Query must remain in the main setup flow after Candidate Search."
);
assert(
  !panel.includes('setIsExploreSetupOpen(candidateSearchStatus !== "searched")'),
  "Scenario controls must not automatically expand and push Custom Query out of the compact flow."
);
assert(
  (panel.match(/onClick=\{onPrimaryCta\}/g) ?? []).length === 1 && panel.includes("sticky bottom-0"),
  "The setup must retain one stable primary action."
);

for (const marker of [
  'role="dialog"',
  'aria-modal="true"',
  'key="mobile-map-picker"',
  "Run Express Analysis",
  "Back to workflow",
  "forceSelectedTarget: true",
  'data-map-workspace-suspended="mobile-dialog"'
]) {
  assert(workspace.includes(marker), `Mobile full-screen map behavior is missing ${marker}.`);
}

assert(
  workspace.includes("project.metadata?.segment ?? project.metadata?.audience"),
  "Project segment must continue to derive from segment with audience compatibility fallback."
);
assert(
  workspace.includes("projects.filter((project) => getProjectSegment(project) === selectedExploreAudience)"),
  "The project selector must remain scoped to the active audience."
);
assert(
  audienceFlow.includes("getDefaultProjectForAudience(projects, audience)") && audienceFlow.includes("clearWorkspaceResultState()"),
  "Audience changes must select a matching project and clear stale result state."
);
assert(
  clearFlow.includes("setComparisonItems([])") && clearFlow.includes('setCustomQuery("")'),
  "Audience and project changes must clear cross-segment query and comparison state."
);
assert(
  projectFlow.includes("applyExploreDefaultsForProject(nextProject)"),
  "Direct project selection must continue to align audience, role, and scenario defaults."
);
assert(
  mapWorkspace.includes("handleKeyboardMapSelection") && mapWorkspace.includes('aria-label="Interactive map workspace. Press Enter or Space'),
  "The map must provide a keyboard path for the initial point selection."
);
assert(
  dashboard.includes("data-mobile-result-summary"),
  "Mobile results must expose posture, suitability and next action before the map detail."
);
assert(
  workspace.includes("createBoundedReportKey") && workspace.includes("sourceLineage,"),
  "Printable reports must use bounded IDs and carry their source-lineage snapshot."
);

for (const phrase of [
  "Imported sample metrics",
  "Sample comparison sites loaded",
  "local demo CSV metrics",
  "another demo project",
  "default public demo",
  "deterministic sample scoring",
  "deterministic sample/open context",
  "Project-scoped prototype storage"
]) {
  assert(!workspace.includes(phrase) && !panel.includes(phrase), `Customer-facing legacy wording remains: ${phrase}`);
}

if (failures.length > 0) {
  console.error("GCC workspace flow contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checked: [
    "result replaces setup",
    "back to setup",
    "compact page-flow setup",
    "Custom Query visibility",
    "single primary action",
    "mobile full-screen map direct run",
    "keyboard map selection",
    "mobile result continuity",
    "B2B/B2C project alignment",
    "cross-segment state clearing",
    "bounded report IDs and lineage",
    "customer-facing context wording"
  ],
  caveat
}, null, 2));
