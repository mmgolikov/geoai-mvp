import Link from "next/link";

const requiredCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

type StatusChipTone = "blue" | "neutral" | "validation" | "critical";

const statusChipToneClass: Record<StatusChipTone, string> = {
  blue: "border-ice bg-ice text-spatial-blue",
  neutral: "border-line bg-surface text-muted",
  validation: "border-validation-gold/40 bg-validation-soft text-validation-strong",
  critical: "border-critical-border bg-critical-soft text-critical-red"
};

export function StatusChip({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: StatusChipTone;
}) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusChipToneClass[tone]}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function SegmentSwitch({
  options,
  active,
  onChange,
  ariaLabel
}: {
  options: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-md border border-line bg-surface p-1" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`h-9 min-w-0 rounded-md px-3 text-xs font-semibold transition ${
            active === option.id
              ? "bg-brand text-white shadow-sm"
              : "text-muted hover:bg-white hover:text-ink"
          }`}
        >
          <span className="block truncate">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  note,
  valueKind = "numeric"
}: {
  label: string;
  value: string | number;
  note: string;
  valueKind?: "numeric" | "text";
}) {
  return (
    <article className="flex h-full min-h-[128px] min-w-0 flex-col rounded-lg border border-line bg-white p-4 shadow-sm">
      <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-3 min-w-0 break-words font-semibold text-ink ${valueKind === "text" ? "text-xl leading-6" : "text-3xl leading-none"}`}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-5 text-muted">{note}</p>
    </article>
  );
}

export function HeroControlCard({
  segment,
  label,
  value,
  children
}: {
  segment?: {
    active: string;
    onChange: (id: string) => void;
  };
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="min-w-0 rounded-lg border border-line bg-white/95 p-4 shadow-soft">
      {segment ? (
        <SegmentSwitch
          ariaLabel="Project audience segment"
          active={segment.active}
          onChange={segment.onChange}
          options={[
            { id: "b2b", label: "B2B" },
            { id: "b2c", label: "B2C" }
          ]}
        />
      ) : null}
      <p className={segment ? "mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted" : "text-xs font-semibold uppercase tracking-[0.14em] text-muted"}>
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-semibold text-ink">{value}</p>
      <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">{children}</div>
    </aside>
  );
}

export function ValidationCaveat({
  children = requiredCaveat,
  compact = false
}: {
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-md border border-validation-gold/40 bg-validation-soft text-validation-text ${compact ? "px-3 py-2 text-xs leading-5" : "px-4 py-3 text-sm leading-6"}`}>
      {children}
    </div>
  );
}

export function LandingFeatureCard({
  index,
  title,
  text
}: {
  index: number;
  title: string;
  text: string;
}) {
  return (
    <article className="grid min-h-[92px] grid-cols-[30px_minmax(0,1fr)] gap-3 rounded-md border border-line bg-white/90 p-4 shadow-sm backdrop-blur">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-ice">
        {index === 4 ? (
          <>
            <span className="h-3 w-3 rounded-sm bg-cobalt-signal/20" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 border-r-2 border-t-2 border-cobalt-signal" />
          </>
        ) : (
          <span className={`h-3.5 w-3.5 rounded ${index === 1 ? "rotate-45 bg-cobalt-signal/20 ring-1 ring-cobalt-signal/40" : "bg-cobalt-signal/20"}`}>
            {index === 1 ? <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-cobalt-signal" /> : null}
          </span>
        )}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5 text-ink">{title}</h3>
        <p className="mt-2 text-[11px] leading-5 text-muted">{text}</p>
      </div>
    </article>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  onClick
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}) {
  const className = variant === "primary"
    ? "inline-flex h-10 min-w-0 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover"
    : "inline-flex h-10 min-w-0 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand";

  return (
    <Link href={href} onClick={onClick} className={className}>
      <span className="truncate">{children}</span>
    </Link>
  );
}
