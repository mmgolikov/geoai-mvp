import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getPointObjectPreviewSurfaceStatus } from "@/src/lib/ai/openai-upstream-gate";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { parsePointObjectFindRequest } from "@/src/lib/prototype/point-to-object-find-contract";
import { findPointObjects, PointObjectFindError } from "@/src/lib/prototype/point-to-object-find";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 10;
const GLOBAL_RATE_MAX_REQUESTS = 50;

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

function rateKey(request: Request): string {
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ?? "preview-anonymous";
  return createHash("sha256").update(forwarded.split(",")[0]?.trim() || "preview-anonymous").digest("hex");
}

function consumeBucket(key: string, maxRequests: number): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  for (const [entryKey, bucket] of rateBuckets) if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(entryKey);
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true };
  }
  if (current.count >= maxRequests) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - current.startedAt)) / 1_000)) };
  }
  current.count += 1;
  return { allowed: true };
}

function consumeRateLimit(request: Request): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const client = consumeBucket(`client:${rateKey(request)}`, RATE_MAX_REQUESTS);
  return client.allowed ? consumeBucket("global", GLOBAL_RATE_MAX_REQUESTS) : client;
}

export async function POST(request: Request) {
  if (!previewRuntimeAllowed()) {
    return NextResponse.json({ mode: "unavailable", error: "Open-map Find is not available in this environment." }, {
      status: 403,
      headers: noStoreHeaders()
    });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ mode: "unavailable", error: "The Find request must originate from this application." }, {
      status: 403,
      headers: noStoreHeaders()
    });
  }
  const parsedBody = await readBoundedJson(request, 2_048);
  if (!parsedBody.ok) {
    return NextResponse.json({ mode: "unavailable", error: "A valid bounded Find request is required." }, {
      status: parsedBody.status,
      headers: noStoreHeaders()
    });
  }
  const parsedRequest = parsePointObjectFindRequest(parsedBody.value);
  if (!parsedRequest.ok) {
    return NextResponse.json({ mode: "unavailable", error: parsedRequest.error }, {
      status: 400,
      headers: noStoreHeaders()
    });
  }
  const rate = consumeRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json({ mode: "unavailable", error: "Open-map Find is temporarily rate limited.", retryable: true }, {
      status: 429,
      headers: noStoreHeaders({ "Retry-After": String(rate.retryAfterSeconds) })
    });
  }
  try {
    return NextResponse.json(await findPointObjects(parsedRequest.value), { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof PointObjectFindError) {
      return NextResponse.json({ mode: "unavailable", error: error.message, retryable: error.retryable }, {
        status: error.httpStatus,
        headers: noStoreHeaders()
      });
    }
    return NextResponse.json({ mode: "unavailable", error: "Open-map Find could not be completed.", retryable: true }, {
      status: 502,
      headers: noStoreHeaders()
    });
  }
}
