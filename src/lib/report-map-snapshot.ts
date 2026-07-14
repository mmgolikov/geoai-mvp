import { normalizeSpatialAttributionPayload, type SpatialAttributionPayload } from "@/src/lib/spatial-b2/attribution";
import type { SpatialSelectionLineage } from "@/src/lib/spatial-b2/selection-lineage";

export type ReportMapSnapshot = {
  src: string;
  width: number;
  height: number;
  capturedAt: string;
  targetLabel: string;
  source: "workspace-map" | "seeded-dashboard-map";
  attribution?: SpatialAttributionPayload;
  selectedFeatureLineage?: SpatialSelectionLineage;
};

function isAllowedSnapshotSource(value: string) {
  return value.startsWith("data:image/png;base64,") ||
    value.startsWith("data:image/jpeg;base64,") ||
    value.startsWith("/report-map-snapshots/");
}

export function normalizeReportMapSnapshot(value: unknown): ReportMapSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Partial<ReportMapSnapshot>;
  if (
    typeof snapshot.src !== "string" ||
    !isAllowedSnapshotSource(snapshot.src) ||
    typeof snapshot.width !== "number" ||
    snapshot.width <= 0 ||
    typeof snapshot.height !== "number" ||
    snapshot.height <= 0 ||
    typeof snapshot.capturedAt !== "string" ||
    typeof snapshot.targetLabel !== "string" ||
    (snapshot.source !== "workspace-map" && snapshot.source !== "seeded-dashboard-map")
  ) {
    return null;
  }

  const attribution = normalizeSpatialAttributionPayload(snapshot.attribution);
  const selectedFeatureLineage = normalizeSelectedFeatureLineage(snapshot.selectedFeatureLineage);
  const {
    attribution: _unsafeAttribution,
    selectedFeatureLineage: _unsafeSelectedFeatureLineage,
    ...baseSnapshot
  } = snapshot;

  return {
    ...(baseSnapshot as ReportMapSnapshot),
    ...(attribution ? { attribution } : {}),
    ...(selectedFeatureLineage ? { selectedFeatureLineage } : {})
  };
}

function normalizeSelectedFeatureLineage(value: unknown): SpatialSelectionLineage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const lineage = value as Partial<SpatialSelectionLineage>;
  if (
    typeof lineage.canonicalFeatureKey !== "string" ||
    typeof lineage.layerKey !== "string" ||
    typeof lineage.datasetId !== "string" ||
    typeof lineage.datasetVersion !== "string" ||
    typeof lineage.bundleChecksum !== "string" ||
    !Array.isArray(lineage.attributionIds) ||
    !Array.isArray(lineage.limitations) ||
    typeof lineage.caveat !== "string"
  ) {
    return null;
  }

  return lineage as SpatialSelectionLineage;
}
