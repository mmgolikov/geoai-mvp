import { NextResponse } from "next/server";
import { readExternalMarketMetrics } from "@/src/lib/external-data/market-metrics";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(readExternalMarketMetrics());
}
