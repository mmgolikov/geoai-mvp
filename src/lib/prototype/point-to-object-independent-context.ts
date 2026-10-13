import { semanticHash } from "../point-to-object/hash";

export const OVERTURE_SNAPSHOT_HASH = "f55ad27098707b5a6efd1ee6d5bd7d8373cff9bd1eddd656207cf70cb15fe67d" as const;
export const OVERTURE_SNAPSHOT_RELEASE = "2026-09-23.1" as const;
export const OVERTURE_LICENSE_PATH = "/data/d2-overture/LICENSES.json" as const;
export const INDEPENDENT_CONTEXT_VERSION = "POINT_OBJECT_INDEPENDENT_CONTEXT_V1" as const;
export const INDEPENDENT_CASES = [
  { caseId: "U1", sourceFeatureId: "way/254666300", anchor: [55.280154550000006, 25.22041245] as [number, number] },
  { caseId: "U2", sourceFeatureId: "way/393391114", anchor: [55.2823691, 25.21764615] as [number, number] },
  { caseId: "U3", sourceFeatureId: "create-aoi-1791308131017", anchor: [55.2829004147909, 25.21870336602228] as [number, number] }
] as const;
export const INDEPENDENT_U3_POLYGON: [number, number][][] = [[[55.282050183926145,25.219612876671434],[55.28399124484818,25.21891603284108],[55.28377557141195,25.217912570712187],[55.28192694196176,25.218302806968055],[55.282050183926145,25.219612876671434]]];
export type IndependentPlaceGroup = "healthcare" | "education" | "daily_services" | "transport" | "hospitality" | "business" | "civic_culture" | "other_service";
export type IndependentPlaceSource = {
  dataset: string; provider: string; record_id: string | null; resource: string;
  property: string; version: string | null; update_time: string | null;
  license: "CDLA-Permissive-2.0"; confidence: number | null; between: null;
};
export type IndependentPlace = {
  id: string; name: string; coordinates: [number, number];
  taxonomy: { primary: string; hierarchy: string[] }; basic_category: string;
  group: IndependentPlaceGroup; confidence: number;
  sources: IndependentPlaceSource[];
  address: string | null; sourceReportedOperatingStatus: string | null;
  currentOperation: "unknown"; capacity: "unknown"; observationDate: null;
  providerUpdatedAt: string | null;
  distanceM: number; distanceMethod: "haversine_to_mapped_place_point";
  relation: "point_radius" | "outside_aoi" | "inside_aoi";
  evidenceRef: string;
};
export type IndependentPointObjectContext = {
  version: typeof INDEPENDENT_CONTEXT_VERSION;
  status: "available" | "unsupported_scope" | "source_unavailable";
  dataset: "Overture Places"; release: typeof OVERTURE_SNAPSHOT_RELEASE;
  snapshotHash: typeof OVERTURE_SNAPSHOT_HASH;
  subjectId: string; anchor: [number, number];
  caseId: "U1" | "U2" | "U3" | null;
  scope: "point_radius" | "aoi_interior_and_separate_surroundings";
  radiusM: 400; geometryHash: string | null;
  sampleSize: number | null; interiorSampleSize: number | null;
  returnedLimit: 20; places: IndependentPlace[];
  completeInventory: false; observationDate: null; fetchedAt: null;
  acquisitionStartedAt: "2026-10-13T11:54:17Z";
  cacheServedAt: string;
  sourceMode: "admitted_bundled_snapshot_not_live";
  officialStatus: "open_context_not_official";
  licenceId: "CDLA-Permissive-2.0"; licencePath: typeof OVERTURE_LICENSE_PATH;
  attribution: "Overture Maps Foundation; data from Meta, Microsoft and PinMeTo";
  deduplication: "source_ids_only_no_cross_source_merge";
  spatialCoverage: {
    acquisitionExtent: [55.276, 25.2139, 55.2866, 25.2241];
    state: "full_circle_within_acquisition_extent" | "partial_circle_clipped_by_acquisition_extent" | "unsupported_scope";
    easternClipApproxM: 0 | 27.83 | null;
    method: "independent_admission_extent_check_not_inventory";
  };
};

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 200) => typeof v === "string" && v.length > 0 && v.length <= max && !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(v);
const coordinate = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && Number.isFinite(v[0]) && Math.abs(v[0]) <= 180 && typeof v[1] === "number" && Number.isFinite(v[1]) && Math.abs(v[1]) <= 90;
const date = (v: unknown) => v === null || typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));

export function independentDistanceM(a: [number, number], b: [number, number]): number {
  const rad = (n: number) => n * Math.PI / 180;
  const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 6_371_008.8 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}

export function independentPlaceGroup(taxonomy: string): IndependentPlaceGroup {
  if (/pharmacy|health_care|hospital|clinic|dentistry/.test(taxonomy)) return "healthcare";
  if (/school|education|college|university/.test(taxonomy)) return "education";
  if (/train_station|bus_station|transit|transportation/.test(taxonomy)) return "transport";
  if (/hotel|lodging|hostel/.test(taxonomy)) return "hospitality";
  if (/museum|gallery|embassy|government|worship|historic/.test(taxonomy)) return "civic_culture";
  if (/store|restaurant|cafe|coffee|laundromat|bank|barber/.test(taxonomy)) return "daily_services";
  if (/b2b|business|office|real_estate|consult|marketing|software/.test(taxonomy)) return "business";
  return "other_service";
}

function inside(point: [number, number], polygon: [number, number][][]) {
  const ring = polygon[0];
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if ((ring[i][1] > point[1]) !== (ring[j][1] > point[1]) && point[0] < (ring[j][0] - ring[i][0]) * (point[1] - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) result = !result;
  }
  return result;
}

/** Admission is by exact known identity/anchor, never nearest-case substitution. */
export function independentCaseBinding(subjectId: string, anchor: [number, number], polygon?: [number, number][][]) {
  if (polygon) return semanticHash(polygon) === semanticHash(INDEPENDENT_U3_POLYGON) && independentDistanceM(anchor, INDEPENDENT_CASES[2].anchor) <= 1 ? INDEPENDENT_CASES[2] : null;
  return INDEPENDENT_CASES.slice(0, 2).find(c => c.sourceFeatureId === subjectId && independentDistanceM(anchor, c.anchor) <= 1) ?? null;
}

export function buildIndependentContext(data: unknown, subjectId: string, anchor: [number, number], cacheServedAt: string, polygon?: [number, number][][]): IndependentPointObjectContext {
  const bound = independentCaseBinding(subjectId, anchor, polygon);
  const base: IndependentPointObjectContext = {
    version: INDEPENDENT_CONTEXT_VERSION, status: bound ? "source_unavailable" : "unsupported_scope", dataset: "Overture Places", release: OVERTURE_SNAPSHOT_RELEASE, snapshotHash: OVERTURE_SNAPSHOT_HASH, subjectId, anchor,
    caseId: bound?.caseId ?? null, scope: polygon ? "aoi_interior_and_separate_surroundings" : "point_radius", radiusM: 400, geometryHash: polygon ? semanticHash(polygon) : null,
    sampleSize: null, interiorSampleSize: null, returnedLimit: 20, places: [], completeInventory: false, observationDate: null, fetchedAt: null,
    acquisitionStartedAt: "2026-10-13T11:54:17Z", cacheServedAt, sourceMode: "admitted_bundled_snapshot_not_live", officialStatus: "open_context_not_official", licenceId: "CDLA-Permissive-2.0", licencePath: OVERTURE_LICENSE_PATH,
    attribution: "Overture Maps Foundation; data from Meta, Microsoft and PinMeTo", deduplication: "source_ids_only_no_cross_source_merge",
    spatialCoverage: { acquisitionExtent: [55.276, 25.2139, 55.2866, 25.2241], state: !bound ? "unsupported_scope" : bound.caseId === "U3" ? "partial_circle_clipped_by_acquisition_extent" : "full_circle_within_acquisition_extent", easternClipApproxM: !bound ? null : bound.caseId === "U3" ? 27.83 : 0, method: "independent_admission_extent_check_not_inventory" }
  };
  if (!bound || !record(data) || data.type !== "FeatureCollection" || data.release !== OVERTURE_SNAPSHOT_RELEASE || !Array.isArray(data.features) || data.features.length !== 265) return base;
  const all: IndependentPlace[] = [];
  const ids = new Set<string>();
  for (const raw of data.features) {
    if (!record(raw) || !record(raw.properties) || !record(raw.geometry) || raw.geometry.type !== "Point" || !coordinate(raw.geometry.coordinates) || !text(raw.id, 36) || ids.has(String(raw.id))) return base;
    ids.add(String(raw.id));
    const p = raw.properties;
    if (!record(p.names) || !text(p.names.primary, 240) || !record(p.taxonomy) || !text(p.taxonomy.primary, 100) || !Array.isArray(p.taxonomy.hierarchy) || !p.taxonomy.hierarchy.every(t => text(t, 100)) || !text(p.basic_category, 100) || typeof p.confidence !== "number" || p.confidence < 0.8 || p.confidence > 1 || !Array.isArray(p.sources) || !p.sources.length) return base;
    const sources = p.sources as IndependentPlaceSource[];
    if (!sources.every(s => s.license === "CDLA-Permissive-2.0" && ["meta", "microsoft", "pinmeto", "overture"].includes(s.provider) && date(s.update_time))) return base;
    const distanceM = independentDistanceM(anchor, raw.geometry.coordinates);
    if (distanceM > 400) continue;
    const providerTimes = sources.filter(s => s.provider !== "overture" && s.update_time).map(s => s.update_time!).sort();
    all.push({ id: String(raw.id), name: p.names.primary as string, coordinates: raw.geometry.coordinates, taxonomy: { primary: p.taxonomy.primary as string, hierarchy: p.taxonomy.hierarchy as string[] }, basic_category: p.basic_category as string, group: independentPlaceGroup(p.taxonomy.primary as string), confidence: p.confidence,
      sources: structuredClone(sources), address: Array.isArray(p.addresses) && record(p.addresses[0]) && text(p.addresses[0].freeform, 300) ? p.addresses[0].freeform as string : null,
      sourceReportedOperatingStatus: typeof p.operating_status === "string" ? p.operating_status : null, currentOperation: "unknown", capacity: "unknown", observationDate: null, providerUpdatedAt: providerTimes.at(-1) ?? null,
      distanceM: Math.round(distanceM * 100) / 100, distanceMethod: "haversine_to_mapped_place_point", relation: polygon ? inside(raw.geometry.coordinates, polygon) ? "inside_aoi" : "outside_aoi" : "point_radius", evidenceRef: `EVD-OVERTURE-${String(raw.id).replaceAll("-", "").toUpperCase()}` });
  }
  const priority = (p: IndependentPlace) => p.taxonomy.primary === "pharmacy" ? 0 : p.group === "transport" ? 1 : p.group === "daily_services" ? 2 : 3;
  all.sort((a, b) => priority(a) - priority(b) || a.distanceM - b.distanceM || a.id.localeCompare(b.id));
  return { ...base, status: "available", sampleSize: all.length, interiorSampleSize: polygon ? all.filter(p => p.relation === "inside_aoi").length : null, places: all.slice(0, 20) };
}

export function parseIndependentContext(value: unknown, subjectId: string, anchor: [number, number] | null, polygon?: [number, number][][]): IndependentPointObjectContext | null {
  if (!record(value) || !anchor || JSON.stringify(value).length > 36_000 || value.version !== INDEPENDENT_CONTEXT_VERSION || value.subjectId !== subjectId || !coordinate(value.anchor) || value.anchor[0] !== anchor[0] || value.anchor[1] !== anchor[1] || value.dataset !== "Overture Places" || value.release !== OVERTURE_SNAPSHOT_RELEASE || value.snapshotHash !== OVERTURE_SNAPSHOT_HASH || value.radiusM !== 400 || value.returnedLimit !== 20 || value.completeInventory !== false || value.observationDate !== null || value.fetchedAt !== null || value.acquisitionStartedAt !== "2026-10-13T11:54:17Z" || !date(value.cacheServedAt) || value.cacheServedAt === null || Date.parse(String(value.cacheServedAt)) < Date.parse(String(value.acquisitionStartedAt)) || value.sourceMode !== "admitted_bundled_snapshot_not_live" || value.officialStatus !== "open_context_not_official" || value.licenceId !== "CDLA-Permissive-2.0" || value.licencePath !== OVERTURE_LICENSE_PATH || value.attribution !== "Overture Maps Foundation; data from Meta, Microsoft and PinMeTo" || value.deduplication !== "source_ids_only_no_cross_source_merge" || !Array.isArray(value.places) || value.places.length > 20) return null;
  if (!keys(value, ["version", "status", "dataset", "release", "snapshotHash", "subjectId", "anchor", "caseId", "scope", "radiusM", "geometryHash", "sampleSize", "interiorSampleSize", "returnedLimit", "places", "completeInventory", "observationDate", "fetchedAt", "acquisitionStartedAt", "cacheServedAt", "sourceMode", "officialStatus", "licenceId", "licencePath", "attribution", "deduplication", "spatialCoverage"])) return null;
  const binding = independentCaseBinding(subjectId, anchor, polygon);
  if (value.caseId !== (binding?.caseId ?? null) || value.scope !== (polygon ? "aoi_interior_and_separate_surroundings" : "point_radius") || value.geometryHash !== (polygon ? semanticHash(polygon) : null)) return null;
  const coverage = value.spatialCoverage;
  if (!record(coverage) || !keys(coverage, ["acquisitionExtent", "state", "easternClipApproxM", "method"]) || JSON.stringify(coverage.acquisitionExtent) !== "[55.276,25.2139,55.2866,25.2241]" || coverage.method !== "independent_admission_extent_check_not_inventory" || coverage.state !== (!binding ? "unsupported_scope" : binding.caseId === "U3" ? "partial_circle_clipped_by_acquisition_extent" : "full_circle_within_acquisition_extent") || coverage.easternClipApproxM !== (!binding ? null : binding.caseId === "U3" ? 27.83 : 0)) return null;
  if (!binding ? value.status !== "unsupported_scope" : !["available", "source_unavailable"].includes(String(value.status))) return null;
  if (value.status !== "available") return value.sampleSize === null && value.interiorSampleSize === null && value.places.length === 0 ? structuredClone(value) as IndependentPointObjectContext : null;
  if (!Number.isInteger(value.sampleSize) || Number(value.sampleSize) < value.places.length || Number(value.sampleSize) > 265 || (polygon ? !Number.isInteger(value.interiorSampleSize) || Number(value.interiorSampleSize) < 0 || Number(value.interiorSampleSize) > Number(value.sampleSize) : value.interiorSampleSize !== null)) return null;
  const ids = new Set<string>();
  for (const raw of value.places) {
    if (!record(raw) || !keys(raw, ["id", "name", "coordinates", "taxonomy", "basic_category", "group", "confidence", "sources", "address", "sourceReportedOperatingStatus", "currentOperation", "capacity", "observationDate", "providerUpdatedAt", "distanceM", "distanceMethod", "relation", "evidenceRef"]) || !text(raw.id, 36) || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(String(raw.id)) || ids.has(String(raw.id)) || !text(raw.name, 240) || !coordinate(raw.coordinates) || !record(raw.taxonomy) || !keys(raw.taxonomy, ["primary", "hierarchy"]) || !text(raw.taxonomy.primary, 100) || !Array.isArray(raw.taxonomy.hierarchy) || raw.taxonomy.hierarchy.length > 20 || !raw.taxonomy.hierarchy.every(t => text(t, 100)) || !text(raw.basic_category, 100) || raw.group !== independentPlaceGroup(String(raw.taxonomy.primary)) || typeof raw.confidence !== "number" || !Number.isFinite(raw.confidence) || raw.confidence < 0.8 || raw.confidence > 1 || raw.currentOperation !== "unknown" || raw.capacity !== "unknown" || raw.observationDate !== null || !date(raw.providerUpdatedAt) || !Array.isArray(raw.sources) || raw.sources.length < 1 || raw.sources.length > 8) return null;
    ids.add(String(raw.id));
    const sources = raw.sources as IndependentPlaceSource[];
    if (!sources.every(s => record(s) && keys(s, ["dataset", "provider", "record_id", "resource", "property", "version", "update_time", "license", "confidence", "between"]) && s.license === "CDLA-Permissive-2.0" && ["meta", "microsoft", "pinmeto", "overture"].includes(s.provider) && text(s.dataset, 100) && text(s.resource, 100) && typeof s.property === "string" && s.property.length <= 100 && (s.record_id === null || text(s.record_id, 100)) && (s.version === null || text(s.version, 100)) && date(s.update_time) && s.between === null && (s.confidence === null || typeof s.confidence === "number" && Number.isFinite(s.confidence) && s.confidence >= 0 && s.confidence <= 1))) return null;
    const physicalTimes = sources.filter(s => s.provider !== "overture" && s.update_time).map(s => s.update_time!).sort();
    if (!sources.some(s => s.provider !== "overture") || raw.providerUpdatedAt !== (physicalTimes.at(-1) ?? null) || (raw.address !== null && !text(raw.address, 300)) || (raw.sourceReportedOperatingStatus !== null && !text(raw.sourceReportedOperatingStatus, 100)) || typeof raw.distanceM !== "number" || !Number.isFinite(raw.distanceM) || raw.distanceM < 0 || raw.distanceM > 400 || Math.abs(raw.distanceM - independentDistanceM(anchor, raw.coordinates)) > 0.011 || raw.distanceMethod !== "haversine_to_mapped_place_point" || raw.relation !== (polygon ? inside(raw.coordinates, polygon) ? "inside_aoi" : "outside_aoi" : "point_radius") || raw.evidenceRef !== `EVD-OVERTURE-${String(raw.id).replaceAll("-", "").toUpperCase()}`) return null;
  }
  return structuredClone(value) as IndependentPointObjectContext;
}
