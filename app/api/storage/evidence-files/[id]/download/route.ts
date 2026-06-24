import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import {
  getEvidenceFileAsset,
  updateEvidenceFileAsset
} from "@/src/lib/repositories/evidence-file-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { verifySignedDownloadUrl } from "@/src/lib/storage/signed-url-verification";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const existing = await getEvidenceFileAsset(id);

  if (!existing.data || existing.data.objectStatus === "deleted") {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Evidence file metadata not found." }, { status: 404 });
  }

  const access = requireProjectAccess({ projectKey: existing.data.projectKey, action: "read", mode: "soft" });
  const signed = await verifySignedDownloadUrl(existing.data);

  void recordAuditEvent({
    projectKey: existing.data.projectKey,
    eventType: "signed_url_requested",
    entityType: "evidence_file",
    entityId: id,
    action: "Requested signed evidence download URL",
    metadata: { storageProvider: existing.data.storageProvider, available: signed.ok, reason: signed.reason, accessAllowed: access.allowed }
  });

  if (!signed.ok) {
    return NextResponse.json({
      ok: false,
      ...repositoryModeFields(existing.mode),
      access,
      reason: signed.reason,
      message: signed.message,
      nextAction: signed.nextAction,
      caveat: signed.caveat
    }, { status: signed.status });
  }

  void updateEvidenceFileAsset(id, { signedUrlExpiresAt: signed.expiresAt });
  void recordAuditEvent({
    projectKey: existing.data.projectKey,
    eventType: "signed_url_verified",
    entityType: "evidence_file",
    entityId: id,
    action: "Verified signed evidence download URL",
    metadata: { expiresAt: signed.expiresAt, accessAllowed: access.allowed }
  });

  return NextResponse.json({
    ok: true,
    ...repositoryModeFields("supabase"),
    access,
    signedUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
    caveat: "Signed URL is temporary and requires verified project access enforcement before protected client use."
  });
}
