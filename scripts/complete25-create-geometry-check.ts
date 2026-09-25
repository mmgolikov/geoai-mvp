import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
    try { return next(`${specifier}.ts`, context); } catch { /* normal resolver reports unavailable source */ }
  }
  return next(specifier, context);
} });
const oracle = await import("../tests/e2e/helpers/quality20-create-geometry");
const { quality20CreateControls, QUALITY20_CASES, QUALITY20_AMENDMENT, quality20Hash } = await import("../tests/e2e/helpers/quality20-frozen-case");
type XY = [number, number];
type Massing = Parameters<typeof oracle.assertIndependentQuality20CreateMassing>[2];
const ring = (points: XY[]) => [...points, points[0]];
const rectangle = (x: number, y: number, width: number, height = width): XY[] => [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
const union = oracle.quality20IndependentUnionArea;
assert.equal(union([rectangle(0, 0, 10)]), 100);
assert.equal(union([rectangle(0, 0, 10), rectangle(5, 0, 10)]), 150);
assert.equal(union([rectangle(0, 0, 10), rectangle(0, 0, 10)]), 100);
assert.equal(union([rectangle(0, 0, 10), rectangle(2, 2, 3)]), 100);
assert.equal(union([[[0, 0], [10, 0], [0, 10]], [[0, 0], [10, 0], [10, 10]]]), 75);
const concave: XY[] = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
assert.equal(union([concave]), 64);
assert.equal(union([concave, rectangle(4, 4, 6)]), 100);
assert.equal(union([concave.toReversed(), rectangle(4, 4, 6).toReversed()]), 100);

// Hand-built metric fixtures: no producer generator/validator supplies the
// expected geometry, ground area, coverage, levels or floor-area metrics here.
function fixture(programme = "commercial_hub", latitude = 25.2, stacked = false) {
  const controls = quality20CreateControls(programme);
  const toGeo = ([x, y]: XY): XY => [55.2 + x / (111320 * Math.cos(latitude * Math.PI / 180)), latitude + y / 110540];
  const coordinates = [ring(rectangle(-250, -250, 500)).map(toGeo)];
  const size = Math.sqrt(250000 * controls.targetSiteCoveragePct / 100 / controls.blockCount);
  const columns = Math.ceil(controls.blockCount / 2);
  const centers = Array.from({ length: controls.blockCount }, (_, index): XY =>
    [-150 + (index % columns) * 300 / (columns - 1), index < columns ? -150 : 150]);
  const levels = centers.map((_, index) => Math.round(controls.levelsMin + index * (controls.levelsMax - controls.levelsMin) / (centers.length - 1)));
  const features: Massing["featureCollection"]["features"] = [];
  let floorArea = 0;
  for (const [index, [x, y]] of centers.entries()) {
    const roles = stacked ? ["podium", "tower"] as const : ["campus_block"] as const;
    for (const role of roles) {
      const side = role === "tower" ? size / 2 : size;
      const heightLevels = role === "podium" ? 2 : levels[index];
      const baseLevels = role === "tower" ? 2 : 0;
      floorArea += side * side * (heightLevels - baseLevels);
      features.push({ type: "Feature", id: `${role}-${index}`, geometry: { type: "Polygon", coordinates: [ring(rectangle(x - side / 2, y - side / 2, side)).map(toGeo)] },
        properties: { id: `${role}-${index}`, kind: "concept_massing", templateId: "commercial_hub", massingStyle: stacked ? "towers_on_podium" : "campus",
          variantId: "A", volumeRole: role, primaryBlock: role !== "podium", use: "office", levels: heightLevels,
          heightM: Number((heightLevels * 3.4).toFixed(1)), baseM: Number((baseLevels * 3.4).toFixed(1)),
          supportingPodiumId: role === "tower" ? `podium-${index}` : null, label: "OFFLINE analytic fixture" } });
    }
  }
  const massing: Massing = { featureCollection: { type: "FeatureCollection", features }, variantId: "A", massingStyle: stacked ? "towers_on_podium" : "campus",
    requestedBlockCount: controls.blockCount, generatedBlockCount: controls.blockCount, generatedFeatureCount: features.length,
    aoiAreaSqM: 250000, generatedFootprintAreaSqM: 250000 * controls.targetSiteCoveragePct / 100,
    achievedSiteCoveragePct: controls.targetSiteCoveragePct, estimatedFloorAreaSqM: Number(floorArea.toFixed(1)),
    minGeneratedLevels: controls.levelsMin, maxGeneratedLevels: controls.levelsMax, seed: "OFFLINE independent analytic fixture" };
  return { coordinates, controls, massing, toGeo };
}
const check = (sample: ReturnType<typeof fixture>) => oracle.assertIndependentQuality20CreateMassing(sample.coordinates, sample.controls, sample.massing);
for (const programme of ["residential_mixed_use", "commercial_hub", "civic_green", "residential_quarter", "hospitality_recreation"]) {
  const sample = fixture(programme);
  const metrics = check(sample);
  assert.ok(Math.abs(metrics.siteAreaSqM - 250000) < 0.001);
  assert.ok(Math.abs(metrics.coveragePct - sample.controls.targetSiteCoveragePct) < 0.001);
}
check(fixture("commercial_hub", 75));
check(fixture("commercial_hub", -45));
check(fixture("commercial_hub", 25.2, true));
function reject(mutate: (sample: ReturnType<typeof fixture>) => void, pattern: RegExp, stacked = false) {
  const sample = fixture("commercial_hub", 25.2, stacked); mutate(sample); assert.throws(() => check(sample), pattern);
}
reject(s => { s.coordinates.push(s.coordinates[0]); }, /holes/);
reject(s => { s.coordinates[0] = ring([[-250, -250], [250, -250], [250, 0], [0, 0], [0, 250], [-250, 250]]).map(s.toGeo); }, /outside|concave/);
reject(s => { s.massing.featureCollection.features[0].geometry.coordinates.push(s.coordinates[0]); }, /holes/);
reject(s => { s.massing.featureCollection.features[0].geometry.coordinates[0].pop(); }, /close/);
reject(s => { s.massing.featureCollection.features[0].geometry.coordinates[0][1][0] = Number.NaN; }, /coordinates/);
reject(s => { s.massing.featureCollection.features[0].geometry.coordinates[0] = ring(rectangle(0, 0, 200)); }, /coordinates|outside/);
reject(s => { s.massing.featureCollection.features[0].geometry.coordinates[0] = ring([[-100, -100], [100, 100], [100, -100], [-100, 100]]).map(s.toGeo); }, /degenerate|self-intersection/);
reject(s => { s.massing.featureCollection.features[1].geometry = structuredClone(s.massing.featureCollection.features[0].geometry); }, /overlap/);
reject(s => { const feature = s.massing.featureCollection.features[0]; feature.geometry.coordinates[0] = feature.geometry.coordinates[0].map(([x, y]) => [x - 20 / (111320 * Math.cos(25.2 * Math.PI / 180)), y]); }, /outside|setback/);
reject(s => { s.massing.aoiAreaSqM = 0.00001; }, /AOI area/);
reject(s => { s.massing.generatedFootprintAreaSqM += 10; }, /footprint metric/);
reject(s => { s.massing.achievedSiteCoveragePct += 2; }, /coverage metric/);
reject(s => { s.massing.estimatedFloorAreaSqM += 10; }, /floor-area metric/);
reject(s => { s.massing.generatedBlockCount++; }, /block-count/);
reject(s => { s.massing.generatedFeatureCount++; }, /feature-count/);
reject(s => { s.massing.minGeneratedLevels++; }, /minimum levels/);
reject(s => { const p = s.massing.featureCollection.features[0].properties; p.levels = 13; p.heightM = 44.2; }, /level bounds/);
reject(s => { s.massing.featureCollection.features[0].properties.heightM *= 3.28084; }, /height units/);
reject(s => { s.massing.featureCollection.features.find(f => f.properties.volumeRole === "tower")!.properties.supportingPodiumId = "podium-does-not-exist"; }, /lineage/, true);
reject(s => { s.massing.featureCollection.features.find(f => f.properties.volumeRole === "tower")!.properties.supportingPodiumId = "podium-1"; }, /outside supporting/, true);
reject(s => { s.massing.featureCollection.features.find(f => f.properties.volumeRole === "tower")!.properties.baseM += 1; }, /base does not meet/, true);
reject(s => { s.massing.featureCollection.features[0].properties.supportingPodiumId = "invented"; }, /invalid support/);
reject(s => {
  s.massing.featureCollection.features.forEach((feature, index) => {
    const dx = index % 2 === 0 ? 66 : -66, dy = index < 2 ? 66 : -66;
    feature.geometry.coordinates[0] = feature.geometry.coordinates[0].map(([x, y]) =>
      [x + dx / (111320 * Math.cos(25.2 * Math.PI / 180)), y + dy / 110540]);
  });
}, /distribution/);

// Complete response path: the oracle consumes the actual A/B response and
// returns that parsed result for UI/save/reopen comparison, never a regenerated
// expected shape. This fixture is manually built, including known metric totals.
const { conceptTemplate } = await import("../src/lib/prototype/point-to-object-create");
const { POINT_OBJECT_CREATE_RESULT_CAVEAT } = await import("../src/lib/prototype/point-to-object-create-result");
const complete = fixture();
const variantB = structuredClone(complete.massing);
variantB.variantId = "B";
for (const feature of variantB.featureCollection.features) {
  feature.properties.variantId = "B";
  feature.geometry.coordinates[0] = feature.geometry.coordinates[0].map(([x, y]) => [x + 1 / (111320 * Math.cos(25.2 * Math.PI / 180)), y]);
}
const payload = { mode: "openai_concept", generatedAt: "2026-09-25T10:00:00.000Z", promptVersion: "POINT_OBJECT_CREATE_OFFLINE",
  program: { ...conceptTemplate("commercial_hub", "en"), ...complete.controls, schemaVersion: 1, massingStyle: "campus" },
  massing: complete.massing, alternatives: [{ id: "A", label: "OFFLINE A", massing: complete.massing }, { id: "B", label: "OFFLINE B", massing: variantB }],
  telemetry: { model: "OFFLINE", reasoningEffort: "medium", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 },
  caveat: POINT_OBJECT_CREATE_RESULT_CAVEAT };
const binding = { query: "OFFLINE", locale: "en" as const, question: "OFFLINE", role: "developer", scenario: "unspecified", goal: "custom",
  subject: null, find: null, create: { aoiId: "OFFLINE-AOI", coordinates: complete.coordinates[0].slice(0, -1),
    geometryHash: quality20Hash(complete.coordinates[0].slice(0, -1)), contextHash: "b".repeat(64), prompt: "OFFLINE" } };
const selection: Parameters<typeof oracle.assertQuality20CreateGeometry>[0] = {
  definition: QUALITY20_CASES.find(c => c.id === "C-CH-01")!, binding, manifestSha256: "a".repeat(64),
  manifest: { schemaVersion: "geoai.quality20.frozen-cases.v1", amendment: QUALITY20_AMENDMENT, frozenAt: "2026-09-25T10:00:00.000Z",
    execution: { commit: "a".repeat(40), origin: "https://geoai-offline.vercel.app", deploymentId: "dpl_OFFLINE" },
    cases: QUALITY20_CASES.map(c => ({ id: c.id, binding: c.id === "C-CH-01" ? binding : null })) }
};
assert.deepEqual(oracle.assertQuality20CreateGeometry(selection, payload).massing, complete.massing);
assert.throws(() => oracle.assertQuality20CreateGeometry(selection, {}), /parseable/);
const identical = structuredClone(payload);
identical.alternatives[1].massing.featureCollection.features.forEach((feature, index) => {
  feature.geometry = structuredClone(identical.alternatives[0].massing.featureCollection.features[index].geometry);
});
assert.throws(() => oracle.assertQuality20CreateGeometry(selection, identical), /A\/B must differ/);
const wrongKpi = structuredClone(payload);
wrongKpi.alternatives[1].massing.estimatedFloorAreaSqM += 100;
assert.throws(() => oracle.assertQuality20CreateGeometry(selection, wrongKpi), /floor-area metric/);
const wrongTopLevel = structuredClone(payload);
wrongTopLevel.massing = structuredClone(wrongTopLevel.massing);
wrongTopLevel.massing.estimatedFloorAreaSqM += 100;
assert.throws(() => oracle.assertQuality20CreateGeometry(selection, wrongTopLevel), /Top-level/);
console.log("PASS independent Create oracle: analytic union/intersection and all5 numeric programmes; both hemispheres/high latitude; geometry/holes/overlap/units/podium lineage/setback/count/level/KPI mutations rejected. Offline only.");
