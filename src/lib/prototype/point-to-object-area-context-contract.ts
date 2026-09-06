import { calculatePolygonMeasurements, validatePolygonVertices } from "../polygon-aoi";
import { semanticHash } from "../point-to-object/hash";
import {
  isPointObjectLocale,
  isPointObjectMarketKey,
  pointObjectMarket,
  type PointObjectLocale,
  type PointObjectMarketKey
} from "./point-to-object-markets";

export const POINT_OBJECT_AREA_CONTEXT_CAVEAT =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion." as const;

export const POINT_OBJECT_AREA_CONTEXT_GROUPS = [
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

export type PointObjectAreaContextGroup = (typeof POINT_OBJECT_AREA_CONTEXT_GROUPS)[number];
export type PointObjectAreaPosition = [longitude: number, latitude: number];

export type PointObjectAreaContextRequest = {
  marketKey: PointObjectMarketKey;
  locale: PointObjectLocale;
  aoiCoordinates: [PointObjectAreaPosition[]];
};

export type PointObjectAreaContextFeature = {
  sourceFeatureId: `${"node" | "way" | "relation"}/${string}`;
  longitude: number;
  latitude: number;
  label: string;
  group: PointObjectAreaContextGroup;
  mappedBuildingLevels: number | null;
  observedTags: Record<string, string>;
  inclusionMethod: "returned_center_inside_aoi";
};

export type PointObjectAreaContextResult = {
  protocol: "POINT_TO_OBJECT_001_AREA_CONTEXT_V1";
  mode: "results" | "empty";
  request: PointObjectAreaContextRequest;
  area: {
    areaSqM: number;
    perimeterM: number;
    centroid: { longitude: number; latitude: number };
  };
  features: PointObjectAreaContextFeature[];
  summary: {
    sampleSize: number;
    namedFeatureCount: number;
    mappedBuildingCount: number;
    mappedLevelsKnownCount: number;
    medianMappedLevels: number | null;
    nearestTransitM: number | null;
    nearestMajorRoadM: number | null;
    groups: Array<{ group: PointObjectAreaContextGroup; count: number; sharePct: number }>;
  };
  coverage: {
    kind: "bounded_open_map_polygon_sample";
    inclusionMethod: "returned_center_inside_aoi";
    geometryCoverage: "centroid_proxy_not_complete_intersection";
    upstreamElementCount: number;
    normalizedInsideCount: number;
    returnedFeatureCount: number;
    upstreamQueryLimit: number;
    featureReturnLimit: number;
    capReached: boolean;
    completeInventory: false;
  };
  source: {
    name: "OpenStreetMap";
    service: "Overpass API";
    sourceResponseHash: string;
    observedAt: string | null;
    acquiredAt: string;
    licenceId: "ODbL-1.0";
    attribution: "© OpenStreetMap contributors";
    licenceUrl: "https://www.openstreetmap.org/copyright";
    officialStatus: "open_context_not_official";
    runtimeNetworkUsed: true;
    persistenceUsed: false;
  };
  limitations: readonly string[];
  caveat: typeof POINT_OBJECT_AREA_CONTEXT_CAVEAT;
};

export const POINT_OBJECT_AREA_UPSTREAM_LIMIT = 300;
export const POINT_OBJECT_AREA_FEATURE_LIMIT = 80;
export const POINT_OBJECT_AREA_MAX_SQ_M = 1_000_000;
export const POINT_OBJECT_AREA_MAX_VERTICES = 25;
// Overpass maxsize is an execution-memory budget, not an HTTP response-size cap.
// Keep enough bounded working memory for the union query while the server wrapper
// independently limits the response body to 512 KiB.
export const POINT_OBJECT_AREA_UPSTREAM_MEMORY_MAX_BYTES = 32 * 1024 * 1024;

export type PointObjectAreaContextPayloadErrorCode =
  | "OVERPASS_RUNTIME_TIMEOUT"
  | "OVERPASS_RUNTIME_FAILURE"
  | "OVERPASS_RESPONSE_INVALID";

export class PointObjectAreaContextPayloadError extends Error {
  readonly code: PointObjectAreaContextPayloadErrorCode;

  constructor(code: PointObjectAreaContextPayloadErrorCode, message: string) {
    super(message);
    this.name = "PointObjectAreaContextPayloadError";
    this.code = code;
  }
}

type ParsedAreaContextRequest =
  | { ok: true; value: PointObjectAreaContextRequest }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength = 160): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function finitePosition(value: unknown): PointObjectAreaPosition | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [longitude, latitude] = value;
  return typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180 &&
    typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    ? [longitude, latitude]
    : null;
}

function samePosition(left: PointObjectAreaPosition, right: PointObjectAreaPosition): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

export function parsePointObjectAreaContextRequest(value: unknown): ParsedAreaContextRequest {
  if (!isRecord(value)) return { ok: false, error: "A bounded polygon request is required." };
  if (Object.keys(value).some((key) => !["marketKey", "locale", "aoiCoordinates"].includes(key))) {
    return { ok: false, error: "The polygon request contains unsupported fields." };
  }
  if (!isPointObjectMarketKey(value.marketKey) || !isPointObjectLocale(value.locale)) {
    return { ok: false, error: "Choose a supported market and locale." };
  }
  if (!Array.isArray(value.aoiCoordinates) || value.aoiCoordinates.length !== 1 || !Array.isArray(value.aoiCoordinates[0])) {
    return { ok: false, error: "Exactly one exterior Polygon ring is required." };
  }
  const ring = value.aoiCoordinates[0].map(finitePosition);
  if (ring.some((position) => position === null)) return { ok: false, error: "Polygon coordinates must be finite WGS84 positions." };
  const coordinates = ring as PointObjectAreaPosition[];
  if (coordinates.length < 4 || coordinates.length > POINT_OBJECT_AREA_MAX_VERTICES + 1 || !samePosition(coordinates[0], coordinates.at(-1)!)) {
    return { ok: false, error: "The exterior ring must be closed and contain 3 to 25 vertices." };
  }
  const openRing = coordinates.slice(0, -1);
  const market = pointObjectMarket(value.marketKey);
  const [[west, south], [east, north]] = market.bounds;
  if (openRing.some(([longitude, latitude]) => longitude < west || longitude > east || latitude < south || latitude > north)) {
    return { ok: false, error: "The polygon must stay inside the selected market." };
  }
  const validation = validatePolygonVertices(openRing);
  if (!validation.valid || !validation.measurements || validation.measurements.areaSqM > POINT_OBJECT_AREA_MAX_SQ_M) {
    return { ok: false, error: "The polygon must be valid, non-self-intersecting and no larger than 1 sq km." };
  }
  return {
    ok: true,
    value: { marketKey: value.marketKey, locale: value.locale, aoiCoordinates: [coordinates] }
  };
}

export function buildPointObjectAreaContextOverpassQuery(request: PointObjectAreaContextRequest): string {
  const polygon = request.aoiCoordinates[0]
    .slice(0, -1)
    .map(([longitude, latitude]) => `${latitude.toFixed(6)} ${longitude.toFixed(6)}`)
    .join(" ");
  const poly = `(poly:"${polygon}")`;
  return [
    `[out:json][timeout:6][maxsize:${POINT_OBJECT_AREA_UPSTREAM_MEMORY_MAX_BYTES}];`,
    "(",
    `nwr${poly}["building"];`,
    `nwr${poly}["landuse"~"^(residential|commercial|retail|industrial|construction|brownfield|recreation_ground|forest)$"];`,
    `nwr${poly}["office"];`,
    `nwr${poly}["shop"];`,
    `nwr${poly}["tourism"];`,
    `nwr${poly}["amenity"];`,
    `nwr${poly}["leisure"];`,
    `nwr${poly}["natural"~"^(wood|water|grassland|scrub)$"];`,
    `nwr${poly}["public_transport"];`,
    `nwr${poly}["railway"~"^(station|halt|tram_stop|subway_entrance)$"];`,
    `node${poly}["highway"="bus_stop"];`,
    `way${poly}["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"];`,
    ");",
    `out tags center ${POINT_OBJECT_AREA_UPSTREAM_LIMIT + 1};`
  ].join("\n");
}

function validatedPayloadElements(payload: unknown): unknown[] {
  if (!isRecord(payload) || !Array.isArray(payload.elements)) {
    throw new PointObjectAreaContextPayloadError(
      "OVERPASS_RESPONSE_INVALID",
      "The open-map area lookup returned an invalid payload."
    );
  }
  if (Object.hasOwn(payload, "remark")) {
    const remark = cleanText(payload.remark, 400);
    if (!remark) {
      throw new PointObjectAreaContextPayloadError(
        "OVERPASS_RESPONSE_INVALID",
        "The open-map area lookup returned an invalid payload."
      );
    }
    throw new PointObjectAreaContextPayloadError(
      /tim(?:e|ed)[ -]?out|timeout/i.test(remark) ? "OVERPASS_RUNTIME_TIMEOUT" : "OVERPASS_RUNTIME_FAILURE",
      "The open-map area lookup reported an upstream runtime failure."
    );
  }
  return payload.elements;
}

export function assertUsablePointObjectAreaContextPayload(payload: unknown): void {
  validatedPayloadElements(payload);
}

const TAG_KEYS = new Set([
  "name", "name:en", "name:ru", "building", "building:levels", "office", "shop", "amenity",
  "tourism", "landuse", "leisure", "natural", "public_transport", "railway", "highway"
]);

function safeTags(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, raw]) => {
    if (!TAG_KEYS.has(key)) return [];
    const text = cleanText(raw, 120);
    return text ? [[key, text] as const] : [];
  }));
}

function sourceType(value: unknown): "node" | "way" | "relation" | null {
  return value === "node" || value === "way" || value === "relation" ? value : null;
}

function sourceId(value: unknown): string | null {
  const candidate = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : typeof value === "string" ? value.trim() : "";
  return /^(?!0+$)\d{1,20}$/.test(candidate) ? candidate : null;
}

function featurePosition(element: Record<string, unknown>): PointObjectAreaPosition | null {
  const source = isRecord(element.center) ? element.center : element;
  return finitePosition([source.lon, source.lat]);
}

function pointInsideRing([x, y]: PointObjectAreaPosition, ring: PointObjectAreaPosition[]): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const current = ring[index];
    const prior = ring[previous];
    const crosses = (current[1] > y) !== (prior[1] > y) &&
      x < ((prior[0] - current[0]) * (y - current[1])) / ((prior[1] - current[1]) || Number.EPSILON) + current[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

function mappedLevels(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,3}(?:\.\d)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 200 ? parsed : null;
}

function contextGroup(tags: Record<string, string>): PointObjectAreaContextGroup | null {
  const building = tags.building?.toLowerCase();
  const landuse = tags.landuse?.toLowerCase();
  const amenity = tags.amenity?.toLowerCase();
  const tourism = tags.tourism?.toLowerCase();
  if (landuse === "industrial" || ["industrial", "warehouse", "manufacture", "storage_tank"].includes(building ?? "")) return "industrial";
  if (["construction", "brownfield"].includes(landuse ?? "") || building === "construction") return "construction";
  if (["school", "kindergarten", "college", "university"].includes(amenity ?? "")) return "education";
  if (["hospital", "clinic", "doctors", "dentist", "pharmacy"].includes(amenity ?? "")) return "healthcare";
  if (["marketplace", "restaurant", "cafe", "fast_food", "food_court"].includes(amenity ?? "")) return "retail_daily_needs";
  if ([
    "library", "community_centre", "arts_centre", "theatre", "cinema", "place_of_worship", "townhall",
    "courthouse", "police", "fire_station", "post_office", "social_facility", "childcare"
  ].includes(amenity ?? "")) return "civic_culture";
  if ([
    "hotel", "guest_house", "hostel", "motel", "resort", "apartment", "chalet", "alpine_hut",
    "wilderness_hut", "camp_site", "caravan_site", "holiday_village"
  ].includes(tourism ?? "") || ["hotel", "guest_house", "hostel", "resort"].includes(building ?? "")) return "hospitality";
  if (["museum", "gallery"].includes(tourism ?? "") || ["civic", "government", "public", "museum"].includes(building ?? "")) return "civic_culture";
  if (tags.shop || landuse === "retail" || building === "retail") return "retail_daily_needs";
  if (tags.office || landuse === "commercial" || ["commercial", "office"].includes(building ?? "")) return "commercial";
  if (["school", "kindergarten", "college", "university"].includes(building ?? "")) return "education";
  if (["hospital", "clinic", "healthcare"].includes(building ?? "")) return "healthcare";
  if (["residential", "apartments", "house", "detached", "terrace", "semidetached_house", "dormitory"].includes(building ?? "") || landuse === "residential") return "residential";
  if (tags.public_transport || tags.railway || tags.highway === "bus_stop") return "transport";
  if (["motorway", "trunk", "primary", "secondary", "tertiary"].includes(tags.highway ?? "")) return "access";
  if (tags.leisure || tags.natural || ["recreation_ground", "forest"].includes(landuse ?? "")) return "open_space";
  return building ? "other_built" : null;
}

function labelFor(tags: Record<string, string>, group: PointObjectAreaContextGroup, locale: PointObjectLocale): string {
  const name = tags[`name:${locale}`] ?? tags.name ?? tags["name:en"];
  if (name) return name;
  const fallback: Record<PointObjectAreaContextGroup, { en: string; ru: string }> = {
    residential: { en: "Mapped residential object", ru: "Жилой объект на открытой карте" },
    commercial: { en: "Mapped commercial object", ru: "Коммерческий объект на открытой карте" },
    hospitality: { en: "Mapped hospitality object", ru: "Гостиничный объект на открытой карте" },
    retail_daily_needs: { en: "Mapped retail or service object", ru: "Торговый или сервисный объект на открытой карте" },
    education: { en: "Mapped education object", ru: "Образовательный объект на открытой карте" },
    healthcare: { en: "Mapped healthcare object", ru: "Медицинский объект на открытой карте" },
    civic_culture: { en: "Mapped civic object", ru: "Общественный объект на открытой карте" },
    transport: { en: "Mapped transport object", ru: "Транспортный объект на открытой карте" },
    access: { en: "Mapped major road", ru: "Основная дорога на открытой карте" },
    open_space: { en: "Mapped open-space object", ru: "Открытое пространство на карте" },
    industrial: { en: "Mapped industrial object", ru: "Промышленный объект на открытой карте" },
    construction: { en: "Mapped construction object", ru: "Строящийся объект на открытой карте" },
    other_built: { en: "Mapped building", ru: "Здание на открытой карте" }
  };
  return fallback[group][locale];
}

function distanceM(left: PointObjectAreaPosition, right: PointObjectAreaPosition): number {
  const latitude = (left[1] + right[1]) / 2 * Math.PI / 180;
  const x = (right[0] - left[0]) * 111_320 * Math.cos(latitude);
  const y = (right[1] - left[1]) * 110_540;
  return Math.round(Math.sqrt(x * x + y * y));
}

export function normalizePointObjectAreaContext(
  payload: unknown,
  request: PointObjectAreaContextRequest,
  acquiredAt = new Date().toISOString()
): PointObjectAreaContextResult {
  const openRing = request.aoiCoordinates[0].slice(0, -1);
  const measurements = calculatePolygonMeasurements(openRing);
  const centroid: PointObjectAreaPosition = [measurements.centroid.longitude, measurements.centroid.latitude];
  const elements = validatedPayloadElements(payload);
  const byIdentity = new Map<string, PointObjectAreaContextFeature>();
  for (const raw of elements.slice(0, POINT_OBJECT_AREA_UPSTREAM_LIMIT + 1)) {
    if (!isRecord(raw)) continue;
    const type = sourceType(raw.type);
    const id = sourceId(raw.id);
    const position = featurePosition(raw);
    const tags = safeTags(raw.tags);
    const group = contextGroup(tags);
    if (!type || !id || !position || !group || !pointInsideRing(position, openRing)) continue;
    const sourceFeatureId = `${type}/${id}` as const;
    byIdentity.set(sourceFeatureId, {
      sourceFeatureId,
      longitude: position[0],
      latitude: position[1],
      label: labelFor(tags, group, request.locale),
      group,
      mappedBuildingLevels: mappedLevels(tags["building:levels"]),
      observedTags: tags,
      inclusionMethod: "returned_center_inside_aoi"
    });
  }
  const allFeatures = [...byIdentity.values()].sort((left, right) => left.sourceFeatureId.localeCompare(right.sourceFeatureId));
  const features = allFeatures.slice(0, POINT_OBJECT_AREA_FEATURE_LIMIT);
  const counts = new Map<PointObjectAreaContextGroup, number>();
  for (const feature of allFeatures) counts.set(feature.group, (counts.get(feature.group) ?? 0) + 1);
  const groups = POINT_OBJECT_AREA_CONTEXT_GROUPS.flatMap((group) => {
    const count = counts.get(group) ?? 0;
    return count === 0 ? [] : [{ group, count, sharePct: Number((count / Math.max(allFeatures.length, 1) * 100).toFixed(1)) }];
  }).sort((left, right) => right.count - left.count || left.group.localeCompare(right.group));
  const levels = allFeatures.flatMap((feature) => feature.mappedBuildingLevels === null ? [] : [feature.mappedBuildingLevels]).sort((left, right) => left - right);
  const middle = Math.floor(levels.length / 2);
  const medianMappedLevels = levels.length === 0 ? null : levels.length % 2 === 1 ? levels[middle] : Number(((levels[middle - 1] + levels[middle]) / 2).toFixed(1));
  const nearest = (group: PointObjectAreaContextGroup) => {
    const distances = allFeatures.filter((feature) => feature.group === group).map((feature) => distanceM(centroid, [feature.longitude, feature.latitude]));
    return distances.length ? Math.min(...distances) : null;
  };
  const observedValue = isRecord(payload) && isRecord(payload.osm3s) ? cleanText(payload.osm3s.timestamp_osm_base, 40) : null;
  const observedTimestamp = observedValue === null ? Number.NaN : Date.parse(observedValue);
  const observedAt = Number.isFinite(observedTimestamp) ? new Date(observedTimestamp).toISOString() : null;
  const capReached = elements.length > POINT_OBJECT_AREA_UPSTREAM_LIMIT;
  const sourceResponseHash = semanticHash({ observedAt, upstreamElementCount: elements.length, allFeatures });
  return {
    protocol: "POINT_TO_OBJECT_001_AREA_CONTEXT_V1",
    mode: allFeatures.length ? "results" : "empty",
    request,
    area: {
      areaSqM: Math.round(measurements.areaSqM),
      perimeterM: Math.round(measurements.perimeterM),
      centroid: { longitude: centroid[0], latitude: centroid[1] }
    },
    features,
    summary: {
      sampleSize: allFeatures.length,
      namedFeatureCount: allFeatures.filter((feature) => typeof feature.observedTags.name === "string" || typeof feature.observedTags[`name:${request.locale}`] === "string").length,
      mappedBuildingCount: allFeatures.filter((feature) => typeof feature.observedTags.building === "string").length,
      mappedLevelsKnownCount: levels.length,
      medianMappedLevels,
      nearestTransitM: nearest("transport"),
      nearestMajorRoadM: nearest("access"),
      groups
    },
    coverage: {
      kind: "bounded_open_map_polygon_sample",
      inclusionMethod: "returned_center_inside_aoi",
      geometryCoverage: "centroid_proxy_not_complete_intersection",
      upstreamElementCount: elements.length,
      normalizedInsideCount: allFeatures.length,
      returnedFeatureCount: features.length,
      upstreamQueryLimit: POINT_OBJECT_AREA_UPSTREAM_LIMIT,
      featureReturnLimit: POINT_OBJECT_AREA_FEATURE_LIMIT,
      capReached,
      completeInventory: false
    },
    source: {
      name: "OpenStreetMap",
      service: "Overpass API",
      sourceResponseHash,
      observedAt,
      acquiredAt,
      licenceId: "ODbL-1.0",
      attribution: "© OpenStreetMap contributors",
      licenceUrl: "https://www.openstreetmap.org/copyright",
      officialStatus: "open_context_not_official",
      runtimeNetworkUsed: true,
      persistenceUsed: false
    },
    limitations: [
      "This is a bounded OpenStreetMap sample, not a complete inventory; missing features do not prove real-world absence.",
      "Inclusion uses each returned node or derived feature centre inside the AOI, so large or crossing geometries may be omitted.",
      "Mapped uses, names and levels may be incomplete, stale, generalized or incorrect; no ownership, zoning, valuation or development right is inferred."
    ],
    caveat: POINT_OBJECT_AREA_CONTEXT_CAVEAT
  };
}
