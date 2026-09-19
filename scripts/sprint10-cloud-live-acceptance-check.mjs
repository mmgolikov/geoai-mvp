#!/usr/bin/env node

import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  operatorSql,
  parseOperatorReceipt,
  runCloudAcceptance,
  validateCloudLiveConfig
} from "./sprint10-cloud-live-acceptance.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const harness = readFileSync(join(root, "scripts/sprint10-cloud-live-acceptance.mjs"), "utf8");
const runner = readFileSync(join(root, "scripts/sprint10-cloud-live-browser-run.mjs"), "utf8");
const spec = readFileSync(join(root, "tests/e2e/sprint10-cloud-live-acceptance.spec.ts"), "utf8");
const target = {
  organizationId: "99100000-0000-4000-8000-000000000001",
  projectId: "99200000-0000-4000-8000-000000000001",
  projectKey: "cloud-live-demo",
  previewHost: "geoai-safe-preview-geoaidev.vercel.app"
};
const personas = [
  { userId: "99300000-0000-4000-8000-000000000001", profileId: "99400000-0000-4000-8000-000000000001" },
  { userId: "99300000-0000-4000-8000-000000000002", profileId: "99400000-0000-4000-8000-000000000002" }
];

for (const stage of ["preflight", "activate_writer", "activate_viewer", "cleanup"]) {
  const sql = operatorSql(stage, target, personas);
  assert.match(sql, /set local lock_timeout = '5s'/);
  assert.match(sql, /set local statement_timeout = '30s'/);
  assert.doesNotMatch(sql, /\bdelete\b|\btruncate\b|\bdrop\b/i);
}
assert.match(operatorSql("preflight", target, personas), /20260918203424[\s\S]*demo_normalized[\s\S]*scope is not cleanly disabled/);
assert.match(operatorSql("activate_writer", target, personas), /'analyst', 'active'[\s\S]*enabled = true/);
assert.match(operatorSql("activate_viewer", target, personas), /artifact-cloud-live-public-1[\s\S]*'viewer', 'active'/);
assert.match(operatorSql("cleanup", target, personas), /status = 'disabled'[\s\S]*enabled = false[\s\S]*artifact-cloud-live-public-1/);
assert.deepEqual(parseOperatorReceipt(JSON.stringify([{ receipt: { stage: "preflight", ok: true } }]), "preflight"), { stage: "preflight", ok: true });

const calls = [];
const pass = runCloudAcceptance({ expectedCommitSha: "a".repeat(40) }, personas, target, {
  runOperator(stage) { calls.push(`operator:${stage}`); return { stage, ok: true }; },
  runBrowserPhase(_config, _target, _personas, phase) { calls.push(`browser:${phase}`); return { phase, status: "PASS" }; }
});
assert.deepEqual(calls, [
  "operator:preflight", "operator:activate_writer", "browser:writer_outsider",
  "operator:activate_viewer", "browser:viewer_denial", "operator:cleanup"
]);
assert.equal(pass.cleanup, "scope_disabled_memberships_disabled_artifact_retained");

const failureCalls = [];
assert.throws(() => runCloudAcceptance({ expectedCommitSha: "a".repeat(40) }, personas, target, {
  runOperator(stage) { failureCalls.push(`operator:${stage}`); return { stage, ok: true }; },
  runBrowserPhase() { failureCalls.push("browser:writer_outsider"); throw new Error("offline fault"); }
}));
assert.deepEqual(failureCalls, ["operator:preflight", "operator:activate_writer", "browser:writer_outsider", "operator:cleanup"]);

const privateRoot = mkdtempSync(join(realpathSync(tmpdir()), "geoai-cloud-live-static-"));
try {
  chmodSync(privateRoot, 0o700);
  const backupPath = join(privateRoot, "backup.json");
  writeFileSync(backupPath, JSON.stringify({
    schemaVersion: "geoai.sprint10.cloud-live-backup-receipt.v1",
    projectRef: "pphdqkurxneyagvnnjdt",
    migrationVersion: "20260918203424",
    createdAt: new Date(Date.now() - 1_000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    backupKind: "root-verified-restorable",
    scopeWasDisabled: true
  }), { mode: 0o600 });
  const authConfig = {
    projectRef: "pphdqkurxneyagvnnjdt",
    previewSeam: "run-existing-real-password-preview-harness",
    liveJourney: null,
    expectedCommitSha: "a".repeat(40)
  };
  const env = {
    GEOAI_CLOUD_LIVE_EXPLICIT_RUN: "root-only-cloud-live-acceptance-v1",
    GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL: "https://geoai-safe-preview-geoaidev.vercel.app",
    GEOAI_E2E_BASE_URL: "https://geoai-safe-preview-geoaidev.vercel.app",
    GEOAI_CLOUD_LIVE_ORGANIZATION_ID: target.organizationId,
    GEOAI_CLOUD_LIVE_PROJECT_ID: target.projectId,
    GEOAI_CLOUD_LIVE_PROJECT_KEY: target.projectKey,
    GEOAI_CLOUD_LIVE_RUN_APPROVAL: `cloud-live:pphdqkurxneyagvnnjdt:${target.previewHost}:${authConfig.expectedCommitSha}:${target.organizationId}:${target.projectId}:${target.projectKey}`,
    GEOAI_CLOUD_LIVE_BACKUP_RECEIPT_PATH: backupPath
  };
  assert.equal(validateCloudLiveConfig(env, authConfig).projectKey, target.projectKey);
  assert.throws(() => validateCloudLiveConfig({ ...env, GEOAI_CLOUD_LIVE_PROJECT_KEY: "private-project" }, authConfig));
} finally {
  rmSync(privateRoot, { recursive: true, force: true });
}

assert.match(harness, /await import\("\.\/sprint10-hosted-auth-probe\.mjs"\)/);
assert.match(harness, /STATIC_ONLY_NO_HOSTED_OR_LOCAL_CALLS[\s\S]*--run-live/);
assert.doesNotMatch(harness, /createPersona\s*\(|retirePersona\s*\(/);
assert.match(harness, /paidAiCalls: 0/);
assert.match(runner, /trace: "off", screenshot: "off", video: "off"/);
assert.match(spec, /writer saves, clean context reopens, outsider is denied/);
assert.match(spec, /viewer cannot save/);
assert.match(spec, /localStorage\.getItem\(key\)[\s\S]*toBe\(originalBytes\)/);
assert.match(spec, /expect\(\(await put\)\.status\(\)\)\.toBe\(403\)/);
assert.doesNotMatch(`${harness}\n${runner}\n${spec}`, /console\.(?:log|error)\([^\n]*(?:PASSWORD|BYPASS|ADMIN_SECRET|PUBLISHABLE)/);

console.log("Cloud-live acceptance static contract passed: existing Auth lifecycle reused; exact Preview/project/backup gates; writer/reopen, outsider and viewer personas; row-preserving root cleanup; no paid AI or secret files.");
