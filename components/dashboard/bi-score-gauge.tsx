import { TextSafeValue } from "@/components/dashboard/text-safe";

type BiScoreGaugeProps = {
  score: number;
  label: string;
  summary: string;
  detail?: string;
  confidenceLabel?: string;
  validationLabel?: string;
};

export function BiScoreGauge({
  score,
  label,
  summary,
  detail,
  confidenceLabel = "Medium",
  validationLabel = "Validation required"
}: BiScoreGaugeProps) {
  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (boundedScore / 100) * circumference;
  const showDetail = Boolean(detail && detail.trim() && detail.trim() !== summary.trim());

  return (
    <article className="flex h-full min-w-[220px] flex-col items-center rounded-md border border-line bg-white p-3 text-center shadow-sm">
      <div className="relative h-[104px] w-[104px] shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 104 104" aria-hidden="true">
          <circle cx="52" cy="52" r={radius} stroke="#eef2f1" strokeWidth="12" fill="none" />
          <circle
            cx="52"
            cy="52"
            r={radius}
            stroke="#1f5b67"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-brand">{boundedScore}</span>
          <span className="text-[10px] font-semibold uppercase text-muted">/100</span>
        </div>
      </div>
      <TextSafeValue wrap="normal" className="mt-2 text-xs font-semibold uppercase leading-4 text-muted">
        {label}
      </TextSafeValue>
      <div className="mt-1 flex items-baseline justify-center gap-1">
        <span className="text-xl font-semibold leading-6 text-ink">{boundedScore}</span>
        <span className="text-xs font-semibold text-muted">/100</span>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        <TextSafeValue as="span" wrap="normal" className="rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-brand">
          {confidenceLabel}
        </TextSafeValue>
        <TextSafeValue as="span" wrap="normal" className="rounded-full bg-[#fff8db] px-2 py-1 text-[11px] font-semibold text-[#8a6a12]">
          {validationLabel}
        </TextSafeValue>
      </div>
      {showDetail ? (
        <details className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 text-left">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase leading-4 text-muted">
            Details
          </summary>
          <TextSafeValue className="mt-2 border-t border-line pt-2 text-xs leading-5 text-muted">
            {detail}
          </TextSafeValue>
        </details>
      ) : null}
    </article>
  );
}
