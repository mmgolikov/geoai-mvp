import { NextResponse } from "next/server";
import {
  normalizedExternalFileExists,
  readExternalDataManifest
} from "@/src/lib/external-data/data-manifest";
import { externalDataSources } from "@/src/lib/external-data/source-registry";

export const runtime = "nodejs";

export async function GET() {
  const manifest = readExternalDataManifest();
  const availableFiles = {
    dldMarketMetrics: normalizedExternalFileExists("data/external/normalized/market_area_metrics.real.json"),
    osmBaseline: normalizedExternalFileExists("data/external/normalized/spatial_baseline.real.geojson"),
    dldReport: normalizedExternalFileExists("data/external/normalized/dld_ingestion_report.real.json"),
    osmReport: normalizedExternalFileExists("data/external/normalized/osm_ingestion_report.real.json")
  };

  return NextResponse.json({
    ok: true,
    sources: externalDataSources,
    manifest,
    availableFiles,
    lastUpdated: manifest.generatedAt,
    disclaimers: externalDataSources.map((source) => ({
      id: source.id,
      disclaimer: source.disclaimer
    }))
  });
}
