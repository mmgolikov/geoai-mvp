export const POINT_OBJECT_TRUSTED_IDENTITY_ANCHOR_MAX_DISTANCE_M = 500 as const;
export const POINT_OBJECT_TRUSTED_IDENTITY_MAX_BBOX_SPAN_M = 5_000 as const;

export type PointObjectResolutionMethod = "nominatim_reverse" | "nominatim_lookup";

export type PointObjectLookupAssociation =
  | "open_map_geometry_contains_point"
  | "reverse_nearest_indexed_object_not_point_in_polygon"
  | "trusted_open_map_identity";

export type PointObjectTrustedIdentityAnchorResult =
  | {
      matched: true;
      basis: "geometry_contains_anchor" | "centroid_within_tolerance" | "bounded_bbox_within_tolerance";
      centroidDistanceM: number;
    }
  | {
      matched: false;
      basis: null;
      centroidDistanceM: number | null;
    };

type Wgs84Point = readonly [longitude: number, latitude: number];
type Wgs84BoundingBox = readonly [south: number, north: number, west: number, east: number];

function validPoint(value: Wgs84Point): boolean {
  return value.length === 2 &&
    Number.isFinite(value[0]) && Math.abs(value[0]) <= 180 &&
    Number.isFinite(value[1]) && Math.abs(value[1]) <= 90;
}

function validBoundingBox(value: Wgs84BoundingBox): boolean {
  return value.length === 4 && value.every(Number.isFinite) &&
    value[0] >= -90 && value[1] <= 90 && value[2] >= -180 && value[3] <= 180 &&
    value[0] <= value[1] && value[2] <= value[3];
}

function radians(value: number): number {
  return value * Math.PI / 180;
}

function distanceM(left: Wgs84Point, right: Wgs84Point): number {
  const earthRadiusM = 6_371_008.8;
  const latitudeDelta = radians(right[1] - left[1]);
  const longitudeDelta = radians(right[0] - left[0]);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(left[1])) * Math.cos(radians(right[1])) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function boundedBoxMatch(anchor: Wgs84Point, boundingBox: Wgs84BoundingBox): boolean {
  if (!validBoundingBox(boundingBox)) return false;
  const [south, north, west, east] = boundingBox;
  const centreLatitude = (south + north) / 2;
  const widthM = distanceM([west, centreLatitude], [east, centreLatitude]);
  const heightM = distanceM([west, south], [west, north]);
  if (widthM > POINT_OBJECT_TRUSTED_IDENTITY_MAX_BBOX_SPAN_M || heightM > POINT_OBJECT_TRUSTED_IDENTITY_MAX_BBOX_SPAN_M) {
    return false;
  }
  const closest: Wgs84Point = [
    Math.max(west, Math.min(east, anchor[0])),
    Math.max(south, Math.min(north, anchor[1]))
  ];
  return distanceM(anchor, closest) <= POINT_OBJECT_TRUSTED_IDENTITY_ANCHOR_MAX_DISTANCE_M;
}

/**
 * Binds an exact OSM lookup result to the selected object-level map anchor.
 * Exact identity alone is insufficient: a stale or modified browser session
 * must not combine an object from another place with context around this point.
 */
export function matchPointObjectTrustedIdentityAnchor(input: {
  anchor: Wgs84Point;
  centroid: Wgs84Point;
  geometryContainsAnchor: boolean;
  boundingBox: Wgs84BoundingBox | null;
}): PointObjectTrustedIdentityAnchorResult {
  if (!validPoint(input.anchor) || !validPoint(input.centroid)) {
    return { matched: false, basis: null, centroidDistanceM: null };
  }
  const centroidDistanceM = Math.round(distanceM(input.anchor, input.centroid));
  if (input.geometryContainsAnchor) {
    return { matched: true, basis: "geometry_contains_anchor", centroidDistanceM };
  }
  if (centroidDistanceM <= POINT_OBJECT_TRUSTED_IDENTITY_ANCHOR_MAX_DISTANCE_M) {
    return { matched: true, basis: "centroid_within_tolerance", centroidDistanceM };
  }
  if (input.boundingBox && boundedBoxMatch(input.anchor, input.boundingBox)) {
    return { matched: true, basis: "bounded_bbox_within_tolerance", centroidDistanceM };
  }
  return { matched: false, basis: null, centroidDistanceM };
}

export function pointObjectLookupAssociation(
  matchMethod: PointObjectResolutionMethod,
  geometryContainsAnchor: boolean
): PointObjectLookupAssociation {
  if (matchMethod === "nominatim_lookup") return "trusted_open_map_identity";
  return geometryContainsAnchor
    ? "open_map_geometry_contains_point"
    : "reverse_nearest_indexed_object_not_point_in_polygon";
}

export function pointObjectIdentityEvidenceDescriptor(
  matchMethod: PointObjectResolutionMethod,
  coordinateAssociation: PointObjectLookupAssociation
): { label: string; proofLimit: string } {
  if (matchMethod === "nominatim_lookup") {
    return {
      label: "OpenStreetMap object resolved by exact Nominatim lookup",
      proofLimit: `The exact OpenStreetMap identity was resolved through Nominatim lookup and spatially bound to the selected anchor by returned geometry or a capped ${POINT_OBJECT_TRUSTED_IDENTITY_ANCHOR_MAX_DISTANCE_M} m object-level tolerance; it remains open community context, not an official cadastral, title or legal identity.`
    };
  }
  if (coordinateAssociation === "open_map_geometry_contains_point") {
    return {
      label: "OpenStreetMap object returned by Nominatim reverse",
      proofLimit: "The returned open-map polygon contains the analysis point; this remains community context, not proof that it is the same feature rendered by the map and not an official cadastral or parcel boundary."
    };
  }
  return {
    label: "OpenStreetMap object returned by Nominatim reverse",
    proofLimit: "Nominatim reverse returns the nearest suitable indexed OSM object; it does not prove that the analysis point is inside that object."
  };
}
