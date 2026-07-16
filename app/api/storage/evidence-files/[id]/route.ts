import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import {
  deleteEvidenceFileAssetMetadata,
  getEvidenceFileAsset,
  updateEvidenceFileAsset
} from "@/src/lib/repositories/evidence-file-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { deleteEvidenceFile } from "@/src/lib/storage/storage-server";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const existing = await getEvidenceFileAsset(id);

  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Evidence file metadata not found." }, { status: 404 });
  }

  const access = requireProjectAccess({ projectKey: existing.data.projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const deleteResult = await deleteEvidenceFile(existing.data);
  const metadataResult = await updateEvidenceFileAsset(id, {
    objectStatus: "deleted",
    storagePath: existing.data.storageProvider === "supabase_storage" ? existing.data.storagePath : existing.data.storagePath
  });

  if (!metadataResult.data) {
    await deleteEvidenceFileAssetMetadata(id);
  }

  void recordAuditEvent({
    projectKey: existing.data.projectKey,
    eventType: "evidence_file_deleted",
    entityType: "evidence_file",
    entityId: id,
    action: "Deleted evidence file metadata/object",
    metadata: {
      storageProvider: existing.data.storageProvider,
      objectDeleted: deleteResult.deletedObject,
      accessAllowed: access.allowed
    }
  });

  return NextResponse.json({
    ok: deleteResult.ok,
    ...repositoryModeFields(metadataResult.mode),
    item: metadataResult.data,
    access,
    message: deleteResult.message
  });
}
