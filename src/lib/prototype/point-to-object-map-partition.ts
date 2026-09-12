import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon, Position } from "geojson";
import type { FilterSpecification } from "maplibre-gl";
import { buildPointObjectNativeSelectionOutside, validatePointObjectReplacementAoi } from "./point-to-object-map-replacement";

type BuildingGeometry = Polygon | MultiPolygon;
const EPSILON = 1e-16;

export const pointObjectCompleteFootprintOverlapThreshold = 0.5;
// Rendering policy: a measurable positive intersection hides the entire
// stable source parent. This tiny floor rejects numerical boundary-touch noise
// while remaining far below any visible building footprint.
export const pointObjectVisualReplacementMinimumOverlapSqM = 0.0001;
export const pointObjectCompleteFootprintMaxSourceFeatures = 2_000;
export const pointObjectCompleteFootprintMaxSourcePositions = 120_000;
export const pointObjectCompleteFootprintMaxParents = 1_000;
export const pointObjectCompleteFootprintMaxMemberVertices = 1_000;
export const pointObjectCompleteFootprintMaxAggregateAnchors = 512;
export const pointObjectCompleteFootprintMaxRetainedMembers = 512;
export const pointObjectCompleteFootprintMaxRetainedPositions = 8_000;
export const pointObjectCompleteFootprintMaxPredicates = 1_000;
// Ear clipping is quadratic in a single detailed ring. Many small Planetiler
// aggregate members are cheap, while a collection of highly detailed members
// must fail before it can monopolise the map UI thread.
export const pointObjectCompleteFootprintMaxGeometryWork = 2_000_000;

type MetricPosition = [number, number];
type Primitive = string | number | boolean | null;

export type PointObjectTileBackedBuildingFeature = Feature<BuildingGeometry> & {
  tile?: { z: number; x: number; y: number };
  _vectorTileFeature?: {
    extent?: number;
    loadGeometry?: () => Array<Array<{ x: number; y: number }>>;
  };
};

export type PointObjectBuildingReplacementPlan = {
  coverage: "complete" | "partial";
  examinedFeatures: number;
  completeParents: number;
  hiddenParents: number;
  tileMatchedParents: number;
  unknownFeatures: number;
  sourcePositions: number;
  predicates: FilterSpecification[];
  retained: FeatureCollection<BuildingGeometry>;
  reason: string | null;
};
export type PointObjectCompleteFootprintPlan = PointObjectBuildingReplacementPlan;

function cross(a: Position, b: Position, c: Position) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

/** -1 outside, 0 on the boundary, 1 inside. */
function ringLocation(point: Position, ring: Position[]): number {
  let inside = false;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]; const b = ring[i + 1];
    if (Math.abs(cross(a, b, point)) <= EPSILON && point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0]) && point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1])) return 0;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside ? 1 : -1;
}

function polygonLocation(point: Position, polygon: Position[][]): number {
  const exterior = ringLocation(point, polygon[0]);
  if (exterior < 0) return -1;
  for (const hole of polygon.slice(1)) {
    const location = ringLocation(point, hole);
    if (location > 0) return -1;
    if (location === 0) return 0;
  }
  return exterior;
}

function segmentInside(a: Position, b: Position, aoi: Polygon): boolean {
  if (polygonLocation(a, aoi.coordinates) < 0 || polygonLocation(b, aoi.coordinates) < 0) return false;
  const dx = b[0] - a[0]; const dy = b[1] - a[1];
  const parameters = [0, 1];
  for (const ring of aoi.coordinates) for (let i = 0; i < ring.length - 1; i++) {
    const c = ring[i]; const d = ring[i + 1];
    const ex = d[0] - c[0]; const ey = d[1] - c[1];
    const denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) <= EPSILON) {
      if (Math.abs(cross(a, b, c)) <= EPSILON) {
        const lengthSq = dx * dx + dy * dy;
        if (lengthSq) for (const point of [c, d]) {
          const t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq;
          if (t > 0 && t < 1) parameters.push(t);
        }
      }
      continue;
    }
    const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / denominator;
    const u = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / denominator;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) parameters.push(t);
  }
  parameters.sort((left, right) => left - right);
  for (let i = 1; i < parameters.length; i++) {
    const t = (parameters[i - 1] + parameters[i]) / 2;
    if (polygonLocation([a[0] + dx * t, a[1] + dy * t], aoi.coordinates) < 0) return false;
  }
  return true;
}

/** A complete filled Polygon fits. Holes and concave AOIs remain significant. */
export function pointObjectPolygonWhollyInAoi(polygon: Polygon, aoi: Polygon): boolean {
  if (!validatePointObjectReplacementAoi(polygon).valid) return false;
  const exterior = polygon.coordinates[0];
  for (let i = 0; i < exterior.length - 1; i++) if (!segmentInside(exterior[i], exterior[i + 1], aoi)) return false;
  // An AOI exclusion island wholly surrounded by a footprint can escape edge
  // intersection checks. It must also be excluded by a source courtyard/hole.
  for (const hole of aoi.coordinates.slice(1)) for (let i = 0; i < hole.length - 1; i++) {
    const a = hole[i]; const b = hole[i + 1];
    if (polygonLocation(a, polygon.coordinates) > 0 || polygonLocation([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], polygon.coordinates) > 0) return false;
  }
  return true;
}

export type PointObjectMapPartition = {
  retained: Feature<BuildingGeometry> | null;
  hiddenMembers: number;
  retainedMembers: number;
  valid: boolean;
};

/**
 * Planetiler can package independent footprints as one tile MultiPolygon.
 * Partition its complete Polygon members; never create an intersection, clip
 * an edge, infer physical-building identity or alter a retained coordinate.
 */
export function partitionPointObjectMapBuilding(feature: Feature<BuildingGeometry>, aoi: Polygon): PointObjectMapPartition {
  const parts = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const unchanged = () => ({ retained: structuredClone(feature), hiddenMembers: 0, retainedMembers: parts.length, valid: false });
  if (!validatePointObjectReplacementAoi(aoi).valid || parts.length > 512 || parts.reduce((sum, part) => sum + part.reduce((n, ring) => n + ring.length, 0), 0) > 8_000) return unchanged();
  if (parts.some(coordinates => !validatePointObjectReplacementAoi({ type: "Polygon", coordinates }).valid)) return unchanged();
  const retained = parts.filter(coordinates => !pointObjectPolygonWhollyInAoi({ type: "Polygon", coordinates }, aoi));
  if (retained.length === parts.length) return { retained: structuredClone(feature), hiddenMembers: 0, retainedMembers: parts.length, valid: true };
  return {
    retained: retained.length ? { ...structuredClone(feature), geometry: feature.geometry.type === "Polygon" ? { type: "Polygon", coordinates: structuredClone(retained[0]) } : { type: "MultiPolygon", coordinates: structuredClone(retained) } } : null,
    hiddenMembers: parts.length - retained.length,
    retainedMembers: retained.length,
    valid: true
  };
}

/** Suppress only native geometry covered by a prepared retained-geometry copy. */
export function pointObjectPreparedPartitionPredicate(feature: Feature<BuildingGeometry>): FilterSpecification | null {
  const outside = buildPointObjectNativeSelectionOutside(feature.geometry);
  if (!outside) return null;
  const properties = Object.entries(feature.properties ?? {});
  if (properties.length > 40 || properties.some(([, value]) => value !== null && !["string", "number", "boolean"].includes(typeof value))) return null;
  return ["all",
    ...(feature.id === undefined ? [] : [["==", ["to-string", ["id"]], String(feature.id)]]),
    ...properties.map(([key, value]) => ["==", ["get", key], value]),
    ["==", ["distance", feature.geometry], 0],
    [">", ["distance", outside], 0]
  ] as unknown as FilterSpecification;
}

function geometryPolygons(geometry: BuildingGeometry): Position[][][] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

function geometryPositionCount(geometry: BuildingGeometry): number {
  return geometryPolygons(geometry).reduce(
    (sum, polygon) => sum + polygon.reduce((ringSum, ring) => ringSum + ring.length, 0),
    0
  );
}

function polygonPositionCount(coordinates: Position[][]): number {
  return coordinates.reduce((sum, ring) => sum + ring.length, 0);
}

function polygonBounds(coordinates: Position[][]): [number, number, number, number] | null {
  let west = Infinity; let south = Infinity; let east = -Infinity; let north = -Infinity;
  for (const ring of coordinates) for (const position of ring) {
    if (!Array.isArray(position) || position.length < 2 ||
      !Number.isFinite(position[0]) || !Number.isFinite(position[1])) return null;
    west = Math.min(west, position[0]); south = Math.min(south, position[1]);
    east = Math.max(east, position[0]); north = Math.max(north, position[1]);
  }
  if (!Number.isFinite(west) || east - west > 180) return null;
  return [west, south, east, north];
}

function projectGeometryOrigin(aoi: Polygon): { longitude: number; latitude: number; longitudeScale: number } {
  const exterior = aoi.coordinates[0];
  const longitude = exterior.reduce((sum, position) => sum + position[0], 0) / exterior.length;
  const latitude = exterior.reduce((sum, position) => sum + position[1], 0) / exterior.length;
  return { longitude, latitude, longitudeScale: 111_320 * Math.max(0.01, Math.cos(latitude * Math.PI / 180)) };
}

function metricRing(
  ring: Position[],
  origin: ReturnType<typeof projectGeometryOrigin>
): MetricPosition[] {
  const open = ring.slice(0, -1).map(([longitude, latitude]) => [
    (longitude - origin.longitude) * origin.longitudeScale,
    (latitude - origin.latitude) * 110_574
  ] as MetricPosition);
  const cleaned: MetricPosition[] = [];
  for (const point of open) {
    const previous = cleaned.at(-1);
    if (!previous || Math.hypot(point[0] - previous[0], point[1] - previous[1]) > 1e-7) cleaned.push(point);
  }
  let changed = true;
  while (changed && cleaned.length > 3) {
    changed = false;
    for (let index = 0; index < cleaned.length; index += 1) {
      const previous = cleaned[(index + cleaned.length - 1) % cleaned.length];
      const current = cleaned[index];
      const next = cleaned[(index + 1) % cleaned.length];
      if (Math.abs(cross(previous, current, next)) <= 1e-8) {
        cleaned.splice(index, 1);
        changed = true;
        break;
      }
    }
  }
  return cleaned;
}

function openSignedArea(ring: MetricPosition[]): number {
  let twiceArea = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    twiceArea += current[0] * next[1] - next[0] * current[1];
  }
  return twiceArea / 2;
}

function pointInMetricTriangle(point: MetricPosition, a: MetricPosition, b: MetricPosition, c: MetricPosition): boolean {
  const first = cross(a, b, point);
  const second = cross(b, c, point);
  const third = cross(c, a, point);
  return first >= -1e-8 && second >= -1e-8 && third >= -1e-8;
}

/** Ear clipping for one validated simple ring. Returns CCW triangles. */
function triangulateRing(ringInput: MetricPosition[]): MetricPosition[][] | null {
  if (ringInput.length < 3) return null;
  const ring = openSignedArea(ringInput) < 0 ? [...ringInput].reverse() : [...ringInput];
  if (Math.abs(openSignedArea(ring)) <= 1e-8) return null;
  const indices = ring.map((_, index) => index);
  const triangles: MetricPosition[][] = [];
  let guard = 0;
  while (indices.length > 3 && guard < ring.length * ring.length) {
    let found = false;
    for (let cursor = 0; cursor < indices.length; cursor += 1) {
      const previous = indices[(cursor + indices.length - 1) % indices.length];
      const current = indices[cursor];
      const next = indices[(cursor + 1) % indices.length];
      const a = ring[previous]; const b = ring[current]; const c = ring[next];
      if (cross(a, b, c) <= 1e-8) continue;
      if (indices.some((candidate) => candidate !== previous && candidate !== current && candidate !== next &&
        pointInMetricTriangle(ring[candidate], a, b, c))) continue;
      triangles.push([a, b, c]);
      indices.splice(cursor, 1);
      found = true;
      break;
    }
    if (!found) return null;
    guard += 1;
  }
  if (indices.length !== 3) return null;
  const triangle = indices.map((index) => ring[index]);
  if (cross(triangle[0], triangle[1], triangle[2]) <= 1e-8) return null;
  triangles.push(triangle);
  return triangles;
}

function lineIntersection(
  start: MetricPosition,
  end: MetricPosition,
  clipStart: MetricPosition,
  clipEnd: MetricPosition
): MetricPosition {
  const segmentX = end[0] - start[0];
  const segmentY = end[1] - start[1];
  const clipX = clipEnd[0] - clipStart[0];
  const clipY = clipEnd[1] - clipStart[1];
  const denominator = segmentX * clipY - segmentY * clipX;
  if (Math.abs(denominator) <= 1e-12) return [...end];
  const parameter = ((clipStart[0] - start[0]) * clipY - (clipStart[1] - start[1]) * clipX) / denominator;
  return [start[0] + parameter * segmentX, start[1] + parameter * segmentY];
}

/** Clip one CCW triangle by another and return their positive intersection area. */
function triangleIntersectionArea(subject: MetricPosition[], clip: MetricPosition[]): number {
  let output = subject.map((point) => [...point] as MetricPosition);
  for (let edge = 0; edge < clip.length; edge += 1) {
    const clipStart = clip[edge];
    const clipEnd = clip[(edge + 1) % clip.length];
    const input = output;
    output = [];
    if (!input.length) break;
    let start = input.at(-1)!;
    for (const end of input) {
      const startInside = cross(clipStart, clipEnd, start) >= -1e-8;
      const endInside = cross(clipStart, clipEnd, end) >= -1e-8;
      if (endInside) {
        if (!startInside) output.push(lineIntersection(start, end, clipStart, clipEnd));
        output.push(end);
      } else if (startInside) {
        output.push(lineIntersection(start, end, clipStart, clipEnd));
      }
      start = end;
    }
  }
  return output.length >= 3 ? Math.abs(openSignedArea(output)) : 0;
}

function triangleSetArea(triangles: MetricPosition[][]): number {
  return triangles.reduce((sum, triangle) => sum + Math.abs(openSignedArea(triangle)), 0);
}

function triangleSetIntersection(first: MetricPosition[][], second: MetricPosition[][]): number {
  let area = 0;
  for (const left of first) for (const right of second) area += triangleIntersectionArea(left, right);
  return area;
}

type TriangulatedPolygon = { exterior: MetricPosition[][]; holes: MetricPosition[][][]; area: number };

function triangulatedPolygon(
  coordinates: Position[][],
  origin: ReturnType<typeof projectGeometryOrigin>
): TriangulatedPolygon | null {
  if (!validatePointObjectReplacementAoi({ type: "Polygon", coordinates }).valid) return null;
  const exterior = triangulateRing(metricRing(coordinates[0], origin));
  const holes = coordinates.slice(1).map((ring) => triangulateRing(metricRing(ring, origin)));
  if (!exterior || holes.some((triangles) => triangles === null)) return null;
  const validHoles = holes as MetricPosition[][][];
  const area = triangleSetArea(exterior) - validHoles.reduce((sum, triangles) => sum + triangleSetArea(triangles), 0);
  return area > 1e-6 ? { exterior, holes: validHoles, area } : null;
}

function triangulatedPolygonIntersection(first: TriangulatedPolygon, second: TriangulatedPolygon): number {
  let area = triangleSetIntersection(first.exterior, second.exterior);
  for (const hole of first.holes) area -= triangleSetIntersection(hole, second.exterior);
  for (const hole of second.holes) area -= triangleSetIntersection(first.exterior, hole);
  for (const firstHole of first.holes) for (const secondHole of second.holes) area += triangleSetIntersection(firstHole, secondHole);
  return Math.max(0, area);
}

/**
 * Exact planar overlap for a validated complete source footprint. The local
 * metric projection is shared by numerator and denominator, so the 50% policy
 * remains stable while holes and all MultiPolygon members retain their area.
 */
export function pointObjectCompleteFootprintOverlap(
  geometry: BuildingGeometry,
  aoi: Polygon
): { areaSqM: number; overlapSqM: number; fraction: number } | null {
  if (!validatePointObjectReplacementAoi(aoi).valid) return null;
  const origin = projectGeometryOrigin(aoi);
  const aoiPolygon = triangulatedPolygon(aoi.coordinates, origin);
  if (!aoiPolygon) return null;
  const polygons = geometryPolygons(geometry).map((coordinates) => triangulatedPolygon(coordinates, origin));
  if (polygons.some((polygon) => polygon === null)) return null;
  const validPolygons = polygons as TriangulatedPolygon[];
  const areaSqM = validPolygons.reduce((sum, polygon) => sum + polygon.area, 0);
  const overlapSqM = Math.min(areaSqM, validPolygons.reduce((sum, polygon) => sum + triangulatedPolygonIntersection(polygon, aoiPolygon), 0));
  if (areaSqM <= 1e-6) return null;
  return { areaSqM, overlapSqM, fraction: Math.max(0, Math.min(1, overlapSqM / areaSqM)) };
}

function completeTileGeometry(feature: PointObjectTileBackedBuildingFeature): boolean {
  const vector = feature._vectorTileFeature;
  const extent = vector?.extent;
  if (!Number.isFinite(extent) || (extent ?? 0) <= 0 || typeof vector?.loadGeometry !== "function") return false;
  let rings: Array<Array<{ x: number; y: number }>>;
  try {
    rings = vector.loadGeometry();
  } catch {
    return false;
  }
  if (!rings.length) return false;
  // A source-tile clip is never promoted to a complete building. Remaining
  // strictly inside the canonical tile core is a conservative completeness
  // proof; buffered/seam features are left native unless another core tile
  // supplies the whole same parent geometry.
  return rings.every((ring) => ring.length >= 4 && ring.every(({ x, y }) =>
    Number.isFinite(x) && Number.isFinite(y) && x > 0 && y > 0 && x < extent! && y < extent!
  ));
}

function primitiveProperties(value: Feature["properties"]): Record<string, Primitive> | null {
  if (!value) return {};
  const entries = Object.entries(value);
  if (entries.length > 40) return null;
  const result: Record<string, Primitive> = {};
  for (const [key, item] of entries) {
    if (item !== null && !["string", "number", "boolean"].includes(typeof item)) return null;
    if (typeof item === "number" && !Number.isFinite(item)) return null;
    result[key] = item as Primitive;
  }
  return result;
}

function compareRoundedPosition(left: Position, right: Position): number {
  return left[0] - right[0] || left[1] - right[1];
}

function compareRoundedSequence(left: Position[], right: Position[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const compared = compareRoundedPosition(left[index], right[index]);
    if (compared) return compared;
  }
  return left.length - right.length;
}

function compareCodeUnit(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Booth-style least rotation; O(n) memory/time for one ring. */
function leastRoundedRotation(positions: Position[]): Position[] {
  const length = positions.length;
  if (length < 2) return [...positions];
  let left = 0;
  let right = 1;
  let offset = 0;
  while (left < length && right < length && offset < length) {
    const compared = compareRoundedPosition(
      positions[(left + offset) % length],
      positions[(right + offset) % length]
    );
    if (compared === 0) {
      offset += 1;
      continue;
    }
    if (compared > 0) {
      left += offset + 1;
      if (left <= right) left = right + 1;
    } else {
      right += offset + 1;
      if (right <= left) right = left + 1;
    }
    offset = 0;
  }
  const start = Math.min(left, right);
  return positions.map((_, index) => positions[(start + index) % length]);
}

function canonicalRoundedRing(ring: Position[]): Position[] {
  const open = ring.slice(0, -1).map(([longitude, latitude]) => [
    Number(longitude.toFixed(9)), Number(latitude.toFixed(9))
  ] as Position);
  const forward = leastRoundedRotation(open);
  const backward = leastRoundedRotation([...open].reverse());
  const selected = compareRoundedSequence(forward, backward) <= 0 ? forward : backward;
  return selected.length ? [...selected, [...selected[0]]] : [];
}

function canonicalRoundedPolygon(polygon: Position[][]): Position[][] {
  const exterior = canonicalRoundedRing(polygon[0] ?? []);
  const holes = polygon.slice(1).map(canonicalRoundedRing)
    .map((ring) => ({ ring, key: JSON.stringify(ring) }))
    .sort((left, right) => compareCodeUnit(left.key, right.key))
    .map(({ ring }) => ring);
  return [exterior, ...holes];
}

function roundedGeometryKey(geometry: BuildingGeometry): string {
  const polygons = geometryPolygons(geometry).map(canonicalRoundedPolygon)
    .map((polygon) => ({ polygon, key: JSON.stringify(polygon) }))
    .sort((left, right) => compareCodeUnit(left.key, right.key))
    .map(({ polygon }) => polygon);
  return JSON.stringify(polygons);
}

function roundedPolygonKey(coordinates: Position[][]): string {
  return JSON.stringify(canonicalRoundedPolygon(coordinates));
}

function parentKey(feature: PointObjectTileBackedBuildingFeature, properties: Record<string, Primitive>): string {
  const explicitIdentity = feature.id ?? properties.osm_id ?? properties.id ?? null;
  return explicitIdentity === null
    ? `anonymous:${roundedGeometryKey(feature.geometry)}`
    : JSON.stringify([String(explicitIdentity), Object.entries(properties).sort(([left], [right]) => compareCodeUnit(left, right))]);
}

/** Suppress every tile fragment contained by one proven-complete parent only. */
export function pointObjectPreparedCompleteFootprintPredicate(
  feature: Feature<BuildingGeometry>
): FilterSpecification | null {
  const outside = buildPointObjectNativeSelectionOutside(feature.geometry);
  const properties = primitiveProperties(feature.properties);
  if (!outside || !properties) return null;
  return ["all",
    ...(feature.id === undefined ? [] : [["==", ["to-string", ["id"]], String(feature.id)]]),
    ...Object.entries(properties).map(([key, value]) => ["==", ["get", key], value]),
    ["==", ["distance", feature.geometry], 0],
    [">", ["distance", outside], 0]
  ] as unknown as FilterSpecification;
}

/**
 * Match a canonical vector parent without asserting that an observed tile
 * fragment is its full footprint. OSM-backed vector IDs are stable across tile
 * fragments; primitive properties prevent a colliding synthetic/reused ID
 * from suppressing an unrelated object.
 */
export function pointObjectStableParentPredicate(
  feature: Pick<Feature<BuildingGeometry>, "id" | "properties">
): FilterSpecification | null {
  const properties = primitiveProperties(feature.properties);
  if (!properties) return null;
  const explicitIdentity = feature.id ?? properties.osm_id ?? properties.id ?? null;
  if (explicitIdentity === null) return null;
  return ["all",
    ...(feature.id === undefined ? [] : [["==", ["to-string", ["id"]], String(feature.id)]]),
    ...Object.entries(properties).map(([key, value]) => ["==", ["get", key], value])
  ] as unknown as FilterSpecification;
}

function meanPosition(ring: Position[]): Position | null {
  const open = ring.slice(0, -1);
  if (!open.length) return null;
  return [
    open.reduce((sum, position) => sum + position[0], 0) / open.length,
    open.reduce((sum, position) => sum + position[1], 0) / open.length
  ];
}

function properSegmentIntersection(a: Position, b: Position, c: Position, d: Position): Position | null {
  const abX = b[0] - a[0]; const abY = b[1] - a[1];
  const cdX = d[0] - c[0]; const cdY = d[1] - c[1];
  const denominator = abX * cdY - abY * cdX;
  if (Math.abs(denominator) <= EPSILON) return null;
  const t = ((c[0] - a[0]) * cdY - (c[1] - a[1]) * cdX) / denominator;
  const u = ((c[0] - a[0]) * abY - (c[1] - a[1]) * abX) / denominator;
  if (t <= EPSILON || t >= 1 - EPSILON || u <= EPSILON || u >= 1 - EPSILON) return null;
  return [a[0] + t * abX, a[1] + t * abY];
}

type PositiveIntersectionResult =
  | { measurable: false; anchor: null }
  | { measurable: true; anchor: Position | null };

/** Return a small filter anchor only after proving positive filled-area overlap. */
function positiveIntersectionAnchor(coordinates: Position[][], aoi: Polygon): PositiveIntersectionResult {
  const polygon: Polygon = { type: "Polygon", coordinates };
  // Even a bbox-disjoint sibling is copied into retained GeoJSON once its
  // aggregate is masked. Validate it first so a malformed outside member can
  // never be promoted into that replacement source.
  if (!validatePointObjectReplacementAoi(polygon).valid) return { measurable: false, anchor: null };
  const sourceBounds = polygonBounds(coordinates);
  const aoiBounds = polygonBounds(aoi.coordinates);
  if (sourceBounds && aoiBounds && (
    sourceBounds[2] < aoiBounds[0] || sourceBounds[0] > aoiBounds[2] ||
    sourceBounds[3] < aoiBounds[1] || sourceBounds[1] > aoiBounds[3]
  )) return { measurable: true, anchor: null };
  const measured = pointObjectCompleteFootprintOverlap(polygon, aoi);
  if (!measured) return { measurable: false, anchor: null };
  if (measured.overlapSqM <= pointObjectVisualReplacementMinimumOverlapSqM) return { measurable: true, anchor: null };
  const exterior = coordinates[0] ?? [];
  const aoiExterior = aoi.coordinates[0] ?? [];
  const candidates: Position[] = [];
  const addRingCandidates = (ring: Position[]) => {
    const mean = meanPosition(ring);
    if (mean) candidates.push(mean);
    for (let index = 0; index < ring.length - 1; index += 1) {
      const current = ring[index]; const next = ring[index + 1];
      candidates.push(current, [(current[0] + next[0]) / 2, (current[1] + next[1]) / 2]);
    }
  };
  addRingCandidates(exterior);
  addRingCandidates(aoiExterior);
  for (const candidate of candidates) {
    const sourceLocation = polygonLocation(candidate, coordinates);
    const aoiLocation = polygonLocation(candidate, aoi.coordinates);
    if (sourceLocation >= 0 && aoiLocation >= 0 && (sourceLocation > 0 || aoiLocation > 0)) {
      return { measurable: true, anchor: candidate };
    }
  }
  for (let sourceIndex = 0; sourceIndex < exterior.length - 1; sourceIndex += 1) {
    for (let aoiIndex = 0; aoiIndex < aoiExterior.length - 1; aoiIndex += 1) {
      const crossing = properSegmentIntersection(
        exterior[sourceIndex], exterior[sourceIndex + 1], aoiExterior[aoiIndex], aoiExterior[aoiIndex + 1]
      );
      if (crossing) return { measurable: true, anchor: crossing };
    }
  }
  // Identical or wholly coincident valid boundaries can lack a strict vertex.
  // A positive measured area still makes any shared boundary point a valid
  // geometry-filter anchor; a mere touch was rejected above as zero area.
  return { measurable: true, anchor: exterior[0] ?? null };
}

/**
 * Mask one exact source-tile aggregate using tiny points in members selected
 * for hiding. The retained sibling members are rendered from a GeoJSON copy,
 * so Planetiler/OpenMapTiles aggregation never erases unrelated buildings.
 */
export function pointObjectPreparedTileFragmentPredicate(
  feature: Pick<Feature<BuildingGeometry>, "id" | "properties">,
  anchors: readonly Position[]
): FilterSpecification | null {
  const identity = pointObjectStableParentPredicate(feature) as unknown as unknown[] | null;
  if (!identity || !anchors.length || anchors.length > pointObjectCompleteFootprintMaxAggregateAnchors) return null;
  return ["all",
    ...identity.slice(1),
    ["any", ...anchors.map((coordinates) => [
      "==", ["distance", { type: "Point", coordinates } satisfies Point], 0
    ])]
  ] as unknown as FilterSpecification;
}

/**
 * Build one bounded visual replacement plan, independent of context-summary
 * and sample caps. Complete footprints retain an analytic 50% measurement,
 * while the renderer uses one consistent, explicitly approved visual policy:
 * every Polygon member with strictly positive AOI intersection is removed.
 * OpenMapTiles can aggregate many unrelated footprints into one MultiPolygon,
 * so all sibling members are copied unchanged before that aggregate is masked.
 * A clipped fragment can prove intersection, but never completeness; it keeps
 * coverage partial even when visual replacement succeeds.
 */
export function planPointObjectBuildingReplacement(
  sourceFeatures: readonly PointObjectTileBackedBuildingFeature[],
  aoi: Polygon
): PointObjectBuildingReplacementPlan {
  const invalid = (reason: string, examinedFeatures = 0, sourcePositions = 0): PointObjectBuildingReplacementPlan => ({
    coverage: "partial", examinedFeatures, completeParents: 0, hiddenParents: 0,
    tileMatchedParents: 0,
    unknownFeatures: Math.max(1, sourceFeatures.length - examinedFeatures), sourcePositions, predicates: [],
    retained: { type: "FeatureCollection", features: [] }, reason
  });
  if (!validatePointObjectReplacementAoi(aoi).valid) return invalid("invalid_aoi");
  if (sourceFeatures.length > pointObjectCompleteFootprintMaxSourceFeatures) return invalid("source_feature_limit");

  type PreparedFeature = {
    feature: PointObjectTileBackedBuildingFeature;
    complete: boolean;
    positions: number;
    polygons: Position[][][];
  };
  const prepared = new Map<string, PreparedFeature>();
  let sourcePositions = 0;
  let geometryWork = 0;
  let unknownFeatures = 0;
  for (const feature of sourceFeatures) {
    if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") {
      unknownFeatures += 1;
      continue;
    }
    const positions = geometryPositionCount(feature.geometry);
    sourcePositions += positions;
    if (sourcePositions > pointObjectCompleteFootprintMaxSourcePositions) return invalid("source_position_limit", prepared.size, sourcePositions);
    const polygons = geometryPolygons(feature.geometry)
      .map((polygon) => ({
        polygon,
        roundedKey: roundedPolygonKey(polygon),
        exactKey: JSON.stringify(polygon)
      }))
      .sort((left, right) => compareCodeUnit(left.roundedKey, right.roundedKey) || compareCodeUnit(left.exactKey, right.exactKey))
      .map(({ polygon }) => polygon);
    const memberVertices = polygons.map((polygon) => polygon.reduce(
      (sum, ring) => sum + Math.max(0, ring.length - 1),
      0
    ));
    if (memberVertices.some((vertices) => vertices > pointObjectCompleteFootprintMaxMemberVertices)) {
      unknownFeatures += 1;
      continue;
    }
    geometryWork += memberVertices.reduce((sum, vertices) => sum + vertices * vertices, 0);
    if (geometryWork > pointObjectCompleteFootprintMaxGeometryWork) {
      return invalid("source_geometry_work_limit", prepared.size, sourcePositions);
    }
    const properties = primitiveProperties(feature.properties);
    if (!properties) {
      unknownFeatures += 1;
      continue;
    }
    // Aggregate size is not a building count. Canonicalise each physical
    // Polygon member independently, then use the sorted member set only to
    // deduplicate buffered copies of this exact source-tile feature.
    const signature = JSON.stringify([
      parentKey(feature, properties),
      polygons.map(roundedPolygonKey).sort()
    ]);
    const existing = prepared.get(signature);
    if (existing) {
      existing.complete ||= completeTileGeometry(feature);
      continue;
    }
    if (prepared.size >= pointObjectCompleteFootprintMaxParents) {
      return invalid("source_parent_limit", prepared.size, sourcePositions);
    }
    prepared.set(signature, { feature, complete: completeTileGeometry(feature), positions, polygons });
  }

  const predicates: FilterSpecification[] = [];
  const retained: FeatureCollection<BuildingGeometry> = { type: "FeatureCollection", features: [] };
  const retainedSeen = new Set<string>();
  const appendRetained = (
    feature: PointObjectTileBackedBuildingFeature,
    polygons: Position[][][]
  ) => {
    const properties = primitiveProperties(feature.properties) ?? {};
    const identity = parentKey(feature, properties);
    const unique = polygons.filter((polygon) => {
      const signature = JSON.stringify([identity, roundedPolygonKey(polygon)]);
      if (retainedSeen.has(signature)) return false;
      retainedSeen.add(signature);
      return true;
    });
    const chunks: Position[][][][] = [];
    let chunk: Position[][][] = [];
    let chunkPositions = 0;
    for (const polygon of unique) {
      const positions = polygonPositionCount(polygon);
      if (chunk.length && (
        chunk.length >= pointObjectCompleteFootprintMaxRetainedMembers ||
        chunkPositions + positions > pointObjectCompleteFootprintMaxRetainedPositions
      )) {
        chunks.push(chunk);
        chunk = [];
        chunkPositions = 0;
      }
      chunk.push(polygon);
      chunkPositions += positions;
    }
    if (chunk.length) chunks.push(chunk);
    for (const members of chunks) retained.features.push({
      type: "Feature",
      ...(feature.id === undefined ? {} : { id: feature.id }),
      properties: structuredClone(feature.properties ?? {}),
      geometry: feature.geometry.type === "Polygon"
        ? { type: "Polygon", coordinates: structuredClone(members[0]) }
        : { type: "MultiPolygon", coordinates: structuredClone(members) }
    });
  };
  let completeParents = 0;
  let hiddenParents = 0;
  let tileMatchedParents = 0;
  // querySourceFeatures does not promise a stable order between idle/source
  // events. Stable output prevents an unchanged plan from calling setData
  // again and remaining in a perpetual retained-source loading cycle.
  const preparedEntries = [...prepared.entries()].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0
  );
  for (const [, { feature, complete, polygons }] of preparedEntries) {
    if (complete) completeParents += 1;
    else unknownFeatures += 1;
    const anchors: Position[] = [];
    const retainedPolygons: Position[][][] = [];
    let unmeasurable = false;
    for (const polygon of polygons) {
      const intersection = positiveIntersectionAnchor(polygon, aoi);
      if (!intersection.measurable) {
        unmeasurable = true;
        break;
      }
      if (intersection.anchor) anchors.push(intersection.anchor);
      else retainedPolygons.push(polygon);
    }
    if (unmeasurable) {
      unknownFeatures += 1;
      continue;
    }
    if (!anchors.length) continue;
    const featurePredicates = [] as FilterSpecification[];
    for (let offset = 0; offset < anchors.length; offset += pointObjectCompleteFootprintMaxAggregateAnchors) {
      const predicate = pointObjectPreparedTileFragmentPredicate(
        feature,
        anchors.slice(offset, offset + pointObjectCompleteFootprintMaxAggregateAnchors)
      );
      if (!predicate) break;
      featurePredicates.push(predicate);
    }
    if (!featurePredicates.length ||
      featurePredicates.length !== Math.ceil(anchors.length / pointObjectCompleteFootprintMaxAggregateAnchors)) {
      unknownFeatures += 1;
      continue;
    }
    if (predicates.length + featurePredicates.length > pointObjectCompleteFootprintMaxPredicates) {
      return invalid("source_predicate_limit", prepared.size, sourcePositions);
    }
    hiddenParents += 1;
    if (!complete) tileMatchedParents += 1;
    predicates.push(...featurePredicates);
    if (retainedPolygons.length) appendRetained(feature, retainedPolygons);
  }

  return {
    coverage: unknownFeatures ? "partial" : "complete",
    examinedFeatures: sourceFeatures.length,
    completeParents,
    hiddenParents,
    tileMatchedParents,
    unknownFeatures,
    sourcePositions,
    predicates,
    retained,
    reason: unknownFeatures ? "tile_backed_parent_match_not_complete_inventory" : null
  };
}

/** Kept for focused geometry callers while the visual renderer uses the more
 * explicit replacement-plan name above. */
export const planPointObjectCompleteFootprints = planPointObjectBuildingReplacement;
