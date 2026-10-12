import { isFinitePosition, measurePointAgainstGeometry, validateGeometry, type CalculationCrs } from "../point-to-object/geometry";
import type { GeoJsonGeometry } from "../point-to-object/contracts";
import type { PointObjectCreateAoi, ConceptMassingResult } from "./point-to-object-create";
import type { PointObjectAreaContextFeature, PointObjectAreaContextResult } from "./point-to-object-area-context-contract";
import { isPointObjectAreaContextResult, parsePointObjectCreateAoi, parsePointObjectCreateSourceUseReceipt, type PointObjectGeneratedConcept } from "./point-to-object-create-result";
import type { PointObjectProgrammeSourceBindingStatus } from "./point-to-object-programme-context";
import { POINT_OBJECT_AREA_FEATURE_LIMIT, POINT_OBJECT_AREA_UPSTREAM_LIMIT } from "./point-to-object-area-context-limits";
import { pointObjectMarket } from "./point-to-object-markets";
import { validatePointObjectReplacementAoi } from "./point-to-object-map-replacement";

const MAX_BLOCKS = 80, MAX_GEOMETRY_POSITIONS = 1_000, MAX_TOTAL_POSITIONS = 8_000;
export const CREATE_PLACEMENT_BOUNDARY_TOLERANCE_M = 0.5;
export type CreatePlacementAction = "verify_boundary" | "verify_tent" | "confirm_access" | "retain_or_relocate";
export type CreatePlacementMatch = {
  sourceFeatureId: string; label: string; group: PointObjectAreaContextFeature["group"];
  conceptBlockId: string; relation: "inside" | "boundary"; nextCheck: CreatePlacementAction;
};
export type CreatePlacementBlock = {
  id: string; label: string; status: "assessed" | "unknown"; matches: CreatePlacementMatch[];
};
export type CreatePlacementAudit = {
  status: "available" | "partial" | "unavailable";
  bindingStatus: PointObjectProgrammeSourceBindingStatus;
  reason: "source_unbound" | "unsupported_frame" | "invalid_massing" | "input_limit" | null;
  method: "held_source_center_in_saved_footprint";
  calculationCrs: CalculationCrs | null;
  boundaryToleranceM: number;
  source: { responseHash: string; acquiredAt: string; sampleSize: number; returnedRecordCount: number; capReached: boolean } | null;
  summary: {
    uniqueSourceCount: number; insideSourceCount: number; boundaryOnlySourceCount: number;
    outsideSourceCount: number; unresolvedSourceCount: number; duplicateRecordCount: number;
    uniqueBlockCount: number; assessedBlockCount: number; unresolvedBlockCount: number;
    affectedBlockCount: number; insidePairCount: number; boundaryPairCount: number;
  } | null;
  blocks: CreatePlacementBlock[];
};
type SavedFootprints = Pick<ConceptMassingResult, "variantId" | "featureCollection">;

/** Same six receipt fields and saved-AOI/locale/sample anchors as the existing
 * programme binding, before any spatial facts. Raw duplicate IDs are retained
 * for explicit dedup/conflict checks rather than borrowing normalized places. */
function sourceBinding(aoi: PointObjectCreateAoi, area: PointObjectAreaContextResult | null | undefined, generated: Pick<PointObjectGeneratedConcept, "areaContextUsed">, generatedLocale: "en" | "ru" | null): PointObjectProgrammeSourceBindingStatus {
  if (!Object.hasOwn(generated, "areaContextUsed")) return "legacy_unknown";
  if (generated.areaContextUsed === null) return "not_used";
  const receipt = parsePointObjectCreateSourceUseReceipt(generated.areaContextUsed);
  if (!receipt) return "invalid_receipt";
  if (!area) return "context_missing";
  if (!parsePointObjectCreateAoi(aoi) || !isPointObjectAreaContextResult(area) || generatedLocale === null ||
      area.request.locale !== generatedLocale || JSON.stringify(area.request.aoiCoordinates) !== JSON.stringify(aoi.coordinates) ||
      area.area.areaSqM !== Math.round(aoi.areaSqM) || area.coverage.upstreamQueryLimit !== POINT_OBJECT_AREA_UPSTREAM_LIMIT ||
      area.coverage.normalizedInsideCount !== area.summary.sampleSize || area.coverage.returnedFeatureCount !== Math.min(area.summary.sampleSize, POINT_OBJECT_AREA_FEATURE_LIMIT) ||
      area.summary.mappedBuildingCount > area.summary.sampleSize || area.summary.groups.reduce((n, group) => n + group.count, 0) !== area.summary.sampleSize ||
      receipt.sourceResponseHash !== area.source.sourceResponseHash || receipt.sampleSize !== area.summary.sampleSize ||
      receipt.mappedBuildingCount !== area.summary.mappedBuildingCount || receipt.capReached !== area.coverage.capReached ||
      receipt.inclusionMethod !== area.coverage.inclusionMethod || receipt.completeInventory !== area.coverage.completeInventory) return "context_mismatch";
  const [[west, south], [east, north]] = pointObjectMarket(area.request.marketKey).bounds;
  if (aoi.coordinates[0].some(([x, y]) => x < west || x > east || y < south || y > north)) return "context_mismatch";
  return "matched";
}

function checkedGeometry(value: unknown): { geometry: GeoJsonGeometry; positions: number } | null {
  if (!value || typeof value !== "object" || !("type" in value) || !("coordinates" in value)) return null;
  const members = value.type === "Polygon" ? [value.coordinates] : value.type === "MultiPolygon" ? value.coordinates : null;
  if (!Array.isArray(members) || !members.length || members.length > MAX_BLOCKS) return null;
  let positions = 0;
  for (const member of members) {
    if (!Array.isArray(member) || !member.length || member.length > MAX_GEOMETRY_POSITIONS) return null;
    for (const ring of member) {
      if (!Array.isArray(ring) || ring.length < 4 || (positions += ring.length) > MAX_GEOMETRY_POSITIONS) return null;
    }
  }
  if (!validateGeometry(value) || members.some(coordinates => !validatePointObjectReplacementAoi({ type: "Polygon", coordinates }).valid)) return null;
  // Conservative audit-only eligibility, not a polygon-union algorithm. The
  // existing per-member measurement prioritizes a boundary even if another
  // member contains the point. Require strictly disjoint exterior bboxes;
  // overlap/touch (including otherwise valid polygons) remains unknown.
  const bounds = members.map(member => {
    const exterior = member[0] as number[][];
    return [Math.min(...exterior.map(point => point[0])), Math.min(...exterior.map(point => point[1])), Math.max(...exterior.map(point => point[0])), Math.max(...exterior.map(point => point[1]))];
  });
  for (let left = 0; left < bounds.length; left++) for (let right = left + 1; right < bounds.length; right++) {
    const a = bounds[left], b = bounds[right];
    if (!(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1])) return null;
  }
  return { geometry: value, positions };
}

function sourceIdentity(row: PointObjectAreaContextFeature): string {
  return JSON.stringify([row.longitude, row.latitude, row.label, row.group, Object.entries(row.observedTags).sort(([a], [b]) => a.localeCompare(b))]);
}
function nextCheck(row: PointObjectAreaContextFeature, relation: "inside" | "boundary"): CreatePlacementAction {
  if (relation === "boundary") return "verify_boundary";
  if (row.observedTags.building === "tent" || row.observedTags["tag.building"] === "tent") return "verify_tent";
  return row.group === "transport" || row.group === "access" ? "confirm_access" : "retain_or_relocate";
}

/** Pure saved-result audit. A returned OSM centre is a point proxy, never a
 * surveyed building intersection/removal decision. Boundary-band pairs stay
 * separate. Every output pair has unique (sourceFeatureId, conceptBlockId). */
export function buildCreatePlacementAudit(aoi: PointObjectCreateAoi, area: PointObjectAreaContextResult | null | undefined, generated: Pick<PointObjectGeneratedConcept, "areaContextUsed">, generatedLocale: "en" | "ru" | null, massing: SavedFootprints): CreatePlacementAudit {
  const bindingStatus = sourceBinding(aoi, area, generated, generatedLocale);
  const base: CreatePlacementAudit = { status: "unavailable", bindingStatus, reason: "source_unbound", method: "held_source_center_in_saved_footprint", calculationCrs: null, boundaryToleranceM: CREATE_PLACEMENT_BOUNDARY_TOLERANCE_M, source: null, summary: null, blocks: [] };
  if (bindingStatus !== "matched" || !area) return base;
  const frame = area.request.marketKey === "dubai" || area.request.marketKey === "abu_dhabi" ? "EPSG:32640" : area.request.marketKey === "singapore" ? "EPSG:32648" : null;
  base.source = { responseHash: area.source.sourceResponseHash, acquiredAt: area.source.acquiredAt, sampleSize: area.summary.sampleSize, returnedRecordCount: area.features.length, capReached: area.coverage.capReached };
  if (!frame) return { ...base, reason: "unsupported_frame" };
  base.calculationCrs = frame;
  const features = massing?.featureCollection?.features;
  if (!Array.isArray(features) || !features.length || !["A", "B"].includes(massing.variantId)) return { ...base, reason: "invalid_massing" };
  if (features.length > MAX_BLOCKS || area.features.length > POINT_OBJECT_AREA_FEATURE_LIMIT) return { ...base, reason: "input_limit" };

  const sources = new Map<string, { row: PointObjectAreaContextFeature; signature: string; conflict: boolean }>();
  for (const row of area.features) {
    const previous = sources.get(row.sourceFeatureId), signature = sourceIdentity(row);
    if (previous) previous.conflict ||= previous.signature !== signature;
    else sources.set(row.sourceFeatureId, { row, signature, conflict: false });
  }
  const blocks = new Map<string, { view: CreatePlacementBlock; geometry: GeoJsonGeometry | null; signature: string }>();
  let totalPositions = 0;
  for (const feature of features) {
    const id = feature.properties?.id;
    if (typeof id !== "string" || !id || id.length > 160 || feature.properties.variantId !== massing.variantId || (feature.id !== undefined && String(feature.id) !== id)) return { ...base, reason: "invalid_massing" };
    const label = typeof feature.properties.label === "string" && feature.properties.label.length <= 240 ? feature.properties.label : id;
    const signature = JSON.stringify([label, feature.geometry]);
    const previous = blocks.get(id);
    if (previous) {
      if (previous.signature !== signature) { previous.geometry = null; previous.view.status = "unknown"; }
      continue;
    }
    const checked = checkedGeometry(feature.geometry);
    totalPositions += checked?.positions ?? 0;
    if (totalPositions > MAX_TOTAL_POSITIONS) return { ...base, reason: "input_limit" };
    blocks.set(id, { view: { id, label, status: checked ? "assessed" : "unknown", matches: [] }, geometry: checked?.geometry ?? null, signature });
  }
  let insideSourceCount = 0, boundaryOnlySourceCount = 0, outsideSourceCount = 0, unresolvedSourceCount = 0;
  for (const { row, conflict } of sources.values()) {
    if (conflict || !isFinitePosition([row.longitude, row.latitude])) { unresolvedSourceCount++; continue; }
    let inside = false, boundary = false, unresolved = false;
    for (const { view, geometry } of blocks.values()) {
      if (!geometry) { unresolved = true; continue; }
      try {
        const relation = measurePointAgainstGeometry([row.longitude, row.latitude], geometry, frame, CREATE_PLACEMENT_BOUNDARY_TOLERANCE_M).containment;
        if (relation === "outside") continue;
        inside ||= relation === "inside"; boundary ||= relation === "boundary";
        view.matches.push({ sourceFeatureId: row.sourceFeatureId, label: row.label, group: row.group, conceptBlockId: view.id, relation, nextCheck: nextCheck(row, relation) });
      } catch { unresolved = true; }
    }
    if (inside) insideSourceCount++;
    else if (boundary) boundaryOnlySourceCount++;
    else if (unresolved) unresolvedSourceCount++;
    else outsideSourceCount++;
  }
  const views = [...blocks.values()].map(block => block.view);
  const unresolvedBlockCount = views.filter(block => block.status === "unknown").length;
  return { ...base, status: unresolvedBlockCount || unresolvedSourceCount ? "partial" : "available", reason: null, blocks: views,
    summary: { uniqueSourceCount: sources.size, insideSourceCount, boundaryOnlySourceCount, outsideSourceCount, unresolvedSourceCount, duplicateRecordCount: area.features.length - sources.size,
      uniqueBlockCount: views.length, assessedBlockCount: views.length - unresolvedBlockCount, unresolvedBlockCount, affectedBlockCount: views.filter(block => block.matches.length).length,
      insidePairCount: views.reduce((n, block) => n + block.matches.filter(match => match.relation === "inside").length, 0), boundaryPairCount: views.reduce((n, block) => n + block.matches.filter(match => match.relation === "boundary").length, 0) }
  };
}
