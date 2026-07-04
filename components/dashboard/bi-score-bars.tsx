import { TextSafeValue } from "@/components/dashboard/text-safe";
import type { DashboardDriver } from "@/src/lib/dashboard/dashboard-model";

type BiScoreBarProps = {
  item: DashboardDriver;
  compact?: boolean;
};

function boundedScore(value?: number) {
  return Math.max(0, Math.min(100, Math.round(value ?? 60)));
}

function barTone(item: DashboardDriver) {
  if (item.type === "risk" || item.type === "validation") {
    return "bg-[#c75f2d]";
  }

  return "bg-brand";
}

export function BiScoreBar({ item, compact = false }: BiScoreBarProps) {
  const score = boundedScore(item.score);

  return (
    <article className={`min-w-0 rounded-md border border-line bg-white ${compact ? "p-3" : "p-4"}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <TextSafeValue className="text-xs font-semibold leading-5 text-ink">
          {item.label}
        </TextSafeValue>
        <span className="shrink-0 text-xs font-black text-ink">{score}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-surface">
        <div className={`h-full rounded-full ${barTone(item)}`} style={{ width: `${score}%` }} />
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Details
        </summary>
        <TextSafeValue className="mt-1 text-xs leading-5 text-muted">
          {item.detail}
        </TextSafeValue>
      </details>
    </article>
  );
}

type BiScoreBarsProps = {
  title: string;
  items: DashboardDriver[];
  emptyLabel: string;
};

export function BiScoreBars({ title, items, emptyLabel }: BiScoreBarsProps) {
  return (
    <section className="grid min-w-0 content-start gap-2">
      <TextSafeValue className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {title}
      </TextSafeValue>
      {items.length > 0 ? (
        items.map((item) => <BiScoreBar key={item.id} item={item} compact />)
      ) : (
        <TextSafeValue className="rounded-md border border-line bg-white p-3 text-xs leading-5 text-muted">
          {emptyLabel}
        </TextSafeValue>
      )}
    </section>
  );
}
