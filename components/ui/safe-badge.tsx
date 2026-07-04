type SafeBadgeVariant = "demo" | "uploaded" | "planned" | "validation" | "local" | "active" | "ready";

const variantClass: Record<SafeBadgeVariant, string> = {
  demo: "bg-surface text-muted",
  uploaded: "bg-[#eef2ff] text-[#3447a5]",
  planned: "bg-surface text-muted",
  validation: "bg-[#fff9e8] text-[#6f5817]",
  local: "bg-surface text-muted",
  active: "bg-[#eaf3f1] text-brand",
  ready: "bg-[#eaf3f1] text-brand"
};

const shortLabels: Record<string, string> = {
  "demo prototype": "Sample",
  "layers active": "Layers",
  "planned validation": "Planned",
  "official validation required": "Validation",
  "validation required": "Validation",
  "local fallback": "Local"
};

export function SafeBadge({
  children,
  variant = "demo",
  className = ""
}: {
  children: React.ReactNode;
  variant?: SafeBadgeVariant;
  className?: string;
}) {
  const text = typeof children === "string" ? shortLabels[children.toLowerCase()] ?? children : children;

  return (
    <span
      className={`inline-flex max-w-[112px] shrink-0 items-center justify-center truncate rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${variantClass[variant]} ${className}`}
      title={typeof children === "string" ? children : undefined}
    >
      {text}
    </span>
  );
}
