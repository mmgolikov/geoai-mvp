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
  const created = Math.floor(Date.now() / 900_000) * 900_000;
  const hash = hashCharacter.repeat(64);
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
    challenge: `synthetic-private-challenge-${sequence}`,
    evidenceReceipt: { version: "PUBLIC_EVIDENCE_LEASE_V1", evidencePackHash: hash,
      sourceResponseHash: "b".repeat(64), acquiredAt: new Date(created).toISOString(),
      createdAt: new Date(created).toISOString(), expiresAt: new Date(created + 900_000).toISOString(),
      cacheWindow: Math.floor(created / 900_000), sourceLocale: "en", lookupSourceFeatureId: sourceFeatureId }
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
  const liveSpec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
  const depthFlow = /async function runDubaiDepthCycle[\s\S]*?\n}\n\nasync function runSingaporeAnalyse/.exec(liveSpec)?.[0] ?? "";
  const transportChecks = [...depthFlow.matchAll(/validateSprint10DepthCycleTransportIdentity\(/g)].map((match) => match.index);
  const captureGate = depthFlow.indexOf("if (configuration.depthCycleEvidencePath)");
  assert.equal(transportChecks.length, 2,
    "the actual UI flow must validate the baseline and every looped screening transport independently of capture");
  assert.ok(transportChecks.every((index) => index < captureGate),
    "capture-off UI transport acceptance must enforce the public source tuple before optional evidence handling");
  assert.match(depthFlow, /baselineTransportIdentity[.]longitude === chosen[.]longitude[\s\S]*baselineTransportIdentity[.]latitude === chosen[.]latitude/);
  assert.match(depthFlow, /transportIdentity[.]caseKey === baselineTransportIdentity[.]caseKey[\s\S]*transportIdentity[.]longitude === baselineTransportIdentity[.]longitude[\s\S]*transportIdentity[.]latitude === baselineTransportIdentity[.]latitude/);

  const built = buildSprint10DepthCycleEvidence(fixtures());
  assert.equal(built.schemaVersion, SPRINT10_DEPTH_CYCLE_EVIDENCE_SCHEMA);
  assert.equal(built.rawSourcePackCaptured, false);
  assert.equal(built.privateRequestFieldsCaptured, false);
  assert.equal(built.sourceFeatureId, sourceFeatureId);
  assert.equal(built.screeningInputs.question, SPRINT10_DEVELOPMENT_SCREENING_QUESTION);
  assert.deepEqual(built.results.map((result) => result.submitted.depth), depths);
  assert.equal(built.evidencePackComparison.status, "COMPARABLE");
  const serialized = JSON.stringify(built);
  assert.equal(new Set(fixtures().map((item) => item.submittedRequest.challenge)).size, 3,
    "one-time challenges are expected to differ and must not affect comparability");
  assert.doesNotMatch(serialized, /synthetic-private-challenge|resp_private/,
    "private request challenge and provider request IDs must not enter the capture");
  assert.doesNotMatch(serialized, /"(?:caseKey|longitude|latitude)"/,
    "the in-memory public transport comparison must not add case or coordinate fields to the capture");

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
  const changedCase = fixtures();
  changedCase[1].submittedRequest = { ...changedCase[1].submittedRequest, caseKey: "singapore" } as any;
  assert.throws(() => buildSprint10DepthCycleEvidence(changedCase), /public source transport identity is invalid/,
    "a different case must fail even when all response pack hashes still match");
  const changedLongitude = fixtures();
  changedLongitude[1].submittedRequest = { ...changedLongitude[1].submittedRequest, longitude: 55.271 } as any;
  assert.throws(() => buildSprint10DepthCycleEvidence(changedLongitude), /public source transport identity changed/,
    "a different longitude must fail even when all response pack hashes still match");
  const changedLatitude = fixtures();
  changedLatitude[2].submittedRequest = { ...changedLatitude[2].submittedRequest, latitude: 25.201 } as any;
  assert.throws(() => buildSprint10DepthCycleEvidence(changedLatitude), /public source transport identity changed/,
    "a different latitude must fail even when all response pack hashes still match");
  const changedSource = fixtures();
  changedSource[1].submittedRequest = { ...changedSource[1].submittedRequest, expectedSourceFeatureId: "way/91011" } as any;
  assert.throws(() => buildSprint10DepthCycleEvidence(changedSource), /public source transport identity is invalid/);
  const withdrawnConsent = fixtures();
  withdrawnConsent[1].submittedRequest = { ...withdrawnConsent[1].submittedRequest, consent: false } as any;
  assert.throws(() => buildSprint10DepthCycleEvidence(withdrawnConsent), /public source transport identity is invalid/);
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
