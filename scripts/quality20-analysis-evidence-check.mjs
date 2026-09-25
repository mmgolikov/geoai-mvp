import assert from "node:assert/strict";
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { QUALITY20_CASES, QUALITY20_AMENDMENT, quality20Hash, quality20RequestKey } from "../tests/e2e/helpers/quality20-frozen-case.ts";
import { buildQuality20AnalysisEvidence, validateQuality20AnalysisCaptureEnvironment, writeQuality20AnalysisEvidence } from "../tests/e2e/helpers/quality20-analysis-evidence.ts";
import { SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN, SPRINT10_PUBLIC_ANALYSIS_QUESTION, buildSprint10AnalysisResultEvidence } from "../tests/e2e/helpers/sprint10-analysis-result-evidence.ts";
import { SPRINT10_ANALYSIS_PROMPT_VERSION } from "../tests/e2e/helpers/sprint10-live-budget.ts";
import { sprint10AnalysisResponse } from "../tests/e2e/helpers/sprint10-analysis-fixture.ts";

const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-q20-analysis-capture-check-")));
chmodSync(root, 0o700);
const execution = { commit: "a".repeat(40), origin: "https://geoai-offline-capture.vercel.app", deploymentId: "dpl_OFFLINE" };
function fixture(definition) {
  const binding = { query: "OFFLINE public fixture", locale: "en", question: "Which mapped facts and gaps affect this public screening decision?",
    role: "developer", scenario: "unspecified", goal: definition.goal ?? "custom", find: null, create: null,
    subject: { sourceIdentity: "way/91010", evidencePackHash: "b".repeat(64), geometryHash: "c".repeat(64), sourceResponseHash: "d".repeat(64), acquiredAt: "2026-09-20T00:00:00Z" } };
  const manifest = { schemaVersion: "geoai.quality20.frozen-cases.v1", amendment: QUALITY20_AMENDMENT, execution,
    frozenAt: "2026-09-20T00:00:00Z", cases: QUALITY20_CASES.map(item => ({ id: item.id, binding: item.id === definition.id ? binding : null })) };
  const selection = { manifest, manifestSha256: quality20Hash(manifest), definition, binding };
  const request = { role: binding.role, scenario: binding.scenario, depth: definition.depth, goal: binding.goal,
    question: binding.question, perspective: "developer", horizon: "current", locale: "en" };
  const response = structuredClone(sprint10AnalysisResponse(request));
  response.evidencePackHash = binding.subject.evidencePackHash;
  response.evidencePackId = `p2o_live_evidence_${response.evidencePackHash.slice(0, 24)}`;
  response.subject.sourceFeatureId = binding.subject.sourceIdentity;
  const reasoningEffort = definition.depth === "deep" ? "high" : definition.depth === "quick" ? "low" : "medium";
  const tokens = { inputTokens: 100, cachedInputTokens: 20, cacheWriteTokens: 0, outputTokens: 50, totalTokens: 150, estimatedCostUsd: 0.001328 };
  response.telemetry = { provider: "openai", schemaVersion: 6, model: "gpt-5.6-sol", reasoningEffort, depth: definition.depth,
    promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION, requestId: "resp_private_not_exported", latencyMs: 125, attempts: 1,
    attemptTrace: [{ attempt: 1, purpose: "focused", model: "gpt-5.6-sol", reasoningEffort, requestId: "resp_private_not_exported", ...tokens }],
    ...tokens, costRateSource: "OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output", stored: false, toolCalls: 0 };
  const input = { response, expectedSourceFeatureId: binding.subject.sourceIdentity,
    submittedRequest: { ...request, caseKey: definition.marketKey, expectedSourceFeatureId: binding.subject.sourceIdentity,
      consent: true, challenge: "private-test-challenge", longitude: 55.27, latitude: 25.2 },
    telemetryIdentity: { requestKey: quality20RequestKey(selection, "ai"), phase: "S4", candidateHost: new URL(execution.origin).hostname,
      candidateCommit: execution.commit, route: "ai", depth: definition.depth, promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION, schemaVersion: 6 } };
  return { selection, input };
}
try {
  assert.equal(QUALITY20_CASES.length, 58);
  const cases = QUALITY20_CASES.filter(item => item.scope === "quality20-analyse");
  assert.equal(cases.length, 43);
  for (const definition of cases) {
    const { selection, input } = fixture(definition);
    const original = JSON.stringify(input);
    assert.notEqual(input.submittedRequest.question, SPRINT10_PUBLIC_ANALYSIS_QUESTION);
    assert.throws(() => buildSprint10AnalysisResultEvidence(input), /fixed synthetic public analysis question/);
    const built = buildQuality20AnalysisEvidence(selection, input);
    assert.equal(built.caseId, definition.id);
    assert.equal(built.actualRequest.question, selection.binding.question);
    assert.equal(built.actualRequest.goal, selection.binding.goal);
    assert.equal(built.actualRequest.depth, definition.depth);
    assert.equal(built.result.evidencePackHash, input.response.evidencePackHash);
    assert.equal(built.responseHash, quality20Hash(input.response));
    assert.equal(built.actualRequestHash, quality20Hash(built.actualRequest));
    assert.equal(built.resultHash, quality20Hash(built.result));
    assert.equal(built.result.content.answerToQuestion.statement, input.response.content.answerToQuestion.statement);
    assert.equal(JSON.stringify(input), original, "normalization must never mutate actual input");
  }
  const { selection, input } = fixture(cases[0]);
  const path = join(root, "A01-Q.json");
  const env = { GEOAI_QUALITY20_ANALYSIS_EVIDENCE_CAPTURE: SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN, GEOAI_QUALITY20_ANALYSIS_EVIDENCE_PATH: path };
  assert.deepEqual(validateQuality20AnalysisCaptureEnvironment({}, "quality20-analyse"), {});
  assert.deepEqual(validateQuality20AnalysisCaptureEnvironment(env, "quality20-analyse"), env);
  const visualDir = join(root, "visual"); mkdirSync(visualDir, { mode: 0o700 });
  const visual = { GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE: "write-public-map-png-evidence-v1", GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR: visualDir };
  assert.deepEqual(validateQuality20AnalysisCaptureEnvironment({ ...env, ...visual }, "quality20-analyse"), env);
  assert.throws(() => validateQuality20AnalysisCaptureEnvironment({ ...env, ...visual, GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE: "unscoped" }, "quality20-analyse"));
  assert.throws(() => validateQuality20AnalysisCaptureEnvironment({ ...env, GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE: visual.GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE }, "quality20-analyse"));
  for (const scope of [undefined, "dubai-analyse", "quality20-find", "quality20-create", "quality20-acquire"]) assert.throws(() => validateQuality20AnalysisCaptureEnvironment(env, scope));
  for (const bad of [{ ...env, GEOAI_QUALITY20_ANALYSIS_EVIDENCE_CAPTURE: "yes" },
    { GEOAI_QUALITY20_ANALYSIS_EVIDENCE_CAPTURE: SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN },
    { GEOAI_QUALITY20_ANALYSIS_EVIDENCE_PATH: path }, { ...env, GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: path },
    { ...env, GEOAI_QUALITY20_ARTIFACT_EXPORT: "anything" }, { ...env, GEOAI_QUALITY20_ANALYSIS_EVIDENCE_PATH: "relative.json" }]) {
    assert.throws(() => validateQuality20AnalysisCaptureEnvironment(bad, "quality20-analyse"));
  }
  for (const mutate of [
    v => { v.input.response.request.question = "Different question"; },
    v => { v.input.submittedRequest.question = v.input.response.request.question = "Different but matching question"; },
    v => { v.input.response.evidencePackHash = "f".repeat(64); },
    v => { v.input.response.request.goal = "redevelopment"; },
    v => { v.input.response.request.depth = "deep"; },
    v => { v.input.response.request.perspective = "investor"; },
    v => { v.input.response.request.focused = false; },
    v => { v.input.response.content.answerToQuestion.statement = "synthetic@example.test"; },
    v => { v.input.response.rawSourcePack = { secret: "must-not-export" }; },
    v => { v.input.telemetryIdentity.requestKey = "OTHER"; },
    v => { v.input.response.telemetry.attempts = 99; },
    v => { v.selection.binding.question = v.input.submittedRequest.question = v.input.response.request.question = "synthetic@example.test"; }
  ]) { const changed = structuredClone({ selection, input }); mutate(changed); assert.throws(() => buildQuality20AnalysisEvidence(changed.selection, changed.input)); }
  const coordinateInput = structuredClone(input);
  coordinateInput.response.content.locationContext.push({ statement: "Point 25.200000, 55.270000 EPSG:4326", evidenceRefs: ["EVD-COORDINATES"] });
  assert.equal(buildQuality20AnalysisEvidence(selection, coordinateInput).result.excludedCoordinateReferencedItemCount, 1);
  const expected = writeQuality20AnalysisEvidence(path, selection, input);
  const bytes = readFileSync(path, "utf8");
  assert.deepEqual(JSON.parse(bytes), expected);
  assert.equal(lstatSync(path).mode & 0o777, 0o600);
  assert.equal(lstatSync(path).nlink, 1);
  assert.doesNotMatch(bytes, /private-test-challenge|resp_private_not_exported|"longitude"|"latitude"|"email"|"userId"|"selection"|"authorization"/);
  assert.throws(() => writeQuality20AnalysisEvidence(path, selection, input), /already exists/);
  assert.equal(readFileSync(path, "utf8"), bytes);
  symlinkSync(path, join(root, "symlink.json"));
  assert.throws(() => writeQuality20AnalysisEvidence(join(root, "symlink.json"), selection, input));
  const publicDirectory = join(root, "public"); mkdirSync(publicDirectory); chmodSync(publicDirectory, 0o755);
  assert.throws(() => writeQuality20AnalysisEvidence(join(publicDirectory, "blocked.json"), selection, input), /0700/);
  const spec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
  const run = spec.split("async function runQuality20Analysis")[1].split("async function runQuality20Acquisition")[0];
  assert.ok(run.indexOf("validateQuality20AnalysisResult(selection, payload)") < run.indexOf("writeQuality20AnalysisEvidence("));
  assert.match(run, /configuration.quality20AnalysisEvidencePath\s*\? writeQuality20AnalysisEvidence/);
  assert.match(run, /: buildQuality20AnalysisEvidence\(selection, evidenceInput\)/);
  console.log("PASS: all43 frozen analysis IDs; actual question/goal/depth/hash preservation; negative parity/privacy/telemetry; opt-in only;0600 no-overwrite/no-symlink readback. Offline synthetic only, zero API calls.");
} finally { rmSync(root, { recursive: true, force: true }); }
