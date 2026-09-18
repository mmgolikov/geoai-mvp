import type { MultiPolygon, Polygon, Position } from "geojson";
import { validatePointObjectReplacementAoi } from "./point-to-object-map-replacement";

export type PointObjectFindPresentationState = "result" | "shortlist" | "hover" | "active";

export function pointObjectFindPresentationState(
  resultId: string,
  activeId: string | null,
  hoveredId: string | null,
  shortlistIds: ReadonlySet<string>
): PointObjectFindPresentationState {
  if (resultId === activeId) return "active";
  if (resultId === hoveredId) return "hover";
  if (shortlistIds.has(resultId)) return "shortlist";
  return "result";
}

export function pointObjectFindVerifiedFootprint(
  geometry: Polygon | MultiPolygon | null,
  provenance: string | null,
  resultKind: "mapped_building_or_landuse" | "mapped_poi" | "unknown" | undefined
): Polygon | MultiPolygon | null {
  if (resultKind !== "mapped_building_or_landuse" || provenance !== "confirmed_complete_footprint" || !geometry) return null;
  if (geometry.type === "Polygon") return validatePointObjectReplacementAoi(geometry).valid ? structuredClone(geometry) : null;
  if (!geometry.coordinates.length || geometry.coordinates.some((coordinates) =>
    !validatePointObjectReplacementAoi({ type: "Polygon", coordinates }).valid)) return null;
  return structuredClone(geometry);
}

/** -1 outside, 0 boundary, 1 strictly interior. */
function ringLocation(point: Position, ring: Position[]): number {
  let inside = false;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]; const b = ring[i + 1];
    const cross = (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]);
    if (Math.abs(cross) <= 1e-16 && point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0]) && point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1])) return 0;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside ? 1 : -1;
}

/**
 * Select one complete rendered tile member, not a canonical physical building.
 * Preserve every ring exactly. Courtyards, edges and overlapping members are
 * deliberately unresolved instead of choosing an arbitrary neighbouring part.
 */
export function pointObjectTilePolygonMemberAt(geometry: MultiPolygon, point: Position): Polygon | null {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1]) || geometry.coordinates.length > 512 || geometry.coordinates.reduce((sum, part) => sum + part.reduce((n, ring) => n + ring.length, 0), 0) > 8_000) return null;
  let selected: Polygon | null = null;
  for (const coordinates of geometry.coordinates) {
    const polygon: Polygon = { type: "Polygon", coordinates };
    if (!validatePointObjectReplacementAoi(polygon).valid) return null;
    const exterior = ringLocation(point, coordinates[0]);
    if (exterior === 0) return null;
    if (exterior < 0) continue;
    const holes = coordinates.slice(1).map(ring => ringLocation(point, ring));
    if (holes.includes(0)) return null;
    if (holes.includes(1)) continue;
    if (selected) return null;
    selected = polygon;
  }
  return selected ? structuredClone(selected) : null;
}
