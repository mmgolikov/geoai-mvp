import type {
  SpatialGeometryQualityV1,
  SpatialGeometryV1,
  SpatialPositionV1,
  SpatialQualityIssueV1
} from "@/src/types/spatial-data-v1";

export type SpatialGeometryValidationOptionsV1 = {
  bbox?: [number, number, number, number];
  sourceAlignmentReviewed?: boolean;
};

function allPositions(geometry: SpatialGeometryV1): SpatialPositionV1[] {
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates];
    case "MultiPoint":
    case "LineString":
      return geometry.coordinates;
    case "MultiLineString":
    case "Polygon":
      return geometry.coordinates.flat();
    case "MultiPolygon":
      return geometry.coordinates.flat(2);
  }
}

function positionsEqual(left: SpatialPositionV1, right: SpatialPositionV1) {
  return left[0] === right[0] && left[1] === right[1];
}

function polygonRings(geometry: SpatialGeometryV1): SpatialPositionV1[][] {
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

function orientation(a: SpatialPositionV1, b: SpatialPositionV1, c: SpatialPositionV1) {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) < 1e-12) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a: SpatialPositionV1, b: SpatialPositionV1, c: SpatialPositionV1) {
  return (
    b[0] <= Math.max(a[0], c[0]) + 1e-12 &&
    b[0] + 1e-12 >= Math.min(a[0], c[0]) &&
    b[1] <= Math.max(a[1], c[1]) + 1e-12 &&
    b[1] + 1e-12 >= Math.min(a[1], c[1])
  );
}

function segmentsIntersect(
  firstStart: SpatialPositionV1,
  firstEnd: SpatialPositionV1,
  secondStart: SpatialPositionV1,
  secondEnd: SpatialPositionV1
) {
  const first = orientation(firstStart, firstEnd, secondStart);
  const second = orientation(firstStart, firstEnd, secondEnd);
  const third = orientation(secondStart, secondEnd, firstStart);
  const fourth = orientation(secondStart, secondEnd, firstEnd);

  if (first !== second && third !== fourth) return true;
  if (first === 0 && onSegment(firstStart, secondStart, firstEnd)) return true;
  if (second === 0 && onSegment(firstStart, secondEnd, firstEnd)) return true;
  if (third === 0 && onSegment(secondStart, firstStart, secondEnd)) return true;
  return fourth === 0 && onSegment(secondStart, firstEnd, secondEnd);
}

function countRingSelfIntersections(ring: SpatialPositionV1[]) {
  if (ring.length < 4) return 0;
  let count = 0;
  const segmentCount = ring.length - 1;

  for (let firstIndex = 0; firstIndex < segmentCount; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < segmentCount; secondIndex += 1) {
      const adjacent = Math.abs(firstIndex - secondIndex) <= 1;
      const closureAdjacent = firstIndex === 0 && secondIndex === segmentCount - 1;
      if (adjacent || closureAdjacent) continue;

      if (
        segmentsIntersect(
          ring[firstIndex],
          ring[firstIndex + 1],
          ring[secondIndex],
          ring[secondIndex + 1]
        )
      ) {
        count += 1;
      }
    }
  }

  return count;
}

function averagePosition(positions: SpatialPositionV1[]) {
  if (positions.length === 0) return null;
  const sum = positions.reduce(
    (total, position) => ({ longitude: total.longitude + position[0], latitude: total.latitude + position[1] }),
    { longitude: 0, latitude: 0 }
  );
  return { longitude: sum.longitude / positions.length, latitude: sum.latitude / positions.length };
}

function pointInRing(point: { longitude: number; latitude: number }, ring: SpatialPositionV1[]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    const intersects =
      currentPoint[1] > point.latitude !== previousPoint[1] > point.latitude &&
      point.longitude <
        ((previousPoint[0] - currentPoint[0]) * (point.latitude - currentPoint[1])) /
          (previousPoint[1] - currentPoint[1] || Number.EPSILON) +
          currentPoint[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

export function calculateSpatialGeometryCentroidV1(geometry: SpatialGeometryV1) {
  return averagePosition(allPositions(geometry));
}

export function validateSpatialGeometryV1(
  geometry: SpatialGeometryV1,
  options: SpatialGeometryValidationOptionsV1 = {}
): SpatialGeometryQualityV1 {
  const issues: SpatialQualityIssueV1[] = [];
  const positions = allPositions(geometry);
  const bbox = options.bbox ?? [-180, -90, 180, 90];
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox;
  const coordinateRangeValid =
    positions.length > 0 &&
    positions.every(
      (position) =>
        Number.isFinite(position[0]) &&
        Number.isFinite(position[1]) &&
        position[0] >= minLongitude &&
        position[0] <= maxLongitude &&
        position[1] >= minLatitude &&
        position[1] <= maxLatitude
    );

  if (positions.length === 0) {
    issues.push({ severity: "error", code: "empty_geometry", message: "Geometry contains no coordinates." });
  }
  if (!coordinateRangeValid) {
    issues.push({
      severity: "error",
      code: "coordinate_range_invalid",
      message: "One or more coordinates are non-finite or outside the approved processing envelope."
    });
  }

  const rings = polygonRings(geometry);
  const ringClosed = rings.length > 0 ? rings.every((ring) => ring.length >= 4 && positionsEqual(ring[0], ring[ring.length - 1])) : null;
  if (ringClosed === false) {
    issues.push({ severity: "error", code: "ring_not_closed", message: "Polygon ring is not closed." });
  }

  const emptyPartCount = rings.filter((ring) => ring.length < 4).length;
  if (emptyPartCount > 0) {
    issues.push({
      severity: "error",
      code: "empty_or_short_polygon_part",
      message: `${emptyPartCount} polygon part(s) contain fewer than four coordinates.`
    });
  }

  const selfIntersectionCount = rings.reduce((count, ring) => count + countRingSelfIntersections(ring), 0);
  if (selfIntersectionCount > 0) {
    issues.push({
      severity: "error",
      code: "self_intersection",
      message: `${selfIntersectionCount} non-adjacent polygon segment intersection(s) were detected.`
    });
  }

  const centroid = calculateSpatialGeometryCentroidV1(geometry);
  const centroidInside = rings.length > 0 && centroid ? pointInRing(centroid, rings[0]) : null;
  if (centroidInside === false) {
    issues.push({
      severity: "warning",
      code: "centroid_outside",
      message: "The simple coordinate-average centroid is outside the exterior polygon ring; use point-on-surface for UI anchors."
    });
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    ringClosed,
    selfIntersectionCount,
    emptyPartCount,
    centroidInside,
    pointOnSurfaceInside: centroidInside,
    coordinateRangeValid,
    areaPlausible: null,
    lengthPlausible: null,
    overlapPolicyPassed: null,
    sourceAlignmentReviewed: options.sourceAlignmentReviewed ?? false,
    sourceAlignmentStatus: options.sourceAlignmentReviewed ? "reviewed" : "pending_independent_review",
    issues
  };
}
