import type { SpatialFreshnessStatusV1 } from "@/src/types/spatial-data-v1";

export const spatialFreshnessPolicyV1 = {
  freshnessPolicyId: "geoai-source-update-age-v1",
  timestampMeaning: "source record update time; not feature observation time",
  thresholdsDays: { currentMaximum: 365, agingMaximum: 1095 },
  states: ["current", "aging", "stale", "unknown"] as SpatialFreshnessStatusV1[],
  sourceInterpretation: {
    overture: "Latest declared source update_time across the Overture source records.",
    osm: "OSM object timestamp when exported; dataset snapshot time remains separate."
  }
};

export function classifySpatialFreshnessV1(
  sourceUpdatedAt: string | null,
  evaluatedAt: string
): SpatialFreshnessStatusV1 {
  if (!sourceUpdatedAt) return "unknown";
  const updated = Date.parse(sourceUpdatedAt);
  const evaluated = Date.parse(evaluatedAt);
  if (!Number.isFinite(updated) || !Number.isFinite(evaluated)) return "unknown";
  const ageDays = Math.max(0, evaluated - updated) / 86_400_000;
  if (ageDays <= spatialFreshnessPolicyV1.thresholdsDays.currentMaximum) return "current";
  if (ageDays <= spatialFreshnessPolicyV1.thresholdsDays.agingMaximum) return "aging";
  return "stale";
}
