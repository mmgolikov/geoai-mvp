import { convertFilter } from "@maplibre/maplibre-gl-style-spec";
import type { FilterSpecification } from "maplibre-gl";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

export const pointObjectReplacementSnapshotVersion = 1 as const;
export const pointObjectReplacementMaxVertices = 1_000;
export const pointObjectReplacementMinimumReliableZoom = 13 as const;
// OpenMapTiles marks outlines covered by building parts with hide_3d. Drawing
// those outlines as well creates an invented uniform prism over native parts.
export const pointObjectNativeBuilding3dFilter: FilterSpecification = [
  "!", ["in", ["to-string", ["coalesce", ["get", "hide_3d"], false]], ["literal", ["true", "1"]]]
];
// Numerical boundary inclusion, not a site buffer: 1 mm normal displacement,
// capped at 2 mm at corners. Native tile quantization remains the source limit.
export const pointObjectReplacementBoundaryToleranceM = 0.001;

const WGS84_WORLD_RING: Position[] = [
  [-180, -90],
  [180, -90],
  [180, 90],
  [-180, 90],
  [-180, -90]
];

export type PointObjectReplacementAoi = Polygon | Feature<Polygon>;

export type PointObjectReplacementAoiValidation =
  | { valid: true; aoi: Polygon }
  | { valid: false; reason: string };

export type PointObjectMapFilterSnapshot = Readonly<{
  version: typeof pointObjectReplacementSnapshotVersion;
  filter: FilterSpecification | null;
}>;

export type PointObjectBuildingReplacementFilterPlan = {
  applied: boolean;
  filter: FilterSpecification | null;
  aoi: Polygon | null;
  reason: string | null;
};

function cloneJsonValue<T>(value: T, path = "value"): T {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must contain only finite JSON numbers.`);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => cloneJsonValue(item, `${path}[${index}]`)) as T;
  }

  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} must contain only plain JSON objects.`);
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneJsonValue(item, `${path}.${key}`)])
    ) as T;
  }

  throw new TypeError(`${path} must be JSON-safe.`);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) {
      deepFreeze(item);
    }
    Object.freeze(value);
  }
  return value;
}

export function clonePointObjectMapFilter(
  filter: FilterSpecification | null | undefined
): FilterSpecification | null {
  return filter === null || filter === undefined
    ? null
    : cloneJsonValue(filter, "filter");
}

export function snapshotPointObjectMapFilter(
  filter: FilterSpecification | null | undefined
): PointObjectMapFilterSnapshot {
  return deepFreeze({
    version: pointObjectReplacementSnapshotVersion,
    filter: clonePointObjectMapFilter(filter)
  });
}

export function restorePointObjectMapFilter(
  snapshot: PointObjectMapFilterSnapshot
): FilterSpecification | null {
  if (!snapshot || snapshot.version !== pointObjectReplacementSnapshotVersion) {
    throw new TypeError("Unsupported point-to-object map-filter snapshot.");
  }
  return clonePointObjectMapFilter(snapshot.filter);
}

function isPosition(value: unknown): value is Position {
  return Array.isArray(value) &&
    value.length === 2 &&
    value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate));
}

function samePosition(a: Position, b: Position) {
  return a[0] === b[0] && a[1] === b[1];
}

function orientation(a: Position, b: Position, c: Position) {
  return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
}

function onSegment(a: Position, b: Position, c: Position) {
  return b[0] >= Math.min(a[0], c[0]) && b[0] <= Math.max(a[0], c[0]) &&
    b[1] >= Math.min(a[1], c[1]) && b[1] <= Math.max(a[1], c[1]);
}

function segmentsIntersect(a1: Position, a2: Position, b1: Position, b2: Position) {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);
  const epsilon = 1e-12;

  if (Math.sign(o1) !== Math.sign(o2) && Math.sign(o3) !== Math.sign(o4)) {
    return true;
  }

  return (
    (Math.abs(o1) <= epsilon && onSegment(a1, b1, a2)) ||
    (Math.abs(o2) <= epsilon && onSegment(a1, b2, a2)) ||
    (Math.abs(o3) <= epsilon && onSegment(b1, a1, b2)) ||
    (Math.abs(o4) <= epsilon && onSegment(b1, a2, b2))
  );
}

function ringSelfIntersects(ring: Position[]) {
  for (let first = 0; first < ring.length - 1; first += 1) {
    for (let second = first + 1; second < ring.length - 1; second += 1) {
      const adjacent = Math.abs(first - second) <= 1 ||
        (first === 0 && second === ring.length - 2);
      if (!adjacent && segmentsIntersect(
        ring[first],
        ring[first + 1],
        ring[second],
        ring[second + 1]
      )) {
        return true;
      }
    }
  }
  return false;
}

function ringsIntersect(first: Position[], second: Position[]) {
  for (let a = 0; a < first.length - 1; a += 1) {
    for (let b = 0; b < second.length - 1; b += 1) {
      if (segmentsIntersect(first[a], first[a + 1], second[b], second[b + 1])) {
        return true;
      }
    }
  }
  return false;
}

function signedRingArea(ring: Position[]) {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return area / 2;
}

function pointInRing(point: Position, ring: Position[]) {
  let inside = false;
  for (let current = 0, previous = ring.length - 2; current < ring.length - 1; previous = current++) {
    const a = ring[current];
    const b = ring[previous];
    const crosses = (a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

function extractPolygon(input: unknown): unknown {
  if (!input || typeof input !== "object") return null;
  const candidate = input as { type?: unknown; geometry?: unknown };
  return candidate.type === "Feature" ? candidate.geometry : candidate;
}

export function validatePointObjectReplacementAoi(input: unknown): PointObjectReplacementAoiValidation {
  const geometry = extractPolygon(input) as { type?: unknown; coordinates?: unknown } | null;
  if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
    return { valid: false, reason: "Replacement AOI must be a GeoJSON Polygon or Polygon Feature." };
  }

  if (geometry.coordinates.length === 0) {
    return { valid: false, reason: "Replacement AOI must contain an exterior ring." };
  }

  let vertexCount = 0;
  const rings: Position[][] = [];
  for (const candidateRing of geometry.coordinates) {
    if (!Array.isArray(candidateRing) || candidateRing.length < 4) {
      return { valid: false, reason: "Every replacement AOI ring must contain at least four positions." };
    }

    if (!candidateRing.every(isPosition)) {
      return { valid: false, reason: "Replacement AOI positions must be finite [longitude, latitude] pairs." };
    }

    const ring = candidateRing as Position[];
    vertexCount += ring.length - 1;
    if (vertexCount > pointObjectReplacementMaxVertices) {
      return { valid: false, reason: `Replacement AOI exceeds ${pointObjectReplacementMaxVertices} vertices.` };
    }

    if (!samePosition(ring[0], ring[ring.length - 1])) {
      return { valid: false, reason: "Every replacement AOI ring must be explicitly closed." };
    }

    for (const [longitude, latitude] of ring) {
      if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
        return { valid: false, reason: "Replacement AOI positions must be valid WGS84 coordinates." };
      }
    }

    const longitudes = ring.map(([longitude]) => longitude);
    if (Math.max(...longitudes) - Math.min(...longitudes) > 180) {
      return { valid: false, reason: "Replacement AOIs crossing the antimeridian are not supported." };
    }

    for (let index = 1; index < ring.length; index += 1) {
      if (samePosition(ring[index - 1], ring[index])) {
        return { valid: false, reason: "Replacement AOI rings cannot contain consecutive duplicate positions." };
      }
    }

    if (Math.abs(signedRingArea(ring)) <= 1e-14) {
      return { valid: false, reason: "Replacement AOI rings must have non-zero area." };
    }

    if (ringSelfIntersects(ring)) {
      return { valid: false, reason: "Replacement AOI rings cannot self-intersect." };
    }

    rings.push(cloneJsonValue(ring, "aoi.coordinates"));
  }

  for (let hole = 1; hole < rings.length; hole += 1) {
    if (!pointInRing(rings[hole][0], rings[0]) || ringsIntersect(rings[hole], rings[0])) {
      return { valid: false, reason: "Replacement AOI holes must be strictly inside the exterior ring." };
    }

    for (let previous = 1; previous < hole; previous += 1) {
      if (
        ringsIntersect(rings[hole], rings[previous]) ||
        pointInRing(rings[hole][0], rings[previous]) ||
        pointInRing(rings[previous][0], rings[hole])
      ) {
        return { valid: false, reason: "Replacement AOI holes cannot overlap or contain one another." };
      }
    }
  }

  return {
    valid: true,
    aoi: {
      type: "Polygon",
      coordinates: rings
    }
  };
}

/**
 * GeoJSON representation of the WGS84 world outside the AOI. The AOI exterior
 * is a hole in the world polygon; AOI holes are outside islands in their own
 * right. This lets MapLibre distinguish a feature that is wholly internal from
 * one that crosses the boundary or has any disjoint component outside it.
 */
export function buildPointObjectReplacementBoundaryAoi(aoi: Polygon): Polygon | null {
  const latitude = aoi.coordinates[0][0][1];
  const longitudeScale = 111_320 * Math.cos(latitude * Math.PI / 180);
  if (longitudeScale < 1_000) return null;
  const latitudeScale = 110_574;
  const origin = aoi.coordinates[0][0];
  const coordinates: Position[][] = [];
  for (const [ringIndex, ring] of aoi.coordinates.entries()) {
    const points = ring.slice(0, -1).map(([x, y]) => [(x - origin[0]) * longitudeScale, (y - origin[1]) * latitudeScale]);
    const closed = [...points, points[0]];
    const direction = Math.sign(signedRingArea(closed)) * (ringIndex === 0 ? 1 : -1);
    if (!direction) return null;
    const normals = points.map((point, index) => {
      const next = points[(index + 1) % points.length];
      const dx = next[0] - point[0]; const dy = next[1] - point[1];
      const length = Math.hypot(dx, dy);
      return [direction * dy / length, -direction * dx / length];
    });
    const expanded: Position[] = [];
    for (const [index, point] of points.entries()) {
      const previous = normals[(index + points.length - 1) % points.length];
      const next = normals[index];
      const denominator = 1 + previous[0] * next[0] + previous[1] * next[1];
      if (denominator <= 0) return null;
      const dx = (previous[0] + next[0]) * pointObjectReplacementBoundaryToleranceM / denominator;
      const dy = (previous[1] + next[1]) * pointObjectReplacementBoundaryToleranceM / denominator;
      if (!Number.isFinite(dx + dy)) return null;
      // A sharp but valid corner must not reject the entire AOI. Bevel the
      // numerical join at the two 1 mm edge offsets instead of extending a
      // long miter. The full output still passes topology validation below.
      if (Math.hypot(dx, dy) > 2 * pointObjectReplacementBoundaryToleranceM) {
        for (const normal of [previous, next]) expanded.push([
          origin[0] + (point[0] + normal[0] * pointObjectReplacementBoundaryToleranceM) / longitudeScale,
          origin[1] + (point[1] + normal[1] * pointObjectReplacementBoundaryToleranceM) / latitudeScale
        ]);
        continue;
      }
      expanded.push([origin[0] + (point[0] + dx) / longitudeScale, origin[1] + (point[1] + dy) / latitudeScale]);
    }
    expanded.push([...expanded[0]]);
    coordinates.push(expanded);
  }
  const validation = validatePointObjectReplacementAoi({ type: "Polygon", coordinates });
  return validation.valid ? validation.aoi : null;
}

function buildPointObjectOutsideAoi(aoi: Polygon): MultiPolygon {
  const [exterior, ...holes] = aoi.coordinates;
  return {
    type: "MultiPolygon",
    coordinates: [
      [cloneJsonValue(WGS84_WORLD_RING, "world"), cloneJsonValue(exterior, "aoi.exterior")],
      ...holes.map((hole, index) => [cloneJsonValue(hole, `aoi.holes[${index}]`)])
    ]
  };
}

/** Native highlight containment, not proximity: touching/reused IDs are not identity. */
export function buildPointObjectNativeSelectionOutside(geometry: Polygon | MultiPolygon): MultiPolygon | null {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const bounded: Polygon[] = [];
  for (const coordinates of polygons) {
    // Native tile clipping can make a courtyard ring touch the exterior at the
    // tile edge. Validate each ring first; the bounded offset separates those
    // coincident edges and must still pass the full topology validator afterward.
    // This exception is native-highlight-only; uploaded Create AOIs stay strict.
    if (!coordinates.length || coordinates.some(ring => !validatePointObjectReplacementAoi({ type: "Polygon", coordinates: [ring] }).valid)) return null;
    const polygon = buildPointObjectReplacementBoundaryAoi({ type: "Polygon", coordinates });
    if (!polygon) return null;
    bounded.push(polygon);
  }
  if (!bounded.length) return null;
  return {
    type: "MultiPolygon",
    coordinates: [
      [cloneJsonValue(WGS84_WORLD_RING, "world"), ...bounded.map(polygon => polygon.coordinates[0])],
      ...bounded.flatMap(polygon => polygon.coordinates.slice(1).map(hole => [hole]))
    ]
  };
}

/**
 * Builds a fail-safe filter for a primary building layer. A polygon is hidden
 * only when MapLibre can prove that it intersects the AOI and has no geometry
 * in the world outside the bounded numerical envelope (1 mm edge / 2 mm corner).
 * Boundary-crossing and mixed/disjoint multipart
 * features are retained whole because a style filter cannot clip one component
 * without also removing the feature's outside geometry.
 *
 * Below zoom 13 MapLibre documents reduced distance-expression precision, so
 * source geometry is retained rather than risk an out-of-AOI false positive.
 */
export function buildPointObjectBuildingReplacementFilter(
  originalFilter: FilterSpecification | null | undefined,
  aoiInput: unknown
): PointObjectBuildingReplacementFilterPlan {
  const originalSnapshot = snapshotPointObjectMapFilter(originalFilter);
  const validation = validatePointObjectReplacementAoi(aoiInput);

  if (validation.valid === false) {
    return {
      applied: false,
      filter: restorePointObjectMapFilter(originalSnapshot),
      aoi: null,
      reason: validation.reason
    };
  }

  const aoi = cloneJsonValue(validation.aoi, "aoi");
  const boundaryAoi = buildPointObjectReplacementBoundaryAoi(aoi);
  if (!boundaryAoi) return { applied: false, filter: restorePointObjectMapFilter(originalSnapshot), aoi, reason: "AOI boundary cannot be included within the bounded 2 mm numerical tolerance." };
  const outsideAoi = buildPointObjectOutsideAoi(boundaryAoi);
  const outsideAoiFilter = [
    "any",
    ["<", ["zoom"], pointObjectReplacementMinimumReliableZoom],
    ["!=", ["geometry-type"], "Polygon"],
    [">", ["distance", aoi], 0],
    ["==", ["distance", outsideAoi], 0]
  ] as unknown as FilterSpecification;
  const original = restorePointObjectMapFilter(originalSnapshot);
  const filter = original === null
    ? outsideAoiFilter
    : ["all", convertFilter(original), outsideAoiFilter] as FilterSpecification;

  return {
    applied: true,
    filter: clonePointObjectMapFilter(filter),
    aoi: cloneJsonValue(aoi, "aoi"),
    reason: null
  };
}
