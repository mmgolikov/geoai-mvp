import { NextResponse } from "next/server";
import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoProjectRole, demoUser } from "@/src/lib/auth/demo-session";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";

export async function GET() {
  const authStatus = getAuthModeStatus();
  const isDemo = authStatus.effectiveMode !== "supabase_auth";
  void recordAuditEvent({
    eventType: "auth_session_checked",
    entityType: "auth_session",
    action: "Checked auth session",
    metadata: {
      authMode: authStatus.effectiveMode,
      requestedAuthMode: authStatus.requestedMode,
      isDemo
    }
  });

  return NextResponse.json({
    ok: true,
    authMode: authStatus.effectiveMode,
    requestedAuthMode: authStatus.requestedMode,
    label: authStatus.label,
    isDemo,
    isAuthenticated: isDemo,
    user: isDemo ? demoUser : null,
    organization: isDemo ? demoOrganization : null,
    projectRole: isDemo ? demoProjectRole : null,
    membership: isDemo ? createDemoProjectMembership() : null,
    caveat: authStatus.caveat
  });
}
