import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { getStorageReadiness } from "@/src/lib/storage/storage-readiness";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getStorageReadiness();
  void recordAuditEvent({
    eventType: "storage_health_checked",
    entityType: "storage",
    action: "Checked storage readiness",
    metadata: { provider: readiness.provider, bucketReady: readiness.bucketReady }
  });
  return NextResponse.json(readiness);
}
