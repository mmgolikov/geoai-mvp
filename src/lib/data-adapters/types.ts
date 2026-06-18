import type { DataSourceIntegrationStatus } from "@/src/types/data-source";
import type { SelectedPoint } from "@/src/types/geo";

export type RealDataType =
  | "transactions"
  | "rents"
  | "projects"
  | "land_parcels"
  | "planning_zones"
  | "roads"
  | "poi"
  | "accessibility"
  | "satellite_scenes"
  | "change_detection"
  | "customer_assets"
  | "documents";

export type DataAdapterRequest = {
  point?: SelectedPoint;
  areaName?: string;
  sourceId?: string;
  dataTypes?: RealDataType[];
};

export type DataAdapterResponse = {
  sourceId: string;
  status: "not_implemented" | "planned" | "ready_for_pilot";
  integrationStatus: DataSourceIntegrationStatus;
  message: string;
  data: null;
};

export type DataAdapter = {
  sourceId: string;
  supportedDataTypes: RealDataType[];
  integrationStatus: DataSourceIntegrationStatus;
  expectedInputs: string[];
  expectedOutputs: string[];
  fetch: (request: DataAdapterRequest) => Promise<DataAdapterResponse>;
};

export function plannedAdapterResponse(
  sourceId: string,
  integrationStatus: DataSourceIntegrationStatus,
  message: string
): DataAdapterResponse {
  return {
    sourceId,
    status: "planned",
    integrationStatus,
    message,
    data: null
  };
}
