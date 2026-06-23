import { NextResponse } from "next/server";
import { buildClientDataRoom } from "@/src/lib/data-room/data-room-summary";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey");
  const dataRoom = await buildClientDataRoom({ projectId, projectKey });

  return NextResponse.json(dataRoom);
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

  return NextResponse.json(dataRoom);
}
