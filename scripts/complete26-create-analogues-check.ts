import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import type { ConceptPosition } from "../src/lib/prototype/point-to-object-create";
registerHooks({ resolve(s, c, next) { if (s.startsWith(".") && !/\.[cm]?[jt]s$/.test(s)) { try { return next(`${s}.ts`, c); } catch { } } return next(s, c); } });
const { CONCEPT_TEMPLATE_IDS, generateConceptMassingAlternatives, validateConceptMassingGeometry, validatePointObjectCreateAoiVertices } = await import("../src/lib/prototype/point-to-object-create");
const { preflightPointObjectCreate } = await import("../src/lib/prototype/point-to-object-create-orchestration");
const { POINT_OBJECT_CREATE_CONTROL_KEYS } = await import("../src/lib/prototype/point-to-object-create-ai-core");
const { calculatePolygonMeasurements } = await import("../src/lib/polygon-aoi");
const { quality20Hash } = await import("../tests/e2e/helpers/quality20-frozen-case");
const { assertIndependentQuality20CreateMassing } = await import("../tests/e2e/helpers/quality20-create-geometry");

// New synthetic analogues, not the unavailable original founder polygon. Keep
// the same independent distribution oracle; its world-axis >40% criterion is
// a regression heuristic, not a planning rule or rotation-invariant proof.
const shapes = {
  oblique_stepped_notch: [[0,0],[1020,45],[1100,540],[850,780],[650,690],[640,420],[370,440],[300,1060],[40,970],[-90,570]],
  asymmetric_c: [[0,0],[1120,0],[1120,250],[440,250],[440,680],[990,680],[990,1050],[0,1050]],
  twin_notch: [[0,0],[1120,0],[1120,930],[820,1000],[780,640],[620,610],[570,950],[310,1040],[280,700],[100,680],[0,1000]]
};
const controls = { blockCount: 9, levelsMin: 6, levelsMax: 53, targetSiteCoveragePct: 38, openSpacePct: 35, setbackM: 8 };
// The shared oracle's parameter type is inferred from its older frozen fixture
// literals (none has nine blocks). Its implementation accepts these numeric
// controls unchanged; widen only that fixture-derived TypeScript boundary.
const oracleControls = controls as unknown as Parameters<typeof assertIndependentQuality20CreateMassing>[1];
function footprintSignature(massing: Parameters<typeof assertIndependentQuality20CreateMassing>[2]) {
  // Ignore feature order, IDs, heights, ring direction/start and sub-millimetre
  // coordinate noise: A/B must differ in actual building footprint geometry.
  return massing.featureCollection.features.map(feature =>
    JSON.stringify(feature.geometry.coordinates.map(ring =>
      ring.slice(0, -1).map(point => point.map(value => Number(value.toFixed(9)))).sort()).sort())
  ).sort();
}
function coordinates(points: number[][]): ConceptPosition[][] {
  const toGeo = (scale: number) => points.map(([x,y]) => [55.28 + x*scale/(111320*Math.cos(25.2*Math.PI/180)),25.2+y*scale/110540] as ConceptPosition);
  let scale=1;
  for(let i=0;i<6;i++) scale*=Math.sqrt(749860/calculatePolygonMeasurements(toGeo(scale)).areaSqM);
  const ring=toGeo(scale);
  assert.equal(validatePointObjectCreateAoiVertices(ring).ok,true);
  assert.ok(Math.abs(calculatePolygonMeasurements(ring).areaSqM-749860)<0.1);
  return [[...ring,ring[0]]];
}
const originalFetch=globalThis.fetch;
let networkCalls=0, passed=0;
const failures: string[]=[];
const evidence: unknown[] = [];
globalThis.fetch=async()=>{networkCalls++;throw new Error("Offline analogue regression forbids network calls");};
try {
  for(const [shape,points] of Object.entries(shapes)) for(const templateId of CONCEPT_TEMPLATE_IDS) {
    const started=performance.now(), aoiCoordinates=coordinates(points);
    try {
      const preflight=preflightPointObjectCreate({aoiCoordinates,aoiHash:quality20Hash(aoiCoordinates),locale:"en",templateId,customPrompt:null,controls,lockedControlKeys:[...POINT_OBJECT_CREATE_CONTROL_KEYS]});
      assert.equal(preflight.kind,"ready");
      for(const [key,value] of Object.entries(controls)) assert.equal(preflight.program[key as keyof typeof controls],value);
      assert.deepEqual(preflight.alternatives.map(v=>v.id).sort(),["A","B"]);
      assert.notDeepEqual(footprintSignature(preflight.alternatives[0].massing),footprintSignature(preflight.alternatives[1].massing));
      const metrics=[];
      for(const {massing} of preflight.alternatives) {
        assert.deepEqual(validateConceptMassingGeometry(aoiCoordinates,preflight.program,massing),[]);
        const independent=assertIndependentQuality20CreateMassing(aoiCoordinates,oracleControls,massing);
        assert.ok(Math.abs(independent.coveragePct-38)<=0.1);
        assert.equal(massing.generatedBlockCount,9);assert.equal(massing.minGeneratedLevels,6);assert.equal(massing.maxGeneratedLevels,53);
        assert.ok(100-independent.coveragePct>=35,"Unbuilt allowance is not a measured landscaped polygon");
        metrics.push(independent);
        const overlap=structuredClone(massing),primary=overlap.featureCollection.features.filter(f=>f.properties.primaryBlock);
        primary[1].geometry=structuredClone(primary[0].geometry);
        assert.throws(()=>assertIndependentQuality20CreateMassing(aoiCoordinates,oracleControls,overlap),/overlap|outside supporting/);
        const outside=structuredClone(massing);
        outside.featureCollection.features[0].geometry.coordinates[0]=outside.featureCollection.features[0].geometry.coordinates[0].map(([x,y])=>[x+0.1,y]);
        assert.throws(()=>assertIndependentQuality20CreateMassing(aoiCoordinates,oracleControls,outside),/outside/);
        const forged=structuredClone(massing);forged.generatedFootprintAreaSqM+=100;
        assert.throws(()=>assertIndependentQuality20CreateMassing(aoiCoordinates,oracleControls,forged),/footprint metric/);
      }
      assert.deepEqual(generateConceptMassingAlternatives(aoiCoordinates,preflight.program,preflight.seed),preflight.alternatives);
      assert.throws(()=>generateConceptMassingAlternatives([aoiCoordinates[0],aoiCoordinates[0]],preflight.program),/exactly one exterior ring/);
      const elapsedMs=Math.round(performance.now()-started);
      assert.ok(elapsedMs<8000,`Bounded analogue case exceeded 8s (${elapsedMs}ms)`);
      evidence.push({ shape, templateId, controls, aoiCoordinates, elapsedMs, independentMetrics: metrics, preflight });
      console.log(JSON.stringify({shape,templateId,status:"PASS",elapsedMs,coverage:metrics.map(m=>m.coveragePct)}));passed++;
    } catch(error) { const message=error instanceof Error?error.message:String(error);failures.push(`${shape}/${templateId}: ${message}`);console.log(JSON.stringify({shape,templateId,status:"FAIL",message})); }
  }
  assert.equal(networkCalls,0);
  const outputIndex = process.argv.indexOf("--evidence-output");
  if (outputIndex >= 0) {
    assert.ok(process.argv[outputIndex + 1], "--evidence-output requires a new output path");
    writeFileSync(process.argv[outputIndex + 1], JSON.stringify({ scope: "OFFLINE synthetic analogues; not live acceptance", passed, failures, networkCalls, cases: evidence }, null, 2), { flag: "wx" });
  }
  assert.deepEqual(failures,[],`${passed}/15 analogue programme cases passed`);
  console.log("COMPLETE26 analogue acceptance PASS: 15 cases, 30 distinct valid variants, 90 independent geometry/KPI negative mutations, 15 hole negatives, deterministic replay; zero network/AI calls.");
} finally {globalThis.fetch=originalFetch;}
