import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";

export const requiredStorageBuckets = [
  "geoai-data-room-assets",
  "geoai-report-exports",
  "geoai-aoi-imports"
] as const;

export type RequiredStorageBucket = (typeof requiredStorageBuckets)[number];

export type StorageReadiness = {
  configured: boolean;
  provider: "supabase_storage" | "disabled";
  bucketReady: boolean;
  storageReady: boolean;
  requiredBuckets: RequiredStorageBucket[];
  missingBuckets: RequiredStorageBucket[];
  maxFileSize: string;
  allowedMimeTypes: string[];
  signedUploadReady: boolean;
  signedDownloadReady: boolean;
  caveat: string;
  blockers: string[];
  nextActions: string[];
};

type SupabaseStorageClientLike = {
  storage?: {
    getBucket: (bucket: string) => Promise<{ data?: unknown; error?: unknown }>;
  };
};

const maxFileSize = "25 MB per metadata-only MVP file reference";
const allowedMimeTypes = [
  "application/pdf",
  "text/csv",
  "application/geo+json",
  "application/json",
  "image/png",
  "image/jpeg"
];

export async function getStorageReadiness(): Promise<StorageReadiness> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      provider: "disabled",
      bucketReady: false,
      storageReady: false,
      requiredBuckets: [...requiredStorageBuckets],
      missingBuckets: [...requiredStorageBuckets],
      maxFileSize,
      allowedMimeTypes,
      signedUploadReady: false,
      signedDownloadReady: false,
      caveat: "Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.",
      blockers: ["Supabase server environment is not configured."],
      nextActions: [
        "Configure Supabase project env vars in Vercel/server runtime.",
        "Create required storage buckets with private access.",
        "Add and verify bucket policies plus signed upload/download flows."
      ]
    };
  }

  const client = await getSupabaseServerClient() as SupabaseStorageClientLike | null;
  if (!client?.storage?.getBucket) {
    return {
      configured: true,
      provider: "supabase_storage",
      bucketReady: false,
      storageReady: false,
      requiredBuckets: [...requiredStorageBuckets],
      missingBuckets: [...requiredStorageBuckets],
      maxFileSize,
      allowedMimeTypes,
      signedUploadReady: false,
      signedDownloadReady: false,
      caveat: "Supabase is configured, but Storage API readiness could not be verified by this runtime.",
      blockers: ["Supabase Storage client is unavailable in the server runtime."],
      nextActions: ["Verify Supabase Storage support and bucket policies from a trusted server environment."]
    };
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

  return {
    configured: true,
    provider: "supabase_storage",
    bucketReady,
    storageReady: bucketReady,
    requiredBuckets: [...requiredStorageBuckets],
    missingBuckets,
    maxFileSize,
    allowedMimeTypes,
    signedUploadReady: bucketReady,
    signedDownloadReady: bucketReady,
    caveat: bucketReady
      ? "Storage buckets are reachable, but signed URL flows and access policies still require project-level verification before protected client use."
      : "Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.",
    blockers: bucketReady ? [] : missingBuckets.map((bucket) => `Missing or unreachable storage bucket: ${bucket}`),
    nextActions: bucketReady
      ? ["Verify signed upload/download flows with project access enforcement before storing protected client files."]
      : ["Create the missing private buckets in Supabase Storage.", "Verify bucket RLS/policies and signed URL flows."]
  };
}
