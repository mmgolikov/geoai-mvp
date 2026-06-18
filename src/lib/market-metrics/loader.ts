import importedMetrics from "@/data/normalized/market_area_metrics.json";
import type { MarketAreaMetric } from "@/src/lib/ingestion/types";
import type { MarketMetricsSourceMode } from "@/src/lib/market-metrics/types";

function isMarketAreaMetric(value: unknown): value is MarketAreaMetric {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const metric = value as Partial<MarketAreaMetric>;
  return (
    typeof metric.areaName === "string" &&
    (metric.dataConfidence === "high" ||
      metric.dataConfidence === "medium" ||
      metric.dataConfidence === "low")
  );
}

export function listImportedMarketMetrics(): MarketAreaMetric[] {
  const metrics: unknown[] = Array.isArray(importedMetrics) ? importedMetrics : [];
  return metrics.filter(isMarketAreaMetric);
}

export function getMarketMetricsSourceMode(): MarketMetricsSourceMode {
  return listImportedMarketMetrics().length > 0 ? "imported_sample" : "seed_static";
}

export function getMarketMetricsByArea(areaName: string) {
  const normalized = normalizeAreaName(areaName);
  return listImportedMarketMetrics().find((metric) => normalizeAreaName(metric.areaName) === normalized) ?? null;
}

export function normalizeAreaName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
