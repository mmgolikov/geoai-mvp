import { NextResponse } from "next/server";
import { getMarketSourceLineage } from "@/src/lib/context/market-context-service";
import { seedDubaiMarketContextAdapter } from "@/src/lib/market-context-adapter";
import type { MarketContextAdapterRequest } from "@/src/types/market-context";

export const runtime = "nodejs";

function isMarketContextRequest(value: unknown): value is MarketContextAdapterRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const request = value as Partial<MarketContextAdapterRequest>;
  return (
    typeof request.point?.latitude === "number" &&
    typeof request.point?.longitude === "number"
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isMarketContextRequest(body)) {
    return NextResponse.json({ error: "Invalid market context request." }, { status: 400 });
  }

  return NextResponse.json({
    ...seedDubaiMarketContextAdapter.getContext(body),
    ...getMarketSourceLineage()
  });
}
