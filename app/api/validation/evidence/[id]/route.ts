import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { deleteValidationEvidence, updateValidationEvidence } from "@/src/lib/repositories/validation-repository";
import type { ValidationEvidence } from "@/src/types/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  const patch = typeof body === "object" && body !== null && !Array.isArray(body)
    ? body as Partial<ValidationEvidence>
    : {};
  const access = requireProjectAccess({ projectKey: patch.projectKey ?? null, action: "write", mode: "soft" });
  const result = await updateValidationEvidence(id, patch);
  void recordAuditEvent({
    projectKey: patch.projectKey ?? null,
    eventType: "validation_evidence_updated",
    entityType: "validation_evidence",
    entityId: id,
    action: "Updated validation evidence metadata",
    metadata: { status: patch.validationStatus, accessAllowed: access.allowed }
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    item: result.data,
    access,
    error: result.error,
    dataHonesty: "Validation evidence updates do not certify ownership, zoning, cadastral status, planning approval or valuation."
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await deleteValidationEvidence(id);
  void recordAuditEvent({
    eventType: "validation_evidence_deleted",
    entityType: "validation_evidence",
    entityId: id,
    action: "Deleted validation evidence metadata"
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    deleted: result.data,
    error: result.error
  });
}
