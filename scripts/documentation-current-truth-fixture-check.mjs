import { resolve } from "node:path";
import {
  canonicalCurrentRelease,
  hostedSupabasePhysicalSurfaces,
  requiredReleaseCaveat,
  validateCurrentReleaseTruth,
  validateExternalAuthorityRegistry,
  validateHostedSupabaseTruthClaims
} from "./release-truth-validator.mjs";

const root = process.cwd();
const fixture = (name) => resolve(root, "tests", "fixtures", "release-truth", name);
const options = { activeDocPaths: ["active.txt"], releaseFactDocPaths: ["active.txt"] };

for (const name of ["passing", "future-main", "external-supersedes"]) {
  const result = validateCurrentReleaseTruth({ root: fixture(name), ...options });
  if (result.failures.length > 0) {
    console.error(`${name} release-authority fixture failed:`);
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

const unsafe = validateCurrentReleaseTruth({ root: fixture("unsafe"), ...options });
if (!unsafe.failures.some((failure) => failure.includes("must never be labelled current"))) {
  console.error("A historical snapshot labelled current was not rejected.");
  process.exit(1);
}

const falseLiveClaim = validateCurrentReleaseTruth({ root: fixture("stale"), ...options });
if (!falseLiveClaim.failures.some((failure) => failure.includes("cannot claim that it queried GitHub or Vercel live state")) ||
    !falseLiveClaim.failures.some((failure) => failure.includes("repository CI must explicitly deny live GitHub/Vercel queries"))) {
  console.error("Repository-CI live-state claim fixture was not rejected.");
  process.exit(1);
}

const authorityStatuses = {
  github_release: "confirmed",
  vercel_production: "confirmed",
  production_public_runtime: "confirmed",
  figma: "partial",
  confluence: "partial",
  supabase_local_migration_chain: "confirmed",
  supabase_development: "partial",
  supabase_auth_rehearsal: "partial",
  supabase_production: "blocked",
  draft_pr_143: "blocked"
};
const fixtureNow = new Date("2026-08-18T21:00:00Z");
const validExternalRegistry = {
  schemaVersion: "1.1",
  authorityType: "timeboxed_external_authority_registry",
  evidenceAsOf: "2026-08-18T18:03:54Z",
  freshnessPolicy: {
    currentClaimsRequireWindow: true,
    expiredDisposition: "unverified",
    gateAction: "fail"
  },
  externalEvidenceSupersedesRepositoryCopy: true,
  allowedStatuses: ["confirmed", "partial", "blocked", "unverified"],
  currentRelease: {
    status: "confirmed",
    evidenceWindow: {
      observedAt: "2026-08-18T18:03:54Z",
      validUntil: "2026-08-25T18:03:54Z",
      validityHours: 168,
      expiryAction: "fail"
    },
    ...canonicalCurrentRelease,
    latestQualityGate: {
      status: "partial",
      conclusion: "failure",
      databaseReplay: "success"
    },
    rollback: { status: "unverified", deploymentId: null }
  },
  authorities: Object.entries(authorityStatuses).map(([authorityId, status]) => {
    const authority = {
      authorityId,
      status,
      binding: authorityId === "draft_pr_143"
        ? "PR #143, product/gcc-real-estate-decision-platform-v1, e92fb5d8e8d83de72ee4c4376d958ce598c00536"
        : authorityId,
      allowedUse: authorityId === "draft_pr_143" ? "none; excluded_non_authority" : "fixture"
    };
    if (authorityId === "supabase_development" || authorityId === "supabase_auth_rehearsal") {
      const development = authorityId === "supabase_development";
      authority.managementMetadata = {
        status: "confirmed",
        observedBy: "GeoAI_main",
        projectName: development ? "geoai-dev" : "geoai-auth-rehearsal",
        projectRef: development ? "pphdqkurxneyagvnnjdt" : "bkmfcjzalcvdsdvyxpgi",
        projectStatus: development ? "INACTIVE" : "ACTIVE_HEALTHY",
        scope: "management_metadata_only",
        evidenceWindow: {
          observedAt: "2026-08-18T20:09:03Z",
          validUntil: "2026-08-19T20:09:03Z",
          validityHours: 24,
          expiryAction: "fail"
        }
      };
      authority.hostedPhysicalReadback = {
        status: "unverified",
        surfaces: [...hostedSupabasePhysicalSurfaces]
      };
      authority.historicalReceipt = development
        ? "2026-07-16 development snapshot; point-in-time evidence only"
        : "docs/SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json; point-in-time evidence only";
    }
    return authority;
  }),
  requiredCaveat: requiredReleaseCaveat
};
const validRegistryFailures = validateExternalAuthorityRegistry(
  validExternalRegistry,
  "fixture-registry.json",
  canonicalCurrentRelease,
  { now: fixtureNow }
);
if (validRegistryFailures.length > 0) {
  console.error("Canonical external-authority registry fixture failed:");
  for (const failure of validRegistryFailures) console.error(`- ${failure}`);
  process.exit(1);
}

const wrongShaRegistry = structuredClone(validExternalRegistry);
wrongShaRegistry.currentRelease.mainSha = "0000000000000000000000000000000000000000";
if (!validateExternalAuthorityRegistry(wrongShaRegistry, "wrong-sha.json", canonicalCurrentRelease, { now: fixtureNow }).some((failure) => failure.includes("mainSha mismatch"))) {
  console.error("An incorrect current-release SHA was not rejected.");
  process.exit(1);
}

const unsafeDraftRegistry = structuredClone(validExternalRegistry);
unsafeDraftRegistry.authorities.find((authority) => authority.authorityId === "draft_pr_143").allowedUse = "design_reference";
if (!validateExternalAuthorityRegistry(unsafeDraftRegistry, "unsafe-draft.json", canonicalCurrentRelease, { now: fixtureNow }).some((failure) => failure.includes("excluded_non_authority"))) {
  console.error("An authoritative-use claim for draft PR #143 was not rejected.");
  process.exit(1);
}

const expiredReleaseRegistry = structuredClone(validExternalRegistry);
if (!validateExternalAuthorityRegistry(
  expiredReleaseRegistry,
  "expired-release.json",
  canonicalCurrentRelease,
  { now: new Date("2026-08-25T18:03:54Z") }
).some((failure) => failure.includes("currentRelease: evidence expired"))) {
  console.error("An expired current-release evidence window was not rejected.");
  process.exit(1);
}

const expiredManagementRegistry = structuredClone(validExternalRegistry);
expiredManagementRegistry.currentRelease.evidenceWindow.validUntil = "2026-09-01T18:03:54Z";
expiredManagementRegistry.currentRelease.evidenceWindow.validityHours = 336;
if (!validateExternalAuthorityRegistry(
  expiredManagementRegistry,
  "expired-management.json",
  canonicalCurrentRelease,
  { now: new Date("2026-08-19T20:09:03Z") }
).some((failure) => failure.includes("supabase_development.managementMetadata: evidence expired"))) {
  console.error("An expired Supabase management-metadata evidence window was not rejected.");
  process.exit(1);
}

const missingWindowRegistry = structuredClone(validExternalRegistry);
delete missingWindowRegistry.currentRelease.evidenceWindow;
if (!validateExternalAuthorityRegistry(
  missingWindowRegistry,
  "missing-window.json",
  canonicalCurrentRelease,
  { now: fixtureNow }
).some((failure) => failure.includes("evidenceWindow.observedAt"))) {
  console.error("A missing current-release evidence window was not rejected.");
  process.exit(1);
}

const unsafeHostedClaims = [
  "The active hosted state is 18 migration-ledger entries and one confirmed Auth user.",
  "geoai-dev currently has ten migrations and zero Auth users.",
  "The active hosted rehearsal currently has one pre-existing Auth user and all 29 domain tables have RLS.",
  "Supabase advisors still report 14 security findings and Storage remains four buckets with zero object policies.",
  "PostgREST is still pinned to pgrst.db_schemas=api with a 14-RPC surface.",
  "The live development Data API remains uncontained with 22 TRUNCATE grants.",
  "SOURCE-01 is applied only on rehearsal and remains unapplied to development/Production.",
  "The MFA-removal migration remains unapplied everywhere.",
  "The hosted source rows currently contain five acquired-source tables."
];
for (const [index, claim] of unsafeHostedClaims.entries()) {
  if (validateHostedSupabaseTruthClaims(claim, `unsafe-hosted-${index + 1}.txt`).length === 0) {
    console.error(`A current hosted physical-state claim was not rejected: ${claim}`);
    process.exit(1);
  }
}

const safeHostedClaims = [
  "The historical 2026-07-16 receipt recorded 18 migration-ledger entries and one Auth user as point-in-time evidence.",
  "GeoAI_main observed management metadata only: geoai-dev is INACTIVE and geoai-auth-rehearsal is ACTIVE_HEALTHY; physical schema, rows, advisors, RLS, policies, PostgREST, Storage and source rows remain unverified.",
  "Local custody lists seven pending migrations and makes no current hosted application claim."
];
for (const [index, claim] of safeHostedClaims.entries()) {
  const claimFailures = validateHostedSupabaseTruthClaims(claim, `safe-hosted-${index + 1}.txt`);
  if (claimFailures.length > 0) {
    console.error(`A safe historical/management-only hosted claim was rejected: ${claim}`);
    for (const failure of claimFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

console.log("Release-authority fixtures passed: historical/current boundaries, exact tuple, PR #143 exclusion, expiring release and management windows, and hosted physical-state claim negatives are enforced.");
