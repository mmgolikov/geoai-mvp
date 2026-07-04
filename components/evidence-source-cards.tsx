"use client";

import { DataMaturityBadge, SourceStatusBadge } from "@/components/data-readiness";
import { getDataSourceById } from "@/src/data/data-source-registry";
import type { EvidenceItem } from "@/src/types/data-source";

type EvidenceSourceCardsProps = {
  evidence: EvidenceItem[];
  compact?: boolean;
};

function sourceTypeLabel(sourceType: EvidenceItem["sourceType"]) {
  const labels: Record<EvidenceItem["sourceType"], string> = {
    mock: "Sample",
    demo: "Sample",
    open_data: "Open data",
    open_geospatial: "Open geo",
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

function reliabilityLabel(value?: string) {
  if (!value) return "validation required";
  return value === "demo" ? "sample" : value;
}

export function EvidenceSourceCards({ evidence, compact = false }: EvidenceSourceCardsProps) {
  return (
    <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-2"}`}>
      {evidence.map((item) => {
        const source = getDataSourceById(item.sourceId);

        return (
          <article key={item.id} className="flex min-h-[220px] flex-col rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusTone(item.sourceStatus)}`}>
                {sourceTypeLabel(item.sourceType)}
              </span>
              <DataMaturityBadge source={source} />
              <SourceStatusBadge source={source} />
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted">
                {reliabilityLabel(source?.reliabilityLevel ?? item.confidence)} reliability
              </span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-ink">{item.label}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted">{item.description}</p>
            <div className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">
              <p className="font-semibold text-ink">{source?.name ?? item.sourceId}</p>
              <p>{source?.provider ?? "Source provider unavailable"}</p>
              <p className="mt-2">{source?.usageInGeoAI ?? "Evidence source context for current or planned validation."}</p>
              <p className="mt-2">{source?.licenseNote.note ?? "No source note available."}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
