import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { getDataRoomChecklistItem, updateDataRoomChecklistItem } from "@/src/lib/repositories/data-room-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import {
  type ValidationChecklistCategory,
  type ValidationChecklistItem,
  type ValidationChecklistPriority,
  type ValidationChecklistStatus
} from "@/src/types/data-room";
import { readBoundedJson } from "@/src/lib/http/bounded-json";

export const runtime = "nodejs";

const categories: ValidationChecklistCategory[] = ["market", "parcel", "zoning", "ownership", "planning", "climate", "infrastructure", "client_data", "report"];
const statuses: ValidationChecklistStatus[] = ["not_started", "required", "in_review", "completed", "blocked", "not_applicable"];
const priorities: ValidationChecklistPriority[] = ["high", "medium", "low"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const parsed = await readBoundedJson(request, 96 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: parsed.message }, { status: parsed.status });
  }
  const body = parsed.value;

  const { id } = await context.params;
  const patch = typeof body === "object" && body !== null && !Array.isArray(body)
    ? body as Partial<ValidationChecklistItem>
    : {};
  const existing = await getDataRoomChecklistItem(id);
  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "Checklist item not found." }, { status: 404 });
  }
  const projectKey = existing.data.projectKey;
  const access = requireProjectAccess({ projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const controlledFields: Array<keyof ValidationChecklistItem> = ["id", "projectId", "projectKey", "caveat"];
  const attemptedControlledFields = controlledFields.filter((field) => Object.prototype.hasOwnProperty.call(patch, field));
  if (attemptedControlledFields.length > 0) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: `Scope-controlled fields cannot be changed through checklist PATCH: ${attemptedControlledFields.join(", ")}.` }, { status: 400 });
  }

  if (patch.category !== undefined && !categories.includes(patch.category)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "category is invalid." }, { status: 400 });
  }
  if (patch.status !== undefined && !statuses.includes(patch.status)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "status is invalid." }, { status: 400 });
  }
  if (patch.priority !== undefined && !priorities.includes(patch.priority)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "priority is invalid." }, { status: 400 });
  }
  if (patch.linkedAssetIds !== undefined && (!Array.isArray(patch.linkedAssetIds) || patch.linkedAssetIds.length > 50 || patch.linkedAssetIds.some((item) => typeof item !== "string" || !/^[a-zA-Z0-9_.:-]{1,240}$/.test(item)))) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "linkedAssetIds is invalid." }, { status: 400 });
  }
  const safePatch: Partial<ValidationChecklistItem> = {
    ...(typeof patch.title === "string" && patch.title.trim() ? { title: patch.title.trim().slice(0, 500) } : {}),
    ...(typeof patch.description === "string" ? { description: patch.description.trim().slice(0, 4000) } : {}),
    ...(patch.category ? { category: patch.category } : {}),
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.priority ? { priority: patch.priority } : {}),
    ...(patch.linkedAssetIds ? { linkedAssetIds: patch.linkedAssetIds } : {})
  };
  const result = await updateDataRoomChecklistItem(id, safePatch);
  void recordAuditEvent({
    projectKey,
    eventType: "checklist_updated",
    entityType: "validation_checklist_item",
    entityId: id,
    action: "Updated checklist item",
    metadata: { status: safePatch.status, accessAllowed: access.allowed }
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields("local_fallback"),
    item: result.data,
    access,
    error: result.error,
    dataHonesty: "Checklist status is not an official validation claim."
  });
}
