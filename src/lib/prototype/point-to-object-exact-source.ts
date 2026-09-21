import "server-only";
import { unstable_cache } from "next/cache";
import { randomUUID } from "node:crypto";
import { semanticHash } from "../point-to-object/hash";
import { sourceElementFootprint } from "./point-to-object-source-geometry";

type Element = Record<string, unknown>;
type Receipt = { element: Element; acquiredAt: string; observedAt: string | null };
const cache = new Map<string, Receipt>();
const TTL_MS = 5 * 60_000;
const record = (value: unknown): value is Element => !!value && typeof value === "object" && !Array.isArray(value);
const SHARED_TTL_MS = 15 * 60_000;
const SHARED_VERSION = "geoai-exact-find-public-v1";
const LOCAL_INSTANCE = randomUUID();
export type SharedExactSourceSnapshot = Receipt & { sourceFeatureId: string; expiresAt: string; integrityHash: string };
export class ExactFindSnapshotConflictError extends Error {
  constructor() { super("The public object changed during the current snapshot window. Retry after the snapshot expires."); }
}

function validSharedSnapshot(value: unknown, id: string, now: number): value is SharedExactSourceSnapshot {
  if (!record(value) || Object.keys(value).sort().join(",") !== "acquiredAt,element,expiresAt,integrityHash,observedAt,sourceFeatureId" ||
      value.sourceFeatureId !== id || !record(value.element) || `${value.element.type}/${value.element.id}` !== id ||
      typeof value.acquiredAt !== "string" || typeof value.expiresAt !== "string" ||
      (value.observedAt !== null && (typeof value.observedAt !== "string" || !Number.isFinite(Date.parse(value.observedAt))))) return false;
  const acquired = Date.parse(value.acquiredAt), expires = Date.parse(value.expiresAt);
  if (!Number.isFinite(acquired) || expires !== acquired + SHARED_TTL_MS || acquired > now || now >= expires) return false;
  const serialized = JSON.stringify(value.element);
  if (Buffer.byteLength(serialized) > 100_000 || /"(?:password|authorization|apiKey|accessToken|refreshToken|userId|accountId|projectId|question|prompt|query|user|uid)"\s*:/i.test(serialized) ||
      Object.keys(value.element).some(key => !["type","id","lat","lon","center","bounds","geometry","members","nodes","tags"].includes(key))) return false;
  const adapted = exactSourcePlacePayload(value.element, "en");
  if (typeof adapted.lon !== "number" || !Number.isFinite(adapted.lon) || Math.abs(adapted.lon) > 180 ||
      typeof adapted.lat !== "number" || !Number.isFinite(adapted.lat) || Math.abs(adapted.lat) > 90) return false;
  const { integrityHash, ...content } = value;
  return integrityHash === semanticHash(content);
}

async function sharedSlot(id: string, window: number, fill: SharedExactSourceSnapshot | null) {
  const deployment = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || `${process.env.VERCEL_GIT_COMMIT_SHA || "local"}:${LOCAL_INSTANCE}`;
  // One callback factory is used by both routes. A lookup miss never stores null
  // and never acquires a source. Explicit original-source expiry wins over Next stale values.
  return unstable_cache(async () => {
    if (!fill) throw new Error("Exact public snapshot cache miss");
    return fill;
  }, [SHARED_VERSION, deployment, id, String(window)], { revalidate: SHARED_TTL_MS / 1000 })();
}

/** Called only with the validated server Find response, never client geometry. */
export async function shareExactFindElements(payload: unknown, acquiredAt: string, ids: readonly string[], now = Date.now()): Promise<void> {
  if (!record(payload) || !Array.isArray(payload.elements) || payload.remark || !Number.isFinite(Date.parse(acquiredAt)) ||
      Buffer.byteLength(JSON.stringify(payload)) > 512 * 1024) return;
  const allowed = new Set(ids.slice(0, 20));
  const observedAt = record(payload.osm3s) && typeof payload.osm3s.timestamp_osm_base === "string" ? payload.osm3s.timestamp_osm_base : null;
  await Promise.all(payload.elements.slice(0, 81).map(async element => {
    if (!record(element)) return;
    const id = `${element.type}/${element.id}`;
    if (!allowed.has(id) || !/^(node|way|relation)\/[1-9]\d{0,19}$/.test(id)) return;
    const content = { element: structuredClone(element), acquiredAt, observedAt, sourceFeatureId: id,
      expiresAt: new Date(Date.parse(acquiredAt) + SHARED_TTL_MS).toISOString() };
    const snapshot = { ...content, integrityHash: semanticHash(content) };
    if (!validSharedSnapshot(snapshot, id, now)) return;
    const current = await readSharedExactFindSnapshot(id, now);
    const matches = (value: SharedExactSourceSnapshot) => semanticHash(value.element) === semanticHash(element) && value.observedAt === observedAt;
    if (current && !matches(current)) throw new ExactFindSnapshotConflictError();
    // Identical reacquisition retains the original snapshot and original clock.
    if (current) return;
    const stored: unknown = await sharedSlot(id, Math.floor(Date.parse(acquiredAt) / SHARED_TTL_MS), snapshot).catch(() => null);
    // A concurrent publication may have filled the same slot first. Do not return
    // different Find geometry while Analyse would read that earlier snapshot.
    if (validSharedSnapshot(stored, id, now) && !matches(stored)) throw new ExactFindSnapshotConflictError();
  }));
}

/** Must run before entering another unstable_cache: Next bypasses nested cache reads. */
export async function readSharedExactFindSnapshot(id: string, now = Date.now()): Promise<SharedExactSourceSnapshot | null> {
  if (!/^(node|way|relation)\/[1-9]\d{0,19}$/.test(id)) return null;
  const currentWindow = Math.floor(now / SHARED_TTL_MS);
  for (const window of [currentWindow, currentWindow - 1]) {
    const snapshot: unknown = await sharedSlot(id, window, null).catch(() => null);
    if (validSharedSnapshot(snapshot, id, now)) return structuredClone(snapshot);
  }
  return null;
}

export function rememberExactFindElements(payload: unknown, acquiredAt: string, now = Date.now()): void {
  if (!record(payload) || !Array.isArray(payload.elements) || payload.remark || !Number.isFinite(Date.parse(acquiredAt)) || now-Date.parse(acquiredAt)>TTL_MS) return;
  const observedAt = record(payload.osm3s) && typeof payload.osm3s.timestamp_osm_base === "string" ? payload.osm3s.timestamp_osm_base : null;
  for (const element of payload.elements.slice(0,81)) {
    if (!record(element) || !/^(node|way|relation)$/.test(String(element.type)) || !/^[1-9]\d{0,19}$/.test(String(element.id)) || JSON.stringify(element).length>100_000) continue;
    const key = `${element.type}/${element.id}`;
    cache.delete(key);
    if (cache.size>=160) cache.delete(cache.keys().next().value!);
    cache.set(key, {element:structuredClone(element),acquiredAt,observedAt});
  }
}

/** Cache miss/cold start performs one exact source lookup, never reverse search.
 * Callers still enforce identity, geometry/anchor and market checks. */
export async function readExactSourceElement(id: string, loader: (query:string)=>Promise<unknown>, now=Date.now(), shared?: SharedExactSourceSnapshot | null): Promise<Receipt> {
  if (!/^(node|way|relation)\/[1-9]\d{0,19}$/.test(id)) throw new Error("Invalid exact OSM identity");
  if (shared && validSharedSnapshot(shared, id, now)) return { element: structuredClone(shared.element), acquiredAt: shared.acquiredAt, observedAt: shared.observedAt };
  const existing=cache.get(id);
  if (existing && now-Date.parse(existing.acquiredAt)>=0 && now-Date.parse(existing.acquiredAt)<TTL_MS) return structuredClone(existing);
  cache.delete(id);
  const [type,number]=id.split("/");
  const payload=await loader(`[out:json][timeout:4][maxsize:33554432];${type}(${number});out body geom 1;`);
  if (!record(payload) || payload.remark || !Array.isArray(payload.elements) || payload.elements.length!==1) throw new Error("Exact OSM source unavailable");
  const element=payload.elements[0];
  if (!record(element) || `${element.type}/${element.id}`!==id) throw new Error("Exact OSM source identity mismatch");
  rememberExactFindElements(payload,new Date(now).toISOString(),now);
  const receipt=cache.get(id);
  if (!receipt) throw new Error("Exact OSM source exceeds bounded record budget");
  return structuredClone(receipt);
}

/** Adapter to the existing sanitizer; no country, address, height or footprint is invented. */
export function exactSourcePlacePayload(element: Element, locale: string): Element {
  const tags=record(element.tags)?element.tags:{};
  const geometry=sourceElementFootprint(element);
  const bounds=record(element.bounds)?element.bounds:null;
  const coordinates=geometry ? (geometry.type==="Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2)) : [];
  const xs=coordinates.map(point=>point[0]), ys=coordinates.map(point=>point[1]);
  const bbox=coordinates.length ? [Math.min(...ys),Math.max(...ys),Math.min(...xs),Math.max(...xs)] : bounds ? [bounds.minlat,bounds.maxlat,bounds.minlon,bounds.maxlon] : null;
  const longitude=element.type==="node"?element.lon:bbox? (Number(bbox[2])+Number(bbox[3]))/2 : null;
  const latitude=element.type==="node"?element.lat:bbox? (Number(bbox[0])+Number(bbox[1]))/2 : null;
  const category=["building","landuse","amenity","office","shop","tourism"].find(key=>typeof tags[key]==="string")??null;
  return {osm_type:element.type,osm_id:element.id,lon:longitude,lat:latitude,
    name:tags[`name:${locale.split(",")[0]}`]??tags.name??tags["name:en"]??null,
    category,type:category?tags[category]:null,extratags:tags,address:{},namedetails:{},
    boundingbox:bbox,geojson:geometry ?? (element.type==="node"?{type:"Point",coordinates:[longitude,latitude]}:null)};
}
