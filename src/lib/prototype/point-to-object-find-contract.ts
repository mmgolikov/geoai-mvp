import {
  isPointObjectLocale,
  isPointObjectMarketKey,
  pointObjectMarket,
  type PointObjectLocale,
  type PointObjectMarketKey
} from "./point-to-object-markets";

export const POINT_OBJECT_FIND_CAVEAT =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion." as const;

export const POINT_OBJECT_FIND_GROUPS = [
  "residential",
  "commercial_office",
  "hospitality",
  "retail",
  "education",
  "healthcare",
  "civic_culture",
  "industrial_logistics",
  "construction"
] as const;

export type PointObjectFindGroup = (typeof POINT_OBJECT_FIND_GROUPS)[number];
export type PointObjectFindBounds = readonly [
  west: number,
  south: number,
  east: number,
  north: number
];

export type PointObjectFindRequest = {
  marketKey: PointObjectMarketKey;
  locale: PointObjectLocale;
  bounds: PointObjectFindBounds;
  group: PointObjectFindGroup;
  mappedMinimumLevels: number | null;
  mappedMaximumLevels: number | null;
  limit: number;
};

export type PointObjectFindCandidate = {
  sourceFeatureId: `${"node" | "way" | "relation"}/${string}`;
  sourceElementType: "node" | "way" | "relation";
  sourceElementId: string;
  label: string;
  name: string | null;
  longitude: number;
  latitude: number;
  group: PointObjectFindGroup;
  matchedTag: { key: string; value: string };
  mappedBuildingLevels: number | null;
  observedTags: Record<string, string>;
  evidenceClass: "observed_in_open_map_source";
};

export type PointObjectFindResult = {
  protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1";
  mode: "results" | "empty";
  criteria: PointObjectFindRequest;
  candidates: PointObjectFindCandidate[];
  ordering: "source_identity_ascending_not_ranked";
  coverage: {
    kind: "bounded_open_map_sample";
    approximateAreaSqKm: number;
    upstreamElementCount: number;
    normalizedCandidateCount: number;
    returnedCandidateCount: number;
    upstreamQueryLimit: number;
    capReached: boolean;
    completeInventory: false;
    mappedLevelsPolicy: "not_requested" | "strict_explicit_building_levels_tag_only";
  };
  source: {
    name: "OpenStreetMap";
    service: "Overpass API";
    sourceResponseHash: string;
    observedAt: string | null;
    acquiredAt: string;
    freshness: "runtime_response_feature_time_unavailable";
    licenceId: "ODbL-1.0";
    attribution: "© OpenStreetMap contributors";
    licenceUrl: "https://www.openstreetmap.org/copyright";
    usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html";
    officialStatus: "open_context_not_official";
    runtimeNetworkUsed: true;
    persistenceUsed: false;
  };
  limitations: readonly string[];
  caveat: typeof POINT_OBJECT_FIND_CAVEAT;
};

export const POINT_OBJECT_FIND_MAX_RESULTS = 20;
export const POINT_OBJECT_FIND_UPSTREAM_LIMIT = 80;
export const POINT_OBJECT_FIND_MAX_AREA_SQ_KM = 36;
export const POINT_OBJECT_FIND_MAX_SPAN_KM = 8;
export const POINT_OBJECT_FIND_OVERPASS_WORKING_MEMORY_BYTES = 32 * 1024 * 1024;

export type PointObjectFindPayloadErrorCode = "OVERPASS_RUNTIME_FAILURE" | "OVERPASS_PAYLOAD_INVALID";

export class PointObjectFindPayloadError extends Error {
  constructor(public readonly code: PointObjectFindPayloadErrorCode, message: string) {
    super(message);
    this.name = "PointObjectFindPayloadError";
  }
}

const GROUP_PREDICATES: Record<PointObjectFindGroup, readonly string[]> = {
  residential: [
    `["building"~"^(apartments|residential|house|detached|terrace|semidetached_house|dormitory)$"]`
  ],
  commercial_office: [
    `["building"~"^(commercial|office)$"]`,
    `["office"]`
  ],
  hospitality: [
    `["building"="hotel"]`,
    `["tourism"~"^(hotel|hostel|guest_house|motel|apartment)$"]`
  ],
  retail: [
    `["building"="retail"]`,
    `["shop"]`,
    `["amenity"="marketplace"]`
  ],
  education: [
    `["building"~"^(school|university|college|kindergarten)$"]`,
    `["amenity"~"^(school|university|college|kindergarten)$"]`
  ],
  healthcare: [
    `["building"~"^(hospital|clinic)$"]`,
    `["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]`
  ],
  civic_culture: [
    `["building"~"^(civic|government|public|museum)$"]`,
    `["amenity"~"^(townhall|courthouse|library|community_centre|arts_centre|theatre|cinema)$"]`,
    `["tourism"~"^(museum|gallery)$"]`
  ],
  industrial_logistics: [
    `["building"~"^(industrial|warehouse)$"]`,
    `["landuse"="industrial"]`
  ],
  construction: [
    `["building"="construction"]`,
    `["landuse"~"^(construction|brownfield)$"]`
  ]
};

const OBSERVED_TAG_KEYS = new Set([
  "name",
  "name:en",
  "name:ru",
  "building",
  "building:levels",
  "office",
  "shop",
  "amenity",
  "tourism",
  "landuse",
  "addr:district",
  "addr:suburb",
  "addr:city"
]);

type ParsedFindRequest =
  | { ok: true; value: PointObjectFindRequest }
  | { ok: false; error: string };

type OsmElementType = PointObjectFindCandidate["sourceElementType"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFindGroup(value: unknown): value is PointObjectFindGroup {
  return typeof value === "string" && POINT_OBJECT_FIND_GROUPS.includes(value as PointObjectFindGroup);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

function positiveIdentifier(value: unknown): string | null {
  const candidate = typeof value === "number" && Number.isSafeInteger(value)
    ? String(value)
    : typeof value === "string" ? value.trim() : "";
  return /^(?!0+$)\d{1,20}$/.test(candidate) ? candidate : null;
}

function elementType(value: unknown): OsmElementType | null {
  return value === "node" || value === "way" || value === "relation" ? value : null;
}

function mappedLevels(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,3}$/.test(value.trim())) return null;
  const levels = Number(value);
  return Number.isInteger(levels) && levels >= 1 && levels <= 300 ? levels : null;
}

function boundsMetrics(bounds: PointObjectFindBounds): {
  widthKm: number;
  heightKm: number;
  areaSqKm: number;
} {
  const [west, south, east, north] = bounds;
  const latitudeRadians = ((south + north) / 2) * Math.PI / 180;
  const widthKm = (east - west) * 111.32 * Math.max(0.01, Math.cos(latitudeRadians));
  const heightKm = (north - south) * 110.574;
  return { widthKm, heightKm, areaSqKm: widthKm * heightKm };
}

export function parsePointObjectFindRequest(value: unknown): ParsedFindRequest {
  if (!isRecord(value)) return { ok: false, error: "A bounded Find request is required." };
  const allowed = new Set(["marketKey", "locale", "bounds", "group", "mappedMinimumLevels", "mappedMaximumLevels", "limit"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return { ok: false, error: "The Find request contains unsupported fields." };
  }
  if (!isPointObjectMarketKey(value.marketKey) || !isPointObjectLocale(value.locale) || !isFindGroup(value.group)) {
    return { ok: false, error: "Choose a supported market, locale and open-map object group." };
  }
  if (!Array.isArray(value.bounds) || value.bounds.length !== 4) {
    return { ok: false, error: "A visible map bounds tuple is required." };
  }
  const coordinates = value.bounds.map(finiteNumber);
  if (coordinates.some((coordinate) => coordinate === null)) {
    return { ok: false, error: "Visible map bounds must contain finite coordinates." };
  }
  const [west, south, east, north] = coordinates as [number, number, number, number];
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
    return { ok: false, error: "Visible map bounds must be a valid WGS84 rectangle." };
  }
  const market = pointObjectMarket(value.marketKey);
  const [[marketWest, marketSouth], [marketEast, marketNorth]] = market.bounds;
  if (west < marketWest || east > marketEast || south < marketSouth || north > marketNorth) {
    return { ok: false, error: "Visible map bounds must stay inside the selected market." };
  }
  const metrics = boundsMetrics([west, south, east, north]);
  if (
    metrics.widthKm > POINT_OBJECT_FIND_MAX_SPAN_KM ||
    metrics.heightKm > POINT_OBJECT_FIND_MAX_SPAN_KM ||
    metrics.areaSqKm > POINT_OBJECT_FIND_MAX_AREA_SQ_KM
  ) {
    return { ok: false, error: "Zoom in: the visible Find area is too large for a bounded open-map request." };
  }
  const requestedLevels = value.mappedMinimumLevels ?? null;
  if (
    requestedLevels !== null &&
    (typeof requestedLevels !== "number" || !Number.isInteger(requestedLevels) || requestedLevels < 1 || requestedLevels > 100)
  ) {
    return { ok: false, error: "Mapped minimum levels must be an integer from 1 to 100." };
  }
  const requestedMaximumLevels = value.mappedMaximumLevels ?? null;
  if (
    requestedMaximumLevels !== null &&
    (typeof requestedMaximumLevels !== "number" || !Number.isInteger(requestedMaximumLevels) || requestedMaximumLevels < 1 || requestedMaximumLevels > 100)
  ) {
    return { ok: false, error: "Mapped maximum levels must be an integer from 1 to 100." };
  }
  if (requestedLevels !== null && requestedMaximumLevels !== null && requestedLevels > requestedMaximumLevels) {
    return { ok: false, error: "Mapped minimum levels cannot exceed mapped maximum levels." };
  }
  const requestedLimit = value.limit ?? 12;
  if (typeof requestedLimit !== "number" || !Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > POINT_OBJECT_FIND_MAX_RESULTS) {
    return { ok: false, error: `Result limit must be an integer from 1 to ${POINT_OBJECT_FIND_MAX_RESULTS}.` };
  }
  return {
    ok: true,
    value: {
      marketKey: value.marketKey,
      locale: value.locale,
      bounds: [west, south, east, north],
      group: value.group,
      mappedMinimumLevels: requestedLevels,
      mappedMaximumLevels: requestedMaximumLevels,
      limit: requestedLimit
    }
  };
}

export function pointObjectFindApproximateAreaSqKm(bounds: PointObjectFindBounds): number {
  return Number(boundsMetrics(bounds).areaSqKm.toFixed(2));
}

export function buildPointObjectFindOverpassQuery(request: PointObjectFindRequest): string {
  const [west, south, east, north] = request.bounds;
  const bbox = `(${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)})`;
  const explicitLevelsOnly = request.mappedMinimumLevels === null && request.mappedMaximumLevels === null ? "" : `["building:levels"]`;
  const selectors = GROUP_PREDICATES[request.group]
    .map((predicate) => `nwr${predicate}${explicitLevelsOnly}${bbox};`);
  return [
    `[out:json][timeout:5][maxsize:${POINT_OBJECT_FIND_OVERPASS_WORKING_MEMORY_BYTES}];`,
    "(",
    ...selectors,
    ");",
    `out tags center ${POINT_OBJECT_FIND_UPSTREAM_LIMIT + 1};`
  ].join("\n");
}

function validatedPointObjectFindElements(payload: unknown): unknown[] {
  if (!isRecord(payload) || !Array.isArray(payload.elements)) {
    throw new PointObjectFindPayloadError("OVERPASS_PAYLOAD_INVALID", "Overpass returned an invalid Find payload.");
  }
  if (Object.hasOwn(payload, "remark")) {
    const remark = cleanText(payload.remark, 500);
    if (!remark) throw new PointObjectFindPayloadError("OVERPASS_PAYLOAD_INVALID", "Overpass returned an invalid Find remark.");
    throw new PointObjectFindPayloadError("OVERPASS_RUNTIME_FAILURE", "Overpass could not complete the bounded Find query.");
  }
  return payload.elements;
}

export function assertUsablePointObjectFindPayload(payload: unknown): void {
  validatedPointObjectFindElements(payload);
}

export function pointObjectFindOverpassRuntimeError(payload: unknown): boolean {
  try {
    validatedPointObjectFindElements(payload);
    return false;
  } catch (error) {
    return error instanceof PointObjectFindPayloadError && error.code === "OVERPASS_RUNTIME_FAILURE";
  }
}

function safeTags(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value).flatMap(([key, raw]) => {
    if (!OBSERVED_TAG_KEYS.has(key)) return [];
    const text = cleanText(raw, 120);
    return text ? [[key, text] as const] : [];
  });
  return Object.fromEntries(entries);
}

function featurePoint(element: Record<string, unknown>): [number, number] | null {
  const source = isRecord(element.center) ? element.center : element;
  const longitude = finiteNumber(source.lon);
  const latitude = finiteNumber(source.lat);
  if (longitude === null || latitude === null || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return null;
  return [longitude, latitude];
}

function matchingTag(group: PointObjectFindGroup, tags: Record<string, string>): { key: string; value: string } | null {
  const candidates: Record<PointObjectFindGroup, readonly [string, RegExp][]> = {
    residential: [["building", /^(apartments|residential|house|detached|terrace|semidetached_house|dormitory)$/]],
    commercial_office: [["building", /^(commercial|office)$/], ["office", /.+/]],
    hospitality: [["building", /^hotel$/], ["tourism", /^(hotel|hostel|guest_house|motel|apartment)$/]],
    retail: [["building", /^retail$/], ["shop", /.+/], ["amenity", /^marketplace$/]],
    education: [["building", /^(school|university|college|kindergarten)$/], ["amenity", /^(school|university|college|kindergarten)$/]],
    healthcare: [["building", /^(hospital|clinic)$/], ["amenity", /^(hospital|clinic|doctors|pharmacy)$/]],
    civic_culture: [["building", /^(civic|government|public|museum)$/], ["amenity", /^(townhall|courthouse|library|community_centre|arts_centre|theatre|cinema)$/], ["tourism", /^(museum|gallery)$/]],
    industrial_logistics: [["building", /^(industrial|warehouse)$/], ["landuse", /^industrial$/]],
    construction: [["building", /^construction$/], ["landuse", /^(construction|brownfield)$/]]
  };
  for (const [key, pattern] of candidates[group]) {
    const value = tags[key];
    if (value && pattern.test(value)) return { key, value };
  }
  return null;
}

function localizedFallbackLabel(group: PointObjectFindGroup, locale: PointObjectLocale): string {
  const en: Record<PointObjectFindGroup, string> = {
    residential: "Mapped residential object",
    commercial_office: "Mapped commercial or office object",
    hospitality: "Mapped hospitality object",
    retail: "Mapped retail object",
    education: "Mapped education object",
    healthcare: "Mapped healthcare object",
    civic_culture: "Mapped civic or cultural object",
    industrial_logistics: "Mapped industrial or logistics object",
    construction: "Mapped construction or brownfield object"
  };
  const ru: Record<PointObjectFindGroup, string> = {
    residential: "Жилой объект на открытой карте",
    commercial_office: "Коммерческий или офисный объект на открытой карте",
    hospitality: "Гостиничный объект на открытой карте",
    retail: "Торговый объект на открытой карте",
    education: "Образовательный объект на открытой карте",
    healthcare: "Медицинский объект на открытой карте",
    civic_culture: "Общественный или культурный объект на открытой карте",
    industrial_logistics: "Промышленный или логистический объект на открытой карте",
    construction: "Строящийся объект или brownfield на открытой карте"
  };
  return locale === "ru" ? ru[group] : en[group];
}

export function normalizePointObjectFindCandidates(
  payload: unknown,
  request: PointObjectFindRequest
): {
  candidates: PointObjectFindCandidate[];
  upstreamElementCount: number;
  normalizedCandidateCount: number;
  capReached: boolean;
  observedAt: string | null;
} {
  const elements = validatedPointObjectFindElements(payload);
  const payloadRecord = payload as Record<string, unknown>;
  const [west, south, east, north] = request.bounds;
  const byIdentity = new Map<string, PointObjectFindCandidate>();
  for (const raw of elements.slice(0, POINT_OBJECT_FIND_UPSTREAM_LIMIT + 1)) {
    if (!isRecord(raw)) continue;
    const type = elementType(raw.type);
    const id = positiveIdentifier(raw.id);
    const point = featurePoint(raw);
    const tags = safeTags(raw.tags);
    const matchedTag = matchingTag(request.group, tags);
    if (!type || !id || !point || !matchedTag) continue;
    if (point[0] < west || point[0] > east || point[1] < south || point[1] > north) continue;
    const levels = mappedLevels(tags["building:levels"]);
    if (request.mappedMinimumLevels !== null && (levels === null || levels < request.mappedMinimumLevels)) continue;
    if (request.mappedMaximumLevels !== null && (levels === null || levels > request.mappedMaximumLevels)) continue;
    const sourceFeatureId = `${type}/${id}` as const;
    const name = cleanText(tags[`name:${request.locale}`]) ?? cleanText(tags.name) ?? cleanText(tags["name:en"]);
    byIdentity.set(sourceFeatureId, {
      sourceFeatureId,
      sourceElementType: type,
      sourceElementId: id,
      label: name ?? localizedFallbackLabel(request.group, request.locale),
      name,
      longitude: point[0],
      latitude: point[1],
      group: request.group,
      matchedTag,
      mappedBuildingLevels: levels,
      observedTags: tags,
      evidenceClass: "observed_in_open_map_source"
    });
  }
  const normalized = [...byIdentity.values()].sort((left, right) => left.sourceFeatureId.localeCompare(right.sourceFeatureId));
  const observedValue = isRecord(payloadRecord.osm3s) ? cleanText(payloadRecord.osm3s.timestamp_osm_base, 40) : null;
  const observedTimestamp = observedValue === null ? Number.NaN : Date.parse(observedValue);
  return {
    candidates: normalized.slice(0, request.limit),
    upstreamElementCount: elements.length,
    normalizedCandidateCount: normalized.length,
    capReached: elements.length > POINT_OBJECT_FIND_UPSTREAM_LIMIT,
    observedAt: Number.isFinite(observedTimestamp) ? new Date(observedTimestamp).toISOString() : null
  };
}
