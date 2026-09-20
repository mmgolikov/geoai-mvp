import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const MAX_ARTIFACT_BYTES = 512 * 1024;
const EXPORT_SCHEMA = "geoai.quality20.real-artifact.v1";
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const HOST_PATTERN = /^geoai-[a-z0-9-]+\.vercel\.app$/;
const SOURCE_FEATURE_PATTERN = /^(?:node|way|relation)\/[1-9][0-9]{0,19}$/;

function exactKeys(value, keys) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function fail(message) {
  const error = new Error(message);
  error.code = "browser_preflight";
  throw error;
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
  if (hasSourceCommit !== hasSourceHost) fail("Historical artifact source commit and host must be supplied together.");
  if ((hasSourceCommit || hasSourceHost) && !allowHistoricalSource) fail("Historical artifact source identity is restricted to continuation mode.");
  if (!hasPath) {
    if (hasSourceCommit || hasSourceHost) fail("Historical artifact source identity requires an artifact input.");
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
  return { path: resolvedPath, sha256: configuredHash, sourceCommit: expectedCommit, sourceHost: expectedHost, envelope };
}
