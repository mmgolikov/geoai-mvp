import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
registerHooks({ resolve(s, c, next) {
  if (s.startsWith(".") && !/\.[cm]?[jt]s$/.test(s)) { try { return next(`${s}.ts`, c); } catch { /* normal resolution */ } }
  return next(s, c);
} });
const {
  DUBAI_CREATE_GOLDEN: fixture,
  DUBAI_CREATE_GOLDEN_AOI: aoi,
  DUBAI_CREATE_PROGRAMME_SCOPES: programmeScopes,
  assertDubaiCreateRequest,
  assertDubaiCreateGeometry,
  assertDubaiCreateProgrammeGeometry,
  assertDubaiCreateProgrammeRequest,
  dubaiCreateProgrammeCase
} =
  await import("../tests/e2e/helpers/sprint20-live-create");
const { preflightPointObjectCreate } = await import("../src/lib/prototype/point-to-object-create-orchestration");
const { POINT_OBJECT_CREATE_RESULT_CAVEAT } = await import("../src/lib/prototype/point-to-object-create-result");
const { POINT_OBJECT_CREATE_PROMPT_VERSION } = await import("../src/lib/prototype/point-to-object-create-ai-core");
const { sprint10PaidPostDecision } = await import("../tests/e2e/helpers/sprint10-live-journey-gate");
assert.deepEqual(sprint10PaidPostDecision("dubai-create", "create", 1), { ok: true });
assert.deepEqual(sprint10PaidPostDecision("dubai-create", "create", 2), { ok: false, reason: "occurrence_exceeded" });
assert.deepEqual(sprint10PaidPostDecision("dubai-create", "ai", 1), { ok: false, reason: "route_disallowed" });
const body = { marketKey: "dubai", locale: "en" as const, depth: "standard", templateId: fixture.templateId,
  customPrompt: null, controls: fixture.controls, lockedControlKeys: Object.keys(fixture.controls), aoiCoordinates: fixture.coordinates };
assertDubaiCreateRequest(body);
for (const change of [
  { controls: { ...body.controls, targetSiteCoveragePct: 15 } }, { controls: { ...body.controls, blockCount: 4 } },
  { lockedControlKeys: [] }, { customPrompt: "different programme" }, { depth: "deep" },
  { aoiCoordinates: [[[55.27,25.2],[55.28,25.2],[55.28,25.21],[55.27,25.2]]] }
]) assert.throws(() => assertDubaiCreateRequest({ ...body, ...change }));
const preflight = preflightPointObjectCreate({ ...body,
  lockedControlKeys: Object.keys(fixture.controls) as Array<keyof typeof fixture.controls>,
  aoiHash: createHash("sha256").update(JSON.stringify(fixture.coordinates)).digest("hex") });
assert.equal(preflight.kind, "ready", "Golden fixture must fit without a lower preset or provider call");
if (preflight.kind !== "ready") throw new Error("Invalid golden fixture");
const payload = { mode: "openai_concept", generatedAt: "2026-09-20T10:00:00Z", promptVersion: POINT_OBJECT_CREATE_PROMPT_VERSION,
  program: preflight.program, massing: preflight.alternatives[0].massing, alternatives: preflight.alternatives,
  telemetry: { model: "offline-fixture", reasoningEffort: "none", latencyMs: 0, attempts: 1, estimatedCostUsd: 0, stored: false, toolCalls: 0 },
  caveat: POINT_OBJECT_CREATE_RESULT_CAVEAT };
assertDubaiCreateGeometry(payload);
const envelope = { ...payload, areaContextUsed: { sourceResponseHash: "a".repeat(64), sampleSize: 3 } };
assert.deepEqual(assertDubaiCreateGeometry(envelope), payload,
  "Save parity compares the canonical concept, not the route-only areaContextUsed envelope field");
const reduced = structuredClone(payload); reduced.program.targetSiteCoveragePct = 15;
assert.throws(() => assertDubaiCreateGeometry(reduced), /targetSiteCoveragePct/);
const overlap = structuredClone(payload);
overlap.alternatives[0].massing.featureCollection.features[1].geometry = structuredClone(overlap.alternatives[0].massing.featureCollection.features[0].geometry);
assert.throws(() => assertDubaiCreateGeometry(overlap));
const outside = structuredClone(payload);
outside.alternatives[0].massing.featureCollection.features[0].geometry.coordinates[0] = outside.alternatives[0].massing.featureCollection.features[0].geometry.coordinates[0].map(([x,y]) => [x + .02,y]);
assert.throws(() => assertDubaiCreateGeometry(outside));
const duplicate = structuredClone(payload); duplicate.alternatives[1] = structuredClone(duplicate.alternatives[0]);
assert.throws(() => assertDubaiCreateGeometry(duplicate));
const wrongCoverage = structuredClone(payload); wrongCoverage.alternatives[1].massing.achievedSiteCoveragePct = 15;
assert.throws(() => assertDubaiCreateGeometry(wrongCoverage));
for (const scope of programmeScopes) {
  const scenario = dubaiCreateProgrammeCase(scope);
  const request = { marketKey: scenario.marketKey, locale: "en" as const, depth: "standard", templateId: scenario.programme,
    customPrompt: null, controls: scenario.controls, lockedControlKeys: Object.keys(scenario.controls), aoiCoordinates: scenario.coordinates };
  assertDubaiCreateProgrammeRequest(scope, request);
  const checked = preflightPointObjectCreate({ ...request,
    lockedControlKeys: Object.keys(scenario.controls) as Array<keyof typeof scenario.controls>,
    aoiHash: createHash("sha256").update(JSON.stringify(scenario.coordinates)).digest("hex") });
  assert.equal(checked.kind, "ready", `${scope} must fit before any provider call`);
  if (checked.kind !== "ready") throw new Error(`Invalid Create programme fixture: ${scope}`);
  const result = { ...payload, program: checked.program, massing: checked.alternatives[0].massing, alternatives: checked.alternatives };
  assertDubaiCreateProgrammeGeometry(scope, result);
  assert.throws(() => assertDubaiCreateProgrammeRequest(scope, { ...request, templateId: fixture.templateId === scenario.programme ? "commercial_hub" : fixture.templateId }));
  // Keep the requested programme/use mix intact while substituting coherent lower-coverage
  // geometry and metrics. This previously passed, including the civic-green 28% -> 15% case.
  const geometryAtCoverage = (targetSiteCoveragePct: number) => {
    const changed = preflightPointObjectCreate({ ...request,
      controls: { ...scenario.controls, targetSiteCoveragePct },
      lockedControlKeys: Object.keys(scenario.controls) as Array<keyof typeof scenario.controls>,
      aoiHash: createHash("sha256").update(JSON.stringify(scenario.coordinates)).digest("hex") });
    assert.equal(changed.kind, "ready", `${scope}: regression geometry must fit`);
    if (changed.kind !== "ready") throw new Error("Invalid regression fixture");
    return changed.alternatives;
  };
  const lower = geometryAtCoverage(15);
  const bothDrifted = { ...result, massing: lower[0].massing, alternatives: lower };
  assert.throws(() => assertDubaiCreateProgrammeGeometry(scope, bothDrifted), /Alternative A: independent coverage/);
  for (const index of [0, 1]) {
    const oneDrifted = structuredClone(result);
    oneDrifted.alternatives[index] = lower[index];
    oneDrifted.massing = oneDrifted.alternatives[0].massing;
    assert.throws(() => assertDubaiCreateProgrammeGeometry(scope, oneDrifted),
      new RegExp(`Alternative ${index === 0 ? "A" : "B"}: independent coverage`));
  }
  // Exercise both sides of the production tolerance without relaxing the requested controls.
  if (scope === "dubai-create-cg-concave") {
    for (const delta of [-1, 1, -1.2, 1.2]) {
      const alternatives = geometryAtCoverage(scenario.controls.targetSiteCoveragePct + delta);
      const boundary = { ...result, massing: alternatives[0].massing, alternatives };
      if (Math.abs(delta) <= 1) assertDubaiCreateProgrammeGeometry(scope, boundary);
      else assert.throws(() => assertDubaiCreateProgrammeGeometry(scope, boundary), /independent coverage/);
    }
  }
}
assert.equal(new Set(programmeScopes.map(scope => JSON.stringify(dubaiCreateProgrammeCase(scope).coordinates))).size, 2,
  "The six scopes must reuse exactly two distinct AOIs");
assert.equal(new Set(programmeScopes.map(scope => dubaiCreateProgrammeCase(scope).programme)).size, 3,
  "The six scopes must cover all three current programmes");
console.log(JSON.stringify({ result: "PASS offline only", areaSqM: aoi.areaSqM, coordinates: fixture.coordinates,
  controls: fixture.controls, variants: preflight.alternatives.map(a => a.id), programmeScopes,
  coverageRegressionCases: { coherentBothAlternativesRejected: 6, singleAlternativeDriftRejected: 12,
    toleranceBoundaryAccepted: 2, outsideToleranceRejected: 2 }, providerCalls: 0 }));
