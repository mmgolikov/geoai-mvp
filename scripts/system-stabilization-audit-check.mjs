import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { requiredReleaseCaveat } from "./release-truth-validator.mjs";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath}: required CR 09.23 file is missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requireText(relativePath, text, message) {
  const content = read(relativePath);
  if (!content.includes(text)) failures.push(`${relativePath}: ${message}`);
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

const currentSha = "cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b";
const currentPr = "PR #106";
const currentDeployment = "dpl_6RC2ohEdLBjiV82k758tFMkaDB9X";
const rollbackDeployment = "dpl_ERVqZPD5GAGDLjAVhMcPF2HT5Br7";
const qualityRun = "29835520415";
const qualityArtifact = "8497283837";
const databaseArtifact = "8497226028";

const requiredDocs = [
  "docs/SYSTEM_STABILIZATION_AUDIT_V2_2026_07_21.md",
  "docs/SYSTEM_STABILIZATION_FINDINGS_V2.json",
  "docs/RELEASE_AUTHORITY_LIFECYCLE_DECISION.md",
  "docs/PROTECTED_PILOT_READINESS_BACKLOG_V2.md",
  "docs/PDF_PRINT_QA_RECEIPT_V2.md",
  "docs/DATABASE_REPLAY_AUDIT_RECEIPT_V2.md",
  "docs/CURRENT_RELEASE_RECEIPT.json",
  "docs/CURRENT_RELEASE_STATE.md",
  "docs/DOCUMENTATION_INDEX.md"
];

for (const doc of requiredDocs) read(doc);

const receipt = parseJson("docs/CURRENT_RELEASE_RECEIPT.json");
if (receipt) {
  if (receipt.mergedPullRequest !== 106) failures.push("docs/CURRENT_RELEASE_RECEIPT.json: mergedPullRequest must be 106");
  if (receipt.mainSha !== currentSha) failures.push("docs/CURRENT_RELEASE_RECEIPT.json: mainSha must be the PR #106 merge SHA");
  if (receipt.productionDeploymentId !== currentDeployment) failures.push("docs/CURRENT_RELEASE_RECEIPT.json: productionDeploymentId must be current Vercel Production");
  if (receipt.rollbackDeploymentId !== rollbackDeployment) failures.push("docs/CURRENT_RELEASE_RECEIPT.json: rollbackDeploymentId must retain the PR #97 deployment");
  if (receipt.lifecycle?.authorityScope !== "current_operational_release_authority") failures.push("docs/CURRENT_RELEASE_RECEIPT.json: lifecycle authority scope is missing");
  if (receipt.githubEvidence?.postMergeQualityGateRunId !== 29835520415) failures.push("docs/CURRENT_RELEASE_RECEIPT.json: post-merge Quality Gate run mismatch");
  if (!receipt.caveats?.includes(requiredReleaseCaveat)) failures.push("docs/CURRENT_RELEASE_RECEIPT.json: required caveat missing");
}

const findings = parseJson("docs/SYSTEM_STABILIZATION_FINDINGS_V2.json");
if (findings) {
  if (findings.releasedMainSha !== currentSha) failures.push("docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: releasedMainSha mismatch");
  if (findings.production?.deploymentId !== currentDeployment) failures.push("docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: production deployment mismatch");
  if (findings.qualityGate?.runId !== 29835520415) failures.push("docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: Quality Gate run mismatch");
  if (findings.hostedSupabaseReadOnly?.development?.confirmedAuthUsers !== 0) failures.push("docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: development Auth count must remain 0");
  if (findings.hostedSupabaseReadOnly?.authRehearsal?.confirmedAuthUsers !== 1) failures.push("docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: Auth rehearsal confirmed Auth count must remain 1");
  if (findings.dataHonestyCaveat !== requiredReleaseCaveat) failures.push("docs/SYSTEM_STABILIZATION_FINDINGS_V2.json: required caveat mismatch");
}

for (const relativePath of [
  "docs/CURRENT_RELEASE_STATE.md",
  "docs/DOCUMENTATION_INDEX.md",
  "README.md",
  "AGENTS.md",
  "docs/roadmap.md",
  "docs/qa-checklist.md",
  "docs/CODEX_BACKLOG_2026_07_16.md",
  "docs/architecture.md",
  "docs/data-strategy.md"
]) {
  requireText(relativePath, currentSha, `missing current main SHA ${currentSha}`);
  requireText(relativePath, currentDeployment, `missing current Production deployment ${currentDeployment}`);
}

for (const relativePath of [
  "docs/SYSTEM_STABILIZATION_AUDIT_V2_2026_07_21.md",
  "docs/RELEASE_AUTHORITY_LIFECYCLE_DECISION.md",
  "docs/PROTECTED_PILOT_READINESS_BACKLOG_V2.md",
  "docs/PDF_PRINT_QA_RECEIPT_V2.md",
  "docs/DATABASE_REPLAY_AUDIT_RECEIPT_V2.md"
]) {
  requireText(relativePath, requiredReleaseCaveat, "required data-honesty caveat missing");
}

for (const [relativePath, required] of [
  ["docs/SYSTEM_STABILIZATION_AUDIT_V2_2026_07_21.md", [currentPr, qualityRun, qualityArtifact, databaseArtifact, "not ready for protected pilot"]],
  ["docs/PROTECTED_PILOT_READINESS_BACKLOG_V2.md", ["#85", "#88", "#89", "#90", "#99", "#104", "#105"]],
  ["docs/PDF_PRINT_QA_RECEIPT_V2.md", ["physical Chromium PDF", "Current Limitation"]],
  ["docs/DATABASE_REPLAY_AUDIT_RECEIPT_V2.md", ["not a development clone", "no Supabase write"]]
]) {
  for (const text of required) requireText(relativePath, text, `missing CR 09.23 invariant: ${text}`);
}

const activeAuthorityPattern = /(?:Current\s+(?:release|`?main`?)|Release\s+authority|Released\s+baseline)[^\n]*(?:PR\s+#97|b915a831d5e5b28eab5fd26ac86059820e7e4a32)/gi;
for (const relativePath of ["README.md", "AGENTS.md", "docs/CURRENT_RELEASE_STATE.md", "docs/DOCUMENTATION_INDEX.md", "docs/roadmap.md", "docs/qa-checklist.md", "docs/CODEX_BACKLOG_2026_07_16.md", "docs/architecture.md", "docs/data-strategy.md"]) {
  const content = read(relativePath);
  for (const match of content.matchAll(activeAuthorityPattern)) {
    failures.push(`${relativePath}: active authority still presents PR #97 as current near "${match[0].slice(0, 120)}"`);
  }
}

if (failures.length > 0) {
  console.error("System stabilization audit check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`System stabilization audit check passed: ${currentPr}, ${currentSha}, ${currentDeployment}, Quality Gate ${qualityRun}.`);
