import { NextResponse } from "next/server";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { buildPilotWorkflowSummary } from "@/src/lib/pilot-workflow/pilot-workflow-summary";
import { createPilotWorkflow } from "@/src/lib/repositories/pilot-workflow-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import {
  pilotWorkflowCaveat,
  type PilotWorkflow
} from "@/src/types/pilot-workflow";

export const runtime = "nodejs";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isWorkflow(value: unknown): value is PilotWorkflow {
  const item = asRecord(value);
  return typeof item.id === "string"
    && typeof item.projectKey === "string"
    && typeof item.title === "string"
    && typeof item.decisionQuestion === "string";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey");
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  const summary = await buildPilotWorkflowSummary({ projectId, projectKey });
  return NextResponse.json({ ...summary, access }, { status: summary.ok ? 200 : 404 });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  const input = asRecord(body);
  if (isWorkflow(input.workflow ?? input)) {
    const workflow = (input.workflow ?? input) as PilotWorkflow;
    await createPilotWorkflow({
      ...workflow,
      caveat: workflow.caveat ?? pilotWorkflowCaveat
    });
    const summary = await buildPilotWorkflowSummary({ projectId: workflow.projectId, projectKey: workflow.projectKey });
    return NextResponse.json({
      ...summary,
      access: requireProjectAccess({ projectKey: workflow.projectKey, action: "write", mode: "soft" })
    });
  }

  const projectId = typeof input.projectId === "string" ? input.projectId : null;
  const projectKey = typeof input.projectKey === "string" ? input.projectKey : null;
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  const summary = await buildPilotWorkflowSummary({ projectId, projectKey });
  return NextResponse.json({ ...summary, access }, { status: summary.ok ? 200 : 404 });
}

export async function PATCH(request: Request) {
  return POST(request);
}
