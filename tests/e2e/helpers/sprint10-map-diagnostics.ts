import type { Locator, Page, Request, Response } from "@playwright/test";

const HOST = "tiles.openfreemap.org";
const ANNOTATION = "find-comparison-map-failure";
const metricKeys = ["width", "height", "pixelWidth", "pixelHeight", "visibleWidth", "visibleHeight", "zoom", "pitch",
  "layers", "basemapLayers", "rasterLayers", "basemapFeatures", "nativeSources", "nativeSourcesLoaded", "geoaiSources", "geoaiSourcesLoaded"] as const;
const flagKeys = ["styleLoaded", "tilesLoaded", "mapLoaded", "moving"] as const;
type MapMetrics = Record<typeof metricKeys[number], number> & Record<typeof flagKeys[number], boolean>;
type Network = { host: typeof HOST; requests: number; responses: number; failed: number; pending: number;
  statusCounts: { status: number; count: number }[] };
export type ComparisonMapDiagnostic = { schemaVersion: "geoai.find-map-diagnostic.v1"; stage: "find_compare_basemap" | "find_compare_geometry";
  failureKind: "basemap_assertion" | "geometry_probe_timeout" | "geometry_probe_error";
  readStatus: "ok" | "unavailable" | "timeout"; map: MapMetrics | null;
  networkScope: "page_map_host_since_comparison_open"; network: Network };

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function exact(value: Record<string, unknown>, keys: readonly string[]) { return Object.keys(value).sort().join("|") === [...keys].sort().join("|"); }
function bounded(value: unknown, max = 100_000) { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max; }
export function parseComparisonMapDiagnostic(value: unknown): ComparisonMapDiagnostic {
  const fail = () => { throw new Error("Unsafe or malformed comparison map diagnostic."); };
  if (!record(value) || !exact(value, ["schemaVersion", "stage", "failureKind", "readStatus", "map", "networkScope", "network"]) ||
      value.schemaVersion !== "geoai.find-map-diagnostic.v1" ||
      !(value.stage === "find_compare_basemap" && value.failureKind === "basemap_assertion" ||
        value.stage === "find_compare_geometry" && ["geometry_probe_timeout", "geometry_probe_error"].includes(String(value.failureKind))) ||
      !["ok", "unavailable", "timeout"].includes(String(value.readStatus)) || value.networkScope !== "page_map_host_since_comparison_open") return fail();
  if (value.readStatus === "ok") {
    if (!record(value.map) || !exact(value.map, [...metricKeys, ...flagKeys])) return fail();
    const map = value.map;
    if (metricKeys.some((key) => !bounded(map[key], key === "zoom" ? 24 : key === "pitch" ? 90 : 100_000)) ||
        flagKeys.some((key) => typeof map[key] !== "boolean") || metricKeys.filter((key) => key !== "zoom" && key !== "pitch").some((key) => !Number.isInteger(map[key]))) return fail();
  } else if (value.map !== null) return fail();
  const network = value.network;
  if (!record(network) || !exact(network, ["host", "requests", "responses", "failed", "pending", "statusCounts"]) || network.host !== HOST ||
      ["requests", "responses", "failed", "pending"].some((key) => !bounded(network[key]) || !Number.isInteger(network[key])) ||
      !Array.isArray(network.statusCounts) || network.statusCounts.length > 32) return fail();
  const statuses = new Set<number>();
  for (const item of network.statusCounts) {
    if (!record(item) || !exact(item, ["status", "count"]) || !Number.isInteger(item.status) || !bounded(item.status, 599) || Number(item.status) < 100 ||
        !Number.isInteger(item.count) || !bounded(item.count) || statuses.has(Number(item.status))) return fail();
    statuses.add(Number(item.status));
  }
  return value as ComparisonMapDiagnostic;
}

/** No route interception, body/header reads, URL retention, or network calls. */
export function observeComparisonMapNetwork(page: Page) {
  const active = new Set<Request>();
  const statuses = new Map<number, number>();
  let requests = 0, responses = 0, failed = 0;
  const matches = (request: Request) => { try { const url = new URL(request.url()); return url.protocol === "https:" && url.hostname === HOST; } catch { return false; } };
  const onRequest = (request: Request) => { if (matches(request)) { requests += 1; active.add(request); } };
  const onResponse = (response: Response) => { if (active.has(response.request())) { responses += 1; const status = response.status(); statuses.set(status, (statuses.get(status) ?? 0) + 1); } };
  const onFinished = (request: Request) => { active.delete(request); };
  const onFailed = (request: Request) => { if (active.delete(request)) failed += 1; };
  page.on("request", onRequest); page.on("response", onResponse); page.on("requestfinished", onFinished); page.on("requestfailed", onFailed);
  return {
    snapshot: (): Network => ({ host: HOST, requests, responses, failed, pending: active.size,
      statusCounts: [...statuses].sort(([a], [b]) => a - b).map(([status, count]) => ({ status, count })) }),
    dispose() { page.off("request", onRequest); page.off("response", onResponse); page.off("requestfinished", onFinished); page.off("requestfailed", onFailed); }
  };
}

export async function readComparisonMapDiagnostic(container: Locator, network: Network): Promise<ComparisonMapDiagnostic> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = Symbol("timeout");
  try {
    const map = await Promise.race([container.evaluate((element): MapMetrics | null => {
      type Fiber = { memoizedState: { memoizedState: unknown; next: unknown } | null; return: Fiber | null };
      const key = Object.getOwnPropertyNames(element).find((name) => name.startsWith("__reactFiber$"));
      let fiber = key ? (element as unknown as Record<string, Fiber>)[key] : null;
      while (fiber) {
        let hook = fiber.memoizedState;
        while (hook) {
          const map = (hook.memoizedState as { current?: import("maplibre-gl").Map } | null)?.current;
          if (map && typeof map.queryRenderedFeatures === "function" && typeof map.getSource === "function") {
            const style = map.getStyle() ?? { sources: {}, layers: [] };
            const layers = style.layers ?? [];
            const basemap = layers.filter((layer) => "source" in layer && !String(layer.source).startsWith("geoai-") && (layer.type === "line" || layer.type === "fill"));
            const sources = Object.keys(style.sources ?? {});
            const native = sources.filter((id) => !id.startsWith("geoai-"));
            const geoai = sources.filter((id) => id.startsWith("geoai-"));
            const canvas = map.getCanvas(), box = canvas.getBoundingClientRect();
            return { width: canvas.clientWidth, height: canvas.clientHeight, pixelWidth: canvas.width, pixelHeight: canvas.height,
              visibleWidth: Math.round(Math.max(0, Math.min(box.right, innerWidth) - Math.max(box.left, 0))),
              visibleHeight: Math.round(Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(box.top, 0))),
              zoom: map.getZoom(), pitch: map.getPitch(), layers: layers.length, basemapLayers: basemap.length,
              rasterLayers: layers.filter((layer) => layer.type === "raster").length,
              basemapFeatures: basemap.length ? map.queryRenderedFeatures(undefined, { layers: basemap.map((layer) => layer.id) }).length : 0,
              nativeSources: native.length, nativeSourcesLoaded: native.filter((id) => map.isSourceLoaded(id)).length,
              geoaiSources: geoai.length, geoaiSourcesLoaded: geoai.filter((id) => map.isSourceLoaded(id)).length,
              styleLoaded: map.isStyleLoaded() === true, tilesLoaded: map.areTilesLoaded(), mapLoaded: map.loaded(), moving: map.isMoving() };
          }
          hook = hook.next as typeof hook;
        }
        fiber = fiber.return;
      }
      return null;
    }).catch(() => null), new Promise<typeof timedOut>((resolve) => { timer = setTimeout(() => resolve(timedOut), 2_000); })]);
    return parseComparisonMapDiagnostic({ schemaVersion: "geoai.find-map-diagnostic.v1", stage: "find_compare_basemap", failureKind: "basemap_assertion",
      readStatus: map === timedOut ? "timeout" : map ? "ok" : "unavailable", map: map === timedOut ? null : map,
      networkScope: "page_map_host_since_comparison_open", network });
  } finally { if (timer) clearTimeout(timer); }
}

export class ComparisonGeometryProbeTimeout extends Error {
  constructor() { super("Comparison geometry probe exceeded 5000ms; this is not evidence of an empty basemap."); }
}
export async function withComparisonGeometryDeadline<T>(read: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([read, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ComparisonGeometryProbeTimeout()), 5_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

export function comparisonMapDiagnosticsFromReport(report: unknown): ComparisonMapDiagnostic[] {
  const found: ComparisonMapDiagnostic[] = [];
  let visited = 0;
  function visit(value: unknown, depth = 0) {
    if (++visited > 100_000 || depth > 50) throw new Error("Comparison diagnostic report exceeds its traversal bound.");
    if (Array.isArray(value)) { for (const item of value) visit(item, depth + 1); }
    else if (record(value)) {
      if (value.type === ANNOTATION) {
        if (typeof value.description !== "string" || value.description.length > 4096 || found.length >= 1) throw new Error("Comparison map diagnostic annotation is malformed or duplicated.");
        found.push(parseComparisonMapDiagnostic(JSON.parse(value.description)));
      } else for (const item of Object.values(value)) visit(item, depth + 1);
    }
  }
  visit(report);
  return found;
}
