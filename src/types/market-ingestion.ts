import type { MarketContextConfidence } from "@/src/types/market-context";

export type IngestionMode =
  | "seed_static"
  | "csv_ready"
  | "api_ready"
  | "manual_upload_planned";

export type DataQualityIssue = {
  recordId?: string;
  areaName?: string;
  field?: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type RawMarketRecord = {
  id: string;
  areaName: string;
  sourceId: string;
  sourceMode: IngestionMode;
  activityIndex?: number;
  rentalDemandIndex?: number;
  liquidityIndex?: number;
  developmentPipelineIndex?: number;
  riskIndex?: number;
  trend?: "rising" | "stable" | "cooling";
  confidence?: MarketContextConfidence;
  note?: string;
  updatedAt?: string;
};

export type NormalizedMarketRecord = {
  id: string;
  areaName: string;
  normalizedAreaName: string;
  sourceId: string;
  sourceMode: IngestionMode;
  activityIndex: number;
  rentalDemandIndex: number;
  liquidityIndex: number;
  developmentPipelineIndex: number;
  riskIndex: number;
  trend: "rising" | "stable" | "cooling";
  confidence: MarketContextConfidence;
  note: string;
  updatedAt: string;
};

export type MarketDataSource = {
  id: string;
  name: string;
  mode: IngestionMode;
  registrySourceId: string;
  description: string;
  confidence: MarketContextConfidence;
};

export type MarketDataImportResult = {
  source: MarketDataSource;
  records: NormalizedMarketRecord[];
  issues: DataQualityIssue[];
};

export type MarketAreaAggregate = {
  areaName: string;
  normalizedAreaName: string;
  sourceMode: IngestionMode;
  recordCount: number;
  activityIndex: number;
  rentalDemandIndex: number;
  liquidityIndex: number;
  developmentPipelineIndex: number;
  riskIndex: number;
  trend: "rising" | "stable" | "cooling";
  confidence: MarketContextConfidence;
  sourceIds: string[];
  dataQualityNotes: string[];
};
