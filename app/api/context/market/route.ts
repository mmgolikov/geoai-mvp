import { NextResponse } from "next/server";
import { getMarketSourceLineage } from "@/src/lib/context/market-context-service";
import { seedDubaiMarketContextAdapter } from "@/src/lib/market-context-adapter";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import type { MarketContextAdapterRequest } from "@/src/types/market-context";

export const runtime = "nodejs";

function isMarketContextRequest(value: unknown): value is MarketContextAdapterRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const request = value as Partial<MarketContextAdapterRequest>;
  const keys = Object.keys(value);
  const point = request.point;
  return (
    keys.every((key) => key === "point" || key === "scenarioId") &&
    typeof point === "object" && point !== null && !Array.isArray(point) &&
    Object.keys(point).every((key) => key === "latitude" || key === "longitude") &&
    typeof point.latitude === "number" && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    typeof point.longitude === "number" && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180 &&
    (request.scenarioId === undefined || (typeof request.scenarioId === "string" && request.scenarioId.length > 0 && request.scenarioId.length <= 120))
  );
}

export async function POST(request: Request) {
  const parsed = await readBoundedJson(request, 16 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }
  const body = parsed.value;

  if (!isMarketContextRequest(body)) {
    return NextResponse.json({ error: "Invalid market context request." }, { status: 400 });
  }

  const safeRequest: MarketContextAdapterRequest = {
    point: { latitude: body.point.latitude, longitude: body.point.longitude },
    ...(body.scenarioId ? { scenarioId: body.scenarioId } : {})
  };
  return NextResponse.json({
    ...seedDubaiMarketContextAdapter.getContext(safeRequest),
    ...getMarketSourceLineage()
  });
}
