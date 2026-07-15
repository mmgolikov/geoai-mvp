import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { externalDataCaveat } from "@/src/lib/external-data/source-registry";
import { buildContextLineage, validationRequiredNote } from "@/src/lib/context/source-lineage-builder";
import type { SelectedPoint } from "@/src/types/geo";
import { publicDemoPoint } from "@/src/lib/external-data/runtime-request-validation";

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
  const fallback = {
    status: "sample_fallback",
    sourceId: "nasa-power-solar-energy",
    source: "NASA POWER solar / energy context",
    point,
    solarRadiationProxy: "high Dubai solar resource context",
    windProxy: "screening fallback",
    confidence: "low",
    fallbackReason: "runtime_source_pack_required",
    limitation: "Fallback screening context; not an energy-yield certification or engineering assessment.",
    caveat: externalDataCaveat,
    sourceLineage: buildContextLineage(["nasa-power-solar-energy"], "sample_fallback")
  };

  const isFixedPublicDemoPoint = Math.abs(point.latitude - publicDemoPoint.latitude) < 0.000001 &&
    Math.abs(point.longitude - publicDemoPoint.longitude) < 0.000001;
  if (process.env.VERCEL_ENV === "production" || !isFixedPublicDemoPoint) {
    return {
      ...fallback,
      limitation: `NASA POWER live context is restricted to the fixed public demo point in local/Preview runtime; no upstream request was made. ${fallback.limitation}`
    };
  }

  try {
    const year = new Date().getUTCFullYear() - 1;
    const params = new URLSearchParams({
      parameters: "ALLSKY_SFC_SW_DWN,WS10M,T2M_MAX",
      community: "RE",
      longitude: String(point.longitude),
      latitude: String(point.latitude),
      start: `${year}0101`,
      end: `${year}1231`,
      format: "JSON",
      "time-standard": "UTC"
    });
    const response = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) throw new Error(`NASA POWER returned ${response.status}`);
    const data = await response.json() as { properties?: { parameter?: Record<string, Record<string, number>> } };
    const validProviderValue = (value: number) => Number.isFinite(value) && value > -900;
    const solarValues = Object.values(data.properties?.parameter?.ALLSKY_SFC_SW_DWN ?? {}).filter(validProviderValue);
    const windValues = Object.values(data.properties?.parameter?.WS10M ?? {}).filter(validProviderValue);
    const avg = (values: number[]) => values.length > 0 ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
    const solar = avg(solarValues);

    return {
      ...fallback,
      status: "connected",
      solarRadiationKwhM2Day: solar,
      solarRadiationProxy: solar === null ? fallback.solarRadiationProxy : solar >= 5.5 ? "high" : solar >= 4.5 ? "medium" : "low",
      averageWindMs: avg(windValues),
      windProxy: windValues.length > 0 ? "open API wind context" : fallback.windProxy,
      confidence: "medium",
      fallbackReason: null,
      retrievedAt: new Date().toISOString(),
      requestedPeriod: { from: `${year}-01-01`, to: `${year}-12-31` },
      limitation: "NASA POWER context is screening-level and not an energy-yield certification.",
      sourceLineage: buildContextLineage(["nasa-power-solar-energy"], "connected")
    };
  } catch {
    return fallback;
  }
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
