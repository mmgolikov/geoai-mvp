import type { PolygonMeasurements, SelectedPoint, UserDrawnAoi } from "@/src/types/geo";

export type PolygonValidation = {
  valid: boolean;
  message: string;
  measurements?: PolygonMeasurements;
};

const minAreaSqM = 100;
const maxAreaSqM = 500 * 1_000_000;
const earthRadiusM = 6_371_000;

function toRadians(value: number) {
  return value * Math.PI / 180;
}

function haversineDistance(a: [number, number], b: [number, number]) {
  const dLat = toRadians(b[1] - a[1]);
  const dLng = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function projectedPoint(coord: [number, number], referenceLat: number) {
  const metersPerDegreeLng = 111_320 * Math.cos(toRadians(referenceLat));
  return {
    x: coord[0] * metersPerDegreeLng,
    y: coord[1] * 110_540
  };
}

function fromProjectedPoint(point: { x: number; y: number }, referenceLat: number): SelectedPoint {
  const metersPerDegreeLng = 111_320 * Math.cos(toRadians(referenceLat));
  return {
    longitude: point.x / metersPerDegreeLng,
    latitude: point.y / 110_540
  };
}

function sameCoordinate(a: [number, number], b: [number, number]) {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

function orientation(a: [number, number], b: [number, number], c: [number, number]) {
  return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
}

function onSegment(a: [number, number], b: [number, number], c: [number, number]) {
  return (
    Math.min(a[0], c[0]) <= b[0] &&
    b[0] <= Math.max(a[0], c[0]) &&
    Math.min(a[1], c[1]) <= b[1] &&
    b[1] <= Math.max(a[1], c[1])
  );
}

function segmentsIntersect(a1: [number, number], a2: [number, number], b1: [number, number], b2: [number, number]) {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (Math.sign(o1) !== Math.sign(o2) && Math.sign(o3) !== Math.sign(o4)) {
    return true;
  }

  return (
    (Math.abs(o1) < 1e-12 && onSegment(a1, b1, a2)) ||
    (Math.abs(o2) < 1e-12 && onSegment(a1, b2, a2)) ||
    (Math.abs(o3) < 1e-12 && onSegment(b1, a1, b2)) ||
    (Math.abs(o4) < 1e-12 && onSegment(b1, a2, b2))
  );
}

function hasSelfIntersection(ring: [number, number][]) {
  for (let i = 0; i < ring.length - 1; i += 1) {
    for (let j = i + 1; j < ring.length - 1; j += 1) {
      const adjacent = Math.abs(i - j) <= 1 || (i === 0 && j === ring.length - 2);
      if (adjacent) {
        continue;
      }

      if (segmentsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) {
        return true;
      }
    }
  }

  return false;
}

export function closePolygonRing(vertices: [number, number][]) {
  if (vertices.length === 0) {
    return [];
  }

  return sameCoordinate(vertices[0], vertices[vertices.length - 1])
    ? vertices
    : [...vertices, vertices[0]];
}

export function calculatePolygonMeasurements(vertices: [number, number][]): PolygonMeasurements {
  const ring = closePolygonRing(vertices);
  const openRing = ring.slice(0, -1);
  const referenceLat = openRing.reduce((sum, coord) => sum + coord[1], 0) / Math.max(openRing.length, 1);
  const projected = ring.map((coord) => projectedPoint(coord, referenceLat));
  let signedArea = 0;
  let centroidX = 0;
  let centroidY = 0;
  let perimeterM = 0;

  for (let i = 0; i < projected.length - 1; i += 1) {
    const current = projected[i];
    const next = projected[i + 1];
    const cross = current.x * next.y - next.x * current.y;
    signedArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
    perimeterM += haversineDistance(ring[i], ring[i + 1]);
  }

  signedArea /= 2;
  const areaSqM = Math.abs(signedArea);
  const centroid = Math.abs(signedArea) < 1e-6
    ? {
        latitude: referenceLat,
        longitude: openRing.reduce((sum, coord) => sum + coord[0], 0) / Math.max(openRing.length, 1)
      }
    : fromProjectedPoint({
        x: centroidX / (6 * signedArea),
        y: centroidY / (6 * signedArea)
      }, referenceLat);
  const lngs = openRing.map((coord) => coord[0]);
  const lats = openRing.map((coord) => coord[1]);

  return {
    areaSqM,
    areaSqKm: areaSqM / 1_000_000,
    perimeterM,
    perimeterKm: perimeterM / 1_000,
    centroid,
    bbox: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
    vertexCount: openRing.length
  };
}

export function validatePolygonVertices(vertices: [number, number][]): PolygonValidation {
  if (vertices.length < 3) {
    return { valid: false, message: "Add at least 3 vertices before closing the polygon." };
  }

  for (let i = 1; i < vertices.length; i += 1) {
    if (sameCoordinate(vertices[i - 1], vertices[i])) {
      return { valid: false, message: "Remove duplicate consecutive vertices before closing." };
    }
  }

  const ring = closePolygonRing(vertices);
  if (hasSelfIntersection(ring)) {
    return { valid: false, message: "Polygon edges intersect. Adjust the drawing before analysis." };
  }

  const measurements = calculatePolygonMeasurements(vertices);
  if (measurements.areaSqM < minAreaSqM) {
    return { valid: false, message: "AOI is too small for screening. Draw at least 100 sq m.", measurements };
  }

  if (measurements.areaSqM > maxAreaSqM) {
    return { valid: false, message: "AOI is too large for this MVP. Keep it below 500 sq km.", measurements };
  }

  return { valid: true, message: "Polygon AOI ready for screening.", measurements };
}

export function createUserDrawnAoi(vertices: [number, number][], projectId?: string): UserDrawnAoi {
  const validation = validatePolygonVertices(vertices);
  if (!validation.valid || !validation.measurements) {
    throw new Error(validation.message);
  }

  const ring = closePolygonRing(vertices);
  const timestamp = Date.now();

  return {
    id: `user-aoi-${timestamp}`,
    name: `User-drawn AOI ${validation.measurements.areaSqKm.toFixed(2)} sq km`,
    geometryType: "Polygon",
    geometry: {
      type: "Polygon",
      coordinates: [ring]
    },
    coordinates: ring,
    centroid: validation.measurements.centroid,
    bbox: validation.measurements.bbox,
    measurements: validation.measurements,
    source: "user_drawn_polygon",
    dataMode: "user_provided",
    confidence: "validation_required",
    projectId,
    limitations: [
      "User-drawn AOI is a screening boundary only and is not an official parcel, zoning, cadastral, planning, or ownership boundary.",
      "Area and perimeter are approximate client-side measurements for demo screening."
    ]
  };
}

export function formatArea(areaSqM: number) {
  return areaSqM >= 1_000_000
    ? `${(areaSqM / 1_000_000).toFixed(2)} sq km`
    : `${Math.round(areaSqM).toLocaleString()} sq m`;
}

export function formatPerimeter(perimeterM: number) {
  return perimeterM >= 1_000
    ? `${(perimeterM / 1_000).toFixed(2)} km`
    : `${Math.round(perimeterM).toLocaleString()} m`;
}
