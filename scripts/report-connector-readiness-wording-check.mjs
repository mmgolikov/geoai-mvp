import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const moduleCache = new Map();
const requiredCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resolveTypeScriptModule(id) {
  if (id.startsWith("@/")) return path.join(process.cwd(), `${id.slice(2)}.ts`);
  return path.join(process.cwd(), id);
}

function loadTypeScriptModule(id) {
  const sourcePath = resolveTypeScriptModule(id);
  if (moduleCache.has(sourcePath)) return moduleCache.get(sourcePath);

  const source = fs.readFileSync(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      verbatimModuleSyntax: false
    },
    fileName: sourcePath
  }).outputText;
  const module = { exports: {} };
  moduleCache.set(sourcePath, module.exports);
  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    require: (request) => {
      if (request.startsWith("@/")) return loadTypeScriptModule(request);
      throw new Error(`Connector display helper unexpectedly required ${request}`);
    }
  }, { filename: sourcePath });
  moduleCache.set(sourcePath, module.exports);
  return module.exports;
}

const helperSource = read("src/lib/validation/official-connector-readiness.ts");
const appendixSource = read("components/validation-governance-appendix.tsx");
const analysisPrintSource = read("components/reports/analysis-report-print.tsx");
const comparisonPrintSource = read("components/reports/comparison-report-print.tsx");
const printableReportSource = read("components/printable-report.tsx");
const reportPreviewSource = read("components/report-preview.tsx");
const executableReportSource = [
  appendixSource,
  analysisPrintSource,
  comparisonPrintSource,
  printableReportSource,
  reportPreviewSource
].join("\n");
const { connectorReadinessDisplayLabel } = loadTypeScriptModule(
  "src/lib/validation/official-connector-readiness.ts"
);

assert(
  connectorReadinessDisplayLabel("manual_snapshot_ready") ===
    "manual import path available; no verified snapshot attached",
  "Manual import readiness must not imply that a verified snapshot is attached"
);
assert(
  connectorReadinessDisplayLabel("manual_snapshot_ready", { verifiedSnapshotAttached: false }) ===
    "manual import path available; no verified snapshot attached",
  "An explicit false attachment state must use the conservative label"
);
assert(
  connectorReadinessDisplayLabel("manual_snapshot_ready", { verifiedSnapshotAttached: true }) ===
    "verified snapshot attached",
  "The future explicit verified attachment path is not preserved"
);
assert(
  connectorReadinessDisplayLabel("permission_required") === "permission required",
  "Other connector statuses must retain conservative underscore formatting"
);
assert(
  appendixSource.includes("connectorReadinessDisplayLabel(connector.currentStatus)"),
  "Validation Governance Appendix must use the shared connector display helper"
);
assert(
  !appendixSource.includes("claimLevelLabel(connector.currentStatus)"),
  "Validation Governance Appendix must not directly format connector.currentStatus"
);
assert(
  !executableReportSource.toLowerCase().includes("manual snapshot ready"),
  "Executable report code contains the unsupported client-facing phrase"
);

for (const heuristicToken of [
  "filename",
  "mimetype",
  "notes",
  "providername",
  "substring",
  "fuzzy",
  ".includes(",
  ".match(",
  ".startswith("
]) {
  assert(
    !helperSource.toLowerCase().includes(heuristicToken),
    `Connector display helper contains prohibited evidence-inference token: ${heuristicToken}`
  );
}
assert(
  appendixSource.includes("connectorReadinessDisplayLabel(connector.currentStatus)") &&
    !appendixSource.includes("verifiedSnapshotAttached:"),
  "Current reports must not activate the verified attachment state"
);
assert(
  analysisPrintSource.includes('import { ValidationGovernanceAppendix } from "@/components/validation-governance-appendix"') &&
    analysisPrintSource.includes("<ValidationGovernanceAppendix"),
  "Analysis print report must use the shared Validation Governance Appendix"
);
assert(
  comparisonPrintSource.includes('import { ValidationGovernanceAppendix } from "@/components/validation-governance-appendix"') &&
    comparisonPrintSource.includes("<ValidationGovernanceAppendix"),
  "Comparison print report must use the shared Validation Governance Appendix"
);
assert(
  appendixSource.includes("validationRequiredCaveat") &&
    loadTypeScriptModule("src/types/validation.ts").validationRequiredCaveat.toLowerCase() === requiredCaveat.toLowerCase(),
  "Required data-honesty caveat must remain in the shared appendix"
);

console.log(JSON.stringify({
  ok: true,
  checked: [
    "conservative default connector label",
    "explicit future verified attachment label",
    "shared appendix helper use",
    "direct connector status formatting removal",
    "unsupported report wording absence",
    "filename and fuzzy heuristic absence",
    "shared analysis and comparison appendix",
    "required caveat preservation"
  ],
  caveat: requiredCaveat
}, null, 2));
