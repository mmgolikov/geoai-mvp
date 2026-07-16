import type { SelectedDemoObject, SelectedPoint } from "@/src/types/geo";

export type UploadedDataset = {
  id: string;
  projectKey: string;
  name: string;
  type: "geojson" | "csv";
  status: "uploaded-local" | "parsed" | "invalid";
  sourceMode: "user-uploaded" | "sample-fixture" | "manual-offline";
  uploadedAt: string;
  featureCount?: number;
  rowCount?: number;
  columns?: string[];
  confidence: "user-provided" | "sample" | "unknown";
  officialStatus: "not-official" | "official-validation-required" | "user-labeled-official";
  notes?: string;
  visible?: boolean;
  rows?: UploadedCsvRow[];
  geojson?: GeoJSON.FeatureCollection;
};

export type UploadedCsvRow = {
  name: string;
  latitude?: number;
  longitude?: number;
  areaName?: string;
  metrics: Record<string, string | number>;
  raw: Record<string, string>;
};

export type UploadedMetricMatch = {
  datasetId: string;
  datasetName: string;
  rowName: string;
  matchType: "selected-object" | "area-name" | "nearest-coordinate" | "available-not-applied";
  confidence: "high" | "medium" | "low";
  note: string;
  distanceKm?: number;
  row?: UploadedCsvRow;
};

export type UploadedDataContext = {
  uploadedDatasets: UploadedDataset[];
  appliedMetrics: UploadedMetricMatch[];
  availableButNotApplied: UploadedMetricMatch[];
  visibleGeojsonLayers: UploadedDataset[];
  selectedPoint: SelectedPoint;
  selectedObject?: SelectedDemoObject | null;
};
