"use client";

import { getDataSourceById } from "@/src/data/data-source-registry";
import type { EvidenceItem } from "@/src/types/data-source";

type EvidenceSourceCardsProps = {
  evidence: EvidenceItem[];
  compact?: boolean;
};

function sourceTypeLabel(sourceType: EvidenceItem["sourceType"]) {
  const labels: Record<EvidenceItem["sourceType"], string> = {
    mock: "Demo",
    open_data: "Open data",
    official: "Official",
    commercial: "Commercial",
    customer: "Customer"
  };

  return labels[sourceType];
}

function statusTone(status: EvidenceItem["sourceStatus"]) {
  if (status === "connected") return "bg-[#eaf3f1] text-brand";
  if (status === "mock") return "bg-[#eef2f5] text-muted";
  if (status === "planned") return "bg-[#fff8db] text-[#8a6a12]";
  return "bg-[#fff4ed] text-[#9f3412]";
}

export function EvidenceSourceCards({ evidence, compact = false }: EvidenceSourceCardsProps) {
  return (
    <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
      {evidence.map((item) => {
        const source = getDataSourceById(item.sourceId);

        return (
          <article key={item.id} className="rounded-md border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusTone(item.sourceStatus)}`}>
                {sourceTypeLabel(item.sourceType)}
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted">
                {item.sourceStatus}
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted">
                {source?.reliabilityLevel ?? item.confidence} reliability
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-ink">{item.label}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
            <div className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
              <p className="font-semibold text-ink">{source?.name ?? item.sourceId}</p>
              <p>{source?.provider ?? "Source provider unavailable"}</p>
              <p className="mt-2">{source?.licenseNote.note ?? "No source note available."}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
