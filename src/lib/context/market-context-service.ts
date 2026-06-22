import { externalDataCaveat } from "@/src/lib/external-data/source-registry";
import { buildContextLineage } from "@/src/lib/context/source-lineage-builder";

export function getMarketSourceLineage() {
  return {
    sourceLineage: buildContextLineage([
      "dld-dubai-pulse-public-transactions",
      "dld-dubai-pulse-public-rents",
      "dld-dubai-pulse-public-projects"
    ], "sample_fallback"),
    validationRequired: externalDataCaveat
  };
}
