import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { externalDataCaveat } from "@/src/lib/external-data/source-registry";
import { buildContextLineage, validationRequiredNote } from "@/src/lib/context/source-lineage-builder";
import type { SelectedPoint } from "@/src/types/geo";

function readJson<T>(relativePath: string): T | null {
  try {
    const path = join(process.cwd(), relativePath);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function getSolarEnergyContext(point: SelectedPoint) {
  return {
    status: "sample_fallback",
    sourceId: "nasa-power-solar-energy",
    source: "NASA POWER solar / energy context",
    point,
    solarRadiationProxy: "high Dubai solar resource context",
    windProxy: "screening fallback",
    confidence: "low",
    fallbackReason: "runtime_source_pack_required",
    limitation: "The legacy point route does not call NASA POWER. Use the controlled fixed-geography Preview source-pack endpoint for runtime API context; this fallback is not an energy-yield certification or engineering assessment.",
    caveat: externalDataCaveat,
    sourceLineage: buildContextLineage(["nasa-power-solar-energy"], "sample_fallback")
  };
}

export async function getAirQualityContext(point: SelectedPoint) {
  const fallback = {
    status: "sample_fallback",
    sourceId: "openaq-air-quality",
    source: "OpenAQ air-quality context",
    point,
    nearestContext: "Dubai sample/fallback air-quality screening context",
    measurements: {
      pm25: null,
      pm10: null,
      no2: null,
      o3: null
    },
    recency: "fallback",
    confidence: "low",
    limitation: "Not health-grade or regulatory-compliance air-quality assessment.",
    caveat: externalDataCaveat,
    sourceLineage: buildContextLineage(["openaq-air-quality"], "sample_fallback")
  };

  return {
    ...fallback,
    fallbackReason: "provider_not_in_approved_preview_source_pack",
    limitation: `OpenAQ live access is not included in CR-DEV8-001; no upstream request was made. ${fallback.limitation}`
  };
}

export function getSatelliteAvailabilityContext() {
  const sample = readJson<{
    collections?: Array<{ name: string; sceneCount?: number; latestSceneDate?: string; cloudCoverProxy?: string }>;
    limitation?: string;
    status?: string;
  }>("data/external/samples/copernicus_sentinel_metadata_sample.json");

  return {
    status: sample ? "sample_fallback" : "token_required",
    source: "Copernicus Data Space",
    availableCollections: sample?.collections ?? ["Sentinel-1", "Sentinel-2", "Sentinel-3 / CLMS"].map((name) => ({ name, sceneCount: null })),
    lastQueryStatus: sample ? "sample metadata available" : "token required or planned",
    limitation: sample?.limitation ?? "Metadata path only; no imagery download or raster analytics connected.",
    caveat: externalDataCaveat,
    sourceLineage: buildContextLineage(["copernicus-sentinel-metadata"], sample ? "sample_fallback" : "token_required")
  };
}
