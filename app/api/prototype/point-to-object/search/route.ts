import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getPointObjectSurfaceStatus } from "@/src/lib/ai/openai-upstream-gate";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import {
  isPointObjectLocale,
  isPointObjectMarketKey,
  type PointObjectLocale,
  type PointObjectMarketKey
} from "@/src/lib/prototype/point-to-object-markets";
import {
  LivePointEvidenceError,
  searchLivePointObjects
} from "@/src/lib/prototype/point-to-object-live-evidence";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 20;
const GLOBAL_RATE_MAX_REQUESTS = 100;

type RateBucket = { startedAt: number; count: number };
const rateBuckets = new Map<string, RateBucket>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runtimeAllowed(): boolean {
  return getPointObjectSurfaceStatus().enabled;
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

function validBody(value: unknown): value is {
  marketKey: PointObjectMarketKey;
  locale: PointObjectLocale;
  query: string;
} {
  if (!isRecord(value) || Object.keys(value).some((key) => !["marketKey", "locale", "query"].includes(key))) return false;
  return isPointObjectMarketKey(value.marketKey) && isPointObjectLocale(value.locale) &&
    typeof value.query === "string" && value.query.trim().length >= 2 && value.query.trim().length <= 120;
}

export async function POST(request: Request) {
  if (!runtimeAllowed()) {
    return NextResponse.json({ mode: "unavailable", error: "Address search is not available in this environment." }, {
      status: 403, headers: noStoreHeaders()
    });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ mode: "unavailable", error: "The search request must originate from this application." }, {
      status: 403, headers: noStoreHeaders()
    });
  }
  const parsed = await readBoundedJson(request, 1_024);
  if (!parsed.ok || !validBody(parsed.value)) {
    return NextResponse.json({ mode: "unavailable", error: "Choose a city and enter a valid address or place." }, {
      status: parsed.ok ? 400 : parsed.status, headers: noStoreHeaders()
    });
  }
  const clientRate = consumeBucket(`client:${rateKey(request)}`, RATE_MAX_REQUESTS);
  const rate = clientRate.allowed ? consumeBucket("global", GLOBAL_RATE_MAX_REQUESTS) : clientRate;
  if (!rate.allowed) {
    return NextResponse.json({ mode: "unavailable", error: "Address search is temporarily rate limited.", retryable: true }, {
      status: 429, headers: noStoreHeaders({ "Retry-After": String(rate.retryAfterSeconds) })
    });
  }
  try {
    const results = await searchLivePointObjects({
      marketKey: parsed.value.marketKey,
      locale: parsed.value.locale,
      query: parsed.value.query.trim()
    });
    return NextResponse.json({ mode: "results", results }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof LivePointEvidenceError) {
      return NextResponse.json({ mode: "unavailable", error: error.message, retryable: error.retryable }, {
        status: error.httpStatus, headers: noStoreHeaders()
      });
    }
    return NextResponse.json({ mode: "unavailable", error: "Address search could not be completed.", retryable: true }, {
      status: 502, headers: noStoreHeaders()
    });
  }
}
