import "server-only";
import type { PointObjectAreaContextResult } from "./point-to-object-area-context-contract";
import { areaSourceCase, buildAreaSourceContextV2, type AreaSourceBinding } from "./point-to-object-area-source-context-v2";
import { readIndependentPointObjectContext } from "./point-to-object-overture-snapshot";
import { readU4IndependentContext } from "./point-to-object-u4-snapshot";

/** Source-only adapter; no additional query, AI request, Auth or Create setting.
 * Ordinary AOI Analyse intake/AI is a separate, unqualified integration step. */
export function readAreaSourceContextV2(binding: AreaSourceBinding, heldV1: PointObjectAreaContextResult | null) {
  const caseId = areaSourceCase(binding);
  if (!caseId) return null;
  const independent = caseId === "U3"
    ? readIndependentPointObjectContext(binding.aoiId, binding.anchor, binding.geometry.coordinates as [number, number][][])
    : readU4IndependentContext({ subjectId: binding.sourceFeatureId ?? "", sourceVersion: binding.sourceVersion,
      geometry: binding.geometry, anchor: binding.anchor, radiusM: binding.radiusM });
  return buildAreaSourceContextV2(binding, heldV1, independent);
}
