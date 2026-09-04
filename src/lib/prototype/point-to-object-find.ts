import "server-only";

import { semanticHash } from "@/src/lib/point-to-object/hash";
import {
  buildPointObjectFindOverpassQuery,
  normalizePointObjectFindCandidates,
  POINT_OBJECT_FIND_CAVEAT,
  POINT_OBJECT_FIND_UPSTREAM_LIMIT,
  pointObjectFindApproximateAreaSqKm,
  type PointObjectFindRequest,
  type PointObjectFindResult
} from "./point-to-object-find-contract";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const OVERPASS_TIMEOUT_MS = 6_000;
const OVERPASS_RESPONSE_MAX_BYTES = 512 * 1024;
const OVERPASS_REVALIDATE_SECONDS = 15 * 60;
const OVERPASS_MIN_INTERVAL_MS = 1_200;
const USER_AGENT = "GeoAI-PointToObject-Preview/1.0 (+https://github.com/mmgolikov/geoai-mvp)";
const REFERER = "https://github.com/mmgolikov/geoai-mvp";

export type PointObjectFindErrorCode =
  | "OVERPASS_TIMEOUT"
  | "OVERPASS_RATE_LIMITED"
  | "OVERPASS_UNAVAILABLE"
  | "OVERPASS_RESPONSE_TOO_LARGE"
  | "OVERPASS_RESPONSE_INVALID";

export class PointObjectFindError extends Error {
  constructor(
    public readonly code: PointObjectFindErrorCode,
    public readonly httpStatus: number,
    message: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "PointObjectFindError";
  }
}

let overpassGate: Promise<void> = Promise.resolve();
let lastOverpassDispatchAt = 0;

async function waitForOverpassSlot(): Promise<void> {
  let release: (() => void) | undefined;
  const previous = overpassGate;
  overpassGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    const waitMs = Math.max(0, lastOverpassDispatchAt + OVERPASS_MIN_INTERVAL_MS - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastOverpassDispatchAt = Date.now();
  } finally {
    release?.();
  }
}

function timeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

async function readBoundedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > OVERPASS_RESPONSE_MAX_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new PointObjectFindError("OVERPASS_RESPONSE_TOO_LARGE", 502, "Open-map Find coverage exceeded the response cap.", true);
  }
  if (!response.body) {
    throw new PointObjectFindError("OVERPASS_RESPONSE_INVALID", 502, "Open-map Find returned no readable response.", true);
  }
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
      throw new PointObjectFindError("OVERPASS_RESPONSE_TOO_LARGE", 502, "Open-map Find coverage exceeded the response cap.", true);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function fetchOverpassPayload(query: string): Promise<unknown> {
  await waitForOverpassSlot();
  const url = new URL(OVERPASS_ENDPOINT);
  url.searchParams.set("data", query);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
      headers: { Accept: "application/json", Referer: REFERER, "User-Agent": USER_AGENT },
      cache: "force-cache",
      next: { revalidate: OVERPASS_REVALIDATE_SECONDS }
    });
  } catch (error) {
    if (timeoutError(error)) {
      throw new PointObjectFindError("OVERPASS_TIMEOUT", 504, "Open-map Find timed out. Zoom in or retry later.", true);
    }
    throw new PointObjectFindError("OVERPASS_UNAVAILABLE", 502, "Open-map Find is temporarily unavailable.", true);
  }
  if (!response.ok) {
    if (response.status === 429) {
      throw new PointObjectFindError("OVERPASS_RATE_LIMITED", 429, "Open-map Find is temporarily rate limited.", true);
    }
    throw new PointObjectFindError(
      "OVERPASS_UNAVAILABLE",
      response.status >= 500 ? 502 : 422,
      "Open-map Find did not return a usable bounded result.",
      response.status >= 500
    );
  }
  const text = await readBoundedText(response);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new PointObjectFindError("OVERPASS_RESPONSE_INVALID", 502, "Open-map Find returned invalid data.", true);
  }
}

export async function findPointObjects(
  request: PointObjectFindRequest,
  loader: (query: string) => Promise<unknown> = fetchOverpassPayload
): Promise<PointObjectFindResult> {
  const query = buildPointObjectFindOverpassQuery(request);
  const payload = await loader(query);
  const normalized = normalizePointObjectFindCandidates(payload, request);
  const acquiredAt = new Date().toISOString();
  const sourceResponseHash = semanticHash({
    observedAt: normalized.observedAt,
    upstreamElementCount: normalized.upstreamElementCount,
    candidates: normalized.candidates
  });
  return {
    protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1",
    mode: normalized.candidates.length > 0 ? "results" : "empty",
    criteria: request,
    candidates: normalized.candidates,
    ordering: "source_identity_ascending_not_ranked",
    coverage: {
      kind: "bounded_open_map_sample",
      approximateAreaSqKm: pointObjectFindApproximateAreaSqKm(request.bounds),
      upstreamElementCount: normalized.upstreamElementCount,
      normalizedCandidateCount: normalized.normalizedCandidateCount,
      returnedCandidateCount: normalized.candidates.length,
      upstreamQueryLimit: POINT_OBJECT_FIND_UPSTREAM_LIMIT,
      capReached: normalized.capReached,
      completeInventory: false,
      mappedLevelsPolicy: request.mappedMinimumLevels === null
        ? "not_requested"
        : "strict_explicit_building_levels_tag_only"
    },
    source: {
      name: "OpenStreetMap",
      service: "Overpass API",
      sourceResponseHash,
      observedAt: normalized.observedAt,
      acquiredAt,
      freshness: "runtime_response_feature_time_unavailable",
      licenceId: "ODbL-1.0",
      attribution: "© OpenStreetMap contributors",
      licenceUrl: "https://www.openstreetmap.org/copyright",
      usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html",
      officialStatus: "open_context_not_official",
      runtimeNetworkUsed: true,
      persistenceUsed: false
    },
    limitations: [
      "Results are a bounded runtime sample of mapped OpenStreetMap features, not a complete inventory; missing results do not prove real-world absence.",
      "Names, use tags, centres and building levels are contributor-mapped observations and may be missing, stale, generalized or incorrect.",
      "The response is not ranked and provides no availability, ownership, planning, zoning, financial, valuation or legal evidence."
    ],
    caveat: POINT_OBJECT_FIND_CAVEAT
  };
}
