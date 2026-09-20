import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(
  readFileSync(filename, "utf8").replace(/(["'])@\/([^"']+)\1/g, (_match, _quote, path) => JSON.stringify(new URL(`../${path}`, import.meta.url).pathname)),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }
).outputText, filename);

const { sourceElementFootprint } = require("../src/lib/prototype/point-to-object-source-geometry.ts");
const { preflightPointObjectCreate } = require("../src/lib/prototype/point-to-object-create-orchestration.ts");
const { conceptTemplate } = require("../src/lib/prototype/point-to-object-create.ts");
const { POINT_OBJECT_CREATE_CONTROL_KEYS } = require("../src/lib/prototype/point-to-object-create-ai-core.ts");
const point = ([lon, lat]) => ({ lon, lat });
const member = (role, ring) => ({ type: "way", role, geometry: ring.map(point) });
const relation = (members) => ({ type: "relation", tags: { type: "multipolygon", building: "yes" }, members });
const square = (x1, y1, x2, y2) => [[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]];

// Independent test oracle: inclusive segment intersection plus containment.
// It shares no product helper and checks only cross-shell topology.
const orient = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const onSegment = (a,p,b) => p[0] >= Math.min(a[0],b[0]) && p[0] <= Math.max(a[0],b[0]) && p[1] >= Math.min(a[1],b[1]) && p[1] <= Math.max(a[1],b[1]);
function intersects(a,b,c,d) {
  const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b),e=1e-12;
  if (Math.sign(o1)!==Math.sign(o2) && Math.sign(o3)!==Math.sign(o4)) return true;
  return Math.abs(o1)<=e&&onSegment(a,c,b)||Math.abs(o2)<=e&&onSegment(a,d,b)||Math.abs(o3)<=e&&onSegment(c,a,d)||Math.abs(o4)<=e&&onSegment(c,b,d);
}
function inside(p, ring) {
  let value=false;
  for(let i=0,j=ring.length-2;i<ring.length-1;j=i++){
    const a=ring[i],b=ring[j];
    if ((a[1]>p[1])!==(b[1]>p[1]) && p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) value=!value;
  }
  return value;
}
function oracleAccepts(shells) {
  for(let i=0;i<shells.length;i++) for(let j=i+1;j<shells.length;j++) {
    for(let a=0;a<shells[i].length-1;a++) for(let b=0;b<shells[j].length-1;b++) if(intersects(shells[i][a],shells[i][a+1],shells[j][b],shells[j][b+1])) return false;
    if(inside(shells[i][0],shells[j])||inside(shells[j][0],shells[i])) return false;
  }
  return true;
}

const fixtures = [
  { name:"disjoint", shells:[square(0,0,2,2),square(3,0,5,2)], accepted:true },
  { name:"duplicate", shells:[square(0,0,2,2),square(0,0,2,2)], accepted:false },
  { name:"overlap", shells:[square(0,0,3,3),square(2,1,4,4)], accepted:false },
  { name:"nested", shells:[square(0,0,5,5),square(1,1,2,2)], accepted:false },
  { name:"touching edge", shells:[square(0,0,2,2),square(2,0,4,2)], accepted:false },
  { name:"touching point", shells:[square(0,0,2,2),square(2,2,4,4)], accepted:false }
];
for (const fixture of fixtures) {
  assert.equal(oracleAccepts(fixture.shells), fixture.accepted, `oracle ${fixture.name}`);
  const result = sourceElementFootprint(relation(fixture.shells.map((ring) => member("outer", ring))));
  assert.equal(result !== null, fixture.accepted, `product ${fixture.name}`);
  if (fixture.name === "disjoint") assert.equal(result?.type, "MultiPolygon");
}

const shellWithHole = sourceElementFootprint(relation([
  member("outer", square(0,0,5,5)),
  member("inner", square(1,1,2,2)),
  member("outer", square(7,0,9,2))
]));
assert.equal(shellWithHole?.type, "MultiPolygon");
assert.equal(shellWithHole.coordinates[0].length, 2, "valid hole remains assigned to its one shell");
assert.equal(sourceElementFootprint(relation([
  member("outer", square(0,0,5,5)),
  member("inner", square(4,4,6,6))
])), null, "crossing hole remains rejected");

const civic = conceptTemplate("civic_green", "en");
const civicControls = {
  blockCount: civic.blockCount,
  levelsMin: civic.levelsMin,
  levelsMax: civic.levelsMax,
  targetSiteCoveragePct: civic.targetSiteCoveragePct,
  openSpacePct: civic.openSpacePct,
  setbackM: civic.setbackM
};
const createPreflight = (coordinates) => preflightPointObjectCreate({
  aoiCoordinates: coordinates,
  aoiHash: JSON.stringify(coordinates),
  locale: "en",
  templateId: "civic_green",
  customPrompt: null,
  controls: civicControls,
  lockedControlKeys: [...POINT_OBJECT_CREATE_CONTROL_KEYS]
});
const smallCreateFixture = [[
  [55.27015,25.20515],[55.27065,25.20515],[55.27065,25.20565],
  [55.27015,25.20565],[55.27015,25.20515]
]];
const feasibleCreateFixture = [[
  [55.26955,25.20455],[55.27065,25.20455],[55.27065,25.20565],
  [55.26955,25.20565],[55.26955,25.20455]
]];
assert.deepEqual(createPreflight(smallCreateFixture), {
  kind: "failed", code: "solver_exhausted", searchAttempts: 8
}, "the former 2,783 m² Public campus fixture remains a genuine negative preflight case");
assert.equal(createPreflight(feasibleCreateFixture).kind, "ready", "positive mock-generation fixture must pass the real local preflight");

const panel = readFileSync("components/point-to-object/create-panel.tsx", "utf8");
assert.match(panel, /code: "worker_unavailable"/);
assert.match(panel, /code === "solver_timeout"[\s\S]*does not mean the layout is impossible/);
assert.match(panel, /code === "geometry_validation_failed"[\s\S]*not a conclusion about layout feasibility/);
assert.match(panel, /setPreflightAttempt\(\(attempt\) => attempt \+ 1\)/);
assert.match(panel, /data-testid="create-local-preflight-retry"/);
assert.doesNotMatch(panel, /#087f70|#06695e|#f4faf7/);

console.log(`Quality20 P2 review fixes PASS: ${fixtures.length} independent shell-oracle fixtures, valid hole/disjoint preservation, worker failure copy/retry, brand palette.`);
