import { NextResponse } from "next/server";
import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoProjectRole, demoUser } from "@/src/lib/auth/demo-session";

export async function GET() {
  const authStatus = getAuthModeStatus();
  const isDemo = authStatus.effectiveMode !== "supabase_auth";

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
