import { plannedAdapterResponse } from "@/src/lib/data-adapters/types";
import type { DataAdapter } from "@/src/lib/data-adapters/types";

export const dldAdapter: DataAdapter = {
  sourceId: "dubai-land-department-real-estate",
  supportedDataTypes: ["transactions", "rents", "projects"],
  integrationStatus: "official_ready",
  expectedInputs: ["selected point/object", "area name", "permitted DLD dataset scope"],
  expectedOutputs: ["transaction context", "rental context", "market comparable evidence"],
  async fetch() {
    return plannedAdapterResponse(
      this.sourceId,
      this.integrationStatus,
      "DLD adapter is planned. No live API call is made in the MVP."
    );
  }
};
