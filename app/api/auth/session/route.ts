import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { getSafeAuthSessionSummary } from "@/src/lib/auth/session-summary";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSafeAuthSessionSummary(request);
  void recordAuditEvent({
    eventType: "auth_session_checked",
    entityType: "auth_session",
    action: "Checked auth session",
    metadata: {
      authMode: session.authMode,
      requestedAuthMode: session.requestedAuthMode,
      sessionStatus: session.sessionStatus,
      supabaseAuthenticated: session.supabaseAuthenticated,
      profileResolved: Boolean(session.profile),
      hardAccessEnabled: session.hardAccessEnabled
    }
  });

  return NextResponse.json(session);
}
