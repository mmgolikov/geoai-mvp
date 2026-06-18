import { NextResponse } from "next/server";
import { openGeodataBaseline } from "@/src/lib/open-geodata";

export async function GET() {
  return NextResponse.json({
    ok: true,
    sourceMode: openGeodataBaseline.sourceMode,
    roadsCount: openGeodataBaseline.roads.length,
    poiCount: openGeodataBaseline.poi.length,
    landuseCount: openGeodataBaseline.landuse.length,
    accessibilityMetricsCount: openGeodataBaseline.accessibilityMetrics.length,
    availableAreaNames: openGeodataBaseline.accessibilityMetrics.map((metric) => metric.areaName),
    fallbackStatus: "local_sample_fixture",
    limitations: openGeodataBaseline.ingestionReport.limitations
  });
}

