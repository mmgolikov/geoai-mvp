import type { ReportMapSnapshot as ReportMapSnapshotValue } from "@/src/lib/report-map-snapshot";

export function ReportMapSnapshot({
  snapshot,
  className = ""
}: {
  snapshot: ReportMapSnapshotValue;
  className?: string;
}) {
  const attributionRecords = snapshot.attribution
    ? [snapshot.attribution.basemapAttribution, ...snapshot.attribution.overlayAttributions].filter(
        (record): record is NonNullable<typeof record> => record !== null
      )
    : [];

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
        <p>Captured rendered map context for {snapshot.targetLabel}. Screening geometry; official validation required.</p>
        {attributionRecords.length > 0 ? (
          <div className="mt-1" data-map-snapshot-attribution>
            <p>Map/data sources: {attributionRecords.map((record) => record.sourceName).join(", ")}.</p>
            {attributionRecords.map((record) => (
              <p key={record.id}>
                {record.notice}{" "}
                {record.attributionUrl ? (
                  <a className="font-semibold text-brand underline" href={record.attributionUrl} target="_blank" rel="noreferrer">
                    Attribution
                  </a>
                ) : null}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-1 font-semibold text-warning">Map source attribution unavailable; do not distribute this export.</p>
        )}
      </figcaption>
    </figure>
  );
}
