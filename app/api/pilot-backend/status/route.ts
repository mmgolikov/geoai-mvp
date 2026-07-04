import { NextResponse } from "next/server";
import { getPilotBackendActivationSummary } from "@/src/lib/platform/pilot-backend-activation";
import { getSupabaseActivationReadiness } from "@/src/lib/supabase/activation-check";

export const runtime = "nodejs";

export async function GET() {
  const [summary, supabaseActivation] = await Promise.all([
    getPilotBackendActivationSummary(),
    getSupabaseActivationReadiness()
  ]);

  return NextResponse.json({
    ...summary,
    supabaseActivation
  });
}
