import type { HTMLAttributes, ReactNode } from "react";

export type StatusChipTone = "neutral" | "spatial" | "validation" | "critical";
export type StatusChipSize = "compact" | "default";

export type StatusChipProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  size?: StatusChipSize;
  tone?: StatusChipTone;
};

const toneClasses: Record<StatusChipTone, string> = {
  neutral: "border-[#dde3ea] bg-[#eef2f6] text-[var(--geoai-component-inactive-text)]",
  spatial: "border-[#bfd3f4] bg-[#eaf2ff] text-[#1769e0]",
  validation: "border-[#e8c77b] bg-[#fff5e0] text-[#a85d00]",
  critical: "border-[#dfa69a] bg-[#fff0f0] text-[#9f3412]"
};

export function StatusChip({ children, className = "", size = "compact", tone = "neutral", ...props }: StatusChipProps) {
  return (
    <span
      {...props}
      data-figma-node="203:24"
      className={`geoai-v32 inline-flex min-w-[72px] items-center justify-center whitespace-nowrap rounded-full border px-2 text-[12px] font-medium leading-4 !tracking-[0.2px] ${size === "default" ? "h-7 px-3" : "h-6"} ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
