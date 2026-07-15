import { createHash } from "node:crypto";
import { publicDataCaveat } from "@/src/lib/external-data/public-source-catalog";
import {
  getRuntimeSourceEnvironment,
  isRuntimeSourcePackAllowed,
  runtimeSourcePackDemoId,
  runtimeSourcePackId,
  type RuntimeSourceObservation,
  type RuntimeSourcePackResponse
} from "@/src/lib/external-data/runtime-source-contract";
import { publicDemoBbox, publicDemoOverpassBbox, publicDemoPoint } from "@/src/lib/external-data/runtime-request-validation";
import {
  parseCopernicusStacPayload,
  parseNasaPowerPayload,
  parseOverpassCountPayload
} from "@/src/lib/external-data/runtime-source-parsers";

const NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point";
const COPERNICUS_STAC_URL = "https://stac.dataspace.copernicus.eu/v1/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const CONTACT_URL = "https://github.com/mmgolikov/geoai-mvp";
const maximumResponseBytes = 2_000_000;

type RuntimeCacheEntry = {
  expiresAt: number;
  staleUntil: number;
  value: RuntimeSourceObservation;
};

type RuntimeCircuit = {
  failures: number;
  openUntil: number;
};

type RuntimeState = {
  cache: Map<string, RuntimeCacheEntry>;
  circuits: Map<string, RuntimeCircuit>;
  inFlight: Map<string, Promise<RuntimeSourceObservation>>;
};

const globalRuntime = globalThis as typeof globalThis & { __geoAiRuntimeSourceState?: RuntimeState };
const runtimeState = globalRuntime.__geoAiRuntimeSourceState ?? {
  cache: new Map<string, RuntimeCacheEntry>(),
  circuits: new Map<string, RuntimeCircuit>(),
  inFlight: new Map<string, Promise<RuntimeSourceObservation>>()
};
runtimeState.inFlight ??= new Map<string, Promise<RuntimeSourceObservation>>();
globalRuntime.__geoAiRuntimeSourceState = runtimeState;

class UpstreamError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
  }
}

function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJsonResponse(response: Response) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumResponseBytes) {
    throw new UpstreamError("upstream_response_too_large");
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maximumResponseBytes) {
    throw new UpstreamError("upstream_response_too_large");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new UpstreamError("upstream_invalid_json");
  }
}

function retryDelay(response: Response, attempt: number) {
  const header = response.headers.get("retry-after");
  const seconds = header && /^\d+$/.test(header) ? Number(header) : null;
  return Math.min(seconds === null ? 250 * (attempt + 1) : seconds * 1000, 2_000);
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number, maximumAttempts = 2) {
  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      if (attempt + 1 < maximumAttempts) continue;
      throw new UpstreamError("upstream_timeout_or_network_error");
    }

    if (response.ok) return readJsonResponse(response);
    const retryable = response.status === 429 || response.status >= 500;
    if (attempt + 1 < maximumAttempts && retryable) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
      continue;
    }
    throw new UpstreamError(`upstream_http_${response.status}`);
  }
  throw new UpstreamError("upstream_unavailable");
}

function cachedObservation(entry: RuntimeCacheEntry, servedAt: string, fallbackReason: string | null = null) {
  return {
    ...entry.value,
    mode: "cached" as const,
    servedAt,
    fallbackReason
  };
}

function unavailableObservation(
  source: Omit<RuntimeSourceObservation, "mode" | "retrievedAt" | "servedAt" | "sourceObservedAt" | "fallbackReason" | "payload">,
  servedAt: string,
  fallbackReason: string
): RuntimeSourceObservation {
  return {
    ...source,
    mode: "unavailable",
    retrievedAt: null,
    servedAt,
    sourceObservedAt: null,
    fallbackReason,
    payload: null
  };
}

async function executeControlledSource(
  sourceId: string,
  queryFingerprint: string,
  cacheMs: number,
  staleMs: number,
  load: () => Promise<RuntimeSourceObservation>,
  unavailableBase: Omit<RuntimeSourceObservation, "mode" | "retrievedAt" | "servedAt" | "sourceObservedAt" | "fallbackReason" | "payload">
) {
  const now = Date.now();
  const servedAt = new Date(now).toISOString();
  const cacheKey = `${sourceId}:${queryFingerprint}`;
  const cached = runtimeState.cache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cachedObservation(cached, servedAt);

  const circuit = runtimeState.circuits.get(sourceId);
  if (circuit && circuit.openUntil > now) {
    if (cached && cached.staleUntil > now) return cachedObservation(cached, servedAt, "stale_cache_circuit_open");
    return unavailableObservation(unavailableBase, servedAt, "provider_circuit_open");
  }

  const activeRequest = runtimeState.inFlight.get(cacheKey);
  if (activeRequest) return activeRequest.then((observation) => ({ ...observation, servedAt }));

  const request = (async () => {
    try {
      const observation = await load();
      runtimeState.cache.set(cacheKey, {
        expiresAt: now + cacheMs,
        staleUntil: now + staleMs,
        value: observation
      });
      runtimeState.circuits.delete(sourceId);
      return observation;
    } catch (error) {
      const failures = (circuit?.failures ?? 0) + 1;
      runtimeState.circuits.set(sourceId, {
        failures,
        openUntil: failures >= 3 ? now + 300_000 : now
      });
      if (cached && cached.staleUntil > now) return cachedObservation(cached, servedAt, "stale_cache_after_provider_failure");
      return unavailableObservation(
        unavailableBase,
        servedAt,
        error instanceof UpstreamError
          ? error.reason
          : error instanceof Error && error.message === "upstream_schema_mismatch"
            ? "upstream_schema_mismatch"
            : "upstream_contract_error"
      );
    }
  })();
  runtimeState.inFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    runtimeState.inFlight.delete(cacheKey);
  }
}

function utcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function compactDate(value: string) {
  return value.replace(/-/g, "");
}

async function getNasaPowerObservation(now: Date): Promise<RuntimeSourceObservation> {
  const period = { from: "2024-01-01", to: "2024-01-07" };
  const params = new URLSearchParams({
    parameters: "T2M,ALLSKY_SFC_SW_DWN",
    community: "RE",
    longitude: String(publicDemoPoint.longitude),
    latitude: String(publicDemoPoint.latitude),
    start: compactDate(period.from),
    end: compactDate(period.to),
    format: "JSON",
    "time-standard": "UTC"
  });
  const queryFingerprint = fingerprint(`${NASA_POWER_URL}?${params.toString()}`);
  const accessedOn = utcDate(now);
  const base = {
    sourceId: "nasa-power-solar-energy",
    queryFingerprint,
    coverage: "Fixed public demo point: Downtown Dubai; coarse model/reanalysis grid context",
    licenseName: "NASA POWER Referencing Guide",
    licenseUrl: "https://power.larc.nasa.gov/docs/referencing/",
    attribution: `Data obtained from NASA Langley Research Center's Prediction Of Worldwide Energy Resources (POWER) project; POWER Daily API, accessed ${accessedOn}.`,
    caveat: `Model/reanalysis grid estimate; not an on-site measurement or energy-yield certification. ${publicDataCaveat}`
  };

  return executeControlledSource(base.sourceId, queryFingerprint, 30 * 86_400_000, 37 * 86_400_000, async () => {
    const parsed = parseNasaPowerPayload(await fetchJson(`${NASA_POWER_URL}?${params.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": `GeoAI/preview (+${CONTACT_URL})` },
      cache: "no-store"
    }, 10_000));
    const retrievedAt = now.toISOString();
    return {
      ...base,
      attribution: `Data obtained from NASA Langley Research Center's Prediction Of Worldwide Energy Resources (POWER) project; POWER Daily API${parsed.providerVersion ? `, version ${parsed.providerVersion}` : ""}, accessed ${accessedOn}.`,
      mode: "live",
      retrievedAt,
      servedAt: retrievedAt,
      sourceObservedAt: period.to,
      fallbackReason: null,
      payload: {
        period,
        point: publicDemoPoint,
        timeStandard: "UTC",
        ...parsed,
        interpretation: "historical climate and solar screening context only"
      }
    };
  }, base);
}

async function getCopernicusObservation(now: Date): Promise<RuntimeSourceObservation> {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const from = new Date(to.getTime() - 13 * 86_400_000);
  const period = { from: utcDate(from), to: utcDate(to) };
  const bbox = [publicDemoBbox.west, publicDemoBbox.south, publicDemoBbox.east, publicDemoBbox.north].join(",");
  const params = new URLSearchParams({
    collections: "sentinel-2-l2a",
    bbox,
    datetime: `${period.from}T00:00:00Z/${period.to}T23:59:59Z`,
    limit: "3",
    sortby: "-properties.datetime",
    fields: "-geometry,-bbox,-assets"
  });
  const queryFingerprint = fingerprint(`${COPERNICUS_STAC_URL}?${params.toString()}`);
  const serviceInformationNotice = `Contains modified Copernicus Service information ${now.getUTCFullYear()}.`;
  const base = {
    sourceId: "copernicus-sentinel-metadata",
    queryFingerprint,
    coverage: "Fixed public demo AOI: bounded Downtown Dubai catalogue search",
    licenseName: "Copernicus Data Space Ecosystem terms and conditions",
    licenseUrl: "https://dataspace.copernicus.eu/terms-and-conditions",
    attribution: serviceInformationNotice,
    caveat: `Sentinel-2 L2A product availability metadata only; no imagery download, geometry, assets or site-condition analysis. ${publicDataCaveat}`
  };

  return executeControlledSource(base.sourceId, queryFingerprint, 3_600_000, 86_400_000, async () => {
    const parsed = parseCopernicusStacPayload(await fetchJson(`${COPERNICUS_STAC_URL}?${params.toString()}`, {
      headers: { Accept: "application/geo+json, application/json", "User-Agent": `GeoAI/preview (+${CONTACT_URL})` },
      cache: "no-store"
    }, 8_000));
    const retrievedAt = now.toISOString();
    const sceneYears = [...new Set(parsed.scenes
      .map((scene) => scene.datetime?.slice(0, 4) ?? null)
      .filter((year): year is string => Boolean(year && /^\d{4}$/.test(year))))];
    const sentinelDataNotice = sceneYears.length > 0
      ? `Contains modified Copernicus Sentinel data ${sceneYears.join(", ")}.`
      : null;
    return {
      ...base,
      attribution: [sentinelDataNotice, serviceInformationNotice].filter(Boolean).join(" "),
      mode: "live",
      retrievedAt,
      servedAt: retrievedAt,
      sourceObservedAt: parsed.scenes[0]?.datetime ?? null,
      fallbackReason: null,
      payload: {
        period,
        collection: "sentinel-2-l2a",
        returnedProducts: parsed.scenes.length,
        scenes: parsed.scenes,
        excludedFields: ["geometry", "bbox", "assets"],
        interpretation: "catalogue availability only; scene cloud metadata is not a site-specific condition"
      }
    };
  }, base);
}

async function getOverpassObservation(now: Date): Promise<RuntimeSourceObservation> {
  const bbox = `${publicDemoOverpassBbox.south},${publicDemoOverpassBbox.west},${publicDemoOverpassBbox.north},${publicDemoOverpassBbox.east}`;
  const query = `[out:json][timeout:8];nwr["amenity"](${bbox});out count;nwr["public_transport"](${bbox});out count;nwr["highway"](${bbox});out count;`;
  const queryFingerprint = fingerprint(`${OVERPASS_URL}:${query}`);
  const base = {
    sourceId: "osm-overpass-count-context",
    queryFingerprint,
    coverage: "Fixed public demo AOI: bounded Downtown Dubai count-only query",
    licenseName: "Open Database License (ODbL)",
    licenseUrl: "https://www.openstreetmap.org/copyright",
    attribution: "Data © OpenStreetMap contributors, available under ODbL 1.0.",
    caveat: `Community-mapped count context; coverage and completeness vary; not official cadastral, zoning, planning or transport data. ${publicDataCaveat}`
  };

  return executeControlledSource(base.sourceId, queryFingerprint, 1_800_000, 86_400_000, async () => {
    const parsed = parseOverpassCountPayload(await fetchJson(OVERPASS_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": `GeoAI/preview (+${CONTACT_URL})`
      },
      body: new URLSearchParams({ data: query }).toString(),
      cache: "no-store"
    }, 10_000, 1));
    const retrievedAt = now.toISOString();
    return {
      ...base,
      mode: "live",
      retrievedAt,
      servedAt: retrievedAt,
      sourceObservedAt: parsed.sourceObservedAt,
      fallbackReason: null,
      payload: {
        amenityElements: parsed.amenityElements,
        publicTransportElements: parsed.publicTransportElements,
        highwayElements: parsed.highwayElements,
        responseMode: "count_only",
        geometryReturned: false,
        interpretation: "mutable community-mapped element counts; not authoritative feature inventories"
      }
    };
  }, base);
}

export async function getRuntimeSourcePack(now = new Date()): Promise<RuntimeSourcePackResponse> {
  const environment = getRuntimeSourceEnvironment();
  if (!isRuntimeSourcePackAllowed(environment)) {
    throw new Error("runtime_source_pack_disabled_in_production");
  }

  const sources = await Promise.all([
    getNasaPowerObservation(now),
    getCopernicusObservation(now),
    getOverpassObservation(now)
  ]);

  return {
    ok: sources.some((source) => source.mode === "live" || source.mode === "cached"),
    packId: runtimeSourcePackId,
    demoId: runtimeSourcePackDemoId,
    environment,
    requestedMode: runtimeSourcePackId,
    effectiveMode: "runtime_api_context",
    activationAllowed: true,
    scoreImpact: "none",
    persistence: "none",
    generatedAt: now.toISOString(),
    sources,
    caveat: publicDataCaveat
  };
}
