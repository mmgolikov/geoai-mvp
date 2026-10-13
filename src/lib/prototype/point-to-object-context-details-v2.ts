import type { MultiPolygon, Polygon } from "geojson";
import type { LivePointObjectEvidencePack } from "./point-to-object-live-evidence";
import type { PointObjectAreaContextResult } from "./point-to-object-area-context-contract";
import { validatePointObjectReplacementAoi } from "./point-to-object-map-replacement";
import type { LiveResolvedObjectContext } from "@/components/point-to-object/live-types";

/** An additive, source-scoped extension. V1 snapshots remain V1: absence of
 * this field never authorizes reconstructing geometry, dates or measurements. */
export const CONTEXT_DETAILS_VERSION = "POINT_OBJECT_CONTEXT_DETAILS_V2" as const;
export const CONTEXT_DETAILS_CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion." as const;
export type ContextSourceId = "osm_object" | "osm_surroundings" | "osm_aoi_interior" | "user_aoi";
export type ContextPhysicalMetricId = "footprint_area" | "perimeter" | "height" | "levels" | "aoi_area";
export type ContextMetricScope = "selected_record" | "user_aoi";
export type ContextPhysicalMetric = {
  id: ContextPhysicalMetricId;
  value: number | null;
  unit: "m²" | "m" | "levels";
  status: "derived" | "observed_tag" | "unknown";
  scope: ContextMetricScope;
  method: "local_equirectangular_wgs84_approximation" | "user_polygon_measurement" | "explicit_osm_tag" | "not_available";
  sourceId: ContextSourceId;
  evidenceRef: "EVD-OBJECT-METRICS" | "EVD-ALLOWED-FIELDS" | "EVD-AOI-GEOMETRY";
  /** A mapped footprint is not a cadastral parcel or permanent floor area. */
  coverage: "mapped_generalized_geometry" | "explicit_tag_only" | "user_drawn_boundary" | "unknown";
};
export type ContextSourceV2 = {
  id: ContextSourceId;
  name: "OpenStreetMap" | "User-drawn AOI";
  acquiredAt: string | null;
  observedAt: string | null;
  responseHash: string | null;
  scope: "selected_record" | "point_radius" | "aoi_interior" | "user_aoi";
  licenceId: "ODbL-1.0" | "user_provided";
  attribution: "© OpenStreetMap contributors" | "User-provided boundary";
  officialLiveStatus: "open_context_not_official" | "user_provided_not_official";
  coverage: "partial" | "unavailable" | "user_drawn";
};
export type PointObjectContextDetailsV2 = {
  version: typeof CONTEXT_DETAILS_VERSION;
  subjectId: string;
  anchor: [number, number];
  association: "selected_record" | "contains_point_not_selected" | "nearest_record_not_selected" | "user_aoi";
  sources: ContextSourceV2[];
  metrics: ContextPhysicalMetric[];
  /** Display geometry must be intact. Oversized/missing geometry stays null. */
  geometry: Polygon | MultiPolygon | null;
  geometryRole: "selected_mapped_footprint" | "user_aoi" | "unavailable";
  independentEnrichment: "not_admitted" | "separate_source_snapshot";
  semanticWarnings: Array<"outdoor_seating_not_green_space" | "temporary_structure_not_permanent_floor_area">;
  completeInventory: false;
  caveat: typeof CONTEXT_DETAILS_CAVEAT;
};

function boundedGeometry(value: Polygon | MultiPolygon | null): Polygon | MultiPolygon | null {
  if (!value) return null;
  const polygons = value.type === "Polygon" ? [value.coordinates] : value.coordinates;
  let count = 0;
  if (!polygons.length || polygons.length > 20) return null;
  for (const polygon of polygons) {
    if (!polygon.length || polygon.length > 20) return null;
    if (!validatePointObjectReplacementAoi({ type: "Polygon", coordinates: polygon }).valid) return null;
    for (const ring of polygon) {
      if (ring.length < 4 || (count += ring.length) > 250) return null;
      if (ring.some(p => p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)) return null;
      if (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) return null;
    }
  }
  return structuredClone(value);
}

/** Strict explicit units; a floor-count tag never manufactures height. */
export function contextExplicitTag(value: string | undefined, unit: "m" | "levels"): number | null {
  const text = value?.normalize("NFKC").trim() ?? "";
  const match = unit === "levels" ? /^(\d{1,3}(?:\.\d)?)$/.exec(text) : /^(\d{1,4}(?:\.\d{1,3})?)\s*(m|metres?|meters?|ft|feet)?$/i.exec(text);
  if (!match) return null;
  const converted = Number(match[1]) * (/^(ft|feet)$/i.test(match[2] ?? "") ? 0.3048 : 1);
  return Number.isFinite(converted) && converted > 0 && converted <= (unit === "levels" ? 200 : 1200) ? converted : null;
}

function metric(id: ContextPhysicalMetricId, value: number | null, unit: ContextPhysicalMetric["unit"], tag = false): ContextPhysicalMetric {
  return { id, value, unit, status: value === null ? "unknown" : tag ? "observed_tag" : "derived", scope: "selected_record", method: value === null ? "not_available" : tag ? "explicit_osm_tag" : "local_equirectangular_wgs84_approximation", sourceId: "osm_object", evidenceRef: tag ? "EVD-ALLOWED-FIELDS" : "EVD-OBJECT-METRICS", coverage: value === null ? "unknown" : tag ? "explicit_tag_only" : "mapped_generalized_geometry" };
}

export function contextDetailsFromEvidence(pack: LivePointObjectEvidencePack): PointObjectContextDetailsV2 {
  const exact = pack.resolution.coordinateAssociation === "trusted_open_map_identity";
  const tags = pack.selectedObject.tags;
  const building = tags["tag.building"] ?? tags.building;
  // Temporary shelter/outdoor seating may have tags but cannot establish
  // permanent building levels. There is intentionally no GFA calculation.
  const temporary = ["tent", "tents", "static_caravan", "carport", "roof"].includes(building ?? "") ||
    (tags["tag.leisure"] ?? tags.leisure) === "outdoor_seating";
  const geometry = exact ? boundedGeometry(pack.displayGeometry) : null;
  const metrics = [
    metric("footprint_area", exact ? pack.selectedObject.metrics?.footprintAreaSqM ?? null : null, "m²"),
    metric("perimeter", exact ? pack.selectedObject.metrics?.footprintPerimeterM ?? null : null, "m"),
    metric("height", exact ? contextExplicitTag(tags["tag.height"] ?? tags.height, "m") : null, "m", true),
    metric("levels", exact && building && !temporary ? contextExplicitTag(tags["tag.building:levels"] ?? tags["building:levels"], "levels") : null, "levels", true)
  ];
  return {
    version: CONTEXT_DETAILS_VERSION, subjectId: pack.selectedObject.sourceFeatureId,
    anchor: [pack.coordinates.longitude, pack.coordinates.latitude],
    association: exact ? "selected_record" : pack.resolution.coordinateAssociation === "open_map_geometry_contains_point" ? "contains_point_not_selected" : "nearest_record_not_selected",
    sources: [
      { id: "osm_object", name: "OpenStreetMap", acquiredAt: pack.source.acquiredAt, observedAt: pack.source.observedAt, responseHash: pack.source.sourceResponseHash, scope: "selected_record", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", officialLiveStatus: "open_context_not_official", coverage: "partial" },
      { id: "osm_surroundings", name: "OpenStreetMap", acquiredAt: pack.source.fabricAcquiredAt ?? null, observedAt: pack.source.fabricObservedAt, responseHash: pack.source.fabricResponseHash, scope: "point_radius", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", officialLiveStatus: "open_context_not_official", coverage: pack.geoContext.coverage === "available" ? "partial" : "unavailable" }
    ], metrics, geometry, geometryRole: geometry ? "selected_mapped_footprint" : "unavailable",
    independentEnrichment: "not_admitted", semanticWarnings: [
      ...((tags["tag.leisure"] ?? tags.leisure) === "outdoor_seating" ? ["outdoor_seating_not_green_space" as const] : []),
      ...(temporary ? ["temporary_structure_not_permanent_floor_area" as const] : [])
    ], completeInventory: false, caveat: CONTEXT_DETAILS_CAVEAT
  };
}

export function contextDetailsFromArea(area: PointObjectAreaContextResult): PointObjectContextDetailsV2 {
  const geometry = boundedGeometry({ type: "Polygon", coordinates: area.request.aoiCoordinates });
  return {
    version: CONTEXT_DETAILS_VERSION, subjectId: `aoi:${area.source.sourceResponseHash}`,
    anchor: [area.area.centroid.longitude, area.area.centroid.latitude], association: "user_aoi",
    sources: [
      { id: "user_aoi", name: "User-drawn AOI", acquiredAt: null, observedAt: null, responseHash: null, scope: "user_aoi", licenceId: "user_provided", attribution: "User-provided boundary", officialLiveStatus: "user_provided_not_official", coverage: "user_drawn" },
      { id: "osm_aoi_interior", name: "OpenStreetMap", acquiredAt: area.source.acquiredAt, observedAt: area.source.observedAt, responseHash: area.source.sourceResponseHash, scope: "aoi_interior", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", officialLiveStatus: "open_context_not_official", coverage: "partial" }
    ],
    metrics: [
      { id: "aoi_area", value: area.area.areaSqM, unit: "m²", status: "derived", scope: "user_aoi", method: "user_polygon_measurement", sourceId: "user_aoi", evidenceRef: "EVD-AOI-GEOMETRY", coverage: "user_drawn_boundary" },
      { id: "perimeter", value: area.area.perimeterM, unit: "m", status: "derived", scope: "user_aoi", method: "user_polygon_measurement", sourceId: "user_aoi", evidenceRef: "EVD-AOI-GEOMETRY", coverage: "user_drawn_boundary" }
    ], geometry, geometryRole: geometry ? "user_aoi" : "unavailable", independentEnrichment: "not_admitted", semanticWarnings: [
      ...(area.features.some(f => f.observedTags?.leisure === "outdoor_seating") ? ["outdoor_seating_not_green_space" as const] : []),
      ...(area.features.some(f => ["tent", "tents", "static_caravan", "carport", "roof"].includes(f.observedTags?.building ?? "")) ? ["temporary_structure_not_permanent_floor_area" as const] : [])
    ], completeInventory: false, caveat: CONTEXT_DETAILS_CAVEAT
  };
}

/** Saved V2 cannot donate another association/geometry/tag to a selected
 * subject. Public receipt comparison establishes consistency, not hosted
 * persistence or authenticity of user-supplied saved content. V1 absence is
 * handled by the caller and never upgrades itself to V2. */
export function contextDetailsMatchResolvedSubject(details: PointObjectContextDetailsV2, subject: LiveResolvedObjectContext): boolean {
  const exact = subject.coordinateAssociation === "trusted_open_map_identity";
  const association = exact ? "selected_record" : subject.coordinateAssociation === "open_map_geometry_contains_point"
    ? "contains_point_not_selected" : "nearest_record_not_selected";
  const receipt = subject.evidenceReceipt;
  const objectSource = details.sources.find(source => source.id === "osm_object");
  if (details.subjectId !== subject.sourceFeatureId || details.association !== association ||
      !receipt || !objectSource || objectSource.responseHash !== receipt.sourceResponseHash ||
      objectSource.acquiredAt !== receipt.acquiredAt ||
      exact && receipt.lookupSourceFeatureId !== subject.sourceFeatureId ||
      receipt.lookupSourceFeatureId !== null && receipt.lookupSourceFeatureId !== subject.sourceFeatureId) return false;
  const tags = subject.tags;
  const building = tags["tag.building"] ?? tags.building;
  const temporary = ["tent", "tents", "static_caravan", "carport", "roof"].includes(building ?? "") ||
    (tags["tag.leisure"] ?? tags.leisure) === "outdoor_seating";
  const expected = [
    exact ? subject.metrics?.footprintAreaSqM ?? null : null,
    exact ? subject.metrics?.footprintPerimeterM ?? null : null,
    exact ? contextExplicitTag(tags["tag.height"] ?? tags.height, "m") : null,
    exact && building && !temporary ? contextExplicitTag(tags["tag.building:levels"] ?? tags["building:levels"], "levels") : null
  ];
  if (details.metrics.some((metric, index) => metric.value !== expected[index])) return false;
  const expectedGeometry = exact && subject.geometryProvenance === "confirmed_complete_footprint"
    ? boundedGeometry(subject.displayGeometry ?? null) : null;
  // Public export sorts object keys. GeoJSON key order is not geometry identity;
  // type and the entire ordered coordinate arrays must still match exactly.
  if (details.geometry?.type !== expectedGeometry?.type ||
      JSON.stringify(details.geometry?.coordinates ?? null) !== JSON.stringify(expectedGeometry?.coordinates ?? null)) return false;
  const warnings = [
    ...((tags["tag.leisure"] ?? tags.leisure) === "outdoor_seating" ? ["outdoor_seating_not_green_space"] : []),
    ...(temporary ? ["temporary_structure_not_permanent_floor_area"] : [])
  ];
  return JSON.stringify(details.semanticWarnings) === JSON.stringify(warnings);
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const point = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && Number.isFinite(v[0]) && Math.abs(v[0]) <= 180 && typeof v[1] === "number" && Number.isFinite(v[1]) && Math.abs(v[1]) <= 90;
const timestamp = (v: unknown) => v === null || typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const hash = (v: unknown) => v === null || typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));

/** Saved enrichments are data, never authority. Reject scope/method/date/
 * identity contradictions rather than coercing them into trustworthy facts. */
export function parseContextDetailsV2(value: unknown, subjectId: string, anchor: [number, number] | null, scope: "point_radius" | "aoi_interior"): PointObjectContextDetailsV2 | null {
  if (!record(value) || JSON.stringify(value).length > 24_000 || value.version !== CONTEXT_DETAILS_VERSION || value.subjectId !== subjectId || !point(value.anchor) || !anchor || value.anchor[0] !== anchor[0] || value.anchor[1] !== anchor[1] || value.completeInventory !== false || !["not_admitted", "separate_source_snapshot"].includes(String(value.independentEnrichment)) || value.caveat !== CONTEXT_DETAILS_CAVEAT) return null;
  if (!keys(value, ["version", "subjectId", "anchor", "association", "sources", "metrics", "geometry", "geometryRole", "independentEnrichment", "semanticWarnings", "completeInventory", "caveat"]) || !Array.isArray(value.semanticWarnings) || value.semanticWarnings.length > 2 || !value.semanticWarnings.every(w => ["outdoor_seating_not_green_space", "temporary_structure_not_permanent_floor_area"].includes(String(w))) || new Set(value.semanticWarnings).size !== value.semanticWarnings.length) return null;
  const area = scope === "aoi_interior";
  if (area ? value.association !== "user_aoi" : !["selected_record", "contains_point_not_selected", "nearest_record_not_selected"].includes(String(value.association))) return null;
  if (!Array.isArray(value.sources) || value.sources.length !== 2 || !Array.isArray(value.metrics) || value.metrics.length !== (area ? 2 : 4)) return null;
  const expectedSources = area ? ["user_aoi", "osm_aoi_interior"] : ["osm_object", "osm_surroundings"];
  for (const [index, s] of value.sources.entries()) {
    if (!record(s) || !keys(s, ["id", "name", "acquiredAt", "observedAt", "responseHash", "scope", "licenceId", "attribution", "officialLiveStatus", "coverage"]) || s.id !== expectedSources[index] || !timestamp(s.acquiredAt) || !timestamp(s.observedAt) || !hash(s.responseHash) || s.acquiredAt && s.observedAt && Date.parse(String(s.observedAt)) > Date.parse(String(s.acquiredAt))) return null;
    const user = s.id === "user_aoi";
    const expectedScope = s.id === "osm_object" ? "selected_record" : s.id === "osm_surroundings" ? "point_radius" : s.id === "osm_aoi_interior" ? "aoi_interior" : "user_aoi";
    if (s.scope !== expectedScope || s.name !== (user ? "User-drawn AOI" : "OpenStreetMap") || s.licenceId !== (user ? "user_provided" : "ODbL-1.0") || s.attribution !== (user ? "User-provided boundary" : "© OpenStreetMap contributors") || s.officialLiveStatus !== (user ? "user_provided_not_official" : "open_context_not_official") || (user ? s.coverage !== "user_drawn" || s.acquiredAt !== null || s.observedAt !== null || s.responseHash !== null : !["partial", "unavailable"].includes(String(s.coverage)))) return null;
  }
  const ids = area ? ["aoi_area", "perimeter"] : ["footprint_area", "perimeter", "height", "levels"];
  for (const [index, m] of value.metrics.entries()) {
    if (!record(m) || !keys(m, ["id", "value", "unit", "status", "scope", "method", "sourceId", "evidenceRef", "coverage"]) || m.id !== ids[index] || m.sourceId !== (area ? "user_aoi" : "osm_object") || m.scope !== (area ? "user_aoi" : "selected_record")) return null;
    const tag = m.id === "height" || m.id === "levels";
    const unit = m.id === "aoi_area" || m.id === "footprint_area" ? "m²" : m.id === "levels" ? "levels" : "m";
    const unknown = m.value === null;
    const maximum = m.id === "levels" ? 200 : m.id === "height" ? 1200 : m.unit === "m²" ? 1_000_000_000 : 1_000_000;
    if (m.unit !== unit || (unknown ? m.status !== "unknown" || m.method !== "not_available" || m.coverage !== "unknown" : typeof m.value !== "number" || !Number.isFinite(m.value) || m.value <= 0 || m.value > maximum || m.status !== (tag ? "observed_tag" : "derived") || m.method !== (tag ? "explicit_osm_tag" : area ? "user_polygon_measurement" : "local_equirectangular_wgs84_approximation") || m.coverage !== (tag ? "explicit_tag_only" : area ? "user_drawn_boundary" : "mapped_generalized_geometry")) || m.evidenceRef !== (area ? "EVD-AOI-GEOMETRY" : tag ? "EVD-ALLOWED-FIELDS" : "EVD-OBJECT-METRICS") || !area && value.association !== "selected_record" && !unknown) return null;
  }
  if (value.geometry !== null) {
    if (!record(value.geometry) || !keys(value.geometry, ["type", "coordinates"]) || !["Polygon", "MultiPolygon"].includes(String(value.geometry.type)) || !Array.isArray(value.geometry.coordinates)) return null;
    try { if (!boundedGeometry(value.geometry as unknown as Polygon | MultiPolygon)) return null; } catch { return null; }
    if (value.geometryRole !== (area ? "user_aoi" : "selected_mapped_footprint") || !area && value.association !== "selected_record") return null;
  } else if (value.geometryRole !== "unavailable") return null;
  return structuredClone(value) as PointObjectContextDetailsV2;
}
