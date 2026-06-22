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
  const fallback = {
    status: "sample_fallback",
    sourceId: "nasa-power-solar-energy",
    source: "NASA POWER solar / energy context",
    point,
    solarRadiationProxy: "high Dubai solar resource context",
    windProxy: "screening fallback",
    confidence: "low",
    limitation: "Fallback screening context; not an energy-yield certification or engineering assessment.",
    caveat: externalDataCaveat,
    sourceLineage: buildContextLineage(["nasa-power-solar-energy"], "sample_fallback")
  };

  try {
    const year = new Date().getUTCFullYear() - 1;
    const params = new URLSearchParams({
      parameters: "ALLSKY_SFC_SW_DWN,WS10M,T2M_MAX",
      community: "RE",
      longitude: String(point.longitude),
      latitude: String(point.latitude),
      start: `${year}0101`,
      end: `${year}1231`,
      format: "JSON"
    });
    const response = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${params.toString()}`, {
      next: { revalidate: 86400 }
    });
    if (!response.ok) throw new Error(`NASA POWER returned ${response.status}`);
    const data = await response.json() as { properties?: { parameter?: Record<string, Record<string, number>> } };
    const solarValues = Object.values(data.properties?.parameter?.ALLSKY_SFC_SW_DWN ?? {}).filter(Number.isFinite);
    const windValues = Object.values(data.properties?.parameter?.WS10M ?? {}).filter(Number.isFinite);
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

  try {
    const params = new URLSearchParams({
      coordinates: `${point.latitude},${point.longitude}`,
      radius: "15000",
      limit: "20"
    });
    const response = await fetch(`https://api.openaq.org/v2/latest?${params.toString()}`, {
      next: { revalidate: 3600 }
    });
    if (!response.ok) throw new Error(`OpenAQ returned ${response.status}`);
    const data = await response.json() as {
      results?: Array<{
        location?: string;
        measurements?: Array<{ parameter?: string; value?: number; lastUpdated?: string }>;
      }>;
    };
    const first = data.results?.[0];
    if (!first) return fallback;
    const measurements = Object.fromEntries((first.measurements ?? []).map((item) => [String(item.parameter ?? "").toLowerCase(), item.value ?? null]));

    return {
      ...fallback,
      status: "connected",
      nearestContext: first.location ?? "OpenAQ nearest station",
      measurements: {
        pm25: measurements.pm25 ?? null,
        pm10: measurements.pm10 ?? null,
        no2: measurements.no2 ?? null,
        o3: measurements.o3 ?? null
      },
      recency: first.measurements?.[0]?.lastUpdated ?? "latest OpenAQ response",
      confidence: "medium",
      sourceLineage: buildContextLineage(["openaq-air-quality"], "connected")
    };
  } catch {
    return fallback;
  }
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
