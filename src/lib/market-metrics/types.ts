import type { IngestionConfidence, MarketAreaMetric } from "@/src/lib/ingestion/types";
import type { SelectedDemoObject, SelectedPoint } from "@/src/types/geo";
import type { MarketContext } from "@/src/types/market-context";

export type MarketMetricsSourceMode =
  | "imported_sample"
  | "imported_csv"
  | "seed_static"
  | "fallback_demo";

export type MarketMetricMatchType =
  | "exact"
  | "alias"
  | "partial"
  | "seed_fallback"
  | "generic_fallback";

export type MarketMetricsMatch = {
  matchedAreaName: string;
  matchType: MarketMetricMatchType;
  confidence: "high" | "medium" | "low";
  sourceMode: MarketMetricsSourceMode;
  importedMetricsUsed: boolean;
  metrics: MarketAreaMetric | null;
  note: string;
};

export type MarketMetricSelectionContext = {
  point?: SelectedPoint | null;
  selectedObject?: SelectedDemoObject | null;
  marketContext?: MarketContext | null;
  candidateAreaName?: string | null;
};

export type MarketMetricScoreSignals = {
  liquidityIndex: number;
  rentalDemandProxy: number;
  pipelinePressure: number;
  marketSupport: number;
  dataConfidence: IngestionConfidence;
  sampleSizeNote: string;
};
