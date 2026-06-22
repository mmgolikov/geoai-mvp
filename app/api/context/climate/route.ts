import { NextResponse } from "next/server";
import { getOpenMeteoClimateContext } from "@/src/lib/external-data/climate-open-meteo";
import { externalDataCaveat } from "@/src/lib/external-data/source-registry";

export const runtime = "nodejs";

type ClimateRequest = {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  startDate?: string | null;
  endDate?: string | null;
};

function readCoordinates(value: ClimateRequest) {
  const latitude = typeof value.latitude === "number" ? value.latitude : value.lat;
  const longitude = typeof value.longitude === "number" ? value.longitude : value.lng;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude: latitude as number, longitude: longitude as number };
}

function toScreeningContext(result: Awaited<ReturnType<typeof getOpenMeteoClimateContext>>) {
  const heatDays = result.metrics.hotDaysAbove40C;
  const maxTemp = result.metrics.maxTemperatureC;
  const rainfall = result.metrics.annualPrecipitationMm;
  const heatExposureProxy = heatDays === null
    ? "fallback-demo"
    : heatDays >= 60
      ? "high"
      : heatDays >= 25
        ? "medium"
        : "low";
  const rainfallProxy = rainfall === null
    ? "fallback-demo"
    : rainfall >= 130
      ? "elevated seasonal rainfall context"
      : rainfall >= 60
        ? "moderate rainfall context"
        : "low annual rainfall context";

  return {
    status: result.status === "ok" ? "connected" : "sample_fallback",
    sourceId: result.source.id,
    source: result.source.name,
    climateDataMode: result.status === "ok" ? "external open climate API context" : "demo fallback",
    heatExposureProxy,
    rainfallProxy,
    metrics: result.metrics,
    confidence: result.status === "ok" ? "medium" : "low",
    caveat: result.status === "ok"
      ? `Screening-level heat/rainfall proxy from open climate context. ${externalDataCaveat}`
      : `Open climate API context unavailable; deterministic demo fallback is active. ${externalDataCaveat}`,
    limitation: "Not a certified flood, engineering-grade climate or insurance-grade hazard assessment.",
    note: maxTemp === null
      ? result.message ?? "Climate context unavailable; fallback returned."
      : `Maximum daily temperature proxy ${maxTemp}C; hot-day count proxy ${heatDays ?? "n/a"}.`
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const coordinates = readCoordinates({
    lat: Number(url.searchParams.get("lat")),
    lng: Number(url.searchParams.get("lng")),
    startDate: url.searchParams.get("startDate"),
    endDate: url.searchParams.get("endDate")
  });

  if (!coordinates) {
    return NextResponse.json({ error: "lat and lng query parameters are required." }, { status: 400 });
  }

  const result = await getOpenMeteoClimateContext({
    ...coordinates,
    startDate: url.searchParams.get("startDate"),
    endDate: url.searchParams.get("endDate")
  });

  return NextResponse.json(toScreeningContext(result));
}

export async function POST(request: Request) {
  let body: ClimateRequest;

  try {
    body = await request.json() as ClimateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const coordinates = readCoordinates(body);
  if (!coordinates) {
    return NextResponse.json({ error: "latitude/longitude are required." }, { status: 400 });
  }

  const result = await getOpenMeteoClimateContext({
    ...coordinates,
    startDate: body.startDate,
    endDate: body.endDate
  });

  return NextResponse.json(toScreeningContext(result));
}
