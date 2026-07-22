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
  { left: 28, top: 29 },
  { left: 70, top: 19 },
  { left: 63, top: 52 }
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
  const coordinateText = coordinates ?? (
    items.length > 0
      ? items.map((item) => formatPoint(item.coordinates)).join(" / ")
      : "Selected geometry context"
  );

  return (
    <div
      className="geoai-print-map avoid-break"
      role="img"
      aria-label={`Schematic site context for ${title}. ${coordinateText}. Official validation required.`}
    >
      <div className="geoai-print-map-water" aria-hidden="true" />
      <div className="geoai-print-map-district geoai-print-map-district-a" aria-hidden="true" />
      <div className="geoai-print-map-district geoai-print-map-district-b" aria-hidden="true" />
      <div className="geoai-print-map-district geoai-print-map-district-c" aria-hidden="true" />
      <div className="geoai-print-map-road geoai-print-map-road-a" aria-hidden="true" />
      <div className="geoai-print-map-road geoai-print-map-road-b" aria-hidden="true" />
      <div className="geoai-print-map-road geoai-print-map-road-c" aria-hidden="true" />
      <div className="geoai-print-map-grid" aria-hidden="true" />
      <div className="geoai-print-zone geoai-print-zone-a" aria-hidden="true" />
      <div className="geoai-print-zone geoai-print-zone-b" aria-hidden="true" />
      <div className="geoai-print-zone geoai-print-zone-c" aria-hidden="true" />

      <span className="geoai-print-map-status">Schematic · not official</span>
      <span className="geoai-print-map-north" aria-hidden="true">N<br />↑</span>
      <span className="geoai-print-map-scale" aria-hidden="true">1 km context</span>

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
          <span>{coordinateText}</span>
        </div>
        <em>{geometryLabel ?? "Screening geometry context; official map and cadastral validation required"}</em>
      </div>
    </div>
  );
}
