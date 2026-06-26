import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import {
  deleteComparisonSet,
  getComparisonSet,
  listComparisonSets,
  saveComparisonSet
} from "@/src/lib/repositories/comparison-set-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { WorkspaceComparisonSet } from "@/src/lib/project-workspace-types";

export const runtime = "nodejs";

function isComparisonSetInput(value: unknown): value is WorkspaceComparisonSet {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<WorkspaceComparisonSet>;
  return (
    typeof input.id === "string" &&
    typeof input.title === "string" &&
    Array.isArray(input.items) &&
    typeof input.itemCount === "number"
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey");
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  if (id) {
    const result = await getComparisonSet(id);
    const responseMode = result.mode === "supabase" ? "supabase" : "local_fallback";
    return NextResponse.json({
      ok: result.ok,
      ...repositoryModeFields(responseMode),
      item: result.data,
      access,
      error: result.error,
      dataHonesty: "Saved comparison sets are demo/local until source validation is completed."
    });
  }

  const result = await listComparisonSets({ projectId, projectKey, limit: 50 });
  const items = Array.isArray(result.data) ? result.data : [];

  const responseMode = result.mode === "supabase" ? "supabase" : "local_fallback";
  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(responseMode),
    count: items.length,
    items,
    access,
    error: result.error,
    dataHonesty: "Comparison sets preserve source lineage snapshots; official validation remains required."
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  if (!isComparisonSetInput(body)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid comparison set payload." }, { status: 400 });
  }

  const projectKey = (body as { projectKey?: string | null }).projectKey ?? null;
  const access = requireProjectAccess({ projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const result = await saveComparisonSet(body);

  const responseMode = result.mode === "supabase" ? "supabase" : "local_fallback";
  void recordAuditEvent({
    projectKey,
    eventType: "analysis_run",
    entityType: "comparison_set",
    entityId: body.id,
    action: "Saved comparison set",
    metadata: { itemCount: body.itemCount, accessAllowed: access.allowed }
  });
  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(responseMode),
    persisted: result.mode === "supabase" && result.ok,
    item: result.data,
    access,
    error: result.error,
    message: result.mode === "supabase" ? "Comparison set persisted." : "Comparison set kept in local fallback; server-side demo storage is not durable."
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "id query parameter is required." }, { status: 400 });
  }

  const result = await deleteComparisonSet(id);
  void recordAuditEvent({
    eventType: "analysis_run",
    entityType: "comparison_set",
    entityId: id,
    action: "Deleted comparison set"
  });
  return NextResponse.json({ ok: result.ok, ...repositoryModeFields("local_fallback"), deleted: result.data, error: result.error });
}
