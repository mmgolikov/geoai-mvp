import { NextResponse } from "next/server";
import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { getEnforcementConfig } from "@/src/lib/platform/enforcement-config";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { buildRuntimeExecutiveStatus } from "@/src/lib/platform/runtime-status-contract";

export const runtime = "nodejs";

export function GET() {
  const auth = getAuthModeStatus();
  const config = getEnforcementConfig();
  const demoAccess = requireProjectAccess({
    projectKey: "dubai-investment-screening-demo",
    action: "read",
    mode: config.accessEnforcementMode
  });
  const canRunDemoWorkflow = demoAccess.allowed;
  const executiveStatus = buildRuntimeExecutiveStatus({
    vercelEnvironment: process.env.VERCEL_ENV,
    authMode: auth.effectiveMode,
    repositoryMode: "browser_local",
    accessEnforcementMode: config.accessEnforcementMode,
    canRunDemoWorkflow,
    canRunConfidentialPilot: false,
    supabaseConfigured: false,
    supabaseReachable: false,
    schemaReady: false,
    storageConfigured: false,
    storageReady: false,
    auditFoundationPresent: false,
    authSessionVerified: false,
    projectMembershipsVerified: false,
    rlsPoliciesVerified: false,
    hardAccessEnabled: config.accessEnforcementMode === "hard",
    hardAccessVerified: false,
    infrastructureDiagnosticsWithheld: true
  });

  return NextResponse.json({
    ok: true,
    status: "public_demo_prototype",
    productStage: "public_demo_prototype",
    productSemVer: null,
    environment: executiveStatus.environment,
    accessMode: executiveStatus.accessMode,
    authMode: auth.effectiveMode,
    repositoryMode: "browser_local",
    sourceMode: "operator_only_disabled_for_public",
    canRunDemoPilot: canRunDemoWorkflow,
    canRunDemoWorkflow,
    canRunConfidentialPilot: false,
    canonicalReplayCertified: false,
    containmentMigrationApplied: false,
    executiveStatus,
    readinessClaim: "not_production_ready_or_pilot_ready",
    notReadyReason: "Protected Auth, canonical database replay, private Storage and source custody are not activated.",
    blockers: [
      { id: "DB-01", severity: "S0", title: "Canonical database replay and RLS evidence" },
      { id: "AUTH-01", severity: "S0", title: "Request-scoped Auth and project membership" },
      { id: "STORAGE-01", severity: "S0", title: "Protected evidence pipeline" },
      { id: "SOURCE-01", severity: "S0", title: "Real-source custody and visibility" }
    ],
    nextActions: ["Use an operator-authenticated control plane for infrastructure diagnostics."],
    caveats: [
      auth.caveat,
      "Public-demo user state is browser-local and is not durable or shared.",
      "Infrastructure and credential diagnostics are intentionally excluded from this public response."
    ],
    caveat: executiveStatus.caveat,
    generatedAt: new Date().toISOString()
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
