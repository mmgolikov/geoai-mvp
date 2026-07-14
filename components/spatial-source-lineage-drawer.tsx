"use client";

import { useEffect } from "react";
import type { SpatialSelectionLineage } from "@/src/lib/spatial-b2/selection-lineage";

type SpatialSourceLineageDrawerProps = {
  objectName: string;
  lineage: SpatialSelectionLineage;
  onClose: () => void;
};

function LineageSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-line bg-white px-3 py-2.5">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{title}</h3>
      <div className="mt-1 text-xs leading-5 text-ink">{children}</div>
    </section>
  );
}

export function SpatialSourceLineageDrawer({
  objectName,
  lineage,
  onClose
}: SpatialSourceLineageDrawerProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/20 sm:items-stretch sm:justify-end"
      onClick={(event) => event.stopPropagation()}
      data-spatial-lineage-drawer="open"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Source lineage for ${objectName}`}
        className="max-h-[88svh] w-full overflow-y-auto rounded-t-lg border border-line bg-surface p-4 shadow-soft sm:h-full sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-lg"
      >
        <div className="sticky top-0 z-10 -mx-1 flex items-start justify-between gap-3 bg-surface px-1 pb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Source Lineage</p>
            <h2 className="mt-1 truncate text-base font-semibold text-ink">{objectName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close source lineage"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-white text-sm font-semibold text-muted transition hover:border-brand hover:text-ink"
          >
            X
          </button>
        </div>

        <div className="grid gap-2">
          <LineageSection title="1. Object identity">
            <p className="font-semibold">{objectName}</p>
            <p className="mt-1 break-all text-muted">{lineage.canonicalFeatureKey}</p>
          </LineageSection>

          <LineageSection title="2. Geometry source">
            <p>{lineage.geometryOrigin.replace(/_/g, " ")} · {lineage.geometryAccuracy.replace(/_/g, " ")}</p>
            <p className="mt-1 text-muted">Layer: {lineage.layerKey}</p>
          </LineageSection>

          <LineageSection title="3. Dataset and snapshot">
            <p className="break-all">{lineage.datasetId}</p>
            <p className="mt-1 text-muted">Version: {lineage.datasetVersion}</p>
            <p className="mt-1 break-all text-muted">Checksum: {lineage.bundleChecksum}</p>
          </LineageSection>

          <LineageSection title="4. Provider IDs and aliases">
            <p>Provider: {lineage.providerId}</p>
            {lineage.sourceAliases.length ? (
              <ul className="mt-1 grid gap-1 text-muted">
                {lineage.sourceAliases.map((alias) => (
                  <li key={`${alias.sourceId}:${alias.sourceFeatureId}`} className="break-all">
                    {alias.sourceId}: {alias.sourceFeatureId}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-1 text-muted">No source aliases recorded.</p>}
          </LineageSection>

          <LineageSection title="5. Source freshness">
            <p>{lineage.freshnessStatus}</p>
            <p className="mt-1 text-muted">Updated: {lineage.sourceUpdatedAt ?? "Not claimed for this fixture"}</p>
          </LineageSection>

          <LineageSection title="6. Review and quality state">
            <p>{lineage.reviewStatus.replace(/_/g, " ")}</p>
            <p className="mt-1 text-muted">{lineage.qualitySummary}</p>
          </LineageSection>

          <LineageSection title="7. Attribution">
            <p>{lineage.attributionIds.join(", ") || "No external overlay attribution active."}</p>
            {lineage.sourceAttributions.map((notice) => <p key={notice} className="mt-1 text-muted">{notice}</p>)}
          </LineageSection>

          <LineageSection title="8. Limitations and required validation">
            <ul className="grid gap-1 text-muted">
              {lineage.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
            </ul>
            <p className="mt-2 font-medium text-ink">{lineage.caveat}</p>
          </LineageSection>

          <LineageSection title="9. Source mode and fallback state">
            <p>{lineage.sourceMode.replace(/_/g, " ")}</p>
            <p className="mt-1 text-muted">{lineage.fallbackState.replace(/_/g, " ")}</p>
            <p className="mt-1 break-all text-muted">Fallback: {lineage.fallbackLayerKey}</p>
          </LineageSection>
        </div>
      </aside>
    </div>
  );
}
