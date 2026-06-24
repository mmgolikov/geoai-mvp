import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import {
  getConnectorReadinessSummary,
  officialConnectorReadiness
} from "@/src/lib/validation/official-connector-readiness";

export const runtime = "nodejs";

export async function GET() {
  void recordAuditEvent({
    eventType: "validation_connector_reviewed",
    entityType: "validation_connectors",
    action: "Reviewed validation connector readiness"
  });

  return NextResponse.json({
    ok: true,
    mode: "local_fallback",
    connectorReadiness: officialConnectorReadiness,
    summary: getConnectorReadinessSummary(),
    dataHonesty: "Connector readiness is metadata only; no live official DLD, Dubai Pulse or GeoDubai integration is claimed."
  });
}
