import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import type { ConceptPosition, ConceptMassingResult, PointObjectCreateAoi } from "../src/lib/prototype/point-to-object-create";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
    try { return next(`${specifier}.ts`, context); } catch { /* canonical resolution below */ }
  }
  return next(specifier, context);
} });
const { CONCEPT_TEMPLATE_IDS, conceptTemplate, generateConceptMassingAlternatives, validateRedevelopmentProgram } = await import("../src/lib/prototype/point-to-object-create");
const { buildConceptEnvironment, validateConceptEnvironment } = await import("../src/lib/prototype/point-to-object-create-environment");
const { conceptSurfaceImage } = await import("../src/lib/prototype/point-to-object-create-appearance");
const { buildPointObjectCreatePreviewModel } = await import("../src/lib/prototype/point-to-object-create-preview");
const { calculatePolygonMeasurements } = await import("../src/lib/polygon-aoi");

const origin = [55.28, 25.2];
const coordinate = ([x, y]: number[]): ConceptPosition => [origin[0] + x / (111320 * Math.cos(origin[1] * Math.PI / 180)), origin[1] + y / 110540];
function ring(points: number[][]): ConceptPosition[] { const converted = points.map(coordinate); return [...converted, converted[0]]; }
function area(points: number[][]): PointObjectCreateAoi {
  const coordinates = [ring(points)];
  return { id: "create-aoi-environment", coordinates, ...calculatePolygonMeasurements(coordinates[0].slice(0, -1)), vertexCount: points.length };
}
const shapes = {
  rectangle: area([[0, 0], [400, 0], [400, 300], [0, 300]]),
  concave: area([[0, 0], [900, 0], [900, 350], [380, 350], [380, 950], [0, 950]])
};
function inside(point: number[], boundary: number[][]): boolean {
  let result = false;
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const a = boundary[i], b = boundary[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
const images = new Set<string>(), scenes = new Set<string>();
let sample: ConceptMassingResult | null = null;
for (const id of CONCEPT_TEMPLATE_IDS) {
  const program = validateRedevelopmentProgram(conceptTemplate(id, "en"));
  assert.ok(program.ok);
  for (const variant of ["A", "B"] as const) {
    const image = conceptSurfaceImage(id, variant);
    assert.equal(image.width, 32); assert.equal(image.height, 32);
    assert.ok(image.data.every((value, index) => index % 4 !== 3 || value === 255));
    images.add(Buffer.from(image.data).toString("base64"));
  }
  for (const [shape, aoi] of Object.entries(shapes)) {
    const alternatives = generateConceptMassingAlternatives(aoi.coordinates, program.value, "environment-check");
    assert.equal(alternatives.length, 2);
    for (const { massing } of alternatives) {
      sample ??= massing;
      const before = JSON.stringify([aoi, massing]);
      const start = performance.now();
      const environment = buildConceptEnvironment(aoi, massing);
      assert.equal(environment.status, "ready", `${id}/${shape}/${massing.variantId}: ${environment.reasons}`);
      assert.ok(environment.plazaCount >= 2);
      assert.ok(environment.connected);
      assert.deepEqual(validateConceptEnvironment(aoi, massing, environment), []);
      // All generated elements are axis-aligned rectangles. Independently
      // prove the emitted polygon union is connected, not just the search graph.
      const bounds = environment.featureCollection.features.map(f => {
        const points = f.geometry.coordinates[0];
        return [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
      });
      const reached = new Set([0]), queue = [0];
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const a = bounds[queue[cursor]];
        bounds.forEach((b, index) => {
          if (!reached.has(index) && a[0] <= b[2] + 1e-10 && a[2] >= b[0] - 1e-10 && a[1] <= b[3] + 1e-10 && a[3] >= b[1] - 1e-10) {
            reached.add(index); queue.push(index);
          }
        });
      }
      assert.equal(reached.size, bounds.length, "actual emitted pedestrian/open-space union is connected");
      // Independent dense edge samples, in addition to exact intersection validation.
      for (const feature of environment.featureCollection.features) {
        assert.equal(feature.properties.provenance, "conceptual");
        const vertices = feature.geometry.coordinates[0];
        for (let i = 0; i < vertices.length - 1; i++) for (let step = 0; step <= 16; step++) {
          const p = vertices[i].map((value, axis) => value + (vertices[i + 1][axis] - value) * step / 16);
          assert.ok(inside(p, aoi.coordinates[0]), "environment stays inside AOI");
          assert.ok(massing.featureCollection.features.every(building => !inside(p, building.geometry.coordinates[0])), "environment does not cross a building");
        }
      }
      assert.equal(JSON.stringify([aoi, massing]), before, "geometry and KPIs are immutable");
      assert.deepEqual(buildConceptEnvironment(JSON.parse(JSON.stringify(aoi)), JSON.parse(JSON.stringify(massing))), environment, "old saved result needs no migration");
      assert.deepEqual(buildPointObjectCreatePreviewModel(aoi, massing)?.environment, environment, "main and result scenes are identical");
      assert.equal(buildConceptEnvironment(aoi, massing), environment, "repeat frames reuse bounded cached result");
      scenes.add(JSON.stringify(environment.featureCollection));
      console.log(`${id}/${shape}/${massing.variantId}: ${environment.featureCollection.features.length} valid elements (${Math.round(performance.now() - start)} ms)`);
    }
  }
}
assert.equal(images.size, 10, "five neutral finishes, two deterministic rhythms");
assert.equal(scenes.size, 20, "programme and A/B affect actual scene geometry");
assert.ok(sample);
const aoi = shapes.rectangle;
const environment = structuredClone(buildConceptEnvironment(aoi, sample));
const poisoned = structuredClone(environment);
poisoned.featureCollection.features[0].geometry = structuredClone(sample.featureCollection.features[0].geometry);
assert.ok(validateConceptEnvironment(aoi, sample, poisoned).length, "entire candidate over a building is rejected");
poisoned.featureCollection.features[0].geometry.coordinates = [ring([[-20, 10], [20, 10], [20, 30], [-20, 30]])];
assert.ok(validateConceptEnvironment(aoi, sample, poisoned).length, "outside candidate rejected");
poisoned.featureCollection.features[0].properties.provenance = "factual" as "conceptual";
assert.ok(validateConceptEnvironment(aoi, sample, poisoned).length, "unfounded factual provenance rejected");

// Deliberately construct a central hole and a wide corridor whose vertices all
// miss it: vertex-only containment would incorrectly accept this crossing.
const holeAoi = structuredClone(aoi);
holeAoi.coordinates.push(ring([[190, 100], [210, 100], [210, 200], [190, 200]]));
const sparse = structuredClone(sample);
sparse.featureCollection.features = [structuredClone(sample.featureCollection.features[0])];
sparse.featureCollection.features[0].geometry.coordinates = [ring([[20, 20], [40, 20], [40, 40], [20, 40]])];
const bridge = structuredClone(environment);
bridge.featureCollection.features = [structuredClone(environment.featureCollection.features[0])];
bridge.featureCollection.features[0].geometry.coordinates = [ring([[170, 140], [230, 140], [230, 160], [170, 160]])];
assert.ok(validateConceptEnvironment(holeAoi, sparse, bridge).length, "crossing hole edges rejected");
bridge.featureCollection.features[0].geometry.coordinates = [ring([[180, 90], [220, 90], [220, 210], [180, 210]])];
assert.ok(validateConceptEnvironment(holeAoi, sparse, bridge).length, "fully enclosed hole rejected");
const holeScene = buildConceptEnvironment(holeAoi, sparse);
assert.ok(holeScene.featureCollection.features.length > 0);
assert.deepEqual(validateConceptEnvironment(holeAoi, sparse, holeScene), []);

const closed = structuredClone(sparse);
closed.featureCollection.features[0].geometry.coordinates = aoi.coordinates;
const noSpace = buildConceptEnvironment(aoi, closed);
assert.equal(noSpace.status, "unavailable"); assert.equal(noSpace.connected, false);
assert.deepEqual(noSpace.featureCollection.features, []);
assert.ok(noSpace.reasons.includes("no_valid_open_space_candidate"));
const crossed = area([[0, 0], [400, 300], [400, 0], [0, 300]]);
assert.equal(buildConceptEnvironment(crossed, sample).status, "unavailable");
assert.ok(validateConceptEnvironment(crossed, sample, environment).includes("invalid_scene_geometry"));
assert.equal(buildConceptEnvironment(area([[0, 0], [2, 0], [2, 2], [0, 2]]), sample).status, "unavailable");
assert.deepEqual(buildConceptEnvironment(aoi, sample), environment, "failed decoration never overwrites previous scene");
console.log("COMPLETE25 environment: 20 valid scenes, 10 textures, hole/collision/invalid/blocked negatives, unchanged massing/KPI and deterministic reopen PASS.");
