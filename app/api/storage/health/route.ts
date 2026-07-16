import { NextResponse } from "next/server";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { allowedEvidenceMimeTypes, maxEvidenceFileSizeBytes } from "@/src/lib/storage/storage-readiness";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    status: "diagnostics_withheld",
    ...repositoryModeFields("browser_local"),
    provider: "protected_storage_unavailable_to_public_demo",
    configured: null,
    bucketReady: false,
    storageReady: false,
    signedUrlReady: false,
    protectedStorageAvailableToPublic: false,
    diagnosticsWithheld: true,
    maxFileSizeBytes: maxEvidenceFileSizeBytes,
    allowedMimeTypes: allowedEvidenceMimeTypes,
    blockers: ["AUTH-01 and STORAGE-01 are required before any protected binary or metadata operation."],
    nextActions: ["Use an operator-authenticated control plane for bucket and signed-URL diagnostics."],
    caveat: "Public uploads and protected reads are blocked; configuration and bucket diagnostics are withheld."
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
