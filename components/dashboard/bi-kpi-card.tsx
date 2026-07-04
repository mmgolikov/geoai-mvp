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
    <article className={`min-w-0 rounded-md border px-3 py-3 ${toneClasses[tone]}`}>
      <TextSafeValue className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </TextSafeValue>
      <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-1">
        <TextSafeValue as="span" className="text-lg font-semibold leading-6 text-ink">
          {value}
        </TextSafeValue>
        {unit ? (
          <TextSafeValue as="span" className="text-xs font-semibold leading-5 text-muted">
            {unit}
          </TextSafeValue>
        ) : null}
      </div>
      {explanation ? (
        <TextSafeValue className="mt-2 text-[11px] leading-4 text-muted">
          {explanation}
        </TextSafeValue>
      ) : null}
    </article>
  );
}
