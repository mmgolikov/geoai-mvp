import "server-only";

import { LIVE_POINT_CAVEAT } from "@/src/lib/point-to-object/contracts";
import { semanticHash } from "@/src/lib/point-to-object/hash";
import type {
  PointObjectEvidencePack,
  PointObjectEvidenceReference
} from "./point-to-object-evidence";

const DEFAULT_NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/";
const DEFAULT_NOMINATIM_USER_AGENT =
  "GeoAI-PointToObject-Preview/1.0 (+https://github.com/mmgolikov/geoai-mvp)";
const APPLICATION_REFERER = "https://github.com/mmgolikov/geoai-mvp";
const NOMINATIM_TIMEOUT_MS = 7_000;
const NOMINATIM_RESPONSE_MAX_BYTES = 384 * 1024;
const NOMINATIM_REVALIDATE_SECONDS = 24 * 60 * 60;
const NOMINATIM_MIN_INTERVAL_MS = 1_000;
const MAX_GEOMETRY_POSITIONS = 25_000;

const ADDRESS_KEYS = new Set([
  "house_number",
  "road",
  "pedestrian",
  "footway",
  "neighbourhood",
  "quarter",
  "suburb",
  "borough",
  "city_district",
  "district",
  "city",
  "town",
  "village",
  "municipality",
  "county",
  "state_district",
  "state",
  "region",
  "postcode",
  "country",
  "country_code",
  "ISO3166-2-lvl3",
  "ISO3166-2-lvl4",
  "ISO3166-2-lvl5",
  "ISO3166-2-lvl6"
]);

const EXTRA_TAG_KEYS = new Set([
  "building",
  "building:part",
  "building:levels",
  "building:min_level",
  "height",
  "min_height",
  "start_date",
  "amenity",
  "shop",
  "tourism",
  "leisure",
  "office",
  "landuse",
  "natural",
  "historic",
  "heritage",
  "architectural_style",
  "wheelchair",
  "access",
  "surface",
  "public_transport",
  "railway",
  "highway",
  "wikidata"
]);

const NUMERIC_TAG_KEYS = new Set([
  "building:levels",
  "building:min_level",
  "height",
  "min_height"
]);

const IDENTIFIER_TAG_KEYS = new Set(["wikidata"]);

const NAME_KEYS = new Set([
  "name",
  "name:en",
  "name:ar",
  "name:ms",
  "name:zh",
  "name:zh-Hans",
  "name:ta",
  "official_name",
  "short_name",
  "alt_name"
]);

type OsmType = "node" | "way" | "relation";
type LookupAssociation =
  | "open_map_geometry_contains_point"
  | "reverse_nearest_indexed_object_not_point_in_polygon";

type SafeGeometry = {
  type: "Point" | "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon";
  coordinates: unknown;
};

type SafeNominatimPlace = {
  placeId: string | null;
  osmType: OsmType;
  osmId: string;
  latitude: number;
  longitude: number;
  name: string | null;
  displayName: string | null;
  category: string | null;
  featureType: string | null;
  addressType: string | null;
  address: Record<string, string>;
  extraTags: Record<string, string>;
  nameDetails: Record<string, string>;
  boundingBox: [south: number, north: number, west: number, east: number] | null;
  geometry: SafeGeometry | null;
  geometryType: SafeGeometry["type"] | null;
  geometryHash: string | null;
};

export type LivePointEvidenceRequest = {
  longitude: number;
  latitude: number;
  /**
   * Retained for wire compatibility only. Client/vector-tile identifiers are
   * deliberately ignored because they are not authoritative OSM identities.
   */
  osmFeatureId?: string | null;
  /** A short BCP-47 preference list, for example `en` or `en,ar`. */
  locale?: string | null;
};

export type LivePointObjectEvidencePack = {
  protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V1";
  evidencePackId: string;
  evidencePackHash: string;
  caseKey: "live";
  caseId: string;
  coordinates: { longitude: number; latitude: number; crs: "EPSG:4326" };
  resolution: {
    status: "resolved";
    resolutionId: string;
    resolutionHash: string;
    matchMethod: "nominatim_reverse";
    coordinateAssociation: LookupAssociation;
    resultCentroidDistanceM: number;
    evidenceQuality: "partial_open_context";
  };
  selectedObject: {
    entityId: string;
    sourceFeatureId: string;
    name: string | null;
    displayAddress: string | null;
    featureClass: string;
    geometryType: SafeGeometry["type"] | null;
    geometryHash: string | null;
    tags: Record<string, string>;
  };
  source: {
    name: "OpenStreetMap";
    service: "Nominatim";
    sourceId: "SPAT-001";
    sourceResponseId: string;
    sourceResponseHash: string;
    observedAt: null;
    acquiredAt: string;
    freshness: "runtime_response_feature_time_unavailable";
    rightsDecisionId: "runtime_open_context_odbl_attribution_required";
    licenceId: "ODbL-1.0";
    attribution: "© OpenStreetMap contributors";
    licenceUrl: "https://www.openstreetmap.org/copyright";
    usagePolicyUrl: "https://operations.osmfoundation.org/policies/nominatim/";
    sourceOfferPath: "/prototype/point-to-object/source-offer";
    officialStatus: "open_context_not_official";
    runtimeNetworkUsed: true;
    persistenceUsed: false;
  };
  nearbyContext: [];
  evidence: PointObjectEvidenceReference[];
  conflicts: string[];
  missingInformation: string[];
  limitations: string[];
  caveat: typeof LIVE_POINT_CAVEAT;
};

/** Use this union at the two AI-core type boundaries while frozen cases coexist. */
export type GroundablePointObjectEvidencePack =
  | PointObjectEvidencePack
  | LivePointObjectEvidencePack;

export type LivePointEvidenceErrorCode =
  | "LIVE_POINT_INVALID"
  | "NOMINATIM_CONFIGURATION_INVALID"
  | "NOMINATIM_TIMEOUT"
  | "NOMINATIM_RATE_LIMITED"
  | "NOMINATIM_UNAVAILABLE"
  | "NOMINATIM_RESPONSE_TOO_LARGE"
  | "NOMINATIM_RESPONSE_INVALID"
  | "OBJECT_NOT_RESOLVED";

export class LivePointEvidenceError extends Error {
  constructor(
    public readonly code: LivePointEvidenceErrorCode,
    public readonly httpStatus: number,
    message: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "LivePointEvidenceError";
  }
}

let nominatimGate: Promise<void> = Promise.resolve();
let lastNominatimDispatchAt = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength = 240): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

function finiteCoordinate(value: unknown, limit: number): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

function positiveIdentifier(value: unknown): string | null {
  const candidate = typeof value === "number" && Number.isSafeInteger(value)
    ? String(value)
    : typeof value === "string" ? value.trim() : "";
  return /^(?!0+$)\d{1,20}$/.test(candidate) ? candidate : null;
}

function cleanTaxonomyToken(value: unknown): string | null {
  const cleaned = cleanText(value, 80);
  return cleaned && /^[a-z0-9][a-z0-9_.:+/-]{0,79}$/i.test(cleaned) ? cleaned : null;
}

function cleanStructuredTagValue(key: string, value: string): string | null {
  const cleaned = cleanText(value, 80);
  if (!cleaned) return null;
  if (NUMERIC_TAG_KEYS.has(key)) {
    const compact = cleaned.replace(/\s+/g, "");
    return /^-?\d{1,4}(?:\.\d{1,3})?(?:m|ft)?$/i.test(compact) ? compact : null;
  }
  if (key === "start_date") {
    return /^(?:\d{4})(?:-\d{2})?(?:-\d{2})?$/.test(cleaned) ? cleaned : null;
  }
  if (IDENTIFIER_TAG_KEYS.has(key)) {
    return /^Q[1-9]\d{0,15}$/.test(cleaned) ? cleaned : null;
  }
  return /^[a-z0-9][a-z0-9_.:+;/-]{0,79}$/i.test(cleaned) ? cleaned : null;
}

function sanitizeLocale(value: string | null | undefined): string {
  if (typeof value !== "string") return "en";
  const compact = value.replace(/\s+/g, "").slice(0, 64);
  return /^(?:[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})?)(?:,(?:[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})?)){0,2}$/.test(compact)
    ? compact
    : "en";
}

function configuredEndpoint(): URL {
  const configured = process.env.POINT_TO_OBJECT_NOMINATIM_ENDPOINT?.trim() || DEFAULT_NOMINATIM_ENDPOINT;
  try {
    const withSlash = configured.endsWith("/") ? configured : `${configured}/`;
    const endpoint = new URL(withSlash);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error("unsafe endpoint");
    }
    return endpoint;
  } catch {
    throw new LivePointEvidenceError(
      "NOMINATIM_CONFIGURATION_INVALID",
      503,
      "The live OpenStreetMap resolver is not configured safely.",
      false
    );
  }
}

function configuredUserAgent(): string {
  const configured = process.env.POINT_TO_OBJECT_NOMINATIM_USER_AGENT?.trim();
  if (!configured || configured.length < 20 || configured.length > 240 || /[\r\n]/.test(configured)) {
    return DEFAULT_NOMINATIM_USER_AGENT;
  }
  return configured;
}

async function waitForNominatimSlot(): Promise<void> {
  let release: (() => void) | undefined;
  const previous = nominatimGate;
  nominatimGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    const waitMs = Math.max(0, lastNominatimDispatchAt + NOMINATIM_MIN_INTERVAL_MS - Date.now());
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    lastNominatimDispatchAt = Date.now();
  } finally {
    release?.();
  }
}

async function readBoundedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > NOMINATIM_RESPONSE_MAX_BYTES) {
    throw new LivePointEvidenceError(
      "NOMINATIM_RESPONSE_TOO_LARGE",
      502,
      "The live OpenStreetMap response exceeded the permitted size.",
      true
    );
  }
  if (!response.body) {
    throw new LivePointEvidenceError(
      "NOMINATIM_RESPONSE_INVALID",
      502,
      "The live OpenStreetMap resolver returned no readable body.",
      true
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteCount = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteCount += value.byteLength;
    if (byteCount > NOMINATIM_RESPONSE_MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new LivePointEvidenceError(
        "NOMINATIM_RESPONSE_TOO_LARGE",
        502,
        "The live OpenStreetMap response exceeded the permitted size.",
        true
      );
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

async function fetchNominatimJson(url: URL): Promise<unknown> {
  await waitForNominatimSlot();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        Referer: APPLICATION_REFERER,
        "User-Agent": configuredUserAgent()
      },
      cache: "force-cache",
      next: { revalidate: NOMINATIM_REVALIDATE_SECONDS }
    });
  } catch (error) {
    if (isTimeout(error)) {
      throw new LivePointEvidenceError(
        "NOMINATIM_TIMEOUT",
        504,
        "The live OpenStreetMap resolver timed out.",
        true
      );
    }
    throw new LivePointEvidenceError(
      "NOMINATIM_UNAVAILABLE",
      502,
      "The live OpenStreetMap resolver could not be reached.",
      true
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new LivePointEvidenceError(
        "NOMINATIM_RATE_LIMITED",
        429,
        "The live OpenStreetMap resolver is temporarily rate limited.",
        true
      );
    }
    throw new LivePointEvidenceError(
      "NOMINATIM_UNAVAILABLE",
      response.status >= 500 ? 502 : 422,
      "The live OpenStreetMap resolver did not return a usable result.",
      response.status >= 500
    );
  }

  let text: string;
  try {
    text = await readBoundedText(response);
  } catch (error) {
    if (error instanceof LivePointEvidenceError) throw error;
    if (isTimeout(error)) {
      throw new LivePointEvidenceError(
        "NOMINATIM_TIMEOUT",
        504,
        "The live OpenStreetMap resolver timed out while reading its response.",
        true
      );
    }
    throw new LivePointEvidenceError(
      "NOMINATIM_UNAVAILABLE",
      502,
      "The live OpenStreetMap resolver response could not be read safely.",
      true
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new LivePointEvidenceError(
      "NOMINATIM_RESPONSE_INVALID",
      502,
      "The live OpenStreetMap resolver returned invalid JSON.",
      true
    );
  }
}

function normalizePosition(value: unknown, counter: { count: number }): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3) return null;
  const longitude = finiteCoordinate(value[0], 180);
  const latitude = finiteCoordinate(value[1], 90);
  if (longitude === null || latitude === null) return null;
  counter.count += 1;
  return counter.count <= MAX_GEOMETRY_POSITIONS ? [longitude, latitude] : null;
}

function normalizeCoordinates(value: unknown, depth: number, counter: { count: number }): unknown | null {
  if (depth === 0) return normalizePosition(value, counter);
  if (!Array.isArray(value) || value.length === 0) return null;
  const output: unknown[] = [];
  for (const item of value) {
    const normalized = normalizeCoordinates(item, depth - 1, counter);
    if (normalized === null) return null;
    output.push(normalized);
  }
  return output;
}

function sanitizeGeometry(value: unknown): SafeGeometry | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  const depthByType: Record<SafeGeometry["type"], number> = {
    Point: 0,
    LineString: 1,
    MultiLineString: 2,
    Polygon: 2,
    MultiPolygon: 3
  };
  if (!(value.type in depthByType)) return null;
  const type = value.type as SafeGeometry["type"];
  const counter = { count: 0 };
  const coordinates = normalizeCoordinates(value.coordinates, depthByType[type], counter);
  return coordinates === null ? null : { type, coordinates };
}

function sanitizeMap(
  value: unknown,
  allowedKeys: Set<string>,
  maxEntries: number
): Record<string, string> {
  if (!isRecord(value)) return {};
  const output: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!allowedKeys.has(key) || Object.keys(output).length >= maxEntries) continue;
    const cleaned = cleanText(raw);
    if (cleaned) output[key] = cleaned;
  }
  return output;
}

function osmType(value: unknown): OsmType | null {
  return value === "node" || value === "way" || value === "relation" ? value : null;
}

function boundingBox(value: unknown): SafeNominatimPlace["boundingBox"] {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const south = finiteCoordinate(value[0], 90);
  const north = finiteCoordinate(value[1], 90);
  const west = finiteCoordinate(value[2], 180);
  const east = finiteCoordinate(value[3], 180);
  return south !== null && north !== null && west !== null && east !== null &&
    south <= north && west <= east
    ? [south, north, west, east]
    : null;
}

function sanitizePlace(value: unknown): SafeNominatimPlace | null {
  if (!isRecord(value)) return null;
  const type = osmType(value.osm_type);
  const id = positiveIdentifier(value.osm_id);
  const latitude = finiteCoordinate(value.lat, 90);
  const longitude = finiteCoordinate(value.lon, 180);
  if (!type || !id || latitude === null || longitude === null) return null;

  const geometry = sanitizeGeometry(value.geojson);
  return {
    placeId: positiveIdentifier(value.place_id),
    osmType: type,
    osmId: id,
    latitude,
    longitude,
    name: cleanText(value.name),
    displayName: cleanText(value.display_name, 500),
    category: cleanTaxonomyToken(value.category ?? value.class),
    featureType: cleanTaxonomyToken(value.type),
    addressType: cleanTaxonomyToken(value.addresstype),
    address: sanitizeMap(value.address, ADDRESS_KEYS, 24),
    extraTags: sanitizeMap(value.extratags, EXTRA_TAG_KEYS, 24),
    nameDetails: sanitizeMap(value.namedetails, NAME_KEYS, 10),
    boundingBox: boundingBox(value.boundingbox),
    geometry,
    geometryType: geometry?.type ?? null,
    geometryHash: geometry ? semanticHash(geometry) : null
  };
}

function radians(value: number): number {
  return value * Math.PI / 180;
}

function distanceM(left: [number, number], right: [number, number]): number {
  const earthRadiusM = 6_371_008.8;
  const latitudeDelta = radians(right[1] - left[1]);
  const longitudeDelta = radians(right[0] - left[0]);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(left[1])) * Math.cos(radians(right[1])) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInRing(point: [number, number], ring: unknown): boolean {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const currentPosition = ring[index];
    const previousPosition = ring[previous];
    if (!Array.isArray(currentPosition) || !Array.isArray(previousPosition)) return false;
    const currentX = currentPosition[0];
    const currentY = currentPosition[1];
    const previousX = previousPosition[0];
    const previousY = previousPosition[1];
    if (![currentX, currentY, previousX, previousY].every((value) => typeof value === "number" && Number.isFinite(value))) {
      return false;
    }
    const crosses = (currentY > point[1]) !== (previousY > point[1]) &&
      point[0] < (previousX - currentX) * (point[1] - currentY) / (previousY - currentY) + currentX;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: [number, number], polygon: unknown): boolean {
  if (!Array.isArray(polygon) || polygon.length === 0 || !pointInRing(point, polygon[0])) return false;
  return polygon.slice(1).every((hole) => !pointInRing(point, hole));
}

function geometryContainsPoint(geometry: SafeGeometry | null, point: [number, number]): boolean {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return pointInPolygon(point, geometry.coordinates);
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }
  return false;
}

function addCommonParameters(url: URL, locale: string): void {
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("polygon_threshold", "0.00005");
  url.searchParams.set("accept-language", locale);
}

async function reversePlace(
  endpoint: URL,
  point: [number, number],
  locale: string
): Promise<SafeNominatimPlace | null> {
  const url = new URL("reverse", endpoint);
  addCommonParameters(url, locale);
  url.searchParams.set("lat", point[1].toFixed(6));
  url.searchParams.set("lon", point[0].toFixed(6));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("layer", "address,poi,railway,natural,manmade");
  const payload = await fetchNominatimJson(url);
  return sanitizePlace(payload);
}

function displayTags(place: SafeNominatimPlace): Record<string, string> {
  const entries: Array<[string, string]> = [];
  const push = (key: string, value: string | null) => {
    if (value && entries.length < 36) entries.push([key, value]);
  };
  push("classification.category", place.category);
  push("classification.type", place.featureType);
  push("classification.address_type", place.addressType);
  for (const [key, value] of Object.entries(place.extraTags)) {
    push(`tag.${key}`, cleanStructuredTagValue(key, value));
  }
  return Object.fromEntries(entries);
}

function objectName(place: SafeNominatimPlace): string | null {
  const streetAddress = [place.address.house_number, place.address.road]
    .filter(Boolean)
    .join(" ")
    .trim();
  return place.name ?? place.nameDetails["name:en"] ?? place.nameDetails.name ??
    (streetAddress || null);
}

function featureClass(place: SafeNominatimPlace): string {
  return [place.category, place.featureType].filter(Boolean).join(":") || "openstreetmap_object";
}

function evidenceFor(
  place: SafeNominatimPlace,
  point: [number, number],
  coordinateAssociation: LookupAssociation,
  geometryHash: string | null,
  tags: Record<string, string>
): PointObjectEvidenceReference[] {
  const sourceFeatureId = `${place.osmType}/${place.osmId}`;
  const evidence: PointObjectEvidenceReference[] = [
    {
      id: "EVD-COORDINATES",
      label: "Clicked WGS84 coordinates",
      value: `${point[0].toFixed(6)}, ${point[1].toFixed(6)}`,
      sourceId: "user_point",
      proofLimit: "Submitted point only; it is not an official address, parcel locator or proof of containment in any geometry."
    },
    {
      id: "EVD-OSM-OBJECT",
      label: "OpenStreetMap object returned by Nominatim",
      value: objectName(place) ?? sourceFeatureId,
      sourceId: sourceFeatureId,
      proofLimit: coordinateAssociation === "open_map_geometry_contains_point"
        ? "The returned open-map polygon contains the clicked point; this remains a community geometry, not an official cadastral or parcel boundary."
        : "Nominatim reverse returns the nearest suitable indexed OSM object; it does not prove that the clicked point is inside that object."
    },
    {
      id: "EVD-CLASSIFICATION",
      label: "OpenStreetMap classification",
      value: featureClass(place),
      sourceId: sourceFeatureId,
      proofLimit: "Community-map classification returned by Nominatim; not an official land-use, zoning or legal-use classification."
    }
  ];
  if (place.displayName) {
    evidence.push({
      id: "EVD-ADDRESS",
      label: "Nominatim display address",
      value: place.displayName,
      sourceId: sourceFeatureId,
      proofLimit: "OpenStreetMap-derived address context; not independently verified against an authoritative address or cadastral register."
    });
  }
  if (geometryHash && place.geometryType) {
    evidence.push({
      id: "EVD-GEOMETRY",
      label: "Returned OpenStreetMap geometry hash",
      value: geometryHash,
      sourceId: sourceFeatureId,
      proofLimit: `Hash of the Nominatim-returned ${place.geometryType} geometry; raw geometry is withheld from the model and is not an official parcel boundary.`
    });
  }
  if (Object.keys(tags).length > 0) {
    evidence.push({
      id: "EVD-ALLOWED-FIELDS",
      label: "Allowed OpenStreetMap fields",
      value: JSON.stringify(tags).slice(0, 3_000),
      sourceId: sourceFeatureId,
      proofLimit: "Strict allowlist of public map attributes; contact and personal-data fields are excluded and remaining values are not independently verified."
    });
  }
  evidence.push({
    id: "EVD-SOURCE",
    label: "Open data source",
    value: "© OpenStreetMap contributors; ODbL 1.0",
    sourceId: "SPAT-001",
    proofLimit: "Open community context with attribution; the response does not disclose the per-feature observation or edit timestamp."
  });
  return evidence;
}

export async function buildLivePointObjectEvidencePack(
  input: LivePointEvidenceRequest
): Promise<LivePointObjectEvidencePack> {
  if (!Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180 ||
      !Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90) {
    throw new LivePointEvidenceError(
      "LIVE_POINT_INVALID",
      400,
      "Valid WGS84 longitude and latitude are required.",
      false
    );
  }

  const point: [number, number] = [
    Number(input.longitude.toFixed(6)),
    Number(input.latitude.toFixed(6))
  ];
  const locale = sanitizeLocale(input.locale);
  const endpoint = configuredEndpoint();
  const conflicts: string[] = [];
  // Resolve identity from the server-observed coordinates only. Vector-tile
  // feature IDs are rendering-provider internals and must never be promoted to
  // OSM node/way/relation IDs by convention.
  const place = await reversePlace(endpoint, point, locale);
  const matchMethod = "nominatim_reverse" as const;
  const coordinateAssociation: LookupAssociation = geometryContainsPoint(place?.geometry ?? null, point)
    ? "open_map_geometry_contains_point"
    : "reverse_nearest_indexed_object_not_point_in_polygon";

  if (!place) {
    throw new LivePointEvidenceError(
      "OBJECT_NOT_RESOLVED",
      422,
      "No suitable indexed OpenStreetMap object was resolved for this point.",
      false
    );
  }

  const sourceFeatureId = `${place.osmType}/${place.osmId}`;
  const selectedTags = displayTags(place);
  const centroidDistance = Math.round(distanceM(point, [place.longitude, place.latitude]));
  const sourceResponseCore = {
    sourceFeatureId,
    latitude: place.latitude,
    longitude: place.longitude,
    name: objectName(place),
    displayName: place.displayName,
    category: place.category,
    featureType: place.featureType,
    addressType: place.addressType,
    address: place.address,
    extraTags: place.extraTags,
    nameDetails: place.nameDetails,
    boundingBox: place.boundingBox,
    geometryType: place.geometryType,
    geometryHash: place.geometryHash
  };
  const sourceResponseHash = semanticHash(sourceResponseCore);
  const resolutionCore = {
    point,
    sourceFeatureId,
    matchMethod,
    coordinateAssociation,
    centroidDistance,
    sourceResponseHash
  };
  const resolutionHash = semanticHash(resolutionCore);
  const acquiredAt = new Date().toISOString();
  const core = {
    protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V1" as const,
    caseKey: "live" as const,
    caseId: `live_${place.osmType}_${place.osmId}`,
    coordinates: { longitude: point[0], latitude: point[1], crs: "EPSG:4326" as const },
    resolution: {
      status: "resolved" as const,
      resolutionId: `p2o_live_resolution_${resolutionHash.slice(0, 24)}`,
      resolutionHash,
      matchMethod,
      coordinateAssociation,
      resultCentroidDistanceM: centroidDistance,
      evidenceQuality: "partial_open_context" as const
    },
    selectedObject: {
      entityId: `entity:openstreetmap:${place.osmType}:${place.osmId}`,
      sourceFeatureId,
      name: objectName(place),
      displayAddress: place.displayName,
      featureClass: featureClass(place),
      geometryType: place.geometryType,
      geometryHash: place.geometryHash,
      tags: selectedTags
    },
    source: {
      name: "OpenStreetMap" as const,
      service: "Nominatim" as const,
      sourceId: "SPAT-001" as const,
      sourceResponseId: `nominatim_response_${sourceResponseHash.slice(0, 24)}`,
      sourceResponseHash,
      observedAt: null,
      acquiredAt,
      freshness: "runtime_response_feature_time_unavailable" as const,
      rightsDecisionId: "runtime_open_context_odbl_attribution_required" as const,
      licenceId: "ODbL-1.0" as const,
      attribution: "© OpenStreetMap contributors" as const,
      licenceUrl: "https://www.openstreetmap.org/copyright" as const,
      usagePolicyUrl: "https://operations.osmfoundation.org/policies/nominatim/" as const,
      sourceOfferPath: "/prototype/point-to-object/source-offer" as const,
      officialStatus: "open_context_not_official" as const,
      runtimeNetworkUsed: true as const,
      persistenceUsed: false as const
    },
    nearbyContext: [] as [],
    evidence: evidenceFor(place, point, coordinateAssociation, place.geometryHash, selectedTags),
    conflicts,
    missingInformation: [
      "Authoritative parcel/cadastral boundary and identifier",
      "Authoritative planning controls, use permissions and approvals",
      "Ownership/title and legal status",
      "Condition, capacity, programme, cost and valuation evidence",
      "Complete nearby-object inventory, service levels, routes and travel times",
      "Current per-feature observation/edit timestamp and independent field validation"
    ],
    limitations: [
      coordinateAssociation === "open_map_geometry_contains_point"
        ? "The returned OpenStreetMap polygon contains the clicked point, but it is community geometry and not an official parcel or cadastral boundary."
        : "Nominatim reverse geocoding returns the closest suitable indexed OSM object and does not prove that the clicked point lies inside its geometry.",
      "Client/vector-tile feature identifiers are ignored; object identity is resolved server-side from the clicked coordinates.",
      "OpenStreetMap is open community context and may be incomplete, stale or differently classified from authoritative registers.",
      "Raw source geometry is used only to derive its type and semantic hash; it is not sent to the AI model.",
      "This single-object resolver does not establish that nearby records are complete or that absent records are absent in reality.",
      "The public Nominatim endpoint is suitable only for a moderate low-traffic Preview; its in-process throttle is not a distributed production quota.",
      "The AI layer may summarize and question this pack but cannot replace official or client validation."
    ],
    caveat: LIVE_POINT_CAVEAT
  };
  const evidencePackHash = semanticHash(core);
  return {
    evidencePackId: `p2o_live_evidence_${evidencePackHash.slice(0, 24)}`,
    evidencePackHash,
    ...core
  };
}
