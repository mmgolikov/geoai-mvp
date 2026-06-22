import { NextResponse } from "next/server";
import { getSpatialContext } from "@/src/lib/context/spatial-context-service";

export const runtime = "nodejs";

function readPoint(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

export async function GET(request: Request) {
  const point = readPoint(request);
  if (!point) return NextResponse.json({ error: "lat and lng query parameters are required." }, { status: 400 });
  return NextResponse.json(getSpatialContext(point));
}
