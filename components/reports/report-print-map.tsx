import type { AnalysisReportDeliverable, ComparisonReportDeliverable } from "@/src/lib/report-deliverables";

type ReportPrintMapProps = {
  title: string;
  subtitle: string;
  coordinates?: string;
  geometryLabel?: string;
  comparison?: ComparisonReportDeliverable;
};

function stablePercent(value: string, axis: "x" | "y", index: number) {
  const total = value.split("").reduce((sum, char) => sum + char.charCodeAt(0), axis === "x" ? 31 : 47);
  const min = axis === "x" ? 24 : 16;
  const range = axis === "x" ? 52 : 36;
  return min + ((total + index * 17) % range);
}

const comparisonMarkerSlots = [
  { left: 28, top: 27 },
  { left: 70, top: 8 },
  { left: 63, top: 46 }
];

function formatPoint(point: AnalysisReportDeliverable["coordinates"]) {
  if (!point) return "Coordinates unavailable";
  return `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
}

export function ReportPrintMap({
  title,
  subtitle,
  coordinates,
  geometryLabel,
  comparison
}: ReportPrintMapProps) {
  const items = comparison?.comparedItems ?? [];

  return (
    <div className="geoai-print-map avoid-break">
      <div className="geoai-print-map-grid" />
      <div className="geoai-print-zone geoai-print-zone-a" />
      <div className="geoai-print-zone geoai-print-zone-b" />
      <div className="geoai-print-zone geoai-print-zone-c" />
      {items.length > 0 ? (
        items.map((item, index) => {
          const slot = comparisonMarkerSlots[index];
          return (
            <div
              key={`${item.name}-${index}`}
              className="geoai-print-marker"
              style={{
                left: `${slot?.left ?? stablePercent(item.name, "x", index)}%`,
                top: `${slot?.top ?? stablePercent(item.name, "y", index)}%`
              }}
            >
              <span>{index + 1}</span>
              <strong>{item.name}</strong>
            </div>
          );
        })
      ) : (
        <div className="geoai-print-marker geoai-print-marker-primary">
          <span>1</span>
          <strong>{title}</strong>
        </div>
      )}
      <div className="geoai-print-map-caption">
        <div>
          <strong>{subtitle}</strong>
          <span>{coordinates ?? (items.length > 0 ? items.map((item) => formatPoint(item.coordinates)).join(" / ") : "Selected geometry context")}</span>
        </div>
        <em>{geometryLabel ?? "Point / polygon context shown as print-safe schematic fallback"}</em>
      </div>
    </div>
  );
}
