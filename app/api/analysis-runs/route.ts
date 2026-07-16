import { NextResponse } from "next/server";
import {
  listAnalysisRuns,
  saveAnalysisRun
} from "@/src/lib/db/repositories/analysis-runs";
import { getLocalDemoProject, getProjectByKey } from "@/src/lib/db/repositories/projects";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { isPreAuthServerMutationBlocked, projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { DbAnalysisRunInput } from "@/src/lib/db/types";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { hasVerifiedRequestIdentity } from "@/src/lib/auth/verified-request-access";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";

export const runtime = "nodejs";

function isAnalysisRunInput(value: unknown): value is DbAnalysisRunInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<DbAnalysisRunInput>;
  return (
    typeof input.runKey === "string" && /^[a-zA-Z0-9_.:-]{1,240}$/.test(input.runKey) &&
    typeof input.scenarioId === "string" && input.scenarioId.length <= 120 &&
    typeof input.selectedName === "string" && input.selectedName.length <= 500 &&
    typeof input.selectedType === "string" && input.selectedType.length <= 160 &&
    typeof input.selectedPoint === "object" && input.selectedPoint !== null &&
    typeof input.resultJson === "object" && input.resultJson !== null
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;
  const projectKey = url.searchParams.get("projectKey");
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return privateNoStoreJson(projectAccessDeniedPayload(access), { status: access.status });
  }
  if (!hasVerifiedRequestIdentity(access)) {
    const project = projectKey ? getLocalDemoProject(projectKey) : null;
    return privateNoStoreJson({
      ok: true,
      ...repositoryModeFields("browser_local"),
      projectMode: "demo_seed",
      project,
      access,
      count: 0,
      items: [],
      error: null,
      dataHonesty: "Public-demo analysis history is browser-local; shared server reads are disabled."
    });
  }

  const project = projectKey ? await getProjectByKey(projectKey) : null;

  const result = await listAnalysisRuns(limit, project?.mode === "supabase" ? project.data?.id ?? null : null);
  const localProjectItems = result.mode === "local_fallback" && projectKey && Array.isArray(result.data)
    ? result.data.filter((item) => (item as { projectKey?: string | null }).projectKey === projectKey)
    : result.data ?? [];

  const responseMode = result.mode === "supabase" ? "supabase" : "local_fallback";
  return privateNoStoreJson({
    ok: result.ok,
    ...repositoryModeFields(responseMode),
    projectMode: project?.mode ?? null,
    project: project?.data ?? null,
    access,
    count: Array.isArray(localProjectItems) ? localProjectItems.length : 0,
    items: localProjectItems,
    error: result.error,
    dataHonesty: "Analysis runs preserve demo/local source lineage unless externally validated."
  });
}

export async function POST(request: Request) {
  if (isPreAuthServerMutationBlocked("write")) {
    const access = requireProjectAccess({ action: "write", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const parsed = await readBoundedJson(request, 768 * 1024);
  if (!parsed.ok) {
    return NextResponse.json(
      { persisted: false, ...repositoryModeFields("local_fallback"), message: parsed.message },
      { status: parsed.status }
    );
  }
  const body = parsed.value;

  if (!isAnalysisRunInput(body)) {
    return NextResponse.json(
      { persisted: false, ...repositoryModeFields("local_fallback"), message: "Invalid analysis run payload." },
      { status: 400 }
    );
  }

  const project = body.projectKey ? await getProjectByKey(body.projectKey) : null;
  const access = requireProjectAccess({ projectKey: body.projectKey ?? project?.data?.projectKey ?? null, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  if (!hasVerifiedRequestIdentity(access)) {
    return NextResponse.json({
      ok: true,
      persisted: false,
      ...repositoryModeFields("browser_local"),
      runKey: body.runKey,
      project: project?.data ?? null,
      access,
      data: null,
      error: null,
      message: "Public-demo analysis remains in caller browser history; shared server persistence is disabled."
    });
  }
  const result = await saveAnalysisRun({
    ...body,
    projectId: body.projectId ?? (project?.mode === "supabase" ? project.data?.id ?? null : null),
    projectKey: body.projectKey ?? project?.data?.projectKey ?? null,
    projectName: body.projectName ?? project?.data?.name ?? null
  });

  const responseMode = result.mode === "supabase" ? "supabase" : "local_fallback";
  void recordAuditEvent({
    projectId: body.projectId ?? (project?.mode === "supabase" ? project.data?.id ?? null : null),
    projectKey: body.projectKey ?? project?.data?.projectKey ?? null,
    eventType: "analysis_run",
    entityType: "analysis_run",
    entityId: body.runKey,
    action: "Saved analysis run",
    metadata: { scenarioId: body.scenarioId, selectedType: body.selectedType, accessAllowed: access.allowed }
  });
  return NextResponse.json({
    ok: result.ok,
    persisted: result.mode === "supabase" && result.ok,
    ...repositoryModeFields(responseMode),
    runKey: body.runKey,
    project: project?.data ?? null,
    access,
    data: result.data,
    error: result.error,
    message: result.mode === "supabase" && result.ok
      ? "Analysis run persisted."
      : "Analysis run kept local only; Supabase is not configured or unavailable."
  });
}
