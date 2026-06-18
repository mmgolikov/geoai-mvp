import { plannedAdapterResponse } from "@/src/lib/data-adapters/types";
import type { DataAdapter } from "@/src/lib/data-adapters/types";

export const commercialImageryAdapter: DataAdapter = {
  sourceId: "commercial-vhr-imagery",
  supportedDataTypes: ["satellite_scenes", "change_detection"],
  integrationStatus: "requires_license",
  expectedInputs: ["licensed area of interest", "tasking/archive scope", "commercial usage rights"],
  expectedOutputs: ["very high resolution imagery context", "construction monitoring evidence", "license limitations"],
  async fetch() {
    return plannedAdapterResponse(
      this.sourceId,
      this.integrationStatus,
      "Commercial VHR imagery adapter requires provider licensing and access controls before implementation."
    );
  }
};
