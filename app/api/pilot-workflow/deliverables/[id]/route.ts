import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { isPreAuthServerMutationBlocked, projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { buildPilotWorkflowSummary } from "@/src/lib/pilot-workflow/pilot-workflow-summary";
import { createPilotDeliverable, getPilotDeliverable } from "@/src/lib/repositories/pilot-workflow-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import {
  pilotWorkflowCaveat,
  type PilotDeliverableStatus,
  type PilotDeliverableWorkflowStatus
} from "@/src/types/pilot-workflow";

export const runtime = "nodejs";

const statuses: PilotDeliverableWorkflowStatus[] = [
  "planned",
  "in_progress",
  "generated",
  "ready_for_review",
  "validation_required",
  "blocked"
];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isDeliverable(value: unknown): value is PilotDeliverableStatus {
  const item = asRecord(value);
  return typeof item.id === "string"
    && typeof item.projectKey === "string"
    && typeof item.title === "string"
    && typeof item.deliverableType === "string"
    && typeof item.nextAction === "string"
    && statuses.includes(item.status as PilotDeliverableWorkflowStatus);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (isPreAuthServerMutationBlocked("write")) {
    const access = requireProjectAccess({ action: "workflow.write", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const { id } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  const input = asRecord(body);
  if (!isDeliverable(input)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid pilot deliverable metadata." }, { status: 400 });
  }

  const item = {
    ...input,
    id,
    caveat: input.caveat ?? pilotWorkflowCaveat
  };
  const existing = await getPilotDeliverable(id);
  const projectKey = existing.data?.projectKey ?? item.projectKey;
  const access = requireProjectAccess({ projectKey, action: "workflow.write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  if (existing.data && item.projectKey !== existing.data.projectKey) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "projectKey cannot be changed by this route." }, { status: 400 });
  }

  const result = await createPilotDeliverable(item);
  const summary = await buildPilotWorkflowSummary({ projectId: item.projectId, projectKey: item.projectKey });
  void recordAuditEvent({
    projectKey: item.projectKey,
    eventType: "pilot_deliverable_updated",
    entityType: "pilot_deliverable",
    entityId: id,
    action: "Updated pilot deliverable",
    metadata: { status: item.status, accessAllowed: access.allowed }
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields("local_fallback"),
    item: result.data,
    workflow: summary,
    access,
    error: result.error,
    dataHonesty: summary.dataHonesty
  }, { status: result.ok ? 200 : 500 });
}
