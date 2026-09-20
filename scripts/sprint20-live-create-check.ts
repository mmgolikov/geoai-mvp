import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
registerHooks({ resolve(s, c, next) {
  if (s.startsWith(".") && !/\.[cm]?[jt]s$/.test(s)) { try { return next(`${s}.ts`, c); } catch { /* normal resolution */ } }
  return next(s, c);
} });
const { DUBAI_CREATE_GOLDEN: fixture, DUBAI_CREATE_GOLDEN_AOI: aoi, assertDubaiCreateRequest, assertDubaiCreateGeometry } =
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
console.log(JSON.stringify({ result: "PASS offline only", areaSqM: aoi.areaSqM, coordinates: fixture.coordinates,
  controls: fixture.controls, variants: preflight.alternatives.map(a => a.id), providerCalls: 0 }));
