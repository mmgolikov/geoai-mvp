import { NextResponse } from "next/server";
import { getSourceRegistryReadiness } from "@/src/lib/external-data/supabase-source-registry";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getSourceRegistryReadiness();

  return NextResponse.json({
    ok: true,
    mode: readiness.mode,
    source: readiness.source,
    lineage: readiness.readiness.map((item) => ({
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      status: item.status,
      sourceMode: item.sourceMode,
      confidence: item.confidence,
      recordCount: item.recordCount,
      coverageArea: item.coverageArea,
      caveat: item.caveat,
      validationRequired: true
    })),
    blockers: readiness.blockers,
    caveat: readiness.caveat,
    generatedAt: readiness.generatedAt
  });
}
