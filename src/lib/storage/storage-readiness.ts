import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { repositoryModeFields, type RepositoryMode } from "@/src/lib/repositories/repository-mode";
import type { StorageProvider } from "@/src/types/storage";

export const requiredStorageBuckets = [
  "geoai-data-room-assets",
  "geoai-validation-evidence",
  "geoai-report-exports",
  "geoai-aoi-imports"
] as const;

export type RequiredStorageBucket = (typeof requiredStorageBuckets)[number];

export const storageVerificationBucket: RequiredStorageBucket = "geoai-validation-evidence";
export const storageVerificationMarkerPath = ".geoai/storage-readiness/signed-url-verified.json";

export type StorageReadiness = {
  ok: boolean;
  configured: boolean;
  provider: StorageProvider;
  repositoryMode: RepositoryMode;
  bucketReady: boolean;
  storageReady: boolean;
  requiredBuckets: RequiredStorageBucket[];
  missingBuckets: RequiredStorageBucket[];
  maxFileSize: string;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
  signedUploadReady: boolean;
  signedDownloadReady: boolean;
  privateBucketPolicyReady: boolean;
  signedUrlVerified: boolean;
  writeTestAllowed: boolean;
  lastVerifiedAt: string | null;
  caveat: string;
  blockers: string[];
  nextActions: string[];
};

type SupabaseStorageBucketLike = {
  download?: (path: string) => Promise<{ data?: unknown; error?: unknown }>;
  createSignedUrl?: (path: string, expiresIn: number) => Promise<{ data?: { signedUrl?: string } | null; error?: unknown }>;
};

type SupabaseStorageClientLike = {
  storage?: {
    getBucket: (bucket: string) => Promise<{ data?: unknown; error?: unknown }>;
    from?: (bucket: string) => SupabaseStorageBucketLike;
  };
};

export const maxEvidenceFileSizeBytes = 5 * 1024 * 1024;
const maxFileSize = "5 MB per MVP evidence file";
export const allowedEvidenceMimeTypes = [
  "application/pdf",
  "text/csv",
  "application/json",
  "application/geo+json",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

function baseResponse(input: Omit<StorageReadiness, "ok" | "maxFileSize" | "maxFileSizeBytes" | "allowedMimeTypes">): StorageReadiness {
  return {
    ok: true,
    maxFileSize,
    maxFileSizeBytes: maxEvidenceFileSizeBytes,
    allowedMimeTypes: [...allowedEvidenceMimeTypes],
    ...input
  };
}

async function verifySignedStorageMarker(client: SupabaseStorageClientLike | null) {
  const bucket = client?.storage?.from?.(storageVerificationBucket);
  if (!bucket?.download || !bucket.createSignedUrl) {
    return { verified: false, verifiedAt: null as string | null };
  }

  try {
    const downloadResponse = await bucket.download(storageVerificationMarkerPath);
    if (downloadResponse.error || !downloadResponse.data) {
      return { verified: false, verifiedAt: null as string | null };
    }

    const signedUrlResponse = await bucket.createSignedUrl(storageVerificationMarkerPath, 60);
    const signedUrl = signedUrlResponse.data?.signedUrl;
    if (signedUrlResponse.error || !signedUrl) {
      return { verified: false, verifiedAt: null as string | null };
    }

    const fetchResponse = await fetch(signedUrl, { cache: "no-store" });
    if (!fetchResponse.ok) {
      return { verified: false, verifiedAt: null as string | null };
    }

    const text = await fetchResponse.text();
    const marker = JSON.parse(text) as { verifiedAt?: string; markerVersion?: string };
    return {
      verified: marker.markerVersion === "geoai-storage-readiness-v1",
      verifiedAt: marker.verifiedAt ?? null
    };
  } catch {
    return { verified: false, verifiedAt: null as string | null };
  }
}

export async function getStorageReadiness(): Promise<StorageReadiness> {
  const writeTestAllowed = process.env.GEOAI_ALLOW_STORAGE_WRITE_TEST?.trim().toLowerCase() === "true";

  if (!isSupabaseConfigured()) {
    return baseResponse({
      configured: false,
      provider: "local_metadata_only",
      repositoryMode: "local_fallback",
      bucketReady: false,
      storageReady: false,
      requiredBuckets: [...requiredStorageBuckets],
      missingBuckets: [...requiredStorageBuckets],
      signedUploadReady: false,
      signedDownloadReady: false,
      privateBucketPolicyReady: false,
      signedUrlVerified: false,
      writeTestAllowed,
      lastVerifiedAt: null,
      caveat: "Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.",
      blockers: ["Supabase server environment is not configured."],
      nextActions: [
        "Configure Supabase project env vars in Vercel/server runtime.",
        "Create required storage buckets with private access.",
        "Add and verify bucket policies plus signed upload/download flows."
      ]
    });
  }

  const client = await getSupabaseServerClient() as SupabaseStorageClientLike | null;
  if (!client?.storage?.getBucket) {
    return baseResponse({
      configured: true,
      provider: "supabase_storage",
      repositoryMode: "local_fallback",
      bucketReady: false,
      storageReady: false,
      requiredBuckets: [...requiredStorageBuckets],
      missingBuckets: [...requiredStorageBuckets],
      signedUploadReady: false,
      signedDownloadReady: false,
      privateBucketPolicyReady: false,
      signedUrlVerified: false,
      writeTestAllowed,
      lastVerifiedAt: null,
      caveat: "Supabase is configured, but Storage API readiness could not be verified by this runtime.",
      blockers: ["Supabase Storage client is unavailable in the server runtime."],
      nextActions: ["Verify Supabase Storage support and bucket policies from a trusted server environment."]
    });
  }

  const checks = await Promise.all(
    requiredStorageBuckets.map(async (bucket) => {
      try {
        const response = await client.storage?.getBucket(bucket);
        return { bucket, ready: Boolean(response?.data && !response.error) };
      } catch {
        return { bucket, ready: false };
      }
    })
  );
  const missingBuckets = checks.filter((item) => !item.ready).map((item) => item.bucket);
  const bucketReady = missingBuckets.length === 0;
  const markerVerification = bucketReady
    ? await verifySignedStorageMarker(client)
    : { verified: false, verifiedAt: null as string | null };
  const signedUrlVerified = process.env.GEOAI_STORAGE_SIGNED_URL_VERIFIED?.trim().toLowerCase() === "true" || markerVerification.verified;

  return baseResponse({
    configured: true,
    provider: "supabase_storage",
    repositoryMode: bucketReady ? "supabase" : "local_fallback",
    bucketReady,
    storageReady: bucketReady,
    requiredBuckets: [...requiredStorageBuckets],
    missingBuckets,
    signedUploadReady: bucketReady,
    signedDownloadReady: bucketReady,
    privateBucketPolicyReady: bucketReady && signedUrlVerified,
    signedUrlVerified,
    writeTestAllowed,
    lastVerifiedAt: markerVerification.verifiedAt ?? process.env.GEOAI_STORAGE_LAST_VERIFIED_AT?.trim() ?? null,
    caveat: signedUrlVerified
      ? "Storage buckets and signed URL marker are verified for Preview/demo readiness. Protected client file storage still requires Auth and hard access verification."
      : bucketReady
        ? "Storage buckets are reachable, but signed URL flows and access policies still require project-level verification before protected client use."
        : "Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.",
    blockers: bucketReady
      ? signedUrlVerified ? [] : ["Signed URL marker verification is pending."]
      : missingBuckets.map((bucket) => `Missing or unreachable storage bucket: ${bucket}`),
    nextActions: bucketReady
      ? signedUrlVerified
        ? ["Verify Auth, memberships and hard access before storing protected client files."]
        : ["Run signed URL marker verification with project access enforcement before storing protected client files."]
      : ["Create the missing private buckets in Supabase Storage.", "Verify bucket RLS/policies and signed URL flows."]
  });
}

export function storageReadinessModeFields(readiness: StorageReadiness) {
  return repositoryModeFields(readiness.repositoryMode);
}
