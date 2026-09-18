import assert from "node:assert/strict";
import {
  chmodSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// @ts-expect-error The Node transform-types offline runner requires the explicit TypeScript extension.
import { sprint10AnalysisResponse } from "../tests/e2e/helpers/sprint10-analysis-fixture.ts";
// @ts-expect-error The Node transform-types offline runner requires the explicit TypeScript extension.
import { SPRINT10_ANALYSIS_EVIDENCE_MAX_BYTES, SPRINT10_ANALYSIS_EVIDENCE_SCHEMA, SPRINT10_PUBLIC_ANALYSIS_QUESTION, buildSprint10AnalysisResultEvidence, validateSprint10AnalysisEvidencePath, writeSprint10AnalysisResultEvidence } from "../tests/e2e/helpers/sprint10-analysis-result-evidence.ts";
// @ts-expect-error The Node transform-types offline runner requires the explicit TypeScript extension.
import { SPRINT10_ANALYSIS_PROMPT_VERSION, type Sprint10RequestIdentity } from "../tests/e2e/helpers/sprint10-live-budget.ts";

const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-analysis-evidence-check-")));
chmodSync(root, 0o700);
const outputPath = join(root, "analysis-result.json");
const sourceFeatureId = "way/91010";
const evidencePackHash = "a".repeat(64);
const submittedRequest = {
  role: "developer",
  scenario: "b2b_redevelopment_selected_aoi",
  depth: "standard",
  goal: "redevelopment",
  perspective: "developer",
  horizon: "one_to_three_years",
  locale: "en",
  question: SPRINT10_PUBLIC_ANALYSIS_QUESTION,
  expectedSourceFeatureId: sourceFeatureId,
  longitude: 55.27,
  latitude: 25.2,
  consent: true,
  challenge: "synthetic-not-captured"
} as const;
const identity: Sprint10RequestIdentity = {
  requestKey: "S4.ANALYSIS.EVIDENCE.OFFLINE",
  phase: "S4",
  candidateHost: "geoai-offline-analysis-evidence.vercel.app",
  candidateCommit: "a".repeat(40),
  route: "ai",
  depth: "standard",
  promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION,
  schemaVersion: 6
};

function syntheticResponse() {
  const response: any = structuredClone(sprint10AnalysisResponse({
    role: submittedRequest.role,
    scenario: submittedRequest.scenario,
    depth: submittedRequest.depth,
    goal: submittedRequest.goal,
    perspective: submittedRequest.perspective,
    horizon: submittedRequest.horizon,
    locale: submittedRequest.locale,
    question: submittedRequest.question
  }, 1));
  response.evidencePackHash = evidencePackHash;
  response.evidencePackId = `p2o_live_evidence_${evidencePackHash.slice(0, 24)}`;
  response.subject.sourceFeatureId = sourceFeatureId;
  response.telemetry = {
    provider: "openai",
    schemaVersion: 6,
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
    depth: "standard",
    promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION,
    requestId: "resp_synthetic_public_analysis_1",
    latencyMs: 125,
    attempts: 1,
    attemptTrace: [{
      attempt: 1,
      purpose: "focused",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      requestId: "resp_synthetic_public_analysis_1",
      inputTokens: 100,
      cachedInputTokens: 20,
      cacheWriteTokens: 0,
      outputTokens: 50,
      totalTokens: 150,
      estimatedCostUsd: 0.001328
    }],
    inputTokens: 100,
    cachedInputTokens: 20,
    cacheWriteTokens: 0,
    outputTokens: 50,
    totalTokens: 150,
    estimatedCostUsd: 0.001328,
    costRateSource: "OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output",
    stored: false,
    toolCalls: 0
  };
  return response;
}

function input(response: unknown = syntheticResponse()) {
  return { response, submittedRequest, expectedSourceFeatureId: sourceFeatureId, telemetryIdentity: identity };
}

let negativeCases = 0;
function rejects(run: () => unknown, pattern?: RegExp) {
  if (pattern) assert.throws(run, pattern);
  else assert.throws(run);
  negativeCases += 1;
}

try {
  assert.equal(validateSprint10AnalysisEvidencePath(outputPath), outputPath);
  const built = buildSprint10AnalysisResultEvidence(input());
  assert.equal(built.schemaVersion, SPRINT10_ANALYSIS_EVIDENCE_SCHEMA);
  assert.equal(built.rawSourcePackCaptured, false);
  assert.equal(built.sourceFeatureId, sourceFeatureId);
  assert.equal(built.evidencePackId, `p2o_live_evidence_${evidencePackHash.slice(0, 24)}`);
  assert.deepEqual(Object.keys(built.submitted).sort(), ["depth", "goal", "horizon", "locale", "perspective", "role", "scenario"]);
  assert.equal(built.submitted.goal, "redevelopment");
  assert.equal(built.content.caveat,
    "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.");
  const written = writeSprint10AnalysisResultEvidence(outputPath, input());
  assert.deepEqual(written, built);
  const details = lstatSync(outputPath);
  assert(details.isFile() && !details.isSymbolicLink() && details.nlink === 1);
  assert.equal(details.mode & 0o777, 0o600);
  assert(details.size > 0 && details.size <= SPRINT10_ANALYSIS_EVIDENCE_MAX_BYTES);
  const serialized = readFileSync(outputPath, "utf8");
  const reread = JSON.parse(serialized) as Record<string, unknown>;
  assert.deepEqual(Object.keys(reread).sort(), [
    "analysisSchemaVersion", "captureKind", "content", "evidencePackHash", "evidencePackId", "rawSourcePackCaptured",
    "schemaVersion", "sourceFeatureId", "submitted", "telemetry"
  ].sort());
  assert(!serialized.includes("resp_synthetic_public_analysis_1"), "provider request IDs must not be retained");
  for (const forbidden of ["challenge", "longitude", "latitude", "expectedSourceFeatureId", "email", "password",
    "authorization", "cookie", "localStorage", "userId", "projectId", "headers", "rawResponse", "rawSourcePack"] ) {
    assert(!serialized.includes(`\"${forbidden}\"`), `${forbidden} must not be retained`);
  }
  assert.equal((reread.telemetry as Record<string, unknown>).model, "gpt-5.6-sol");
  assert.equal((reread.telemetry as Record<string, unknown>).estimatedCostUsd, 0.001328);
  assert.equal(((reread.telemetry as Record<string, unknown>).attemptTrace as Array<Record<string, unknown>>)[0]?.requestId, undefined);

  const sparse = syntheticResponse();
  sparse.content.depthReview.analyticChecks = sparse.content.depthReview.analyticChecks.slice(0, 1);
  sparse.content.depthReview.alternatives = [];
  sparse.content.depthReview.uncertainties = [];
  sparse.content.depthReview.decisionTriggers = sparse.content.depthReview.decisionTriggers.slice(0, 1);
  const sparseEvidence = buildSprint10AnalysisResultEvidence(input(sparse));
  assert.deepEqual((sparseEvidence.content.depthReview as Record<string, unknown>).alternatives, [],
    "honest sparse structured content must be captured for later quality FAIL assessment, not fabricated or discarded");

  const liveSpec = readFileSync(join(process.cwd(), "tests/e2e/sprint10-live-journey.spec.ts"), "utf8");
  const acceptedIdentity = liveSpec.indexOf("The Dubai Analyse response did not preserve current V10 depth");
  const capture = liveSpec.indexOf("writeSprint10AnalysisResultEvidence(configuration.analysisEvidencePath");
  const localSuccess = liveSpec.indexOf('await expect(page.getByTestId("ai-success"))', capture);
  assert(acceptedIdentity > 0 && capture > acceptedIdentity && localSuccess > capture,
    "capture must remain after accepted response identity and before browser-local result verification");
  assert.equal(liveSpec.match(/writeSprint10AnalysisResultEvidence\(configuration[.]analysisEvidencePath/g)?.length, 1,
    "the bounded journey must contain exactly one evidence write site");
  for (const name of ["GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE", "GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH"]) {
    assert(liveSpec.includes(name), `live spec must retain the explicit ${name} gate`);
  }

  rejects(() => writeSprint10AnalysisResultEvidence(outputPath, input()), /will not be overwritten/);
  rejects(() => validateSprint10AnalysisEvidencePath("relative-evidence.json"), /absolute/);

  const danglingPath = join(root, "dangling-result.json");
  symlinkSync(join(root, "missing-result-target"), danglingPath);
  rejects(() => validateSprint10AnalysisEvidencePath(danglingPath), /will not be overwritten/);
  assert(lstatSync(danglingPath).isSymbolicLink());

  const linkedParentTarget = join(root, "linked-parent-target");
  const linkedParent = join(root, "linked-parent");
  const openParent = join(root, "open-parent");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(linkedParentTarget, { mode: 0o700 });
  symlinkSync(linkedParentTarget, linkedParent);
  rejects(() => validateSprint10AnalysisEvidencePath(join(linkedParent, "result.json")), /0700 real directory/);
  mkdirSync(openParent, { mode: 0o755 });
  rejects(() => validateSprint10AnalysisEvidencePath(join(openParent, "result.json")), /0700 real directory/);

  const mismatchedSource = syntheticResponse();
  mismatchedSource.subject.sourceFeatureId = "way/91011";
  rejects(() => buildSprint10AnalysisResultEvidence(input(mismatchedSource)), /source identity changed/);

  const extraContent = syntheticResponse();
  Object.assign(extraContent.content, { rawNetworkDump: "not accepted" });
  rejects(() => buildSprint10AnalysisResultEvidence(input(extraContent)), /content has an unexpected shape/);

  const extraRoot = syntheticResponse() as ReturnType<typeof syntheticResponse> & { headers?: unknown };
  extraRoot.headers = { authorization: "not accepted" };
  rejects(() => buildSprint10AnalysisResultEvidence(input(extraRoot)), /response has an unexpected shape/);

  const privateText = syntheticResponse();
  privateText.content.decisionBrief.summary = `Contact ${["private.person", "example.invalid"].join("@")} for the result.`;
  rejects(() => buildSprint10AnalysisResultEvidence(input(privateText)), /identity-shaped text/);

  const invalidTelemetry = syntheticResponse();
  invalidTelemetry.telemetry.totalTokens = 151;
  rejects(() => buildSprint10AnalysisResultEvidence(input(invalidTelemetry)), /telemetry is not accepted/);

  const wrongQuestion = { ...submittedRequest, question: "Private user prompt" };
  rejects(() => buildSprint10AnalysisResultEvidence({ ...input(), submittedRequest: wrongQuestion }), /fixed synthetic public/);

  const oversized = syntheticResponse();
  const textKeys = new Set(["title", "observation", "implication", "statement", "headline", "summary", "hypothesis",
    "rationale", "potentialValue", "decisionImpact", "action", "source"]);
  const inflate = (value: unknown, parentKey = ""): void => {
    if (Array.isArray(value)) return void value.forEach((item) => inflate(item, parentKey));
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (parentKey !== "codes" && textKeys.has(key) && typeof child === "string") {
        (value as Record<string, unknown>)[key] = "x".repeat(4_096);
      } else inflate(child, key);
    }
  };
  inflate(oversized.content);
  rejects(() => buildSprint10AnalysisResultEvidence(input(oversized)), /bounded file size/);

  console.log(JSON.stringify({
    status: "PASS",
    cases: {
      whitelistedBuild: 1,
      privateExclusiveWriteAndRoundTrip: 1,
      honestSparseCapture: 1,
      liveIntegrationOrdering: 1,
      privacyFieldExclusions: 15,
      telemetryRequestIdExcluded: 1,
      negativeCases,
      networkCalls: 0,
      providerCalls: 0,
      realLedgerAccess: false
    }
  }));
} finally {
  rmSync(root, { recursive: true, force: true });
}
