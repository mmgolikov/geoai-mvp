import { plannedAdapterResponse } from "@/src/lib/data-adapters/types";
import type { DataAdapter } from "@/src/lib/data-adapters/types";

export const osmAdapter: DataAdapter = {
  sourceId: "osm-geofabrik",
  supportedDataTypes: ["roads", "poi", "accessibility"],
  integrationStatus: "planned",
  expectedInputs: ["selected point/object", "buffer distance", "OSM extract date"],
  expectedOutputs: ["road access context", "POI proximity", "accessibility indicators"],
  async fetch() {
    return plannedAdapterResponse(
      this.sourceId,
      this.integrationStatus,
      "OSM / Geofabrik adapter is planned pending extract workflow, attribution and ODbL compliance."
    );
  }
};
