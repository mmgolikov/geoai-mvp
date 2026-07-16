import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { deleteDataRoomAsset, getDataRoomAsset, updateDataRoomAsset } from "@/src/lib/repositories/data-room-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { DataRoomAsset } from "@/src/types/data-room";
import type { DataRoomValidationStatus } from "@/src/types/data-room";
import { readBoundedJson } from "@/src/lib/http/bounded-json";

export const runtime = "nodejs";

const validationStatuses: DataRoomValidationStatus[] = [
  "validation_required", "client_provided_unvalidated", "sample_fallback", "ready_for_review", "planned_official_validation"
];

function boundedIds(value: unknown) {
  return Array.isArray(value) && value.length <= 50 && value.every((item) => typeof item === "string" && /^[a-zA-Z0-9_.:-]{1,240}$/.test(item))
    ? value
    : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const parsed = await readBoundedJson(request, 128 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: parsed.message }, { status: parsed.status });
  }
  const body = parsed.value;

  const { id } = await context.params;
  const patch = typeof body === "object" && body !== null && !Array.isArray(body)
    ? body as Partial<DataRoomAsset>
    : {};
  const existing = await getDataRoomAsset(id);
  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "Data room asset not found." }, { status: 404 });
  }

  const access = requireProjectAccess({ projectKey: existing.data.projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const controlledFields: Array<keyof DataRoomAsset> = [
    "id", "projectId", "projectKey", "assetType", "sourceType", "fileName", "fileSizeBytes", "mimeType",
    "storageProvider", "objectStatus", "linkedValidationEvidenceIds", "downloadAvailable", "createdAt", "updatedAt", "caveat"
  ];
  const attemptedControlledFields = controlledFields.filter((field) => Object.prototype.hasOwnProperty.call(patch, field));
  if (attemptedControlledFields.length > 0) {
    return NextResponse.json({
      ok: false,
      ...repositoryModeFields(existing.mode),
      message: `Scope/storage-controlled fields cannot be changed through asset PATCH: ${attemptedControlledFields.join(", ")}.`
    }, { status: 400 });
  }

  const arrayFields = ["linkedAoiIds", "linkedAnalysisIds", "linkedReportIds"] as const;
  for (const field of arrayFields) {
    if (patch[field] !== undefined && !boundedIds(patch[field])) {
      return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: `${field} is invalid.` }, { status: 400 });
    }
  }
  if (patch.validationStatus !== undefined && !validationStatuses.includes(patch.validationStatus)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "validationStatus is invalid." }, { status: 400 });
  }
  const safePatch: Partial<DataRoomAsset> = {
    ...(typeof patch.name === "string" && patch.name.trim() ? { name: patch.name.trim().slice(0, 500) } : {}),
    ...(typeof patch.description === "string" ? { description: patch.description.trim().slice(0, 4000) } : {}),
    ...(patch.validationStatus ? { validationStatus: patch.validationStatus } : {}),
    ...(patch.linkedAoiIds ? { linkedAoiIds: patch.linkedAoiIds } : {}),
    ...(patch.linkedAnalysisIds ? { linkedAnalysisIds: patch.linkedAnalysisIds } : {}),
    ...(patch.linkedReportIds ? { linkedReportIds: patch.linkedReportIds } : {})
  };

  const result = await updateDataRoomAsset(id, safePatch);
  void recordAuditEvent({
    projectKey: existing.data.projectKey,
    eventType: "data_room_asset_added",
    entityType: "data_room_asset",
    entityId: id,
    action: "Updated data room asset metadata",
    metadata: { accessAllowed: access.allowed }
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields("local_fallback"),
    item: result.data,
    access,
    error: result.error,
    dataHonesty: "Data room asset metadata remains local/sample fallback."
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const existing = await getDataRoomAsset(id);
  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "Data room asset not found." }, { status: 404 });
  }

  const access = requireProjectAccess({ projectKey: existing.data.projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const result = await deleteDataRoomAsset(id);
  void recordAuditEvent({
    projectKey: existing.data.projectKey,
    eventType: "data_room_asset_added",
    entityType: "data_room_asset",
    entityId: id,
    action: "Deleted data room asset metadata"
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields("local_fallback"),
    deleted: result.data,
    access,
    error: result.error
  });
}
