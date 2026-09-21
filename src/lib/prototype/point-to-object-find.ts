import "server-only";
import { ExactFindSnapshotConflictError, rememberExactFindElements, shareExactFindElements } from "./point-to-object-exact-source";

import { unstable_cache } from "next/cache";
import { sourceRetryAfterSeconds, waitForSourceAdmission } from "./point-to-object-source-recovery";
import {
  isPointObjectSourceDeadlineError,
  POINT_OBJECT_SOURCE_UPSTREAM_TIMEOUT_MS,
  pointObjectSourceCanUseSharedCache,
  pointObjectSourceOperationSignal,
  waitForPointObjectSourceOperation
} from "./source-request-deadline";

import { semanticHash } from "@/src/lib/point-to-object/hash";
import {
  assertUsablePointObjectFindPayload,
  buildPointObjectFindOverpassQuery,
  normalizePointObjectFindCandidates,
  POINT_OBJECT_FIND_CAVEAT,
  POINT_OBJECT_FIND_UPSTREAM_LIMIT,
  pointObjectFindApproximateAreaSqKm,
  PointObjectFindPayloadError,
  type PointObjectFindRequest,
  type PointObjectFindResult
} from "./point-to-object-find-contract";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
// Public Overpass admission can queue for 15s before the unchanged 5s query budget.
const OVERPASS_TIMEOUT_MS = POINT_OBJECT_SOURCE_UPSTREAM_TIMEOUT_MS;
const OVERPASS_RESPONSE_MAX_BYTES = 512 * 1024;
const OVERPASS_REVALIDATE_SECONDS = 15 * 60;
const OVERPASS_MIN_INTERVAL_MS = 1_200;
const USER_AGENT = "GeoAI-PointToObject-Preview/1.0 (+https://github.com/mmgolikov/geoai-mvp)";
const REFERER = "https://github.com/mmgolikov/geoai-mvp";
type PointObjectFindUpstreamReceipt = { payload: unknown; acquiredAt: string };

export type PointObjectFindErrorCode =
  | "OVERPASS_TIMEOUT"
  | "OVERPASS_RATE_LIMITED"
  | "OVERPASS_UNAVAILABLE"
  | "OVERPASS_RESPONSE_TOO_LARGE"
  | "OVERPASS_RUNTIME_ERROR"
  | "OVERPASS_RESPONSE_INVALID";

export class PointObjectFindError extends Error {
  constructor(
    public readonly code: PointObjectFindErrorCode,
    public readonly httpStatus: number,
    message: string,
    public readonly retryable: boolean,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "PointObjectFindError";
  }
}

let overpassGate: Promise<void> = Promise.resolve();
let lastOverpassDispatchAt = 0;

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
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    signal.throwIfAborted();
    lastOverpassDispatchAt = Date.now();
  } finally {
    release?.();
  }
}

function timeoutError(error: unknown): boolean {
  return isPointObjectSourceDeadlineError(error) ||
    (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"));
}

async function readBoundedText(response: Response, signal: AbortSignal): Promise<string> {
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
  try {
    while (true) {
      const { done, value } = await waitForPointObjectSourceOperation(reader.read(), signal);
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > OVERPASS_RESPONSE_MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new PointObjectFindError("OVERPASS_RESPONSE_TOO_LARGE", 502, "Open-map Find coverage exceeded the response cap.", true);
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch (error) {
    void reader.cancel(error).catch(() => undefined);
    throw error;
  }
  return text + decoder.decode();
}

async function fetchOverpassPayload(query: string, routeSignal?: AbortSignal): Promise<PointObjectFindUpstreamReceipt> {
  const signal = pointObjectSourceOperationSignal(routeSignal, OVERPASS_TIMEOUT_MS);
  const url = new URL(OVERPASS_ENDPOINT);
  url.searchParams.set("data", query);
  let response: Response;
  try {
    await waitForSourceAdmission(waitForOverpassSlot(signal), signal);
    response = await waitForPointObjectSourceOperation(fetch(url, {
      method: "GET",
      redirect: "error",
      signal,
      headers: { Accept: "application/json", Referer: REFERER, "User-Agent": USER_AGENT },
      // Cache only after payload validation. Overpass can return an HTTP 200
      // runtime-error remark, which must never become a cached empty result.
      cache: "no-store"
    }), signal);
  } catch (error) {
    if (timeoutError(error)) {
      throw new PointObjectFindError("OVERPASS_TIMEOUT", 504, "Open-map Find timed out. Zoom in or retry later.", true);
    }
    throw new PointObjectFindError("OVERPASS_UNAVAILABLE", 502, "Open-map Find is temporarily unavailable.", true);
  }
  if (!response.ok) {
    if (response.status === 429) {
      throw new PointObjectFindError("OVERPASS_RATE_LIMITED", 429, "Open-map Find is temporarily rate limited.", true, sourceRetryAfterSeconds(response.headers.get("retry-after")));
    }
    if (response.status === 504) throw new PointObjectFindError("OVERPASS_TIMEOUT", 504, "Open-map Find timed out. Zoom in or retry later.", true);
    throw new PointObjectFindError(
      "OVERPASS_UNAVAILABLE",
      response.status >= 500 ? 502 : 422,
      "Open-map Find did not return a usable bounded result.",
      response.status >= 500
    );
  }
  try {
    const text = await readBoundedText(response, signal);
    const payload = JSON.parse(text) as unknown;
    assertUsablePointObjectFindPayload(payload);
    return { payload, acquiredAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof PointObjectFindError) throw error;
    if (timeoutError(error)) throw new PointObjectFindError("OVERPASS_TIMEOUT", 504, "Open-map Find timed out. Zoom in or retry later.", true);
    if (error instanceof PointObjectFindPayloadError) {
      throw new PointObjectFindError(
        error.code === "OVERPASS_RUNTIME_FAILURE" ? "OVERPASS_RUNTIME_ERROR" : "OVERPASS_RESPONSE_INVALID",
        502,
        error.code === "OVERPASS_RUNTIME_FAILURE"
          ? "Open-map Find could not complete the bounded query. Zoom in or retry later."
          : "Open-map Find returned invalid data.",
        true
      );
    }
    throw new PointObjectFindError("OVERPASS_RESPONSE_INVALID", 502, "Open-map Find returned invalid data.", true);
  }
}

const fetchCachedOverpassPayload = unstable_cache(
  fetchOverpassPayload,
  ["point-object-find-overpass-v2"],
  { revalidate: OVERPASS_REVALIDATE_SECONDS }
);

export async function findPointObjects(
  request: PointObjectFindRequest,
  loader?: (query: string, signal?: AbortSignal) => Promise<unknown>,
  signal?: AbortSignal
): Promise<PointObjectFindResult> {
  const query = buildPointObjectFindOverpassQuery(request);
  const load = loader
    ? async () => ({ payload: await loader(query, signal), acquiredAt: new Date().toISOString() })
    : pointObjectSourceCanUseSharedCache(signal)
      ? () => fetchCachedOverpassPayload(query)
      : () => fetchOverpassPayload(query, signal);
  const receipt = await load();
  const { payload, acquiredAt } = receipt;
  try {
    assertUsablePointObjectFindPayload(payload);
  } catch (error) {
    if (error instanceof PointObjectFindPayloadError) {
      throw new PointObjectFindError(
        error.code === "OVERPASS_RUNTIME_FAILURE" ? "OVERPASS_RUNTIME_ERROR" : "OVERPASS_RESPONSE_INVALID",
        502,
        error.code === "OVERPASS_RUNTIME_FAILURE"
          ? "Open-map Find could not complete the bounded query. Zoom in or retry later."
          : "Open-map Find returned invalid data.",
        true
      );
    }
    throw error;
  }
  const normalized = normalizePointObjectFindCandidates(payload, request);
  try {
    await shareExactFindElements(payload, acquiredAt, normalized.candidates.map(candidate => candidate.sourceFeatureId));
  } catch (error) {
    if (error instanceof ExactFindSnapshotConflictError) throw new PointObjectFindError(
      "OVERPASS_RESPONSE_INVALID", 409, "An object changed during the current data snapshot. Retry after the snapshot expires.", true
    );
    throw error;
  }
  rememberExactFindElements(payload, acquiredAt);
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
      mappedLevelsPolicy: request.mappedMinimumLevels === null && request.mappedMaximumLevels === null
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
