import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listImportedMarketMetrics } from "@/src/lib/market-metrics";

export type RealMarketAreaMetric = {
  areaName: string;
  transactionCount: number;
  avgPricePerSqft: number | null;
  medianPricePerSqft: number | null;
  totalValueAED: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  confidence: string;
};

export type ExternalMarketMetricsResponse = {
  sourceMode: "real_snapshot" | "sample_fallback";
  source: {
    id: string;
    name: string;
    status: string;
    sourceType: string;
    disclaimer: string;
  };
  count: number;
  areas: unknown[];
  availableAreaNames: string[];
  fallbackUsed: boolean;
  message: string;
};

const realMetricsPath = join(process.cwd(), "data/external/normalized/market_area_metrics.real.json");

export function readExternalMarketMetrics(): ExternalMarketMetricsResponse {
  if (existsSync(realMetricsPath)) {
    try {
      const parsed = JSON.parse(readFileSync(realMetricsPath, "utf8")) as {
        source?: ExternalMarketMetricsResponse["source"];
        areas?: RealMarketAreaMetric[];
      };
      const areas = Array.isArray(parsed.areas) ? parsed.areas : [];

      return {
        sourceMode: "real_snapshot",
        source: parsed.source ?? {
          id: "dld-dubai-pulse-transactions",
          name: "DLD / Dubai Pulse transactions",
          status: "connected-snapshot",
          sourceType: "official-open-data",
          disclaimer: "Open official dataset snapshot; not a live official transactional feed."
        },
        count: areas.length,
        areas,
        availableAreaNames: areas.map((area) => area.areaName),
        fallbackUsed: false,
        message: "Using DLD / Dubai Pulse open dataset snapshot. This is not a live official transactional feed."
      };
    } catch {
      // Fall through to sample fallback if the snapshot is malformed.
    }
  }

  const sampleMetrics = listImportedMarketMetrics();

  return {
    sourceMode: "sample_fallback",
    source: {
      id: "sample-market-area-metrics",
      name: "GeoAI sample market metrics fallback",
      status: "sample-fallback",
      sourceType: "demo-normalized",
      disclaimer: "Sample/manual offline imports only; no live official DLD or Dubai Pulse integration is connected."
    },
    count: sampleMetrics.length,
    areas: sampleMetrics,
    availableAreaNames: sampleMetrics.map((metric) => metric.areaName),
    fallbackUsed: true,
    message: "Real DLD / Dubai Pulse snapshot not found. Existing sample market metrics fallback is active."
  };
}
