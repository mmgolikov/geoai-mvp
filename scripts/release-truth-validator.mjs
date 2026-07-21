import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const requiredReleaseCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
export const releaseAuthorityPolicyPath = "docs/RELEASE_AUTHORITY_POLICY.json";
export const lastVerifiedReleaseSnapshotPath = "docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json";
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
    failures.push(`${relativePath}: required release-authority file is missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function parseJson(root, relativePath, failures) {
  const content = readText(root, relativePath, failures);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    failures.push(`${relativePath}: invalid JSON`);
    return null;
  }
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function pushMatches(failures, relativePath, content, expression, message) {
  for (const match of content.matchAll(expression)) {
    failures.push(`${relativePath}:${lineNumberAt(content, match.index ?? 0)}: ${message}`);
  }
}

export function validateReleaseAuthorityPolicy(policy, relativePath = releaseAuthorityPolicyPath) {
  const failures = [];
  if (policy?.schemaVersion !== "1.0") failures.push(`${relativePath}: schemaVersion must be 1.0`);
  if (policy?.authorityType !== "repository_release_policy") failures.push(`${relativePath}: authorityType must be repository_release_policy`);
  if (policy?.repositoryRole !== "policy_schema_and_historical_evidence") failures.push(`${relativePath}: repository role must be policy/schema plus historical evidence`);
  if (policy?.currentOperationalAuthority !== "external_post_release_evidence") failures.push(`${relativePath}: current operational authority must be external post-release evidence`);
  const capabilities = policy?.repositoryCiCapabilities;
  if (capabilities?.queriesLiveGithubState !== false || capabilities?.queriesLiveVercelState !== false || capabilities?.mayDeclareCurrentOperationalRuntime !== false) {
    failures.push(`${relativePath}: repository CI must explicitly deny live GitHub/Vercel queries and current-runtime declarations`);
  }
  const precedence = policy?.authorityPrecedence;
  if (!Array.isArray(precedence) || precedence.at(-1) !== "repository_historical_snapshot" || !precedence.includes("vercel_production_alias")) {
    failures.push(`${relativePath}: authority precedence must put repository snapshots last and include Vercel Production alias`);
  }
  const requiredFields = policy?.requiredPostReleaseEvidenceFields;
  for (const field of ["verifiedAt", "mergedPullRequest", "mainSha", "qualityGateRunId", "productionDeploymentId", "productionUrl", "routeSmoke", "runtimeLogInspection", "dataHonestyCaveat"]) {
    if (!Array.isArray(requiredFields) || !requiredFields.includes(field)) failures.push(`${relativePath}: required post-release field missing: ${field}`);
  }
  if (policy?.snapshotRules?.requiredAuthorityType !== "historical_last_verified_snapshot" || policy?.snapshotRules?.mustNeverBeLabelledCurrent !== true || policy?.snapshotRules?.externalReceiptMaySupersede !== true) {
    failures.push(`${relativePath}: historical/current lifecycle rules are incomplete`);
  }
  if (policy?.requiredCaveat !== requiredReleaseCaveat) failures.push(`${relativePath}: required caveat mismatch`);
  const forbiddenClaims = policy?.maturityClaimsForbidden;
  if (!Array.isArray(forbiddenClaims) || !forbiddenClaims.includes("production-ready") || !forbiddenClaims.includes("pilot-ready")) {
    failures.push(`${relativePath}: maturity claim prohibitions are incomplete`);
  }
  return failures;
}

export function validateHistoricalReleaseSnapshot(snapshot, relativePath = lastVerifiedReleaseSnapshotPath) {
  const failures = [];
  if (snapshot?.schemaVersion !== "1.0") failures.push(`${relativePath}: schemaVersion must be 1.0`);
  if (snapshot?.authorityType !== "historical_last_verified_snapshot" || snapshot?.snapshotLabel !== "historical_last_verified_snapshot") {
    failures.push(`${relativePath}: historical snapshot must never be labelled current`);
  }
  if (snapshot?.currentOperationalAuthority !== false) failures.push(`${relativePath}: historical snapshot cannot claim current operational authority`);
  if (snapshot?.supersededWhenNewerReleaseExists !== true) failures.push(`${relativePath}: newer external release evidence must supersede the snapshot`);
  if (snapshot?.repositoryCiQueriedLiveGithub !== false || snapshot?.repositoryCiQueriedLiveVercel !== false) {
    failures.push(`${relativePath}: repository CI cannot claim that it queried GitHub or Vercel live state`);
  }
  if (!Number.isFinite(Date.parse(snapshot?.verifiedAt ?? ""))) failures.push(`${relativePath}: verifiedAt must be ISO-8601`);
  if (!Number.isInteger(snapshot?.mergedPullRequest) || snapshot.mergedPullRequest < 1) failures.push(`${relativePath}: mergedPullRequest must be positive`);
  if (!/^[a-f0-9]{40}$/.test(snapshot?.mainSha ?? "")) failures.push(`${relativePath}: mainSha must be an exact lowercase SHA`);
  for (const field of ["productionDeploymentId", "rollbackDeploymentId"]) {
    if (!/^dpl_[A-Za-z0-9]{24,32}$/.test(snapshot?.[field] ?? "")) failures.push(`${relativePath}: ${field} must be an exact Vercel deployment ID`);
  }
  if (!/^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/.test(snapshot?.productionUrl ?? "")) failures.push(`${relativePath}: productionUrl must be a Vercel HTTPS URL`);
  if (snapshot?.productStage !== "public_demo_prototype" || snapshot?.publicDemoActive !== true) failures.push(`${relativePath}: historical public-demo stage mismatch`);
  for (const field of ["confidentialPilotReady", "protectedStorageActive", "realSourcesActive"]) {
    if (snapshot?.[field] !== false) failures.push(`${relativePath}: ${field} must remain false`);
  }
  if (!Array.isArray(snapshot?.caveats) || !snapshot.caveats.includes(requiredReleaseCaveat)) failures.push(`${relativePath}: required caveat missing`);
  const maturityText = [snapshot?.productStage, ...(snapshot?.caveats ?? [])].join("\n");
  if (/(?:production|pilot)[ -]?ready/i.test(maturityText)) failures.push(`${relativePath}: snapshot must not claim Production or pilot readiness`);
  return failures;
}

export function validateCurrentReleaseTruth({
  root = process.cwd(),
  policyPath = releaseAuthorityPolicyPath,
  snapshotPath = lastVerifiedReleaseSnapshotPath,
  activeDocPaths,
  releaseFactDocPaths = defaultReleaseFactDocs
} = {}) {
  const failures = [];
  const policy = parseJson(root, policyPath, failures);
  const snapshot = parseJson(root, snapshotPath, failures);
  if (policy) failures.push(...validateReleaseAuthorityPolicy(policy, policyPath));
  if (snapshot) failures.push(...validateHistoricalReleaseSnapshot(snapshot, snapshotPath));
  if (!policy || !snapshot) return { policy, snapshot, failures };

  const docs = activeDocPaths ?? releaseFactDocPaths;
  for (const relativePath of docs) {
    const content = readText(root, relativePath, failures);
    if (!content) continue;
    pushMatches(failures, relativePath, content, /current_operational_release_authority/gi, "repository content must not label a committed snapshot current operational authority");
    pushMatches(failures, relativePath, content, /(?:Current\s+(?:release|`?main`?|Production)|Release\s+authority|Current\s+operational\s+release)[^\n]*(?:PR\s+#106|cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b|dpl_6RC2ohEdLBjiV82k758tFMkaDB9X)/gi, "historical PR #106 snapshot is labelled current");
    pushMatches(failures, relativePath, content, /repository\s+CI[^\n]{0,160}(?:queried|verified live)[^\n]{0,80}(?:GitHub|Vercel)/gi, "repository CI cannot claim live runtime queries");
    if (snapshot.hostedSupabaseState?.authRehearsal?.confirmedAuthUsers === 1) {
      pushMatches(failures, relativePath, content, /(?:rehearsal|auth[- ]?rehearsal|bkmfcjzalcvdsdvyxpgi)[^\n]{0,160}(?:zero|0)\s+confirmed\s+Auth\s+users/gi, "active authority contradicts the historical hosted rehearsal count");
    }
  }

  for (const relativePath of releaseFactDocPaths) {
    const content = readText(root, relativePath, failures);
    if (!content) continue;
    if (!content.includes("RELEASE_AUTHORITY_POLICY.json")) failures.push(`${relativePath}: missing release-authority policy link/reference`);
    if (!content.includes("LAST_VERIFIED_RELEASE_SNAPSHOT.json")) failures.push(`${relativePath}: missing historical snapshot link/reference`);
    if (!/external post-release|external runtime|live authority is external/i.test(content)) failures.push(`${relativePath}: missing external current-runtime authority statement`);
  }

  return { policy, snapshot, failures };
}
