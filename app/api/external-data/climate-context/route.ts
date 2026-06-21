import { NextResponse } from "next/server";
import { getOpenMeteoClimateContext } from "@/src/lib/external-data/climate-open-meteo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "lat and lng query parameters are required."
      },
      { status: 400 }
    );
  }

  const result = await getOpenMeteoClimateContext({
    latitude,
    longitude,
    startDate: url.searchParams.get("startDate"),
    endDate: url.searchParams.get("endDate")
  });

  return NextResponse.json(result);
}
