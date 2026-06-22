import { NextResponse } from "next/server";
import { getSatelliteAvailabilityContext } from "@/src/lib/context/environment-context-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.json({
    ...getSatelliteAvailabilityContext(),
    query: {
      bbox: url.searchParams.get("bbox"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to")
    }
  });
}
