import type { SpatialFreshnessStatusV1 } from "@/src/types/spatial-data-v1";

export type SpatialNormalizedSourceTimestampV1 = {
  sourceUpdatedAtRaw: string | number | null;
  sourceUpdatedAtEpoch: number | null;
  sourceUpdatedAt: string | null;
};

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

function canonicalEpoch(value: number) {
  return Number.isInteger(value) ? Math.trunc(value) : value;
}

export function normalizeSpatialSourceTimestampV1(
  value: string | number | null | undefined
): SpatialNormalizedSourceTimestampV1 {
  const raw = value ?? null;
  if (value === null || value === undefined || typeof value === "boolean") {
    return { sourceUpdatedAtRaw: raw, sourceUpdatedAtEpoch: null, sourceUpdatedAt: null };
  }

  const trimmed = typeof value === "string" ? value.trim() : null;
  const numeric = typeof value === "number" ? value : trimmed && /^[-+]?\d+(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : null;
  if (numeric !== null) {
    if (!Number.isFinite(numeric)) {
      return { sourceUpdatedAtRaw: raw, sourceUpdatedAtEpoch: null, sourceUpdatedAt: null };
    }
    const epochSeconds = Math.abs(numeric) >= 100_000_000_000 ? numeric / 1000 : numeric;
    const epochMilliseconds = epochSeconds * 1000;
    const parsed = new Date(epochMilliseconds);
    if (!Number.isFinite(parsed.getTime())) {
      return { sourceUpdatedAtRaw: raw, sourceUpdatedAtEpoch: null, sourceUpdatedAt: null };
    }
    return {
      sourceUpdatedAtRaw: raw,
      sourceUpdatedAtEpoch: canonicalEpoch(epochSeconds),
      sourceUpdatedAt: parsed.toISOString()
    };
  }

  if (!trimmed) return { sourceUpdatedAtRaw: raw, sourceUpdatedAtEpoch: null, sourceUpdatedAt: null };
  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) {
    return { sourceUpdatedAtRaw: raw, sourceUpdatedAtEpoch: null, sourceUpdatedAt: null };
  }
  return {
    sourceUpdatedAtRaw: raw,
    sourceUpdatedAtEpoch: canonicalEpoch(parsed.getTime() / 1000),
    sourceUpdatedAt: parsed.toISOString()
  };
}

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
