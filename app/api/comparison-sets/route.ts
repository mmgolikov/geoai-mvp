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
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { hasVerifiedRequestIdentity } from "@/src/lib/auth/verified-request-access";

export const runtime = "nodejs";

function isComparisonSetInput(value: unknown): value is WorkspaceComparisonSet {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<WorkspaceComparisonSet>;
  return (
    typeof input.id === "string" && /^[a-zA-Z0-9_.:-]{1,240}$/.test(input.id) &&
    typeof input.title === "string" && input.title.length <= 500 &&
    Array.isArray(input.items) && input.items.length >= 2 && input.items.length <= 10 &&
    typeof input.itemCount === "number" && Number.isInteger(input.itemCount) && input.itemCount === input.items.length
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey");
  const existing = id ? await getComparisonSet(id) : null;
  const resolvedProjectKey = (existing?.data as { projectKey?: string | null } | null)?.projectKey ?? projectKey;
  const access = requireProjectAccess({ projectKey: resolvedProjectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  if (id) {
    if (!hasVerifiedRequestIdentity(access)) {
      return NextResponse.json({ ok: false, ...repositoryModeFields("browser_local"), message: "Server-side comparison reads are disabled in public-demo mode." }, { status: 404 });
    }
    const result = existing!;
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

  if (!hasVerifiedRequestIdentity(access)) {
    return NextResponse.json({ ok: true, ...repositoryModeFields("browser_local"), count: 0, items: [], access, error: null, dataHonesty: "Public-demo comparisons remain browser-local." });
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
  const parsed = await readBoundedJson(request, 768 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: parsed.message }, { status: parsed.status });
  }
  const body = parsed.value;

  if (!isComparisonSetInput(body)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid comparison set payload." }, { status: 400 });
  }

  const projectKey = (body as { projectKey?: string | null }).projectKey ?? null;
  const access = requireProjectAccess({ projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  if (!hasVerifiedRequestIdentity(access)) {
    return NextResponse.json({
      ok: true,
      ...repositoryModeFields("browser_local"),
      persisted: false,
      item: body,
      access,
      error: null,
      message: "Public-demo comparison remains in caller browser state; shared server persistence is disabled."
    });
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

  const existing = await getComparisonSet(id);
  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "Comparison set not found." }, { status: 404 });
  }
  const projectKey = (existing.data as { projectKey?: string | null }).projectKey ?? null;
  const access = requireProjectAccess({ projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  if (!hasVerifiedRequestIdentity(access)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("browser_local"), message: "Shared server comparison deletion is disabled in public-demo mode." }, { status: 409 });
  }

  const result = await deleteComparisonSet(id);
  void recordAuditEvent({
    projectKey,
    eventType: "analysis_run",
    entityType: "comparison_set",
    entityId: id,
    action: "Deleted comparison set"
  });
  return NextResponse.json({ ok: result.ok, ...repositoryModeFields("local_fallback"), deleted: result.data, access, error: result.error });
}
