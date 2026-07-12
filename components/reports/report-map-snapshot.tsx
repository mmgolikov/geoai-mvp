import type { ReportMapSnapshot as ReportMapSnapshotValue } from "@/src/lib/report-map-snapshot";

export function ReportMapSnapshot({
  snapshot,
  className = ""
}: {
  snapshot: ReportMapSnapshotValue;
  className?: string;
}) {
  return (
    <figure
      className={`overflow-hidden rounded-md border border-line bg-[#dfe8ec] ${className}`}
      data-map-snapshot="captured"
      data-map-snapshot-width={snapshot.width}
      data-map-snapshot-height={snapshot.height}
    >
      {/* Dynamic data URLs and committed local captures are intentionally rendered without optimization. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={snapshot.src}
        alt={`Captured map context for ${snapshot.targetLabel}`}
        width={snapshot.width}
        height={snapshot.height}
        className="block h-auto w-full object-cover"
      />
      <figcaption className="border-t border-line bg-white px-3 py-2 text-xs leading-5 text-muted">
        Captured rendered map context for {snapshot.targetLabel}. Screening geometry; official validation required.
      </figcaption>
    </figure>
  );
}
