import { TextSafeValue } from "@/components/dashboard/text-safe";
import type { DashboardTone } from "@/src/lib/dashboard/dashboard-model";

type BiKpiCardProps = {
  label: string;
  value: string;
  unit?: string;
  tone: DashboardTone;
  explanation?: string;
};

const toneClasses: Record<DashboardTone, string> = {
  positive: "border-[#bddbd3] bg-[#edf7f4]",
  neutral: "border-line bg-white",
  warning: "border-[#ead28a] bg-[#fff8db]",
  critical: "border-[#efc0ad] bg-[#fff4ed]"
};

export function BiKpiCard({ label, value, unit, tone, explanation }: BiKpiCardProps) {
  return (
    <article className={`min-w-[140px] rounded-md border px-3 py-2.5 ${toneClasses[tone]}`}>
      <TextSafeValue wrap="normal" className="text-[11px] font-semibold uppercase leading-4 text-muted">
        {label}
      </TextSafeValue>
      <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-1">
        <TextSafeValue as="span" wrap="normal" className="text-lg font-semibold leading-6 text-ink">
          {value}
        </TextSafeValue>
        {unit ? (
          <TextSafeValue as="span" wrap="normal" className="text-xs font-semibold leading-5 text-muted">
            {unit}
          </TextSafeValue>
        ) : null}
      </div>
      {explanation ? (
        <details className="mt-2 rounded-md border border-white/70 bg-white/70 px-2 py-1.5">
          <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase leading-4 text-muted">
            Details
          </summary>
          <TextSafeValue className="mt-1 border-t border-line/70 pt-1.5 text-[11px] leading-4 text-muted">
            {explanation}
          </TextSafeValue>
        </details>
      ) : null}
    </article>
  );
}
