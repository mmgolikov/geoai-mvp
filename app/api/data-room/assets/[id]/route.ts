import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { deleteDataRoomAsset, updateDataRoomAsset } from "@/src/lib/repositories/data-room-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { DataRoomAsset } from "@/src/types/data-room";

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
    ? body as Partial<DataRoomAsset>
    : {};
  const result = await updateDataRoomAsset(id, patch);
  const access = requireProjectAccess({ projectKey: patch.projectKey ?? null, action: "write", mode: "soft" });
  void recordAuditEvent({
    projectKey: patch.projectKey ?? null,
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
    dataHonesty: "Data room asset metadata remains local/demo fallback."
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await deleteDataRoomAsset(id);
  void recordAuditEvent({
    eventType: "data_room_asset_added",
    entityType: "data_room_asset",
    entityId: id,
    action: "Deleted data room asset metadata"
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields("local_fallback"),
    deleted: result.data,
    error: result.error
  });
}
