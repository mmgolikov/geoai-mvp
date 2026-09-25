import "server-only";
import { createHash } from "node:crypto";
import { CLIMATE_ATTRIBUTION, CLIMATE_ENDPOINT, CLIMATE_LIMIT, CLIMATE_REFERENCE, CLIMATE_VERSION, parsePointObjectClimate, type PointObjectClimate } from "./point-to-object-climate-contract";

type Input = { longitude: number; latitude: number; deadlineAtMs: number; /** Deterministic server-side test clock. */ now?: Date };
type UnavailableReason = Extract<PointObjectClimate, { status: "unavailable" }>["reason"];
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function normalizeNasaPowerMonthly(payload: unknown, input: { longitude: number; latitude: number; year: number; acquiredAt: string; responseHash: string; responseBytes: number }): PointObjectClimate | null {
  if (!record(payload) || payload.type !== "Feature" || !record(payload.geometry) || payload.geometry.type !== "Point" ||
    !Array.isArray(payload.geometry.coordinates) || payload.geometry.coordinates.length !== 3 ||
    typeof payload.geometry.coordinates[0] !== "number" || typeof payload.geometry.coordinates[1] !== "number" || !Number.isFinite(payload.geometry.coordinates[0]) || !Number.isFinite(payload.geometry.coordinates[1]) ||
    Math.abs(payload.geometry.coordinates[0] - input.longitude) > 0.001 || Math.abs(payload.geometry.coordinates[1] - input.latitude) > 0.001 ||
    !record(payload.header) || payload.header.start !== `${input.year}0101` || payload.header.end !== `${input.year}1231` || payload.header.fill_value !== -999 ||
    payload.header.time_standard !== "LST" || !record(payload.header.api) || payload.header.api.name !== "POWER Monthly and Annual API" || !Array.isArray(payload.header.sources) || !payload.header.sources.includes("MERRA2") ||
    !Array.isArray(payload.messages) || payload.messages.length !== 0 || !record(payload.properties) || !record(payload.properties.parameter) || !record(payload.parameters)) return null;
  const p = payload.properties.parameter;
  for (const key of ["T2M", "T2M_MAX", "RH2M"]) {
    const meta = payload.parameters[key]; const series = p[key];
    if (!record(meta) || meta.units !== (key === "RH2M" ? "%" : "C") || !record(series) ||
      Object.keys(series).some(k => !new RegExp(`^${input.year}(?:0[1-9]|1[0-3])$`).test(k))) return null;
  }
  // YYYY13 is NASA's separate annual aggregate, never a thirteenth month or a monthly extreme.
  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${input.year}${String(i + 1).padStart(2, "0")}`;
    return { month: i + 1, temperatureC: (p.T2M as Record<string, unknown>)[key], maximumTemperatureC: (p.T2M_MAX as Record<string, unknown>)[key], relativeHumidityPct: (p.RH2M as Record<string, unknown>)[key] };
  });
  return parsePointObjectClimate({ version: CLIMATE_VERSION, status: "available", year: input.year, requestedPoint: [input.longitude, input.latitude], months,
    source: { sourceId: "NASA-POWER", endpoint: CLIMATE_ENDPOINT, referenceUrl: CLIMATE_REFERENCE, attribution: CLIMATE_ATTRIBUTION, dataset: "MERRA2", apiVersion: payload.header.api.version,
      timeStandard: "LST", observedStart: `${input.year}-01-01`, observedEnd: `${input.year}-12-31`, acquiredAt: input.acquiredAt, responseHash: input.responseHash, responseBytes: input.responseBytes }, proofLimit: CLIMATE_LIMIT });
}

/** One allowlisted, bounded public request. No retries, keys or older-year fallback. */
export async function acquirePointObjectClimate(input: Input): Promise<PointObjectClimate> {
  const year = (input.now ?? new Date()).getUTCFullYear() - 1;
  const unavailable = (reason: UnavailableReason): PointObjectClimate => ({ version: CLIMATE_VERSION, status: "unavailable", year, sourceId: "NASA-POWER", reason });
  const timeout = Math.min(4000, input.deadlineAtMs - Date.now());
  if (timeout <= 0) return unavailable("budget_exhausted");
  if (!Number.isInteger(year) || year < 1981 || year > 9998 || !Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180 || !Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90) return unavailable("invalid_response");
  const url = new URL(CLIMATE_ENDPOINT);
  for (const [key, value] of Object.entries({ parameters: "T2M,T2M_MAX,RH2M", community: "SB", longitude: String(input.longitude), latitude: String(input.latitude), format: "JSON", start: String(year), end: String(year) })) url.searchParams.set(key, value);
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "error", cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) { await response.body?.cancel(); return unavailable("http_error"); }
    if (!response.headers.get("content-type")?.includes("application/json")) { await response.body?.cancel(); return unavailable("invalid_response"); }
    if (Number(response.headers.get("content-length")) > 65536) { await response.body?.cancel(); return unavailable("response_too_large"); }
    reader = response.body?.getReader(); if (!reader) return unavailable("invalid_response");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 65536) { await reader.cancel(); return unavailable("response_too_large"); } chunks.push(part.value); }
    const body = Buffer.concat(chunks);
    let payload: unknown; try { payload = JSON.parse(body.toString("utf8")); } catch { return unavailable("invalid_response"); }
    return normalizeNasaPowerMonthly(payload, { ...input, year, acquiredAt: new Date().toISOString(), responseHash: createHash("sha256").update(body).digest("hex"), responseBytes: size }) ?? unavailable("invalid_response");
  } catch { return unavailable(controller.signal.aborted ? "timeout" : "network_error"); }
  finally { clearTimeout(timer); reader?.releaseLock(); }
}
