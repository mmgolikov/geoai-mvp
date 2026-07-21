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
    ? "border-risk/40 bg-risk/15 text-risk"
    : "border-risk/25 bg-risk/10 text-risk";

  return (
    <div
      {...props}
      data-figma-node="205:41"
      role="note"
      className={`geoai-v32 flex min-h-11 items-start rounded-action border ${mode === "full" ? "flex-col gap-2 p-4" : "gap-2.5 px-3 py-2.5"} ${toneClasses} ${className}`}
    >
      {mode === "full" ? (
        <strong className="text-[10px] font-semibold uppercase tracking-[0.08em]">
          {tone === "critical" ? "Blocking issue" : "Validation required"}
        </strong>
      ) : (
        <span aria-hidden="true" className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-current" />
      )}
      <p className="m-0 min-w-0 text-xs font-medium leading-[18px] [overflow-wrap:anywhere]">{message}</p>
    </div>
  );
}
