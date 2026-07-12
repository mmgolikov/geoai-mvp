export type ReportMapSnapshot = {
  src: string;
  width: number;
  height: number;
  capturedAt: string;
  targetLabel: string;
  source: "workspace-map" | "seeded-dashboard-map";
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

  return snapshot as ReportMapSnapshot;
}
