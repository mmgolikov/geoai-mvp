import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getPointObjectPreviewSurfaceStatus } from "@/src/lib/ai/openai-upstream-gate";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import {
  buildLivePointObjectEvidencePack,
  LivePointEvidenceError
} from "@/src/lib/prototype/point-to-object-live-evidence";
import {
  coordinatesMatchPointObjectMarket,
  isPointObjectLocale,
  isPointObjectMarketKey,
  nominatimLocale,
  type PointObjectLocale,
  type PointObjectMarketKey
} from "@/src/lib/prototype/point-to-object-markets";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 12;
const GLOBAL_RATE_MAX_REQUESTS = 60;

type RateBucket = { startedAt: number; count: number };
const rateBuckets = new Map<string, RateBucket>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function previewRuntimeAllowed(): boolean {
  return getPointObjectPreviewSurfaceStatus().enabled;
}

function noStoreHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
    ...extra
  };
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
  const forwarded = request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "preview-anonymous";
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

function validBody(value: unknown): value is {
  caseKey: PointObjectMarketKey;
  longitude: number;
  latitude: number;
  locale: PointObjectLocale;
} {
  if (!isRecord(value) || Object.keys(value).some((key) => !["caseKey", "longitude", "latitude", "locale"].includes(key))) return false;
  return isPointObjectMarketKey(value.caseKey) &&
    typeof value.longitude === "number" && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180 &&
    typeof value.latitude === "number" && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    coordinatesMatchPointObjectMarket(value.caseKey, value.longitude, value.latitude) &&
    isPointObjectLocale(value.locale);
}

export async function POST(request: Request) {
  if (!previewRuntimeAllowed()) {
    return NextResponse.json({ mode: "unavailable", error: "Live object details are not available in this environment." }, {
      status: 403,
      headers: noStoreHeaders()
    });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ mode: "unavailable", error: "The live object request must originate from this application." }, {
      status: 403,
      headers: noStoreHeaders()
    });
  }
  const parsed = await readBoundedJson(request, 1_024);
  if (!parsed.ok || !validBody(parsed.value)) {
    return NextResponse.json({ mode: "unavailable", error: "A valid selected point is required." }, {
      status: parsed.ok ? 400 : parsed.status,
      headers: noStoreHeaders()
    });
  }
  const rate = consumeRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json({ mode: "unavailable", error: "Live object details are temporarily rate limited.", retryable: true }, {
      status: 429,
      headers: noStoreHeaders({ "Retry-After": String(rate.retryAfterSeconds) })
    });
  }

  try {
    const evidencePack = await buildLivePointObjectEvidencePack({
      longitude: parsed.value.longitude,
      latitude: parsed.value.latitude,
      locale: nominatimLocale(parsed.value.locale)
    });
    return NextResponse.json({
      mode: "resolved",
      subject: {
        name: evidencePack.selectedObject.name,
        address: evidencePack.selectedObject.displayAddress,
        featureClass: evidencePack.selectedObject.featureClass,
        sourceFeatureId: evidencePack.selectedObject.sourceFeatureId,
        geometryType: evidencePack.selectedObject.geometryType,
        coordinateAssociation: evidencePack.resolution.coordinateAssociation,
        resultCentroidDistanceM: evidencePack.resolution.resultCentroidDistanceM,
        addressParts: evidencePack.selectedObject.addressParts,
        tags: evidencePack.selectedObject.tags,
        metrics: evidencePack.selectedObject.metrics,
        geoContext: evidencePack.geoContext
      }
    }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof LivePointEvidenceError) {
      return NextResponse.json({ mode: "unavailable", error: error.message, retryable: error.retryable }, {
        status: error.httpStatus,
        headers: noStoreHeaders()
      });
    }
    return NextResponse.json({ mode: "unavailable", error: "Live object details could not be resolved.", retryable: true }, {
      status: 500,
      headers: noStoreHeaders()
    });
  }
}
