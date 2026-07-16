import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { getEvidenceFileAsset, updateEvidenceFileAsset } from "@/src/lib/repositories/evidence-file-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { verifySignedDownloadUrl } from "@/src/lib/storage/signed-url-verification";
import { hasRequestIdentityKernelEvidence } from "@/src/lib/auth/verified-request-access";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasRequestIdentityKernelEvidence()) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("browser_local"), message: "Signed URL verification requires verified project identity." }, { status: 403 });
  }
  const { id } = await context.params;
  const existing = await getEvidenceFileAsset(id);

  if (!existing.data || existing.data.objectStatus === "deleted") {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Evidence file metadata not found." }, { status: 404 });
  }

  const access = requireProjectAccess({ projectKey: existing.data.projectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const verification = await verifySignedDownloadUrl(existing.data);

  void recordAuditEvent({
    projectKey: existing.data.projectKey,
    eventType: verification.ok ? "signed_url_verified" : "signed_url_requested",
    entityType: "evidence_file",
    entityId: id,
    action: verification.ok ? "Verified signed URL flow" : "Checked signed URL flow",
    metadata: { reason: verification.reason, provider: verification.provider, accessAllowed: access.allowed }
  });

  if (verification.ok) {
    void updateEvidenceFileAsset(id, { signedUrlExpiresAt: verification.expiresAt });
  }

  return NextResponse.json({
    ...verification,
    access
  }, { status: verification.status });
}
