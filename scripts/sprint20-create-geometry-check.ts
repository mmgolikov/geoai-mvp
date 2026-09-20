import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(s, c, next) { if (s.startsWith(".") && !/\.[cm]?[jt]s$/.test(s)) { try { return next(`${s}.ts`, c); } catch { } } return next(s, c); } });
const { conceptTemplate, validateRedevelopmentProgram, generateConceptMassingAlternatives, validateConceptMassingGeometry } = await import("../src/lib/prototype/point-to-object-create");
const { calculatePolygonMeasurements } = await import("../src/lib/polygon-aoi");

// Synthetic analogue only: the founder polygon has not been recovered.
function polygon(points: number[][], targetArea: number) {
  const origin = [55.28, 25.2];
  const toGeo = (scale: number) => points.map(([x, y]) => [origin[0] + x * scale / (111320 * Math.cos(origin[1] * Math.PI / 180)), origin[1] + y * scale / 110540] as [number, number]);
  const scale = Math.sqrt(targetArea / calculatePolygonMeasurements(toGeo(1)).areaSqM);
  const ring = toGeo(scale); return [[...ring, ring[0]]];
}
const cases = {
  largeL: polygon([[0, 0], [1000, 0], [1000, 340], [400, 340], [400, 1000], [0, 1000]], 749860),
  largeU: polygon([[0, 0], [1000, 0], [1000, 1000], [700, 1000], [700, 350], [300, 350], [300, 1000], [0, 1000]], 749860),
  narrow: polygon([[0, 0], [1400, 0], [1400, 180], [0, 180]], 180000),
  skewL: polygon([[0, 0], [1000, 15], [980, 350], [410, 340], [400, 1000], [10, 980]], 749860),
  rotatedL: polygon([[0, 0], [1000, 0], [1000, 340], [400, 340], [400, 1000], [0, 1000]].map(([x, y]) => [x * Math.cos(0.51) - y * Math.sin(0.51), x * Math.sin(0.51) + y * Math.cos(0.51)]), 749860)
};
for (const [name, aoi] of Object.entries(cases)) {
  for (const style of ["courtyard", "campus", "towers_on_podium"] as const) {
    const v = validateRedevelopmentProgram({ ...conceptTemplate("residential_mixed_use", "en"), massingStyle: style, blockCount: 9, levelsMin: 6, levelsMax: 53, targetSiteCoveragePct: 38, openSpacePct: 35, setbackM: 8 });
    assert.ok(v.ok); if (!v.ok) throw new Error("invalid fixture");
    const start = performance.now();
    const variants = generateConceptMassingAlternatives(aoi, v.value, `quality20:${name}:${style}`);
    assert.equal(variants.length, 2, `${name}/${style}: two alternatives`);
    for (const { massing } of variants) {
      assert.deepEqual(validateConceptMassingGeometry(aoi, v.value, massing), []);
      assert.equal(massing.generatedBlockCount, 9);
      assert.ok(Math.abs(massing.achievedSiteCoveragePct - 38) <= 0.1);
      const primaries = massing.featureCollection.features.filter(f => f.properties.primaryBlock);
      const centers = primaries.map(f => f.geometry.coordinates[0].slice(0, -1)).map(r => [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length]);
      for (const axis of [0, 1]) {
        if (name === "narrow" && axis === 1) continue; // One row is correct across a narrow strip.
        const siteSpan = Math.max(...aoi[0].map(p => p[axis])) - Math.min(...aoi[0].map(p => p[axis]));
        const centerSpan = Math.max(...centers.map(p => p[axis])) - Math.min(...centers.map(p => p[axis]));
        assert.ok(centerSpan / siteSpan > 0.4, `${name}/${style}: distribution axis ${axis}`);
      }
    }
    assert.notDeepEqual(variants[0].massing.featureCollection.features.map(f=>f.geometry), variants[1].massing.featureCollection.features.map(f=>f.geometry), "A/B distinction must change geometry, not IDs or labels");
    assert.deepEqual(generateConceptMassingAlternatives(aoi, v.value, `quality20:${name}:${style}`), variants, "Deterministic repeated result");
    assert.throws(() => generateConceptMassingAlternatives([aoi[0], aoi[0]], v.value), /exactly one exterior ring/);
    const invalid = structuredClone(variants[0].massing);
    invalid.featureCollection.features[1].geometry = structuredClone(invalid.featureCollection.features[0].geometry);
    assert.ok(validateConceptMassingGeometry(aoi, v.value, invalid).length > 0, "Overlap mutation rejected");
    const outside = structuredClone(variants[0].massing);
    outside.featureCollection.features[0].geometry.coordinates[0] = outside.featureCollection.features[0].geometry.coordinates[0].map(([x,y]) => [x+0.02,y]);
    assert.ok(validateConceptMassingGeometry(aoi,v.value,outside).some(error=>/setback/.test(error)), "Outside/setback mutation rejected");
    console.log(name, style, Math.round(performance.now() - start), "ms", variants.map(v => v.massing.achievedSiteCoveragePct));
  }
}

for (const levels of [6,80]) {
  const v=validateRedevelopmentProgram({...conceptTemplate("commercial_hub","en"),blockCount:9,levelsMin:levels,levelsMax:levels,targetSiteCoveragePct:38,openSpacePct:35,setbackM:8});
  if(!v.ok) throw new Error(v.errors.join(";"));
  const variants=generateConceptMassingAlternatives(cases.largeL,v.value,"quality20-height-only");
  assert.equal(variants.length,2);
  assert.ok(variants.every(({massing})=>massing.achievedSiteCoveragePct===38 && massing.minGeneratedLevels===levels && massing.maxGeneratedLevels===levels),"Height change alone must not downgrade the feasible large-site footprint coverage");
}
