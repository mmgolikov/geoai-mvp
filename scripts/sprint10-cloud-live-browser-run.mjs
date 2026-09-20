#!/usr/bin/env node

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readCloudLiveRealArtifactInput } from "./sprint10-cloud-live-artifact-input.mjs";

const PROJECT_REF = "pphdqkurxneyagvnnjdt";
const phases = new Set(["writer_outsider", "continue_existing_outsider", "viewer_denial"]);
export const browserProgressStages = Object.freeze({
  writer_outsider: Object.freeze([
    "writer_login", "writer_cloud_read", "writer_save", "writer_save_201",
    "writer_clean_reopen", "writer_map_navigation", "writer_map_canvas", "writer_map_ready",
    "writer_map_no_put", "writer_map_network_clean", "outsider_login", "outsider_assertion"
  ]),
  continue_existing_outsider: Object.freeze([
    "continuation_login", "continuation_cloud_read", "continuation_import",
    "continuation_result_navigation", "continuation_result_ready", "continuation_no_ai",
    "continuation_no_put", "continuation_network_clean", "outsider_login", "outsider_assertion"
  ]),
  viewer_denial: Object.freeze([
    "viewer_login", "viewer_cloud_read", "viewer_save", "viewer_assertion",
    "viewer_http_denial", "viewer_message", "viewer_original", "viewer_network"
  ])
});
const browserRunnerStages = new Set([
  "browser_preflight", "browser_process_unconfirmed", "invalid_report_identity", "invalid_result_schema",
  "raw_test_output_present", "invalid_attachments_schema", "invalid_annotations_schema", "invalid_status_schema"
]);
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
  const artifactInput = readCloudLiveRealArtifactInput(process.env, head, preview.hostname);
  if (artifactInput && !["writer_outsider", "continue_existing_outsider"].includes(phase)) throw new Error("Real artifact input is restricted to an analyst phase.");
  if (!artifactInput && phase === "continue_existing_outsider") throw new Error("Existing-artifact continuation requires an exact artifact input.");
  return { phase, artifactInput };
}

function collectSpecs(suites) {
  return (Array.isArray(suites) ? suites : []).flatMap((suite) => [
    ...(Array.isArray(suite.specs) ? suite.specs : []),
    ...collectSpecs(suite.suites)
  ]);
}

function exactKeys(value, keys) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function reportError(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

export function browserTitlePattern(title) {
  return `${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
}

export function isBrowserFailureStage(stage, phase) {
  return browserRunnerStages.has(stage) || browserProgressStages[phase]?.includes(stage) === true;
}

export function parseBrowserReport(report, expectedTitle, expectedPhase) {
  const projects = report?.config?.projects;
  const specs = collectSpecs(report?.suites);
  const tests = specs.flatMap((spec) => Array.isArray(spec.tests) ? spec.tests.map((test) => ({ spec, test })) : []);
  const stats = report?.stats;
  const selected = tests[0];
  const result = selected?.test?.results?.[0];
  if (!Array.isArray(projects) || projects.length !== 1 || projects[0]?.name !== "sprint10-cloud-live" ||
      tests.length !== 1 || selected.spec?.title !== expectedTitle || selected.test?.projectName !== "sprint10-cloud-live" ||
      selected.test?.expectedStatus !== "passed") {
    reportError("invalid_report_identity", "Browser JSON report identity did not match one exact test.");
  }
  if (!Array.isArray(selected.test.results) || selected.test.results.length !== 1 || result?.retry !== 0) {
    reportError("invalid_result_schema", "Browser JSON result cardinality or retry contract was invalid.");
  }
  if (!Array.isArray(result.stdout) || result.stdout.length !== 0 || !Array.isArray(result.stderr) || result.stderr.length !== 0) {
    reportError("raw_test_output_present", "Browser JSON result contained unexpected raw test output.");
  }
  if (!Array.isArray(result.attachments)) reportError("invalid_attachments_schema", "Browser attachment schema was invalid.");
  const failureAttachmentsSafe = result.attachments.length <= 1 && result.attachments.every((attachment) =>
    exactKeys(attachment, ["name", "contentType", "path"]) && attachment.name === "error-context" &&
    attachment.contentType === "text/markdown" && typeof attachment.path === "string" &&
    /(?:^|[\\/])error-context\.md$/.test(attachment.path));
  if ((result.status === "passed" && result.attachments.length !== 0) ||
      (result.status !== "passed" && !failureAttachmentsSafe)) {
    reportError("invalid_attachments_schema", "Browser JSON contained an unapproved attachment type.");
  }
  if (!Array.isArray(report?.errors) || report.errors.length !== 0 || stats?.skipped !== 0 || stats?.flaky !== 0) {
    reportError("invalid_status_schema", "Browser JSON global status was not exact.");
  }
  const expectedStages = browserProgressStages[expectedPhase];
  const annotations = result.annotations;
  if (!expectedStages || !Array.isArray(annotations) || annotations.length === 0 || annotations.length > expectedStages.length ||
      !annotations.every((annotation, index) => exactKeys(annotation, ["type", "description"]) &&
        annotation.type === "geoai_cloud_stage" && annotation.description === expectedStages[index]) ||
      JSON.stringify(selected.test.annotations) !== JSON.stringify(annotations)) {
    reportError("invalid_annotations_schema", "Browser progress annotations are not the exact safe enum prefix.");
  }
  const passed = result.status === "passed" && selected.spec.ok === true && selected.test.status === "expected" &&
    stats?.expected === 1 && stats?.unexpected === 0 && annotations.length === expectedStages.length;
  const failed = ["failed", "timedOut"].includes(result.status) && selected.spec.ok === false &&
    selected.test.status === "unexpected" && stats?.expected === 0 && stats?.unexpected === 1 &&
    annotations.length <= expectedStages.length;
  if (!passed && !failed) reportError("invalid_status_schema", "Browser JSON report status disagrees with its safe progress sequence.");
  return { status: passed ? "PASS" : "FAIL", tests: 1, progressStage: annotations.at(-1).description };
}

export function validateBrowserReport(report, expectedTitle, expectedPhase) {
  const parsed = parseBrowserReport(report, expectedTitle, expectedPhase);
  if (parsed.status !== "PASS") throw new Error("Browser JSON report did not prove one exact non-skipped passing test.");
  return parsed.tests;
}

function main() {
  let phase = phases.has(process.env.GEOAI_CLOUD_LIVE_PHASE) ? process.env.GEOAI_CLOUD_LIVE_PHASE : "unknown";
  let safeStage = "browser_preflight";
  let temporaryDirectory = null;
  try {
    ({ phase } = preflight());
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
    const title = phase === "viewer_denial" ? "viewer cannot save" : "writer saves, clean context reopens, outsider is denied";
    safeStage = "browser_process_unconfirmed";
    const result = spawnSync(process.execPath, [
      playwrightCli, "test", "tests/e2e/sprint10-cloud-live-acceptance.spec.ts",
      `--config=${configPath}`, "--project=sprint10-cloud-live", `--grep=${browserTitlePattern(title)}`, "--reporter=json", "--workers=1", "--retries=0"
    ], { cwd: root, env: process.env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 390_000, maxBuffer: 16 * 1024 * 1024 });
    if (result.error || result.signal) throw new Error("Browser phase was unconfirmed.");
    let report;
    try { report = JSON.parse(result.stdout || ""); } catch { report = null; }
    safeStage = "invalid_result_schema";
    const parsed = parseBrowserReport(report, title, phase);
    if (result.status !== (parsed.status === "PASS" ? 0 : 1)) throw new Error("Browser process status disagrees with report.");
    if (parsed.status !== "PASS") {
      safeStage = parsed.progressStage;
      throw new Error("Browser phase failed at a bounded progress stage.");
    }
    console.log(JSON.stringify({
      schemaVersion: "geoai.sprint10.cloud-live-browser-receipt.v1",
      status: "PASS", phase, tests: parsed.tests, secretMaterialEmitted: false
    }));
  } catch (error) {
    if (isBrowserFailureStage(error?.code, phase)) safeStage = error.code;
    console.error(JSON.stringify({
      schemaVersion: "geoai.sprint10.cloud-live-browser-receipt.v1",
      status: "FAIL", phase, stage: safeStage, rawOutputSuppressed: true, secretMaterialEmitted: false
    }));
    process.exitCode = 1;
  } finally {
    if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) main();
