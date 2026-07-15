import { NextResponse } from "next/server";
import { getSpatialContext } from "@/src/lib/context/spatial-context-service";
import { readPointFromSearchParams } from "@/src/lib/external-data/runtime-request-validation";

export const runtime = "nodejs";

function readPoint(request: Request) {
  const url = new URL(request.url);
  return readPointFromSearchParams(url.searchParams);
}

export async function GET(request: Request) {
  const point = readPoint(request);
  if (!point) return NextResponse.json({ error: "Valid lat and lng query parameters are required." }, { status: 400 });
  return NextResponse.json(getSpatialContext(point));
}
