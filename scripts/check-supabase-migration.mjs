import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const canonicalBaseline = "supabase/migration-ledger-baseline.json";
const foundationPath = "supabase/migrations/20260705102844_geoai_pilot_persistence_foundation.sql";
const containmentPath = "supabase/migrations/20260716000000_geoai_pre_auth_security_containment_v1.sql";
const identityPath = "supabase/migrations/20260716085854_geoai_identity_authorization_foundation_v1.sql";
const sourceCustodyPath = "supabase/migrations/20260716113000_geoai_source_custody_foundation_v1.sql";

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
const files = [canonicalBaseline, foundationPath, containmentPath, identityPath, sourceCustodyPath];
const missingFiles = files.filter((file) => !existsSync(file));
const staticChecksPassed = [chain, security, identity, sourceCustody].every((result) => result.status === 0);

const privilegedApplicationEnvDetected = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_DB_URL?.trim()
);

const output = {
  ok: missingFiles.length === 0 && staticChecksPassed && !privilegedApplicationEnvDetected,
  canonicalBaseline,
  foundationPath,
  pendingMigrations: [containmentPath, identityPath, sourceCustodyPath],
  missingFiles,
  staticChecks: {
    canonicalChain: chain.status === 0,
    securitySurface: security.status === 0,
    identityAuthorization: identity.status === 0,
    sourceCustody: sourceCustody.status === 0
  },
  privilegedApplicationEnvDetected,
  liveApplyReady: false,
  blockers: [
    ...(missingFiles.length ? [`Missing canonical file(s): ${missingFiles.join(", ")}`] : []),
    ...(!staticChecksPassed ? ["One or more migration static checks failed."] : []),
    ...(privilegedApplicationEnvDetected ? ["Privileged Supabase/database credentials are present in this application runtime."] : []),
    "The pre-ledger geoai_healthcheck bootstrap is not reconciled in the remote migration ledger.",
    "Clean replay has not been certified.",
    "Upgrade replay against an ephemeral clone/branch has not been certified.",
    "The real JWT persona matrix has not been certified.",
    "The immutable source-custody and source-read persona matrix has not been certified.",
    "The owner Data API schema boundary is not yet confirmed."
  ],
  nextActions: [
    "Run a clean local Supabase replay and `supabase test db`.",
    "Verify the live geoai_healthcheck fingerprint and repair version 20260705100000 to applied before any remote db push.",
    "Run an upgrade replay on an owner-approved ephemeral clone/branch.",
    "Verify append-only source releases/receipts and bounded api.current_source_releases() on the replay target.",
    "Expose only the approved api schema, then prove direct public-domain REST/RPC denial.",
    "Use npm run supabase:migrate:apply only after exact operator approval and rollback evidence."
  ],
  caveat: "Public REST table probes cannot distinguish a missing table from correct RLS denial and therefore are not migration certification."
};

console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 1);
