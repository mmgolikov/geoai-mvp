import { NextResponse } from "next/server";
import { getSourceRegistryReadiness } from "@/src/lib/external-data/supabase-source-registry";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getSourceRegistryReadiness();

  return NextResponse.json({
    ok: true,
    version: readiness.version,
    manifest: readiness.manifest,
    sourceGroups: readiness.sourceGroups,
    sourceQuality: readiness.sourceQuality,
    summary: readiness.summary,
    readiness: readiness.readiness,
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
