import type { PointObjectFindBounds } from "./point-to-object-find-contract";

export type NavigationCamera = { center: [number, number]; zoom: number; bearing: number; pitch: number };

/** Fit only returned source coordinates; this never expands the search request. */
export function projectResultCoordinateBounds(results: readonly { longitude: number; latitude: number }[]): PointObjectFindBounds | null {
  const positions = results.filter(({ longitude, latitude }) => Number.isFinite(longitude) && Number.isFinite(latitude) && Math.abs(longitude) <= 180 && Math.abs(latitude) <= 85);
  if (!positions.length) return null;
  const west = Math.min(...positions.map(result => result.longitude));
  const south = Math.min(...positions.map(result => result.latitude));
  const east = Math.max(...positions.map(result => result.longitude));
  const north = Math.max(...positions.map(result => result.latitude));
  return [west, south, east, north];
}

export function findResultCoordinateBounds(results: readonly { longitude: number; latitude: number }[]): PointObjectFindBounds | null {
  const bounds = projectResultCoordinateBounds(results);
  // A malformed/restored set spanning continents must not pull the camera away
  // from a bounded Find result. All supported market queries are under 8 km.
  return bounds && bounds[2] - bounds[0] <= 1 && bounds[3] - bounds[1] <= 1 ? bounds : null;
}

export function isCompletedNavigationCamera(actual: NavigationCamera, expected?: NavigationCamera): boolean {
  if (!expected) return false;
  const bearingDelta = ((actual.bearing - expected.bearing + 540) % 360) - 180;
  return Math.abs(actual.center[0] - expected.center[0]) < 1e-7 &&
    Math.abs(actual.center[1] - expected.center[1]) < 1e-7 &&
    Math.abs(actual.zoom - expected.zoom) < 1e-7 && Math.abs(bearingDelta) < 1e-7 &&
    Math.abs(actual.pitch - expected.pitch) < 1e-7;
}

export function findRestoreNavigationTarget(bounds: PointObjectFindBounds, artifactId: string) {
  const [west, south, east, north] = bounds;
  return {
    requestId: `restore-find-bounds:${artifactId}`,
    longitude: (west + east) / 2,
    latitude: (south + north) / 2,
    boundingBox: [south, north, west, east] as [number, number, number, number],
    selectAfterNavigation: false as const,
    viewMode: "2d" as const
  };
}

export function sameFindBounds(left: PointObjectFindBounds | null, right: PointObjectFindBounds): boolean {
  return left !== null && left.every((coordinate, index) => Math.abs(coordinate - right[index]) < 1e-6);
}

export function matchesRestoredFindViewport(
  candidate: PointObjectFindBounds,
  pending: { bounds: PointObjectFindBounds; requestId: string } | null,
  navigationRequestId?: string
): boolean {
  if (!pending || navigationRequestId !== pending.requestId) return false;
  const [west, south, east, north] = candidate;
  const [queryWest, querySouth, queryEast, queryNorth] = pending.bounds;
  const candidateArea = Math.max(0, east - west) * Math.max(0, north - south);
  const queryArea = Math.max(Number.EPSILON, queryEast - queryWest) * Math.max(Number.EPSILON, queryNorth - querySouth);
  return west <= queryWest && south <= querySouth && east >= queryEast && north >= queryNorth && candidateArea / queryArea <= 6;
}
