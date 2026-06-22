import { NextResponse } from "next/server";
import {
  getExternalDataReadiness,
  normalizedExternalFileExists,
  readExternalDataManifest
} from "@/src/lib/external-data/data-manifest";
import { externalDataCaveat, externalDataSources } from "@/src/lib/external-data/source-registry";

export const runtime = "nodejs";

export async function GET() {
  const manifest = readExternalDataManifest();
  const readiness = getExternalDataReadiness();
  const availableFiles = {
    dldMarketMetrics:
      normalizedExternalFileExists("data/normalized/dld_market_snapshot.json") ||
      normalizedExternalFileExists("data/external/normalized/market_area_metrics.real.json"),
    osmBaseline:
      normalizedExternalFileExists("data/normalized/open_geodata_snapshot.json") ||
      normalizedExternalFileExists("data/external/normalized/spatial_baseline.real.geojson"),
    dldReport: normalizedExternalFileExists("data/external/normalized/dld_ingestion_report.real.json"),
    osmReport: normalizedExternalFileExists("data/external/normalized/osm_ingestion_report.real.json")
  };

  return NextResponse.json({
    ok: true,
    sources: externalDataSources,
    manifest,
    readiness,
    availableFiles,
    lastUpdated: manifest.generatedAt,
    caveat: externalDataCaveat,
    disclaimers: externalDataSources.map((source) => ({
      id: source.id,
      disclaimer: source.disclaimer
    }))
  });
}
