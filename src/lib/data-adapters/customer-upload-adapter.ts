import { plannedAdapterResponse } from "@/src/lib/data-adapters/types";
import type { DataAdapter } from "@/src/lib/data-adapters/types";

export const customerUploadAdapter: DataAdapter = {
  sourceId: "customer-uploaded-documents",
  supportedDataTypes: ["customer_assets", "documents", "land_parcels"],
  integrationStatus: "future",
  expectedInputs: ["CSV", "GeoJSON", "PDF/documents", "customer asset metadata"],
  expectedOutputs: ["customer asset context", "document evidence", "portfolio or site metadata"],
  async fetch() {
    return plannedAdapterResponse(
      this.sourceId,
      this.integrationStatus,
      "Customer upload adapter is future/pilot work. No files are uploaded or processed in this MVP task."
    );
  }
};
