import { NextResponse } from "next/server";
import { getSourceRegistryReadiness } from "@/src/lib/external-data/supabase-source-registry";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getSourceRegistryReadiness();

  return NextResponse.json({
    ok: true,
    ...readiness
  });
}
