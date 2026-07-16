import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { isPreAuthServerMutationBlocked, projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { deleteValidationEvidence, getValidationEvidence, updateValidationEvidence } from "@/src/lib/repositories/validation-repository";
import type { ValidationEvidence } from "@/src/types/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (isPreAuthServerMutationBlocked("write")) {
    const access = requireProjectAccess({ action: "write", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
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
  const existing = await getValidationEvidence(id);
  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "Validation evidence not found." }, { status: 404 });
  }

  const access = requireProjectAccess({ projectKey: existing.data.projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const controlledFields: Array<keyof ValidationEvidence> = [
    "id", "organizationId", "projectId", "projectKey", "sourceCategory", "accessMode",
    "validationStatus", "confidence", "allowedClaimLevel", "reviewedBy", "reviewedAt",
    "linkedEvidenceFileIds", "allowedClaims", "forbiddenClaims", "caveat", "createdAt", "updatedAt"
  ];
  const attemptedControlledFields = controlledFields.filter((field) => Object.prototype.hasOwnProperty.call(patch, field));
  if (attemptedControlledFields.length > 0) {
    return NextResponse.json({
      ok: false,
      ...repositoryModeFields(existing.mode),
      message: `Governance-controlled fields cannot be changed through metadata PATCH: ${attemptedControlledFields.join(", ")}.`
    }, { status: 400 });
  }

  const safePatch: Partial<ValidationEvidence> = {
    ...(typeof patch.title === "string" ? { title: patch.title.trim().slice(0, 500) } : {}),
    ...(typeof patch.sourceName === "string" ? { sourceName: patch.sourceName.trim().slice(0, 500) } : {}),
    ...(typeof patch.description === "string" ? { description: patch.description.trim().slice(0, 4000) } : {}),
    ...(typeof patch.documentDate === "string" || patch.documentDate === null ? { documentDate: patch.documentDate } : {}),
    ...(typeof patch.referenceId === "string" || patch.referenceId === null ? { referenceId: patch.referenceId } : {}),
    ...(typeof patch.sourceUrl === "string" || patch.sourceUrl === null ? { sourceUrl: patch.sourceUrl } : {})
  };

  const result = await updateValidationEvidence(id, safePatch);
  void recordAuditEvent({
    projectKey: existing.data.projectKey,
    eventType: "validation_evidence_updated",
    entityType: "validation_evidence",
    entityId: id,
    action: "Updated validation evidence metadata",
    metadata: { updatedFields: Object.keys(safePatch), accessAllowed: access.allowed }
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
  if (isPreAuthServerMutationBlocked("write")) {
    const access = requireProjectAccess({ action: "write", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const { id } = await context.params;
  const existing = await getValidationEvidence(id);
  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "Validation evidence not found." }, { status: 404 });
  }

  const access = requireProjectAccess({ projectKey: existing.data.projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const result = await deleteValidationEvidence(id);
  void recordAuditEvent({
    projectKey: existing.data.projectKey,
    eventType: "validation_evidence_deleted",
    entityType: "validation_evidence",
    entityId: id,
    action: "Deleted validation evidence metadata"
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    deleted: result.data,
    access,
    error: result.error
  });
}
