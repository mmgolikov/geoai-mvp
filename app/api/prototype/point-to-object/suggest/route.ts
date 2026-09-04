import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getPointObjectPreviewSurfaceStatus } from "@/src/lib/ai/openai-upstream-gate";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import {
  parsePointObjectAutocompleteRequest,
  PointObjectAutocompleteError,
  suggestPointObjects
} from "@/src/lib/prototype/point-to-object-autocomplete";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 60;
const GLOBAL_RATE_MAX_REQUESTS = 240;

type RateBucket = { startedAt: number; count: number };
const rateBuckets = new Map<string, RateBucket>();

function previewRuntimeAllowed(): boolean {
  return getPointObjectPreviewSurfaceStatus().enabled;
}

function noStoreHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", ...extra };
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const expected = `${forwardedProto || requestUrl.protocol.replace(":", "")}://${forwardedHost || requestUrl.host}`;
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function rateKey(request: Request): string {
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ?? "preview-anonymous";
  return hash(forwarded.split(",")[0]?.trim() || "preview-anonymous");
}

function consumeBucket(key: string, maxRequests: number): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  for (const [entryKey, bucket] of rateBuckets) {
    if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(entryKey);
  }
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true };
  }
  if (current.count >= maxRequests) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - current.startedAt)) / 1000)) };
  }
  current.count += 1;
  return { allowed: true };
}

function consumeRateLimit(request: Request): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const client = consumeBucket(`client:${rateKey(request)}`, RATE_MAX_REQUESTS);
  if (!client.allowed) return client;
  return consumeBucket("global", GLOBAL_RATE_MAX_REQUESTS);
}

export async function POST(request: Request) {
  if (!previewRuntimeAllowed()) {
    return NextResponse.json({ mode: "unavailable", code: "AUTOCOMPLETE_DISABLED", error: "Place suggestions are not available in this environment." }, {
      status: 403,
      headers: noStoreHeaders()
    });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ mode: "unavailable", code: "AUTOCOMPLETE_ORIGIN_INVALID", error: "The suggestion request must originate from this application." }, {
      status: 403,
      headers: noStoreHeaders()
    });
  }
  const parsedBody = await readBoundedJson(request, 1_024);
  const parsed = parsedBody.ok ? parsePointObjectAutocompleteRequest(parsedBody.value) : null;
  if (!parsedBody.ok || !parsed?.ok) {
    return NextResponse.json({ mode: "unavailable", code: "AUTOCOMPLETE_REQUEST_INVALID", error: "Choose a city and enter a valid place query." }, {
      status: parsedBody.ok ? 400 : parsedBody.status,
      headers: noStoreHeaders()
    });
  }
  const rate = consumeRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json({ mode: "unavailable", code: "AUTOCOMPLETE_RATE_LIMITED", error: "Place suggestions are temporarily rate limited.", retryable: true }, {
      status: 429,
      headers: noStoreHeaders({ "Retry-After": String(rate.retryAfterSeconds) })
    });
  }
  try {
    return NextResponse.json(await suggestPointObjects(parsed.value), { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof PointObjectAutocompleteError) {
      return NextResponse.json({ mode: "unavailable", code: error.code, error: error.message, retryable: error.retryable }, {
        status: error.httpStatus,
        headers: noStoreHeaders()
      });
    }
    return NextResponse.json({ mode: "unavailable", code: "PHOTON_UNAVAILABLE", error: "Place suggestions could not be completed.", retryable: true }, {
      status: 502,
      headers: noStoreHeaders()
    });
  }
}
