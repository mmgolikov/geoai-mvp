import { NextResponse } from "next/server";
import { getAccessibilityContext } from "@/src/lib/context/spatial-context-service";
import { readPointFromSearchParams } from "@/src/lib/external-data/runtime-request-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const point = readPointFromSearchParams(url.searchParams);
  if (!point) {
    return NextResponse.json({ error: "Valid lat and lng query parameters are required." }, { status: 400 });
  }
  return NextResponse.json(getAccessibilityContext(point));
}
