import "server-only";
import { readExactSourceElement, exactSourcePlacePayload } from "./point-to-object-exact-source";
import type { SharedExactSourceSnapshot } from "./point-to-object-exact-source";

import { unstable_cache } from "next/cache";
import type { MultiPolygon, Polygon, Position } from "geojson";
import { sourceRetryAfterSeconds, waitForSourceAdmission } from "./point-to-object-source-recovery";
import { PUBLIC_SOURCE_TOTAL_BUDGET_MS, runOverpassWithinBudget } from "./point-to-object-source-budget";

import { LIVE_POINT_CAVEAT } from "@/src/lib/point-to-object/contracts";
import { semanticHash, sha256 } from "@/src/lib/point-to-object/hash";
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
import { resolvePointObjectWikidata } from "./point-to-object-wikidata";
import type {
  PointObjectWikidataCountryCode,
  PointObjectWikidataLinkedEntity,
  PointObjectWikidataResolution
} from "./point-to-object-wikidata-contract";

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
const MAX_DISPLAY_GEOMETRY_POSITIONS = 5_000;
const OVERPASS_RESPONSE_MAX_BYTES = 512 * 1024;
export const POINT_OBJECT_OVERPASS_EXECUTION_MEMORY_MAX_BYTES = 32 * 1024 * 1024;
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

export type PointObjectDisplayGeometry = Polygon | MultiPolygon;

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
  /** Exact market country already validated by the route. */
  expectedCountryCode: PointObjectWikidataCountryCode;
  /** Optional enclosing route deadline; it always wins over the adapter cap. */
  deadlineAtMs?: number;
  /** Server-only verified Find snapshot; never accepted from a route request body. */
  serverExactSnapshot?: SharedExactSourceSnapshot | null;
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
  protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2";
  evidencePackId: string;
  evidencePackHash: string;
  caseKey: "live";
  caseId: string;
  /** Display-only, exact-object geometry. Deliberately excluded from evidencePackHash and model projection. */
  displayGeometry: PointObjectDisplayGeometry | null;
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
  linkedEntity: PointObjectWikidataLinkedEntity | null;
  source: {
    name: "OpenStreetMap";
    service: "Nominatim" | "Overpass API";
    sourceId: "SPAT-001";
    sourceResponseId: string;
    sourceResponseHash: string;
    sourceResponseBytes: number;
    observedAt: null;
    acquiredAt: string;
    freshness: "runtime_response_feature_time_unavailable";
    rightsDecisionId: "runtime_open_context_odbl_attribution_required";
    licenceId: "ODbL-1.0";
    attribution: "© OpenStreetMap contributors";
    licenceUrl: "https://www.openstreetmap.org/copyright";
    usagePolicyUrl: "https://operations.osmfoundation.org/policies/nominatim/" | "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html";
    contextService: "Overpass API";
    contextStatus: "available" | "unavailable";
    contextDiagnostic?: PublicSourceDiagnostic;
    contextResponseId: string | null;
    contextResponseHash: string | null;
    contextObservedAt: string | null;
    contextRadiusM: number;
    contextUsagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html";
    fabricStatus: "available" | "unavailable";
    fabricDiagnostic?: PublicSourceDiagnostic;
    fabricResponseId: string | null;
    fabricResponseHash: string | null;
    fabricObservedAt: string | null;
    fabricRadiusM: typeof URBAN_FABRIC_RADIUS_M;
    sourceOfferPath: "/prototype/point-to-object/source-offer";
    officialStatus: "open_context_not_official";
    runtimeNetworkUsed: true;
    persistenceUsed: false;
    wikidataStatus: PointObjectWikidataResolution["status"];
    wikidataReason: PointObjectWikidataResolution["reason"];
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
  | "OVERPASS_TIMEOUT"
  | "OVERPASS_RATE_LIMITED"
  | "OVERPASS_UNAVAILABLE"
  | "OVERPASS_RESPONSE_TOO_LARGE"
  | "OVERPASS_RESPONSE_INVALID"
  | "OBJECT_NOT_RESOLVED";

export class LivePointEvidenceError extends Error {
  constructor(
    public readonly code: LivePointEvidenceErrorCode,
    public readonly httpStatus: number,
    message: string,
    public readonly retryable: boolean,
    public readonly retryAfterSeconds?: number
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

async function waitForNominatimSlot(signal: AbortSignal): Promise<void> {
  let release: (() => void) | undefined;
  const previous = nominatimGate;
  nominatimGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    signal.throwIfAborted();
    const waitMs = Math.max(0, lastNominatimDispatchAt + NOMINATIM_MIN_INTERVAL_MS - Date.now());
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    signal.throwIfAborted();
    lastNominatimDispatchAt = Date.now();
  } finally {
    release?.();
  }
}

async function waitForOverpassSlot(signal: AbortSignal): Promise<void> {
  let release: (() => void) | undefined;
  const previous = overpassGate;
  overpassGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    signal.throwIfAborted();
    const waitMs = Math.max(0, lastOverpassDispatchAt + OVERPASS_MIN_INTERVAL_MS - Date.now());
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    signal.throwIfAborted();
    lastOverpassDispatchAt = Date.now();
  } finally {
    release?.();
  }
}

async function readBoundedText(response: Response): Promise<{ text: string; bytes: number }> {
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
  return { text, bytes: byteCount };
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

type NominatimResponseReceipt = {
  payload: unknown;
  sourceResponseHash: string;
  sourceResponseBytes: number;
  acquiredAt: string;
};

async function fetchNominatimJsonUncached(urlString: string): Promise<NominatimResponseReceipt> {
  const signal = AbortSignal.timeout(NOMINATIM_TIMEOUT_MS);
  let response: Response;
  try {
    await waitForSourceAdmission(waitForNominatimSlot(signal), signal);
    response = await fetch(new URL(urlString), {
      method: "GET",
      redirect: "error",
      signal,
      headers: {
        Accept: "application/json",
        Referer: APPLICATION_REFERER,
        "User-Agent": configuredUserAgent()
      },
      cache: "no-store"
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
        true,
        sourceRetryAfterSeconds(response.headers.get("retry-after"))
      );
    }
    throw new LivePointEvidenceError(
      "NOMINATIM_UNAVAILABLE",
      response.status >= 500 ? 502 : 422,
      "The live OpenStreetMap resolver did not return a usable result.",
      response.status >= 500
    );
  }

  let bounded: { text: string; bytes: number };
  try {
    bounded = await readBoundedText(response);
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
    return {
      payload: JSON.parse(bounded.text),
      sourceResponseHash: sha256(bounded.text),
      sourceResponseBytes: bounded.bytes,
      acquiredAt: new Date().toISOString()
    };
  } catch {
    throw new LivePointEvidenceError(
      "NOMINATIM_RESPONSE_INVALID",
      502,
      "The live OpenStreetMap resolver returned invalid JSON.",
      true
    );
  }
}

const fetchNominatimJson = unstable_cache(
  fetchNominatimJsonUncached,
  ["point-object-live-nominatim-v3"],
  { revalidate: NOMINATIM_REVALIDATE_SECONDS }
);

export function buildOverpassNearbyQuery(point: [number, number]): string {
  const longitude = finiteCoordinate(point[0], 180);
  const latitude = finiteCoordinate(point[1], 90);
  if (longitude === null || latitude === null) throw new Error("Invalid WGS84 point.");
  const around = `(around:${OVERPASS_RADIUS_M},${latitude.toFixed(6)},${longitude.toFixed(6)})`;
  return [
    `[out:json][timeout:4][maxsize:${POINT_OBJECT_OVERPASS_EXECUTION_MEMORY_MAX_BYTES}];`,
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
    `[out:json][timeout:4][maxsize:${POINT_OBJECT_OVERPASS_EXECUTION_MEMORY_MAX_BYTES}];`,
    // Compute the spatial set once: repeating the around scan for every tag
    // needlessly spends the short public-source execution budget. Filtering the
    // same named set preserves the union, output order, radius and result cap.
    `nwr${around}->.fabric;`,
    "(",
    `nwr.fabric["building"];`,
    `nwr.fabric["landuse"~"^(residential|commercial|retail|industrial|construction|brownfield|recreation_ground|forest)$"];`,
    `nwr.fabric["office"];`,
    `nwr.fabric["shop"];`,
    `nwr.fabric["tourism"];`,
    `nwr.fabric["amenity"];`,
    `nwr.fabric["leisure"];`,
    `nwr.fabric["natural"~"^(wood|water|grassland|scrub)$"];`,
    `nwr.fabric["public_transport"];`,
    `nwr.fabric["railway"~"^(station|halt|tram_stop|subway_entrance)$"];`,
    `node.fabric["highway"="bus_stop"];`,
    `way.fabric["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"];`,
    ");",
    `out tags center ${URBAN_FABRIC_RESULT_LIMIT};`
  ].join("\n");
}

async function readOverpassText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > OVERPASS_RESPONSE_MAX_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new LivePointEvidenceError("OVERPASS_RESPONSE_TOO_LARGE", 502, "The OpenStreetMap source response exceeded the permitted size.", false);
  }
  if (!response.body) throw new LivePointEvidenceError("OVERPASS_RESPONSE_INVALID", 502, "The OpenStreetMap source returned no readable body.", true);
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
      throw new LivePointEvidenceError("OVERPASS_RESPONSE_TOO_LARGE", 502, "The OpenStreetMap source response exceeded the permitted size.", false);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function assertUsableOverpassPayload(payload: unknown): asserts payload is Record<string, unknown> & { elements: unknown[] } {
  if (!isRecord(payload) || !Array.isArray(payload.elements) || Object.hasOwn(payload, "remark")) {
    throw new LivePointEvidenceError("OVERPASS_RESPONSE_INVALID", 502, "The OpenStreetMap source returned an invalid or incomplete response.", true);
  }
}

function assertNoOverpassRuntimeRemark(payload: unknown): void {
  if (isRecord(payload) && Object.hasOwn(payload, "remark")) {
    throw new Error("Overpass reported a runtime failure.");
  }
}

async function fetchOverpassJsonUncached(query: string, deadlineAtMs = Date.now() + PUBLIC_SOURCE_TOTAL_BUDGET_MS): Promise<unknown> {
  try {
    return await runOverpassWithinBudget(deadlineAtMs, waitForOverpassSlot, async (signal) => {
    const url = configuredOverpassEndpoint();
    url.searchParams.set("data", query);
    const response = await fetch(url, {
      method: "GET",
      redirect: "error",
      signal,
      headers: {
        Accept: "application/json",
        Referer: APPLICATION_REFERER,
        "User-Agent": configuredUserAgent()
      },
      // Cache only validated JSON: an HTTP 200 runtime error is not empty context.
      cache: "no-store"
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      if (response.status === 429) {
        throw new LivePointEvidenceError("OVERPASS_RATE_LIMITED", 429, "The OpenStreetMap source is rate limited. Wait before retrying.", true, sourceRetryAfterSeconds(response.headers.get("retry-after")));
      }
      if (response.status === 408 || response.status === 504) {
        throw new LivePointEvidenceError("OVERPASS_TIMEOUT", 504, "The OpenStreetMap source did not respond in time.", true);
      }
      throw new LivePointEvidenceError("OVERPASS_UNAVAILABLE", 502, "The OpenStreetMap source is temporarily unavailable.", true);
    }
    const text = await readOverpassText(response);
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new LivePointEvidenceError("OVERPASS_RESPONSE_INVALID", 502, "The OpenStreetMap source returned an invalid response.", true);
    }
    assertUsableOverpassPayload(payload);
    return payload;
    });
  } catch (error) {
    if (error instanceof LivePointEvidenceError) throw error;
    if (isTimeout(error)) {
      throw new LivePointEvidenceError("OVERPASS_TIMEOUT", 504, "The OpenStreetMap source did not respond in time.", true);
    }
    throw new LivePointEvidenceError("OVERPASS_UNAVAILABLE", 502, "The OpenStreetMap source is temporarily unavailable.", true);
  }
}

const fetchOverpassJsonCached = unstable_cache(
  fetchOverpassJsonUncached,
  ["point-object-live-overpass-v2"],
  { revalidate: OVERPASS_REVALIDATE_SECONDS }
);

// A lease acquisition is already cached as a complete public pack. Its absolute
// deadline must not become an argument in the reusable query-only cache key.
function fetchOverpassJson(query: string, deadlineAtMs?: number): Promise<unknown> {
  return deadlineAtMs === undefined ? fetchOverpassJsonCached(query) : fetchOverpassJsonUncached(query, deadlineAtMs);
}

type PublicSourceDiagnostic = {
  failureCode: "timeout" | "rate_limited" | "invalid_response" | "response_too_large" | "unavailable" | null;
};

async function acquireOptionalOverpass(query: string, deadlineAtMs: number) {
  try {
    const payload = await fetchOverpassJson(query, deadlineAtMs);
    return { ok: true as const, payload, diagnostic: { failureCode: null } as PublicSourceDiagnostic };
  } catch (error) {
    const codes = { OVERPASS_TIMEOUT: "timeout", OVERPASS_RATE_LIMITED: "rate_limited", OVERPASS_RESPONSE_INVALID: "invalid_response", OVERPASS_RESPONSE_TOO_LARGE: "response_too_large" } as const;
    const failureCode = error instanceof LivePointEvidenceError && error.code in codes
      ? codes[error.code as keyof typeof codes] : "unavailable";
    return { ok: false as const, diagnostic: { failureCode } as PublicSourceDiagnostic };
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

function displayPosition(value: unknown, counter: { count: number }): Position | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const longitude = finiteCoordinate(value[0], 180);
  const latitude = finiteCoordinate(value[1], 90);
  if (longitude === null || latitude === null) return null;
  counter.count += 1;
  return counter.count <= MAX_DISPLAY_GEOMETRY_POSITIONS ? [longitude, latitude] : null;
}

function displayRing(value: unknown, counter: { count: number }): Position[] | null {
  if (!Array.isArray(value) || value.length < 4) return null;
  const ring: Position[] = [];
  for (const rawPosition of value) {
    const position = displayPosition(rawPosition, counter);
    if (!position) return null;
    ring.push(position);
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) return null;
  const distinct = new Set(ring.slice(0, -1).map((position) => `${position[0]},${position[1]}`));
  return distinct.size >= 3 ? ring : null;
}

function displayPolygonCoordinates(value: unknown, counter: { count: number }): Position[][] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const polygon: Position[][] = [];
  for (const rawRing of value) {
    const ring = displayRing(rawRing, counter);
    if (!ring) return null;
    polygon.push(ring);
  }
  return polygon;
}

/**
 * Export only an intact GeoJSON surface under the stricter UI budget. Returning
 * null instead of truncating or simplifying keeps complete-footprint provenance
 * from being attached to a partial shape.
 */
export function pointObjectDisplayGeometry(geometry: SafeGeometry | null): PointObjectDisplayGeometry | null {
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return null;
  const counter = { count: 0 };
  if (geometry.type === "Polygon") {
    const coordinates = displayPolygonCoordinates(geometry.coordinates, counter);
    return coordinates ? { type: "Polygon", coordinates } : null;
  }
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) return null;
  const coordinates: Position[][][] = [];
  for (const rawPolygon of geometry.coordinates) {
    const polygon = displayPolygonCoordinates(rawPolygon, counter);
    if (!polygon) return null;
    coordinates.push(polygon);
  }
  return { type: "MultiPolygon", coordinates };
}

/**
 * Return display geometry only for an exact, surface-like OSM identity. Nominatim
 * exposes the primary `building=*` classification as `category`/`type` and does
 * not consistently duplicate that primary tag in `extratags`; accepting the
 * sanitized `building` category keeps that exact polygon eligible without
 * promoting office, tourism or other POI classifications to physical surfaces.
 */
export function pointObjectTrustedDisplayGeometry(input: {
  expectedSourceFeatureId: string | null;
  resolvedSourceFeatureId: string;
  primaryCategory: string | null;
  selectedTags: Readonly<Record<string, string>>;
  geometry: SafeGeometry | null;
}): PointObjectDisplayGeometry | null {
  if (input.expectedSourceFeatureId !== input.resolvedSourceFeatureId ||
      !/^(?:way|relation)\/[1-9]\d{0,19}$/.test(input.expectedSourceFeatureId ?? "")) return null;
  const mappedSurface = input.primaryCategory === "building" ||
    Boolean(input.selectedTags["tag.building"] || input.selectedTags["tag.landuse"]);
  return mappedSurface ? pointObjectDisplayGeometry(input.geometry) : null;
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
  if (["school", "kindergarten", "college", "university"].includes(amenity ?? "")) return "education";
  if (["hospital", "clinic", "doctors", "dentist", "pharmacy"].includes(amenity ?? "")) return "healthcare";
  if (["marketplace", "restaurant", "cafe", "fast_food", "food_court"].includes(amenity ?? "")) return "retail_daily_needs";
  if (amenity && [
    "library", "community_centre", "arts_centre", "theatre", "cinema", "place_of_worship", "townhall",
    "courthouse", "police", "fire_station", "post_office", "social_facility", "childcare"
  ].includes(amenity)) return "civic_culture";
  if ([
    "hotel", "guest_house", "hostel", "motel", "resort", "apartment", "chalet", "alpine_hut",
    "wilderness_hut", "camp_site", "caravan_site", "holiday_village"
  ].includes(tourism ?? "") || ["hotel", "guest_house", "hostel", "resort"].includes(building ?? "")) return "hospitality";
  if (["museum", "gallery"].includes(tourism ?? "") || ["civic", "government", "public", "museum"].includes(building ?? "")) return "civic_culture";
  if (typeof tags.shop === "string" || landuse === "retail" || building === "retail") return "retail_daily_needs";
  if (typeof tags.office === "string" || landuse === "commercial" || ["commercial", "office"].includes(building ?? "")) return "commercial";
  if (["school", "kindergarten", "college", "university"].includes(building ?? "")) return "education";
  if (["hospital", "clinic", "healthcare"].includes(building ?? "")) return "healthcare";
  if (["residential", "apartments", "house", "detached", "terrace", "semidetached_house", "dormitory"].includes(building ?? "") || landuse === "residential") return "residential";
  if (publicTransport || railway || highway === "bus_stop") return "transport";
  if (["motorway", "trunk", "primary", "secondary", "tertiary"].includes(highway ?? "")) return "access";
  if (leisure || natural || ["recreation_ground", "forest"].includes(landuse ?? "")) return "open_space";
  if (building) return "other_built";
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
    if (share("industrial") >= 0.4) {
      code = "industrial_logistics";
      driverGroups = ["industrial"];
    } else if (share("construction") >= 0.4) {
      // Construction/brownfield tags establish neither current activity nor
      // eventual industrial, residential or other use. Keep that use unknown.
      code = "low_signal";
      driverGroups = ["construction"];
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
  assertNoOverpassRuntimeRemark(payload);
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
    // Overpass `around` may return a way/relation whose geometry intersects the
    // radius while its returned centre lies outside it. Only centres inside the
    // declared radius contribute to within-radius counts and distance metrics.
    if (!Number.isFinite(directDistanceM) || directDistanceM > URBAN_FABRIC_RADIUS_M) continue;
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
  const groupPriority = (group: PointObjectContextGroup): number => {
    if (group === "transport" || group === "access") return 0;
    if (group === "other_built") return 3;
    if (group === "industrial" || group === "construction") return 2;
    return 1;
  };
  const groups = POINT_OBJECT_CONTEXT_GROUPS.flatMap((group) => {
    const count = counts.get(group) ?? 0;
    return count === 0 ? [] : [{
      group,
      count,
      sharePct: sample.length > 0 ? Number((count / sample.length * 100).toFixed(1)) : 0,
      nearestDistanceM: nearest.get(group) ?? null
    }];
  }).sort((left, right) => groupPriority(left.group) - groupPriority(right.group) ||
    right.count - left.count ||
    (left.nearestDistanceM ?? Number.POSITIVE_INFINITY) - (right.nearestDistanceM ?? Number.POSITIVE_INFINITY) ||
    left.group.localeCompare(right.group));
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
    assertUsableOverpassPayload(payload);
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
  const buckets = new Map(groupOrder.map((group) => {
    const sorted = candidates
      .filter((item) => item.group === group)
      .sort((left, right) => left.distanceM - right.distanceM || left.sourceFeatureId.localeCompare(right.sourceFeatureId));
    const seenNames = new Set<string>();
    const diverse: NearbyCandidate[] = [];
    const repeated: NearbyCandidate[] = [];
    for (const item of sorted) {
      const nameKey = item.name.normalize("NFKC").toLocaleLowerCase("en-US");
      (seenNames.has(nameKey) ? repeated : diverse).push(item);
      seenNames.add(nameKey);
    }
    return [group, [...diverse, ...repeated]] as const;
  }));
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
  assertNoOverpassRuntimeRemark(payload);
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
    // Around filters use feature geometry, while ways/relations expose a
    // derived centre. Omit edge-intersecting records whose returned centre is
    // outside the declared within-radius claim.
    if (!Number.isFinite(directDistanceM) || directDistanceM > OVERPASS_RADIUS_M) continue;
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

  return balancedNearbySelection([...bySourceIdentity.values()]).map(({ group: _group, ...item }, index) => ({
    ...item,
    evidenceId: `EVD-CONTEXT-${index + 1}`,
    proofLimit: "One bounded OpenStreetMap element record from Overpass; it is not asserted to be a unique real-world facility. Distance is straight-line from the analysis point to the returned node or derived element centre inside the declared radius, not a route, travel time, service level or proof of complete coverage."
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
    assertUsableOverpassPayload(payload);
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
): Promise<{ place: SafeNominatimPlace | null; receipt: NominatimResponseReceipt }> {
  const url = new URL("reverse", endpoint);
  addCommonParameters(url, locale);
  url.searchParams.set("lat", point[1].toFixed(6));
  url.searchParams.set("lon", point[0].toFixed(6));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("layer", "address,poi,railway,natural,manmade");
  const receipt = await fetchNominatimJson(url.toString());
  return { place: sanitizePlace(receipt.payload), receipt };
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
): Promise<{ place: SafeNominatimPlace | null; receipt: NominatimResponseReceipt }> {
  const url = new URL("lookup", endpoint);
  addCommonParameters(url, locale);
  // Exact Find hydration must not receive Nominatim's generalized display
  // polygon: a simplified edge cannot support complete-footprint provenance.
  url.searchParams.set("polygon_threshold", "0");
  url.searchParams.set("osm_ids", sourceFeatureId.lookupId);
  const receipt = await fetchNominatimJson(url.toString());
  if (!Array.isArray(receipt.payload)) return { place: null, receipt };
  const place = receipt.payload.map(sanitizePlace).find((candidate): candidate is SafeNominatimPlace => Boolean(
    candidate && candidate.osmType === sourceFeatureId.type && candidate.osmId === sourceFeatureId.id
  ));
  return { place: place ?? null, receipt };
}

async function exactSourcePlace(sourceFeatureId: string, locale: string, deadlineAtMs?: number, shared?: SharedExactSourceSnapshot | null): Promise<{ place: SafeNominatimPlace | null; receipt: NominatimResponseReceipt }> {
  try {
    const source = await readExactSourceElement(sourceFeatureId, async (query) => {
      const payload = await fetchOverpassJson(query, deadlineAtMs);
      assertUsableOverpassPayload(payload);
      if (payload.elements.length === 0) {
        throw new LivePointEvidenceError("OBJECT_NOT_RESOLVED", 422, "The exact OpenStreetMap source record was not found. The selected identity has not changed.", false);
      }
      const element = payload.elements[0];
      if (payload.elements.length !== 1 || !isRecord(element)) {
        throw new LivePointEvidenceError("OVERPASS_RESPONSE_INVALID", 502, "The exact OpenStreetMap source returned an invalid response.", true);
      }
      if (`${element.type}/${element.id}` !== sourceFeatureId) {
        throw new LivePointEvidenceError("OBJECT_NOT_RESOLVED", 409, "The expected OpenStreetMap object could not be resolved exactly.", true);
      }
      return payload;
    }, Date.now(), shared);
    const payload = exactSourcePlacePayload(source.element, locale);
    return { place: sanitizePlace(payload), receipt: {
      payload, sourceResponseHash: semanticHash(source.element),
      sourceResponseBytes: Buffer.byteLength(JSON.stringify(source.element)), acquiredAt: source.acquiredAt
    } };
  } catch (error) {
    if (error instanceof LivePointEvidenceError) throw error;
    throw new LivePointEvidenceError("OBJECT_NOT_RESOLVED", 502, "The exact OpenStreetMap source record is temporarily unavailable. The selected identity has not changed.", true);
  }
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
  const receipt = await fetchNominatimJson(url.toString());
  if (!Array.isArray(receipt.payload)) return [];
  const seen = new Set<string>();
  return receipt.payload.flatMap((raw) => {
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
      proofLimit: "Community-map source classification; not an official land-use, zoning or legal-use classification."
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
      proofLimit: `Hash of the source-returned ${place.geometryType} geometry; raw geometry is withheld from the model and is not an official parcel boundary.`
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
      categories: item.categories,
      featureClass: item.featureClass,
      distanceM: item.distanceM,
      method: item.method
    }),
    sourceId: item.sourceFeatureId,
    proofLimit: item.proofLimit
  }));
}

function evidenceForWikidata(entity: PointObjectWikidataLinkedEntity): PointObjectEvidenceReference[] {
  const sourceId = `wikidata:${entity.qid}`;
  const shared = {
    qid: entity.qid,
    sourceResponseHash: entity.source.sourceResponseHash,
    sourceRevisionId: entity.source.sourceRevisionId,
    identityReceiptHash: entity.identity.identityReceiptHash
  };
  const evidence: PointObjectEvidenceReference[] = [{
    id: "EVD-WIKIDATA-ENTITY",
    label: "Linked Wikidata community entity",
    value: JSON.stringify({ ...shared, labels: entity.labels, identity: entity.identity, source: entity.source }),
    sourceId,
    proofLimit: "Exact QID carried by the selected OSM record and conservatively spatial/type/country checked. This links a community entity; it does not certify a selected building footprint, parcel, owner, legal use or official identity."
  }];
  const proofLimits: Record<string, string> = {
    P31: "Wikidata entity-type statements retained with statement rank; they support only the linked-entity scope and are not an official use classification.",
    P571: "Wikidata inception statement with original precision and Gregorian calendar; inception is not automatically opening, completion, refurbishment or source observation time.",
    P2048: "Wikidata linked-entity height statements in metres; they remain separate from OSM footprint attributes and never feed Create geometry.",
    P1101: "Wikidata linked-entity above-ground floor-count statements; they remain separate from OSM footprint attributes and never feed Create geometry.",
    P625: "Wikidata entity-coordinate statements used only by the conservative linked-entity identity receipt.",
    P17: "Wikidata country statements used only as a linked-entity consistency check."
  };
  for (const propertyId of ["P31", "P571", "P2048", "P1101", "P625", "P17"] as const) {
    const statements = entity.statements.filter((statement) => statement.propertyId === propertyId);
    if (!statements.length) continue;
    evidence.push({
      id: `EVD-WIKIDATA-${propertyId}`,
      label: `Wikidata ${propertyId} statement receipt`,
      value: JSON.stringify({ ...shared, statements }),
      sourceId,
      proofLimit: proofLimits[propertyId]
    });
  }
  return evidence;
}

function mappedNumericTag(
  tags: Record<string, string>,
  key: string,
  propertyId: "P2048" | "P1101"
): number | null {
  const raw = tags[key];
  if (!raw) return null;
  const match = /^([+-]?\d{1,4}(?:\.\d{1,3})?)\s*(m|metre|meter|metres|meters|ft|feet)?$/i.exec(raw.normalize("NFKC").trim());
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  if (propertyId === "P1101") return !match[2] && Number.isSafeInteger(value) && value > 0 ? value : null;
  if (match[2]?.toLowerCase() === "ft" || match[2]?.toLowerCase() === "feet") return value > 0 ? value * 0.3048 : null;
  return value > 0 ? value : null;
}

function linkedQuantityValues(entity: PointObjectWikidataLinkedEntity, propertyId: "P2048" | "P1101"): number[] {
  return entity.statements.flatMap((statement) => statement.propertyId === propertyId && statement.value.kind === "quantity"
    ? [statement.value.numericValue]
    : []);
}

function linkedEntityConflicts(
  entity: PointObjectWikidataLinkedEntity,
  selectedTags: Record<string, string>
): string[] {
  const conflicts = entity.conflictingPropertyIds.map((propertyId) => (
    `Wikidata ${propertyId} carries multiple active values; every value remains source-scoped and no winner or average is selected.`
  ));
  const comparisons = [
    { propertyId: "P2048" as const, tag: "tag.height", label: "height" },
    { propertyId: "P1101" as const, tag: "tag.building:levels", label: "floor count" }
  ];
  for (const comparison of comparisons) {
    const osmValue = mappedNumericTag(selectedTags, comparison.tag, comparison.propertyId);
    const wikidataValues = linkedQuantityValues(entity, comparison.propertyId);
    if (osmValue !== null && wikidataValues.length && !wikidataValues.every((value) => (
      Math.abs(value - osmValue) <= Math.max(0.01, Math.abs(osmValue) * 1e-6)
    ))) {
      conflicts.push(`OSM selected-object ${comparison.label} (${osmValue}) and Wikidata linked-entity ${comparison.label} (${wikidataValues.join(", ")}) differ; the sources remain separate.`);
    }
  }
  return conflicts;
}

export async function buildLivePointObjectEvidencePack(
  input: LivePointEvidenceRequest
): Promise<LivePointObjectEvidencePack> {
  const deadlineAtMs = Math.min(input.deadlineAtMs ?? Infinity, Date.now() + PUBLIC_SOURCE_TOTAL_BUDGET_MS);
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
  // Resolve and validate the mandatory subject before optional enrichment takes
  // admission slots from the same bounded Overpass queue. Never replace a failed
  // exact identity with nearby context, and do not spend calls on an invalid one.
  const placeReceipt = await (trustedIdentity ? exactSourcePlace(`${trustedIdentity.type}/${trustedIdentity.id}`, locale, deadlineAtMs, input.serverExactSnapshot) : reversePlace(endpoint, point, locale));
  const place = placeReceipt.place;
  const matchMethod = trustedIdentity ? "overpass_exact_identity" as const : "nominatim_reverse" as const;

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

  const [nearbyPayload, fabricPayload] = await Promise.all([
    acquireOptionalOverpass(buildOverpassNearbyQuery(point), deadlineAtMs),
    acquireOptionalOverpass(buildOverpassUrbanFabricQuery(point), deadlineAtMs)
  ]);

  const sourceFeatureId = resolvedIdentity;
  const nearby = nearbyPayload.ok
    ? await resolveLiveNearbyContext(point, sourceFeatureId, locale, async () => nearbyPayload.payload)
    : { status: "unavailable" as const, items: [], responseHash: null, observedAt: null };
  const fabric = fabricPayload.ok
    ? await resolveLiveUrbanFabric(point, async () => fabricPayload.payload)
    : { profile: normalizeOverpassUrbanFabric(null, point), responseHash: null, observedAt: null };
  const selectedTags = displayTags(place);
  const displayGeometry = pointObjectTrustedDisplayGeometry({
    expectedSourceFeatureId: input.osmFeatureId ?? null,
    resolvedSourceFeatureId: sourceFeatureId,
    primaryCategory: place.category,
    selectedTags,
    geometry: place.geometry
  });
  const selectedMetrics = geometryMetrics(place.geometry);
  const wikidata = await resolvePointObjectWikidata({
    qid: selectedTags["tag.wikidata"] ?? null,
    osmSourceFeatureId: sourceFeatureId,
    osmGeometryHash: place.geometryHash,
    osmGeometry: place.geometry,
    osmCentroid: [place.longitude, place.latitude],
    osmFeatureClass: featureClass(place),
    osmTags: selectedTags,
    expectedCountryCode: input.expectedCountryCode,
    deadlineAtMs
  });
  if (wikidata.status === "available") conflicts.push(...linkedEntityConflicts(wikidata.linkedEntity, selectedTags));
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
  const normalizedSourceFeatureHash = semanticHash(sourceResponseCore);
  const sourceResponseHash = placeReceipt.receipt.sourceResponseHash;
  const resolutionCore = {
    point,
    sourceFeatureId,
    matchMethod,
    coordinateAssociation,
    centroidDistance,
    sourceResponseHash,
    normalizedSourceFeatureHash
  };
  const resolutionHash = semanticHash(resolutionCore);
  const acquiredAt = placeReceipt.receipt.acquiredAt;
  const core = {
    protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2" as const,
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
    linkedEntity: wikidata.linkedEntity,
    source: {
      name: "OpenStreetMap" as const,
      service: trustedIdentity ? "Overpass API" as const : "Nominatim" as const,
      sourceId: "SPAT-001" as const,
      sourceResponseId: `${trustedIdentity ? "overpass_exact" : "nominatim"}_response_${sourceResponseHash.slice(0, 24)}`,
      sourceResponseHash,
      sourceResponseBytes: placeReceipt.receipt.sourceResponseBytes,
      observedAt: null,
      acquiredAt,
      freshness: "runtime_response_feature_time_unavailable" as const,
      rightsDecisionId: "runtime_open_context_odbl_attribution_required" as const,
      licenceId: "ODbL-1.0" as const,
      attribution: "© OpenStreetMap contributors" as const,
      licenceUrl: "https://www.openstreetmap.org/copyright" as const,
      usagePolicyUrl: trustedIdentity ? "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html" as const : "https://operations.osmfoundation.org/policies/nominatim/" as const,
      contextService: "Overpass API" as const,
      contextStatus: nearby.status,
      contextDiagnostic: nearbyPayload.ok && nearby.status === "unavailable"
        ? { ...nearbyPayload.diagnostic, failureCode: "invalid_response" as const } : nearbyPayload.diagnostic,
      contextResponseId: nearby.responseHash ? `overpass_response_${nearby.responseHash.slice(0, 24)}` : null,
      contextResponseHash: nearby.responseHash,
      contextObservedAt: nearby.observedAt,
      contextRadiusM: OVERPASS_RADIUS_M,
      contextUsagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html" as const,
      fabricStatus: fabric.profile.coverage,
      fabricDiagnostic: fabricPayload.ok && fabric.profile.coverage === "unavailable"
        ? { ...fabricPayload.diagnostic, failureCode: "invalid_response" as const } : fabricPayload.diagnostic,
      fabricResponseId: fabric.responseHash ? `overpass_fabric_${fabric.responseHash.slice(0, 24)}` : null,
      fabricResponseHash: fabric.responseHash,
      fabricObservedAt: fabric.observedAt,
      fabricRadiusM: URBAN_FABRIC_RADIUS_M,
      sourceOfferPath: "/prototype/point-to-object/source-offer" as const,
      officialStatus: "open_context_not_official" as const,
      runtimeNetworkUsed: true as const,
      persistenceUsed: false as const,
      wikidataStatus: wikidata.status,
      wikidataReason: wikidata.reason
    },
    nearbyContext: nearby.items,
    geoContext: fabric.profile,
    evidence: [
      ...evidenceFor(place, point, matchMethod, coordinateAssociation, place.geometryHash, selectedTags, selectedMetrics),
      ...evidenceForNearby(nearby.items),
      ...evidenceForGeoContext(fabric.profile),
      ...(wikidata.linkedEntity ? evidenceForWikidata(wikidata.linkedEntity) : [])
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
          ? "The exact OpenStreetMap identity and available geometry are reused from a bounded server-held Overpass snapshot or an exact source lookup; the supplied point is a navigation anchor and may not lie inside returned geometry."
          : "Nominatim reverse geocoding returns the closest suitable indexed OSM object and does not prove that the analysis point lies inside its geometry.",
      trustedIdentity
        ? "The expected OpenStreetMap node, way or relation identity is checked server-side and spatially bound to the selected anchor; the request fails closed if the exact identity cannot be resolved consistently."
        : "A rendered vector-tile feature identity is not treated as authoritative; context is resolved server-side from the map-selected analysis point.",
      "OpenStreetMap is open community context and may be incomplete, stale or differently classified from authoritative registers.",
      "Raw source geometry is excluded from the AI model; an intact exact-object polygon may be returned separately to the map UI within its display budget.",
      nearby.status === "available"
        ? `Nearby context is a bounded OpenStreetMap/Overpass sample within ${OVERPASS_RADIUS_M} m; it is not a complete inventory and absent records do not prove real-world absence.`
        : "Nearby OpenStreetMap context was unavailable for this request; the exact selected source object remains usable, but no inference may be made from the empty nearby list.",
      "The public Nominatim endpoint is suitable only for a moderate low-traffic Preview; its in-process throttle is not a distributed production quota.",
      "The public Overpass endpoint is a cached, bounded Preview dependency; it is not a production SLA and failures degrade to an explicitly empty nearby context.",
      wikidata.status === "available"
        ? "Wikidata facts describe a conservatively linked community entity and remain separate from the selected OSM footprint; they do not certify building, parcel, ownership, planning or valuation identity."
        : wikidata.status === "not_requested_no_qid"
          ? "The selected OSM record carried no exact Wikidata QID, so no Wikidata request or enrichment was attempted."
          : "Optional Wikidata enrichment was unavailable or failed conservative identity checks; the separately sourced OSM evidence remains usable.",
      "The AI layer may summarize and question this pack but cannot replace official or client validation."
    ],
    caveat: LIVE_POINT_CAVEAT
  };
  // The pack retains fixed failure codes, never variable transport timings.
  // This keeps identical source evidence comparable without exempting any
  // part of the pack from its normal semantic and lease-integrity checks.
  const evidencePackHash = semanticHash(core);
  return {
    evidencePackId: `p2o_live_evidence_${evidencePackHash.slice(0, 24)}`,
    evidencePackHash,
    displayGeometry,
    ...core
  };
}
