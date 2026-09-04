import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getPointObjectPreviewSurfaceStatus } from "@/src/lib/ai/openai-upstream-gate";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { resolvePointObjectAreaContext, PointObjectAreaContextError } from "@/src/lib/prototype/point-to-object-area-context";
import { parsePointObjectAreaContextRequest } from "@/src/lib/prototype/point-to-object-area-context-contract";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 6;
type RateBucket = { startedAt: number; count: number };
const rateBuckets = new Map<string, RateBucket>();

function noStoreHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", ...extra };
}

function previewRuntimeAllowed(): boolean {
  return getPointObjectPreviewSurfaceStatus().enabled;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || requestUrl.host;
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || requestUrl.protocol.replace(":", "");
    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}

function consumeRateLimit(request: Request): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(key);
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "preview-anonymous";
  const key = createHash("sha256").update(forwarded.split(",")[0]?.trim() || "preview-anonymous").digest("hex");
  const bucket = rateBuckets.get(key);
  if (!bucket) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true };
  }
  if (bucket.count >= RATE_MAX_REQUESTS) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - bucket.startedAt)) / 1_000)) };
  bucket.count += 1;
  return { allowed: true };
}

export async function POST(request: Request) {
  if (!previewRuntimeAllowed()) {
    return NextResponse.json({ mode: "unavailable", error: "Open-map area context is not available in this environment." }, { status: 403, headers: noStoreHeaders() });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ mode: "unavailable", error: "The area-context request must originate from this application." }, { status: 403, headers: noStoreHeaders() });
  }
  const parsedBody = await readBoundedJson(request, 20 * 1024);
  if (!parsedBody.ok) {
    return NextResponse.json({ mode: "unavailable", error: "A valid bounded polygon request is required." }, { status: parsedBody.status, headers: noStoreHeaders() });
  }
  const parsedRequest = parsePointObjectAreaContextRequest(parsedBody.value);
  if (!parsedRequest.ok) {
    return NextResponse.json({ mode: "unavailable", error: parsedRequest.error }, { status: 400, headers: noStoreHeaders() });
  }
  const rate = consumeRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json({ mode: "unavailable", error: "Open-map area context is temporarily rate limited.", retryable: true }, {
      status: 429,
      headers: noStoreHeaders({ "Retry-After": String(rate.retryAfterSeconds) })
    });
  }
  try {
    return NextResponse.json(await resolvePointObjectAreaContext(parsedRequest.value), { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof PointObjectAreaContextError) {
      return NextResponse.json({ mode: "unavailable", error: error.message, retryable: error.retryable }, { status: error.httpStatus, headers: noStoreHeaders() });
    }
    return NextResponse.json({ mode: "unavailable", error: "Open-map area context could not be completed.", retryable: true }, { status: 502, headers: noStoreHeaders() });
  }
}
