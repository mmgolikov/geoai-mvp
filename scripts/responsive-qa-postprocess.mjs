import fs from "node:fs";
import path from "node:path";

const outputDir = path.join(process.cwd(), "artifacts", "responsive-qa");
const summaryPath = path.join(outputDir, "responsive-qa-summary.json");
const markdownPath = path.join(outputDir, "responsive-qa-summary.md");
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

if (!fs.existsSync(summaryPath)) {
  throw new Error("Responsive QA summary is missing; post-processing cannot continue.");
}

const result = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const reviewedAutomationFindings = [];

function workspaceCase(viewport) {
  return result.cases.find((item) => item.route === "/workspace" && item.viewport === viewport);
}

result.findings = result.findings.filter((finding) => {
  if (!finding.code.startsWith("WORKSPACE_OPEN_MAP_")) return true;
  const viewport = finding.code.replace("WORKSPACE_OPEN_MAP_", "");
  const evidence = workspaceCase(viewport);
  const picker = evidence?.mapPicker;
  const pickerPassed = Boolean(
    picker?.headerVisible &&
    picker?.back?.fullyInViewport &&
    picker?.run?.fullyInViewport
  );
  if (!pickerPassed) return true;
  reviewedAutomationFindings.push({
    original: finding,
    classification: "automation_false_positive_reviewed",
    reason: "The hydrated initial state was Criteria-first, where Open map is not required. The same evidence case subsequently switched to Map-first and verified the map-picker header, Back to workflow and Run Express Analysis controls fully inside the viewport."
  });
  return false;
});

function intersects(a, b) {
  if (!a || !b) return false;
  const horizontal = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const vertical = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return horizontal > 1 && vertical > 1;
}

for (const evidence of result.cases.filter((item) => item.route === "/workspace")) {
  const textarea = evidence.initial?.customQueryTextarea;
  const overlappingActions = (evidence.initial?.primaryActions ?? []).filter((action) => intersects(textarea, action.rect));
  if (!overlappingActions.length) continue;
  const width = Number(evidence.viewport.split("x")[0]);
  result.findings.push({
    severity: width <= 430 ? "P0" : "P1",
    code: `WORKSPACE_QUERY_STICKY_OVERLAP_${evidence.viewport}`,
    message: "The sticky primary-action area overlaps the Custom Query textarea in the rendered viewport.",
    evidence: {
      viewport: evidence.viewport,
      textarea,
      overlappingActions,
      screenshot: `${evidence.viewport}-workspace-initial.png`
    }
  });
}

const projectCases = result.cases.filter((item) => item.route === "/projects");
if (projectCases.length && projectCases.every((item) => item.expanded?.advancedOpen !== true)) {
  result.findings.push({
    severity: "P1",
    code: "PROJECTS_ADVANCED_INTERACTION_UNVERIFIED",
    message: "The automated run did not successfully open Advanced project diagnostics, so its contradictory readiness/access labels remain verified by the separate source/runtime audit rather than this screenshot package.",
    evidence: {
      attemptedViewports: projectCases.map((item) => item.viewport),
      governingSources: ["AUD-DEV6-001", "STATUS-CONTRACT-001"]
    }
  });
}

result.reviewedAutomationFindings = reviewedAutomationFindings;
result.method = `${result.method}+evidence_reconciliation_v1`;
result.findings.sort((a, b) => {
  const order = { P0: 0, P1: 1, P2: 2 };
  return (order[a.severity] ?? 9) - (order[b.severity] ?? 9) || a.code.localeCompare(b.code);
});
result.counts = result.findings.reduce((acc, finding) => {
  acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
  return acc;
}, { P0: 0, P1: 0, P2: 0 });
result.ok = result.counts.P0 === 0;

fs.writeFileSync(summaryPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

const lines = [
  "# GeoAI Responsive Visual QA Result",
  "",
  `- Method: ${result.method}`,
  `- Generated: ${result.generatedAt}`,
  `- Base URL: ${result.baseUrl}`,
  `- Result: ${result.ok ? "PASS WITH RECORDED ISSUES" : "FAIL"}`,
  `- P0: ${result.counts.P0}`,
  `- P1: ${result.counts.P1}`,
  `- P2: ${result.counts.P2}`,
  `- Reviewed automation false positives: ${reviewedAutomationFindings.length}`,
  "",
  "## Findings",
  ""
];
for (const finding of result.findings) {
  lines.push(`- **${finding.severity} ${finding.code}** — ${finding.message}`);
}
if (reviewedAutomationFindings.length) {
  lines.push("", "## Reviewed automation findings", "");
  for (const reviewed of reviewedAutomationFindings) {
    lines.push(`- **${reviewed.original.code}** — ${reviewed.reason}`);
  }
}
lines.push("", "## Caveat", "", caveat, "");
fs.writeFileSync(markdownPath, lines.join("\n"), "utf8");

console.log(JSON.stringify({
  ok: result.ok,
  counts: result.counts,
  reviewedAutomationFindings: reviewedAutomationFindings.length,
  output: path.relative(process.cwd(), summaryPath)
}, null, 2));

if (!result.ok) process.exit(1);
