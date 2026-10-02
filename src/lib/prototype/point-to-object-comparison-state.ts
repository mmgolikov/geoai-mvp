import type { LiveResolvedObjectContext } from "../../../components/point-to-object/live-types";
import type { PointObjectComparisonInsight } from "./point-to-object-comparison-core";
import type { PointObjectFindCandidate } from "./point-to-object-find-contract";

/** Persistence uses the committed Find locale/intent; display uses the current
 * controls. Draft edits can hide a result, but must not erase or relabel it. */
export function boundPointObjectComparisonInsight(
  insight: PointObjectComparisonInsight | null,
  intent: { locale: "en" | "ru"; role: string; scenario: string },
  candidates: PointObjectFindCandidate[],
  contexts: Record<string, LiveResolvedObjectContext>
): PointObjectComparisonInsight | null {
  return insight && insight.locale === intent.locale && insight.role === intent.role && insight.scenario === intent.scenario &&
    insight.snapshots.length === candidates.length && insight.snapshots.every(snapshot =>
      candidates.some(candidate => candidate.sourceFeatureId === snapshot.sourceFeatureId) &&
      contexts[snapshot.sourceFeatureId]?.sourceFeatureId === snapshot.sourceFeatureId &&
      contexts[snapshot.sourceFeatureId]?.coordinateAssociation === "trusted_open_map_identity" &&
      contexts[snapshot.sourceFeatureId]?.evidenceReceipt?.lookupSourceFeatureId === snapshot.sourceFeatureId &&
      contexts[snapshot.sourceFeatureId]?.evidenceReceipt?.evidencePackHash === snapshot.evidencePackHash &&
      contexts[snapshot.sourceFeatureId]?.name === snapshot.label)
    ? insight : null;
}
