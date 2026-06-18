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
    input.resultJson !== undefined
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;
  const result = await listAnalysisRuns(limit);

  return NextResponse.json({
    ok: result.ok,
    mode: result.mode,
    items: result.data ?? [],
    error: result.error
  });
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
    ok: result.ok,
    persisted: result.mode === "db" && result.ok,
    mode: result.mode,
    runKey: body.runKey,
    data: result.data,
    error: result.error,
    message: result.mode === "db" && result.ok
      ? "Analysis run persisted."
      : "Analysis run kept local only; Supabase is not configured or unavailable."
  });
}
