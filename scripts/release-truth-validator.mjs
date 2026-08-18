import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const requiredReleaseCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
export const releaseAuthorityPolicyPath = "docs/RELEASE_AUTHORITY_POLICY.json";
export const lastVerifiedReleaseSnapshotPath = "docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json";
export const externalAuthorityRegistryPath = "docs/EXTERNAL_AUTHORITY_REGISTRY.json";
export const canonicalCurrentRelease = Object.freeze({
  mergedPullRequest: 113,
  mainSha: "7f323c4227f2409f3fe2d4d68be48a30176f4e2a",
  releaseProductionSha: "7f323c4227f2409f3fe2d4d68be48a30176f4e2a",
  productionDeploymentId: "dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE",
  productionUrl: "https://geoai-mvp.vercel.app",
  productionStatus: "READY",
  productStage: "public_demo_prototype"
});
export const hostedSupabasePhysicalSurfaces = Object.freeze([
  "schema_and_migration_ledger",
  "auth_users_and_database_rows",
  "advisors",
  "rls_and_policies",
  "postgrest_configuration",
  "storage_buckets_and_object_policies",
  "source_rows"
]);
export const defaultReleaseFactDocs = [
  "docs/DOCUMENTATION_INDEX.md",
  "docs/CURRENT_RELEASE_STATE.md",
  "docs/PRODUCT_BASELINE_AND_READINESS.md",
  "docs/architecture.md",
  "docs/data-strategy.md",
  "docs/roadmap.md",
  "docs/qa-checklist.md",
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

export function validateEvidenceWindow(evidenceWindow, relativePath, { now = new Date() } = {}) {
  const failures = [];
  const observedAt = evidenceWindow?.observedAt;
  const validUntil = evidenceWindow?.validUntil;
  const validityHours = evidenceWindow?.validityHours;
  const exactUtcTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  const observedMs = exactUtcTimestamp.test(observedAt ?? "") ? Date.parse(observedAt) : Number.NaN;
  const validUntilMs = exactUtcTimestamp.test(validUntil ?? "") ? Date.parse(validUntil) : Number.NaN;
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);

  if (!Number.isFinite(observedMs)) failures.push(`${relativePath}: evidenceWindow.observedAt must be an exact UTC ISO-8601 timestamp`);
  if (!Number.isFinite(validUntilMs)) failures.push(`${relativePath}: evidenceWindow.validUntil must be an exact UTC ISO-8601 timestamp`);
  if (!Number.isInteger(validityHours) || validityHours < 1) failures.push(`${relativePath}: evidenceWindow.validityHours must be a positive integer`);
  if (evidenceWindow?.expiryAction !== "fail") failures.push(`${relativePath}: evidenceWindow.expiryAction must be fail`);
  if (!Number.isFinite(nowMs)) failures.push(`${relativePath}: validation clock must be a valid timestamp`);

  if (Number.isFinite(observedMs) && Number.isFinite(validUntilMs)) {
    if (validUntilMs <= observedMs) failures.push(`${relativePath}: evidenceWindow.validUntil must be after observedAt`);
    if (Number.isInteger(validityHours) && validUntilMs !== observedMs + validityHours * 60 * 60 * 1000) {
      failures.push(`${relativePath}: evidenceWindow.validUntil must equal observedAt plus validityHours`);
    }
    if (Number.isFinite(nowMs) && observedMs > nowMs) failures.push(`${relativePath}: evidenceWindow.observedAt cannot be in the future`);
    if (Number.isFinite(nowMs) && nowMs >= validUntilMs) failures.push(`${relativePath}: evidence expired at ${validUntil}`);
  }

  return failures;
}

export function validateHostedSupabaseTruthClaims(content, relativePath = "active-document") {
  const failures = [];
  const explicitCurrentPhysical = /\b(?:active hosted (?:truth|state)\s+(?:is|has|contains|shows)|current hosted (?:truth|state)\s+(?:is|has|contains|shows)|currently (?:has|have|carry|carries|contain|contains|report|reports|expose|exposes|show|shows)|still (?:has|have|carries|contains|reports|exposes|shows|retains|pins|pinned)|live development Data API remains(?!\s+unverified))\b/i;
  const hostedApplyState = /\b(?:applied|executed|unapplied)\b[^.!?\n]{0,120}\b(?:geoai-dev|geoai-auth-rehearsal|rehearsal|development|Production|everywhere)\b/i;
  const physicalFact = /(?:\b\d+\s+(?:canonical schema )?migrations?\b|\b(?:zero|one|\d+)\s+(?:pre-existing )?(?:confirmed )?Auth users?\b|\ball\s+`?29`?\s+[^.!?\n]{0,80}\bRLS\b|\b\d+\s+(?:Storage )?buckets?\b|\bzero\s+(?:`?storage[.]objects`?\s+)?(?:object\s+)?policies\b|\b\d+\s+[^.!?\n]{0,40}\bTRUNCATE grants\b|\b(?:source rows?|acquired-source tables)\b|\badvisors?\s+(?:returned|report|reports)\b|\bpgrst[.]db_schemas\s*=\s*api\b|\b\d+-RPC\b|\b(?:applied|executed|unapplied)\b[^.!?\n]{0,120}\b(?:rehearsal|development|Production)\b)/i;
  const historicalQualifier = /\b(?:historical|point-in-time|receipt|snapshot|recorded|local custody|local manifest|repository custody|static|pending|unverified)\b/i;

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (explicitCurrentPhysical.test(line) && (physicalFact.test(line) || /\b(?:Supabase|geoai-dev|geoai-auth-rehearsal|hosted source|Data API|PostgREST|RLS|Storage|advisors?)\b/i.test(line))) {
      failures.push(`${relativePath}:${index + 1}: current hosted Supabase physical-state claim is prohibited without fresh physical readback`);
      continue;
    }
    if (/^\s*-\s*\[\s\]\s*/.test(line)) continue;
    if (hostedApplyState.test(line) && !historicalQualifier.test(line)) {
      failures.push(`${relativePath}:${index + 1}: hosted migration/application state must be historical or unverified`);
      continue;
    }
    if (physicalFact.test(line) && /\b(?:geoai-dev|geoai-auth-rehearsal|rehearsal|development Supabase|hosted|PostgREST|Storage|advisors?|RLS)\b/i.test(line) && !historicalQualifier.test(line)) {
      failures.push(`${relativePath}:${index + 1}: hosted physical values require an explicit historical or unverified qualifier`);
    }
  }

  return failures;
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

export function validateExternalAuthorityRegistry(
  registry,
  relativePath = externalAuthorityRegistryPath,
  expectedRelease = canonicalCurrentRelease,
  { now = new Date() } = {}
) {
  const failures = [];
  if (registry?.schemaVersion !== "1.1") failures.push(`${relativePath}: schemaVersion must be 1.1`);
  if (registry?.authorityType !== "timeboxed_external_authority_registry") {
    failures.push(`${relativePath}: authorityType must be timeboxed_external_authority_registry`);
  }
  if (!Number.isFinite(Date.parse(registry?.evidenceAsOf ?? ""))) failures.push(`${relativePath}: evidenceAsOf must be ISO-8601`);
  if (registry?.freshnessPolicy?.currentClaimsRequireWindow !== true ||
      registry?.freshnessPolicy?.expiredDisposition !== "unverified" ||
      registry?.freshnessPolicy?.gateAction !== "fail") {
    failures.push(`${relativePath}: freshnessPolicy must require windows, expire to unverified and fail the gate`);
  }
  if (registry?.externalEvidenceSupersedesRepositoryCopy !== true) {
    failures.push(`${relativePath}: external evidence must supersede repository copies`);
  }
  const allowedStatuses = registry?.allowedStatuses;
  for (const status of ["confirmed", "partial", "blocked", "unverified"]) {
    if (!Array.isArray(allowedStatuses) || !allowedStatuses.includes(status)) failures.push(`${relativePath}: allowed status missing: ${status}`);
  }

  const current = registry?.currentRelease;
  if (current?.status !== "confirmed") failures.push(`${relativePath}: current release must be confirmed`);
  failures.push(...validateEvidenceWindow(current?.evidenceWindow, `${relativePath}:currentRelease`, { now }));
  if (current?.evidenceWindow?.observedAt !== registry?.evidenceAsOf) {
    failures.push(`${relativePath}: current release evidenceWindow.observedAt must equal evidenceAsOf`);
  }
  for (const [field, expected] of Object.entries(expectedRelease)) {
    if (current?.[field] !== expected) failures.push(`${relativePath}: current release ${field} mismatch`);
  }
  if (current?.latestQualityGate?.status !== "partial" || current?.latestQualityGate?.conclusion !== "failure") {
    failures.push(`${relativePath}: latest Quality Gate must remain partial/failure until a newer exact-SHA gate is recorded`);
  }
  if (current?.latestQualityGate?.databaseReplay !== "success") {
    failures.push(`${relativePath}: latest Quality Gate database replay evidence mismatch`);
  }
  if (current?.rollback?.status !== "unverified" || current?.rollback?.deploymentId !== null) {
    failures.push(`${relativePath}: rollback must remain explicitly unverified until re-certified`);
  }
  if (registry?.requiredCaveat !== requiredReleaseCaveat) failures.push(`${relativePath}: required caveat mismatch`);

  const authorities = new Map((registry?.authorities ?? []).map((authority) => [authority.authorityId, authority]));
  for (const [authorityId, status] of [
    ["github_release", "confirmed"],
    ["vercel_production", "confirmed"],
    ["production_public_runtime", "confirmed"],
    ["figma", "partial"],
    ["confluence", "partial"],
    ["supabase_local_migration_chain", "confirmed"],
    ["supabase_development", "partial"],
    ["supabase_auth_rehearsal", "partial"],
    ["supabase_production", "blocked"],
    ["draft_pr_143", "blocked"]
  ]) {
    const authority = authorities.get(authorityId);
    if (!authority) failures.push(`${relativePath}: missing authority ${authorityId}`);
    else if (authority.status !== status) failures.push(`${relativePath}: ${authorityId} status must be ${status}`);
  }

  for (const [authorityId, projectName, projectRef, projectStatus] of [
    ["supabase_development", "geoai-dev", "pphdqkurxneyagvnnjdt", "INACTIVE"],
    ["supabase_auth_rehearsal", "geoai-auth-rehearsal", "bkmfcjzalcvdsdvyxpgi", "ACTIVE_HEALTHY"]
  ]) {
    const authority = authorities.get(authorityId);
    const management = authority?.managementMetadata;
    if (management?.status !== "confirmed" || management?.observedBy !== "GeoAI_main" ||
        management?.projectName !== projectName || management?.projectRef !== projectRef ||
        management?.projectStatus !== projectStatus || management?.scope !== "management_metadata_only") {
      failures.push(`${relativePath}: ${authorityId} management metadata boundary mismatch`);
    }
    failures.push(...validateEvidenceWindow(management?.evidenceWindow, `${relativePath}:${authorityId}.managementMetadata`, { now }));

    const physical = authority?.hostedPhysicalReadback;
    if (physical?.status !== "unverified") failures.push(`${relativePath}: ${authorityId} physical readback must remain unverified`);
    for (const surface of hostedSupabasePhysicalSurfaces) {
      if (!Array.isArray(physical?.surfaces) || !physical.surfaces.includes(surface)) {
        failures.push(`${relativePath}: ${authorityId} physical readback surface missing: ${surface}`);
      }
    }
    if (typeof authority?.historicalReceipt !== "string" || authority.historicalReceipt.length < 12) {
      failures.push(`${relativePath}: ${authorityId} historical receipt boundary is missing`);
    }
  }
  const excludedDraft = authorities.get("draft_pr_143");
  for (const required of [
    "PR #143",
    "product/gcc-real-estate-decision-platform-v1",
    "e92fb5d8e8d83de72ee4c4376d958ce598c00536"
  ]) {
    if (!excludedDraft?.binding?.includes(required)) failures.push(`${relativePath}: draft PR #143 exclusion is missing ${required}`);
  }
  if (excludedDraft?.allowedUse !== "none; excluded_non_authority") {
    failures.push(`${relativePath}: draft PR #143 must remain excluded_non_authority`);
  }
  return failures;
}

export function validateCurrentReleaseTruth({
  root = process.cwd(),
  policyPath = releaseAuthorityPolicyPath,
  snapshotPath = lastVerifiedReleaseSnapshotPath,
  registryPath = externalAuthorityRegistryPath,
  requireExternalRegistry = false,
  now = new Date(),
  activeDocPaths,
  releaseFactDocPaths = defaultReleaseFactDocs
} = {}) {
  const failures = [];
  const policy = parseJson(root, policyPath, failures);
  const snapshot = parseJson(root, snapshotPath, failures);
  const registry = requireExternalRegistry || existsSync(resolve(root, registryPath))
    ? parseJson(root, registryPath, failures)
    : null;
  if (policy) failures.push(...validateReleaseAuthorityPolicy(policy, policyPath));
  if (snapshot) failures.push(...validateHistoricalReleaseSnapshot(snapshot, snapshotPath));
  if (registry) failures.push(...validateExternalAuthorityRegistry(registry, registryPath, canonicalCurrentRelease, { now }));
  if (requireExternalRegistry && !registry) failures.push(`${registryPath}: current external authority registry is required`);
  if (!policy || !snapshot || (requireExternalRegistry && !registry)) return { policy, snapshot, registry, failures };

  const docs = activeDocPaths ?? releaseFactDocPaths;
  for (const relativePath of docs) {
    const content = readText(root, relativePath, failures);
    if (!content) continue;
    pushMatches(failures, relativePath, content, /current_operational_release_authority/gi, "repository content must not label a committed snapshot current operational authority");
    pushMatches(failures, relativePath, content, /(?:Current\s+(?:release|`?main`?|Production)|Release\s+authority|Current\s+operational\s+release)[^\n]*(?:PR\s+#106|cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b|dpl_6RC2ohEdLBjiV82k758tFMkaDB9X)/gi, "historical PR #106 snapshot is labelled current");
    pushMatches(failures, relativePath, content, /repository\s+CI[^\n]{0,160}(?:queried|verified live)[^\n]{0,80}(?:GitHub|Vercel)/gi, "repository CI cannot claim live runtime queries");
    if (releaseFactDocPaths.includes(relativePath)) failures.push(...validateHostedSupabaseTruthClaims(content, relativePath));
  }

  for (const relativePath of releaseFactDocPaths) {
    const content = readText(root, relativePath, failures);
    if (!content) continue;
    if (registry) {
      for (const required of [
        "PR #113",
        canonicalCurrentRelease.mainSha,
        canonicalCurrentRelease.productionDeploymentId,
        canonicalCurrentRelease.productStage,
        requiredReleaseCaveat
      ]) {
        if (!content.includes(required)) failures.push(`${relativePath}: missing canonical current-release invariant: ${required}`);
      }
      if (!content.includes("EXTERNAL_AUTHORITY_REGISTRY.json")) failures.push(`${relativePath}: missing external authority registry reference`);
    } else {
      if (!content.includes("RELEASE_AUTHORITY_POLICY.json")) failures.push(`${relativePath}: missing release-authority policy link/reference`);
      if (!content.includes("LAST_VERIFIED_RELEASE_SNAPSHOT.json")) failures.push(`${relativePath}: missing historical snapshot link/reference`);
      if (!/external post-release|external runtime|live authority is external/i.test(content)) failures.push(`${relativePath}: missing external current-runtime authority statement`);
    }
  }

  return { policy, snapshot, registry, failures };
}
