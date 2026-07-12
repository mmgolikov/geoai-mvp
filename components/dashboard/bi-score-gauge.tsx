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
    <article
      className="grid h-full min-h-[252px] min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] rounded-md border border-line bg-white p-3 text-center shadow-sm"
      data-dashboard-card="suitability"
    >
      <TextSafeValue wrap="normal" className="text-xs font-semibold uppercase leading-4 text-muted">
        {label}
      </TextSafeValue>
      <div className="flex min-h-0 flex-col items-center justify-center py-2">
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
            <span className="text-3xl font-semibold text-brand" data-dashboard-value="suitability">{boundedScore}</span>
            <span className="text-[10px] font-semibold uppercase text-muted">/100</span>
          </div>
        </div>
        <div className="mt-1 flex flex-nowrap justify-center gap-1.5">
          <span className="whitespace-nowrap rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-brand" data-dashboard-value="confidence">
            {confidenceLabel}
          </span>
          <span className="whitespace-nowrap rounded-full bg-[#fff8db] px-2 py-1 text-[11px] font-semibold text-[#8a6a12]" data-dashboard-value="validation">
            {validationLabel}
          </span>
        </div>
      </div>
      {showDetail ? (
        <details className="w-full rounded-md border border-line bg-white px-3 text-left" data-dashboard-control="details">
          <summary className="flex h-9 cursor-pointer list-none items-center text-[11px] font-semibold uppercase leading-4 text-muted">
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
