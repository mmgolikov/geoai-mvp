import { NextResponse } from "next/server";
import { getAirQualityContext } from "@/src/lib/context/environment-context-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "lat and lng query parameters are required." }, { status: 400 });
  }
  return NextResponse.json(await getAirQualityContext({ latitude, longitude }));
}
