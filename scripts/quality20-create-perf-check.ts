import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return nextResolve(`${specifier}.ts`, context); } catch { /* Canonical error below. */ }
  }
  return nextResolve(specifier, context);
} });
const { conceptTemplate, validateRedevelopmentProgram, generateConceptMassingAlternatives } = await import("../src/lib/prototype/point-to-object-create");

const checked = validateRedevelopmentProgram({
  ...conceptTemplate("commercial_hub", "en"),
  title: "Synthetic ten-tower control", summary: "Synthetic deterministic adversarial geometry fixture.",
  blockCount: 10, levelsMin: 10, levelsMax: 53, targetSiteCoveragePct: 42, openSpacePct: 32, setbackM: 10,
  useMix: [{ use: "office", sharePct: 58 }, { use: "residential", sharePct: 24 }, { use: "retail", sharePct: 10 }, { use: "open_space", sharePct: 8 }],
  rationale: ["Exercises adaptive and split podium placement with fixed controls."]
});
assert.ok(checked.ok);
const ring: [number, number][] = Array.from({ length: 24 }, (_, index) => {
  const angle = index * Math.PI * 2 / 24;
  const radius = index % 2 === 0 ? 180 : 115;
  return [37.62 + Math.cos(angle) * radius / (111_320 * Math.cos(55.75 * Math.PI / 180)),
    55.75 + Math.sin(angle) * radius / 110_540];
});
ring.push(ring[0]);
for (let attempt = 0; attempt < 3; attempt += 1) {
  const started = performance.now();
  const result = generateConceptMassingAlternatives([ring], checked.value, "cycle03:twenty-four-vertex-concave");
  const elapsedMs = Number((performance.now() - started).toFixed(1));
  const sha256 = createHash("sha256").update(JSON.stringify(result)).digest("hex");
  console.log(JSON.stringify({ attempt, elapsedMs, sha256 }));
  // Frozen from unmodified 1e1ff1f on Node 24; includes both alternatives and all metrics.
  assert.equal(sha256, "4146b81d324d8fdef9ea706706eaec2ae18854b884e7241f3aa0bbcfc06d22eb");
  assert.ok(elapsedMs < 2_500, "Both alternatives must retain the existing 2500 ms budget.");
}
