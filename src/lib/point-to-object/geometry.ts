import type { GeoJsonGeometry, Position } from "./contracts";

export const SUPPORTED_CALCULATION_CRS = ["EPSG:32640", "EPSG:32648"] as const;
export type CalculationCrs = (typeof SUPPORTED_CALCULATION_CRS)[number];

const WGS84_SEMI_MAJOR_M = 6_378_137;
const WGS84_FLATTENING = 1 / 298.257_223_563;
const UTM_SCALE = 0.9996;

type ProjectedPosition = [easting: number, northing: number];

export interface GeometryMeasurement {
  containment: "inside" | "boundary" | "outside";
  distanceM: number;
}

export function isFinitePosition(value: unknown): value is Position {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === "number" && Number.isFinite(value[0]) && value[0] >= -180 && value[0] <= 180 &&
    typeof value[1] === "number" && Number.isFinite(value[1]) && value[1] >= -90 && value[1] <= 90;
}

export function projectPosition(position: Position, crs: CalculationCrs): ProjectedPosition {
  if (!isFinitePosition(position)) throw new Error("Unable to project an invalid WGS84 coordinate.");
  const zone = crs === "EPSG:32640" ? 40 : 48;
  const latitude = position[1] * Math.PI / 180;
  const longitude = position[0] * Math.PI / 180;
  const centralMeridian = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const eccentricitySquared = WGS84_FLATTENING * (2 - WGS84_FLATTENING);
  const secondEccentricitySquared = eccentricitySquared / (1 - eccentricitySquared);
  const sinLatitude = Math.sin(latitude);
  const cosLatitude = Math.cos(latitude);
  const tanLatitude = Math.tan(latitude);
  const radiusOfCurvature = WGS84_SEMI_MAJOR_M /
    Math.sqrt(1 - eccentricitySquared * sinLatitude * sinLatitude);
  const tangentSquared = tanLatitude * tanLatitude;
  const cosineTerm = secondEccentricitySquared * cosLatitude * cosLatitude;
  const longitudeTerm = cosLatitude * (longitude - centralMeridian);
  const e4 = eccentricitySquared * eccentricitySquared;
  const e6 = e4 * eccentricitySquared;
  const meridionalArc = WGS84_SEMI_MAJOR_M * (
    (1 - eccentricitySquared / 4 - 3 * e4 / 64 - 5 * e6 / 256) * latitude -
    (3 * eccentricitySquared / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * latitude) +
    (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * latitude) -
    (35 * e6 / 3072) * Math.sin(6 * latitude)
  );
  const longitudeTerm2 = longitudeTerm * longitudeTerm;
  const easting = 500_000 + UTM_SCALE * radiusOfCurvature * (
    longitudeTerm + (1 - tangentSquared + cosineTerm) * longitudeTerm ** 3 / 6 +
    (5 - 18 * tangentSquared + tangentSquared ** 2 + 72 * cosineTerm - 58 * secondEccentricitySquared) *
      longitudeTerm ** 5 / 120
  );
  const northing = UTM_SCALE * (
    meridionalArc + radiusOfCurvature * tanLatitude * (
      longitudeTerm2 / 2 +
      (5 - tangentSquared + 9 * cosineTerm + 4 * cosineTerm ** 2) * longitudeTerm2 ** 2 / 24 +
      (61 - 58 * tangentSquared + tangentSquared ** 2 + 600 * cosineTerm - 330 * secondEccentricitySquared) *
        longitudeTerm2 ** 3 / 720
    )
  );
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
    throw new Error("Unable to project WGS84 coordinate into the bounded UTM frame.");
  }
  return [easting, northing];
}

function distanceBetween(left: ProjectedPosition, right: ProjectedPosition): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1]);
}

function pointToSegmentDistance(
  point: ProjectedPosition,
  start: ProjectedPosition,
  end: ProjectedPosition
): number {
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];
  const squaredLength = deltaX * deltaX + deltaY * deltaY;
  if (squaredLength === 0) return distanceBetween(point, start);

  const projection = ((point[0] - start[0]) * deltaX + (point[1] - start[1]) * deltaY) /
    squaredLength;
  const boundedProjection = Math.max(0, Math.min(1, projection));
  return distanceBetween(point, [
    start[0] + boundedProjection * deltaX,
    start[1] + boundedProjection * deltaY
  ]);
}

function minimumRingDistance(point: ProjectedPosition, ring: ProjectedPosition[]): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 0; index < ring.length - 1; index += 1) {
    minimum = Math.min(minimum, pointToSegmentDistance(point, ring[index], ring[index + 1]));
  }
  return minimum;
}

function ringContainsPoint(point: ProjectedPosition, ring: ProjectedPosition[]): boolean {
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const [currentX, currentY] = ring[current];
    const [previousX, previousY] = ring[previous];
    const crossesRay = (currentY > point[1]) !== (previousY > point[1]) &&
      point[0] < ((previousX - currentX) * (point[1] - currentY)) /
        (previousY - currentY || Number.EPSILON) + currentX;
    if (crossesRay) inside = !inside;
  }
  return inside;
}

function measurePolygon(
  point: ProjectedPosition,
  polygon: ProjectedPosition[][],
  boundaryToleranceM: number
): GeometryMeasurement {
  const ringDistances = polygon.map((ring) => minimumRingDistance(point, ring));
  const minimumDistance = Math.min(...ringDistances);
  if (minimumDistance <= boundaryToleranceM) {
    return { containment: "boundary", distanceM: 0 };
  }

  const insideOuter = ringContainsPoint(point, polygon[0]);
  const insideHole = polygon.slice(1).some((ring) => ringContainsPoint(point, ring));
  if (insideOuter && !insideHole) return { containment: "inside", distanceM: 0 };
  return { containment: "outside", distanceM: minimumDistance };
}

function projectLine(line: Position[], crs: CalculationCrs): ProjectedPosition[] {
  return line.map((position) => projectPosition(position, crs));
}

export function measurePointAgainstGeometry(
  point: Position,
  geometry: GeoJsonGeometry,
  crs: CalculationCrs,
  boundaryToleranceM = 0.5
): GeometryMeasurement {
  const projectedPoint = projectPosition(point, crs);

  if (geometry.type === "Point") {
    return {
      containment: "outside",
      distanceM: distanceBetween(projectedPoint, projectPosition(geometry.coordinates, crs))
    };
  }

  if (geometry.type === "LineString") {
    const projectedLine = projectLine(geometry.coordinates, crs);
    let minimumDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < projectedLine.length - 1; index += 1) {
      minimumDistance = Math.min(
        minimumDistance,
        pointToSegmentDistance(projectedPoint, projectedLine[index], projectedLine[index + 1])
      );
    }
    return {
      containment: minimumDistance <= boundaryToleranceM ? "boundary" : "outside",
      distanceM: minimumDistance <= boundaryToleranceM ? 0 : minimumDistance
    };
  }

  if (geometry.type === "Polygon") {
    return measurePolygon(
      projectedPoint,
      geometry.coordinates.map((ring) => projectLine(ring, crs)),
      boundaryToleranceM
    );
  }

  const measurements = geometry.coordinates.map((polygon) =>
    measurePolygon(
      projectedPoint,
      polygon.map((ring) => projectLine(ring, crs)),
      boundaryToleranceM
    )
  );
  const boundary = measurements.find((measurement) => measurement.containment === "boundary");
  if (boundary) return boundary;
  const inside = measurements.find((measurement) => measurement.containment === "inside");
  if (inside) return inside;
  return measurements.reduce((nearest, candidate) =>
    candidate.distanceM < nearest.distanceM ? candidate : nearest
  );
}

export function geometryContainsPoint(
  point: Position,
  geometry: GeoJsonGeometry,
  crs: CalculationCrs,
  boundaryToleranceM = 0.5
): boolean {
  const measurement = measurePointAgainstGeometry(point, geometry, crs, boundaryToleranceM);
  return measurement.containment === "inside" || measurement.containment === "boundary";
}

export function geometryRepresentativePoint(geometry: GeoJsonGeometry): Position {
  if (geometry.type === "Point") return geometry.coordinates;

  const points: Position[] = geometry.type === "LineString"
    ? geometry.coordinates
    : geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.coordinates[0][0];

  const sum = points.reduce<[number, number]>(
    (result, point) => [result[0] + point[0], result[1] + point[1]],
    [0, 0]
  );
  return [sum[0] / points.length, sum[1] / points.length];
}

export function validateGeometry(value: unknown): value is GeoJsonGeometry {
  if (!value || typeof value !== "object") return false;
  const geometry = value as { type?: unknown; coordinates?: unknown };
  if (geometry.type === "Point") return isFinitePosition(geometry.coordinates);
  if (geometry.type === "LineString") {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2 &&
      geometry.coordinates.every(isFinitePosition);
  }
  if (geometry.type === "Polygon") {
    return validatePolygonCoordinates(geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 &&
      geometry.coordinates.every(validatePolygonCoordinates);
  }
  return false;
}

function validatePolygonCoordinates(value: unknown): value is Position[][] {
  return Array.isArray(value) && value.length > 0 && value.every((ring) =>
    Array.isArray(ring) && ring.length >= 4 && ring.every(isFinitePosition) &&
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
  );
}
