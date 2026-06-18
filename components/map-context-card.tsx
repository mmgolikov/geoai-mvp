"use client";

import { ReportMapPreview } from "@/components/report-map-preview";
import type { ComparisonResult, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";

type MapContextCardProps = {
  title: string;
  subtitle: string;
  selectedPoint?: SelectedPoint | null;
  selectedObject?: SelectedDemoObject | null;
  comparison?: ComparisonResult;
  compact?: boolean;
  reportMode?: boolean;
};


export function MapContextCard({
  title,
  subtitle,
  selectedPoint = null,
  selectedObject = null,
  comparison,
  compact = false,
  reportMode = false
}: MapContextCardProps) {
  const mapHeightClass = compact
    ? "min-h-[220px]"
    : reportMode
      ? "min-h-[300px] print:h-[220px] print:min-h-[220px] print:flex-none"
      : "min-h-[280px]";

  return (
    <section className="flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm print:h-auto print:min-h-0 print:shadow-none">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted">{subtitle}</p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
          Map context
        </span>
      </div>
      <div className={`relative h-full min-h-0 w-full flex-1 overflow-hidden bg-[#dfe8ec] ${mapHeightClass}`}>
        <ReportMapPreview
          selectedPoint={selectedPoint}
          selectedObject={selectedObject}
          comparison={comparison}
          compact={compact || reportMode}
        />
      </div>
      <div className="shrink-0 border-t border-line bg-white px-4 py-2 text-xs leading-5 text-muted">
        Demo spatial context only. Synthetic geometries are not official GIS, parcel, planning, or risk boundaries.
      </div>
    </section>
  );
}
