import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { requiredReleaseCaveat, validateCurrentReleaseTruth } from "./release-truth-validator.mjs";

const root = process.cwd();
const failures = [];
const pdfEvidenceDir = process.env.GEOAI_PDF_EVIDENCE_DIR ?? "artifacts/pdf-print-evidence";

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath}: required CR 09.23 file is missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function parseJson(relativePath) {
  const content = read(relativePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    failures.push(`${relativePath}: invalid JSON`);
    return null;
  }
}

function requireText(relativePath, text, message) {
  if (!read(relativePath).includes(text)) failures.push(`${relativePath}: ${message}`);
}

const requiredDocs = [
  "docs/RELEASE_AUTHORITY_POLICY.json",
  "docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json",
  "docs/RELEASE_AUTHORITY_LIFECYCLE_DECISION.md",
  "docs/SYSTEM_STABILIZATION_AUDIT_V2_2026_07_21.md",
  "docs/SYSTEM_STABILIZATION_FINDINGS_V2.json",
  "docs/PDF_PRINT_QA_RECEIPT_V2.md",
  "docs/DATABASE_REPLAY_AUDIT_RECEIPT_V2.md",
  "docs/PROTECTED_PILOT_READINESS_BACKLOG_V2.md",
  "security/api-route-inventory.json"
];
for (const file of requiredDocs) read(file);

const releaseTruth = validateCurrentReleaseTruth({ root });
failures.push(...releaseTruth.failures);

const findings = parseJson("docs/SYSTEM_STABILIZATION_FINDINGS_V2.json");
if (findings) {
  const requiredFindingFields = ["id", "severity", "category", "title", "description", "exactEvidence", "affectedFiles", "affectedRoutes", "owner", "dependency", "recommendedAction", "status", "externalApprovalRequired"];
  if (!Array.isArray(findings.findings) || findings.findings.length < 20) failures.push("docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: materially complete findings list is required");
  const computed = { P0: 0, P1: 0, P2: 0, total: findings.findings?.length ?? 0 };
  for (const finding of findings.findings ?? []) {
    for (const field of requiredFindingFields) if (!(field in finding)) failures.push(`docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: ${finding.id ?? "unknown"} missing ${field}`);
    if (!["P0", "P1", "P2"].includes(finding.severity)) failures.push(`docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: ${finding.id} invalid severity`);
    else computed[finding.severity] += 1;
    if (!Array.isArray(finding.exactEvidence) || !Array.isArray(finding.affectedFiles) || !Array.isArray(finding.affectedRoutes)) failures.push(`docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: ${finding.id} evidence/files/routes must be arrays`);
    if (typeof finding.externalApprovalRequired !== "boolean") failures.push(`docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: ${finding.id} externalApprovalRequired must be boolean`);
  }
  for (const key of ["P0", "P1", "P2", "total"]) if (findings.counts?.[key] !== computed[key]) failures.push(`docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: ${key} count ${findings.counts?.[key]} does not match computed ${computed[key]}`);
  const requiredFindingIds = ["REL-01", "REL-02", "PDF-01", "PRINT-02", "BROWSER-01", "BROWSER-02", "BROWSER-03", "BROWSER-04", "BROWSER-05", "BROWSER-06", "API-01", "API-02", "API-03", "PERF-01", "PERF-02", "PERF-03", "PERF-04", "CI-01", "OBS-01", "DB-01", "DB-02", "AUTH-01", "STORAGE-01", "SOURCE-01", "DOCS-01"];
  const ids = new Set(findings.findings?.map((finding) => finding.id));
  for (const id of requiredFindingIds) if (!ids.has(id)) failures.push(`docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: required finding ${id} missing`);
  if (findings.dataHonestyCaveat !== requiredReleaseCaveat) failures.push("docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: required caveat mismatch");
}

const requiredAuditSections = [
  "Executive Summary", "Released Baseline", "Audit Methodology", "Passed Controls", "Findings By Severity", "Unproven Controls",
  "Frontend/Browser-Local Findings", "API Findings", "Security Findings", "UX/Accessibility Findings", "Performance Findings", "PDF/Print Findings",
  "Data/Backend Findings", "Documentation/Governance Findings", "Updated Dependency Plan", "Recommendations", "Next Steps", "Non-Authorizations"
];
for (const section of requiredAuditSections) requireText("docs/SYSTEM_STABILIZATION_AUDIT_V2_2026_07_21.md", `## ${section}`, `missing required audit section ${section}`);
for (const file of ["docs/SYSTEM_STABILIZATION_AUDIT_V2_2026_07_21.md", "docs/RELEASE_AUTHORITY_LIFECYCLE_DECISION.md", "docs/PDF_PRINT_QA_RECEIPT_V2.md", "docs/DATABASE_REPLAY_AUDIT_RECEIPT_V2.md"]) {
  requireText(file, requiredReleaseCaveat, "required data-honesty caveat missing");
}

const inventory = parseJson("security/api-route-inventory.json");
if (inventory) {
  if (inventory.schemaVersion !== "1.0" || inventory.routeCount !== 66 || Object.keys(inventory.routes ?? {}).length !== 66) failures.push("security/api-route-inventory.json: complete 66-route inventory required");
  for (const [route, entry] of Object.entries(inventory.routes ?? {})) {
    for (const field of ["route", "classification", "methods", "sourcePath"]) if (!(field in entry)) failures.push(`security/api-route-inventory.json: ${route} missing ${field}`);
    for (const [method, contract] of Object.entries(entry.methods ?? {})) {
      for (const field of ["cachePolicy", "requestSizeLimitBytes", "requestSizeLimitStatus", "positiveResponse", "negativeStatusMatrix", "diagnosticExposure"]) if (!(field in contract)) failures.push(`security/api-route-inventory.json: ${route} ${method} missing ${field}`);
    }
  }
}

for (const marker of ["malformed", "unknown-version", "oversized", "localStorage", "sessionStorage", "clipboard", "logout", "repeated request actions"]) {
  requireText("tests/e2e/system-resilience-flow.spec.ts", marker, `browser resilience test missing ${marker}`);
}
for (const marker of ["desktop-request-access", "desktop-profile", "transferredJsBytes", "decodedJsBytes", "largestChunks", "mapboxContribution", "finalUrl"]) {
  requireText("scripts/lighthouse-budget-check.mjs", marker, `Lighthouse evidence missing ${marker}`);
}
for (const marker of ["page.pdf", "pdftoppm", "pdftotext", "pdfinfo", "pdfimages", "capturedMapCheck", "pageNumbering", "long-source-lineage", "partial-evidence", "Letter"]) {
  requireText("scripts/pdf-print-evidence.mjs", marker, `physical PDF harness missing ${marker}`);
}

const manifestPath = `${pdfEvidenceDir}/pdf-print-manifest.json`;
const manifest = parseJson(manifestPath);
const mandatoryPdfNames = [
  "seeded-analysis-a4.pdf", "seeded-analysis-letter.pdf", "seeded-comparison-a4.pdf", "seeded-comparison-letter.pdf",
  "long-title-analysis-a4.pdf", "long-title-analysis-letter.pdf", "long-title-comparison-a4.pdf", "long-title-comparison-letter.pdf",
  "long-source-lineage-a4.pdf", "long-source-lineage-letter.pdf", "partial-evidence-a4.pdf", "partial-evidence-letter.pdf"
];
if (manifest) {
  if (manifest.evidenceType !== "physical_chromium_pdf" || manifest.pdfCount !== 12 || manifest.summary?.passed !== true) failures.push(`${manifestPath}: twelve passing physical Chromium PDFs required`);
  const records = new Map((manifest.reports ?? []).map((record) => [record.pdfFile, record]));
  for (const name of mandatoryPdfNames) {
    const relativePdf = `${pdfEvidenceDir}/${name}`;
    if (!existsSync(resolve(root, relativePdf))) failures.push(`${relativePdf}: mandatory physical PDF missing`);
    const record = records.get(name);
    if (!record?.passed || record.fileSize < 10_000 || !record.sha256 || !record.extractedTextFile || !Array.isArray(record.pageRasterFiles) || record.pageRasterFiles.length !== record.pageCount) failures.push(`${manifestPath}: ${name} manifest/file contract failed`);
    for (const check of ["blankPageCheck", "clippingCheck", "overflowCheck", "orphanHeadingCheck", "unexpectedCardSplitCheck", "mapAndTableBoundsCheck", "longWordAndUrlWrapCheck", "comparisonTableReadabilityCheck"]) {
      if (record?.[check]?.passed !== true) failures.push(`${manifestPath}: ${name} ${check} must pass`);
    }
    if (Object.values(record?.requiredTextChecks ?? {}).some((value) => value !== true)) failures.push(`${manifestPath}: ${name} required text checks must pass`);
    for (const raster of record?.pageRasterFiles ?? []) if (!existsSync(resolve(root, pdfEvidenceDir, raster))) failures.push(`${pdfEvidenceDir}/${raster}: page raster missing`);
    if (record?.extractedTextFile && !existsSync(resolve(root, pdfEvidenceDir, record.extractedTextFile))) failures.push(`${pdfEvidenceDir}/${record.extractedTextFile}: extracted text missing`);
  }
  for (const record of manifest.reports ?? []) if (record.reportType === "analysis" && record.capturedMapCheck?.required && record.capturedMapCheck?.passed !== true) failures.push(`${manifestPath}: ${record.pdfFile} captured Marina map check failed`);
}
for (const file of ["browser-console.log", "next-application.log", "pdf-generation.log", "pdf-print-summary.md"]) read(`${pdfEvidenceDir}/${file}`);

const workflow = read(".github/workflows/geoai-quality-gate.yml");
for (const marker of ["npm run test:api-route-inventory", "npm run test:e2e:auth-session", "npm run evidence:pdf-print", "poppler-utils", "lighthouse-desktop-request-access.json", "lighthouse-desktop-profile.json", "next-application.log", "npm run test:system-stabilization-audit"]) {
  if (!workflow.includes(marker)) failures.push(`.github/workflows/geoai-quality-gate.yml: missing permanent evidence step ${marker}`);
}

if (failures.length > 0) {
  console.error("System stabilization audit check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`System stabilization audit check passed: merge-safe authority, ${findings?.counts?.total ?? 0} findings, ${inventory?.routeCount ?? 0} API routes, ${manifest?.pdfCount ?? 0} physical PDFs.`);
