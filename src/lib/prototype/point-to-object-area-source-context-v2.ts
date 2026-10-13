import type { Polygon } from "geojson";
import type { PointObjectAreaContextResult } from "./point-to-object-area-context-contract";
import { isPointObjectAreaContextResult } from "./point-to-object-create-result";
import { CONTEXT_DETAILS_CAVEAT } from "./point-to-object-context-details-v2";
import { normalizePointObjectAreaContext, parseNormalizedPointObjectContext } from "./point-to-object-normalized-context";
import { calculatePolygonMeasurements } from "../polygon-aoi";
import { INDEPENDENT_CASES, INDEPENDENT_U3_POLYGON, INDEPENDENT_U3_GEOMETRY_HASH, parseIndependentContext, type IndependentPointObjectContext } from "./point-to-object-independent-context";
import { U4_GEOMETRY_HASH, U4_SOURCE_ID, u4DomainMatches, parseU4IndependentContext, type U4IndependentContext } from "./point-to-object-u4-independent-context";

export const AREA_SOURCE_CONTEXT_VERSION = "D2_AREA_SOURCE_CONTEXT_V2" as const;
export const AREA_SOURCE_CONTEXT_MAX_BYTES = 192 * 1024;

/** An AOI is not a selected building or a nearest POI. Native source version is
 * required for mapped U4; it is never inferred from a user-drawn polygon. */
export type AreaSourceBinding = {
  aoiId: string;
  origin: "user_aoi" | "mapped_osm_polygon";
  sourceFeatureId: string | null;
  sourceVersion: number | null;
  geometry: Polygon;
  anchor: [number, number];
  radiusM: 400;
};
export type AreaSourceContextV2 = {
  version: typeof AREA_SOURCE_CONTEXT_VERSION;
  caseId: "U3" | "U4";
  binding: AreaSourceBinding;
  geometryHash: string;
  status: "partial_source_context";
  osmInterior: {
    status: "held_successful_v1" | "source_error_not_empty" | "not_retained";
    sampleSize: number | null;
    heldV1: PointObjectAreaContextResult | null;
    error: null | { code: "OVERPASS_OUT_OF_MEMORY"; responseHash: string; acquiredAt: string; truth: "frozen_prior_receipt_not_a_new_read" };
  };
  independentContext: IndependentPointObjectContext | U4IndependentContext;
  completeInventory: false;
  aiEligibility: "not_admitted_to_point_ai";
  persistence: "browser_local_snapshot_only";
  caveat: typeof CONTEXT_DETAILS_CAVEAT;
};
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const r = value as Record<string, unknown>;
    return `{${Object.keys(r).sort().map(k => `${JSON.stringify(k)}:${canonical(r[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}
function exactOrTransportAnchor(actual: [number, number], frozen: readonly [number, number]) {
  return canonical(actual) === canonical(frozen) || canonical(actual) === canonical(frozen.map(n => Number(n.toFixed(6))));
}
export function areaSourceCase(binding: AreaSourceBinding): "U3" | "U4" | null {
  if (binding.origin === "user_aoi" && binding.aoiId === INDEPENDENT_CASES[2].sourceFeatureId &&
      binding.sourceFeatureId === null && binding.sourceVersion === null && binding.radiusM === 400 &&
      canonical(binding.geometry) === canonical({ type: "Polygon", coordinates: INDEPENDENT_U3_POLYGON }) &&
      exactOrTransportAnchor(binding.anchor, INDEPENDENT_CASES[2].anchor)) return "U3";
  return binding.origin === "mapped_osm_polygon" && binding.aoiId === U4_SOURCE_ID &&
    u4DomainMatches({ subjectId: binding.sourceFeatureId ?? "", sourceVersion: binding.sourceVersion,
      geometry: binding.geometry, anchor: binding.anchor, radiusM: binding.radiusM }) ? "U4" : null;
}

/** New wrapper only: successful V1 payloads are retained unchanged. No source
 * refresh on read, no inferred source for historical saves, no zero on error.
 * U4 explicitly retains the frozen Q2 failure, not a new successful OSM read. */
export function buildAreaSourceContextV2(binding: AreaSourceBinding, heldV1: PointObjectAreaContextResult | null,
  independent: IndependentPointObjectContext | U4IndependentContext): AreaSourceContextV2 | null {
  const caseId = areaSourceCase(binding);
  if (!caseId) return null;
  let accepted: IndependentPointObjectContext | U4IndependentContext | null;
  if (caseId === "U3") {
    accepted = parseIndependentContext(independent, binding.aoiId, binding.anchor, binding.geometry.coordinates as [number, number][][]);
    if (heldV1 && (!isPointObjectAreaContextResult(heldV1) || heldV1.request.marketKey !== "dubai" ||
        canonical(heldV1.request.aoiCoordinates) !== canonical(binding.geometry.coordinates) ||
        !parseNormalizedPointObjectContext(normalizePointObjectAreaContext(heldV1)))) return null;
    if (heldV1) {
      const measured = calculatePolygonMeasurements(binding.geometry.coordinates[0] as [number, number][]);
      // Match the existing V1 producer's whole-metre/m² rounding exactly.
      if (heldV1.area.areaSqM !== Math.round(measured.areaSqM) ||
          heldV1.area.perimeterM !== Math.round(measured.perimeterM) ||
          Math.abs(heldV1.area.centroid.longitude - measured.centroid.longitude) > 1e-9 ||
          Math.abs(heldV1.area.centroid.latitude - measured.centroid.latitude) > 1e-9) return null;
    }
  } else {
    // A future successful U4 OSM acquisition needs its own read-back contract.
    // Do not overwrite the frozen error by supplying a V1 from another case.
    if (heldV1 !== null) return null;
    accepted = parseU4IndependentContext(independent, { subjectId: binding.sourceFeatureId ?? "",
      sourceVersion: binding.sourceVersion, geometry: binding.geometry, anchor: binding.anchor, radiusM: binding.radiusM });
  }
  if (!accepted || accepted.caseId !== caseId || accepted.status === "unsupported_scope") return null;
  const failure = "osmInteriorBaseline" in accepted ? accepted.osmInteriorBaseline : null;
  return {
    version: AREA_SOURCE_CONTEXT_VERSION, caseId, binding: structuredClone(binding),
    geometryHash: caseId === "U3" ? INDEPENDENT_U3_GEOMETRY_HASH : U4_GEOMETRY_HASH,
    status: "partial_source_context",
    osmInterior: { status: heldV1 ? "held_successful_v1" : failure ? "source_error_not_empty" : "not_retained",
      sampleSize: heldV1?.summary.sampleSize ?? null, heldV1: heldV1 ? structuredClone(heldV1) : null,
      error: failure ? { code: "OVERPASS_OUT_OF_MEMORY", responseHash: failure.responseHash,
        acquiredAt: failure.acquiredAt, truth: failure.truth } : null },
    independentContext: accepted, completeInventory: false, aiEligibility: "not_admitted_to_point_ai",
    persistence: "browser_local_snapshot_only", caveat: CONTEXT_DETAILS_CAVEAT
  };
}

/** Caller supplies the held original OSM snapshot (or null), not a hash from the
 * imported document. This is consistency validation, not public-save signing.
 * Changing locale cannot create a newer acquisition or heal a saved error. */
export function parseSavedAreaSourceContextV2(value: unknown, binding: AreaSourceBinding,
  heldV1: PointObjectAreaContextResult | null): AreaSourceContextV2 | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        new TextEncoder().encode(JSON.stringify(value)).byteLength > AREA_SOURCE_CONTEXT_MAX_BYTES) return null;
    const r = value as AreaSourceContextV2;
    const expected = buildAreaSourceContextV2(binding, heldV1, r.independentContext);
    return expected && canonical(value) === canonical(expected) ? expected : null;
  } catch { return null; }
}
export function serializeAreaSourceContextV2(value: AreaSourceContextV2): string | null {
  const parsed = parseSavedAreaSourceContextV2(value, value.binding, value.osmInterior.heldV1);
  return parsed ? JSON.stringify(parsed) : null;
}
export function normalizeAreaSourceDashboard(context: AreaSourceContextV2) {
  return {
    binding: structuredClone(context.binding),
    geometryMeasurements: calculatePolygonMeasurements(context.binding.geometry.coordinates[0] as [number, number][]),
    osmContext: context.osmInterior.heldV1 ? normalizePointObjectAreaContext(context.osmInterior.heldV1) : null,
    osmInterior: structuredClone(context.osmInterior),
    independentContext: context.independentContext,
    caveat: context.caveat
  };
}
