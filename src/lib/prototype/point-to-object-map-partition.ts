import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import type { FilterSpecification } from "maplibre-gl";
import { buildPointObjectNativeSelectionOutside, validatePointObjectReplacementAoi } from "./point-to-object-map-replacement";

type BuildingGeometry = Polygon | MultiPolygon;
const EPSILON = 1e-16;

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
