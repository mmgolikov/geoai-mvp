import { NextResponse } from "next/server";
import { readExternalMarketMetrics } from "@/src/lib/external-data/market-metrics";
import { getImportedMetricsReadinessMessage } from "@/src/lib/data-readiness";

export const runtime = "nodejs";

export async function GET() {
  const metrics = readExternalMarketMetrics();

  return NextResponse.json({
    ...metrics,
    fallbackStatus: getImportedMetricsReadinessMessage({ count: metrics.count }),
    disclaimer: metrics.source.disclaimer
  });
}
