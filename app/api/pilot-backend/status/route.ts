import { NextResponse } from "next/server";
import { getPilotBackendActivationSummary } from "@/src/lib/platform/pilot-backend-activation";
import { getSupabaseActivationReadiness } from "@/src/lib/supabase/activation-check";
import { getSupabaseRuntimeReadiness } from "@/src/lib/supabase/runtime-readiness";

export const runtime = "nodejs";

export async function GET() {
  const [summary, supabaseActivation, runtimeReadiness] = await Promise.all([
    getPilotBackendActivationSummary(),
    getSupabaseActivationReadiness(),
    getSupabaseRuntimeReadiness()
  ]);

  return NextResponse.json({
    ...summary,
    runtimeMode: runtimeReadiness.runtimeMode,
    supabaseConfigured: runtimeReadiness.supabaseConfigured,
    supabaseReachable: runtimeReadiness.canReadHealthcheck,
    localApiFallbackActive: runtimeReadiness.localApiFallbackActive,
    readinessClaim: runtimeReadiness.readinessClaim,
    notReadyReason: runtimeReadiness.notReadyReason,
    supabaseActivation,
    runtimeReadiness,
    blockers: [
      ...summary.blockers,
      ...runtimeReadiness.blockers.map((description) => ({
        id: `runtime_${description.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 56)}`,
        severity: "p1" as const,
        title: "Supabase runtime readiness blocker",
        description,
        relatedRoute: "/api/platform/activation-status",
        nextAction: runtimeReadiness.nextActions[0] ?? "Review Supabase runtime readiness."
      }))
    ],
    nextActions: Array.from(new Set([...summary.nextActions, ...runtimeReadiness.nextActions])),
    caveats: Array.from(new Set([...summary.caveats, ...runtimeReadiness.caveats])),
    caveat: runtimeReadiness.caveat,
    generatedAt: runtimeReadiness.generatedAt
  });
}
