import type { HTMLAttributes, ReactNode } from "react";

export type StatusChipTone = "neutral" | "spatial" | "validation" | "critical";
export type StatusChipSize = "compact" | "default";

export type StatusChipProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  size?: StatusChipSize;
  tone?: StatusChipTone;
};

const toneClasses: Record<StatusChipTone, string> = {
  neutral: "border-line bg-surface text-muted",
  spatial: "border-brand/25 bg-brand/10 text-brand",
  validation: "border-risk/25 bg-risk/10 text-risk",
  critical: "border-risk/40 bg-risk/15 text-risk"
};

export function StatusChip({ children, className = "", size = "compact", tone = "neutral", ...props }: StatusChipProps) {
  return (
    <span
      {...props}
      data-figma-node="203:24"
      className={`geoai-v32 inline-flex min-w-[72px] items-center justify-center rounded-full border px-2 text-xs font-medium ${size === "default" ? "min-h-7 px-3" : "min-h-6"} ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
