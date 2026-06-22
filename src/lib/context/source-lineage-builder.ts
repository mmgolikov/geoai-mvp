import { externalDataCaveat, getExternalDataSource } from "@/src/lib/external-data/source-registry";

export type ContextLineageItem = {
  sourceId: string;
  sourceName: string;
  status: string;
  confidence: string;
  limitation: string;
  caveat: string;
};

export function buildContextLineage(sourceIds: string[], status: string): ContextLineageItem[] {
  return sourceIds.map((sourceId) => {
    const source = getExternalDataSource(sourceId);

    return {
      sourceId,
      sourceName: source?.name ?? sourceId,
      status,
      confidence: source?.confidence ?? "requires-validation",
      limitation: source?.limitations[0] ?? source?.disclaimer ?? externalDataCaveat,
      caveat: externalDataCaveat
    };
  });
}

export function validationRequiredNote() {
  return externalDataCaveat;
}
