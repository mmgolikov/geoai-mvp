import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createHash } from "node:crypto";
import { chmodSync, linkSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
globalThis.fetch = async () => { throw new Error("Network forbidden in offline checks"); };
// Optional dependency checkout supports read-only checks before root integration.
const dependencyRoot = process.argv[2] ? resolve(process.argv[2]) : null;
registerHooks({ resolve(s, c, next) {
  if (dependencyRoot && /(?:^|\/)complete25-real-artifact(?:\.ts)?$/.test(s)) return next(pathToFileURL(join(dependencyRoot, "tests/e2e/helpers/complete25-real-artifact.ts")).href, c);
  if (s.startsWith("@/")) return next(pathToFileURL(join(process.cwd(), `${s.slice(2)}.ts`)).href, c);
  if (s.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(s)) return next(`${s}.ts`, c);
  return next(s, c);
} });
const helper = await import("../tests/e2e/helpers/complete25-real-artifact.ts");
const { readCloudLiveRealArtifactInput, readComplete25CloudManifest } = await import("./sprint10-cloud-live-artifact-input.mjs");
const { browserEnvironment, preflightCloudLiveArtifactInput } = await import("./sprint10-cloud-live-acceptance.mjs");
const { sprint10SelectionWithReceipt, sprint10Selection, sprint10AnalysisResponse } = await import("../tests/e2e/helpers/sprint10-analysis-fixture.ts");
const { QUALITY20_CASES, QUALITY20_AMENDMENT, quality20Hash, quality20RequestKey } = await import("../tests/e2e/helpers/quality20-frozen-case.ts");
const { SPRINT10_ANALYSIS_PROMPT_VERSION } = await import("../tests/e2e/helpers/sprint10-live-budget.ts");
const { parseSavedPointObjectArtifact } = await import("../src/lib/prototype/point-object-projects-contract.ts");
const { hashPointObjectOperation } = await import("../src/lib/prototype/point-object-projects.ts");
const sourceId = "way/797700047", host = "geoai-offline.vercel.app";
const execution = { commit: "a".repeat(40), origin: `https://${host}`, deploymentId: "dpl_OFFLINE" };
const selected = structuredClone(sprint10Selection);
selected.object.sourceFeatureId = selected.resolvedObject.sourceFeatureId = sourceId;
const savedSelection = sprint10SelectionWithReceipt(selected), receipt = savedSelection.resolvedObject.evidenceReceipt;
const binding = { query: "OFFLINE Dubai Hills Mall", locale: "en", question: "Which mapped facts and gaps affect this public screening decision?",
  role: "developer", scenario: "unspecified", goal: "custom", find: null, create: null,
  subject: { sourceIdentity: sourceId, geometryHash: quality20Hash(null), sourceResponseHash: receipt.sourceResponseHash,
    evidencePackHash: receipt.evidencePackHash, acquiredAt: receipt.acquiredAt } };
const manifest = { schemaVersion: "geoai.quality20.frozen-cases.v1", amendment: QUALITY20_AMENDMENT, execution,
  frozenAt: new Date().toISOString(), cases: QUALITY20_CASES.map(c => ({ id: c.id, binding: c.id === "A09" ? binding : null })) };
const manifestRaw = JSON.stringify(manifest, null, 2) + "\n", sha = value => createHash("sha256").update(value).digest("hex");
const selection = { manifest, manifestSha256: sha(manifestRaw), definition: QUALITY20_CASES.find(c => c.id === "A09"), binding };
const request = { role: "developer", scenario: "unspecified", depth: "standard", goal: "custom", perspective: "developer", horizon: "current", question: binding.question, locale: "en" };
const response = sprint10AnalysisResponse(request);
response.evidencePackId = `p2o_live_evidence_${response.evidencePackHash.slice(0,24)}`;
response.subject.sourceFeatureId = sourceId;
response.telemetry.model = response.telemetry.attemptTrace[0].model = "gpt-5.6-sol";
response.telemetry.promptVersion = SPRINT10_ANALYSIS_PROMPT_VERSION;
Object.assign(response.telemetry, { estimatedCostUsd: 0.000024,
  costRateSource: "OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output" });
response.telemetry.attemptTrace[0].estimatedCostUsd = 0.000024;
const artifact = parseSavedPointObjectArtifact({ schemaVersion: 1, artifactId: "artifact_offline", idempotencyKey: "operation_offline", payloadHash: "a".repeat(64),
  completedAt: response.generatedAt, updatedAt: response.generatedAt, viewRevision: 0, kind: "analyse", locale: "en", marketKey: "dubai", label: "OFFLINE original A09 fixture",
  payload: { selection: savedSelection, analysis: response } });
assert(artifact); artifact.payloadHash = await hashPointObjectOperation(artifact);
const captured = await helper.buildComplete25RealArtifact(selection, { artifact, payloadHash: artifact.payloadHash, evidence: {
  response, expectedSourceFeatureId: sourceId, submittedRequest: { ...request, caseKey: "dubai", expectedSourceFeatureId: sourceId, consent: true },
  telemetryIdentity: { requestKey: quality20RequestKey(selection, "ai"), phase: "S4", candidateHost: host, candidateCommit: execution.commit,
    route: "ai", depth: "standard", promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION, schemaVersion: 6 } } });
const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-complete25-cloud-input-")));
chmodSync(root, 0o700);
const artifactPath = join(root, "A09-browser-artifact.json"), manifestPath = join(root, "09-manifest.json");
const bytes = JSON.stringify(captured) + "\n";
const env = { GEOAI_QUALITY20_CLOUD_ARTIFACT_PATH: artifactPath, GEOAI_QUALITY20_CLOUD_ARTIFACT_SHA256: sha(bytes),
  GEOAI_COMPLETE25_CLOUD_MANIFEST_PATH: manifestPath, GEOAI_COMPLETE25_CLOUD_MANIFEST_SHA256: sha(manifestRaw),
  GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL: execution.origin, GEOAI_HOSTED_AUTH_PROBE_EXPECTED_COMMIT_SHA: execution.commit };
const expected = { candidateCommit: execution.commit, candidateHost: host, manifestRaw, manifestSha256: sha(manifestRaw) };
let checks = 0;
const check = (label, fn) => { fn(); checks++; };
const rejects = (label, changed, options) => check(label, () => assert.throws(() => readCloudLiveRealArtifactInput(changed, execution.commit, host, options)));
try {
  writeFileSync(artifactPath, bytes, { mode: 0o600, flag: "wx" });
  writeFileSync(manifestPath, manifestRaw, { mode: 0o600, flag: "wx" });
  const inode = lstatSync(artifactPath).ino;
  const accepted = readCloudLiveRealArtifactInput(env, execution.commit, host);
  check("original identity retained", () => { assert.strictEqual(accepted.artifact, accepted.envelope.artifact); assert.strictEqual(accepted.preparedEnvelope, accepted.envelope); assert.equal(accepted.copy, null); });
  const parsed = await helper.parseComplete25RealArtifactExport(accepted.envelope, expected);
  check("full canonical browser verification", () => assert.deepEqual(parsed.artifact, artifact));
  check("original file not rewritten", () => { assert.equal(readFileSync(artifactPath, "utf8"), bytes); assert.equal(lstatSync(artifactPath).ino, inode); assert.equal(readFileSync(manifestPath, "utf8"), manifestRaw); });
  for (const key of ["GEOAI_COMPLETE25_CLOUD_MANIFEST_PATH", "GEOAI_COMPLETE25_CLOUD_MANIFEST_SHA256"]) {
    const bad = { ...env }; delete bad[key]; rejects(`missing ${key}`, bad);
  }
  rejects("artifact hash", { ...env, GEOAI_QUALITY20_CLOUD_ARTIFACT_SHA256: "f".repeat(64) });
  rejects("manifest hash", { ...env, GEOAI_COMPLETE25_CLOUD_MANIFEST_SHA256: "f".repeat(64) });
  rejects("relative manifest", { ...env, GEOAI_COMPLETE25_CLOUD_MANIFEST_PATH: "09-manifest.json" });
  for (const settings of [
    { GEOAI_CLOUD_LIVE_CONTINUE_EXISTING_ARTIFACT: "continue-existing-artifact-v1" }, { GEOAI_CLOUD_LIVE_CONTINUE_APPROVAL: "invalid" },
    { GEOAI_CLOUD_LIVE_COPY_EXISTING_ARTIFACT: "copy-existing-public-artifact-v1" }, { GEOAI_CLOUD_LIVE_COPY_ACTIVE: "1" },
    { GEOAI_CLOUD_LIVE_COPY_EXPECTED_LABEL: "marked" },
    { GEOAI_CLOUD_LIVE_CONTINUE_SOURCE_COMMIT_SHA: "", GEOAI_CLOUD_LIVE_CONTINUE_SOURCE_HOST: "" },
    { GEOAI_CLOUD_LIVE_CONTINUE_SOURCE_COMMIT_SHA: execution.commit, GEOAI_CLOUD_LIVE_CONTINUE_SOURCE_HOST: host }
  ]) rejects("unsupported new artifact mode", { ...env, ...settings });
  rejects("continuation phase", env, { allowHistoricalSource: true });
  const legacyPath = join(root, "legacy.json");
  const legacyBytes = JSON.stringify({ schemaVersion: "geoai.quality20.real-artifact.v1", candidateCommit: execution.commit, candidateHost: host,
    sourceFeatureId: sourceId, payloadHash: artifact.payloadHash, artifact });
  writeFileSync(legacyPath, legacyBytes, { flag: "wx", mode: 0o600 });
  rejects("legacy cannot carry A09 manifest", { ...env, GEOAI_QUALITY20_CLOUD_ARTIFACT_PATH: legacyPath, GEOAI_QUALITY20_CLOUD_ARTIFACT_SHA256: sha(legacyBytes) });
  const oversizedPath = join(root, "oversized.json"); writeFileSync(oversizedPath, "x".repeat(512 * 1024 + 1), { flag: "wx", mode: 0o600 });
  rejects("bounded manifest", { ...env, GEOAI_COMPLETE25_CLOUD_MANIFEST_PATH: oversizedPath });
  check("manifest only fails pre-auth", () => assert.throws(() => preflightCloudLiveArtifactInput({ GEOAI_COMPLETE25_CLOUD_MANIFEST_PATH: manifestPath, GEOAI_COMPLETE25_CLOUD_MANIFEST_SHA256: sha(manifestRaw) })));
  check("wrong current commit", () => assert.throws(() => readCloudLiveRealArtifactInput(env, "b".repeat(40), host)));
  check("wrong current host", () => assert.throws(() => readCloudLiveRealArtifactInput(env, execution.commit, "geoai-other.vercel.app")));
  for (const path of [artifactPath, manifestPath]) {
    chmodSync(path, 0o644); rejects("unsafe file permissions", env); chmodSync(path, 0o600);
    const link = join(root, "symlink.json"); symlinkSync(path, link);
    rejects("symlink denied", { ...env, [path === artifactPath ? "GEOAI_QUALITY20_CLOUD_ARTIFACT_PATH" : "GEOAI_COMPLETE25_CLOUD_MANIFEST_PATH"]: link }); unlinkSync(link);
    const hardlink = join(root, "hardlink.json"); linkSync(path, hardlink); rejects("hardlink denied", env); unlinkSync(hardlink);
  }
  chmodSync(root, 0o755); rejects("unsafe parent permissions", env); chmodSync(root, 0o700);
  const personas = [{ email: "synthetic-a@example.test", password: "not-a-real-password", userId: "offline-a" }, { email: "synthetic-b@example.test", password: "not-a-real-password", userId: "offline-b" }];
  const forwarded = browserEnvironment(env, { expectedCommitSha: execution.commit }, { previewHost: host, projectKey: "dubai-investment-screening-demo" }, personas, "writer_outsider");
  check("exact manifest forwarded", () => { assert.equal(forwarded.GEOAI_COMPLETE25_CLOUD_MANIFEST_PATH, manifestPath); assert.equal(forwarded.GEOAI_COMPLETE25_CLOUD_MANIFEST_SHA256, sha(manifestRaw)); });
  check("viewer receives no artifact manifest", () => { const viewer = browserEnvironment(env, { expectedCommitSha: execution.commit }, { previewHost: host }, personas, "viewer_denial"); assert.equal(viewer.GEOAI_COMPLETE25_CLOUD_MANIFEST_PATH, undefined); });
  for (const mutate of [v => { v.caseId = "A10"; }, v => { v.source.sourceIdentity = "way/91010"; }, v => { v.execution.deploymentId = "dpl_OTHER"; }, v => { v.artifact.password = "not-exportable"; }]) {
    const bad = structuredClone(captured); mutate(bad);
    check("envelope binding/public negative", () => assert.throws(() => helper.validateComplete25RealArtifactEnvelope(bad, expected)));
  }
  const relabelled = structuredClone(captured); relabelled.artifact.updatedAt = "2020-01-01T00:00:00Z";
  const changedPath = join(root, "changed-metadata.json"); writeFileSync(changedPath, JSON.stringify(relabelled), { mode: 0o600, flag: "wx" });
  rejects("original capture hash protects timestamp metadata", { ...env, GEOAI_QUALITY20_CLOUD_ARTIFACT_PATH: changedPath });
  for (const mutate of [v => { v.artifact.payload.analysis.request.question = "changed"; }, v => { v.artifact.updatedAt = "not-a-time"; },
    v => { v.payloadHash = "f".repeat(64); }, v => { v.artifact.payload.analysis.telemetry.promptVersion = "OLD"; }, v => { v.resultHash = "f".repeat(64); }, v => { v.actualRequestHash = "f".repeat(64); }]) {
    const bad = structuredClone(captured); mutate(bad);
    await assert.rejects(() => helper.parseComplete25RealArtifactExport(bad, expected)); checks++;
  }
  check("manifest reader leaves bytes unchanged", () => assert.equal(readComplete25CloudManifest(env).raw, manifestRaw));
  const originalNow = Date.now;
  try {
    Date.now = () => originalNow() + 24 * 60 * 60 * 1000;
    assert.deepEqual((await helper.parseComplete25RealArtifactExport(captured, expected)).artifact, artifact); checks++;
  } finally { Date.now = originalNow; }
  check("immutable original remains", () => assert.equal(readFileSync(artifactPath, "utf8"), bytes));
  console.log(JSON.stringify({ status: "PASS_OFFLINE_ONLY", checks, networkCalls: 0, paidCalls: 0, originalArtifactRewritten: false }));
} finally { rmSync(root, { recursive: true, force: true }); }
