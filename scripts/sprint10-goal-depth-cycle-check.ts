import assert from "node:assert/strict";
import { chmodSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error Node transform-types requires the explicit extension.
import { SPRINT10_GOAL_DEPTH_SCOPES, sprint10GoalDepthRecipe, sprint10PaidPostDecision, validateSprint10GoalDepthRequest, type Sprint10GoalDepthScope } from "../tests/e2e/helpers/sprint10-live-journey-gate.ts";
// @ts-expect-error Node transform-types requires the explicit extension.
import { SPRINT10_GOAL_DEPTH_CAPTURE_OPT_IN, validateGoalDepthCaptureEnvironment, writeSprint10GoalDepthEvidence } from "../tests/e2e/helpers/sprint10-goal-depth-evidence.ts";
// @ts-expect-error Node transform-types requires the explicit extension.
import { sprint10AnalysisResponse } from "../tests/e2e/helpers/sprint10-analysis-fixture.ts";
// @ts-expect-error Node transform-types requires the explicit extension.
import { SPRINT10_ANALYSIS_PROMPT_VERSION } from "../tests/e2e/helpers/sprint10-live-budget.ts";
// @ts-expect-error Operator-only JavaScript verified by offline tests.
import { LIVE_SCOPE_RECEIPT_PLAN, validateLiveLedgerScopeHeadroom } from "./sprint10-live-journey-run.mjs";

const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-goal-depth-check-")));
chmodSync(root, 0o700);
const source = { sourceFeatureId: "way/91010", longitude: 55.27, latitude: 25.2 };
try {
  const sourceCases = Object.values(SPRINT10_GOAL_DEPTH_SCOPES);
  assert.deepEqual(sourceCases.map(({ sourceQuery }) => sourceQuery), ["Jumeirah Emirates Towers Hotel", "Dubai World Trade Centre", "Marina Plaza Dubai"]);
  assert.equal(new Set(sourceCases.map(({ sourceQuery }) => sourceQuery)).size, 3);
  for (const [index, sourceCase] of sourceCases.entries()) {
    assert.ok(sourceCase.sourceQuery.length <= 80);
    assert.equal(sourceCase.sourceCandidateLabel.global, false);
    assert.equal(sourceCase.sourceCandidateLabel.sticky, false);
    assert.ok(sourceCase.sourceCandidateLabel.test(sourceCase.sourceQuery));
    assert.equal(sourceCase.sourceCandidateLabel.test("Shangri-La Dubai"), false);
    assert.equal(sourceCase.sourceCandidateLabel.test("Unrelated Dubai hotel, café and offices"), false);
    assert.equal(sourceCase.sourceCandidateLabel.test(`${sourceCase.sourceQuery} Metro Station`), false);
    assert.equal(sourceCase.sourceCandidateLabel.test(`Restaurant at ${sourceCase.sourceQuery}`), false);
    for (const [otherIndex, other] of sourceCases.entries()) {
      if (otherIndex !== index) assert.equal(sourceCase.sourceCandidateLabel.test(other.sourceQuery), false);
    }
    assert.equal(Object.hasOwn(sourceCase, "sourceFeatureId"), false);
    assert.equal(Object.hasOwn(sourceCase, "longitude"), false);
    assert.equal(Object.hasOwn(sourceCase, "latitude"), false);
  }
  for (const scope of Object.keys(SPRINT10_GOAL_DEPTH_SCOPES) as Sprint10GoalDepthScope[]) {
    const recipe = sprint10GoalDepthRecipe(scope);
    assert.deepEqual(recipe.map(({ depth }) => depth), ["standard", "standard", "deep", "quick"]);
    assert.equal(LIVE_SCOPE_RECEIPT_PLAN[scope].length, 4);
    assert.deepEqual(validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 10.2 }, scope), { reserveRequired: 4.8, remainingUsd: 4.8 });
    assert.throws(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 10.20000001 }, scope));
    assert.deepEqual(sprint10PaidPostDecision(scope, "ai", 4), { ok: true });
    assert.deepEqual(sprint10PaidPostDecision(scope, "ai", 5), { ok: false, reason: "occurrence_exceeded" });
    assert.deepEqual(sprint10PaidPostDecision(scope, "create", 1), { ok: false, reason: "route_disallowed" });
    const prefix = join(root, scope);
    const capture = { GEOAI_SPRINT10_GOAL_DEPTH_EVIDENCE_CAPTURE: SPRINT10_GOAL_DEPTH_CAPTURE_OPT_IN, GEOAI_SPRINT10_GOAL_DEPTH_EVIDENCE_PREFIX: prefix };
    assert.deepEqual(validateGoalDepthCaptureEnvironment(capture, scope), capture);
    assert.throws(() => validateGoalDepthCaptureEnvironment({ ...capture, GEOAI_SPRINT10_GOAL_DEPTH_EVIDENCE_CAPTURE: "yes" }, scope));
    assert.throws(() => validateGoalDepthCaptureEnvironment(capture, "dubai-depth-cycle"));
    assert.throws(() => validateGoalDepthCaptureEnvironment({ ...capture, GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: "x" }, scope));
    for (const [index, step] of recipe.entries()) {
      const request = { ...step, caseKey: "dubai", longitude: source.longitude, latitude: source.latitude,
        expectedSourceFeatureId: source.sourceFeatureId, consent: true, challenge: "private-test-challenge",
        perspective: "developer", horizon: "current", role: "developer", scenario: "unspecified", locale: "en" };
      validateSprint10GoalDepthRequest(request, index + 1, source, scope);
      assert.throws(() => validateSprint10GoalDepthRequest({ ...request, extra: "unexpected" }, index + 1, source, scope));
      assert.throws(() => validateSprint10GoalDepthRequest(request, index + 1, null, scope));
      for (const key of ["goal", "depth", "question", "expectedSourceFeatureId", "longitude", "role", "scenario", "perspective", "horizon", "consent"]) {
        assert.throws(() => validateSprint10GoalDepthRequest({ ...request, [key]: "changed" }, index + 1, source, scope));
      }
      if (index === 0) continue;
      const depth = step.depth as "standard" | "deep" | "quick";
      const response: any = structuredClone(sprint10AnalysisResponse({ goal: step.goal as Parameters<typeof sprint10AnalysisResponse>[0]["goal"],
        depth, question: step.question, role: "developer", scenario: "unspecified", perspective: "developer", horizon: "current", locale: "en" }, index));
      const hash = String(index).repeat(64);
      response.evidencePackHash = hash; response.evidencePackId = `p2o_live_evidence_${hash.slice(0, 24)}`;
      response.subject.sourceFeatureId = source.sourceFeatureId;
      const reasoningEffort = depth === "deep" ? "high" : depth === "quick" ? "low" : "medium";
      const tokens = { inputTokens: 100, cachedInputTokens: 20, cacheWriteTokens: 0, outputTokens: 50, totalTokens: 150, estimatedCostUsd: 0.001328 };
      response.telemetry = { provider: "openai", schemaVersion: 6, model: "gpt-5.6-sol", reasoningEffort, depth,
        promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION, requestId: "resp_private_test", latencyMs: 125, attempts: 1,
        attemptTrace: [{ attempt: 1, purpose: "focused", model: "gpt-5.6-sol", reasoningEffort, requestId: "resp_private_test", ...tokens }],
        ...tokens, costRateSource: "OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output", stored: false, toolCalls: 0 };
      const input = { response, submittedRequest: request, expectedSourceFeatureId: source.sourceFeatureId,
        telemetryIdentity: { requestKey: `S4.GOAL.${index}`, phase: "S4" as const, candidateHost: "geoai-offline-goal.vercel.app",
          candidateCommit: "a".repeat(40), route: "ai" as const, depth, promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION, schemaVersion: 6 as const } };
      const evidence = writeSprint10GoalDepthEvidence(prefix, scope, index + 1, input);
      assert.equal(evidence.actualRequest.question, step.question);
      assert.equal(evidence.actualRequest.goal, step.goal);
      assert.equal(evidence.result.submitted.goal, step.goal);
      assert.equal(evidence.comparativeBenchmark, false);
      const path = `${prefix}-${depth}.json`;
      assert.equal(lstatSync(path).mode & 0o777, 0o600);
      const serialized = readFileSync(path, "utf8");
      assert.doesNotMatch(serialized, /private-test-challenge|resp_private_test|"longitude"|"latitude"/);
      assert.throws(() => writeSprint10GoalDepthEvidence(prefix, scope, index + 1, input), /already exists/);
      assert.throws(() => writeSprint10GoalDepthEvidence(`${prefix}-bad`, scope, index + 1, { ...input, response: { ...response, request: { ...response.request, question: "different" } } }));
    }
  }
  const spec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
  assert.match(spec, /sourceQuery = presetConfiguration[.]sourceQuery \?\? "Shangri-La Dubai"/);
  assert.match(spec, /enterQuery: \(search\) => search[.]fill\(sourceQuery\)/);
  assert.match(spec, /candidateLabel: presetConfiguration[.]sourceCandidateLabel \?\? \/shangri\/i/);
  assert.match(spec, /if \(!chosen && input[.]missingCandidateInconclusive\)[\s\S]*?throw new InconclusiveLiveCoverageError/);
  assert.match(spec, /armGoalDepthSource\(\{ sourceFeatureId: chosen[.]id, longitude: chosen[.]longitude, latitude: chosen[.]latitude \}\)/);
  assert.ok(spec.indexOf("validateSprint10GoalDepthRequest(body") < spec.indexOf("reserveSprint10SpendFile(configuration"));
  for (const check of ["data-draft-depth", "data-in-flight-depth", "data-completed-depth", '"data-goal", previousGoal', '"data-goal", presetConfiguration.goal', "assertNoReplay(before, policy.snapshotJourneyRequests())"]) assert.ok(spec.includes(check));
  console.log("PASS: three functional goal scopes; 4 POST/4.8 reserve each; exact pre-dispatch recipe; nine private captures preserve actual questions; no comparative claim.");
} finally { rmSync(root, { recursive: true, force: true }); }
