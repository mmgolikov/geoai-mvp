import { getExternalDataSource } from "@/src/lib/external-data/source-registry";

export type ClimateContextMetrics = {
  avgTemperatureC: number | null;
  maxTemperatureC: number | null;
  hotDaysAbove40C: number | null;
  annualPrecipitationMm: number | null;
};

export type ClimateContextResponse = {
  source: {
    id: string;
    name: string;
    sourceType: string;
    disclaimer: string;
  };
  status: "ok" | "unavailable";
  metrics: ClimateContextMetrics;
  message?: string;
};

function previousCalendarYear() {
  const year = new Date().getUTCFullYear() - 1;
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`
  };
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function sourceSummary() {
  const source = getExternalDataSource("open-meteo-climate");

  return {
    id: "open-meteo-climate",
    name: "Open-Meteo historical weather",
    sourceType: "reanalysis",
    disclaimer: source?.disclaimer ?? "Climate context from reanalysis/model data; not a site-specific engineering or insurance assessment."
  };
}

export async function getOpenMeteoClimateContext({
  latitude,
  longitude,
  startDate,
  endDate
}: {
  latitude: number;
  longitude: number;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<ClimateContextResponse> {
  const defaults = previousCalendarYear();
  const resolvedStartDate = startDate || defaults.startDate;
  const resolvedEndDate = endDate || defaults.endDate;
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: resolvedStartDate,
    end_date: resolvedEndDate,
    daily: "temperature_2m_mean,temperature_2m_max,precipitation_sum",
    timezone: "UTC"
  });

  try {
    const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params.toString()}`, {
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo returned ${response.status}`);
    }

    const data = await response.json() as {
      daily?: {
        temperature_2m_mean?: number[];
        temperature_2m_max?: number[];
        precipitation_sum?: number[];
      };
    };
    const meanTemps = (data.daily?.temperature_2m_mean ?? []).filter((value) => Number.isFinite(value));
    const maxTemps = (data.daily?.temperature_2m_max ?? []).filter((value) => Number.isFinite(value));
    const precipitation = (data.daily?.precipitation_sum ?? []).filter((value) => Number.isFinite(value));

    return {
      source: sourceSummary(),
      status: "ok",
      metrics: {
        avgTemperatureC: average(meanTemps),
        maxTemperatureC: maxTemps.length > 0 ? Number(Math.max(...maxTemps).toFixed(1)) : null,
        hotDaysAbove40C: maxTemps.filter((value) => value > 40).length,
        annualPrecipitationMm: precipitation.length > 0 ? Number(precipitation.reduce((sum, value) => sum + value, 0).toFixed(1)) : null
      }
    };
  } catch (error) {
    return {
      source: sourceSummary(),
      status: "unavailable",
      metrics: {
        avgTemperatureC: null,
        maxTemperatureC: null,
        hotDaysAbove40C: null,
        annualPrecipitationMm: null
      },
      message: error instanceof Error ? error.message : "Open-Meteo climate context is unavailable."
    };
  }
}
