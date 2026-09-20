#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CLOUD_LIVE_COPY_LABEL_MARKER,
  CLOUD_LIVE_COPY_OPT_IN,
  cloudLiveCopyApproval,
  readCloudLiveRealArtifactInput
} from "./sprint10-cloud-live-artifact-input.mjs";

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

function copyEnvironment(overrides = {}) {
  const base = environment();
  const copy = {
    GEOAI_CLOUD_LIVE_COPY_EXISTING_ARTIFACT: CLOUD_LIVE_COPY_OPT_IN,
    GEOAI_CLOUD_LIVE_COPY_SOURCE_FILE_SHA256: base.GEOAI_QUALITY20_CLOUD_ARTIFACT_SHA256,
    GEOAI_CLOUD_LIVE_COPY_SOURCE_ARTIFACT_ID: envelope.artifact.artifactId,
    GEOAI_CLOUD_LIVE_COPY_SOURCE_IDEMPOTENCY_KEY: envelope.artifact.idempotencyKey,
    GEOAI_CLOUD_LIVE_COPY_SOURCE_PAYLOAD_HASH: envelope.payloadHash,
    GEOAI_CLOUD_LIVE_COPY_ARTIFACT_ID: "artifact-marked-copy-20260921",
    GEOAI_CLOUD_LIVE_COPY_IDEMPOTENCY_KEY: "operation-marked-copy-20260921",
    GEOAI_CLOUD_LIVE_COPY_LABEL_MARKER: CLOUD_LIVE_COPY_LABEL_MARKER
  };
  Object.assign(copy, overrides);
  return {
    ...base,
    ...copy,
    GEOAI_CLOUD_LIVE_COPY_APPROVAL: cloudLiveCopyApproval({
      runtimeCommit: commit,
      runtimeHost: host,
      sourceFileSha256: copy.GEOAI_CLOUD_LIVE_COPY_SOURCE_FILE_SHA256,
      sourceCommit: commit,
      sourceHost: host,
      sourceArtifactId: copy.GEOAI_CLOUD_LIVE_COPY_SOURCE_ARTIFACT_ID,
      sourceIdempotencyKey: copy.GEOAI_CLOUD_LIVE_COPY_SOURCE_IDEMPOTENCY_KEY,
      sourcePayloadHash: copy.GEOAI_CLOUD_LIVE_COPY_SOURCE_PAYLOAD_HASH,
      artifactId: copy.GEOAI_CLOUD_LIVE_COPY_ARTIFACT_ID,
      idempotencyKey: copy.GEOAI_CLOUD_LIVE_COPY_IDEMPOTENCY_KEY,
      labelMarker: copy.GEOAI_CLOUD_LIVE_COPY_LABEL_MARKER
    })
  };
}

function rejects(run, pattern) {
  assert.throws(run, (error) => error?.code === "browser_preflight" && pattern.test(error.message));
}

try {
  assert.equal(readCloudLiveRealArtifactInput({}, commit, host), null);
  rejects(() => readCloudLiveRealArtifactInput({ GEOAI_QUALITY20_CLOUD_ARTIFACT_PATH: artifactPath }, commit, host), /supplied together/);
  writeFileSync(artifactPath, JSON.stringify(envelope), { encoding: "utf8", mode: 0o600 });
  chmodSync(artifactPath, 0o600);
  const originalBytes = readFileSync(artifactPath);
  const originalStat = statSync(artifactPath);
  const accepted = readCloudLiveRealArtifactInput(environment(), commit, host);
  assert.equal(accepted?.envelope.artifact.artifactId, "artifact-public-analysis");
  assert.equal(accepted?.artifact.artifactId, "artifact-public-analysis");
  const copied = readCloudLiveRealArtifactInput(copyEnvironment(), commit, host);
  assert.equal(copied?.envelope.artifact.artifactId, "artifact-public-analysis");
  assert.equal(copied?.artifact.artifactId, "artifact-marked-copy-20260921");
  assert.equal(copied?.artifact.idempotencyKey, "operation-marked-copy-20260921");
  assert.equal(copied?.artifact.label, `${CLOUD_LIVE_COPY_LABEL_MARKER} ${envelope.artifact.label}`);
  assert.equal(copied?.artifact.payloadHash, envelope.artifact.payloadHash);
  assert.deepEqual(copied?.artifact.payload, envelope.artifact.payload);
  assert.notEqual(copied?.preparedEnvelope, copied?.envelope);
  rejects(() => readCloudLiveRealArtifactInput(copyEnvironment({
    GEOAI_CLOUD_LIVE_COPY_EXISTING_ARTIFACT: "copy-without-authority"
  }), commit, host), /opt-in/);
  rejects(() => readCloudLiveRealArtifactInput(copyEnvironment({
    GEOAI_CLOUD_LIVE_COPY_SOURCE_FILE_SHA256: "b".repeat(64)
  }), commit, host), /source identity or hash/);
  rejects(() => readCloudLiveRealArtifactInput(copyEnvironment({
    GEOAI_CLOUD_LIVE_COPY_SOURCE_PAYLOAD_HASH: "b".repeat(64)
  }), commit, host), /source identity or hash/);
  rejects(() => readCloudLiveRealArtifactInput(copyEnvironment({
    GEOAI_CLOUD_LIVE_COPY_ARTIFACT_ID: envelope.artifact.artifactId
  }), commit, host), /new, explicit and distinct/);
  rejects(() => readCloudLiveRealArtifactInput(copyEnvironment({
    GEOAI_CLOUD_LIVE_COPY_IDEMPOTENCY_KEY: envelope.artifact.idempotencyKey
  }), commit, host), /new, explicit and distinct/);
  rejects(() => readCloudLiveRealArtifactInput(copyEnvironment({
    GEOAI_CLOUD_LIVE_COPY_LABEL_MARKER: "[UNMARKED COPY]"
  }), commit, host), /label marker/);
  rejects(() => readCloudLiveRealArtifactInput({
    ...copyEnvironment(), GEOAI_CLOUD_LIVE_COPY_APPROVAL: "wrong-copy-approval"
  }, commit, host), /not bound/);
  const copyWithoutArtifact = copyEnvironment();
  delete copyWithoutArtifact.GEOAI_QUALITY20_CLOUD_ARTIFACT_PATH;
  delete copyWithoutArtifact.GEOAI_QUALITY20_CLOUD_ARTIFACT_SHA256;
  rejects(() => readCloudLiveRealArtifactInput(copyWithoutArtifact, commit, host), /requires an artifact input/);
  assert.deepEqual(readFileSync(artifactPath), originalBytes);
  assert.equal(statSync(artifactPath).ino, originalStat.ino);
  assert.equal(statSync(artifactPath).size, originalStat.size);
  rejects(() => readCloudLiveRealArtifactInput(environment(artifactPath, "b".repeat(64)), commit, host), /SHA-256 changed/);
  rejects(() => readCloudLiveRealArtifactInput(environment(), "8".repeat(40), host), /exact cloud run/);
  rejects(() => readCloudLiveRealArtifactInput(environment(), commit, "geoai-other.vercel.app"), /exact cloud run/);
  chmodSync(artifactPath, 0o644);
  rejects(() => readCloudLiveRealArtifactInput(environment(), commit, host), /permissions/);
  console.log(JSON.stringify({ status: "PASS", checks: 23, sourceBytesRewritten: false, networkCalls: 0 }));
} finally {
  rmSync(root, { recursive: true, force: true });
}
