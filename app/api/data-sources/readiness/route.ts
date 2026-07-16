import { NextResponse } from "next/server";
import { getSourceRegistryReadiness } from "@/src/lib/external-data/supabase-source-registry";
import { redactPrivateSourceLineage } from "@/src/lib/external-data/public-source-projection";

export const runtime = "nodejs";

export async function GET() {
  const readiness = redactPrivateSourceLineage(await getSourceRegistryReadiness());

  return NextResponse.json({
    ok: true,
    version: readiness.version,
    readiness: readiness.readiness,
    sourceGroups: readiness.sourceGroups,
    summary: readiness.summary,
    manifest: readiness.manifest,
    sourceQuality: readiness.sourceQuality,
    lineage: readiness.sourceGroups.map((group) => ({
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
    mode: readiness.mode,
    source: readiness.source,
    sourceRegistryCount: readiness.sourceRegistryCount,
    externalSnapshotCount: readiness.externalSnapshotCount,
    blockers: readiness.blockers,
    nextActions: readiness.nextActions,
    sync: readiness.sync,
    caveat: readiness.caveat,
    generatedAt: readiness.generatedAt
  });
}
