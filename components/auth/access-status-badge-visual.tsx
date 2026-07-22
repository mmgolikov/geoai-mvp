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
};

export function AccessStatusBadgeVisual({ avatar, fullName, href, isAuthenticated, label }: AccessStatusBadgeVisualProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      data-authenticated={isAuthenticated ? "true" : "false"}
      data-figma-node="219:425"
      className={`geoai-v32 relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769e0] focus-visible:ring-offset-2 ${
        isAuthenticated
          ? "border-[#064fcf] bg-[#e8f3f2] text-[#064fcf] hover:bg-[#e8f3f2]"
          : "border-line bg-white text-muted hover:border-brand hover:text-brand"
      }`}
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
