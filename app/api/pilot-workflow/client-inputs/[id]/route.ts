import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { buildPilotWorkflowSummary } from "@/src/lib/pilot-workflow/pilot-workflow-summary";
import { createPilotClientInput } from "@/src/lib/repositories/pilot-workflow-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import {
  pilotWorkflowCaveat,
  type ClientInputItem,
  type ClientInputStatus
} from "@/src/types/pilot-workflow";

export const runtime = "nodejs";

const statuses: ClientInputStatus[] = [
  "missing",
  "requested",
  "provided_unvalidated",
  "in_review",
  "accepted_for_screening",
  "blocked",
  "not_applicable"
];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isClientInput(value: unknown): value is ClientInputItem {
  const item = asRecord(value);
  return typeof item.id === "string"
    && typeof item.projectKey === "string"
    && typeof item.title === "string"
    && typeof item.inputType === "string"
    && typeof item.required === "boolean"
    && typeof item.priority === "string"
    && statuses.includes(item.status as ClientInputStatus);
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
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  const input = asRecord(body);
  if (!isClientInput(input)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid pilot client input metadata." }, { status: 400 });
  }

  const item = {
    ...input,
    id,
    caveat: input.caveat ?? pilotWorkflowCaveat
  };
  const result = await createPilotClientInput(item);
  const summary = await buildPilotWorkflowSummary({ projectId: item.projectId, projectKey: item.projectKey });
  const access = requireProjectAccess({ projectKey: item.projectKey, action: "write", mode: "soft" });
  void recordAuditEvent({
    projectKey: item.projectKey,
    eventType: "pilot_input_updated",
    entityType: "pilot_client_input",
    entityId: id,
    action: "Updated pilot client input",
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
