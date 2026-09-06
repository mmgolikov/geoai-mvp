"use client";

import Link from "next/link";

function profileInitial(value: string | undefined) {
  return value?.trim().charAt(0).toUpperCase() || "G";
}

export type AccessStatusBadgeVisualProps = {
  avatar?: string;
  fullName?: string;
  href: string;
  isAuthenticated: boolean;
  label: string;
  tone?: "brand" | "product";
};

export function AccessStatusBadgeVisual({ avatar, fullName, href, isAuthenticated, label, tone = "brand" }: AccessStatusBadgeVisualProps) {
  const authenticatedTone = tone === "product"
    ? "border-[#087f8c] bg-[#e5fafa] text-[#087f8c] hover:bg-[#d8f5f5]"
    : "border-[#064fcf] bg-[#e8f3f2] text-[#064fcf] hover:bg-[#e8f3f2]";
  const anonymousTone = tone === "product"
    ? "border-line bg-white text-muted hover:border-[#087f8c] hover:text-[#087f8c]"
    : "border-line bg-white text-muted hover:border-brand hover:text-brand";
  const focusTone = tone === "product" ? "focus-visible:ring-[#087f8c]" : "focus-visible:ring-[#1769e0]";

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      data-authenticated={isAuthenticated ? "true" : "false"}
      data-figma-node="219:425"
      className={`geoai-v32 relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusTone} ${isAuthenticated ? authenticatedTone : anonymousTone}`}
    >
      {isAuthenticated && avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
      ) : isAuthenticated ? (
        <span className="text-sm font-semibold" aria-hidden="true">
          {profileInitial(fullName)}
        </span>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.75 19c.55-3.45 2.65-5.25 6.25-5.25s5.7 1.8 6.25 5.25" strokeLinecap="round" />
        </svg>
      )}
      {isAuthenticated ? (
        <span
          data-authenticated-indicator
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-accent"
        />
      ) : null}
    </Link>
  );
}
