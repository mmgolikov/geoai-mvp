import { NextResponse } from "next/server";
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

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    item: result.data,
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
  const result = await updateAoi(id, {
    name: typeof patch.name === "string" ? patch.name : undefined,
    description: typeof patch.description === "string" ? patch.description : undefined,
    tags: Array.isArray(patch.tags) ? patch.tags : undefined,
    lastAnalyzedAt: typeof patch.lastAnalyzedAt === "string" ? patch.lastAnalyzedAt : undefined,
    analysisCount: typeof patch.analysisCount === "number" ? patch.analysisCount : undefined,
    reportCount: typeof patch.reportCount === "number" ? patch.reportCount : undefined
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    item: result.data,
    error: result.error
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await deleteAoi(id);

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    deleted: result.data,
    error: result.error
  });
}
