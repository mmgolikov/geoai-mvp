import type { LivePointObjectEvidencePack } from "./point-to-object-live-evidence";
import type { LiveResolvedObjectContext, PointObjectGeoContext } from "../../../components/point-to-object/live-types";
import type { PointObjectAreaContextResult } from "./point-to-object-area-context-contract";

export const NORMALIZED_CONTEXT_VERSION = "POINT_OBJECT_NORMALIZED_CONTEXT_V1" as const;
export const CONTEXT_GROUPS = ["residential", "commercial", "hospitality", "retail_daily_needs", "education", "healthcare", "civic_culture", "transport", "access", "open_space", "industrial", "construction", "other_built"] as const;
export type ContextGroup = typeof CONTEXT_GROUPS[number];
export type ContextMetric = {
  id: string; group: ContextGroup; value: number | null; unit: "count" | "m" | "%";
  status: "derived" | "unknown" | "source_unavailable";
  method: "mapped_feature_count" | "share_of_returned_features" | "straight_line_to_returned_center";
  evidenceRef: string;
};
export type PointObjectNormalizedContext = {
  version: typeof NORMALIZED_CONTEXT_VERSION;
  subjectId: string;
  scope: { kind: "point_radius" | "aoi_interior"; radiusM: number | null; anchor: [number, number] | null };
  source: { name: "OpenStreetMap"; acquiredAt: string | null; observedAt: string | null; responseHash: string | null; attribution: "© OpenStreetMap contributors" };
  coverage: "available" | "partial" | "unavailable";
  sampleSize: number | null; capReached: boolean; completeInventory: false;
  metrics: ContextMetric[];
  places: Array<{ id: string; name: string; group: ContextGroup; coordinates: [number, number] | null; distanceM: number | null; evidenceRef: string }>;
  programmeChecks: Array<{ group: "education" | "healthcare" | "retail_daily_needs" | "transport" | "open_space"; mappedCount: number | null; capacity: "unknown"; adequacy: "not_assessed"; nextCheck: "operator_capacity_and_access" | "site_access_and_service" }>;
};

export const CONTEXT_GROUP_LABELS: Record<"en" | "ru", Record<ContextGroup, string>> = {
  en: { residential: "Residential", commercial: "Business", hospitality: "Hospitality", retail_daily_needs: "Daily services", education: "Education", healthcare: "Healthcare", civic_culture: "Civic & culture", transport: "Transit", access: "Major roads", open_space: "Green & public space", industrial: "Industrial", construction: "Construction", other_built: "Other buildings" },
  ru: { residential: "Жильё", commercial: "Деловые объекты", hospitality: "Гостиницы", retail_daily_needs: "Повседневные сервисы", education: "Образование", healthcare: "Медицина", civic_culture: "Общественные и культурные", transport: "Транспорт", access: "Магистрали", open_space: "Зелёные и общественные пространства", industrial: "Промышленность", construction: "Строительство", other_built: "Прочие здания" }
};
const CHECK_GROUPS = ["education", "healthcare", "retail_daily_needs", "transport", "open_space"] as const;
function checks(metrics: ContextMetric[]): PointObjectNormalizedContext["programmeChecks"] {
  return CHECK_GROUPS.map(group => ({ group, mappedCount: metrics.find(metric => metric.id === `${group}.count`)?.value ?? null,
    capacity: "unknown", adequacy: "not_assessed", nextCheck: group === "education" || group === "healthcare" ? "operator_capacity_and_access" : "site_access_and_service" }));
}
function metricsFromProfile(profile: PointObjectGeoContext, evidenceRef: string): ContextMetric[] {
  const available = profile.coverage === "available";
  return CONTEXT_GROUPS.flatMap(group => {
    const observed = profile.groups.find(item => item.group === group);
    return [
      { id: `${group}.count`, group, value: available ? observed?.count ?? 0 : null, unit: "count" as const, status: available ? "derived" as const : "source_unavailable" as const, method: "mapped_feature_count" as const, evidenceRef },
      { id: `${group}.share`, group, value: available && profile.sampleSize > 0 ? observed?.sharePct ?? 0 : null, unit: "%" as const, status: available && profile.sampleSize > 0 ? "derived" as const : available ? "unknown" as const : "source_unavailable" as const, method: "share_of_returned_features" as const, evidenceRef },
      { id: `${group}.nearest`, group, value: available ? observed?.nearestDistanceM ?? null : null, unit: "m" as const, status: available && observed?.nearestDistanceM != null ? "derived" as const : available ? "unknown" as const : "source_unavailable" as const, method: "straight_line_to_returned_center" as const, evidenceRef }
    ];
  });
}
function placeGroup(categories: string[], featureClass: string): ContextGroup {
  const text = `${categories.join(" ")} ${featureClass}`;
  if (/school|kindergarten|college|university|education/.test(text)) return "education";
  if (/hospital|clinic|doctors|pharmacy|health/.test(text)) return "healthcare";
  if (/shop|supermarket|convenience|mall|marketplace/.test(text)) return "retail_daily_needs";
  if (/station|platform|stop|transport|railway/.test(text)) return "transport";
  if (/highway|road|parking/.test(text)) return "access";
  if (/park|garden|playground|sports|natural|wood|water|forest|recreation/.test(text)) return "open_space";
  if (/hotel/.test(text)) return "hospitality";
  if (/office|commercial/.test(text)) return "commercial";
  if (/residential|apartments|house/.test(text)) return "residential";
  if (/industrial|warehouse/.test(text)) return "industrial";
  if (/construction|brownfield/.test(text)) return "construction";
  if (/library|community|arts|theatre|cinema|museum|gallery|civic/.test(text)) return "civic_culture";
  return "other_built";
}

/** Shared source-based semantics. Subject identity and geocontext are separate:
 * a nearest POI cannot replace the selected footprint, but context remains useful. */
export function normalizePointObjectContext(pack: LivePointObjectEvidencePack): PointObjectNormalizedContext {
  const metrics = metricsFromProfile(pack.geoContext, "EVD-DISTRICT-PROFILE");
  return { version: NORMALIZED_CONTEXT_VERSION, subjectId: pack.selectedObject.sourceFeatureId,
    scope: { kind: "point_radius", radiusM: pack.geoContext.radiusM, anchor: [pack.coordinates.longitude, pack.coordinates.latitude] },
    source: { name: "OpenStreetMap", acquiredAt: pack.source.fabricAcquiredAt ?? null, observedAt: pack.source.fabricObservedAt, responseHash: pack.source.fabricResponseHash, attribution: "© OpenStreetMap contributors" },
    coverage: pack.geoContext.coverage === "unavailable" ? "unavailable" : pack.geoContext.capReached ? "partial" : "available",
    sampleSize: pack.geoContext.coverage === "available" ? pack.geoContext.sampleSize : null, capReached: pack.geoContext.capReached, completeInventory: false, metrics,
    places: pack.nearbyContext.filter(place => place.distanceM <= pack.geoContext.radiusM).map(place => ({ id: place.sourceFeatureId, name: place.name, group: place.contextGroup ?? placeGroup(place.categories, place.featureClass), coordinates: place.coordinates ?? null, distanceM: place.distanceM, evidenceRef: place.evidenceId })),
    programmeChecks: checks(metrics) };
}

/** Legacy saved contexts have no public places/lineage. Never fabricate them. */
export function normalizedResolvedContext(context: LiveResolvedObjectContext, anchor?: [number, number]): PointObjectNormalizedContext {
  if (context.normalizedContext) return context.normalizedContext;
  const metrics = metricsFromProfile(context.geoContext, "EVD-DISTRICT-PROFILE");
  return { version: NORMALIZED_CONTEXT_VERSION, subjectId: context.sourceFeatureId, scope: { kind: "point_radius", radiusM: 400, anchor: anchor ?? null },
    source: { name: "OpenStreetMap", acquiredAt: null, observedAt: null, responseHash: null, attribution: "© OpenStreetMap contributors" },
    coverage: context.geoContext.coverage === "unavailable" ? "unavailable" : context.geoContext.capReached ? "partial" : "available", sampleSize: context.geoContext.coverage === "available" ? context.geoContext.sampleSize : null,
    capReached: context.geoContext.capReached, completeInventory: false, metrics, places: [], programmeChecks: checks(metrics) };
}

/** AOI inventory is an interior sample, not a surrounding catchment. */
export function normalizePointObjectAreaContext(area: PointObjectAreaContextResult): PointObjectNormalizedContext {
  const anchor: [number, number] = [area.area.centroid.longitude, area.area.centroid.latitude];
  const metrics: ContextMetric[] = CONTEXT_GROUPS.flatMap(group => {
    const entry = area.summary.groups.find(item => item.group === group);
    return [{ id: `${group}.count`, group, value: entry?.count ?? 0, unit: "count" as const, status: "derived" as const, method: "mapped_feature_count" as const, evidenceRef: "EVD-AOI-CONTEXT" },
      { id: `${group}.share`, group, value: area.summary.sampleSize ? entry?.sharePct ?? 0 : null, unit: "%" as const, status: area.summary.sampleSize ? "derived" as const : "unknown" as const, method: "share_of_returned_features" as const, evidenceRef: "EVD-AOI-CONTEXT" }];
  });
  return { version: NORMALIZED_CONTEXT_VERSION, subjectId: `aoi:${area.source.sourceResponseHash}`, scope: { kind: "aoi_interior", radiusM: null, anchor }, source: { name: "OpenStreetMap", acquiredAt: area.source.acquiredAt, observedAt: area.source.observedAt, responseHash: area.source.sourceResponseHash, attribution: "© OpenStreetMap contributors" },
    coverage: area.coverage.capReached ? "partial" : "available", sampleSize: area.summary.sampleSize, capReached: area.coverage.capReached, completeInventory: false, metrics,
    places: area.features.slice(0, 80).map((place, index) => ({ id: place.sourceFeatureId, name: place.label, group: place.group, coordinates: [place.longitude, place.latitude], distanceM: null, evidenceRef: `EVD-AOI-CONTEXT-${index + 1}` })), programmeChecks: checks(metrics) };
}

export function parseNormalizedPointObjectContext(value: unknown): PointObjectNormalizedContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const c = value as PointObjectNormalizedContext;
  const finite = (n: unknown, max: number) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max;
  const point = (p: unknown) => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && Number.isFinite(p[0]) && Math.abs(p[0]) <= 180 && typeof p[1] === "number" && Number.isFinite(p[1]) && Math.abs(p[1]) <= 90;
  const timestamp = (v: unknown) => v === null || typeof v === "string" && Number.isFinite(Date.parse(v));
  if (JSON.stringify(value).length > 60_000 || c.version !== NORMALIZED_CONTEXT_VERSION || typeof c.subjectId !== "string" || c.subjectId.length > 100 ||
    !c.scope || !["point_radius", "aoi_interior"].includes(c.scope.kind) || !(c.scope.anchor === null || point(c.scope.anchor)) || (c.scope.kind === "point_radius" ? c.scope.radiusM !== 400 : c.scope.radiusM !== null) ||
    !c.source || c.source.name !== "OpenStreetMap" || c.source.attribution !== "© OpenStreetMap contributors" || !timestamp(c.source.acquiredAt) || !timestamp(c.source.observedAt) || !(c.source.responseHash === null || /^[a-f0-9]{64}$/.test(c.source.responseHash)) ||
    !["available", "partial", "unavailable"].includes(c.coverage) || !(c.sampleSize === null || Number.isInteger(c.sampleSize) && finite(c.sampleSize, 10_000)) || typeof c.capReached !== "boolean" || c.completeInventory !== false ||
    !Array.isArray(c.metrics) || c.metrics.length > 39 || !Array.isArray(c.places) || c.places.length > 80 || !Array.isArray(c.programmeChecks) || c.programmeChecks.length !== 5) return null;
  if (!c.metrics.every(m => m && CONTEXT_GROUPS.includes(m.group) && m.id === `${m.group}.${m.unit === "count" ? "count" : m.unit === "%" ? "share" : "nearest"}` && ["count", "m", "%"].includes(m.unit) && ["derived", "unknown", "source_unavailable"].includes(m.status) && ["mapped_feature_count", "share_of_returned_features", "straight_line_to_returned_center"].includes(m.method) && (m.value === null ? m.status !== "derived" : m.status === "derived" && finite(m.value, m.unit === "%" ? 100 : 100_000)) && typeof m.evidenceRef === "string" && /^EVD-[A-Z0-9-]{1,60}$/.test(m.evidenceRef)) || new Set(c.metrics.map(m => m.id)).size !== c.metrics.length) return null;
  if (!c.places.every(p => p && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(p.id) && typeof p.name === "string" && p.name.length <= 240 && CONTEXT_GROUPS.includes(p.group) && (p.coordinates === null || point(p.coordinates)) && (p.distanceM === null || finite(p.distanceM, 400)) && typeof p.evidenceRef === "string" && /^EVD-[A-Z0-9-]{1,60}$/.test(p.evidenceRef)) || new Set(c.places.map(p => p.id)).size !== c.places.length) return null;
  if (!c.programmeChecks.every(p => p && CHECK_GROUPS.includes(p.group) && p.mappedCount === (c.metrics.find(m => m.id === `${p.group}.count`)?.value ?? null) && p.capacity === "unknown" && p.adequacy === "not_assessed" && ["operator_capacity_and_access", "site_access_and_service"].includes(p.nextCheck)) || new Set(c.programmeChecks.map(p => p.group)).size !== 5) return null;
  if ((c.coverage === "unavailable") !== (c.sampleSize === null) || c.coverage === "unavailable" && c.metrics.some(m => m.status !== "source_unavailable") || (c.coverage === "partial") !== c.capReached) return null;
  const expectedUnits = c.scope.kind === "point_radius" ? ["count", "%", "m"] : ["count", "%"];
  if (c.metrics.length !== CONTEXT_GROUPS.length * expectedUnits.length || CONTEXT_GROUPS.some(group => expectedUnits.some(unit => !c.metrics.some(m => m.group === group && m.unit === unit))) || c.scope.kind === "aoi_interior" && c.places.some(p => p.distanceM !== null)) return null;
  for (const m of c.metrics) {
    const method = m.unit === "count" ? "mapped_feature_count" : m.unit === "%" ? "share_of_returned_features" : "straight_line_to_returned_center";
    if (m.method !== method || m.unit === "count" && m.value !== null && !Number.isInteger(m.value) || m.unit === "m" && m.value !== null && m.value > 400) return null;
    if (m.unit === "%" && c.sampleSize !== null && c.sampleSize > 0) {
      const count = c.metrics.find(metric => metric.id === `${m.group}.count`)?.value;
      if (count === null || count === undefined || m.value === null || Math.abs(m.value - count / c.sampleSize * 100) > 0.11) return null;
    }
  }
  // Both normalizers assign one primary group per returned element. This
  // denominator does not sum multi-tag usages or areas.
  if (c.sampleSize !== null && c.metrics.filter(m => m.unit === "count").reduce((sum,m) => sum+(m.value ?? 0),0) !== c.sampleSize) return null;
  return JSON.parse(JSON.stringify(value)) as PointObjectNormalizedContext;
}

/** Repeated fields in a saved public context must describe the same inventory. */
export function normalizedContextMatchesProfile(context: PointObjectNormalizedContext, profile: PointObjectGeoContext): boolean {
  if (context.scope.kind !== "point_radius" || context.capReached !== profile.capReached || context.coverage !== (profile.coverage === "unavailable" ? "unavailable" : profile.capReached ? "partial" : "available")) return false;
  const expected = metricsFromProfile(profile, "EVD-DISTRICT-PROFILE");
  return expected.every(metric => {
    const supplied = context.metrics.find(item => item.id === metric.id);
    return supplied?.value === metric.value && supplied.status === metric.status && supplied.method === metric.method && supplied.unit === metric.unit;
  });
}
