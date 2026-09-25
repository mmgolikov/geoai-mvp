import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { writeFileSync } from "node:fs";
registerHooks({ resolve(s, c, next) { if (s.startsWith(".") && !/\.[cm]?[jt]s$/.test(s)) { try { return next(`${s}.ts`, c); } catch { } } return next(s, c); } });
const { preflightPointObjectCreate } = await import("../src/lib/prototype/point-to-object-create-orchestration");
const { POINT_OBJECT_CREATE_CONTROL_KEYS } = await import("../src/lib/prototype/point-to-object-create-ai-core");
const { validateConceptMassingGeometry } = await import("../src/lib/prototype/point-to-object-create");
const { calculatePolygonMeasurements } = await import("../src/lib/polygon-aoi");
const { quality20Hash } = await import("../tests/e2e/helpers/quality20-frozen-case");
const { assertIndependentQuality20CreateMassing } = await import("../tests/e2e/helpers/quality20-create-geometry");
type XY = [number, number];
const controls = { blockCount: 12, levelsMin: 6, levelsMax: 53, targetSiteCoveragePct: 38, openSpacePct: 35, setbackM: 8 };
const reports: unknown[] = [];
const failures: string[] = [];
// Frozen BEFORE measurements from 67b8b24, not planning thresholds.
const baselineHullSqM = { "24A": 473331.5484, "24B": 367727.5870, "25A": 311766.3447, "25B": 272674.7149 };
const baselineWeakFootprintSpan = { "24B": 0.4171671806, "25A": 0.3972142532, "25B": 0.4118792918 };
// Independent gift-wrapping hull (producer uses monotone chain). This reports
// spatial envelope, not building union, usable open space or uniform density.
function hullArea(points: XY[]): number {
  const start = points.reduce((best,p) => p[0] < best[0] || (p[0] === best[0] && p[1] < best[1]) ? p : best);
  const hull: XY[] = [];
  let current = start;
  do {
    hull.push(current);
    let next = points.find(p => p !== current)!;
    for (const point of points) {
      const cross = (next[0]-current[0])*(point[1]-current[1])-(next[1]-current[1])*(point[0]-current[0]);
      const squared = (p: XY) => (p[0]-current[0])**2+(p[1]-current[1])**2;
      if (cross < 0 || (cross === 0 && squared(point)>squared(next))) next = point;
    }
    current = next;
    assert.ok(hull.length <= points.length, "Independent hull must terminate");
  } while (current !== start);
  return Math.abs(hull.reduce((sum,p,i) => {
    const q = hull[(i+1)%hull.length];
    return sum+(p[0]-start[0])*(q[1]-start[1])-(q[0]-start[0])*(p[1]-start[1]);
  },0))/2;
}
assert.equal(hullArea([[0,0],[2,0],[2,2],[0,2],[1,1]]),4);
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("Offline only: network forbidden"); };
try {
  for (const vertices of [24, 25]) {
    const metric = Array.from({ length: vertices }, (_, i) => {
      const theta = i * 2 * Math.PI / vertices + 0.17, r = i % 2 === 0 ? 1 : 0.62;
      return [Math.cos(theta) * r * 1.12, Math.sin(theta) * r * 0.91];
    });
    const toGeo = (scale: number): XY[] => metric.map(([x,y]) => [55.28 + x * scale / (111320 * Math.cos(25.2 * Math.PI / 180)), 25.2 + y * scale / 110540]);
    let scale = 500;
    for (let i = 0; i < 6; i++) scale *= Math.sqrt(749860 / calculatePolygonMeasurements(toGeo(scale)).areaSqM);
    const ring = toGeo(scale), coordinates = [[...ring, ring[0]]];
    const started = performance.now();
    const preflight = preflightPointObjectCreate({ aoiCoordinates: coordinates, aoiHash: quality20Hash(coordinates), locale: "en", templateId: "commercial_hub", customPrompt: null, controls, lockedControlKeys: [...POINT_OBJECT_CREATE_CONTROL_KEYS] });
    assert.equal(preflight.kind, "ready");
    assert.deepEqual(preflight.alternatives.map(a => a.id), ["A", "B"]);
    for (const [key,value] of Object.entries(controls)) assert.equal(preflight.program[key as keyof typeof controls],value);
    const signature = (m: typeof preflight.alternatives[number]["massing"]) =>
      m.featureCollection.features.map(f => JSON.stringify(f.geometry.coordinates.map(r =>
        r.slice(0,-1).map(p => p.map(value=>Number(value.toFixed(9)))).sort()))).sort();
    assert.notDeepEqual(signature(preflight.alternatives[0].massing), signature(preflight.alternatives[1].massing));
    for (const { id, massing } of preflight.alternatives) {
      assert.deepEqual(validateConceptMassingGeometry(coordinates, preflight.program, massing), []);
      const footprints = massing.featureCollection.features.filter(f => f.properties.primaryBlock).map(f => f.geometry.coordinates[0].slice(0,-1));
      const centers = footprints.map(r => [0,1].map(axis => r.reduce((sum,p) => sum+p[axis],0)/r.length));
      const span = (points: number[][], axis: number) => Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]));
      const centerSpans = [0,1].map(axis => span(centers,axis)/span(ring,axis));
      const footprintSpans = [0,1].map(axis => span(footprints.flat(),axis)/span(ring,axis));
      const latitude = ring.reduce((sum,p)=>sum+p[1],0)/ring.length;
      const project = ([x,y]: number[]): XY => [(x-ring[0][0])*111320*Math.cos(latitude*Math.PI/180),(y-ring[0][1])*110540];
      const primaryHullAreaSqM = hullArea(footprints.flat().map(project));
      if (!process.argv.includes("--diagnostic")) {
        const key = `${vertices}${id}` as keyof typeof baselineHullSqM;
        assert.ok(primaryHullAreaSqM > baselineHullSqM[key] + 1, "Primary-footprint hull must improve against the preserved baseline");
        if (key !== "24A") assert.ok(Math.min(...footprintSpans) > baselineWeakFootprintSpan[key] + 0.000001,
          "The previously concentrated primary footprints must expand on their weak axis");
      }
      let oracleError: string | null = null;
      try { assertIndependentQuality20CreateMassing(coordinates, controls as unknown as Parameters<typeof assertIndependentQuality20CreateMassing>[1], massing); }
      catch (error) { oracleError = error instanceof Error ? error.message : String(error); failures.push(`${vertices}/${id}: ${oracleError}`); }
      const summary = { vertices, id, centerSpans, footprintSpans, primaryHullAreaSqM, podiums: massing.featureCollection.features.filter(f=>f.properties.volumeRole==="podium").length, geometryHash: quality20Hash(massing), oracleError };
      console.log(JSON.stringify(summary));
      reports.push({ ...summary, controls, coordinates, massing });
      const overlap = structuredClone(massing), primary = overlap.featureCollection.features.filter(f=>f.properties.primaryBlock);
      primary[1].geometry = structuredClone(primary[0].geometry);
      assert.throws(() => assertIndependentQuality20CreateMassing(coordinates,
        controls as unknown as Parameters<typeof assertIndependentQuality20CreateMassing>[1], overlap), /overlap|outside supporting/);
    }
    const elapsedMs = Math.round(performance.now()-started);
    assert.ok(elapsedMs < 2500, "Keep the existing two-alternative 2500ms performance ceiling");
    assert.deepEqual(preflightPointObjectCreate({ aoiCoordinates: coordinates, aoiHash: quality20Hash(coordinates), locale: "en", templateId: "commercial_hub", customPrompt: null, controls, lockedControlKeys: [...POINT_OBJECT_CREATE_CONTROL_KEYS] }), preflight);
    console.log(JSON.stringify({ vertices, elapsedMs }));
  }
  const outputIndex = process.argv.indexOf("--evidence-output");
  if (outputIndex >= 0) writeFileSync(process.argv[outputIndex+1], JSON.stringify({ scope: "Synthetic offline radial-star diagnostics, not live acceptance", reports }, null, 2), { flag: "wx" });
  if (!process.argv.includes("--diagnostic")) assert.deepEqual(failures, []);
} finally { globalThis.fetch = originalFetch; }
