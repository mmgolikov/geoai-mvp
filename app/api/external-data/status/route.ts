import { NextResponse } from "next/server";
import { getSourceRegistryReadiness } from "@/src/lib/external-data/supabase-source-registry";

export const runtime = "nodejs";

export async function GET() {
  const data = await getSourceRegistryReadiness();
  return NextResponse.json({ ok: true, ...data, sources: data.manifest.sources, lastUpdated: data.generatedAt });
}
