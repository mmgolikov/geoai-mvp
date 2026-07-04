import {
  deriveDataConfidenceLevel,
  getDataMaturityDefinition,
  getSourceMaturity,
  sourceReadinessMatrix
} from "@/src/data/data-maturity";
import type { DataSource, EvidenceItem } from "@/src/types/data-source";

export function DataMaturityBadge({ source }: { source: DataSource | null }) {
  const maturity = getDataMaturityDefinition(getSourceMaturity(source));

  return (
    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${maturity.badgeClassName}`}>
      {maturity.label}
    </span>
  );
}

export function SourceStatusBadge({ source }: { source: DataSource | null }) {
  const status = source?.integrationStatus ?? "planned";
  const label = status === "active_demo" ? "sample active" : status.replace(/_/g, " ");
  const tone = status === "active_demo"
    ? "bg-[#eef2f5] text-muted"
    : status === "official_ready"
      ? "bg-[#fff8db] text-[#8a6a12]"
      : status === "requires_license" || status === "requires_access"
        ? "bg-[#fff4ed] text-[#9f3412]"
        : "bg-surface text-muted";

  return (
    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

export function DataReadinessCard({ source, compact = false }: { source: DataSource; compact?: boolean }) {
  return (
    <article className={`rounded-lg border border-line bg-white ${compact ? "p-3" : "p-4"} shadow-sm`}>
      <div className="flex flex-wrap items-center gap-2">
        <DataMaturityBadge source={source} />
        <SourceStatusBadge source={source} />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink">{source.name}</h3>
      <p className="mt-2 text-xs leading-5 text-muted">{source.usageInGeoAI}</p>
      {!compact ? (
        <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
          {source.recommendedNextStep}
        </p>
      ) : null}
    </article>
  );
}

export function SourceReadinessMatrix({ limit }: { limit?: number }) {
  const rows = typeof limit === "number" ? sourceReadinessMatrix.slice(0, limit) : sourceReadinessMatrix;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="grid grid-cols-[1.2fr_0.9fr_1fr_0.6fr_1.2fr] border-b border-line bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        <span>Source</span>
        <span>Category</span>
        <span>Status</span>
        <span>Used?</span>
        <span>Validation role</span>
      </div>
      {rows.map((row) => (
        <div key={row.sourceId} className="grid grid-cols-[1.2fr_0.9fr_1fr_0.6fr_1.2fr] gap-3 border-b border-line px-4 py-3 text-sm last:border-b-0">
          <span className="font-semibold text-ink">{row.source}</span>
          <span className="text-muted">{row.category}</span>
          <span className="text-muted">{row.currentStatus}</span>
          <span className="font-semibold text-ink">{row.usedNow}</span>
          <span className="text-muted">{row.validationRole}</span>
        </div>
      ))}
    </div>
  );
}

export function ValidationRequirementList({ evidence }: { evidence: EvidenceItem[] }) {
  const confidence = deriveDataConfidenceLevel(evidence);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Data Confidence / Validation Path</h2>
          <p className="mt-1 text-sm text-muted">{confidence}</p>
        </div>
        <span className="rounded-full bg-[#fff8db] px-3 py-1 text-xs font-semibold text-[#8a6a12]">
          Not decision-grade
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Used in this prototype", "Synthetic sample layers, seed_static market context and deterministic scoring."],
          ["Required for official validation", "DLD, Dubai Pulse, Dubai Municipality / GeoDubai and official planning evidence."],
          ["Pilot integration path", "Connect permitted official/open/customer sources through adapter interfaces and QA checks."],
          ["Remaining limitations", "Current outputs are sample/open screening context and require validation before underwriting or development decisions."]
        ].map(([title, text]) => (
          <div key={title} className="rounded-md border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
