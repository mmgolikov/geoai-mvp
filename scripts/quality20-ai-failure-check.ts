import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
// @ts-expect-error -- Node strip-types runner requires the explicit extension.
import { core, evidencePack } from "./point-to-object-semantic-v6-check.ts";
// @ts-expect-error -- Node strip-types runner requires the explicit extension.
import * as answerProvenance from "../src/lib/prototype/point-to-object-answer-provenance.ts";

const fixtureGlobal = globalThis as typeof globalThis & { __failureCore?: unknown; __failureProvenance?: unknown };
fixtureGlobal.__failureCore = core;
fixtureGlobal.__failureProvenance = answerProvenance;
const comparisonCoreUrl = new URL("../src/lib/prototype/point-to-object-comparison-core.ts", import.meta.url);
const contractsUrl = new URL("../src/lib/point-to-object/contracts.ts", import.meta.url);
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL === comparisonCoreUrl.href && specifier === "./point-to-object-normalized-context") return next(new URL("./point-to-object-normalized-context.ts", comparisonCoreUrl).href, context);
  if (context.parentURL === comparisonCoreUrl.href && specifier === "../point-to-object/contracts") return next(contractsUrl.href, context);
  return next(specifier, context);
} });
const serviceSource = readFileSync(new URL("../src/lib/prototype/point-to-object-ai.ts", import.meta.url), "utf8");
function loadableService(input: string): string {
  let transformed = input;
  function one(pattern: RegExp, replacement: (match: string, names: string) => string) {
    assert.equal([...transformed.matchAll(pattern)].length, 1, `Missing/duplicate service import: ${pattern.source}`);
    transformed = transformed.replace(pattern, replacement);
  }
  one(/^import "server-only";/gm, () => "");
  one(/^import \{ getPointObjectUpstreamStatus \} from "@\/src\/lib\/ai\/openai-upstream-gate";/gm, () => "const getPointObjectUpstreamStatus = () => ({ enabled: true });");
  one(/^import \{([^{}]*?)\} from "\.\/point-to-object-ai-core";/gm, (_match, names) => `const { ${names.replace(/\s*type \w+,?/g, "")} } = globalThis.__failureCore;`);
  one(/^import \{([^{}]*?)\} from "\.\/point-to-object-answer-provenance";/gm, (_match, names) => `const { ${names.replace(/\s*type \w+,?/g, "")} } = globalThis.__failureProvenance;`);
  one(/^import \{ pointObjectAnalysisRoleScenarioOrUnspecified \} from "\.\/point-to-object-ai-provenance";/gm, () => 'const pointObjectAnalysisRoleScenarioOrUnspecified = () => ({ role: "unspecified", scenario: "unspecified" });');
  one(/^import \{([^{}]*?)\} from "\.\/point-to-object-comparison-core";/gm, (_match, names) => `import {${names}} from ${JSON.stringify(comparisonCoreUrl.href)};`);
  one(/^import \{ LIVE_POINT_CAVEAT \} from "\.\.\/point-to-object\/contracts";/gm, () => `import { LIVE_POINT_CAVEAT } from ${JSON.stringify(contractsUrl.href)};`);
  const javascript = stripTypeScriptTypes(transformed, { mode: "transform", sourceMap: false });
  const permitted = new Set([comparisonCoreUrl.href, contractsUrl.href]);
  for (const match of javascript.matchAll(/\b(?:from|import)\s*(?:\(\s*)?["']([^"']+)["']/g)) assert.ok(permitted.has(match[1]), `Unresolved/unapproved service import: ${match[1]}`);
  assert.doesNotMatch(javascript,/\bimport\s*\(/,"Unresolved/unapproved service import: dynamic imports are not supported");
  assert.match(javascript, /const getPointObjectUpstreamStatus =/);
  return javascript;
}
const reorderImports = /^import \{[^{}]*?\} from "(?:\.\/point-to-object-answer-provenance|\.\/point-to-object-comparison-core|\.\.\/point-to-object\/contracts)";/gm;
const declarations = [...serviceSource.matchAll(reorderImports)].map(match => match[0]);
assert.equal(declarations.length, 3);
for (const declaration of declarations) {
  const coreDeclaration = serviceSource.match(/^import \{[^{}]*?\} from "\.\/point-to-object-ai-core";/m)![0];
  for (const move of [declaration + "\n" + serviceSource.replace(declaration, ""), serviceSource.replace(declaration, "").replace(coreDeclaration,coreDeclaration+"\n"+declaration), serviceSource.replace(declaration, "") + "\n" + declaration]) loadableService(move);
  assert.throws(() => loadableService(serviceSource.replace(declaration, "")), /Missing\/duplicate/);
  assert.throws(() => loadableService(serviceSource + "\n" + declaration), /Missing\/duplicate/);
}
for (const extra of ['import { absent } from "./unknown-runtime";', 'await import("@/unknown-runtime");']) assert.throws(() => loadableService(serviceSource + "\n" + extra), /Unresolved\/unapproved/);
for(const pattern of [/^import "server-only";/m,/^import \{ getPointObjectUpstreamStatus \} from "@\/src\/lib\/ai\/openai-upstream-gate";/m,/^import \{[^{}]*?\} from "\.\/point-to-object-ai-core";/m,/^import \{ pointObjectAnalysisRoleScenarioOrUnspecified \} from "\.\/point-to-object-ai-provenance";/m]){const declaration=serviceSource.match(pattern)![0];assert.throws(()=>loadableService(serviceSource.replace(declaration,"")),/Missing\/duplicate/);assert.throws(()=>loadableService(serviceSource+"\n"+declaration),/Missing\/duplicate/);}
const service = await import(`data:text/javascript;base64,${Buffer.from(loadableService(serviceSource)).toString("base64")}`);
const { LIVE_POINT_CAVEAT } = await import(contractsUrl.href);
assert.equal(LIVE_POINT_CAVEAT, "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.");

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
type Reply = { status?: string; output_text?: string; output?: unknown; incomplete_details?: unknown; usage?: unknown; failFetch?: boolean; httpStatus?: number };
let comparisonFailureCases = 0;
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
  assert.deepEqual(recovered.answerProvenance, { kind: "deterministic_recovery", rejectionCode: "focused_answer_novel_number" });
  assert.equal(answerProvenance.isPointObjectFocusedRecoveryCode("arbitrary_rejected_text"), false);
  mock([{ status: "completed", output_text: JSON.stringify({ ...plan, depthPlan: wrongCriteria.depthPlan }), usage }]);
  assert.equal((await service.generatePointObjectAiAnalysis(pack, req)).content.answerToQuestion.status, "partial");
  assert.equal(calls, 1, "Combined invalid prose and Quick criteria still require full revalidation, not another attempt");
  mock([{ status: "completed", output_text: JSON.stringify(wrongCriteria), usage }]);
  const recoveredInitial = await service.generatePointObjectAiAnalysis(pack, unfocused);
  assert.equal(recoveredInitial.content.depthReview.depth, "quick");
  assert.equal(Object.hasOwn(recoveredInitial, "answerProvenance"), false);
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

  // Real Compare service, offline synthetic snapshots. Diagnose rejection;
  // never repair output, retry the provider, or turn missing usage into zero.
  const comparisonPacks = ["A", "B"].map((label, index) => ({ ...evidencePack(),
    resolution: { ...pack.resolution, coordinateAssociation: "trusted_open_map_identity" },
    selectedObject: { ...pack.selectedObject, sourceFeatureId: `way/${101 + index}`, name: `Synthetic source ${label}` },
    source: { fabricAcquiredAt: "2026-10-06T12:00:00.000Z", acquiredAt: "2026-10-06T12:00:00.000Z" },
    evidencePackHash: (index === 0 ? "a" : "b").repeat(64)
  }));
  const comparisonRequest = { ...unfocused, depth: "standard", role: "developer", scenario: "development_screening" };
  const both = comparisonPacks.map(p => `${p.selectedObject.sourceFeatureId}:identity`);
  const comparisonContent = { summary: { statement: "Both source records require official planning validation.", evidenceRefs: both },
    differences: [{ statement: "Mapped contexts have different source identities to verify.", evidenceRefs: both }, { statement: "Observed context does not establish a development permission.", evidenceRefs: both }],
    checks: comparisonPacks.map(p => ({ candidateId: p.selectedObject.sourceFeatureId, action: "Request the official planning and ownership evidence.", evidenceRefs: [`${p.selectedObject.sourceFeatureId}:identity`] })) };
  const completedComparison: Reply = { status: "completed", output_text: JSON.stringify(comparisonContent), usage };
  mock([completedComparison]);
  const comparisonResult = await service.generatePointObjectAiComparison(comparisonPacks, comparisonRequest);
  assert.equal(calls, 1);
  assert.deepEqual(comparisonResult.snapshots, comparisonPacks.map(p => ({ sourceFeatureId: p.selectedObject.sourceFeatureId, evidencePackHash: p.evidencePackHash, label: p.selectedObject.name })));
  assert.equal(comparisonResult.caveat, LIVE_POINT_CAVEAT);
  assert.equal(comparisonResult.telemetry.attempts, 1);
  const changedContent = (mutate: (content: typeof comparisonContent) => void): Reply => {
    const content = structuredClone(comparisonContent); mutate(content);
    return { ...completedComparison, output_text: JSON.stringify(content) };
  };
  const comparisonFailures: Array<[Reply, string, number]> = [
    [{ ...completedComparison, status: "incomplete", incomplete_details: { reason: "max_output_tokens", private: "never expose" } }, "COMPARISON_OUTPUT_TOKEN_LIMIT", 502],
    [{ ...completedComparison, status: "incomplete", incomplete_details: { reason: "private unknown reason" } }, "COMPARISON_OUTPUT_INCOMPLETE", 502],
    [{ status: "completed", output: [{ content: [{ type: "refusal", refusal: "private provider prose" }] }] }, "COMPARISON_OUTPUT_REFUSED", 422],
    [{ ...completedComparison, status: "failed" }, "COMPARISON_COMPLETION_INVALID", 502],
    [{ ...completedComparison, output_text: "private malformed JSON" }, "COMPARISON_OUTPUT_UNREADABLE", 502],
    [{ ...completedComparison, output_text: "{}" }, "COMPARISON_OUTPUT_SHAPE_INVALID", 502],
    [changedContent(c => { c.summary.evidenceRefs = [both[0], both[0]]; }), "COMPARISON_OUTPUT_REFERENCE_INVALID", 502],
    [changedContent(c => { c.summary.evidenceRefs = [both[0], "way/102:unavailable_metric"]; }), "COMPARISON_OUTPUT_UNKNOWN_REF", 502],
    [changedContent(c => { c.summary.statement = "Guaranteed best site with private provider prose."; }), "COMPARISON_OUTPUT_FORBIDDEN_CLAIM", 502],
    [changedContent(c => { c.checks[0].evidenceRefs = [both[1]]; }), "COMPARISON_OUTPUT_SOURCE_BINDING", 502],
    [{ httpStatus: 429 }, "AI_PROVIDER_REJECTED", 429]
  ];
  for (const [reply, code, httpStatus] of comparisonFailures) {
    mock([reply]);
    await assert.rejects(() => service.generatePointObjectAiComparison(comparisonPacks, comparisonRequest), (error: unknown) => {
      assert.ok(error instanceof service.PointObjectAiServiceError);
      const failure = error as Error & { code: string; httpStatus: number; telemetry?: unknown };
      assert.equal(failure.code, code); assert.equal(failure.httpStatus, httpStatus);
      assert.equal(failure.telemetry, undefined, "No fabricated usage/cost receipt on rejected Compare output");
      const routed = routeFailure(failure, { json: (body: unknown, init: unknown) => ({ body, init }) }, () => ({}), {});
      assert.equal(routed.body.code, code); assert.equal(routed.init.status, httpStatus);
      assert.doesNotMatch(JSON.stringify(routed.body), /private|offline-placeholder|output_text|incomplete_details|authorization|usage|tokens|cost/);
      return true;
    });
    assert.equal(calls, 1, "Rejected comparison must not trigger a provider repair or retry");
    comparisonFailureCases++;
  }
} finally {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
  delete fixtureGlobal.__failureCore;
  delete fixtureGlobal.__failureProvenance;
}
console.log(`quality20-ai-failure-check: PASS (9 import-order cases, 16 rejected import mutations, ${comparisonFailureCases} Compare rejection cases; offline recovery, complete-only failure usage, unknown-cost fail-closed; real network/provider calls 0)`);
