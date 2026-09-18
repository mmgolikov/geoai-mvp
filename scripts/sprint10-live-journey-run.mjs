import { spawnSync } from "node:child_process";
import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RESERVE_USD,
  SPRINT10_LIVE_CEILING_USD,
  readSprint10SpendLedgerFile,
  sprint10LedgerLockPath
} from "../tests/e2e/helpers/sprint10-live-budget.ts";

const exactDevelopmentProjectRef = "pphdqkurxneyagvnnjdt";
const exactLedgerId = "5aa405b3-bbda-48aa-aeea-ca3357be4042";
const exactExplicitRun = "root-paid-live-journey-2026-09-18";
const acceptedScopes = new Set(["journey", "dubai-analyse", "dubai-find", "singapore-create"]);
export const LIVE_SCOPE_RECEIPT_PLAN = Object.freeze({
  journey: Object.freeze([
    Object.freeze({ route: "ai", depth: "standard", reserveUsd: RESERVE_USD.ai }),
    Object.freeze({ route: "create", depth: "standard", reserveUsd: RESERVE_USD.create })
  ]),
  "dubai-analyse": Object.freeze([
    Object.freeze({ route: "ai", depth: "standard", reserveUsd: RESERVE_USD.ai })
  ]),
  "dubai-find": Object.freeze([]),
  "singapore-create": Object.freeze([
    Object.freeze({ route: "create", depth: "standard", reserveUsd: RESERVE_USD.create })
  ])
});
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

function privateRegularFile(path, label) {
  const details = lstatSync(path);
  if (!details.isFile() || details.isSymbolicLink() || details.nlink !== 1 || (details.mode & 0o077) !== 0 || realpathSync(path) !== path) {
    fail(`${label} must be a private regular non-link file.`);
  }
}

function liveRunLeasePath(ledgerPath) {
  return join(dirname(resolve(ledgerPath)), `.${basename(resolve(ledgerPath))}.sprint10-live-journey.lock`);
}

function rejectExistingLease(ledgerPath, { allowActiveRunnerLease = false } = {}) {
  const paths = [sprint10LedgerLockPath(ledgerPath)];
  if (!allowActiveRunnerLease) paths.push(liveRunLeasePath(ledgerPath));
  for (const path of paths) {
    let details;
    try {
      details = lstatSync(path);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      fail("A ledger lease path could not be verified absent; read-only live-journey validation is blocked.");
    }
    if (details.isSymbolicLink()) {
      fail("An unsafe ledger lease link blocks read-only live-journey validation.");
    }
    fail("An active or stale ledger lease blocks read-only live-journey validation.");
  }
}

export function validateLedger(rootValue, pathValue, allowUnresolved = false) {
  let ledger;
  try { ledger = readSprint10SpendLedgerFile(rootValue, pathValue); }
  catch { fail("The existing exact USD 15 cycle ledger is malformed, missing or unsafe."); }
  if (ledger.ledgerId !== exactLedgerId || ledger.ceilingUsd !== SPRINT10_LIVE_CEILING_USD ||
      (!allowUnresolved && ledger.receipts.some((receipt) => receipt.state === "unknown" || receipt.state === "reserved"))) {
    fail("The existing exact USD 15 cycle ledger is not accepted or contains an unresolved reserved/unknown charge.");
  }
  return ledger;
}

export function validateLiveLedgerPreflight(rootValue, pathValue, scope) {
  rejectExistingLease(pathValue);
  const ledger = validateLedger(rootValue, pathValue);
  validateLiveLedgerScopeHeadroom(ledger, scope);
  return ledger;
}

export function validateLiveLedgerScopeHeadroom(ledger, scope) {
  if (!acceptedScopes.has(scope)) fail("The selected bounded live scope is not accepted for ledger preflight.");
  const reserveRequired = LIVE_SCOPE_RECEIPT_PLAN[scope]
    .reduce((sum, item) => Number((sum + item.reserveUsd).toFixed(8)), 0);
  if (Number((ledger.estimatedOrReservedUsd + reserveRequired).toFixed(8)) > ledger.ceilingUsd) {
    fail("The selected live scope has insufficient remaining USD 15 reserve headroom.");
  }
  return { reserveRequired, remainingUsd: Number((ledger.ceilingUsd - ledger.estimatedOrReservedUsd).toFixed(8)) };
}

export function validateLiveLedgerPostRun(rootValue, pathValue, { allowActiveRunnerLease = false } = {}) {
  rejectExistingLease(pathValue, { allowActiveRunnerLease });
  return validateLedger(rootValue, pathValue);
}

function runtimeEnvironment(source = process.env) {
  const allowed = [
    "PATH", "HOME", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "TZ",
    "PLAYWRIGHT_BROWSERS_PATH", "SystemRoot", "WINDIR", "ComSpec", "PATHEXT"
  ];
  return Object.fromEntries(allowed.flatMap((key) => typeof source[key] === "string" ? [[key, source[key]]] : []));
}

function commandOutput(command, args, repositoryRoot, label) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: runtimeEnvironment(),
    encoding: "utf8",
    maxBuffer: 64 * 1024,
    timeout: 10_000,
    killSignal: "SIGTERM"
  });
  if (result.error || result.signal || result.status !== 0) fail(`${label} could not be verified with a sanitized environment.`);
  return result.stdout.trim();
}

function validateLocalCheckout(repositoryRoot, expectedCommit) {
  const head = commandOutput("git", ["rev-parse", "HEAD"], repositoryRoot, "The local harness HEAD").toLowerCase();
  if (head !== expectedCommit) fail("The local harness HEAD does not match the exact expected Preview commit.");
  const status = commandOutput("git", ["status", "--porcelain=v1", "--untracked-files=all"], repositoryRoot, "The local harness worktree");
  if (status.length > 0) fail("The local harness worktree must be clean before any credential reaches a child process.");
}

function acquireRunLease(rootValue, pathValue, commit, scope) {
  const root = resolve(rootValue);
  const ledgerPath = resolve(pathValue);
  if (!isAbsolute(rootValue) || !isAbsolute(pathValue) || dirname(ledgerPath) !== root) {
    fail("The live-run lease requires the exact ledger direct child of its private root.");
  }
  const leasePath = liveRunLeasePath(ledgerPath);
  let descriptor;
  try {
    descriptor = openSync(leasePath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    fchmodSync(descriptor, 0o600);
    writeFileSync(descriptor, JSON.stringify({ schemaVersion: 1, pid: process.pid, startedAt: new Date().toISOString(), commit, scope }));
    fsyncSync(descriptor);
    const details = fstatSync(descriptor);
    if (!details.isFile() || details.nlink !== 1 || (details.mode & 0o077) !== 0) fail("The live-run lease is not a private regular file.");
    return { descriptor, path: leasePath, dev: details.dev, ino: details.ino };
  } catch {
    if (typeof descriptor === "number") closeSync(descriptor);
    fail("Another live run or an unreconciled crash lease already owns this exact ledger.");
  }
}

function releaseRunLease(lease) {
  const active = lstatSync(lease.path);
  const held = fstatSync(lease.descriptor);
  if (!active.isFile() || active.isSymbolicLink() || active.dev !== lease.dev || active.ino !== lease.ino ||
      held.dev !== lease.dev || held.ino !== lease.ino) {
    closeSync(lease.descriptor);
    fail("The live-run lease identity changed while the runner was active.");
  }
  closeSync(lease.descriptor);
  unlinkSync(lease.path);
  const directory = openSync(dirname(lease.path), constants.O_RDONLY);
  try { fsyncSync(directory); } finally { closeSync(directory); }
}

function validateReceipt(pathValue, previewUrl, commit) {
  if (!isAbsolute(pathValue)) fail("The root-owned deployment receipt path must be absolute.");
  const path = resolve(pathValue);
  privateRegularFile(path, "The root-owned deployment receipt");
  let receipt;
  try { receipt = JSON.parse(readFileSync(path, "utf8")); }
  catch { fail("The root-owned exact-deployment receipt is missing or invalid."); }
  const now = Date.now();
  const verifiedAt = Date.parse(receipt?.verifiedAt ?? "");
  const expiresAt = Date.parse(receipt?.expiresAt ?? "");
  if (receipt?.schemaVersion !== "geoai.sprint10.real-password-preview-receipt.v1" ||
      !Number.isFinite(verifiedAt) || verifiedAt > now || !Number.isFinite(expiresAt) || expiresAt <= now ||
      typeof receipt?.deployment?.id !== "string" || !/^dpl_[A-Za-z0-9]+$/.test(receipt.deployment.id) ||
      receipt?.deployment?.url !== previewUrl || receipt?.deployment?.state !== "READY" ||
      receipt?.deployment?.target !== "preview" || receipt?.deployment?.commitSha !== commit ||
      receipt?.protection?.kind !== "vercel_sso" ||
      ![301, 302, 303, 307, 308].includes(Number(receipt?.protection?.anonymousStatus)) ||
      receipt?.protection?.locationOrigin !== "https://vercel.com" || receipt?.protection?.locationPath !== "/sso-api") {
    fail("The root-owned receipt is not current and bound to the exact READY protected Preview commit.");
  }
}

function validatePersona() {
  const email = required("GEOAI_SPRINT10_LIVE_EMAIL").trim().toLowerCase();
  const password = required("GEOAI_SPRINT10_LIVE_PASSWORD");
  const userId = required("GEOAI_SPRINT10_LIVE_USER_ID").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === "demo@geoai.space") {
    fail("The journey requires one existing non-demo synthetic email identity.");
  }
  if (password.length < 8 || password.length > 128 || password === "111111") {
    fail("The existing-password credential is not accepted.");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    fail("The expected synthetic identity must be one exact UUID.");
  }
}

function preflight(repositoryRoot) {
  if (required("GEOAI_SPRINT10_LIVE_EXPLICIT_RUN") !== exactExplicitRun) {
    fail("The exact root live-journey opt-in is required.");
  }
  const scope = required("GEOAI_SPRINT10_LIVE_SCOPE");
  if (!acceptedScopes.has(scope)) fail("The selected bounded live scope is not accepted.");
  const previewUrl = canonicalOrigin(required("GEOAI_SPRINT10_LIVE_PREVIEW_URL"));
  const baseUrl = canonicalOrigin(required("GEOAI_E2E_BASE_URL"));
  if (!previewUrl || baseUrl !== previewUrl) fail("The base URL and Preview URL must be the same exact origin.");
  const target = new URL(previewUrl);
  if (target.protocol !== "https:" || !target.hostname.endsWith(".vercel.app") || forbiddenProductionHosts.has(target.hostname)) {
    fail("The live journey is restricted to one non-Production HTTPS Vercel Preview.");
  }
  const commit = required("GEOAI_SPRINT10_LIVE_EXPECTED_COMMIT_SHA").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(commit)) fail("The expected Preview release identity must be one exact Git SHA.");
  validateLocalCheckout(repositoryRoot, commit);
  if (required("GEOAI_SPRINT10_LIVE_SUPABASE_PROJECT_REF") !== exactDevelopmentProjectRef) {
    fail("The journey is restricted to the exact development Supabase Auth project.");
  }
  if (required("GEOAI_SPRINT10_LIVE_PREVIEW_BYPASS_SECRET").trim().length < 16) {
    fail("A runtime-only Preview protection bypass credential is required.");
  }
  if (required("GEOAI_SPRINT10_LIVE_EXPECTED_LEDGER_ID") !== exactLedgerId) {
    fail("The expected cycle ledger identity is not accepted.");
  }
  validatePersona();
  const ledgerRoot = required("GEOAI_SPRINT10_LIVE_LEDGER_ROOT");
  const ledgerPath = required("GEOAI_SPRINT10_LIVE_LEDGER_PATH");
  const ledger = validateLiveLedgerPreflight(ledgerRoot, ledgerPath, scope);
  const receiptPath = required("GEOAI_SPRINT10_LIVE_DEPLOYMENT_RECEIPT_PATH");
  validateReceipt(receiptPath, previewUrl, commit);
  const approval = required("GEOAI_SPRINT10_LIVE_RUN_APPROVAL");
  if (approval !== `paid-live-journey:${exactLedgerId}:${target.hostname}:${commit}:${scope}`) {
    fail("The root run approval is not bound to this exact ledger, host, commit and scope.");
  }
  return { scope, previewUrl, host: target.hostname, commit, ledgerRoot, ledgerPath, baselineReceiptCount: ledger.receipts.length };
}

function parseJsonReport(result, phase) {
  try { return JSON.parse(result.stdout || ""); }
  catch { fail(`The ${phase} did not produce an accepted machine-readable Playwright receipt.`); }
}

function countReportTests(suites) {
  return (Array.isArray(suites) ? suites : []).reduce((total, suite) =>
    total + (Array.isArray(suite.specs) ? suite.specs.reduce((sum, spec) =>
      sum + (Array.isArray(spec.tests) ? spec.tests.length : 0), 0) : 0) + countReportTests(suite.suites), 0);
}

function findInconclusive(value) {
  if (typeof value === "string") {
    const match = /INCONCLUSIVE_LIVE_COVERAGE: ([^\n]+)/.exec(value);
    return match?.[1] ?? null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findInconclusive(item);
      if (match) return match;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const match = findInconclusive(item);
      if (match) return match;
    }
  }
  return null;
}

function findCleanupFailure(value) {
  if (typeof value === "string") {
    const match = /LIVE_JOURNEY_CLEANUP_FAILED: ([A-Za-z0-9_-]+)/.exec(value);
    return match?.[1] ?? null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findCleanupFailure(item);
      if (match) return match;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const match = findCleanupFailure(item);
      if (match) return match;
    }
  }
  return null;
}

function receiptSummary(config) {
  const ledger = validateLiveLedgerPostRun(config.ledgerRoot, config.ledgerPath, { allowActiveRunnerLease: true });
  return ledger.receipts.slice(config.baselineReceiptCount).map((receipt) => ({
    id: receipt.id,
    route: receipt.identity?.route,
    depth: receipt.identity?.depth,
    state: receipt.state,
    estimatedUsd: receipt.estimatedUsd
  }));
}

function run() {
  const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
  const config = preflight(repositoryRoot);
  const playwrightCli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
  const playwrightEntry = fileURLToPath(new URL("../node_modules/@playwright/test/index.js", import.meta.url));
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "geoai-sprint10-live-journey-"));
  const configPath = join(temporaryDirectory, "playwright.config.cjs");
  const outputDir = join(temporaryDirectory, "output");
  const projectName = "sprint10-root-live-journey";
  let lease = null;
  try {
  const browserEnvironment = runtimeEnvironment();
  const configSource = `
const { defineConfig } = require(${JSON.stringify(playwrightEntry)});
module.exports = defineConfig({
  testDir: ${JSON.stringify(join(repositoryRoot, "tests/e2e"))},
  timeout: 720000,
  expect: { timeout: 45000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  preserveOutput: "never",
  outputDir: ${JSON.stringify(outputDir)},
  reporter: [["json"]],
  use: {
    baseURL: process.env.GEOAI_E2E_BASE_URL,
    channel: "chrome",
    headless: true,
    actionTimeout: 45000,
    navigationTimeout: 60000,
    trace: "off",
    screenshot: "off",
    video: "off",
    serviceWorkers: "block",
    launchOptions: { env: ${JSON.stringify(browserEnvironment)} }
  },
  projects: [{ name: ${JSON.stringify(projectName)} }]
});
`;
  writeFileSync(configPath, configSource, { encoding: "utf8", mode: 0o600 });
  const discoveryEnvironment = runtimeEnvironment();
  const liveKeys = [
    "GEOAI_E2E_BASE_URL", "GEOAI_SPRINT10_LIVE_SCOPE", "GEOAI_SPRINT10_LIVE_PREVIEW_URL",
    "GEOAI_SPRINT10_LIVE_EXPECTED_COMMIT_SHA", "GEOAI_SPRINT10_LIVE_SUPABASE_PROJECT_REF",
    "GEOAI_SPRINT10_LIVE_PREVIEW_BYPASS_SECRET", "GEOAI_SPRINT10_LIVE_EMAIL",
    "GEOAI_SPRINT10_LIVE_PASSWORD", "GEOAI_SPRINT10_LIVE_USER_ID", "GEOAI_SPRINT10_LIVE_EXPECTED_LEDGER_ID",
    "GEOAI_SPRINT10_LIVE_LEDGER_ROOT", "GEOAI_SPRINT10_LIVE_LEDGER_PATH",
    "GEOAI_SPRINT10_LIVE_DEPLOYMENT_RECEIPT_PATH"
  ];
  const liveEnvironment = {
    ...runtimeEnvironment(),
    ...Object.fromEntries(liveKeys.map((key) => [key, required(key)])),
    GEOAI_SPRINT10_LIVE_RUNNER_ACTIVE: "1"
  };
  const commonArguments = [
    playwrightCli,
    "test",
    "tests/e2e/sprint10-live-journey.spec.ts",
    `--config=${configPath}`,
    `--project=${projectName}`,
    "--reporter=json",
    "--retries=0",
    "--workers=1"
  ];
    lease = acquireRunLease(config.ledgerRoot, config.ledgerPath, config.commit, config.scope);
    const discovery = spawnSync(process.execPath, [...commonArguments, "--list"], {
      cwd: repositoryRoot,
      env: discoveryEnvironment,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      timeout: 60_000,
      killSignal: "SIGTERM"
    });
    if (discovery.error || discovery.signal) fail("The offline discovery child exceeded its bounded execution window.");
    const discoveryReport = parseJsonReport(discovery, "offline project/test discovery");
    const projects = Array.isArray(discoveryReport?.config?.projects)
      ? discoveryReport.config.projects.map((project) => project?.name)
      : [];
    const tests = countReportTests(discoveryReport?.suites);
    if (discovery.status !== 0 || projects.length !== 1 || projects[0] !== projectName || tests !== 1 ||
        (Array.isArray(discoveryReport?.errors) && discoveryReport.errors.length > 0)) {
      fail(`The bounded discovery receipt was not accepted (projects=${projects.length}, tests=${tests}).`);
    }

    const result = spawnSync(process.execPath, commonArguments, {
      cwd: repositoryRoot,
      env: liveEnvironment,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 750_000,
      killSignal: "SIGTERM"
    });
    if (result.error || result.signal) fail("The live child exceeded its bounded execution window; logout is not verified and operator action is required.");
    const report = parseJsonReport(result, "live journey");
    const stats = report?.stats ?? {};
    const passed = Number(stats.expected ?? -1);
    const skipped = Number(stats.skipped ?? -1);
    const failed = Number(stats.unexpected ?? -1);
    const flaky = Number(stats.flaky ?? -1);
    const receipts = receiptSummary(config);
    const cleanupFailure = findCleanupFailure(report);
    if (cleanupFailure) {
      console.log(JSON.stringify({
        status: "FAIL_CLEANUP",
        scope: config.scope,
        previewHost: config.host,
        commit: config.commit,
        stage: cleanupFailure,
        receipts
      }));
      process.exitCode = 1;
      return;
    }
    const inconclusive = findInconclusive(report);
    if (inconclusive) {
      console.log(JSON.stringify({
        status: "INCONCLUSIVE",
        scope: config.scope,
        previewHost: config.host,
        commit: config.commit,
        reason: inconclusive,
        receipts
      }));
      process.exitCode = 2;
      return;
    }
    if (result.error || result.status !== 0 || passed !== 1 || skipped !== 0 || failed !== 0 || flaky !== 0) {
      fail(`The bounded live receipt was not accepted (passed=${passed}, skipped=${skipped}, failed=${failed}, flaky=${flaky}).`);
    }
    console.log(JSON.stringify({
      status: "PASS",
      scope: config.scope,
      previewHost: config.host,
      commit: config.commit,
      browserLocalPersistenceOnly: true,
      receipts
    }));
  } finally {
    try { rmSync(temporaryDirectory, { recursive: true, force: true }); }
    finally { if (lease) releaseRunLease(lease); }
  }
}

export { acquireRunLease, releaseRunLease, runtimeEnvironment };

const directEntry = process.argv[1] ? realpathSync(resolve(process.argv[1])) : null;
if (directEntry === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "The bounded live journey runner failed closed.");
    process.exitCode = 1;
  }
}
