import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const requiredReleaseCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
export const currentReleaseReceiptPath = "docs/CURRENT_RELEASE_RECEIPT.json";
export const defaultReleaseFactDocs = [
  "docs/DOCUMENTATION_INDEX.md",
  "docs/CURRENT_RELEASE_STATE.md",
  "docs/FULL_SYSTEM_AUDIT_2026_07_16.md",
  "docs/roadmap.md",
  "README.md",
  "AGENTS.md"
];

function readText(root, relativePath, failures) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath}: required release-truth file is missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function pushMatches(failures, relativePath, content, expression, message) {
  for (const match of content.matchAll(expression)) {
    failures.push(`${relativePath}:${lineNumberAt(content, match.index ?? 0)}: ${message}`);
  }
}

export function validateReleaseReceipt(receipt, relativePath = currentReleaseReceiptPath) {
  const failures = [];
  const requiredFields = [
    "schemaVersion",
    "verifiedAt",
    "releaseType",
    "productStage",
    "mergedPullRequest",
    "mainSha",
    "productionDeploymentId",
    "productionUrl",
    "rollbackDeploymentId",
    "publicDemoActive",
    "confidentialPilotReady",
    "protectedStorageActive",
    "realSourcesActive",
    "caveats"
  ];

  for (const field of requiredFields) {
    if (!(field in (receipt ?? {}))) failures.push(`${relativePath}: missing required field ${field}`);
  }
  if (!/^\d+\.\d+$/.test(receipt?.schemaVersion ?? "")) failures.push(`${relativePath}: schemaVersion must use major.minor format`);
  if (!Number.isFinite(Date.parse(receipt?.verifiedAt ?? ""))) failures.push(`${relativePath}: verifiedAt must be an ISO-8601 timestamp`);
  if (receipt?.releaseType !== "production_public_demo") failures.push(`${relativePath}: releaseType must be production_public_demo`);
  if (receipt?.productStage !== "public_demo_prototype") failures.push(`${relativePath}: productStage must be public_demo_prototype`);
  if (!Number.isInteger(receipt?.mergedPullRequest) || receipt.mergedPullRequest < 1) failures.push(`${relativePath}: mergedPullRequest must be a positive integer`);
  if (!/^[a-f0-9]{40}$/.test(receipt?.mainSha ?? "")) failures.push(`${relativePath}: mainSha must be an exact 40-character lowercase Git SHA`);
  for (const field of ["productionDeploymentId", "rollbackDeploymentId"]) {
    if (!/^dpl_[A-Za-z0-9]{24,32}$/.test(receipt?.[field] ?? "")) failures.push(`${relativePath}: ${field} must be an exact Vercel deployment ID`);
  }
  if (!/^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/.test(receipt?.productionUrl ?? "")) failures.push(`${relativePath}: productionUrl must be an HTTPS vercel.app URL`);
  for (const field of ["publicDemoActive", "confidentialPilotReady", "protectedStorageActive", "realSourcesActive"]) {
    if (typeof receipt?.[field] !== "boolean") failures.push(`${relativePath}: ${field} must be boolean`);
  }
  if (receipt?.publicDemoActive !== true) failures.push(`${relativePath}: the released public demo must remain active`);
  for (const field of ["confidentialPilotReady", "protectedStorageActive", "realSourcesActive"]) {
    if (receipt?.[field] !== false) failures.push(`${relativePath}: ${field} must remain false for the current release`);
  }
  if (!Array.isArray(receipt?.caveats) || receipt.caveats.length === 0 || receipt.caveats.some((value) => typeof value !== "string" || !value.trim())) {
    failures.push(`${relativePath}: caveats must be a non-empty string array`);
  } else if (!receipt.caveats.includes(requiredReleaseCaveat)) {
    failures.push(`${relativePath}: required data-honesty caveat is missing`);
  }
  if (receipt?.hostedSupabaseState !== undefined) {
    const hosted = receipt.hostedSupabaseState;
    const development = hosted?.development;
    const rehearsal = hosted?.authRehearsal;
    if (development?.migrationLedgerEntries !== 10) failures.push(`${relativePath}: development hosted migration ledger count must be 10`);
    if (development?.confirmedAuthUsers !== 0) failures.push(`${relativePath}: development hosted confirmed Auth user count must be 0`);
    if (rehearsal?.migrationLedgerEntries !== 18) failures.push(`${relativePath}: Auth rehearsal hosted migration ledger count must be 18`);
    if (rehearsal?.confirmedAuthUsers !== 1) failures.push(`${relativePath}: Auth rehearsal hosted confirmed Auth user count must be 1`);
    if (rehearsal?.preExistingConfirmedAuthUsers !== 1) failures.push(`${relativePath}: Auth rehearsal must record one pre-existing confirmed Auth user`);
    if (rehearsal?.usersCreatedByCurrentChange !== 0) failures.push(`${relativePath}: current change must not create rehearsal Auth users`);
    for (const field of [
      "pgtapTransactionsCreateResidualUsers",
      "preExistingUserHasProjectMembershipAuthority",
      "preExistingUserHasTenantAuthority",
      "preExistingUserHasProtectedResourceAuthority",
      "realUserBrowserPersonaExecutedByCurrentChange"
    ]) {
      if (rehearsal?.[field] !== false) failures.push(`${relativePath}: ${field} must be false`);
    }
  }
  const maturityStatements = [receipt?.releaseType, receipt?.productStage, ...(Array.isArray(receipt?.caveats) ? receipt.caveats : [])].join("\n");
  if (/(?:production|pilot)[ -]?ready/i.test(maturityStatements)) {
    failures.push(`${relativePath}: receipt must not claim Production or pilot readiness`);
  }
  return failures;
}

export function validateCurrentReleaseTruth({
  root = process.cwd(),
  receiptPath = currentReleaseReceiptPath,
  activeDocPaths,
  releaseFactDocPaths = defaultReleaseFactDocs
} = {}) {
  const failures = [];
  const receiptContent = readText(root, receiptPath, failures);
  let receipt = null;
  if (receiptContent) {
    try {
      receipt = JSON.parse(receiptContent);
      failures.push(...validateReleaseReceipt(receipt, receiptPath));
    } catch {
      failures.push(`${receiptPath}: invalid JSON`);
    }
  }
  if (!receipt) return { receipt: null, failures };

  const docs = activeDocPaths ?? releaseFactDocPaths;
  for (const relativePath of docs) {
    const content = readText(root, relativePath, failures);
    if (!content) continue;
    pushMatches(failures, relativePath, content, /(?:Draft\s+PR\s+#97|PR\s+#97[^\n]*(?:Draft|unreleased)|unreleased[^\n]*PR\s+#97)/gi, "PR #97 is merged and must not be described as Draft or unreleased");
    pushMatches(failures, relativePath, content, /Production\s+remains\s+(?:on\s+)?PR\s+#87/gi, "Production is released from merged PR #97, not PR #87");
    pushMatches(failures, relativePath, content, /(?:Current\s+`?main`?|Release\s+authority|Released\s+baseline)[^\n]*2999e7e857989baf53ce58ecfed63550b5896be0/gi, "current release statement uses the obsolete main SHA");
    pushMatches(failures, relativePath, content, /(?:Current\s+Production|Vercel\s+Production)[^\n]*dpl_EAXREH31JKznnGbQYEU8bNqTqagN/gi, "current Production statement uses the rollback deployment as current");
    if (receipt.hostedSupabaseState?.authRehearsal?.confirmedAuthUsers === 1) {
      pushMatches(
        failures,
        relativePath,
        content,
        /(?:rehearsal|auth[- ]?rehearsal|bkmfcjzalcvdsdvyxpgi)[^\n]{0,160}(?:zero|0)\s+confirmed\s+Auth\s+users/gi,
        "active authority claims zero hosted rehearsal confirmed Auth users while the receipt records one pre-existing user"
      );
      pushMatches(
        failures,
        relativePath,
        content,
        /(?:rehearsal|auth[- ]?rehearsal|bkmfcjzalcvdsdvyxpgi)[^\n]{0,160}auth\.users\s*=\s*0/gi,
        "active authority claims zero hosted rehearsal auth.users while the receipt records one pre-existing user"
      );
    }
  }

  for (const relativePath of releaseFactDocPaths) {
    const content = readText(root, relativePath, failures);
    if (!content) continue;
    for (const [value, label] of [
      [receipt.mainSha, "released main SHA"],
      [receipt.productionDeploymentId, "Production deployment ID"],
      [receipt.productionUrl, "Production URL"],
      [`PR #${receipt.mergedPullRequest}`, "merged pull request"],
      [receipt.productStage, "product stage"]
    ]) {
      if (!content.includes(String(value))) failures.push(`${relativePath}: missing canonical ${label} from ${receiptPath}`);
    }
  }

  return { receipt, failures };
}
