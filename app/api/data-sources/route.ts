import { NextResponse } from "next/server";
import { getCompactPublicSourceRegistryReadiness } from "@/src/lib/external-data/public-source-readiness";

export const runtime = "nodejs";

export function GET() {
  const readiness = getCompactPublicSourceRegistryReadiness();

  return NextResponse.json({
    ok: true,
    contractVersion: readiness.contractVersion,
    version: readiness.version,
    manifestVersion: readiness.manifestVersion,
    projection: readiness.projection,
    mode: readiness.mode,
    source: readiness.source,
    liveRegistryIncluded: readiness.liveRegistryIncluded,
    diagnosticsWithheld: readiness.diagnosticsWithheld,
    sourceRegistryCount: readiness.sourceRegistryCount,
    externalSnapshotCount: readiness.externalSnapshotCount,
    summary: readiness.summary,
    sources: readiness.sourceGroups,
    blockers: readiness.blockers,
    nextActions: readiness.nextActions,
    caveat: readiness.caveat,
    generatedAt: readiness.generatedAt
  }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
