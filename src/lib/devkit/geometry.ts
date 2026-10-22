import type { Polygon } from "geojson";
import type { Position } from "../point-to-object/contracts";

/** Bounded, explicitly approximate frame. Never a cadastral or survey CRS. */
export type DesignMetricFrame = {
  method: "local_equirectangular_v1";
  origin: Position;
  units: "m";
  accuracy: "screening_approximation";
};
export type MetricPosition = [number, number];
const EPSILON_M = 0.00001;
const MAX_SPAN_M = 3_000;

export function designMetricFrame(geometry: Polygon): DesignMetricFrame {
  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) throw new Error("A closed AOI ring is required.");
  const points = ring.slice(0, -1);
  const origin: Position = [
    points.reduce((s, p) => s + p[0], 0) / points.length,
    points.reduce((s, p) => s + p[1], 0) / points.length
  ];
  if (!origin.every(Number.isFinite) || Math.abs(origin[1]) > 85) throw new Error("Unsupported local metric frame.");
  return { method: "local_equirectangular_v1", origin, units: "m", accuracy: "screening_approximation" };
}

export function projectDesignPosition(point: number[], frame: DesignMetricFrame): MetricPosition {
  return [
    (point[0] - frame.origin[0]) * 111_320 * Math.cos(frame.origin[1] * Math.PI / 180),
    (point[1] - frame.origin[1]) * 110_540
  ];
}

export function unprojectDesignPosition(point: MetricPosition, frame: DesignMetricFrame): Position {
  return [
    frame.origin[0] + point[0] / (111_320 * Math.cos(frame.origin[1] * Math.PI / 180)),
    frame.origin[1] + point[1] / 110_540
  ];
}

function ring(geometry: Polygon, frame: DesignMetricFrame): MetricPosition[] {
  return geometry.coordinates[0].map(p => projectDesignPosition(p, frame));
}
function cross(a: MetricPosition, b: MetricPosition, c: MetricPosition): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function onSegment(p: MetricPosition, a: MetricPosition, b: MetricPosition): boolean {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return Math.abs(cross(a, b, p)) <= EPSILON_M * Math.max(length, 1) &&
    p[0] >= Math.min(a[0], b[0]) - EPSILON_M && p[0] <= Math.max(a[0], b[0]) + EPSILON_M &&
    p[1] >= Math.min(a[1], b[1]) - EPSILON_M && p[1] <= Math.max(a[1], b[1]) + EPSILON_M;
}
function intersects(a: MetricPosition, b: MetricPosition, c: MetricPosition, d: MetricPosition): boolean {
  if (onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b)) return true;
  return Math.sign(cross(a, b, c)) !== Math.sign(cross(a, b, d)) &&
    Math.sign(cross(c, d, a)) !== Math.sign(cross(c, d, b));
}
function signedArea(points: MetricPosition[]): number {
  return points.slice(0, -1).reduce((sum, p, i) => sum + p[0] * points[i + 1][1] - points[i + 1][0] * p[1], 0) / 2;
}
function pointInRing(point: MetricPosition, points: MetricPosition[]): boolean {
  let inside = false;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (onSegment(point, a, b)) return true;
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/** Strict single exterior ring; unsupported holes are errors, never discarded. */
export function validateDesignPolygon(value: unknown, frame?: DesignMetricFrame): string[] {
  const polygon = value as Polygon | undefined;
  if (!polygon || polygon.type !== "Polygon" || !Array.isArray(polygon.coordinates) || polygon.coordinates.length !== 1) {
    return ["A Polygon with exactly one exterior ring is required; holes are unsupported in this slice."];
  }
  const outer = polygon.coordinates[0];
  if (!Array.isArray(outer) || outer.length < 4 || outer.length > 257 || outer.some(p =>
    !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 85)) {
    return ["Polygon requires 4–257 finite WGS84 [longitude, latitude] vertices within latitude ±85°."];
  }
  if (outer[0][0] !== outer.at(-1)?.[0] || outer[0][1] !== outer.at(-1)?.[1]) return ["Polygon ring must be closed."];
  const metric = ring(polygon, frame ?? designMetricFrame(polygon));
  if (metric.some(p => Math.abs(p[0]) > MAX_SPAN_M || Math.abs(p[1]) > MAX_SPAN_M) ||
    Math.max(...metric.map(p => p[0])) - Math.min(...metric.map(p => p[0])) > MAX_SPAN_M ||
    Math.max(...metric.map(p => p[1])) - Math.min(...metric.map(p => p[1])) > MAX_SPAN_M) {
    return ["Geometry exceeds the bounded 3 km local metric frame."];
  }
  if (Math.abs(signedArea(metric)) < 0.01) return ["Polygon must have positive non-degenerate area."];
  for (let i = 0; i < metric.length - 1; i++) {
    if (Math.hypot(metric[i][0] - metric[i + 1][0], metric[i][1] - metric[i + 1][1]) < EPSILON_M) return ["Polygon has a repeated consecutive vertex."];
    for (let j = i + 1; j < metric.length - 1; j++) {
      if (j === i + 1 || (i === 0 && j === metric.length - 2)) continue;
      if (intersects(metric[i], metric[i + 1], metric[j], metric[j + 1])) return ["Polygon self-intersects or repeats a vertex."];
    }
  }
  return [];
}

export function designPolygonAreaSqM(geometry: Polygon, frame: DesignMetricFrame): number {
  const errors = validateDesignPolygon(geometry, frame);
  if (errors.length) throw new Error(errors.join(" "));
  return Math.abs(signedArea(ring(geometry, frame)));
}

/** Also tests edge interiors: inside vertices alone do not prove containment in a concave AOI. */
export function designPolygonContained(child: Polygon, parent: Polygon, frame: DesignMetricFrame): boolean {
  if (validateDesignPolygon(child, frame).length || validateDesignPolygon(parent, frame).length) return false;
  const inner = ring(child, frame), outer = ring(parent, frame);
  if (!inner.every(p => pointInRing(p, outer))) return false;
  for (let i = 0; i < inner.length - 1; i++) {
    const a = inner[i], b = inner[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], length2 = dx * dx + dy * dy;
    const cuts = [0, 1];
    for (let j = 0; j < outer.length - 1; j++) {
      const c = outer[j], d = outer[j + 1], ex = d[0] - c[0], ey = d[1] - c[1];
      const denominator = dx * ey - dy * ex;
      if (Math.abs(denominator) > EPSILON_M * EPSILON_M) {
        const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / denominator;
        const u = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / denominator;
        if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
      } else if (onSegment(c, a, b)) cuts.push(((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / length2);
    }
    cuts.sort((l, r) => l - r);
    for (let j = 1; j < cuts.length; j++) {
      const t = (cuts[j - 1] + cuts[j]) / 2;
      if (!pointInRing([a[0] + t * dx, a[1] + t * dy], outer)) return false;
    }
  }
  return true;
}

/** Contact counts as a conflict; no hidden minimum clearance or regulatory claim. */
export function designPolygonsConflict(left: Polygon, right: Polygon, frame: DesignMetricFrame): boolean {
  if (validateDesignPolygon(left, frame).length || validateDesignPolygon(right, frame).length) return true;
  const a = ring(left, frame), b = ring(right, frame);
  for (let i = 0; i < a.length - 1; i++) for (let j = 0; j < b.length - 1; j++) {
    if (intersects(a[i], a[i + 1], b[j], b[j + 1])) return true;
  }
  return pointInRing(a[0], b) || pointInRing(b[0], a);
}

export function translateDesignPolygon(geometry: Polygon, eastM: number, northM: number, frame: DesignMetricFrame): Polygon {
  if (!Number.isFinite(eastM) || !Number.isFinite(northM)) throw new Error("Translation must contain finite metres.");
  return { type: "Polygon", coordinates: [ring(geometry, frame).map(p => unprojectDesignPosition([p[0] + eastM, p[1] + northM], frame))] };
}

/** Top-floor plate for an explicit terrace area share; not a statutory setback. */
export function designTerraceTopPlate(footprint: Polygon, sharePct: number, frame: DesignMetricFrame): Polygon {
  if (!Number.isFinite(sharePct) || sharePct < 0 || sharePct > 60) throw new Error("Terrace share must be 0–60% of the top-floor footprint.");
  if (sharePct === 0) return structuredClone(footprint);
  const points = ring(footprint, frame), open = points.slice(0, -1);
  const center: MetricPosition = [open.reduce((s, p) => s + p[0], 0) / open.length, open.reduce((s, p) => s + p[1], 0) / open.length];
  const scale = Math.sqrt(1 - sharePct / 100);
  const top: Polygon = { type: "Polygon", coordinates: [points.map(p => unprojectDesignPosition([
    center[0] + (p[0] - center[0]) * scale, center[1] + (p[1] - center[1]) * scale
  ], frame))] };
  if (!designPolygonContained(top, footprint, frame)) throw new Error("Terrace plate does not fit this footprint; last valid geometry retained.");
  return top;
}

function pointSegmentDistance(point: MetricPosition, a: MetricPosition, b: MetricPosition): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], squared = dx * dx + dy * dy;
  const t = squared ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / squared)) : 0;
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
}
/** Geometric boundary clearance only; this is not a statutory setback determination. */
export function designPolygonClearanceM(child: Polygon, parent: Polygon, frame: DesignMetricFrame): number {
  if (!designPolygonContained(child, parent, frame)) return 0;
  const inner = ring(child, frame), outer = ring(parent, frame);
  let minimum = Number.POSITIVE_INFINITY;
  for (let i = 0; i < inner.length - 1; i++) for (let j = 0; j < outer.length - 1; j++) {
    const a = inner[i], b = inner[i + 1], c = outer[j], d = outer[j + 1];
    if (intersects(a, b, c, d)) return 0;
    minimum = Math.min(minimum, pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d), pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b));
  }
  return minimum;
}
