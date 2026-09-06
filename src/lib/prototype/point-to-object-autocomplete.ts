import "server-only";

import {
  isPointObjectLocale,
  isPointObjectMarketKey,
  pointObjectAutocompleteQueryReady,
  pointObjectMarket,
  type PointObjectLocale,
  type PointObjectMarketKey
} from "./point-to-object-markets";

const DEFAULT_PHOTON_ENDPOINT = "https://photon.komoot.io/";
const PHOTON_USER_AGENT = "GeoAI-PointToObject-Preview/1.0 (+https://github.com/mmgolikov/geoai-mvp)";
const APPLICATION_REFERER = "https://github.com/mmgolikov/geoai-mvp";

export const POINT_OBJECT_AUTOCOMPLETE_PROTOCOL = "POINT_TO_OBJECT_001_AUTOCOMPLETE_V1" as const;
export const PHOTON_AUTOCOMPLETE_LIMIT = 5 as const;
export const PHOTON_AUTOCOMPLETE_TIMEOUT_MS = 4_500 as const;
export const PHOTON_AUTOCOMPLETE_RESPONSE_MAX_BYTES = 256 * 1024;
export const PHOTON_AUTOCOMPLETE_REVALIDATE_SECONDS = 24 * 60 * 60;
const PHOTON_MIN_INTERVAL_MS = 250;

const BIDI_AND_CONTROL_PATTERN = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;

export type PointObjectAutocompleteRequest = {
  marketKey: PointObjectMarketKey;
  locale: PointObjectLocale;
  query: string;
};

export type PointObjectAutocompleteResult = {
  id: string;
  label: string;
  secondaryLabel: string | null;
  longitude: number;
  latitude: number;
  category: string | null;
  featureType: string | null;
  boundingBox: [south: number, north: number, west: number, east: number] | null;
};

export type PointObjectAutocompleteResponse = {
  protocol: typeof POINT_OBJECT_AUTOCOMPLETE_PROTOCOL;
  mode: "results";
  provider: "Photon";
  results: PointObjectAutocompleteResult[];
  source: {
    attribution: "© OpenStreetMap contributors";
    licenceId: "ODbL-1.0";
    licenceUrl: "https://www.openstreetmap.org/copyright";
    serviceUrl: "https://photon.komoot.io/";
    officialStatus: "open_context_not_official";
  };
};

export type PointObjectAutocompleteErrorCode =
  | "PHOTON_CONFIGURATION_INVALID"
  | "PHOTON_TIMEOUT"
  | "PHOTON_RATE_LIMITED"
  | "PHOTON_UNAVAILABLE"
  | "PHOTON_RESPONSE_TOO_LARGE"
  | "PHOTON_RESPONSE_INVALID";

export class PointObjectAutocompleteError extends Error {
  constructor(
    public readonly code: PointObjectAutocompleteErrorCode,
    public readonly httpStatus: 429 | 502 | 503 | 504,
    message: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "PointObjectAutocompleteError";
  }
}

type PhotonFetch = (input: URL | RequestInfo, init?: RequestInit & { next?: { revalidate: number } }) => Promise<Response>;

let photonGate: Promise<void> = Promise.resolve();
let lastPhotonDispatchAt = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maximumCharacters = 240): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .normalize("NFKC")
    .replace(BIDI_AND_CONTROL_PATTERN, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return cleaned ? Array.from(cleaned).slice(0, maximumCharacters).join("") : null;
}

function taxonomyToken(value: unknown): string | null {
  const cleaned = cleanText(value, 80);
  return cleaned && /^[a-z0-9][a-z0-9_.:+/-]{0,79}$/i.test(cleaned) ? cleaned : null;
}

function positiveIdentifier(value: unknown): string | null {
  const candidate = typeof value === "number" && Number.isSafeInteger(value)
    ? String(value)
    : typeof value === "string" ? value.trim() : "";
  return /^(?!0+$)\d{1,20}$/.test(candidate) ? candidate : null;
}

function finiteCoordinate(value: unknown, absoluteLimit: number): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && Math.abs(parsed) <= absoluteLimit ? parsed : null;
}

export function normalizePointObjectAutocompleteQuery(value: unknown): string | null {
  const query = cleanText(value, 120);
  if (!query) return null;
  return pointObjectAutocompleteQueryReady(query) ? query : null;
}

export function parsePointObjectAutocompleteRequest(value: unknown):
  | { ok: true; value: PointObjectAutocompleteRequest }
  | { ok: false; error: string } {
  if (!isRecord(value) || Object.keys(value).some((key) => !["marketKey", "locale", "query"].includes(key))) {
    return { ok: false, error: "A city, locale and bounded query are required." };
  }
  const query = normalizePointObjectAutocompleteQuery(value.query);
  if (!isPointObjectMarketKey(value.marketKey) || !isPointObjectLocale(value.locale) || !query) {
    return { ok: false, error: "A city, locale and query of at least two or three characters are required." };
  }
  return { ok: true, value: { marketKey: value.marketKey, locale: value.locale, query } };
}

function configuredPhotonEndpoint(): URL {
  const configured = process.env.POINT_TO_OBJECT_PHOTON_ENDPOINT?.trim() || DEFAULT_PHOTON_ENDPOINT;
  try {
    const endpoint = new URL(configured.endsWith("/") ? configured : `${configured}/`);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error("unsafe endpoint");
    }
    return endpoint;
  } catch {
    throw new PointObjectAutocompleteError(
      "PHOTON_CONFIGURATION_INVALID",
      503,
      "The place-suggestion service is not configured safely.",
      false
    );
  }
}

export function buildPhotonAutocompleteUrl(
  request: PointObjectAutocompleteRequest,
  endpoint: URL = configuredPhotonEndpoint()
): URL {
  const market = pointObjectMarket(request.marketKey);
  const [[west, south], [east, north]] = market.bounds;
  const url = new URL("api/", endpoint);
  url.searchParams.set("q", request.query);
  url.searchParams.set("bbox", `${west},${south},${east},${north}`);
  url.searchParams.set("countrycode", market.countryCode.toUpperCase());
  url.searchParams.set("lat", market.center[1].toFixed(6));
  url.searchParams.set("lon", market.center[0].toFixed(6));
  url.searchParams.set("zoom", "12");
  url.searchParams.set("location_bias_scale", "0.2");
  url.searchParams.set("lang", request.locale);
  url.searchParams.set("limit", String(PHOTON_AUTOCOMPLETE_LIMIT));
  url.searchParams.set("dedupe", "1");
  return url;
}

function insideMarket(request: PointObjectAutocompleteRequest, longitude: number, latitude: number): boolean {
  const [[west, south], [east, north]] = pointObjectMarket(request.marketKey).bounds;
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
}

function normalizeExtent(value: unknown): PointObjectAutocompleteResult["boundingBox"] {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const firstLongitude = finiteCoordinate(value[0], 180);
  const firstLatitude = finiteCoordinate(value[1], 90);
  const secondLongitude = finiteCoordinate(value[2], 180);
  const secondLatitude = finiteCoordinate(value[3], 90);
  if (firstLongitude === null || firstLatitude === null || secondLongitude === null || secondLatitude === null) return null;
  return [
    Math.min(firstLatitude, secondLatitude),
    Math.max(firstLatitude, secondLatitude),
    Math.min(firstLongitude, secondLongitude),
    Math.max(firstLongitude, secondLongitude)
  ];
}

function photonSourceFeatureId(properties: Record<string, unknown>): string | null {
  const osmId = positiveIdentifier(properties.osm_id);
  const osmType = cleanText(properties.osm_type, 8)?.toUpperCase();
  const kind = osmType === "N" ? "node" : osmType === "W" ? "way" : osmType === "R" ? "relation" : null;
  return osmId && kind ? `${kind}/${osmId}` : null;
}

function secondaryLabel(properties: Record<string, unknown>, label: string): string | null {
  const fields = ["housenumber", "street", "district", "city", "county", "state", "postcode", "country"];
  const seen = new Set([label.toLocaleLowerCase("en")]);
  const parts: string[] = [];
  for (const field of fields) {
    const part = cleanText(properties[field], 120);
    if (!part) continue;
    const key = part.toLocaleLowerCase("en");
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(part);
  }
  return parts.length ? parts.join(", ").slice(0, 500) : null;
}

export function normalizePhotonAutocompletePayload(
  payload: unknown,
  request: PointObjectAutocompleteRequest
): PointObjectAutocompleteResult[] {
  if (!isRecord(payload) || payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) return [];
  const expectedCountry = pointObjectMarket(request.marketKey).countryCode.toUpperCase();
  const seen = new Set<string>();
  const results: PointObjectAutocompleteResult[] = [];
  for (const rawFeature of payload.features.slice(0, 40)) {
    if (!isRecord(rawFeature) || rawFeature.type !== "Feature" || !isRecord(rawFeature.geometry) || !isRecord(rawFeature.properties)) continue;
    if (rawFeature.geometry.type !== "Point" || !Array.isArray(rawFeature.geometry.coordinates) || rawFeature.geometry.coordinates.length < 2) continue;
    const longitude = finiteCoordinate(rawFeature.geometry.coordinates[0], 180);
    const latitude = finiteCoordinate(rawFeature.geometry.coordinates[1], 90);
    const countryCode = cleanText(rawFeature.properties.countrycode, 2)?.toUpperCase();
    const id = photonSourceFeatureId(rawFeature.properties);
    const label = cleanText(rawFeature.properties.name, 160);
    if (longitude === null || latitude === null || countryCode !== expectedCountry || !insideMarket(request, longitude, latitude) || !id || !label || seen.has(id)) continue;
    seen.add(id);
    results.push({
      id,
      label,
      secondaryLabel: secondaryLabel(rawFeature.properties, label),
      longitude: Number(longitude.toFixed(6)),
      latitude: Number(latitude.toFixed(6)),
      category: taxonomyToken(rawFeature.properties.osm_key),
      featureType: taxonomyToken(rawFeature.properties.osm_value),
      boundingBox: normalizeExtent(rawFeature.properties.extent)
    });
    if (results.length >= PHOTON_AUTOCOMPLETE_LIMIT) break;
  }
  return results;
}

async function waitForPhotonSlot(): Promise<void> {
  let release: (() => void) | undefined;
  const previous = photonGate;
  photonGate = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    const waitMs = Math.max(0, lastPhotonDispatchAt + PHOTON_MIN_INTERVAL_MS - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastPhotonDispatchAt = Date.now();
  } finally {
    release?.();
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

async function readBoundedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > PHOTON_AUTOCOMPLETE_RESPONSE_MAX_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new PointObjectAutocompleteError("PHOTON_RESPONSE_TOO_LARGE", 502, "Place suggestions exceeded the response cap.", true);
  }
  if (!response.body) {
    throw new PointObjectAutocompleteError("PHOTON_RESPONSE_INVALID", 502, "Place suggestions returned no readable response.", true);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteCount = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteCount += value.byteLength;
    if (byteCount > PHOTON_AUTOCOMPLETE_RESPONSE_MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new PointObjectAutocompleteError("PHOTON_RESPONSE_TOO_LARGE", 502, "Place suggestions exceeded the response cap.", true);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export async function fetchPhotonAutocompletePayload(
  url: URL,
  fetchImplementation: PhotonFetch = fetch
): Promise<unknown> {
  await waitForPhotonSlot();
  let response: Response;
  try {
    response = await fetchImplementation(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(PHOTON_AUTOCOMPLETE_TIMEOUT_MS),
      headers: {
        Accept: "application/geo+json, application/json",
        Referer: APPLICATION_REFERER,
        "User-Agent": PHOTON_USER_AGENT
      },
      cache: "force-cache",
      next: { revalidate: PHOTON_AUTOCOMPLETE_REVALIDATE_SECONDS }
    });
  } catch (error) {
    if (isTimeout(error)) {
      throw new PointObjectAutocompleteError("PHOTON_TIMEOUT", 504, "Place suggestions timed out.", true);
    }
    throw new PointObjectAutocompleteError("PHOTON_UNAVAILABLE", 502, "Place suggestions are temporarily unavailable.", true);
  }
  if (!response.ok) {
    if (response.status === 429) {
      throw new PointObjectAutocompleteError("PHOTON_RATE_LIMITED", 429, "Place suggestions are temporarily rate limited.", true);
    }
    throw new PointObjectAutocompleteError(
      "PHOTON_UNAVAILABLE",
      response.status >= 500 ? 502 : 503,
      "Place suggestions did not return a usable response.",
      response.status >= 500
    );
  }
  const text = await readBoundedText(response);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new PointObjectAutocompleteError("PHOTON_RESPONSE_INVALID", 502, "Place suggestions returned invalid data.", true);
  }
}

export async function suggestPointObjects(
  request: PointObjectAutocompleteRequest,
  loader: (url: URL) => Promise<unknown> = fetchPhotonAutocompletePayload
): Promise<PointObjectAutocompleteResponse> {
  const payload = await loader(buildPhotonAutocompleteUrl(request));
  return {
    protocol: POINT_OBJECT_AUTOCOMPLETE_PROTOCOL,
    mode: "results",
    provider: "Photon",
    results: normalizePhotonAutocompletePayload(payload, request),
    source: {
      attribution: "© OpenStreetMap contributors",
      licenceId: "ODbL-1.0",
      licenceUrl: "https://www.openstreetmap.org/copyright",
      serviceUrl: "https://photon.komoot.io/",
      officialStatus: "open_context_not_official"
    }
  };
}
