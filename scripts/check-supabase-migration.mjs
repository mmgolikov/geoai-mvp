import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const canonicalBaseline = "supabase/migration-ledger-baseline.json";
const foundationPath = "supabase/migrations/20260705102844_geoai_pilot_persistence_foundation.sql";
const containmentPath = "supabase/migrations/20260716000000_geoai_pre_auth_security_containment_v1.sql";
const identityPath = "supabase/migrations/20260716085854_geoai_identity_authorization_foundation_v1.sql";
const sourceCustodyPath = "supabase/migrations/20260716113000_geoai_source_custody_foundation_v1.sql";
const activationPath = "supabase/migrations/20260716164451_geoai_auth_admin_project_activation_rebuild_v1.sql";
const foreignKeyIndexPath = "supabase/migrations/20260716172000_geoai_foreign_key_index_hardening_v1.sql";
const lifecycleRemediationPath = "supabase/migrations/20260716175210_geoai_auth_admin_lifecycle_remediation_v1.sql";
const rehearsalReceiptPath = "docs/SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json";

function runNodeCheck(script) {
  return spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

const chain = runNodeCheck("scripts/canonical-migration-chain-check.mjs");
const security = runNodeCheck("scripts/migration-security-surface-check.mjs");
const identity = runNodeCheck("scripts/identity-authorization-migration-check.mjs");
const sourceCustody = runNodeCheck("scripts/source-custody-migration-check.mjs");
const activation = runNodeCheck("scripts/auth-admin-project-activation-rebuild-check.mjs");
const foreignKeyIndexes = runNodeCheck("scripts/foreign-key-index-hardening-check.mjs");
const lifecycleRemediation = runNodeCheck("scripts/auth-admin-lifecycle-remediation-check.mjs");
const dataApiOperator = runNodeCheck("scripts/data-api-operator-check.mjs");
const files = [canonicalBaseline, foundationPath, containmentPath, identityPath, sourceCustodyPath, activationPath, foreignKeyIndexPath, lifecycleRemediationPath];
const missingFiles = files.filter((file) => !existsSync(file));
const staticChecksPassed = [chain, security, identity, sourceCustody, activation, foreignKeyIndexes, lifecycleRemediation, dataApiOperator].every((result) => result.status === 0);
const rehearsalReceiptPresent = existsSync(rehearsalReceiptPath);

const privilegedApplicationEnvDetected = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_DB_URL?.trim()
);

const output = {
  ok: missingFiles.length === 0 && staticChecksPassed && !privilegedApplicationEnvDetected,
  canonicalBaseline,
  foundationPath,
  pendingMigrations: [containmentPath, identityPath, sourceCustodyPath, activationPath, foreignKeyIndexPath, lifecycleRemediationPath],
  pendingTarget: "development has six pending candidates; all six are applied and evidenced only on the isolated Free rehearsal",
  rehearsalEvidence: {
    projectRef: "bkmfcjzalcvdsdvyxpgi",
    receipt: rehearsalReceiptPath,
    receiptPresent: rehearsalReceiptPresent,
    canonicalSchemaMigrations: 17,
    environmentOperatorEntries: 1,
    hostedSqlPersonas: "183/183",
    dataApiBoundary: "api-only HTTP positive/negative evidence recorded"
  },
  missingFiles,
  staticChecks: {
    canonicalChain: chain.status === 0,
    securitySurface: security.status === 0,
    identityAuthorization: identity.status === 0,
    sourceCustody: sourceCustody.status === 0,
    authAdminProjectActivation: activation.status === 0,
    foreignKeyIndexes: foreignKeyIndexes.status === 0,
    authAdminLifecycleRemediation: lifecycleRemediation.status === 0,
    dataApiOperator: dataApiOperator.status === 0
  },
  privilegedApplicationEnvDetected,
  liveApplyReady: false,
  blockers: [
    ...(missingFiles.length ? [`Missing canonical file(s): ${missingFiles.join(", ")}`] : []),
    ...(!staticChecksPassed ? ["One or more migration static checks failed."] : []),
    ...(privilegedApplicationEnvDetected ? ["Privileged Supabase/database credentials are present in this application runtime."] : []),
    "Development still lacks the pre-ledger geoai_healthcheck ledger reconciliation; the isolated rehearsal is reconciled.",
    "A development-derived upgrade replay and zero-drift decision have not been certified; full clean replay is certified only on the isolated rehearsal.",
    "Real application HTTP Auth/MFA/browser personas have not been certified; hosted rehearsal SQL personas pass 183/183.",
    "Development source-custody and source-read personas have not been certified; rehearsal SQL coverage does not connect a source.",
    "The development Data API schema boundary is not confirmed; the isolated rehearsal is pinned to api-only and has positive/negative HTTP evidence."
  ],
  nextActions: [
    "Use the isolated rehearsal receipt as evidence only for that exact project; do not infer development or Production readiness.",
    "Before any development push, verify the development geoai_healthcheck fingerprint and reconcile version 20260705100000.",
    "Run a development-derived upgrade replay with drift/advisor comparison under an exact-ref owner-approved plan.",
    "Implement and prove real HTTP Auth/MFA/browser Admin personas against the rehearsal before development activation.",
    "For development, expose only the approved api schema (or disable Data API) and repeat direct-public denial evidence.",
    "Use npm run supabase:migrate:apply only after exact development target approval, backup and rollback evidence."
  ],
  caveat: "Public REST table probes cannot distinguish a missing table from correct RLS denial and therefore are not migration certification."
};

console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 1);
