import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getPointObjectUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { resolvePointObjectAreaContext } from "@/src/lib/prototype/point-to-object-area-context";
import { parsePointObjectAreaContextRequest } from "@/src/lib/prototype/point-to-object-area-context-contract";
import {
  boundedPointObjectCreateAttemptTimeout,
  createProgramSeed,
  buildPointObjectCreateResponsesRequest,
  inferPromptMassingStyle,
  parsePointObjectCreateProgram,
  POINT_OBJECT_CREATE_PROMPT_VERSION,
  resolvePointObjectCreateModelProfile,
  selectPointObjectCreateRequestedParameters,
  validatePointObjectCreateLockedControlKeys,
  type PointObjectCreateControlKey,
  type PointObjectCreateDepth,
  type PointObjectCreateNumericControls,
  type PointObjectCreateRoutedProfile
} from "@/src/lib/prototype/point-to-object-create-ai-core";
import {
  bindPointObjectCreateProgramToPreflight,
  pointObjectCreatePreflightAllowsProvider,
  preflightPointObjectCreate
} from "@/src/lib/prototype/point-to-object-create-orchestration";
import {
  ConceptMassingError,
  generateConceptMassingAlternatives,
  type ConceptLocale,
  type ConceptTemplateId,
  type ValidatedRedevelopmentProgram
} from "@/src/lib/prototype/point-to-object-create";
import { isPointObjectMarketKey, type PointObjectMarketKey } from "@/src/lib/prototype/point-to-object-markets";
import {
  extractResponsesText,
  extractResponsesUsage,
  responseCompletionState,
  summarizePointObjectAiAttemptUsage,
  type PointObjectAiAttemptUsageInput
} from "@/src/lib/prototype/point-to-object-ai-core";
import { calculatePolygonMeasurements, validatePolygonVertices } from "@/src/lib/polygon-aoi";

export const runtime = "nodejs";
export const maxDuration = 120;

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const CHALLENGE_COOKIE = "geoai_p2o_create_challenge";
const CHALLENGE_TTL_SECONDS = 5 * 60;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 4;
// Defense in depth for one warm process only; this is not a distributed spend cap.
const GLOBAL_RATE_MAX_REQUESTS = 20;
const CREATE_TIMEOUT_MS = 95_000;
const CREATE_PREFLIGHT_BUDGET_MS = 8_000;
const CREATE_CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

type RateBucket = { startedAt: number; count: number };
const rateBuckets = new Map<string, RateBucket>();

type CreateRequest = {
  marketKey: PointObjectMarketKey;
  locale: ConceptLocale;
  depth: PointObjectCreateDepth;
  templateId: ConceptTemplateId;
  customPrompt: string | null;
  controls: PointObjectCreateNumericControls;
  lockedControlKeys?: PointObjectCreateControlKey[];
  aoiCoordinates: [number, number][][];
  challenge: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqualHex(left: string, right: string): boolean {
  return /^[a-f0-9]{64}$/.test(left) && /^[a-f0-9]{64}$/.test(right) && timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const item of cookie.split(";")) {
    const separator = item.indexOf("=");
    if (separator > 0 && item.slice(0, separator).trim() === name) return item.slice(separator + 1).trim();
  }
  return null;
}

function requestIsHttps(request: Request): boolean {
  return request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https" || new URL(request.url).protocol === "https:";
}

function challengeCookie(value: string, maxAge: number, secure: boolean): string {
  return [
    `${CHALLENGE_COOKIE}=${value}`,
    "Path=/api/prototype/point-to-object/create",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : ""
  ].filter(Boolean).join("; ");
}

function noStoreHeaders(request: Request, clear = false): Record<string, string> {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
    ...(clear ? { "Set-Cookie": challengeCookie("deleted", 0, requestIsHttps(request)) } : {})
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

function challengeIsValid(request: Request, challenge: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) return false;
  const cookie = cookieValue(request, CHALLENGE_COOKIE);
  if (!cookie) return false;
  const [expiresRaw, expectedHash] = cookie.split(".");
  return Number(expiresRaw) >= Date.now() && safeEqualHex(expectedHash ?? "", sha256(challenge));
}

function rateKey(request: Request): string {
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "preview-anonymous";
  return sha256(forwarded.split(",")[0]?.trim() || "preview-anonymous");
}

function consumeBucket(key: string, maxRequests: number): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(key);
  const bucket = rateBuckets.get(key);
  if (!bucket) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true };
  }
  if (bucket.count >= maxRequests) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - bucket.startedAt)) / 1_000)) };
  bucket.count += 1;
  return { allowed: true };
}

function consumeRateLimit(request: Request): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const client = consumeBucket(`client:${rateKey(request)}`, RATE_MAX_REQUESTS);
  return client.allowed ? consumeBucket("global", GLOBAL_RATE_MAX_REQUESTS) : client;
}

function runtimeAllowed(): boolean {
  return getPointObjectUpstreamStatus().enabled;
}

function validCoordinates(value: unknown): value is [number, number][][] {
  if (!Array.isArray(value) || value.length !== 1 || !Array.isArray(value[0]) || value[0].length < 4 || value[0].length > 26) return false;
  const ring = value[0];
  const coordinatesAreValid = ring.every((position) => Array.isArray(position) && position.length === 2 && position.every((number) => typeof number === "number" && Number.isFinite(number))) &&
    ring.every(([longitude, latitude]) => Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90);
  const first = ring[0];
  const last = ring.at(-1);
  return coordinatesAreValid && Boolean(first && last && first[0] === last[0] && first[1] === last[1]);
}

function validBody(value: unknown): value is CreateRequest {
  if (!isRecord(value) || Object.keys(value).some((key) => !["marketKey", "locale", "depth", "templateId", "customPrompt", "controls", "lockedControlKeys", "aoiCoordinates", "challenge"].includes(key))) return false;
  if (!isRecord(value.controls) || Object.keys(value.controls).some((key) => !["blockCount", "levelsMin", "levelsMax", "targetSiteCoveragePct", "openSpacePct", "setbackM"].includes(key))) return false;
  const controls = value.controls;
  const validLocks = validatePointObjectCreateLockedControlKeys(value.lockedControlKeys).ok;
  return validLocks && isPointObjectMarketKey(value.marketKey) &&
    (value.locale === "en" || value.locale === "ru") &&
    (value.depth === "quick" || value.depth === "standard" || value.depth === "deep") &&
    (value.templateId === "residential_mixed_use" || value.templateId === "commercial_hub" || value.templateId === "civic_green") &&
    (value.customPrompt === null || (typeof value.customPrompt === "string" && value.customPrompt.trim().length <= 600)) &&
    typeof controls.blockCount === "number" && Number.isInteger(controls.blockCount) && controls.blockCount >= 1 && controls.blockCount <= 12 &&
    typeof controls.levelsMin === "number" && Number.isInteger(controls.levelsMin) && controls.levelsMin >= 1 && controls.levelsMin <= 80 &&
    typeof controls.levelsMax === "number" && Number.isInteger(controls.levelsMax) && controls.levelsMax >= controls.levelsMin && controls.levelsMax <= 80 &&
    typeof controls.targetSiteCoveragePct === "number" && controls.targetSiteCoveragePct >= 8 && controls.targetSiteCoveragePct <= 60 &&
    typeof controls.openSpacePct === "number" && controls.openSpacePct >= 15 && controls.openSpacePct <= 75 &&
    typeof controls.setbackM === "number" && controls.setbackM >= 2 && controls.setbackM <= 30 &&
    validCoordinates(value.aoiCoordinates) &&
    typeof value.challenge === "string" && value.challenge.length <= 100;
}

function profileFor(depth: PointObjectCreateDepth): PointObjectCreateRoutedProfile | null {
  const configured = process.env[`OPENAI_MODEL_POINT_OBJECT_CREATE_${depth.toUpperCase()}`]?.trim();
  return resolvePointObjectCreateModelProfile(depth, configured);
}

function aoiDimensions(ring: [number, number][]) {
  const measurements = calculatePolygonMeasurements(ring.slice(0, -1));
  const [west, south, east, north] = measurements.bbox;
  const latitude = measurements.centroid.latitude * Math.PI / 180;
  return {
    measurements,
    widthM: Math.abs(east - west) * 111_320 * Math.cos(latitude),
    heightM: Math.abs(north - south) * 110_540
  };
}

function requireRequestedParameters(
  program: ReturnType<typeof parsePointObjectCreateProgram>,
  controls: Partial<CreateRequest["controls"]>,
  massingStyle: ReturnType<typeof inferPromptMassingStyle>,
  useMix: ValidatedRedevelopmentProgram["useMix"] | null
): ReturnType<typeof parsePointObjectCreateProgram> {
  if (!program.ok) return program;
  const mismatches: string[] = (Object.keys(controls) as Array<keyof CreateRequest["controls"]>)
    .filter((key) => program.value[key] !== controls[key]);
  if (massingStyle !== null && program.value.massingStyle !== massingStyle) mismatches.push("massingStyle");
  if (useMix !== null && JSON.stringify(program.value.useMix) !== JSON.stringify(useMix)) mismatches.push("useMix");
  return mismatches.length
    ? { ok: false, errors: [`AI response changed requested parameters: ${mismatches.join(", ")}.`] }
    : program;
}

function requestedParameters(body: CreateRequest): Partial<CreateRequest["controls"]> | null {
  const locked = validatePointObjectCreateLockedControlKeys(body.lockedControlKeys);
  if (!locked.ok) return null;
  return selectPointObjectCreateRequestedParameters(body.controls, locked.value);
}

class PointObjectCreateProviderError extends Error {
  constructor(
    public readonly code: "rate_limited" | "provider_rejected",
    public readonly requestId: string | null,
    public readonly usage: ReturnType<typeof extractResponsesUsage>
  ) {
    super(code);
    this.name = "PointObjectCreateProviderError";
  }
}

async function callOpenAi(body: ReturnType<typeof buildPointObjectCreateResponsesRequest>, apiKey: string, timeoutMs: number) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null) as unknown;
  const requestId = response.headers.get("x-request-id");
  if (!response.ok) {
    throw new PointObjectCreateProviderError(
      response.status === 429 ? "rate_limited" : "provider_rejected",
      requestId,
      extractResponsesUsage(payload)
    );
  }
  return { payload, requestId };
}

function requireCreateAttemptTimeout(requestedMs: number, deadlineMs: number): number {
  const timeoutMs = boundedPointObjectCreateAttemptTimeout(requestedMs, deadlineMs);
  if (timeoutMs !== null) return timeoutMs;
  const error = new Error("create_timeout_budget_exhausted");
  error.name = "TimeoutError";
  throw error;
}

export async function GET(request: Request) {
  if (!runtimeAllowed()) {
    return NextResponse.json({ mode: "unavailable", error: "Concept generation is not available in this environment." }, { status: 403, headers: noStoreHeaders(request) });
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ mode: "unavailable", error: "Cross-site activation is not allowed." }, { status: 403, headers: noStoreHeaders(request) });
  }
  const challenge = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + CHALLENGE_TTL_SECONDS * 1_000;
  return NextResponse.json({ mode: "ready", challenge, expiresInSeconds: CHALLENGE_TTL_SECONDS }, {
    headers: {
      ...noStoreHeaders(request),
      "Set-Cookie": challengeCookie(`${expiresAt}.${sha256(challenge)}`, CHALLENGE_TTL_SECONDS, requestIsHttps(request))
    }
  });
}

export async function POST(request: Request) {
  if (!runtimeAllowed()) {
    return NextResponse.json({ mode: "unavailable", error: "Concept generation is not available in this environment." }, { status: 403, headers: noStoreHeaders(request, true) });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ mode: "unavailable", error: "Concept generation must originate from this application." }, { status: 403, headers: noStoreHeaders(request, true) });
  }
  const parsed = await readBoundedJson(request, 20 * 1_024);
  if (!parsed.ok || !validBody(parsed.value) || !challengeIsValid(request, parsed.ok && isRecord(parsed.value) && typeof parsed.value.challenge === "string" ? parsed.value.challenge : "")) {
    return NextResponse.json({ mode: "unavailable", error: "A valid bounded AOI and browser challenge are required." }, { status: parsed.ok ? 400 : parsed.status, headers: noStoreHeaders(request, true) });
  }
  const rate = consumeRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json({ mode: "unavailable", error: "Concept generation is temporarily rate limited.", retryAfterSeconds: rate.retryAfterSeconds }, { status: 429, headers: { ...noStoreHeaders(request, true), "Retry-After": String(rate.retryAfterSeconds) } });
  }

  const body = parsed.value;
  const openRing = body.aoiCoordinates[0].slice(0, -1);
  const validation = validatePolygonVertices(openRing);
  if (!validation.valid || !validation.measurements || validation.measurements.areaSqM > 1_000_000) {
    return NextResponse.json({ mode: "unavailable", error: body.locale === "ru" ? "Полигон должен быть корректным и не превышать 1 км²." : "The polygon must be valid and no larger than 1 sq km." }, { status: 400, headers: noStoreHeaders(request, true) });
  }
  const areaContextRequest = parsePointObjectAreaContextRequest({
    marketKey: body.marketKey,
    locale: body.locale,
    aoiCoordinates: body.aoiCoordinates
  });
  if (!areaContextRequest.ok) {
    return NextResponse.json({ mode: "unavailable", error: body.locale === "ru" ? "Полигон должен находиться внутри выбранного города." : "The polygon must stay inside the selected market." }, { status: 400, headers: noStoreHeaders(request, true) });
  }
  if (body.controls.targetSiteCoveragePct + body.controls.openSpacePct > 100) {
    return NextResponse.json({
      mode: "unavailable",
      error: body.locale === "ru"
        ? "Сумма плотности застройки и открытых пространств не должна превышать 100%."
        : "Site coverage and open-space share must not exceed 100% together."
    }, { status: 422, headers: noStoreHeaders(request, true) });
  }
  const lockedParameters = requestedParameters(body);
  const lockedControlKeys = validatePointObjectCreateLockedControlKeys(body.lockedControlKeys);
  if (!lockedControlKeys.ok) {
    return NextResponse.json({ mode: "unavailable", error: "The fixed-parameter contract is invalid." }, { status: 400, headers: noStoreHeaders(request, true) });
  }
  const promptStyle = inferPromptMassingStyle(body.customPrompt);
  if (promptStyle === "courtyard" && typeof lockedParameters?.blockCount === "number" && lockedParameters.blockCount < 4) {
    return NextResponse.json({ mode: "unavailable", error: body.locale === "ru" ? "Для дворовой композиции нужно не менее четырёх корпусов." : "A courtyard needs at least four primary wings." }, { status: 422, headers: noStoreHeaders(request, true) });
  }
  if (promptStyle === "towers_on_podium" && lockedParameters?.levelsMin === 1) {
    return NextResponse.json({ mode: "unavailable", error: body.locale === "ru" ? "Для башен на подиуме задайте высоту основных объёмов не менее двух этажей." : "Towers on a podium require primary heights of at least two levels." }, { status: 422, headers: noStoreHeaders(request, true) });
  }

  const startedAt = Date.now();
  const deadline = startedAt + CREATE_TIMEOUT_MS;
  const aoiHash = sha256(JSON.stringify(body.aoiCoordinates));
  const preflight = preflightPointObjectCreate({
    aoiCoordinates: body.aoiCoordinates,
    aoiHash,
    locale: body.locale,
    templateId: body.templateId,
    customPrompt: body.customPrompt,
    controls: body.controls,
    lockedControlKeys: lockedControlKeys.value
  });
  const geometryPreflightMs = Date.now() - startedAt;
  if (geometryPreflightMs > CREATE_PREFLIGHT_BUDGET_MS) {
    return NextResponse.json({
      mode: "unavailable",
      error: body.locale === "ru"
        ? "Проверка геометрии превысила ограниченный бюджет времени. Измените параметры или повторите позже."
        : "Geometry preflight exceeded its bounded time budget. Adjust the parameters or try again later.",
      telemetry: {
        attempts: 0,
        providerCalls: 0,
        inputTokens: 0,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        stored: false,
        toolCalls: 0,
        geometryPreflightMs
      }
    }, { status: 504, headers: noStoreHeaders(request, true) });
  }
  if (!pointObjectCreatePreflightAllowsProvider(preflight)) {
    if (preflight.kind === "suggestion") {
      return NextResponse.json({
        mode: "programme_adjustment_required",
        error: body.locale === "ru"
          ? "Заданные параметры не разместились в ограниченном поиске. Найден проверенный вариант с меньшей целевой застройкой."
          : "The requested parameters did not fit in the bounded search. A validated lower site-coverage target is available.",
        suggestion: preflight.suggestion,
        telemetry: {
          attempts: 0,
          providerCalls: 0,
          inputTokens: 0,
          cachedInputTokens: 0,
          cacheWriteTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          stored: false,
          toolCalls: 0,
          geometryPreflightMs
        },
        caveat: CREATE_CAVEAT
      }, { status: 422, headers: noStoreHeaders(request, true) });
    }
    return NextResponse.json({
      mode: "unavailable",
      error: body.locale === "ru"
        ? "Ограниченный поиск не нашёл проверенную геометрию для этих параметров. Уменьшите застройку, число корпусов или отступ и повторите."
        : "The bounded search found no validated geometry for these parameters. Reduce coverage, building count or setback and try again.",
      telemetry: {
        attempts: 0,
        providerCalls: 0,
        inputTokens: 0,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        stored: false,
        toolCalls: 0,
        geometryPreflightMs
      }
    }, { status: 422, headers: noStoreHeaders(request, true) });
  }

  const profile = profileFor(body.depth);
  if (!profile) return NextResponse.json({ mode: "unavailable", error: "Concept generation model routing is not configured safely." }, { status: 503, headers: noStoreHeaders(request, true) });
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ mode: "unavailable", error: "Concept generation is not configured." }, { status: 503, headers: noStoreHeaders(request, true) });
  const dimensions = aoiDimensions(body.aoiCoordinates[0]);
  const areaContext = await resolvePointObjectAreaContext(areaContextRequest.value).catch(() => null);
  const input = {
    locale: body.locale,
    templateId: body.templateId,
    customPrompt: body.customPrompt,
    aoiAreaSqM: dimensions.measurements.areaSqM,
    aoiWidthM: dimensions.widthM,
    aoiHeightM: dimensions.heightM,
    areaContext: areaContext ? {
      sampleSize: areaContext.summary.sampleSize,
      mappedBuildingCount: areaContext.summary.mappedBuildingCount,
      mappedLevelsKnownCount: areaContext.summary.mappedLevelsKnownCount,
      medianMappedLevels: areaContext.summary.medianMappedLevels,
      groups: areaContext.summary.groups.slice(0, 8),
      capReached: areaContext.coverage.capReached,
      inclusionMethod: areaContext.coverage.inclusionMethod,
      completeInventory: areaContext.coverage.completeInventory
    } : null,
    requestedParameters: lockedParameters,
    requestedMassingStyle: preflight.kind === "ready" ? preflight.program.massingStyle : promptStyle,
    requestedUseMix: preflight.kind === "ready" ? preflight.program.useMix : null
  };

  const attemptUsage: PointObjectAiAttemptUsageInput[] = [];
  let activeAttemptProfile: PointObjectCreateRoutedProfile = profile;
  const callTrackedOpenAi = async (
    requestBody: ReturnType<typeof buildPointObjectCreateResponsesRequest>,
    attemptProfile: PointObjectCreateRoutedProfile,
    purpose: PointObjectAiAttemptUsageInput["purpose"],
    timeoutMs: number
  ) => {
    const index = attemptUsage.push({
      purpose,
      model: attemptProfile.model,
      reasoningEffort: attemptProfile.reasoningEffort,
      requestId: null,
      usage: extractResponsesUsage(null)
    }) - 1;
    try {
      const attempt = await callOpenAi(requestBody, apiKey, timeoutMs);
      attemptUsage[index] = {
        purpose,
        model: attemptProfile.model,
        reasoningEffort: attemptProfile.reasoningEffort,
        requestId: attempt.requestId,
        usage: extractResponsesUsage(attempt.payload)
      };
      return attempt;
    } catch (error) {
      if (error instanceof PointObjectCreateProviderError) {
        attemptUsage[index] = {
          purpose,
          model: attemptProfile.model,
          reasoningEffort: attemptProfile.reasoningEffort,
          requestId: error.requestId,
          usage: error.usage
        };
      }
      throw error;
    }
  };
  const failureTelemetry = () => {
    if (attemptUsage.length === 0) return null;
    return {
      model: activeAttemptProfile.model,
      reasoningEffort: activeAttemptProfile.reasoningEffort,
      latencyMs: Date.now() - startedAt,
      attempts: attemptUsage.length,
      ...summarizePointObjectAiAttemptUsage(attemptUsage),
      stored: false,
      toolCalls: 0
    };
  };
  try {
    let attempt = await callTrackedOpenAi(
      buildPointObjectCreateResponsesRequest(input, profile),
      profile,
      "initial",
      requireCreateAttemptTimeout(profile.timeoutMs, deadline)
    );
    let completion = responseCompletionState(attempt.payload);
    let program = completion === "complete"
      ? requireRequestedParameters(parsePointObjectCreateProgram(extractResponsesText(attempt.payload), body.templateId, body.locale), lockedParameters ?? {}, input.requestedMassingStyle, input.requestedUseMix)
      : { ok: false as const, errors: [`Response state: ${completion}`] };
    let attempts = 1;
    if (!program.ok) {
      attempts = 2;
      const repairProfile = { ...profile, reasoningEffort: "medium" as const };
      activeAttemptProfile = repairProfile;
      attempt = await callTrackedOpenAi(
        buildPointObjectCreateResponsesRequest(input, repairProfile, program.errors),
        repairProfile,
        "repair",
        requireCreateAttemptTimeout(35_000, deadline)
      );
      completion = responseCompletionState(attempt.payload);
      program = completion === "complete"
        ? requireRequestedParameters(parsePointObjectCreateProgram(extractResponsesText(attempt.payload), body.templateId, body.locale), lockedParameters ?? {}, input.requestedMassingStyle, input.requestedUseMix)
        : { ok: false as const, errors: [`Response state: ${completion}`] };
    }
    if (!program.ok) return NextResponse.json({ mode: "unavailable", error: body.locale === "ru" ? "Не удалось сформировать корректную концепцию. Попробуйте ещё раз." : "A valid concept could not be generated. Please try again.", telemetry: failureTelemetry() }, { status: 502, headers: noStoreHeaders(request, true) });

    const boundProgram = bindPointObjectCreateProgramToPreflight(program.value, preflight);
    const seed = createProgramSeed(boundProgram, aoiHash);
    const alternatives = preflight.kind === "ready"
      ? preflight.alternatives
      : generateConceptMassingAlternatives(body.aoiCoordinates, boundProgram, seed, body.locale);
    const massing = alternatives[0]?.massing;
    if (!massing || massing.generatedBlockCount < 1) return NextResponse.json({ mode: "unavailable", error: body.locale === "ru" ? "Для выбранного полигона не удалось разместить объекты. Увеличьте зону или уменьшите параметры." : "No concept blocks fit inside this polygon. Enlarge the AOI or reduce the programme.", telemetry: failureTelemetry() }, { status: 422, headers: noStoreHeaders(request, true) });

    const usage = summarizePointObjectAiAttemptUsage(attemptUsage);
    return NextResponse.json({
      mode: "openai_concept",
      generatedAt: new Date().toISOString(),
      promptVersion: POINT_OBJECT_CREATE_PROMPT_VERSION,
      program: boundProgram,
      massing,
      alternatives,
      telemetry: {
        model: profile.model,
        reasoningEffort: profile.reasoningEffort,
        requestId: attempt.requestId,
        latencyMs: Date.now() - startedAt,
        attempts,
        ...usage,
        stored: false,
        toolCalls: 0
      },
      areaContextUsed: areaContext ? {
        sourceResponseHash: areaContext.source.sourceResponseHash,
        sampleSize: areaContext.summary.sampleSize,
        mappedBuildingCount: areaContext.summary.mappedBuildingCount,
        capReached: areaContext.coverage.capReached,
        inclusionMethod: areaContext.coverage.inclusionMethod,
        completeInventory: areaContext.coverage.completeInventory
      } : null,
      caveat: CREATE_CAVEAT
    }, { headers: noStoreHeaders(request, true) });
  } catch (error) {
    if (error instanceof ConceptMassingError) {
      const translated = body.locale === "ru"
        ? error.code === "courtyard_requires_four_blocks"
          ? "Для дворовой композиции нужно не менее четырёх корпусов."
          : error.code === "tower_height_incompatible"
            ? "Для башен на подиуме задайте высоту основных объёмов не менее двух этажей."
            : "Заданная композиция не помещается внутри зоны с выбранными отступами. Уменьшите число корпусов, покрытие или отступ."
        : error.code === "geometry_validation_failed"
          ? "The generated geometry did not pass spatial validation. Adjust the programme or AOI."
          : error.message;
      return NextResponse.json({ mode: "unavailable", error: translated, telemetry: failureTelemetry() }, { status: 422, headers: noStoreHeaders(request, true) });
    }
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    const rateLimited = error instanceof PointObjectCreateProviderError && error.code === "rate_limited";
    return NextResponse.json({
      mode: "unavailable",
      error: body.locale === "ru"
        ? timedOut ? "Создание концепции заняло слишком много времени. Попробуйте ещё раз." : rateLimited ? "Сервис временно ограничил частоту запросов." : "Сервис создания концепции временно недоступен."
        : timedOut ? "Concept generation timed out. Please try again." : rateLimited ? "Concept generation is temporarily rate limited." : "Concept generation is temporarily unavailable.",
      telemetry: failureTelemetry()
    }, { status: timedOut ? 504 : rateLimited ? 429 : 502, headers: noStoreHeaders(request, true) });
  }
}
