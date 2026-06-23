import { NextResponse } from "next/server";
import {
  listAnalysisRuns,
  saveAnalysisRun
} from "@/src/lib/db/repositories/analysis-runs";
import { getProjectByKey } from "@/src/lib/db/repositories/projects";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
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
  const projectKey = url.searchParams.get("projectKey");
  const project = projectKey ? await getProjectByKey(projectKey) : null;

  const result = await listAnalysisRuns(limit, project?.mode === "supabase" ? project.data?.id ?? null : null);
  const localProjectItems = result.mode === "local_fallback" && projectKey && Array.isArray(result.data)
    ? result.data.filter((item) => (item as { projectKey?: string | null }).projectKey === projectKey)
    : result.data ?? [];

  const responseMode = result.mode === "supabase" ? "supabase" : "local_fallback";
  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(responseMode),
    projectMode: project?.mode ?? null,
    project: project?.data ?? null,
    count: Array.isArray(localProjectItems) ? localProjectItems.length : 0,
    items: localProjectItems,
    error: result.error,
    dataHonesty: "Analysis runs preserve demo/local source lineage unless externally validated."
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { persisted: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!isAnalysisRunInput(body)) {
    return NextResponse.json(
      { persisted: false, ...repositoryModeFields("local_fallback"), message: "Invalid analysis run payload." },
      { status: 400 }
    );
  }

  const project = body.projectKey ? await getProjectByKey(body.projectKey) : null;
  const result = await saveAnalysisRun({
    ...body,
    projectId: body.projectId ?? (project?.mode === "supabase" ? project.data?.id ?? null : null),
    projectKey: body.projectKey ?? project?.data?.projectKey ?? null,
    projectName: body.projectName ?? project?.data?.name ?? null
  });

  const responseMode = result.mode === "supabase" ? "supabase" : "local_fallback";
  return NextResponse.json({
    ok: result.ok,
    persisted: result.mode === "supabase" && result.ok,
    ...repositoryModeFields(responseMode),
    runKey: body.runKey,
    project: project?.data ?? null,
    data: result.data,
    error: result.error,
    message: result.mode === "supabase" && result.ok
      ? "Analysis run persisted."
      : "Analysis run kept local only; Supabase is not configured or unavailable."
  });
}
