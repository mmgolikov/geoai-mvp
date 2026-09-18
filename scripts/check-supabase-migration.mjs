import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const canonicalBaseline = "supabase/migration-ledger-baseline.json";
const manifest = JSON.parse(readFileSync(canonicalBaseline, "utf8"));
const pendingMigrations = manifest.pendingMigrations.map(({ version, name }) => `supabase/migrations/${version}_${name}.sql`);
const foundationPath = "supabase/migrations/20260705102844_geoai_pilot_persistence_foundation.sql";
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
const files = [canonicalBaseline, foundationPath, ...pendingMigrations];
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
  pendingMigrations,
  pendingTarget: "Historical manifest declares eight pending candidates, including seven holes inside the applied range. Fresh target-bound readback is required; this static check does not query hosted state.",
  rehearsalEvidence: {
    status: "historical_receipt_only_not_current_candidate_or_runtime_acceptance",
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
    "Fresh exact-candidate populated-target upgrade replay, backup/restore and zero-drift evidence are required; historical CI and rehearsal receipts are not current hosted acceptance.",
    "Real application HTTP email/phone/browser personas have not been certified; hosted rehearsal SQL personas pass 183/183 before the pending MFA-removal override.",
    "Development source-custody and source-read personas have not been certified; rehearsal SQL coverage does not connect a source.",
    "The development Data API schema boundary is not confirmed; the isolated rehearsal is pinned to api-only and has positive/negative HTTP evidence."
  ],
  nextActions: [
    "Use the isolated rehearsal receipt as evidence only for that exact project; do not infer development or Production readiness.",
    "Before any development push, verify the full development geoai_healthcheck fingerprint and obtain separate exact-target approval for ledger reconciliation of 20260705100000.",
    "Run a development-derived upgrade replay with drift/advisor comparison under an exact-ref owner-approved plan.",
    "Apply the MFA-removal override only with exact rehearsal approval, then prove real HTTP email/phone/browser Admin personas before development activation.",
    "For development, expose only the approved api schema (or disable Data API) and repeat direct-public denial evidence.",
    "Do not use scripts/apply-supabase-migration.mjs for the restored populated target: it lacks exact include-all planning and a stop between dry-run and apply.",
    "Use the offline database-upgrade-preflight.mjs contract checker; even a valid supplied dry-run receipt never authorizes or executes hosted apply."
  ],
  caveat: "Public REST table probes cannot distinguish a missing table from correct RLS denial and therefore are not migration certification."
};

console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 1);
