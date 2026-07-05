import { EvidenceSourceCards } from "@/components/evidence-source-cards";
import { BiScoreBar } from "@/components/dashboard/bi-score-bars";
import { TextSafeValue } from "@/components/dashboard/text-safe";
import type {
  DashboardInsightModule,
  DashboardMatrixItem,
  DashboardTone
} from "@/src/lib/dashboard/dashboard-model";
import type { ExpressAnalysis } from "@/src/types/geo";

type BiDrilldownModuleProps = {
  module: DashboardInsightModule;
  matrix: DashboardMatrixItem[];
  evidence: ExpressAnalysis["evidence"];
};

const toneClasses: Record<DashboardTone, string> = {
  positive: "border-[#bddbd3] bg-[#edf7f4] text-brand",
  neutral: "border-line bg-white text-ink",
  warning: "border-[#ead28a] bg-[#fff8db] text-[#7a5a00]",
  critical: "border-[#efc0ad] bg-[#fff4ed] text-[#9f3412]"
};

function MatrixPlot({ items }: { items: DashboardMatrixItem[] }) {
  return (
    <div className="relative rounded-md border border-line bg-white p-4">
      <div className="grid min-h-[260px] grid-cols-2 grid-rows-2 rounded-md border border-line">
        <div className="border-b border-r border-line bg-[#edf7f4]" />
        <div className="border-b border-line bg-[#fff8db]" />
        <div className="border-r border-line bg-surface" />
        <div className="bg-[#fff4ed]" />
      </div>
      <span className="absolute left-4 top-1 text-[11px] font-semibold text-muted">Higher urgency</span>
      <span className="absolute bottom-1 right-4 text-[11px] font-semibold text-muted">Higher upside</span>
      {items.map((item) => (
        <div
          key={item.id}
          className={`absolute max-w-[132px] rounded-md border px-2 py-1 text-[10px] font-semibold leading-4 shadow-sm ${toneClasses[item.tone]}`}
          style={{
            left: `calc(${item.x}% - 54px)`,
            bottom: `calc(${item.y}% - 18px)`
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

export function BiDrilldownModule({ module, matrix, evidence }: BiDrilldownModuleProps) {
  return (
    <details className="rounded-lg border border-line bg-white p-4 shadow-sm" open={module.defaultOpen}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <TextSafeValue className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              {module.subtitle}
            </TextSafeValue>
            <TextSafeValue as="h2" className="mt-1 text-lg font-semibold text-ink">
              {module.title}
            </TextSafeValue>
            <TextSafeValue className="mt-1 text-sm leading-6 text-muted">
              {module.summary}
            </TextSafeValue>
          </div>
          <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
            {module.items.length} item{module.items.length === 1 ? "" : "s"}
          </span>
        </div>
      </summary>
      {module.type === "risk_matrix" ? (
        <div className="mt-4">
          <MatrixPlot items={matrix} />
        </div>
      ) : module.type === "evidence_summary" ? (
        <div className="mt-4">
          <EvidenceSourceCards evidence={evidence} />
        </div>
      ) : module.type === "next_actions" ? (
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {module.items.map((item, index) => (
            <li key={item.id} className="flex min-w-0 gap-3 rounded-md border border-line bg-surface p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand">
                {index + 1}
              </span>
              <span className="min-w-0">
                <TextSafeValue as="span" className="block text-sm font-semibold leading-5 text-ink">
                  {item.label}
                </TextSafeValue>
                <TextSafeValue as="span" className="mt-1 block text-xs leading-5 text-muted">
                  {item.detail}
                </TextSafeValue>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {module.items.map((item) => (
            <BiScoreBar key={item.id} item={item} />
          ))}
        </div>
      )}
    </details>
  );
}
