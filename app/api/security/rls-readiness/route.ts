import { NextResponse } from "next/server";
import {
  getRlsVerificationPlanSummary,
  requiredRlsTables,
  rlsTablePlans,
  rlsVerificationCases,
  rlsVerificationCaveat
} from "@/src/lib/access/rls-verification-plan";
import { getEnforcementConfig } from "@/src/lib/platform/enforcement-config";

export const runtime = "nodejs";

export async function GET() {
  const summary = getRlsVerificationPlanSummary();
  const enforcement = getEnforcementConfig();

  return NextResponse.json({
    ok: true,
    status: summary.readinessStatus === "preview_verified" ? "preview_unverified" : summary.readinessStatus,
    hardAccessEnabled: false,
    requestedHardAccessEnabled: enforcement.accessEnforcementMode === "hard",
    accessEnforcementMode: enforcement.accessEnforcementMode,
    confidentialPilotReady: false,
    requiredTables: requiredRlsTables,
    summary,
    tablePlans: rlsTablePlans,
    cases: rlsVerificationCases,
    blockers: [
      "RLS policy behavior is not verified with real Preview Auth users.",
      "Positive and negative table checks are modeled only; no live Supabase reads or writes are performed by this route.",
      "Hard access remains disabled until Auth, membership and RLS evidence is explicitly approved."
    ],
    nextActions: [
      "Create approved Preview-only Auth test users outside the codebase.",
      "Verify profile mapping and project memberships for each persona.",
      "Run table-by-table positive and negative RLS checks in Preview.",
      "Record evidence before enabling hard access in any Preview runtime."
    ],
    caveat: rlsVerificationCaveat,
    generatedAt: new Date().toISOString()
  });
}
