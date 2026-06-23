import { NextResponse } from "next/server";
import { createDecisionScore } from "@/src/lib/ai/decision-scoring-client";
import { createDeterministicDecisionScore } from "@/src/lib/ai/decision-scoring-fallback";
import type { DecisionScoreRequest } from "@/src/lib/ai/decision-scoring-schema";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: process.env.OPENAI_API_KEY ? "openai_available" : "deterministic_fallback",
    caveat: "OpenAI scoring is optional. Without OPENAI_API_KEY, GeoAI uses deterministic fallback."
  });
}

export async function POST(request: Request) {
  let body: DecisionScoreRequest;

  try {
    body = await request.json() as DecisionScoreRequest;
  } catch {
    return NextResponse.json(
      createDeterministicDecisionScore({}, "Invalid request JSON. Deterministic fallback returned."),
      { status: 200 }
    );
  }

  try {
    return NextResponse.json(await createDecisionScore(body));
  } catch {
    return NextResponse.json(
      createDeterministicDecisionScore(body, "Decision scoring service failed. Deterministic fallback returned."),
      { status: 200 }
    );
  }
}
