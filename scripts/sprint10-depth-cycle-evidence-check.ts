import assert from "node:assert/strict";
import { chmodSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { sprint10AnalysisResponse } from "../tests/e2e/helpers/sprint10-analysis-fixture.ts";
import {
  SPRINT10_DEPTH_CYCLE_EVIDENCE_SCHEMA,
  SPRINT10_DEVELOPMENT_SCREENING_QUESTION,
  buildSprint10DepthCycleEvidence,
  writeSprint10DepthCycleEvidence
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
} from "../tests/e2e/helpers/sprint10-depth-cycle-evidence.ts";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { SPRINT10_ANALYSIS_PROMPT_VERSION } from "../tests/e2e/helpers/sprint10-live-budget.ts";

const sourceFeatureId = "way/91010";
const depths = ["standard", "deep", "quick"] as const;
const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-depth-cycle-evidence-check-")));
chmodSync(root, 0o700);

function input(depth: typeof depths[number], sequence: number, hashCharacter = "a") {
  const submittedRequest = {
    caseKey: "dubai",
    longitude: 55.27,
    latitude: 25.2,
    locale: "en",
    role: "developer",
    scenario: "unspecified",
    question: SPRINT10_DEVELOPMENT_SCREENING_QUESTION,
    depth,
    goal: "development_screening",
    perspective: "developer",
    horizon: "current",
    expectedSourceFeatureId: sourceFeatureId,
    consent: true,
    challenge: `synthetic-private-challenge-${sequence}`
  } as const;
  const response: any = structuredClone(sprint10AnalysisResponse({
    role: submittedRequest.role,
    scenario: submittedRequest.scenario,
    depth: submittedRequest.depth,
    goal: submittedRequest.goal,
    perspective: submittedRequest.perspective,
    horizon: submittedRequest.horizon,
    locale: submittedRequest.locale,
    question: submittedRequest.question
  }, sequence));
  const hash = hashCharacter.repeat(64);
  response.evidencePackHash = hash;
  response.evidencePackId = `p2o_live_evidence_${hash.slice(0, 24)}`;
  response.subject.sourceFeatureId = sourceFeatureId;
  response.telemetry = {
    provider: "openai",
    schemaVersion: 6,
    model: "gpt-5.6-sol",
    reasoningEffort: depth === "deep" ? "high" : depth === "quick" ? "low" : "medium",
    depth,
    promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION,
    requestId: `resp_private_${sequence}`,
    latencyMs: 125,
    attempts: 1,
    attemptTrace: [{
      attempt: 1,
      purpose: "focused",
      model: "gpt-5.6-sol",
      reasoningEffort: depth === "deep" ? "high" : depth === "quick" ? "low" : "medium",
      requestId: `resp_private_${sequence}`,
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
  return {
    response,
    submittedRequest,
    expectedSourceFeatureId: sourceFeatureId,
    telemetryIdentity: {
      requestKey: `S4.DEPTH.CYCLE.${sequence}`,
      phase: "S4" as const,
      candidateHost: "geoai-offline-depth.vercel.app",
      candidateCommit: "a".repeat(40),
      route: "ai" as const,
      depth,
      promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION,
      schemaVersion: 6 as const
    }
  };
}

function fixtures(hashCharacters: [string, string, string] = ["a", "a", "a"]) {
  return depths.map((depth, index) => input(depth, index + 1, hashCharacters[index]));
}

try {
  const built = buildSprint10DepthCycleEvidence(fixtures());
  assert.equal(built.schemaVersion, SPRINT10_DEPTH_CYCLE_EVIDENCE_SCHEMA);
  assert.equal(built.rawSourcePackCaptured, false);
  assert.equal(built.privateRequestFieldsCaptured, false);
  assert.equal(built.sourceFeatureId, sourceFeatureId);
  assert.equal(built.screeningInputs.question, SPRINT10_DEVELOPMENT_SCREENING_QUESTION);
  assert.deepEqual(built.results.map((result) => result.submitted.depth), depths);
  assert.equal(built.evidencePackComparison.status, "COMPARABLE");
  const serialized = JSON.stringify(built);
  assert.doesNotMatch(serialized, /synthetic-private-challenge|resp_private/,
    "private request challenge and provider request IDs must not enter the capture");

  const changedPack = buildSprint10DepthCycleEvidence(fixtures(["a", "b", "a"]));
  assert.equal(changedPack.evidencePackComparison.status, "NOT_COMPARABLE");
  assert.equal(changedPack.evidencePackComparison.basis, "evidence_pack_hash_changed");
  assert.deepEqual(changedPack.evidencePackComparison.evidencePackHashes, ["a".repeat(64), "b".repeat(64), "a".repeat(64)]);

  assert.throws(() => buildSprint10DepthCycleEvidence(fixtures().slice(0, 2)), /exactly three/,
    "missing or extra result counts must fail closed");
  assert.throws(() => buildSprint10DepthCycleEvidence([...fixtures(), input("quick", 4)]), /exactly three/);
  const wrongDepth = fixtures();
  wrongDepth[1] = input("quick", 2);
  assert.throws(() => buildSprint10DepthCycleEvidence(wrongDepth), /deep request/,
    "the screening order and exact Standard/Deep/Quick depths are fixed");
  const changedInput = fixtures();
  changedInput[2].submittedRequest = { ...changedInput[2].submittedRequest, horizon: "long_term" } as any;
  changedInput[2].response.request.horizon = "long_term";
  assert.throws(() => buildSprint10DepthCycleEvidence(changedInput), /non-depth screening inputs changed/);
  const privateField = fixtures();
  privateField[0].submittedRequest = { ...privateField[0].submittedRequest, userId: "private-user" } as any;
  assert.throws(() => buildSprint10DepthCycleEvidence(privateField), /unexpected shape/,
    "unapproved request or identity fields must be rejected, never silently serialized");
  const badTelemetry = fixtures();
  badTelemetry[2].response.telemetry.requestId = "unexpected";
  assert.throws(() => buildSprint10DepthCycleEvidence(badTelemetry), /telemetry is not accepted/,
    "an unknown/nonmatching provider receipt must fail capture");

  const outputPath = join(root, "depth-cycle.json");
  const written = writeSprint10DepthCycleEvidence(outputPath, fixtures());
  assert.equal(written.schemaVersion, SPRINT10_DEPTH_CYCLE_EVIDENCE_SCHEMA);
  assert.equal(lstatSync(outputPath).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(readFileSync(outputPath, "utf8")), written);
  assert.throws(() => writeSprint10DepthCycleEvidence(outputPath, fixtures()), /will not be overwritten/);

  console.log("Sprint 10 depth-cycle evidence checks passed (strict three-result scope, depth/input identity, post-hoc comparability, private-field rejection, exclusive private write).");
} finally {
  rmSync(root, { recursive: true, force: true });
}
