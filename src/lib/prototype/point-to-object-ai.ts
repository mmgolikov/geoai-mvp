import "server-only";

import { getPointObjectPreviewUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";
import {
  POINT_OBJECT_AI_PROMPT_VERSION,
  buildPointObjectResponsesRequest,
  estimatePointObjectAiCost,
  extractResponsesText,
  extractResponsesUsage,
  responseCompletionState,
  validatePointObjectAiContentDetailed,
  type PointObjectAiResult,
  type PointObjectAiValidationCode,
  type PointObjectAiValidationResult,
  type PointObjectAnalysisDepth,
  type PointObjectAnalysisRequest,
  type PointObjectModelProfile
} from "./point-to-object-ai-core";
import type { GroundablePointObjectEvidencePack } from "./point-to-object-live-evidence";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const GENERATION_BUDGET_MS = 108_000;
const MINIMUM_ATTEMPT_BUDGET_MS = 5_000;

type ModelTier = "luna" | "terra" | "sol";
type AttemptKind = "initial" | "focused" | "repair";

type RoutedProfile = PointObjectModelProfile & {
  timeoutMs: number;
  minimumTier: ModelTier;
  envNames: readonly string[];
};

type AttemptUsage = ReturnType<typeof extractResponsesUsage>;

type UsageAccumulator = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputComplete: boolean;
  outputComplete: boolean;
  totalComplete: boolean;
  estimatedCostUsd: number;
  costComplete: boolean;
  costRateSources: Set<string>;
};

const MODEL_TIER_RANK: Record<ModelTier, number> = { luna: 0, terra: 1, sol: 2 };
const SAFE_GPT_56_MODEL = /^gpt-5\.6-(luna|terra|sol)(?:-\d{4}-\d{2}-\d{2})?$/;

const DEFAULT_PROFILES: Record<AttemptKind, Record<PointObjectAnalysisDepth, Omit<RoutedProfile, "envNames">>> = {
  initial: {
    quick: {
      model: "gpt-5.6-luna",
      reasoningEffort: "low",
      verbosity: "low",
      maxOutputTokens: 2_800,
      timeoutMs: 18_000,
      minimumTier: "luna"
    },
    standard: {
      model: "gpt-5.6-terra",
      reasoningEffort: "medium",
      verbosity: "medium",
      maxOutputTokens: 5_000,
      timeoutMs: 50_000,
      minimumTier: "terra"
    },
    deep: {
      model: "gpt-5.6-sol",
      reasoningEffort: "high",
      verbosity: "high",
      maxOutputTokens: 7_500,
      timeoutMs: 70_000,
      minimumTier: "sol"
    }
  },
  focused: {
    quick: {
      model: "gpt-5.6-terra",
      reasoningEffort: "low",
      verbosity: "medium",
      maxOutputTokens: 3_500,
      timeoutMs: 22_000,
      minimumTier: "terra"
    },
    standard: {
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      verbosity: "high",
      maxOutputTokens: 6_000,
      timeoutMs: 60_000,
      minimumTier: "sol"
    },
    deep: {
      model: "gpt-5.6-sol",
      reasoningEffort: "high",
      verbosity: "high",
      maxOutputTokens: 8_000,
      timeoutMs: 75_000,
      minimumTier: "sol"
    }
  },
  repair: {
    quick: {
      model: "gpt-5.6-terra",
      reasoningEffort: "low",
      verbosity: "medium",
      maxOutputTokens: 3_500,
      timeoutMs: 22_000,
      minimumTier: "terra"
    },
    standard: {
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      verbosity: "high",
      maxOutputTokens: 6_500,
      timeoutMs: 50_000,
      minimumTier: "sol"
    },
    deep: {
      model: "gpt-5.6-sol",
      reasoningEffort: "xhigh",
      verbosity: "high",
      maxOutputTokens: 9_000,
      timeoutMs: 55_000,
      minimumTier: "sol"
    }
  }
};

export type PointObjectAiErrorCode =
  | "AI_PREVIEW_ONLY"
  | "AI_NOT_CONFIGURED"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_REJECTED"
  | "AI_REFUSED"
  | "AI_OUTPUT_INCOMPLETE"
  | "AI_OUTPUT_INVALID";

export class PointObjectAiServiceError extends Error {
  constructor(
    public readonly code: PointObjectAiErrorCode,
    public readonly httpStatus: number,
    message: string
  ) {
    super(message);
    this.name = "PointObjectAiServiceError";
  }
}

function modelTier(model: string): ModelTier | null {
  const match = SAFE_GPT_56_MODEL.exec(model);
  return match ? match[1] as ModelTier : null;
}

function routeEnvNames(kind: AttemptKind, depth: PointObjectAnalysisDepth): readonly string[] {
  const suffix = depth.toUpperCase();
  if (kind === "initial") return [`OPENAI_MODEL_POINT_OBJECT_${suffix}`];
  if (kind === "focused") return [`OPENAI_MODEL_POINT_OBJECT_FOCUSED_${suffix}`];
  return [`OPENAI_MODEL_POINT_OBJECT_REPAIR_${suffix}`, "OPENAI_MODEL_POINT_OBJECT_REPAIR"];
}

function routedModel(profile: RoutedProfile): string {
  const configured = profile.envNames
    .map((name) => process.env[name]?.trim())
    .find((value): value is string => Boolean(value));
  if (!configured) return profile.model;

  const tier = modelTier(configured);
  if (!tier || MODEL_TIER_RANK[tier] < MODEL_TIER_RANK[profile.minimumTier]) {
    throw new PointObjectAiServiceError(
      "AI_NOT_CONFIGURED",
      503,
      "AI model routing is not configured for this analysis level."
    );
  }
  return configured;
}

function profileFor(request: PointObjectAnalysisRequest, kind: AttemptKind): RoutedProfile {
  const profile = DEFAULT_PROFILES[kind][request.depth];
  const routed: RoutedProfile = { ...profile, envNames: routeEnvNames(kind, request.depth) };
  return { ...routed, model: routedModel(routed) };
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function addUsage(accumulator: UsageAccumulator, model: string, usage: AttemptUsage): void {
  if (usage.inputTokens === null) accumulator.inputComplete = false;
  else accumulator.inputTokens += usage.inputTokens;
  if (usage.outputTokens === null) accumulator.outputComplete = false;
  else accumulator.outputTokens += usage.outputTokens;

  const derivedTotal = usage.totalTokens ?? (
    usage.inputTokens !== null && usage.outputTokens !== null
      ? usage.inputTokens + usage.outputTokens
      : null
  );
  if (derivedTotal === null) accumulator.totalComplete = false;
  else accumulator.totalTokens += derivedTotal;

  const cost = estimatePointObjectAiCost(model, usage.inputTokens, usage.outputTokens);
  if (cost.estimatedCostUsd === null || cost.costRateSource === null) {
    accumulator.costComplete = false;
    return;
  }
  accumulator.estimatedCostUsd += cost.estimatedCostUsd;
  accumulator.costRateSources.add(cost.costRateSource);
}

function timeoutFor(profile: RoutedProfile, deadline: number): number {
  const remaining = deadline - Date.now();
  if (remaining < MINIMUM_ATTEMPT_BUDGET_MS) {
    throw new PointObjectAiServiceError("AI_TIMEOUT", 504, "AI analysis exceeded its safe time budget.");
  }
  return Math.min(profile.timeoutMs, remaining);
}

async function requestOpenAi(
  apiKey: string,
  evidencePack: GroundablePointObjectEvidencePack,
  request: PointObjectAnalysisRequest,
  profile: RoutedProfile,
  deadline: number,
  repairCode: PointObjectAiValidationCode | null
): Promise<{ payload: unknown; requestId: string | null }> {
  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      signal: AbortSignal.timeout(timeoutFor(profile, deadline)),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildPointObjectResponsesRequest(evidencePack, request, profile, repairCode))
    });
  } catch (error) {
    if (isTimeout(error)) {
      throw new PointObjectAiServiceError("AI_TIMEOUT", 504, "AI analysis timed out safely.");
    }
    throw new PointObjectAiServiceError("AI_PROVIDER_REJECTED", 502, "AI analysis could not be reached safely.");
  }

  const requestId = response.headers.get("x-request-id");
  if (!response.ok) {
    throw new PointObjectAiServiceError(
      "AI_PROVIDER_REJECTED",
      response.status === 429 ? 429 : 502,
      response.status === 429
        ? "AI analysis is temporarily rate limited."
        : "AI analysis could not complete the bounded request."
    );
  }

  try {
    return { payload: await response.json(), requestId };
  } catch {
    throw new PointObjectAiServiceError("AI_OUTPUT_INVALID", 502, "AI analysis returned an unreadable response.");
  }
}

function assertCompleteResponse(payload: unknown): void {
  const state = responseCompletionState(payload);
  if (state === "refusal") {
    throw new PointObjectAiServiceError("AI_REFUSED", 422, "AI analysis could not answer this request. Try a different question.");
  }
  if (state === "incomplete") {
    throw new PointObjectAiServiceError("AI_OUTPUT_INCOMPLETE", 502, "AI analysis was incomplete. Please try again.");
  }
  if (state !== "complete") {
    throw new PointObjectAiServiceError("AI_OUTPUT_INVALID", 502, "AI analysis returned an invalid response.");
  }
}

function validateCompletedOutput(
  payload: unknown,
  evidencePack: GroundablePointObjectEvidencePack,
  analysisRequest: PointObjectAnalysisRequest
): PointObjectAiValidationResult {
  try {
    const parsed: unknown = JSON.parse(extractResponsesText(payload));
    return validatePointObjectAiContentDetailed(parsed, evidencePack, analysisRequest);
  } catch {
    return { ok: false, code: "SHAPE_INVALID" };
  }
}

export async function generatePointObjectAiAnalysis(
  evidencePack: GroundablePointObjectEvidencePack,
  analysisRequest: PointObjectAnalysisRequest,
  routeDeadline?: number
): Promise<PointObjectAiResult> {
  if (process.env.VERCEL_ENV !== "preview" || !getPointObjectPreviewUpstreamStatus().enabled) {
    throw new PointObjectAiServiceError(
      "AI_PREVIEW_ONLY",
      403,
      "AI analysis is not available in this environment."
    );
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new PointObjectAiServiceError(
      "AI_NOT_CONFIGURED",
      503,
      "AI analysis is not configured in this environment."
    );
  }

  const startedAt = Date.now();
  const deadline = Math.min(startedAt + GENERATION_BUDGET_MS, routeDeadline ?? Number.POSITIVE_INFINITY);
  const usageAccumulator: UsageAccumulator = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputComplete: true,
    outputComplete: true,
    totalComplete: true,
    estimatedCostUsd: 0,
    costComplete: true,
    costRateSources: new Set<string>()
  };
  let attempts = 0;
  let requestId: string | null = null;

  const initialKind: AttemptKind = analysisRequest.question ? "focused" : "initial";
  let profile = profileFor(analysisRequest, initialKind);
  attempts += 1;
  let attempt = await requestOpenAi(apiKey, evidencePack, analysisRequest, profile, deadline, null);
  requestId = attempt.requestId;
  addUsage(usageAccumulator, profile.model, extractResponsesUsage(attempt.payload));
  assertCompleteResponse(attempt.payload);
  let validation = validateCompletedOutput(attempt.payload, evidencePack, analysisRequest);

  if (!validation.ok) {
    const repairCode = validation.code;
    profile = profileFor(analysisRequest, "repair");
    attempts += 1;
    attempt = await requestOpenAi(apiKey, evidencePack, analysisRequest, profile, deadline, repairCode);
    requestId = attempt.requestId;
    addUsage(usageAccumulator, profile.model, extractResponsesUsage(attempt.payload));
    assertCompleteResponse(attempt.payload);
    validation = validateCompletedOutput(attempt.payload, evidencePack, analysisRequest);
    if (!validation.ok) {
      throw new PointObjectAiServiceError(
        "AI_OUTPUT_INVALID",
        502,
        "AI analysis could not produce a verified result. Please try again."
      );
    }
  }

  return {
    mode: "openai",
    generatedAt: new Date().toISOString(),
    evidencePackId: evidencePack.evidencePackId,
    evidencePackHash: evidencePack.evidencePackHash,
    request: {
      depth: analysisRequest.depth,
      goal: analysisRequest.goal,
      perspective: analysisRequest.perspective,
      horizon: analysisRequest.horizon,
      question: analysisRequest.question,
      focused: Boolean(analysisRequest.question)
    },
    content: validation.content,
    telemetry: {
      provider: "openai",
      model: profile.model,
      reasoningEffort: profile.reasoningEffort,
      depth: analysisRequest.depth,
      promptVersion: POINT_OBJECT_AI_PROMPT_VERSION,
      requestId,
      latencyMs: Date.now() - startedAt,
      attempts,
      inputTokens: usageAccumulator.inputComplete ? usageAccumulator.inputTokens : null,
      outputTokens: usageAccumulator.outputComplete ? usageAccumulator.outputTokens : null,
      totalTokens: usageAccumulator.totalComplete ? usageAccumulator.totalTokens : null,
      estimatedCostUsd: usageAccumulator.costComplete
        ? Number(usageAccumulator.estimatedCostUsd.toFixed(8))
        : null,
      costRateSource: usageAccumulator.costComplete
        ? [...usageAccumulator.costRateSources].join(" | ") || null
        : null,
      stored: false,
      toolCalls: 0
    }
  };
}
