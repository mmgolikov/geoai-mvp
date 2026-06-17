import { NextResponse } from "next/server";
import { buildAnalyzePrompt } from "@/src/lib/analysis-prompts";
import {
  createFallbackStructuredAnalysis,
  validateStructuredAnalysis
} from "@/src/lib/analysis-validation";
import type { AnalyzeRequest, StructuredAnalysisResult } from "@/src/types/analysis";

export const runtime = "nodejs";

function isAnalyzeRequest(value: unknown): value is AnalyzeRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const request = value as Partial<AnalyzeRequest>;
  return (
    typeof request.scenarioId === "string" &&
    typeof request.scenarioLabel === "string" &&
    typeof request.point?.latitude === "number" &&
    typeof request.point?.longitude === "number" &&
    typeof request.deterministicScores === "object" &&
    Array.isArray(request.evidence) &&
    Array.isArray(request.dataSources)
  );
}

function extractChatCompletionText(response: Record<string, unknown>) {
  const choices = response.choices;
  if (!Array.isArray(choices)) {
    return "";
  }

  const firstChoice = choices[0];
  if (typeof firstChoice !== "object" || firstChoice === null || !("message" in firstChoice)) {
    return "";
  }

  const message = (firstChoice as { message?: unknown }).message;
  if (typeof message !== "object" || message === null || !("content" in message)) {
    return "";
  }

  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : "";
}

function withOpenAiMode(result: ReturnType<typeof validateStructuredAnalysis>): StructuredAnalysisResult | null {
  if (!result) {
    return null;
  }

  return {
    mode: "openai",
    ...result
  };
}

async function requestOpenAiAnalysis(request: AnalyzeRequest): Promise<StructuredAnalysisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You produce valid JSON only for GeoAI spatial intelligence dashboards. Do not include Markdown."
        },
        {
          role: "user",
          content: buildAnalyzePrompt(request)
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const text = extractChatCompletionText(payload);
  if (!text) {
    return null;
  }

  try {
    return withOpenAiMode(validateStructuredAnalysis(JSON.parse(text)));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  if (!isAnalyzeRequest(body)) {
    return NextResponse.json(
      { error: "Invalid analysis request." },
      { status: 400 }
    );
  }

  try {
    const openAiResult = await requestOpenAiAnalysis(body);
    if (openAiResult) {
      return NextResponse.json(openAiResult);
    }
  } catch {
    return NextResponse.json(
      createFallbackStructuredAnalysis(
        body,
        "AI analysis is temporarily unavailable. Using deterministic demo fallback."
      )
    );
  }

  return NextResponse.json(createFallbackStructuredAnalysis(body));
}
