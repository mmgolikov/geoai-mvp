import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import {
  allowedEvidenceMimeTypes,
  getStorageReadiness,
  maxEvidenceFileSizeBytes
} from "@/src/lib/storage/storage-readiness";
import { evidenceFileCaveat, type EvidenceFileAsset, type StorageProvider } from "@/src/types/storage";

type SupabaseStorageClientLike = {
  storage?: {
    from: (bucket: string) => {
      upload: (path: string, body: Buffer | Uint8Array | ArrayBuffer, options?: unknown) => Promise<{ data?: { path?: string }; error?: { message?: string } | null }>;
      createSignedUrl: (path: string, expiresIn: number) => Promise<{ data?: { signedUrl?: string }; error?: { message?: string } | null }>;
      remove: (paths: string[]) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
    };
  };
};

export type EvidenceFileValidationResult =
  | { ok: true; safeFileName: string; extension: string; mimeType: string; size: number }
  | { ok: false; message: string };

export function getStorageServerClient() {
  return getSupabaseServerClient() as Promise<SupabaseStorageClientLike | null>;
}

export async function getStorageProviderStatus() {
  return getStorageReadiness();
}

export function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return normalized || "evidence-file";
}

export function fileExtension(fileName: string) {
  const match = sanitizeFileName(fileName).match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? "";
}

export function validateEvidenceFile(input: { fileName: string; mimeType: string; size: number }): EvidenceFileValidationResult {
  const safeFileName = sanitizeFileName(input.fileName);
  const extension = fileExtension(safeFileName);
  const mimeType = input.mimeType || "application/octet-stream";

  if (input.size <= 0) {
    return { ok: false, message: "Evidence file is empty." };
  }

  if (input.size > maxEvidenceFileSizeBytes) {
    return { ok: false, message: "Evidence file is larger than the 5 MB MVP limit." };
  }

  if (!allowedEvidenceMimeTypes.includes(mimeType)) {
    return { ok: false, message: `Unsupported evidence file type: ${mimeType || "unknown"}.` };
  }

  if (["exe", "sh", "bat", "cmd", "js", "mjs", "ts", "tsx", "php", "py", "rb"].includes(extension)) {
    return { ok: false, message: "Executable or script files are not allowed as evidence uploads." };
  }

  return { ok: true, safeFileName, extension, mimeType, size: input.size };
}

export function buildStoragePath(input: {
  organizationId?: string | null;
  projectId?: string | null;
  projectKey: string;
  validationEvidenceId?: string | null;
  dataRoomAssetId?: string | null;
  fileId: string;
  safeFileName: string;
}) {
  const fileSegment = `${input.fileId}-${input.safeFileName}`;

  if (input.organizationId && input.projectId) {
    if (input.validationEvidenceId) {
      return `org/${input.organizationId}/project/${input.projectId}/validation/${input.validationEvidenceId}/${fileSegment}`;
    }

    if (input.dataRoomAssetId) {
      return `org/${input.organizationId}/project/${input.projectId}/data-room/${input.dataRoomAssetId}/${fileSegment}`;
    }

    return `org/${input.organizationId}/project/${input.projectId}/evidence/${fileSegment}`;
  }

  if (input.validationEvidenceId) {
    return `demo/project/${input.projectKey}/validation/${input.validationEvidenceId}/${fileSegment}`;
  }

  if (input.dataRoomAssetId) {
    return `demo/project/${input.projectKey}/data-room/${input.dataRoomAssetId}/${fileSegment}`;
  }

  return `demo/project/${input.projectKey}/evidence/${fileSegment}`;
}

export async function uploadEvidenceFile(input: {
  bytes: ArrayBuffer;
  fileId: string;
  fileName: string;
  mimeType: string;
  projectKey: string;
  projectId?: string | null;
  organizationId?: string | null;
  validationEvidenceId?: string | null;
  dataRoomAssetId?: string | null;
}): Promise<{
  provider: StorageProvider;
  bucketName: string | null;
  storagePath: string | null;
  objectStatus: EvidenceFileAsset["objectStatus"];
  error: string | null;
}> {
  const readiness = await getStorageReadiness();
  const validation = validateEvidenceFile({
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.bytes.byteLength
  });

  if (!validation.ok) {
    return {
      provider: readiness.provider,
      bucketName: null,
      storagePath: null,
      objectStatus: "failed",
      error: validation.message
    };
  }

  const bucketName = "geoai-validation-evidence";
  const storagePath = buildStoragePath({
    organizationId: input.organizationId,
    projectId: input.projectId,
    projectKey: input.projectKey,
    validationEvidenceId: input.validationEvidenceId,
    dataRoomAssetId: input.dataRoomAssetId,
    fileId: input.fileId,
    safeFileName: validation.safeFileName
  });

  if (!readiness.storageReady) {
    return {
      provider: readiness.provider,
      bucketName,
      storagePath,
      objectStatus: "metadata_only",
      error: null
    };
  }

  const client = await getStorageServerClient();
  const response = await client?.storage?.from(bucketName).upload(storagePath, Buffer.from(input.bytes), {
    contentType: validation.mimeType,
    upsert: false
  });

  if (!response || response.error) {
    return {
      provider: "supabase_storage",
      bucketName,
      storagePath,
      objectStatus: "failed",
      error: response?.error?.message ?? "Supabase Storage upload failed."
    };
  }

  return {
    provider: "supabase_storage",
    bucketName,
    storagePath,
    objectStatus: "available",
    error: null
  };
}

export async function createSignedDownloadUrl(asset: EvidenceFileAsset) {
  if (asset.storageProvider !== "supabase_storage" || !asset.bucketName || !asset.storagePath) {
    return {
      ok: false,
      status: 409,
      message: "File binary is not available because durable storage is not configured."
    };
  }

  const client = await getStorageServerClient();
  const response = await client?.storage?.from(asset.bucketName).createSignedUrl(asset.storagePath, 60 * 10);

  if (!response?.data?.signedUrl || response.error) {
    return { ok: false, status: 404, message: response?.error?.message ?? "Signed download URL is unavailable." };
  }

  return {
    ok: true,
    status: 200,
    signedUrl: response.data.signedUrl,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  };
}

export async function deleteEvidenceFile(asset: EvidenceFileAsset) {
  if (asset.storageProvider !== "supabase_storage" || !asset.bucketName || !asset.storagePath) {
    return { ok: true, deletedObject: false, message: evidenceFileCaveat };
  }

  const client = await getStorageServerClient();
  const response = await client?.storage?.from(asset.bucketName).remove([asset.storagePath]);

  return {
    ok: !response?.error,
    deletedObject: !response?.error,
    message: response?.error?.message ?? null
  };
}
