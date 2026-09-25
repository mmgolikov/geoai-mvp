/** Public, client-safe snapshot contract. NASA grid estimates are not site measurements. */
export const CLIMATE_VERSION = "NASA_POWER_MONTHLY_V1" as const;
export const CLIMATE_ENDPOINT = "https://power.larc.nasa.gov/api/temporal/monthly/point";
export const CLIMATE_REFERENCE = "https://power.larc.nasa.gov/docs/referencing/";
export const CLIMATE_ATTRIBUTION = "NASA POWER Project, NASA Langley Research Center";
export const CLIMATE_LIMIT = "Regional MERRA-2 grid (0.5° latitude × 0.625° longitude), 2 m air temperature; not site or surface temperature, thermal comfort, or an absolute temperature extreme.";
export const CLIMATE_EVIDENCE_ID = "EVD-NASA-POWER-CLIMATE";
export type ClimateMonth = { month: number; temperatureC: number; maximumTemperatureC: number; relativeHumidityPct: number };
export type PointObjectClimate = {
  version: typeof CLIMATE_VERSION; status: "available"; year: number;
  requestedPoint: [number, number]; months: ClimateMonth[];
  source: { sourceId: "NASA-POWER"; endpoint: typeof CLIMATE_ENDPOINT; referenceUrl: typeof CLIMATE_REFERENCE;
    attribution: typeof CLIMATE_ATTRIBUTION; dataset: "MERRA2"; apiVersion: string; timeStandard: "LST";
    observedStart: string; observedEnd: string; acquiredAt: string; responseHash: string; responseBytes: number };
  proofLimit: typeof CLIMATE_LIMIT;
} | { version: typeof CLIMATE_VERSION; status: "unavailable"; year: number; sourceId: "NASA-POWER";
  reason: "timeout" | "budget_exhausted" | "http_error" | "invalid_response" | "response_too_large" | "network_error" };

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => k in v);
const bounded = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export function parsePointObjectClimate(value: unknown): PointObjectClimate | null {
  if (!record(value) || value.version !== CLIMATE_VERSION || !Number.isInteger(value.year) || !bounded(value.year, 1981, 9998)) return null;
  if (value.status === "unavailable") return exact(value, ["version", "status", "year", "sourceId", "reason"]) && value.sourceId === "NASA-POWER" &&
    ["timeout", "budget_exhausted", "http_error", "invalid_response", "response_too_large", "network_error"].includes(String(value.reason)) ? value as PointObjectClimate : null;
  if (value.status !== "available" || !exact(value, ["version", "status", "year", "requestedPoint", "months", "source", "proofLimit"]) || value.proofLimit !== CLIMATE_LIMIT ||
    !Array.isArray(value.requestedPoint) || value.requestedPoint.length !== 2 || !bounded(value.requestedPoint[0], -180, 180) || !bounded(value.requestedPoint[1], -90, 90) ||
    !Array.isArray(value.months) || value.months.length !== 12 || !record(value.source)) return null;
  if (!value.months.every((m, i) => record(m) && exact(m, ["month", "temperatureC", "maximumTemperatureC", "relativeHumidityPct"]) && m.month === i + 1 &&
    bounded(m.temperatureC, -100, 70) && bounded(m.maximumTemperatureC, -100, 80) && m.maximumTemperatureC >= m.temperatureC && bounded(m.relativeHumidityPct, 0, 100))) return null;
  const s = value.source;
  if (!exact(s, ["sourceId", "endpoint", "referenceUrl", "attribution", "dataset", "apiVersion", "timeStandard", "observedStart", "observedEnd", "acquiredAt", "responseHash", "responseBytes"]) ||
    s.sourceId !== "NASA-POWER" || s.endpoint !== CLIMATE_ENDPOINT || s.referenceUrl !== CLIMATE_REFERENCE || s.attribution !== CLIMATE_ATTRIBUTION || s.dataset !== "MERRA2" ||
    typeof s.apiVersion !== "string" || !/^v2\.\d{1,3}\.\d{1,3}$/.test(s.apiVersion) || s.timeStandard !== "LST" ||
    s.observedStart !== `${value.year}-01-01` || s.observedEnd !== `${value.year}-12-31` || typeof s.acquiredAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s.acquiredAt) || !Number.isFinite(Date.parse(s.acquiredAt)) ||
    typeof s.responseHash !== "string" || !/^[a-f0-9]{64}$/.test(s.responseHash) || !Number.isInteger(s.responseBytes) || !bounded(s.responseBytes, 1, 65536)) return null;
  return value as PointObjectClimate;
}
