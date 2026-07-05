import { NextResponse } from "next/server";
import { getSourceRegistryReadiness } from "@/src/lib/external-data/supabase-source-registry";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getSourceRegistryReadiness();

  return NextResponse.json({
    ok: true,
    manifest: readiness.manifest,
    readiness: readiness.readiness,
    mode: readiness.mode,
    source: readiness.source,
    sourceRegistryCount: readiness.sourceRegistryCount,
    externalSnapshotCount: readiness.externalSnapshotCount,
    blockers: readiness.blockers,
    caveat: readiness.caveat,
    generatedAt: readiness.generatedAt
  });
}
