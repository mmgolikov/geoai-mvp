import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import {
  getEvidenceFileAsset,
  updateEvidenceFileAsset
} from "@/src/lib/repositories/evidence-file-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { createSignedDownloadUrl } from "@/src/lib/storage/storage-server";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const existing = await getEvidenceFileAsset(id);

  if (!existing.data || existing.data.objectStatus === "deleted") {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Evidence file metadata not found." }, { status: 404 });
  }

  const access = requireProjectAccess({ projectKey: existing.data.projectKey, action: "read", mode: "soft" });
  const signed = await createSignedDownloadUrl(existing.data);

  void recordAuditEvent({
    projectKey: existing.data.projectKey,
    eventType: "evidence_file_download_requested",
    entityType: "evidence_file",
    entityId: id,
    action: "Requested evidence file download",
    metadata: { storageProvider: existing.data.storageProvider, available: signed.ok, accessAllowed: access.allowed }
  });

  if (!signed.ok) {
    return NextResponse.json({
      ok: false,
      ...repositoryModeFields(existing.mode),
      access,
      message: signed.message
    }, { status: signed.status });
  }

  void updateEvidenceFileAsset(id, { signedUrlExpiresAt: signed.expiresAt });

  return NextResponse.json({
    ok: true,
    ...repositoryModeFields("supabase"),
    access,
    signedUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
    caveat: "Signed URL is temporary and requires verified project access enforcement before protected client use."
  });
}
