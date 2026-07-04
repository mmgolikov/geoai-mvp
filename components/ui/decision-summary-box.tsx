import { TextSafeValue } from "@/components/dashboard/text-safe";

export function DecisionSummaryBox({
  title = "Decision Summary",
  decision,
  reason,
  validationNeed,
  nextAction,
  badge = "Conditional",
  className = ""
}: {
  title?: string;
  decision: string;
  reason: string;
  validationNeed: string;
  nextAction: string;
  badge?: string;
  className?: string;
}) {
  const rows = [
    ["Why", reason],
    ["Validation need", validationNeed],
    ["Next action", nextAction]
  ];

  return (
    <div className={`rounded-md border border-[#e7d49a] bg-[#fff9e8] p-4 ${className}`}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <TextSafeValue as="h3" className="text-sm font-semibold text-ink">
            {title}
          </TextSafeValue>
          <TextSafeValue className="mt-1 text-sm leading-6 text-muted">
            {decision}
          </TextSafeValue>
        </div>
        <TextSafeValue as="span" className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
          {badge}
        </TextSafeValue>
      </div>
      <dl className="mt-3 grid gap-2 text-sm md:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-md bg-white/76 p-3">
            <TextSafeValue as="dt" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              {label}
            </TextSafeValue>
            <TextSafeValue as="dd" className="mt-1 text-ink">
              {value}
            </TextSafeValue>
          </div>
        ))}
      </dl>
    </div>
  );
}
