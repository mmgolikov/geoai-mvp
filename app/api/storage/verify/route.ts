import { NextResponse } from "next/server";
import { isPreviewRuntime } from "@/src/lib/supabase/config";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import {
  storageVerificationBucket,
  storageVerificationMarkerPath
} from "@/src/lib/storage/storage-readiness";

export const runtime = "nodejs";

type SignedUploadResponse = {
  data?: { path?: string; signedUrl?: string; token?: string } | null;
  error?: unknown;
};

type SignedUrlResponse = {
  data?: { signedUrl?: string } | null;
  error?: unknown;
};

type StorageFileApi = {
  remove?: (paths: string[]) => Promise<{ data?: unknown; error?: unknown }>;
  createSignedUploadUrl?: (path: string) => Promise<SignedUploadResponse>;
  uploadToSignedUrl?: (path: string, token: string, file: Blob, options?: { contentType?: string }) => Promise<{ data?: unknown; error?: unknown }>;
  download?: (path: string) => Promise<{ data?: unknown; error?: unknown }>;
  createSignedUrl?: (path: string, expiresIn: number) => Promise<SignedUrlResponse>;
};

type StorageClient = {
  storage?: {
    from?: (bucket: string) => StorageFileApi;
  };
};

function safeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }
  const item = error as Record<string, unknown>;
  return {
    message: typeof item.message === "string" ? item.message : undefined,
    code: typeof item.code === "string" ? item.code : undefined,
    details: typeof item.details === "string" ? item.details : undefined,
    hint: typeof item.hint === "string" ? item.hint : undefined
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const confirmed = url.searchParams.get("confirm") === "run-storage-readiness-v1";

  if (!isPreviewRuntime() || !confirmed) {
    return NextResponse.json(
      {
        ok: false,
        status: "blocked",
        message: "Storage verification is Preview-only and requires explicit confirmation.",
        caveat: "This endpoint must be removed after verification and must not be used for Production or client files."
      },
      { status: 403 }
    );
  }

  const client = await getSupabaseServerClient() as StorageClient | null;
  const bucket = client?.storage?.from?.(storageVerificationBucket);

  if (!bucket?.createSignedUploadUrl || !bucket.uploadToSignedUrl || !bucket.download || !bucket.createSignedUrl) {
    return NextResponse.json(
      {
        ok: false,
        status: "client_unavailable",
        message: "Supabase Storage signed URL methods are unavailable in this runtime."
      },
      { status: 500 }
    );
  }

  const verifiedAt = new Date().toISOString();
  const marker = {
    ok: true,
    markerVersion: "geoai-storage-readiness-v1",
    bucket: storageVerificationBucket,
    path: storageVerificationMarkerPath,
    verifiedAt,
    caveat: "Storage marker verifies Preview/demo signed URL mechanics only; it is not protected client storage readiness."
  };
  const markerBody = JSON.stringify(marker, null, 2);
  const markerBlob = new Blob([markerBody], { type: "application/json" });

  try {
    await bucket.remove?.([storageVerificationMarkerPath]);

    const signedUpload = await bucket.createSignedUploadUrl(storageVerificationMarkerPath);
    const uploadToken = signedUpload.data?.token;

    if (signedUpload.error || !uploadToken) {
      return NextResponse.json(
        {
          ok: false,
          status: "signed_upload_url_failed",
          error: safeError(signedUpload.error)
        },
        { status: 500 }
      );
    }

    const upload = await bucket.uploadToSignedUrl(storageVerificationMarkerPath, uploadToken, markerBlob, {
      contentType: "application/json"
    });

    if (upload.error) {
      return NextResponse.json(
        {
          ok: false,
          status: "signed_upload_failed",
          error: safeError(upload.error)
        },
        { status: 500 }
      );
    }

    const download = await bucket.download(storageVerificationMarkerPath);
    if (download.error || !download.data) {
      return NextResponse.json(
        {
          ok: false,
          status: "download_failed",
          error: safeError(download.error)
        },
        { status: 500 }
      );
    }

    const signedDownload = await bucket.createSignedUrl(storageVerificationMarkerPath, 60);
    const signedUrl = signedDownload.data?.signedUrl;
    if (signedDownload.error || !signedUrl) {
      return NextResponse.json(
        {
          ok: false,
          status: "signed_download_url_failed",
          error: safeError(signedDownload.error)
        },
        { status: 500 }
      );
    }

    const signedFetch = await fetch(signedUrl, { cache: "no-store" });
    const signedText = await signedFetch.text();
    const signedPayload = JSON.parse(signedText) as { markerVersion?: string; verifiedAt?: string };
    const signedDownloadOk = signedFetch.ok && signedPayload.markerVersion === "geoai-storage-readiness-v1";

    return NextResponse.json({
      ok: signedDownloadOk,
      status: signedDownloadOk ? "verified" : "signed_download_fetch_failed",
      bucket: storageVerificationBucket,
      path: storageVerificationMarkerPath,
      verifiedAt,
      signedUploadVerified: true,
      signedDownloadVerified: signedDownloadOk,
      markerPersisted: true,
      caveat: "Preview/demo signed URL mechanics verified. Storage still requires Auth, memberships, hard access and policy verification before protected client files."
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "exception",
        error: error instanceof Error ? error.message : "Unknown storage verification error"
      },
      { status: 500 }
    );
  }
}
