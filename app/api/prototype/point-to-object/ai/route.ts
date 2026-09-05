import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getPointObjectPreviewUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import {
  generatePointObjectAiAnalysis,
  PointObjectAiServiceError
} from "@/src/lib/prototype/point-to-object-ai";
import type {
  PointObjectAnalysisDepth,
  PointObjectAnalysisGoal,
  PointObjectAnalysisHorizon,
  PointObjectAnalysisPerspective,
  PointObjectAnalysisRequest
} from "@/src/lib/prototype/point-to-object-ai-core";
import {
  buildLivePointObjectEvidencePack as buildPointObjectEvidencePack,
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
export const maxDuration = 120;

const CHALLENGE_COOKIE = "geoai_p2o_ai_challenge";
const CHALLENGE_TTL_SECONDS = 5 * 60;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 4;
const GLOBAL_RATE_MAX_REQUESTS = 20;
const ROUTE_SAFE_BUDGET_MS = 115_000;

type RateBucket = { startedAt: number; count: number };
const rateBuckets = new Map<string, RateBucket>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAnalysisDepth(value: unknown): value is PointObjectAnalysisDepth {
  return value === "quick" || value === "standard" || value === "deep";
}

function isAnalysisGoal(value: unknown): value is PointObjectAnalysisGoal {
  return value === "object_profile" || value === "development_screening" || value === "redevelopment" || value === "due_diligence" || value === "custom";
}

function isAnalysisPerspective(value: unknown): value is PointObjectAnalysisPerspective {
  return value === "developer" || value === "investor" || value === "asset_owner";
}

function isAnalysisHorizon(value: unknown): value is PointObjectAnalysisHorizon {
  return value === "current" || value === "one_to_three_years" || value === "long_term";
}

function previewRuntimeAllowed(): boolean {
  return process.env.VERCEL_ENV === "preview" && getPointObjectPreviewUpstreamStatus().enabled;
}

function noStoreHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
    ...extra
  };
}

function challengeCookie(value: string, maxAge: number, secure: boolean): string {
  return [
    `${CHALLENGE_COOKIE}=${value}`,
    "Path=/api/prototype/point-to-object/ai",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : ""
  ].filter(Boolean).join("; ");
}

function requestIsHttps(request: Request): boolean {
  return request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https" ||
    new URL(request.url).protocol === "https:";
}

function clearChallengeHeader(request: Request): Record<string, string> {
  return noStoreHeaders({
    "Set-Cookie": challengeCookie("deleted", 0, requestIsHttps(request))
  });
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const item of cookie.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() === name) return item.slice(separator + 1).trim();
  }
  return null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function challengeIsValid(request: Request, challenge: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) return false;
  const cookie = cookieValue(request, CHALLENGE_COOKIE);
  if (!cookie) return false;
  const [expiresRaw, expectedHash] = cookie.split(".");
  const expiresAt = Number(expiresRaw);
  return Number.isSafeInteger(expiresAt) && expiresAt >= Date.now() && safeEqualHex(expectedHash ?? "", sha256(challenge));
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
  const forwarded = request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "preview-anonymous";
  const address = forwarded.split(",")[0]?.trim() || "preview-anonymous";
  return sha256(address);
}

function consumeBucket(
  key: string,
  maxRequests: number
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(key);
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
  depth: PointObjectAnalysisDepth;
  goal: PointObjectAnalysisGoal;
  perspective: PointObjectAnalysisPerspective;
  horizon: PointObjectAnalysisHorizon;
  question: string | null;
  expectedSourceFeatureId: string | null;
  consent: true;
  challenge: string;
} {
  if (!isRecord(value) || Object.keys(value).some((key) =>
    !["caseKey", "longitude", "latitude", "locale", "depth", "goal", "perspective", "horizon", "question", "expectedSourceFeatureId", "consent", "challenge"].includes(key))) return false;
  const questionValid = value.question === null || (
    typeof value.question === "string" &&
    value.question.trim().length >= 1 &&
    value.question.trim().length <= 500
  );
  return isPointObjectMarketKey(value.caseKey) &&
    typeof value.longitude === "number" && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180 &&
    typeof value.latitude === "number" && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    coordinatesMatchPointObjectMarket(value.caseKey, value.longitude, value.latitude) &&
    isPointObjectLocale(value.locale) &&
    isAnalysisDepth(value.depth) &&
    isAnalysisGoal(value.goal) &&
    isAnalysisPerspective(value.perspective) &&
    isAnalysisHorizon(value.horizon) &&
    questionValid &&
    (value.goal !== "custom" || value.question !== null) &&
    (value.expectedSourceFeatureId === null || (typeof value.expectedSourceFeatureId === "string" && /^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(value.expectedSourceFeatureId))) &&
    value.consent === true && typeof value.challenge === "string" && value.challenge.length <= 100;
}

export async function GET(request: Request) {
  if (!previewRuntimeAllowed()) {
    return NextResponse.json({ mode: "unavailable", code: "AI_PREVIEW_ONLY", error: "AI analysis is not available in this environment." }, {
      status: 403,
      headers: noStoreHeaders()
    });
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ mode: "unavailable", code: "AI_ORIGIN_REJECTED", error: "Cross-site AI activation is not allowed." }, {
      status: 403,
      headers: noStoreHeaders()
    });
  }
  const challenge = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + CHALLENGE_TTL_SECONDS * 1000;
  return NextResponse.json({ mode: "ready", challenge, expiresInSeconds: CHALLENGE_TTL_SECONDS }, {
    headers: noStoreHeaders({
      "Set-Cookie": challengeCookie(`${expiresAt}.${sha256(challenge)}`, CHALLENGE_TTL_SECONDS, requestIsHttps(request))
    })
  });
}

export async function POST(request: Request) {
  const routeDeadline = Date.now() + ROUTE_SAFE_BUDGET_MS;
  if (!previewRuntimeAllowed()) {
    return NextResponse.json({ mode: "unavailable", code: "AI_PREVIEW_ONLY", error: "AI analysis is not available in this environment." }, {
      status: 403,
      headers: clearChallengeHeader(request)
    });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ mode: "unavailable", code: "AI_ORIGIN_REJECTED", error: "The grounded AI request must originate from this application." }, {
      status: 403,
      headers: clearChallengeHeader(request)
    });
  }
  const parsed = await readBoundedJson(request, 4 * 1024);
  if (!parsed.ok || !validBody(parsed.value)) {
    return NextResponse.json({ mode: "unavailable", code: "AI_REQUEST_INVALID", error: "A bounded resolved point, explicit consent and browser challenge are required." }, {
      status: parsed.ok ? 400 : parsed.status,
      headers: clearChallengeHeader(request)
    });
  }
  const body = parsed.value;
  if (!challengeIsValid(request, body.challenge)) {
    return NextResponse.json({ mode: "unavailable", code: "AI_CHALLENGE_INVALID", error: "The one-time browser challenge is missing or expired." }, {
      status: 403,
      headers: clearChallengeHeader(request)
    });
  }
  const rate = consumeRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json({ mode: "unavailable", code: "AI_RATE_LIMITED", error: "The AI request limit has been reached temporarily.", retryable: true }, {
      status: 429,
      headers: { ...clearChallengeHeader(request), "Retry-After": String(rate.retryAfterSeconds) }
    });
  }

  try {
    const evidencePack = await buildPointObjectEvidencePack({
      longitude: body.longitude,
      latitude: body.latitude,
      locale: nominatimLocale(body.locale),
      osmFeatureId: body.expectedSourceFeatureId
    });
    if (body.expectedSourceFeatureId && body.expectedSourceFeatureId !== evidencePack.selectedObject.sourceFeatureId) {
      return NextResponse.json({
        mode: "unavailable",
        code: "AI_OBJECT_CHANGED",
        error: "The open-map object changed after selection. Return to the map and select it again.",
        retryable: true
      }, {
        status: 409,
        headers: clearChallengeHeader(request)
      });
    }
    const analysisRequest: PointObjectAnalysisRequest = {
      depth: body.depth,
      goal: body.goal,
      perspective: body.perspective,
      horizon: body.horizon,
      question: body.question?.trim() || null,
      locale: body.locale
    };
    const result = await generatePointObjectAiAnalysis(evidencePack, analysisRequest, routeDeadline);
    return NextResponse.json({
      ...result,
      subject: {
        name: evidencePack.selectedObject.name,
        address: evidencePack.selectedObject.displayAddress,
        featureClass: evidencePack.selectedObject.featureClass,
        sourceFeatureId: evidencePack.selectedObject.sourceFeatureId,
        resolutionMethod: evidencePack.resolution.matchMethod,
        coordinateAssociation: evidencePack.resolution.coordinateAssociation,
        sourceLabel: evidencePack.source.attribution,
        geometryType: evidencePack.selectedObject.geometryType,
        resultCentroidDistanceM: evidencePack.resolution.resultCentroidDistanceM,
        addressParts: evidencePack.selectedObject.addressParts,
        tags: evidencePack.selectedObject.tags,
        metrics: evidencePack.selectedObject.metrics,
        geoContext: evidencePack.geoContext
      }
    }, { headers: clearChallengeHeader(request) });
  } catch (error) {
    if (error instanceof LivePointEvidenceError) {
      return NextResponse.json({ mode: "unavailable", code: error.code, error: error.message, retryable: error.retryable }, {
        status: error.httpStatus,
        headers: clearChallengeHeader(request)
      });
    }
    if (error instanceof PointObjectAiServiceError) {
      return NextResponse.json({
        mode: "unavailable",
        code: error.code,
        error: error.message,
        retryable: error.httpStatus === 429 || error.httpStatus >= 500
      }, {
        status: error.httpStatus,
        headers: clearChallengeHeader(request)
      });
    }
    return NextResponse.json({ mode: "unavailable", code: "AI_INTERNAL_ERROR", error: "Grounded AI failed closed." }, {
      status: 500,
      headers: clearChallengeHeader(request)
    });
  }
}
