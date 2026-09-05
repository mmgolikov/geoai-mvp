import { createHash } from "node:crypto";

export const POINT_OBJECT_WIKIDATA_CONTRACT_VERSION = "POINT_OBJECT_WIKIDATA_ENTITY_V1" as const;
export const POINT_OBJECT_WIKIDATA_ENDPOINT = "https://www.wikidata.org/w/api.php" as const;
export const POINT_OBJECT_WIKIDATA_TIMEOUT_MS = 3_000 as const;
export const POINT_OBJECT_WIKIDATA_RESPONSE_MAX_BYTES = 256 * 1024;
export const POINT_OBJECT_WIKIDATA_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
export const POINT_OBJECT_WIKIDATA_CACHE_MAX_ENTRIES = 128;
export const POINT_OBJECT_WIKIDATA_QUEUE_MAX_ENTRIES = 16;
export const POINT_OBJECT_WIKIDATA_POLYGON_TOLERANCE_M = 20 as const;
export const POINT_OBJECT_WIKIDATA_NODE_COMPLEX_MAX_DISTANCE_M = 250 as const;
export const POINT_OBJECT_WIKIDATA_MAX_COORDINATE_PRECISION_DEGREES = 0.0001 as const;

const WIKIDATA_QID = /^Q[1-9]\d{0,15}$/;
const WIKIDATA_STATEMENT_ID = /^[A-Za-z0-9$_.:-]{1,180}$/;
const GREGORIAN_CALENDAR = "http://www.wikidata.org/entity/Q1985727";
const EARTH_GLOBE = "http://www.wikidata.org/entity/Q2";
const METRE_UNIT = "http://www.wikidata.org/entity/Q11573";

export const POINT_OBJECT_WIKIDATA_PROPERTY_IDS = [
  "P31",
  "P571",
  "P2048",
  "P1101",
  "P625",
  "P17"
] as const;

export type PointObjectWikidataPropertyId = (typeof POINT_OBJECT_WIKIDATA_PROPERTY_IDS)[number];
export type PointObjectWikidataRank = "preferred" | "normal";
export type PointObjectWikidataCountryCode = "ae" | "qa" | "sa" | "my" | "sg" | "hk" | "ru";

export type PointObjectWikidataGeometry = {
  type: "Point" | "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon";
  coordinates: unknown;
};

export type PointObjectWikidataStatementValue =
  | { kind: "entity"; entityId: string }
  | {
      kind: "time";
      time: string;
      precision: 9 | 10 | 11;
      calendarModel: typeof GREGORIAN_CALENDAR;
    }
  | {
      kind: "quantity";
      amount: string;
      numericValue: number;
      unit: "metre" | "count";
      unitEntityId: "Q11573" | null;
      lowerBound: string | null;
      upperBound: string | null;
    }
  | {
      kind: "coordinate";
      longitude: number;
      latitude: number;
      precision: number | null;
      globe: typeof EARTH_GLOBE;
    };

export type PointObjectWikidataStatementReceipt = {
  statementReceiptHash: string;
  identityReceiptHash: string;
  sourceResponseHash: string;
  sourceRevisionId: number;
  qid: string;
  propertyId: PointObjectWikidataPropertyId;
  statementId: string;
  rank: PointObjectWikidataRank;
  value: PointObjectWikidataStatementValue;
  qualifiers: [];
};

type PointObjectWikidataUnboundStatementReceipt = Omit<
  PointObjectWikidataStatementReceipt,
  "identityReceiptHash"
>;

export type PointObjectWikidataIdentityReceipt = {
  identityReceiptHash: string;
  qid: string;
  osmSourceFeatureId: string;
  osmGeometryHash: string | null;
  basis:
    | "polygon_coordinate_inside_or_boundary_tolerance"
    | "node_or_complex_coordinate_within_ceiling";
  linkedCoordinateDistanceM: number;
  polygonBoundaryToleranceM: typeof POINT_OBJECT_WIKIDATA_POLYGON_TOLERANCE_M;
  nodeOrComplexMaxDistanceM: typeof POINT_OBJECT_WIKIDATA_NODE_COMPLEX_MAX_DISTANCE_M;
  countryMatch: "matched" | "not_asserted";
  typeMatch: "compatible";
  scope: "linked_community_entity_not_certified_selected_footprint";
};

export type PointObjectWikidataSourceReceipt = {
  sourceId: "WIKIDATA-ENTITY";
  dataset: "Wikidata";
  service: "MediaWiki Action API";
  endpointHost: "www.wikidata.org";
  sourceResponseHash: string;
  sourceResponseBytes: number;
  sourceRevisionId: number;
  entityModifiedAt: string | null;
  acquiredAt: string;
  cacheExpiresAt: string;
  licenceId: "CC0-1.0";
  licenceUrl: "https://www.wikidata.org/wiki/Wikidata:Licensing";
  accessPolicyUrl: "https://www.wikidata.org/wiki/Wikidata:Data_access/en";
  usagePolicyUrl: "https://www.mediawiki.org/wiki/API:Etiquette";
  officialStatus: "community_structured_data_not_official_asset_record";
};

export type PointObjectWikidataLinkedEntity = {
  contractVersion: typeof POINT_OBJECT_WIKIDATA_CONTRACT_VERSION;
  qid: string;
  labels: { en: string | null; ru: string | null };
  source: PointObjectWikidataSourceReceipt;
  identity: PointObjectWikidataIdentityReceipt;
  statements: PointObjectWikidataStatementReceipt[];
  conflictingPropertyIds: PointObjectWikidataPropertyId[];
};

export type PointObjectWikidataResolutionReason =
  | "deadline_exhausted"
  | "request_failed"
  | "rate_limited_or_maxlag"
  | "response_too_large"
  | "response_invalid"
  | "entity_missing"
  | "coordinate_missing_or_conflicting"
  | "coordinate_precision_insufficient"
  | "polygon_coordinate_mismatch"
  | "node_or_complex_coordinate_mismatch"
  | "unsupported_geometry"
  | "country_mismatch"
  | "type_mismatch_or_unsupported"
  | "queue_full";

export type PointObjectWikidataResolution =
  | { status: "not_requested_no_qid"; linkedEntity: null; reason: null }
  | {
      status: "available";
      linkedEntity: PointObjectWikidataLinkedEntity;
      reason: null;
    }
  | {
      status: "identity_rejected" | "unavailable";
      linkedEntity: null;
      reason: PointObjectWikidataResolutionReason;
    };

export type ResolvePointObjectWikidataInput = {
  qid: string | null | undefined;
  osmSourceFeatureId: string;
  osmGeometryHash: string | null;
  osmGeometry: PointObjectWikidataGeometry | null;
  osmCentroid: readonly [longitude: number, latitude: number];
  osmFeatureClass: string;
  osmTags: Record<string, string>;
  expectedCountryCode: PointObjectWikidataCountryCode;
  deadlineAtMs?: number;
};

type WikidataEntitySnapshot = {
  qid: string;
  labels: { en: string | null; ru: string | null };
  source: PointObjectWikidataSourceReceipt;
  statements: PointObjectWikidataUnboundStatementReceipt[];
  conflictingPropertyIds: PointObjectWikidataPropertyId[];
};

type CachedSnapshot = { expiresAtMs: number; snapshot: WikidataEntitySnapshot };

export type PointObjectWikidataAdapterOptions = {
  fetchImpl?: typeof fetch;
  now?: () => number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]));
  }
  return value;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function semanticHash(value: unknown): string {
  return sha256(JSON.stringify(canonicalize(value)));
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function cleanText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

function finiteNumber(value: unknown, minimum: number, maximum: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

function entityId(value: unknown): string | null {
  const id = isRecord(value) && typeof value["numeric-id"] === "number"
    ? `Q${value["numeric-id"]}`
    : isRecord(value) ? value.id : null;
  return typeof id === "string" && WIKIDATA_QID.test(id) ? id : null;
}

function statementRank(value: unknown): PointObjectWikidataRank | null {
  return value === "preferred" || value === "normal" ? value : null;
}

function boundedDecimalString(value: unknown, minimum: number, maximum: number): { raw: string; numeric: number } | null {
  if (typeof value !== "string" || !/^[+-]?\d{1,12}(?:\.\d{1,8})?$/.test(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= minimum && numeric <= maximum ? { raw: value, numeric } : null;
}

function parseEntityValue(dataValue: unknown): PointObjectWikidataStatementValue | null {
  if (!isRecord(dataValue) || dataValue.type !== "wikibase-entityid") return null;
  const id = entityId(dataValue.value);
  return id ? { kind: "entity", entityId: id } : null;
}

function parseTimeValue(dataValue: unknown): PointObjectWikidataStatementValue | null {
  if (!isRecord(dataValue) || dataValue.type !== "time" || !isRecord(dataValue.value)) return null;
  const raw = dataValue.value;
  const time = cleanText(raw.time, 48);
  const precision = raw.precision;
  // This slice supports ordinary positive Gregorian years only. Wikibase pads
  // years to at least four digits (for example +2001), not to exactly eleven.
  const parts = time ? /^\+(\d{4})-(\d{2})-(\d{2})T00:00:00Z$/.exec(time) : null;
  const year = parts ? Number(parts[1]) : 0;
  const month = parts ? Number(parts[2]) : -1;
  const day = parts ? Number(parts[3]) : -1;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const calendarFieldsValid = precision === 9
    ? month === 0 && day === 0
    : precision === 10
      ? month >= 1 && month <= 12 && day === 0
      : precision === 11 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
  if (!parts || year < 1 || !calendarFieldsValid ||
      (precision !== 9 && precision !== 10 && precision !== 11) || raw.calendarmodel !== GREGORIAN_CALENDAR ||
      raw.before !== 0 || raw.after !== 0 || raw.timezone !== 0) return null;
  return { kind: "time", time: time as string, precision, calendarModel: GREGORIAN_CALENDAR };
}

function parseQuantityValue(
  propertyId: "P2048" | "P1101",
  dataValue: unknown
): PointObjectWikidataStatementValue | null {
  if (!isRecord(dataValue) || dataValue.type !== "quantity" || !isRecord(dataValue.value)) return null;
  const raw = dataValue.value;
  const unit = raw.unit;
  const parsed = boundedDecimalString(raw.amount, propertyId === "P2048" ? 0.1 : 1, propertyId === "P2048" ? 2_000 : 400);
  if (!parsed || (propertyId === "P2048" ? unit !== METRE_UNIT : unit !== "1") ||
      (propertyId === "P1101" && !Number.isSafeInteger(parsed.numeric))) return null;
  const lower = raw.lowerBound === undefined ? null : boundedDecimalString(raw.lowerBound, -10_000, 10_000)?.raw ?? null;
  const upper = raw.upperBound === undefined ? null : boundedDecimalString(raw.upperBound, -10_000, 10_000)?.raw ?? null;
  if ((raw.lowerBound !== undefined && lower === null) || (raw.upperBound !== undefined && upper === null)) return null;
  return {
    kind: "quantity",
    amount: parsed.raw,
    numericValue: parsed.numeric,
    unit: propertyId === "P2048" ? "metre" : "count",
    unitEntityId: propertyId === "P2048" ? "Q11573" : null,
    lowerBound: lower,
    upperBound: upper
  };
}

function parseCoordinateValue(dataValue: unknown): PointObjectWikidataStatementValue | null {
  if (!isRecord(dataValue) || dataValue.type !== "globecoordinate" || !isRecord(dataValue.value)) return null;
  const raw = dataValue.value;
  const longitude = finiteNumber(raw.longitude, -180, 180);
  const latitude = finiteNumber(raw.latitude, -90, 90);
  const precision = raw.precision === null || raw.precision === undefined
    ? null
    : finiteNumber(raw.precision, 0, 10);
  if (longitude === null || latitude === null || precision === null && raw.precision !== null && raw.precision !== undefined ||
      raw.globe !== EARTH_GLOBE) return null;
  return { kind: "coordinate", longitude, latitude, precision, globe: EARTH_GLOBE };
}

function parseStatementValue(
  propertyId: PointObjectWikidataPropertyId,
  dataValue: unknown
): PointObjectWikidataStatementValue | null {
  if (propertyId === "P31" || propertyId === "P17") return parseEntityValue(dataValue);
  if (propertyId === "P571") return parseTimeValue(dataValue);
  if (propertyId === "P2048" || propertyId === "P1101") return parseQuantityValue(propertyId, dataValue);
  return parseCoordinateValue(dataValue);
}

function parseStatement(
  value: unknown,
  propertyId: PointObjectWikidataPropertyId,
  source: Pick<PointObjectWikidataSourceReceipt, "sourceResponseHash" | "sourceRevisionId">,
  qid: string
): PointObjectWikidataUnboundStatementReceipt | null {
  if (!isRecord(value) || value.type !== "statement") return null;
  const statementId = cleanText(value.id, 180);
  const rank = statementRank(value.rank);
  const qualifiers = value.qualifiers;
  if (!statementId || !WIKIDATA_STATEMENT_ID.test(statementId) || !rank ||
      qualifiers !== undefined && (!isRecord(qualifiers) || Object.keys(qualifiers).length > 0) ||
      !isRecord(value.mainsnak) || value.mainsnak.property !== propertyId || value.mainsnak.snaktype !== "value") return null;
  const parsedValue = parseStatementValue(propertyId, value.mainsnak.datavalue);
  if (!parsedValue) return null;
  const core = {
    sourceResponseHash: source.sourceResponseHash,
    sourceRevisionId: source.sourceRevisionId,
    qid,
    propertyId,
    statementId,
    rank,
    value: parsedValue,
    qualifiers: [] as []
  };
  return deepFreeze({ statementReceiptHash: semanticHash(core), ...core });
}

function localizedLabel(value: unknown, language: "en" | "ru"): string | null {
  if (!isRecord(value) || value.language !== language) return null;
  return cleanText(value.value, 180);
}

function isoTimestamp(value: unknown): string | null {
  const candidate = cleanText(value, 48);
  if (!candidate) return null;
  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function distinctStatementValues(statements: Array<Pick<PointObjectWikidataStatementReceipt, "value">>): number {
  return new Set(statements.map((statement) => JSON.stringify(canonicalize(statement.value)))).size;
}

function normalizeEntitySnapshot(
  payload: unknown,
  qid: string,
  sourceResponseHash: string,
  sourceResponseBytes: number,
  acquiredAt: string
): WikidataEntitySnapshot | null {
  if (!isRecord(payload) || isRecord(payload.error) || !isRecord(payload.entities)) return null;
  const entity = payload.entities[qid];
  if (!isRecord(entity) || entity.id !== qid || entity.missing !== undefined || !isRecord(entity.claims)) return null;
  const sourceRevisionId = typeof entity.lastrevid === "number" && Number.isSafeInteger(entity.lastrevid) && entity.lastrevid > 0
    ? entity.lastrevid
    : null;
  if (sourceRevisionId === null) return null;
  const acquiredAtMs = Date.parse(acquiredAt);
  if (!Number.isFinite(acquiredAtMs)) return null;
  const source: PointObjectWikidataSourceReceipt = {
    sourceId: "WIKIDATA-ENTITY",
    dataset: "Wikidata",
    service: "MediaWiki Action API",
    endpointHost: "www.wikidata.org",
    sourceResponseHash,
    sourceResponseBytes,
    sourceRevisionId,
    entityModifiedAt: isoTimestamp(entity.modified),
    acquiredAt,
    cacheExpiresAt: new Date(acquiredAtMs + POINT_OBJECT_WIKIDATA_CACHE_TTL_MS).toISOString(),
    licenceId: "CC0-1.0",
    licenceUrl: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    accessPolicyUrl: "https://www.wikidata.org/wiki/Wikidata:Data_access/en",
    usagePolicyUrl: "https://www.mediawiki.org/wiki/API:Etiquette",
    officialStatus: "community_structured_data_not_official_asset_record"
  };
  const claimsByProperty = entity.claims as Record<string, unknown>;
  const statements = POINT_OBJECT_WIKIDATA_PROPERTY_IDS.flatMap((propertyId) => {
    const rawClaims = claimsByProperty[propertyId];
    const claims: unknown[] = Array.isArray(rawClaims) ? rawClaims.slice(0, 8) : [];
    return claims.flatMap((claim) => {
      const parsed = parseStatement(claim, propertyId, source, qid);
      return parsed ? [parsed] : [];
    });
  }).slice(0, 32);
  const conflictingPropertyIds = POINT_OBJECT_WIKIDATA_PROPERTY_IDS.filter((propertyId) => (
    propertyId !== "P31" && distinctStatementValues(statements.filter((statement) => statement.propertyId === propertyId)) > 1
  ));
  const labels = isRecord(entity.labels) ? entity.labels : {};
  return deepFreeze({
    qid,
    labels: {
      en: localizedLabel(labels.en, "en"),
      ru: localizedLabel(labels.ru, "ru")
    },
    source,
    statements,
    conflictingPropertyIds
  });
}

function radians(value: number): number {
  return value * Math.PI / 180;
}

function distanceM(left: readonly [number, number], right: readonly [number, number]): number {
  const earthRadiusM = 6_371_008.8;
  const latitudeDelta = radians(right[1] - left[1]);
  const longitudeDelta = radians(right[0] - left[0]);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(left[1])) * Math.cos(radians(right[1])) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function position(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = finiteNumber(value[0], -180, 180);
  const latitude = finiteNumber(value[1], -90, 90);
  return longitude === null || latitude === null ? null : [longitude, latitude];
}

function pointInRing(point: readonly [number, number], value: unknown): boolean {
  if (!Array.isArray(value) || value.length < 4) return false;
  let inside = false;
  for (let index = 0, previous = value.length - 1; index < value.length; previous = index++) {
    const currentPoint = position(value[index]);
    const previousPoint = position(value[previous]);
    if (!currentPoint || !previousPoint) return false;
    const crosses = (currentPoint[1] > point[1]) !== (previousPoint[1] > point[1]) &&
      point[0] < (previousPoint[0] - currentPoint[0]) * (point[1] - currentPoint[1]) /
        (previousPoint[1] - currentPoint[1]) + currentPoint[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: readonly [number, number], polygon: unknown): boolean {
  return Array.isArray(polygon) && polygon.length > 0 && pointInRing(point, polygon[0]) &&
    polygon.slice(1).every((hole) => !pointInRing(point, hole));
}

function segmentDistanceM(
  point: readonly [number, number],
  start: readonly [number, number],
  end: readonly [number, number]
): number {
  const latitude = radians(point[1]);
  const scaleX = 111_320 * Math.cos(latitude);
  const scaleY = 110_540;
  const ax = (start[0] - point[0]) * scaleX;
  const ay = (start[1] - point[1]) * scaleY;
  const bx = (end[0] - point[0]) * scaleX;
  const by = (end[1] - point[1]) * scaleY;
  const lengthSquared = (bx - ax) ** 2 + (by - ay) ** 2;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * (bx - ax) + ay * (by - ay)) / lengthSquared));
  return Math.hypot(ax + ratio * (bx - ax), ay + ratio * (by - ay));
}

function polygonBoundaryDistanceM(point: readonly [number, number], polygon: unknown): number {
  if (!Array.isArray(polygon)) return Number.POSITIVE_INFINITY;
  let nearest = Number.POSITIVE_INFINITY;
  for (const rawRing of polygon) {
    if (!Array.isArray(rawRing) || rawRing.length < 2) continue;
    for (let index = 0; index < rawRing.length; index += 1) {
      const start = position(rawRing[index]);
      const end = position(rawRing[(index + 1) % rawRing.length]);
      if (start && end) nearest = Math.min(nearest, segmentDistanceM(point, start, end));
    }
  }
  return nearest;
}

function polygonContainsOrTouches(
  geometry: PointObjectWikidataGeometry,
  point: readonly [number, number]
): { matched: boolean; boundaryDistanceM: number } {
  const polygons = geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)
      ? geometry.coordinates
      : [];
  if (polygons.some((polygon) => pointInPolygon(point, polygon))) return { matched: true, boundaryDistanceM: 0 };
  const boundaryDistanceM = polygons.reduce((nearest, polygon) => Math.min(nearest, polygonBoundaryDistanceM(point, polygon)), Number.POSITIVE_INFINITY);
  return {
    matched: Number.isFinite(boundaryDistanceM) && boundaryDistanceM <= POINT_OBJECT_WIKIDATA_POLYGON_TOLERANCE_M,
    boundaryDistanceM
  };
}

const COUNTRY_QID: Record<PointObjectWikidataCountryCode, string> = {
  ae: "Q878",
  qa: "Q846",
  sa: "Q851",
  my: "Q833",
  sg: "Q334",
  hk: "Q8646",
  ru: "Q159"
};

const TYPE_CATEGORY_QIDS = {
  hospitality: new Set(["Q27686", "Q6043159", "Q875157"]),
  residential: new Set(["Q188507", "Q11755880", "Q1802963"]),
  commercial: new Set(["Q1021645", "Q11315", "Q1329623"]),
  healthcare: new Set(["Q16917", "Q1774898"]),
  education: new Set(["Q2385804", "Q3918"]),
  transport: new Set(["Q55488", "Q928830"]),
  open_space: new Set(["Q22698", "Q4421"]),
  general_built: new Set(["Q41176", "Q811979", "Q11303", "Q1303167", "Q18142"])
} as const;

function osmCategory(featureClass: string, tags: Record<string, string>): keyof typeof TYPE_CATEGORY_QIDS | "other" {
  const values = `${featureClass} ${Object.values(tags).join(" ")}`.toLowerCase();
  if (/hotel|hostel|resort|guest_house|tourism/.test(values)) return "hospitality";
  if (/residential|apartments|house|dormitory/.test(values)) return "residential";
  if (/office|commercial|retail|mall|shop/.test(values)) return "commercial";
  if (/hospital|clinic|healthcare|pharmacy/.test(values)) return "healthcare";
  if (/school|college|university|education/.test(values)) return "education";
  if (/station|transport|railway|bus_stop/.test(values)) return "transport";
  if (/park|garden|recreation|open_space/.test(values)) return "open_space";
  if (/building|tower|skyscraper/.test(values)) return "general_built";
  return "other";
}

function typeCompatible(snapshot: WikidataEntitySnapshot, input: ResolvePointObjectWikidataInput): boolean {
  const typeStatements = snapshot.statements
    .filter((statement) => statement.propertyId === "P31" && statement.value.kind === "entity");
  const preferred = typeStatements.filter((statement) => statement.rank === "preferred");
  const effective = preferred.length > 0 ? preferred : typeStatements;
  const types = effective.map((statement) => (statement.value as { kind: "entity"; entityId: string }).entityId);
  if (types.length === 0 || types.includes("Q5")) return false;
  // Wikibase preferred rank supersedes normal rank for the identity predicate.
  // Multiple different preferred types are ambiguous even when each is broad.
  if (preferred.length > 0 && new Set(types).size !== 1) return false;
  const category = osmCategory(input.osmFeatureClass, input.osmTags);
  const compatible = category === "other"
    ? TYPE_CATEGORY_QIDS.general_built
    : new Set([...TYPE_CATEGORY_QIDS[category], ...TYPE_CATEGORY_QIDS.general_built]);
  return types.every((qid) => compatible.has(qid));
}

function identityReceipt(
  snapshot: WikidataEntitySnapshot,
  input: ResolvePointObjectWikidataInput
): PointObjectWikidataIdentityReceipt | PointObjectWikidataResolution {
  const countryValues = snapshot.statements
    .filter((statement) => statement.propertyId === "P17" && statement.value.kind === "entity")
    .map((statement) => (statement.value as { kind: "entity"; entityId: string }).entityId);
  if (countryValues.some((value) => value !== COUNTRY_QID[input.expectedCountryCode])) {
    return { status: "identity_rejected", linkedEntity: null, reason: "country_mismatch" };
  }
  if (!typeCompatible(snapshot, input)) {
    return { status: "identity_rejected", linkedEntity: null, reason: "type_mismatch_or_unsupported" };
  }
  const coordinateStatements = snapshot.statements.filter((statement) => (
    statement.propertyId === "P625" && statement.value.kind === "coordinate"
  ));
  const coordinateValues = coordinateStatements.map((statement) => (
    statement.value as Extract<PointObjectWikidataStatementValue, { kind: "coordinate" }>
  ));
  if (coordinateValues.some((value) => value.precision === null || value.precision <= 0 ||
      value.precision > POINT_OBJECT_WIKIDATA_MAX_COORDINATE_PRECISION_DEGREES)) {
    return { status: "identity_rejected", linkedEntity: null, reason: "coordinate_precision_insufficient" };
  }
  const coordinates = coordinateValues.map((value) => [value.longitude, value.latitude] as const);
  if (coordinates.length === 0 || snapshot.conflictingPropertyIds.includes("P625")) {
    return { status: "identity_rejected", linkedEntity: null, reason: "coordinate_missing_or_conflicting" };
  }

  let basis: PointObjectWikidataIdentityReceipt["basis"];
  let linkedCoordinateDistanceM: number;
  if (input.osmGeometry?.type === "Polygon" || input.osmGeometry?.type === "MultiPolygon") {
    const matches = coordinates.map((coordinate) => polygonContainsOrTouches(input.osmGeometry!, coordinate));
    if (matches.some((match) => !match.matched)) {
      return { status: "identity_rejected", linkedEntity: null, reason: "polygon_coordinate_mismatch" };
    }
    basis = "polygon_coordinate_inside_or_boundary_tolerance";
    linkedCoordinateDistanceM = Math.round(Math.max(...matches.map((match) => match.boundaryDistanceM)));
  } else if (!input.osmGeometry || input.osmGeometry.type === "Point") {
    const distances = coordinates.map((coordinate) => distanceM(input.osmCentroid, coordinate));
    if (distances.some((distance) => distance > POINT_OBJECT_WIKIDATA_NODE_COMPLEX_MAX_DISTANCE_M)) {
      return { status: "identity_rejected", linkedEntity: null, reason: "node_or_complex_coordinate_mismatch" };
    }
    basis = "node_or_complex_coordinate_within_ceiling";
    linkedCoordinateDistanceM = Math.round(Math.max(...distances));
  } else {
    return { status: "identity_rejected", linkedEntity: null, reason: "unsupported_geometry" };
  }

  const core = {
    qid: snapshot.qid,
    osmSourceFeatureId: input.osmSourceFeatureId,
    osmGeometryHash: input.osmGeometryHash,
    basis,
    linkedCoordinateDistanceM,
    polygonBoundaryToleranceM: POINT_OBJECT_WIKIDATA_POLYGON_TOLERANCE_M,
    nodeOrComplexMaxDistanceM: POINT_OBJECT_WIKIDATA_NODE_COMPLEX_MAX_DISTANCE_M,
    countryMatch: countryValues.length > 0 ? "matched" as const : "not_asserted" as const,
    typeMatch: "compatible" as const,
    scope: "linked_community_entity_not_certified_selected_footprint" as const
  };
  return deepFreeze({ identityReceiptHash: semanticHash(core), ...core });
}

async function readBoundedResponse(response: Response): Promise<{ text: string; bytes: number }> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > POINT_OBJECT_WIKIDATA_RESPONSE_MAX_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("response_too_large");
  }
  if (!response.body) throw new Error("response_invalid");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > POINT_OBJECT_WIKIDATA_RESPONSE_MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error("response_too_large");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return { text, bytes };
}

function unavailableReason(error: unknown): PointObjectWikidataResolutionReason {
  if (error instanceof Error && error.message === "response_too_large") return "response_too_large";
  if (error instanceof Error && error.message === "deadline_exhausted") return "deadline_exhausted";
  if (error instanceof Error && error.message === "rate_limited_or_maxlag") return "rate_limited_or_maxlag";
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return "request_failed";
  if (error instanceof Error && error.message === "entity_missing") return "entity_missing";
  if (error instanceof Error && error.message === "queue_full") return "queue_full";
  if (error instanceof SyntaxError || error instanceof Error && error.message === "response_invalid") return "response_invalid";
  return "request_failed";
}

export class PointObjectWikidataAdapter {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly cache = new Map<string, CachedSnapshot>();
  private readonly inFlight = new Map<string, {
    promise: Promise<WikidataEntitySnapshot>;
    queueState: { latestCallerDeadlineAtMs: number };
  }>();
  private queueTail: Promise<void> = Promise.resolve();
  private queuedOrRunning = 0;

  constructor(options: PointObjectWikidataAdapterOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
  }

  private pruneCache(now: number): void {
    for (const [qid, cached] of this.cache) {
      if (cached.expiresAtMs <= now) this.cache.delete(qid);
    }
    while (this.cache.size >= POINT_OBJECT_WIKIDATA_CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.cache.delete(oldest);
    }
  }

  private async acquire(qid: string): Promise<WikidataEntitySnapshot> {
    const url = new URL(POINT_OBJECT_WIKIDATA_ENDPOINT);
    url.searchParams.set("action", "wbgetentities");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    url.searchParams.set("ids", qid);
    url.searchParams.set("props", "labels|claims|info");
    url.searchParams.set("languages", "en|ru");
    url.searchParams.set("languagefallback", "0");
    url.searchParams.set("maxlag", "5");
    const response = await this.fetchImpl(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(POINT_OBJECT_WIKIDATA_TIMEOUT_MS),
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Referer: "https://github.com/mmgolikov/geoai-mvp",
        "User-Agent": "GeoAI-PointToObject-Preview/1.0 (+https://github.com/mmgolikov/geoai-mvp)"
      }
    });
    if (response.status === 429 || response.status === 503 && response.headers.has("retry-after")) {
      throw new Error("rate_limited_or_maxlag");
    }
    if (!response.ok) throw new Error("request_failed");
    const { text, bytes } = await readBoundedResponse(response);
    const sourceResponseHash = sha256(text);
    const payload: unknown = JSON.parse(text);
    if (isRecord(payload) && isRecord(payload.error) && payload.error.code === "maxlag") {
      throw new Error("rate_limited_or_maxlag");
    }
    const acquiredAt = new Date(this.now()).toISOString();
    const snapshot = normalizeEntitySnapshot(payload, qid, sourceResponseHash, bytes, acquiredAt);
    if (!snapshot) throw new Error(isRecord(payload) && isRecord(payload.entities) && isRecord(payload.entities[qid]) && payload.entities[qid].missing !== undefined
      ? "entity_missing" : "response_invalid");
    return snapshot;
  }

  private callerDeadline(deadlineAtMs?: number): number {
    if (deadlineAtMs === undefined) return this.now() + POINT_OBJECT_WIKIDATA_TIMEOUT_MS;
    return Number.isFinite(deadlineAtMs) ? deadlineAtMs : this.now() - 1;
  }

  private async withinCallerDeadline<T>(promise: Promise<T>, deadlineAtMs?: number): Promise<T> {
    const effectiveDeadlineAtMs = this.callerDeadline(deadlineAtMs);
    const remainingMs = effectiveDeadlineAtMs - this.now();
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) throw new Error("deadline_exhausted");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("deadline_exhausted")), Math.max(1, Math.ceil(remainingMs)));
    });
    try {
      return await Promise.race([promise, deadline]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private enqueue(
    entry: { latestCallerDeadlineAtMs: number },
    operation: () => Promise<WikidataEntitySnapshot>
  ): Promise<WikidataEntitySnapshot> {
    if (this.queuedOrRunning >= POINT_OBJECT_WIKIDATA_QUEUE_MAX_ENTRIES) {
      return Promise.reject(new Error("queue_full"));
    }
    this.queuedOrRunning += 1;
    const run = async () => {
      try {
        // Do not start a new external request when every coalesced caller's
        // known deadline is already exhausted. A later longer-lived caller can
        // extend this mutable deadline while the entry is still queued.
        if (entry.latestCallerDeadlineAtMs - this.now() < 25) throw new Error("deadline_exhausted");
        return await operation();
      } finally {
        this.queuedOrRunning -= 1;
      }
    };
    const result = this.queueTail.then(run, run);
    this.queueTail = result.then(() => undefined, () => undefined);
    return result;
  }

  private async snapshot(qid: string, deadlineAtMs?: number): Promise<WikidataEntitySnapshot> {
    const now = this.now();
    this.pruneCache(now);
    const cached = this.cache.get(qid);
    if (cached && cached.expiresAtMs > now) return this.withinCallerDeadline(Promise.resolve(cached.snapshot), deadlineAtMs);
    const pending = this.inFlight.get(qid);
    if (pending) {
      pending.queueState.latestCallerDeadlineAtMs = Math.max(
        pending.queueState.latestCallerDeadlineAtMs,
        this.callerDeadline(deadlineAtMs)
      );
      return this.withinCallerDeadline(pending.promise, deadlineAtMs);
    }
    const entry = { latestCallerDeadlineAtMs: this.callerDeadline(deadlineAtMs) };
    let acquisition: Promise<WikidataEntitySnapshot>;
    acquisition = this.enqueue(entry, () => this.acquire(qid))
      .then((snapshot) => {
        this.cache.set(qid, { expiresAtMs: Date.parse(snapshot.source.cacheExpiresAt), snapshot });
        return snapshot;
      })
      .finally(() => {
        if (this.inFlight.get(qid)?.promise === acquisition) this.inFlight.delete(qid);
      });
    this.inFlight.set(qid, { promise: acquisition, queueState: entry });
    return this.withinCallerDeadline(acquisition, deadlineAtMs);
  }

  async resolve(input: ResolvePointObjectWikidataInput): Promise<PointObjectWikidataResolution> {
    if (!input.qid || !WIKIDATA_QID.test(input.qid)) {
      return { status: "not_requested_no_qid", linkedEntity: null, reason: null };
    }
    let snapshot: WikidataEntitySnapshot;
    try {
      snapshot = await this.snapshot(input.qid, input.deadlineAtMs);
    } catch (error) {
      return { status: "unavailable", linkedEntity: null, reason: unavailableReason(error) };
    }
    const identity = identityReceipt(snapshot, input);
    if (!("identityReceiptHash" in identity)) return identity;
    const statements: PointObjectWikidataStatementReceipt[] = snapshot.statements.map((statement) => {
      const { statementReceiptHash: _unboundHash, ...unboundCore } = statement;
      const core = { ...unboundCore, identityReceiptHash: identity.identityReceiptHash };
      return deepFreeze({ statementReceiptHash: semanticHash(core), ...core });
    });
    return deepFreeze({
      status: "available",
      reason: null,
      linkedEntity: {
        contractVersion: POINT_OBJECT_WIKIDATA_CONTRACT_VERSION,
        qid: snapshot.qid,
        labels: snapshot.labels,
        source: snapshot.source,
        identity,
        statements,
        conflictingPropertyIds: snapshot.conflictingPropertyIds
      }
    });
  }
}
