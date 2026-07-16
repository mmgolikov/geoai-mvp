import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { allowedEvidenceMimeTypes, maxEvidenceFileSizeBytes } from "@/src/lib/storage/storage-readiness";
import { buildStoragePath, sanitizeFileName, validateEvidenceFile, getStorageProviderStatus } from "@/src/lib/storage/storage-server";
import { evidenceFileCaveat } from "@/src/types/storage";
import { isPreAuthServerMutationBlocked } from "@/src/lib/auth/project-access";

export const runtime = "nodejs";

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(request: Request) {
  if (isPreAuthServerMutationBlocked("upload")) {
    const access = requireProjectAccess({ action: "evidence.upload", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const projectKey = readString(body.projectKey) ?? "dubai-investment-screening-demo";
  const projectId = readString(body.projectId);
  const organizationId = readString(body.organizationId);
  const validationEvidenceId = readString(body.validationEvidenceId);
  const fileName = readString(body.fileName) ?? "evidence-file";
  const mimeType = readString(body.mimeType) ?? "application/octet-stream";
  const fileSizeBytes = typeof body.fileSizeBytes === "number" && Number.isFinite(body.fileSizeBytes)
    ? body.fileSizeBytes
    : 0;
  const access = requireProjectAccess({ projectKey, action: "evidence.upload", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const readiness = await getStorageProviderStatus();
  const validation = validateEvidenceFile({ fileName, mimeType, size: fileSizeBytes });
  const blockers = [
    validation.ok ? null : validation.message,
    readiness.storageReady ? null : "Supabase Storage buckets and policies are not configured or verified."
  ].filter((item): item is string => Boolean(item));
  const storagePath = buildStoragePath({
    organizationId,
    projectId,
    projectKey,
    validationEvidenceId,
    fileId: `intent-${Date.now()}`,
    safeFileName: sanitizeFileName(fileName)
  });

  void recordAuditEvent({
    projectKey,
    eventType: "upload_intent_created",
    entityType: "evidence_file",
    action: "Created evidence upload intent",
    metadata: { provider: readiness.provider, storageReady: readiness.storageReady, blockers, accessAllowed: access.allowed }
  });

  return NextResponse.json({
    ok: validation.ok,
    ...repositoryModeFields(readiness.repositoryMode),
    provider: readiness.provider,
    uploadMode: readiness.storageReady ? "server_multipart" : "metadata_only",
    signedUploadReady: false,
    storagePath,
    maxFileSizeBytes: maxEvidenceFileSizeBytes,
    allowedMimeTypes: allowedEvidenceMimeTypes,
    blockers,
    access,
    caveat: readiness.storageReady
      ? evidenceFileCaveat
      : "Signed URL availability requires configured storage buckets and policies. Local/API fallback is not durable production storage."
  }, { status: validation.ok ? 200 : 400 });
}
