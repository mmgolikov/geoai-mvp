import { NextResponse } from "next/server";
import { getCompactPublicMarketMetrics } from "@/src/lib/external-data/market-metrics";
import { getImportedMetricsReadinessMessage } from "@/src/lib/data-readiness";

export const runtime = "nodejs";

export async function GET() {
  const metrics = getCompactPublicMarketMetrics();

  return NextResponse.json(
    {
      ...metrics,
      fallbackStatus: getImportedMetricsReadinessMessage({ count: metrics.count }),
      disclaimer: metrics.source.disclaimer
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
