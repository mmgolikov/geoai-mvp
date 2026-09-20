#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readCloudLiveRealArtifactInput } from "./sprint10-cloud-live-artifact-input.mjs";

const commit = "9".repeat(40);
const host = "geoai-quality20-example.vercel.app";
const root = mkdtempSync(join(realpathSync(tmpdir()), "geoai-cloud-artifact-input-"));
const privateDirectory = join(root, "private");
mkdirSync(privateDirectory, { mode: 0o700 });
chmodSync(privateDirectory, 0o700);
const artifactPath = join(privateDirectory, "artifact.json");
const envelope = {
  schemaVersion: "geoai.quality20.real-artifact.v1",
  candidateCommit: commit,
  candidateHost: host,
  sourceFeatureId: "relation/14604314",
  payloadHash: "a".repeat(64),
  artifact: {
    kind: "analyse", locale: "en", marketKey: "dubai", label: "Bounded public analysis",
    payload: { analysis: { subject: { sourceFeatureId: "relation/14604314" } } }, schemaVersion: 1,
    artifactId: "artifact-public-analysis", idempotencyKey: "operation-public-analysis",
    payloadHash: "a".repeat(64), completedAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z", viewRevision: 0
  }
};

function environment(path = artifactPath, hash = createHash("sha256").update(JSON.stringify(envelope)).digest("hex")) {
  return { GEOAI_QUALITY20_CLOUD_ARTIFACT_PATH: path, GEOAI_QUALITY20_CLOUD_ARTIFACT_SHA256: hash };
}

function rejects(run, pattern) {
  assert.throws(run, (error) => error?.code === "browser_preflight" && pattern.test(error.message));
}

try {
  assert.equal(readCloudLiveRealArtifactInput({}, commit, host), null);
  rejects(() => readCloudLiveRealArtifactInput({ GEOAI_QUALITY20_CLOUD_ARTIFACT_PATH: artifactPath }, commit, host), /supplied together/);
  writeFileSync(artifactPath, JSON.stringify(envelope), { encoding: "utf8", mode: 0o600 });
  chmodSync(artifactPath, 0o600);
  const accepted = readCloudLiveRealArtifactInput(environment(), commit, host);
  assert.equal(accepted?.envelope.artifact.artifactId, "artifact-public-analysis");
  rejects(() => readCloudLiveRealArtifactInput(environment(artifactPath, "b".repeat(64)), commit, host), /SHA-256 changed/);
  rejects(() => readCloudLiveRealArtifactInput(environment(), "8".repeat(40), host), /exact cloud run/);
  rejects(() => readCloudLiveRealArtifactInput(environment(), commit, "geoai-other.vercel.app"), /exact cloud run/);
  chmodSync(artifactPath, 0o644);
  rejects(() => readCloudLiveRealArtifactInput(environment(), commit, host), /permissions/);
  console.log(JSON.stringify({ status: "PASS", checks: 7, networkCalls: 0 }));
} finally {
  rmSync(root, { recursive: true, force: true });
}
