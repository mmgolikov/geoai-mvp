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
    lineage: readiness.sourceGroups.map((item) => ({
      sourceGroupId: item.id,
      sourceGroupName: item.name,
      sourceIds: item.sourceIds,
      status: item.status,
      dataMode: item.dataMode,
      confidence: item.confidence,
      recordCount: item.recordCount,
      coverageArea: item.coverageArea,
      availableFiles: item.availableFiles,
      sourceQuality: item.sourceQuality,
      caveat: item.caveat,
      nextValidationStep: item.nextValidationStep,
      validationRequired: item.validationRequired
    })),
    sourceGroups: readiness.sourceGroups,
    readiness: readiness.readiness,
    manifest: readiness.manifest,
    sourceQuality: readiness.sourceQuality,
    summary: readiness.summary,
    blockers: readiness.blockers,
    nextActions: readiness.nextActions,
    caveat: readiness.caveat,
    generatedAt: readiness.generatedAt
  });
}
