import { NextResponse } from "next/server";
import { isPreAuthServerMutationBlocked, projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { buildPilotWorkflowSummary } from "@/src/lib/pilot-workflow/pilot-workflow-summary";
import { createPilotWorkflow } from "@/src/lib/repositories/pilot-workflow-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import {
  pilotWorkflowCaveat,
  type PilotWorkflow
} from "@/src/types/pilot-workflow";
import { hasVerifiedRequestIdentity } from "@/src/lib/auth/verified-request-access";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";

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
  if (!access.allowed) {
    return privateNoStoreJson(projectAccessDeniedPayload(access), { status: access.status });
  }
  const summary = await buildPilotWorkflowSummary({
    projectId,
    projectKey,
    includeStoredState: hasVerifiedRequestIdentity(access)
  });
  return privateNoStoreJson({ ...summary, access }, { status: summary.ok ? 200 : 404 });
}

export async function POST(request: Request) {
  if (isPreAuthServerMutationBlocked("write")) {
    const access = requireProjectAccess({ action: "write", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  const input = asRecord(body);
  if (isWorkflow(input.workflow ?? input)) {
    const workflow = (input.workflow ?? input) as PilotWorkflow;
    const access = requireProjectAccess({ projectKey: workflow.projectKey, action: "write", mode: "soft" });
    if (!access.allowed) {
      return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
    }
    await createPilotWorkflow({
      ...workflow,
      caveat: workflow.caveat ?? pilotWorkflowCaveat
    });
    const summary = await buildPilotWorkflowSummary({
      projectId: workflow.projectId,
      projectKey: workflow.projectKey,
      includeStoredState: hasVerifiedRequestIdentity(access)
    });
    return NextResponse.json({
      ...summary,
      access
    });
  }

  const projectId = typeof input.projectId === "string" ? input.projectId : null;
  const projectKey = typeof input.projectKey === "string" ? input.projectKey : null;
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const summary = await buildPilotWorkflowSummary({
    projectId,
    projectKey,
    includeStoredState: hasVerifiedRequestIdentity(access)
  });
  return NextResponse.json({ ...summary, access }, { status: summary.ok ? 200 : 404 });
}

export async function PATCH(request: Request) {
  return POST(request);
}
