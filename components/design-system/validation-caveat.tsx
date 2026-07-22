import type { HTMLAttributes } from "react";

export const defaultValidationCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export type ValidationCaveatProps = HTMLAttributes<HTMLDivElement> & {
  message?: string;
  mode?: "compact" | "full";
  tone?: "validation" | "critical";
};

export function ValidationCaveat({
  className = "",
  message = defaultValidationCaveat,
  mode = "compact",
  tone = "validation",
  ...props
}: ValidationCaveatProps) {
  const toneClasses = tone === "critical"
    ? "border-[#dfa69a] bg-[#fff0f0] text-[#9f3412]"
    : "border-[#e8c77b] bg-[#fff5e0] text-[#7a4600]";
  const label = tone === "critical" ? "BLOCKING ISSUE" : "VALIDATION REQUIRED";

  return (
    <div
      {...props}
      data-figma-node="205:41"
      role="note"
      className={`geoai-v32 flex rounded-[14px] border ${mode === "full" ? "min-h-[88px] flex-col items-start justify-center gap-2 p-4" : "h-11 items-center gap-2.5 px-3"} ${toneClasses} ${className}`}
    >
      {mode === "compact" ? (
        <span data-semantic-marker aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
      ) : (
        <strong data-caveat-label className="shrink-0 text-[10px] font-semibold leading-[14px] !tracking-[0.6px]">{label}</strong>
      )}
      <p data-caveat-message className={`m-0 min-w-0 font-medium [overflow-wrap:anywhere] ${mode === "compact" ? "whitespace-nowrap text-[12px] leading-[18px] tracking-[0px]" : "text-[14px] leading-[22px] tracking-[0px]"}`}>{message}</p>
    </div>
  );
}
