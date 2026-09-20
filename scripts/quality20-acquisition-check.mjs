import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, chmodSync, statSync, symlinkSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalReceivedJson, loadQuality20Acquisition, writeQuality20Acquisition } from "../tests/e2e/helpers/quality20-acquisition.ts";
const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-quality20-acquisition-offline-")));
chmodSync(root, 0o700);
try {
  const path = join(root, "plan.json");
  const execution = { commit: "a".repeat(40), origin: "https://geoai-offline-test.vercel.app", deploymentId: "dpl_OFFLINE" };
  const plan = { schemaVersion: "geoai.quality20.nonpaid-acquisition.v1", execution, caseId: "A01-Q", marketKey: "dubai",
    query: "OFFLINE SYNTHETIC", expectedSourceIdentity: "way/1001" };
  const bytes = JSON.stringify(plan);
  writeFileSync(path, bytes, { mode: 0o600 });
  const env = { GEOAI_QUALITY20_ACQUISITION_PLAN_PATH: path, GEOAI_QUALITY20_ACQUISITION_PLAN_SHA256: createHash("sha256").update(bytes).digest("hex"),
    GEOAI_QUALITY20_ACQUISITION_OUTPUT_PATH: join(root, "receipt.json") };
  const loaded = loadQuality20Acquisition(env, execution);
  assert.equal(canonicalReceivedJson({ z: 1, a: [2, { y: 3, x: 4 }] }), '{"a":[2,{"x":4,"y":3}],"z":1}');
  assert.throws(() => loadQuality20Acquisition({ ...env, GEOAI_QUALITY20_ACQUISITION_PLAN_SHA256: "0".repeat(64) }, execution));
  assert.throws(() => loadQuality20Acquisition(env, { ...execution, commit: "b".repeat(40) }));
  chmodSync(path, 0o644);
  assert.throws(() => loadQuality20Acquisition(env, execution));
  chmodSync(path, 0o600);
  const linked = join(root, "linked.json"); symlinkSync(path, linked);
  assert.throws(() => loadQuality20Acquisition({ ...env, GEOAI_QUALITY20_ACQUISITION_PLAN_PATH: linked }, execution));
  assert.throws(() => writeQuality20Acquisition(loaded, { mode: "resolved", schemaVersion: 2, subject: { sourceFeatureId: "way/999" } }, "2026-09-20T00:00:00Z"));
  const payload = { mode: "resolved", schemaVersion: 2, subject: { sourceFeatureId: "way/1001", displayGeometry: null } };
  writeQuality20Acquisition(loaded, payload, "2026-09-20T00:00:00Z");
  const receipt = JSON.parse(readFileSync(loaded.outputPath, "utf8"));
  assert.equal(statSync(loaded.outputPath).mode & 0o077, 0);
  assert.equal(receipt.status, "ACQUIRED_NOT_ANALYSED");
  assert.equal(receipt.paidPostCount, 0);
  assert.equal(receipt.serverEvidencePackHash, null);
  assert.equal(receipt.sourceAcquiredAt, null);
  assert.equal(receipt.canonicalReceivedEvidenceHash, createHash("sha256").update(canonicalReceivedJson(payload)).digest("hex"));
  assert.match(receipt.receivedAtMeaning, /NOT_source_freshness/);
  assert.throws(() => writeQuality20Acquisition(loaded, payload, "2026-09-20T00:00:00Z"), /EEXIST/);
  const withEvidence = { ...payload, evidenceReceipt: { evidencePackHash: "a".repeat(64), sourceResponseHash: "b".repeat(64), acquiredAt: "2026-09-19T12:00:00Z" } };
  const second = { ...loaded, outputPath: join(root, "server-receipt.json") };
  writeQuality20Acquisition(second, withEvidence, "2026-09-20T00:00:00Z");
  const preserved = JSON.parse(readFileSync(second.outputPath, "utf8"));
  assert.equal(preserved.serverEvidencePackHash, withEvidence.evidenceReceipt.evidencePackHash);
  assert.equal(preserved.sourceResponseHash, withEvidence.evidenceReceipt.sourceResponseHash);
  assert.equal(preserved.sourceAcquiredAt, withEvidence.evidenceReceipt.acquiredAt);
  assert.equal(preserved.comparisonAcceptance, "NOT_EVALUATED_ACQUISITION_ONLY");
  assert.throws(() => writeQuality20Acquisition({ ...loaded, outputPath: join(root, "invalid.json") },
    { ...payload, evidenceReceipt: {} }, "2026-09-20T00:00:00Z"), /malformed/);
  const spec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
  assert.match(spec, /if \(fatal\) return route.abort/);
  assert.match(spec, /validateQuality20PaidBody\(configuration.quality20, routeName, body\)/);
  assert.match(spec, /guard\(budget.paidDispatchCount\(\) === 0/);
  assert.match(spec, /suppressOneInitialNonpaidChallenge/);
  assert.match(spec, /follow_up_recovery_initial_NONPAID_challenge_aborted/);
  console.log("PASS: offline acquisition contract/privacy/hash/no-overwrite/zero-paid guards. Runtime acquisition NOT RUN.");
} finally { rmSync(root, { recursive: true, force: true }); }
