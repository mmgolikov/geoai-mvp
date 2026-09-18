import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const exactDevelopmentProjectRef = "pphdqkurxneyagvnnjdt";
const exactExplicitRunApproval = "existing-password-only-live-acceptance";
const forbiddenProductionHosts = new Set([
  "geoai-mvp.vercel.app",
  "geoai-id0xnwco2-geoaidev.vercel.app",
  "geoai-a71p4fxnr-geoaidev.vercel.app"
]);

function fail(message) {
  throw new Error(message);
}

function required(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) fail(`Missing required runtime setting: ${name}.`);
  return value;
}

function canonicalOrigin(value) {
  try {
    const url = new URL(value);
    return url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password && !url.port
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function validatePersona(prefix, lane) {
  const email = required(`${prefix}_EMAIL`).trim().toLowerCase();
  const password = required(`${prefix}_PASSWORD`);
  const userId = required(`${prefix}_USER_ID`).trim();
  const demoAddress = ["demo", "geoai.space"].join("@");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || email === demoAddress) {
    fail(`The ${lane} email setting is not an accepted existing synthetic identity.`);
  }
  if (password.length < 8 || password.length > 128 || password === "111111") {
    fail(`The ${lane} password setting does not meet the existing-password contract.`);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    fail(`The ${lane} expected identity setting is not an exact UUID.`);
  }
  return { email, userId };
}

function validateReceipt(receiptPath, previewUrl, expectedCommitSha) {
  if (!isAbsolute(receiptPath)) fail("The root-owned deployment receipt path must be absolute.");
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  } catch {
    fail("The root-owned exact-deployment receipt is missing or is not valid JSON.");
  }
  if (receipt?.schemaVersion !== "geoai.sprint10.real-password-preview-receipt.v1") {
    fail("The root-owned exact-deployment receipt schema is not accepted.");
  }
  const verifiedAt = typeof receipt.verifiedAt === "string" ? Date.parse(receipt.verifiedAt) : Number.NaN;
  const expiresAt = typeof receipt.expiresAt === "string" ? Date.parse(receipt.expiresAt) : Number.NaN;
  const now = Date.now();
  if (!Number.isFinite(verifiedAt) || verifiedAt > now || !Number.isFinite(expiresAt) || expiresAt <= now) {
    fail("The root-owned exact-deployment receipt is not currently valid.");
  }
  if (typeof receipt.deployment?.id !== "string" || !/^dpl_[A-Za-z0-9]+$/.test(receipt.deployment.id) ||
      receipt.deployment?.url !== previewUrl || receipt.deployment?.state !== "READY" ||
      receipt.deployment?.target !== "preview" || receipt.deployment?.commitSha !== expectedCommitSha) {
    fail("The root-owned receipt is not bound to this exact READY Preview URL, target and commit.");
  }
  if (receipt.protection?.kind !== "vercel_sso" ||
      ![301, 302, 303, 307, 308].includes(Number(receipt.protection?.anonymousStatus)) ||
      receipt.protection?.locationOrigin !== "https://vercel.com" ||
      receipt.protection?.locationPath !== "/sso-api") {
    fail("The root-owned receipt does not prove the expected anonymous Vercel SSO protection challenge.");
  }
}

function preflight() {
  if (required("GEOAI_REAL_PASSWORD_AUTH_EXPLICIT_RUN").trim() !== exactExplicitRunApproval) {
    fail("The exact existing-password live-acceptance opt-in is required.");
  }
  const scope = required("GEOAI_REAL_PASSWORD_AUTH_SCOPE").trim();
  if (scope !== "primary" && scope !== "primary_and_secondary") {
    fail("GEOAI_REAL_PASSWORD_AUTH_SCOPE must be primary or primary_and_secondary.");
  }
  const previewUrl = required("GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL").trim();
  const baseUrl = required("GEOAI_E2E_BASE_URL").trim();
  const previewOrigin = canonicalOrigin(previewUrl);
  const baseOrigin = canonicalOrigin(baseUrl);
  if (!previewOrigin || previewOrigin !== baseOrigin) fail("The base URL and Preview URL must be the same exact origin.");
  const target = new URL(previewOrigin);
  if (target.protocol !== "https:" || !target.hostname.endsWith(".vercel.app") || forbiddenProductionHosts.has(target.hostname)) {
    fail("The selected target is not an accepted non-Production HTTPS Vercel Preview.");
  }
  const expectedCommitSha = required("GEOAI_REAL_PASSWORD_AUTH_EXPECTED_COMMIT_SHA").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expectedCommitSha)) fail("The expected Preview commit must be one exact Git SHA.");
  const projectRef = required("GEOAI_REAL_PASSWORD_AUTH_SUPABASE_PROJECT_REF").trim();
  if (projectRef !== exactDevelopmentProjectRef) fail("The harness is restricted to the exact development Supabase project.");
  if (required("GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET").trim().length < 16) {
    fail("A runtime-only Preview protection bypass credential is required.");
  }
  const approval = required("GEOAI_REAL_PASSWORD_AUTH_RUN_APPROVAL").trim();
  if (approval !== `existing-password-only:${exactDevelopmentProjectRef}:${target.hostname}:${expectedCommitSha}`) {
    fail("The trusted-terminal approval is not bound to this exact project, Preview host and commit.");
  }
  const primary = validatePersona("GEOAI_REAL_PASSWORD_AUTH_PRIMARY", "primary");
  const secondaryNames = [
    "GEOAI_REAL_PASSWORD_AUTH_SECONDARY_EMAIL",
    "GEOAI_REAL_PASSWORD_AUTH_SECONDARY_PASSWORD",
    "GEOAI_REAL_PASSWORD_AUTH_SECONDARY_USER_ID"
  ];
  const secondaryPresence = secondaryNames.map((name) => typeof process.env[name] === "string" && process.env[name].length > 0);
  if (scope === "primary" && secondaryPresence.some(Boolean)) {
    fail("The primary-only scope must not receive unused secondary credentials.");
  }
  if (scope === "primary_and_secondary" && !secondaryPresence.every(Boolean)) {
    fail("The selected two-persona scope requires all secondary settings.");
  }
  if (scope === "primary_and_secondary") {
    const secondary = validatePersona("GEOAI_REAL_PASSWORD_AUTH_SECONDARY", "secondary");
    if (primary.email === secondary.email || primary.userId === secondary.userId) {
      fail("Primary and secondary personas must be distinct existing identities.");
    }
  }
  const receiptPath = required("GEOAI_REAL_PASSWORD_AUTH_DEPLOYMENT_RECEIPT_PATH").trim();
  validateReceipt(receiptPath, previewUrl, expectedCommitSha);
  return { expectedTestCount: scope === "primary" ? 1 : 2 };
}

function run() {
  const { expectedTestCount } = preflight();
  const playwrightCli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
  const result = spawnSync(process.execPath, [
    playwrightCli,
    "test",
    "tests/e2e/sprint10-real-password-auth.spec.ts",
    "--reporter=json",
    "--retries=0",
    "--workers=1"
  ], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, GEOAI_REAL_PASSWORD_AUTH_RUNNER_ACTIVE: "1" },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  let report;
  try {
    report = JSON.parse(result.stdout || "");
  } catch {
    fail("The live harness did not produce a valid machine-readable Playwright receipt.");
  }
  const stats = report?.stats;
  const passed = Number(stats?.expected ?? -1);
  const skipped = Number(stats?.skipped ?? -1);
  const failed = Number(stats?.unexpected ?? -1);
  const flaky = Number(stats?.flaky ?? -1);
  if (result.error || result.status !== 0 || passed !== expectedTestCount || skipped !== 0 || failed !== 0 || flaky !== 0) {
    fail(`The bounded live receipt was not accepted (expected=${expectedTestCount}, passed=${passed}, skipped=${skipped}, failed=${failed}, flaky=${flaky}).`);
  }
  console.log(`Sprint 10 real-password Auth acceptance passed (${passed}/${expectedTestCount}, skipped=0, failed=0, flaky=0).`);
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : "The bounded live Auth runner failed closed.");
  process.exitCode = 1;
}
