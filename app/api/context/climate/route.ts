import { NextResponse } from "next/server";
import { getOpenMeteoClimateContext } from "@/src/lib/external-data/climate-open-meteo";
import { externalDataCaveat } from "@/src/lib/external-data/source-registry";
import { isPointInRange, parseBoundedIsoDateRange, readPointFromSearchParams } from "@/src/lib/external-data/runtime-request-validation";

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

  if (typeof latitude !== "number" || typeof longitude !== "number" || !isPointInRange({ latitude, longitude })) {
    return null;
  }

  return { latitude: latitude as number, longitude: longitude as number };
}

function toScreeningContext(result: Awaited<ReturnType<typeof getOpenMeteoClimateContext>>) {
  const heatDays = result.metrics.hotDaysAbove40C;
  const maxTemp = result.metrics.maxTemperatureC;
  const rainfall = result.metrics.annualPrecipitationMm;
  const heatExposureProxy = heatDays === null
    ? "unavailable"
    : heatDays >= 60
      ? "high"
      : heatDays >= 25
        ? "medium"
        : "low";
  const rainfallProxy = rainfall === null
    ? "unavailable"
    : rainfall >= 130
      ? "elevated seasonal rainfall context"
      : rainfall >= 60
        ? "moderate rainfall context"
        : "low annual rainfall context";

  return {
    status: "permission_required",
    sourceId: result.source.id,
    source: result.source.name,
    climateDataMode: "provider permission required",
    heatExposureProxy,
    rainfallProxy,
    metrics: result.metrics,
    confidence: "low",
    caveat: `Open-Meteo live access is disabled pending approved commercial use; no upstream request was made. ${externalDataCaveat}`,
    limitation: "Not a certified flood, engineering-grade climate or insurance-grade hazard assessment.",
    note: maxTemp === null
      ? result.message ?? "Climate context unavailable; fallback returned."
      : `Maximum daily temperature proxy ${maxTemp}C; hot-day count proxy ${heatDays ?? "n/a"}.`
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const point = readPointFromSearchParams(url.searchParams);
  const coordinates = point ? readCoordinates({ lat: point.latitude, lng: point.longitude }) : null;

  if (!coordinates) {
    return NextResponse.json({ error: "Valid lat and lng query parameters are required." }, { status: 400 });
  }

  const dateRange = parseBoundedIsoDateRange(url.searchParams.get("startDate"), url.searchParams.get("endDate"));
  if (dateRange && "error" in dateRange) return NextResponse.json({ error: dateRange.error }, { status: 400 });

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
    return NextResponse.json({ error: "Valid latitude/longitude are required." }, { status: 400 });
  }

  const dateRange = parseBoundedIsoDateRange(body.startDate ?? null, body.endDate ?? null);
  if (dateRange && "error" in dateRange) return NextResponse.json({ error: dateRange.error }, { status: 400 });

  const result = await getOpenMeteoClimateContext({
    ...coordinates,
    startDate: body.startDate,
    endDate: body.endDate
  });

  return NextResponse.json(toScreeningContext(result));
}
