import { NextResponse } from "next/server";
import { createAoi, listAois } from "@/src/lib/repositories/aoi-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { aoiRequiredCaveat, type ProjectAoi } from "@/src/types/aoi";

export const runtime = "nodejs";

function isAoiInput(value: unknown): value is ProjectAoi {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<ProjectAoi>;
  return (
    typeof input.id === "string" &&
    typeof input.projectKey === "string" &&
    typeof input.name === "string" &&
    input.geometryType === "Polygon" &&
    input.geometry?.type === "Polygon" &&
    typeof input.centroid?.latitude === "number" &&
    typeof input.centroid?.longitude === "number" &&
    Array.isArray(input.bbox) &&
    typeof input.measurements?.areaSqM === "number"
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey");
  const result = await listAois({ projectId, projectKey, limit: 50 });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    count: result.data.length,
    items: result.data,
    error: result.error,
    dataHonesty: "AOIs are user-provided or uploaded screening geometry; official validation required."
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  if (!isAoiInput(body)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid AOI payload." }, { status: 400 });
  }

  const result = await createAoi({
    ...body,
    caveat: body.caveat ?? aoiRequiredCaveat
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    item: result.data,
    error: result.error,
    message: result.ok
      ? "AOI saved to local project fallback."
      : "AOI remains browser-local; server fallback storage is unavailable."
  }, { status: result.ok ? 201 : 200 });
}
