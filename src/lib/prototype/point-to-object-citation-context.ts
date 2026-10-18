// Browser-safe provenance of existing nearby evidence, not a new acquisition,
// KPI inventory, signed receipt or model evidence policy.
import type { LivePointObjectEvidencePack } from "./point-to-object-live-evidence";
import type { ContextGroup } from "./point-to-object-normalized-context";

export const CITATION_CONTEXT_VERSION = "POINT_OBJECT_CITATION_CONTEXT_V1" as const;
export const CITATION_CONTEXT_MAX_BYTES = 20_000;
export type PointObjectCitationItem = {
  id: string; evidenceRef: string; name: string; featureClass: string; categories: string[];
  contextGroup: ContextGroup | null; coordinates: [number, number] | null; distanceM: number;
  method: "overpass_around_query_element_center_haversine";
};
export type PointObjectCitationContext = {
  version: typeof CITATION_CONTEXT_VERSION;
  subjectId: string;
  evidencePackHash: string;
  scope: { kind: "point_radius"; radiusM: 800; anchor: [number, number] };
  source: {
    name: "OpenStreetMap"; service: "Overpass API"; sourceId: "SPAT-001";
    responseHash: string; acquiredAt: string | null; observedAt: string | null;
    licenceId: "ODbL-1.0"; attribution: "© OpenStreetMap contributors";
    officialStatus: "open_context_not_official";
  };
  completeInventory: false;
  items: PointObjectCitationItem[];
};
const GROUPS: readonly string[] = ["residential", "commercial", "hospitality", "retail_daily_needs", "education", "healthcare", "civic_culture", "transport", "access", "open_space", "industrial", "construction", "other_built"];
const osmId = (value: unknown): value is string => typeof value === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(value);
const hash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const text = (value: unknown, maximum: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= maximum && !/[\u0000-\u001f\u007f]/u.test(value);
const timestamp = (value: unknown) => value === null || text(value, 40) && Number.isFinite(Date.parse(value));
function fields(value: unknown, names: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  return Reflect.ownKeys(value).length === names.length && names.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return !!descriptor && "value" in descriptor;
  });
}
function array(value: unknown, maximum: number): value is unknown[] {
  if (!Array.isArray(value) || value.length > maximum || Reflect.ownKeys(value).length !== value.length + 1) return false;
  return Array.from({ length: value.length }, (_, index) => Object.getOwnPropertyDescriptor(value, String(index)))
    .every(descriptor => !!descriptor && "value" in descriptor);
}
function point(value: unknown): value is [number, number] {
  return array(value, 2) && value.length === 2 && value.every(number => typeof number === "number" && Number.isFinite(number)) &&
    Math.abs(value[0] as number) <= 180 && Math.abs(value[1] as number) <= 90;
}
function distance(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180, lat = (b[1] - a[1]) * rad, lon = (b[0] - a[0]) * rad;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(lon / 2) ** 2;
  return 6_371_008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

/** No query, ref renumbering, inference from prose or legacy backfill.
 * Hashes are provenance/correspondence metadata, not client authentication:
 * original source bytes and the server evidence lease remain authoritative.
 */
export function parsePointObjectCitationContext(value: unknown, subjectId: string, anchor: [number, number] | null,
  evidencePackHash?: string): PointObjectCitationContext | null {
  try {
    if (!point(anchor) || !osmId(subjectId) || !fields(value, ["version", "subjectId", "evidencePackHash", "scope", "source", "completeInventory", "items"]) ||
        value.version !== CITATION_CONTEXT_VERSION || value.subjectId !== subjectId || !hash(value.evidencePackHash) ||
        evidencePackHash !== undefined && value.evidencePackHash !== evidencePackHash || value.completeInventory !== false ||
        !fields(value.scope, ["kind", "radiusM", "anchor"]) || value.scope.kind !== "point_radius" || value.scope.radiusM !== 800 ||
        !point(value.scope.anchor) || value.scope.anchor[0] !== anchor[0] || value.scope.anchor[1] !== anchor[1] ||
        !fields(value.source, ["name", "service", "sourceId", "responseHash", "acquiredAt", "observedAt", "licenceId", "attribution", "officialStatus"]) ||
        value.source.name !== "OpenStreetMap" || value.source.service !== "Overpass API" || value.source.sourceId !== "SPAT-001" ||
        !hash(value.source.responseHash) || !timestamp(value.source.acquiredAt) || !timestamp(value.source.observedAt) ||
        value.source.licenceId !== "ODbL-1.0" || value.source.attribution !== "© OpenStreetMap contributors" ||
        value.source.officialStatus !== "open_context_not_official" || !array(value.items, 12)) return null;
    const refs = new Set<string>(), ids = new Set<string>();
    for (const item of value.items) {
      if (!fields(item, ["id", "evidenceRef", "name", "featureClass", "categories", "contextGroup", "coordinates", "distanceM", "method"]) ||
          !osmId(item.id) || item.id === subjectId || ids.has(item.id) || typeof item.evidenceRef !== "string" ||
          !/^EVD-CONTEXT-(?:[1-9]|1[0-2])$/.test(item.evidenceRef) || refs.has(item.evidenceRef) ||
          !text(item.name, 240) || !text(item.featureClass, 160) || !array(item.categories, 8) ||
          !item.categories.every(category => text(category, 80)) ||
          !(item.contextGroup === null || typeof item.contextGroup === "string" && GROUPS.includes(item.contextGroup)) ||
          !(item.coordinates === null || point(item.coordinates)) || !Number.isInteger(item.distanceM) ||
          Number(item.distanceM) < 0 || Number(item.distanceM) > 800 || item.method !== "overpass_around_query_element_center_haversine") return null;
      // Whole-metre producer precision plus sub-metre coordinate representation
      // tolerance; never a route or a walking-time measurement.
      if (point(item.coordinates) && Math.abs(distance(anchor, item.coordinates) - Number(item.distanceM)) > 1) return null;
      ids.add(item.id); refs.add(item.evidenceRef);
    }
    const json = JSON.stringify(value);
    return new TextEncoder().encode(json).byteLength <= CITATION_CONTEXT_MAX_BYTES ? JSON.parse(json) as PointObjectCitationContext : null;
  } catch { return null; }
}

/** Existing acquisition only, independently of the 400m KPI sample.
 * Reduced historical inputs/unavailable sources never gain a new catalogue.
 */
export function citationContextFromEvidence(pack: LivePointObjectEvidencePack): PointObjectCitationContext | undefined {
  if (pack.source.contextStatus !== "available" || pack.source.contextRadiusM !== 800 || !hash(pack.source.contextResponseHash) ||
      !Array.isArray(pack.nearbyContext) || pack.nearbyContext.length > 12 || !Array.isArray(pack.evidence)) return undefined;
  // Match the exact receipt already consumed by the existing model projection.
  // Never admit a renamed/reclassified nearby record detached from that receipt.
  if (pack.nearbyContext.some(item => !pack.evidence.some(receipt => receipt.id === item.evidenceId &&
      receipt.sourceId === item.sourceFeatureId && receipt.label === item.name && receipt.value === JSON.stringify({
        sourceFeatureId: item.sourceFeatureId, name: item.name, categories: item.categories,
        featureClass: item.featureClass, distanceM: item.distanceM, method: item.method
      })))) return undefined;
  const anchor: [number, number] = [pack.coordinates.longitude, pack.coordinates.latitude];
  const candidate = {
    version: CITATION_CONTEXT_VERSION, subjectId: pack.selectedObject.sourceFeatureId, evidencePackHash: pack.evidencePackHash,
    scope: { kind: "point_radius", radiusM: 800, anchor },
    source: { name: "OpenStreetMap", service: "Overpass API", sourceId: "SPAT-001", responseHash: pack.source.contextResponseHash,
      acquiredAt: pack.source.contextAcquiredAt ?? null, observedAt: pack.source.contextObservedAt,
      licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", officialStatus: "open_context_not_official" },
    completeInventory: false,
    items: pack.nearbyContext.map(item => ({ id: item.sourceFeatureId, evidenceRef: item.evidenceId, name: item.name,
      featureClass: item.featureClass, categories: item.categories, contextGroup: item.contextGroup ?? null,
      coordinates: item.coordinates ?? null, distanceM: item.distanceM, method: item.method }))
  };
  return parsePointObjectCitationContext(candidate, pack.selectedObject.sourceFeatureId, anchor, pack.evidencePackHash) ?? undefined;
}

export function getPointObjectCitation(context: PointObjectCitationContext | undefined, evidenceRef: string): PointObjectCitationItem | null {
  return context?.items.find(item => item.evidenceRef === evidenceRef) ?? null;
}
