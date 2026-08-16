import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const files = {
  model: "src/lib/dashboard/dashboard-model.ts",
  dashboard: "components/express-dashboard.tsx",
  analysisReport: "components/reports/analysis-report-print.tsx",
  comparisonReport: "components/reports/comparison-report-print.tsx",
  reportPrimitives: "components/reports/report-print-primitives.tsx",
  lineage: "src/lib/source-lineage-snapshot.ts"
};

const source = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, relativePath]) => [
      key,
      await readFile(path.join(root, relativePath), "utf8")
    ])
  )
);

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const exactCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

assert(source.model.includes(`export const DECISION_RESULT_CAVEAT =\n  "${exactCaveat}" as const;`), "Decision contract must own the exact caveat");
assert(source.model.includes('export const DECISION_RESULT_CONTRACT_VERSION = "1.0" as const;'), "Decision contract version is missing");
assert(source.model.includes("export type DecisionResultContract"), "Immutable decision-result type is missing");
assert(source.model.includes("Readonly<{"), "Decision-result contract must use readonly types");
assert(source.model.includes("Object.freeze({"), "Decision-result contract must be frozen at runtime");
assert(source.model.includes('const ILLUSTRATIVE_LOCAL_CONTEXT = "Illustrative local screening context";'), "Illustrative provenance label is missing");
assert(!source.model.includes('value: "Local context"'), "Dashboard evidence KPI must not hide illustrative or imported provenance behind Local context");
assert(source.model.includes('value: hasOpenContext && hasIllustrativeContext'), "Dashboard evidence KPI must distinguish mixed open and illustrative provenance");
assert(source.model.includes("function identityText("), "Decision contract must preserve asset and AOI identities without narrative rewrites");
assert(
  /const targetLabel = identityText\([\s\S]*?analysis\.selectedAoi\?\.name[\s\S]*?"Map selection"/.test(source.model),
  "Runtime target identity must use structural sanitization instead of customer-facing narrative rewrites"
);
assert(
  /query && \(query\.endsWith\("\?"\) \|\| looksLikeDecisionPrompt\)[\s\S]*?identityText\(query/.test(source.model),
  "User-entered decision questions must retain their wording"
);
assert(!/const targetLabel = customerFacingText\(\s*analysis\.selectedAoi\?\.name/.test(source.model), "Runtime target identity must not be rewritten as marketing copy");
assert(
  /const items = uniqueText\(names\.map\(\(name\) => identityText\(name, ""\)\)\)/.test(source.model),
  "Uploaded and lineage source identities must use structural sanitization"
);
assert(
  source.model.includes('`User-provided context: ${identityText(item.label, "User-provided source")}`'),
  "User-provided evidence names must retain their identity"
);
assert(
  !/sourceBasisFromNames[\s\S]*?names\.map\(\(name\) => customerFacingText\(name\)\)/.test(source.model),
  "Source identity lists must not use narrative term replacement"
);

const provenanceReplacementLines = source.model
  .split("\n")
  .filter((line) => line.includes(".replace(") && /seed|synthetic|mock|sample|demo|fixture/i.test(line));
assert(provenanceReplacementLines.length > 0, "Illustrative provenance replacements are missing");
for (const line of provenanceReplacementLines) {
  assert(
    line.includes("ILLUSTRATIVE_LOCAL_CONTEXT") || /Illustrative/i.test(line),
    `Fixture provenance is neutralized instead of disclosed: ${line.trim()}`
  );
}

for (const builder of [
  "buildDecisionResult",
  "buildAnalysisReportDecisionResult",
  "buildComparisonDecisionResult"
]) {
  assert(source.model.includes(`export function ${builder}`), `${builder} is missing`);
}

assert(/export function buildDashboardModel[\s\S]*?const decisionResult = buildDecisionResult\(analysis\)/.test(source.model), "Dashboard model must project the canonical decision result");
assert(/return \{\s*decisionResult,/.test(source.model), "Dashboard model must expose the canonical decision result");

const requiredDashboardReads = [
  "decisionResult.target.label",
  "decisionResult.coordinates",
  "decisionResult.scenario.label",
  "decisionResult.decision.posture",
  "decisionResult.decision.rationale",
  "decisionResult.primaryScore",
  "decisionResult.confidence.label",
  "decisionResult.validation.status",
  "decisionResult.nextAction",
  "decisionResult.sourceBasis",
  "decisionResult.generatedAt",
  "decisionResult.caveat"
];

for (const field of requiredDashboardReads) {
  assert(source.dashboard.includes(field), `Dashboard does not render ${field}`);
}

assert(source.dashboard.includes("data-decision-contract-version={decisionResult.contractVersion}"), "Dashboard contract version marker is missing");
assert(source.dashboard.includes("Illustrative local screening geometry"), "Dashboard fixed geometry must be visibly illustrative");
assert(source.analysisReport.includes("buildAnalysisReportDecisionResult(report)"), "Analysis report must build the canonical decision result");
assert(source.comparisonReport.includes("buildComparisonDecisionResult(report)"), "Comparison report must build the canonical decision result");
assert(source.analysisReport.includes("Illustrative local screening geometry"), "Analysis report fixed geometry must be visibly illustrative");
assert(source.analysisReport.includes("Illustrative local market screening context"), "Analysis report fixed market context must be visibly illustrative");
assert(!source.analysisReport.includes("marketContext?.areaName"), "Analysis report must not bypass the decision contract with raw market-context presentation text");
assert(source.comparisonReport.includes("Illustrative comparison context"), "Comparison report map must be visibly illustrative");
assert(source.reportPrimitives.includes("function SourceLineagePrintSection"), "Printable source-lineage section is missing");
assert(source.reportPrimitives.includes('/(?:synthetic|demo|mock|fixture)/i'), "Printable source-lineage names are not sanitized");
assert(source.reportPrimitives.includes('"Illustrative local screening context"'), "Printable source-lineage fallback label is missing");
assert(source.reportPrimitives.includes('return "local snapshot"'), "Printable fallback status is not presented as a bounded local snapshot");
assert(
  source.lineage.includes(".filter((source) => runtimeBySourceId.has(source.id))"),
  "External lineage must be derived only from runtime-observed sources"
);
assert(!source.lineage.includes("evidenceSourceIds"), "Evidence references must not be classified as runtime-observed external data");
assert(
  source.reportPrimitives.includes('title: "Runtime-observed external context"'),
  "Printable lineage must distinguish runtime-observed external context"
);
assert(!source.reportPrimitives.includes('title: "External data used"'), "Printable lineage must not overstate evidence references as external data used");

const requiredReportReads = [
  "decisionResult.target",
  "decisionResult.coordinates",
  "decisionResult.scenario",
  "decisionResult.decision.posture",
  "decisionResult.decision.rationale",
  "decisionResult.primaryScore",
  "decisionResult.confidence",
  "decisionResult.validation",
  "decisionResult.drivers",
  "decisionResult.risks",
  "decisionResult.nextAction",
  "decisionResult.sourceBasis",
  "decisionResult.generatedAt",
  "decisionResult.caveat"
];

for (const [name, reportSource] of [
  ["analysis report", source.analysisReport],
  ["comparison report", source.comparisonReport]
]) {
  for (const field of requiredReportReads) {
    assert(reportSource.includes(field), `${name} does not render ${field}`);
  }
  assert(reportSource.includes("data-decision-contract-version={decisionResult.contractVersion}"), `${name} contract version marker is missing`);
  assert(reportSource.includes("DECISION_RESULT_CAVEAT"), `${name} must render the canonical caveat constant`);
  assert(reportSource.includes("SourceLineagePrintSection"), `${name} must render the sanitized source-lineage section`);
  assert(!reportSource.includes("report.dataHonestyNote"), `${name} must not append a divergent caveat`);
  assert(!reportSource.includes("ValidationGovernanceAppendix"), `${name} must not append decision data outside the immutable contract`);
}

const customerSurfaceSource = [source.dashboard, source.analysisReport, source.comparisonReport]
  .join("\n")
  .replaceAll('"demo-feature"', '"screening-feature"');
assert(!/\b(mock|sample|demo|mvp)\b/i.test(customerSurfaceSource), "Customer dashboard/report source contains legacy fixture terminology");
assert(!source.analysisReport.includes("planning, engineering, insurance or valuation conclusion"), "Engineering/insurance note must remain separate from the exact caveat");

if (failures.length > 0) {
  console.error("Decision-result parity check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Decision-result parity check passed.");
console.log(`Contract version: 1.0`);
console.log(`Caveat: ${exactCaveat}`);
console.log("Surfaces: runtime dashboard, analysis print report, comparison print report");
