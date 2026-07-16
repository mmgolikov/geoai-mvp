import { NextResponse } from "next/server";
import { getCompactPublicMarketMetrics } from "@/src/lib/external-data/market-metrics";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    getCompactPublicMarketMetrics(),
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
