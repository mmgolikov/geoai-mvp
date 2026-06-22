import { NextResponse } from "next/server";
import {
  deleteComparisonSet,
  getComparisonSet,
  listComparisonSets,
  saveComparisonSet
} from "@/src/lib/repositories/comparison-set-repository";
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

  if (id) {
    const result = await getComparisonSet(id);
    return NextResponse.json({
      ok: result.ok,
      mode: result.mode === "db" ? "supabase" : "local-fallback",
      item: result.data,
      error: result.error,
      dataHonesty: "Saved comparison sets are demo/local until source validation is completed."
    });
  }

  const result = await listComparisonSets({ projectId, projectKey, limit: 50 });
  const items = Array.isArray(result.data) ? result.data : [];

  return NextResponse.json({
    ok: result.ok,
    mode: result.mode === "db" ? "supabase" : "local-fallback",
    count: items.length,
    items,
    error: result.error,
    dataHonesty: "Comparison sets preserve source lineage snapshots; official validation remains required."
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mode: "local-fallback", message: "Invalid JSON body." }, { status: 400 });
  }

  if (!isComparisonSetInput(body)) {
    return NextResponse.json({ ok: false, mode: "local-fallback", message: "Invalid comparison set payload." }, { status: 400 });
  }

  const result = await saveComparisonSet(body);

  return NextResponse.json({
    ok: result.ok,
    mode: result.mode === "db" ? "supabase" : "local_fallback",
    persisted: result.mode === "db" && result.ok,
    item: result.data,
    error: result.error,
    message: result.mode === "db" ? "Comparison set persisted." : "Comparison set kept in local fallback; server-side demo storage is not durable."
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, mode: "local-fallback", message: "id query parameter is required." }, { status: 400 });
  }

  const result = await deleteComparisonSet(id);
  return NextResponse.json({ ok: result.ok, mode: "local-fallback", deleted: result.data, error: result.error });
}
