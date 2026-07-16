import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { isPreAuthServerMutationBlocked, projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { deleteAoi, getAoi, updateAoi } from "@/src/lib/repositories/aoi-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { ProjectAoi } from "@/src/types/aoi";
import { hasRequestIdentityKernelEvidence } from "@/src/lib/auth/verified-request-access";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!hasRequestIdentityKernelEvidence()) {
    return privateNoStoreJson({ ok: false, ...repositoryModeFields("browser_local"), message: "Server-side AOI reads are disabled in public-demo mode." }, { status: 404 });
  }
  const { id } = await context.params;
  const result = await getAoi(id);
  const access = requireProjectAccess({
    projectKey: (result.data as { projectKey?: string | null } | null)?.projectKey ?? null,
    action: "aoi.read",
    mode: "soft"
  });
  if (!access.allowed) {
    return privateNoStoreJson(projectAccessDeniedPayload(access), { status: access.status });
  }

  return privateNoStoreJson({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    item: result.data,
    access,
    error: result.error,
    dataHonesty: "AOIs are screening geometry; official validation required."
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (isPreAuthServerMutationBlocked("write")) {
    const access = requireProjectAccess({ action: "aoi.write", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
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
  const existing = await getAoi(id);
  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "AOI not found." }, { status: 404 });
  }
  const projectKey = (existing.data as { projectKey?: string | null }).projectKey ?? null;
  const access = requireProjectAccess({ projectKey, action: "aoi.write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const result = await updateAoi(id, {
    name: typeof patch.name === "string" ? patch.name : undefined,
    description: typeof patch.description === "string" ? patch.description : undefined,
    tags: Array.isArray(patch.tags) ? patch.tags : undefined,
    lastAnalyzedAt: typeof patch.lastAnalyzedAt === "string" ? patch.lastAnalyzedAt : undefined,
    analysisCount: typeof patch.analysisCount === "number" ? patch.analysisCount : undefined,
    reportCount: typeof patch.reportCount === "number" ? patch.reportCount : undefined
  });
  void recordAuditEvent({
    projectKey,
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
  if (isPreAuthServerMutationBlocked("write")) {
    const access = requireProjectAccess({ action: "aoi.delete", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const { id } = await context.params;
  const existing = await getAoi(id);
  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "AOI not found." }, { status: 404 });
  }
  const projectKey = (existing.data as { projectKey?: string | null }).projectKey ?? null;
  const access = requireProjectAccess({ projectKey, action: "aoi.delete", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const result = await deleteAoi(id);
  void recordAuditEvent({
    projectKey,
    eventType: "aoi_deleted",
    entityType: "aoi",
    entityId: id,
    action: "Deleted AOI metadata"
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    deleted: result.data,
    access,
    error: result.error
  });
}
