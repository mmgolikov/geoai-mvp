import { NextResponse } from "next/server";
import { getSourceRegistryReadiness } from "@/src/lib/external-data/supabase-source-registry";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getSourceRegistryReadiness();

  return NextResponse.json({
    ok: true,
    sources: readiness.sources,
    manifest: readiness.manifest,
    readiness: readiness.readiness,
    mode: readiness.mode,
    source: readiness.source,
    sourceRegistryCount: readiness.sourceRegistryCount,
    externalSnapshotCount: readiness.externalSnapshotCount,
    lastUpdated: readiness.generatedAt,
    caveat: readiness.caveat,
    blockers: readiness.blockers
  });
}
