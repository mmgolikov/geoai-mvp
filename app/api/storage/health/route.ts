import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { getStorageReadiness } from "@/src/lib/storage/storage-readiness";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getStorageReadiness();
  const audit = await recordAuditEvent({
    eventType: "storage_health_checked",
    entityType: "storage",
    action: "Checked storage readiness",
    metadata: {
      provider: readiness.provider,
      bucketReady: readiness.bucketReady,
      storageReady: readiness.storageReady,
      signedUrlVerified: readiness.signedUrlVerified,
      verification: readiness.signedUrlVerified ? "geoai-storage-readiness-v1" : "pending"
    }
  });

  return NextResponse.json({
    ...readiness,
    audit: {
      recorded: audit.recorded,
      mode: audit.mode,
      message: audit.message
    }
  });
}
