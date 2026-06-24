import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import {
  createEvidenceFileAsset,
  listEvidenceFileAssets
} from "@/src/lib/repositories/evidence-file-repository";
import { getValidationEvidence, updateValidationEvidence } from "@/src/lib/repositories/validation-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import {
  fileExtension,
  sanitizeFileName,
  uploadEvidenceFile,
  validateEvidenceFile
} from "@/src/lib/storage/storage-server";
import { evidenceFileCaveat, type EvidenceFileAsset } from "@/src/types/storage";

export const runtime = "nodejs";

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function createId(projectKey: string) {
  return `evidence-file-${projectKey}-${Date.now()}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey");
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  const result = await listEvidenceFileAssets({ projectId, projectKey, limit: 80 });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    items: result.data,
    access,
    error: result.error,
    caveat: evidenceFileCaveat
  });
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Expected multipart/form-data upload." }, { status: 400 });
  }

  const file = formData.get("file");
  const projectKey = readString(formData.get("projectKey")) ?? "dubai-investment-screening-demo";
  const projectId = readString(formData.get("projectId"));
  const organizationId = readString(formData.get("organizationId"));
  const validationEvidenceId = readString(formData.get("validationEvidenceId"));
  const dataRoomAssetId = readString(formData.get("dataRoomAssetId"));
  const aoiId = readString(formData.get("aoiId"));
  const reportId = readString(formData.get("reportId"));
  const notes = readString(formData.get("notes"));
  const access = requireProjectAccess({ projectKey, action: "write", mode: "soft" });

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Evidence file is required." }, { status: 400 });
  }

  const validation = validateEvidenceFile({ fileName: file.name, mimeType: file.type, size: file.size });
  if (!validation.ok) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: validation.message }, { status: 400 });
  }

  const fileId = createId(projectKey);
  const uploadResult = await uploadEvidenceFile({
    bytes: await file.arrayBuffer(),
    fileId,
    fileName: file.name,
    mimeType: file.type,
    projectKey,
    projectId,
    organizationId,
    validationEvidenceId,
    dataRoomAssetId
  });

  if (uploadResult.objectStatus === "failed") {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: uploadResult.error ?? "Evidence file upload failed." }, { status: 400 });
  }

  const item: Omit<EvidenceFileAsset, "createdAt" | "updatedAt" | "caveat"> = {
    id: fileId,
    organizationId,
    projectId,
    projectKey,
    linkedValidationEvidenceIds: validationEvidenceId ? [validationEvidenceId] : [],
    linkedDataRoomAssetIds: dataRoomAssetId ? [dataRoomAssetId] : [],
    linkedAoiIds: aoiId ? [aoiId] : [],
    linkedReportIds: reportId ? [reportId] : [],
    fileName: file.name,
    safeFileName: sanitizeFileName(file.name),
    fileSizeBytes: file.size,
    mimeType: file.type,
    extension: fileExtension(file.name),
    storageProvider: uploadResult.provider,
    bucketName: uploadResult.bucketName,
    storagePath: uploadResult.storagePath,
    objectStatus: uploadResult.objectStatus,
    checksum: null,
    uploadedBy: null,
    uploadedAt: new Date().toISOString(),
    signedUrlExpiresAt: null,
    notes,
    validationStatus: "uploaded_unreviewed"
  };

  const result = await createEvidenceFileAsset(item);

  if (validationEvidenceId) {
    void getValidationEvidence(validationEvidenceId).then((existing) => {
      const currentIds = existing.data?.linkedEvidenceFileIds ?? [];
      return updateValidationEvidence(validationEvidenceId, {
        linkedEvidenceFileIds: Array.from(new Set([...currentIds, fileId])),
        validationStatus: "evidence_uploaded"
      });
    });
  }

  void recordAuditEvent({
    projectKey,
    eventType: uploadResult.provider === "supabase_storage" ? "evidence_file_uploaded" : "evidence_file_metadata_created",
    entityType: "evidence_file",
    entityId: fileId,
    action: uploadResult.provider === "supabase_storage" ? "Uploaded evidence file" : "Created evidence file metadata",
    metadata: { storageProvider: uploadResult.provider, objectStatus: uploadResult.objectStatus, accessAllowed: access.allowed }
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    item: result.data,
    access,
    error: result.error,
    dataHonesty: uploadResult.objectStatus === "metadata_only"
      ? "Metadata-only fallback; binary file storage is not configured."
      : evidenceFileCaveat
  }, { status: result.ok ? 201 : 200 });
}
