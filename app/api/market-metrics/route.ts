import { NextResponse } from "next/server";
import {
  getMarketMetricsSourceMode,
  listImportedMarketMetrics
} from "@/src/lib/market-metrics";
import { getImportedMetricsReadinessMessage } from "@/src/lib/data-readiness";

export const runtime = "nodejs";

export async function GET() {
  const metrics = listImportedMarketMetrics();

  return NextResponse.json({
    sourceMode: getMarketMetricsSourceMode(),
    count: metrics.length,
    availableAreaNames: metrics.map((metric) => metric.areaName),
    fallbackStatus: getImportedMetricsReadinessMessage({ count: metrics.length }),
    disclaimer: "Metrics are sample/manual offline imports only; no live official DLD or Dubai Pulse integration is connected in this demo."
  });
}
