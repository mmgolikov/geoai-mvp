import { externalDataCaveat, getExternalDataSource } from "@/src/lib/external-data/source-registry";
import { normalizeSourceStatus, type SourceStatus } from "@/src/lib/external-data/source-status";

export type ContextLineageItem = {
  sourceId: string;
  sourceName: string;
  status: SourceStatus;
  confidence: string;
  limitation: string;
  caveat: string;
};

export function buildContextLineage(sourceIds: string[], status: string): ContextLineageItem[] {
  const normalizedStatus = normalizeSourceStatus(status);

  return sourceIds.map((sourceId) => {
    const source = getExternalDataSource(sourceId);

    return {
      sourceId,
      sourceName: source?.name ?? sourceId,
      status: normalizedStatus,
      confidence: source?.confidence ?? "requires-validation",
      limitation: source?.limitations[0] ?? source?.disclaimer ?? externalDataCaveat,
      caveat: externalDataCaveat
    };
  });
}

export function validationRequiredNote() {
  return externalDataCaveat;
}
