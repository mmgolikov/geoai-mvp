#!/usr/bin/env node

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_REF = "pphdqkurxneyagvnnjdt";
const phases = new Set(["writer_outsider", "viewer_denial"]);
const forbiddenProductionHosts = new Set([
  "geoai-mvp.vercel.app",
  "geoai-id0xnwco2-geoaidev.vercel.app",
  "geoai-a71p4fxnr-geoaidev.vercel.app"
]);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function required(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) throw new Error(`Missing ${name}.`);
  return value;
}

function preflight() {
  if (required("GEOAI_CLOUD_LIVE_BROWSER_ACTIVE") !== "1") throw new Error("Root browser runner activation missing.");
  const phase = required("GEOAI_CLOUD_LIVE_PHASE");
  if (!phases.has(phase)) throw new Error("Unsupported browser phase.");
  if (required("GEOAI_CLOUD_LIVE_PROJECT_REF") !== PROJECT_REF) throw new Error("Wrong Supabase project.");
  const head = required("GEOAI_CLOUD_LIVE_EXPECTED_COMMIT_SHA");
  if (!/^[0-9a-f]{40}$/.test(head)) throw new Error("Invalid exact head.");
  const preview = new URL(required("GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL"));
  if (preview.origin !== required("GEOAI_E2E_BASE_URL") || preview.protocol !== "https:" ||
      !preview.hostname.endsWith(".vercel.app") || forbiddenProductionHosts.has(preview.hostname)) throw new Error("Invalid Preview.");
  if (required("GEOAI_CLOUD_LIVE_BROWSER_APPROVAL") !== `cloud-live-browser:${PROJECT_REF}:${preview.hostname}:${head}:${phase}`) {
    throw new Error("Exact browser approval missing.");
  }
  if (required("GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET").length < 16) throw new Error("Preview bypass missing.");
  for (const lane of ["A", "B"]) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(required(`GEOAI_CLOUD_LIVE_${lane}_EMAIL`)) ||
        required(`GEOAI_CLOUD_LIVE_${lane}_PASSWORD`).length < 8 ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(required(`GEOAI_CLOUD_LIVE_${lane}_USER_ID`))) {
      throw new Error("Synthetic persona contract invalid.");
    }
  }
  return phase;
}

function countTests(suites) {
  return (Array.isArray(suites) ? suites : []).reduce((total, suite) => total +
    (Array.isArray(suite.specs) ? suite.specs.reduce((sum, spec) => sum +
      (Array.isArray(spec.tests) ? spec.tests.length : 0), 0) : 0) + countTests(suite.suites), 0);
}

function main() {
  let phase = "unknown";
  let temporaryDirectory = null;
  try {
    phase = preflight();
    temporaryDirectory = mkdtempSync(join(tmpdir(), "geoai-cloud-live-browser-"));
    const configPath = join(temporaryDirectory, "playwright.config.cjs");
    const playwrightEntry = resolve(root, "node_modules/@playwright/test/index.js");
    const playwrightCli = resolve(root, "node_modules/@playwright/test/cli.js");
    writeFileSync(configPath, `
const { defineConfig } = require(${JSON.stringify(playwrightEntry)});
module.exports = defineConfig({
  testDir: ${JSON.stringify(resolve(root, "tests/e2e"))}, timeout: 180000,
  expect: { timeout: 20000 }, fullyParallel: false, forbidOnly: true, retries: 0, workers: 1,
  preserveOutput: "never", outputDir: ${JSON.stringify(join(temporaryDirectory, "output"))}, reporter: [["json"]],
  use: { baseURL: process.env.GEOAI_E2E_BASE_URL, channel: "chrome", headless: true,
    actionTimeout: 30000, navigationTimeout: 60000, trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" },
  projects: [{ name: "sprint10-cloud-live" }]
});
`, { encoding: "utf8", mode: 0o600 });
    const title = phase === "writer_outsider" ? "writer saves, clean context reopens, outsider is denied" : "viewer cannot save";
    const result = spawnSync(process.execPath, [
      playwrightCli, "test", "tests/e2e/sprint10-cloud-live-acceptance.spec.ts",
      `--config=${configPath}`, "--project=sprint10-cloud-live", `--grep=^${title}$`, "--reporter=json", "--workers=1", "--retries=0"
    ], { cwd: root, env: process.env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 390_000, maxBuffer: 16 * 1024 * 1024 });
    let report;
    try { report = JSON.parse(result.stdout || ""); } catch { report = null; }
    const tests = countTests(report?.suites);
    const errors = Array.isArray(report?.errors) ? report.errors.length : 1;
    if (result.error || result.signal || result.status !== 0 || tests !== 1 || errors !== 0) throw new Error("Browser phase failed.");
    console.log(JSON.stringify({
      schemaVersion: "geoai.sprint10.cloud-live-browser-receipt.v1",
      status: "PASS", phase, tests, secretMaterialEmitted: false
    }));
  } catch {
    console.error(JSON.stringify({
      schemaVersion: "geoai.sprint10.cloud-live-browser-receipt.v1",
      status: "FAIL", phase, rawOutputSuppressed: true, secretMaterialEmitted: false
    }));
    process.exitCode = 1;
  } finally {
    if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main();
