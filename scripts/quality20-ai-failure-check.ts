import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
// @ts-expect-error -- Node strip-types runner requires the explicit extension.
import { core, evidencePack } from "./point-to-object-semantic-v6-check.ts";

const fixtureGlobal = globalThis as typeof globalThis & { __failureCore?: unknown };
fixtureGlobal.__failureCore = core;
const source = readFileSync(new URL("../src/lib/prototype/point-to-object-ai.ts", import.meta.url), "utf8")
  .replace('import "server-only";', "")
  .replace('import { getPointObjectUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";',
    "const getPointObjectUpstreamStatus = () => ({ enabled: true });")
  .replace(/import \{([\s\S]*?)\} from "\.\/point-to-object-ai-core";/,
    (_all, names: string) => `const { ${names.replace(/\s*type \w+,?/g, "")} } = globalThis.__failureCore;`)
  .replace(/import type \{ GroundablePointObjectEvidencePack \} from "\.\/point-to-object-live-evidence";/, "")
  .replace(/import \{ pointObjectAnalysisRoleScenarioOrUnspecified \} from "\.\/point-to-object-ai-provenance";/,
    'const pointObjectAnalysisRoleScenarioOrUnspecified = () => ({ role: "unspecified", scenario: "unspecified" });');
const service = await import(`data:text/javascript;base64,${Buffer.from(
  stripTypeScriptTypes(source, { mode: "transform", sourceMap: false })
).toString("base64")}`);

const pack = evidencePack();
const req = { depth: "quick", goal: "object_profile", perspective: "developer", horizon: "current", locale: "en", question:
  "Build a concise decision-oriented profile of this object. Separate observed map evidence, derived implications and hypotheses, and identify the most material evidence gaps." };
const profile = { model: "gpt-5.6-terra", reasoningEffort: "low", verbosity: "medium", maxOutputTokens: 3500 };
const input = JSON.parse(core.buildPointObjectResponsesRequest(pack, req, profile).input[1].content[0].text);
const policy = input.selectionPolicy;
const plan = {
  decision: { path: "existing_asset_screen", disposition: "continue_screening", confidence: "medium", reasonCodes: ["object_identity_available", "use_classification_available"] },
  signalCodes: ["object_identity", "use_classification", "building_form"],
  opportunityCodes: ["existing_asset_repositioning"],
  risks: [{ code: "non_official_source", severity: "high", confidence: "low" }],
  depthPlan: {
    criteriaSignalCodes: policy.eligibleDepthCriteriaCodes.slice(0, 2),
    alternativePaths: [],
    counterEvidenceRiskCodes: policy.eligibleDepthCounterEvidenceCodes.slice(0, 1),
    decisionTriggerCodes: policy.eligibleDepthDecisionTriggerCodes.slice(0, 1)
  },
  answerCode: "identity_rights_planning_first",
  focusedAnswer: { status: "partial", scope: "mapped_form", perspective: "developer", horizon: "current",
    statement: "The selected building has 987654321 levels.", evidenceRefs: ["EVD-ALLOWED-FIELDS"], confidence: "low",
    missingEvidenceCodes: ["official_identity", "parcel_boundary", "title_rights", "planning_controls", "physical_baseline", "current_market", "cost_financials"], unsupportedReasonCode: null },
  caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
};
assert.equal(core.validatePointObjectAiContentDetailed(plan, pack, req).detail, "focused_answer_novel_number");
const unfocused = { ...req, question: null };
const wrongCriteria = { ...plan, answerCode: null, focusedAnswer: null,
  depthPlan: { ...plan.depthPlan, criteriaSignalCodes: policy.eligibleDepthCriteriaCodes.slice(1, 3) } };
assert.equal(core.validatePointObjectAiContentDetailed(wrongCriteria, pack, unfocused).detail, "depth_review_selection");
assert.equal(core.recoverPointObjectAiQuickCriteriaDetailed(wrongCriteria, pack, unfocused).ok, true);
const missingTrigger = { ...wrongCriteria, depthPlan: { ...wrongCriteria.depthPlan, decisionTriggerCodes: [] } };
assert.equal(core.recoverPointObjectAiQuickCriteriaDetailed(missingTrigger, pack, unfocused).ok, false);
assert.equal(core.recoverPointObjectAiQuickCriteriaDetailed(wrongCriteria, pack, { ...unfocused, depth: "standard" }).ok, false);
assert.equal(core.recoverPointObjectAiQuickCriteriaDetailed({ ...wrongCriteria, caveat: "wrong" }, pack, unfocused).ok, false);
assert.equal(core.recoverPointObjectAiQuickCriteriaDetailed(plan, pack, req).detail, "focused_answer_novel_number");

const usage = { input_tokens: 100, input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 }, output_tokens: 20, total_tokens: 120 };
const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY;
const originalWarn = console.warn;
let calls = 0;
type Reply = { status?: string; output_text?: string; usage?: unknown; failFetch?: boolean; httpStatus?: number };
function mock(replies: Reply[]) {
  calls = 0;
  globalThis.fetch = (async () => {
    const reply = replies[calls++];
    assert.ok(reply, "Unexpected extra provider attempt");
    if (reply.failFetch) throw new Error("private provider transport detail");
    return new Response(JSON.stringify(reply), { status: reply.httpStatus ?? 200, headers: { "x-request-id": `offline-${calls}` } });
  }) as typeof fetch;
}
const invalid = { status: "completed", output_text: "{}", usage };
async function rejected(replies: Reply[]) {
  mock(replies);
  try { await service.generatePointObjectAiAnalysis(pack, req); assert.fail("Expected failure"); }
  catch (error) { assert.ok(error instanceof service.PointObjectAiServiceError); return error as any; }
}
try {
  process.env.OPENAI_API_KEY = "offline-placeholder-not-a-credential";
  console.warn = () => {};
  mock([{ status: "completed", output_text: JSON.stringify(plan), usage }]);
  const recovered = await service.generatePointObjectAiAnalysis(pack, req);
  assert.equal(calls, 1, "Canonical replacement must not require another paid attempt");
  assert.equal(recovered.content.answerToQuestion.status, "partial");
  assert.doesNotMatch(JSON.stringify(recovered.content), /987654321/);
  assert.equal(recovered.content.depthReview.depth, "quick");
  mock([{ status: "completed", output_text: JSON.stringify({ ...plan, depthPlan: wrongCriteria.depthPlan }), usage }]);
  assert.equal((await service.generatePointObjectAiAnalysis(pack, req)).content.answerToQuestion.status, "partial");
  assert.equal(calls, 1, "Combined invalid prose and Quick criteria still require full revalidation, not another attempt");
  mock([{ status: "completed", output_text: JSON.stringify(wrongCriteria), usage }]);
  assert.equal((await service.generatePointObjectAiAnalysis(pack, unfocused)).content.depthReview.depth, "quick");
  assert.equal(calls, 1);

  const failure = await rejected([invalid, invalid]);
  assert.equal(failure.httpStatus, 502);
  assert.equal(failure.telemetry.attempts, 2);
  assert.equal(failure.telemetry.attemptTrace.length, 2);
  assert.equal(failure.telemetry.totalTokens, 240);
  assert.equal(failure.telemetry.estimatedCostUsd, 0.00088);
  assert.doesNotMatch(JSON.stringify(failure), /offline-placeholder|private provider|output_text/);
  assert.equal((await rejected([invalid, { failFetch: true }])).telemetry, undefined);
  assert.equal((await rejected([invalid, { ...invalid, usage: undefined }])).telemetry, undefined);
  assert.equal((await rejected([invalid, { ...invalid, usage: { ...usage, input_tokens_details: {} } }])).telemetry, undefined);
  assert.equal((await rejected([invalid, { ...invalid, usage: { ...usage, total_tokens: 999 } }])).telemetry, undefined);
  const measuredZero = { ...invalid, usage: { input_tokens: 0, input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 }, output_tokens: 0, total_tokens: 0 } };
  assert.equal((await rejected([measuredZero, measuredZero])).telemetry.estimatedCostUsd, 0, "Measured zero is distinct from unknown usage");
  assert.equal((await rejected([{ ...invalid, status: "incomplete" }])).telemetry.attempts, 1);
  assert.equal((await rejected([{ httpStatus: 429 }])).httpStatus, 429);
  const route = readFileSync(new URL("../app/api/prototype/point-to-object/ai/route.ts", import.meta.url), "utf8");
  const errorBranch = route.split("if (error instanceof PointObjectAiServiceError) {")[1].split("\n    }\n    return NextResponse")[0];
  const routeFailure = new Function("error", "NextResponse", "clearChallengeHeader", "request", errorBranch);
  const response = routeFailure(failure, { json: (body: unknown, init: unknown) => ({ body, init }) }, () => ({}), {});
  assert.equal(response.init.status, 502);
  assert.equal(response.body.retryable, true);
  assert.equal(response.body.telemetry.estimatedCostUsd, 0.00088);
  const unknown = routeFailure(await rejected([{ httpStatus: 429 }]), { json: (body: unknown, init: unknown) => ({ body, init }) }, () => ({}), {});
  assert.equal(unknown.init.status, 429);
  assert.equal(unknown.body.retryable, true);
  assert.equal(Object.hasOwn(unknown.body, "telemetry"), false);
} finally {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
  delete fixtureGlobal.__failureCore;
}
console.log("quality20-ai-failure-check: PASS (offline recovery, complete-only failure usage, unknown-cost fail-closed)");
