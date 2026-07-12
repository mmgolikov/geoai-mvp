import fs from "node:fs";
import path from "node:path";

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const page = read("app/reports/[id]/print/page.tsx");
const analysis = read("components/reports/analysis-report-print.tsx");
const comparison = read("components/reports/comparison-report-print.tsx");
const appendix = read("components/validation-governance-appendix.tsx");
const normalization = read("src/lib/report-display-normalization.ts");

assert(page.includes("normalizeReportForDisplay"), "Printable route must apply display normalization");
assert(page.includes("Review-ready screening memo preview"), "Printable route must use review-ready wording");

assert(analysis.includes('label="Saved report timestamp"'), "Analysis report must label saved timestamp");
assert(analysis.includes('label="Demo screening posture"'), "Analysis report must label screening posture");
assert(analysis.includes('title="Schematic Map Context"'), "Analysis report must label schematic map context");
assert(analysis.includes('note="Demo deterministic score"'), "Analysis report must label demo scores");
assert(!analysis.includes('title="Selected Geometry Map"'), "Old authoritative map heading must not remain");
assert(!analysis.includes('label="Decision posture"'), "Old unqualified posture label must not remain");

assert(comparison.includes('label="Saved report timestamp"'), "Comparison report must label saved timestamp");
assert(comparison.includes('label="Demo screening preference"'), "Comparison report must label screening preference");
assert(comparison.includes('title="Schematic Comparison Context"'), "Comparison report must label schematic context");
assert(comparison.includes("Demo deterministic score"), "Comparison report must label demo scores");
assert(!comparison.includes('label="Recommended option"'), "Old unqualified recommendation label must not remain");

assert(normalization.includes("Investment Site Selection"), "Scenario normalization must include Investment Site Selection");
assert(normalization.includes("dedupeDisclaimers"), "Report caveats must be deduplicated");
assert(!normalization.includes("Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion. Browser"), "Display note must not duplicate the canonical caveat");

assert(appendix.includes("manual import path available; no verified snapshot attached"), "Connector appendix must distinguish import path from attached snapshot");
assert(appendix.includes("No project-specific validation evidence is attached to this report."), "Empty validation state must not imply no gaps");

console.log(JSON.stringify({
  ok: true,
  checked: [
    "print route normalization",
    "analysis report labels",
    "comparison report labels",
    "scenario normalization",
    "caveat deduplication",
    "connector readiness wording"
  ],
  caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
}, null, 2));
