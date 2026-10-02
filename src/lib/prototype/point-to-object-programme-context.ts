import type { ConceptMassingAlternative, ConceptUse, PointObjectCreateAoi, ValidatedRedevelopmentProgram } from "./point-to-object-create";
import type { PointObjectAreaContextResult } from "./point-to-object-area-context-contract";
import { normalizePointObjectAreaContext, parseNormalizedPointObjectContext, type ContextGroup, type PointObjectNormalizedContext } from "./point-to-object-normalized-context";

const USE_GROUP: Record<ConceptUse, ContextGroup> = {
  residential: "residential", office: "commercial", retail: "retail_daily_needs",
  hospitality: "hospitality", civic: "civic_culture", open_space: "open_space"
};
const USE_CHECKS: Record<ConceptUse, ContextGroup[]> = {
  residential: ["education", "healthcare", "retail_daily_needs", "transport", "open_space"],
  office: ["transport", "retail_daily_needs", "open_space"],
  retail: ["transport", "access"], hospitality: ["transport", "retail_daily_needs", "healthcare", "open_space"],
  civic: ["transport", "access", "open_space"], open_space: ["access", "transport"]
};

/** Reopening uses only the held snapshot for this exact saved zone. */
export function createProgrammeSourceContext(aoi: PointObjectCreateAoi, area: PointObjectAreaContextResult | null | undefined): PointObjectNormalizedContext | null {
  if (!area || JSON.stringify(area.request.aoiCoordinates) !== JSON.stringify(aoi.coordinates)) return null;
  return parseNormalizedPointObjectContext(normalizePointObjectAreaContext(area));
}

/** Programme weights and OSM record counts deliberately have different units.
 * Presence is a reason to verify integration/access, never an adequacy verdict. */
export function pointObjectProgrammeContextReview(program: ValidatedRedevelopmentProgram, context: PointObjectNormalizedContext | null) {
  const inventory = context?.scope.kind === "aoi_interior" && context.coverage !== "unavailable" ? context : null;
  const metric = (group: ContextGroup) => inventory?.metrics.find(item => item.id === `${group}.count`) ?? null;
  const uses = program.useMix.filter(item => item.sharePct > 0).map(item => ({
    use: item.use, scenarioSharePct: item.sharePct, observedGroup: USE_GROUP[item.use],
    mappedCount: metric(USE_GROUP[item.use])?.value ?? null,
    evidenceRef: metric(USE_GROUP[item.use])?.evidenceRef ?? null
  })).sort((a, b) => b.scenarioSharePct - a.scenarioSharePct);
  const groups = [...new Set(uses.flatMap(item => USE_CHECKS[item.use]))];
  return { uses, checks: groups.map(group => ({ group, mappedCount: metric(group)?.value ?? null,
    evidenceRef: metric(group)?.evidenceRef ?? null, capacity: "unknown" as const, adequacy: "not_assessed" as const })),
    coverage: inventory?.coverage ?? "unavailable", surroundingCatchment: "not_assessed" as const };
}

/** Deltas are saved geometric outcomes, not a value/performance recommendation. */
export function pointObjectProgrammeOptionDelta(alternatives: ConceptMassingAlternative[]) {
  const a = alternatives.find(option => option.id === "A")?.massing;
  const b = alternatives.find(option => option.id === "B")?.massing;
  if (!a || !b || a.aoiAreaSqM !== b.aoiAreaSqM) return null;
  const values = [a.estimatedFloorAreaSqM, b.estimatedFloorAreaSqM, a.achievedSiteCoveragePct, b.achievedSiteCoveragePct];
  if (values.some(value => !Number.isFinite(value) || value < 0)) return null;
  return { floorAreaSqM: b.estimatedFloorAreaSqM - a.estimatedFloorAreaSqM,
    coveragePercentagePoints: b.achievedSiteCoveragePct - a.achievedSiteCoveragePct };
}
