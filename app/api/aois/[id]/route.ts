import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { deleteAoi, getAoi, updateAoi } from "@/src/lib/repositories/aoi-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { ProjectAoi } from "@/src/types/aoi";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await getAoi(id);
  const access = requireProjectAccess({
    projectKey: (result.data as { projectKey?: string | null } | null)?.projectKey ?? null,
    action: "read",
    mode: "soft"
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    item: result.data,
    access,
    error: result.error,
    dataHonesty: "AOIs are screening geometry; official validation required."
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid AOI update." }, { status: 400 });
  }

  const patch = body as Partial<ProjectAoi>;
  const access = requireProjectAccess({ projectKey: patch.projectKey ?? null, action: "write", mode: "soft" });
  const result = await updateAoi(id, {
    name: typeof patch.name === "string" ? patch.name : undefined,
    description: typeof patch.description === "string" ? patch.description : undefined,
    tags: Array.isArray(patch.tags) ? patch.tags : undefined,
    lastAnalyzedAt: typeof patch.lastAnalyzedAt === "string" ? patch.lastAnalyzedAt : undefined,
    analysisCount: typeof patch.analysisCount === "number" ? patch.analysisCount : undefined,
    reportCount: typeof patch.reportCount === "number" ? patch.reportCount : undefined
  });
  void recordAuditEvent({
    projectKey: patch.projectKey ?? null,
    eventType: "aoi_updated",
    entityType: "aoi",
    entityId: id,
    action: "Updated AOI metadata",
    metadata: { accessAllowed: access.allowed }
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    item: result.data,
    access,
    error: result.error
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await deleteAoi(id);
  void recordAuditEvent({
    eventType: "aoi_deleted",
    entityType: "aoi",
    entityId: id,
    action: "Deleted AOI metadata"
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    deleted: result.data,
    error: result.error
  });
}
