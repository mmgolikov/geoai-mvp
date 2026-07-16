import { spawnSync } from "node:child_process";
import { inspectOperatorDatabaseTarget } from "./lib/operator-supabase-guard.mjs";

function commandExists(command) {
  return spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" }).status === 0;
}

function blocked(status, blockers, nextActions = []) {
  console.log(JSON.stringify({
    ok: true,
    applied: false,
    status,
    blockers,
    nextActions,
    caveat: "The operator command never prints the database URL, password or secret keys."
  }, null, 2));
  process.exit(0);
}

function redactCliError(value, sensitiveUrl) {
  return String(value ?? "")
    .replaceAll(sensitiveUrl ?? "", "[REDACTED_DB_URL]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DB_URL]")
    .split("\n")
    .slice(-8)
    .join("\n");
}

const allowApply = process.env.GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY?.trim().toLowerCase() === "true";
const confirmation = process.env.GEOAI_CONFIRM_SUPABASE_MIGRATION_APPLY?.trim();
const targetEvidence = inspectOperatorDatabaseTarget("db01-migrate", { write: true });
const { dbUrl, projectRef, target } = targetEvidence;
const supabaseCliAvailable = commandExists("supabase");
const preLedgerRepairReceipt = process.env.GEOAI_OPERATOR_PRELEDGER_REPAIR_RECEIPT?.trim();

const staticCheck = spawnSync(process.execPath, ["scripts/check-supabase-migration.mjs"], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
  encoding: "utf8",
  env: {
    ...process.env,
    SUPABASE_SERVICE_ROLE_KEY: "",
    SUPABASE_DB_URL: ""
  }
});

if (staticCheck.status !== 0) {
  blocked("blocked_static_checks", ["Canonical migration static checks failed."], ["Run npm run supabase:migrate:check and resolve every finding."]);
}

if (!allowApply || confirmation !== "DB01_REPLAY_APPROVED" || !targetEvidence.ok || preLedgerRepairReceipt !== `repair:20260705100000:${projectRef}`) {
  blocked("blocked_safe_guard", [
    ...targetEvidence.blockers,
    ...(!allowApply ? ["GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true is required."] : []),
    ...(confirmation !== "DB01_REPLAY_APPROVED" ? ["GEOAI_CONFIRM_SUPABASE_MIGRATION_APPLY=DB01_REPLAY_APPROVED is required."] : []),
    ...(preLedgerRepairReceipt !== `repair:20260705100000:${projectRef}` ? ["The exact project-bound pre-ledger migration-repair receipt is required."] : [])
  ], [
    "Approve and provision an ephemeral Supabase replay target.",
    "Capture backup/rollback evidence and the exact remote migration ledger.",
    "Set the guarded operator variables only in that trusted terminal."
  ]);
}

if (!supabaseCliAvailable) {
  blocked("blocked_missing_supabase_cli", ["Supabase CLI is not available on PATH."], ["Install the current Supabase CLI in the trusted operator environment."]);
}

const dryRun = spawnSync("supabase", ["db", "push", "--db-url", dbUrl, "--dry-run"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (dryRun.status !== 0) {
  console.log(JSON.stringify({
    ok: false,
    applied: false,
    status: "dry_run_failed",
    blockers: ["Supabase CLI db push dry-run failed; no migration was applied."],
    stderrTail: redactCliError(dryRun.stderr, dbUrl)
  }, null, 2));
  process.exit(1);
}

const apply = spawnSync("supabase", ["db", "push", "--db-url", dbUrl, "--yes"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (apply.status !== 0) {
  console.log(JSON.stringify({
    ok: false,
    applied: false,
    status: "apply_failed",
    blockers: ["Supabase CLI returned a non-zero status. Keep Data API/Auth activation disabled and inspect the target before retrying."],
    stderrTail: redactCliError(apply.stderr, dbUrl)
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  applied: true,
  status: "canonical_pending_migrations_applied",
  target,
  nextActions: [
    "Run `supabase test db` and the HTTP/JWT persona matrix.",
    "Diff schemas, grants, policies, functions and advisors against clean replay.",
    "Do not enable Auth, Storage or the Data API until evidence is attached to DB-01."
  ]
}, null, 2));
