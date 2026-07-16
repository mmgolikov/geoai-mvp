import { NextResponse } from "next/server";
import { getCompactPublicSourceRegistryReadiness } from "@/src/lib/external-data/public-source-readiness";

export const runtime = "nodejs";

export function GET() {
  const data = getCompactPublicSourceRegistryReadiness();

  return NextResponse.json({
    ok: true,
    contractVersion: data.contractVersion,
    version: data.version,
    manifestVersion: data.manifestVersion,
    projection: data.projection,
    mode: data.mode,
    source: data.source,
    liveRegistryIncluded: data.liveRegistryIncluded,
    diagnosticsWithheld: data.diagnosticsWithheld,
    sourceRegistryCount: data.sourceRegistryCount,
    externalSnapshotCount: data.externalSnapshotCount,
    sourceGroups: data.sourceGroups,
    readiness: data.readiness,
    summary: data.summary,
    blockers: data.blockers,
    nextActions: data.nextActions,
    caveat: data.caveat,
    generatedAt: data.generatedAt,
    lastUpdated: data.generatedAt
  }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
