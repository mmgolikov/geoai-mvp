import "server-only";

import {
  buildPointObjectResponsesRequest,
  estimatePointObjectAiCost,
  extractResponsesText,
  extractResponsesUsage,
  validatePointObjectAiContent,
  type PointObjectAiResult
} from "./point-to-object-ai-core";
import type { PointObjectEvidencePack } from "./point-to-object-evidence";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";

export type PointObjectAiErrorCode =
  | "AI_PREVIEW_ONLY"
  | "AI_NOT_CONFIGURED"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_REJECTED"
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

function configuredModel(): string {
  const value = process.env.OPENAI_MODEL?.trim();
  return value && value.length <= 120 ? value : DEFAULT_MODEL;
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

export async function generatePointObjectAiAnalysis(
  evidencePack: PointObjectEvidencePack,
  question: string | null
): Promise<PointObjectAiResult> {
  if (process.env.VERCEL_ENV !== "preview") {
    throw new PointObjectAiServiceError(
      "AI_PREVIEW_ONLY",
      403,
      "Grounded AI is enabled only on an isolated Vercel Preview."
    );
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new PointObjectAiServiceError(
      "AI_NOT_CONFIGURED",
      503,
      "Grounded AI is not configured for this Preview."
    );
  }

  const model = configuredModel();
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildPointObjectResponsesRequest(evidencePack, question, model))
    });
  } catch (error) {
    if (isTimeout(error)) {
      throw new PointObjectAiServiceError("AI_TIMEOUT", 504, "Grounded AI timed out safely.");
    }
    throw new PointObjectAiServiceError("AI_PROVIDER_REJECTED", 502, "Grounded AI could not be reached safely.");
  }

  const requestId = response.headers.get("x-request-id");
  if (!response.ok) {
    throw new PointObjectAiServiceError(
      "AI_PROVIDER_REJECTED",
      response.status === 429 ? 429 : 502,
      response.status === 429
        ? "Grounded AI is temporarily rate limited."
        : "Grounded AI rejected the bounded request."
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PointObjectAiServiceError("AI_OUTPUT_INVALID", 502, "Grounded AI returned an unreadable response.");
  }

  const outputText = extractResponsesText(payload);
  let output: unknown;
  try {
    output = JSON.parse(outputText);
  } catch {
    throw new PointObjectAiServiceError("AI_OUTPUT_INVALID", 502, "Grounded AI returned invalid structured output.");
  }
  const content = validatePointObjectAiContent(output, evidencePack);
  if (!content) {
    throw new PointObjectAiServiceError(
      "AI_OUTPUT_INVALID",
      502,
      "Grounded AI output failed evidence or claim validation."
    );
  }

  const usage = extractResponsesUsage(payload);
  const cost = estimatePointObjectAiCost(model, usage.inputTokens, usage.outputTokens);
  return {
    mode: "openai",
    generatedAt: new Date().toISOString(),
    evidencePackId: evidencePack.evidencePackId,
    evidencePackHash: evidencePack.evidencePackHash,
    content,
    telemetry: {
      provider: "openai",
      model,
      requestId,
      latencyMs: Date.now() - startedAt,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      estimatedCostUsd: cost.estimatedCostUsd,
      costRateSource: cost.costRateSource,
      stored: false,
      toolCalls: 0
    }
  };
}
