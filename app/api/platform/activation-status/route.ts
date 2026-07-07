import { NextResponse } from "next/server";
import { getPilotActivationGate } from "@/src/lib/platform/activation-gate";
import { getSupabaseActivationReadiness } from "@/src/lib/supabase/activation-check";
import { getSupabaseRuntimeReadiness } from "@/src/lib/supabase/runtime-readiness";

export const runtime = "nodejs";

export async function GET() {
  const [gate, supabaseActivation, runtimeReadiness] = await Promise.all([
    getPilotActivationGate(),
    getSupabaseActivationReadiness(),
    getSupabaseRuntimeReadiness()
  ]);

  return NextResponse.json({
    ...gate,
    runtimeMode: runtimeReadiness.runtimeMode,
    supabaseConfigured: runtimeReadiness.supabaseConfigured,
    supabaseReachable: runtimeReadiness.canReadHealthcheck,
    healthcheckReachable: runtimeReadiness.healthcheckReachable,
    schemaReady: runtimeReadiness.schemaReady,
    sourceRegistryReady: runtimeReadiness.sourceRegistryReady,
    externalSnapshotsReady: runtimeReadiness.externalSnapshotsReady,
    localApiFallbackActive: runtimeReadiness.localApiFallbackActive,
    hardAccessDisabled: runtimeReadiness.hardAccessDisabled,
    readinessClaim: runtimeReadiness.readinessClaim,
    notReadyReason: runtimeReadiness.notReadyReason,
    supabaseActivation,
    runtimeReadiness,
    blockers: Array.from(new Set([...gate.blockers, ...runtimeReadiness.blockers])),
    nextActions: Array.from(new Set([...gate.nextActions, ...runtimeReadiness.nextActions])),
    caveats: Array.from(new Set([...gate.caveats, ...runtimeReadiness.caveats])),
    caveat: runtimeReadiness.caveat,
    generatedAt: runtimeReadiness.generatedAt
  });
}
