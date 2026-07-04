import { NextResponse } from "next/server";
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
  const result = await listProjects();

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    items: result.data ?? [],
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

  const result = await createProject(body);

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    persisted: result.mode === "supabase" && result.ok,
    project: result.data,
    error: result.error,
    message: result.mode === "supabase" && result.ok
      ? "Project saved."
      : "Project available as local sample context; Supabase is not configured or unavailable."
  });
}
