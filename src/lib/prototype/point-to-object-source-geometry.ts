import type { Polygon, MultiPolygon, Position } from "geojson";
import { validatePointObjectReplacementAoi } from "./point-to-object-map-replacement";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === "object" && !Array.isArray(value);
const equal = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1];
const MAX_POSITIONS = 2000;
const TOPOLOGY_EPSILON = 1e-12;

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
  if (Math.sign(o1) !== Math.sign(o2) && Math.sign(o3) !== Math.sign(o4)) return true;
  return (Math.abs(o1) <= TOPOLOGY_EPSILON && onSegment(a1, b1, a2)) ||
    (Math.abs(o2) <= TOPOLOGY_EPSILON && onSegment(a1, b2, a2)) ||
    (Math.abs(o3) <= TOPOLOGY_EPSILON && onSegment(b1, a1, b2)) ||
    (Math.abs(o4) <= TOPOLOGY_EPSILON && onSegment(b1, a2, b2));
}

function ringsIntersect(first: Position[], second: Position[]) {
  for (let a = 0; a < first.length - 1; a += 1) {
    for (let b = 0; b < second.length - 1; b += 1) {
      if (segmentsIntersect(first[a], first[a + 1], second[b], second[b + 1])) return true;
    }
  }
  return false;
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

function shellsAreDisjoint(shells: Position[][]) {
  for (let first = 0; first < shells.length; first += 1) {
    for (let second = first + 1; second < shells.length; second += 1) {
      if (ringsIntersect(shells[first], shells[second]) ||
          pointInRing(shells[first][0], shells[second]) ||
          pointInRing(shells[second][0], shells[first])) return false;
    }
  }
  return true;
}

function positions(value: unknown): Position[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_POSITIONS) return null;
  const points: Position[] = [];
  for (const point of value) {
    if (!record(point) || typeof point.lon !== "number" || typeof point.lat !== "number" || !Number.isFinite(point.lon) || !Number.isFinite(point.lat) || Math.abs(point.lon) > 180 || Math.abs(point.lat) > 90) return null;
    points.push([point.lon, point.lat]);
  }
  return points;
}

// Join source member endpoints only. Never close a gap or fabricate a footprint.
function stitch(parts: Position[][]): Position[][] | null {
  const pending = parts.map(part => [...part]);
  const rings: Position[][] = [];
  while (pending.length) {
    const ring = pending.shift()!;
    while (!equal(ring[0], ring[ring.length - 1])) {
      const matches = pending.flatMap((part, index) => equal(ring[ring.length - 1], part[0]) ? [{index, reverse:false}] : equal(ring[ring.length - 1], part[part.length - 1]) ? [{index, reverse:true}] : []);
      if (matches.length !== 1) return null;
      const match = matches[0];
      const part = pending.splice(match.index, 1)[0];
      ring.push(...(match.reverse ? part.reverse() : part).slice(1));
    }
    if (!validatePointObjectReplacementAoi({type:"Polygon",coordinates:[ring]}).valid) return null;
    rings.push(ring);
  }
  return rings;
}

export function sourceElementFootprint(value: unknown): Polygon | MultiPolygon | null {
  if (!record(value) || !record(value.tags) || !(value.tags.building || value.tags.landuse)) return null;
  if (value.type === "way") {
    const ring = positions(value.geometry);
    if (!ring || !equal(ring[0], ring[ring.length - 1])) return null;
    const polygon: Polygon = {type:"Polygon", coordinates:[ring]};
    return validatePointObjectReplacementAoi(polygon).valid ? polygon : null;
  }
  if (value.type !== "relation" || value.tags.type !== "multipolygon" || !Array.isArray(value.members) || value.members.length > 100) return null;
  const outer: Position[][] = []; const inner: Position[][] = [];
  let count = 0;
  for (const member of value.members) {
    if (!record(member) || member.type !== "way" || !["outer","inner", ""].includes(String(member.role ?? ""))) return null;
    const part = positions(member.geometry);
    if (!part || (count += part.length) > MAX_POSITIONS) return null;
    (member.role === "inner" ? inner : outer).push(part);
  }
  const shells = stitch(outer); const holes = stitch(inner);
  if (!shells?.length || !holes || !shellsAreDisjoint(shells)) return null;
  const polygons: Position[][][] = shells.map(shell => [shell]);
  for (const hole of holes) {
    const owners = polygons.filter(polygon => validatePointObjectReplacementAoi({type:"Polygon",coordinates:[...polygon,hole]}).valid);
    if (owners.length !== 1) return null;
    owners[0].push(hole);
  }
  return polygons.length === 1 ? {type:"Polygon",coordinates:polygons[0]} : {type:"MultiPolygon",coordinates:polygons};
}

export function explicitSourceHeight(tags: Readonly<Record<string,string>>): {renderHeightM:number|null;renderMinHeightM:number|null} {
  const meters = (value: string | undefined) => {
    const match = /^(\d+(?:\.\d+)?)\s*(m|ft)?$/.exec(value?.trim() ?? "");
    if (!match) return null;
    const valueM = Number(match[1]) * (match[2] === "ft" ? 0.3048 : 1);
    return valueM >= 0 && valueM <= 1200 ? valueM : null;
  };
  const height = meters(tags.height ?? tags["tag.height"]);
  const base = meters(tags.min_height ?? tags["tag.min_height"]);
  return {renderHeightM: height && (base === null || base < height) ? height : null, renderMinHeightM: base !== null && height !== null && base < height ? base : null};
}
