import { NextResponse } from "next/server";
import { getOpenAiUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";
import { isPreAuthServerMutationBlocked, projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { buildAnalyzePrompt } from "@/src/lib/analysis-prompts";
import {
  createFallbackStructuredAnalysis,
  validateStructuredAnalysis
} from "@/src/lib/analysis-validation";
import type { AnalyzeRequest, StructuredAnalysisResult } from "@/src/types/analysis";
import { readBoundedJson } from "@/src/lib/http/bounded-json";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFinitePoint(value: unknown) {
  if (!isRecord(value)) return false;
  return typeof value.latitude === "number" && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    typeof value.longitude === "number" && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}

function isBoundedStringArray(value: unknown, maxItems = 80, maxLength = 2000) {
  return Array.isArray(value) && value.length <= maxItems &&
    value.every((item) => typeof item === "string" && item.length <= maxLength);
}

function isSelectedObject(value: unknown) {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;
  const basic = ["id", "name", "type", "layerId", "layerName", "geometryType"].every((key) =>
    typeof value[key] === "string" && (value[key] as string).length > 0 && (value[key] as string).length <= 500
  );
  if (!basic || !isFinitePoint(value.center)) return false;
  if (value.spatialContext === undefined) return true;
  if (!isRecord(value.spatialContext)) return false;
  const context = value.spatialContext;
  return ["datasetName", "subtype", "geometryType", "sourceStatus", "geometryStatus", "confidenceLevel"].every((key) =>
    typeof context[key] === "string" && (context[key] as string).length <= 500
  ) && isBoundedStringArray(context.scenarioRelevance, 30, 160) && isBoundedStringArray(context.limitations, 30, 2000);
}

function isSelectedAoi(value: unknown) {
  if (value === undefined || value === null) return true;
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" ||
      value.id.length > 240 || value.name.length > 500 || !isFinitePoint(value.centroid) || !isRecord(value.measurements)) return false;
  const measurements = value.measurements;
  return ["areaSqM", "areaSqKm", "perimeterM", "perimeterKm", "vertexCount"].every((key) =>
    typeof measurements[key] === "number" && Number.isFinite(measurements[key]) && (measurements[key] as number) >= 0
  ) && isFinitePoint(measurements.centroid) && Array.isArray(value.coordinates) && value.coordinates.length <= 10000 &&
    value.coordinates.every((coordinate) => Array.isArray(coordinate) && coordinate.length >= 2 &&
      coordinate.every((part) => typeof part === "number" && Number.isFinite(part))) &&
    isBoundedStringArray(value.limitations, 50, 2000);
}

function isAnalyzeRequest(value: unknown): value is AnalyzeRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const request = value as Partial<AnalyzeRequest>;
  const projectKeyValid = request.projectKey === undefined || request.projectKey === null ||
    (typeof request.projectKey === "string" && request.projectKey.length > 0 && request.projectKey.length <= 160);
  const customQueryValid = request.customQuery === undefined ||
    (typeof request.customQuery === "string" && request.customQuery.length <= 4000);
  const customIntentValid = request.customQueryIntent === undefined ||
    (typeof request.customQueryIntent === "string" && request.customQueryIntent.length <= 160);
  const scores = request.deterministicScores;
  const scoresValid = typeof scores === "object" && scores !== null && !Array.isArray(scores) &&
    Object.keys(scores).length <= 40 && Object.values(scores).every((score) => typeof score === "number" && Number.isFinite(score));
  const evidenceValid = Array.isArray(request.evidence) && request.evidence.length <= 50 && request.evidence.every((item) =>
    typeof item === "object" && item !== null && !Array.isArray(item) &&
    typeof item.id === "string" && item.id.length <= 240 &&
    typeof item.label === "string" && item.label.length <= 500 &&
    typeof item.description === "string" && item.description.length <= 4000 &&
    typeof item.sourceId === "string" && item.sourceId.length <= 240
  );
  const dataSourcesValid = Array.isArray(request.dataSources) && request.dataSources.length <= 50 && request.dataSources.every((source) =>
    typeof source === "object" && source !== null && !Array.isArray(source) &&
    typeof source.id === "string" && source.id.length <= 240 &&
    typeof source.name === "string" && source.name.length <= 500 &&
    typeof source.provider === "string" && source.provider.length <= 500 &&
    typeof source.description === "string" && source.description.length <= 4000 &&
    typeof source.licenseNote === "object" && source.licenseNote !== null &&
    typeof source.licenseNote.note === "string" && source.licenseNote.note.length <= 2000
  );
  const optionalObjectsValid = isSelectedObject(request.selectedObject) && isSelectedAoi(request.selectedAoi) &&
    (request.analysisTarget === undefined || request.analysisTarget === null || isRecord(request.analysisTarget)) &&
    (request.marketContext === undefined || request.marketContext === null || isRecord(request.marketContext));

  return (
    projectKeyValid &&
    typeof request.scenarioId === "string" &&
    request.scenarioId.length <= 120 &&
    typeof request.scenarioLabel === "string" &&
    request.scenarioLabel.length <= 240 &&
    customQueryValid &&
    customIntentValid &&
    typeof request.point?.latitude === "number" && Number.isFinite(request.point.latitude) && Math.abs(request.point.latitude) <= 90 &&
    typeof request.point?.longitude === "number" && Number.isFinite(request.point.longitude) && Math.abs(request.point.longitude) <= 180 &&
    scoresValid && evidenceValid && dataSourcesValid && optionalObjectsValid
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
  if (!getOpenAiUpstreamStatus().enabled) {
    return null;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(12000),
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
      temperature: 0.2,
      max_tokens: 1400
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
  if (isPreAuthServerMutationBlocked("generate")) {
    const access = requireProjectAccess({ action: "analysis.run", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const parsed = await readBoundedJson(request, 128 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }
  const body = parsed.value;

  if (!isAnalyzeRequest(body)) {
    return NextResponse.json(
      { error: "Invalid analysis request." },
      { status: 400 }
    );
  }

  const access = requireProjectAccess({ projectKey: body.projectKey ?? null, action: "analysis.run", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  try {
    const requestIdentityVerified = access.authMode === "supabase_auth" && access.decisionStatus === "allowed_project_member" &&
      access.user?.isDemoUser === false && access.membership?.source !== "demo_seed";
    const openAiResult = requestIdentityVerified ? await requestOpenAiAnalysis(body) : null;
    if (openAiResult) {
      return NextResponse.json(openAiResult);
    }
  } catch {
    return NextResponse.json(
      createFallbackStructuredAnalysis(
        body,
        "AI analysis is temporarily unavailable. Using deterministic sample/open fallback."
      )
    );
  }

  try {
    return NextResponse.json(createFallbackStructuredAnalysis(body));
  } catch {
    return NextResponse.json({ error: "Analysis request could not be evaluated safely." }, { status: 400 });
  }
}
