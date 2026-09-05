import "server-only";

import { getPointObjectPreviewUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";
import {
  POINT_OBJECT_AI_PROMPT_VERSION,
  POINT_OBJECT_AI_RESULT_SCHEMA_VERSION,
  buildPointObjectResponsesRequest,
  extractResponsesText,
  extractResponsesUsage,
  recoverPointObjectAiFocusedContentDetailed,
  responseCompletionState,
  summarizePointObjectAiAttemptUsage,
  validatePointObjectAiContentDetailed,
  type PointObjectAiAttemptUsageInput,
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
      verbosity: "low",
      maxOutputTokens: 5_200,
      timeoutMs: 82_000,
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
      verbosity: "low",
      maxOutputTokens: 5_500,
      timeoutMs: 90_000,
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
      reasoningEffort: "medium",
      verbosity: "low",
      maxOutputTokens: 4_500,
      timeoutMs: 30_000,
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
  repairCode: PointObjectAiValidationCode | null,
  repairDetail: string | null = null
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
      body: JSON.stringify(buildPointObjectResponsesRequest(evidencePack, request, profile, repairCode, repairDetail))
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
    return { ok: false, code: "SHAPE_INVALID", detail: "json_parse" };
  }
}

function parseCompletedOutput(payload: unknown): unknown {
  try {
    return JSON.parse(extractResponsesText(payload));
  } catch {
    return null;
  }
}

function isRepairableValidationCode(code: PointObjectAiValidationCode): boolean {
  return code === "SHAPE_INVALID" || code === "UNKNOWN_CODE" || code === "CAVEAT_INVALID" ||
    code === "NO_RENDERABLE_PLAN" || code === "EVIDENCE_INSUFFICIENT";
}

function isDeterministicFocusedRecovery(detail: string | undefined): boolean {
  return detail === "focused_answer_context_value_mismatch" ||
    detail === "focused_answer_context_without_context_receipt";
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
  const attemptUsages: PointObjectAiAttemptUsageInput[] = [];
  let attempts = 0;
  let requestId: string | null = null;

  const initialKind: AttemptKind = analysisRequest.question ? "focused" : "initial";
  let profile = profileFor(analysisRequest, initialKind);
  attempts += 1;
  let attempt = await requestOpenAi(apiKey, evidencePack, analysisRequest, profile, deadline, null);
  requestId = attempt.requestId;
  attemptUsages.push({
    purpose: initialKind,
    model: profile.model,
    reasoningEffort: profile.reasoningEffort,
    requestId: attempt.requestId,
    usage: extractResponsesUsage(attempt.payload)
  });
  assertCompleteResponse(attempt.payload);
  let validation = validateCompletedOutput(attempt.payload, evidencePack, analysisRequest);

  if (!validation.ok && isDeterministicFocusedRecovery(validation.detail)) {
    const recovered = recoverPointObjectAiFocusedContentDetailed(
      parseCompletedOutput(attempt.payload),
      evidencePack,
      analysisRequest
    );
    if (recovered.ok) {
      console.warn("point_object_ai_focused_answer_recovered", {
        rejectedDetail: validation.detail,
        attempt: attempts,
        model: profile.model,
        promptVersion: POINT_OBJECT_AI_PROMPT_VERSION
      });
      validation = recovered;
    } else {
      console.warn("point_object_ai_focused_answer_recovery_rejected", {
        rejectedDetail: validation.detail,
        recoveryCode: recovered.code,
        recoveryDetail: recovered.detail ?? "not_available",
        attempt: attempts,
        model: profile.model,
        promptVersion: POINT_OBJECT_AI_PROMPT_VERSION
      });
    }
  }

  if (!validation.ok) {
    console.warn("point_object_ai_validation_rejected", {
      code: validation.code,
      detail: validation.detail ?? "not_available",
      attempt: attempts,
      model: profile.model,
      promptVersion: POINT_OBJECT_AI_PROMPT_VERSION
    });
    if (!isRepairableValidationCode(validation.code)) {
      throw new PointObjectAiServiceError(
        "AI_OUTPUT_INVALID",
        502,
        "AI analysis returned a plan outside the bounded coded contract. Please try again."
      );
    }
    const repairCode = validation.code;
    profile = profileFor(analysisRequest, "repair");
    attempts += 1;
    attempt = await requestOpenAi(
      apiKey,
      evidencePack,
      analysisRequest,
      profile,
      deadline,
      repairCode,
      validation.detail ?? null
    );
    requestId = attempt.requestId;
    attemptUsages.push({
      purpose: "repair",
      model: profile.model,
      reasoningEffort: profile.reasoningEffort,
      requestId: attempt.requestId,
      usage: extractResponsesUsage(attempt.payload)
    });
    assertCompleteResponse(attempt.payload);
    validation = validateCompletedOutput(attempt.payload, evidencePack, analysisRequest);
    if (!validation.ok && isDeterministicFocusedRecovery(validation.detail)) {
      const recovered = recoverPointObjectAiFocusedContentDetailed(
        parseCompletedOutput(attempt.payload),
        evidencePack,
        analysisRequest
      );
      if (recovered.ok) {
        console.warn("point_object_ai_focused_answer_recovered", {
          rejectedDetail: validation.detail,
          attempt: attempts,
          model: profile.model,
          promptVersion: POINT_OBJECT_AI_PROMPT_VERSION
        });
        validation = recovered;
      } else {
        console.warn("point_object_ai_focused_answer_recovery_rejected", {
          rejectedDetail: validation.detail,
          recoveryCode: recovered.code,
          recoveryDetail: recovered.detail ?? "not_available",
          attempt: attempts,
          model: profile.model,
          promptVersion: POINT_OBJECT_AI_PROMPT_VERSION
        });
      }
    }
    if (!validation.ok) {
      console.warn("point_object_ai_validation_rejected", {
        code: validation.code,
        detail: validation.detail ?? "not_available",
        attempt: attempts,
        model: profile.model,
        promptVersion: POINT_OBJECT_AI_PROMPT_VERSION
      });
      throw new PointObjectAiServiceError(
        "AI_OUTPUT_INVALID",
        502,
        "AI analysis could not produce a verified result. Please try again."
      );
    }
  }

  const usageSummary = summarizePointObjectAiAttemptUsage(attemptUsages);

  return {
    mode: "openai",
    schemaVersion: POINT_OBJECT_AI_RESULT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    evidencePackId: evidencePack.evidencePackId,
    evidencePackHash: evidencePack.evidencePackHash,
    request: {
      depth: analysisRequest.depth,
      goal: analysisRequest.goal,
      perspective: analysisRequest.perspective,
      horizon: analysisRequest.horizon,
      question: analysisRequest.question,
      focused: Boolean(analysisRequest.question),
      locale: analysisRequest.locale
    },
    content: validation.content,
    telemetry: {
      provider: "openai",
      schemaVersion: POINT_OBJECT_AI_RESULT_SCHEMA_VERSION,
      model: profile.model,
      reasoningEffort: profile.reasoningEffort,
      depth: analysisRequest.depth,
      promptVersion: POINT_OBJECT_AI_PROMPT_VERSION,
      requestId,
      latencyMs: Date.now() - startedAt,
      attempts,
      attemptTrace: usageSummary.attemptTrace,
      inputTokens: usageSummary.inputTokens,
      cachedInputTokens: usageSummary.cachedInputTokens,
      cacheWriteTokens: usageSummary.cacheWriteTokens,
      outputTokens: usageSummary.outputTokens,
      totalTokens: usageSummary.totalTokens,
      estimatedCostUsd: usageSummary.estimatedCostUsd,
      costRateSource: usageSummary.costRateSource,
      stored: false,
      toolCalls: 0
    }
  };
}
