import { NextResponse } from "next/server";
import {
  listAnalysisRuns,
  saveAnalysisRun
} from "@/src/lib/db/repositories/analysis-runs";
import type { DbAnalysisRunInput } from "@/src/lib/db/types";

export const runtime = "nodejs";

function isAnalysisRunInput(value: unknown): value is DbAnalysisRunInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<DbAnalysisRunInput>;
  return (
    typeof input.runKey === "string" &&
    typeof input.scenarioId === "string" &&
    typeof input.selectedName === "string" &&
    typeof input.selectedType === "string" &&
    input.selectedPoint !== undefined &&
    input.result !== undefined
  );
}

export async function GET() {
  const result = await listAnalysisRuns();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { persisted: false, mode: "local_only", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!isAnalysisRunInput(body)) {
    return NextResponse.json(
      { persisted: false, mode: "local_only", message: "Invalid analysis run payload." },
      { status: 400 }
    );
  }

  const result = await saveAnalysisRun(body);

  return NextResponse.json({
    ok: true,
    persisted: result.persisted,
    mode: result.mode,
    message: result.persisted
      ? "Analysis run persisted."
      : "Analysis run kept local only; Supabase is not configured or unavailable."
  });
}
