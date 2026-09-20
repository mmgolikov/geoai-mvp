import assert from "node:assert/strict";
import { calculatePolygonMeasurements } from "../../../src/lib/polygon-aoi";
import { validateConceptMassingGeometry, type PointObjectCreateAoi } from "../../../src/lib/prototype/point-to-object-create";
import { parsePointObjectGeneratedConcept } from "../../../src/lib/prototype/point-to-object-create-result";

// Exact largeL construction from scripts/sprint20-create-geometry-check.ts.
// Synthetic analogue, not the recovered founder parcel or official site evidence.
const metres = [[0, 0], [1000, 0], [1000, 340], [400, 340], [400, 1000], [0, 1000]];
const toGeo = (scale: number): [number, number][] => metres.map(([x, y]) =>
  [55.28 + x * scale / (111320 * Math.cos(25.2 * Math.PI / 180)), 25.2 + y * scale / 110540]);
const vertices = toGeo(Math.sqrt(749860 / calculatePolygonMeasurements(toGeo(1)).areaSqM));
export const DUBAI_CREATE_GOLDEN = {
  marketKey: "dubai" as const,
  templateId: "residential_mixed_use" as const,
  coordinates: [[...vertices, vertices[0]]],
  controls: { blockCount: 9, levelsMin: 6, levelsMax: 53, targetSiteCoveragePct: 38, openSpacePct: 35, setbackM: 8 }
};
export const DUBAI_CREATE_GOLDEN_AOI: PointObjectCreateAoi = {
  id: "create-aoi-quality20-large-L", coordinates: DUBAI_CREATE_GOLDEN.coordinates,
  ...calculatePolygonMeasurements(vertices), vertexCount: vertices.length
};

export function assertDubaiCreateRequest(body: unknown) {
  assert.ok(body && typeof body === "object");
  const input = body as Record<string, unknown>;
  assert.equal(input.marketKey, "dubai");
  assert.equal(input.locale, "en");
  assert.equal(input.depth, "standard");
  assert.equal(input.templateId, DUBAI_CREATE_GOLDEN.templateId);
  assert.equal(input.customPrompt, null);
  assert.deepEqual(input.aoiCoordinates, DUBAI_CREATE_GOLDEN.coordinates);
  assert.deepEqual(input.controls, DUBAI_CREATE_GOLDEN.controls);
  assert.ok(Array.isArray(input.lockedControlKeys));
  assert.deepEqual([...input.lockedControlKeys].sort(), Object.keys(DUBAI_CREATE_GOLDEN.controls).sort());
}

type XY = [number, number];
const edges = (r: XY[]) => r.map((p, i) => [p, r[(i + 1) % r.length]] as const);
const area = (r: XY[]) => Math.abs(edges(r).reduce((s, [p, q]) => s + p[0] * q[1] - q[0] * p[1], 0)) / 2;
const cross = (a: XY, b: XY, c: XY) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const intersects = (a: XY, b: XY, c: XY, d: XY) => cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
function inside(p: XY, r: XY[]) {
  let result = false;
  for (const [a, b] of edges(r)) if ((a[1] > p[1]) !== (b[1] > p[1]) &&
    p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  return result;
}
function pointSegment(p: XY, a: XY, b: XY) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

export function assertDubaiCreateGeometry(payload: unknown) {
  const concept = parsePointObjectGeneratedConcept(payload, DUBAI_CREATE_GOLDEN_AOI);
  assert.ok(concept, "Create must return a complete parseable result");
  for (const key of Object.keys(DUBAI_CREATE_GOLDEN.controls) as Array<keyof typeof DUBAI_CREATE_GOLDEN.controls>) {
    assert.equal(concept.program[key], DUBAI_CREATE_GOLDEN.controls[key], `Requested ${key} changed`);
  }
  assert.equal(concept.program.templateId, DUBAI_CREATE_GOLDEN.templateId);
  assert.equal(concept.program.massingStyle, "courtyard");
  const alternatives = concept.alternatives!;
  assert.deepEqual(alternatives?.map(a => a.id).sort(), ["A", "B"]);
  assert.notDeepEqual(alternatives[0].massing.featureCollection.features.map(f => f.geometry),
    alternatives[1].massing.featureCollection.features.map(f => f.geometry), "A/B must differ geometrically");
  const referenceLat = vertices.reduce((s, p) => s + p[1], 0) / vertices.length;
  const project = ([lng, lat]: number[]): XY => [(lng - 55.28) * 111320 * Math.cos(referenceLat * Math.PI / 180), (lat - 25.2) * 110540];
  const site = vertices.map(project);
  for (const { massing } of alternatives) {
    assert.deepEqual(validateConceptMassingGeometry(DUBAI_CREATE_GOLDEN.coordinates, concept.program, massing), []);
    const footprints = massing.featureCollection.features.map(f => f.geometry.coordinates[0].slice(0, -1).map(project));
    assert.equal(footprints.length, 9);
    assert.equal(massing.generatedBlockCount, 9);
    assert.equal(massing.minGeneratedLevels, 6);
    assert.equal(massing.maxGeneratedLevels, 53);
    const measuredArea = footprints.reduce((s, r) => s + area(r), 0);
    assert.ok(Math.abs(measuredArea / area(site) * 100 - 38) < 0.1, "Independent coverage must remain 38%, not a reduced preset");
    assert.ok(Math.abs(measuredArea - massing.generatedFootprintAreaSqM) < 0.6);
    assert.ok(Math.abs(massing.aoiAreaSqM - area(site)) < 1);
    assert.ok(Math.abs(massing.achievedSiteCoveragePct - 38) < 0.1);
    for (const r of footprints) {
      assert.ok(r.every(p => inside(p, site)), "Footprint outside AOI");
      for (const [a, b] of edges(r)) for (const [c, d] of edges(site)) {
        assert.ok(!intersects(a, b, c, d), "Footprint crosses AOI boundary");
        assert.ok(Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b)) >= 7.96,
          "Footprint violates 8m setback (4cm numerical tolerance)");
      }
    }
    for (let i = 0; i < footprints.length; i++) for (let j = i + 1; j < footprints.length; j++) {
      assert.ok(!inside(footprints[i][0], footprints[j]) && !inside(footprints[j][0], footprints[i]), "Contained footprint overlap");
      for (const [a, b] of edges(footprints[i])) for (const [c, d] of edges(footprints[j])) assert.ok(!intersects(a, b, c, d), "Footprint intersection");
    }
    const centers = footprints.map(r => [0, 1].map(axis => r.reduce((s, p) => s + p[axis], 0) / r.length));
    for (const axis of [0, 1]) {
      const span = (points: number[][]) => Math.max(...points.map(p => p[axis])) - Math.min(...points.map(p => p[axis]));
      assert.ok(span(centers) / span(site) > 0.4, "Massing must occupy both site axes, not one corner");
    }
  }
  return concept;
}
