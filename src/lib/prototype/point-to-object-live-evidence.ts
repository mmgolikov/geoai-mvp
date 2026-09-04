import "server-only";

import { LIVE_POINT_CAVEAT } from "@/src/lib/point-to-object/contracts";
import { semanticHash } from "@/src/lib/point-to-object/hash";
import type {
  PointObjectEvidencePack,
  PointObjectEvidenceReference
} from "./point-to-object-evidence";
import {
  nominatimLocale,
  pointObjectMarket,
  type PointObjectLocale,
  type PointObjectMarketKey
} from "./point-to-object-markets";
import {
  matchPointObjectTrustedIdentityAnchor,
  pointObjectIdentityEvidenceDescriptor,
  pointObjectLookupAssociation,
  type PointObjectLookupAssociation,
  type PointObjectResolutionMethod
} from "./point-to-object-trusted-identity";

const DEFAULT_NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/";
const DEFAULT_OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const DEFAULT_NOMINATIM_USER_AGENT =
  "GeoAI-PointToObject-Preview/1.0 (+https://github.com/mmgolikov/geoai-mvp)";
const APPLICATION_REFERER = "https://github.com/mmgolikov/geoai-mvp";
const NOMINATIM_TIMEOUT_MS = 7_000;
const NOMINATIM_RESPONSE_MAX_BYTES = 384 * 1024;
const NOMINATIM_REVALIDATE_SECONDS = 24 * 60 * 60;
const NOMINATIM_MIN_INTERVAL_MS = 1_000;
const MAX_GEOMETRY_POSITIONS = 25_000;
const OVERPASS_TIMEOUT_MS = 4_500;
const OVERPASS_RESPONSE_MAX_BYTES = 512 * 1024;
const OVERPASS_REVALIDATE_SECONDS = 6 * 60 * 60;
const OVERPASS_MIN_INTERVAL_MS = 1_200;
const OVERPASS_RADIUS_M = 800;
const URBAN_FABRIC_RADIUS_M = 400 as const;
const OVERPASS_QUERY_RESULT_LIMIT = 120;
const URBAN_FABRIC_RESULT_LIMIT = 320;
const MAX_OVERPASS_ELEMENTS_TO_PARSE = 160;
const MAX_URBAN_FABRIC_ELEMENTS_TO_PARSE = 360;
const MAX_NEARBY_CONTEXT_ITEMS = 12;

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

export type LiveNearbyContextItem = {
  evidenceId: string;
  sourceFeatureId: string;
  name: string;
  categories: string[];
  featureClass: string;
  distanceM: number;
  method: "overpass_around_query_element_center_haversine";
  proofLimit: string;
};

export type LiveNearbyContextResult = {
  status: "available" | "unavailable";
  items: LiveNearbyContextItem[];
  responseHash: string | null;
  observedAt: string | null;
};

export const POINT_OBJECT_CONTEXT_GROUPS = [
  "residential",
  "commercial",
  "hospitality",
  "retail_daily_needs",
  "education",
  "healthcare",
  "civic_culture",
  "transport",
  "access",
  "open_space",
  "industrial",
  "construction",
  "other_built"
] as const;

export type PointObjectContextGroup = (typeof POINT_OBJECT_CONTEXT_GROUPS)[number];

export const POINT_OBJECT_DISTRICT_CHARACTERS = [
  "hospitality_tourism",
  "commercial_business",
  "residential",
  "mixed_use_urban",
  "civic_institutional",
  "industrial_logistics",
  "open_space_recreation",
  "low_signal"
] as const;

export type PointObjectDistrictCharacter = (typeof POINT_OBJECT_DISTRICT_CHARACTERS)[number];

export type LivePointObjectGeometryMetrics = {
  footprintAreaSqM: number;
  footprintPerimeterM: number;
  method: "local_equirectangular_wgs84_approximation";
  geometryGeneralized: true;
};

export type LiveGeoContextGroupMetric = {
  group: PointObjectContextGroup;
  count: number;
  sharePct: number;
  nearestDistanceM: number | null;
};

export type LiveGeoContextProfile = {
  radiusM: typeof URBAN_FABRIC_RADIUS_M;
  coverage: "available" | "unavailable";
  sampleSize: number;
  capReached: boolean;
  groups: LiveGeoContextGroupMetric[];
  mappedBuildingCount: number;
  mappedLevelsKnownCount: number;
  medianMappedLevels: number | null;
  nearestTransitM: number | null;
  nearestMajorRoadM: number | null;
  districtCharacter: {
    code: PointObjectDistrictCharacter;
    confidence: "low" | "medium";
    ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1";
    driverGroups: PointObjectContextGroup[];
  };
};

type NearbyCandidate = Omit<LiveNearbyContextItem, "evidenceId" | "proofLimit"> & {
  group: "education" | "healthcare" | "daily_needs" | "transport" | "access" | "open_space" | "destination";
};

type NearbyClassification = Pick<NearbyCandidate, "group" | "categories" | "featureClass">;

export type LivePointEvidenceRequest = {
  longitude: number;
  latitude: number;
  /** Exact OSM node/way/relation identity from a server-normalized search result. */
  osmFeatureId?: string | null;
  /** A short BCP-47 preference list, for example `en` or `en,ar`. */
  locale?: string | null;
};

export type LivePointSearchResult = {
  id: string;
  label: string;
  secondaryLabel: string | null;
  longitude: number;
  latitude: number;
  category: string | null;
  featureType: string | null;
  boundingBox: [south: number, north: number, west: number, east: number] | null;
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
    matchMethod: PointObjectResolutionMethod;
    coordinateAssociation: PointObjectLookupAssociation;
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
    addressParts: Record<string, string>;
    tags: Record<string, string>;
    metrics: LivePointObjectGeometryMetrics | null;
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
    contextService: "Overpass API";
    contextStatus: "available" | "unavailable";
    contextResponseId: string | null;
    contextResponseHash: string | null;
    contextObservedAt: string | null;
    contextRadiusM: number;
    contextUsagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html";
    fabricStatus: "available" | "unavailable";
    fabricResponseId: string | null;
    fabricResponseHash: string | null;
    fabricObservedAt: string | null;
    fabricRadiusM: typeof URBAN_FABRIC_RADIUS_M;
    sourceOfferPath: "/prototype/point-to-object/source-offer";
    officialStatus: "open_context_not_official";
    runtimeNetworkUsed: true;
    persistenceUsed: false;
  };
  nearbyContext: LiveNearbyContextItem[];
  geoContext: LiveGeoContextProfile;
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
let overpassGate: Promise<void> = Promise.resolve();
let lastOverpassDispatchAt = 0;

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

function configuredOverpassEndpoint(): URL {
  const configured = process.env.POINT_TO_OBJECT_OVERPASS_ENDPOINT?.trim() || DEFAULT_OVERPASS_ENDPOINT;
  const endpoint = new URL(configured);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error("Unsafe Overpass endpoint configuration.");
  }
  return endpoint;
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

async function waitForOverpassSlot(): Promise<void> {
  let release: (() => void) | undefined;
  const previous = overpassGate;
  overpassGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    const waitMs = Math.max(0, lastOverpassDispatchAt + OVERPASS_MIN_INTERVAL_MS - Date.now());
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    lastOverpassDispatchAt = Date.now();
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

export function buildOverpassNearbyQuery(point: [number, number]): string {
  const longitude = finiteCoordinate(point[0], 180);
  const latitude = finiteCoordinate(point[1], 90);
  if (longitude === null || latitude === null) throw new Error("Invalid WGS84 point.");
  const around = `(around:${OVERPASS_RADIUS_M},${latitude.toFixed(6)},${longitude.toFixed(6)})`;
  return [
    `[out:json][timeout:4][maxsize:${OVERPASS_RESPONSE_MAX_BYTES}];`,
    "(",
    `nwr${around}["amenity"~"^(school|kindergarten|college|university|hospital|clinic|doctors|pharmacy|marketplace|parking|library|community_centre|arts_centre|theatre|cinema)$"];`,
    `nwr${around}["shop"~"^(supermarket|convenience|mall)$"];`,
    `nwr${around}["tourism"~"^(hotel|museum|gallery|attraction)$"];`,
    `nwr${around}["leisure"~"^(park|garden|playground|sports_centre|nature_reserve)$"];`,
    `nwr${around}["public_transport"~"^(station|platform|stop_position)$"];`,
    `nwr${around}["railway"~"^(station|halt|tram_stop|subway_entrance)$"];`,
    `node${around}["highway"="bus_stop"];`,
    `way${around}["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"]["name"];`,
    `nwr${around}["natural"~"^(wood|water)$"]["name"];`,
    `nwr${around}["landuse"~"^(forest|recreation_ground)$"]["name"];`,
    ");",
    `out center ${OVERPASS_QUERY_RESULT_LIMIT};`
  ].join("\n");
}

export function buildOverpassUrbanFabricQuery(point: [number, number]): string {
  const longitude = finiteCoordinate(point[0], 180);
  const latitude = finiteCoordinate(point[1], 90);
  if (longitude === null || latitude === null) throw new Error("Invalid WGS84 point.");
  const around = `(around:${URBAN_FABRIC_RADIUS_M},${latitude.toFixed(6)},${longitude.toFixed(6)})`;
  return [
    `[out:json][timeout:4][maxsize:${OVERPASS_RESPONSE_MAX_BYTES}];`,
    "(",
    `nwr${around}["building"];`,
    `nwr${around}["landuse"~"^(residential|commercial|retail|industrial|construction|brownfield|recreation_ground|forest)$"];`,
    `nwr${around}["office"];`,
    `nwr${around}["shop"];`,
    `nwr${around}["tourism"];`,
    `nwr${around}["amenity"];`,
    `nwr${around}["leisure"];`,
    `nwr${around}["natural"~"^(wood|water|grassland|scrub)$"];`,
    `nwr${around}["public_transport"];`,
    `nwr${around}["railway"~"^(station|halt|tram_stop|subway_entrance)$"];`,
    `node${around}["highway"="bus_stop"];`,
    `way${around}["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"];`,
    ");",
    `out tags center ${URBAN_FABRIC_RESULT_LIMIT};`
  ].join("\n");
}

async function readOverpassText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > OVERPASS_RESPONSE_MAX_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Overpass response exceeded the permitted size.");
  }
  if (!response.body) throw new Error("Overpass returned no readable body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteCount = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteCount += value.byteLength;
    if (byteCount > OVERPASS_RESPONSE_MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error("Overpass response exceeded the permitted size.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function fetchOverpassJson(query: string): Promise<unknown> {
  await waitForOverpassSlot();
  const url = configuredOverpassEndpoint();
  url.searchParams.set("data", query);
  const response = await fetch(url, {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      Referer: APPLICATION_REFERER,
      "User-Agent": configuredUserAgent()
    },
    cache: "force-cache",
    next: { revalidate: OVERPASS_REVALIDATE_SECONDS }
  });
  if (!response.ok) throw new Error(`Overpass returned HTTP ${response.status}.`);
  const text = await readOverpassText(response);
  return JSON.parse(text);
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

export function geometryMetrics(geometry: SafeGeometry | null): LivePointObjectGeometryMetrics | null {
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return null;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  if (!Array.isArray(polygons)) return null;
  let footprintAreaSqM = 0;
  let footprintPerimeterM = 0;
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) return null;
    const rings = polygon.flatMap((ring) => {
      if (!Array.isArray(ring) || ring.length < 4) return [];
      const positions = ring.flatMap((position) => {
        if (!Array.isArray(position)) return [];
        const longitude = finiteCoordinate(position[0], 180);
        const latitude = finiteCoordinate(position[1], 90);
        return longitude === null || latitude === null ? [] : [[longitude, latitude] as [number, number]];
      });
      return positions.length === ring.length ? [positions] : [];
    });
    if (rings.length !== polygon.length) return null;
    for (const [ringIndex, ring] of rings.entries()) {
      const referenceLatitude = ring.reduce((total, position) => total + position[1], 0) / ring.length;
      const metresPerLongitudeDegree = 111_320 * Math.cos(radians(referenceLatitude));
      let signedArea = 0;
      let perimeter = 0;
      for (let index = 0; index < ring.length; index += 1) {
        const current = ring[index];
        const next = ring[(index + 1) % ring.length];
        const currentX = current[0] * metresPerLongitudeDegree;
        const currentY = current[1] * 110_540;
        const nextX = next[0] * metresPerLongitudeDegree;
        const nextY = next[1] * 110_540;
        signedArea += currentX * nextY - nextX * currentY;
        perimeter += distanceM(current, next);
      }
      const area = Math.abs(signedArea / 2);
      footprintAreaSqM += ringIndex === 0 ? area : -area;
      footprintPerimeterM += perimeter;
    }
  }
  if (!Number.isFinite(footprintAreaSqM) || footprintAreaSqM <= 0 || footprintAreaSqM > 1_000_000_000 ||
      !Number.isFinite(footprintPerimeterM) || footprintPerimeterM <= 0) return null;
  return {
    footprintAreaSqM: Math.round(footprintAreaSqM),
    footprintPerimeterM: Math.round(footprintPerimeterM),
    method: "local_equirectangular_wgs84_approximation",
    geometryGeneralized: true
  };
}

function allowedTag(
  tags: Record<string, unknown>,
  key: string,
  allowedValues: readonly string[]
): string | null {
  const value = cleanTaxonomyToken(tags[key]);
  return value && allowedValues.includes(value) ? value : null;
}

function classifyNearbyTags(tags: Record<string, unknown>): NearbyClassification | null {
  const amenity = allowedTag(tags, "amenity", [
    "school", "kindergarten", "college", "university", "hospital", "clinic", "doctors", "pharmacy",
    "marketplace", "parking", "library", "community_centre", "arts_centre", "theatre", "cinema"
  ]);
  if (amenity) {
    const group: NearbyCandidate["group"] = ["school", "kindergarten", "college", "university"].includes(amenity)
      ? "education"
      : ["hospital", "clinic", "doctors", "pharmacy"].includes(amenity)
        ? "healthcare"
        : amenity === "marketplace"
          ? "daily_needs"
          : amenity === "parking" ? "access" : "destination";
    return { group, categories: [group, amenity], featureClass: `amenity:${amenity}` };
  }

  const shop = allowedTag(tags, "shop", ["supermarket", "convenience", "mall"]);
  if (shop) return {
    group: "daily_needs",
    categories: ["daily_needs", shop],
    featureClass: `shop:${shop}`
  };

  const tourism = allowedTag(tags, "tourism", ["hotel", "museum", "gallery", "attraction"]);
  if (tourism) return {
    group: "destination",
    categories: ["destination", tourism],
    featureClass: `tourism:${tourism}`
  };

  const leisure = allowedTag(tags, "leisure", ["park", "garden", "playground", "sports_centre", "nature_reserve"]);
  if (leisure) return {
    group: "open_space",
    categories: ["open_space", leisure],
    featureClass: `leisure:${leisure}`
  };

  const publicTransport = allowedTag(tags, "public_transport", ["station", "platform", "stop_position"]);
  if (publicTransport) return {
    group: "transport",
    categories: ["transport", publicTransport],
    featureClass: `public_transport:${publicTransport}`
  };

  const railway = allowedTag(tags, "railway", ["station", "halt", "tram_stop", "subway_entrance"]);
  if (railway) return {
    group: "transport",
    categories: ["transport", railway],
    featureClass: `railway:${railway}`
  };

  const highway = allowedTag(tags, "highway", ["bus_stop", "motorway", "trunk", "primary", "secondary", "tertiary"]);
  if (highway) {
    const group = highway === "bus_stop" ? "transport" : "access";
    return { group, categories: [group, highway], featureClass: `highway:${highway}` };
  }

  const natural = allowedTag(tags, "natural", ["wood", "water"]);
  if (natural) return {
    group: "open_space",
    categories: ["open_space", natural],
    featureClass: `natural:${natural}`
  };

  const landuse = allowedTag(tags, "landuse", ["forest", "recreation_ground"]);
  return landuse ? {
    group: "open_space",
    categories: ["open_space", landuse],
    featureClass: `landuse:${landuse}`
  } : null;
}

function nearbyName(tags: Record<string, unknown>, locale: string, classification: NearbyClassification): string | null {
  const localeTag = locale.split(",")[0]?.toLowerCase() || "en";
  const language = localeTag.split("-")[0];
  const keys = [`name:${localeTag}`, `name:${language}`, "name:en", "name", "official_name", "short_name"];
  for (const key of [...new Set(keys)]) {
    const value = cleanText(tags[key], 140);
    if (value) return value;
  }
  const ref = cleanText(tags.ref, 48);
  if (!ref) return null;
  return classification.group === "access" ? `Road ${ref}`
    : classification.group === "transport" ? `Stop ${ref}`
      : null;
}

function nearbyElementPoint(value: Record<string, unknown>): [number, number] | null {
  const coordinateSource = value.type === "node" ? value : isRecord(value.center) ? value.center : null;
  if (!coordinateSource) return null;
  const longitude = finiteCoordinate(coordinateSource.lon, 180);
  const latitude = finiteCoordinate(coordinateSource.lat, 90);
  return longitude === null || latitude === null ? null : [longitude, latitude];
}

function contextGroup(tags: Record<string, unknown>): PointObjectContextGroup | null {
  const value = (key: string) => cleanTaxonomyToken(tags[key])?.toLowerCase() ?? null;
  const building = value("building");
  const landuse = value("landuse");
  const amenity = value("amenity");
  const tourism = value("tourism");
  const leisure = value("leisure");
  const natural = value("natural");
  const railway = value("railway");
  const publicTransport = value("public_transport");
  const highway = value("highway");

  if (landuse === "industrial" || ["industrial", "warehouse", "manufacture", "storage_tank"].includes(building ?? "")) return "industrial";
  if (["construction", "brownfield"].includes(landuse ?? "") || building === "construction") return "construction";
  if (tourism || ["hotel", "guest_house", "hostel", "resort"].includes(building ?? "")) return "hospitality";
  if (typeof tags.shop === "string" || landuse === "retail" || building === "retail") return "retail_daily_needs";
  if (typeof tags.office === "string" || landuse === "commercial" || ["commercial", "office"].includes(building ?? "")) return "commercial";
  if (["residential", "apartments", "house", "detached", "terrace", "semidetached_house", "dormitory"].includes(building ?? "") || landuse === "residential") return "residential";
  if (["school", "kindergarten", "college", "university"].includes(amenity ?? "")) return "education";
  if (["hospital", "clinic", "doctors", "dentist", "pharmacy"].includes(amenity ?? "")) return "healthcare";
  if (amenity && [
    "library", "community_centre", "arts_centre", "theatre", "cinema", "place_of_worship", "townhall",
    "courthouse", "police", "fire_station", "post_office", "social_facility", "childcare"
  ].includes(amenity)) return "civic_culture";
  if (publicTransport || railway || highway === "bus_stop") return "transport";
  if (["motorway", "trunk", "primary", "secondary", "tertiary"].includes(highway ?? "")) return "access";
  if (leisure || natural || ["recreation_ground", "forest"].includes(landuse ?? "")) return "open_space";
  if (building) return "other_built";
  if (amenity) return "civic_culture";
  return null;
}

function mappedLevels(tags: Record<string, unknown>): number | null {
  const raw = cleanText(tags["building:levels"], 24);
  if (!raw || !/^\d{1,3}(?:\.\d)?$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 200 ? parsed : null;
}

function districtCharacterFor(
  counts: Map<PointObjectContextGroup, number>,
  sampleSize: number,
  capReached: boolean
): LiveGeoContextProfile["districtCharacter"] {
  const count = (group: PointObjectContextGroup) => counts.get(group) ?? 0;
  const useGroups: PointObjectContextGroup[] = [
    "residential", "commercial", "hospitality", "retail_daily_needs", "education", "healthcare",
    "civic_culture", "open_space", "industrial", "construction"
  ];
  const useCount = useGroups.reduce((total, group) => total + count(group), 0);
  const share = (group: PointObjectContextGroup) => useCount > 0 ? count(group) / useCount : 0;
  const activeGroups = useGroups.filter((group) => count(group) > 0);
  let code: PointObjectDistrictCharacter = "low_signal";
  let driverGroups: PointObjectContextGroup[] = [];
  if (sampleSize >= 4 && useCount >= 3) {
    if (share("industrial") + share("construction") >= 0.4) {
      code = "industrial_logistics";
      driverGroups = ["industrial", "construction"].filter((group) => count(group as PointObjectContextGroup) > 0) as PointObjectContextGroup[];
    } else if (share("open_space") >= 0.45 && count("other_built") < 10) {
      code = "open_space_recreation";
      driverGroups = ["open_space"];
    } else if (share("hospitality") >= 0.25) {
      code = "hospitality_tourism";
      driverGroups = ["hospitality", "retail_daily_needs"].filter((group) => count(group as PointObjectContextGroup) > 0) as PointObjectContextGroup[];
    } else if (share("residential") >= 0.45) {
      code = "residential";
      driverGroups = ["residential", "retail_daily_needs", "education"].filter((group) => count(group as PointObjectContextGroup) > 0) as PointObjectContextGroup[];
    } else if (share("education") + share("healthcare") + share("civic_culture") >= 0.45) {
      code = "civic_institutional";
      driverGroups = ["education", "healthcare", "civic_culture"].filter((group) => count(group as PointObjectContextGroup) > 0) as PointObjectContextGroup[];
    } else if (share("commercial") + share("retail_daily_needs") >= 0.5) {
      code = "commercial_business";
      driverGroups = ["commercial", "retail_daily_needs"];
    } else if (activeGroups.length >= 3) {
      code = "mixed_use_urban";
      driverGroups = [...activeGroups].sort((left, right) => count(right) - count(left)).slice(0, 3);
    }
  }
  return {
    code,
    confidence: code !== "low_signal" && !capReached && useCount >= 8 ? "medium" : "low",
    ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1",
    driverGroups
  };
}

export function normalizeOverpassUrbanFabric(
  payload: unknown,
  point: [number, number]
): LiveGeoContextProfile {
  if (!isRecord(payload) || !Array.isArray(payload.elements)) {
    return {
      radiusM: URBAN_FABRIC_RADIUS_M,
      coverage: "unavailable",
      sampleSize: 0,
      capReached: false,
      groups: [],
      mappedBuildingCount: 0,
      mappedLevelsKnownCount: 0,
      medianMappedLevels: null,
      nearestTransitM: null,
      nearestMajorRoadM: null,
      districtCharacter: districtCharacterFor(new Map(), 0, false)
    };
  }
  const rawElements = payload.elements.slice(0, MAX_URBAN_FABRIC_ELEMENTS_TO_PARSE);
  const byIdentity = new Map<string, { group: PointObjectContextGroup; distanceM: number; building: boolean; levels: number | null }>();
  for (const raw of rawElements) {
    if (!isRecord(raw)) continue;
    const type = osmType(raw.type);
    const id = positiveIdentifier(raw.id);
    const tags = isRecord(raw.tags) ? raw.tags : {};
    const position = nearbyElementPoint(raw);
    const group = contextGroup(tags);
    if (!type || !id || !position || !group) continue;
    const directDistanceM = Math.round(distanceM(point, position));
    if (!Number.isFinite(directDistanceM) || directDistanceM > URBAN_FABRIC_RADIUS_M * 3) continue;
    const key = `${type}/${id}`;
    if (!byIdentity.has(key)) byIdentity.set(key, {
      group,
      distanceM: directDistanceM,
      building: typeof tags.building === "string",
      levels: mappedLevels(tags)
    });
  }
  const sample = [...byIdentity.values()];
  const counts = new Map<PointObjectContextGroup, number>();
  const nearest = new Map<PointObjectContextGroup, number>();
  const levels = sample.flatMap((item) => item.levels === null ? [] : [item.levels]).sort((left, right) => left - right);
  for (const item of sample) {
    counts.set(item.group, (counts.get(item.group) ?? 0) + 1);
    nearest.set(item.group, Math.min(nearest.get(item.group) ?? Number.POSITIVE_INFINITY, item.distanceM));
  }
  const groups = POINT_OBJECT_CONTEXT_GROUPS.flatMap((group) => {
    const count = counts.get(group) ?? 0;
    return count === 0 ? [] : [{
      group,
      count,
      sharePct: sample.length > 0 ? Number((count / sample.length * 100).toFixed(1)) : 0,
      nearestDistanceM: nearest.get(group) ?? null
    }];
  });
  const capReached = payload.elements.length >= URBAN_FABRIC_RESULT_LIMIT;
  const middle = Math.floor(levels.length / 2);
  const medianMappedLevels = levels.length === 0 ? null : levels.length % 2 === 1
    ? levels[middle]
    : Number(((levels[middle - 1] + levels[middle]) / 2).toFixed(1));
  return {
    radiusM: URBAN_FABRIC_RADIUS_M,
    coverage: "available",
    sampleSize: sample.length,
    capReached,
    groups,
    mappedBuildingCount: sample.filter((item) => item.building).length,
    mappedLevelsKnownCount: levels.length,
    medianMappedLevels,
    nearestTransitM: nearest.get("transport") ?? null,
    nearestMajorRoadM: nearest.get("access") ?? null,
    districtCharacter: districtCharacterFor(counts, sample.length, capReached)
  };
}

async function resolveLiveUrbanFabric(
  point: [number, number],
  loader: (query: string) => Promise<unknown> = fetchOverpassJson
): Promise<{ profile: LiveGeoContextProfile; responseHash: string | null; observedAt: string | null }> {
  try {
    const payload = await loader(buildOverpassUrbanFabricQuery(point));
    const profile = normalizeOverpassUrbanFabric(payload, point);
    const observedAt = overpassObservedAt(payload);
    return { profile, responseHash: semanticHash({ observedAt, profile }), observedAt };
  } catch {
    return { profile: normalizeOverpassUrbanFabric(null, point), responseHash: null, observedAt: null };
  }
}

function balancedNearbySelection(candidates: NearbyCandidate[]): NearbyCandidate[] {
  const groupOrder: NearbyCandidate["group"][] = [
    "education", "healthcare", "daily_needs", "transport", "access", "open_space", "destination"
  ];
  const buckets = new Map(groupOrder.map((group) => [group, candidates
    .filter((item) => item.group === group)
    .sort((left, right) => left.distanceM - right.distanceM || left.sourceFeatureId.localeCompare(right.sourceFeatureId))]));
  const selected: NearbyCandidate[] = [];
  for (let round = 0; selected.length < MAX_NEARBY_CONTEXT_ITEMS; round += 1) {
    let added = false;
    for (const group of groupOrder) {
      const item = buckets.get(group)?.[round];
      if (!item) continue;
      selected.push(item);
      added = true;
      if (selected.length === MAX_NEARBY_CONTEXT_ITEMS) break;
    }
    if (!added) break;
  }
  return selected;
}

export function normalizeOverpassNearbyContext(
  payload: unknown,
  point: [number, number],
  selectedSourceFeatureId: string,
  locale = "en"
): LiveNearbyContextItem[] {
  if (!isRecord(payload) || !Array.isArray(payload.elements)) return [];
  const bySourceIdentity = new Map<string, NearbyCandidate>();
  for (const raw of payload.elements.slice(0, MAX_OVERPASS_ELEMENTS_TO_PARSE)) {
    if (!isRecord(raw)) continue;
    const type = osmType(raw.type);
    const id = positiveIdentifier(raw.id);
    const tags = isRecord(raw.tags) ? raw.tags : {};
    const position = nearbyElementPoint(raw);
    const classification = classifyNearbyTags(tags);
    if (!type || !id || !position || !classification) continue;
    const sourceFeatureId = `${type}/${id}`;
    if (sourceFeatureId === selectedSourceFeatureId) continue;
    const name = nearbyName(tags, locale, classification);
    if (!name) continue;
    const directDistanceM = Math.round(distanceM(point, position));
    // Around filters use feature geometry, while ways/relations expose only a
    // derived centre here. Keep a modest tolerance for large parks/stations.
    if (!Number.isFinite(directDistanceM) || directDistanceM > OVERPASS_RADIUS_M * 3) continue;
    const candidate: NearbyCandidate = {
      sourceFeatureId,
      name,
      categories: classification.categories,
      featureClass: classification.featureClass,
      distanceM: directDistanceM,
      method: "overpass_around_query_element_center_haversine",
      group: classification.group
    };
    const previous = bySourceIdentity.get(sourceFeatureId);
    if (!previous || candidate.distanceM < previous.distanceM) bySourceIdentity.set(sourceFeatureId, candidate);
  }

  // OSM commonly represents one station, road or venue with several nearby
  // elements. This is a context summary rather than a feature count, so retain
  // the nearest representative for an identical group/name combination.
  const bySemanticIdentity = new Map<string, NearbyCandidate>();
  for (const candidate of bySourceIdentity.values()) {
    const key = `${candidate.group}|${candidate.name.normalize("NFKC").toLocaleLowerCase("en-US")}`;
    const previous = bySemanticIdentity.get(key);
    if (!previous || candidate.distanceM < previous.distanceM) bySemanticIdentity.set(key, candidate);
  }

  return balancedNearbySelection([...bySemanticIdentity.values()]).map(({ group: _group, ...item }, index) => ({
    ...item,
    evidenceId: `EVD-CONTEXT-${index + 1}`,
    proofLimit: "Bounded OpenStreetMap context from Overpass; distance is straight-line from the analysis point to the returned node or derived element centre, not a route, travel time, service level or proof of complete coverage."
  }));
}

function overpassObservedAt(payload: unknown): string | null {
  if (!isRecord(payload) || !isRecord(payload.osm3s)) return null;
  const value = cleanText(payload.osm3s.timestamp_osm_base, 40);
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export async function resolveLiveNearbyContext(
  point: [number, number],
  selectedSourceFeatureId: string,
  locale: string,
  loader: (query: string) => Promise<unknown> = fetchOverpassJson
): Promise<LiveNearbyContextResult> {
  try {
    const payload = await loader(buildOverpassNearbyQuery(point));
    const items = normalizeOverpassNearbyContext(payload, point, selectedSourceFeatureId, locale);
    const observedAt = overpassObservedAt(payload);
    return {
      status: "available",
      items,
      responseHash: semanticHash({ observedAt, items }),
      observedAt
    };
  } catch {
    // Nearby context is additive. The primary Nominatim object remains usable
    // when the bounded public Overpass service is slow, unavailable or invalid.
    return { status: "unavailable", items: [], responseHash: null, observedAt: null };
  }
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

function parseTrustedOsmFeatureId(value: string | null | undefined): { type: OsmType; id: string; lookupId: string } | null {
  const match = /^(node|way|relation)\/([1-9]\d{0,19})$/.exec(value ?? "");
  if (!match) return null;
  const type = match[1] as OsmType;
  const id = match[2];
  const prefix = type === "node" ? "N" : type === "way" ? "W" : "R";
  return { type, id, lookupId: `${prefix}${id}` };
}

async function lookupPlace(
  endpoint: URL,
  sourceFeatureId: { type: OsmType; id: string; lookupId: string },
  locale: string
): Promise<SafeNominatimPlace | null> {
  const url = new URL("lookup", endpoint);
  addCommonParameters(url, locale);
  url.searchParams.set("osm_ids", sourceFeatureId.lookupId);
  const payload = await fetchNominatimJson(url);
  if (!Array.isArray(payload)) return null;
  const place = payload.map(sanitizePlace).find((candidate): candidate is SafeNominatimPlace => Boolean(
    candidate && candidate.osmType === sourceFeatureId.type && candidate.osmId === sourceFeatureId.id
  ));
  return place ?? null;
}

export async function searchLivePointObjects(input: {
  marketKey: PointObjectMarketKey;
  locale: PointObjectLocale;
  query: string;
}): Promise<LivePointSearchResult[]> {
  const query = cleanText(input.query, 120);
  if (!query || query.length < 2) return [];
  const market = pointObjectMarket(input.marketKey);
  const [[west, south], [east, north]] = market.bounds;
  const url = new URL("search", configuredEndpoint());
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("accept-language", nominatimLocale(input.locale));
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("bounded", "1");
  url.searchParams.set("viewbox", `${west},${north},${east},${south}`);
  const payload = await fetchNominatimJson(url);
  if (!Array.isArray(payload)) return [];
  const seen = new Set<string>();
  return payload.flatMap((raw) => {
    const place = sanitizePlace(raw);
    if (!place) return [];
    const sourceFeatureId = `${place.osmType}/${place.osmId}`;
    if (seen.has(sourceFeatureId)) return [];
    seen.add(sourceFeatureId);
    const label = objectName(place) ?? place.displayName?.split(",")[0]?.trim() ?? null;
    if (!label) return [];
    const secondaryLabel = place.displayName && place.displayName !== label
      ? place.displayName
      : null;
    return [{
      id: sourceFeatureId,
      label,
      secondaryLabel,
      longitude: Number(place.longitude.toFixed(6)),
      latitude: Number(place.latitude.toFixed(6)),
      category: place.category,
      featureType: place.featureType,
      boundingBox: place.boundingBox
    }];
  }).slice(0, 5);
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
  matchMethod: PointObjectResolutionMethod,
  coordinateAssociation: PointObjectLookupAssociation,
  geometryHash: string | null,
  tags: Record<string, string>,
  metrics: LivePointObjectGeometryMetrics | null
): PointObjectEvidenceReference[] {
  const sourceFeatureId = `${place.osmType}/${place.osmId}`;
  const selectedName = objectName(place);
  const selectedFeatureClass = featureClass(place);
  const identityEvidence = pointObjectIdentityEvidenceDescriptor(matchMethod, coordinateAssociation);
  const evidence: PointObjectEvidenceReference[] = [
    {
      id: "EVD-COORDINATES",
      label: "WGS84 analysis point",
      value: JSON.stringify({ longitude: point[0], latitude: point[1], crs: "EPSG:4326" }),
      sourceId: "user_point",
      proofLimit: "Map-selected analysis point only; it is not an official address, parcel locator or proof of object identity."
    },
    {
      id: "EVD-OSM-OBJECT",
      label: identityEvidence.label,
      value: JSON.stringify({ sourceFeatureId, name: selectedName }),
      sourceId: sourceFeatureId,
      proofLimit: identityEvidence.proofLimit
    },
    {
      id: "EVD-CLASSIFICATION",
      label: "OpenStreetMap classification",
      value: JSON.stringify({ sourceFeatureId, featureClass: selectedFeatureClass }),
      sourceId: sourceFeatureId,
      proofLimit: "Community-map classification returned by Nominatim; not an official land-use, zoning or legal-use classification."
    }
  ];
  if (place.displayName) {
    evidence.push({
      id: "EVD-ADDRESS",
      label: "Nominatim display address",
      value: JSON.stringify({
        sourceFeatureId,
        displayAddress: place.displayName,
        addressParts: place.address
      }),
      sourceId: sourceFeatureId,
      proofLimit: "OpenStreetMap-derived address context; not independently verified against an authoritative address or cadastral register."
    });
  }
  if (geometryHash && place.geometryType) {
    evidence.push({
      id: "EVD-GEOMETRY",
      label: "Returned OpenStreetMap geometry hash",
      value: JSON.stringify({ sourceFeatureId, geometryType: place.geometryType, geometryHash }),
      sourceId: sourceFeatureId,
      proofLimit: `Hash of the Nominatim-returned ${place.geometryType} geometry; raw geometry is withheld from the model and is not an official parcel boundary.`
    });
  }
  if (metrics && geometryHash) {
    evidence.push({
      id: "EVD-OBJECT-METRICS",
      label: "Approximate mapped object footprint metrics",
      value: JSON.stringify({ sourceFeatureId, geometryHash, metrics }),
      sourceId: sourceFeatureId,
      proofLimit: "Approximate measurements derived from generalized community-map geometry; not a surveyed, cadastral, title or legal site area."
    });
  }
  if (Object.keys(tags).length > 0) {
    evidence.push({
      id: "EVD-ALLOWED-FIELDS",
      label: "Allowed OpenStreetMap fields",
      value: JSON.stringify({ sourceFeatureId, tags }),
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

function evidenceForGeoContext(profile: LiveGeoContextProfile): PointObjectEvidenceReference[] {
  const summary = {
    radiusM: profile.radiusM,
    coverage: profile.coverage,
    sampleSize: profile.sampleSize,
    capReached: profile.capReached,
    groups: profile.groups,
    mappedBuildingCount: profile.mappedBuildingCount,
    mappedLevelsKnownCount: profile.mappedLevelsKnownCount,
    medianMappedLevels: profile.medianMappedLevels,
    nearestTransitM: profile.nearestTransitM,
    nearestMajorRoadM: profile.nearestMajorRoadM
  };
  const evidence: PointObjectEvidenceReference[] = [{
    id: "EVD-CONTEXT-SUMMARY",
    label: "Bounded mapped context summary",
    value: JSON.stringify(summary),
    sourceId: "SPAT-001",
    proofLimit: "Aggregates describe only the bounded returned OpenStreetMap sample. They are not a complete real-world inventory, route analysis, service level or proof of absence."
  }];
  evidence.push({
    id: "EVD-DISTRICT-PROFILE",
    label: "Rule-based mapped context profile",
    value: JSON.stringify({ summaryHash: semanticHash(summary), districtCharacter: profile.districtCharacter }),
    sourceId: "derived:POINT_OBJECT_DISTRICT_RULE_V1",
    proofLimit: "Transparent rule-based interpretation of the bounded mapped sample; not an official land-use, planning or market classification."
  });
  return evidence;
}

function evidenceForNearby(items: LiveNearbyContextItem[]): PointObjectEvidenceReference[] {
  return items.map((item) => ({
    id: item.evidenceId,
    label: item.name,
    value: JSON.stringify({
      sourceFeatureId: item.sourceFeatureId,
      name: item.name,
      featureClass: item.featureClass,
      distanceM: item.distanceM
    }),
    sourceId: item.sourceFeatureId,
    proofLimit: item.proofLimit
  }));
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
  const trustedIdentity = parseTrustedOsmFeatureId(input.osmFeatureId);
  if (input.osmFeatureId && !trustedIdentity) {
    throw new LivePointEvidenceError(
      "LIVE_POINT_INVALID",
      400,
      "The expected OpenStreetMap identity is invalid.",
      false
    );
  }
  const nearbyPayloadPromise = fetchOverpassJson(buildOverpassNearbyQuery(point))
    .then((payload) => ({ ok: true as const, payload }))
    .catch(() => ({ ok: false as const }));
  const fabricPayloadPromise = fetchOverpassJson(buildOverpassUrbanFabricQuery(point))
    .then((payload) => ({ ok: true as const, payload }))
    .catch(() => ({ ok: false as const }));
  const [place, nearbyPayload, fabricPayload] = await Promise.all([
    trustedIdentity ? lookupPlace(endpoint, trustedIdentity, locale) : reversePlace(endpoint, point, locale),
    nearbyPayloadPromise,
    fabricPayloadPromise
  ]);
  const matchMethod = trustedIdentity ? "nominatim_lookup" as const : "nominatim_reverse" as const;

  if (!place) {
    throw new LivePointEvidenceError(
      "OBJECT_NOT_RESOLVED",
      422,
      "No suitable indexed OpenStreetMap object was resolved for this point.",
      false
    );
  }

  const resolvedIdentity = `${place.osmType}/${place.osmId}`;
  if (trustedIdentity && resolvedIdentity !== `${trustedIdentity.type}/${trustedIdentity.id}`) {
    throw new LivePointEvidenceError(
      "OBJECT_NOT_RESOLVED",
      409,
      "The expected OpenStreetMap object could not be resolved exactly.",
      true
    );
  }

  const geometryContainsAnchor = geometryContainsPoint(place.geometry, point);
  const trustedAnchorMatch = trustedIdentity ? matchPointObjectTrustedIdentityAnchor({
    anchor: point,
    centroid: [place.longitude, place.latitude],
    geometryContainsAnchor,
    boundingBox: place.boundingBox
  }) : null;
  if (trustedIdentity && !trustedAnchorMatch?.matched) {
    throw new LivePointEvidenceError(
      "OBJECT_NOT_RESOLVED",
      409,
      "The expected OpenStreetMap object is not spatially consistent with the selected point.",
      true
    );
  }
  const coordinateAssociation = pointObjectLookupAssociation(matchMethod, geometryContainsAnchor);

  const sourceFeatureId = resolvedIdentity;
  const nearby = nearbyPayload.ok
    ? await resolveLiveNearbyContext(point, sourceFeatureId, locale, async () => nearbyPayload.payload)
    : { status: "unavailable" as const, items: [], responseHash: null, observedAt: null };
  const fabric = fabricPayload.ok
    ? await resolveLiveUrbanFabric(point, async () => fabricPayload.payload)
    : { profile: normalizeOverpassUrbanFabric(null, point), responseHash: null, observedAt: null };
  const selectedTags = displayTags(place);
  const selectedMetrics = geometryMetrics(place.geometry);
  const centroidDistance = trustedAnchorMatch?.centroidDistanceM ?? Math.round(distanceM(point, [place.longitude, place.latitude]));
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
      geometryHash: place.geometryHash,
      metrics: selectedMetrics
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
      addressParts: place.address,
      tags: selectedTags,
      metrics: selectedMetrics
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
      contextService: "Overpass API" as const,
      contextStatus: nearby.status,
      contextResponseId: nearby.responseHash ? `overpass_response_${nearby.responseHash.slice(0, 24)}` : null,
      contextResponseHash: nearby.responseHash,
      contextObservedAt: nearby.observedAt,
      contextRadiusM: OVERPASS_RADIUS_M,
      contextUsagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html" as const,
      fabricStatus: fabric.profile.coverage,
      fabricResponseId: fabric.responseHash ? `overpass_fabric_${fabric.responseHash.slice(0, 24)}` : null,
      fabricResponseHash: fabric.responseHash,
      fabricObservedAt: fabric.observedAt,
      fabricRadiusM: URBAN_FABRIC_RADIUS_M,
      sourceOfferPath: "/prototype/point-to-object/source-offer" as const,
      officialStatus: "open_context_not_official" as const,
      runtimeNetworkUsed: true as const,
      persistenceUsed: false as const
    },
    nearbyContext: nearby.items,
    geoContext: fabric.profile,
    evidence: [
      ...evidenceFor(place, point, matchMethod, coordinateAssociation, place.geometryHash, selectedTags, selectedMetrics),
      ...evidenceForNearby(nearby.items),
      ...evidenceForGeoContext(fabric.profile)
    ],
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
        ? "The returned OpenStreetMap polygon contains the analysis point, but it is community context and is not an official parcel or cadastral boundary."
        : coordinateAssociation === "trusted_open_map_identity"
          ? "The exact OpenStreetMap identity was carried from a server-normalized search result and resolved through Nominatim lookup; the supplied point is a navigation anchor and may not lie inside returned geometry."
          : "Nominatim reverse geocoding returns the closest suitable indexed OSM object and does not prove that the analysis point lies inside its geometry.",
      trustedIdentity
        ? "The expected OpenStreetMap node, way or relation identity is checked server-side and spatially bound to the selected anchor; the request fails closed if the exact identity cannot be resolved consistently."
        : "A rendered vector-tile feature identity is not treated as authoritative; context is resolved server-side from the map-selected analysis point.",
      "OpenStreetMap is open community context and may be incomplete, stale or differently classified from authoritative registers.",
      "Raw source geometry is used only to derive its type and semantic hash; it is not sent to the AI model.",
      nearby.status === "available"
        ? `Nearby context is a bounded OpenStreetMap/Overpass sample within ${OVERPASS_RADIUS_M} m; it is not a complete inventory and absent records do not prove real-world absence.`
        : "Nearby OpenStreetMap context was unavailable for this request; the primary Nominatim object remains usable, but no inference may be made from the empty nearby list.",
      "The public Nominatim endpoint is suitable only for a moderate low-traffic Preview; its in-process throttle is not a distributed production quota.",
      "The public Overpass endpoint is a cached, bounded Preview dependency; it is not a production SLA and failures degrade to an explicitly empty nearby context.",
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
