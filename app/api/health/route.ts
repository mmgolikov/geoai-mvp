import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    app: "GeoAI",
    milestone: "geoai-investor-demo-v0.4",
    mode: "investor_demo_prototype",
    dataStatus: "Sample/open and offline data only; live official integrations are not connected."
  });
}
