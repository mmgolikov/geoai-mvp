import { NextResponse } from "next/server";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { buildClientDataRoom } from "@/src/lib/data-room/data-room-summary";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey");
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const dataRoom = await buildClientDataRoom({ projectId, projectKey });

  return NextResponse.json({ ...dataRoom, access });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  const input = typeof body === "object" && body !== null && !Array.isArray(body)
    ? body as { projectId?: string | null; projectKey?: string | null }
    : {};
  const dataRoom = await buildClientDataRoom({
    projectId: input.projectId ?? null,
    projectKey: input.projectKey ?? null
  });

  const access = requireProjectAccess({ projectKey: input.projectKey ?? null, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  return NextResponse.json({
    ...dataRoom,
    access
  });
}
