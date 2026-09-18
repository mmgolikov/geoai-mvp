import { spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const exactDevelopmentProjectRef = "pphdqkurxneyagvnnjdt";
const exactLedgerId = "5aa405b3-bbda-48aa-aeea-ca3357be4042";
const exactCycleId = "GEOAI_FOUR_SPRINTS_2026_09_18";
const exactExplicitRun = "root-paid-live-journey-2026-09-18";
const acceptedScopes = new Set(["journey", "dubai-analyse", "dubai-find", "singapore-create"]);
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

function validateLedger(rootValue, pathValue, allowUnknown = false) {
  if (!isAbsolute(rootValue) || !isAbsolute(pathValue)) fail("The ledger root and path must be explicit absolute paths.");
  const root = resolve(rootValue);
  const path = resolve(pathValue);
  if (realpathSync(root) !== root || !statSync(root).isDirectory() || (statSync(root).mode & 0o077) !== 0) {
    fail("The ledger root must be one existing private 0700 real directory.");
  }
  const relation = relative(root, path);
  if (!relation || relation === ".." || relation.startsWith(`..${sep}`) || isAbsolute(relation) || dirname(path) !== root) {
    fail("The cycle ledger must be a direct child of its explicit private root.");
  }
  privateRegularFile(path, "The existing cycle ledger");
  let ledger;
  try { ledger = JSON.parse(readFileSync(path, "utf8")); }
  catch { fail("The existing cycle ledger is missing or invalid; it will not be initialized."); }
  if (ledger?.schemaVersion !== 1 || ledger?.cycleId !== exactCycleId || ledger?.ledgerId !== exactLedgerId ||
      ledger?.ceilingUsd !== 15 || !Array.isArray(ledger?.receipts) ||
      ledger.receipts.some((receipt) => receipt?.ledgerId !== exactLedgerId || (!allowUnknown && receipt?.state === "unknown"))) {
    fail("The existing exact USD 15 cycle ledger is not accepted or contains an unknown charge.");
  }
  return ledger;
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

function preflight() {
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
  const ledger = validateLedger(ledgerRoot, ledgerPath);
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

function receiptSummary(config) {
  const ledger = validateLedger(config.ledgerRoot, config.ledgerPath, true);
  return ledger.receipts.slice(config.baselineReceiptCount).map((receipt) => ({
    id: receipt.id,
    route: receipt.identity?.route,
    depth: receipt.identity?.depth,
    state: receipt.state,
    estimatedUsd: receipt.estimatedUsd
  }));
}

function run() {
  const config = preflight();
  const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
  const playwrightCli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
  const playwrightEntry = fileURLToPath(new URL("../node_modules/@playwright/test/index.js", import.meta.url));
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "geoai-sprint10-live-journey-"));
  const configPath = join(temporaryDirectory, "playwright.config.cjs");
  const outputDir = join(temporaryDirectory, "output");
  const projectName = "sprint10-root-live-journey";
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
    serviceWorkers: "block"
  },
  projects: [{ name: ${JSON.stringify(projectName)} }]
});
`;
  writeFileSync(configPath, configSource, { encoding: "utf8", mode: 0o600 });
  const childEnvironment = { ...process.env, GEOAI_SPRINT10_LIVE_RUNNER_ACTIVE: "1" };
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
  try {
    const discovery = spawnSync(process.execPath, [...commonArguments, "--list"], {
      cwd: repositoryRoot,
      env: childEnvironment,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    const discoveryReport = parseJsonReport(discovery, "offline project/test discovery");
    const projects = Array.isArray(discoveryReport?.config?.projects)
      ? discoveryReport.config.projects.map((project) => project?.name)
      : [];
    const tests = countReportTests(discoveryReport?.suites);
    if (discovery.error || discovery.status !== 0 || projects.length !== 1 || projects[0] !== projectName || tests !== 1 ||
        (Array.isArray(discoveryReport?.errors) && discoveryReport.errors.length > 0)) {
      fail(`The bounded discovery receipt was not accepted (projects=${projects.length}, tests=${tests}).`);
    }

    const result = spawnSync(process.execPath, commonArguments, {
      cwd: repositoryRoot,
      env: childEnvironment,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024
    });
    const report = parseJsonReport(result, "live journey");
    const stats = report?.stats ?? {};
    const passed = Number(stats.expected ?? -1);
    const skipped = Number(stats.skipped ?? -1);
    const failed = Number(stats.unexpected ?? -1);
    const flaky = Number(stats.flaky ?? -1);
    const receipts = receiptSummary(config);
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
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : "The bounded live journey runner failed closed.");
  process.exitCode = 1;
}
