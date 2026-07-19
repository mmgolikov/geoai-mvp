import { NextResponse } from "next/server";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { buildClientDataRoom } from "@/src/lib/data-room/data-room-summary";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { hasVerifiedRequestIdentity } from "@/src/lib/auth/verified-request-access";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey");
  const access = requireProjectAccess({ projectKey, action: "evidence.read", mode: "soft" });
  if (!access.allowed) {
    return privateNoStoreJson(projectAccessDeniedPayload(access), { status: access.status });
  }
  const dataRoom = await buildClientDataRoom({
    projectId,
    projectKey,
    includeStoredState: hasVerifiedRequestIdentity(access)
  });

  return privateNoStoreJson({ ...dataRoom, access }, { status: dataRoom.ok ? 200 : 404 });
}

export async function POST(request: Request) {
  const parsed = await readBoundedJson(request, 8 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: parsed.message }, { status: parsed.status });
  }
  const body = parsed.value;

  const input = typeof body === "object" && body !== null && !Array.isArray(body)
    ? body as { projectId?: string | null; projectKey?: string | null }
    : {};
  const access = requireProjectAccess({ projectKey: input.projectKey ?? null, action: "evidence.read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const dataRoom = await buildClientDataRoom({
    projectId: input.projectId ?? null,
    projectKey: input.projectKey ?? null,
    includeStoredState: hasVerifiedRequestIdentity(access)
  });

  return NextResponse.json({
    ...dataRoom,
    access
  }, { status: dataRoom.ok ? 200 : 404 });
}
