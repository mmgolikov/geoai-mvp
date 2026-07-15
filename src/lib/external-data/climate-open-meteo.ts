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
  status: "permission_required";
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

function sourceSummary() {
  const source = getExternalDataSource("open-meteo-climate");

  return {
    id: "open-meteo-climate",
    name: "Open-Meteo historical weather",
    sourceType: "reanalysis",
    disclaimer: source?.disclaimer ?? "Open-Meteo commercial API activation is required; no live request is made."
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

  return {
    source: sourceSummary(),
    status: "permission_required",
    metrics: {
      avgTemperatureC: null,
      maxTemperatureC: null,
      hotDaysAbove40C: null,
      annualPrecipitationMm: null
    },
    message: `Open-Meteo free API use is disabled for public/commercial Preview. Approved commercial access or self-hosting is required before activation. Requested screening period: ${resolvedStartDate} to ${resolvedEndDate}; coordinates were not sent upstream (${latitude}, ${longitude}).`
  };
}
