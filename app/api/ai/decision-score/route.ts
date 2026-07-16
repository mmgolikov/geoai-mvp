import { NextResponse } from "next/server";
import { getOpenAiUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";
import { isPreAuthServerMutationBlocked, projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { createDecisionScore } from "@/src/lib/ai/decision-scoring-client";
import { createDeterministicDecisionScore } from "@/src/lib/ai/decision-scoring-fallback";
import type { DecisionScoreRequest } from "@/src/lib/ai/decision-scoring-schema";
import { readBoundedJson } from "@/src/lib/http/bounded-json";

export const runtime = "nodejs";

function isOptionalBoundedString(value: unknown, maxLength: number) {
  return value === undefined || value === null || (typeof value === "string" && value.length <= maxLength);
}

function isDecisionScoreRequest(value: unknown): value is DecisionScoreRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  if (!isOptionalBoundedString(body.projectKey, 160) ||
      !isOptionalBoundedString(body.scenarioId, 120) ||
      !isOptionalBoundedString(body.scenarioLabel, 240) ||
      !isOptionalBoundedString(body.customQuery, 4000)) return false;

  if (body.validationGaps !== undefined && (!Array.isArray(body.validationGaps) || body.validationGaps.length > 50 ||
      body.validationGaps.some((item) => typeof item !== "string" || item.length > 2000))) return false;

  if (body.evidence !== undefined && (!Array.isArray(body.evidence) || body.evidence.length > 50 || body.evidence.some((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return true;
    return ["id", "sourceId", "title", "description"].some((key) => {
      const field = (item as Record<string, unknown>)[key];
      return field !== undefined && (typeof field !== "string" || field.length > 4000);
    });
  }))) return false;

  if (body.deterministicScores !== undefined) {
    if (typeof body.deterministicScores !== "object" || body.deterministicScores === null || Array.isArray(body.deterministicScores)) return false;
    const scores = Object.entries(body.deterministicScores as Record<string, unknown>);
    if (scores.length > 40 || scores.some(([key, score]) => key.length > 160 || typeof score !== "number" || !Number.isFinite(score))) return false;
  }

  return true;
}

function safeDecisionScoreRequest(body: DecisionScoreRequest): DecisionScoreRequest {
  return {
    projectKey: body.projectKey,
    scenarioId: body.scenarioId,
    scenarioLabel: body.scenarioLabel,
    customQuery: body.customQuery,
    deterministicScores: body.deterministicScores ? { ...body.deterministicScores } : undefined,
    validationGaps: body.validationGaps ? [...body.validationGaps] : undefined,
    evidence: body.evidence ? body.evidence.map((item) => ({
      ...(typeof item.id === "string" ? { id: item.id } : {}),
      ...(typeof item.sourceId === "string" ? { sourceId: item.sourceId } : {}),
      ...(typeof item.title === "string" ? { title: item.title } : {}),
      ...(typeof item.description === "string" ? { description: item.description } : {})
    })) : undefined
  };
}

export async function GET() {
  const upstream = getOpenAiUpstreamStatus();
  return NextResponse.json({
    ok: true,
    mode: upstream.mode,
    caveat: upstream.caveat
  });
}

export async function POST(request: Request) {
  if (isPreAuthServerMutationBlocked("generate")) {
    const access = requireProjectAccess({ action: "generate", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const parsed = await readBoundedJson(request, 96 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.message }, { status: parsed.status });
  }
  if (!isDecisionScoreRequest(parsed.value)) {
    return NextResponse.json({ ok: false, message: "Invalid decision-score request." }, { status: 400 });
  }
  // Governance posture must be derived server-side from authorized evidence.
  // Client-supplied claimPolicy/review/validation objects are intentionally discarded.
  const body = safeDecisionScoreRequest(parsed.value);

  const access = requireProjectAccess({ projectKey: body.projectKey ?? null, action: "generate", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  let fallback;
  try {
    fallback = createDeterministicDecisionScore(body);
  } catch {
    return NextResponse.json({ ok: false, message: "Decision-score request could not be evaluated safely." }, { status: 400 });
  }

  try {
    const requestIdentityVerified = access.authMode === "supabase_auth" && access.decisionStatus === "allowed_project_member" &&
      access.user?.isDemoUser === false && access.membership?.source !== "demo_seed";
    const result = await createDecisionScore(body, { allowUpstream: requestIdentityVerified });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ...fallback, mode: "deterministic_fallback" as const }, { status: 200 });
  }
}
