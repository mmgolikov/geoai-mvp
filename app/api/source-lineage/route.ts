import { NextResponse } from "next/server";
import { getSourceRegistryReadiness } from "@/src/lib/external-data/supabase-source-registry";
import { redactPrivateSourceLineage } from "@/src/lib/external-data/public-source-projection";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getSourceRegistryReadiness();
  const publicReadiness = redactPrivateSourceLineage(readiness);

  return NextResponse.json({
    ok: true,
    version: publicReadiness.version,
    mode: publicReadiness.mode,
    source: publicReadiness.source,
    lineage: publicReadiness.sourceGroups.map((item) => ({
      sourceGroupId: item.id,
      sourceGroupName: item.name,
      sourceIds: item.sourceIds,
      status: item.status,
      dataMode: item.dataMode,
      confidence: item.confidence,
      recordCount: item.recordCount,
      coverageArea: item.coverageArea,
      sourceQuality: item.sourceQuality,
      caveat: item.caveat,
      nextValidationStep: item.nextValidationStep,
      validationRequired: item.validationRequired
    })),
    sourceGroups: publicReadiness.sourceGroups,
    readiness: publicReadiness.readiness,
    manifest: publicReadiness.manifest,
    sourceQuality: publicReadiness.sourceQuality,
    summary: publicReadiness.summary,
    blockers: publicReadiness.blockers,
    nextActions: publicReadiness.nextActions,
    caveat: publicReadiness.caveat,
    generatedAt: publicReadiness.generatedAt
  });
}
