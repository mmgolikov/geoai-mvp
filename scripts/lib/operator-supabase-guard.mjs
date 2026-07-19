import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const primaryDevelopmentRef = "pphdqkurxneyagvnnjdt";
const allowedTargets = new Set(["ephemeral", "preview"]);

function extractProjectRef(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const direct = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)?.[1];
    if (direct && direct !== "db") return direct;
    const databaseHost = parsed.hostname.match(/^db\.([a-z0-9-]+)\.supabase\.co$/i)?.[1];
    if (databaseHost) return databaseHost;
    const usernameRef = decodeURIComponent(parsed.username).match(/^postgres\.([a-z0-9-]+)$/i)?.[1];
    return usernameRef ?? null;
  } catch {
    return null;
  }
}

function gitHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return result.status === 0 ? result.stdout.trim() : null;
}

function canonicalMigrationTreeSha() {
  const directory = path.resolve(process.cwd(), "supabase", "migrations");
  const files = readdirSync(directory).filter((name) => name.endsWith(".sql")).sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(readFileSync(path.join(directory, file)));
    hash.update("\0");
  }
  hash.update(readFileSync(path.resolve(process.cwd(), "supabase", "migration-ledger-baseline.json")));
  return hash.digest("hex");
}

function operatorSurfaceIsClean() {
  const result = spawnSync(
    "git",
    ["status", "--porcelain", "--untracked-files=all", "--", "supabase", "scripts"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  );
  return result.status === 0 && result.stdout.trim() === "";
}

function commonTargetEvidence(projectRef, action) {
  const target = process.env.GEOAI_ALLOW_SUPABASE_TARGET?.trim().toLowerCase();
  const expectedRef = process.env.GEOAI_OPERATOR_EXPECTED_PROJECT_REF?.trim();
  const parentRef = process.env.GEOAI_OPERATOR_PARENT_PROJECT_REF?.trim();
  const currentHead = gitHead();
  const migrationTreeSha = canonicalMigrationTreeSha();
  const approval = process.env.GEOAI_OPERATOR_TARGET_APPROVAL?.trim();
  const blockers = [];

  if (!projectRef) blockers.push("The operator URL does not contain a verifiable Supabase project ref.");
  if (!expectedRef || projectRef !== expectedRef) blockers.push("The URL project ref does not match GEOAI_OPERATOR_EXPECTED_PROJECT_REF.");
  if (!allowedTargets.has(target)) blockers.push("GEOAI_ALLOW_SUPABASE_TARGET must be ephemeral or preview; Production is not accepted.");
  if (target === "ephemeral" && (!parentRef || parentRef !== primaryDevelopmentRef || projectRef === primaryDevelopmentRef)) {
    blockers.push("Ephemeral target must use a distinct branch ref and the approved development parent ref.");
  }
  if (target === "preview" && projectRef !== primaryDevelopmentRef) {
    blockers.push("Preview target must be the explicitly approved development project ref.");
  }
  if (!operatorSurfaceIsClean()) {
    blockers.push("Supabase and operator/check script surfaces must be committed and clean before operator access.");
  }
  if (!currentHead || approval !== `${action}:${projectRef}:${currentHead}:${migrationTreeSha}`) {
    blockers.push("GEOAI_OPERATOR_TARGET_APPROVAL must bind action, exact project ref, Git HEAD and canonical migration-tree SHA.");
  }

  return { blockers, currentHead, migrationTreeSha, projectRef, target };
}

function writeEvidence(projectRef, action) {
  const blockers = [];
  if (process.env.GEOAI_OPERATOR_WRITE_CONFIRMATION?.trim() !== `write:${action}:${projectRef}`) {
    blockers.push("GEOAI_OPERATOR_WRITE_CONFIRMATION does not bind this write action and project ref.");
  }
  if (!process.env.GEOAI_OPERATOR_BACKUP_RECEIPT?.trim().startsWith(`backup:${projectRef}:`)) {
    blockers.push("A project-bound GEOAI_OPERATOR_BACKUP_RECEIPT is required for writes.");
  }
  if (!process.env.GEOAI_OPERATOR_ROLLBACK_RECEIPT?.trim().startsWith(`rollback:${projectRef}:`)) {
    blockers.push("A project-bound GEOAI_OPERATOR_ROLLBACK_RECEIPT is required for writes.");
  }
  return blockers;
}

export function inspectOperatorDatabaseTarget(action, { write = true } = {}) {
  const dbUrl = process.env.GEOAI_OPERATOR_SUPABASE_DB_URL?.trim();
  const projectRef = dbUrl ? extractProjectRef(dbUrl) : null;
  const evidence = commonTargetEvidence(projectRef, action);
  const blockers = [
    ...(!dbUrl ? ["GEOAI_OPERATOR_SUPABASE_DB_URL is missing."] : []),
    ...evidence.blockers,
    ...(write ? writeEvidence(projectRef, action) : [])
  ];
  return { ...evidence, dbUrl, ok: blockers.length === 0, blockers };
}

export function inspectOperatorRestTarget(action, { write = false } = {}) {
  const url = process.env.GEOAI_OPERATOR_SUPABASE_URL?.trim();
  const secretKey = process.env.GEOAI_OPERATOR_SUPABASE_SECRET_KEY?.trim();
  const projectRef = url ? extractProjectRef(url) : null;
  const evidence = commonTargetEvidence(projectRef, action);
  const blockers = [
    ...(!url ? ["GEOAI_OPERATOR_SUPABASE_URL is missing."] : []),
    ...(!secretKey ? ["GEOAI_OPERATOR_SUPABASE_SECRET_KEY is missing."] : []),
    ...evidence.blockers,
    ...(write ? writeEvidence(projectRef, action) : [])
  ];
  return { ...evidence, url, secretKey, ok: blockers.length === 0, blockers };
}
