import { NextResponse } from "next/server";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import {
  createProject,
  listProjects
} from "@/src/lib/db/repositories/projects";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { ProjectInput } from "@/src/lib/db/types";

export const runtime = "nodejs";

function isProjectInput(value: unknown): value is ProjectInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<ProjectInput>;
  return typeof input.name === "string" && input.name.trim().length > 0;
}

export async function GET() {
  const access = requireProjectAccess({ projectKey: null, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const result = await listProjects();

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    items: result.data ?? [],
    access,
    error: result.error
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, ...repositoryModeFields("demo_seed"), persisted: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!isProjectInput(body)) {
    return NextResponse.json(
      { ok: false, ...repositoryModeFields("demo_seed"), persisted: false, message: "Invalid project payload." },
      { status: 400 }
    );
  }

  const access = requireProjectAccess({ projectKey: body.projectKey ?? null, action: "manage", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const result = await createProject(body);

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    persisted: result.mode === "supabase" && result.ok,
    access,
    project: result.data,
    error: result.error,
    message: result.mode === "supabase" && result.ok
      ? "Project saved."
      : "Project available as local sample context; Supabase is not configured or unavailable."
  });
}
