import { externalDataSources } from "@/src/lib/external-data/source-registry";
import type { SourceLineageSnapshot } from "@/src/lib/project-workspace-types";

type SnapshotInput = {
  evidence?: Array<{ id: string; title?: string; sourceId?: string; description?: string; sourceType?: string; sourceStatus?: string }>;
  uploadedDatasets?: Array<{ id: string; name: string; type: string; notes?: string }>;
};

export function createSourceLineageSnapshot(input: SnapshotInput = {}): SourceLineageSnapshot {
  const evidence = input.evidence ?? [];
  const uploadedDatasets = input.uploadedDatasets ?? [];
  const evidenceSourceIds = new Set(evidence.map((item) => item.sourceId).filter(Boolean));

  return {
    capturedAt: new Date().toISOString(),
    demoSources: evidence
      .filter((item) => item.sourceType === "mock" || item.sourceStatus === "mock")
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        name: item.title ?? item.sourceId ?? item.id,
        note: item.description ?? "Sample/open evidence source."
      })),
    uploadedSources: uploadedDatasets.map((dataset) => ({
      id: dataset.id,
      name: dataset.name,
      type: dataset.type,
      note: dataset.notes ?? "Uploaded local dataset metadata; official validation required."
    })),
    externalSources: externalDataSources
      .filter((source) => source.usedInAnalysis || evidenceSourceIds.has(source.id))
      .map((source) => ({
        id: source.id,
        name: source.name,
        status: source.status,
        disclaimer: source.disclaimer
      })),
    plannedValidationSources: externalDataSources
      .filter((source) => source.status === "planned" || source.status === "permission_required")
      .map((source) => ({
        id: source.id,
        name: source.name,
        disclaimer: source.disclaimer
      })),
    disclaimers: [
      "Saved object uses demo/sample/local/uploaded source lineage unless explicitly validated.",
      "Live official DLD, Dubai Pulse, GeoDubai, parcel, zoning, cadastral and ownership integrations are not connected.",
      "Official validation is required before real decisions."
    ]
  };
}
