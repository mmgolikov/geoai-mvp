import { NextResponse } from "next/server";
import { getPilotActivationGate } from "@/src/lib/platform/activation-gate";
import { getSupabaseActivationReadiness } from "@/src/lib/supabase/activation-check";

export const runtime = "nodejs";

export async function GET() {
  const [gate, supabaseActivation] = await Promise.all([
    getPilotActivationGate(),
    getSupabaseActivationReadiness()
  ]);

  return NextResponse.json({
    ...gate,
    supabaseActivation
  });
}
