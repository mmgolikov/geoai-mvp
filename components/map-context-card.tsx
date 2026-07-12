"use client";

import { ReportMapPreview } from "@/components/report-map-preview";
import { ReportMapSnapshot } from "@/components/reports/report-map-snapshot";
import { userDrawnAoiSourceLabel } from "@/src/lib/aoi-library";
import type { ReportMapSnapshot as ReportMapSnapshotValue } from "@/src/lib/report-map-snapshot";
import type { AnalysisTarget, ComparisonResult, SelectedDemoObject, SelectedPoint, UserDrawnAoi } from "@/src/types/geo";

type MapContextCardProps = {
  title: string;
  subtitle: string;
  selectedPoint?: SelectedPoint | null;
  selectedObject?: SelectedDemoObject | null;
  selectedAoi?: UserDrawnAoi | null;
  analysisTarget?: AnalysisTarget | null;
  comparison?: ComparisonResult;
  compact?: boolean;
  reportMode?: boolean;
  viewportLocked?: boolean;
  mapSnapshot?: ReportMapSnapshotValue | null;
};


export function MapContextCard({
  title,
  subtitle,
  selectedPoint = null,
  selectedObject = null,
  selectedAoi = null,
  analysisTarget = null,
  comparison,
  compact = false,
  reportMode = false,
  viewportLocked = false,
  mapSnapshot = null
}: MapContextCardProps) {
  const contextNote = selectedAoi
    ? `${userDrawnAoiSourceLabel(selectedAoi)} is screening context only; official parcel, zoning, cadastral, planning and ownership validation is required.`
    : analysisTarget?.type === "user-drawn-aoi"
    ? "User-drawn AOI is screening context only; official parcel, zoning, cadastral, planning and ownership validation is required."
    : analysisTarget?.type === "uploaded-feature"
    ? "Selected geometry is user-uploaded screening context; official validation is required before decisions."
    : analysisTarget?.type === "demo-feature"
      ? "Selected geometry is sample/open context; official validation is required before decisions."
      : "Sample/open spatial context only. Synthetic geometries are not official GIS, parcel, planning, or risk boundaries.";
  const mapHeightClass = viewportLocked
    ? "min-h-0"
    : compact
    ? "min-h-[220px]"
    : reportMode
      ? "min-h-[300px] print:h-[220px] print:min-h-[220px] print:flex-none"
      : "min-h-[280px]";
  const sectionHeightClass = viewportLocked ? "min-h-0" : "min-h-[420px]";
  const headerPaddingClass = viewportLocked ? "px-3 py-2" : "px-4 py-3";
  const footerPaddingClass = viewportLocked ? "px-3 py-1.5" : "px-4 py-2";

  return (
    <section className={`flex h-full ${sectionHeightClass} w-full flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm print:h-auto print:min-h-0 print:shadow-none`}>
      <div className={`flex shrink-0 items-center justify-between gap-3 border-b border-line ${headerPaddingClass}`}>
        <div>
          <h2 className={`${viewportLocked ? "text-base" : "text-lg"} font-semibold text-ink`}>{title}</h2>
          <p className={`${viewportLocked ? "mt-0.5 text-xs leading-5" : "mt-1 text-sm leading-5"} text-muted`}>{subtitle}</p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
          Map context
        </span>
      </div>
      <div className={`relative h-full min-h-0 w-full flex-1 overflow-hidden bg-[#dfe8ec] ${mapHeightClass}`}>
        {mapSnapshot ? (
          <ReportMapSnapshot snapshot={mapSnapshot} className="h-full rounded-none border-0" />
        ) : (
          <ReportMapPreview
            selectedPoint={selectedPoint}
            selectedObject={selectedObject}
            selectedAoi={selectedAoi}
            analysisTarget={analysisTarget}
            comparison={comparison}
            compact={compact || reportMode}
          />
        )}
      </div>
      <div className={`shrink-0 border-t border-line bg-white text-xs leading-5 text-muted ${footerPaddingClass}`}>
        {contextNote}
      </div>
    </section>
  );
}
