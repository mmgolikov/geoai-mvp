// Pure contract checks only; no browser, Worker, network or provider execution.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return nextResolve(`${specifier}.ts`, context); } catch { /* canonical error below */ }
  }
  return nextResolve(specifier, context);
} });

const { POINT_OBJECT_CREATE_CONTROL_KEYS } = await import("../src/lib/prototype/point-to-object-create-ai-core");
const { pointObjectCreateFastPreflight, preflightPointObjectCreate } = await import("../src/lib/prototype/point-to-object-create-orchestration");
const fixed = [...POINT_OBJECT_CREATE_CONTROL_KEYS];
const base = {
  aoiCoordinates: [[[55.263, 25.205], [55.265, 25.205], [55.265, 25.207], [55.263, 25.207], [55.263, 25.205]]] as [number, number][][],
  aoiHash: "review02-synthetic-admission-only",
  locale: "en" as const,
  templateId: "residential_quarter" as const,
  controls: { blockCount: 4, levelsMin: 4, levelsMax: 8, targetSiteCoveragePct: 24, openSpacePct: 40, setbackM: 6 }
};
const numericAuto = { kind: "not_applicable", requestedMassingStyle: null, reason: "numeric_programme_not_fully_fixed" };
for (const customPrompt of [null, "", " \t\n ", "\u200b\u2060"]) {
  const input = { customPrompt, lockedControlKeys: [] };
  assert.deepEqual(pointObjectCreateFastPreflight(input), numericAuto);
  assert.deepEqual(preflightPointObjectCreate({ ...base, ...input }), numericAuto);
  assert.equal(pointObjectCreateFastPreflight({ customPrompt, lockedControlKeys: fixed }), null,
    "Normalized blank prompts with all controls fixed must retain the Worker/solver path.");
}
for (const missing of fixed) {
  const input = { customPrompt: null, lockedControlKeys: fixed.filter((key) => key !== missing) };
  assert.deepEqual(pointObjectCreateFastPreflight(input), numericAuto, `${missing}: Auto admission`);
  assert.deepEqual(preflightPointObjectCreate({ ...base, ...input }), numericAuto, `${missing}: server parity`);
}
for (const [customPrompt, requestedMassingStyle] of [["courtyard", "courtyard"], ["кампус", "campus"], ["More shade", null]] as const) {
  const expected = { kind: "not_applicable", requestedMassingStyle, reason: "custom_programme_requires_resolution" };
  for (const lockedControlKeys of [[], fixed]) {
    const input = { customPrompt, lockedControlKeys };
    assert.deepEqual(pointObjectCreateFastPreflight(input), expected);
    assert.deepEqual(preflightPointObjectCreate({ ...base, ...input }), expected);
  }
}
const fixedInput = { ...base, customPrompt: null, lockedControlKeys: [...fixed].reverse() };
assert.equal(pointObjectCreateFastPreflight(fixedInput), null);
assert.equal(pointObjectCreateFastPreflight({ ...fixedInput, lockedControlKeys: [...fixed, ...fixed] }), null);
// Retain the existing positive fixed-programme fixture, not merely "not Auto".
const solved = preflightPointObjectCreate({
  ...fixedInput,
  aoiCoordinates: [[[37.62, 55.75], [37.621596, 55.75], [37.621596, 55.750905], [37.62, 55.750905], [37.62, 55.75]]],
  aoiHash: "cycle03:square100:towers",
  templateId: "commercial_hub",
  controls: { blockCount: 10, levelsMin: 10, levelsMax: 53, targetSiteCoveragePct: 42, openSpacePct: 32, setbackM: 10 }
});
assert.equal(solved.kind, "ready", "The existing feasible fixed programme must still run the solver.");

const panel = readFileSync(new URL("../components/point-to-object/create-panel.tsx", import.meta.url), "utf8");
const start = panel.indexOf("if (parameterError) {");
const end = panel.indexOf("}, [draftKey, aoi.coordinates", start);
assert.ok(start >= 0 && end > start, "Local preflight effect must be addressable.");
const effect = panel.slice(start, end);
assert.match(effect, /code: "program_invalid"[\s\S]*pointObjectCreateFastPreflight\([\s\S]*if \(admission\) \{\s*setLocalPreflight\(\{ \.\.\.admission, key: draftKey \}\);\s*return;\s*\}[\s\S]*kind: "checking"[\s\S]*new Worker/,
  "Invalid controls remain blocked; Auto/custom admission must return before checking or Worker creation.");
assert.match(effect, /let disposed = false;\s*const isCurrent = \(\) => !disposed && currentDraftKeyRef\.current === draftKey;/);
assert.match(effect, /const timer = window\.setTimeout\(\(\) => \{\s*if \(!isCurrent\(\)\) return;/);
assert.match(effect, /worker\.onmessage = \(event\) => \{\s*window\.clearTimeout\(deadline\);\s*if \(!isCurrent\(\)\) \{ worker\?\.terminate\(\); return; \}/);
assert.match(effect, /worker\.onerror = \(\) => \{\s*if \(!isCurrent\(\)\) return;/);
assert.match(effect, /deadline = window\.setTimeout\(\(\) => \{\s*if \(!isCurrent\(\)\) return;/);
assert.match(effect, /catch \{\s*if \(isCurrent\(\)\) setLocalPreflight\(/);
assert.match(effect, /return \(\) => \{\s*disposed = true;\s*window\.clearTimeout\(timer\);\s*window\.clearTimeout\(deadline\);\s*if \(worker\) \{\s*worker\.onmessage = null;\s*worker\.onerror = null;\s*worker\.terminate\(\);/);
assert.match(effect, /\}, 250\);/);
assert.match(effect, /\}, 15_000\);/);
assert.doesNotMatch(effect, /preventDefault\(|console\.|fetch\(/, "Admission/cancellation must not suppress errors or add acquisition.");
console.log("REVIEW02 Create fast-admission parity and cancellation source guards passed; pure contracts only.");
