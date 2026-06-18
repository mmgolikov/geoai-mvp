import { NextResponse } from "next/server";
import {
  getMarketMetricsSourceMode,
  listImportedMarketMetrics
} from "@/src/lib/market-metrics";

export const runtime = "nodejs";

export async function GET() {
  const metrics = listImportedMarketMetrics();

  return NextResponse.json({
    sourceMode: getMarketMetricsSourceMode(),
    count: metrics.length,
    availableAreaNames: metrics.map((metric) => metric.areaName),
    fallbackStatus: metrics.length > 0
      ? "Imported sample metrics available for deterministic matching."
      : "No imported market metrics found; seed_static fallback is used."
  });
}
