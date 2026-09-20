import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const MAX_ARTIFACT_BYTES = 512 * 1024;
const EXPORT_SCHEMA = "geoai.quality20.real-artifact.v1";
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const HOST_PATTERN = /^geoai-[a-z0-9-]+\.vercel\.app$/;
const SOURCE_FEATURE_PATTERN = /^(?:node|way|relation)\/[1-9][0-9]{0,19}$/;
const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,198}[a-z0-9]$/;

export const CLOUD_LIVE_COPY_OPT_IN = "copy-existing-public-artifact-v1";
export const CLOUD_LIVE_COPY_LABEL_MARKER = "[MARKED TEST COPY 2026-09-21]";

const copyEnvironmentNames = Object.freeze([
  "GEOAI_CLOUD_LIVE_COPY_EXISTING_ARTIFACT",
  "GEOAI_CLOUD_LIVE_COPY_SOURCE_FILE_SHA256",
  "GEOAI_CLOUD_LIVE_COPY_SOURCE_ARTIFACT_ID",
  "GEOAI_CLOUD_LIVE_COPY_SOURCE_IDEMPOTENCY_KEY",
  "GEOAI_CLOUD_LIVE_COPY_SOURCE_PAYLOAD_HASH",
  "GEOAI_CLOUD_LIVE_COPY_ARTIFACT_ID",
  "GEOAI_CLOUD_LIVE_COPY_IDEMPOTENCY_KEY",
  "GEOAI_CLOUD_LIVE_COPY_LABEL_MARKER",
  "GEOAI_CLOUD_LIVE_COPY_APPROVAL"
]);

function exactKeys(value, keys) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function fail(message) {
  const error = new Error(message);
  error.code = "browser_preflight";
  throw error;
}

function present(value) {
  return typeof value === "string" && value.length > 0;
}

function requiredCopyValue(environment, name) {
  const value = environment[name];
  if (!present(value)) fail(`Marked-copy setting ${name} is required.`);
  return value;
}

export function cloudLiveCopyApproval({
  runtimeCommit,
  runtimeHost,
  sourceFileSha256,
  sourceCommit,
  sourceHost,
  sourceArtifactId,
  sourceIdempotencyKey,
  sourcePayloadHash,
  artifactId,
  idempotencyKey,
  labelMarker = CLOUD_LIVE_COPY_LABEL_MARKER
}) {
  return [
    "cloud-live-copy-existing-artifact",
    runtimeHost,
    runtimeCommit,
    sourceFileSha256,
    sourceCommit,
    sourceHost,
    sourceArtifactId,
    sourceIdempotencyKey,
    sourcePayloadHash,
    artifactId,
    idempotencyKey,
    encodeURIComponent(labelMarker)
  ].join(":");
}

function prepareMarkedCopy(environment, runtimeCommit, runtimeHost, sourceFileSha256, envelope) {
  const requested = copyEnvironmentNames.some((name) => environment[name] !== undefined);
  if (!requested) return null;
  if (requiredCopyValue(environment, "GEOAI_CLOUD_LIVE_COPY_EXISTING_ARTIFACT") !== CLOUD_LIVE_COPY_OPT_IN) {
    fail("Marked-copy opt-in is invalid.");
  }
  const sourceArtifact = envelope.artifact;
  const sourceFileHash = requiredCopyValue(environment, "GEOAI_CLOUD_LIVE_COPY_SOURCE_FILE_SHA256");
  const sourceArtifactId = requiredCopyValue(environment, "GEOAI_CLOUD_LIVE_COPY_SOURCE_ARTIFACT_ID");
  const sourceIdempotencyKey = requiredCopyValue(environment, "GEOAI_CLOUD_LIVE_COPY_SOURCE_IDEMPOTENCY_KEY");
  const sourcePayloadHash = requiredCopyValue(environment, "GEOAI_CLOUD_LIVE_COPY_SOURCE_PAYLOAD_HASH");
  const artifactId = requiredCopyValue(environment, "GEOAI_CLOUD_LIVE_COPY_ARTIFACT_ID");
  const idempotencyKey = requiredCopyValue(environment, "GEOAI_CLOUD_LIVE_COPY_IDEMPOTENCY_KEY");
  const labelMarker = requiredCopyValue(environment, "GEOAI_CLOUD_LIVE_COPY_LABEL_MARKER");
  const approval = requiredCopyValue(environment, "GEOAI_CLOUD_LIVE_COPY_APPROVAL");

  if (!HASH_PATTERN.test(sourceFileHash) || sourceFileHash !== sourceFileSha256 ||
      typeof sourceArtifact.artifactId !== "string" || typeof sourceArtifact.idempotencyKey !== "string" ||
      typeof sourceArtifact.label !== "string" || sourceArtifact.label.trim().length === 0 || sourceArtifact.label.length > 240 ||
      sourceArtifactId !== sourceArtifact.artifactId || sourceIdempotencyKey !== sourceArtifact.idempotencyKey ||
      !HASH_PATTERN.test(sourcePayloadHash) || sourcePayloadHash !== envelope.payloadHash ||
      sourcePayloadHash !== sourceArtifact.payloadHash) {
    fail("Marked-copy source identity or hash is invalid.");
  }
  if (!SAFE_ID_PATTERN.test(artifactId) || artifactId.length > 160 || !SAFE_ID_PATTERN.test(idempotencyKey) ||
      idempotencyKey.length > 200 || artifactId === sourceArtifactId || idempotencyKey === sourceIdempotencyKey ||
      artifactId === idempotencyKey) {
    fail("Marked-copy target identities must be new, explicit and distinct.");
  }
  if (labelMarker !== CLOUD_LIVE_COPY_LABEL_MARKER || sourceArtifact.label.startsWith(labelMarker)) {
    fail("Marked-copy label marker is invalid or already present.");
  }
  const label = `${labelMarker} ${sourceArtifact.label}`;
  if (label.length > 240 || /[\u0000-\u001f\u007f]/.test(label)) fail("Marked-copy label exceeds the saved-artifact contract.");
  const expectedApproval = cloudLiveCopyApproval({
    runtimeCommit,
    runtimeHost,
    sourceFileSha256,
    sourceCommit: envelope.candidateCommit,
    sourceHost: envelope.candidateHost,
    sourceArtifactId,
    sourceIdempotencyKey,
    sourcePayloadHash,
    artifactId,
    idempotencyKey,
    labelMarker
  });
  if (approval !== expectedApproval) fail("Marked-copy approval is not bound to the exact source, target, Preview and Git head.");

  const artifact = { ...sourceArtifact, artifactId, idempotencyKey, label };
  return {
    artifact,
    envelope: { ...envelope, artifact },
    source: {
      fileSha256: sourceFileSha256,
      artifactId: sourceArtifactId,
      idempotencyKey: sourceIdempotencyKey,
      payloadHash: sourcePayloadHash,
      label: sourceArtifact.label
    },
    target: { artifactId, idempotencyKey, payloadHash: sourcePayloadHash, label, labelMarker }
  };
}

export function readCloudLiveRealArtifactInput(environment, runtimeCommit, runtimeHost, { allowHistoricalSource = false } = {}) {
  const configuredPath = environment.GEOAI_QUALITY20_CLOUD_ARTIFACT_PATH;
  const configuredHash = environment.GEOAI_QUALITY20_CLOUD_ARTIFACT_SHA256;
  const hasPath = typeof configuredPath === "string" && configuredPath.length > 0;
  const hasHash = typeof configuredHash === "string" && configuredHash.length > 0;
  if (hasPath !== hasHash) fail("Real artifact path and SHA-256 must be supplied together.");
  const configuredSourceCommit = environment.GEOAI_CLOUD_LIVE_CONTINUE_SOURCE_COMMIT_SHA;
  const configuredSourceHost = environment.GEOAI_CLOUD_LIVE_CONTINUE_SOURCE_HOST;
  const hasSourceCommit = typeof configuredSourceCommit === "string" && configuredSourceCommit.length > 0;
  const hasSourceHost = typeof configuredSourceHost === "string" && configuredSourceHost.length > 0;
  const copyRequested = copyEnvironmentNames.some((name) => environment[name] !== undefined);
  if (copyRequested && environment.GEOAI_CLOUD_LIVE_COPY_EXISTING_ARTIFACT !== CLOUD_LIVE_COPY_OPT_IN) {
    fail("Marked-copy opt-in is invalid.");
  }
  if (hasSourceCommit !== hasSourceHost) fail("Historical artifact source commit and host must be supplied together.");
  if ((hasSourceCommit || hasSourceHost) && !allowHistoricalSource && !copyRequested) {
    fail("Historical artifact source identity is restricted to continuation or marked-copy mode.");
  }
  if (!hasPath) {
    if (hasSourceCommit || hasSourceHost || copyRequested) fail("Historical or marked-copy source identity requires an artifact input.");
    return null;
  }
  if (!isAbsolute(configuredPath) || !HASH_PATTERN.test(configuredHash)) fail("Real artifact input identity is invalid.");
  const expectedCommit = hasSourceCommit ? configuredSourceCommit.trim().toLowerCase() : runtimeCommit;
  const expectedHost = hasSourceHost ? configuredSourceHost.trim().toLowerCase() : runtimeHost;

  const resolvedPath = resolve(configuredPath);
  if (!/^[a-f0-9]{40}$/.test(runtimeCommit) || !HOST_PATTERN.test(runtimeHost) ||
      !/^[a-f0-9]{40}$/.test(expectedCommit) || !HOST_PATTERN.test(expectedHost)) fail("Expected candidate identity is invalid.");
  let file;
  let parent;
  let bytes;
  try {
    if (realpathSync(configuredPath) !== resolvedPath) fail("Real artifact input must not use symlinks.");
    file = lstatSync(resolvedPath);
    parent = statSync(dirname(resolvedPath));
    if (!file.isFile() || file.isSymbolicLink() || !parent.isDirectory()) fail("Real artifact input is not a regular private file.");
    if ((file.mode & 0o777) !== 0o600 || (parent.mode & 0o777) !== 0o700) fail("Real artifact input permissions are not private.");
    if (typeof process.getuid === "function" && (file.uid !== process.getuid() || parent.uid !== process.getuid())) {
      fail("Real artifact input ownership is invalid.");
    }
    if (file.size <= 0 || file.size > MAX_ARTIFACT_BYTES) fail("Real artifact input size is invalid.");
    bytes = readFileSync(resolvedPath);
  } catch (error) {
    if (error?.code === "browser_preflight") throw error;
    fail("Real artifact input could not be read safely.");
  }
  if (createHash("sha256").update(bytes).digest("hex") !== configuredHash) fail("Real artifact input SHA-256 changed.");

  let envelope;
  try { envelope = JSON.parse(bytes.toString("utf8")); }
  catch { fail("Real artifact input is not JSON."); }
  if (!exactKeys(envelope, ["schemaVersion", "candidateCommit", "candidateHost", "sourceFeatureId", "payloadHash", "artifact"]) ||
      envelope.schemaVersion !== EXPORT_SCHEMA || envelope.candidateCommit !== expectedCommit ||
      envelope.candidateHost !== expectedHost || !SOURCE_FEATURE_PATTERN.test(envelope.sourceFeatureId) ||
      !HASH_PATTERN.test(envelope.payloadHash) || !exactKeys(envelope.artifact, [
        "kind", "locale", "marketKey", "label", "payload", "schemaVersion", "artifactId", "idempotencyKey",
        "payloadHash", "completedAt", "updatedAt", "viewRevision"
      ]) || envelope.artifact.kind !== "analyse" || envelope.artifact.marketKey !== "dubai" ||
      envelope.artifact.payloadHash !== envelope.payloadHash ||
      envelope.artifact?.payload?.analysis?.subject?.sourceFeatureId !== envelope.sourceFeatureId) {
    fail("Real artifact input envelope does not match the exact cloud run.");
  }
  const copy = prepareMarkedCopy(environment, runtimeCommit, runtimeHost, configuredHash, envelope);
  return {
    path: resolvedPath,
    sha256: configuredHash,
    sourceCommit: expectedCommit,
    sourceHost: expectedHost,
    envelope,
    preparedEnvelope: copy?.envelope ?? envelope,
    artifact: copy?.artifact ?? envelope.artifact,
    copy
  };
}
