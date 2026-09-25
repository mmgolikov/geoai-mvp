import type { Feature, FeatureCollection, Polygon } from "geojson";
import { isConceptTemplateId, type ConceptMassingResult, type ConceptTemplateId, type PointObjectCreateAoi } from "./point-to-object-create";

type Point = [number, number];
type Ring = Point[];
export type ConceptEnvironmentProperties = {
  kind: "conceptual_open_space" | "conceptual_walkway";
  provenance: "conceptual";
  programme: ConceptTemplateId;
  variant: "A" | "B";
  material: "paving" | "permeable_surface";
};
export type ConceptEnvironment = {
  version: 1;
  key: string;
  status: "ready" | "partial" | "unavailable";
  reasons: string[];
  connected: boolean;
  plazaCount: number;
  featureCollection: FeatureCollection<Polygon, ConceptEnvironmentProperties>;
};

const PROFILES: Record<ConceptTemplateId, { plazas: number; plazaM: number; pathM: number; material: ConceptEnvironmentProperties["material"] }> = {
  residential_mixed_use: { plazas: 3, plazaM: 16, pathM: 3, material: "paving" },
  commercial_hub: { plazas: 2, plazaM: 20, pathM: 4, material: "paving" },
  civic_green: { plazas: 4, plazaM: 18, pathM: 3.2, material: "permeable_surface" },
  residential_quarter: { plazas: 4, plazaM: 12, pathM: 2.4, material: "permeable_surface" },
  hospitality_recreation: { plazas: 3, plazaM: 14, pathM: 2.8, material: "permeable_surface" }
};
const EPS = 1e-7;
const CLEARANCE_M = 0.75;
const GRID = 22;

function cross(a: Point, b: Point, c: Point): number { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function distance(a: Point, b: Point): number { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function pointSegmentDistance(p: Point, a: Point, b: Point): number {
  const length2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  const t = length2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / length2)) : 0;
  return distance(p, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
}
function intersects(a: Point, b: Point, c: Point, d: Point): boolean {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (abC * abD < 0 && cdA * cdB < 0) return true;
  return pointSegmentDistance(a, c, d) < EPS || pointSegmentDistance(b, c, d) < EPS ||
    pointSegmentDistance(c, a, b) < EPS || pointSegmentDistance(d, a, b) < EPS;
}
function edges(ring: Ring): Array<[Point, Point]> { return ring.map((p, i) => [p, ring[(i + 1) % ring.length]]); }
function inside(p: Point, ring: Ring): boolean {
  let result = false;
  for (const [a, b] of edges(ring)) {
    if (pointSegmentDistance(p, a, b) < EPS) return true;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function simple(ring: Ring): boolean {
  if (ring.length < 3 || ring.length > 128 || ring.some(p => !p.every(Number.isFinite))) return false;
  const segments = edges(ring);
  if (segments.some(([a, b]) => distance(a, b) < EPS)) return false;
  if (Math.abs(segments.reduce((sum, [a, b]) => sum + a[0] * b[1] - b[0] * a[1], 0)) < EPS) return false;
  return segments.every(([a, b], i) => segments.every(([c, d], j) =>
    i === j || (i + 1) % ring.length === j || (j + 1) % ring.length === i || !intersects(a, b, c, d)));
}
function boundariesTooClose(left: Ring, right: Ring, clearance = CLEARANCE_M): boolean {
  return edges(left).some(([a, b]) => edges(right).some(([c, d]) => intersects(a, b, c, d) ||
    Math.min(pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d), pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b)) < clearance));
}
function overlaps(left: Ring, right: Ring): boolean {
  return boundariesTooClose(left, right) || inside(left[0], right) || inside(right[0], left);
}
function square(center: Point, size: number): Ring {
  const h = size / 2;
  return [[center[0] - h, center[1] - h], [center[0] + h, center[1] - h], [center[0] + h, center[1] + h], [center[0] - h, center[1] + h]];
}
function corridor(a: Point, b: Point, width: number): Ring | null {
  const length = distance(a, b);
  if (length < width / 2) return null;
  const x = -(b[1] - a[1]) / length * width / 2, y = (b[0] - a[0]) / length * width / 2;
  return [[a[0] + x, a[1] + y], [b[0] + x, b[1] + y], [b[0] - x, b[1] - y], [a[0] - x, a[1] - y]];
}
function hash(value: unknown): string {
  let h = 2166136261;
  for (const character of JSON.stringify(value)) h = Math.imul(h ^ character.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}
function sceneGeometry(aoi: PointObjectCreateAoi, massing: ConceptMassingResult) {
  if (!aoi.coordinates.length || aoi.coordinates.length > 16 || massing.featureCollection.features.length > 24) return null;
  const origin = aoi.coordinates[0]?.[0];
  if (!origin || !origin.every(Number.isFinite) || Math.abs(origin[1]) > 85) return null;
  const scaleX = 111320 * Math.cos(origin[1] * Math.PI / 180);
  const forward = (p: number[]): Point => [(p[0] - origin[0]) * scaleX, (p[1] - origin[1]) * 110540];
  const inverse = (p: Point): Point => [origin[0] + p[0] / scaleX, origin[1] + p[1] / 110540];
  const convert = (coordinates: number[][]): Ring => {
    if (coordinates.some(p => p.length !== 2 || !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)) return [];
    const ring = coordinates.map(forward);
    if (ring.length > 1 && distance(ring[0], ring.at(-1)!) < EPS) ring.pop();
    return ring;
  };
  const site = aoi.coordinates.map(convert);
  // Conservatively exclude the whole exterior building footprint, including
  // podiums. Building courtyards are not assumed publicly accessible.
  const buildings = massing.featureCollection.features.map(f => convert(f.geometry.coordinates[0]));
  if (![...site, ...buildings].every(simple)) return null;
  const [outer, ...holes] = site;
  if (holes.some(hole => !hole.every(p => inside(p, outer)) || boundariesTooClose(hole, outer, EPS)) ||
    holes.some((hole, i) => holes.slice(i + 1).some(other => overlaps(hole, other)))) return null;
  const valid = (candidate: Ring): boolean => simple(candidate) && candidate.every(p => inside(p, outer)) &&
    !boundariesTooClose(candidate, outer) && !holes.some(hole => overlaps(candidate, hole)) && !buildings.some(building => overlaps(candidate, building));
  return { site, valid, inverse, convert };
}

/** Pure derived presentation. No AI, source request, storage write or building/KPI mutation. */
function generateConceptEnvironment(aoi: PointObjectCreateAoi, massing: ConceptMassingResult): ConceptEnvironment {
  const result: ConceptEnvironment = { version: 1, key: hash([aoi.coordinates, massing.featureCollection, massing.variantId]),
    status: "unavailable", reasons: [], connected: false, plazaCount: 0, featureCollection: { type: "FeatureCollection", features: [] } };
  const programme = massing.featureCollection.features[0]?.properties.templateId;
  const scene = sceneGeometry(aoi, massing);
  if (!scene || !isConceptTemplateId(programme)) { result.reasons.push("invalid_scene_geometry"); return result; }
  const profile = PROFILES[programme];
  const ring = scene.site[0];
  const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), spanX = Math.max(...xs) - minX, spanY = Math.max(...ys) - minY;
  if (Math.max(spanX, spanY) > 20000 || Math.min(spanX, spanY) < profile.pathM * 2) { result.reasons.push("site_outside_environment_bounds"); return result; }
  const nodes = new Map<number, Point>();
  const graph = new Map<number, number[]>();
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const point: Point = [minX + (x + 0.5) / GRID * spanX, minY + (y + 0.5) / GRID * spanY];
    if (scene.valid(square(point, profile.pathM))) { nodes.set(y * GRID + x, point); graph.set(y * GRID + x, []); }
  }
  for (const [id, point] of nodes) for (const neighbour of [id % GRID < GRID - 1 ? id + 1 : -1, id + GRID]) {
    const next = nodes.get(neighbour);
    if (!next) continue;
    const link = corridor(point, next, profile.pathM);
    if (link && scene.valid(link)) { graph.get(id)!.push(neighbour); graph.get(neighbour)!.push(id); }
  }
  const visited = new Set<number>();
  const components: number[][] = [];
  for (const start of nodes.keys()) {
    if (visited.has(start)) continue;
    const component = [start]; visited.add(start);
    for (let i = 0; i < component.length; i++) for (const next of graph.get(component[i])!) {
      if (!visited.has(next)) { visited.add(next); component.push(next); }
    }
    components.push(component);
  }
  const available = components.sort((a, b) => b.length - a.length)[0] ?? [];
  const plazas = available.filter(id => scene.valid(square(nodes.get(id)!, profile.plazaM)));
  if (!plazas.length) { result.reasons.push("no_valid_open_space_candidate"); return result; }
  const target: Point = [minX + spanX * (massing.variantId === "A" ? 0.35 : 0.65), minY + spanY * 0.5];
  plazas.sort((a, b) => distance(nodes.get(a)!, target) - distance(nodes.get(b)!, target) || a - b);
  const chosen = [plazas[0]];
  while (chosen.length < profile.plazas) {
    const candidates = plazas.filter(id => !chosen.includes(id) && chosen.every(other => distance(nodes.get(id)!, nodes.get(other)!) > profile.plazaM * 2));
    candidates.sort((a, b) => Math.min(...chosen.map(id => distance(nodes.get(b)!, nodes.get(id)!))) - Math.min(...chosen.map(id => distance(nodes.get(a)!, nodes.get(id)!))) || a - b);
    if (!candidates.length) break;
    chosen.push(candidates[0]);
  }
  const add = (candidate: Ring, kind: ConceptEnvironmentProperties["kind"]) => {
    if (!scene.valid(candidate)) { result.reasons.push("invalid_decorative_element_omitted"); return; }
    const coordinates = candidate.map(scene.inverse);
    result.featureCollection.features.push({ type: "Feature", id: `concept-environment-${result.featureCollection.features.length}`,
      properties: { kind, provenance: "conceptual", programme, variant: massing.variantId, material: kind === "conceptual_walkway" ? "paving" : profile.material },
      geometry: { type: "Polygon", coordinates: [[...coordinates, coordinates[0]]] } });
  };
  for (const id of chosen) add(square(nodes.get(id)!, profile.plazaM), "conceptual_open_space");
  const usedLinks = new Set<string>();
  for (const destination of chosen.slice(1)) {
    const queue = [chosen[0]], previous = new Map<number, number | null>([[chosen[0], null]]);
    for (let i = 0; i < queue.length && !previous.has(destination); i++) for (const next of graph.get(queue[i])!) {
      if (!previous.has(next)) { previous.set(next, queue[i]); queue.push(next); }
    }
    if (!previous.has(destination)) { result.reasons.push("disconnected_open_space_omitted"); continue; }
    let cursor = destination;
    while (previous.get(cursor) !== null) {
      const parent = previous.get(cursor)!;
      const key = [cursor, parent].sort((a, b) => a - b).join(":");
      if (!usedLinks.has(key)) { usedLinks.add(key); add(corridor(nodes.get(cursor)!, nodes.get(parent)!, profile.pathM)!, "conceptual_walkway"); }
      cursor = parent;
    }
  }
  result.plazaCount = chosen.length;
  result.connected = chosen.length > 1 && result.reasons.length === 0;
  if (chosen.length < profile.plazas) result.reasons.push("some_open_spaces_did_not_fit");
  result.status = result.reasons.length ? "partial" : "ready";
  return result;
}

const cache = new Map<string, ConceptEnvironment>();
export function buildConceptEnvironment(aoi: PointObjectCreateAoi, massing: ConceptMassingResult): ConceptEnvironment {
  // Include the complete serialized input in the cache identity, not only the
  // short presentation key, so a hash collision cannot reuse a different site.
  const identity = JSON.stringify([aoi.coordinates, massing.featureCollection, massing.variantId]);
  const previous = cache.get(identity);
  if (previous) return previous;
  const result = generateConceptEnvironment(aoi, massing);
  if (cache.size >= 12) cache.delete(cache.keys().next().value!);
  cache.set(identity, result);
  return result;
}

/** Recheck derived/exported candidates against the complete site and building rings. */
export function validateConceptEnvironment(aoi: PointObjectCreateAoi, massing: ConceptMassingResult, environment: ConceptEnvironment): string[] {
  const scene = sceneGeometry(aoi, massing);
  if (!scene) return ["invalid_scene_geometry"];
  return environment.featureCollection.features.flatMap((feature: Feature<Polygon, ConceptEnvironmentProperties>) =>
    feature.properties.provenance === "conceptual" && feature.geometry.coordinates.length === 1 && scene.valid(scene.convert(feature.geometry.coordinates[0]))
      ? [] : [`invalid_environment_feature:${String(feature.id)}`]);
}
