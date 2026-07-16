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
    manifest: publicReadiness.manifest,
    sourceGroups: publicReadiness.sourceGroups,
    sourceQuality: publicReadiness.sourceQuality,
    summary: publicReadiness.summary,
    readiness: publicReadiness.readiness,
    lineage: publicReadiness.sourceGroups.map((group) => ({
      sourceGroupId: group.id,
      sourceGroupName: group.name,
      sourceIds: group.sourceIds,
      status: group.status,
      dataMode: group.dataMode,
      recordCount: group.recordCount,
      confidence: group.confidence,
      sourceQuality: group.sourceQuality,
      caveat: group.caveat,
      nextValidationStep: group.nextValidationStep,
      validationRequired: group.validationRequired
    })),
    mode: publicReadiness.mode,
    source: publicReadiness.source,
    sourceRegistryCount: publicReadiness.sourceRegistryCount,
    externalSnapshotCount: publicReadiness.externalSnapshotCount,
    blockers: publicReadiness.blockers,
    nextActions: publicReadiness.nextActions,
    caveat: publicReadiness.caveat,
    generatedAt: publicReadiness.generatedAt
  });
}
