import { TextSafeValue } from "@/components/dashboard/text-safe";

type BiScoreGaugeProps = {
  score: number;
  label: string;
  summary: string;
  detail?: string;
};

export function BiScoreGauge({ score, label, summary, detail }: BiScoreGaugeProps) {
  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (boundedScore / 100) * circumference;
  const showDetail = Boolean(detail && detail.trim() && detail.trim() !== summary.trim());

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-md border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="relative h-[112px] w-[112px] shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
          <circle cx="56" cy="56" r={radius} stroke="#eef2f1" strokeWidth="12" fill="none" />
          <circle
            cx="56"
            cy="56"
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
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">/100</span>
        </div>
      </div>
      <div className="min-w-0">
        <TextSafeValue className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {label}
        </TextSafeValue>
        <TextSafeValue className="mt-2 text-sm leading-6 text-ink">
          {summary}
        </TextSafeValue>
        {showDetail ? (
          <details className="mt-2 rounded-md border border-line bg-surface px-3 py-2">
            <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Details
            </summary>
            <TextSafeValue className="mt-2 border-t border-line pt-2 text-xs leading-5 text-muted">
              {detail}
            </TextSafeValue>
          </details>
        ) : null}
      </div>
    </article>
  );
}
