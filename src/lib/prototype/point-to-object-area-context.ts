import "server-only";

import { unstable_cache } from "next/cache";

import {
  assertUsablePointObjectAreaContextPayload,
  buildPointObjectAreaContextOverpassQuery,
  normalizePointObjectAreaContext,
  PointObjectAreaContextPayloadError,
  type PointObjectAreaContextRequest,
  type PointObjectAreaContextResult
} from "./point-to-object-area-context-contract";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const OVERPASS_TIMEOUT_MS = 8_000;
const OVERPASS_RESPONSE_MAX_BYTES = 512 * 1024;
const OVERPASS_REVALIDATE_SECONDS = 15 * 60;
const OVERPASS_MIN_INTERVAL_MS = 1_200;
const USER_AGENT = "GeoAI-PointToObject-Preview/1.0 (+https://github.com/mmgolikov/geoai-mvp)";
const REFERER = "https://github.com/mmgolikov/geoai-mvp";

export class PointObjectAreaContextError extends Error {
  readonly httpStatus: 429 | 502 | 504;
  readonly retryable: boolean;

  constructor(
    httpStatus: 429 | 502 | 504,
    message: string,
    retryable: boolean
  ) {
    super(message);
    this.name = "PointObjectAreaContextError";
    this.httpStatus = httpStatus;
    this.retryable = retryable;
  }
}

let overpassGate: Promise<void> = Promise.resolve();
let lastOverpassDispatchAt = 0;

async function waitForOverpassSlot(): Promise<void> {
  let release: (() => void) | undefined;
  const previous = overpassGate;
  overpassGate = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    const waitMs = Math.max(0, lastOverpassDispatchAt + OVERPASS_MIN_INTERVAL_MS - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastOverpassDispatchAt = Date.now();
  } finally {
    release?.();
  }
}

async function readBoundedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > OVERPASS_RESPONSE_MAX_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new PointObjectAreaContextError(502, "The open-map area response exceeded the permitted size.", true);
  }
  if (!response.body) throw new PointObjectAreaContextError(502, "The open-map area response was unreadable.", true);
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
      throw new PointObjectAreaContextError(502, "The open-map area response exceeded the permitted size.", true);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function fetchAreaContext(query: string): Promise<unknown> {
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
      // Cache only after payload validation. Overpass can report a runtime error
      // in an HTTP 200 JSON body, which must never become a cached empty result.
      cache: "no-store"
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new PointObjectAreaContextError(504, "The open-map area lookup timed out.", true);
    }
    throw new PointObjectAreaContextError(502, "The open-map area lookup is temporarily unavailable.", true);
  }
  if (!response.ok) {
    if (response.status === 429) throw new PointObjectAreaContextError(429, "The open-map area lookup is temporarily rate limited.", true);
    throw new PointObjectAreaContextError(502, "The open-map area lookup did not return a usable response.", response.status >= 500);
  }
  try {
    const payload = JSON.parse(await readBoundedText(response)) as unknown;
    // Validate before the enclosing Next data cache can store the payload.
    assertUsablePointObjectAreaContextPayload(payload);
    return payload;
  } catch (error) {
    if (error instanceof PointObjectAreaContextError) throw error;
    if (error instanceof PointObjectAreaContextPayloadError) throw mapPayloadError(error);
    throw new PointObjectAreaContextError(502, "The open-map area lookup returned invalid data.", true);
  }
}

function mapPayloadError(error: PointObjectAreaContextPayloadError): PointObjectAreaContextError {
  return error.code === "OVERPASS_RUNTIME_TIMEOUT"
    ? new PointObjectAreaContextError(504, "The open-map area lookup timed out.", true)
    : new PointObjectAreaContextError(
      502,
      error.code === "OVERPASS_RUNTIME_FAILURE"
        ? "The open-map area lookup is temporarily unavailable."
        : "The open-map area lookup returned invalid data.",
      true
    );
}

const fetchCachedAreaContext = unstable_cache(
  fetchAreaContext,
  ["point-object-area-context-overpass-v2"],
  { revalidate: OVERPASS_REVALIDATE_SECONDS }
);

export async function resolvePointObjectAreaContext(
  request: PointObjectAreaContextRequest,
  loader: (query: string) => Promise<unknown> = fetchCachedAreaContext
): Promise<PointObjectAreaContextResult> {
  try {
    const payload = await loader(buildPointObjectAreaContextOverpassQuery(request));
    return normalizePointObjectAreaContext(payload, request);
  } catch (error) {
    if (error instanceof PointObjectAreaContextError) throw error;
    if (error instanceof PointObjectAreaContextPayloadError) throw mapPayloadError(error);
    throw error;
  }
}
