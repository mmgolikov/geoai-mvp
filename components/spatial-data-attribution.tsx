"use client";

import { useEffect, useState } from "react";
import type { SpatialAttributionPayload } from "@/src/lib/spatial-b2/attribution";

type SpatialDataAttributionProps = {
  payload: SpatialAttributionPayload;
  hasSelectedLineage: boolean;
  onOpenLineage: () => void;
};

export function SpatialDataAttribution({
  payload,
  hasSelectedLineage,
  onOpenLineage
}: SpatialDataAttributionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isExpanded]);

  return (
    <div
      className="absolute bottom-[72px] left-5 right-5 z-30 flex justify-center"
      onClick={(event) => event.stopPropagation()}
      data-spatial-attribution
    >
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        aria-haspopup="dialog"
        aria-expanded={isExpanded}
        className="inline-flex h-9 max-w-[calc(100vw-40px)] items-center gap-2 whitespace-nowrap rounded-md border border-white/80 bg-white/95 px-3 text-[11px] font-semibold text-ink shadow-soft backdrop-blur transition hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        data-spatial-attribution-chip="collapsed"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
        <span className="truncate">{payload.compactLabel}</span>
      </button>

      {isExpanded ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/20 p-0 sm:absolute sm:inset-auto sm:bottom-12 sm:left-1/2 sm:w-[380px] sm:-translate-x-1/2 sm:items-stretch sm:bg-transparent sm:p-0">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Data Licences and source attribution"
            className="max-h-[78svh] w-full overflow-y-auto rounded-t-lg border border-line bg-white p-4 shadow-soft sm:max-h-[min(520px,calc(100vh-120px))] sm:rounded-lg"
            data-spatial-attribution-details="expanded"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Data Licences</p>
                <h2 className="mt-1 text-sm font-semibold text-ink">Active map sources</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                aria-label="Close data licences"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-lg leading-none text-muted transition hover:border-brand hover:text-ink"
              >
                X
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              <article className="rounded-md border border-line bg-surface px-3 py-2">
                <p className="text-xs font-semibold text-ink">{payload.basemapAttribution.sourceName}</p>
                <p className="mt-1 text-[11px] leading-4 text-muted">{payload.basemapAttribution.notice}</p>
                {payload.basemapAttribution.attributionUrl ? (
                  <a
                    href={payload.basemapAttribution.attributionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-[11px] font-semibold text-brand underline"
                  >
                    Basemap attribution
                  </a>
                ) : null}
              </article>

              {payload.overlayAttributions.map((record) => (
                <article key={record.id} className="rounded-md border border-line bg-white px-3 py-2">
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
                  setIsExpanded(false);
                  onOpenLineage();
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
