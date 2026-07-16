import { NextResponse } from "next/server";
import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { getEnforcementConfig } from "@/src/lib/platform/enforcement-config";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";

export const runtime = "nodejs";

export function GET() {
  const auth = getAuthModeStatus();
  const enforcement = getEnforcementConfig();

  return NextResponse.json({
    ok: true,
    activationStatus: "public_demo_only",
    productStage: "public_demo_prototype",
    ...repositoryModeFields("browser_local"),
    authMode: auth.effectiveMode,
    accessEnforcementMode: enforcement.accessEnforcementMode,
    allowDemoPublic: enforcement.allowDemoPublic,
    protectedModeActive: false,
    canRunConfidentialPilot: false,
    canonicalReplayCertified: false,
    diagnosticsWithheld: true,
    supabaseConfigured: null,
    supabaseReachable: null,
    schemaReady: null,
    storageReady: null,
    blockers: [
      "DB-01 canonical replay/RLS evidence is incomplete.",
      "AUTH-01 request-scoped identity and membership are incomplete.",
      "Protected Storage and real-source custody are not activated."
    ],
    nextActions: ["Use an operator-authenticated control plane for activation diagnostics."],
    caveats: [
      auth.caveat,
      "Environment, credential, table, bucket and provider diagnostics are withheld from public responses."
    ],
    caveat: "Public demo only; not Production-ready or pilot-ready."
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
