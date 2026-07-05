import { NextResponse } from "next/server";
import { getSourceRegistryReadiness } from "@/src/lib/external-data/supabase-source-registry";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getSourceRegistryReadiness();

  return NextResponse.json({
    ok: true,
    version: readiness.version,
    mode: readiness.mode,
    source: readiness.source,
    summary: readiness.summary,
    sources: readiness.sourceGroups,
    sourceGroups: readiness.sourceGroups,
    sourceRegistryCount: readiness.sourceRegistryCount,
    externalSnapshotCount: readiness.externalSnapshotCount,
    blockers: readiness.blockers,
    nextActions: readiness.nextActions,
    sync: readiness.sync,
    caveat: readiness.caveat,
    generatedAt: readiness.generatedAt
  });
}
