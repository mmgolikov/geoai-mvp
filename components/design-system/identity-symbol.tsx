import type { HTMLAttributes } from "react";

export type IdentitySymbolProps = HTMLAttributes<HTMLSpanElement>;

export function IdentitySymbol({ className = "", ...props }: IdentitySymbolProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      data-figma-node="468:57"
      className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center ${className}`}
    >
      {/* Exact repository-owned export of the founder-approved 32 px optical artwork. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        src="/brand/geoai-identity-symbol-32.svg"
        width="32"
        height="31"
        className="block h-[30.222px] w-8"
      />
    </span>
  );
}
