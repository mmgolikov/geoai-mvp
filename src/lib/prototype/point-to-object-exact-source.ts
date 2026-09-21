import "server-only";
import { sourceElementFootprint } from "./point-to-object-source-geometry";

type Element = Record<string, unknown>;
type Receipt = { element: Element; acquiredAt: string; observedAt: string | null };
const cache = new Map<string, Receipt>();
const TTL_MS = 5 * 60_000;
const record = (value: unknown): value is Element => !!value && typeof value === "object" && !Array.isArray(value);

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
export async function readExactSourceElement(id: string, loader: (query:string)=>Promise<unknown>, now=Date.now()): Promise<Receipt> {
  if (!/^(node|way|relation)\/[1-9]\d{0,19}$/.test(id)) throw new Error("Invalid exact OSM identity");
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
