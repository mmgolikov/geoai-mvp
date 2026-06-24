import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { createDataRoomChecklistItem, updateDataRoomChecklistItem } from "@/src/lib/repositories/data-room-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import {
  dataRoomRequiredCaveat,
  type ValidationChecklistItem
} from "@/src/types/data-room";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  const { id } = await context.params;
  const patch = typeof body === "object" && body !== null && !Array.isArray(body)
    ? body as Partial<ValidationChecklistItem>
    : {};
  let result = await updateDataRoomChecklistItem(id, patch);

  if (!result.data && patch.projectKey && patch.title && patch.category && patch.priority && patch.description) {
    result = await createDataRoomChecklistItem({
      id,
      projectId: patch.projectId ?? null,
      projectKey: patch.projectKey,
      title: patch.title,
      category: patch.category,
      status: patch.status ?? "required",
      priority: patch.priority,
      description: patch.description,
      linkedAssetIds: patch.linkedAssetIds ?? [],
      caveat: patch.caveat ?? dataRoomRequiredCaveat
    });
  }
  const access = requireProjectAccess({ projectKey: patch.projectKey ?? null, action: "write", mode: "soft" });
  void recordAuditEvent({
    projectKey: patch.projectKey ?? null,
    eventType: "checklist_updated",
    entityType: "validation_checklist_item",
    entityId: id,
    action: "Updated checklist item",
    metadata: { status: patch.status, accessAllowed: access.allowed }
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
