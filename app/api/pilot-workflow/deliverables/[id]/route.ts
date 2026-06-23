import { NextResponse } from "next/server";
import { buildPilotWorkflowSummary } from "@/src/lib/pilot-workflow/pilot-workflow-summary";
import { createPilotDeliverable } from "@/src/lib/repositories/pilot-workflow-repository";
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
  const { id } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mode: "local_fallback", message: "Invalid JSON body." }, { status: 400 });
  }

  const input = asRecord(body);
  if (!isDeliverable(input)) {
    return NextResponse.json({ ok: false, mode: "local_fallback", message: "Invalid pilot deliverable metadata." }, { status: 400 });
  }

  const item = {
    ...input,
    id,
    caveat: input.caveat ?? pilotWorkflowCaveat
  };
  const result = await createPilotDeliverable(item);
  const summary = await buildPilotWorkflowSummary({ projectId: item.projectId, projectKey: item.projectKey });

  return NextResponse.json({
    ok: result.ok,
    mode: "local_fallback",
    item: result.data,
    workflow: summary,
    error: result.error,
    dataHonesty: summary.dataHonesty
  }, { status: result.ok ? 200 : 500 });
}
