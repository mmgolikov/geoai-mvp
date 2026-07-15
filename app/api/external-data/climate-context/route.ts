import { NextResponse } from "next/server";
import { getOpenMeteoClimateContext } from "@/src/lib/external-data/climate-open-meteo";
import { parseBoundedIsoDateRange, readPointFromSearchParams } from "@/src/lib/external-data/runtime-request-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const point = readPointFromSearchParams(url.searchParams);

  if (!point) {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "Valid lat and lng query parameters are required."
      },
      { status: 400 }
    );
  }

  const dateRange = parseBoundedIsoDateRange(url.searchParams.get("startDate"), url.searchParams.get("endDate"));
  if (dateRange && "error" in dateRange) {
    return NextResponse.json({ status: "unavailable", message: dateRange.error }, { status: 400 });
  }

  const result = await getOpenMeteoClimateContext({
    latitude: point.latitude,
    longitude: point.longitude,
    startDate: url.searchParams.get("startDate"),
    endDate: url.searchParams.get("endDate")
  });

  return NextResponse.json(result);
}
