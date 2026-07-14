"use client";

import { useRef, useState } from "react";
import { useAccessibleModal } from "@/components/use-accessible-modal";
import type { SpatialAttributionPayload } from "@/src/lib/spatial-b2/attribution";

type SpatialDataAttributionProps = {
  payload: SpatialAttributionPayload;
  fallbackReason?: string | null;
  hasSelectedLineage: boolean;
  onOpenLineage: (returnFocusTo: HTMLElement | null) => void;
};

export function SpatialDataAttribution({
  payload,
  fallbackReason = null,
  hasSelectedLineage,
  onOpenLineage
}: SpatialDataAttributionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusOnCloseRef = useRef(true);
  const closeModal = () => setIsExpanded(false);
  const dialogRef = useAccessibleModal({
    open: isExpanded,
    onClose: closeModal,
    returnFocusTo: openerRef.current,
    returnFocusOnCloseRef
  });

  function openModal() {
    returnFocusOnCloseRef.current = true;
    setIsExpanded(true);
  }

  return (
    <div
      className="absolute bottom-[72px] left-5 right-5 z-30 flex flex-col items-center justify-center gap-1.5"
      onClick={(event) => event.stopPropagation()}
      data-spatial-attribution
      data-spatial-basemap-mode={payload.basemapMode}
    >
      {fallbackReason ? (
        <p className="max-w-[calc(100vw-40px)] truncate rounded-md border border-[#f0d7a4] bg-[#fff9ec]/95 px-2.5 py-1 text-[10px] font-semibold text-[#775611] shadow-soft" data-spatial-fallback-chip title={fallbackReason}>
          Synthetic fallback active
        </p>
      ) : null}
      <button
        ref={openerRef}
        type="button"
        onClick={openModal}
        aria-haspopup="dialog"
        aria-expanded={isExpanded}
        className="inline-flex h-9 max-w-[calc(100vw-40px)] items-center gap-2 whitespace-nowrap rounded-md border border-white/80 bg-white/95 px-3 text-[11px] font-semibold text-ink shadow-soft backdrop-blur transition hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        data-spatial-attribution-chip="collapsed"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
        <span className="truncate">{payload.compactLabel}</span>
      </button>

      {isExpanded ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
          data-spatial-attribution-backdrop
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Data Licences and source attribution"
            tabIndex={-1}
            className="max-h-[78svh] w-full overflow-y-auto rounded-t-lg border border-line bg-white p-4 shadow-soft sm:w-[380px] sm:max-h-[min(520px,calc(100vh-120px))] sm:rounded-lg"
            data-spatial-attribution-details="expanded"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Data Licences</p>
                <h2 className="mt-1 text-sm font-semibold text-ink">Active map sources</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close data licences"
                data-modal-initial-focus
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-lg leading-none text-muted transition hover:border-brand hover:text-ink"
              >
                X
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              {payload.basemapAttribution ? (
                <article className="rounded-md border border-line bg-surface px-3 py-2" data-spatial-basemap-attribution={payload.basemapMode}>
                  <p className="text-xs font-semibold text-ink">{payload.basemapAttribution.sourceName}</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted">{payload.basemapAttribution.notice}</p>
                  {payload.basemapAttribution.attributionUrl ? (
                    <a href={payload.basemapAttribution.attributionUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-semibold text-brand underline">
                      Basemap attribution
                    </a>
                  ) : null}
                </article>
              ) : (
                <article className="rounded-md border border-line bg-surface px-3 py-2" data-spatial-basemap-attribution="none">
                  <p className="text-xs font-semibold text-ink">GeoAI fallback grid</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted">No external basemap is rendered in this state.</p>
                </article>
              )}

              {payload.overlayAttributions.map((record) => (
                <article key={record.id} className="rounded-md border border-line bg-white px-3 py-2" data-spatial-attribution-id={record.id}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-ink">{record.sourceName}</p>
                    <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase text-muted">
                      {record.kind.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-muted">{record.notice}</p>
                  {record.datasetId ? (
                    <p className="mt-1 text-[10px] leading-4 text-muted">
                      {record.datasetId} · {record.datasetVersion} · accessed {record.accessedAt}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-brand">
                    {record.attributionUrl ? <a href={record.attributionUrl} target="_blank" rel="noreferrer">Attribution</a> : null}
                    {record.licenseUrl ? <a href={record.licenseUrl} target="_blank" rel="noreferrer">Licence</a> : null}
                  </div>
                </article>
              ))}
            </div>

            {hasSelectedLineage ? (
              <button
                type="button"
                onClick={() => {
                  returnFocusOnCloseRef.current = false;
                  setIsExpanded(false);
                  onOpenLineage(openerRef.current);
                }}
                className="mt-3 h-9 w-full rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#0f4253]"
              >
                Selected feature lineage
              </button>
            ) : null}

            <p className="mt-3 text-[10px] leading-4 text-muted">{payload.caveat}</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
