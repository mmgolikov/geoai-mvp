import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { createSignedDownloadUrl, getStorageProviderStatus } from "@/src/lib/storage/storage-server";
import { evidenceFileCaveat, type EvidenceFileAsset } from "@/src/types/storage";

export async function verifySignedDownloadUrl(asset: EvidenceFileAsset) {
  const readiness = await getStorageProviderStatus();

  if (!readiness.storageReady || asset.storageProvider !== "supabase_storage") {
    return {
      ok: false as const,
      status: 409,
      reason: "metadata_only",
      provider: asset.storageProvider,
      ...repositoryModeFields(readiness.repositoryMode),
      message: "File binary is not available because durable storage is not configured.",
      nextAction: "Configure Supabase Storage buckets and policies.",
      caveat: evidenceFileCaveat
    };
  }

  if (!asset.bucketName || !asset.storagePath) {
    return {
      ok: false as const,
      status: 409,
      reason: "missing_object_path",
      provider: asset.storageProvider,
      ...repositoryModeFields(readiness.repositoryMode),
      message: "Evidence file metadata is missing a bucket or object path.",
      nextAction: "Re-upload the file or repair storage metadata.",
      caveat: evidenceFileCaveat
    };
  }

  const signed = await createSignedDownloadUrl(asset);
  if (!signed.ok) {
    return {
      ok: false as const,
      status: signed.status,
      reason: "signed_url_unavailable",
      provider: asset.storageProvider,
      ...repositoryModeFields(readiness.repositoryMode),
      message: signed.message,
      nextAction: "Verify the private bucket, object path and storage policy.",
      caveat: evidenceFileCaveat
    };
  }

  return {
    ok: true as const,
    status: 200,
    reason: "signed_url_verified",
    provider: "supabase_storage" as const,
    ...repositoryModeFields(readiness.repositoryMode),
    signedUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
    caveat: "Signed URL is temporary and requires configured private buckets, policies and project access enforcement."
  };
}
