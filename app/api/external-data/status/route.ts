import { NextResponse } from "next/server";
import { getSourceRegistryReadiness } from "@/src/lib/external-data/supabase-source-registry";

export const runtime = "nodejs";

export async function GET() {
  const data = await getSourceRegistryReadiness();
  return NextResponse.json({
    ok: true,
    ...data,
    sources: data.manifest.sources,
    sourceGroups: data.sourceGroups,
    readiness: data.readiness,
    manifest: data.manifest,
    sourceQuality: data.sourceQuality,
    lineage: data.sourceGroups.map((group) => ({
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
    summary: data.summary,
    lastUpdated: data.generatedAt
  });
}
