import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
// @ts-expect-error Node transform-types requires the explicit extension.
import { validateSprint10FindAnalysisRequest, sprint10PaidPostDecision } from "../tests/e2e/helpers/sprint10-live-journey-gate.ts";
// @ts-expect-error Node transform-types requires the explicit extension.
import { SPRINT10_FIND_ANALYSIS_CAPTURE_OPT_IN, validateFindAnalysisCaptureEnvironment } from "../tests/e2e/helpers/sprint10-find-analysis-evidence.ts";
// @ts-expect-error Node transform-types requires the explicit extension.
import { SPRINT10_PUBLIC_ANALYSIS_QUESTION } from "../tests/e2e/helpers/sprint10-analysis-result-evidence.ts";
// @ts-expect-error Operator-only JavaScript contract.
import { LIVE_SCOPE_RECEIPT_PLAN, validateLiveLedgerScopeHeadroom } from "./sprint10-live-journey-run.mjs";

const scope = "dubai-find-analysis";
const sources = [1, 2, 3].map((index) => ({ sourceFeatureId: `way/${index}`, longitude: 55.27 + index / 1000, latitude: 25.2 }));
for (const [index, source] of sources.entries()) {
  const body = { caseKey: "dubai", locale: "en", longitude: source.longitude, latitude: source.latitude,
    expectedSourceFeatureId: source.sourceFeatureId, depth: "standard", goal: "custom", role: "consultant_broker",
    scenario: "b2b_hotel_development", perspective: "developer", horizon: "one_to_three_years",
    question: SPRINT10_PUBLIC_ANALYSIS_QUESTION, consent: true, challenge: "offline-synthetic-challenge" };
  validateSprint10FindAnalysisRequest(body, index + 1, sources);
  for (const key of ["expectedSourceFeatureId", "longitude", "latitude", "depth", "goal", "role", "scenario", "perspective", "horizon", "question", "locale", "consent"]) {
    assert.throws(() => validateSprint10FindAnalysisRequest({ ...body, [key]: "changed" }, index + 1, sources));
  }
  assert.throws(() => validateSprint10FindAnalysisRequest({ ...body, extra: true }, index + 1, sources));
  assert.throws(() => validateSprint10FindAnalysisRequest(body, index + 1, null));
  assert.throws(() => validateSprint10FindAnalysisRequest(body, index + 1, [source, source, source]));
  assert.throws(() => validateSprint10FindAnalysisRequest(body, 4, sources));
  assert.throws(() => validateSprint10FindAnalysisRequest(body, 0, sources));
  assert.deepEqual(sprint10PaidPostDecision(scope, "ai", index + 1), { ok: true });
}
assert.deepEqual(sprint10PaidPostDecision(scope, "ai", 4), { ok: false, reason: "occurrence_exceeded" });
assert.deepEqual(sprint10PaidPostDecision(scope, "create", 1), { ok: false, reason: "route_disallowed" });
assert.deepEqual(sprint10PaidPostDecision("dubai-find", "ai", 1), { ok: false, reason: "route_disallowed" });
assert.equal(LIVE_SCOPE_RECEIPT_PLAN[scope].length, 3);
assert.deepEqual(validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 11.4 }, scope), { reserveRequired: 3.6, remainingUsd: 3.6 });
assert.throws(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 11.40000001 }, scope));
const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-find-analysis-check-")));
chmodSync(root, 0o700);
try {
  const prefix = join(root, "result");
  const env = { GEOAI_SPRINT10_FIND_ANALYSIS_EVIDENCE_CAPTURE: SPRINT10_FIND_ANALYSIS_CAPTURE_OPT_IN,
    GEOAI_SPRINT10_FIND_ANALYSIS_EVIDENCE_PREFIX: prefix };
  assert.deepEqual(validateFindAnalysisCaptureEnvironment({}, scope), {});
  assert.deepEqual(validateFindAnalysisCaptureEnvironment(env, scope), env);
  assert.throws(() => validateFindAnalysisCaptureEnvironment(env, "dubai-find"));
  assert.throws(() => validateFindAnalysisCaptureEnvironment({ ...env, GEOAI_SPRINT10_FIND_ANALYSIS_EVIDENCE_CAPTURE: "yes" }, scope));
  assert.throws(() => validateFindAnalysisCaptureEnvironment({ ...env, GEOAI_SPRINT10_GOAL_DEPTH_EVIDENCE_PREFIX: "other" }, scope));
  writeFileSync(`${prefix}-2.json`, "existing", { mode: 0o600 });
  assert.throws(() => validateFindAnalysisCaptureEnvironment(env, scope), /already exists/);
} finally { rmSync(root, { recursive: true, force: true }); }
const spec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
const find = spec.split("async function runDubaiFind")[1].split("async function runSingaporeFind")[0];
assert.ok(find.indexOf("acceptedFindResponse(payload") < find.indexOf("budget.armFindAnalysisSources(analysisSources)"));
const identityGuard = spec.indexOf('(configuration.scope === "dubai-find-construction" ? validateConstructionAnalysisRequest : validateSprint10FindAnalysisRequest)(body');
assert.ok(identityGuard >= 0 && identityGuard < spec.indexOf("reserveSprint10SpendFile(configuration"));
assert.ok(find.includes('const findRole = construction ? CONSTRUCTION_FIND_CASE.role : "consultant_broker";'));
assert.ok(find.includes('const findScenario = construction ? CONSTRUCTION_FIND_CASE.scenario : "b2b_hotel_development";'));
for (const text of ["contextResponse.status() === 200", "aiResponse.status() === 200", "buildSprint10AnalysisResultEvidence(evidenceInput)",
  "writeSprint10AnalysisResultEvidence", "savedAnalysis", '"data-completed-role", findRole', '"data-completed-scenario", findScenario', "assertNoReplay(beforeReturn", "runCandidateAnalysis ? index + 1 : 0"]) assert.ok(find.includes(text), text);
console.log("PASS: three exact live Find identities, actual broker/hotel settings, 3 Standard POST / 3.6 reserve, capture opt-in, old Find remains zero paid.");
