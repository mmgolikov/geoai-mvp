import assert from "node:assert/strict";
import { calculatePolygonMeasurements } from "../../../src/lib/polygon-aoi";
import { parsePointObjectGeneratedConcept } from "../../../src/lib/prototype/point-to-object-create-result";
import type { ConceptMassingResult, ConceptPosition } from "../../../src/lib/prototype/point-to-object-create";
import { quality20CreateControls, type Quality20Selection } from "./quality20-frozen-case";

type XY = [number, number];
type Controls = ReturnType<typeof quality20CreateControls>;
const EPS = 1e-7;
const cross = (a: XY, b: XY, c: XY) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const edges = (ring: XY[]) => ring.map((point, index) => [point, ring[(index + 1) % ring.length]] as const);
const area = (ring: XY[]) => Math.abs(edges(ring).reduce((sum, [a, b]) => sum + a[0] * b[1] - b[0] * a[1], 0)) / 2;
function distance(point: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
}
function crosses(a: XY, b: XY, c: XY, d: XY): boolean {
  return cross(a, b, c) * cross(a, b, d) < -EPS && cross(c, d, a) * cross(c, d, b) < -EPS;
}
function contains(point: XY, ring: XY[]): boolean {
  if (edges(ring).some(([a, b]) => distance(point, a, b) <= EPS)) return true;
  let inside = false;
  for (const [a, b] of edges(ring)) if ((a[1] > point[1]) !== (b[1] > point[1]) &&
    point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  return inside;
}
function validRing(ring: XY[], label: string): void {
  assert.ok(ring.length >= 3 && new Set(ring.map(point => point.join(","))).size === ring.length && area(ring) > EPS,
    `${label}: degenerate or repeated vertices`);
  const segments = edges(ring);
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
    if (j === i + 1 || (i === 0 && j === segments.length - 1)) continue;
    const [a, b] = segments[i], [c, d] = segments[j];
    assert.ok(!crosses(a, b, c, d) && Math.min(distance(a, c, d), distance(b, c, d), distance(c, a, b), distance(d, a, b)) > EPS,
      `${label}: self-intersection or self-touch`);
  }
}

// Independent scanline union: integrate merged vertical intervals between every
// vertex/intersection x. Interval endpoints are linear in each slab, so its
// midpoint area is exact for these straight-edge single-ring polygons. This is
// not the producer's layout, containment validator or sum-of-footprints metric.
export function quality20IndependentUnionArea(rings: XY[][]): number {
  const segments = rings.flatMap(edges);
  const cuts = rings.flatMap(ring => ring.map(point => point[0]));
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
    const [a, b] = segments[i], [c, d] = segments[j];
    if (!crosses(a, b, c, d)) continue;
    const dx = b[0] - a[0], dy = b[1] - a[1], ex = d[0] - c[0], ey = d[1] - c[1];
    const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / (dx * ey - dy * ex);
    cuts.push(a[0] + t * dx);
  }
  const xs = [...new Set(cuts)].sort((a, b) => a - b);
  let union = 0;
  for (let index = 1; index < xs.length; index++) {
    const width = xs[index] - xs[index - 1];
    if (width <= EPS) continue;
    const x = (xs[index] + xs[index - 1]) / 2;
    const intervals: XY[] = [];
    for (const ring of rings) {
      const ys = edges(ring).filter(([a, b]) => (a[0] < x && b[0] > x) || (b[0] < x && a[0] > x))
        .map(([a, b]) => a[1] + (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0])).sort((a, b) => a - b);
      assert.equal(ys.length % 2, 0, "Independent union: invalid crossing parity");
      for (let i = 0; i < ys.length; i += 2) intervals.push([ys[i], ys[i + 1]]);
    }
    intervals.sort((a, b) => a[0] - b[0]);
    let length = 0, start = 0, end = 0, active = false;
    for (const [bottom, top] of intervals) {
      if (!active) { start = bottom; end = top; active = true; }
      else if (bottom <= end) end = Math.max(end, top);
      else { length += end - start; start = bottom; end = top; }
    }
    if (active) length += end - start;
    union += length * width;
  }
  return union;
}

export function assertIndependentQuality20CreateMassing(
  coordinates: number[][][], controls: Controls, massing: ConceptMassingResult
) {
  assert.equal(coordinates.length, 1, "Independent oracle does not accept AOI holes");
  function geoRing(rings: number[][][], label: string): XY[] {
    assert.equal(rings.length, 1, `${label}: holes are not accepted`);
    const ring = rings[0];
    assert.ok(ring.length >= 4 && ring.every(point => point.length === 2 && point.every(Number.isFinite) &&
      Math.abs(point[0]) <= 180 && Math.abs(point[1]) < 89), `${label}: invalid geographic coordinates/units`);
    assert.deepEqual(ring[0], ring.at(-1), `${label}: ring must close`);
    return ring.slice(0, -1) as XY[];
  }
  const geographicSite = geoRing(coordinates, "AOI");
  const latitude = geographicSite.reduce((sum, point) => sum + point[1], 0) / geographicSite.length;
  const origin = geographicSite[0];
  const project = ([longitude, lat]: XY): XY => [(longitude - origin[0]) * 111320 * Math.cos(latitude * Math.PI / 180), (lat - origin[1]) * 110540];
  const site = geographicSite.map(project); validRing(site, "AOI");
  const siteArea = area(site);
  assert.ok(massing && massing.featureCollection?.type === "FeatureCollection" && Array.isArray(massing.featureCollection.features), "Independent oracle requires actual geometry");
  const features = massing.featureCollection.features.map(feature => {
    assert.equal(feature.geometry.type, "Polygon", "Independent oracle requires Polygon footprints");
    const ring = geoRing(feature.geometry.coordinates, "Footprint").map(project); validRing(ring, "Footprint");
    assert.ok(ring.every(point => contains(point, site)), "Independent footprint outside AOI");
    for (const [a, b] of edges(ring)) for (const [c, d] of edges(site)) {
      assert.ok(!crosses(a, b, c, d), "Independent footprint crosses concave AOI boundary");
      assert.ok(Math.min(distance(a, c, d), distance(b, c, d), distance(c, a, b), distance(d, a, b)) >= controls.setbackM - 0.04,
        "Independent footprint violates requested setback (4cm numerical tolerance)");
    }
    const p = feature.properties;
    assert.ok(Number.isInteger(p.levels) && p.levels > 0 && Number.isFinite(p.baseM) && Number.isFinite(p.heightM) && p.baseM >= 0 && p.heightM > p.baseM,
      "Independent invalid levels/base/height");
    assert.ok(Math.abs(p.heightM - p.levels * 3.4) <= 0.05, "Independent height units differ from 3.4m storey model");
    assert.equal(p.primaryBlock, p.volumeRole !== "podium", "Independent primary block role differs");
    return { properties: p, ring, area: area(ring) };
  });
  assert.equal(new Set(features.map(item => item.properties.id)).size, features.length, "Independent duplicate feature IDs");
  const podiums = features.filter(item => item.properties.volumeRole === "podium");
  const primary = features.filter(item => item.properties.primaryBlock);
  for (const item of features) {
    if (item.properties.volumeRole === "tower") {
      const support = podiums.find(p => p.properties.id === item.properties.supportingPodiumId);
      assert.ok(support, "Independent tower requires explicit matching podium lineage");
      assert.ok(item.ring.every(point => contains(point, support.ring)) &&
        !edges(item.ring).some(([a, b]) => edges(support.ring).some(([c, d]) => crosses(a, b, c, d))), "Independent tower outside supporting podium");
      assert.ok(Math.abs(item.properties.baseM - support.properties.heightM) <= 0.05, "Independent tower base does not meet podium top");
    } else {
      assert.ok(item.properties.supportingPodiumId == null && Math.abs(item.properties.baseM) <= 0.05, "Independent ground volume has invalid support/base");
    }
  }
  for (const podium of podiums) assert.ok(features.some(item => item.properties.volumeRole === "tower" &&
    item.properties.supportingPodiumId === podium.properties.id), "Independent orphan podium");
  for (let i = 0; i < features.length; i++) for (let j = i + 1; j < features.length; j++) {
    const a = features[i], b = features[j];
    const stacked = (a.properties.volumeRole === "tower" && a.properties.supportingPodiumId === b.properties.id && b.properties.volumeRole === "podium") ||
      (b.properties.volumeRole === "tower" && b.properties.supportingPodiumId === a.properties.id && a.properties.volumeRole === "podium");
    if (!stacked) assert.ok(a.area + b.area - quality20IndependentUnionArea([a.ring, b.ring]) <= 0.05,
      "Independent unrelated footprints overlap");
  }
  assert.equal(primary.length, controls.blockCount, "Independent requested block count");
  assert.equal(massing.generatedBlockCount, primary.length, "Independent block-count metric");
  assert.equal(massing.requestedBlockCount, controls.blockCount, "Independent requested-count metric");
  assert.equal(massing.generatedFeatureCount, features.length, "Independent feature-count metric");
  const levels = primary.map(item => item.properties.levels);
  assert.ok(levels.every(level => level >= controls.levelsMin && level <= controls.levelsMax), "Independent primary level bounds");
  assert.equal(massing.minGeneratedLevels, Math.min(...levels), "Independent minimum levels metric");
  assert.equal(massing.maxGeneratedLevels, Math.max(...levels), "Independent maximum levels metric");
  const groundUnion = quality20IndependentUnionArea(features.map(item => item.ring));
  const coverage = groundUnion / siteArea * 100;
  const floorArea = features.reduce((sum, item) => sum + item.area * (item.properties.heightM - item.properties.baseM) / 3.4, 0);
  assert.ok(Math.abs(coverage - controls.targetSiteCoveragePct) <= 1, "Independent union coverage differs from requested control");
  assert.ok(100 - coverage >= controls.openSpacePct - 1, "Independent unbuilt-space allowance is not met");
  assert.ok(Math.abs(massing.aoiAreaSqM - siteArea) <= 1, "Independent AOI area metric");
  assert.ok(Math.abs(massing.generatedFootprintAreaSqM - groundUnion) <= 0.6, "Independent unique footprint metric");
  assert.ok(Math.abs(massing.achievedSiteCoveragePct - Number(coverage.toFixed(1))) <= 0.1, "Independent coverage metric");
  assert.ok(Math.abs(massing.estimatedFloorAreaSqM - floorArea) <= 1, "Independent floor-area metric");
  const centers = primary.map(item => [0, 1].map(axis => item.ring.reduce((sum, point) => sum + point[axis], 0) / item.ring.length));
  for (const axis of [0, 1]) {
    const span = (points: number[][]) => Math.max(...points.map(point => point[axis])) - Math.min(...points.map(point => point[axis]));
    assert.ok(span(centers) / span(site) > 0.4, `Independent distribution: primary centers must span >40% of site axis ${axis}`);
  }
  return { siteAreaSqM: siteArea, uniqueGroundAreaSqM: groundUnion, coveragePct: coverage, floorAreaSqM: floorArea };
}

export function assertQuality20CreateGeometry(selection: Quality20Selection, payload: unknown) {
  assert.equal(selection.definition.scope, "quality20-create");
  const frozen = selection.binding.create; assert.ok(frozen);
  const controls = quality20CreateControls(selection.definition.programme!);
  const vertices = frozen.coordinates as ConceptPosition[];
  const coordinates = [[...vertices, vertices[0]]];
  const aoi = { id: frozen.aoiId, coordinates, ...calculatePolygonMeasurements(vertices), vertexCount: vertices.length };
  const concept = parsePointObjectGeneratedConcept(payload, aoi);
  assert.ok(concept, "Create must return a complete parseable actual response");
  assert.equal(concept.program.templateId, selection.definition.programme);
  for (const [name, expected] of Object.entries(controls)) assert.equal(concept.program[name as keyof Controls], expected, `Locked ${name} changed`);
  assert.deepEqual(concept.alternatives?.map(item => item.id).sort(), ["A", "B"]);
  assert.deepEqual(concept.massing, concept.alternatives!.find(item => item.id === concept.massing.variantId)!.massing,
    "Top-level Create geometry must match its actual displayed alternative");
  assert.notDeepEqual(concept.alternatives![0].massing.featureCollection.features.map(item => item.geometry),
    concept.alternatives![1].massing.featureCollection.features.map(item => item.geometry), "A/B must differ in actual geometry");
  for (const alternative of concept.alternatives!) assertIndependentQuality20CreateMassing(coordinates, controls, alternative.massing);
  return concept;
}
