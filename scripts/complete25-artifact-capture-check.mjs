import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
import { chmodSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
globalThis.fetch = async () => { throw new Error("Network forbidden"); };
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(pathToFileURL(path.join(process.cwd(), `${specifier.slice(2)}.ts`)).href, context);
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const helper = await import("../tests/e2e/helpers/complete25-real-artifact.ts");
const legacy = await import("../tests/e2e/helpers/quality20-real-artifact.ts");
const { sprint10SelectionWithReceipt, sprint10Selection, sprint10AnalysisResponse } = await import("../tests/e2e/helpers/sprint10-analysis-fixture.ts");
const { QUALITY20_CASES, QUALITY20_AMENDMENT, quality20Hash, quality20RequestKey } = await import("../tests/e2e/helpers/quality20-frozen-case.ts");
const { SPRINT10_ANALYSIS_PROMPT_VERSION } = await import("../tests/e2e/helpers/sprint10-live-budget.ts");
const { parseSavedPointObjectArtifact } = await import("../src/lib/prototype/point-object-projects-contract.ts");
const { hashPointObjectOperation } = await import("../src/lib/prototype/point-object-projects.ts");
const sourceId = "way/797700047";
const execution = { commit: "a".repeat(40), origin: "https://geoai-offline.vercel.app", deploymentId: "dpl_OFFLINE" };
const savedSelection = structuredClone(sprint10Selection);
savedSelection.object.sourceFeatureId = savedSelection.resolvedObject.sourceFeatureId = sourceId;
const withReceipt = sprint10SelectionWithReceipt(savedSelection);
const receipt = withReceipt.resolvedObject.evidenceReceipt;
const binding = { query: "OFFLINE Dubai Hills Mall fixture", locale: "en", question: "Which mapped facts and gaps affect this public screening decision?",
  role: "developer", scenario: "unspecified", goal: "custom", find: null, create: null,
  subject: { sourceIdentity: sourceId, evidencePackHash: receipt.evidencePackHash, geometryHash: quality20Hash(null),
    sourceResponseHash: receipt.sourceResponseHash, acquiredAt: receipt.acquiredAt } };
const manifest = { schemaVersion: "geoai.quality20.frozen-cases.v1", amendment: QUALITY20_AMENDMENT, execution,
  frozenAt: new Date().toISOString(), cases: QUALITY20_CASES.map(item => ({ id: item.id, binding: item.id === "A09" ? binding : null })) };
const manifestRaw = `${JSON.stringify(manifest, null, 2)}\n`;
const selection = { manifest, manifestSha256: createHash("sha256").update(manifestRaw).digest("hex"), definition: QUALITY20_CASES.find(item => item.id === "A09"), binding };
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
  completedAt: response.generatedAt, updatedAt: response.generatedAt, viewRevision: 0, kind: "analyse", locale: "en", marketKey: "dubai", label: "OFFLINE public fixture",
  payload: { selection: withReceipt, analysis: response } });
assert(artifact);
artifact.payloadHash = await hashPointObjectOperation(artifact);
const input = { artifact, payloadHash: artifact.payloadHash, evidence: { response, expectedSourceFeatureId: sourceId,
  submittedRequest: { ...request, caseKey: "dubai", expectedSourceFeatureId: sourceId, consent: true, challenge: "private-input-not-exported" },
  telemetryIdentity: { requestKey: quality20RequestKey(selection, "ai"), phase: "S4", candidateHost: "geoai-offline.vercel.app", candidateCommit: execution.commit,
    route: "ai", depth: "standard", promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION, schemaVersion: 6 } } };
const root = realpathSync(mkdtempSync(path.join(tmpdir(), "geoai-complete25-artifact-check-")));
chmodSync(root, 0o700);
let checks = 0;
try {
  const target = path.join(root, "A09-browser-artifact.json");
  const env = { GEOAI_COMPLETE25_A09_ARTIFACT_CAPTURE: helper.COMPLETE25_ARTIFACT_CAPTURE_OPT_IN, GEOAI_COMPLETE25_A09_ARTIFACT_PATH: target };
  assert.deepEqual(helper.validateComplete25ArtifactCaptureEnvironment({}, "journey", null), {}); checks++;
  assert.deepEqual(helper.validateComplete25ArtifactCaptureEnvironment(env, "quality20-analyse", selection), env); checks++;
  for (const scope of [undefined, "dubai-analyse", "quality20-find", "quality20-create", "quality20-acquire"]) {
    assert.throws(() => helper.validateComplete25ArtifactCaptureEnvironment(env, scope, selection)); checks++;
  }
  for (const bad of [{ ...env, GEOAI_COMPLETE25_A09_ARTIFACT_CAPTURE: "yes" }, { GEOAI_COMPLETE25_A09_ARTIFACT_CAPTURE: helper.COMPLETE25_ARTIFACT_CAPTURE_OPT_IN },
    { GEOAI_COMPLETE25_A09_ARTIFACT_PATH: target }, { ...env, GEOAI_COMPLETE25_A09_ARTIFACT_PATH: "relative.json" }]) {
    assert.throws(() => helper.validateComplete25ArtifactCaptureEnvironment(bad, "quality20-analyse", selection)); checks++;
  }
  for (const mutate of [v => { v.definition = QUALITY20_CASES.find(item => item.id === "A10"); }, v => { v.binding.subject.sourceIdentity = "way/91010"; },
    v => { v.manifest.execution.commit = "b".repeat(40); }, v => { v.manifestSha256 = "f".repeat(64); }, v => { v.binding.question = "changed"; }]) {
    const changed = structuredClone(selection); mutate(changed);
    assert.throws(() => helper.validateComplete25ArtifactCaptureEnvironment(env, "quality20-analyse", changed)); checks++;
  }
  const untouched = JSON.stringify(input);
  const built = await helper.buildComplete25RealArtifact(selection, input);
  assert.strictEqual(built.artifact, artifact); assert.equal(JSON.stringify(input), untouched); checks += 2;
  assert.equal(built.responseHash, quality20Hash(response)); assert.equal(built.manifestSha256, selection.manifestSha256); checks += 2;
  for (const mutate of [v => { v.payloadHash = "b".repeat(64); }, v => { v.artifact.payload.analysis.request.question = "changed"; },
    v => { v.evidence.response.content.answerToQuestion.statement = "Another bounded public answer."; },
    v => { v.evidence.response.telemetry.promptVersion = "OLD"; }, v => { v.evidence.telemetryIdentity.candidateCommit = "b".repeat(40); },
    v => { v.evidence.submittedRequest.question = "changed"; }, v => { v.artifact.payload.selection.resolvedObject.evidenceReceipt.sourceResponseHash = "f".repeat(64); },
    v => { v.artifact.payload.selection.resolvedObject.sourceFeatureId = "way/123"; }, v => { v.artifact.unexpected = true; },
    v => { v.artifact.userId = "not-exportable"; }, v => { v.artifact.label = "Bearer private-input-not-exported"; },
    v => { v.artifact.label = "synthetic@example.test"; }, v => { v.artifact.label = "a".repeat(512*1024); },
    v => { v.artifact = { projects: [{ artifacts: [v.artifact] }], identityKey: "user:private" }; }]) {
    const changed = structuredClone(input); mutate(changed);
    await assert.rejects(() => helper.buildComplete25RealArtifact(selection, changed)); checks++;
  }
  // Rehashed, canonical but wrong source is still rejected; checksum alone is not evidence.
  const drifted = structuredClone(input);
  drifted.artifact.payload.selection.resolvedObject.evidenceReceipt.acquiredAt = "2020-01-01T00:00:00Z";
  drifted.artifact.payloadHash = drifted.payloadHash = await hashPointObjectOperation(drifted.artifact);
  await assert.rejects(() => helper.buildComplete25RealArtifact(selection, drifted)); checks++;
  const output = await helper.writeComplete25RealArtifact(target, selection, input);
  const expected = { candidateCommit: execution.commit, candidateHost: "geoai-offline.vercel.app", manifestRaw, manifestSha256: selection.manifestSha256 };
  assert.equal(helper.validateComplete25RealArtifactEnvelope(output, expected).selection.definition.id, "A09"); checks++;
  assert.deepEqual(await helper.parseComplete25RealArtifactExport(output, expected), output); checks++;
  for (const changed of [{ ...expected, manifestRaw: manifestRaw + " " }, { ...expected, candidateCommit: "b".repeat(40) },
    { ...expected, candidateHost: "geoai-other.vercel.app" }, { ...expected, manifestSha256: "b".repeat(64) }]) {
    assert.throws(() => helper.validateComplete25RealArtifactEnvelope(output, changed)); checks++;
  }
  for (const changed of [{ ...output, unexpected: true }, { ...output, resultHash: "b".repeat(64) }, { ...output, actualRequestHash: "b".repeat(64) },
    { ...output, source: { ...output.source, sourceIdentity: "way/123" } }, { ...output, responseHash: "not-a-sha" }]) {
    await assert.rejects(() => helper.parseComplete25RealArtifactExport(changed, expected)); checks++;
  }
  const bytes = readFileSync(target, "utf8");
  assert.deepEqual(JSON.parse(bytes), output); assert.equal(lstatSync(target).mode & 0o777, 0o600); assert.equal(lstatSync(target).nlink, 1); checks += 3;
  assert.doesNotMatch(bytes, /private-input-not-exported|"identityKey"|"userId"|"projects"|"password"/); checks++;
  await assert.rejects(() => helper.writeComplete25RealArtifact(target, selection, input)); assert.equal(readFileSync(target, "utf8"), bytes); checks += 2;
  const linked = path.join(root, "linked.json"); symlinkSync(target, linked);
  await assert.rejects(() => helper.writeComplete25RealArtifact(linked, selection, input)); checks++;
  chmodSync(root, 0o755);
  await assert.rejects(() => helper.writeComplete25RealArtifact(path.join(root, "unsafe.json"), selection, input)); checks++;
  chmodSync(root, 0o700);
  assert.throws(() => legacy.validateQuality20ArtifactExportEnvironment({ GEOAI_QUALITY20_ARTIFACT_EXPORT: legacy.QUALITY20_ARTIFACT_EXPORT_OPT_IN,
    GEOAI_QUALITY20_ARTIFACT_EXPORT_PATH: path.join(root, "legacy.json") }, "quality20-analyse")); checks++;
  const spec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
  const capture = spec.slice(spec.indexOf("if (configuration.complete25ArtifactCapturePath)"), spec.indexOf('test.info().annotations.push({ type: "quality20-case"', spec.indexOf("if (configuration.complete25ArtifactCapturePath)")));
  assert.match(capture, /return matches\[0\]/); assert.match(capture, /expect\(budget.paidDispatchCount\(\)\).toBe\(before\)/);
  assert.doesNotMatch(capture, /\.click\(|fetch\(|request\.post|localStorage\.setItem/); checks += 3;
  console.log(`PASS ${checks} A09 capture checks: exact browser artifact, manifest/source/request/response parity, private exclusive output, legacy fail-closed; no network.`);
} finally { rmSync(root, { recursive: true, force: true }); }
