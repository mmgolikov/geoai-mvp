import { plannedAdapterResponse } from "@/src/lib/data-adapters/types";
import type { DataAdapter } from "@/src/lib/data-adapters/types";

export const satelliteAdapter: DataAdapter = {
  sourceId: "copernicus-sentinel",
  supportedDataTypes: ["satellite_scenes", "change_detection"],
  integrationStatus: "planned",
  expectedInputs: ["area of interest", "date range", "imagery source preference"],
  expectedOutputs: ["scene metadata", "change detection context", "remote sensing limitations"],
  async fetch() {
    return plannedAdapterResponse(
      this.sourceId,
      this.integrationStatus,
      "Satellite adapter is planned. Sentinel/Landsat/commercial imagery are not called in the MVP."
    );
  }
};
