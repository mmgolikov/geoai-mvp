import type { Polygon, Position } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import { pointObjectCompleteFootprintOverlap } from "./point-to-object-map-partition";
import { pointObjectReplacementMaxVertices, validatePointObjectReplacementAoi } from "./point-to-object-map-replacement";

export type CreateMapConflictReason = "footprints-clear" | "measured-overlap" | "native-geometry-unmeasurable" | "saved-geometry-invalid" | "query-failed" | "projection-failed";
export type CreateMapNativeFailure = "unsupported-type" | "empty-coordinates" | "short-ring" | "invalid-position" | "point-budget" | "native-feature-budget" | "metric-overlap-null" | "native-member-budget" | "native-structure-budget" | "exact-vertex-budget" | "exact-pair-budget" | "exact-work-budget";
export type CreateMapNativeGeometryType = "Polygon" | "MultiPolygon" | "Point" | "MultiPoint" | "LineString" | "MultiLineString" | "GeometryCollection" | "unknown";
export type CreateMapConflictReview = {
  status: "clear" | "overlap" | "uncertain";
  reason: CreateMapConflictReason;
  comparedPairs: number;
  disjointMembers: number;
  nativeFailureCounts: Record<CreateMapNativeFailure, number>;
  nativeGeometryCounts: Record<CreateMapNativeGeometryType, number>;
};
type Bounds = readonly [number, number, number, number];
type BoundedPolygon = { polygon: Polygon; bounds: Bounds };
const MAX_POSITIONS = 5_000;
const MAX_NATIVE_FEATURES = 2_000;
const SAVED_TOPOLOGY = new WeakMap<object, { signature: string; valid: boolean }>();
export const pointObjectCreateMapNativeLimits = Object.freeze({
  scanPositions: 120_000, members: 4_096, structuralSteps: 140_000,
  exactPairs: 128, exactWork: 2_000_000
});
type NativeScanBudget = { positions: number; members: number; steps: number; exhausted: boolean };
type NativeMember = BoundedPolygon & { vertices: number };

function nativeGeometryType(value: unknown): CreateMapNativeGeometryType {
  if (value && typeof value === "object" && "type" in value) {
    switch (value.type) {
      case "Polygon": case "MultiPolygon": case "Point": case "MultiPoint":
      case "LineString": case "MultiLineString": case "GeometryCollection": return value.type;
    }
  }
  return "unknown";
}

function boundedPolygons(value: unknown, onFailure?: (reason: CreateMapNativeFailure) => void): BoundedPolygon[] | null {
  const reject = (reason: CreateMapNativeFailure): null => { onFailure?.(reason); return null; };
  if (!value || typeof value !== "object" || !("type" in value)) return reject("unsupported-type");
  if (!("coordinates" in value)) return reject("empty-coordinates");
  const coordinates = value.coordinates;
  const polygons = value.type === "Polygon" ? [coordinates] : value.type === "MultiPolygon" ? coordinates : null;
  if (value.type !== "Polygon" && value.type !== "MultiPolygon") return reject("unsupported-type");
  if (!Array.isArray(polygons) || !polygons.length) return reject("empty-coordinates");
  let positions = 0;
  const result: BoundedPolygon[] = [];
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) return reject("empty-coordinates");
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    const rings: Position[][] = [];
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) return reject("short-ring");
      const safeRing: Position[] = [];
      for (const position of ring) {
        if (++positions > MAX_POSITIONS) return reject("point-budget");
        if (!Array.isArray(position) || position.length < 2) return reject("invalid-position");
        const [longitude, latitude] = position;
        if (typeof longitude !== "number" || typeof latitude !== "number" || !Number.isFinite(longitude) || !Number.isFinite(latitude) ||
          Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return reject("invalid-position");
        west = Math.min(west, longitude); south = Math.min(south, latitude);
        east = Math.max(east, longitude); north = Math.max(north, latitude);
        safeRing.push([longitude, latitude]);
      }
      rings.push(safeRing);
    }
    result.push({ polygon: { type: "Polygon", coordinates: rings }, bounds: [west, south, east, north] });
  }
  return result;
}

function disjoint(left: Bounds, right: Bounds): boolean {
  // Strict inequality preserves touching boundaries for the exact overlap test.
  return left[2] < right[0] || right[2] < left[0] || left[3] < right[1] || right[3] < left[1];
}

function validatedSavedPolygons(value: unknown): BoundedPolygon[] | null {
  const polygons = boundedPolygons(value);
  if (!polygons || !value || typeof value !== "object") return null;
  // Cache expensive topology, not a mutable object's presumed trust. The
  // bounded canonical coordinates are compared every time, including restores.
  const signature = JSON.stringify(polygons.map(member => member.polygon.coordinates));
  let cached = SAVED_TOPOLOGY.get(value);
  if (!cached || cached.signature !== signature) {
    cached = { signature, valid: polygons.every(member => validatePointObjectReplacementAoi(member.polygon).valid) };
    SAVED_TOPOLOGY.set(value, cached);
  }
  return cached.valid ? polygons : null;
}

function nativeStructureStep(budget: NativeScanBudget, reject: (reason: CreateMapNativeFailure) => void): boolean {
  if (++budget.steps <= pointObjectCreateMapNativeLimits.structuralSteps) return true;
  budget.exhausted = true;
  reject("native-structure-budget");
  return false;
}

/** Entire finite envelopes, including every hole. A rejected/unread suffix
 * invalidates this feature; no completed prefix is returned as clearance. */
function completeNativeEnvelopes(value: unknown, budget: NativeScanBudget, onFailure: (reason: CreateMapNativeFailure) => void): NativeMember[] | null {
  const reject = (reason: CreateMapNativeFailure): null => { onFailure(reason); return null; };
  if (!nativeStructureStep(budget, onFailure)) return null;
  if (!value || typeof value !== "object" || !("type" in value)) return reject("unsupported-type");
  if (!("coordinates" in value)) return reject("empty-coordinates");
  if (value.type !== "Polygon" && value.type !== "MultiPolygon") return reject("unsupported-type");
  const polygons = value.type === "Polygon" ? [value.coordinates] : value.coordinates;
  if (!Array.isArray(polygons) || !polygons.length) return reject("empty-coordinates");
  const result: NativeMember[] = [];
  for (const polygon of polygons) {
    if (!nativeStructureStep(budget, onFailure)) return null;
    if (++budget.members > pointObjectCreateMapNativeLimits.members) {
      budget.exhausted = true; return reject("native-member-budget");
    }
    if (!Array.isArray(polygon) || !polygon.length) return reject("empty-coordinates");
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity, vertices = 0;
    const rings: Position[][] = [];
    for (const ring of polygon) {
      if (!nativeStructureStep(budget, onFailure)) return null;
      if (!Array.isArray(ring) || ring.length < 4) return reject("short-ring");
      const safeRing: Position[] = [];
      for (const position of ring) {
        if (!nativeStructureStep(budget, onFailure)) return null;
        if (++budget.positions > pointObjectCreateMapNativeLimits.scanPositions) {
          budget.exhausted = true; return reject("point-budget");
        }
        if (!Array.isArray(position) || position.length < 2) return reject("invalid-position");
        const [longitude, latitude] = position;
        if (typeof longitude !== "number" || typeof latitude !== "number" || !Number.isFinite(longitude) || !Number.isFinite(latitude) ||
          Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return reject("invalid-position");
        west = Math.min(west, longitude); south = Math.min(south, latitude);
        east = Math.max(east, longitude); north = Math.max(north, latitude);
        safeRing.push([longitude, latitude]);
      }
      vertices += ring.length - 1;
      rings.push(safeRing);
    }
    result.push({ polygon: { type: "Polygon", coordinates: rings }, bounds: [west, south, east, north], vertices });
  }
  return result;
}

// Conservative complexity admission score, not a wall-clock guarantee. Ear
// search may be cubic; topology and triangle-pair costs must also be charged.
function exactPolygonWork(polygon: Polygon): { vertices: number; work: number } {
  let vertices = 0, ringWork = 0;
  for (const ring of polygon.coordinates) {
    const count = ring.length - 1;
    vertices += count; ringWork += count * count * count;
  }
  return { vertices, work: ringWork + 2 * vertices * vertices };
}

/** Read-only render review. No source acquisition, geometry repair or masking. */
export function reviewPointObjectCreateMapConflict(
  map: Pick<MapLibreMap, "project" | "queryRenderedFeatures">,
  layers: string[],
  features: readonly { geometry: unknown }[]
): CreateMapConflictReview {
  // Fixed aggregate keys only. Counts describe visited query features/pairs,
  // not unique buildings, source completeness or an authorization decision.
  const review: CreateMapConflictReview = { status: "clear", reason: "footprints-clear", comparedPairs: 0, disjointMembers: 0,
    nativeFailureCounts: { "unsupported-type": 0, "empty-coordinates": 0, "short-ring": 0, "invalid-position": 0,
      "point-budget": 0, "native-feature-budget": 0, "metric-overlap-null": 0,
      "native-member-budget": 0, "native-structure-budget": 0, "exact-vertex-budget": 0,
      "exact-pair-budget": 0, "exact-work-budget": 0 },
    nativeGeometryCounts: { Polygon: 0, MultiPolygon: 0, Point: 0, MultiPoint: 0, LineString: 0,
      MultiLineString: 0, GeometryCollection: 0, unknown: 0 } };
  const uncertain = (reason: CreateMapConflictReason): CreateMapConflictReview => ({ ...review, status: "uncertain", reason });
  const saved = features.map(feature => validatedSavedPolygons(feature.geometry));
  if (!features.length || saved.some(member => !member)) return uncertain("saved-geometry-invalid");
  const concepts = saved.flatMap(member => member ?? []);
  // The previous no-visible-native-layer policy is retained; no network probe.
  if (!layers.length) return review;
  let box: [[number, number], [number, number]];
  try {
    const projected = concepts.flatMap(({ polygon }) => polygon.coordinates.flat().map(position => map.project([position[0], position[1]])));
    if (projected.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return uncertain("projection-failed");
    box = [[Math.min(...projected.map(point => point.x)), Math.min(...projected.map(point => point.y))],
      [Math.max(...projected.map(point => point.x)), Math.max(...projected.map(point => point.y))]];
  } catch { return uncertain("projection-failed"); }
  let native: ReturnType<MapLibreMap["queryRenderedFeatures"]>;
  try { native = map.queryRenderedFeatures(box, { layers }); }
  catch { return uncertain("query-failed"); }
  if (native.length > MAX_NATIVE_FEATURES) {
    review.nativeFailureCounts["native-feature-budget"] += 1;
    return uncertain("native-geometry-unmeasurable");
  }
  let hasUnknown = false;
  const budget: NativeScanBudget = { positions: 0, members: 0, steps: 0, exhausted: false };
  const failure = (reason: CreateMapNativeFailure) => { review.nativeFailureCounts[reason] += 1; };
  const complete: NativeMember[] = [];
  // Finish the bounded aggregate scan before ANY bbox clearance or exact call.
  for (const feature of native) {
    const geometry = feature.geometry;
    review.nativeGeometryCounts[nativeGeometryType(geometry)] += 1;
    const members = completeNativeEnvelopes(geometry, budget, failure);
    if (budget.exhausted) return uncertain("native-geometry-unmeasurable");
    if (!members) { hasUnknown = true; continue; }
    complete.push(...members);
  }
  const plan: { member: NativeMember; relevant: BoundedPolygon[] }[] = [];
  let exactPairs = 0, exactWork = 0;
  // Preflight the WHOLE plan. A later cap cannot be hidden by an earlier
  // disjoint member or measured result; touching bounds enter the exact plan.
  for (const member of complete) {
    const relevant: BoundedPolygon[] = [];
    for (const concept of concepts) {
      if (!nativeStructureStep(budget, failure)) return uncertain("native-geometry-unmeasurable");
      if (disjoint(member.bounds, concept.bounds)) continue;
      if (member.vertices > pointObjectReplacementMaxVertices) {
        failure("exact-vertex-budget"); return uncertain("native-geometry-unmeasurable");
      }
      if (++exactPairs > pointObjectCreateMapNativeLimits.exactPairs) {
        failure("exact-pair-budget"); return uncertain("native-geometry-unmeasurable");
      }
      const left = exactPolygonWork(member.polygon), right = exactPolygonWork(concept.polygon);
      exactWork += left.work + right.work + left.vertices * right.vertices;
      if (exactWork > pointObjectCreateMapNativeLimits.exactWork) {
        failure("exact-work-budget"); return uncertain("native-geometry-unmeasurable");
      }
      relevant.push(concept);
    }
    plan.push({ member, relevant });
  }
  for (const { member, relevant } of plan) {
    if (!relevant.length) { review.disjointMembers += 1; continue; }
    for (const concept of relevant) {
      review.comparedPairs += 1;
      // A distant invalid sibling must not poison a measurable local member.
      // Overlap/unknown near the proposal still blocks the entire concept.
      const overlap = pointObjectCompleteFootprintOverlap(member.polygon, concept.polygon);
      if (!overlap) { hasUnknown = true; review.nativeFailureCounts["metric-overlap-null"] += 1; }
      else if (overlap.overlapSqM > 0.05) return { ...review, status: "overlap", reason: "measured-overlap" };
    }
  }
  return hasUnknown ? uncertain("native-geometry-unmeasurable") : review;
}
