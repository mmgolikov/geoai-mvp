import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const source = readFileSync(
  resolve(process.cwd(), "components/project-dashboard/project-dashboard.tsx"),
  "utf8"
);

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

function occurrenceCount(value) {
  return source.split(value).length - 1;
}

const primaryWorkIndex = source.indexOf("data-primary-project-work");
const lineageIndex = source.indexOf("data-canonical-source-lineage");
const diagnosticsIndex = source.indexOf("Advanced project diagnostics");
const primaryWork = source.slice(primaryWorkIndex, lineageIndex);
const diagnostics = source.slice(diagnosticsIndex);

requireCondition(
  source.includes("data-project-summary-strip") && source.includes("ProjectSummaryMetric"),
  "Project Hub must expose one compact project summary strip."
);
requireCondition(
  !source.includes("function KpiCard") && source.includes('className="flex min-h-[104px]'),
  "Decorative KPI cards must be replaced by compact balanced summary metrics."
);
requireCondition(
  primaryWorkIndex >= 0 && lineageIndex > primaryWorkIndex && diagnosticsIndex > lineageIndex,
  "Canonical Source Lineage must follow primary project work and precede advanced diagnostics."
);
requireCondition(
  occurrenceCount('title="Data Readiness / Source Lineage"') === 1 && occurrenceCount("data-canonical-source-lineage") === 1,
  "Project Hub must render exactly one canonical Data Readiness / Source Lineage surface."
);

for (const title of ["Recent analyses", "Saved candidates / AOIs", "Comparisons", "Reports", "Project files / evidence"]) {
  requireCondition(
    primaryWork.includes(`title="${title}"`),
    `${title} must remain in the primary project work area.`
  );
}

for (const duplicateTitle of [
  "Project Activity / Recent Analyses",
  "Reports / Memos",
  "Enterprise Report Packages",
  "Comparison Shortlist"
]) {
  requireCondition(
    !diagnostics.includes(`title="${duplicateTitle}"`),
    `${duplicateTitle} must not be duplicated inside advanced diagnostics.`
  );
}

requireCondition(
  source.includes("project.metadata?.segment ?? project.metadata?.audience"),
  "Project segment must derive from metadata.segment with metadata.audience fallback."
);
requireCondition(
  source.includes("projects.filter((project) => getProjectSegment(project) === activeProjectSegment)") &&
    source.includes("const projectOptions = visibleProjects;"),
  "The hydrated project selector must contain only projects from the active segment."
);
requireCondition(
  source.includes("selectedProject") &&
    source.includes("getProjectSegment(selectedProject)") &&
    source.includes("const matchingProject = projects.find((project) => getProjectSegment(project) === activeProjectSegment)"),
  "URL selection and hydration must realign the active project to its segment."
);
requireCondition(
  source.includes(caveat),
  "Project Hub must preserve the exact required data-honesty caveat."
);
requireCondition(
  source.includes('value === "sample_fallback" ? "Illustrative local screening context"'),
  "Internal fallback mode must have an honest customer-facing local-context label."
);

for (const prohibitedDisplayCopy of [
  "Public demo containment is active",
  "The public demo keeps project work",
  "Local/sample fallback; durable storage not configured",
  "Sample/open and offline data; official validation required",
  "active sample project",
  ">Sample example<"
]) {
  requireCondition(
    !source.includes(prohibitedDisplayCopy),
    `Customer-facing engineering copy remains: ${prohibitedDisplayCopy}`
  );
}

if (failures.length > 0) {
  console.error("GCC Project Hub contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("GCC Project Hub contract passed: compact summary, segment isolation, canonical lineage, and de-duplicated diagnostics verified.");
