export type PublicDemoPoint = {
  latitude: number;
  longitude: number;
};

export const publicDemoPoint: PublicDemoPoint = {
  latitude: 25.2048,
  longitude: 55.2708
};

export const publicDemoBbox = {
  west: 55.2,
  south: 25.05,
  east: 55.35,
  north: 25.2
} as const;

export const publicDemoOverpassBbox = {
  west: 55.27,
  south: 25.195,
  east: 55.28,
  north: 25.205
} as const;

export function parseCoordinate(raw: string | null, axis: "latitude" | "longitude") {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  const min = axis === "latitude" ? -90 : -180;
  const max = axis === "latitude" ? 90 : 180;
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

export function readPointFromSearchParams(searchParams: URLSearchParams): PublicDemoPoint | null {
  const latitude = parseCoordinate(searchParams.get("lat"), "latitude");
  const longitude = parseCoordinate(searchParams.get("lng"), "longitude");
  return latitude === null || longitude === null ? null : { latitude, longitude };
}

export function isPointInRange(point: PublicDemoPoint) {
  return Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180;
}

export function parseBoundedIsoDateRange(startDate: string | null, endDate: string | null, maximumDays = 370) {
  if (!startDate && !endDate) return null;
  if (!startDate || !endDate) return { error: "startDate and endDate must be supplied together." } as const;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return { error: "startDate and endDate must use YYYY-MM-DD." } as const;
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const durationDays = (end.getTime() - start.getTime()) / 86_400_000 + 1;
  if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > maximumDays) {
    return { error: `Date range must contain between 1 and ${maximumDays} days.` } as const;
  }

  return { startDate, endDate, durationDays } as const;
}
